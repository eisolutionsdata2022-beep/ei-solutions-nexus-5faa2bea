import { HOROSCOPE_RULES } from "./horoscope-rules";
import type { HoroscopeChart, HoroscopePrediction, PlanetPosition } from "./horoscope-types";
import { RASHIS, PLANETS } from "./horoscope-types";

// Exaltation houses for planets (simplified)
const EXALTATION: Record<string, number> = {
  sun: 1, moon: 2, mars: 10, mercury: 6, jupiter: 4, venus: 12, saturn: 7, rahu: 3, ketu: 9,
};
const DEBILITATION: Record<string, number> = {
  sun: 7, moon: 8, mars: 4, mercury: 12, jupiter: 10, venus: 6, saturn: 1, rahu: 9, ketu: 3,
};

/**
 * Calculate Lagna (Ascendant) from time of birth.
 * Each rashi rules ~2 hours. Simplified formula.
 */
function calculateLagna(timeOfBirth: string, dateOfBirth: string): number {
  const [hours, minutes] = timeOfBirth.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Use date to add variation
  const dateParts = dateOfBirth.split("-");
  const day = parseInt(dateParts[2] || "1");
  const month = parseInt(dateParts[1] || "1");

  // Each rashi ~120 minutes starting from sunrise (~6am)
  const sunriseOffset = totalMinutes - 360; // offset from 6am
  const rashiIndex = Math.floor(((sunriseOffset + day * 30 + month * 15) % 1440) / 120);
  return ((rashiIndex % 12) + 12) % 12 + 1; // 1-12
}

/**
 * Semi-calculated planet placement based on DOB + time.
 * Uses date components to distribute planets across houses deterministically.
 */
function calculatePlanetPositions(dateOfBirth: string, timeOfBirth: string, lagna: number): PlanetPosition[] {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const [hours, minutes] = timeOfBirth.split(":").map(Number);

  const seed = year * 365 + month * 30 + day + hours * 60 + minutes;

  return PLANETS.map((planet, idx) => {
    // Deterministic pseudo-random house assignment
    const hash = (seed * (idx + 1) * 7 + idx * 13 + day * (idx + 3)) % 12;
    const house = hash + 1;
    const rashi = ((lagna + house - 2) % 12) + 1;

    return {
      planetId: planet.id,
      house,
      rashi,
      isExalted: EXALTATION[planet.id] === rashi,
      isDebilitated: DEBILITATION[planet.id] === rashi,
    };
  });
}

/**
 * Match rules against chart and generate predictions.
 */
function generatePredictions(chart: HoroscopeChart): HoroscopePrediction[] {
  const predictions: HoroscopePrediction[] = [];
  const planetMap = new Map(chart.planets.map((p) => [p.planetId, p]));

  for (const rule of HOROSCOPE_RULES) {
    const { condition } = rule;
    let matched = false;

    switch (condition.type) {
      case "lagna":
        matched = chart.lagna === condition.house;
        break;
      case "planet_in_house":
        if (condition.planet) {
          const p = planetMap.get(condition.planet);
          matched = p?.house === condition.house;
        }
        break;
      case "planet_strong":
        if (condition.planet) {
          const p = planetMap.get(condition.planet);
          matched = p?.isExalted === true;
        }
        break;
      case "planet_weak":
        if (condition.planet) {
          const p = planetMap.get(condition.planet);
          matched = p?.isDebilitated === true;
        }
        break;
    }

    if (matched) {
      predictions.push({
        category: rule.category,
        malayalam: rule.malayalam_text,
        english: rule.english_text,
        severity: rule.severity,
      });
    }
  }

  return predictions;
}

/**
 * Main entry point: generate a complete horoscope from birth details.
 */
export function generateHoroscope(dateOfBirth: string, timeOfBirth: string): {
  chart: HoroscopeChart;
  predictions: HoroscopePrediction[];
} {
  const lagna = calculateLagna(timeOfBirth, dateOfBirth);
  const planets = calculatePlanetPositions(dateOfBirth, timeOfBirth, lagna);
  const chart: HoroscopeChart = { lagna, planets };
  const predictions = generatePredictions(chart);
  return { chart, predictions };
}

export function getRashiName(id: number, lang: "ml" | "en" = "ml"): string {
  const r = RASHIS.find((r) => r.id === id);
  return lang === "ml" ? r?.ml || "" : r?.en || "";
}

export function getPlanetName(id: string, lang: "ml" | "en" = "ml"): string {
  const p = PLANETS.find((p) => p.id === id);
  return lang === "ml" ? p?.ml || "" : p?.en || "";
}
