import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for TLE data and external APIs
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// Mapping of internal group names to CelesTrak group parameters
const CELESTRAK_GROUPS: Record<string, string> = {
  stations: 'stations',
  starlink: 'starlink',
  gps: 'gps-ops',
  glonass: 'glo-ops',
  galileo: 'galileo',
  weather: 'weather',
  science: 'science',
  visual: 'visual',
  active: 'active',
  resource: 'resource',
  military: 'military'
};

// API: Proxy CelesTrak TLE data with caching
app.get('/api/tle/:group', async (req, res) => {
  const groupKey = req.params.group.toLowerCase();
  const celestrakGroup = CELESTRAK_GROUPS[groupKey] || 'stations';
  const cacheKey = `tle_${celestrakGroup}`;

  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(cached.data);
  }

  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${celestrakGroup}&FORMAT=tle`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrbitWatch-Satellite-Tracker/1.0',
        'Accept': 'text/plain'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`CelesTrak responded with HTTP ${response.status}`);
    }

    const text = await response.text();
    if (text && text.trim().length > 50) {
      cache.set(cacheKey, { data: text, timestamp: now });
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(text);
    } else {
      throw new Error('Empty response from CelesTrak');
    }
  } catch (err: any) {
    console.warn(`[TLE Proxy] Failed to fetch group ${celestrakGroup}:`, err.message);
    if (cached) {
      res.setHeader('X-Cache', 'STALE');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(cached.data);
    }
    return res.status(502).json({ error: 'Failed to fetch from CelesTrak', details: err.message });
  }
});

// API: Proxy SpaceX API launches
app.get('/api/launches', async (req, res) => {
  const cacheKey = 'spacex_launches';
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
    return res.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch('https://api.spacexdata.com/v4/launches', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`SpaceX API HTTP ${response.status}`);
    const data = await response.json();
    
    // Sort by date desc and take the most recent 40 launches
    const sorted = Array.isArray(data)
      ? data.sort((a: any, b: any) => b.date_unix - a.date_unix).slice(0, 40)
      : [];

    cache.set(cacheKey, { data: sorted, timestamp: now });
    return res.json(sorted);
  } catch (err: any) {
    console.warn('[SpaceX API] Error fetching launches:', err.message);
    if (cached) return res.json(cached.data);
    return res.status(502).json({ error: 'Failed to fetch SpaceX launches', details: err.message });
  }
});

// API: Proxy astronauts currently in space
app.get('/api/astros', async (req, res) => {
  const cacheKey = 'astros_in_space';
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
    return res.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('http://api.open-notify.org/astros.json', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`OpenNotify HTTP ${response.status}`);
    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: now });
    return res.json(data);
  } catch (err: any) {
    console.warn('[Astros API] Error fetching astros:', err.message);
    if (cached) return res.json(cached.data);
    // Return reliable fallback data
    return res.json({
      message: 'success',
      number: 10,
      people: [
        { craft: 'ISS', name: 'Sunita Williams' },
        { craft: 'ISS', name: 'Barry Wilmore' },
        { craft: 'ISS', name: 'Donald Pettit' },
        { craft: 'ISS', name: 'Aleksey Ovchinin' },
        { craft: 'ISS', name: 'Ivan Vagner' },
        { craft: 'ISS', name: 'Nick Hague' },
        { craft: 'ISS', name: 'Aleksandr Gorbunov' },
        { craft: 'Tiangong', name: 'Ye Guangfu' },
        { craft: 'Tiangong', name: 'Li Cong' },
        { craft: 'Tiangong', name: 'Li Guangsu' }
      ]
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Lazy-initialized Gemini AI client for detailed satellite dossier
let aiClientInstance: any = null;
function getGenAIClient(): any {
  if (!aiClientInstance && process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      aiClientInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch {
      // module will be imported via dynamic import if ESM
    }
  }
  return aiClientInstance;
}

// API: Generate AI historical dossier for a satellite
app.post('/api/satellite-ai-summary', async (req, res) => {
  const { name, noradId, category, launchYear, country } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Ты космический баллистик и популяризатор космонавтики.
Расскажи кратко и емко (3-4 живых предложения на русском языке) про космический аппарат:
Название: "${name}" (NORAD ID: ${noradId}, категория: ${category}, страна: ${country || 'не указана'}, год запуска: ${launchYear || 'не указан'}).

Обязательно ответь на вопросы:
- Когда и какой страной / агентством был отправлен на орбиту?
- В чём его главная миссия и практическая задача?
- Один интересный факт о нём.
Пиши увлекательно, научно и понятно любому человеку. Без лишней "воды".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ summary: response.text });
  } catch (err: any) {
    console.warn('[Gemini AI] Error generating satellite summary:', err.message);
    return res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrbitWatch server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
