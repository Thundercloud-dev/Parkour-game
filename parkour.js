import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   THUNDERCLOUD PARKOUR
   Full JavaScript replacement
   Controls:
   A/D or arrows = move
   W / Up / Space = jump
   F = hold to glide
   R = restart
   ========================================================= */

const SUPABASE_URL =
  "https://qorfczqljrvxfouodhcp.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_C4uGBFM5nmiGWOPanRqWvQ_SPbC0eRb";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = id => document.getElementById(id);

const canvas = $("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const TILE = 40;

let user = null;
let mode = "play";
let currentLevel = 0;
let jumps = 0;
let deaths = 0;
let won = false;
let levelStarted = performance.now();
let previousTime = performance.now();
let lastBroadcast = 0;
let roomChannel = null;
let roomName = "";
let toastTimer = null;
let animationTime = 0;
let communityLevels = [];
let communitySearch = "";
let communitySort = "newest";
let communityPage = 0;
let communityPageSize = 12;
let builderTool = "platform";
let editorDirty = false;
let checkpoints = [];
let checkpoint = null;

let progress = {
  current_level: 1,
  unlocked_level: 1,
  total_jumps: 0
};

const bestTimes = {};
const keys = new Set();
const remotes = {};

const held = {
  left: false,
  right: false,
  jump: false,
  glide: false
};

const PHYSICS = {
  gravity: 1450,
  glideGravity: 260,
  maxFallSpeed: 850,
  glideFallSpeed: 155,
  airControl: 0.85,
  groundControl: 1,
  acceleration: 1800,
  friction: 2200,
  jumpPower: 535,
  glideSpeed: 285,
  playerSpeed: 285
};

const player = {
  x: 50,
  y: 420,
  w: 34,
  h: 30,
  vx: 0,
  vy: 0,
  speed: PHYSICS.playerSpeed,
  onGround: false,
  color: "#a9c4ff",
  facing: 1,
  gliding: false,
  coyote: 0,
  jumpBuffer: 0,
  invulnerable: 0,
  respawnFlash: 0
};

const defaultLevels = [
  {
    name: "First Steps",
    start: { x: 50, y: 420 },
    goal: { x: 865, y: 390 },
    platforms: [
      { x: 0, y: 480, w: 960, h: 60 },
      { x: 200, y: 410, w: 120, h: 18 },
      { x: 390, y: 350, w: 120, h: 18 },
      { x: 590, y: 420, w: 120, h: 18 }
    ],
    hazards: []
  },
  {
    name: "Little Gaps",
    start: { x: 40, y: 420 },
    goal: { x: 870, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 150, h: 60 },
      { x: 210, y: 430, w: 100, h: 18 },
      { x: 360, y: 370, w: 100, h: 18 },
      { x: 520, y: 430, w: 100, h: 18 },
      { x: 690, y: 360, w: 100, h: 18 },
      { x: 830, y: 460, w: 130, h: 80 }
    ],
    hazards: []
  },
  {
    name: "Spike Alley",
    start: { x: 45, y: 420 },
    goal: { x: 870, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 180, h: 60 },
      { x: 260, y: 420, w: 130, h: 18 },
      { x: 460, y: 350, w: 130, h: 18 },
      { x: 670, y: 420, w: 130, h: 18 },
      { x: 820, y: 460, w: 140, h: 80 }
    ],
    hazards: [
      { x: 180, y: 465, w: 80, h: 15 },
      { x: 390, y: 465, w: 70, h: 15 },
      { x: 590, y: 465, w: 80, h: 15 }
    ]
  },
  {
    name: "High Clouds",
    start: { x: 40, y: 430 },
    goal: { x: 850, y: 190 },
    platforms: [
      { x: 0, y: 480, w: 130, h: 60 },
      { x: 170, y: 420, w: 110, h: 18 },
      { x: 320, y: 350, w: 110, h: 18 },
      { x: 470, y: 280, w: 110, h: 18 },
      { x: 620, y: 220, w: 110, h: 18 },
      { x: 800, y: 250, w: 160, h: 18 }
    ],
    hazards: []
  },
  {
    name: "Zigzag",
    start: { x: 40, y: 420 },
    goal: { x: 860, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 140, h: 60 },
      { x: 190, y: 420, w: 100, h: 18 },
      { x: 350, y: 350, w: 100, h: 18 },
      { x: 500, y: 420, w: 100, h: 18 },
      { x: 650, y: 330, w: 100, h: 18 },
      { x: 810, y: 460, w: 150, h: 80 }
    ],
    hazards: [
      { x: 300, y: 465, w: 50, h: 15 },
      { x: 600, y: 465, w: 50, h: 15 }
    ]
  },
  {
    name: "Sky Bridges",
    start: { x: 30, y: 420 },
    goal: { x: 870, y: 360 },
    platforms: [
      { x: 0, y: 480, w: 120, h: 60 },
      { x: 150, y: 430, w: 180, h: 18 },
      { x: 370, y: 370, w: 180, h: 18 },
      { x: 590, y: 420, w: 180, h: 18 },
      { x: 810, y: 420, w: 150, h: 60 }
    ],
    hazards: []
  },
  {
    name: "Danger Steps",
    start: { x: 40, y: 420 },
    goal: { x: 860, y: 380 },
    platforms: [
      { x: 0, y: 480, w: 130, h: 60 },
      { x: 190, y: 410, w: 100, h: 18 },
      { x: 340, y: 340, w: 100, h: 18 },
      { x: 490, y: 410, w: 100, h: 18 },
      { x: 640, y: 330, w: 100, h: 18 },
      { x: 810, y: 440, w: 150, h: 100 }
    ],
    hazards: [
      { x: 130, y: 465, w: 60, h: 15 },
      { x: 290, y: 465, w: 50, h: 15 },
      { x: 440, y: 465, w: 50, h: 15 },
      { x: 590, y: 465, w: 50, h: 15 }
    ]
  },
  {
    name: "Cloud Towers",
    start: { x: 30, y: 430 },
    goal: { x: 850, y: 110 },
    platforms: [
      { x: 0, y: 480, w: 120, h: 60 },
      { x: 140, y: 410, w: 90, h: 18 },
      { x: 270, y: 330, w: 90, h: 18 },
      { x: 400, y: 250, w: 90, h: 18 },
      { x: 530, y: 180, w: 90, h: 18 },
      { x: 660, y: 120, w: 90, h: 18 },
      { x: 800, y: 160, w: 160, h: 18 }
    ],
    hazards: []
  },
  {
    name: "Tiny Targets",
    start: { x: 30, y: 420 },
    goal: { x: 875, y: 300 },
    platforms: [
      { x: 0, y: 480, w: 100, h: 60 },
      { x: 145, y: 430, w: 65, h: 16 },
      { x: 255, y: 370, w: 65, h: 16 },
      { x: 365, y: 420, w: 65, h: 16 },
      { x: 475, y: 330, w: 65, h: 16 },
      { x: 585, y: 380, w: 65, h: 16 },
      { x: 695, y: 270, w: 65, h: 16 },
      { x: 820, y: 340, w: 140, h: 60 }
    ],
    hazards: []
  },
  {
    name: "Storm Run",
    start: { x: 30, y: 420 },
    goal: { x: 860, y: 380 },
    platforms: [
      { x: 0, y: 480, w: 150, h: 60 },
      { x: 210, y: 400, w: 110, h: 18 },
      { x: 380, y: 320, w: 110, h: 18 },
      { x: 550, y: 400, w: 110, h: 18 },
      { x: 720, y: 320, w: 100, h: 18 },
      { x: 830, y: 440, w: 130, h: 100 }
    ],
    hazards: [
      { x: 150, y: 465, w: 60, h: 15 },
      { x: 320, y: 465, w: 60, h: 15 },
      { x: 490, y: 465, w: 60, h: 15 },
      { x: 660, y: 465, w: 60, h: 15 }
    ]
  },
  {
    name: "Moon Hop",
    start: { x: 30, y: 430 },
    goal: { x: 850, y: 180 },
    platforms: [
      { x: 0, y: 480, w: 120, h: 60 },
      { x: 170, y: 420, w: 90, h: 18 },
      { x: 300, y: 340, w: 90, h: 18 },
      { x: 430, y: 260, w: 90, h: 18 },
      { x: 560, y: 190, w: 90, h: 18 },
      { x: 690, y: 130, w: 90, h: 18 },
      { x: 810, y: 220, w: 150, h: 18 }
    ],
    hazards: []
  },
  {
    name: "Thunder Summit",
    start: { x: 30, y: 430 },
    goal: { x: 850, y: 90 },
    platforms: [
      { x: 0, y: 480, w: 120, h: 60 },
      { x: 150, y: 420, w: 90, h: 18 },
      { x: 270, y: 350, w: 90, h: 18 },
      { x: 390, y: 280, w: 90, h: 18 },
      { x: 510, y: 210, w: 90, h: 18 },
      { x: 630, y: 150, w: 90, h: 18 },
      { x: 750, y: 100, w: 100, h: 18 },
      { x: 850, y: 130, w: 110, h: 18 }
    ],
    hazards: [
      { x: 120, y: 465, w: 30, h: 15 },
      { x: 240, y: 465, w: 30, h: 15 }
    ]
  }
];

let levels = defaultLevels.map(copyLevel);

let builder = {
  name: "My Cloud Course",
  platforms: [],
  hazards: [],
  start: { x: 40, y: 420 },
  goal: { x: 850, y: 390 }
};

/* =========================
   GENERAL HELPERS
   ========================= */

function copyLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.add("hidden");
  }, 2800);
}

function setStatus(message) {
  if ($("status")) $("status").textContent = message;
}

function setRoomStatus(message) {
  if ($("room-status")) {
    $("room-status").textContent = message;
  }
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function validRect(rect) {
  return rect &&
    [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x < W &&
    rect.y < H &&
    rect.w > 0 &&
    rect.h > 0 &&
    rect.w <= W &&
    rect.h <= H;
}

function validCommunityLevel(level) {
  if (!level ||
      !Array.isArray(level.platforms) ||
      !Array.isArray(level.hazards)) {
    return false;
  }

  if (level.platforms.length > 150 ||
      level.hazards.length > 100) {
    return false;
  }

  return (
    validRect({ ...level.start, w: 1, h: 1 }) &&
    validRect({ ...level.goal, w: 1, h: 1 }) &&
    level.platforms.every(validRect) &&
    level.hazards.every(validRect)
  );
}

/* =========================
   SEPARATE APP SCREENS
   ========================= */

function createScreenStyles() {
  if ($("extra-game-styles")) return;

  const style = document.createElement("style");
  style.id = "extra-game-styles";

  style.textContent = `
    .game-screen-heading {
      font-size: 22px;
      color: #c7d5ff;
      margin: 10px 0;
    }

    .game-screen-description {
      color: #bac5e1;
      line-height: 1.7;
    }

    .game-screen-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 12px 0;
    }

    .game-screen-controls input,
    .game-screen-controls select {
      flex: 1;
      min-width: 160px;
    }

    .community-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fill, minmax(210px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .community-card {
      min-height: 125px;
      text-align: left;
      padding: 14px;
      background: #17213c;
      border: 1px solid #53658e;
      border-radius: 10px;
      color: white;
    }

    .community-card strong {
      display: block;
      font-size: 15px;
      margin-bottom: 8px;
    }

    .community-card small {
      color: #bac5e1;
    }

    .community-card:hover {
      border-color: #74f0e5;
      transform: translateY(-2px);
    }

    .game-screen {
      padding: 18px;
      min-height: 450px;
      background: #202945;
      border: 1px solid #344367;
      border-radius: 12px;
      margin: 12px;
    }

    .game-screen button:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .game-pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
    }

    .glide-indicator {
      position: absolute;
      right: 12px;
      bottom: 12px;
      padding: 7px 10px;
      border-radius: 7px;
      color: #101426;
      background: #74f0e5;
      font-weight: bold;
      pointer-events: none;
    }

    .editor-help {
      padding: 10px;
      background: #17213c;
      border-radius: 8px;
      color: #c7d5ff;
      margin: 10px 0;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 650px) {
      .game-screen {
        margin: 5px;
        padding: 10px;
      }
      .community-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function createAdditionalScreens() {
  createScreenStyles();

  const main = document.querySelector("main");
  if (!main) return;

  const screenHost = document.createElement("section");
  screenHost.id = "extra-screen-host";
  screenHost.className = "hidden";
  screenHost.style.gridColumn = "1 / -1";
  main.appendChild(screenHost);

  const glideIndicator = document.createElement("div");
  glideIndicator.id = "glide-indicator";
  glideIndicator.className = "glide-indicator hidden";
  glideIndicator.textContent = "F · GLIDING";
  $("canvas-wrap").appendChild(glideIndicator);

  buildCommunityScreen();
  buildEditorScreen();
}

function showMainGame(show) {
  const main = document.querySelector("main");
  if (!main) return;

  const host = $("extra-screen-host");

  Array.from(main.children).forEach(child => {
    if (child === host) return;
    child.classList.toggle("hidden", !show);
  });

  host.classList.toggle("hidden", show);
}

function setMode(nextMode) {
  mode = nextMode;

  $("play-tab").classList.toggle(
    "active",
    mode === "play"
  );

  $("builder-tab").classList.toggle(
    "active",
    mode === "builder"
  );

  $("community-tab").classList.toggle(
    "active",
    mode === "community"
  );

  if (mode === "play") {
    showMainGame(true);
    toast("Reach the glowing goal! Hold F to glide.");
  } else {
    showMainGame(false);

    if (mode === "builder") {
      $("extra-screen-host").innerHTML = "";
      $("extra-screen-host").appendChild(
        $("editor-screen")
      );
      refreshEditorPreview();
      toast("Level Editor opened.");
    }

    if (mode === "community") {
      $("extra-screen-host").innerHTML = "";
      $("extra-screen-host").appendChild(
        $("community-screen")
      );
      loadCommunityLevels();
    }
  }
}

/* =========================
   PLAYER AND CHECKPOINTS
   ========================= */

function resetPlayer() {
  const level = levels[currentLevel];
  if (!level) return;

  const spawn = checkpoint || level.start;

  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.gliding = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.invulnerable = 0.5;

  won = false;
  levelStarted = performance.now();

  if ($("glide-indicator")) {
    $("glide-indicator").classList.add("hidden");
  }
}

function respawnPlayer(message) {
  deaths++;
  resetPlayer();

  if (message) toast(message);
}

function goToLevel(index) {
  currentLevel = clamp(index, 0, levels.length - 1);
  checkpoint = null;

  resetPlayer();
  updateStats();

  toast(levels[currentLevel].name);
}

function finishLevel() {
  if (won) return;

  won = true;

  const seconds = (performance.now() - levelStarted) / 1000;

  bestTimes[currentLevel] = Math.min(
    bestTimes[currentLevel] ?? Infinity,
    seconds
  );

  progress.current_level = currentLevel + 1;

  progress.unlocked_level = Math.max(
    progress.unlocked_level,
    currentLevel + 2
  );

  progress.total_jumps = Math.max(
    progress.total_jumps,
    jumps
  );

  updateStats();

  toast(
    `Level complete! ${seconds.toFixed(1)} seconds.`
  );

  if (user) {
    saveProgress().catch(error => {
      setStatus("Save failed: " + error.message);
    });
  }
}

function updateStats() {
  if ($("stat-level")) {
    $("stat-level").textContent =
      `${currentLevel + 1} / ${levels.length}`;
  }

  if ($("stat-jumps")) {
    $("stat-jumps").textContent = String(jumps);
  }

  if ($("stat-time")) {
    $("stat-time").textContent =
      bestTimes[currentLevel] !== undefined
        ? bestTimes[currentLevel].toFixed(1) + "s"
        : "—";
  }

  if ($("unlock-text")) {
    $("unlock-text").textContent =
      `Unlocked through level ${progress.unlocked_level}.`;
  }

  const list = $("level-list");
  if (!list) return;

  list.replaceChildren();

  levels.forEach((level, index) => {
    const button = document.createElement("button");

    button.textContent = String(index + 1);
    button.title = level.name;
    button.classList.toggle(
      "active",
      index === currentLevel
    );

    button.addEventListener("click", () => {
      if (
        index >= defaultLevels.length &&
        index + 1 > progress.unlocked_level
      ) {
        toast("Complete earlier levels first.");
        return;
      }

      goToLevel(index);
    });

    list.appendChild(button);
  });
}

/* =========================
   MOVEMENT AND COLLISIONS
   ========================= */

function movePlayer(dt) {
  if (mode !== "play" || won) return;

  dt = Math.min(dt, 0.025);

  const left =
    keys.has("ArrowLeft") ||
    keys.has("a") ||
    held.left;

  const right =
    keys.has("ArrowRight") ||
    keys.has("d") ||
    held.right;

  const jumpHeld =
    keys.has(" ") ||
    keys.has("ArrowUp") ||
    keys.has("w") ||
    held.jump;

  const glideHeld =
    keys.has("f") ||
    held.glide;

  const direction =
    (right ? 1 : 0) - (left ? 1 : 0);

  if (direction !== 0) {
    player.facing = direction;
  }

  const targetSpeed = direction * (
    player.onGround
      ? PHYSICS.playerSpeed
      : PHYSICS.glideSpeed
  );

  const control = player.onGround
    ? PHYSICS.groundControl
    : PHYSICS.airControl;

  if (direction !== 0) {
    player.vx += clamp(
      targetSpeed - player.vx,
      -PHYSICS.acceleration * control * dt,
      PHYSICS.acceleration * control * dt
    );
  } else if (player.onGround) {
    const friction = PHYSICS.friction * dt;

    if (Math.abs(player.vx) <= friction) {
      player.vx = 0;
    } else {
      player.vx -= Math.sign(player.vx) * friction;
    }
  }

  player.vx = clamp(
    player.vx,
    -PHYSICS.playerSpeed,
    PHYSICS.playerSpeed
  );

  if (jumpHeld) {
    player.jumpBuffer = 0.12;
  } else {
    player.jumpBuffer = Math.max(
      0,
      player.jumpBuffer - dt
    );
  }

  if (player.onGround) {
    player.coyote = 0.12;
  } else {
    player.coyote = Math.max(
      0,
      player.coyote - dt
    );
  }

  if (
    player.jumpBuffer > 0 &&
    player.coyote > 0
  ) {
    player.vy = -PHYSICS.jumpPower;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    jumps++;

    updateStats();
  }

  player.gliding =
    glideHeld &&
    !player.onGround &&
    player.vy > 0;

  if (player.gliding) {
    player.vy += PHYSICS.glideGravity * dt;
    player.vy = Math.min(
      player.vy,
      PHYSICS.glideFallSpeed
    );
  } else {
    player.vy += PHYSICS.gravity * dt;
    player.vy = Math.min(
      player.vy,
      PHYSICS.maxFallSpeed
    );
  }

  if ($("glide-indicator")) {
    $("glide-indicator").classList.toggle(
      "hidden",
      !player.gliding
    );
  }

  moveHorizontally(dt);
  moveVertically(dt);
  checkHazardsAndGoal();

  player.invulnerable = Math.max(
    0,
    player.invulnerable - dt
  );
}

function moveHorizontally(dt) {
  const level = levels[currentLevel];

  const previousX = player.x;
  player.x += player.vx * dt;

  player.x = clamp(
    player.x,
    0,
    W - player.w
  );

  for (const platform of level.platforms) {
    if (!rectanglesOverlap(player, platform)) continue;

    if (player.vx > 0) {
      player.x = platform.x - player.w;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.w;
    }

    player.vx = 0;
  }

  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  }

  if (player.x + player.w > W) {
    player.x = W - player.w;
    player.vx = 0;
  }

  if (!Number.isFinite(player.x)) {
    player.x = previousX;
    player.vx = 0;
  }
}

function moveVertically(dt) {
  const level = levels[currentLevel];

  const previousY = player.y;
  const previousBottom = previousY + player.h;
  const previousTop = previousY;

  player.y += player.vy * dt;
  player.onGround = false;

  for (const platform of level.platforms) {
    const horizontalOverlap =
      player.x + player.w > platform.x &&
      player.x < platform.x + platform.w;

    if (!horizontalOverlap) continue;

    const currentBottom = player.y + player.h;
    const currentTop = player.y;
    const platformBottom = platform.y + platform.h;

    // Land on the top when descending through it.
    if (
      player.vy >= 0 &&
      previousBottom <= platform.y + 1 &&
      currentBottom >= platform.y
    ) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    // Hit the underside when jumping upward.
    if (
      player.vy < 0 &&
      previousTop >= platformBottom - 1 &&
      currentTop <= platformBottom
    ) {
      player.y = platformBottom;
      player.vy = 0;
      continue;
    }

    // Resolve any remaining overlap vertically.
    if (rectanglesOverlap(player, platform)) {
      if (player.vy > 0) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = platformBottom;
        player.vy = 0;
      }
    }
  }

  if (player.y < 0) {
    player.y = 0;
    player.vy = Math.max(0, player.vy);
  }

  if (!Number.isFinite(player.y)) {
    player.y = previousY;
    player.vy = 0;
  }
}

function checkHazardsAndGoal() {
  const level = levels[currentLevel];

  if (player.invulnerable <= 0) {
    for (const hazard of level.hazards) {
      if (rectanglesOverlap(player, hazard)) {
        respawnPlayer("Zap! Try that jump again.");
        return;
      }
    }
  }

  if (player.y > H + 100) {
    respawnPlayer("You fell! Try again.");
    return;
  }

  const goal = {
    x: level.goal.x,
    y: level.goal.y,
    w: 38,
    h: 60
  };

  if (rectanglesOverlap(player, goal)) {
    finishLevel();
  }
}

/* =========================
   DRAWING
   ========================= */

function roundedRect(x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function drawCloud(x, y, color, scale = 1) {
  ctx.fillStyle = color;
  ctx.beginPath();

  ctx.ellipse(
    x + 15 * scale,
    y + 18 * scale,
    15 * scale,
    10 * scale,
    0, 0, Math.PI * 2
  );

  ctx.ellipse(
    x + 28 * scale,
    y + 12 * scale,
    12 * scale,
    13 * scale,
    0, 0, Math.PI * 2
  );

  ctx.ellipse(
    x + 41 * scale,
    y + 18 * scale,
    15 * scale,
    10 * scale,
    0, 0, Math.PI * 2
  );

  ctx.fill();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);

  sky.addColorStop(0, "#111b39");
  sky.addColorStop(0.55, "#283e6b");
  sky.addColorStop(1, "#536e9a");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars.
  for (let i = 0; i < 70; i++) {
    const x = (i * 137 + 27) % W;
    const y = (i * 61 + 19) % 350;
    const pulse =
      0.45 + 0.35 * Math.sin(animationTime * 2 + i);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.globalAlpha = 1;

  // Decorative clouds.
  for (let i = 0; i < 9; i++) {
    const x =
      (i * 151 + animationTime * (8 + i % 3)) %
      (W + 100) - 50;

    const y = 45 + (i % 4) * 62;

    ctx.globalAlpha = 0.12;
    drawCloud(x, y, "#e1eaff", 1.2);
  }

  ctx.globalAlpha = 1;
}

function drawPlatforms() {
  const level = levels[currentLevel];

  for (const platform of level.platforms) {
    // Shadow.
    roundedRect(
      platform.x + 3,
      platform.y + 5,
      platform.w,
      platform.h,
      5,
      "#10142677"
    );

    // Main platform.
    roundedRect(
      platform.x,
      platform.y,
      platform.w,
      platform.h,
      5,
      "#26395e"
    );

    // Glowing top edge.
    ctx.fillStyle = "#74f0e5";
    ctx.fillRect(
      platform.x + 3,
      platform.y,
      Math.max(0, platform.w - 6),
      3
    );

    // Platform details.
    ctx.fillStyle = "#5877a9";

    for (
      let x = platform.x + 12;
      x < platform.x + platform.w - 8;
      x += 24
    ) {
      ctx.fillRect(x, platform.y + 8, 3, 3);
    }
  }
}

function drawHazards() {
  const level = levels[currentLevel];

  for (const hazard of level.hazards) {
    ctx.fillStyle = "#ff587e";
    ctx.beginPath();

    for (
      let x = hazard.x;
      x < hazard.x + hazard.w;
      x += 15
    ) {
      ctx.moveTo(x, hazard.y + hazard.h);
      ctx.lineTo(x + 7.5, hazard.y);
      ctx.lineTo(x + 15, hazard.y + hazard.h);
    }

    ctx.fill();

    ctx.fillStyle = "#ff9caf";
    ctx.fillRect(
      hazard.x,
      hazard.y + hazard.h - 2,
      hazard.w,
      2
    );
  }
}

function drawGoal() {
  const goal = levels[currentLevel].goal;

  ctx.save();

  ctx.globalAlpha =
    0.4 + 0.2 * Math.sin(animationTime * 5);

  ctx.fillStyle = "#74f0e5";
  ctx.fillRect(
    goal.x + 7,
    goal.y - 4,
    18,
    68
  );

  ctx.restore();

  ctx.fillStyle = "#74f0e5";
  ctx.fillRect(goal.x + 12, goal.y, 5, 60);

  ctx.fillStyle = "#ffe67d";
  ctx.beginPath();
  ctx.moveTo(goal.x + 17, goal.y);
  ctx.lineTo(goal.x + 48, goal.y + 12);
  ctx.lineTo(goal.x + 17, goal.y + 25);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  if (
    player.invulnerable > 0 &&
    Math.floor(animationTime * 18) % 2 === 0
  ) {
    return;
  }

  if (player.gliding) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#74f0e5";
    ctx.lineWidth = 3;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(
        player.x + 12 - i * 7,
        player.y + 15 + i * 7
      );
      ctx.lineTo(
        player.x - 8 - i * 7,
        player.y + 20 + i * 7
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCloud(
    player.x,
    player.y,
    player.color,
    0.8
  );

  // Eyes.
  ctx.fillStyle = "#18233f";

  const eyeOffset = player.facing < 0 ? -2 : 0;

  ctx.fillRect(
    player.x + 16 + eyeOffset,
    player.y + 13,
    3,
    4
  );

  ctx.fillRect(
    player.x + 26 + eyeOffset,
    player.y + 13,
    3,
    4
  );

  // Lightning bolt.
  ctx.fillStyle = "#ffe66d";
  ctx.beginPath();
  ctx.moveTo(player.x + 20, player.y + 18);
  ctx.lineTo(player.x + 15, player.y + 27);
  ctx.lineTo(player.x + 22, player.y + 24);
  ctx.lineTo(player.x + 20, player.y + 30);
  ctx.lineTo(player.x + 29, player.y + 19);
  ctx.lineTo(player.x + 23, player.y + 21);
  ctx.closePath();
  ctx.fill();
}

function drawRemotePlayers() {
  const now = Date.now();

  for (const [id, remote] of Object.entries(remotes)) {
    if (now - remote.time > 6000) {
      delete remotes[id];
      continue;
    }

    if (id === user?.id) continue;

    drawCloud(
      remote.x,
      remote.y,
      remote.color || "#ffb0d9",
      0.8
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
      (remote.name || "Cloud player").slice(0, 14),
      remote.x + 17,
      remote.y - 5
    );

    ctx.textAlign = "left";
  }
}

function drawBuilderGrid() {
  ctx.save();

  ctx.strokeStyle = "#ffffff22";
  ctx.lineWidth = 1;

  for (let x = 0; x < W; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Preview the builder's start and goal.
  drawCloud(
    builder.start.x,
    builder.start.y,
    "#74f0e5",
    0.8
  );

  ctx.fillStyle = "#ffe67d";
  ctx.fillRect(
    builder.goal.x + 12,
    builder.goal.y,
    5,
    60
  );

  ctx.restore();
}

function drawWinOverlay() {
  if (!won) return;

  ctx.fillStyle = "#101426cc";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  ctx.fillStyle = "#74f0e5";
  ctx.font = "bold 38px monospace";
  ctx.fillText("LEVEL COMPLETE!", W / 2, H / 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px monospace";
  ctx.fillText(
    "Press Next to continue",
    W / 2,
    H / 2 + 36
  );

  ctx.textAlign = "left";
}

function draw() {
  drawBackground();
  drawPlatforms();
  drawHazards();
  drawGoal();
  drawRemotePlayers();
  drawPlayer();

  if (mode === "builder") {
    drawBuilderGrid();
  }

  drawWinOverlay();
}

/* =========================
   MAIN GAME LOOP
   ========================= */

function frame(now) {
  const dt = Math.min(
    (now - previousTime) / 1000,
    0.025
  );

  previousTime = now;
  animationTime += dt;

  movePlayer(dt);
  draw();

  if (
    roomChannel &&
    user &&
    now - lastBroadcast > 120
  ) {
    lastBroadcast = now;

    roomChannel.send({
      type: "broadcast",
      event: "player",
      payload: {
        id: user.id,
        name: user.email?.split("@")[0] || "Cloud",
        x: Math.round(player.x),
        y: Math.round(player.y),
        color: player.color
      }
    }).catch(() => {});
  }

  requestAnimationFrame(frame);
}

/* =========================
   KEYBOARD AND TOUCH INPUT
   ========================= */

window.addEventListener("keydown", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  if ([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    " "
  ].includes(key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === "r") {
    resetPlayer();
  }

  if (key === "Escape" && mode !== "play") {
    setMode("play");
  }
});

window.addEventListener("keyup", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  keys.delete(key);
});

window.addEventListener("blur", () => {
  keys.clear();

  Object.keys(held).forEach(key => {
    held[key] = false;
  });
});

function bindHold(id, property) {
  const button = $(id);
  if (!button) return;

  const down = event => {
    event.preventDefault();
    held[property] = true;
  };

  const up = event => {
    event.preventDefault();
    held[property] = false;
  };

  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
  button.addEventListener("lostpointercapture", up);
}

bindHold("left-button", "left");
bindHold("right-button", "right");
bindHold("jump-button", "jump");

$("restart-button").addEventListener(
  "click",
  resetPlayer
);

$("previous-button").addEventListener(
  "click",
  () => goToLevel(currentLevel - 1)
);

$("next-button").addEventListener("click", () => {
  if (currentLevel < levels.length - 1) {
    goToLevel(currentLevel + 1);
  } else {
    toast("You finished all available levels!");
  }
});

$("fullscreen-button").addEventListener(
  "click",
  async () => {
    try {
      if (!document.fullscreenElement) {
        await $("canvas-wrap").requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast("Fullscreen isn't available here.");
    }
  }
);

/* =========================
   NAVIGATION
   ========================= */

$("play-tab").addEventListener("click", () => {
  setMode("play");
});

$("builder-tab").addEventListener("click", () => {
  setMode("builder");
});

$("community-tab").addEventListener("click", () => {
  setMode("community");
});

/* =========================
   LEVEL EDITOR SCREEN
   ========================= */

function buildEditorScreen() {
  const screen = document.createElement("section");

  screen.id = "editor-screen";
  screen.className = "game-screen";

  screen.innerHTML = `
    <h1 class="game-screen-heading">
      🧱 Level Editor
    </h1>

    <p class="game-screen-description">
      Design your own course. Select a tool, then click
      the game canvas to place objects on the grid.
    </p>

    <div class="editor-help">
      Platform: create a platform.
      Hazard: place a hazard.
      Erase: remove an object.
      Start: choose the spawn point.
      Goal: choose the finish.
    </div>

    <div class="game-screen-controls">
      <input id="editor-title"
        maxlength="50"
        value="My Cloud Course"
        placeholder="Level name">

      <button id="editor-tool-platform">Platform</button>
      <button id="editor-tool-hazard">Hazard</button>
      <button id="editor-tool-erase">Erase</button>
      <button id="editor-tool-start">Start</button>
      <button id="editor-tool-goal">Goal</button>
    </div>

    <div class="game-screen-controls">
      <button id="editor-clear">Clear all</button>
      <button id="editor-test" class="primary">Test level</button>
      <button id="editor-save">Save locally</button>
      <button id="editor-publish" class="primary">
        Publish level
      </button>
    </div>

    <p id="editor-status" class="game-screen-description">
      Ready to build.
    </p>

    <div class="game-screen-controls">
      <button id="editor-back">Back to game</button>
    </div>
  `;

  $("extra-screen-host").appendChild(screen);

  const toolButtons = {
    "editor-tool-platform": "platform",
    "editor-tool-hazard": "hazard",
    "editor-tool-erase": "erase",
    "editor-tool-start": "start",
    "editor-tool-goal": "goal"
  };

  for (const [id, tool] of Object.entries(toolButtons)) {
    $(id).addEventListener("click", () => {
      builderTool = tool;

      for (const buttonId of Object.keys(toolButtons)) {
        $(buttonId).classList.toggle(
          "active",
          buttonId === id
        );
      }

      $("editor-status").textContent =
        `Selected tool: ${tool}`;
    });
  }

  $("editor-title").addEventListener("input", () => {
    builder.name =
      $("editor-title").value.trim() || "My Cloud Course";
    editorDirty = true;
  });

  $("editor-clear").addEventListener("click", () => {
    builder = {
      name: $("editor-title").value.trim() || "My Cloud Course",
      platforms: [],
      hazards: [],
      start: { x: 40, y: 420 },
      goal: { x: 850, y: 390 }
    };

    editorDirty = true;
    refreshEditorPreview();

    $("editor-status").textContent = "Editor cleared.";
  });

  $("editor-test").addEventListener("click", () => {
    const level = captureBuilder();

    if (!validCommunityLevel(level) ||
        level.platforms.length === 0) {
      $("editor-status").textContent =
        "Add a valid platform before testing.";
      return;
    }

    levels.push(copyLevel(level));
    currentLevel = levels.length - 1;
    checkpoint = null;

    updateStats();
    resetPlayer();
    setMode("play");

    toast("Testing your custom course!");
  });

  $("editor-save").addEventListener("click", () => {
    try {
      localStorage.setItem(
        "thundercloud-custom-level",
        JSON.stringify(captureBuilder())
      );

      $("editor-status").textContent =
        "Level saved in this browser.";
    } catch {
      $("editor-status").textContent =
        "Couldn't save to browser storage.";
    }
  });

  $("editor-publish").addEventListener(
    "click",
    publishLevel
  );

  $("editor-back").addEventListener("click", () => {
    setMode("play");
  });
}

function captureBuilder() {
  return {
    name: (
      builder.name ||
      $("editor-title")?.value ||
      "My Cloud Course"
    ).trim().slice(0, 50) || "My Cloud Course",

    start: { ...builder.start },
    goal: { ...builder.goal },

    platforms: builder.platforms.map(
      platform => ({ ...platform })
    ),

    hazards: builder.hazards.map(
      hazard => ({ ...hazard })
    )
  };
}

function refreshEditorPreview() {
  if ($("editor-title")) {
    $("editor-title").value = builder.name;
  }

  if ($("editor-status")) {
    $("editor-status").textContent =
      `${builder.platforms.length} platforms · ` +
      `${builder.hazards.length} hazards`;
  }
}

canvas.addEventListener("click", event => {
  if (mode !== "builder") return;

  const rect = canvas.getBoundingClientRect();

  const x = clamp(
    Math.floor(
      ((event.clientX - rect.left) / rect.width * W) / TILE
    ) * TILE,
    0,
    W - TILE
  );

  const y = clamp(
    Math.floor(
      ((event.clientY - rect.top) / rect.height * H) / TILE
    ) * TILE,
    0,
    H - TILE
  );

  if (builderTool === "start") {
    builder.start = {
      x: clamp(x, 0, W - 40),
      y: clamp(y, 0, H - 40)
    };
  } else if (builderTool === "goal") {
    builder.goal = {
      x: clamp(x, 0, W - 50),
      y: clamp(y, 0, H - 60)
    };
  } else if (builderTool === "erase") {
    builder.platforms = builder.platforms.filter(
      item => !pointInsideObject(x, y, item)
    );

    builder.hazards = builder.hazards.filter(
      item => !pointInsideObject(x, y, item)
    );
  } else if (builderTool === "platform") {
    if (builder.platforms.length < 150) {
      builder.platforms.push({
        x,
        y,
        w: 120,
        h: 18
      });
    }
  } else if (builderTool === "hazard") {
    if (builder.hazards.length < 100) {
      builder.hazards.push({
        x,
        y: Math.min(H - 15, y + 20),
        w: 80,
        h: 15
      });
    }
  }

  builder.name =
    $("editor-title")?.value.trim() ||
    "My Cloud Course";

  editorDirty = true;
  refreshEditorPreview();
});

function pointInsideObject(x, y, object) {
  return (
    x >= object.x &&
    x < object.x + object.w &&
    y >= object.y - 8 &&
    y < object.y + object.h + 8
  );
}

/* =========================
   COMMUNITY LEVELS SCREEN
   ========================= */

function buildCommunityScreen() {
  const screen = document.createElement("section");

  screen.id = "community-screen";
  screen.className = "game-screen";

  screen.innerHTML = `
    <h1 class="game-screen-heading">
      🌍 Community Levels
    </h1>

    <p class="game-screen-description">
      Browse levels published by players. The list is
      retrieved from the shared online database.
    </p>

    <div class="game-screen-controls">
      <input id="community-search"
        placeholder="Search level names...">

      <select id="community-sort">
        <option value="newest">Newest first</option>
        <option value="alphabetical">Alphabetical</option>
      </select>

      <button id="community-refresh">Refresh</button>
      <button id="community-create">Create a level</button>
    </div>

    <p id="community-status"
      class="game-screen-description">
      Loading community levels...
    </p>

    <div id="community-grid" class="community-grid"></div>

    <div class="game-pagination">
      <button id="community-prev">Previous</button>
      <span id="community-page-label">Page 1</span>
      <button id="community-next">Next</button>
    </div>

    <div class="game-screen-controls">
      <button id="community-back">Back to game</button>
    </div>
  `;

  $("extra-screen-host").appendChild(screen);

  $("community-search").addEventListener("input", () => {
    communitySearch =
      $("community-search").value.trim().toLowerCase();

    communityPage = 0;
    renderCommunityLevels();
  });

  $("community-sort").addEventListener("change", () => {
    communitySort = $("community-sort").value;
    renderCommunityLevels();
  });

  $("community-refresh").addEventListener(
    "click",
    loadCommunityLevels
  );

  $("community-create").addEventListener("click", () => {
    setMode("builder");
  });

  $("community-back").addEventListener("click", () => {
    setMode("play");
  });

  $("community-prev").addEventListener("click", () => {
    communityPage = Math.max(0, communityPage - 1);
    renderCommunityLevels();
  });

  $("community-next").addEventListener("click", () => {
    communityPage++;
    renderCommunityLevels();
  });
}

async function loadCommunityLevels() {
  const status = $("community-status");
  const grid = $("community-grid");

  if (!status || !grid) return;

  status.textContent = "Loading published levels...";
  grid.replaceChildren();

  const { data, error } = await supabase
    .from("custom_levels")
    .select("id,title,level_data,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    status.textContent =
      "Couldn't load online levels: " + error.message;
    return;
  }

  communityLevels = (data || []).filter(item =>
    validCommunityLevel(item.level_data)
  );

  communityPage = 0;
  renderCommunityLevels();
}

function renderCommunityLevels() {
  const grid = $("community-grid");
  const status = $("community-status");

  if (!grid || !status) return;

  grid.replaceChildren();

  let results = communityLevels.filter(item =>
    String(item.title || "")
      .toLowerCase()
      .includes(communitySearch)
  );

  if (communitySort === "alphabetical") {
    results.sort((a, b) =>
      String(a.title).localeCompare(String(b.title))
    );
  } else {
    results.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil(results.length / communityPageSize)
  );

  communityPage = clamp(
    communityPage,
    0,
    totalPages - 1
  );

  const start = communityPage * communityPageSize;

  const pageResults = results.slice(
    start,
    start + communityPageSize
  );

  status.textContent =
    `${results.length} matching published level(s).`;

  $("community-page-label").textContent =
    `Page ${communityPage + 1} of ${totalPages}`;

  $("community-prev").disabled = communityPage === 0;

  $("community-next").disabled =
    communityPage >= totalPages - 1;

  if (!pageResults.length) {
    grid.textContent =
      "No levels found. Try another search or publish one!";
    return;
  }

  for (const item of pageResults) {
    const button = document.createElement("button");

    button.className = "community-card";

    const title = document.createElement("strong");
    title.textContent = item.title || "Untitled level";

    const description = document.createElement("small");
    description.textContent =
      `${item.level_data.platforms.length} platforms · ` +
      `${item.level_data.hazards.length} hazards`;

    const playText = document.createElement("div");
    playText.textContent = "▶ Play level";
    playText.style.marginTop = "12px";
    playText.style.color = "#74f0e5";

    button.append(title, description, playText);

    button.addEventListener("click", () => {
      loadCommunityLevel(item);
    });

    grid.appendChild(button);
  }
}

function loadCommunityLevel(item) {
  const level = item.level_data;

  if (!validCommunityLevel(level)) {
    toast("This community level has invalid data.");
    return;
  }

  levels.push({
    ...copyLevel(level),
    name: String(item.title || "Community level").slice(0, 50)
  });

  currentLevel = levels.length - 1;
  checkpoint = null;

  updateStats();
  resetPlayer();
  setMode("play");

  toast("Loaded: " + levels[currentLevel].name);
}

/* =========================
   SUPABASE ACCOUNT SYSTEM
   ========================= */

function showAccount(signedInUser) {
  user = signedInUser || null;

  $("auth-form").classList.toggle("hidden", !!user);
  $("signed-in").classList.toggle("hidden", !user);

  $("account-email").textContent = user
    ? "Signed in: " + user.email
    : "";
}

async function loadProgress() {
  if (!user) return;

  const { data, error } = await supabase
    .from("parkour_progress")
    .select("current_level,unlocked_level,total_jumps")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    setStatus("No cloud save found yet. Play, then save.");
    return;
  }

  progress = {
    current_level: Math.max(
      1,
      Number(data.current_level) || 1
    ),
    unlocked_level: Math.max(
      1,
      Number(data.unlocked_level) || 1
    ),
    total_jumps: Math.max(
      0,
      Number(data.total_jumps) || 0
    )
  };

  currentLevel = clamp(
    progress.current_level - 1,
    0,
    defaultLevels.length - 1
  );

  jumps = progress.total_jumps;

  resetPlayer();
  updateStats();

  setStatus("Cloud progress loaded.");
}

async function saveProgress() {
  if (!user) {
    throw new Error("Log in first.");
  }

  const payload = {
    current_level: currentLevel + 1,
    unlocked_level: clamp(
      progress.unlocked_level,
      1,
      defaultLevels.length
    ),
    total_jumps: Math.max(0, jumps)
  };

  const { data, error } = await supabase
    .from("parkour_progress")
    .update(payload)
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "No save row was updated. Check your database policies."
    );
  }

  progress = { ...progress, ...payload };

  setStatus("Progress saved to Supabase!");
}

$("signup-button").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    setStatus(
      "Enter an email and password with at least 6 characters."
    );
    return;
  }

  setStatus("Creating account...");

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  setStatus(
    error
      ? error.message
      : "Account created. Check email if confirmation is required."
  );
});

$("login-button").addEventListener("click", async () => {
  setStatus("Logging in...");

  const { error } = await supabase.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) setStatus(error.message);
});

$("logout-button").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setStatus(error.message);
  } else {
    setStatus("Logged out.");
  }
});

$("save-button").addEventListener("click", async () => {
  try {
    await saveProgress();
  } catch (error) {
    setStatus("Save failed: " + error.message);
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  showAccount(session?.user || null);

  if (session?.user) {
    setTimeout(() => {
      loadProgress().catch(error => {
        setStatus("Load failed: " + error.message);
      });
    }, 0);
  }
});

/* =========================
   PUBLISH COMMUNITY LEVELS
   ========================= */

async function publishLevel() {
  if (!user) {
    setStatus("Log in to publish a level.");
    return;
  }

  const level = captureBuilder();

  if (!validCommunityLevel(level)) {
    setStatus("The level contains invalid objects.");
    return;
  }

  setStatus("Publishing level...");

  const { error } = await supabase
    .from("custom_levels")
    .insert({
      author_id: user.id,
      title: level.name,
      level_data: level,
      is_public: true
    });

  if (error) {
    setStatus("Publish failed: " + error.message);
    return;
  }

  setStatus("Level published!");

  await loadCommunityLevels();
}

/* =========================
   MULTIPLAYER ROOM
   ========================= */

async function joinRoom() {
  const requested = $("room-name").value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);

  if (!requested) {
    setRoomStatus("Enter a room name.");
    return;
  }

  if (roomChannel) {
    await supabase.removeChannel(roomChannel);
    roomChannel = null;
  }

  roomName = requested;

  for (const id of Object.keys(remotes)) {
    delete remotes[id];
  }

  setRoomStatus("Joining " + roomName + "...");

  roomChannel = supabase.channel(
    "parkour-room-" + roomName,
    { config: { broadcast: { self: false } } }
  );

  roomChannel.on(
    "broadcast",
    { event: "player" },
    ({ payload }) => {
      if (
        !payload ||
        typeof payload.id !== "string" ||
        payload.id === user?.id
      ) {
        return;
      }

      if (
        !Number.isFinite(payload.x) ||
        !Number.isFinite(payload.y)
      ) {
        return;
      }

      remotes[payload.id] = {
        x: clamp(payload.x, 0, W - 40),
        y: clamp(payload.y, 0, H - 40),
        name: String(payload.name || "Cloud").slice(0, 16),
        color: /^#[0-9a-f]{6}$/i.test(payload.color)
          ? payload.color
          : "#ffb0d9",
        time: Date.now()
      };
    }
  );

  roomChannel.subscribe(status => {
    if (status === "SUBSCRIBED") {
      setRoomStatus(
        "Connected to " + roomName +
        ". Share this room name with friends."
      );
    } else if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT"
    ) {
      setRoomStatus(
        "Room connection failed. Check Supabase Realtime."
      );
    } else if (status === "CLOSED") {
      setRoomStatus("Room disconnected.");
    }
  });
}

$("join-room").addEventListener("click", joinRoom);

/* =========================
   RESTORE LOCAL DRAFT
   ========================= */

function restoreLocalDraft() {
  try {
    const draft = JSON.parse(
      localStorage.getItem("thundercloud-custom-level") || "null"
    );

    if (draft && validCommunityLevel(draft)) {
      builder = {
        name: draft.name || "My Cloud Course",
        platforms: draft.platforms.map(p => ({ ...p })),
        hazards: draft.hazards.map(h => ({ ...h })),
        start: { ...draft.start },
        goal: { ...draft.goal }
      };
    }
  } catch {
    // Ignore damaged local data.
  }
}

/* =========================
   INITIALIZATION
   ========================= */

async function initializeGame() {
  createAdditionalScreens();

  restoreLocalDraft();

  levels = defaultLevels.map(copyLevel);

  resetPlayer();
  updateStats();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    setStatus(error.message);
  } else if (data.session?.user) {
    showAccount(data.session.user);

    try {
      await loadProgress();
    } catch (loadError) {
      setStatus("Load failed: " + loadError.message);
    }
  } else {
    showAccount(null);
    setStatus(
      "Ready! Sign in to save progress online."
    );
  }

  refreshEditorPreview();
  joinRoom();

  previousTime = performance.now();
  requestAnimationFrame(frame);
}

initializeGame().catch(error => {
  console.error("Game initialization failed:", error);
  setStatus("Game initialization failed: " + error.message);
});
