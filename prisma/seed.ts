import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizePassword(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

const LEVELS = [
  {
    levelNumber: 1,
    password: "ALPHA",
    locationClue: "Go to the place where coffee beans meet hot water.",
    wordReward: "THE SECRET",
    hint: "It hums every morning and smells like a fresh brew.",
  },
  {
    levelNumber: 2,
    password: "BEANSTALK",
    locationClue: "Find the tower of paper that never stops growing — ask the printer nicely.",
    wordReward: "KEY LIES",
    hint: "Look near the thing that jams right when you need it most.",
  },
  {
    levelNumber: 3,
    password: "CIRCUIT",
    locationClue: "Where wires hide and the wifi lives — check behind the router cabinet.",
    wordReward: "BEHIND THE",
    hint: "Blinking lights, tangled cables, usually ignored.",
  },
  {
    levelNumber: 4,
    password: "FIREWALL",
    locationClue: "The coldest room in the building, guarded by humming metal racks.",
    wordReward: "OLD SERVER",
    hint: "You'll need a badge — or a friend who has one.",
  },
];

const WINNING_SENTENCE = "THE SECRET KEY LIES BEHIND THE OLD SERVER RACK";

const TEAMS = [
  { name: "Code Breakers", color: "#39FF14", members: ["Asha", "Rohit"] },
  { name: "Byte Bandits", color: "#00F0FF", members: ["Meera", "Karan", "Divya"] },
  { name: "Null Pointers", color: "#FF2ECC", members: ["Vikram", "Sana"] },
  { name: "Cyber Ninjas", color: "#FFD400", members: ["Priya", "Arjun"] },
  { name: "Kernel Panic", color: "#FF6A00", members: ["Nikhil", "Ishaan", "Tara"] },
];

async function main() {
  console.log("Seeding OP Day CTF...");

  await prisma.activityLog.deleteMany();
  await prisma.teamProgress.deleteMany();
  await prisma.team.deleteMany();
  await prisma.levelConfig.deleteMany();
  await prisma.gameConfig.deleteMany();

  for (const level of LEVELS) {
    await prisma.levelConfig.create({
      data: {
        levelNumber: level.levelNumber,
        password: await bcrypt.hash(normalizePassword(level.password), 10),
        locationClue: level.locationClue,
        wordReward: level.wordReward,
        hint: level.hint,
      },
    });
  }

  await prisma.gameConfig.create({
    data: { id: 1, isActive: false, isFinished: false, winningSentence: WINNING_SENTENCE },
  });

  for (const team of TEAMS) {
    await prisma.team.create({
      data: {
        name: team.name,
        color: team.color,
        members: JSON.stringify(team.members),
        progress: { create: {} },
      },
    });
  }

  console.log(`Seeded ${LEVELS.length} levels, ${TEAMS.length} teams, and the winning sentence.`);
  console.log("Level passwords (plaintext, for the physical board / QR cards):");
  for (const level of LEVELS) {
    console.log(`  Level ${level.levelNumber}: "${level.password}"`);
  }
  console.log(`Winning sentence: "${WINNING_SENTENCE}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
