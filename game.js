
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,dpr=devicePixelRatio||1;
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener("resize",resize);resize();

const SAVE="zombie_car_complete_v11";
let coins=0,kills=0,score=0,stage=1,stageKills=0,hp=100,maxHp=100,gameOver=false,gameStarted=false;
let keys={},zombies=[],bullets=[],particles=[],spawnTimer=20,shootCooldown=0,roadOffset=0,last=performance.now();
let currentWeapon="machinegun";
const weapons={
 machinegun:{name:"🔫 مسلسل",price:0,damage:12,fireRate:8,owned:true,level:1},
 shotgun:{name:"💥 شاتگان",price:250,damage:38,fireRate:32,owned:false,level:1},
 laser:{name:"⚡ لیزر",price:500,damage:55,fireRate:15,owned:false,level:1},
 rocket:{name:"🚀 موشک‌انداز",price:850,damage:95,fireRate:55,owned:false,level:1}
};
const missions=[
 {id:"kills",title:"☠️ شکارچی زامبی",desc:"۲۰ زامبی بکش",target:20,reward:75,progress:0,claimed:false},
 {id:"coins",title:"🪙 جمع‌آوری سکه",desc:"۱۰۰ سکه به‌دست بیاور",target:100,reward:100,progress:0,claimed:false},
 {id:"boss",title:"👑 شکار باس",desc:"یک باس را شکست بده",target:1,reward:250,progress:0,claimed:false}
];
let boss=null,stageTransition=false;

const car={x:W/2,y:H-110,w:46,h:72,speed:6};
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE)||"null");if(!d)return;
 coins=d.coins||0;kills=d.kills||0;score=d.score||0;stage=d.stage||1;
 if(d.weapons)for(const k in weapons)if(d.weapons[k]){weapons[k].owned=!!d.weapons[k].owned;weapons[k].level=d.weapons[k].level||1}
 if(d.currentWeapon&&weapons[d.currentWeapon]?.owned)currentWeapon=d.currentWeapon;
 if(d.missions)for(const m of d.missions){const x=missions.find(q=>q.id===m.id);if(x){x.progress=m.progress||0;x.claimed=!!m.claimed}}
 }catch(e){}}
function save(){localStorage.setItem(SAVE,JSON.stringify({coins,kills,score,stage,currentWeapon,weapons,missions}))}
function reset(){load();gameOver=false;gameStarted=false;stageKills=0;zombies=[];bullets=[];particles=[];boss=null;hp=maxHp;spawnTimer=15;car.x=W/2;updateHud()}
function target(){return 8+(stage-1)*4}
function isBossStage(){return stage%5===0}
function nextStage(){if(stageTransition||gameOver)return;stageTransition=true;stage++;stageKills=0;zombies=[];bullets=[];boss=null;document.getElementById("bossBar").style.display="none";spawnTimer=25;save();updateHud();setTimeout(()=>{stageTransition=false;spawnTimer=8},900)}
function startBoss(){if(boss||stageTransition)return;boss={x:W/2,y:150,w:110,h:85,hp:500+stage*90,max:500+stage*90};document.getElementById("bossBar").style.display="block"}
function addMission(id,n=1){const m=missions.find(x=>x.id===id);if(!m||m.claimed)return;m.progress=Math.min(m.target,m.progress+n);save();renderMissions()}
function spawnZombie(){if(isBossStage()){startBoss();return}const side=Math.random()<.5?0:W;zombies.push({x:side,y:-60,w:38,h:55,hp:35+stage*7,max:35+stage*7,speed:1.1+stage*.035,reward:5+Math.floor(stage/2)})}
function fire(){
 const w=weapons[currentWeapon];if(!w||!gameStarted||gameOver)return;
 if(currentWeapon==="shotgun")for(let a=-.22;a<=.22;a+=.11)bullets.push({x:car.x,y:car.y-40,vx:Math.sin(a)*5,vy:-12,damage:w.damage*w.level,type:"normal"});
 else bullets.push({x:car.x,y:car.y-40,vx:0,vy:currentWeapon==="rocket"?-7:-14,damage:w.damage*w.level,type:currentWeapon});
}
function hitZombie(z,b,i){
 z.hp-=b.damage;if(z.hp<=0){coins+=z.reward;kills++;stageKills++;score+=10;addMission("kills");addMission("coins",z.reward);zombies.splice(i,1);burst(z.x,z.y);if(stageKills>=target())nextStage();save();updateHud();return true}return false
}
function burst(x,y){for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:25})}
function update(dt){
 roadOffset=(roadOffset+3*dt)%80;
 if(keys.ArrowLeft||keys.a)car.x-=car.speed*dt;if(keys.ArrowRight||keys.d)car.x+=car.speed*dt;car.x=Math.max(30,Math.min(W-30,car.x));
 shootCooldown-=dt;if((keys[" "]||keys.Space||keys.Enter)&&shootCooldown<=0){fire();shootCooldown=Math.max(3,weapons[currentWeapon].fireRate)}
 spawnTimer-=dt;
 if(!stageTransition&&!isBossStage()&&spawnTimer<=0){spawnZombie();spawnTimer=Math.max(12,42-stage*1.4)}
 for(const z of zombies){z.y+=z.speed*dt;z.x+=(car.x-z.x)*.004*dt;if(Math.abs(z.x-car.x)<38&&Math.abs(z.y-car.y)<55){hp-=.5*dt;z.y=-100}}
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;let removed=false;
  if(b.type==="rocket"){for(let j=zombies.length-1;j>=0;j--)if(Math.abs(b.x-zombies[j].x)<50&&Math.abs(b.y-zombies[j].y)<60){const x=zombies[j].x,y=zombies[j].y;for(let k=zombies.length-1;k>=0;k--)if(Math.hypot(zombies[k].x-x,zombies[k].y-y)<85)hitZombie(zombies[k],b,k);removed=true;break}}
  else for(let j=zombies.length-1;j>=0;j--)if(Math.abs(b.x-zombies[j].x)<32&&Math.abs(b.y-zombies[j].y)<42){hitZombie(zombies[j],b,j);removed=true;break}
  if(boss&&!removed&&Math.abs(b.x-boss.x)<65&&Math.abs(b.y-boss.y)<55){boss.hp-=b.damage;removed=true;if(boss.hp<=0){coins+=100+stage*10;addMission("boss");addMission("coins",100+stage*10);boss=null;document.getElementById("bossBar").style.display="none";save();setTimeout(nextStage,500)}}
  if(removed||b.y<-30)bullets.splice(i,1)
 }
 if(boss){boss.x+=(car.x-boss.x)*.001*dt;document.getElementById("bossFill").style.width=Math.max(0,boss.hp/boss.max*100)+"%"}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 if(hp<=0){hp=0;gameOver=true;document.getElementById("finalScore").textContent=score;document.getElementById("gameOver").style.display="flex";save()}
 updateHud()
}
function draw(){
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#101820";ctx.fillRect(0,0,W,H);
 const rw=Math.min(W*.92,560),rx=(W-rw)/2;ctx.fillStyle="#343a40";ctx.fillRect(rx,0,rw,H);
 ctx.strokeStyle="#cfd8dc";ctx.lineWidth=4;ctx.setLineDash([32,28]);ctx.lineDashOffset=-roadOffset;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle="#1976d2";ctx.fillRect(car.x-car.w/2,car.y-car.h/2,car.w,car.h);ctx.fillStyle="#90caf9";ctx.fillRect(car.x-16,car.y-22,32,20);
 for(const z of zombies){ctx.fillStyle="#43a047";ctx.fillRect(z.x-z.w/2,z.y-z.h/2,z.w,z.h);ctx.fillStyle="#111";ctx.fillRect(z.x-11,z.y-15,7,7);ctx.fillRect(z.x+4,z.y-15,7,7);ctx.fillStyle="#e53935";ctx.fillRect(z.x-z.w/2,z.y-z.h/2-8,z.w*(z.hp/z.max),4)}
 if(boss){ctx.fillStyle="#8e24aa";ctx.fillRect(boss.x-boss.w/2,boss.y-boss.h/2,boss.w,boss.h);ctx.fillStyle="#ffeb3b";ctx.fillRect(boss.x-25,boss.y-18,14,10);ctx.fillRect(boss.x+11,boss.y-18,14,10)}
 for(const b of bullets){ctx.fillStyle=b.type==="laser"?"#00e5ff":b.type==="rocket"?"#ff9800":"#fff";ctx.fillRect(b.x-3,b.y-9,6,14)}
 for(const p of particles){ctx.fillStyle="#ffb300";ctx.fillRect(p.x,p.y,4,4)}
}
function updateHud(){document.getElementById("coins").textContent=coins;document.getElementById("kills").textContent=kills;document.getElementById("stage").textContent=stage;document.getElementById("hp").textContent=Math.ceil(hp);document.getElementById("weaponHud").textContent=weapons[currentWeapon].name+" · سطح "+weapons[currentWeapon].level}
function renderMissions(){const l=document.getElementById("missionList");l.innerHTML="";for(const m of missions){const r=document.createElement("div");r.className="row";const done=m.progress>=m.target;r.innerHTML=`<b>${m.title}</b><span class="small">${m.desc} · جایزه 🪙 ${m.reward}</span><div class="line"><b>${Math.min(m.progress,m.target)} / ${m.target}</b><button ${m.claimed||!done?"disabled":""}>${m.claimed?"✓ دریافت شد":done?"🎁 دریافت":"در حال انجام"}</button></div>`;r.querySelector("button").onclick=()=>{if(!done||m.claimed)return;m.claimed=true;coins+=m.reward;save();renderMissions();updateHud()};l.appendChild(r)}}
function weaponPrice(w){return w.price+Math.max(0,w.level-1)*Math.floor(w.price*.55)}
function renderWeapons(){const l=document.getElementById("weaponList");l.innerHTML="";for(const [id,w] of Object.entries(weapons)){const r=document.createElement("div");r.className="row weapon "+(id===currentWeapon?"active":"");r.innerHTML=`<b>${w.name} · سطح ${w.level}</b><span class="small">قدرت ${w.damage*w.level} · سرعت شلیک ${w.fireRate} · 🪙 ${weaponPrice(w)}</span><div class="line"><button>${w.owned?(id===currentWeapon?"✓ فعال":"🎯 انتخاب"):"🔓 خرید"}</button><button>⬆️ ارتقا</button></div>`;const bs=r.querySelectorAll("button");bs[0].disabled=!w.owned&&coins<w.price;bs[0].onclick=()=>{if(!w.owned){coins-=w.price;w.owned=true}currentWeapon=id;save();renderWeapons();updateHud()};bs[1].disabled=!w.owned||coins<weaponPrice(w);bs[1].onclick=()=>{const p=weaponPrice(w);if(coins>=p){coins-=p;w.level++;save();renderWeapons();updateHud()}};l.appendChild(r)}}
addEventListener("keydown",e=>{keys[e.key]=true;if([" ","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault()});addEventListener("keyup",e=>keys[e.key]=false);
document.getElementById("startGame").onclick=()=>{gameStarted=true;document.getElementById("startScreen").style.display="none";last=performance.now()};
document.getElementById("restart").onclick=()=>{location.reload()};
document.getElementById("missionBtn").onclick=()=>{renderMissions();document.getElementById("missionPanel").classList.add("show")};
document.getElementById("missionClose").onclick=()=>document.getElementById("missionPanel").classList.remove("show");
document.getElementById("weaponBtn").onclick=()=>{renderWeapons();document.getElementById("weaponPanel").classList.add("show")};
document.getElementById("weaponClose").onclick=()=>document.getElementById("weaponPanel").classList.remove("show");
load();updateHud();renderMissions();renderWeapons();
function loop(t){const dt=Math.min((t-last)/16.67,2);last=t;if(gameStarted&&!gameOver)update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
