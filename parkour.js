
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// THUNDERCLOUD PARKOUR
// Complete game logic for the existing index.html.
// ============================================================

const supabase = createClient(
  "https://qorfczqljrvxfouodhcp.supabase.co",
  "sb_publishable_C4uGBFM5nmiGWOPanRqWvQ_SPbC0eRb"
);

const $ = id => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const TILE = 40;

let user = null;
let progress = {
  current_level: 1,
  unlocked_level: 1,
  total_jumps: 0
};

let jumps = 0;
let currentLevel = 0;
let mode = "play";
let builderTool = "platform";
let roomChannel = null;
let roomName = "";
let remotes = {};
let lastBroadcast = 0;
let toastTimer = null;
let won = false;
let previousTime = performance.now();
let levelStarted = performance.now();

const bestTimes = {};
const keys = new Set();
const held = { left: false, right: false, jump: false };

// ============================================================
// LEVELS
// ============================================================

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

const copyLevel = level => JSON.parse(JSON.stringify(level));
let levels = defaultLevels.map(copyLevel);

const player = {
  x: 50,
  y: 420,
  w: 34,
  h: 30,
  vx: 0,
  vy: 0,
  speed: 270,
  jump: 520,
  onGround: false,
  jumpWasHeld: false,
  color: "#a9c4ff"
};

let builder = {
  platforms: [],
  hazards: [],
  start: { x: 60, y: 430 },
  goal: { x: 850, y: 390 }
};

// ============================================================
// UI HELPERS
// ============================================================

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => $("toast").classList.add("hidden"),
    2600
  );
}

function setStatus(message) {
  $("status").textContent = message;
}

function setRoomStatus(message) {
  $("room-status").textContent = message;
}

function setMode(next) {
  mode = next;

  $("play-tab").classList.toggle("active", mode === "play");
  $("builder-tab").classList.toggle("active", mode === "builder");
  $("community-tab").classList.toggle("active", mode === "community");

  $("community-panel").classList.toggle(
    "hidden", mode !== "community"
  );
  $("builder-panel").classList.toggle(
    "hidden", mode !== "builder"
  );

  if (mode === "builder") {
    toast("Choose a tool, then click the grid.");
  }
}

function updateStats() {
  $("stat-level").textContent =
    `${currentLevel + 1} / ${levels.length}`;

  $("stat-jumps").textContent = String(jumps);

  $("stat-time").textContent =
    bestTimes[currentLevel] !== undefined
      ? bestTimes[currentLevel].toFixed(1) + "s"
      : "—";

  $("unlock-text").textContent =
    `Unlocked through level ${Math.max(progress.unlocked_level, 1)}.`;

  const list = $("level-list");
  list.replaceChildren();

  levels.forEach((level, index) => {
    const button = document.createElement("button");
    button.textContent = String(index + 1);
    button.title = level.name;
    button.classList.toggle("active", index === currentLevel);

    button.disabled =
      index + 1 > progress.unlocked_level &&
      index < defaultLevels.length;

    button.addEventListener("click", () => {
      if (index >= defaultLevels.length &&
          index + 1 > progress.unlocked_level) {
        toast("Finish more levels to unlock this level.");
        return;
      }

      currentLevel = index;
      resetPlayer();
      updateStats();
    });

    list.append(button);
  });
}

function resetPlayer() {
  const level = levels[currentLevel];

  player.x = level.start.x;
  player.y = level.start.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.jumpWasHeld = false;
  won = false;
  levelStarted = performance.now();
}

function goToLevel(index) {
  currentLevel = Math.max(
    0,
    Math.min(levels.length - 1, index)
  );

  resetPlayer();
  updateStats();
  toast(levels[currentLevel].name);
}

function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ============================================================
// COLLISION AND PHYSICS
// ============================================================

function movePlayer(dt) {
  if (mode !== "play" || won) return;

  // Clamp large frame times to prevent tunneling.
  dt = Math.min(Math.max(dt, 0), 1 / 30);

  const level = levels[currentLevel];

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

  // Jump on a fresh press, not every frame Space is held.
  const jumpPressed =
    jumpHeld && !player.jumpWasHeld;

  player.jumpWasHeld = jumpHeld;

  // Save the old position before moving.
  const oldX = player.x;
  const oldY = player.y;

  // Horizontal movement.
  const direction = Number(right) - Number(left);
  player.vx = direction * player.speed;
  player.x += player.vx * dt;

  player.x = Math.max(
    0,
    Math.min(W - player.w, player.x)
  );

  // Horizontal wall collisions.
  for (const platform of level.platforms) {
    const overlapsY =
      player.y < platform.y + platform.h &&
      player.y + player.h > platform.y;

    const overlapsX =
      player.x < platform.x + platform.w &&
      player.x + player.w > platform.x;

    if (!overlapsX || !overlapsY) continue;

    if (
      player.vx > 0 &&
      oldX + player.w <= platform.x + 1
    ) {
      player.x = platform.x - player.w;
    } else if (
      player.vx < 0 &&
      oldX >= platform.x + platform.w - 1
    ) {
      player.x = platform.x + platform.w;
    } else {
      // Resolve any overlap safely.
      const pushLeft =
        player.x + player.w - platform.x;
      const pushRight =
        platform.x + platform.w - player.x;

      if (pushLeft < pushRight) {
        player.x = platform.x - player.w;
      } else {
        player.x = platform.x + platform.w;
      }
    }
  }

  // Jump only when grounded.
  if (jumpPressed && player.onGround) {
    player.vy = -player.jump;
    player.onGround = false;
    jumps++;
    updateStats();
  }

  // Gravity.
  player.vy = Math.min(
    player.vy + 1350 * dt,
    1000
  );

  player.y += player.vy * dt;
  player.onGround = false;

  // Vertical collision resolution.
  // This catches both landing on tops and hitting undersides.
  for (const platform of level.platforms) {
    const overlapsX =
      player.x < platform.x + platform.w &&
      player.x + player.w > platform.x;

    if (!overlapsX) continue;

    const oldBottom = oldY + player.h;
    const newBottom = player.y + player.h;

    if (
      player.vy >= 0 &&
      oldBottom <= platform.y + 2 &&
      newBottom >= platform.y
    ) {
      // Land on top of the platform.
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (
      player.vy < 0 &&
      oldY >= platform.y + platform.h - 2 &&
      player.y <= platform.y + platform.h
    ) {
      // Hit the underside while jumping.
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
  }

  // Hazard collisions.
  for (const hazard of level.hazards) {
    if (collide(player, hazard)) {
      resetPlayer();
      toast("Zap! Try that jump again.");
      return;
    }
  }

  // Falling below the level.
  if (player.y > H + 100) {
    resetPlayer();
    toast("You fell! Try again.");
    return;
  }

  // Goal collision.
  const goal = {
    x: level.goal.x,
    y: level.goal.y,
    w: 38,
    h: 60
  };

  if (collide(player, goal)) {
    finishLevel();
  }
}

function finishLevel() {
  if (won) return;

  won = true;

  const seconds =
    (performance.now() - levelStarted) / 1000;

  bestTimes[currentLevel] = Math.min(
    bestTimes[currentLevel] ?? Infinity,
    seconds
  );

  progress.current_level = currentLevel + 1;

  progress.unlocked_level = Math.max(
    progress.unlocked_level,
    Math.min(defaultLevels.length, currentLevel + 2)
  );

  progress.total_jumps = Math.max(
    progress.total_jumps,
    jumps
  );

  updateStats();

  toast(
    `Level complete! ${seconds.toFixed(1)} seconds. Press Next to continue.`
  );

  if (user) {
    saveProgress().catch(error =>
      setStatus("Save failed: " + error.message)
    );
  }
}

// ============================================================
// GRAPHICS
// ============================================================

function roundedRect(x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function drawCloud(x, y, color, scale = 1) {
  ctx.save();
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
  ctx.restore();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#10182f");
  sky.addColorStop(0.55, "#243e69");
  sky.addColorStop(1, "#5879a8");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars.
  ctx.fillStyle = "#ffffff99";

  for (let i = 0; i < 65; i++) {
    const x = (i * 137 + 31) % W;
    const y = (i * 71 + 17) % 300;
    const size = i % 4 === 0 ? 2 : 1;

    ctx.fillRect(x, y, size, size);
  }

  // Distant decorative clouds.
  ctx.globalAlpha = 0.18;

  for (let i = 0; i < 9; i++) {
    drawCloud(
      (i * 137 + 20) % W,
      45 + (i % 4) * 55,
      "#d8e7ff",
      1.15
    );
  }

  ctx.globalAlpha = 1;
}

function drawPlatforms(level) {
  for (const p of level.platforms) {
    // Shadow.
    roundedRect(
      p.x + 3, p.y + 5, p.w, p.h, 5,
      "#10172b66"
    );

    // Platform body.
    roundedRect(
      p.x, p.y, p.w, p.h, 5,
      "#263958"
    );

    // Bright top edge.
    roundedRect(
      p.x, p.y, p.w, Math.min(5, p.h), 3,
      "#8ce9f1"
    );

    // Small decorative marks.
    ctx.fillStyle = "#6684aa";

    for (let x = p.x + 12; x < p.x + p.w - 8; x += 24) {
      ctx.fillRect(x, p.y + Math.min(9, p.h - 3), 3, 3);
    }
  }
}

function drawHazards(level) {
  for (const hazard of level.hazards) {
    ctx.fillStyle = "#ff527b";
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
  }
}

function drawGoal(level) {
  const x = level.goal.x;
  const y = level.goal.y;

  ctx.save();
  ctx.shadowColor = "#74f0e5";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "#74f0e5";
  ctx.fillRect(x + 12, y, 5, 60);

  ctx.fillStyle = "#ffe67d";
  ctx.beginPath();
  ctx.moveTo(x + 17, y);
  ctx.lineTo(x + 48, y + 12);
  ctx.lineTo(x + 17, y + 25);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPlayer() {
  ctx.save();

  ctx.shadowColor = "#9db5ff";
  ctx.shadowBlur = 12;

  drawCloud(
    player.x,
    player.y,
    player.color,
    0.8
  );

  ctx.shadowBlur = 0;

  // Eyes.
  ctx.fillStyle = "#18233f";
  ctx.fillRect(player.x + 16, player.y + 13, 3, 4);
  ctx.fillRect(player.x + 26, player.y + 13, 3, 4);

  // Lightning symbol.
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

  ctx.restore();
}

function drawRemotePlayers() {
  const now = Date.now();

  for (const [id, remote] of Object.entries(remotes)) {
    if (now - remote.time > 5000) {
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
      remote.name || "Cloud player",
      remote.x + 22,
      remote.y - 4
    );

    ctx.textAlign = "left";
  }
}

function drawBuilderGrid() {
  ctx.save();
  ctx.strokeStyle = "#ffffff26";
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

  ctx.restore();
}

function draw() {
  drawBackground();

  const level = levels[currentLevel];

  drawPlatforms(level);
  drawHazards(level);
  drawGoal(level);
  drawRemotePlayers();
  drawPlayer();

  if (mode === "builder") {
    drawBuilderGrid();
  }

  if (won) {
    ctx.fillStyle = "#101426cc";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#74f0e5";
    ctx.font = "bold 38px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE!", W / 2, H / 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px monospace";
    ctx.fillText(
      "Press Next to continue",
      W / 2,
      H / 2 + 35
    );

    ctx.textAlign = "left";
  }
}

// ============================================================
// GAME LOOP AND INPUT
// ============================================================

function frame(now) {
  const dt = Math.min(
    Math.max((now - previousTime) / 1000, 0),
    0.035
  );

  previousTime = now;

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

window.addEventListener("keydown", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === "r") {
    resetPlayer();
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
  held.left = false;
  held.right = false;
  held.jump = false;
  player.jumpWasHeld = false;
});

function bindHold(id, property) {
  const button = $(id);

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
  button.addEventListener("contextmenu", event => {
    event.preventDefault();
  });
}

bindHold("left-button", "left");
bindHold("right-button", "right");
bindHold("jump-button", "jump");

$("restart-button").addEventListener("click", resetPlayer);

$("previous-button").addEventListener("click", () => {
  goToLevel(currentLevel - 1);
});

$("next-button").addEventListener("click", () => {
  if (currentLevel < levels.length - 1) {
    goToLevel(currentLevel + 1);
  } else {
    toast("You finished all available levels!");
  }
});

$("fullscreen-button").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await $("canvas-wrap").requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    toast("Fullscreen is not available in this browser.");
  }
});

$("play-tab").addEventListener("click", () => setMode("play"));
$("builder-tab").addEventListener("click", () => setMode("builder"));

$("community-tab").addEventListener("click", () => {
  setMode("community");
  loadCommunityLevels();
});

// ============================================================
// LEVEL BUILDER
// ============================================================

function setTool(tool) {
  builderTool = tool;

  ["platform", "hazard", "erase", "start", "goal"].forEach(name => {
    $("tool-" + name).classList.toggle(
      "active",
      name === tool
    );
  });
}

["platform", "hazard", "erase", "start", "goal"].forEach(tool => {
  $("tool-" + tool).addEventListener("click", () => setTool(tool));
});

function freshBuilder() {
  builder = {
    platforms: [],
    hazards: [],
    start: { x: 40, y: 420 },
    goal: { x: 850, y: 390 }
  };
}

$("clear-builder").addEventListener("click", () => {
  freshBuilder();

  levels[currentLevel] = {
    ...copyLevel(levels[currentLevel]),
    platforms: [],
    hazards: []
  };

  toast("Builder cleared.");
});

canvas.addEventListener("click", event => {
  if (mode !== "builder") return;

  const rect = canvas.getBoundingClientRect();

  const x = Math.floor(
    ((event.clientX - rect.left) / rect.width * W) / TILE
  ) * TILE;

  const y = Math.floor(
    ((event.clientY - rect.top) / rect.height * H) / TILE
  ) * TILE;

  if (builderTool === "start") {
    builder.start = {
      x: Math.max(0, Math.min(W - 40, x)),
      y: Math.max(0, Math.min(H - 40, y))
    };
  } else if (builderTool === "goal") {
    builder.goal = {
      x: Math.max(0, Math.min(W - 50, x)),
      y: Math.max(0, Math.min(H - 60, y))
    };
  } else if (builderTool === "erase") {
    builder.platforms = builder.platforms.filter(item =>
      !(x >= item.x && x < item.x + item.w &&
        y >= item.y - 8 && y < item.y + item.h + 8)
    );

    builder.hazards = builder.hazards.filter(item =>
      !(x >= item.x && x < item.x + item.w &&
        y >= item.y - 8 && y < item.y + item.h + 8)
    );
  } else if (builderTool === "platform") {
    const hit = builder.platforms.findIndex(item =>
      x >= item.x && x < item.x + item.w &&
      y >= item.y - 8 && y < item.y + item.h + 8
    );

    if (hit >= 0) {
      builder.platforms.splice(hit, 1);
    } else if (builder.platforms.length < 150) {
      builder.platforms.push({
        x: Math.max(0, Math.min(W - 120, x)),
        y: Math.max(0, Math.min(H - 18, y)),
        w: 120,
        h: 18
      });
    }
  } else if (builderTool === "hazard") {
    if (builder.hazards.length < 100) {
      builder.hazards.push({
        x: Math.max(0, Math.min(W - 80, x)),
        y: Math.max(0, Math.min(H - 15, y + 20)),
        w: 80,
        h: 15
      });
    }
  }

  levels[currentLevel] = captureBuilder();
  player.x = builder.start.x;
  player.y = builder.start.y;
  player.vx = 0;
  player.vy = 0;
});

function captureBuilder() {
  return {
    name: $("level-title").value.trim().slice(0, 50) ||
      "My Cloud Course",

    start: { ...builder.start },
    goal: { ...builder.goal },

    platforms: builder.platforms.map(p => ({ ...p })),
    hazards: builder.hazards.map(h => ({ ...h }))
  };
}

$("test-builder").addEventListener("click", () => {
  const level = captureBuilder();

  if (!level.platforms.length) {
    toast("Add at least one platform first.");
    return;
  }

  levels[currentLevel] = level;
  resetPlayer();
  setMode("play");
  updateStats();
  toast("Testing your custom level!");
});

$("save-local").addEventListener("click", () => {
  try {
    localStorage.setItem(
      "thundercloud-custom-level",
      JSON.stringify(captureBuilder())
    );

    toast("Level saved in this browser.");
  } catch {
    toast("Browser storage is unavailable.");
  }
});

$("publish-level").addEventListener("click", publishLevel);

// ============================================================
// SUPABASE AUTHENTICATION AND SAVED PROGRESS
// ============================================================

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
    .select("current_level, unlocked_level, total_jumps")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    setStatus("No cloud save found yet. Play a level, then save.");
    return;
  }

  progress = {
    current_level: Math.max(1, Number(data.current_level) || 1),
    unlocked_level: Math.max(1, Number(data.unlocked_level) || 1),
    total_jumps: Math.max(0, Number(data.total_jumps) || 0)
  };

  currentLevel = Math.min(
    defaultLevels.length - 1,
    progress.current_level - 1
  );

  jumps = progress.total_jumps;

  resetPlayer();
  updateStats();
  setStatus("Cloud progress loaded.");
}

async function saveProgress() {
  if (!user) throw new Error("Log in first.");

  const payload = {
    current_level: Math.max(1, currentLevel + 1),
    unlocked_level: Math.max(
      1,
      Math.min(defaultLevels.length, progress.unlocked_level)
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
      "No progress row was updated. Check your Supabase table and policies."
    );
  }

  progress = { ...progress, ...payload };
  setStatus("Progress saved to Supabase!");
}

$("signup-button").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    setStatus("Enter an email and a password with at least 6 characters.");
    return;
  }

  setStatus("Creating account…");

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  setStatus(
    error
      ? error.message
      : "Account created. Check your email if confirmation is required."
  );
});

$("login-button").addEventListener("click", async () => {
  setStatus("Logging in…");

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
      loadProgress().catch(error =>
        setStatus("Load failed: " + error.message)
      );
    }, 0);
  }
});

// ============================================================
// MULTIPLAYER ROOM
// ============================================================

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
  remotes = {};

  setRoomStatus("Joining " + roomName + "…");

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
        x: Math.max(0, Math.min(W - 40, payload.x)),
        y: Math.max(0, Math.min(H - 40, payload.y)),
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
        "Connected to " + roomName + ". Share this room name with friends."
      );
    } else if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT"
    ) {
      setRoomStatus(
        "Room connection failed. Check Supabase Realtime settings."
      );
    } else if (status === "CLOSED") {
      setRoomStatus("Room disconnected.");
    }
  });
}

$("join-room").addEventListener("click", joinRoom);

// ============================================================
// COMMUNITY LEVELS
// ============================================================

function validCommunityLevel(level) {
  if (
    !level ||
    !Array.isArray(level.platforms) ||
    !Array.isArray(level.hazards)
  ) {
    return false;
  }

  if (
    level.platforms.length > 150 ||
    level.hazards.length > 100
  ) {
    return false;
  }

  const validRect = rect =>
    rect &&
    [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x < W &&
    rect.y < H &&
    rect.w > 0 &&
    rect.h > 0 &&
    rect.w <= W &&
    rect.h <= H;

  return (
    validRect({ ...level.start, w: 1, h: 1 }) &&
    validRect({ ...level.goal, w: 1, h: 1 }) &&
    level.platforms.every(validRect) &&
    level.hazards.every(validRect)
  );
}

async function publishLevel() {
  if (!user) {
    setStatus("Log in to publish a community level.");
    return;
  }

  const level = captureBuilder();

  if (!validCommunityLevel(level)) {
    setStatus("This level has invalid or too many objects.");
    return;
  }

  setStatus("Publishing level…");

  const { error } = await supabase
    .from("custom_levels")
    .insert({
      author_id: user.id,
      title: level.name,
      level_data: level,
      is_public: true
    });

  setStatus(
    error
      ? "Publish failed: " + error.message
      : "Level published!"
  );

  if (!error) {
    await loadCommunityLevels();
  }
}

async function loadCommunityLevels() {
  const list = $("community-list");
  list.replaceChildren();

  const { data, error } = await supabase
    .from("custom_levels")
    .select("id,title,level_data,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    list.textContent = "Couldn't load levels: " + error.message;
    return;
  }

  if (!data?.length) {
    list.textContent =
      "No community levels yet. Sign in and publish one!";
    return;
  }

  for (const item of data) {
    const button = document.createElement("button");
    button.className = "level-card";
    button.textContent = item.title;

    button.addEventListener("click", () => {
      const level = item.level_data;

      if (!validCommunityLevel(level)) {
        toast("That community level has invalid data.");
        return;
      }

      levels.push({
        ...copyLevel(level),
        name: item.title
      });

      currentLevel = levels.length - 1;
      resetPlayer();
      updateStats();
      setMode("play");

      toast("Loaded community level: " + item.title);
    });

    list.append(button);
  }
}

$("refresh-community").addEventListener(
  "click",
  loadCommunityLevels
);

// ============================================================
// STARTUP
// ============================================================

try {
  const draft = JSON.parse(
    localStorage.getItem("thundercloud-custom-level") || "null"
  );

  if (draft && validCommunityLevel(draft)) {
    builder = {
      platforms: draft.platforms.map(p => ({ ...p })),
      hazards: draft.hazards.map(h => ({ ...h })),
      start: { ...draft.start },
      goal: { ...draft.goal }
    };

    $("level-title").value =
      draft.name || "My Cloud Course";
  }
} catch {
  // Ignore an invalid local draft.
}

levels = defaultLevels.map(copyLevel);

resetPlayer();
updateStats();

requestAnimationFrame(frame);

(async function initialize() {
  try {
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
      setStatus("Ready! Sign in to save your progress.");
    }

    await joinRoom();
  } catch (error) {
    setStatus("Startup error: " + error.message);
  }
})();
