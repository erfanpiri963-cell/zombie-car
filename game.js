const tg = window.Telegram?.WebApp; if(tg){tg.ready();tg.expand();}
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let W,H,dpr,player,bullets,zombies,particles,coins,kills,hp,score,gameOver,keys,spawnTimer,last,roadOffset;

function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize); resize();

function reset(){
 player={x:W/2,y:H-150,w:48,h:78,speed:6,fire:0};
 bullets=[];zombies=[];particles=[];coins=0;kills=0;hp=100;score=0;gameOver=false;keys={l:false,r:false,f:false};spawnTimer=0;last=performance.now();roadOffset=0;
 document.getElementById('gameover').classList.add('hidden'); updateHud();
}
function updateHud(){hp=Math.max(0,Math.round(hp));document.getElementById('hp').textContent=hp;document.getElementById('coins').textContent=coins;document.getElementById('kills').textContent=kills;}
function bind(id,key){const b=document.getElementById(id);['pointerdown'].forEach(e=>b.addEventListener(e,()=>keys[key]=true));['pointerup','pointercancel','pointerleave'].forEach(e=>b.addEventListener(e,()=>keys[key]=false));}
bind('left','l');bind('right','r');bind('fire','f');
addEventListener('keydown',e=>{if(e.key==='ArrowLeft')keys.l=true;if(e.key==='ArrowRight')keys.r=true;if(e.code==='Space')keys.f=true});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft')keys.l=false;if(e.key==='ArrowRight')keys.r=false;if(e.code==='Space')keys.f=false});
document.getElementById('restart').onclick=reset;

function rect(x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawRoad(){
 ctx.fillStyle='#182026';ctx.fillRect(0,0,W,H);
 const rw=Math.min(W*0.9,520),rx=(W-rw)/2;
 ctx.fillStyle='#343a40';ctx.fillRect(rx,0,rw,H);
 ctx.fillStyle='#9e9e9e';ctx.fillRect(rx,0,5,H);ctx.fillRect(rx+rw-5,0,5,H);
 ctx.strokeStyle='#eeeeee';ctx.lineWidth=5;ctx.setLineDash([35,30]);ctx.lineDashOffset=roadOffset;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
}
function drawCar(){
 ctx.save();ctx.translate(player.x,player.y);
 ctx.fillStyle='#1976d2';rect(-24,-39,48,78,10);
 ctx.fillStyle='#90caf9';rect(-17,-28,34,22,6);
 ctx.fillStyle='#0d47a1';rect(-20,10,40,18,5);
 ctx.fillStyle='#111';rect(-29,-25,7,20,3);rect(22,-25,7,20,3);rect(-29,8,7,20,3);rect(22,8,7,20,3);
 ctx.restore();
}
function spawn(){
 const rw=Math.min(W*0.9,520),rx=(W-rw)/2+25;
 const x=rx+Math.random()*(rw-50);
 zombies.push({x,y:-45,w:38,h:50,spd:2.0+Math.random()*1.8});
}
function drawZombie(z){
 ctx.save();ctx.translate(z.x,z.y);
 ctx.fillStyle='#66bb6a';rect(-19,-25,38,45,10);
 ctx.fillStyle='#aed581';ctx.beginPath();ctx.arc(0,-28,18,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#111';ctx.fillRect(-8,-32,5,5);ctx.fillRect(3,-32,5,5);
 ctx.fillStyle='#fff';ctx.fillRect(-9,-19,18,5);ctx.restore();
}
function fire(){
 bullets.push({x:player.x,y:player.y-42,spd:10,r:4});
}
function hit(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2 && Math.abs(a.y-b.y)<(a.h+b.h)/2}
function burst(x,y){
 for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:25});
}
function endGame(){gameOver=true;document.getElementById('finalKills').textContent=kills;document.getElementById('gameover').classList.remove('hidden');}

function loop(t){
 const dt=Math.min((t-last)/16.67,2);last=t;
 if(!gameOver){
   roadOffset+=5*dt;
   if(keys.l)player.x-=player.speed*dt;if(keys.r)player.x+=player.speed*dt;
   const rw=Math.min(W*0.9,520),minX=(W-rw)/2+30,maxX=(W+rw)/2-30;
   player.x=Math.max(minX,Math.min(maxX,player.x));
   player.fire-=dt;if(keys.f&&player.fire<=0){fire();player.fire=10;}
   spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=Math.max(18,48-kills*.15);}
   bullets.forEach(b=>b.y-=b.spd*dt);
   zombies.forEach(z=>z.y+=z.spd*dt);
   for(let i=zombies.length-1;i>=0;i--){
     const z=zombies[i];
     if(z.y>H+50){zombies.splice(i,1);continue}
     if(hit({x:player.x,y:player.y,w:player.w,h:player.h},z)){zombies.splice(i,1);hp-=18;burst(z.x,z.y);updateHud();if(hp<=0)endGame();continue}
     for(let j=bullets.length-1;j>=0;j--){
       const b=bullets[j];
       if(Math.abs(b.x-z.x)<28 && Math.abs(b.y-z.y)<35){bullets.splice(j,1);zombies.splice(i,1);kills++;coins+=5;score+=10;burst(z.x,z.y);updateHud();break}
     }
   }
   bullets=bullets.filter(b=>b.y>-20);
   particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});
   particles=particles.filter(p=>p.life>0);
 }
 drawRoad();zombies.forEach(drawZombie);drawCar();
 ctx.fillStyle='#ffd54f';bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()});
 particles.forEach(p=>{ctx.globalAlpha=p.life/25;ctx.fillStyle='#ff7043';ctx.fillRect(p.x,p.y,5,5);ctx.globalAlpha=1});
 requestAnimationFrame(loop);
}
reset();requestAnimationFrame(loop);
