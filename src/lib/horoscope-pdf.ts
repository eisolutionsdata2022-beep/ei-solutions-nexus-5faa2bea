import type { HoroscopeRequest } from "./horoscope-types";
import { getRashiName, getPlanetName } from "./horoscope-engine";
import { RASHIS } from "./horoscope-types";

function getChartHTML(chart: HoroscopeRequest["chart"]): string {
  if (!chart) return "";

  // Build a South Indian style 4x4 grid chart
  // Layout: [12,1,2,3] / [11,_,_,4] / [10,_,_,5] / [9,8,7,6]
  const gridMap: Record<number, [number, number]> = {
    12: [0, 0], 1: [0, 1], 2: [0, 2], 3: [0, 3],
    11: [1, 0], 4: [1, 3],
    10: [2, 0], 5: [2, 3],
    9: [3, 0], 8: [3, 1], 7: [3, 2], 6: [3, 3],
  };

  const housePlanets: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) housePlanets[i] = [];
  chart.planets.forEach((p) => {
    const abbr = p.planetId.substring(0, 2).toUpperCase();
    housePlanets[p.house].push(abbr);
  });

  let rows = "";
  for (let r = 0; r < 4; r++) {
    let cells = "";
    for (let c = 0; c < 4; c++) {
      const houseNum = Object.entries(gridMap).find(([, [gr, gc]]) => gr === r && gc === c);
      if (houseNum) {
        const h = parseInt(houseNum[0]);
        const planets = housePlanets[h].join(", ");
        const rashiName = getRashiName(((chart.lagna + h - 2) % 12) + 1, "ml");
        cells += `<td class="chart-cell"><div class="house-num">${h}</div><div class="rashi-name">${rashiName}</div><div class="planet-names">${planets}</div></td>`;
      } else {
        if (r === 1 && c === 1) {
          cells += `<td class="chart-center" colspan="2" rowspan="2"><div class="center-label">ജാതക ചക്രം</div><div class="lagna-label">ലഗ്നം: ${getRashiName(chart.lagna, "ml")}</div></td>`;
        } else if ((r === 1 && c === 2) || (r === 2 && c === 1) || (r === 2 && c === 2)) {
          continue;
        } else {
          cells += `<td class="chart-cell"></td>`;
        }
      }
    }
    rows += `<tr>${cells}</tr>`;
  }

  return `<table class="chart-table"><tbody>${rows}</tbody></table>`;
}

export function generateHoroscopePDF(request: HoroscopeRequest & { godImage?: string }): string {
  const lang = request.language || "Both";
  const predictions = request.predictions || [];

  const positives = predictions.filter((p) => p.severity === "positive");
  const negatives = predictions.filter((p) => p.severity === "negative");
  const neutrals = predictions.filter((p) => p.severity === "neutral");

  const planetTable = request.chart?.planets.map((p) => `
    <tr>
      <td>${getPlanetName(p.planetId, "ml")} (${getPlanetName(p.planetId, "en")})</td>
      <td>${p.house}</td>
      <td>${getRashiName(p.rashi, "ml")} (${getRashiName(p.rashi, "en")})</td>
      <td>${p.isExalted ? "ഉച്ചം ✅" : p.isDebilitated ? "നീചം ⚠️" : "സാധാരണം"}</td>
    </tr>
  `).join("") || "";

  const predictionHTML = (preds: typeof predictions, title: string, color: string) => {
    if (!preds.length) return "";
    return `
      <div class="prediction-section">
        <h3 style="color:${color};border-bottom:2px solid ${color};padding-bottom:4px;">${title}</h3>
        ${preds.map((p) => `
          <div class="prediction-item" style="border-left:3px solid ${color};">
            <div class="pred-category">${p.category}</div>
            ${lang !== "English" ? `<p class="pred-ml">${p.malayalam}</p>` : ""}
            ${lang !== "Malayalam" ? `<p class="pred-en">${p.english}</p>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Malayalam', 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 20px; }

  .header { text-align: center; background: linear-gradient(135deg, #0c2461, #1e3a8a); color: white; padding: 20px 20px 30px; border-radius: 8px; margin-bottom: 20px; }
  .god-image { width: 80px; height: 80px; object-fit: contain; border-radius: 50%; border: 3px solid #d4a932; margin: 0 auto 10px; display: block; background: rgba(255,255,255,0.1); padding: 4px; }
  .header h1 { font-size: 28px; margin-bottom: 4px; letter-spacing: 1px; }
  .header h2 { font-size: 16px; font-weight: 400; opacity: 0.85; }
  .header .subtitle { font-size: 13px; opacity: 0.7; margin-top: 8px; }

  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section-title { font-size: 18px; font-weight: 700; color: #0c2461; border-bottom: 2px solid #d4a932; padding-bottom: 6px; margin-bottom: 12px; }

  .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .customer-item { display: flex; gap: 8px; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #eee; }
  .customer-label { font-weight: 600; min-width: 120px; color: #555; }

  .chart-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  .chart-cell { border: 2px solid #0c2461; width: 25%; height: 80px; text-align: center; vertical-align: middle; padding: 4px; font-size: 11px; background: #f8f9ff; }
  .chart-center { border: 2px solid #0c2461; text-align: center; vertical-align: middle; background: linear-gradient(135deg, #f0f4ff, #e8ecff); }
  .center-label { font-size: 16px; font-weight: 700; color: #0c2461; }
  .lagna-label { font-size: 12px; color: #d4a932; font-weight: 600; margin-top: 4px; }
  .house-num { font-weight: 700; color: #0c2461; font-size: 13px; }
  .rashi-name { font-size: 10px; color: #666; }
  .planet-names { font-size: 11px; color: #c0392b; font-weight: 600; margin-top: 2px; }

  table.planet-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.planet-table th { background: #0c2461; color: white; padding: 8px; text-align: left; }
  table.planet-table td { padding: 8px; border-bottom: 1px solid #eee; }
  table.planet-table tr:nth-child(even) { background: #f8f9ff; }

  .prediction-section { margin-bottom: 16px; }
  .prediction-item { padding: 8px 12px; margin: 6px 0; background: #fafbff; border-radius: 4px; }
  .pred-category { font-weight: 700; font-size: 13px; color: #0c2461; margin-bottom: 2px; }
  .pred-ml { font-size: 14px; color: #333; margin: 2px 0; }
  .pred-en { font-size: 12px; color: #666; font-style: italic; }

  .footer { text-align: center; padding: 20px; border-top: 2px solid #d4a932; margin-top: 30px; font-size: 11px; color: #888; }
  .footer .brand { font-size: 14px; font-weight: 700; color: #0c2461; }

  .gold-divider { height: 3px; background: linear-gradient(90deg, transparent, #d4a932, transparent); margin: 15px 0; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    ${request.godImage ? `<img src="${request.godImage}" class="god-image" alt="God Image" />` : ""}
    <h1>☉ ജ്യോതിഷ ഫലം ☉</h1>
    <h2>Horoscope Report</h2>
    <div class="subtitle">EI Solutions — Premium Astrology Service</div>
  </div>

  <!-- Customer Details -->
  <div class="section">
    <div class="section-title">👤 വിവരങ്ങൾ / Customer Details</div>
    <div class="customer-grid">
      <div class="customer-item"><span class="customer-label">പേര് / Name:</span> ${request.customerName}</div>
      <div class="customer-item"><span class="customer-label">ലിംഗം / Gender:</span> ${request.gender}</div>
      <div class="customer-item"><span class="customer-label">ജനന തീയതി / DOB:</span> ${request.dateOfBirth}</div>
      <div class="customer-item"><span class="customer-label">ജനന സമയം / Time:</span> ${request.timeOfBirth}</div>
      <div class="customer-item"><span class="customer-label">ജനന സ്ഥലം / Place:</span> ${request.placeOfBirth}</div>
      <div class="customer-item"><span class="customer-label">ലഗ്നം / Lagna:</span> ${request.chart ? getRashiName(request.chart.lagna, "ml") + " (" + getRashiName(request.chart.lagna, "en") + ")" : "N/A"}</div>
    </div>
  </div>

  <div class="gold-divider"></div>

  <!-- Chart -->
  <div class="section">
    <div class="section-title">🔮 ജാതക ചക്രം / Birth Chart</div>
    ${getChartHTML(request.chart)}
  </div>

  <div class="gold-divider"></div>

  <!-- Planet Table -->
  <div class="section">
    <div class="section-title">🪐 ഗ്രഹ സ്ഥിതി / Planetary Positions</div>
    <table class="planet-table">
      <thead><tr><th>ഗ്രഹം / Planet</th><th>ഭാവം / House</th><th>രാശി / Rashi</th><th>സ്ഥിതി / Status</th></tr></thead>
      <tbody>${planetTable}</tbody>
    </table>
  </div>

  <div class="gold-divider"></div>

  <!-- Predictions -->
  <div class="section">
    <div class="section-title">📜 ഫലങ്ങൾ / Predictions</div>
    ${predictionHTML(positives, "✅ അനുകൂല ഫലങ്ങൾ / Positive Predictions", "#27ae60")}
    ${predictionHTML(neutrals, "⚖️ സാധാരണ ഫലങ്ങൾ / Neutral Predictions", "#f39c12")}
    ${predictionHTML(negatives, "⚠️ പ്രതികൂല ഫലങ്ങൾ / Caution Areas", "#e74c3c")}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="brand">EI SOLUTIONS — Premium Astrology Services</div>
    <p style="margin-top:6px;">ഈ റിപ്പോർട്ട് ഡിജിറ്റലായി സൃഷ്ടിച്ചതാണ്. / This report is digitally generated.</p>
    <p>Generated on: ${new Date().toLocaleDateString("en-IN")}</p>
  </div>
</div>
</body>
</html>`;
}
