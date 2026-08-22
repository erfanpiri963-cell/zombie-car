const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");

let W = 0;
let H = 0;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
    );
}

window.addEventListener("resize", resize);

resize();

startBtn.addEventListener("click", function () {

    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    resize();

    gameLoop();
});


function gameLoop() {

    draw();

    requestAnimationFrame(gameLoop);
}


function draw() {

    // پس زمینه
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);


    // جاده
    const roadWidth = Math.min(W * 0.85, 500);
    const roadX = (W - roadWidth) / 2;

    ctx.fillStyle = "#343a40";
    ctx.fillRect(
        roadX,
        0,
        roadWidth,
        H
    );


    // لبه جاده
    ctx.fillStyle = "#eeeeee";

    ctx.fillRect(
        roadX,
        0,
        5,
        H
    );

    ctx.fillRect(
        roadX + roadWidth - 5,
        0,
        5,
        H
    );


    // خط وسط
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.setLineDash([40, 35]);

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


    // ماشین
    const carX = W / 2;
    const carY = H - 160;

    ctx.fillStyle = "#e51c38";

    ctx.beginPath();

    ctx.roundRect(
        carX - 30,
        carY - 50,
        60,
        100,
        12
    );

    ctx.fill();


    // شیشه
    ctx.fillStyle = "#8ed8ff";

    ctx.beginPath();

    ctx.roundRect(
        carX - 21,
        carY - 35,
        42,
        30,
        7
    );

    ctx.fill();


    // چرخ‌ها
    ctx.fillStyle = "#080808";

    ctx.fillRect(
        carX - 37,
        carY - 25,
        10,
        28
    );

    ctx.fillRect(
        carX + 27,
        carY - 25,
        10,
        28
    );

    ctx.fillRect(
        carX - 37,
        carY + 18,
        10,
        28
    );

    ctx.fillRect(
        carX + 27,
        carY + 18,
        10,
        28
    );


    // نوشته تست
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "ZOMBIE CAR",
        W / 2,
        120
    );
}
