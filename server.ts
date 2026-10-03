import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { FALLBACK_TLE_DATA } from './src/data/fallbackSatellites.js';

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

// Helper to convert satellite items into valid 3-line TLE text
function getFallbackTLEText(groupKey: string): string {
  const norm = groupKey.toLowerCase();
  let matches = FALLBACK_TLE_DATA;
  if (norm === 'starlink') {
    matches = FALLBACK_TLE_DATA.filter(s => s.category === 'starlink');
  } else if (norm === 'stations') {
    matches = FALLBACK_TLE_DATA.filter(s => s.category === 'stations');
  } else if (norm === 'navigation' || norm === 'gps' || norm === 'glonass' || norm === 'galileo') {
    matches = FALLBACK_TLE_DATA.filter(s => s.category === 'navigation');
  } else if (norm === 'weather') {
    matches = FALLBACK_TLE_DATA.filter(s => s.category === 'weather');
  } else if (norm === 'science') {
    matches = FALLBACK_TLE_DATA.filter(s => s.category === 'science');
  }

  if (!matches || matches.length === 0) {
    matches = FALLBACK_TLE_DATA;
  }

  return matches.map(s => `${s.name}\n${s.line1}\n${s.line2}`).join('\n');
}

// Mapping of internal group names to CelesTrak group parameters
const CELESTRAK_GROUPS: Record<string, string> = {
  stations: 'stations',
  starlink: 'starlink',
  navigation: 'gps-ops',
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

// API: Proxy CelesTrak TLE data with multi-tier caching and fail-safe fallback
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
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 50) {
        cache.set(cacheKey, { data: text, timestamp: now });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(text);
      }
    }
  } catch {
    // Handled below with graceful fallback
  }

  // Graceful fallback: return cached or curated catalog
  if (cached) {
    res.setHeader('X-Cache', 'STALE');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(cached.data);
  }

  const fallbackText = getFallbackTLEText(groupKey);
  cache.set(cacheKey, { data: fallbackText, timestamp: now });
  res.setHeader('X-Cache', 'FALLBACK');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(fallbackText);
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
