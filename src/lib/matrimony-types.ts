import { NAKSHATRAS } from "./horoscope-types";

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

export { NAKSHATRAS };

// Demo profile generator
const MALE_NAMES = ["Arun Kumar", "Vishnu Prasad", "Rajesh Menon", "Suresh Nair", "Anand Krishnan", "Deepak Pillai", "Manoj Varma", "Sathish Babu", "Vinod Kumar", "Prasanth G", "Akhil Mohan", "Bijoy Thomas", "Dileep Raj", "Ganesh Kumar", "Hari Shankar", "Jithin Das", "Kiran Mohan", "Lal Krishna", "Midhun S", "Nikhil Rajan", "Praveen Kumar", "Rahul Dev", "Sajith M", "Tintu Thomas", "Unni Krishnan", "Vivek Nair", "Amal Jose", "Bibin Paul", "Cibin K", "Dinu Mohan", "Eldho George", "Febin Mathew", "Gokul Krishnan", "Harikumar P", "Ijaz Mohammed", "Jinson K", "Kannan M", "Libin Joseph", "Manu Rajan", "Nidhin S", "Ouseph K", "Pradeep R", "Rajeev Nair", "Shinto Thomas", "Tiju John", "Umesh Babu", "Vipin Das", "Winson K", "Xavier Jose", "Yadu Krishnan"];
const FEMALE_NAMES = ["Anjali Menon", "Priya Nair", "Divya Krishnan", "Lakshmi Devi", "Sreeja Pillai", "Meera Suresh", "Athira Mohan", "Bhavana Raj", "Chithra Devi", "Deepa Nair", "Gayathri S", "Hema Latha", "Indira Menon", "Jisha Thomas", "Kavitha Pillai", "Lekha Nair", "Maya Krishnan", "Nimisha Das", "Parvathy S", "Remya Raj", "Saritha Mohan", "Teena Joseph", "Uma Devi", "Veena Nair", "Yamuna S", "Amrutha K", "Bindu Mohan", "Chandana R", "Dhanya S", "Elsa George", "Fathima K", "Gopika M", "Haritha Nair", "Irene Thomas", "Janaki Devi", "Keerthana S", "Liji Paul", "Manju Lal", "Neena Raj", "Olivia John", "Pooja Nair", "Radha Krishnan", "Sneha Mohan", "Thulasi Devi", "Usha Nair", "Vineetha S", "Winnie Jose", "Ximena K", "Yasmin M", "Zara Khan"];

const LOCATIONS = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram", "Idukki", "Wayanad", "Pathanamthitta", "Kasaragod"];
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
