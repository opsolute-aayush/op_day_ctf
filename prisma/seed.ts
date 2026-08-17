import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizePassword(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function generateSixDigitCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function generateUniqueSessionCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateSixDigitCode();
    const existing = await prisma.gameSession.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique session code — try again.");
}

interface LevelSeed {
  password: string;
  locationClue: string;
  wordReward: string;
  hint: string;
}

interface TeamSeed {
  color: string;
  levels: LevelSeed[];
  winningSentence: string;
}

// Each team gets its own independent puzzle. Team names are deliberately
// not seeded — they default to "Team N" and players name their own squad.
const TEAMS: TeamSeed[] = [
  {
    color: "#39FF14",
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
        wordReward: "OLD SERVER RACK",
        hint: "You'll need a badge — or a friend who has one.",
      },
    ],
  },
  {
    color: "#00F0FF",
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
        wordReward: "ROOFTOP GENERATOR",
        hint: "Top floor, near the exit sign.",
      },
    ],
  },
  {
    color: "#FF2ECC",
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
        wordReward: "COFFEE MACHINE ALL ALONG",
        hint: "It's louder than the office at 9am.",
      },
    ],
  },
  {
    color: "#FFD400",
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
    color: "#FF6A00",
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
  console.log("Seeding OP Day CTF demo session...");

  await prisma.activityLog.deleteMany();
  await prisma.teamProgress.deleteMany();
  await prisma.levelConfig.deleteMany();
  await prisma.team.deleteMany();
  await prisma.gameSession.deleteMany();

  const code = await generateUniqueSessionCode();
  const password = crypto.randomBytes(6).toString("hex");
  const adminPasswordHash = await bcrypt.hash(password, 10);
  const session = await prisma.gameSession.create({ data: { code, adminPasswordHash } });

  for (let teamIndex = 0; teamIndex < TEAMS.length; teamIndex++) {
    const teamSeed = TEAMS[teamIndex];
    const teamNumber = teamIndex + 1;
    const team = await prisma.team.create({
      data: {
        sessionId: session.id,
        teamNumber,
        name: `Team ${teamNumber}`,
        color: teamSeed.color,
        members: "[]",
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

    console.log(`\nTeam ${teamNumber}`);
    teamSeed.levels.forEach((l, i) => console.log(`  Level ${i + 1}: "${l.password}"`));
    console.log(`  Winning sentence: "${teamSeed.winningSentence}"`);
  }

  console.log(`\nSeeded ${TEAMS.length} teams, each with their own ${TEAMS[0].levels.length}-level puzzle.`);
  console.log("");
  console.log("========================================================");
  console.log("  OP Day CTF — demo session created");
  console.log(`  Session code:    ${code}`);
  console.log(`  Admin password:  ${password}`);
  console.log("  Players join at /register with the session code above.");
  console.log("  Log in at /admin with the code + password, then set your");
  console.log("  own password under the Security tab.");
  console.log("========================================================");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
