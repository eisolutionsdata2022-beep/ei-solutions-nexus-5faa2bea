export const NAKSHATRAS = [
  { id: 1, en: "Ashwini", ml: "അശ്വതി" },
  { id: 2, en: "Bharani", ml: "ഭരണി" },
  { id: 3, en: "Krittika", ml: "കാർത്തിക" },
  { id: 4, en: "Rohini", ml: "രോഹിണി" },
  { id: 5, en: "Mrigashira", ml: "മകയിരം" },
  { id: 6, en: "Ardra", ml: "തിരുവാതിര" },
  { id: 7, en: "Punarvasu", ml: "പുണർതം" },
  { id: 8, en: "Pushya", ml: "പൂയം" },
  { id: 9, en: "Ashlesha", ml: "ആയില്യം" },
  { id: 10, en: "Magha", ml: "മകം" },
  { id: 11, en: "Purva Phalguni", ml: "പൂരം" },
  { id: 12, en: "Uttara Phalguni", ml: "ഉത്രം" },
  { id: 13, en: "Hasta", ml: "അത്തം" },
  { id: 14, en: "Chitra", ml: "ചിത്തിര" },
  { id: 15, en: "Swati", ml: "ചോതി" },
  { id: 16, en: "Vishakha", ml: "വിശാഖം" },
  { id: 17, en: "Anuradha", ml: "അനിഴം" },
  { id: 18, en: "Jyeshtha", ml: "തൃക്കേട്ട" },
  { id: 19, en: "Mula", ml: "മൂലം" },
  { id: 20, en: "Purva Ashadha", ml: "പൂരാടം" },
  { id: 21, en: "Uttara Ashadha", ml: "ഉത്രാടം" },
  { id: 22, en: "Shravana", ml: "തിരുവോണം" },
  { id: 23, en: "Dhanishta", ml: "അവിട്ടം" },
  { id: 24, en: "Shatabhisha", ml: "ചതയം" },
  { id: 25, en: "Purva Bhadrapada", ml: "പൂരുരുട്ടാതി" },
  { id: 26, en: "Uttara Bhadrapada", ml: "ഉത്രട്ടാതി" },
  { id: 27, en: "Revati", ml: "രേവതി" },
] as const;

export interface MatrimonyProfile {
  id: string;
  franchiseId: string;
  franchiseName: string;
  name: string;
  gender: "Male" | "Female";
  age: number;
  dob: string;
  nakshatram: string;
  religion: string;
  caste: string;
  education: string;
  job: string;
  location: string;
  maritalStatus: string;
  height: string;
  bio: string;
  photoUrl: string;
  status: "Delivered";
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatrimonyRequest {
  id: string;
  profileId: string;
  profileName: string;
  requesterName: string;
  phone: string;
  email: string;
  message: string;
  district: string;
  assignedFranchiseId: string;
  assignedFranchiseName: string;
  status: "New" | "Contacted" | "Converted";
  createdAt: string;
}

export interface MatrimonyPricing {
  basicPrice: number;
  premiumPrice: number;
  vipPrice: number;
  basicFeatures: string[];
  premiumFeatures: string[];
  vipFeatures: string[];
  commissionType: "fixed" | "percentage";
  commissionValue: number;
}

export const DEFAULT_PRICING: MatrimonyPricing = {
  basicPrice: 999,
  premiumPrice: 2999,
  vipPrice: 4999,
  basicFeatures: ["Profile Listing", "Basic Search", "5 Interest Requests/month"],
  premiumFeatures: ["Priority Listing", "Advanced Filters", "Unlimited Requests", "Photo Gallery"],
  vipFeatures: ["Top Listing", "Personal Matchmaker", "Unlimited Everything", "Verified Badge", "WhatsApp Support"],
  commissionType: "fixed",
  commissionValue: 100,
};

export const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
export const MARITAL_STATUSES = ["Never Married", "Divorced", "Widowed", "Separated"];
export const HEIGHTS = Array.from({ length: 25 }, (_, i) => {
  const ft = Math.floor((i + 48) / 12);
  const inch = (i + 48) % 12;
  return `${ft}'${inch}"`;
});

export const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
];

export { NAKSHATRAS };

// Demo profile generator
const MALE_NAMES = ["Arun Kumar", "Vishnu Prasad", "Rajesh Menon", "Suresh Nair", "Anand Krishnan", "Deepak Pillai", "Manoj Varma", "Sathish Babu", "Vinod Kumar", "Prasanth G", "Akhil Mohan", "Bijoy Thomas", "Dileep Raj", "Ganesh Kumar", "Hari Shankar", "Jithin Das", "Kiran Mohan", "Lal Krishna", "Midhun S", "Nikhil Rajan", "Praveen Kumar", "Rahul Dev", "Sajith M", "Tintu Thomas", "Unni Krishnan", "Vivek Nair", "Amal Jose", "Bibin Paul", "Cibin K", "Dinu Mohan", "Eldho George", "Febin Mathew", "Gokul Krishnan", "Harikumar P", "Ijaz Mohammed", "Jinson K", "Kannan M", "Libin Joseph", "Manu Rajan", "Nidhin S", "Ouseph K", "Pradeep R", "Rajeev Nair", "Shinto Thomas", "Tiju John", "Umesh Babu", "Vipin Das", "Winson K", "Xavier Jose", "Yadu Krishnan"];
const FEMALE_NAMES = ["Anjali Menon", "Priya Nair", "Divya Krishnan", "Lakshmi Devi", "Sreeja Pillai", "Meera Suresh", "Athira Mohan", "Bhavana Raj", "Chithra Devi", "Deepa Nair", "Gayathri S", "Hema Latha", "Indira Menon", "Jisha Thomas", "Kavitha Pillai", "Lekha Nair", "Maya Krishnan", "Nimisha Das", "Parvathy S", "Remya Raj", "Saritha Mohan", "Teena Joseph", "Uma Devi", "Veena Nair", "Yamuna S", "Amrutha K", "Bindu Mohan", "Chandana R", "Dhanya S", "Elsa George", "Fathima K", "Gopika M", "Haritha Nair", "Irene Thomas", "Janaki Devi", "Keerthana S", "Liji Paul", "Manju Lal", "Neena Raj", "Olivia John", "Pooja Nair", "Radha Krishnan", "Sneha Mohan", "Thulasi Devi", "Usha Nair", "Vineetha S", "Winnie Jose", "Ximena K", "Yasmin M", "Zara Khan"];

const LOCATIONS = ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram", "Idukki", "Wayanad", "Pathanamthitta", "Kasaragod"];
const EDUCATIONS = ["B.Tech", "M.Tech", "MBBS", "MD", "BDS", "MBA", "MCA", "B.Com", "M.Com", "BA", "MA", "BSc", "MSc", "BBA", "LLB", "B.Ed", "PhD", "Diploma", "Plus Two", "ITI"];
const JOBS = ["Software Engineer", "Doctor", "Teacher", "Nurse", "Bank Employee", "Government Job", "Business Owner", "Engineer", "Accountant", "Lawyer", "Pharmacist", "Dentist", "Professor", "Police Officer", "Army Officer", "Architect", "Civil Engineer", "Mechanic", "Self Employed", "Private Job"];
const CASTES = ["Nair", "Ezhava", "Brahmin", "Muslim", "Christian", "Thiyya", "Menon", "Pillai", "Kurup", "Panicker", "General", "OBC", "SC", "ST"];

export function generateDemoProfiles(): Omit<MatrimonyProfile, "id">[] {
  const profiles: Omit<MatrimonyProfile, "id">[] = [];
  const nakshatraNames = NAKSHATRAS.map(n => `${n.ml} (${n.en})`);

  for (let i = 0; i < 100; i++) {
    const isMale = i < 50;
    const names = isMale ? MALE_NAMES : FEMALE_NAMES;
    const name = names[i % 50];
    const age = 22 + Math.floor(Math.random() * 16);
    const year = new Date().getFullYear() - age;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;

    profiles.push({
      franchiseId: "demo",
      franchiseName: "EI SOLUTIONS Demo",
      name,
      gender: isMale ? "Male" : "Female",
      age,
      dob: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      nakshatram: nakshatraNames[Math.floor(Math.random() * 27)],
      religion: RELIGIONS[Math.floor(Math.random() * 4)],
      caste: CASTES[Math.floor(Math.random() * CASTES.length)],
      education: EDUCATIONS[Math.floor(Math.random() * EDUCATIONS.length)],
      job: JOBS[Math.floor(Math.random() * JOBS.length)],
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      maritalStatus: "Never Married",
      height: HEIGHTS[Math.floor(Math.random() * HEIGHTS.length)],
      bio: `${name} is a ${JOBS[Math.floor(Math.random() * JOBS.length)].toLowerCase()} from ${LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]}. Looking for a suitable match.`,
      photoUrl: "",
      status: "Delivered",
      isDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return profiles;
}
