import { db } from "./db";
import { admins, categories } from "@shared/schema";
import { adminAuthService } from "./services/admin-auth.service";
import { eq, sql } from "drizzle-orm";

const SEED_CATEGORIES = [
  {
    name: "Smart Contracts",
    icon: "FileCode",
    subcategories: [
      "Clarity",
      "Solidity",
      "Auditing",
      "Token Standards",
      "Cross-Chain Bridges",
      "DAO Governance Contracts"
    ],
  },
  {
    name: "Web Development",
    icon: "Code",
    subcategories: [
      "React",
      "Next.js",
      "Node.js",
      "Full Stack",
      "DApp Frontend",
      "API Integration",
      "Web3 Authentication"
    ],
  },
  {
    name: "Design",
    icon: "Palette",
    subcategories: [
      "UI/UX",
      "NFT Art",
      "Branding",
      "Figma",
      "3D Modeling",
      "Motion Graphics",
      "Metaverse Assets"
    ],
  },
  {
    name: "Auditing & Security",
    icon: "ShieldCheck",
    subcategories: [
      "Smart Contract Audit",
      "Security Review",
      "Penetration Testing",
      "Compliance Checks",
      "Bug Bounty Programs"
    ],
  },
  {
    name: "Writing & Documentation",
    icon: "FileText",
    subcategories: [
      "Technical Writing",
      "Documentation",
      "Whitepapers",
      "Blog Posts",
      "Grant Proposals",
      "Scriptwriting",
      "Ad Copy"
    ],
  },
  {
    name: "Marketing",
    icon: "Megaphone",
    subcategories: [
      "Community Growth",
      "Social Media Strategy",
      "Content Marketing",
      "SEO",
      "Influencer Campaigns",
      "Paid Ads",
      "Analytics & Reporting"
    ],
  },
  {
    name: "Public Relations (PR)",
    icon: "Globe",
    subcategories: [
      "Press Releases",
      "Media Outreach",
      "Crisis Management",
      "Brand Reputation",
      "Corporate Communications",
      "Event PR"
    ],
  },
  {
    name: "Media & Content",
    icon: "Film",
    subcategories: [
      "Video Production",
      "Animation",
      "Podcasts",
      "Photography",
      "AR/VR Content",
      "Drone Videography",
      "Event Coverage"
    ],
  },
  {
    name: "Film & Cinema",
    icon: "Camera",
    subcategories: [
      "Feature Film Production",
      "Short Films",
      "Documentaries",
      "Screenwriting",
      "Cinematography",
      "Post-Production",
      "Distribution & Festivals"
    ],
  },
  {
    name: "Animation",
    icon: "Video",
    subcategories: [
      "2D Animation",
      "3D Animation",
      "Motion Graphics",
      "Character Design",
      "Explainer Videos",
      "Stop Motion",
      "Visual Effects (VFX)"
    ],
  },
  {
    name: "Audio Production",
    icon: "Music",
    subcategories: [
      "Music Composition",
      "Sound Design",
      "Mixing & Mastering",
      "Podcast Editing",
      "Voiceovers",
      "Foley & SFX",
      "Audio Restoration"
    ],
  },
  {
    name: "AI & Machine Learning",
    icon: "Cpu",
    subcategories: [
      "Generative AI",
      "Predictive Analytics",
      "Trading Bots",
      "AI Agents",
      "Robotics Automation",
      "Voice & Chat Assistants"
    ],
  },
  {
    name: "Fintech & DeFi",
    icon: "DollarSign",
    subcategories: [
      "Crypto Payments",
      "Stablecoin Integration",
      "Lending Platforms",
      "Tokenized Assets",
      "Analytics Dashboards",
      "Credit Scoring Models"
    ],
  },
  {
    name: "Community & Ecosystem",
    icon: "Users",
    subcategories: [
      "Ambassador Programs",
      "Hackathons",
      "Workshops",
      "Grants",
      "Collaborative Hubs",
      "DAO Communities"
    ],
  },
  {
    name: "Research & Development",
    icon: "BookOpen",
    subcategories: [
      "Whitepapers",
      "Case Studies",
      "Innovation Labs",
      "Protocol Design",
      "Open Source Contributions"
    ],
  },
  {
    name: "Immersive Tech",
    icon: "Globe",
    subcategories: [
      "AR Experiences",
      "VR Worlds",
      "Metaverse Integration",
      "Interactive Installations",
      "Virtual Events"
    ],
  },
  {
    name: "Business & Branding",
    icon: "Briefcase",
    subcategories: [
      "Corporate Partnerships",
      "Digital Campaigns",
      "Supply Chain Transparency",
      "Creative Agency Services",
      "Brand Strategy"
    ],
  }
];

async function seed() {
  console.log("Starting seed...");

  // Seed default admin account
  const [existingAdmin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, "admin"));

  if (!existingAdmin) {
    console.log("Creating default admin user...");
    const passwordHash = await adminAuthService.hashPassword("SuperSecretAdminPassword123!");
    await db.insert(admins).values({
      username: "admin",
      passwordHash,
    });
    console.log("Default admin created: admin / SuperSecretAdminPassword123!");
  } else {
    console.log("Admin user already exists");
  }

  // Seed categories
  const existingCategories = await db.select().from(categories);
  if (existingCategories.length === 0) {
    console.log("Seeding categories...");
    await db.insert(categories).values(SEED_CATEGORIES);
    console.log(`Seeded ${SEED_CATEGORIES.length} categories`);
  } else {
    console.log(`Categories already exist (${existingCategories.length} found)`);
  }

  console.log("Seeding complete");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
