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
let floatingTexts = [];

let coins = 0;
let kills = 0;
let hp = 100;
let score = 0;

let gameOver = false;
let keys = {};

let spawnTimer = 0;
let last = performance.now();
let roadOffset = 0;

let screenShake = 0;
let muzzleFlash = 0;


/* =========================
   RESIZE
========================= */

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


/* =========================
   RESET
========================= */

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
  floatingTexts = [];

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

  spawnTimer = 20;
  roadOffset = 0;

  screenShake = 0;
  muzzleFlash = 0;

  const gameover = document.getElementById("gameover");

  if (gameover) {
    gameover.classList.add("hidden");
  }

  updateHud();
}


/* =========================
   HUD
========================= */

function updateHud() {
  const hpEl = document.getElementById("hp");
  const coinsEl = document.getElementById("coins");
  const killsEl = document.getElementById("kills");
  const hpFill = document.getElementById("hpFill");

  if (hpEl) {
    hpEl.textContent = Math.max(0, Math.round(hp));
  }

  if (coinsEl) {
    coinsEl.textContent = coins;
  }

  if (killsEl) {
    killsEl.textContent = kills;
  }

  if (hpFill) {
    hpFill.style.width = Math.max(0, hp) + "%";
  }
}


/* =========================
   CONTROLS
========================= */

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

if (restart) {
  restart.onclick = reset;
}


/* =========================
   HELPERS
========================= */

function roundedRect(x, y, w, h, r = 10) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


/* =========================
   ROAD
========================= */

function drawRoad() {

  // محیط اطراف
  const bg = ctx.createLinearGradient(0, 0, 0, H);

  bg.addColorStop(0, "#090e12");
  bg.addColorStop(.5, "#151c21");
  bg.addColorStop(1, "#050709");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);


  const roadWidth = Math.min(W * .92, 560);
  const roadX = (W - roadWidth) / 2;


  // نور کناره جاده
  ctx.fillStyle = "#788087";

  ctx.fillRect(
    roadX - 7,
    0,
    7,
    H
  );

  ctx.fillRect(
    roadX + roadWidth,
    0,
    7,
    H
  );


  // جاده
  const roadGradient =
    ctx.createLinearGradient(
      roadX,
      0,
      roadX + roadWidth,
      0
    );

  roadGradient.addColorStop(
    0,
    "#171d21"
  );

  roadGradient.addColorStop(
    .18,
    "#343b40"
  );

  roadGradient.addColorStop(
    .5,
    "#41484d"
  );

  roadGradient.addColorStop(
    .82,
    "#343b40"
  );

  roadGradient.addColorStop(
    1,
    "#171d21"
  );

  ctx.fillStyle = roadGradient;

  ctx.fillRect(
    roadX,
    0,
    roadWidth,
    H
  );


  // خطوط کنار جاده
  ctx.strokeStyle = "#d5d5d5";
  ctx.lineWidth = 3;

  ctx.setLineDash([35, 35]);
  ctx.lineDashOffset = roadOffset * 1.5;

  ctx.beginPath();
  ctx.moveTo(roadX + 18, 0);
  ctx.lineTo(roadX + 18, H);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(roadX + roadWidth - 18, 0);
  ctx.lineTo(roadX + roadWidth - 18, H);
  ctx.stroke();

  ctx.setLineDash([]);


  // خط وسط
  ctx.strokeStyle = "#f4f4f4";
  ctx.lineWidth = 6;

  ctx.setLineDash([55, 50]);
  ctx.lineDashOffset = roadOffset;

  ctx.beginPath();

  ctx.moveTo(
    W / 2,
    -100
  );

  ctx.lineTo(
    W / 2,
    H + 100
  );

  ctx.stroke();

  ctx.setLineDash([]);


  // ترک‌های جاده
  ctx.strokeStyle =
    "rgba(0,0,0,.28)";

  ctx.lineWidth = 2;

  for (let i = 0; i < 10; i++) {

    const y =
      ((i * 210 +
        roadOffset * 1.3) %
        (H + 250)) - 120;

    ctx.beginPath();

    ctx.moveTo(
      roadX + 35,
      y
    );

    ctx.lineTo(
      roadX + 55,
      y + 35
    );

    ctx.lineTo(
      roadX + 42,
      y + 75
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
      roadX + roadWidth - 35,
      y + 60
    );

    ctx.lineTo(
      roadX + roadWidth - 65,
      y + 100
    );

    ctx.stroke();
  }


  // نور جاده
  const light =
    ctx.createRadialGradient(
      W / 2,
      H * .65,
      20,
      W / 2,
      H * .65,
      roadWidth * .7
    );

  light.addColorStop(
    0,
    "rgba(255,255,255,.07)"
  );

  light.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );

  ctx.fillStyle = light;

  ctx.fillRect(
    roadX,
    0,
    roadWidth,
    H
  );
}


/* =========================
   CAR
========================= */

function drawCar() {

  ctx.save();

  ctx.translate(
    player.x,
    player.y
  );


  // سایه
  ctx.fillStyle =
    "rgba(0,0,0,.65)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    45,
    40,
    14,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // نور زیر ماشین
  const glow =
    ctx.createRadialGradient(
      0,
      35,
      2,
      0,
      35,
      55
    );

  glow.addColorStop(
    0,
    "rgba(255,30,50,.18)"
  );

  glow.addColorStop(
    1,
    "rgba(255,30,50,0)"
  );

  ctx.fillStyle = glow;

  ctx.beginPath();

  ctx.ellipse(
    0,
    35,
    55,
    25,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // چرخ‌ها
  ctx.fillStyle = "#07090a";

  roundedRect(
    -35,
    -31,
    12,
    29,
    5
  );

  roundedRect(
    23,
    -31,
    12,
    29,
    5
  );

  roundedRect(
    -35,
    19,
    12,
    29,
    5
  );

  roundedRect(
    23,
    19,
    12,
    29,
    5
  );


  // بدنه
  const body =
    ctx.createLinearGradient(
      -30,
      0,
      30,
      0
    );

  body.addColorStop(
    0,
    "#760615"
  );

  body.addColorStop(
    .22,
    "#d20d25"
  );

  body.addColorStop(
    .5,
    "#ff3048"
  );

  body.addColorStop(
    .78,
    "#d20d25"
  );

  body.addColorStop(
    1,
    "#760615"
  );

  ctx.fillStyle = body;

  roundedRect(
    -30,
    -49,
    60,
    98,
    14
  );


  // کاپوت
  ctx.fillStyle =
    "rgba(255,255,255,.08)";

  roundedRect(
    -20,
    -44,
    40,
    14,
    6
  );


  // سقف
  ctx.fillStyle =
    "#b90c22";

  roundedRect(
    -24,
    -37,
    48,
    45,
    11
  );


  // شیشه
  const glass =
    ctx.createLinearGradient(
      0,
      -35,
      0,
      10
    );

  glass.addColorStop(
    0,
    "#d9f7ff"
  );

  glass.addColorStop(
    .4,
    "#537583"
  );

  glass.addColorStop(
    1,
    "#172b34"
  );

  ctx.fillStyle = glass;

  roundedRect(
    -20,
    -32,
    40,
    30,
    7
  );


  // انعکاس شیشه
  ctx.fillStyle =
    "rgba(255,255,255,.25)";

  ctx.fillRect(
    -16,
    -29,
    3,
    24
  );


  // شیشه عقب
  ctx.fillStyle =
    "#16242b";

  roundedRect(
    -20,
    11,
    40,
    22,
    6
  );


  // چراغ جلو
  ctx.fillStyle =
    "#fff4a8";

  roundedRect(
    -20,
    -47,
    13,
    7,
    3
  );

  roundedRect(
    7,
    -47,
    13,
    7,
    3
  );


  // چراغ عقب
  ctx.fillStyle =
    "#ff172f";

  roundedRect(
    -20,
    39,
    13,
    6,
    3
  );

  roundedRect(
    7,
    39,
    13,
    6,
    3
  );


  // خط قرمز بدنه
  ctx.fillStyle =
    "rgba(255,255,255,.15)";

  ctx.fillRect(
    -26,
    5,
    52,
    3
  );


  ctx.restore();
}


/* =========================
   ZOMBIE
========================= */

function spawnZombie() {

  const roadWidth =
    Math.min(W * .92, 560);

  const roadX =
    (W - roadWidth) / 2 + 50;


  let x;
  let tries = 0;

  do {

    x =
      roadX +
      Math.random() *
      (roadWidth - 100);

    tries++;

  } while (
    zombies.some(
      z =>
        Math.abs(z.x - x) < 65 &&
        z.y < 150
    ) &&
    tries < 15
  );


  const type =
    Math.random();


  let zombie;


  // زامبی سریع
  if (type < .18) {

    zombie = {
      x,
      y: -80,
      w: 43,
      h: 62,
      spd: 3.2 + Math.random(),
      health: 1,
      type: "fast",
      wobble: Math.random() * 6
    };

  }

  // زامبی قوی
  else if (type < .32) {

    zombie = {
      x,
      y: -90,
      w: 62,
      h: 82,
      spd: 1.1 + Math.random(),
      health: 3,
      type: "tank",
      wobble: Math.random() * 6
    };

  }

  // زامبی عادی
  else {

    zombie = {
      x,
      y: -75,
      w: 50,
      h: 70,
      spd:
        1.7 +
        Math.random() * 1.5 +
        kills * .012,
      health: 1,
      type: "normal",
      wobble: Math.random() * 6
    };
  }


  zombies.push(zombie);
}


/* =========================
   DRAW ZOMBIE
========================= */

function drawZombie(z) {

  ctx.save();


  const wobble =
    Math.sin(
      z.wobble +
      performance.now() / 180
    ) * 3;


  ctx.translate(
    z.x + wobble,
    z.y
  );


  const scale =
    z.type === "tank"
      ? 1.18
      : z.type === "fast"
        ? .88
        : 1;


  ctx.scale(
    scale,
    scale
  );


  // سایه
  ctx.fillStyle =
    "rgba(0,0,0,.55)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    39,
    30,
    10,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // پاها
  ctx.fillStyle =
    z.type === "tank"
      ? "#17251a"
      : "#1d3923";

  roundedRect(
    -18,
    18,
    14,
    35,
    7
  );

  roundedRect(
    4,
    18,
    14,
    35,
    7
  );


  // بدن
  const body =
    ctx.createLinearGradient(
      -22,
      -10,
      22,
      35
    );

  body.addColorStop(
    0,
    z.type === "tank"
      ? "#3d6541"
      : "#527d4b"
  );

  body.addColorStop(
    1,
    "#1d3622"
  );

  ctx.fillStyle = body;

  roundedRect(
    -22,
    -12,
    44,
    45,
    11
  );


  // دست‌ها
  ctx.strokeStyle =
    z.type === "tank"
      ? "#5f874b"
      : "#79a957";

  ctx.lineWidth = 13;
  ctx.lineCap = "round";


  ctx.beginPath();

  ctx.moveTo(
    -18,
    -3
  );

  ctx.lineTo(
    -34,
    16
  );

  ctx.stroke();


  ctx.beginPath();

  ctx.moveTo(
    18,
    -3
  );

  ctx.lineTo(
    35,
    8
  );

  ctx.stroke();


  // سر
  ctx.fillStyle =
    z.type === "tank"
      ? "#527b43"
      : "#75a653";

  ctx.beginPath();

  ctx.arc(
    0,
    -30,
    22,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // مو
  ctx.fillStyle =
    "#152218";

  ctx.beginPath();

  ctx.arc(
    0,
    -38,
    18,
    Math.PI,
    Math.PI * 2
  );

  ctx.fill();


  // چشم
  ctx.fillStyle =
    z.type === "fast"
      ? "#ff5252"
      : "#d5f47b";


  ctx.beginPath();

  ctx.arc(
    -8,
    -32,
    4,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.beginPath();

  ctx.arc(
    8,
    -32,
    4,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // دهان
  ctx.fillStyle =
    "#0c0c0c";

  roundedRect(
    -11,
    -18,
    22,
    9,
    3
  );


  ctx.fillStyle =
    "#f2f2f2";

  ctx.fillRect(
    -8,
    -18,
    5,
    5
  );

  ctx.fillRect(
    3,
    -18,
    5,
    5
  );


  // نوار جان زامبی
  if (z.health > 1) {

    ctx.fillStyle =
      "rgba(0,0,0,.8)";

    roundedRect(
      -27,
      -64,
      54,
      7,
      3
    );


    ctx.fillStyle =
      "#35e85d";

    ctx.fillRect(
      -26,
      -63,
      52 * (z.health / 3),
      5
    );
  }


  ctx.restore();
}


/* =========================
   SHOOT
========================= */

function fire() {

  bullets.push({
    x: player.x,
    y: player.y - 55,
    spd: 14,
    r: 5,
    trail: []
  });


  muzzleFlash = 5;


  burst(
    player.x,
    player.y - 57,
    "#ffd54f",
    6
  );
}


/* =========================
   BULLET
========================= */

function drawBullet(b) {

  const glow =
    ctx.createRadialGradient(
      b.x,
      b.y,
      1,
      b.x,
      b.y,
      18
    );

  glow.addColorStop(
    0,
    "#ffffff"
  );

  glow.addColorStop(
    .25,
    "#ffe45c"
  );

  glow.addColorStop(
    1,
    "rgba(255,100,0,0)"
  );

  ctx.fillStyle = glow;

  ctx.beginPath();

  ctx.arc(
    b.x,
    b.y,
    18,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.fillStyle =
    "#ffd740";

  ctx.beginPath();

  ctx.arc(
    b.x,
    b.y,
    b.r,
    0,
    Math.PI * 2
  );

  ctx.fill();
}


/* =========================
   COLLISION
========================= */

function hit(a, b) {

  return (
    Math.abs(a.x - b.x) <
      (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) <
      (a.h + b.h) / 2
  );
}


/* =========================
   PARTICLES
========================= */

function burst(
  x,
  y,
  color = "#ff7043",
  amount = 12
) {

  for (let i = 0; i < amount; i++) {

    particles.push({

      x,
      y,

      vx:
        (Math.random() - .5) *
        8,

      vy:
        (Math.random() - .5) *
        8,

      life:
        25 +
        Math.random() * 25,

      size:
        2 +
        Math.random() * 5,

      color
    });
  }
}


/* =========================
   FLOATING TEXT
========================= */

function floatingText(
  text,
  x,
  y
) {

  floatingTexts.push({
    text,
    x,
    y,
    life: 45
  });
}


function drawFloatingTexts() {

  floatingTexts.forEach(t => {

    ctx.globalAlpha =
      t.life / 45;

    ctx.fillStyle =
      "#ffd54f";

    ctx.font =
      "bold 18px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      t.text,
      t.x,
      t.y
    );
  });

  ctx.globalAlpha = 1;
}


/* =========================
   PARTICLES UPDATE
========================= */

function updateParticles(dt) {

  particles.forEach(p => {

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vx *= .97;
    p.vy *= .97;

    p.life -= dt;
  });


  particles =
    particles.filter(
      p => p.life > 0
    );


  floatingTexts.forEach(t => {

    t.y -= .8 * dt;
    t.life -= dt;
  });


  floatingTexts =
    floatingTexts.filter(
      t => t.life > 0
    );
}


/* =========================
   DRAW PARTICLES
========================= */

function drawParticles() {

  particles.forEach(p => {

    ctx.globalAlpha =
      Math.max(
        0,
        p.life / 45
      );

    ctx.fillStyle =
      p.color;

    ctx.fillRect(
      p.x,
      p.y,
      p.size,
      p.size
    );
  });

  ctx.globalAlpha = 1;
}


/* =========================
   GAME OVER
========================= */

function endGame() {

  gameOver = true;

  const finalKills =
    document.getElementById(
      "finalKills"
    );

  if (finalKills) {
    finalKills.textContent =
      kills;
  }


  const gameover =
    document.getElementById(
      "gameover"
    );

  if (gameover) {
    gameover.classList.remove(
      "hidden"
    );
  }
}


/* =========================
   UPDATE
========================= */

function update(dt) {

  roadOffset +=
    7 * dt;


  // حرکت ماشین
  if (keys.l) {
    player.x -=
      player.speed * dt;
  }

  if (keys.r) {
    player.x +=
      player.speed * dt;
  }


  const roadWidth =
    Math.min(W * .92, 560);


  const minX =
    (W - roadWidth) / 2 + 40;


  const maxX =
    (W + roadWidth) / 2 - 40;


  player.x =
    clamp(
      player.x,
      minX,
      maxX
    );


  // شلیک
  player.fire -= dt;

  if (
    keys.f &&
    player.fire <= 0
  ) {

    fire();

    player.fire = 8;
  }


  // فلش شلیک
  if (muzzleFlash > 0) {
    muzzleFlash -= dt;
  }


  // تولید زامبی
  spawnTimer -= dt;

  if (spawnTimer <= 0) {

    spawnZombie();

    spawnTimer =
      Math.max(
        13,
        40 -
          kills * .13
      );
  }


  // گلوله
  bullets.forEach(b => {

    b.y -=
      b.spd * dt;
  });


  // زامبی
  zombies.forEach(z => {

    z.y +=
      z.spd * dt;

    z.wobble +=
      .08 * dt;
  });


  // برخورد
  for (
    let i =
      zombies.length - 1;
    i >= 0;
    i--
  ) {

    const z =
      zombies[i];


    // خارج شدن
    if (
      z.y >
      H + 100
    ) {

      zombies.splice(
        i,
        1
      );

      continue;
    }


    // برخورد ماشین
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

      zombies.splice(
        i,
        1
      );


      hp -=
        z.type === "tank"
          ? 30
          : 20;


      screenShake = 10;


      burst(
        z.x,
        z.y,
        "#e31b3b",
        25
      );


      floatingText(
        "-20 ❤️",
        player.x,
        player.y - 70
      );


      updateHud();


      if (hp <= 0) {

        hp = 0;

        updateHud();

        endGame();
      }


      continue;
    }


    // برخورد گلوله
    for (
      let j =
        bullets.length - 1;
      j >= 0;
      j--
    ) {

      const b =
        bullets[j];


      if (
        Math.abs(
          b.x - z.x
        ) < 32 &&

        Math.abs(
          b.y - z.y
        ) < 45
      ) {

        bullets.splice(
          j,
          1
        );


        z.health--;


        burst(
          b.x,
          b.y,
          "#ff334d",
          12
        );


        if (
          z.health <= 0
        ) {

          zombies.splice(
            i,
            1
          );


          kills++;

          coins +=
            z.type === "tank"
              ? 15
              : 5;

          score +=
            z.type === "tank"
              ? 30
              : 10;


          screenShake =
            z.type === "tank"
              ? 8
              : 4;


          floatingText(
            "+" +
              (z.type === "tank"
                ? 15
                : 5) +
              " 🪙",
            z.x,
            z.y - 45
          );


          burst(
            z.x,
            z.y,
            "#ff1744",
            z.type === "tank"
              ? 35
              : 22
          );


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


  updateParticles(dt);


  if (screenShake > 0) {
    screenShake -= dt;
  }
}


/* =========================
   DRAW
========================= */

function draw() {

  ctx.save();


  // لرزش صفحه
  if (screenShake > 0) {

    ctx.translate(
      (Math.random() - .5) *
        screenShake,

      (Math.random() - .5) *
        screenShake
    );
  }


  drawRoad();


  zombies.forEach(
    drawZombie
  );


  drawCar();


  bullets.forEach(
    drawBullet
  );


  drawParticles();


  drawFloatingTexts();


  // فلش شلیک
  if (muzzleFlash > 0) {

    ctx.globalAlpha =
      muzzleFlash / 5;

    ctx.fillStyle =
      "#fff3a0";

    ctx.beginPath();

    ctx.arc(
      player.x,
      player.y - 60,
      18,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha = 1;
  }


  ctx.restore();
}


/* =========================
   MAIN LOOP
========================= */

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


  requestAnimationFrame(
    loop
  );
}


/* =========================
   START
========================= */

reset();

requestAnimationFrame(
  loop
);
