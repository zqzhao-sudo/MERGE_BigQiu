(() => {
'use strict';
const $ = id => document.getElementById(id);
const asset = name => window.QIUQIU_ASSETS?.[name] || `assets/${name}`;
const LEVELS = [
 {key:'sleep',name:'球眠',r:20,color:'#e9e0f1'},
 {key:'wakeup',name:'起床',r:27,color:'#e7ddf0'},
 {key:'no-brain',name:'忘记带脑子了',r:35,color:'#e5dbef'},
 {key:'study',name:'球学习',r:45,color:'#e0d3ee'},
 {key:'busy',name:'忙死了',r:55,color:'#e4d5e9'},
 {key:'food',name:'疯狂星期球四',r:67,color:'#f1dfbc'},
 {key:'play',name:'粗去玩',r:80,color:'#dfe8df'},
 {key:'spirited',name:'精神倍儿棒',r:94,color:'#d8c7ee'},
 {key:'money',name:'哇！钱钱！',r:110,color:'#f0dea6'},
 {key:'birthday',name:'生日快乐',r:128,color:'#ead5f0'}
];
const STORAGE='qiuqiu-merge-v1';
let saved={best:0,failures:0,completedRounds:0,giftSeen:false,birthdayEnabled:true,sound:true};
let storageAvailable=true;
try {const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw){saved.best=Math.max(0,Number(raw.best)||0);saved.failures=Math.max(0,Number(raw.failures)||0);saved.completedRounds=Math.max(0,Number(raw.completedRounds)||0);saved.giftSeen=!!raw.giftSeen;saved.birthdayEnabled=raw.birthdayEnabled!==false;saved.sound=raw.sound!==false;}}catch{storageAvailable=false;}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{storageAvailable=false;}}
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
const imgs=LEVELS.map(l=>{const im=new Image();im.src=asset(`${l.key}.png`);return im;});
let soundOn=saved.sound, audioCtx, mergeBuffer, songBuffer, audioLoad, nextVoice=0, songSource=null;
const voiceSources=new Set();
function context(){if(!audioCtx){const A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A();}return audioCtx;}
async function decode(name){const response=await fetch(asset(name));if(!response.ok)throw Error(`Audio ${response.status}`);return context().decodeAudioData(await response.arrayBuffer());}
async function warmAudio(){
 const ctx=context();if(!ctx)return;
 if(ctx.state==='suspended'&&soundOn)await ctx.resume();
 if(!audioLoad)audioLoad=Promise.all([decode('merge.wav'),decode('birthday-8bit.mp3')]).then(([a,b])=>{mergeBuffer=a;songBuffer=b;}).catch(()=>{audioLoad=null;toast('声音暂时没准备好，点右上角 ♪ 可以重试');});
 return audioLoad;
}
function stopVoices(){for(const s of voiceSources){try{s.stop();}catch{}}voiceSources.clear();nextVoice=0;}
function stopSong(){if(songSource){try{songSource.stop();}catch{}songSource=null;}$('birthday-audio-status').textContent='';}
function playVoice(){
 if(!soundOn||!audioCtx||!mergeBuffer)return;
 const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();source.buffer=mergeBuffer;gain.gain.value=.14;source.connect(gain).connect(audioCtx.destination);
 const when=Math.max(audioCtx.currentTime+.008,nextVoice);source.start(when);nextVoice=when+mergeBuffer.duration+.012;voiceSources.add(source);source.onended=()=>{voiceSources.delete(source);source.disconnect();gain.disconnect();};
}
async function playSong(){
 stopSong();if(!soundOn){$('birthday-audio-status').textContent='声音已关闭，点击右上角 ♪ 开启';return;}
 await warmAudio();if(!$('birthday-dialog').open||!songBuffer||!soundOn)return;
 const s=audioCtx.createBufferSource(),gain=audioCtx.createGain();s.buffer=songBuffer;gain.gain.value=.35;s.connect(gain).connect(audioCtx.destination);songSource=s;$('birthday-audio-status').textContent='♪ 生日歌播放中';s.onended=()=>{if(songSource===s){songSource=null;$('birthday-audio-status').textContent='播放结束';}s.disconnect();gain.disconnect();};s.start();
}
function updateSound(){const b=$('sound-btn');b.setAttribute('aria-pressed',String(soundOn));b.querySelector('span').textContent=soundOn?'声音已开':'声音已关';}
$('sound-btn').onclick=async()=>{soundOn=!soundOn;saved.sound=soundOn;persist();updateSound();if(soundOn){await warmAudio();if($('birthday-dialog').open)playSong();}else{stopVoices();stopSong();if($('birthday-dialog').open)$('birthday-audio-status').textContent='声音已关闭';}};
updateSound();$('best').textContent=saved.best;
let status='ready', score=0, mergeCount=0, current=0, next=0, dropX=190, lastDrop=-1000, highest=0, simTime=0, overflowMs=0, pendingWin=false;
let particles=[],floaters=[],mergeQueue=[],engine,activeDrop=null,drawCount=0;
let roundBirthdayEnabled=saved.birthdayEnabled,roundBirthdayShown=false;
const W=380,H=530,LINE=110,FLOOR=520,DROP_Y=64;
const canvas=$('game'),ctx=canvas.getContext('2d');
const pixelRatio=Math.min(window.devicePixelRatio||1,2);canvas.width=W*pixelRatio;canvas.height=H*pixelRatio;ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateGift(){
 $('gift-btn').hidden=$('over-gift-btn').hidden=!saved.giftSeen;
 for(const place of ['start','pause','over']){
  $(`${place}-gift-setting`).hidden=!saved.giftSeen;
  $(`${place}-gift-enabled`).checked=saved.birthdayEnabled;
 }
 $('disable-next-gift').checked=!saved.birthdayEnabled;
}
function setBirthdayEnabled(enabled){
 if(!saved.giftSeen)return;
 saved.birthdayEnabled=!!enabled;persist();updateGift();
}
for(const place of ['start','pause','over'])$(`${place}-gift-enabled`).onchange=e=>setBirthdayEnabled(e.target.checked);
$('disable-next-gift').onchange=e=>setBirthdayEnabled(!e.target.checked);
function renderStartLevels(){
 const list=$('start-levels');list.replaceChildren();
 LEVELS.forEach((l,i)=>{const item=document.createElement('li'),im=new Image(),num=document.createElement('span');
 im.src=asset(`${l.key}.png`);im.alt=i===9?'第 10 级：神秘球球':`第 ${i+1} 级：${l.name}`;if(i===9)im.className='mystery';num.textContent=String(i+1).padStart(2,'0');item.append(im,num);list.append(item);});
}
let modalResume=false;
function openModal(dialog){
 if(status==='playing'){status='paused';modalResume=true;stopVoices();}else modalResume=false;
 $('danger-label').hidden=true;dialog.showModal();
}
function closeModal(dialog){dialog.close();}
for(const d of document.querySelectorAll('dialog')){
 d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(d));
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(d);}});
 d.addEventListener('close',()=>{if(d.id==='birthday-dialog')stopSong();if(modalResume&&status==='paused'){status='playing';modalResume=false;}});
}
function birthday(grand=false){
 if($('birthday-dialog').open)return;
 stopVoices();saved.giftSeen=true;roundBirthdayShown=true;persist();updateGift();$('birthday-tag').hidden=!grand;
 const conf=$('birthday-dialog').querySelector('.confetti');conf.replaceChildren();if(!reducedMotion)for(let i=0;i<25;i++){const p=document.createElement('i');p.style.left=`${Math.random()*100}%`;p.style.background=['#b499d0','#e0bc62','#d5a7b0','#b4c5ac'][i%4];p.style.animationDelay=`${Math.random()*-5}s`;p.style.animationDuration=`${4+Math.random()*3}s`;conf.append(p);}
 openModal($('birthday-dialog'));playSong();
}
$('gift-btn').onclick=()=>birthday();$('over-gift-btn').onclick=()=>birthday();$('back-game').onclick=()=>closeModal($('birthday-dialog'));$('replay-song').onclick=()=>playSong();
$('help-btn').onclick=$('guide-btn').onclick=()=>openModal($('help-dialog'));
// Four introductory drops, then an even draw from the first five levels.
function randomLevel(){const opening=[0,1,0,2];const index=drawCount++;return index<opening.length?opening[index]:Math.floor(Math.random()*5);}
function updateScore(){saved.best=Math.max(saved.best,score);$('score').textContent=score;$('best').textContent=saved.best;$('merge-count').textContent=mergeCount;}
function setupEngine(){
 if(!window.Matter){toast('碰撞引擎加载失败，请刷新再试一次');return false;}
 const M=Matter;engine=M.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});engine.gravity.y=1.1;
 M.Composite.add(engine.world,[M.Bodies.rectangle(-18,H/2,40,H*4,{isStatic:true,friction:.5}),M.Bodies.rectangle(W+18,H/2,40,H*4,{isStatic:true,friction:.5}),M.Bodies.rectangle(W/2,FLOOR+25,W+80,50,{isStatic:true,friction:.6})]);
 M.Events.on(engine,'collisionStart',queueMerges);M.Events.on(engine,'collisionActive',queueMerges);return true;
}
function balls(){return Matter.Composite.allBodies(engine.world).filter(b=>b.plugin.qiuqiu);}
function spawn(level,x,y,merged=false){const l=LEVELS[level];const b=Matter.Bodies.circle(Math.max(l.r+3,Math.min(W-l.r-3,x)),y,l.r,{restitution:.18,friction:.18,frictionStatic:.35,frictionAir:.004,density:.0018,sleepThreshold:55});b.plugin.qiuqiu={level,born:simTime,merged:false,landed:merged};Matter.Composite.add(engine.world,b);if(merged)Matter.Body.setVelocity(b,{x:0,y:-1.3});return b;}
function queueMerges(e){
 if(status!=='playing')return;
 for(const p of e.pairs){const a=p.bodyA,b=p.bodyB,aa=a.plugin.qiuqiu,bb=b.plugin.qiuqiu;
 if(aa&&(bb||b.isStatic&&b.position.y>=FLOOR))aa.landed=true;if(bb&&(aa||a.isStatic&&a.position.y>=FLOOR))bb.landed=true;
 if(!aa||!bb||aa.merged||bb.merged||aa.level!==bb.level||aa.level>=9)continue;
 aa.merged=bb.merged=true;mergeQueue.push([a,b]);
 }
}
function processMerges(){
 const batch=mergeQueue;mergeQueue=[];
 for(const [a,b] of batch){const level=a.plugin.qiuqiu.level+1,x=(a.position.x+b.position.x)/2,y=Math.min(FLOOR-LEVELS[level].r,(a.position.y+b.position.y)/2);
 Matter.Composite.remove(engine.world,[a,b]);const ball=spawn(level,x,y,true);highest=Math.max(highest,level);score+=2**level*5;mergeCount++;playVoice();
 floaters.push({x:ball.position.x,y:ball.position.y-LEVELS[level].r-7,text:LEVELS[level].name,age:0});
 if(!reducedMotion)for(let i=0;i<12;i++){const angle=Math.random()*Math.PI*2;particles.push({x,y,vx:Math.cos(angle)*(1+Math.random()*2),vy:Math.sin(angle)*2-1,life:35,color:i%3===0?'#d3b054':'#b398cc'});}
 if(level===9)pendingWin=true;
 }if(batch.length){updateScore();persist();$('game-status').textContent='相同等级相碰即可合成';}
}
function drop(){
 if(status!=='playing'||simTime-lastDrop<420||(activeDrop&&!activeDrop.plugin.qiuqiu.landed&&!activeDrop.plugin.qiuqiu.merged))return;
 activeDrop=spawn(current,dropX,DROP_Y);highest=Math.max(highest,current);updateScore();persist();lastDrop=simTime;current=next;next=randomLevel();dropX=Math.max(LEVELS[current].r+4,Math.min(W-LEVELS[current].r-4,dropX));
}
function start(){
 stopVoices();stopSong();if(engine)Matter.Engine.clear(engine);if(!setupEngine())return;
 score=0;mergeCount=0;highest=0;simTime=0;lastDrop=-1000;overflowMs=0;particles=[];floaters=[];mergeQueue=[];pendingWin=false;roundBirthdayShown=false;roundBirthdayEnabled=saved.birthdayEnabled;activeDrop=null;drawCount=0;current=randomLevel();next=randomLevel();dropX=W/2;status='playing';
 $('start-panel').hidden=$('over-panel').hidden=$('pause-panel').hidden=true;$('danger-label').hidden=true;$('pause-btn').disabled=false;$('game-status').textContent='左右瞄准，松手落下';updateScore();warmAudio();canvas.focus({preventScroll:true});if(!storageAvailable)toast('当前浏览器无法保存进度，本次仍可正常游玩');
}
function pause(){if(status!=='playing')return;status='paused';$('pause-panel').hidden=false;$('danger-label').hidden=true;stopVoices();}
function resume(){if(status!=='paused'||document.querySelector('dialog[open]'))return;status='playing';$('pause-panel').hidden=true;canvas.focus({preventScroll:true});}
function gameOver(){
 if(status!=='playing')return;
 status='over';saved.failures++;saved.completedRounds++;persist();stopVoices();$('danger-label').hidden=true;$('over-panel').hidden=false;$('pause-btn').disabled=true;$('final-score').textContent=score;$('game-status').textContent='本局结束';
 if(roundBirthdayEnabled&&!roundBirthdayShown)birthday();
 updateGift();
}
$('start-btn').onclick=$('retry-btn').onclick=$('restart-btn').onclick=start;$('pause-btn').onclick=pause;$('resume-btn').onclick=resume;
function pointerX(e){const box=canvas.getBoundingClientRect();const r=LEVELS[current].r;dropX=Math.max(r+4,Math.min(W-r-4,(e.clientX-box.left)/box.width*W));}
let pointerHeld=false;
canvas.addEventListener('pointerdown',e=>{if(status!=='playing')return;e.preventDefault();pointerHeld=true;pointerX(e);canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(status==='playing'&&(e.pointerType==='mouse'||pointerHeld))pointerX(e);});
canvas.addEventListener('pointerup',e=>{if(!pointerHeld)return;pointerHeld=false;pointerX(e);drop();});
canvas.addEventListener('pointercancel',()=>{pointerHeld=false;});
canvas.addEventListener('keydown',e=>{if(status!=='playing')return;if(['ArrowLeft','ArrowRight',' ','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')dropX=Math.max(LEVELS[current].r+4,dropX-15);else if(e.key==='ArrowRight')dropX=Math.min(W-LEVELS[current].r-4,dropX+15);else if(!e.repeat)drop();}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){if(status==='playing')pause();else if(status==='paused')resume();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopSong();}});
function tick(dt){
 simTime+=dt;Matter.Engine.update(engine,dt);processMerges();
 const overflow=balls().some(b=>b.plugin.qiuqiu.landed&&simTime-b.plugin.qiuqiu.born>700&&b.position.y-b.circleRadius<LINE&&b.speed<2.5);
 overflowMs=overflow?overflowMs+dt:Math.max(0,overflowMs-dt*3);$('danger-label').hidden=overflowMs<200;
 if(overflowMs>=1000)gameOver();
 if(pendingWin&&status==='playing'){pendingWin=false;if(roundBirthdayEnabled&&!roundBirthdayShown)birthday(true);else toast('合成第 10 级！');}
}
function drawBall(level,x,y,r,angle=0,alpha=1){
 const l=LEVELS[level];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.shadowColor='#75617f16';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=l.color;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ae94c0';ctx.lineWidth=1.4;ctx.stroke();
 ctx.save();ctx.rotate(Math.sin(angle)*.22);const im=imgs[level];if(im.complete&&im.naturalWidth){const s=r*1.7,scale=Math.min(s/im.naturalWidth,s/im.naturalHeight);ctx.drawImage(im,-im.naturalWidth*scale/2,-im.naturalHeight*scale/2,im.naturalWidth*scale,im.naturalHeight*scale);}ctx.restore();
 if(r>30){ctx.beginPath();ctx.arc(r*.61,r*.67,8,0,Math.PI*2);ctx.fillStyle='#fffcf5';ctx.fill();ctx.fillStyle='#967bab';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(level+1),r*.61,r*.67+.4);}ctx.restore();
}
function draw(delta){
 ctx.clearRect(0,0,W,H);ctx.save();ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(16,LINE);ctx.lineTo(W-16,LINE);ctx.strokeStyle=overflowMs>200?'#cb8d7b':'#d8c7e0';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 if(engine)for(const b of balls())drawBall(b.plugin.qiuqiu.level,b.position.x,b.position.y,b.circleRadius,b.angle);
 if(status==='playing'){
 const r=LEVELS[current].r;ctx.save();ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(dropX,DROP_Y+r+3);ctx.lineTo(dropX,H-12);ctx.strokeStyle='#bda6ce40';ctx.stroke();ctx.restore();drawBall(current,dropX,DROP_Y,r,0,.75);
 }
 if(status==='playing'){
 for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.045;p.life--;ctx.globalAlpha=Math.max(0,p.life/35);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,Math.PI*2);ctx.fill();}particles=particles.filter(p=>p.life>0);
 for(const f of floaters){f.age+=delta;const opacity=Math.max(0,1-f.age/1250);ctx.globalAlpha=opacity;ctx.font='bold 13px "PingFang SC",system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(f.text).width+24;const x=Math.max(width/2+8,Math.min(W-width/2-8,f.x)),y=Math.max(112,f.y-f.age*.018);ctx.fillStyle='#fffcf5';ctx.beginPath();ctx.roundRect(x-width/2,y-13,width,26,10);ctx.fill();ctx.fillStyle='#8c679e';ctx.fillText(f.text,x,y);}floaters=floaters.filter(f=>f.age<1250);
 }ctx.globalAlpha=1;
}
let lastTime=0,accumulator=0;
function frame(time){const delta=Math.min(time-lastTime||16.67,60);lastTime=time;if(status==='playing'){accumulator+=delta;let n=0;while(accumulator>=1000/60&&n<4&&status==='playing'){tick(1000/60);accumulator-=1000/60;n++;}}else accumulator=0;draw(delta);requestAnimationFrame(frame);}
renderStartLevels();updateGift();requestAnimationFrame(frame);
// Read-only diagnostic state helps verify the real game without changing its rules.
window.QiuqiuGame={getSnapshot:()=>({status,score,mergeCount,highest:highest+1,failures:saved.failures,completedRounds:saved.completedRounds,giftAvailable:saved.giftSeen,birthdayEnabled:saved.birthdayEnabled,soundOn,balls:engine?balls().map(b=>({level:b.plugin.qiuqiu.level+1,x:b.position.x,y:b.position.y})):[]})};
})();
