const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W, H, dpr;
let player, bullets, zombies, particles;
let coins, kills, hp, score;
let gameOver, keys, spawnTimer, last;
let roadOffset = 0;
let bloodFlash = 0;
let shake = 0;

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
// RESET
// -------------------------

function reset() {
  player = {
    x: W / 2,
    y: H - 145,
    w: 52,
    h: 86,
    speed: 6,
    fire: 0
  };

  bullets = [];
  zombies = [];
  particles = [];

  coins = 0;
  kills = 0;
  hp = 100;
  score = 0;

  gameOver = false;
  bloodFlash = 0;
  shake = 0;

  keys = {
    l: false,
    r: false,
    f: false
  };

  spawnTimer = 0;
  roadOffset = 0;
  last = performance.now();

  const gameover = document.getElementById("gameover");
  if (gameover) gameover.classList.add("hidden");

  updateHud();
}

// -------------------------
// HUD
// -------------------------

function updateHud() {
  hp = Math.max(0, Math.round(hp));

  const hpEl = document.getElementById("hp");
  const coinsEl = document.getElementById("coins");
  const killsEl = document.getElementById("kills");

  if (hpEl) hpEl.textContent = hp;
  if (coinsEl) coinsEl.textContent = coins;
  if (killsEl) killsEl.textContent = kills;
}

// -------------------------
// CONTROLS
// -------------------------

function bind(id, key) {
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

bind("left", "l");
bind("right", "r");
bind("fire", "f");

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.l = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.r = true;
  if (e.code === "Space") keys.f = true;
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.l = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.r = false;
  if (e.code === "Space") keys.f = false;
});

const restart = document.getElementById("restart");
if (restart) restart.onclick = reset;

// -------------------------
// HELPERS
// -------------------------

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// -------------------------
// ROAD
// -------------------------

function drawRoad() {

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#090d10");
  bg.addColorStop(0.5, "#20282b");
  bg.addColorStop(1, "#080b0d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // road dimensions
  const roadW = Math.min(W * 0.92, 560);
  const roadX = (W - roadW) / 2;

  // road
  const roadGradient = ctx.createLinearGradient(0, 0, 0, H);
  roadGradient.addColorStop(0, "#343b3e");
  roadGradient.addColorStop(0.5, "#202628");
  roadGradient.addColorStop(1, "#111719");

  ctx.fillStyle = roadGradient;
  ctx.fillRect(roadX, 0, roadW, H);

  // road shoulders
  ctx.fillStyle = "#6b6f70";
  ctx.fillRect(roadX, 0, 6, H);
  ctx.fillRect(roadX + roadW - 6, 0, 6, H);

  // dirty road marks
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#000";

  for (let i = 0; i < 25; i++) {
    const x = roadX + random(15, roadW - 15);
    const y = random(0, H);

    ctx.fillRect(x, y, random(2, 7), random(20, 80));
  }

  ctx.globalAlpha = 1;

  // center lane
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 5;
  ctx.setLineDash([42, 38]);
  ctx.lineDashOffset = -roadOffset;

  ctx.beginPath();
  ctx.moveTo(W / 2, -50);
  ctx.lineTo(W / 2, H + 50);
  ctx.stroke();

  ctx.setLineDash([]);

  // side lane markings
  ctx.strokeStyle = "#d9d9d9";
  ctx.lineWidth = 3;

  ctx.setLineDash([25, 30]);
  ctx.lineDashOffset = -roadOffset * 0.8;

  ctx.beginPath();
  ctx.moveTo(roadX + roadW / 3, 0);
  ctx.lineTo(roadX + roadW / 3, H);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(roadX + roadW * 2 / 3, 0);
  ctx.lineTo(roadX + roadW * 2 / 3, H);
  ctx.stroke();

  ctx.setLineDash([]);

  // roadside silhouettes
  drawRoadside(roadX, roadW);
}

// -------------------------
// ROADSIDE
// -------------------------

function drawRoadside(roadX, roadW) {

  ctx.fillStyle = "#0b1113";

  for (let i = 0; i < 8; i++) {

    const y = ((i * 170 + roadOffset * 1.3) % (H + 200)) - 100;

    // left tree
    ctx.beginPath();
    ctx.arc(roadX - 35, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(roadX - 38, y + 10, 6, 35);

    // right tree
    ctx.beginPath();
    ctx.arc(roadX + roadW + 35, y + 60, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(roadX + roadW + 32, y + 70, 6, 35);
  }
}

// -------------------------
// CAR
// -------------------------

function drawCar() {

  ctx.save();

  // shake
  const sx = shake > 0 ? random(-shake, shake) : 0;
  const sy = shake > 0 ? random(-shake, shake) : 0;

  ctx.translate(player.x + sx, player.y + sy);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // wheels
  ctx.fillStyle = "#080909";

  roundedRect(-31, -30, 9, 25, 4);
  roundedRect(22, -30, 9, 25, 4);
  roundedRect(-31, 10, 9, 25, 4);
  roundedRect(22, 10, 9, 25, 4);

  // car body
  const carGradient = ctx.createLinearGradient(-25, 0, 25, 0);
  carGradient.addColorStop(0, "#9b111e");
  carGradient.addColorStop(0.5, "#e52b38");
  carGradient.addColorStop(1, "#7c0b14");

  ctx.fillStyle = carGradient;
  roundedRect(-25, -43, 50, 88, 12);

  // hood
  ctx.fillStyle = "#b91c28";
  roundedRect(-20, -40, 40, 25, 8);

  // windshield
  const glass = ctx.createLinearGradient(0, -35, 0, -5);
  glass.addColorStop(0, "#a9d7e8");
  glass.addColorStop(1, "#24383f");

  ctx.fillStyle = glass;
  roundedRect(-18, -28, 36, 25, 7);

  // windshield line
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.lineTo(0, -5);
  ctx.stroke();

  // rear window
  ctx.fillStyle = "#17252b";
  roundedRect(-18, 6, 36, 18, 5);

  // headlights
  ctx.fillStyle = "#fff4bd";
  roundedRect(-18, -41, 10, 7, 3);
  roundedRect(8, -41, 10, 7, 3);

  // red lights
  ctx.fillStyle = "#ff1d25";
  roundedRect(-18, 37, 10, 5, 2);
  roundedRect(8, 37, 10, 5, 2);

  // bumper
  ctx.fillStyle = "#252525";
  roundedRect(-22, 43, 44, 5, 3);

  ctx.restore();
}

// -------------------------
// ZOMBIE SPAWN
// -------------------------

function spawn() {

  const roadW = Math.min(W * 0.92, 560);
  const roadX = (W - roadW) / 2 + 35;

  const lane = Math.floor(Math.random() * 3);

  const laneW = (roadW - 70) / 3;

  const x =
    roadX +
    laneW * lane +
    laneW / 2;

  zombies.push({
    x,
    y: -60,
    w: 42,
    h: 58,
    spd: random(1.8, 3.4) + kills * 0.008,
    hp: 2,
    maxHp: 2,
    walk: Math.random() * Math.PI * 2
  });
}

// -------------------------
// ZOMBIE
// -------------------------

function drawZombie(z) {

  ctx.save();
  ctx.translate(z.x, z.y);

  const swing = Math.sin(z.walk) * 5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, 25, 25, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.strokeStyle = "#1b261e";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-7, 15);
  ctx.lineTo(-12, 35 + swing);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, 15);
  ctx.lineTo(13, 35 - swing);
  ctx.stroke();

  // arms
  ctx.strokeStyle = "#6b8f54";
  ctx.lineWidth = 8;

  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-28, 8 + swing);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, -5);
  ctx.lineTo(28, 3 - swing);
  ctx.stroke();

  // body
  ctx.fillStyle = "#354b38";
  roundedRect(-17, -10, 34, 32, 8);

  // neck
  ctx.fillStyle = "#75955c";
  ctx.fillRect(-6, -20, 12, 12);

  // head
  ctx.fillStyle = "#7f9f64";

  ctx.beginPath();
  ctx.arc(0, -28, 17, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = "#20231f";

  ctx.beginPath();
  ctx.arc(0, -36, 14, Math.PI, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#dfff9b";
  ctx.beginPath();
  ctx.arc(-6, -30, 3, 0, Math.PI * 2);
  ctx.arc(6, -30, 3, 0, Math.PI * 2);
  ctx.fill();

  // mouth
  ctx.fillStyle = "#241516";
  ctx.fillRect(-8, -20, 16, 5);

  // teeth
  ctx.fillStyle = "#eee";
  ctx.fillRect(-5, -20, 3, 3);
  ctx.fillRect(2, -20, 3, 3);

  // HP BAR
  const barW = 46;
  const barH = 5;

  ctx.fillStyle = "#111";
  ctx.fillRect(-barW / 2, -52, barW, barH);

  ctx.fillStyle = "#22e05a";
  ctx.fillRect(
    -barW / 2,
    -52,
    barW * (z.hp / z.maxHp),
    barH
  );

  ctx.restore();
}

// -------------------------
// BULLET
// -------------------------

function fire() {

  bullets.push({
    x: player.x,
    y: player.y - 48,
    spd: 13,
    r: 4
  });

  // muzzle flash
  for (let i = 0; i < 5; i++) {

    particles.push({
      x: player.x + random(-4, 4),
      y: player.y - 50,
      vx: random(-2, 2),
      vy: random(-4, -1),
      life: 10,
      color: "#ffd54f"
    });
  }
}

// -------------------------
// COLLISION
// -------------------------

function hit(a, b) {

  return (
    Math.abs(a.x - b.x) <
    (a.w + b.w) / 2
    &&
    Math.abs(a.y - b.y) <
    (a.h + b.h) / 2
  );
}

// -------------------------
// BLOOD / PARTICLES
// -------------------------

function burst(x, y) {

  for (let i = 0; i < 18; i++) {

    particles.push({
      x,
      y,
      vx: random(-5, 5),
      vy: random(-5, 5),
      life: random(15, 30),
      color: Math.random() > 0.25
        ? "#c62828"
        : "#ff5252"
    });
  }

  bloodFlash = 0.25;
  shake = 5;
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

  const gameover =
    document.getElementById("gameover");

  if (gameover) {
    gameover.classList.remove("hidden");
  }
}

// -------------------------
// GAME UPDATE
// -------------------------

function update(dt) {

  roadOffset += 7 * dt;

  // movement
  if (keys.l) {
    player.x -= player.speed * dt;
  }

  if (keys.r) {
    player.x += player.speed * dt;
  }

  // road boundaries
  const roadW = Math.min(W * 0.92, 560);

  const minX =
    (W - roadW) / 2 + 35;

  const maxX =
    (W + roadW) / 2 - 35;

  player.x =
    Math.max(
      minX,
      Math.min(maxX, player.x)
    );

  // shooting
  player.fire -= dt;

  if (keys.f && player.fire <= 0) {

    fire();

    player.fire = 8;
  }

  // spawn
  spawnTimer -= dt;

  if (spawnTimer <= 0) {

    spawn();

    spawnTimer =
      Math.max(
        15,
        42 - kills * 0.15
      );
  }

  // bullets
  bullets.forEach(b => {
    b.y -= b.spd * dt;
  });

  // zombies
  zombies.forEach(z => {

    z.y += z.spd * dt;

    z.walk += 0.15 * dt;
  });

  // collision
  for (
    let i = zombies.length - 1;
    i >= 0;
    i--
  ) {

    const z = zombies[i];

    // escaped
    if (z.y > H + 80) {
      zombies.splice(i, 1);
      continue;
    }

    // hit player
    if (
      hit(
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

      burst(z.x, z.y);

      updateHud();

      if (hp <= 0) {
        endGame();
      }

      continue;
    }

    // bullets
    for (
      let j = bullets.length - 1;
      j >= 0;
      j--
    ) {

      const b = bullets[j];

      if (
        Math.abs(b.x - z.x) < 27 &&
        Math.abs(b.y - z.y) < 35
      ) {

        bullets.splice(j, 1);

        z.hp--;

        burst(
          b.x,
          b.y
        );

        if (z.hp <= 0) {

          zombies.splice(i, 1);

          kills++;
          coins += 5;
          score += 10;

          updateHud();
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

  if (bloodFlash > 0) {
    bloodFlash -= 0.02 * dt;
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

  // zombies
  zombies.forEach(drawZombie);

  // car
  drawCar();

  // bullets
  bullets.forEach(b => {

    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffd54f";

    ctx.fillStyle = "#fff59d";

    ctx.beginPath();
    ctx.arc(
      b.x,
      b.y,
      b.r,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;
  });

  // particles
  particles.forEach(p => {

    ctx.globalAlpha =
      Math.max(0, p.life / 30);

    ctx.fillStyle =
      p.color || "#ff7043";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      random(2, 5),
      0,
      Math.PI * 2
    );

    ctx.fill();
  });

  ctx.globalAlpha = 1;

  // red damage effect
  if (bloodFlash > 0) {

    const gradient =
      ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.2,
        W / 2,
        H / 2,
        H * 0.8
      );

    gradient.addColorStop(
      0,
      "rgba(180,0,0,0)"
    );

    gradient.addColorStop(
      1,
      `rgba(220,0,0,${bloodFlash})`
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  // dark cinematic edges
  const vignette =
    ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.25,
      W / 2,
      H / 2,
      H * 0.8
    );

  vignette.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  vignette.addColorStop(
    1,
    "rgba(0,0,0,.55)"
  );

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

// -------------------------
// MAIN LOOP
// -------------------------

function loop(t) {

  const dt =
    Math.min(
      (t - last) / 16.67,
      2
    );

  last = t;

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
