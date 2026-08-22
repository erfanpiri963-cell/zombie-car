const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


/* =========================
   ELEMENTS
========================= */

const menuScreen =
  document.getElementById("menuScreen");

const garageScreen =
  document.getElementById("garageScreen");

const gameScreen =
  document.getElementById("gameScreen");

const startBtn =
  document.getElementById("startBtn");

const garageBtn =
  document.getElementById("garageBtn");

const backBtn =
  document.getElementById("backBtn");

const menuBtn =
  document.getElementById("menuBtn");

const restartBtn =
  document.getElementById("restart");

const pauseBtn =
  document.getElementById("pauseBtn");

const canvas =
  document.getElementById("game");

const ctx =
  canvas.getContext("2d");


/* =========================
   GAME VARIABLES
========================= */

let W;
let H;
let dpr;

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
let paused = false;

let keys = {
  l: false,
  r: false,
  f: false
};

let last = performance.now();

let roadOffset = 0;
let spawnTimer = 0;

let screenShake = 0;
let muzzleFlash = 0;


/* =========================
   UPGRADES
========================= */

let speedLevel = 1;
let armorLevel = 1;
let weaponLevel = 1;


/* =========================
   RESIZE
========================= */

function resize() {

  dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width =
    W * dpr;

  canvas.height =
    H * dpr;

  canvas.style.width =
    W + "px";

  canvas.style.height =
    H + "px";

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}

window.addEventListener(
  "resize",
  resize
);

resize();


/* =========================
   LOCAL SAVE
========================= */

function loadData() {

  coins =
    Number(
      localStorage.getItem(
        "zombieCarCoins"
      ) || 0
    );

  speedLevel =
    Number(
      localStorage.getItem(
        "speedLevel"
      ) || 1
    );

  armorLevel =
    Number(
      localStorage.getItem(
        "armorLevel"
      ) || 1
    );

  weaponLevel =
    Number(
      localStorage.getItem(
        "weaponLevel"
      ) || 1
    );

  updateMenuCoins();
  updateGarage();
}


function saveData() {

  localStorage.setItem(
    "zombieCarCoins",
    coins
  );

  localStorage.setItem(
    "speedLevel",
    speedLevel
  );

  localStorage.setItem(
    "armorLevel",
    armorLevel
  );

  localStorage.setItem(
    "weaponLevel",
    weaponLevel
  );
}


/* =========================
   UI
========================= */

function showScreen(screen) {

  menuScreen.classList.add(
    "hidden"
  );

  garageScreen.classList.add(
    "hidden"
  );

  gameScreen.classList.add(
    "hidden"
  );

  screen.classList.remove(
    "hidden"
  );
}


function updateMenuCoins() {

  document.getElementById(
    "menuCoins"
  ).textContent = coins;

  document.getElementById(
    "garageCoins"
  ).textContent = coins;
}


function updateGarage() {

  document.getElementById(
    "speedLevel"
  ).textContent =
    "سطح " + speedLevel;

  document.getElementById(
    "armorLevel"
  ).textContent =
    "سطح " + armorLevel;

  document.getElementById(
    "weaponLevel"
  ).textContent =
    "سطح " + weaponLevel;

  updateMenuCoins();
}


/* =========================
   START GAME
========================= */

function resetGame() {

  player = {

    x: W / 2,

    y: H - 175,

    w: 58,

    h: 92,

    speed:
      6 +
      speedLevel * .45,

    fire: 0
  };


  bullets = [];
  zombies = [];
  particles = [];
  floatingTexts = [];

  hp =
    Math.min(
      100 +
      (armorLevel - 1) * 12,
      160
    );

  kills = 0;
  score = 0;

  gameOver = false;
  paused = false;

  roadOffset = 0;
  spawnTimer = 15;

  screenShake = 0;
  muzzleFlash = 0;

  document
    .getElementById("gameover")
    .classList.add("hidden");

  updateHUD();
}


function startGame() {

  resetGame();

  showScreen(gameScreen);
}


/* =========================
   HUD
========================= */

function updateHUD() {

  const hpText =
    document.getElementById("hp");

  const coinsText =
    document.getElementById("coins");

  const killsText =
    document.getElementById("kills");

  const scoreText =
    document.getElementById("scoreValue");

  const hpFill =
    document.getElementById("hpFill");


  hpText.textContent =
    Math.round(
      Math.max(0, hp)
    );

  coinsText.textContent =
    coins;

  killsText.textContent =
    kills;

  scoreText.textContent =
    score;


  const maxHp =
    100 +
    (armorLevel - 1) * 12;

  hpFill.style.width =
    Math.max(
      0,
      Math.min(
        100,
        hp / maxHp * 100
      )
    ) + "%";
}


/* =========================
   CONTROLS
========================= */

function bindButton(
  id,
  key
) {

  const button =
    document.getElementById(id);

  button.addEventListener(
    "pointerdown",
    e => {

      e.preventDefault();

      keys[key] = true;
    }
  );

  [
    "pointerup",
    "pointercancel",
    "pointerleave"
  ].forEach(event => {

    button.addEventListener(
      event,
      e => {

        e.preventDefault();

        keys[key] = false;
      }
    );
  });
}


bindButton("left", "l");
bindButton("right", "r");
bindButton("fire", "f");


window.addEventListener(
  "keydown",
  e => {

    if (
      e.key === "ArrowLeft"
    ) {
      keys.l = true;
    }

    if (
      e.key === "ArrowRight"
    ) {
      keys.r = true;
    }

    if (
      e.code === "Space"
    ) {
      keys.f = true;
    }
  }
);


window.addEventListener(
  "keyup",
  e => {

    if (
      e.key === "ArrowLeft"
    ) {
      keys.l = false;
    }

    if (
      e.key === "ArrowRight"
    ) {
      keys.r = false;
    }

    if (
      e.code === "Space"
    ) {
      keys.f = false;
    }
  }
);


/* =========================
   MENU EVENTS
========================= */

startBtn.onclick =
  startGame;


garageBtn.onclick =
  () => {

    updateGarage();

    showScreen(
      garageScreen
    );
  };


backBtn.onclick =
  () => {

    updateMenuCoins();

    showScreen(
      menuScreen
    );
  };


menuBtn.onclick =
  () => {

    updateMenuCoins();

    showScreen(
      menuScreen
    );
  };


restartBtn.onclick =
  startGame;


/* =========================
   PAUSE
========================= */

pauseBtn.onclick =
  () => {

    if (gameOver)
      return;

    paused =
      !paused;

    pauseBtn.textContent =
      paused
        ? "▶"
        : "❚❚";
  };


/* =========================
   UPGRADES
========================= */

function upgrade(
  type
) {

  const cost = 50;

  if (coins < cost) {

    alert(
      "سکه کافی نداری! 🪙"
    );

    return;
  }


  coins -= cost;


  if (type === "speed") {
    speedLevel++;
  }

  if (type === "armor") {
    armorLevel++;
  }

  if (type === "weapon") {
    weaponLevel++;
  }


  saveData();

  updateGarage();
}


document.getElementById(
  "speedUpgrade"
).onclick =
  () => upgrade("speed");


document.getElementById(
  "armorUpgrade"
).onclick =
  () => upgrade("armor");


document.getElementById(
  "weaponUpgrade"
).onclick =
  () => upgrade("weapon");


/* =========================
   DRAW ROAD
========================= */

function drawRoad() {

  ctx.fillStyle =
    "#080b0d";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  const roadWidth =
    Math.min(
      W * .92,
      560
    );

  const roadX =
    (W - roadWidth) / 2;


  /* اطراف جاده */

  const outside =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  outside.addColorStop(
    0,
    "#151b1e"
  );

  outside.addColorStop(
    1,
    "#050607"
  );

  ctx.fillStyle =
    outside;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* خود جاده */

  const road =
    ctx.createLinearGradient(
      roadX,
      0,
      roadX + roadWidth,
      0
    );

  road.addColorStop(
    0,
    "#171d20"
  );

  road.addColorStop(
    .2,
    "#30383c"
  );

  road.addColorStop(
    .5,
    "#41494d"
  );

  road.addColorStop(
    .8,
    "#30383c"
  );

  road.addColorStop(
    1,
    "#171d20"
  );

  ctx.fillStyle =
    road;

  ctx.fillRect(
    roadX,
    0,
    roadWidth,
    H
  );


  /* لبه‌ها */

  ctx.fillStyle =
    "#b5babd";

  ctx.fillRect(
    roadX,
    0,
    5,
    H
  );

  ctx.fillRect(
    roadX +
    roadWidth -
    5,
    0,
    5,
    H
  );


  /* خطوط وسط */

  ctx.strokeStyle =
    "#f4f4f4";

  ctx.lineWidth = 5;

  ctx.setLineDash([
    48,
    45
  ]);

  ctx.lineDashOffset =
    roadOffset;

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


  /* خطوط فرعی */

  ctx.strokeStyle =
    "rgba(255,255,255,.4)";

  ctx.lineWidth = 2;

  ctx.setLineDash([
    25,
    40
  ]);

  ctx.lineDashOffset =
    roadOffset * 1.3;

  ctx.beginPath();

  ctx.moveTo(
    roadX + 20,
    0
  );

  ctx.lineTo(
    roadX + 20,
    H
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(
    roadX +
    roadWidth -
    20,
    0
  );

  ctx.lineTo(
    roadX +
    roadWidth -
    20,
    H
  );

  ctx.stroke();

  ctx.setLineDash([]);
}


/* =========================
   DRAW CAR
========================= */

function drawCar() {

  ctx.save();

  ctx.translate(
    player.x,
    player.y
  );


  /* سایه */

  ctx.fillStyle =
    "rgba(0,0,0,.65)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    48,
    42,
    13,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* چرخ */

  ctx.fillStyle =
    "#070809";

  roundRect(
    -34,
    -28,
    12,
    30,
    5
  );

  roundRect(
    22,
    -28,
    12,
    30,
    5
  );

  roundRect(
    -34,
    18,
    12,
    30,
    5
  );

  roundRect(
    22,
    18,
    12,
    30,
    5
  );


  /* بدنه */

  const body =
    ctx.createLinearGradient(
      -30,
      0,
      30,
      0
    );

  body.addColorStop(
    0,
    "#700612"
  );

  body.addColorStop(
    .25,
    "#d80d29"
  );

  body.addColorStop(
    .5,
    "#ff304b"
  );

  body.addColorStop(
    .75,
    "#d80d29"
  );

  body.addColorStop(
    1,
    "#700612"
  );

  ctx.fillStyle =
    body;

  roundRect(
    -30,
    -50,
    60,
    100,
    14
  );


  /* سقف */

  ctx.fillStyle =
    "#a80b20";

  roundRect(
    -24,
    -37,
    48,
    48,
    11
  );


  /* شیشه */

  const glass =
    ctx.createLinearGradient(
      0,
      -35,
      0,
      10
    );

  glass.addColorStop(
    0,
    "#d9f5ff"
  );

  glass.addColorStop(
    .45,
    "#597985"
  );

  glass.addColorStop(
    1,
    "#14252d"
  );

  ctx.fillStyle =
    glass;

  roundRect(
    -20,
    -32,
    40,
    30,
    7
  );


  /* شیشه عقب */

  ctx.fillStyle =
    "#17282f";

  roundRect(
    -20,
    11,
    40,
    23,
    6
  );


  /* چراغ */

  ctx.fillStyle =
    "#fff0a0";

  roundRect(
    -21,
    -48,
    14,
    7,
    3
  );

  roundRect(
    7,
    -48,
    14,
    7,
    3
  );


  ctx.fillStyle =
    "#ff172f";

  roundRect(
    -21,
    40,
    14,
    7,
    3
  );

  roundRect(
    7,
    40,
    14,
    7,
    3
  );


  ctx.restore();
}


/* =========================
   ROUND RECT
========================= */

function roundRect(
  x,
  y,
  w,
  h,
  r
) {

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    w,
    h,
    r
  );

  ctx.fill();
}


/* =========================
   SPAWN ZOMBIE
========================= */

function spawnZombie() {

  const roadWidth =
    Math.min(
      W * .92,
      560
    );

  const roadX =
    (W - roadWidth) / 2 + 45;


  const x =
    roadX +
    Math.random() *
    (roadWidth - 90);


  const random =
    Math.random();


  if (random < .18) {

    zombies.push({

      x,
      y: -80,

      w: 43,
      h: 62,

      speed:
        3.2 +
        Math.random(),

      hp: 1,

      type: "fast"

    });

  } else if (random < .32) {

    zombies.push({

      x,
      y: -100,

      w: 62,
      h: 82,

      speed:
        1.2 +
        Math.random(),

      hp: 3,

      type: "tank"

    });

  } else {

    zombies.push({

      x,
      y: -80,

      w: 50,
      h: 70,

      speed:
        1.8 +
        Math.random() * 1.6,

      hp: 1,

      type: "normal"
    });
  }
}


/* =========================
   DRAW ZOMBIE
========================= */

function drawZombie(z) {

  ctx.save();

  ctx.translate(
    z.x,
    z.y
  );


  let scale = 1;

  if (z.type === "tank")
    scale = 1.18;

  if (z.type === "fast")
    scale = .88;

  ctx.scale(
    scale,
    scale
  );


  /* سایه */

  ctx.fillStyle =
    "rgba(0,0,0,.55)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    40,
    28,
    9,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* پاها */

  ctx.fillStyle =
    "#18301e";

  roundRect(
    -17,
    18,
    13,
    35,
    6
  );

  roundRect(
    4,
    18,
    13,
    35,
    6
  );


  /* بدن */

  ctx.fillStyle =
    z.type === "tank"
      ? "#405e3d"
      : "#527b4b";

  roundRect(
    -22,
    -12,
    44,
    45,
    10
  );


  /* دست */

  ctx.strokeStyle =
    "#6f9d58";

  ctx.lineWidth = 12;

  ctx.lineCap = "round";

  ctx.beginPath();

  ctx.moveTo(
    -18,
    -2
  );

  ctx.lineTo(
    -34,
    15
  );

  ctx.stroke();


  ctx.beginPath();

  ctx.moveTo(
    18,
    -2
  );

  ctx.lineTo(
    34,
    8
  );

  ctx.stroke();


  /* سر */

  ctx.fillStyle =
    z.type === "tank"
      ? "#527743"
      : "#76a555";

  ctx.beginPath();

  ctx.arc(
    0,
    -30,
    22,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* مو */

  ctx.fillStyle =
    "#152117";

  ctx.beginPath();

  ctx.arc(
    0,
    -37,
    18,
    Math.PI,
    Math.PI * 2
  );

  ctx.fill();


  /* چشم */

  ctx.fillStyle =
    z.type === "fast"
      ? "#ff4040"
      : "#d7ff77";

  ctx.beginPath();

  ctx.arc(
    -8,
    -31,
    4,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.beginPath();

  ctx.arc(
    8,
    -31,
    4,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* دهان */

  ctx.fillStyle =
    "#080909";

  roundRect(
    -11,
    -18,
    22,
    9,
    3
  );


  ctx.fillStyle =
    "#eee";

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


  /* جان زامبی قوی */

  if (z.hp > 1) {

    ctx.fillStyle =
      "#101312";

    roundRect(
      -27,
      -65,
      54,
      7,
      3
    );

    ctx.fillStyle =
      "#42e35d";

    ctx.fillRect(
      -26,
      -64,
      52 *
      (z.hp / 3),
      5
    );
  }


  ctx.restore();
}


/* =========================
   FIRE
========================= */

function fire() {

  bullets.push({

    x: player.x,

    y:
      player.y - 58,

    speed:
      14,

    radius: 5
  });


  muzzleFlash = 5;


  burst(
    player.x,
    player.y - 60,
    "#ffd54f",
    7
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
      20
    );

  glow.addColorStop(
    0,
    "#fff"
  );

  glow.addColorStop(
    .3,
    "#ffd740"
  );

  glow.addColorStop(
    1,
    "rgba(255,100,0,0)"
  );

  ctx.fillStyle =
    glow;

  ctx.beginPath();

  ctx.arc(
    b.x,
    b.y,
    20,
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
    b.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();
}


/* =========================
   COLLISION
========================= */

function collision(a, b) {

  return (
    Math.abs(
      a.x - b.x
    ) <
    (a.w + b.w) / 2

    &&

    Math.abs(
      a.y - b.y
    ) <
    (a.h + b.h) / 2
  );
}


/* =========================
   PARTICLES
========================= */

function burst(
  x,
  y,
  color,
  amount
) {

  for (
    let i = 0;
    i < amount;
    i++
  ) {

    particles.push({

      x,
      y,

      vx:
        (Math.random() - .5)
        * 8,

      vy:
        (Math.random() - .5)
        * 8,

      life:
        20 +
        Math.random() * 30,

      size:
        2 +
        Math.random() * 5,

      color
    });
  }
}


function drawParticles() {

  particles.forEach(
    p => {

      ctx.globalAlpha =
        p.life / 50;

      ctx.fillStyle =
        p.color;

      ctx.fillRect(
        p.x,
        p.y,
        p.size,
        p.size
      );
    }
  );

  ctx.globalAlpha = 1;
}


/* =========================
   FLOATING TEXT
========================= */

function textEffect(
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


function drawTextEffects() {

  floatingTexts.forEach(
    t => {

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
    }
  );

  ctx.globalAlpha = 1;
}


/* =========================
   GAME UPDATE
========================= */

function update(dt) {

  roadOffset +=
    7 * dt;


  /* حرکت ماشین */

  if (keys.l) {

    player.x -=
      player.speed * dt;
  }

  if (keys.r) {

    player.x +=
      player.speed * dt;
  }


  const roadWidth =
    Math.min(
      W * .92,
      560
    );


  const minX =
    (W - roadWidth) / 2 + 38;


  const maxX =
    (W + roadWidth) / 2 - 38;


  player.x =
    Math.max(
      minX,
      Math.min(
        maxX,
        player.x
      )
    );


  /* شلیک */

  player.fire -= dt;


  if (
    keys.f &&
    player.fire <= 0
  ) {

    fire();

    player.fire =
      Math.max(
        5,
        10 -
        weaponLevel * .7
      );
  }


  if (muzzleFlash > 0)
    muzzleFlash -= dt;


  /* زامبی */

  spawnTimer -= dt;


  if (
    spawnTimer <= 0
  ) {

    spawnZombie();

    spawnTimer =
      Math.max(
        14,
        42 -
        kills * .15
      );
  }


  bullets.forEach(
    b => {

      b.y -=
        b.speed * dt;
    }
  );


  zombies.forEach(
    z => {

      z.y +=
        z.speed * dt;
    }
  );


  /* برخورد */

  for (
    let i =
      zombies.length - 1;

    i >= 0;

    i--
  ) {

    const z =
      zombies[i];


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


    /* برخورد ماشین */

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

      zombies.splice(
        i,
        1
      );


      const damage =
        z.type === "tank"
          ? 28
          : 18;


      hp -=
        Math.max(
          5,
          damage -
          (armorLevel - 1) * 2
        );


      screenShake = 10;


      burst(
        z.x,
        z.y,
        "#e51b3b",
        25
      );


      textEffect(
        "-" + damage + " ❤️",
        player.x,
        player.y - 70
      );


      updateHUD();


      if (
        hp <= 0
      ) {

        hp = 0;

        endGame();
      }


      continue;
    }


    /* گلوله */

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
        ) < 32

        &&

        Math.abs(
          b.y - z.y
        ) < 45
      ) {

        bullets.splice(
          j,
          1
        );


        z.hp--;


        burst(
          b.x,
          b.y,
          "#ff334d",
          12
        );


        if (
          z.hp <= 0
        ) {

          zombies.splice(
            i,
            1
          );


          const reward =
            z.type === "tank"
              ? 15
              : z.type === "fast"
                ? 8
                : 5;


          kills++;

          coins +=
            reward;

          score +=
            z.type === "tank"
              ? 30
              : 10;


          screenShake =
            z.type === "tank"
              ? 8
              : 4;


          textEffect(
            "+" +
            reward +
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


          saveData();

          updateHUD();
        }


        break;
      }
    }
  }


  bullets =
    bullets.filter(
      b =>
        b.y > -30
    );


  particles.forEach(
    p => {

      p.x +=
        p.vx * dt;

      p.y +=
        p.vy * dt;

      p.vx *= .97;
      p.vy *= .97;

      p.life -= dt;
    }
  );


  particles =
    particles.filter(
      p =>
        p.life > 0
    );


  floatingTexts.forEach(
    t => {

      t.y -=
        .8 * dt;

      t.life -= dt;
    }
  );


  floatingTexts =
    floatingTexts.filter(
      t =>
        t.life > 0
    );


  if (
    screenShake > 0
  ) {

    screenShake -= dt;
  }
}


/* =========================
   DRAW
========================= */

function draw() {

  ctx.save();


  if (
    screenShake > 0
  ) {

    ctx.translate(
      (Math.random() - .5)
      * screenShake,

      (Math.random() - .5)
      * screenShake
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


  drawTextEffects();


  /* شلیک */

  if (
    muzzleFlash > 0
  ) {

    ctx.globalAlpha =
      muzzleFlash / 5;

    ctx.fillStyle =
      "#fff2a0";

    ctx.beginPath();

    ctx.arc(
      player.x,
      player.y - 61,
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
   GAME OVER
========================= */

function endGame() {

  gameOver = true;

  document.getElementById(
    "finalKills"
  ).textContent =
    kills;

  document.getElementById(
    "finalScore"
  ).textContent =
    score;

  document.getElementById(
    "gameover"
  ).classList.remove(
    "hidden"
  );

  saveData();
}


/* =========================
   MAIN LOOP
========================= */

function loop(time) {

  const dt =
    Math.min(
      (time - last) / 16.67,
      2
    );

  last = time;


  if (
    !gameOver &&
    !paused
  ) {

    update(dt);
  }


  draw();


  requestAnimationFrame(
    loop
  );
}


/* =========================
   INIT
========================= */

loadData();

showScreen(
  menuScreen
);

requestAnimationFrame(
  loop
);
