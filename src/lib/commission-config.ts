/**
 * Commission configuration and split logic for recharge/BBPS platform.
 * All SP Keys match the Ambika Recharge API operator codes.
 */

export interface CommissionRate {
  id?: string;
  serviceType: string;
  operator: string;
  totalPercent: number;
  retailerPercent: number;
  distributorPercent: number;
  adminPercent: number;
  serviceCharge: number;
}

export interface CommissionSplit {
  retailerAmount: number;
  distributorAmount: number;
  adminAmount: number;
  serviceChargeAmount: number;
  totalCommission: number;
}

export const DEFAULT_COMMISSION_RATES: Omit<CommissionRate, "id">[] = [
  // Prepaid Mobile
  { serviceType: "prepaid", operator: "3", totalPercent: 1.1, retailerPercent: 0.7, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "ALN", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "AMM", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "ANC", totalPercent: 1.1, retailerPercent: 0.7, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "5", totalPercent: 4.5, retailerPercent: 3.5, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "7", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "6", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "4", totalPercent: 4.5, retailerPercent: 3.5, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "117", totalPercent: 2.2, retailerPercent: 1.5, distributorPercent: 0.4, adminPercent: 0.3, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "12", totalPercent: 4.0, retailerPercent: 3.0, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "13", totalPercent: 3.25, retailerPercent: 2.5, distributorPercent: 0.4, adminPercent: 0.35, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "65", totalPercent: 3.25, retailerPercent: 2.5, distributorPercent: 0.4, adminPercent: 0.35, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "67", totalPercent: 3.25, retailerPercent: 2.5, distributorPercent: 0.4, adminPercent: 0.35, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "68", totalPercent: 3.25, retailerPercent: 2.5, distributorPercent: 0.4, adminPercent: 0.35, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "116", totalPercent: 0.4, retailerPercent: 0.3, distributorPercent: 0.05, adminPercent: 0.05, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "VIL", totalPercent: 4.0, retailerPercent: 3.0, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "VIN", totalPercent: 3.5, retailerPercent: 2.7, distributorPercent: 0.4, adminPercent: 0.4, serviceCharge: 2 },
  { serviceType: "prepaid", operator: "37", totalPercent: 4.0, retailerPercent: 3.0, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  // Postpaid
  { serviceType: "postpaid", operator: "101", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "postpaid", operator: "104", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "postpaid", operator: "102", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "postpaid", operator: "103", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "postpaid", operator: "107", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "postpaid", operator: "106", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  // DTH
  { serviceType: "dth", operator: "51", totalPercent: 4.3, retailerPercent: 3.0, distributorPercent: 0.7, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "53", totalPercent: 3.7, retailerPercent: 2.5, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "54", totalPercent: 3.0, retailerPercent: 2.0, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 5 },
  { serviceType: "dth", operator: "55", totalPercent: 3.8, retailerPercent: 2.6, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "56", totalPercent: 3.7, retailerPercent: 2.5, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  // Landline
  { serviceType: "landline", operator: "201", totalPercent: 3.0, retailerPercent: 2.0, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 5 },
  { serviceType: "landline", operator: "202", totalPercent: 1.5, retailerPercent: 1.0, distributorPercent: 0.25, adminPercent: 0.25, serviceCharge: 5 },
  { serviceType: "landline", operator: "203", totalPercent: 1.5, retailerPercent: 1.0, distributorPercent: 0.25, adminPercent: 0.25, serviceCharge: 5 },
  { serviceType: "landline", operator: "206", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 },
  { serviceType: "landline", operator: "204", totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 },
  // Google Play
  { serviceType: "google_play", operator: "117", totalPercent: 2.2, retailerPercent: 1.5, distributorPercent: 0.4, adminPercent: 0.3, serviceCharge: 5 },
  // FASTag - all 0.23%
  ...["3819","3805","3804","3808","3813","3807","3801","3816","3806","3803","3802","3818","3815","3820","3809","3811","3812","3824","3825","3822","3814","3821"].map(op => ({
    serviceType: "fastag", operator: op, totalPercent: 0.23, retailerPercent: 0.15, distributorPercent: 0.04, adminPercent: 0.04, serviceCharge: 5
  })),
  // LPG
  { serviceType: "lpg", operator: "802", totalPercent: 1.2, retailerPercent: 0.8, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "lpg", operator: "801", totalPercent: 1.2, retailerPercent: 0.8, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  { serviceType: "lpg", operator: "803", totalPercent: 1.2, retailerPercent: 0.8, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
];

// Helper to generate ₹1 flat commission for BBPS billing services
function bbpsRate(serviceType: string, operator: string, commission = 1.0): Omit<CommissionRate, "id"> {
  return { serviceType, operator, totalPercent: commission, retailerPercent: commission * 0.6, distributorPercent: commission * 0.2, adminPercent: commission * 0.2, serviceCharge: 10 };
}

// Add all electricity rates
const electricityOps = ["346","323","331","398","301","348","365","512","315","349","350","343","326","345","338","360","307","502","308","513","312","509","351","379","383","352","382","371","380","316","361","317","503","355","303","504","332","384","314","505","362","333","347","319","339","378","309","514","320","374","342","341","510","318","353","511","381","322","304","372","336","305","327","386","310","515","506","377","330","507","373","375","324","306","328","356","354","344","396","385","368","340","369","370","357","376","508","364","311","517","313","337","367","366","329","363"];
electricityOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("electricity", op)));

// Water
const waterOps = ["670","660","666","671","652","676","663","665","672","661","656","657","679","677","680","655","678","654","668","653","673","664","674","675","669","658","667","659","662","650","651"];
waterOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("water", op)));

// Broadband (0% commission)
const broadbandOps = ["254","1625","274","261","258","252","262","272","270","259","263","279","253","264","269","260","282","283","265","273","255","277","256","271","251","266","257","267","278","276","275"];
broadbandOps.forEach(op => DEFAULT_COMMISSION_RATES.push({ serviceType: "broadband", operator: op, totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 }));

// Piped Gas
const pipedGasOps = ["410","400","418","419","412","411","409","416","401","404","417","402","415","403","413","421","407","420","405","406","414","408"];
pipedGasOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("piped_gas", op, op === "401" || op === "407" ? 1.2 : 0)));

// Loan Repayment
const loanOps = ["2512","2544","2581","2567","2582","2559","2543","2569","2584","2583","2525","2578","2542","2514","2546","2586","2585","2536","2555","2587","2517","2501","2566","2588","2523","2524","2538","2563","2515","2564","2590","2589","2552","2573","2532","2591","2527","2548","2592","2519","2521","2574","2551","2506","2560","2565","2553","2511","2556","2593","2595","2594","2522","2568","2508","2596","2597","2598","2579","2562","2599","2510","2513","2550","2537","25011","2518","25012","25013","2545","25014","2535","2530","25016","25015","25038","2509","25017","2531","2504","25018","25019","2554","2520","2558","2549","2547","25020","25021","2503","2561","25024","25022","25023","2529","25025","2577","2576","25026","2570","2571","25027","2575","2540","2507","25028","2534","25029","2572","2526","2528","25030","2502","25031","2557","2505","25032","25033","2541","25034","25035","2516","2539","25036","25037","2580","2533"];
loanOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("loan_repayment", op)));

// Life Insurance
const lifeInsOps = ["911","905","907","902","901","938","912","906","909","903","929","908","910","904"];
lifeInsOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("life_insurance", op, ["902","901","938","912","929"].includes(op) ? 1.0 : 0)));

// Cable TV
const cableTvOps = ["3903","3301","3904","3902"];
cableTvOps.forEach(op => DEFAULT_COMMISSION_RATES.push(bbpsRate("cable_tv", op, op === "3301" ? 1.5 : 0)));

// Municipal Taxes
const municipalOps = ["4603","4606","4601","4602","4605","4604"];
municipalOps.forEach(op => DEFAULT_COMMISSION_RATES.push({ serviceType: "municipal_taxes", operator: op, totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 }));

// Education Fees
["4702","4701"].forEach(op => DEFAULT_COMMISSION_RATES.push({ serviceType: "education_fees", operator: op, totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 }));

// Housing Society
["4802","4801"].forEach(op => DEFAULT_COMMISSION_RATES.push({ serviceType: "housing_society", operator: op, totalPercent: 0, retailerPercent: 0, distributorPercent: 0, adminPercent: 0, serviceCharge: 5 }));

export function calculateCommissionSplit(amount: number, rate: CommissionRate): CommissionSplit {
  const retailerAmount = Math.round((amount * rate.retailerPercent) / 100 * 100) / 100;
  const distributorAmount = Math.round((amount * rate.distributorPercent) / 100 * 100) / 100;
  const adminAmount = Math.round((amount * rate.adminPercent) / 100 * 100) / 100;
  return {
    retailerAmount,
    distributorAmount,
    adminAmount,
    serviceChargeAmount: rate.serviceCharge,
    totalCommission: retailerAmount + distributorAmount + adminAmount,
  };
}

// ──────────────── UI Service Catalog ────────────────
interface Operator { id: string; name: string; logo: string; }
interface CatalogEntry { label: string; icon: string; operators: Operator[]; }

export const SERVICE_CATALOG: Record<string, CatalogEntry> = {
  prepaid: {
    label: "Prepaid Recharge",
    icon: "📱",
    operators: [
      { id: "3", name: "Airtel", logo: "🔴" },
      { id: "ALN", name: "Airtel Live (Non GST)", logo: "🔴" },
      { id: "AMM", name: "Airtel Money", logo: "🔴" },
      { id: "ANC", name: "Airtel Non Complain", logo: "🔴" },
      { id: "5", name: "BSNL Special Tariff", logo: "🟢" },
      { id: "7", name: "BSNL J&K Special", logo: "🟢" },
      { id: "6", name: "BSNL J&K Talktime", logo: "🟢" },
      { id: "4", name: "BSNL Talktime", logo: "🟢" },
      { id: "117", name: "Google Play", logo: "▶️" },
      { id: "12", name: "Idea", logo: "🟣" },
      { id: "13", name: "MTNL Delhi Special", logo: "🔵" },
      { id: "65", name: "MTNL Delhi Talktime", logo: "🔵" },
      { id: "67", name: "MTNL Mumbai Talktime", logo: "🔵" },
      { id: "68", name: "MTNL Mumbai Special", logo: "🔵" },
      { id: "116", name: "Reliance Jio", logo: "🔵" },
      { id: "VIL", name: "Vi", logo: "🔴" },
      { id: "VIN", name: "VI (Voda/Idea)", logo: "🔴" },
      { id: "37", name: "Vodafone", logo: "🔴" },
    ],
  },
  postpaid: {
    label: "Postpaid",
    icon: "📞",
    operators: [
      { id: "101", name: "Airtel Postpaid", logo: "🔴" },
      { id: "104", name: "BSNL Postpaid", logo: "🟢" },
      { id: "102", name: "Idea Postpaid", logo: "🟣" },
      { id: "103", name: "Jio Postpaid", logo: "🔵" },
      { id: "107", name: "Jio Pre On Post", logo: "🔵" },
      { id: "106", name: "Vodafone Postpaid", logo: "🔴" },
    ],
  },
  dth: {
    label: "DTH Services",
    icon: "📺",
    operators: [
      { id: "51", name: "Airtel Digital TV", logo: "🔴" },
      { id: "53", name: "Dish TV", logo: "🟠" },
      { id: "54", name: "Sun Direct", logo: "🟡" },
      { id: "55", name: "Tata Play", logo: "🔵" },
      { id: "56", name: "Videocon D2h", logo: "🟤" },
    ],
  },
  landline: {
    label: "Landline",
    icon: "☎️",
    operators: [
      { id: "201", name: "Airtel Landline", logo: "🔴" },
      { id: "202", name: "BSNL Corporate", logo: "🟢" },
      { id: "203", name: "BSNL Individual", logo: "🟢" },
      { id: "206", name: "MTNL Delhi Landline", logo: "🔵" },
      { id: "204", name: "MTNL Mumbai Landline", logo: "🔵" },
    ],
  },
  electricity: {
    label: "Electricity",
    icon: "⚡",
    operators: [
      { id: "346", name: "Assam Power (RAPDR)", logo: "⚡" },
      { id: "323", name: "Adani Electricity Mumbai", logo: "⚡" },
      { id: "331", name: "AVVNL Ajmer", logo: "⚡" },
      { id: "398", name: "APCPDCL Andhra Pradesh", logo: "⚡" },
      { id: "301", name: "APEPDCL Eastern AP", logo: "⚡" },
      { id: "348", name: "APSPDCL Southern AP", logo: "⚡" },
      { id: "365", name: "Assam Power (Non-RAPDR)", logo: "⚡" },
      { id: "512", name: "Assam Power Smart Prepaid", logo: "⚡" },
      { id: "315", name: "BESCOM Bangalore", logo: "⚡" },
      { id: "349", name: "Bharatpur Electricity", logo: "⚡" },
      { id: "350", name: "Bikaner BKESL", logo: "⚡" },
      { id: "343", name: "BEST Mumbai", logo: "⚡" },
      { id: "326", name: "BSES Rajdhani Delhi", logo: "⚡" },
      { id: "345", name: "BSES Yamuna", logo: "⚡" },
      { id: "338", name: "CESC Calcutta", logo: "⚡" },
      { id: "360", name: "CESCOM Chamundeshwari", logo: "⚡" },
      { id: "307", name: "Chhattisgarh CSEB", logo: "⚡" },
      { id: "502", name: "DNH & DD Power", logo: "⚡" },
      { id: "308", name: "DGVCL South Gujarat", logo: "⚡" },
      { id: "513", name: "DGVCL Fetch & Pay", logo: "⚡" },
      { id: "312", name: "DHBVN Haryana", logo: "⚡" },
      { id: "509", name: "DVVNL Dakshinanchal", logo: "⚡" },
      { id: "351", name: "Daman & Diu Electricity", logo: "⚡" },
      { id: "379", name: "Nagaland Power", logo: "⚡" },
      { id: "383", name: "Arunachal Pradesh Power", logo: "⚡" },
      { id: "352", name: "DNH Power Distribution", logo: "⚡" },
      { id: "382", name: "Chandigarh Electricity", logo: "⚡" },
      { id: "371", name: "Goa Electricity", logo: "⚡" },
      { id: "380", name: "Puducherry Electricity", logo: "⚡" },
      { id: "316", name: "GESCOM Gulbarga", logo: "⚡" },
      { id: "361", name: "HPSEB Himachal", logo: "⚡" },
      { id: "317", name: "HESCOM Hubli", logo: "⚡" },
      { id: "503", name: "Hukkeri Rural Electric", logo: "⚡" },
      { id: "355", name: "India Power WB", logo: "⚡" },
      { id: "303", name: "India Power Bihar", logo: "⚡" },
      { id: "504", name: "IPCL", logo: "⚡" },
      { id: "332", name: "JVVNL Jaipur", logo: "⚡" },
      { id: "384", name: "J&K Power", logo: "⚡" },
      { id: "314", name: "JUSCO Jamshedpur", logo: "⚡" },
      { id: "505", name: "JBVNL Prepaid", logo: "⚡" },
      { id: "362", name: "JBVNL Jharkhand", logo: "⚡" },
      { id: "333", name: "JDVVNL Jodhpur", logo: "⚡" },
      { id: "347", name: "KESCO Kanpur", logo: "⚡" },
      { id: "319", name: "KSEB Kerala", logo: "⚡" },
      { id: "339", name: "Kota Electricity", logo: "⚡" },
      { id: "378", name: "MP Poorv Urban", logo: "⚡" },
      { id: "309", name: "MGVCL Madhya Gujarat", logo: "⚡" },
      { id: "514", name: "MGVCL Fetch & Pay", logo: "⚡" },
      { id: "320", name: "MPMKVVCL Rural", logo: "⚡" },
      { id: "374", name: "MPMKVVCL Urban", logo: "⚡" },
      { id: "342", name: "MP Paschim Indore", logo: "⚡" },
      { id: "341", name: "MPPKVVCL Rural", logo: "⚡" },
      { id: "510", name: "MVVNL Madhyanchal", logo: "⚡" },
      { id: "318", name: "MESCOM Mangalore", logo: "⚡" },
      { id: "353", name: "Meghalaya Power", logo: "⚡" },
      { id: "511", name: "MePDCL Smart Prepaid", logo: "⚡" },
      { id: "381", name: "MP Poorv Jabalpur NGB", logo: "⚡" },
      { id: "322", name: "MSEDCL Maharashtra", logo: "⚡" },
      { id: "304", name: "Muzaffarpur Vidyut", logo: "⚡" },
      { id: "372", name: "NDMC Electricity", logo: "⚡" },
      { id: "336", name: "Noida Power", logo: "⚡" },
      { id: "305", name: "North Bihar Power", logo: "⚡" },
      { id: "327", name: "NESCO Odisha", logo: "⚡" },
      { id: "386", name: "TSNPDCL Telangana", logo: "⚡" },
      { id: "310", name: "PGVCL Paschim Gujarat", logo: "⚡" },
      { id: "515", name: "PGVCL Fetch & Pay", logo: "⚡" },
      { id: "506", name: "PVVNL Paschimanchal", logo: "⚡" },
      { id: "377", name: "Mizoram Power", logo: "⚡" },
      { id: "330", name: "PSPCL Punjab", logo: "⚡" },
      { id: "507", name: "PUVVNL Purvanchal", logo: "⚡" },
      { id: "373", name: "Sikkim Power Rural", logo: "⚡" },
      { id: "375", name: "Sikkim Power Urban", logo: "⚡" },
      { id: "324", name: "SNDL Nagpur", logo: "⚡" },
      { id: "306", name: "South Bihar Power", logo: "⚡" },
      { id: "328", name: "SOUTHCO Odisha", logo: "⚡" },
      { id: "356", name: "TNEB Tamil Nadu", logo: "⚡" },
      { id: "354", name: "Tata Power Mumbai", logo: "⚡" },
      { id: "344", name: "Tata Power Delhi", logo: "⚡" },
      { id: "396", name: "TSSPDCL Telangana", logo: "⚡" },
      { id: "385", name: "Torrent Power", logo: "⚡" },
      { id: "368", name: "Torrent Power Ahmedabad", logo: "⚡" },
      { id: "340", name: "Torrent Power Agra", logo: "⚡" },
      { id: "369", name: "Torrent Power Bhiwandi", logo: "⚡" },
      { id: "370", name: "Torrent Power Surat", logo: "⚡" },
      { id: "357", name: "TP Ajmer Distribution", logo: "⚡" },
      { id: "376", name: "TP Central Odisha", logo: "⚡" },
      { id: "508", name: "TP Southern Odisha Prepaid", logo: "⚡" },
      { id: "364", name: "Tripura Electricity", logo: "⚡" },
      { id: "311", name: "UGVCL Uttar Gujarat", logo: "⚡" },
      { id: "517", name: "UGVCL Fetch & Pay", logo: "⚡" },
      { id: "313", name: "UHBVN Haryana", logo: "⚡" },
      { id: "337", name: "UPPCL Rural", logo: "⚡" },
      { id: "367", name: "UPPCL Urban", logo: "⚡" },
      { id: "366", name: "Uttarakhand Power", logo: "⚡" },
      { id: "329", name: "WESCO Odisha", logo: "⚡" },
      { id: "363", name: "WBSEDCL West Bengal", logo: "⚡" },
    ],
  },
  water: {
    label: "Water Bill",
    icon: "💧",
    operators: [
      { id: "670", name: "Ahmedabad Municipal", logo: "💧" },
      { id: "660", name: "BWSSB Bangalore", logo: "💧" },
      { id: "666", name: "Bhopal Municipal", logo: "💧" },
      { id: "671", name: "DDA Delhi", logo: "💧" },
      { id: "652", name: "Delhi Jal Board", logo: "💧" },
      { id: "676", name: "PHE Water Mizoram", logo: "💧" },
      { id: "663", name: "Warangal Municipal", logo: "💧" },
      { id: "665", name: "Gwalior Municipal", logo: "💧" },
      { id: "672", name: "Haryana UDA", logo: "💧" },
      { id: "661", name: "HMWSSB Hyderabad", logo: "💧" },
      { id: "656", name: "Indore Municipal", logo: "💧" },
      { id: "657", name: "Jabalpur Municipal", logo: "💧" },
      { id: "679", name: "KDMC Kalyan", logo: "💧" },
      { id: "677", name: "KWA Kerala", logo: "💧" },
      { id: "680", name: "MP Urban E-Nagarpalika", logo: "💧" },
      { id: "655", name: "MC Ludhiana", logo: "💧" },
      { id: "678", name: "MC Chandigarh", logo: "💧" },
      { id: "654", name: "MC Jalandhar", logo: "💧" },
      { id: "668", name: "MC Amritsar", logo: "💧" },
      { id: "653", name: "MC Gurugram", logo: "💧" },
      { id: "673", name: "Mysuru City Corp", logo: "💧" },
      { id: "664", name: "NDMC Water", logo: "💧" },
      { id: "674", name: "PCMC Pimpri Chinchwad", logo: "💧" },
      { id: "675", name: "PMC Pune Water", logo: "💧" },
      { id: "669", name: "Punjab MC/Councils", logo: "💧" },
      { id: "658", name: "Ranchi Municipal", logo: "💧" },
      { id: "667", name: "Silvassa Municipal", logo: "💧" },
      { id: "659", name: "Surat Municipal", logo: "💧" },
      { id: "662", name: "Ujjain Nagar Nigam", logo: "💧" },
      { id: "650", name: "UIT Bhiwadi", logo: "💧" },
      { id: "651", name: "Uttarakhand Jal Sansthan", logo: "💧" },
    ],
  },
  piped_gas: {
    label: "Piped Gas",
    icon: "🔥",
    operators: [
      { id: "410", name: "Aavantika Gas", logo: "🔥" },
      { id: "400", name: "Adani Gas", logo: "🔥" },
      { id: "418", name: "Assam Gas Company", logo: "🔥" },
      { id: "419", name: "Bhagyanagar Gas", logo: "🔥" },
      { id: "412", name: "Central UP Gas", logo: "🔥" },
      { id: "411", name: "Charotar Gas", logo: "🔥" },
      { id: "409", name: "GAIL Gas", logo: "🔥" },
      { id: "416", name: "Green Gas (GGL)", logo: "🔥" },
      { id: "401", name: "Gujarat Gas", logo: "🔥" },
      { id: "404", name: "Haryana City Gas", logo: "🔥" },
      { id: "417", name: "Indian Oil-Adani Gas", logo: "🔥" },
      { id: "402", name: "Indraprastha Gas", logo: "🔥" },
      { id: "415", name: "IRM Energy", logo: "🔥" },
      { id: "403", name: "Mahanagar Gas", logo: "🔥" },
      { id: "413", name: "MNGL Maharashtra", logo: "🔥" },
      { id: "421", name: "Naveriya Gas", logo: "🔥" },
      { id: "407", name: "Sabarmati Gas", logo: "🔥" },
      { id: "420", name: "Sanwariya Gas", logo: "🔥" },
      { id: "405", name: "Torrent Gas Moradabad", logo: "🔥" },
      { id: "406", name: "Tripura Natural Gas", logo: "🔥" },
      { id: "414", name: "UCPGPL", logo: "🔥" },
      { id: "408", name: "Vadodara Gas", logo: "🔥" },
    ],
  },
  lpg: {
    label: "LPG Gas",
    icon: "🛢️",
    operators: [
      { id: "802", name: "BPCL", logo: "🛢️" },
      { id: "801", name: "HPCL", logo: "🛢️" },
      { id: "803", name: "Indane Gas (IOC)", logo: "🛢️" },
    ],
  },
  broadband: {
    label: "Broadband",
    icon: "🌐",
    operators: [
      { id: "254", name: "Act Fibernet", logo: "🌐" },
      { id: "1625", name: "Airtel Broadband", logo: "🔴" },
      { id: "274", name: "Alliance Broadband", logo: "🌐" },
      { id: "261", name: "Asianet Broadband", logo: "🌐" },
      { id: "258", name: "Comway Broadband", logo: "🌐" },
      { id: "252", name: "Connect Broadband", logo: "🌐" },
      { id: "262", name: "Den Broadband", logo: "🌐" },
      { id: "272", name: "Excell Broadband", logo: "🌐" },
      { id: "270", name: "Flash Fibernet", logo: "🌐" },
      { id: "259", name: "Fusionnet", logo: "🌐" },
      { id: "263", name: "Gigatel Networks", logo: "🌐" },
      { id: "279", name: "GTPL KCBPL", logo: "🌐" },
      { id: "253", name: "Hathway Broadband", logo: "🌐" },
      { id: "264", name: "Instalinks", logo: "🌐" },
      { id: "269", name: "Instanet Broadband", logo: "🌐" },
      { id: "260", name: "ION", logo: "🌐" },
      { id: "282", name: "Kerala Vision", logo: "🌐" },
      { id: "283", name: "Microscan", logo: "🌐" },
      { id: "265", name: "M-NET Fiber", logo: "🌐" },
      { id: "273", name: "Netplus Broadband", logo: "🌐" },
      { id: "255", name: "Nextra Broadband", logo: "🌐" },
      { id: "277", name: "Skylink Fibernet", logo: "🌐" },
      { id: "256", name: "Spectranet", logo: "🌐" },
      { id: "271", name: "Swifttele", logo: "🌐" },
      { id: "251", name: "Tikona Broadband", logo: "🌐" },
      { id: "266", name: "Timbl Broadband", logo: "🌐" },
      { id: "257", name: "TTN Broadband", logo: "🌐" },
      { id: "267", name: "Vfibernet", logo: "🌐" },
      { id: "278", name: "Wish Net", logo: "🌐" },
    ],
  },
  fastag: {
    label: "FASTag",
    icon: "🚗",
    operators: [
      { id: "3819", name: "Airtel Payment Bank", logo: "🏷️" },
      { id: "3805", name: "Axis Bank", logo: "🏷️" },
      { id: "3804", name: "Bank of Baroda", logo: "🏷️" },
      { id: "3808", name: "Equitas", logo: "🏷️" },
      { id: "3813", name: "Federal Bank", logo: "🏷️" },
      { id: "3807", name: "HDFC Bank", logo: "🏷️" },
      { id: "3801", name: "ICICI Bank", logo: "🏷️" },
      { id: "3816", name: "IDBI Bank", logo: "🏷️" },
      { id: "3806", name: "IDFC First Bank", logo: "🏷️" },
      { id: "3803", name: "Indian Highways", logo: "🏷️" },
      { id: "3802", name: "IndusInd Bank", logo: "🏷️" },
      { id: "3818", name: "IOB", logo: "🏷️" },
      { id: "3815", name: "J&K Bank", logo: "🏷️" },
      { id: "3820", name: "Karnataka Bank", logo: "🏷️" },
      { id: "3809", name: "Kotak Mahindra", logo: "🏷️" },
      { id: "3811", name: "Paul Merchants", logo: "🏷️" },
      { id: "3812", name: "Paytm Payments Bank", logo: "🏷️" },
      { id: "3824", name: "Saraswat Bank", logo: "🏷️" },
      { id: "3825", name: "South Indian Bank", logo: "🏷️" },
      { id: "3822", name: "SBI FASTag", logo: "🏷️" },
      { id: "3814", name: "Transaction Analyst", logo: "🏷️" },
      { id: "3821", name: "Transcorp International", logo: "🏷️" },
    ],
  },
  loan_repayment: {
    label: "Loan Repayment",
    icon: "💳",
    operators: [
      { id: "2512", name: "Aavas Financiers", logo: "💳" },
      { id: "2544", name: "Adani Capital", logo: "💳" },
      { id: "2581", name: "Adani Housing Finance", logo: "💳" },
      { id: "2567", name: "Aditya Birla Housing", logo: "💳" },
      { id: "2582", name: "Agora Microfinance", logo: "💳" },
      { id: "2559", name: "Altum Credo Home", logo: "💳" },
      { id: "2543", name: "Annapurna Finance MFI", logo: "💳" },
      { id: "2569", name: "Annapurna Finance MSME", logo: "💳" },
      { id: "2584", name: "Aptus Finance", logo: "💳" },
      { id: "2583", name: "Aptus Value Housing", logo: "💳" },
      { id: "2525", name: "Arohan Financial", logo: "💳" },
      { id: "2578", name: "Ascend Capital", logo: "💳" },
      { id: "2542", name: "AU Bank", logo: "💳" },
      { id: "2514", name: "Avail", logo: "💳" },
      { id: "2546", name: "Avanse Financial", logo: "💳" },
      { id: "2586", name: "Axis Bank Retail Loan", logo: "💳" },
      { id: "2585", name: "Axis Bank Microfinance", logo: "💳" },
      { id: "2536", name: "Axis Finance", logo: "💳" },
      { id: "2555", name: "Baid Leasing", logo: "💳" },
      { id: "2587", name: "Bajaj Auto Finance", logo: "💳" },
      { id: "2501", name: "Bajaj Finance", logo: "💳" },
      { id: "2566", name: "BERAR Finance", logo: "💳" },
      { id: "2588", name: "Bharat Financial", logo: "💳" },
      { id: "2523", name: "Capri Global Capital", logo: "💳" },
      { id: "2524", name: "Capri Global Housing", logo: "💳" },
      { id: "2538", name: "Cars24 Financial", logo: "💳" },
      { id: "2563", name: "Chaitanya India Fin", logo: "💳" },
      { id: "2515", name: "Clix", logo: "💳" },
      { id: "2564", name: "Credit Wise Capital", logo: "💳" },
      { id: "2590", name: "CreditAccess Grameen MF", logo: "💳" },
      { id: "2589", name: "CreditAccess Grameen RF", logo: "💳" },
      { id: "2552", name: "DCB Bank", logo: "💳" },
      { id: "2573", name: "Digamber Capfin", logo: "💳" },
      { id: "2532", name: "DMI Finance", logo: "💳" },
      { id: "2591", name: "Dvara Kshetriya", logo: "💳" },
      { id: "2527", name: "Easy Home Finance", logo: "💳" },
      { id: "2548", name: "Eduvanz Financing", logo: "💳" },
      { id: "2592", name: "ESAF Small Finance", logo: "💳" },
      { id: "2519", name: "SK Finance", logo: "💳" },
      { id: "2521", name: "Faircent", logo: "💳" },
      { id: "2574", name: "Fincare Small Finance", logo: "💳" },
      { id: "2551", name: "Flexiloans", logo: "💳" },
      { id: "2506", name: "Flexsalary", logo: "💳" },
      { id: "2560", name: "Fullerton India Credit", logo: "💳" },
      { id: "2565", name: "Fullerton India Housing", logo: "💳" },
      { id: "2553", name: "GU Financial Services", logo: "💳" },
      { id: "2511", name: "Hero Fincorp", logo: "💳" },
      { id: "2593", name: "Hiranandani Financial", logo: "💳" },
      { id: "2595", name: "Home Credit India", logo: "💳" },
      { id: "2594", name: "Home First Finance", logo: "💳" },
      { id: "2522", name: "i2ifunding", logo: "💳" },
      { id: "2568", name: "ICICI Bank Loans", logo: "💳" },
      { id: "2508", name: "IDFC First Bank", logo: "💳" },
      { id: "2596", name: "IIFL Finance", logo: "💳" },
      { id: "2597", name: "IIFL Home Finance", logo: "💳" },
      { id: "2598", name: "InCred", logo: "💳" },
      { id: "2579", name: "India Home Loan", logo: "💳" },
      { id: "2562", name: "India Shelter Finance", logo: "💳" },
      { id: "2599", name: "Indiabulls Commercial", logo: "💳" },
      { id: "2510", name: "Indiabulls Consumer", logo: "💳" },
      { id: "2513", name: "Indiabulls Housing", logo: "💳" },
      { id: "2550", name: "IndusInd Bank CFD", logo: "💳" },
      { id: "2537", name: "Jain Autofin", logo: "💳" },
      { id: "25011", name: "Jain Motor Finmart", logo: "💳" },
      { id: "2518", name: "Jana Small Finance", logo: "💳" },
      { id: "25012", name: "Janakalyan Financial", logo: "💳" },
      { id: "25013", name: "John Deere Financial", logo: "💳" },
      { id: "2545", name: "Kanakadurga Finance", logo: "💳" },
      { id: "25014", name: "Khush Housing Finance", logo: "💳" },
      { id: "2535", name: "Kinara Capital", logo: "💳" },
      { id: "2530", name: "Kissht", logo: "💳" },
      { id: "25016", name: "Kotak Mahindra Loans", logo: "💳" },
      { id: "25015", name: "Kotak Mahindra Prime", logo: "💳" },
      { id: "25038", name: "L&T Financial Services", logo: "💳" },
      { id: "2509", name: "L&T Housing Finance", logo: "💳" },
      { id: "25017", name: "Light Microfinance", logo: "💳" },
      { id: "2531", name: "LoanTap", logo: "💳" },
      { id: "2504", name: "Loksuvidha", logo: "💳" },
      { id: "25018", name: "Mahaveer Finance", logo: "💳" },
      { id: "25019", name: "Mahindra Financial", logo: "💳" },
      { id: "2554", name: "Mahindra Home Finance", logo: "💳" },
      { id: "2520", name: "Manappuram Vehicle", logo: "💳" },
      { id: "2558", name: "Maxvalue Credits", logo: "💳" },
      { id: "2549", name: "Midland Microfin", logo: "💳" },
      { id: "2547", name: "Mintifi Finserve", logo: "💳" },
      { id: "25020", name: "Mitron Capital", logo: "💳" },
      { id: "25021", name: "MoneyTap", logo: "💳" },
      { id: "2503", name: "Motilal Oswal Home", logo: "💳" },
      { id: "2561", name: "Muthoot Capital", logo: "💳" },
      { id: "25024", name: "Muthoot Finance", logo: "💳" },
      { id: "25022", name: "Muthoot Fincorp", logo: "💳" },
      { id: "25023", name: "Muthoot Housing", logo: "💳" },
      { id: "2529", name: "Muthoot Microfin", logo: "💳" },
      { id: "25025", name: "Netafim Agricultural", logo: "💳" },
      { id: "2577", name: "Nidhilakshmi Finance", logo: "💳" },
      { id: "2576", name: "NM Finance", logo: "💳" },
      { id: "25026", name: "Novelty Finance", logo: "💳" },
      { id: "2570", name: "OHMY LOAN", logo: "💳" },
      { id: "2571", name: "OMLP2P", logo: "💳" },
      { id: "25027", name: "Orange Retail Finance", logo: "💳" },
      { id: "2575", name: "Oroboro", logo: "💳" },
      { id: "2540", name: "Oxyzo Financial", logo: "💳" },
      { id: "2507", name: "Paisa Dukan", logo: "💳" },
      { id: "25028", name: "Pooja Finelease", logo: "💳" },
      { id: "2534", name: "Rupeeredee", logo: "💳" },
      { id: "25029", name: "Samasta Microfinance", logo: "💳" },
      { id: "2572", name: "Shriram City Union", logo: "💳" },
      { id: "2526", name: "Shriram Housing", logo: "💳" },
      { id: "2528", name: "Shriram Transport", logo: "💳" },
      { id: "25030", name: "SMEcorner", logo: "💳" },
      { id: "2502", name: "Snapmint", logo: "💳" },
      { id: "25031", name: "StashFin", logo: "💳" },
      { id: "2557", name: "Svatantra Microfin", logo: "💳" },
      { id: "2505", name: "Tata Capital", logo: "💳" },
      { id: "25032", name: "Tata Capital Housing", logo: "💳" },
      { id: "25033", name: "Thazhayil Nidhi", logo: "💳" },
      { id: "2541", name: "Toyota Financial", logo: "💳" },
      { id: "25034", name: "TVS Credit", logo: "💳" },
      { id: "25035", name: "Ujjivan Small Finance", logo: "💳" },
      { id: "2516", name: "Varthana", logo: "💳" },
      { id: "2539", name: "Vastu Housing", logo: "💳" },
      { id: "25036", name: "Vistaar Financial", logo: "💳" },
      { id: "25037", name: "X10 Financial", logo: "💳" },
      { id: "2580", name: "Yogakshemam Loans", logo: "💳" },
      { id: "2533", name: "Zestmoney", logo: "💳" },
    ],
  },
  life_insurance: {
    label: "Life Insurance",
    icon: "🛡️",
    operators: [
      { id: "911", name: "Bajaj Allianz Life", logo: "🛡️" },
      { id: "905", name: "Exide Life Insurance", logo: "🛡️" },
      { id: "907", name: "Future Generali Life", logo: "🛡️" },
      { id: "902", name: "HDFC Life Insurance", logo: "🛡️" },
      { id: "901", name: "ICICI Prudential Life", logo: "🛡️" },
      { id: "938", name: "IndiaFirst Life", logo: "🛡️" },
      { id: "912", name: "LIC", logo: "🛡️" },
      { id: "906", name: "Pramerica Life", logo: "🛡️" },
      { id: "909", name: "Reliance Nippon Life", logo: "🛡️" },
      { id: "903", name: "Religare Health", logo: "🛡️" },
      { id: "929", name: "SBI Life Insurance", logo: "🛡️" },
      { id: "908", name: "Shriram Life", logo: "🛡️" },
      { id: "910", name: "Star Union Dai Ichi", logo: "🛡️" },
      { id: "904", name: "TATA AIA Life", logo: "🛡️" },
    ],
  },
  cable_tv: {
    label: "Cable TV",
    icon: "📡",
    operators: [
      { id: "3903", name: "Asianet Digital", logo: "📡" },
      { id: "3301", name: "Hathway Digital", logo: "📡" },
      { id: "3904", name: "INDigital", logo: "📡" },
      { id: "3902", name: "Intermedia Cable", logo: "📡" },
    ],
  },
  municipal_taxes: {
    label: "Municipal Taxes",
    icon: "🏛️",
    operators: [
      { id: "4603", name: "Ahmedabad Municipal", logo: "🏛️" },
      { id: "4606", name: "Hubli-Dharwad Municipal", logo: "🏛️" },
      { id: "4601", name: "KDMC Kalyan", logo: "🏛️" },
      { id: "4602", name: "MP Urban E-Nagarpalika", logo: "🏛️" },
      { id: "4605", name: "Prayagraj Nagar Nigam", logo: "🏛️" },
      { id: "4604", name: "Vasai Virar Municipal", logo: "🏛️" },
    ],
  },
  education_fees: {
    label: "Education Fees",
    icon: "🎓",
    operators: [
      { id: "4702", name: "Mount Olivet School", logo: "🎓" },
      { id: "4701", name: "Sri Guru Teg Bahadur College", logo: "🎓" },
    ],
  },
  housing_society: {
    label: "Housing Society",
    icon: "🏠",
    operators: [
      { id: "4802", name: "Ebony Greens Apartments", logo: "🏠" },
      { id: "4801", name: "Parisar Co-Op Housing", logo: "🏠" },
    ],
  },
} as const;

export type ServiceType = keyof typeof SERVICE_CATALOG;
