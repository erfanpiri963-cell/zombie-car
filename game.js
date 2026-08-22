const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W, H, dpr;
let player;
let bullets = [];
let zombies = [];
let particles = [];
let coins = [];
let keys = {};
let kills = 0;
let coinCount = 0;
let hp = 100;
let score = 0;
let gameOver = false;
let spawnTimer = 0;
let last = performance.now();
let roadOffset = 0;

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

function reset() {
  player = {
    x: W / 2,
    y: H - 180,
    w: 58,
    h: 92,
    speed: 6,
    fire: 0
  };

  bullets = [];
  zombies = [];
  particles = [];
  coins = [];

  kills = 0;
  coinCount = 0;
  hp = 100;
  score = 0;
  gameOver = false;
  spawnTimer = 20;
  roadOffset = 0;

  keys = {
    l: false,
    r: false,
    f: false
  };

  const gameover = document.getElementById("gameover");
  if (gameover) gameover.classList.add("hidden");

  updateHud();
}

function updateHud() {
  hp = Math.max(0, Math.round(hp));

  const hpEl = document.getElementById("hp");
  const coinsEl = document.getElementById("coins");
  const killsEl = document.getElementById("kills");

  if (hpEl) hpEl.textContent = hp;
  if (coinsEl) coinsEl.textContent = coinCount;
  if (killsEl) killsEl.textContent = kills;
}

function bind(id, key) {
  const b = document.getElementById(id);
  if (!b) return;

  b.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(event => {
    b.addEventListener(event, () => {
      keys[key] = false;
    });
  });
}

bind("left", "l");
bind("right", "r");
bind("fire", "f");

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") keys.l = true;
  if (e.key === "ArrowRight") keys.r = true;
  if (e.code === "Space") keys.f = true;
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") keys.l = false;
  if (e.key === "ArrowRight") keys.r = false;
  if (e.code === "Space") keys.f = false;
});

const restart = document.getElementById("restart");
if (restart) restart.onclick = reset;

function roundRect(x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/* =========================
   ROAD
========================= */

function drawRoad() {
  // محیط اطراف جاده
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#10151a");
  bg.addColorStop(1, "#05080a");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const rw = Math.min(W * 0.92, 560);
  const rx = (W - rw) / 2;

  // جاده
  const road = ctx.createLinearGradient(0, 0, 0, H);
  road.addColorStop(0, "#596066");
  road.addColorStop(0.5, "#30363b");
  road.addColorStop(1, "#171c20");

  ctx.fillStyle = road;
  ctx.fillRect(rx, 0, rw, H);

  // حاشیه جاده
  ctx.fillStyle = "#b7b7b7";
  ctx.fillRect(rx, 0, 5, H);
  ctx.fillRect(rx + rw - 5, 0, 5, H);

  // سایه کناره‌ها
  const shade = ctx.createLinearGradient(rx, 0, rx + rw, 0);
  shade.addColorStop(0, "rgba(0,0,0,.45)");
  shade.addColorStop(.15, "rgba(0,0,0,0)");
  shade.addColorStop(.85, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.45)");

  ctx.fillStyle = shade;
  ctx.fillRect(rx, 0, rw, H);

  // خط وسط متحرک
  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 6;
  ctx.setLineDash([55, 45]);
  ctx.lineDashOffset = roadOffset;

  ctx.beginPath();
  ctx.moveTo(W / 2, -100);
  ctx.lineTo(W / 2, H + 100);
  ctx.stroke();

  ctx.setLineDash([]);

  // ترک‌های جاده
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 3;

  for (let i = 0; i < 7; i++) {
    const y = ((i * 190 + roadOffset * 1.5) % (H + 220)) - 100;

    ctx.beginPath();
    ctx.moveTo(rx + 25, y);
    ctx.lineTo(rx + 65, y + 40);
    ctx.lineTo(rx + 45, y + 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx + rw - 30, y + 60);
    ctx.lineTo(rx + rw - 70, y + 100);
    ctx.stroke();
  }
}

/* =========================
   PLAYER CAR
========================= */

function drawCar() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // سایه
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.beginPath();
  ctx.ellipse(0, 45, 34, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // چراغ‌ها
  ctx.fillStyle = "#fff4b0";
  roundRect(-20, -45, 14, 8, 3);
  roundRect(6, -45, 14, 8, 3);

  // بدنه
  const carGradient = ctx.createLinearGradient(-30, 0, 30, 0);
  carGradient.addColorStop(0, "#8b0014");
  carGradient.addColorStop(.5, "#f02038");
  carGradient.addColorStop(1, "#870014");

  ctx.fillStyle = carGradient;
  roundRect(-29, -42, 58, 88, 13);

  // شیشه جلو
  const glass = ctx.createLinearGradient(0, -38, 0, -5);
  glass.addColorStop(0, "#bfe7f2");
  glass.addColorStop(1, "#263a45");

  ctx.fillStyle = glass;
  roundRect(-21, -32, 42, 31, 8);

  // خط وسط شیشه
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillRect(-2, -31, 4, 29);

  // شیشه عقب
  ctx.fillStyle = "#14252d";
  roundRect(-20, 7, 40, 22, 6);

  // چرخ‌ها
  ctx.fillStyle = "#090909";
  roundRect(-34, -24, 9, 25, 4);
  roundRect(25, -24, 9, 25, 4);
  roundRect(-34, 18, 9, 25, 4);
  roundRect(25, 18, 9, 25, 4);

  // چراغ عقب
  ctx.fillStyle = "#ff2638";
  roundRect(-20, 35, 12, 6, 3);
  roundRect(8, 35, 12, 6, 3);

  ctx.restore();
}

/* =========================
   ZOMBIES
========================= */

function spawn() {
  const rw = Math.min(W * 0.92, 560);
  const rx = (W - rw) / 2 + 55;
  const maxX = rx + rw - 55;

  let x;
  let tries = 0;

  do {
    x = rx + Math.random() * (maxX - rx);
    tries++;
  } while (
    zombies.some(z => Math.abs(z.x - x) < 65 && z.y < 180) &&
    tries < 20
  );

  zombies.push({
    x,
    y: -70,
    w: 45,
    h: 65,
    spd: 2.0 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    health: 1
  });
}

function drawZombie(z) {
  ctx.save();

  const wobble = Math.sin(performance.now() / 220 + z.phase) * 3;
  ctx.translate(z.x + wobble, z.y);

  // سایه
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, 31, 25, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // پاها
  ctx.fillStyle = "#17281b";
  roundRect(-16, 18, 12, 31, 7);
  roundRect(4, 18, 12, 31, 7);

  // بدن
  const body = ctx.createLinearGradient(-20, -10, 20, 30);
  body.addColorStop(0, "#527b4d");
  body.addColorStop(1, "#243d29");

  ctx.fillStyle = body;
  roundRect(-20, -4, 40, 43, 10);

  // دست‌ها
  ctx.strokeStyle = "#6f9b58";
  ctx.lineWidth = 13;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-17, 5);
  ctx.lineTo(-32, 23);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(17, 5);
  ctx.lineTo(32, 18);
  ctx.stroke();

  // سر
  ctx.fillStyle = "#6d9655";
  ctx.beginPath();
  ctx.arc(0, -18, 20, 0, Math.PI * 2);
  ctx.fill();

  // چشم‌ها
  ctx.fillStyle = "#d7ff71";
  ctx.beginPath();
  ctx.arc(-7, -20, 4, 0, Math.PI * 2);
  ctx.arc(7, -20, 4, 0, Math.PI * 2);
  ctx.fill();

  // دهان
  ctx.fillStyle = "#151515";
  roundRect(-11, -7, 22, 9, 3);

  ctx.fillStyle = "#eee";
  ctx.fillRect(-7, -7, 5, 5);
  ctx.fillRect(3, -7, 5, 5);

  ctx.restore();
}

/* =========================
   BULLETS
========================= */

function fire() {
  bullets.push({
    x: player.x,
    y: player.y - 48,
    spd: 14,
    r: 5,
    life: 100
  });

  // نور شلیک
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: player.x + (Math.random() - .5) * 8,
      y: player.y - 50,
      vx: (Math.random() - .5) * 3,
      vy: -Math.random() * 3,
      life: 15,
      size: 3,
      type: "muzzle"
    });
  }
}

function drawBullet(b) {
  const glow = ctx.createRadialGradient(
    b.x, b.y, 1,
    b.x, b.y, 14
  );

  glow.addColorStop(0, "#fff");
  glow.addColorStop(.3, "#ffe45c");
  glow.addColorStop(1, "rgba(255,120,0,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd740";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
}

/* =========================
   EFFECTS
========================= */

function burst(x, y) {
  for (let i = 0; i < 22; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - .5) * 8,
      vy: (Math.random() - .5) * 8,
      life: 30 + Math.random() * 20,
      size: 3 + Math.random() * 5,
      type: Math.random() > .35 ? "blood" : "spark"
    });
  }
}

function updateParticles(dt) {
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vy += .08 * dt;
    p.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 45);

    if (p.type === "blood") {
      ctx.fillStyle = "#b30018";
    } else if (p.type === "spark") {
      ctx.fillStyle = "#ffca28";
    } else {
      ctx.fillStyle = "#fff59d";
    }

    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  ctx.globalAlpha = 1;
}

function createCoin(x, y) {
  coins.push({
    x,
    y,
    r: 10,
    spin: Math.random() * 6
  });
}

function drawCoins() {
  coins.forEach(c => {
    const scale = Math.abs(Math.cos(c.spin));

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(Math.max(.15, scale), 1);

    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fff1a8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#a66b00";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", 0, 4);

    ctx.restore();

    c.spin += .12;
    c.y += 2;
  });

  coins = coins.filter(c => c.y < H + 30);
}

/* =========================
   COLLISION
========================= */

function hit(a, b) {
  return (
    Math.abs(a.x - b.x) <
    (a.w + b.w) / 2
    &&
    Math.abs(a.y - b.y) <
    (a.h + b.h) / 2
  );
}

/* =========================
   GAME OVER
========================= */

function endGame() {
  gameOver = true;

  const finalKills = document.getElementById("finalKills");

  if (finalKills) {
    finalKills.textContent = kills;
  }

  const gameover = document.getElementById("gameover");

  if (gameover) {
    gameover.classList.remove("hidden");
  }
}

/* =========================
   MAIN LOOP
========================= */

function loop(t) {
  const dt = Math.min((t - last) / 16.67, 2);
  last = t;

  if (!gameOver) {

    // حرکت جاده
    roadOffset += 7 * dt;

    // حرکت ماشین
    if (keys.l) player.x -= player.speed * dt;
    if (keys.r) player.x += player.speed * dt;

    const rw = Math.min(W * .92, 560);
    const minX = (W - rw) / 2 + 40;
    const maxX = (W + rw) / 2 - 40;

    player.x = Math.max(
      minX,
      Math.min(maxX, player.x)
    );

    // شلیک
    player.fire -= dt;

    if (keys.f && player.fire <= 0) {
      fire();
      player.fire = 8;
    }

    // تولید زامبی
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
      spawn();

      spawnTimer = Math.max(
        22,
        55 - kills * .35
      );
    }

    // گلوله‌ها
    bullets.forEach(b => {
      b.y -= b.spd * dt;
      b.life -= dt;
    });

    // زامبی‌ها
    zombies.forEach(z => {
      z.y += z.spd * dt;
    });

    // برخوردها
    for (let i = zombies.length - 1; i >= 0; i--) {

      const z = zombies[i];

      // خروج از صفحه
      if (z.y > H + 80) {
        zombies.splice(i, 1);
        continue;
      }

      // برخورد با ماشین
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

      // برخورد گلوله
      for (let j = bullets.length - 1; j >= 0; j--) {

        const b = bullets[j];

        if (
          Math.abs(b.x - z.x) < 30 &&
          Math.abs(b.y - z.y) < 40
        ) {
          bullets.splice(j, 1);
          zombies.splice(i, 1);

          kills++;
          coinCount += 5;
          score += 10;

          burst(z.x, z.y);
          createCoin(z.x, z.y);

          updateHud();

          break;
        }
      }
    }

    bullets = bullets.filter(
      b => b.y > -30 && b.life > 0
    );

    updateParticles(dt);
    drawCoins();
  }

  // رسم
  drawRoad();

  zombies.forEach(drawZombie);

  drawCoins();

  bullets.forEach(drawBullet);

  drawCar();

  drawParticles();

  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
