const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W, H;
let D = window.devicePixelRatio || 1;

function resize() {
  W = innerWidth;
  H = innerHeight;

  canvas.width = W * D;
  canvas.height = H * D;

  ctx.setTransform(D, 0, 0, D, 0, 0);
}

addEventListener("resize", resize);
resize();


let run = false;
let dead = false;

let coins = 0;
let kills = 0;
let stage = 1;
let hp = 100;

let roadOffset = 0;
let spawnTimer = 20;
let lastTime = performance.now();
let fireCooldown = 0;


const keys = {
  left: false,
  right: false,
  fire: false
};


const car = {
  x: W / 2,
  y: H - 145
};


const zombies = [];
const bullets = [];
const sparks = [];


/* -----------------------------
   کنترل موبایل
----------------------------- */

function bindButton(id, key, once = false) {

  const button = document.getElementById(id);

  function down(event) {

    event.preventDefault();

    keys[key] = true;

    if (once) {
      fire();
    }
  }

  function up(event) {

    event.preventDefault();

    keys[key] = false;
  }

  button.addEventListener(
    "pointerdown",
    down,
    { passive: false }
  );

  button.addEventListener(
    "pointerup",
    up,
    { passive: false }
  );

  button.addEventListener(
    "pointercancel",
    up,
    { passive: false }
  );

  button.addEventListener(
    "pointerleave",
    up,
    { passive: false }
  );

  button.addEventListener(
    "touchstart",
    down,
    { passive: false }
  );

  button.addEventListener(
    "touchend",
    up,
    { passive: false }
  );
}


bindButton("left", "left");
bindButton("right", "right");
bindButton("fire", "fire", true);


/* -----------------------------
   کیبورد
----------------------------- */

addEventListener("keydown", event => {

  if (event.key === "ArrowLeft") {
    keys.left = true;
  }

  if (event.key === "ArrowRight") {
    keys.right = true;
  }

  if (event.key === " ") {
    keys.fire = true;
  }

});


addEventListener("keyup", event => {

  if (event.key === "ArrowLeft") {
    keys.left = false;
  }

  if (event.key === "ArrowRight") {
    keys.right = false;
  }

  if (event.key === " ") {
    keys.fire = false;
  }

});


/* -----------------------------
   تیراندازی
----------------------------- */

function fire() {

  if (!run || dead) return;

  if (fireCooldown > 0) return;

  bullets.push({
    x: car.x,
    y: car.y - 65,
    speed: -16
  });

  fireCooldown = 7;
}


/* -----------------------------
   ساخت زامبی
----------------------------- */

function spawnZombie() {

  const roadWidth =
    Math.min(W * 0.78, 620);

  const roadX =
    (W - roadWidth) / 2;

  zombies.push({

    x:
      roadX +
      40 +
      Math.random() *
      (roadWidth - 80),

    y: -70,

    hp:
      45 +
      stage * 7,

    speed:
      1.5 +
      stage * 0.04,

    type:
      Math.random() < 0.2
        ? "runner"
        : "normal"
  });
}


/* -----------------------------
   افکت انفجار
----------------------------- */

function explosion(x, y) {

  for (let i = 0; i < 16; i++) {

    sparks.push({

      x: x,
      y: y,

      vx:
        (Math.random() - 0.5) * 6,

      vy:
        (Math.random() - 0.5) * 6,

      life: 30,

      radius:
        2 + Math.random() * 4
    });

  }
}


/* -----------------------------
   آپدیت بازی
----------------------------- */

function update(dt) {

  roadOffset =
    (roadOffset + 4 * dt) % 90;


  /* حرکت ماشین */

  if (keys.left) {
    car.x -= 6.5 * dt;
  }

  if (keys.right) {
    car.x += 6.5 * dt;
  }


  car.x =
    Math.max(
      62,
      Math.min(W - 62, car.x)
    );


  /* تیراندازی */

  if (keys.fire) {
    fire();
  }

  fireCooldown -= dt;


  /* ساخت زامبی */

  spawnTimer -= dt;

  if (spawnTimer <= 0) {

    spawnZombie();

    spawnTimer =
      Math.max(
        9,
        34 - stage
      );
  }


  /* حرکت زامبی‌ها */

  for (
    let i = zombies.length - 1;
    i >= 0;
    i--
  ) {

    const z = zombies[i];

    z.y += z.speed * dt;

    z.x +=
      (car.x - z.x) *
      0.004 *
      dt;


    /* برخورد با ماشین */

    if (
      Math.abs(z.x - car.x) < 50 &&
      Math.abs(z.y - car.y) < 78
    ) {

      hp -=
        (z.type === "runner"
          ? 1.6
          : 0.9) * dt;
    }

  }


  /* گلوله‌ها */

  for (
    let i = bullets.length - 1;
    i >= 0;
    i--
  ) {

    const bullet = bullets[i];

    bullet.y +=
      bullet.speed * dt;

    let hit = false;


    for (
      let j = zombies.length - 1;
      j >= 0;
      j--
    ) {

      const z = zombies[j];


      if (
        Math.abs(
          bullet.x - z.x
        ) < 32 &&

        Math.abs(
          bullet.y - z.y
        ) < 48
      ) {

        z.hp -= 20;

        hit = true;


        if (z.hp <= 0) {

          coins +=
            6 +
            Math.floor(stage / 2);

          kills++;


          if (
            kills %
            Math.max(
              1,
              12 + stage * 2
            ) === 0
          ) {

            stage++;
          }


          explosion(
            z.x,
            z.y
          );

          zombies.splice(j, 1);
        }

        break;
      }
    }


    if (
      hit ||
      bullet.y < -30
    ) {

      bullets.splice(i, 1);
    }

  }


  /* ذرات انفجار */

  for (
    let i = sparks.length - 1;
    i >= 0;
    i--
  ) {

    const s = sparks[i];

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    s.vy +=
      0.08 * dt;

    s.life -= dt;


    if (s.life <= 0) {
      sparks.splice(i, 1);
    }
  }


  /* باخت */

  if (hp <= 0) {

    hp = 0;

    dead = true;

    document.getElementById(
      "final"
    ).textContent =
      kills * 15 + coins;

    document.getElementById(
      "over"
    ).style.display = "grid";
  }


  /* HUD */

  document.getElementById(
    "coins"
  ).textContent = coins;

  document.getElementById(
    "kills"
  ).textContent = kills;

  document.getElementById(
    "hp"
  ).textContent = Math.ceil(hp);

  document.getElementById(
    "stage"
  ).textContent = stage;
}


/* -----------------------------
   پس‌زمینه
----------------------------- */

function drawBackground() {

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  gradient.addColorStop(
    0,
    "#070b10"
  );

  gradient.addColorStop(
    0.55,
    "#182126"
  );

  gradient.addColorStop(
    1,
    "#080a0d"
  );


  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* ساختمان‌ها */

  for (let i = 0; i < 15; i++) {

    const width =
      45 + (i * 19) % 70;

    const height =
      80 + (i * 29) % 180;

    const bx =
      i * W / 14 - 15;


    ctx.fillStyle =
      i % 2
        ? "#10171c"
        : "#0c1217";

    ctx.fillRect(
      bx,
      190 - height,
      width,
      height
    );


    for (
      let yy = 200 - height;
      yy < 175;
      yy += 18
    ) {

      for (
        let xx = bx + 8;
        xx < bx + width;
        xx += 16
      ) {

        if (
          (xx + yy + i) % 3 === 0
        ) {

          ctx.fillStyle =
            "#d19b35aa";

          ctx.fillRect(
            xx,
            yy,
            4,
            6
          );
        }
      }
    }
  }


  /* جاده */

  const roadWidth =
    Math.min(W * 0.78, 620);

  const roadX =
    (W - roadWidth) / 2;


  ctx.fillStyle =
    "#202629";

  ctx.fillRect(
    roadX,
    0,
    roadWidth,
    H
  );


  /* حاشیه جاده */

  ctx.fillStyle =
    "#12171a";

  ctx.fillRect(
    roadX + 9,
    0,
    8,
    H
  );

  ctx.fillRect(
    roadX + roadWidth - 17,
    0,
    8,
    H
  );


  /* خط وسط */

  ctx.strokeStyle =
    "#e8e5dc";

  ctx.lineWidth = 5;

  ctx.setLineDash([
    38,
    32
  ]);

  ctx.lineDashOffset =
    -roadOffset;

  ctx.beginPath();

  ctx.moveTo(
    W / 2,
    0
  );

  ctx.lineTo(
    W / 2,
    H
  );

  ctx.stroke();

  ctx.setLineDash([]);


  /* ترک‌های جاده */

  for (let i = 0; i < 10; i++) {

    const y =
      (i * 121 +
        roadOffset * 2) % H;

    ctx.strokeStyle =
      "#fff1";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      roadX + 28,
      y
    );

    ctx.lineTo(
      roadX + roadWidth - 28,
      y + 4
    );

    ctx.stroke();
  }
}


/* -----------------------------
   ماشین
----------------------------- */

function drawCar() {

  ctx.save();

  ctx.translate(
    car.x,
    car.y
  );


  /* سایه */

  ctx.fillStyle =
    "#0009";

  ctx.beginPath();

  ctx.ellipse(
    0,
    45,
    58,
    18,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* بدنه */

  const gradient =
    ctx.createLinearGradient(
      -45,
      -65,
      45,
      65
    );

  gradient.addColorStop(
    0,
    "#777"
  );

  gradient.addColorStop(
    0.22,
    "#292d30"
  );

  gradient.addColorStop(
    0.55,
    "#090b0c"
  );

  gradient.addColorStop(
    0.8,
    "#4b4f50"
  );

  gradient.addColorStop(
    1,
    "#0a0b0c"
  );


  ctx.fillStyle =
    gradient;

  ctx.beginPath();

  ctx.roundRect(
    -44,
    -65,
    88,
    130,
    17
  );

  ctx.fill();


  ctx.strokeStyle =
    "#c5a65b";

  ctx.lineWidth = 3;

  ctx.stroke();


  /* شیشه */

  ctx.fillStyle =
    "#8da8b8aa";

  ctx.beginPath();

  ctx.roundRect(
    -29,
    -41,
    58,
    36,
    9
  );

  ctx.fill();


  ctx.strokeStyle =
    "#68767c";

  ctx.lineWidth = 2;

  ctx.stroke();


  /* چراغ‌ها */

  ctx.fillStyle =
    "#fff0a0";

  ctx.fillRect(
    -29,
    -58,
    17,
    7
  );

  ctx.fillRect(
    12,
    -58,
    17,
    7
  );


  /* چراغ عقب */

  ctx.fillStyle =
    "#d71919";

  ctx.fillRect(
    -27,
    53,
    17,
    6
  );

  ctx.fillRect(
    10,
    53,
    17,
    6
  );


  /* چرخ‌ها */

  ctx.fillStyle =
    "#111";

  ctx.fillRect(
    -49,
    -18,
    8,
    32
  );

  ctx.fillRect(
    41,
    -18,
    8,
    32
  );


  /* مسلسل */

  ctx.fillStyle =
    "#202325";

  ctx.fillRect(
    -7,
    -86,
    14,
    25
  );

  ctx.fillRect(
    -4,
    -108,
    8,
    34
  );


  ctx.restore();
}


/* -----------------------------
   زامبی
----------------------------- */

function drawZombie(z) {

  ctx.save();

  ctx.translate(
    z.x,
    z.y
  );


  /* سایه */

  ctx.fillStyle =
    "#0008";

  ctx.beginPath();

  ctx.ellipse(
    0,
    42,
    29,
    9,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* سر */

  ctx.fillStyle =
    z.type === "runner"
      ? "#6f865b"
      : "#52694c";

  ctx.beginPath();

  ctx.arc(
    0,
    -18,
    22,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* بدن */

  ctx.fillRect(
    -20,
    0,
    40,
    47
  );


  /* دست‌ها */

  ctx.strokeStyle =
    "#29372a";

  ctx.lineWidth = 5;

  ctx.beginPath();

  ctx.moveTo(
    -17,
    7
  );

  ctx.lineTo(
    -35,
    36
  );

  ctx.moveTo(
    17,
    7
  );

  ctx.lineTo(
    35,
    36
  );

  ctx.stroke();


  /* چشم‌ها */

  ctx.fillStyle =
    "#d7e89c";

  ctx.beginPath();

  ctx.arc(
    -7,
    -21,
    4,
    0,
    7
  );

  ctx.arc(
    8,
    -21,
    4,
    0,
    7
  );

  ctx.fill();


  /* دهان */

  ctx.fillStyle =
    "#171b17";

  ctx.fillRect(
    -9,
    -8,
    18,
    5
  );


  ctx.restore();
}


/* -----------------------------
   رندر
----------------------------- */

function draw() {

  drawBackground();

  zombies.forEach(
    drawZombie
  );

  drawCar();


  /* گلوله‌ها */

  for (const bullet of bullets) {

    ctx.save();

    ctx.shadowBlur = 16;

    ctx.shadowColor =
      "#ff8d32";

    ctx.fillStyle =
      "#ffd06a";

    ctx.fillRect(
      bullet.x - 3,
      bullet.y - 12,
      6,
      18
    );

    ctx.restore();
  }


  /* انفجار */

  for (const spark of sparks) {

    ctx.globalAlpha =
      Math.max(
        0,
        spark.life / 30
      );

    ctx.fillStyle =
      "#ff9f24";

    ctx.beginPath();

    ctx.arc(
      spark.x,
      spark.y,
      spark.radius,
      0,
      7
    );

    ctx.fill();

    ctx.globalAlpha = 1;
  }
}


/* -----------------------------
   شروع
----------------------------- */

document.getElementById(
  "startBtn"
).onclick = () => {

  run = true;

  document.getElementById(
    "start"
  ).style.display = "none";

  lastTime =
    performance.now();
};


/* -----------------------------
   حلقه بازی
----------------------------- */

function gameLoop(time) {

  const dt =
    Math.min(
      (time - lastTime) / 16.67,
      2
    );

  lastTime = time;


  if (run && !dead) {
    update(dt);
  }


  draw();

  requestAnimationFrame(
    gameLoop
  );
}


requestAnimationFrame(
  gameLoop
);
