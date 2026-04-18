import type { HoroscopeRequest, PalmistryReading } from "./horoscope-types";
import { getRashiName, getPlanetName } from "./horoscope-engine";
import { RASHIS } from "./horoscope-types";

const COSMIC_CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Malayalam','Manjari','Anek Malayalam',Arial,sans-serif; color:#1a1330; margin:0; background:#fffaf0; }
  .page { page-break-after: always; padding: 16px 4px; position:relative; }
  .page:last-child { page-break-after: auto; }
  .gold-border { border: 6px double #b8860b; border-radius: 14px; padding: 18px; background: linear-gradient(180deg,#fffdf3,#fff5d8); }
  h1.cover-title { font-size: 38px; text-align:center; color:#7a3e0d; margin: 12px 0 4px; letter-spacing: 1px; }
  .cover-sub { text-align:center; color:#a0522d; font-size: 16px; margin-bottom: 18px; }
  .om { font-size: 64px; text-align:center; color:#b8860b; margin: 8px 0; }
  .cover-card { margin: 18px auto; width:80%; border:2px solid #b8860b; border-radius:10px; padding:14px 18px; background:#fffaeb; }
  .cover-card .row { display:flex; justify-content: space-between; padding: 4px 0; border-bottom:1px dotted #b8860b; }
  .cover-card .row:last-child { border-bottom:none; }
  .cover-card .label { color:#7a3e0d; font-weight:600; }
  h2.section-title { color:#7a3e0d; border-bottom: 3px solid #b8860b; padding-bottom: 6px; margin-top: 18px; font-size: 22px; }
  h3.sub-title { color:#a0522d; margin-top: 14px; font-size:17px; }
  p, li { line-height: 1.7; font-size: 13.5px; color:#1a1330; }
  .chart-table { border-collapse: collapse; width: 100%; margin: 16px auto; }
  .chart-cell { border:2px solid #b8860b; min-height: 88px; padding: 6px; vertical-align:top; background:#fffdf3; width:25%; }
  .chart-center { border:2px solid #b8860b; background:#fff1c4; text-align:center; vertical-align:middle; }
  .center-label { font-size: 18px; color:#7a3e0d; font-weight:bold; }
  .lagna-label { font-size: 14px; color:#a0522d; margin-top: 6px; }
  .house-num { font-size: 11px; color:#a0522d; font-weight:bold; }
  .rashi-name { font-size: 12px; color:#7a3e0d; }
  .planet-names { font-size: 11px; color:#1a1330; margin-top:4px; font-weight:bold; }
  .planet-table { width:100%; border-collapse: collapse; margin-top:10px; }
  .planet-table th, .planet-table td { border:1px solid #b8860b; padding: 6px 8px; font-size: 12.5px; text-align:left; }
  .planet-table th { background:#fff1c4; color:#7a3e0d; }
  .pred-card { border-left: 4px solid #b8860b; background:#fffaeb; padding: 8px 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .pred-cat { color:#7a3e0d; font-weight:bold; font-size: 13px; }
  .pred-text { font-size: 13px; margin: 4px 0; }
  ul.bullet { padding-left: 20px; }
  ul.bullet li { margin: 4px 0; }
  .footer { text-align:center; font-size:10px; color:#7a3e0d; margin-top:14px; }
  .stamp { position:absolute; right:18px; bottom:18px; width:90px; height:90px; border:2px solid #b8860b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; color:#7a3e0d; transform:rotate(-12deg); opacity:0.8; text-align:center; padding:6px; }
  .palm-img { max-width:48%; border:3px double #b8860b; border-radius:8px; padding:4px; background:#fff; }
`;

function chartGridHTML(chart: HoroscopeRequest["chart"]): string {
  if (!chart) return "";
  const grid: Record<number, [number, number]> = {
    12: [0, 0], 1: [0, 1], 2: [0, 2], 3: [0, 3],
    11: [1, 0], 4: [1, 3],
    10: [2, 0], 5: [2, 3],
    9: [3, 0], 8: [3, 1], 7: [3, 2], 6: [3, 3],
  };
  const housePlanets: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) housePlanets[i] = [];
  chart.planets.forEach((p) => housePlanets[p.house].push(p.planetId.substring(0, 2).toUpperCase()));
  let rows = "";
  for (let r = 0; r < 4; r++) {
    let cells = "";
    for (let c = 0; c < 4; c++) {
      const found = Object.entries(grid).find(([, [gr, gc]]) => gr === r && gc === c);
      if (found) {
        const h = parseInt(found[0]);
        cells += `<td class="chart-cell"><div class="house-num">House ${h}</div><div class="rashi-name">${getRashiName(((chart.lagna + h - 2) % 12) + 1, "ml")}</div><div class="planet-names">${housePlanets[h].join(", ")}</div></td>`;
      } else if (r === 1 && c === 1) {
        cells += `<td class="chart-center" colspan="2" rowspan="2"><div class="center-label">ജാതക ചക്രം</div><div class="lagna-label">ലഗ്നം: ${getRashiName(chart.lagna, "ml")}</div></td>`;
      } else if ((r === 1 && c === 2) || (r === 2 && c === 1) || (r === 2 && c === 2)) {
        continue;
      } else {
        cells += `<td class="chart-cell"></td>`;
      }
    }
    rows += `<tr>${cells}</tr>`;
  }
  return `<table class="chart-table"><tbody>${rows}</tbody></table>`;
}

function bulletList(items: string[] | undefined): string {
  if (!items?.length) return "<p><em>വിവരങ്ങൾ ലഭ്യമല്ല</em></p>";
  return `<ul class="bullet">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function palmistrySection(p: PalmistryReading | undefined, images?: { left?: string; right?: string }): string {
  if (!p) return "";
  const img = (src?: string, label?: string) =>
    src ? `<div style="text-align:center;margin:6px;"><img class="palm-img" src="${src}" /><div style="font-size:11px;color:#7a3e0d;margin-top:4px;">${label}</div></div>` : "";
  return `
    <div class="page">
      <div class="gold-border">
        <h2 class="section-title">🤲 കൈരേഖ ശാസ്ത്രം — Palm Reading</h2>
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
          ${img(images?.left, "Left Palm")}
          ${img(images?.right, "Right Palm")}
        </div>
        ${[
          ["ആയുസ്സ് രേഖ", p.lifeLine],
          ["ബുദ്ധി രേഖ", p.headLine],
          ["ഹൃദയ രേഖ", p.heartLine],
          ["ഭാഗ്യ രേഖ", p.fateLine],
          ["വിവാഹ രേഖ", p.marriageLine],
          ["ധന രേഖ", p.wealthLine],
          ["തൊഴിൽ സാധ്യത", p.careerOutlook],
          ["ആരോഗ്യ സൂചനകൾ", p.healthIndicators],
          ["വ്യക്തിത്വം", p.personality],
          ["ഭാവി വളർച്ച", p.futureGrowth],
        ].map(([k, v]) => `<div class="pred-card"><div class="pred-cat">${k}</div><div class="pred-text">${v}</div></div>`).join("")}
        ${p.marks ? `<div class="pred-card"><div class="pred-cat">പ്രത്യേക ചിഹ്നങ്ങൾ</div><div class="pred-text">${p.marks}</div></div>` : ""}
        ${p.comparison ? `<div class="pred-card"><div class="pred-cat">ഇടത് vs വലത് താരതമ്യം</div><div class="pred-text">${p.comparison}</div></div>` : ""}
      </div>
    </div>`;
}

export function generatePremiumHoroscopePDF(req: HoroscopeRequest): string {
  const ex = req.premiumExtras;
  const planetTable = req.chart?.planets.map((p) => `
    <tr>
      <td>${getPlanetName(p.planetId, "ml")} (${getPlanetName(p.planetId, "en")})</td>
      <td>${p.house}</td>
      <td>${getRashiName(p.rashi, "ml")}</td>
      <td>${p.isExalted ? "ഉച്ചം ✅" : p.isDebilitated ? "നീചം ⚠️" : "സാധാരണം"}</td>
    </tr>`).join("") || "";

  return `<!DOCTYPE html><html lang="ml"><head><meta charset="UTF-8"><title>${req.product === "palmistry" ? "Palm Reading" : "സമ്പൂർണ ജാതകം"} — ${req.customerName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;600;700&family=Manjari:wght@400;700&display=swap" rel="stylesheet">
  <style>${COSMIC_CSS}</style></head><body>

  <!-- Cover -->
  <div class="page">
    <div class="gold-border">
      ${req.godImage ? `<div style="text-align:center;"><img src="${req.godImage}" style="max-height:130px;" /></div>` : `<div class="om">ॐ</div>`}
      <h1 class="cover-title">${req.product === "palmistry" ? "🤲 കൈരേഖ ശാസ്ത്രം" : "🕉️ സമ്പൂർണ ജാതകം"}</h1>
      <div class="cover-sub">${req.product === "palmistry" ? "Premium Palm Reading Report" : "Premium Complete Vedic Horoscope"}</div>
      <div class="cover-card">
        <div class="row"><span class="label">പേര് / Name</span><span>${req.customerName}</span></div>
        <div class="row"><span class="label">ലിംഗം / Gender</span><span>${req.gender}</span></div>
        ${req.dateOfBirth ? `<div class="row"><span class="label">ജനന തീയതി</span><span>${req.dateOfBirth}</span></div>` : ""}
        ${req.timeOfBirth ? `<div class="row"><span class="label">ജനന സമയം</span><span>${req.timeOfBirth}</span></div>` : ""}
        ${req.placeOfBirth ? `<div class="row"><span class="label">ജനന സ്ഥലം</span><span>${req.placeOfBirth}</span></div>` : ""}
        ${req.birthStar ? `<div class="row"><span class="label">ജന്മ നക്ഷത്രം</span><span>${req.birthStar}</span></div>` : ""}
        <div class="row"><span class="label">റിപ്പോർട്ട് തീയതി</span><span>${new Date().toLocaleDateString("ml-IN")}</span></div>
      </div>
      <div class="footer">EI SOLUTIONS · Premium Astrology Services</div>
      <div class="stamp">EI SOLUTIONS<br/>Verified<br/>${new Date().getFullYear()}</div>
    </div>
  </div>

  ${req.product === "palmistry" ? palmistrySection(req.palmistry, req.palmImages) : `
  <!-- Chart -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">📜 ജാതക ചക്രം</h2>
    ${chartGridHTML(req.chart)}
    <h3 class="sub-title">ഗ്രഹനിലകൾ</h3>
    <table class="planet-table"><thead><tr><th>ഗ്രഹം</th><th>ഭാവം</th><th>രാശി</th><th>അവസ്ഥ</th></tr></thead><tbody>${planetTable}</tbody></table>
    ${req.chart ? `<p style="margin-top:10px;"><strong>രാശി:</strong> ${RASHIS[(req.chart.lagna - 1) % 12]?.ml} | <strong>ലഗ്നം:</strong> ${getRashiName(req.chart.lagna, "ml")}</p>` : ""}
  </div></div>

  <!-- Predictions -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">🔮 പൊതുവായ പ്രവചനങ്ങൾ</h2>
    ${(req.predictions || []).map((p) => `<div class="pred-card"><div class="pred-cat">${p.category}</div><div class="pred-text">${p.malayalam}</div></div>`).join("")}
  </div></div>

  ${ex ? `
  <!-- Life stages + Marriage + Children -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">🌱 ജീവിത ഘട്ടങ്ങൾ</h2>${bulletList(ex.lifeStages)}
    <h2 class="section-title">💍 വിവാഹ യോഗം</h2><p>${ex.marriagePeriod || ""}</p>
    <h2 class="section-title">👶 സന്താന ഭാഗ്യം</h2><p>${ex.childrenLuck || ""}</p>
  </div></div>

  <!-- Education / Career / Foreign / Wealth -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">📚 വിദ്യാഭ്യാസം</h2><p>${ex.educationOutlook || ""}</p>
    <h2 class="section-title">💼 തൊഴിൽ / ബിസിനസ്</h2><p>${ex.careerGrowth || ""}</p>
    <h2 class="section-title">✈️ വിദേശ യാത്ര</h2><p>${ex.foreignTravel || ""}</p>
    <h2 class="section-title">💰 സാമ്പത്തിക വളർച്ച കാലങ്ങൾ</h2>${bulletList(ex.wealthPeriods)}
  </div></div>

  <!-- Health, enemies, turning points -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">🏥 ആരോഗ്യ മുന്നറിയിപ്പുകൾ</h2>${bulletList(ex.healthWarnings)}
    <h2 class="section-title">⚔️ ശത്രു / തടസ്സങ്ങൾ</h2>${bulletList(ex.enemyObstacles)}
    <h2 class="section-title">🎯 ജീവിതത്തിലെ Turning Points</h2>${bulletList(ex.turningPoints)}
  </div></div>

  <!-- Yearly + Dasha + Gochara -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">📅 വാർഷിക ഫലങ്ങൾ (അടുത്ത 5 വർഷം)</h2>${bulletList(ex.yearlyOutlook)}
    <h2 class="section-title">🪐 ദശാ ഭുക്തി (Vimshottari)</h2>
    <table class="planet-table"><thead><tr><th>ദശ</th><th>തുടക്കം</th><th>അവസാനം</th><th>വർഷം</th></tr></thead>
      <tbody>${(ex.dashaTimeline || []).map((d) => `<tr><td>${d.planetMl} (${d.planet})</td><td>${d.startYear}</td><td>${d.endYear}</td><td>${d.years}</td></tr>`).join("")}</tbody></table>
    <h2 class="section-title">🌌 ഗോചര ഫലം</h2><p>${ex.gocharaSummary || ""}</p>
  </div></div>

  <!-- Remedies -->
  <div class="page"><div class="gold-border">
    <h2 class="section-title">🪔 പരിഹാരങ്ങൾ</h2>
    <h3 class="sub-title">പൂജകൾ</h3>${bulletList(ex.remedies?.poojas)}
    <h3 class="sub-title">ക്ഷേത്രങ്ങൾ</h3>${bulletList(ex.remedies?.temples)}
    <h3 class="sub-title">ശാന്തി കർമ്മങ്ങൾ</h3>${bulletList(ex.remedies?.shanti)}
    <h3 class="sub-title">ദാനം</h3>${bulletList(ex.remedies?.daanam)}
    <h3 class="sub-title">മന്ത്രങ്ങൾ</h3>${bulletList(ex.remedies?.mantras)}
    <h3 class="sub-title">വ്രതങ്ങൾ</h3>${bulletList(ex.remedies?.vrathas)}
    <h3 class="sub-title">നല്ല ദിവസങ്ങൾ</h3>${bulletList(ex.remedies?.goodDays)}
    <h3 class="sub-title">ജാഗ്രത വേണ്ട ദിവസങ്ങൾ</h3>${bulletList(ex.remedies?.badDays)}
  </div></div>` : ""}
  `}

  <div class="page"><div class="gold-border" style="text-align:center;padding:60px 24px;">
    <div class="om">🙏</div>
    <h2 class="section-title" style="border:none;">സർവേ ഭവന്തു സുഖിനഃ</h2>
    <p style="margin-top:18px;">May all be happy. May all be free from illness.<br/>May all see what is auspicious. May no one suffer.</p>
    <div class="footer" style="margin-top:30px;">© ${new Date().getFullYear()} EI SOLUTIONS · Premium Astrology<br/>Generated by ${req.userName} on ${new Date().toLocaleString("ml-IN")}</div>
  </div></div>

  </body></html>`;
}
