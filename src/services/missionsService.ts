import { LaunchMission, Astronaut } from '../types';

export const FALLBACK_MISSIONS: LaunchMission[] = [
  {
    id: 'mission-starship-ift5',
    name: 'Starship Flight 5 (Super Heavy Catch)',
    rocket: 'Starship / Super Heavy',
    dateUtc: '2024-10-13T12:25:00.000Z',
    dateUnix: 1728822300,
    success: true,
    upcoming: false,
    details: 'Исторический полет Starship с первым в истории успешным захватом ускорителя Super Heavy манипуляторами башни Mechazilla на космодроме Starbase.',
    patchUrl: 'https://images2.imgbox.com/eb/0f/Vev7xkST_o.png',
    webcastUrl: 'https://www.spacex.com/launches/starship-flight-5/',
    articleUrl: null,
    launchpad: 'Starbase OLM-A, Бока-Чика, Техас',
    payloads: ['Starship Flight Test Payload']
  },
  {
    id: 'mission-polaris-dawn',
    name: 'Polaris Dawn (Первый коммерческий выход в открытый космос)',
    rocket: 'Falcon 9 Block 5',
    dateUtc: '2024-09-10T09:23:00.000Z',
    dateUnix: 1725960180,
    success: true,
    upcoming: false,
    details: 'Пилотируемая миссия на космическом корабле Crew Dragon Resilience. Экипаж достиг рекордной апогейной высоты 1400 км и совершил первый частный выход в открытый космос.',
    patchUrl: 'https://images2.imgbox.com/33/c7/s5n0l4iK_o.png',
    webcastUrl: 'https://polarisprogram.com/dawn/',
    articleUrl: null,
    launchpad: 'LC-39A, Космический центр Кеннеди, Флорида',
    payloads: ['Crew Dragon Resilience', '4 космонавта']
  },
  {
    id: 'mission-europa-clipper',
    name: 'NASA Europa Clipper (Исследование Европы, спутника Юпитера)',
    rocket: 'Falcon Heavy',
    dateUtc: '2024-10-14T16:06:00.000Z',
    dateUnix: 1728921960,
    success: true,
    upcoming: false,
    details: 'Флагманская автоматическая межпланетная станция NASA для детального изучения подледного океана и потенциальной обитаемости Европы, спутника Юпитера.',
    patchUrl: 'https://images2.imgbox.com/9a/96/XP9FqY5t_o.png',
    webcastUrl: 'https://www.nasa.gov/europa-clipper/',
    articleUrl: null,
    launchpad: 'LC-39A, Мыс Канаверал, Флорида',
    payloads: ['Europa Clipper Spacecraft']
  },
  {
    id: 'mission-crew-9',
    name: 'SpaceX Crew-9 (МКС Экспедиция 72)',
    rocket: 'Falcon 9 Block 5',
    dateUtc: '2024-09-28T17:17:00.000Z',
    dateUnix: 1727543820,
    success: true,
    upcoming: false,
    details: 'Девятый эксплуатационный полет корабля Crew Dragon на МКС в рамках программы Commercial Crew Program. Доставил экипаж и вернет астронавтов миссии Boeing Starliner.',
    patchUrl: 'https://images2.imgbox.com/80/7e/6jV3wZ0J_o.png',
    webcastUrl: 'https://www.nasa.gov/commercialcrew',
    articleUrl: null,
    launchpad: 'SLC-40, Мыс Канаверал, Флорида',
    payloads: ['Crew Dragon Freedom', 'Ник Хейг', 'Александр Горбунов']
  },
  {
    id: 'mission-artemis-2',
    name: 'NASA Artemis II (Облет Луны с экипажем)',
    rocket: 'SLS Block 1 (Space Launch System)',
    dateUtc: '2025-09-01T14:00:00.000Z',
    dateUnix: 1756735200,
    success: null,
    upcoming: true,
    details: 'Первая пилотируемая миссия космической программы Артемида. Четыре астронавта на корабле Orion совершат облет Луны по траектории свободного возвращения.',
    patchUrl: 'https://images2.imgbox.com/5c/58/lU2C7sD1_o.png',
    webcastUrl: 'https://www.nasa.gov/specials/artemis-ii/',
    articleUrl: null,
    launchpad: 'LC-39B, Космический центр Кеннеди, Флорида',
    payloads: ['Orion Spacecraft', 'Reid Wiseman', 'Victor Glover', 'Christina Koch', 'Jeremy Hansen']
  },
  {
    id: 'mission-starlink-10-8',
    name: 'Starlink Group 10-8',
    rocket: 'Falcon 9 Block 5',
    dateUtc: '2024-10-18T23:21:00.000Z',
    dateUnix: 1729293660,
    success: true,
    upcoming: false,
    details: 'Запуск 20 спутников связи Starlink v2 Mini, включая 13 с возможностью прямой сотовой связи Direct to Cell на низкую околоземную орбиту.',
    patchUrl: null,
    webcastUrl: 'https://www.spacex.com/launches/',
    articleUrl: null,
    launchpad: 'SLC-40, Мыс Канаверал, Флорида',
    payloads: ['20x Starlink v2 Mini (13 Direct-to-Cell)']
  }
];

export async function fetchSpaceMissions(): Promise<LaunchMission[]> {
  try {
    const res = await fetch('/api/launches');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: LaunchMission[] = data.map((item: any) => ({
          id: item.id || `mission-${item.flight_number}`,
          name: item.name || `Flight #${item.flight_number}`,
          rocket: item.rocket_name || 'Falcon 9',
          dateUtc: item.date_utc,
          dateUnix: item.date_unix || Math.floor(new Date(item.date_utc).getTime() / 1000),
          success: item.success,
          upcoming: !!item.upcoming,
          details: item.details || 'Миссия по выводу полезной нагрузки на орбиту.',
          patchUrl: item.links?.patch?.small || item.links?.patch?.large || null,
          webcastUrl: item.links?.webcast || null,
          articleUrl: item.links?.article || null,
          launchpad: item.launchpad || 'Мыс Канаверал, Флорида',
          payloads: item.payloads || ['Спутники связи / Полезная нагрузка']
        }));
        return mapped;
      }
    }
  } catch (err) {
    console.warn('[Missions] Failed to fetch SpaceX API, using defaults:', err);
  }

  return FALLBACK_MISSIONS;
}

export async function fetchAstronautsInSpace(): Promise<Astronaut[]> {
  try {
    const res = await fetch('/api/astros');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.people)) {
        return data.people;
      }
    }
  } catch (err) {
    console.warn('[Astros] Failed to fetch astronauts in space:', err);
  }

  return [
    { craft: 'МКС', name: 'Сунита Уильямс' },
    { craft: 'МКС', name: 'Барри Уилмор' },
    { craft: 'МКС', name: 'Дональд Петтит' },
    { craft: 'МКС', name: 'Алексей Овчинин' },
    { craft: 'МКС', name: 'Иван Вагнер' },
    { craft: 'МКС', name: 'Ник Хейг' },
    { craft: 'МКС', name: 'Александр Горбунов' },
    { craft: 'Тяньгун', name: 'Е Гуанфу' },
    { craft: 'Тяньгун', name: 'Ли Цун' },
    { craft: 'Тяньгун', name: 'Ли Гуансу' }
  ];
}
