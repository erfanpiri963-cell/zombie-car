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
let coins = 0;
let kills = 0;
let hp = 100;
let score = 0;
let gameOver = false;
let keys = {};
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
    h: 95,
    speed: 7,
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

function updateHud() {
  const hpEl = document.getElementById("hp");
  const coinsEl = document.getElementById("coins");
  const killsEl = document.getElementById("kills");

  if (hpEl) hpEl.textContent = Math.max(0, Math.round(hp));
  if (coinsEl) coinsEl.textContent = coins;
  if (killsEl) killsEl.textContent = kills;
}

function bind(id, key) {
  const button = document.getElementById(id);
  if (!button) return;

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(event => {
    button.addEventListener(event, e => {
      e.preventDefault();
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

function roundedRect(x, y, w, h, r = 10) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawRoad() {
  // پس‌زمینه
  ctx.fillStyle = "#111820";
  ctx.fillRect(0, 0, W, H);

  // عرض جاده
  const roadWidth = Math.min(W * 0.92, 560);
  const roadX = (W - roadWidth) / 2;

  // حاشیه
  ctx.fillStyle = "#596168";
  ctx.fillRect(roadX - 8, 0, 8, H);
  ctx.fillRect(roadX + roadWidth, 0, 8, H);

  // جاده
  const gradient = ctx.createLinearGradient(0, 0, W, 0);
  gradient.addColorStop(0, "#20272c");
  gradient.addColorStop(0.5, "#343b40");
  gradient.addColorStop(1, "#20272c");

  ctx.fillStyle = gradient;
  ctx.fillRect(roadX, 0, roadWidth, H);

  // ترک‌های جاده
  ctx.strokeStyle = "rgba(10,15,18,.45)";
  ctx.lineWidth = 3;

  for (let i = 0; i < 12; i++) {
    const y = ((i * 180 + roadOffset * 1.5) % (H + 200)) - 100;

    ctx.beginPath();
    ctx.moveTo(roadX + 30, y);
    ctx.lineTo(roadX + 55, y + 35);
    ctx.lineTo(roadX + 38, y + 75);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(roadX + roadWidth - 40, y + 40);
    ctx.lineTo(roadX + roadWidth - 70, y + 85);
    ctx.stroke();
  }

  // خط وسط
  ctx.strokeStyle = "#f1f1f1";
  ctx.lineWidth = 6;
  ctx.setLineDash([55, 55]);
  ctx.lineDashOffset = roadOffset;

  ctx.beginPath();
  ctx.moveTo(W / 2, -100);
  ctx.lineTo(W / 2, H + 100);
  ctx.stroke();

  ctx.setLineDash([]);

  // نور محیطی
  const glow = ctx.createLinearGradient(0, 0, 0, H);
  glow.addColorStop(0, "rgba(255,255,255,.05)");
  glow.addColorStop(0.5, "rgba(0,0,0,0)");
  glow.addColorStop(1, "rgba(0,0,0,.3)");

  ctx.fillStyle = glow;
  ctx.fillRect(roadX, 0, roadWidth, H);
}

function drawCar() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // سایه
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.beginPath();
  ctx.ellipse(0, 38, 38, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // چرخ‌ها
  ctx.fillStyle = "#080a0c";
  roundedRect(-34, -30, 12, 28, 5);
  roundedRect(22, -30, 12, 28, 5);
  roundedRect(-34, 18, 12, 28, 5);
  roundedRect(22, 18, 12, 28, 5);

  // بدنه
  const carGradient = ctx.createLinearGradient(-30, 0, 30, 0);
  carGradient.addColorStop(0, "#9d0718");
  carGradient.addColorStop(0.5, "#ef233c");
  carGradient.addColorStop(1, "#9d0718");

  ctx.fillStyle = carGradient;
  roundedRect(-29, -48, 58, 96, 13);

  // سقف
  ctx.fillStyle = "#c51629";
  roundedRect(-23, -35, 46, 42, 9);

  // شیشه جلو
  const glass = ctx.createLinearGradient(0, -32, 0, 5);
  glass.addColorStop(0, "#d9f5ff");
  glass.addColorStop(0.45, "#607d8b");
  glass.addColorStop(1, "#263b45");

  ctx.fillStyle = glass;
  roundedRect(-20, -31, 40, 30, 7);

  // خط وسط شیشه
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.fillRect(-2, -30, 4, 28);

  // شیشه عقب
  ctx.fillStyle = "#18252b";
  roundedRect(-20, 10, 40, 22, 6);

  // چراغ‌ها
  ctx.fillStyle = "#fff3a0";
  roundedRect(-20, -46, 13, 7, 3);
  roundedRect(7, -46, 13, 7, 3);

  ctx.fillStyle = "#ff182e";
  roundedRect(-20, 38, 13, 6, 3);
  roundedRect(7, 38, 13, 6, 3);

  ctx.restore();
}

function spawnZombie() {
  const roadWidth = Math.min(W * 0.92, 560);
  const roadX = (W - roadWidth) / 2 + 45;

  const x = roadX + Math.random() * (roadWidth - 90);

  zombies.push({
    x,
    y: -70,
    w: 50,
    h: 70,
    spd: 1.7 + Math.random() * 1.5 + kills * 0.015,
    wobble: Math.random() * Math.PI * 2
  });
}

function drawZombie(z) {
  ctx.save();

  ctx.translate(
    z.x + Math.sin(z.wobble) * 3,
    z.y
  );

  // سایه
  ctx.fillStyle = "rgba(0,0,0,.5)";
  ctx.beginPath();
  ctx.ellipse(0, 38, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // پاها
  ctx.fillStyle = "#193622";
  roundedRect(-18, 18, 14, 35, 7);
  roundedRect(4, 18, 14, 35, 7);

  // بدن
  ctx.fillStyle = "#304f34";
  roundedRect(-22, -12, 44, 45, 12);

  // دست‌ها
  ctx.strokeStyle = "#79a957";
  ctx.lineWidth = 13;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-18, -3);
  ctx.lineTo(-34, 16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18, -3);
  ctx.lineTo(35, 7);
  ctx.stroke();

  // سر
  ctx.fillStyle = "#75a653";
  ctx.beginPath();
  ctx.arc(0, -30, 22, 0, Math.PI * 2);
  ctx.fill();

  // مو
  ctx.fillStyle = "#17251a";
  ctx.beginPath();
  ctx.arc(0, -38, 18, Math.PI, Math.PI * 2);
  ctx.fill();

  // چشم‌ها
  ctx.fillStyle = "#d5f47b";

  ctx.beginPath();
  ctx.arc(-8, -32, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(8, -32, 4, 0, Math.PI * 2);
  ctx.fill();

  // دهان
  ctx.fillStyle = "#111";
  roundedRect(-10, -18, 20, 8, 2);

  ctx.fillStyle = "#eee";
  ctx.fillRect(-7, -18, 5, 5);
  ctx.fillRect(3, -18, 5, 5);

  // نوار سلامتی
  ctx.fillStyle = "#111";
  roundedRect(-25, -63, 50, 6, 3);

  ctx.fillStyle = "#27e65f";
  ctx.fillRect(-24, -62, 48, 4);

  ctx.restore();
}

function fire() {
  bullets.push({
    x: player.x,
    y: player.y - 55,
    spd: 13,
    r: 5
  });

  burst(player.x, player.y - 55, "#ffd54f", 3);
}

function hit(a, b) {
  return (
    Math.abs(a.x - b.x) <
      (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) <
      (a.h + b.h) / 2
  );
}

function burst(x, y, color = "#ff7043", amount = 12) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 25 + Math.random() * 20,
      color
    });
  }
}

function endGame() {
  gameOver = true;

  const finalKills = document.getElementById("finalKills");
  if (finalKills) finalKills.textContent = kills;

  const gameover = document.getElementById("gameover");
  if (gameover) gameover.classList.remove("hidden");
}

function update(dt) {
  roadOffset += 6 * dt;

  // حرکت ماشین
  if (keys.l) player.x -= player.speed * dt;
  if (keys.r) player.x += player.speed * dt;

  const roadWidth = Math.min(W * 0.92, 560);

  const minX =
    (W - roadWidth) / 2 + 38;

  const maxX =
    (W + roadWidth) / 2 - 38;

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

  // زامبی
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnZombie();

    spawnTimer =
      Math.max(
        15,
        43 - kills * 0.12
      );
  }

  bullets.forEach(b => {
    b.y -= b.spd * dt;
  });

  zombies.forEach(z => {
    z.y += z.spd * dt;
    z.wobble += 0.08 * dt;
  });

  // برخوردها
  for (
    let i = zombies.length - 1;
    i >= 0;
    i--
  ) {
    const z = zombies[i];

    if (z.y > H + 100) {
      zombies.splice(i, 1);
      continue;
    }

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

      hp -= 20;

      burst(z.x, z.y, "#ff1744", 18);

      updateHud();

      if (hp <= 0) {
        hp = 0;
        updateHud();
        endGame();
      }

      continue;
    }

    for (
      let j = bullets.length - 1;
      j >= 0;
      j--
    ) {
      const b = bullets[j];

      if (
        Math.abs(b.x - z.x) < 32 &&
        Math.abs(b.y - z.y) < 42
      ) {
        bullets.splice(j, 1);
        zombies.splice(i, 1);

        kills++;
        coins += 5;
        score += 10;

        burst(
          z.x,
          z.y,
          "#ff7043",
          20
        );

        updateHud();

        break;
      }
    }
  }

  bullets = bullets.filter(
    b => b.y > -30
  );

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
  });

  particles = particles.filter(
    p => p.life > 0
  );
}

function draw() {
  drawRoad();

  zombies.forEach(drawZombie);

  drawCar();

  // گلوله
  bullets.forEach(b => {
    ctx.fillStyle = "#ffd54f";

    ctx.shadowColor = "#ff9800";
    ctx.shadowBlur = 12;

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

  // ذرات
  particles.forEach(p => {
    ctx.globalAlpha =
      Math.max(0, p.life / 40);

    ctx.fillStyle = p.color;

    ctx.fillRect(
      p.x,
      p.y,
      5,
      5
    );
  });

  ctx.globalAlpha = 1;
}

function loop(t) {
  const dt = Math.min(
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

reset();
requestAnimationFrame(loop);
