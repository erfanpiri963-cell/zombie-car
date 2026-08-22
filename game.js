const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let dpr = 1;

let player;
let bullets = [];
let zombies = [];
let particles = [];

let coins = 0;
let kills = 0;
let score = 0;
let distance = 0;
let hp = 100;

let gameOver = false;
let keys = {
  left: false,
  right: false,
  fire: false
};

let spawnTimer = 0;
let lastTime = performance.now();
let roadOffset = 0;
let shake = 0;
let damageFlash = 0;

// -------------------------
// RESIZE
// -------------------------

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

// -------------------------
// HUD
// -------------------------

function updateHUD() {
  const hpElement = document.getElementById("hp");
  const coinsElement = document.getElementById("coins");
  const killsElement = document.getElementById("kills");

  if (hpElement) hpElement.textContent = Math.max(0, Math.round(hp));
  if (coinsElement) coinsElement.textContent = coins;
  if (killsElement) killsElement.textContent = kills;
}

// -------------------------
// RESET
// -------------------------

function reset() {
  player = {
    x: W / 2,
    y: H - 150,
    w: 54,
    h: 88,
    speed: 6,
    cooldown: 0
  };

  bullets = [];
  zombies = [];
  particles = [];

  coins = 0;
  kills = 0;
  score = 0;
  distance = 0;
  hp = 100;

  gameOver = false;
  spawnTimer = 20;
  roadOffset = 0;
  shake = 0;
  damageFlash = 0;

  lastTime = performance.now();

  const gameOverScreen = document.getElementById("gameover");
  if (gameOverScreen) {
    gameOverScreen.classList.add("hidden");
  }

  updateHUD();
}

// -------------------------
// CONTROLS
// -------------------------

function bindButton(id, key) {
  const button = document.getElementById(id);

  if (!button) return;

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
  });

  button.addEventListener("pointerup", e => {
    e.preventDefault();
    keys[key] = false;
  });

  button.addEventListener("pointercancel", () => {
    keys[key] = false;
  });

  button.addEventListener("pointerleave", () => {
    keys[key] = false;
  });
}

bindButton("left", "left");
bindButton("right", "right");
bindButton("fire", "fire");

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = true;
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = true;
  }

  if (e.code === "Space") {
    keys.fire = true;
  }
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = false;
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = false;
  }

  if (e.code === "Space") {
    keys.fire = false;
  }
});

const restartButton = document.getElementById("restart");

if (restartButton) {
  restartButton.onclick = reset;
}

// -------------------------
// HELPERS
// -------------------------

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// -------------------------
// ROAD
// -------------------------

function drawRoad() {
  // dark background
  const background = ctx.createLinearGradient(0, 0, 0, H);

  background.addColorStop(0, "#050809");
  background.addColorStop(0.5, "#172023");
  background.addColorStop(1, "#050708");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const roadWidth = Math.min(W * 0.92, 560);
  const roadX = (W - roadWidth) / 2;

  // road
  const road = ctx.createLinearGradient(0, 0, 0, H);

  road.addColorStop(0, "#4a4f51");
  road.addColorStop(0.5, "#292e30");
  road.addColorStop(1, "#15191a");

  ctx.fillStyle = road;
  ctx.fillRect(roadX, 0, roadWidth, H);

  // road edge
  ctx.fillStyle = "#8b8d8d";

  ctx.fillRect(roadX, 0, 5, H);
  ctx.fillRect(roadX + roadWidth - 5, 0, 5, H);

  // lane lines
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 4;
  ctx.setLineDash([40, 35]);
  ctx.lineDashOffset = -roadOffset;

  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();

  ctx.setLineDash([]);

  // road cracks
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#090909";
  ctx.lineWidth = 2;

  for (let i = 0; i < 12; i++) {
    const y = ((i * 180 + roadOffset * 1.2) % (H + 180)) - 90;
    const x = roadX + rand(30, roadWidth - 30);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-15, 15), y + 30);
    ctx.lineTo(x + rand(-20, 20), y + 55);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  drawRoadside(roadX, roadWidth);
}

// -------------------------
// ROADSIDE
// -------------------------

function drawRoadside(roadX, roadWidth) {
  for (let i = 0; i < 9; i++) {
    const y =
      ((i * 170 + roadOffset * 1.3) % (H + 220)) - 110;

    // left tree
    ctx.fillStyle = "#080c0d";

    ctx.beginPath();
    ctx.arc(roadX - 40, y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(
      roadX - 44,
      y + 10,
      7,
      50
    );

    // right tree
    ctx.beginPath();
    ctx.arc(
      roadX + roadWidth + 40,
      y + 50,
      22,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillRect(
      roadX + roadWidth + 36,
      y + 60,
      7,
      55
    );
  }
}

// -------------------------
// CAR
// -------------------------

function drawCar() {
  ctx.save();

  const sx = shake > 0 ? rand(-shake, shake) : 0;
  const sy = shake > 0 ? rand(-shake, shake) : 0;

  ctx.translate(
    player.x + sx,
    player.y + sy
  );

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.55)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    35,
    36,
    12,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // wheels
  ctx.fillStyle = "#070707";

  roundedRect(-32, -30, 10, 26, 4);
  roundedRect(22, -30, 10, 26, 4);
  roundedRect(-32, 12, 10, 26, 4);
  roundedRect(22, 12, 10, 26, 4);

  // body
  const body = ctx.createLinearGradient(
    -30,
    0,
    30,
    0
  );

  body.addColorStop(0, "#650914");
  body.addColorStop(0.5, "#e32132");
  body.addColorStop(1, "#750b15");

  ctx.fillStyle = body;

  roundedRect(
    -26,
    -45,
    52,
    92,
    12
  );

  // hood
  ctx.fillStyle = "#b91526";

  roundedRect(
    -21,
    -42,
    42,
    25,
    8
  );

  // windshield
  const glass = ctx.createLinearGradient(
    0,
    -32,
    0,
    -5
  );

  glass.addColorStop(0, "#bde5f0");
  glass.addColorStop(1, "#17272c");

  ctx.fillStyle = glass;

  roundedRect(
    -19,
    -30,
    38,
    27,
    7
  );

  // windshield divider
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(0, -5);
  ctx.stroke();

  // rear window
  ctx.fillStyle = "#172326";

  roundedRect(
    -18,
    7,
    36,
    20,
    5
  );

  // headlights
  ctx.fillStyle = "#fff3bd";

  roundedRect(-18, -42, 10, 7, 3);
  roundedRect(8, -42, 10, 7, 3);

  // rear lights
  ctx.fillStyle = "#ff1825";

  roundedRect(-18, 38, 10, 6, 2);
  roundedRect(8, 38, 10, 6, 2);

  // bumper
  ctx.fillStyle = "#222";

  roundedRect(
    -23,
    44,
    46,
    6,
    3
  );

  ctx.restore();
}

// -------------------------
// ZOMBIE SPAWN
// -------------------------

function spawnZombie() {
  const roadWidth = Math.min(W * 0.92, 560);
  const roadX =
    (W - roadWidth) / 2 + 40;

  const laneWidth =
    (roadWidth - 80) / 3;

  const lane =
    Math.floor(Math.random() * 3);

  const x =
    roadX +
    laneWidth * lane +
    laneWidth / 2;

  zombies.push({
    x,
    y: -70,
    w: 42,
    h: 60,
    speed: rand(1.8, 3.2),
    hp: 2,
    maxHp: 2,
    walk: Math.random() * 10
  });
}

// -------------------------
// ZOMBIE
// -------------------------

function drawZombie(z) {
  ctx.save();

  ctx.translate(z.x, z.y);

  const movement =
    Math.sin(z.walk) * 5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.45)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    30,
    25,
    8,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // legs
  ctx.strokeStyle = "#26352a";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(-13, 35 + movement);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, 12);
  ctx.lineTo(13, 35 - movement);
  ctx.stroke();

  // arms
  ctx.strokeStyle = "#6f9158";

  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-28, 10 + movement);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.lineTo(28, 5 - movement);
  ctx.stroke();

  // body
  ctx.fillStyle = "#344936";

  roundedRect(
    -17,
    -11,
    34,
    34,
    8
  );

  // neck
  ctx.fillStyle = "#79975e";

  ctx.fillRect(
    -6,
    -21,
    12,
    12
  );

  // head
  ctx.beginPath();

  ctx.arc(
    0,
    -29,
    18,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // hair
  ctx.fillStyle = "#1c211c";

  ctx.beginPath();

  ctx.arc(
    0,
    -36,
    14,
    Math.PI,
    Math.PI * 2
  );

  ctx.fill();

  // eyes
  ctx.fillStyle = "#d9ff92";

  ctx.beginPath();

  ctx.arc(-6, -31, 3, 0, Math.PI * 2);
  ctx.arc(6, -31, 3, 0, Math.PI * 2);

  ctx.fill();

  // mouth
  ctx.fillStyle = "#211516";

  ctx.fillRect(
    -9,
    -20,
    18,
    6
  );

  // teeth
  ctx.fillStyle = "#f2f2e5";

  ctx.fillRect(-5, -20, 3, 3);
  ctx.fillRect(2, -20, 3, 3);

  // HP bar
  const barWidth = 48;

  ctx.fillStyle = "#111";

  ctx.fillRect(
    -barWidth / 2,
    -55,
    barWidth,
    6
  );

  ctx.fillStyle = "#28e15d";

  ctx.fillRect(
    -barWidth / 2,
    -55,
    barWidth * (z.hp / z.maxHp),
    6
  );

  ctx.restore();
}

// -------------------------
// FIRE
// -------------------------

function fire() {
  bullets.push({
    x: player.x,
    y: player.y - 50,
    speed: 13,
    radius: 4
  });

  // muzzle flash
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x + rand(-5, 5),
      y: player.y - 53,
      vx: rand(-2, 2),
      vy: rand(-5, -1),
      life: 12,
      color: "#ffd54f"
    });
  }
}

// -------------------------
// BLOOD EFFECT
// -------------------------

function bloodBurst(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: rand(-5, 5),
      vy: rand(-5, 5),
      life: rand(15, 32),
      color:
        Math.random() > 0.25
          ? "#c62828"
          : "#ff5252"
    });
  }

  damageFlash = 0.25;
  shake = 5;
}

// -------------------------
// COLLISION
// -------------------------

function collision(a, b) {
  return (
    Math.abs(a.x - b.x) <
      (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) <
      (a.h + b.h) / 2
  );
}

// -------------------------
// GAME OVER
// -------------------------

function endGame() {
  gameOver = true;

  const finalKills =
    document.getElementById("finalKills");

  if (finalKills) {
    finalKills.textContent = kills;
  }

  const screen =
    document.getElementById("gameover");

  if (screen) {
    screen.classList.remove("hidden");
  }
}

// -------------------------
// UPDATE
// -------------------------

function update(dt) {
  roadOffset += 7 * dt;

  distance += 0.15 * dt;

  // movement
  if (keys.left) {
    player.x -= player.speed * dt;
  }

  if (keys.right) {
    player.x += player.speed * dt;
  }

  // boundaries
  const roadWidth =
    Math.min(W * 0.92, 560);

  const minX =
    (W - roadWidth) / 2 + 35;

  const maxX =
    (W + roadWidth) / 2 - 35;

  player.x =
    Math.max(
      minX,
      Math.min(maxX, player.x)
    );

  // shooting
  player.cooldown -= dt;

  if (
    keys.fire &&
    player.cooldown <= 0
  ) {
    fire();

    player.cooldown = 8;
  }

  // spawn
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnZombie();

    spawnTimer =
      Math.max(
        14,
        42 - kills * 0.15
      );
  }

  // bullets
  bullets.forEach(b => {
    b.y -= b.speed * dt;
  });

  // zombies
  zombies.forEach(z => {
    z.y += z.speed * dt;
    z.walk += 0.15 * dt;
  });

  // collisions
  for (
    let i = zombies.length - 1;
    i >= 0;
    i--
  ) {
    const z = zombies[i];

    if (z.y > H + 80) {
      zombies.splice(i, 1);
      continue;
    }

    // zombie hits car
    if (
      collision(
        {
          x: player.x,
          y: player.y,
          w: player.w,
          h: player.h
        },
        z
      )
    ) {
      zombies.splice(i, 1);

      hp -= 18;

      bloodBurst(z.x, z.y);

      updateHUD();

      if (hp <= 0) {
        endGame();
      }

      continue;
    }

    // bullet hits zombie
    for (
      let j = bullets.length - 1;
      j >= 0;
      j--
    ) {
      const b = bullets[j];

      if (
        Math.abs(b.x - z.x) < 28 &&
        Math.abs(b.y - z.y) < 35
      ) {
        bullets.splice(j, 1);

        z.hp--;

        bloodBurst(
          b.x,
          b.y
        );

        if (z.hp <= 0) {
          zombies.splice(i, 1);

          kills++;
          coins += 5;
          score += 10;

          updateHUD();
        }

        break;
      }
    }
  }

  bullets =
    bullets.filter(
      b => b.y > -30
    );

  // particles
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vy += 0.08 * dt;

    p.life -= dt;
  });

  particles =
    particles.filter(
      p => p.life > 0
    );

  if (damageFlash > 0) {
    damageFlash -= 0.02 * dt;
  }

  if (shake > 0) {
    shake -= 0.4 * dt;
  }
}

// -------------------------
// DRAW
// -------------------------

function draw() {
  drawRoad();

  zombies.forEach(drawZombie);

  drawCar();

  // bullets
  bullets.forEach(b => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffd54f";

    ctx.fillStyle = "#fff6a0";

    ctx.beginPath();

    ctx.arc(
      b.x,
      b.y,
      b.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;
  });

  // particles
  particles.forEach(p => {
    ctx.globalAlpha =
      Math.max(0, p.life / 32);

    ctx.fillStyle =
      p.color || "#ff7043";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      rand(2, 5),
      0,
      Math.PI * 2
    );

    ctx.fill();
  });

  ctx.globalAlpha = 1;

  // damage flash
  if (damageFlash > 0) {
    const red =
      ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.2,
        W / 2,
        H / 2,
        H * 0.8
      );

    red.addColorStop(
      0,
      "rgba(255,0,0,0)"
    );

    red.addColorStop(
      1,
      `rgba(220,0,0,${damageFlash})`
    );

    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, H);
  }

  // vignette
  const vignette =
    ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.2,
      W / 2,
      H / 2,
      H * 0.85
    );

  vignette.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  vignette.addColorStop(
    1,
    "rgba(0,0,0,.6)"
  );

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

// -------------------------
// LOOP
// -------------------------

function loop(time) {
  const dt =
    Math.min(
      (time - lastTime) / 16.67,
      2
    );

  lastTime = time;

  if (!gameOver) {
    update(dt);
  }

  draw();

  requestAnimationFrame(loop);
}

// -------------------------
// START
// -------------------------

reset();
requestAnimationFrame(loop);
// -------------------------
// RESIZE
// -------------------------

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

// -------------------------
// HUD
// -------------------------

function updateHUD() {
  const hpElement = document.getElementById("hp");
  const coinsElement = document.getElementById("coins");
  const killsElement = document.getElementById("kills");

  if (hpElement) hpElement.textContent = Math.max(0, Math.round(hp));
  if (coinsElement) coinsElement.textContent = coins;
  if (killsElement) killsElement.textContent = kills;
}

// -------------------------
// RESET
// -------------------------

function reset() {
  player = {
    x: W / 2,
    y: H - 150,
    w: 54,
    h: 88,
    speed: 6,
    cooldown: 0
  };

  bullets = [];
  zombies = [];
  particles = [];

  coins = 0;
  kills = 0;
  score = 0;
  distance = 0;
  hp = 100;

  gameOver = false;
  spawnTimer = 20;
  roadOffset = 0;
  shake = 0;
  damageFlash = 0;

  lastTime = performance.now();

  const gameOverScreen = document.getElementById("gameover");
  if (gameOverScreen) {
    gameOverScreen.classList.add("hidden");
  }

  updateHUD();
}

// -------------------------
// CONTROLS
// -------------------------

function bindButton(id, key) {
  const button = document.getElementById(id);

  if (!button) return;

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
  });

  button.addEventListener("pointerup", e => {
    e.preventDefault();
    keys[key] = false;
  });

  button.addEventListener("pointercancel", () => {
    keys[key] = false;
  });

  button.addEventListener("pointerleave", () => {
    keys[key] = false;
  });
}

bindButton("left", "left");
bindButton("right", "right");
bindButton("fire", "fire");

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = true;
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = true;
  }

  if (e.code === "Space") {
    keys.fire = true;
  }
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    keys.left = false;
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    keys.right = false;
  }

  if (e.code === "Space") {
    keys.fire = false;
  }
});

const restartButton = document.getElementById("restart");

if (restartButton) {
  restartButton.onclick = reset;
}

// -------------------------
// HELPERS
// -------------------------

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// -------------------------
// ROAD
// -------------------------

function drawRoad() {
  // dark background
  const background = ctx.createLinearGradient(0, 0, 0, H);

  background.addColorStop(0, "#050809");
  background.addColorStop(0.5, "#172023");
  background.addColorStop(1, "#050708");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const roadWidth = Math.min(W * 0.92, 560);
  const roadX = (W - roadWidth) / 2;

  // road
  const road = ctx.createLinearGradient(0, 0, 0, H);

  road.addColorStop(0, "#4a4f51");
  road.addColorStop(0.5, "#292e30");
  road.addColorStop(1, "#15191a");

  ctx.fillStyle = road;
  ctx.fillRect(roadX, 0, roadWidth, H);

  // road edge
  ctx.fillStyle = "#8b8d8d";

  ctx.fillRect(roadX, 0, 5, H);
  ctx.fillRect(roadX + roadWidth - 5, 0, 5, H);

  // lane lines
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 4;
  ctx.setLineDash([40, 35]);
  ctx.lineDashOffset = -roadOffset;

  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();

  ctx.setLineDash([]);

  // road cracks
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#090909";
  ctx.lineWidth = 2;

  for (let i = 0; i < 12; i++) {
    const y = ((i * 180 + roadOffset * 1.2) % (H + 180)) - 90;
    const x = roadX + rand(30, roadWidth - 30);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-15, 15), y + 30);
    ctx.lineTo(x + rand(-20, 20), y + 55);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  drawRoadside(roadX, roadWidth);
}

// -------------------------
// ROADSIDE
// -------------------------

function drawRoadside(roadX, roadWidth) {
  for (let i = 0; i < 9; i++) {
    const y =
      ((i * 170 + roadOffset * 1.3) % (H + 220)) - 110;

    // left tree
    ctx.fillStyle = "#080c0d";

    ctx.beginPath();
    ctx.arc(roadX - 40, y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(
      roadX - 44,
      y + 10,
      7,
      50
    );

    // right tree
    ctx.beginPath();
    ctx.arc(
      roadX + roadWidth + 40,
      y + 50,
      22,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillRect(
      roadX + roadWidth + 36,
      y + 60,
      7,
      55
    );
  }
}

// -------------------------
// CAR
// -------------------------

function drawCar() {
  ctx.save();

  const sx = shake > 0 ? rand(-shake, shake) : 0;
  const sy = shake > 0 ? rand(-shake, shake) : 0;

  ctx.translate(
    player.x + sx,
    player.y + sy
  );

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.55)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    35,
    36,
    12,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // wheels
  ctx.fillStyle = "#070707";

  roundedRect(-32, -30, 10, 26, 4);
  roundedRect(22, -30, 10, 26, 4);
  roundedRect(-32, 12, 10, 26, 4);
  roundedRect(22, 12, 10, 26, 4);

  // body
  const body = ctx.createLinearGradient(
    -30,
    0,
    30,
    0
  );

  body.addColorStop(0, "#650914");
  body.addColorStop(0.5, "#e32132");
  body.addColorStop(1, "#750b15");

  ctx.fillStyle = body;

  roundedRect(
    -26,
    -45,
    52,
    92,
    12
  );

  // hood
  ctx.fillStyle = "#b91526";

  roundedRect(
    -21,
    -42,
    42,
    25,
    8
  );

  // windshield
  const glass = ctx.createLinearGradient(
    0,
    -32,
    0,
    -5
  );

  glass.addColorStop(0, "#bde5f0");
  glass.addColorStop(1, "#17272c");

  ctx.fillStyle = glass;

  roundedRect(
    -19,
    -30,
    38,
    27,
    7
  );

  // windshield divider
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(0, -5);
  ctx.stroke();

  // rear window
  ctx.fillStyle = "#172326";

  roundedRect(
    -18,
    7,
    36,
    20,
    5
  );

  // headlights
  ctx.fillStyle = "#fff3bd";

  roundedRect(-18, -42, 10, 7, 3);
  roundedRect(8, -42, 10, 7, 3);

  // rear lights
  ctx.fillStyle = "#ff1825";

  roundedRect(-18, 38, 10, 6, 2);
  roundedRect(8, 38, 10, 6, 2);

  // bumper
  ctx.fillStyle = "#222";

  roundedRect(
    -23,
    44,
    46,
    6,
    3
  );

  ctx.restore();
}

// -------------------------
// ZOMBIE SPAWN
// -------------------------

function spawnZombie() {
  const roadWidth = Math.min(W * 0.92, 560);
  const roadX =
    (W - roadWidth) / 2 + 40;

  const laneWidth =
    (roadWidth - 80) / 3;

  const lane =
    Math.floor(Math.random() * 3);

  const x =
    roadX +
    laneWidth * lane +
    laneWidth / 2;

  zombies.push({
    x,
    y: -70,
    w: 42,
    h: 60,
    speed: rand(1.8, 3.2),
    hp: 2,
    maxHp: 2,
    walk: Math.random() * 10
  });
}

// -------------------------
// ZOMBIE
// -------------------------

function drawZombie(z) {
  ctx.save();

  ctx.translate(z.x, z.y);

  const movement =
    Math.sin(z.walk) * 5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.45)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    30,
    25,
    8,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // legs
  ctx.strokeStyle = "#26352a";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(-13, 35 + movement);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, 12);
  ctx.lineTo(13, 35 - movement);
  ctx.stroke();

  // arms
  ctx.strokeStyle = "#6f9158";

  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-28, 10 + movement);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.lineTo(28, 5 - movement);
  ctx.stroke();

  // body
  ctx.fillStyle = "#344936";

  roundedRect(
    -17,
    -11,
    34,
    34,
    8
  );

  // neck
  ctx.fillStyle = "#79975e";

  ctx.fillRect(
    -6,
    -21,
    12,
    12
  );

  // head
  ctx.beginPath();

  ctx.arc(
    0,
    -29,
    18,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // hair
  ctx.fillStyle = "#1c211c";

  ctx.beginPath();

  ctx.arc(
    0,
    -36,
    14,
    Math.PI,
    Math.PI * 2
  );

  ctx.fill();

  // eyes
  ctx.fillStyle = "#d9ff92";

  ctx.beginPath();

  ctx.arc(-6, -31, 3, 0, Math.PI * 2);
  ctx.arc(6, -31, 3, 0, Math.PI * 2);

  ctx.fill();

  // mouth
  ctx.fillStyle = "#211516";

  ctx.fillRect(
    -9,
    -20,
    18,
    6
  );

  // teeth
  ctx.fillStyle = "#f2f2e5";

  ctx.fillRect(-5, -20, 3, 3);
  ctx.fillRect(2, -20, 3, 3);

  // HP bar
  const barWidth = 48;

  ctx.fillStyle = "#111";

  ctx.fillRect(
    -barWidth / 2,
    -55,
    barWidth,
    6
  );

  ctx.fillStyle = "#28e15d";

  ctx.fillRect(
    -barWidth / 2,
    -55,
    barWidth * (z.hp / z.maxHp),
    6
  );

  ctx.restore();
}

// -------------------------
// FIRE
// -------------------------

function fire() {
  bullets.push({
    x: player.x,
    y: player.y - 50,
    speed: 13,
    radius: 4
  });

  // muzzle flash
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x + rand(-5, 5),
      y: player.y - 53,
      vx: rand(-2, 2),
      vy: rand(-5, -1),
      life: 12,
      color: "#ffd54f"
    });
  }
}

// -------------------------
// BLOOD EFFECT
// -------------------------

function bloodBurst(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: rand(-5, 5),
      vy: rand(-5, 5),
      life: rand(15, 32),
      color:
        Math.random() > 0.25
          ? "#c62828"
          : "#ff5252"
    });
  }

  damageFlash = 0.25;
  shake = 5;
}

// -------------------------
// COLLISION
// -------------------------

function collision(a, b) {
  return (
    Math.abs(a.x - b.x) <
      (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) <
      (a.h + b.h) / 2
  );
}

// -------------------------
// GAME OVER
// -------------------------

function endGame() {
  gameOver = true;

  const finalKills =
    document.getElementById("finalKills");

  if (finalKills) {
    finalKills.textContent = kills;
  }

  const screen =
    document.getElementById("gameover");

  if (screen) {
    screen.classList.remove("hidden");
  }
}

// -------------------------
// UPDATE
// -------------------------

function update(dt) {
  roadOffset += 7 * dt;

  distance += 0.15 * dt;

  // movement
  if (keys.left) {
    player.x -= player.speed * dt;
  }

  if (keys.right) {
    player.x += player.speed * dt;
  }

  // boundaries
  const roadWidth =
    Math.min(W * 0.92, 560);

  const minX =
    (W - roadWidth) / 2 + 35;

  const maxX =
    (W + roadWidth) / 2 - 35;

  player.x =
    Math.max(
      minX,
      Math.min(maxX, player.x)
    );

  // shooting
  player.cooldown -= dt;

  if (
    keys.fire &&
    player.cooldown <= 0
  ) {
    fire();

    player.cooldown = 8;
  }

  // spawn
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnZombie();

    spawnTimer =
      Math.max(
        14,
        42 - kills * 0.15
      );
  }

  // bullets
  bullets.forEach(b => {
    b.y -= b.speed * dt;
  });

  // zombies
  zombies.forEach(z => {
    z.y += z.speed * dt;
    z.walk += 0.15 * dt;
  });

  // collisions
  for (
    let i = zombies.length - 1;
    i >= 0;
    i--
  ) {
    const z = zombies[i];

    if (z.y > H + 80) {
      zombies.splice(i, 1);
      continue;
    }

    // zombie hits car
    if (
      collision(
        {
          x: player.x,
          y: player.y,
          w: player.w,
          h: player.h
        },
        z
      )
    ) {
      zombies.splice(i, 1);

      hp -= 18;

      bloodBurst(z.x, z.y);

      updateHUD();

      if (hp <= 0) {
        endGame();
      }

      continue;
    }

    // bullet hits zombie
    for (
      let j = bullets.length - 1;
      j >= 0;
      j--
    ) {
      const b = bullets[j];

      if (
        Math.abs(b.x - z.x) < 28 &&
        Math.abs(b.y - z.y) < 35
      ) {
        bullets.splice(j, 1);

        z.hp--;

        bloodBurst(
          b.x,
          b.y
        );

        if (z.hp <= 0) {
          zombies.splice(i, 1);

          kills++;
          coins += 5;
          score += 10;

          updateHUD();
        }

        break;
      }
    }
  }

  bullets =
    bullets.filter(
      b => b.y > -30
    );

  // particles
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vy += 0.08 * dt;

    p.life -= dt;
  });

  particles =
    particles.filter(
      p => p.life > 0
    );

  if (damageFlash > 0) {
    damageFlash -= 0.02 * dt;
  }

  if (shake > 0) {
    shake -= 0.4 * dt;
  }
}

// -------------------------
// DRAW
// -------------------------

function draw() {
  drawRoad();

  zombies.forEach(drawZombie);

  drawCar();

  // bullets
  bullets.forEach(b => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffd54f";

    ctx.fillStyle = "#fff6a0";

    ctx.beginPath();

    ctx.arc(
      b.x,
      b.y,
      b.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;
  });

  // particles
  particles.forEach(p => {
    ctx.globalAlpha =
      Math.max(0, p.life / 32);

    ctx.fillStyle =
      p.color || "#ff7043";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      rand(2, 5),
      0,
      Math.PI * 2
    );

    ctx.fill();
  });

  ctx.globalAlpha = 1;

  // damage flash
  if (damageFlash > 0) {
    const red =
      ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.2,
        W / 2,
        H / 2,
        H * 0.8
      );

    red.addColorStop(
      0,
      "rgba(255,0,0,0)"
    );

    red.addColorStop(
      1,
      `rgba(220,0,0,${damageFlash})`
    );

    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, H);
  }

  // vignette
  const vignette =
    ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.2,
      W / 2,
      H / 2,
      H * 0.85
    );

  vignette.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  vignette.addColorStop(
    1,
    "rgba(0,0,0,.6)"
  );

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

// -------------------------
// LOOP
// -------------------------

function loop(time) {
  const dt =
    Math.min(
      (time - lastTime) / 16.67,
      2
    );

  lastTime = time;

  if (!gameOver) {
    update(dt);
  }

  draw();

  requestAnimationFrame(loop);
}

// -------------------------
// START
// -------------------------

reset();
requestAnimationFrame(loop);
