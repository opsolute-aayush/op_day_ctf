import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizePassword(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

interface LevelSeed {
  password: string;
  locationClue: string;
  wordReward: string;
  hint: string;
}

interface TeamSeed {
  name: string;
  color: string;
  members: string[];
  levels: LevelSeed[];
  winningSentence: string;
}

// Every team gets its own independent puzzle — different passwords, clues,
// words, and final sentence — so teams can't just copy answers off each
// other during the physical scavenger hunt.
const TEAMS: TeamSeed[] = [
  {
    name: "Code Breakers",
    color: "#39FF14",
    members: ["Asha", "Rohit"],
    winningSentence: "THE SECRET KEY LIES BEHIND THE OLD SERVER RACK",
    levels: [
      {
        password: "ALPHA",
        locationClue: "Go to the place where coffee beans meet hot water.",
        wordReward: "THE SECRET",
        hint: "It hums every morning and smells like a fresh brew.",
      },
      {
        password: "BEANSTALK",
        locationClue: "Find the tower of paper that never stops growing.",
        wordReward: "KEY LIES",
        hint: "Ask the printer nicely.",
      },
      {
        password: "CIRCUIT",
        locationClue: "Where wires hide and the wifi lives.",
        wordReward: "BEHIND THE",
        hint: "Check the router cabinet.",
      },
      {
        password: "FIREWALL",
        locationClue: "The coldest room in the building, guarded by humming metal racks.",
        wordReward: "OLD SERVER",
        hint: "You'll need a badge — or a friend who has one.",
      },
    ],
  },
  {
    name: "Byte Bandits",
    color: "#00F0FF",
    members: ["Meera", "Karan", "Divya"],
    winningSentence: "FOLLOW THE BLUE WIRE TO THE ROOFTOP GENERATOR",
    levels: [
      {
        password: "BRAVO",
        locationClue: "Where the office keeps its caffeine emergency stash.",
        wordReward: "FOLLOW THE",
        hint: "Look near the vending machine.",
      },
      {
        password: "PIXELATE",
        locationClue: "The wall where every launch and birthday gets celebrated.",
        wordReward: "BLUE WIRE",
        hint: "It has more photos than a yearbook.",
      },
      {
        password: "LATTICE",
        locationClue: "Between the stairs and the fire extinguisher, low to the ground.",
        wordReward: "TO THE",
        hint: "Look down, not up.",
      },
      {
        password: "SKYLINE",
        locationClue: "The one place in the building with an actual view outside.",
        wordReward: "ROOFTOP",
        hint: "Top floor, near the exit sign.",
      },
    ],
  },
  {
    name: "Null Pointers",
    color: "#FF2ECC",
    members: ["Vikram", "Sana"],
    winningSentence: "THE PASSWORD WAS HIDDEN INSIDE THE COFFEE MACHINE ALL ALONG",
    levels: [
      {
        password: "CHARLIE",
        locationClue: "The quietest corner reserved for calls nobody wants overheard.",
        wordReward: "THE PASSWORD",
        hint: "Glass walls, one door.",
      },
      {
        password: "SEGFAULT",
        locationClue: "Where old monitors and dead keyboards go to retire.",
        wordReward: "WAS HIDDEN",
        hint: "Ask facilities where the e-waste bin is.",
      },
      {
        password: "RECURSION",
        locationClue: "The shelf holding more board games than actual boards.",
        wordReward: "INSIDE THE",
        hint: "Near the break-room couch.",
      },
      {
        password: "ESPRESSO",
        locationClue: "Everyone's first and last stop of the workday.",
        wordReward: "COFFEE MACHINE",
        hint: "It's louder than the office at 9am.",
      },
    ],
  },
  {
    name: "Cyber Ninjas",
    color: "#FFD400",
    members: ["Priya", "Arjun"],
    winningSentence: "TEAMWORK UNLOCKS EVERY DOOR IN THIS ENTIRE BUILDING",
    levels: [
      {
        password: "DELTA",
        locationClue: "The room with the whiteboard nobody ever fully erases.",
        wordReward: "TEAMWORK UNLOCKS",
        hint: "Check the main conference room.",
      },
      {
        password: "KEYSTONE",
        locationClue: "Where badges get made and lost badges get replaced.",
        wordReward: "EVERY DOOR",
        hint: "Ask reception.",
      },
      {
        password: "MAINFRAME",
        locationClue: "The locked room everyone jokes is where the servers 'live'.",
        wordReward: "IN THIS",
        hint: "It's colder than the rest of the floor.",
      },
      {
        password: "BLUEPRINT",
        locationClue: "The floor plan pinned up near the main entrance.",
        wordReward: "ENTIRE BUILDING",
        hint: "Right by the front door.",
      },
    ],
  },
  {
    name: "Kernel Panic",
    color: "#FF6A00",
    members: ["Nikhil", "Ishaan", "Tara"],
    winningSentence: "PANIC LESS DEBUG MORE AND THE FLAG IS YOURS",
    levels: [
      {
        password: "ECHO",
        locationClue: "The place where every meeting starts five minutes late.",
        wordReward: "PANIC LESS",
        hint: "Look for the biggest screen in the room.",
      },
      {
        password: "STACKTRACE",
        locationClue: "Where broken laptops wait for IT to notice them.",
        wordReward: "DEBUG MORE",
        hint: "Ask the helpdesk corner.",
      },
      {
        password: "NULLBYTE",
        locationClue: "The supply closet nobody can ever find pens in.",
        wordReward: "AND THE",
        hint: "It's usually locked — knock first.",
      },
      {
        password: "CHECKSUM",
        locationClue: "The trophy shelf from last year's hackathon.",
        wordReward: "FLAG IS YOURS",
        hint: "Near the lobby entrance.",
      },
    ],
  },
];

async function main() {
  console.log("Seeding OP Day CTF...");

  await prisma.activityLog.deleteMany();
  await prisma.teamProgress.deleteMany();
  await prisma.levelConfig.deleteMany();
  await prisma.team.deleteMany();
  await prisma.gameConfig.deleteMany();

  await prisma.gameConfig.create({ data: { id: 1, isActive: false, isFinished: false } });

  for (let teamIndex = 0; teamIndex < TEAMS.length; teamIndex++) {
    const teamSeed = TEAMS[teamIndex];
    const team = await prisma.team.create({
      data: {
        teamNumber: teamIndex + 1,
        name: teamSeed.name,
        color: teamSeed.color,
        members: JSON.stringify(teamSeed.members),
        winningSentence: teamSeed.winningSentence,
        progress: { create: {} },
      },
    });

    for (let i = 0; i < teamSeed.levels.length; i++) {
      const level = teamSeed.levels[i];
      await prisma.levelConfig.create({
        data: {
          teamId: team.id,
          levelNumber: i + 1,
          password: await bcrypt.hash(normalizePassword(level.password), 10),
          locationClue: level.locationClue,
          wordReward: level.wordReward,
          hint: level.hint,
        },
      });
    }

    console.log(`\nTeam ${teamIndex + 1} — ${teamSeed.name}`);
    teamSeed.levels.forEach((l, i) => console.log(`  Level ${i + 1}: "${l.password}"`));
    console.log(`  Winning sentence: "${teamSeed.winningSentence}"`);
  }

  console.log(`\nSeeded ${TEAMS.length} teams, each with their own ${TEAMS[0].levels.length}-level puzzle.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
