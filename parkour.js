
(() => {
  // THUNDERCLOUD: RETRO SKY RUNNER
  const old = document.querySelector("#thundercloud-game");
  if (old) old.remove();

  const game = document.createElement("div");
  game.id = "thundercloud-game";
  game.style.cssText = `
    max-width:900px;margin:16px auto;background:#10152e;color:white;
    font:14px monospace;border:4px solid #465b9a;
  `;
  game.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;
      flex-wrap:wrap;padding:12px">
      <b>☁ THUNDERCLOUD ADVENTURE</b>
      <span id="tc-stats">COINS: 0 | HEARTS: ♥ ♥ ♥</span>
    </div>
    <canvas id="tc-canvas" width="480" height="270"
      style="display:block;width:100%;height:auto;image-rendering:pixelated;
      touch-action:none"></canvas>
    <div style="display:flex;justify-content:space-around;gap:8px;
      padding:12px;flex-wrap:wrap">
      <button id="tc-left">◀ LEFT</button>
      <button id="tc-right">RIGHT ▶</button>
      <button id="tc-jump">⚡ JUMP</button>
      <button id="tc-reset">↻ RESTART</button>
    </div>
    <p id="tc-message" style="text-align:center;padding:0 8px">
      Collect coins and reach the lightning flag!
    </p>
  `;
  document.body.appendChild(game);

  game.querySelectorAll("button").forEach(b => {
    b.style.cssText = `background:#293c78;color:white;border:2px solid #91baff;
      padding:10px 14px;font:bold 13px monospace;cursor:pointer`;
  });

  const canvas = game.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const W = 480, H = 270;
  ctx.imageSmoothingEnabled = false;

  const stats = document.querySelector("#tc-stats");
  const message = document.querySelector("#tc-message");
  const keys = {};
  let jumpQueued = false;
  let camera = 0;
  let coins = 0;
  let hearts = 3;
  let checkpoint = 0;
  let won = false;
  let tick = 0;
  let invulnerable = 0;

  const platforms = [
    {x:0,y:228,w:190},
    {x:235,y:205,w:65},
    {x:325,y:177,w:65},
    {x:420,y:205,w:70},
    {x:525,y:165,w:75},
    {x:635,y:190,w:65},
    {x:730,y:140,w:80},
    {x:845,y:170,w:65},
    {x:950,y:205,w:80},
    {x:1060,y:160,w:75},
    {x:1170,y:185,w:80},
    {x:1290,y:135,w:90},
    {x:1420,y:185,w:100},
    {x:1560,y:220,w:180}
  ];

  const checkpoints = [
    {x:35,y:228},
    {x:730,y:140},
    {x:1290,y:135}
  ];

  const player = {
    x:35,y:190,w:26,h:25,vx:0,vy:0,
    grounded:false,jumps:0,facing:1
  };

  const treasure = [];
  platforms.forEach((p,i) => {
    if (i > 0 && i < platforms.length-1) {
      treasure.push({
        x:p.x+p.w/2,
        y:p.y-20,
        got:false
      });
    }
  });

  const hazards = [
    {x:440,y:193,w:25,h:12},
    {x:750,y:128,w:28,h:12},
    {x:1080,y:148,w:25,h:12},
    {x:1450,y:173,w:30,h:12}
  ];

  function onDown(code) {
    if (!keys[code] && ["Space","ArrowUp","KeyW"].includes(code))
      jumpQueued = true;
    keys[code] = true;
  }
  function onUp(code) { keys[code] = false; }

  function keydown(e) {
    if (["Space","ArrowUp","ArrowLeft","ArrowRight"].includes(e.code))
      e.preventDefault();
    onDown(e.code);
  }
  function keyup(e) { onUp(e.code); }

  addEventListener("keydown",keydown);
  addEventListener("keyup",keyup);

  function hold(id,code) {
    const b = document.getElementById(id);
    b.addEventListener("pointerdown",e=>{
      e.preventDefault();
      onDown(code);
      b.setPointerCapture(e.pointerId);
    });
    const release=e=>{e.preventDefault();onUp(code);};
    b.addEventListener("pointerup",release);
    b.addEventListener("pointercancel",release);
    b.addEventListener("lostpointercapture",()=>onUp(code));
  }
  hold("tc-left","ArrowLeft");
  hold("tc-right","ArrowRight");
  hold("tc-jump","Space");

  function rect(x,y,w,h,c) {
    ctx.fillStyle=c;
    ctx.fillRect(Math.round(x),Math.round(y),w,h);
  }

  function cloudShape(x,y,s,color) {
    rect(x+5*s,y+5*s,18*s,11*s,color);
    rect(x+2*s,y+9*s,24*s,8*s,color);
    rect(x+7*s,y+2*s,8*s,7*s,color);
    rect(x+15*s,y+4*s,8*s,8*s,color);
  }

  function background() {
    rect(0,0,W,H,"#3899e8");
    // Retro sky clouds
    for(let i=0;i<7;i++){
      let x=((i*91-camera*.18)%(W+65)+W+65)%(W+65)-25;
      let y=24+(i%3)*31;
      cloudShape(x,y,1.3,"#a8ddff");
      rect(x+8,y+4,14,4,"#d8f2ff");
    }
    // Distant mountains
    for(let i=0;i<8;i++){
      const x=i*90-camera*.28;
      ctx.fillStyle="#347ec6";
      ctx.beginPath();
      ctx.moveTo(x-40,240);
      ctx.lineTo(x+35,125+(i%3)*15);
      ctx.lineTo(x+110,240);
      ctx.fill();
    }
    rect(0,246,W,24,"#2465a6");
    rect(0,246,W,3,"#69caff");
  }

  function platform(p) {
    const x=Math.round(p.x-camera);
    rect(x,p.y,p.w,30,"#344678");
    rect(x,p.y,p.w,5,"#a5f65d");
    rect(x,p.y+5,p.w,4,"#48b94c");
    for(let i=8;i<p.w;i+=16){
      rect(x+i,p.y+13,7,6,"#52669b");
      rect(x+i+5,p.y+23,5,4,"#27365f");
    }
    rect(x+4,p.y+8,4,3,"#d0ff83");
  }

  function drawThundercloud() {
    const x=Math.round(player.x-camera);
    const y=Math.round(player.y);
    const blink=invulnerable>0 && Math.floor(tick*15)%2===0;
    if(blink)return;

    // Soft pixel shadow
    rect(x+3,y+24,22,3,"#205a96");

    // Cloud outline
    rect(x+5,y+2,16,3,"#334a83");
    rect(x+2,y+5,23,12,"#334a83");
    rect(x+5,y+16,17,4,"#334a83");

    // Cloud body
    rect(x+6,y+4,14,3,"#eaf5ff");
    rect(x+4,y+7,19,9,"#c8e8ff");
    rect(x+7,y+16,13,2,"#a2cfff");
    rect(x+9,y+5,7,3,"#ffffff");

    // Cute eyes and cheeks
    rect(x+8,y+10,3,4,"#25335c");
    rect(x+18,y+10,3,4,"#25335c");
    rect(x+6,y+14,4,2,"#f38cae");
    rect(x+20,y+14,3,2,"#f38cae");

    // Lightning bolt under the cloud
    ctx.fillStyle="#ffdb48";
    ctx.beginPath();
    ctx.moveTo(x+13,y+18);
    ctx.lineTo(x+20,y+18);
    ctx.lineTo(x+15,y+24);
    ctx.lineTo(x+19,y+24);
    ctx.lineTo(x+10,y+32);
    ctx.lineTo(x+12,y+25);
    ctx.lineTo(x+9,y+25);
    ctx.fill();
  }

  function drawCoin(c) {
    if(c.got)return;
    const x=Math.round(c.x-camera);
    const y=Math.round(c.y);
    rect(x-4,y-7,9,14,"#a96022");
    rect(x-3,y-7,7,12,"#ffcb42");
    rect(x-1,y-5,3,8,"#fff3a4");
    rect(x-3,y-5,2,3,"#ffffff");
  }

  function flag(x,y,active) {
    const sx=Math.round(x-camera);
    rect(sx,y,3,34,"#f2f5ff");
    rect(sx+3,y,18,12,active?"#ff64cb":"#7a85a8");
    rect(sx+7,y+3,4,3,"#ffffff");
    rect(sx+9,y+6,3,3,"#ffffff");
    rect(sx+6,y+9,4,3,"#ffffff");
  }

  function spikes(h) {
    const x=h.x-camera;
    ctx.fillStyle="#f0f2ff";
    for(let sx=x;sx<x+h.w;sx+=10){
      ctx.beginPath();
      ctx.moveTo(sx,h.y+h.h);
      ctx.lineTo(sx+5,h.y);
      ctx.lineTo(sx+10,h.y+h.h);
      ctx.fill();
    }
    rect(x,h.y+h.h-2,h.w,3,"#7d9dc8");
  }

  function respawn() {
    hearts--;
    if(hearts<=0){
      hearts=3;
      coins=0;
      treasure.forEach(c=>c.got=false);
      checkpoint=0;
      message.textContent="Storm reset! Try again!";
    } else {
      message.textContent="Zap! Back to checkpoint!";
    }
    const cp=checkpoints[checkpoint];
    player.x=cp.x;
    player.y=cp.y-25;
    player.vx=player.vy=0;
    player.jumps=0;
    invulnerable=1.4;
  }

  function reset() {
    player.x=35;player.y=190;
    player.vx=player.vy=0;
    player.jumps=0;player.grounded=false;
    camera=0;coins=0;hearts=3;checkpoint=0;
    won=false;tick=0;invulnerable=0;
    treasure.forEach(c=>c.got=false);
    message.textContent="Collect coins and reach the lightning flag!";
  }
  document.getElementById("tc-reset").onclick=reset;

  let last=performance.now();

  function update(dt) {
    tick+=dt;
    invulnerable=Math.max(0,invulnerable-dt);
    if(won)return;

    const left=keys.ArrowLeft||keys.KeyA;
    const right=keys.ArrowRight||keys.KeyD;

    if(left){player.vx=-135;player.facing=-1;}
    else if(right){player.vx=135;player.facing=1;}
    else player.vx*=Math.pow(.002,dt);

    if(jumpQueued){
      if(player.jumps<2){
        player.vy=player.jumps===0?-260:-225;
        player.jumps++;
        player.grounded=false;
      }
      jumpQueued=false;
    }

    const oldBottom=player.y+player.h;
    player.vy=Math.min(400,player.vy+620*dt);
    player.x+=player.vx*dt;
    player.y+=player.vy*dt;
    player.grounded=false;

    if(player.vy>=0){
      for(const p of platforms){
        const bottom=player.y+player.h;
        if(player.x+player.w>p.x&&player.x<p.x+p.w&&
           oldBottom<=p.y+2&&bottom>=p.y&&bottom<=p.y+18){
          player.y=p.y-player.h;
          player.vy=0;
          player.grounded=true;
          player.jumps=0;
          break;
        }
      }
    }

    player.x=Math.max(0,player.x);

    for(const c of treasure){
      if(!c.got&&Math.abs(player.x+13-c.x)<17&&
         Math.abs(player.y+12-c.y)<18){
        c.got=true;
        coins++;
        message.textContent="Coin collected! ✨";
      }
    }

    for(let i=0;i<checkpoints.length;i++){
      const cp=checkpoints[i];
      if(player.grounded&&player.x>=cp.x&&
         player.x<cp.x+22&&checkpoint<i){
        checkpoint=i;
        message.textContent="CHECKPOINT ACTIVATED!";
      }
    }

    if(invulnerable<=0){
      for(const h of hazards){
        if(player.x+player.w>h.x&&player.x<h.x+h.w&&
           player.y+player.h>h.y&&player.y<h.y+h.h){
          respawn();break;
        }
      }
    }

    if(player.y>H+60)respawn();

    if(player.x>1680&&player.grounded){
      won=true;
      message.textContent=`YOU SAVED THE SKY! Coins: ${coins} ⚡`;
    }

    camera=Math.max(0,Math.min(player.x-150,1680-W/2));
    stats.textContent=`COINS: ${coins} | HEARTS: ${"♥ ".repeat(hearts)} | LEVEL 1`;

    window.thundercloudState={
      coins,hearts,checkpoint,won,
      x:player.x,y:player.y
    };
  }

  function frame(now){
    const dt=Math.min((now-last)/1000,.035);
    last=now;
    update(dt);

    background();
    platforms.forEach(platform);
    checkpoints.forEach((cp,i)=>flag(cp.x,cp.y-34,i<=checkpoint));
    flag(1690,186,true);
    treasure.forEach(drawCoin);
    hazards.forEach(spikes);
    drawThundercloud();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
