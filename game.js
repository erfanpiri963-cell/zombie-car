const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ctx.fillStyle = "red";
ctx.fillRect(50, 50, 200, 200);

ctx.fillStyle = "white";
ctx.font = "30px Arial";
ctx.fillText("TEST", 80, 150);
