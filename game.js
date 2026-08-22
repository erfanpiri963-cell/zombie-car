const startBtn = document.getElementById("startBtn");
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");

startBtn.onclick = function () {
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
};

console.log("Zombie Car loaded successfully");
