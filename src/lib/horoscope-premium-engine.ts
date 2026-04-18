import type {
  HoroscopeChart,
  PremiumExtras,
  DashaPeriod,
  PlanetPosition,
} from "./horoscope-types";
import { PLANETS, RASHIS } from "./horoscope-types";

/**
 * Vimshottari Dasha order + years (Vedic standard).
 * 120-year cycle starting from the planet ruling birth Nakshatra.
 */
const VIMSHOTTARI = [
  { id: "ketu", years: 7 },
  { id: "venus", years: 20 },
  { id: "sun", years: 6 },
  { id: "moon", years: 10 },
  { id: "mars", years: 7 },
  { id: "rahu", years: 18 },
  { id: "jupiter", years: 16 },
  { id: "saturn", years: 19 },
  { id: "mercury", years: 17 },
];

const PLANET_ML: Record<string, string> = Object.fromEntries(PLANETS.map((p) => [p.id, p.ml]));
const PLANET_EN: Record<string, string> = Object.fromEntries(PLANETS.map((p) => [p.id, p.en]));

/** Build a Vimshottari Dasha timeline from birth year (rough). */
function buildDasha(birthYear: number, birthDayOfYear: number): DashaPeriod[] {
  const startIdx = birthDayOfYear % VIMSHOTTARI.length;
  const out: DashaPeriod[] = [];
  let cursor = birthYear;
  for (let i = 0; i < 9; i++) {
    const m = VIMSHOTTARI[(startIdx + i) % VIMSHOTTARI.length];
    out.push({
      planet: PLANET_EN[m.id] || m.id,
      planetMl: PLANET_ML[m.id] || m.id,
      startYear: cursor,
      endYear: cursor + m.years,
      years: m.years,
    });
    cursor += m.years;
  }
  return out;
}

function planetIn(chart: HoroscopeChart, id: string): PlanetPosition | undefined {
  return chart.planets.find((p) => p.planetId === id);
}

/**
 * Build the rich set of Premium-only insights from chart + birth details.
 * This is rule-based but thorough — designed to fill a multi-page report.
 */
export function generatePremiumExtras(
  chart: HoroscopeChart,
  dateOfBirth: string,
): PremiumExtras {
  const [yearStr, monthStr, dayStr] = dateOfBirth.split("-");
  const year = parseInt(yearStr) || 1990;
  const month = parseInt(monthStr) || 1;
  const day = parseInt(dayStr) || 1;
  const dayOfYear = (month - 1) * 30 + day;

  const jupiter = planetIn(chart, "jupiter");
  const venus = planetIn(chart, "venus");
  const saturn = planetIn(chart, "saturn");
  const mars = planetIn(chart, "mars");
  const moon = planetIn(chart, "moon");
  const sun = planetIn(chart, "sun");
  const mercury = planetIn(chart, "mercury");
  const rahu = planetIn(chart, "rahu");

  const lagnaName = RASHIS[chart.lagna - 1]?.ml || "";

  // ── Life stages (8) ──
  const lifeStages = [
    `0–7 വയസ്സ്: ശൈശവ കാലം, ${moon?.isExalted ? "ആരോഗ്യപൂർണവും സന്തുഷ്ടവുമായ" : "സാധാരണ"} ബാല്യം. അമ്മയുടെ പരിലാളന വളരെ പ്രധാനം.`,
    `8–16 വയസ്സ്: വിദ്യാഭ്യാസ ഘട്ടം, ${mercury?.house && [1, 4, 5, 9].includes(mercury.house) ? "മികച്ച പഠന ശേഷി" : "സ്ഥിരമായ പഠന പുരോഗതി"}.`,
    `17–25 വയസ്സ്: ഉന്നത വിദ്യാഭ്യാസവും career foundation-ഉം. ${jupiter?.isExalted ? "ഉത്തമമായ ഗുരുലാഭം" : "സ്വന്തം പരിശ്രമം ഫലം നൽകും"}.`,
    `26–35 വയസ്സ്: വിവാഹം, കുടുംബ ജീവിതം, career growth. ${venus?.house === 7 ? "വിവാഹ ജീവിതം സന്തുഷ്ടം." : "സ്ഥിരതയ്ക്ക് ക്ഷമ വേണം."}`,
    `36–45 വയസ്സ്: സാമ്പത്തിക സ്ഥിരതയും സാമൂഹിക സ്ഥാനവും. ${jupiter?.house && [2, 5, 9, 11].includes(jupiter.house) ? "ധന ലാഭം ഉറപ്പ്." : "സ്ഥിരമായ വരുമാനം."}`,
    `46–55 വയസ്സ്: ഉത്തരവാദിത്തങ്ങളുടെ കാലം, പക്ഷേ വൈകാരിക തൃപ്തി ലഭിക്കും.`,
    `56–65 വയസ്സ്: ${saturn?.isExalted ? "സ്ഥിരതയും ബഹുമാനവും" : "ആരോഗ്യ ശ്രദ്ധ വേണം"}. വിശ്രമ ജീവിതം.`,
    `66+ വയസ്സ്: ആത്മീയ ജീവിതം, പേരക്കുട്ടികളുടെ സന്തോഷം. ദീർഘായുസ്സ് ലഭിക്കും.`,
  ];

  // ── Marriage period ──
  const v7 = venus?.house === 7;
  const marriagePeriod = v7
    ? "24–28 വയസ്സിനിടയിൽ വിവാഹ യോഗം ശക്തമാണ്. ജീവിത പങ്കാളി ധനികനോ/ധനികയോ ആയിരിക്കും."
    : venus?.isExalted
      ? "26–30 വയസ്സിനിടയിൽ ശുഭ വിവാഹം. പ്രേമ വിവാഹത്തിന് സാധ്യത."
      : "28–32 വയസ്സിനിടയിൽ വിവാഹ യോഗം. ബന്ധു-സുഹൃത് മാർഗ്ഗത്തിലൂടെ വരും.";

  // ── Children ──
  const childrenLuck = jupiter?.house === 5
    ? "സന്താന ഭാഗ്യം ഉത്തമം — രണ്ടോ മൂന്നോ കുട്ടികൾ, ബുദ്ധിമാൻമാർ ആയിരിക്കും."
    : "സന്താന ഭാഗ്യം സാധാരണം — ഒന്നോ രണ്ടോ കുട്ടികൾ. അമ്മയുടെ ആരോഗ്യം ശ്രദ്ധിക്കണം.";

  // ── Education ──
  const educationOutlook = mercury?.house && [1, 4, 5, 9].includes(mercury.house)
    ? "ഉന്നത വിദ്യാഭ്യാസത്തിൽ മികച്ച വിജയം. വിദേശ പഠന സാധ്യത."
    : "സാധാരണ വിദ്യാഭ്യാസ പുരോഗതി. സാങ്കേതിക / പ്രായോഗിക വിഷയങ്ങളിൽ കൂടുതൽ താല്പര്യം.";

  // ── Career ──
  const careerGrowth = sun?.house === 10
    ? "സർക്കാർ ജോലിയോ ഉന്നത സ്ഥാനങ്ങളോ ലഭിക്കും. നേതൃത്വ ശേഷി ശക്തം."
    : mars?.house === 10
      ? "സ്വന്തം ബിസിനസ്സിൽ വിജയം. എഞ്ചിനീയറിംഗ് / സാങ്കേതിക മേഖലയ്ക്ക് യോജ്യം."
      : "സ്ഥിരതയുള്ള ജോലി. 35 വയസ്സിന് ശേഷം പ്രമോഷനുകൾ ഉണ്ടാകും.";

  // ── Foreign travel ──
  const foreignTravel = rahu?.house && [3, 9, 12].includes(rahu.house)
    ? "വിദേശ യാത്ര / വിദേശ വാസ യോഗം പ്രബലം. 27–35 വയസ്സിനിടയിൽ സാധ്യത."
    : "ഹ്രസ്വ വിദേശ യാത്രകൾ. സ്ഥിര വാസം സ്വദേശത്ത് തന്നെ.";

  // ── Wealth periods ──
  const wealthPeriods = [
    `${year + 28}–${year + 34}: ആദ്യ വലിയ ധന ലാഭം`,
    `${year + 38}–${year + 44}: സ്ഥിര ആസ്തി നിർമ്മാണം (ഭൂമി / വീട്)`,
    `${year + 48}–${year + 55}: നിക്ഷേപങ്ങളിൽ നിന്ന് ലാഭം`,
  ];

  // ── Health warnings ──
  const healthWarnings: string[] = [];
  if (sun?.isDebilitated) healthWarnings.push("ഹൃദയ ആരോഗ്യം ശ്രദ്ധിക്കണം — വർഷാന്ത്യ ചെക്കപ്പുകൾ നിർബന്ധം.");
  if (saturn?.house === 6) healthWarnings.push("അസ്ഥി / സന്ധി പ്രശ്നങ്ങൾ — യോഗ ശീലിക്കുക.");
  if (mars?.house === 6) healthWarnings.push("ചെറിയ അപകടങ്ങൾക്ക് സാധ്യത — ഡ്രൈവിംഗിൽ ശ്രദ്ധ.");
  if (moon?.isDebilitated) healthWarnings.push("മാനസിക സമ്മർദ്ദം — ധ്യാനം പ്രയോജനപ്രദം.");
  if (healthWarnings.length === 0) healthWarnings.push("പൊതുവേ നല്ല ആരോഗ്യം. വർഷത്തിൽ ഒരിക്കൽ ചെക്കപ്പ് മതി.");

  // ── Enemies / obstacles ──
  const enemyObstacles = [
    saturn?.house === 1 ? "സ്വന്തം ജീവിത ഘടനയിൽ പല തടസ്സങ്ങൾ — ക്ഷമ വേണം." : "ശത്രു ബാധ കുറവ്.",
    "ജോലിയിൽ മത്സരം ഉണ്ടാകും, പക്ഷേ കഴിവ് കൊണ്ട് മറികടക്കും.",
    "സാമ്പത്തിക തട്ടിപ്പുകൾക്കെതിരെ ജാഗ്രത പുലർത്തുക.",
  ];

  // ── Turning points ──
  const turningPoints = [
    `${year + 21} വയസ്സ്: വിദ്യാഭ്യാസ-career തിരഞ്ഞെടുപ്പ്`,
    `${year + 27} വയസ്സ്: വിവാഹം / ജീവിത പങ്കാളി`,
    `${year + 33} വയസ്സ്: വലിയ career മാറ്റം / promotion`,
    `${year + 41} വയസ്സ്: സാമ്പത്തിക സ്ഥിരത`,
    `${year + 56} വയസ്സ്: ആത്മീയ ജീവിതത്തിലേക്കുള്ള മാറ്റം`,
  ];

  // ── Yearly outlook (next 5) ──
  const now = new Date().getFullYear();
  const yearlyOutlook = [0, 1, 2, 3, 4].map((i) => {
    const y = now + i;
    const variants = [
      `${y}: മൊത്തത്തിൽ ശുഭം. പുതിയ അവസരങ്ങൾ ഉണ്ടാകും.`,
      `${y}: സാമ്പത്തിക വളർച്ച. നിക്ഷേപങ്ങൾക്ക് അനുകൂലം.`,
      `${y}: കുടുംബ സന്തോഷം. ചെറിയ ആരോഗ്യ ശ്രദ്ധ വേണം.`,
      `${y}: career-ൽ പുരോഗതി. യാത്രകൾ ഫലപ്രദം.`,
      `${y}: പുണ്യ പ്രവൃത്തികൾക്ക് അനുകൂലം. ആത്മീയ വളർച്ച.`,
    ];
    return variants[(year + month + i) % variants.length];
  });

  // ── Dasha ──
  const dashaTimeline = buildDasha(year, dayOfYear);

  // ── Gochara summary ──
  const gocharaSummary = `നിലവിലെ ഗോചര ഫലം: വ്യാഴം ${RASHIS[(chart.lagna + 4) % 12]?.ml || ""} രാശിയിൽ — ഭാഗ്യ വർദ്ധനവ്. ശനി ${RASHIS[(chart.lagna + 9) % 12]?.ml || ""} രാശിയിൽ — ഉത്തരവാദിത്തങ്ങൾ ഏറുന്നു. അടുത്ത രണ്ട് വർഷം career-ൽ വളരെ പ്രധാനം.`;

  // ── Remedies ──
  const remedies = {
    poojas: [
      "ഗണപതി ഹോമം (തടസ്സ നിവാരണത്തിന്)",
      "സരസ്വതി പൂജ (വിദ്യാ വിജയത്തിന്)",
      "നവഗ്രഹ പൂജ (ഗ്രഹ ദോഷ ശാന്തിക്ക്)",
      lagnaName === "ചിങ്ങം" ? "സൂര്യ നമസ്കാരം" : "ലക്ഷ്മി പൂജ",
    ],
    temples: [
      "ഗുരുവായൂർ ശ്രീകൃഷ്ണ ക്ഷേത്രം",
      "ശബരിമല അയ്യപ്പൻ",
      "കൊടുങ്ങല്ലൂർ ഭഗവതി ക്ഷേത്രം",
      "തിരുവൈരാണിക്കുളം മഹാദേവ ക്ഷേത്രം",
    ],
    shanti: [
      saturn?.isDebilitated ? "ശനി ശാന്തി ജപം — ശനിയാഴ്ച" : "നവഗ്രഹ ശാന്തി",
      "മൃത്യുഞ്ജയ ഹോമം (ആരോഗ്യത്തിന്)",
      "ഷോഡശോപചാര പൂജ",
    ],
    daanam: [
      "ശനിയാഴ്ച എണ്ണ ദാനം",
      "വ്യാഴാഴ്ച മഞ്ഞ വസ്ത്രം ദാനം",
      "വെള്ളിയാഴ്ച വെളുത്ത ഭക്ഷണം ദാനം",
      "ദരിദ്രർക്ക് ധാന്യ ദാനം",
    ],
    mantras: [
      "ഓം ഗം ഗണപതയേ നമഃ (108 തവണ)",
      "ഓം നമഃ ശിവായ (പ്രതിദിനം)",
      "ഗായത്രി മന്ത്രം (സന്ധ്യാ സമയം)",
      "ഹനുമാൻ ചാലിസ (ചൊവ്വാഴ്ച)",
    ],
    vrathas: [
      "ഏകാദശി വ്രതം (മാസത്തിൽ രണ്ട് തവണ)",
      "പ്രദോഷ വ്രതം (മഹാദേവന്)",
      "സത്യനാരായണ വ്രതം (പൂർണിമയ്ക്ക്)",
    ],
    goodDays: ["വ്യാഴാഴ്ച", "വെള്ളിയാഴ്ച", "ഞായറാഴ്ച (രാവിലെ)"],
    badDays: ["ശനിയാഴ്ച (ഉച്ചയ്ക്ക് ശേഷം)", "ചൊവ്വാഴ്ച (പുതിയ ജോലി തുടങ്ങരുത്)"],
  };

  return {
    lifeStages,
    marriagePeriod,
    childrenLuck,
    educationOutlook,
    careerGrowth,
    foreignTravel,
    wealthPeriods,
    healthWarnings,
    enemyObstacles,
    turningPoints,
    yearlyOutlook,
    dashaTimeline,
    gocharaSummary,
    remedies,
  };
}
