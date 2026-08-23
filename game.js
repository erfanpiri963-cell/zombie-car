const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();}

const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W,H,dpr,player,bullets=[],zombies=[],particles=[];
let coins=0,kills=0,hp=100,maxHp=100,score=0,gameOver=false,keys={},spawnTimer=0,last=performance.now(),roadOffset=0;
let stage=1,stageKills=0,stageChanging=false;

const upgrades={hp:0,speed:0,fire:0,damage:0,armor:0};
const baseCost={hp:30,speed:40,fire:45,damage:60,armor:70};

function cost(type){return Math.floor(baseCost[type]*Math.pow(1.55,upgrades[type]));}
function armorFactor(){return Math.max(.35,1-upgrades.armor*.08);}
function fireDelay(){return Math.max(3.5,8-upgrades.fire*.7);}
function bulletPower(){return 1+upgrades.damage;}

function resize(){
 dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
 canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+"px";canvas.style.height=H+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize);resize();

function updateHud(){
 document.getElementById("hp").textContent=Math.max(0,Math.round(hp));
 document.getElementById("coins").textContent=coins;
 document.getElementById("kills").textContent=kills;
 document.getElementById("stageNum").textContent=stage;
 document.getElementById("shopCoins").textContent=coins;
 updateShop();
}

function updateShop(){
 for(const t of Object.keys(upgrades)){
  const level=document.getElementById(t+"Level"),costEl=document.getElementById(t+"Cost"),btn=document.querySelector('[data-upgrade="'+t+'"]');
  if(level)level.textContent=upgrades[t];
  if(costEl)costEl.textContent=cost(t);
  if(btn)btn.disabled=coins<cost(t);
 }
}


const SAVE_KEY="zombieCarSave_v2";

function saveProgress(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins,
      upgrades
    }));
  }catch(e){}
}

function loadProgress(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return;
    const data=JSON.parse(raw);
    if(Number.isFinite(data.coins)) coins=Math.max(0,Math.floor(data.coins));
    if(data.upgrades){
      for(const k of Object.keys(upgrades)){
        if(Number.isFinite(data.upgrades[k])){
          upgrades[k]=Math.max(0,Math.floor(data.upgrades[k]));
        }
      }
    }
    maxHp=100+upgrades.hp*25;
    hp=maxHp;
  }catch(e){}
}

function clearProgress(){
  try{localStorage.removeItem(SAVE_KEY)}catch(e){}
}

function reset(){
 player={x:W/2,y:H-180,w:58,h:95,speed:7,fire:0};
 bullets=[];zombies=[];particles=[];coins=0;kills=0;hp=100;maxHp=100;score=0;gameOver=false;
 stage=1;stageKills=0;stageChanging=false;
 keys={l:false,r:false,f:false};
 loadProgress();spawnTimer=0;roadOffset=0;last=performance.now();
 document.getElementById("gameover").classList.add("hidden");document.getElementById("shop").classList.add("hidden");updateHud();
}

function bind(id,key){
 const b=document.getElementById(id);if(!b)return;
 b.addEventListener("pointerdown",e=>{e.preventDefault();keys[key]=true});
 ["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[key]=false}));
}
bind("left","l");bind("right","r");bind("fire","f");
addEventListener("keydown",e=>{if(e.key==="ArrowLeft")keys.l=true;if(e.key==="ArrowRight")keys.r=true;if(e.code==="Space")keys.f=true});
addEventListener("keyup",e=>{if(e.key==="ArrowLeft")keys.l=false;if(e.key==="ArrowRight")keys.r=false;if(e.code==="Space")keys.f=false});
document.getElementById("restart").onclick=reset;

const shop=document.getElementById("shop");
document.getElementById("shopBtn").onclick=()=>{keys.l=keys.r=keys.f=false;shop.classList.remove("hidden");updateShop()};
document.getElementById("closeShop").onclick=()=>shop.classList.add("hidden");

document.querySelectorAll(".buy").forEach(btn=>{
 btn.onclick=()=>{
  const type=btn.dataset.upgrade,c=cost(type);if(coins<c)return;
  coins-=c;upgrades[type]++;
  if(type==="hp"){maxHp+=25;hp=Math.min(maxHp,hp+25)}
  saveProgress();
  updateHud();
 };
});

function rr(x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}

function drawRoad(){
 ctx.fillStyle="#111820";ctx.fillRect(0,0,W,H);
 const rw=Math.min(W*.92,560),rx=(W-rw)/2;
 ctx.fillStyle="#596168";ctx.fillRect(rx-8,0,8,H);ctx.fillRect(rx+rw,0,8,H);
 const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,"#20272c");g.addColorStop(.5,"#343b40");g.addColorStop(1,"#20272c");
 ctx.fillStyle=g;ctx.fillRect(rx,0,rw,H);
 ctx.strokeStyle="#f1f1f1";ctx.lineWidth=6;ctx.setLineDash([55,55]);ctx.lineDashOffset=roadOffset;
 ctx.beginPath();ctx.moveTo(W/2,-100);ctx.lineTo(W/2,H+100);ctx.stroke();ctx.setLineDash([]);
 roadOffset+=6+(stage*.25);if(roadOffset>110)roadOffset=0;
}

function drawCar(){
 ctx.save();ctx.translate(player.x,player.y);
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(0,38,38,14,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#080a0c";rr(-34,-30,12,28,5);rr(22,-30,12,28,5);rr(-34,18,12,28,5);rr(22,18,12,28,5);
 const g=ctx.createLinearGradient(-30,0,30,0);g.addColorStop(0,"#9d0718");g.addColorStop(.5,"#ef233c");g.addColorStop(1,"#9d0718");ctx.fillStyle=g;rr(-29,-48,58,96,13);
 ctx.fillStyle="#c51629";rr(-23,-35,46,42,9);
 const glass=ctx.createLinearGradient(0,-32,0,5);glass.addColorStop(0,"#d9f5ff");glass.addColorStop(.45,"#607d8b");glass.addColorStop(1,"#263b45");ctx.fillStyle=glass;rr(-20,-31,40,30,7);
 ctx.fillStyle="#fff3a0";rr(-20,-46,13,7,3);rr(7,-46,13,7,3);ctx.fillStyle="#ff182e";rr(-20,38,13,6,3);rr(7,38,13,6,3);ctx.restore();
}

function spawnZombie(){
 const rw=Math.min(W*.92,560),rx=(W-rw)/2+45;
 let type="normal",r=Math.random();
 if(stage>=2&&r>.68)type="fast";
 if(stage>=3&&r>.84)type="strong";
 const z={type,x:rx+Math.random()*(rw-90),y:-70,w:50,h:70,wobble:Math.random()*Math.PI*2};
 if(type==="fast")Object.assign(z,{w:42,h:62,spd:2.8+Math.random()*1.4+stage*.15,hp:1,maxHp:1,reward:8});
 else if(type==="strong")Object.assign(z,{w:58,h:78,spd:1.0+Math.random()*.6+stage*.1,hp:3+Math.floor(stage/3),maxHp:3+Math.floor(stage/3),reward:15});
 else Object.assign(z,{spd:1.7+Math.random()*1.5+kills*.01,hp:1,maxHp:1,reward:5});
 zombies.push(z);
}

function drawZombie(z){
 ctx.save();ctx.translate(z.x+Math.sin(z.wobble)*3,z.y);
 const c=z.type==="fast"?"#8e44ad":z.type==="strong"?"#795548":"#75a653";
 ctx.fillStyle="rgba(0,0,0,.5)";ctx.beginPath();ctx.ellipse(0,38,z.type==="strong"?34:30,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=c;rr(-22,-12,44,45,12);ctx.beginPath();ctx.arc(0,-30,z.type==="strong"?25:22,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=z.type==="strong"?"#9e8278":z.type==="fast"?"#ce93d8":"#79a957";ctx.lineWidth=z.type==="strong"?15:13;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(-18,-3);ctx.lineTo(-34,16);ctx.moveTo(18,-3);ctx.lineTo(35,7);ctx.stroke();
 ctx.fillStyle=z.type==="fast"?"#ffeb3b":"#d5f47b";ctx.beginPath();ctx.arc(-8,-32,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(8,-32,4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#111";rr(-10,-18,20,8,2);
 ctx.fillStyle="#111";rr(-25,-63,50,6,3);ctx.fillStyle=z.hp/z.maxHp>.5?"#27e65f":"#ff5252";ctx.fillRect(-24,-62,48*(z.hp/z.maxHp),4);
 ctx.restore();
}

function fire(){bullets.push({x:player.x,y:player.y-55,spd:13,r:5,damage:bulletPower()});burst(player.x,player.y-55,"#ffd54f",3)}
function hit(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2}
function burst(x,y,color="#ff7043",amount=12){for(let i=0;i<amount;i++)particles.push({x,y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:25+Math.random()*20,color})}
function endGame(){gameOver=true;document.getElementById("finalKills").textContent=kills;document.getElementById("finalStage").textContent=stage;document.getElementById("gameover").classList.remove("hidden")}

function nextStage(){
 if(stageChanging)return;stageChanging=true;stage++;stageKills=0;zombies=[];bullets=[];updateHud();
 setTimeout(()=>{stageChanging=false},1000);
}

function update(dt){
 if(keys.l)player.x-=player.speed*(1+upgrades.speed*.12)*dt;
 if(keys.r)player.x+=player.speed*(1+upgrades.speed*.12)*dt;
 const rw=Math.min(W*.92,560),minX=(W-rw)/2+38,maxX=(W+rw)/2-38;player.x=Math.max(minX,Math.min(maxX,player.x));
 player.fire-=dt;if(keys.f&&player.fire<=0&&!shop.classList.contains("hidden"))keys.f=false;
 if(keys.f&&player.fire<=0){fire();player.fire=fireDelay()}
 spawnTimer-=dt;
 if(spawnTimer<=0&&!stageChanging){spawnZombie();spawnTimer=Math.max(13,43-stage*4-kills*.1)}
 bullets.forEach(b=>b.y-=b.spd*dt);zombies.forEach(z=>{z.y+=z.spd*dt;z.wobble+=.08*dt});
 for(let i=zombies.length-1;i>=0;i--){
  const z=zombies[i];
  if(z.y>H+100){zombies.splice(i,1);continue}
  if(hit({x:player.x,y:player.y,w:player.w,h:player.h},z)){
   zombies.splice(i,1);const damage=(z.type==="strong"?30:z.type==="fast"?15:20)*armorFactor();hp-=damage;burst(z.x,z.y,"#ff1744",18);updateHud();
   if(hp<=0){hp=0;updateHud();endGame()}continue;
  }
  for(let j=bullets.length-1;j>=0;j--){
   const b=bullets[j];
   if(Math.abs(b.x-z.x)<32&&Math.abs(b.y-z.y)<42){
    bullets.splice(j,1);z.hp-=b.damage;burst(z.x,z.y,"#ff7043",8);
    if(z.hp<=0){zombies.splice(i,1);kills++;stageKills++;coins+=z.reward;score+=10;saveProgress();burst(z.x,z.y,"#ff7043",20);updateHud();if(stageKills>=8+(stage-1)*7&&stage<20)nextStage()}
    break;
   }
  }
 }
 bullets=bullets.filter(b=>b.y>-30);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt});
 particles=particles.filter(p=>p.life>0);
}

function draw(){
 drawRoad();zombies.forEach(drawZombie);drawCar();
 bullets.forEach(b=>{ctx.fillStyle="#ffd54f";ctx.shadowColor="#ff9800";ctx.shadowBlur=12;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0});
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/40);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5)});ctx.globalAlpha=1;
}

function loop(t){const dt=Math.min((t-last)/16.67,2);last=t;if(!gameOver)update(dt);draw();requestAnimationFrame(loop)}
reset();requestAnimationFrame(loop);


const resetSaveBtn=document.getElementById("resetSave");
if(resetSaveBtn){
  resetSaveBtn.onclick=()=>{
    if(confirm("پیشرفت ذخیره‌شده پاک شود؟")){
      clearProgress();
      coins=0;
      for(const k of Object.keys(upgrades))upgrades[k]=0;
      maxHp=100; hp=100;
      updateHud();
    }
  };
}
