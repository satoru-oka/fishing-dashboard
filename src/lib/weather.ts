// Open-Meteo (free, no API key, CORS-enabled) で天気・海況を取得。
// 失敗時は呼び出し側で空を返す。

export interface DailyForecast {
  date: string; // YYYY-MM-DD (local)
  tempMax: number; // °C
  tempMin: number; // °C
  precip: number; // mm
  windMax: number; // m/s
  weatherCode: number; // WMO code
  waveHeight: number; // m (best-effort)
  summary: string; // 天気の和訳
}

const WMO_TO_JA: Record<number, string> = {
  0: '晴れ',
  1: 'ほぼ晴れ',
  2: '一部曇り',
  3: '曇り',
  45: '霧',
  48: '霧氷',
  51: '霧雨',
  53: '霧雨',
  55: '霧雨',
  61: '小雨',
  63: '雨',
  65: '強い雨',
  71: '小雪',
  73: '雪',
  75: '強い雪',
  77: '雪粒',
  80: 'にわか雨',
  81: 'にわか雨',
  82: '強いにわか雨',
  85: 'にわか雪',
  86: '強いにわか雪',
  95: '雷雨',
  96: '雹を伴う雷雨',
  99: '雹を伴う雷雨',
};

export function wmoToJa(code: number): string {
  return WMO_TO_JA[code] ?? '不明';
}

interface OpenMeteoDailyResp {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    weathercode: number[];
  };
}

interface OpenMeteoMarineResp {
  daily?: {
    time: string[];
    wave_height_max?: number[];
  };
}

export async function fetchForecast(
  lat: number,
  lng: number,
  days = 3,
): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode',
    timezone: 'Asia/Tokyo',
    forecast_days: String(days),
    windspeed_unit: 'ms',
  });

  const [forecastRes, marineRes] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`).then(
      (r) => (r.ok ? (r.json() as Promise<OpenMeteoDailyResp>) : null),
    ),
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(
        4,
      )}&longitude=${lng.toFixed(4)}&daily=wave_height_max&timezone=Asia/Tokyo&forecast_days=${days}`,
    ).then((r) => (r.ok ? (r.json() as Promise<OpenMeteoMarineResp>) : null)),
  ]);

  if (forecastRes.status !== 'fulfilled' || !forecastRes.value?.daily) {
    throw new Error('天気情報の取得に失敗しました');
  }
  const d = forecastRes.value.daily;
  const waves =
    marineRes.status === 'fulfilled' && marineRes.value?.daily?.wave_height_max
      ? marineRes.value.daily.wave_height_max
      : [];

  return d.time.map((t, i) => ({
    date: t,
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precip: d.precipitation_sum[i],
    windMax: d.windspeed_10m_max[i],
    weatherCode: d.weathercode[i],
    waveHeight: waves[i] ?? NaN,
    summary: wmoToJa(d.weathercode[i]),
  }));
}
