/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('canvas');
/** @type {CanvasRenderingContext2D} */
const ctx    = canvas.getContext('2d');
/** @type {HTMLElement} */
const wrap   = document.getElementById('canvas-wrap');

/** @type {number} */
const G = 9.8;
/** @type {'incline'|'connected'|'spring'|'circular'} */
let mode = 'incline';

/** @type {HTMLImageElement} */
const penguinImg = new Image();
penguinImg.src = './assets/penguin.png';
penguinImg.onload = () => draw();

/**
 * resizes the canvas to match the wrapper element's current dimensions
 */
function resizeCanvas() {
    canvas.width  = wrap.clientWidth;
    canvas.height = Math.min(400, wrap.clientWidth * 0.46);
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

/** @returns {number} */
const W = () => canvas.width;
/** @returns {number} */
const H = () => canvas.height;

/**
 * draws an arrow with an optional label from one canvas point to another:
 * @param {number} x1 - Start x coordinate in pixels
 * @param {number} y1 - Start y coordinate in pixels
 * @param {number} x2 - End x coordinate in pixels
 * @param {number} y2 - End y coordinate in pixels
 * @param {string} color - CSS colour string for the arrow
 * @param {string} [label] - Optional text label drawn near the arrowhead
 */
function arrow(x1, y1, x2, y2, color, label) {
    const dx = x2-x1, dy = y2-y1;
    const len = Math.sqrt(dx*dx+dy*dy);
    if (len < 2) return;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    const hw=7, hl=12;
    ctx.beginPath(); ctx.fillStyle = color;
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-hl*ux+hw*uy, y2-hl*uy-hw*ux);
    ctx.lineTo(x2-hl*ux-hw*uy, y2-hl*uy+hw*ux);
    ctx.closePath(); ctx.fill();
    if (label) { ctx.fillStyle=color; ctx.font='bold 11px Poppins'; ctx.fillText(label,x2+5,y2+4); }
}

/**
 * draws a grey ground fill and a darker top edge at the given y position
 * @param {number} y - The y pixel coordinate of the ground surface
 */
function drawGround(y) {
    ctx.fillStyle='#9e9e9e'; ctx.fillRect(0,y,W(),H()-y);
    ctx.fillStyle='#757575'; ctx.fillRect(0,y,W(),3);
}

/**
 * returns an HTML string for a single labelled stat card:
 * @param {string} label - The stat label text
 * @param {string|number} value - The numeric or text value to display
 * @param {string} unit - The unit string shown after the value
 * @returns {string} An HTML snippet for the stat card
 */
function stat(label,value,unit) {
    return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}<span class="stat-unit">${unit}</span></div></div>`;
}
/**
 * injects HTML into the stats row element
 * @param {string} html - HTML string to set as the stats row content
 */
function setStats(html)    { document.getElementById('stats-row').innerHTML=html; }

/**
 * injects HTML into the formula box element
 * @param {string} html - HTML string to set as the formula box content
 */
function setFormulas(html) { document.getElementById('formula-box').innerHTML=html; }

// ── INCLINED PLANE ────────────────────────────────────────────────────────────
/** @type {number|null} */
let incAnim = null;
/** @type {number} */
let incPos = 0.55; // 0=top, 1=bottom of ramp

/**
 * reads inclined-plane input values and computes all derived forces and motion quantities:
 * @returns {{theta: number, m: number, us: number, uk: number, W_: number, N: number,
 *   fs_max: number, fk: number, Wpar: number, sliding: boolean, fric: number,
 *   Fnet: number, a: number}} Object containing all incline physics values
 */
function getIncline() {
    const theta = parseFloat(document.getElementById('inc-angle').value) * Math.PI/180;
    const m     = parseFloat(document.getElementById('inc-mass').value);
    const us    = parseFloat(document.getElementById('inc-us').value);
    const uk    = parseFloat(document.getElementById('inc-uk').value);
    const W_=m*G, N=W_*Math.cos(theta), fs_max=us*N, fk=uk*N, Wpar=W_*Math.sin(theta);
    const sliding = Wpar > fs_max;
    const fric = sliding ? fk : Math.min(Wpar,fs_max);
    const Fnet = sliding ? Wpar-fk : 0;
    const a = Fnet/m;
    return {theta,m,us,uk,W_,N,fs_max,fk,Wpar,sliding,fric,Fnet,a};
}

/**
 * draws the inclined-plane scene with the penguin at the given ramp position
 * @param {number} pos - Normalised position along the ramp (0 = top, 1 = bottom)
 */
function drawInclineAt(pos) {
    const p = getIncline();
    const cy = H()*0.82;
    const rampLen = Math.min(W(),H())*0.7;
    const rx = W()*0.5 - rampLen*Math.cos(p.theta)/2;
    const ry = cy;
    const tx = rx + rampLen*Math.cos(p.theta);

    ctx.clearRect(0,0,W(),H());
    ctx.fillStyle='#f5f0e8'; ctx.fillRect(0,0,W(),H());
    drawGround(cy);

    // ramp fill
    ctx.beginPath();
    ctx.moveTo(rx,ry); ctx.lineTo(tx,ry); ctx.lineTo(tx, ry-rampLen*Math.sin(p.theta));
    ctx.closePath(); ctx.fillStyle='rgba(180,140,100,0.18)'; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle='#5d4037'; ctx.lineWidth=4;
    ctx.moveTo(rx,ry); ctx.lineTo(tx, ry-rampLen*Math.sin(p.theta)); ctx.stroke();

    // angle arc
    ctx.beginPath(); ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
    ctx.arc(tx,ry,30,-Math.PI,-Math.PI+p.theta,false); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.font='11px Poppins';
    ctx.fillText(Math.round(p.theta*180/Math.PI)+'°', tx-44, ry-8);

    // penguin position along ramp
    const bx = rx + rampLen*pos*Math.cos(p.theta);
    const by = ry - rampLen*pos*Math.sin(p.theta);
    const bsize=32;
    const perpX=-Math.sin(p.theta), perpY=-Math.cos(p.theta);
    const px=bx+perpX*bsize*0.5, py=by+perpY*bsize*0.5;

    ctx.save(); ctx.translate(px,py); ctx.rotate(-p.theta);
    ctx.drawImage(penguinImg,-bsize/2,-bsize/2,bsize,bsize);
    ctx.restore();

    // sliding flash highlight
    if (p.sliding) {
        ctx.fillStyle='rgba(255,111,0,0.12)';
        ctx.fillRect(0,0,W(),H());
        ctx.fillStyle='rgba(255,111,0,0.8)'; ctx.font='bold 12px Poppins';
        ctx.textAlign='center';
        ctx.fillText('⚡ SLIDING — kinetic friction active', W()/2, 18);
        ctx.textAlign='left';
    }

    const sc=0.8;
    arrow(bx,by, bx,by+p.W_*sc, '#e53935','W');
    const nx=-Math.sin(p.theta), ny=-Math.cos(p.theta);
    arrow(bx,by, bx+nx*p.N*sc, by+ny*p.N*sc, '#1e88e5','N');
    const fx_dir=Math.cos(p.theta), fy_dir=Math.sin(p.theta);
    arrow(bx,by, bx+fx_dir*p.fric*sc, by-fy_dir*p.fric*sc, '#43a047', p.sliding?'fk':'fs');
    if (p.sliding) arrow(bx,by, bx-Math.cos(p.theta)*p.Fnet*sc, by+Math.sin(p.theta)*p.Fnet*sc, '#ff6f00','Fnet');

    setStats(
        stat('Weight',p.W_.toFixed(1),'N')+stat('Normal',p.N.toFixed(1),'N')+
        stat('Friction',p.fric.toFixed(1),'N')+stat('Status',p.sliding?'sliding':'static','')+
        stat('Accel.',p.a.toFixed(2),'m/s²')
    );
    setFormulas(
        `W = mg = <span>${p.W_.toFixed(1)} N</span>`+
        `N = mg·cos(θ) = <span>${p.N.toFixed(1)} N</span>`+
        `fs_max = μs·N = <span>${p.fs_max.toFixed(1)} N</span>`+
        `fk = μk·N = <span>${p.fk.toFixed(1)} N</span>`+
        `W∥ = mg·sin(θ) = <span>${p.Wpar.toFixed(1)} N</span>`+
        `a = Fnet/m = <span>${p.a.toFixed(2)} m/s²</span>`
    );
}

/**
 * draws the inclined-plane scene at the current animation position
 */
function drawIncline() { drawInclineAt(incPos); }

/**
 * cancels any running inclined-plane animation frame
 */
function stopInclineAnim() {
    if (incAnim) { cancelAnimationFrame(incAnim); incAnim = null; }
}

// ── CONNECTED OBJECTS ─────────────────────────────────────────────────────────
/** @type {number|null} */
let conAnim = null;
/** @type {number} */
let conOffset = 0;
/** @type {boolean} */
let conRunning = false;

/**
 * reads connected-objects input values and computes acceleration and tension forces.
 * @returns {{mA: number, mB: number, uk: number, F: number, fric: number,
 *   Fnet: number, a: number, T1: number, T2: number}} Object containing all connected-objects physics values.
 */
function getConnected() {
    const mA=parseFloat(document.getElementById('con-ma').value);
    const mB=parseFloat(document.getElementById('con-mb').value);
    const uk=parseFloat(document.getElementById('con-uk').value);
    const F =parseFloat(document.getElementById('con-f').value);
    const fric=uk*(mA+mB)*G;
    const Fnet=Math.max(0,F-fric);
    const a=Fnet/(mA+mB);
    const T1=mA*a+uk*mA*G;
    const T2=(mA+mB)*a+fric;
    return {mA,mB,uk,F,fric,Fnet,a,T1,T2};
}

/**
 * draws the connected-objects scene with both penguins at the given horizontal offset
 * @param {number} offset - Horizontal pixel offset applied to both objects
 */
function drawConnectedAt(offset) {
    const p = getConnected();
    const ps=72, groundY=H()*0.75;
    ctx.clearRect(0,0,W(),H());
    ctx.fillStyle='#f5f0e8'; ctx.fillRect(0,0,W(),H());
    drawGround(groundY);

    const bAx = W()*0.22 + offset;
    const bBx = bAx + W()*0.22 + ps;
    const penY = groundY-ps;

    // rope taut indicator
    if (p.T1 > 0) {
        ctx.strokeStyle='#5d4037'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(bAx+ps,penY+ps*0.5); ctx.lineTo(bBx,penY+ps*0.5); ctx.stroke();
    }

    [[bAx,'A',p.mA],[bBx,'B',p.mB]].forEach(([bx,label,mass]) => {
        ctx.drawImage(penguinImg,bx,penY,ps,ps);
        const badgeY=groundY+4;
        ctx.fillStyle='rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.roundRect(bx,badgeY,ps,22,6); ctx.fill();
        ctx.strokeStyle='#ccc'; ctx.lineWidth=1; ctx.stroke();
        ctx.textAlign='center'; ctx.fillStyle='#1a1a1a'; ctx.font='bold 11px Poppins';
        ctx.fillText(label+' — '+mass+' kg', bx+ps/2, badgeY+15);
        ctx.textAlign='left';
    });

    const sc=1.2;
    arrow(bBx+ps,penY+ps*0.5, bBx+ps+Math.max(p.F*sc,8),penY+ps*0.5, '#e53935','F');
    if (p.fric>0) arrow(bAx,penY+ps*0.5, bAx-Math.min(p.fric*sc*0.35,60),penY+ps*0.5, '#43a047','f');
    if (p.T1>0)   arrow(bAx+ps,penY+ps*0.5, bAx+ps+Math.min(p.T1*sc*0.4,50),penY+ps*0.5, '#1e88e5','T₁');

    // speed indicator
    if (conRunning && p.a > 0) {
        ctx.fillStyle='rgba(30,136,229,0.15)'; ctx.fillRect(0,0,W(),H());
        ctx.fillStyle='#1e88e5'; ctx.font='bold 11px Poppins'; ctx.textAlign='center';
        ctx.fillText('→ moving — a = '+p.a.toFixed(2)+' m/s²', W()/2, 18);
        ctx.textAlign='left';
    }

    setStats(
        stat('Accel.',p.a.toFixed(2),'m/s²')+stat('T₁',p.T1.toFixed(1),'N')+
        stat('T₂',p.T2.toFixed(1),'N')+stat('Friction',p.fric.toFixed(1),'N')+
        stat('Fnet',p.Fnet.toFixed(1),'N')
    );
    setFormulas(
        `a = (F − f) / (mA+mB) = <span>${p.a.toFixed(2)} m/s²</span>`+
        `T₂ = (mA+mB)·a + f = <span>${p.T2.toFixed(1)} N</span>`+
        `T₁ = mA·a + f_A = <span>${p.T1.toFixed(1)} N</span>`+
        `T₁ < T₂: <span>${p.T1.toFixed(1)} < ${p.T2.toFixed(1)}</span>`
    );
}

/**
 * draws the connected-objects scene at the current animation offset
 */
function drawConnected() { drawConnectedAt(conOffset); }

/**
 * cancels any running connected-objects animation and resets the running flag
 */
function stopConAnim() {
    if (conAnim) { cancelAnimationFrame(conAnim); conAnim = null; }
    conRunning = false;
}

// ── SPRING ────────────────────────────────────────────────────────────────────
/** @type {number|null} */
let sprAnim=null;
/** @type {number} */
let sprX=0;
/** @type {number} */
let sprV=0;
/** @type {boolean} */
let sprRunning=false;

/**
 * reads spring input values from the DOM
 * @returns {{k: number, m: number, x0: number}} Spring constant, mass, and initial displacement
 */
function getSpringParams() {
    return {
        k: parseFloat(document.getElementById('spr-k').value),
        m: parseFloat(document.getElementById('spr-m').value),
        x0: parseFloat(document.getElementById('spr-x').value)
    };
}

/**
 * draws the spring scene with the penguin displaced by x metres from equilibrium
 * @param {number} x - Current displacement from the natural length in metres
 */
function drawSpringAt(x) {
    const {k,m} = getSpringParams();
    const F=-k*x, W_=m*G;
    const cx=W()/2, anchorY=H()*0.12, naturalLen=H()*0.35, px_per_m=H()*0.18;
    const endY=anchorY+naturalLen+x*px_per_m;
    const ps=44, springEndY=endY-ps;

    ctx.clearRect(0,0,W(),H());
    ctx.fillStyle='#f5f0e8'; ctx.fillRect(0,0,W(),H());

    ctx.fillStyle='#bbb'; ctx.fillRect(cx-40,anchorY-8,80,8);

    const coils=10, coilW=18;
    ctx.beginPath(); ctx.strokeStyle='#5d4037'; ctx.lineWidth=2;
    ctx.moveTo(cx,anchorY);
    for (let i=0;i<=coils*2;i++) {
        const t=i/(coils*2);
        ctx.lineTo(cx+(i%2===0?-coilW:coilW), anchorY+t*(springEndY-anchorY));
    }
    ctx.lineTo(cx,springEndY); ctx.stroke();

    ctx.drawImage(penguinImg,cx-ps/2,endY-ps,ps,ps);

    const sc=0.015;
    arrow(cx,endY-ps/2, cx,endY-ps/2+W_*sc*100, '#e53935','W');
    if (Math.abs(F)>0.1) arrow(cx,endY-ps/2, cx,endY-ps/2-Math.abs(F)*sc*100*Math.sign(x||1), '#1e88e5','F');

    const eqY=anchorY+naturalLen;
    ctx.setLineDash([4,6]); ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-60,eqY); ctx.lineTo(cx+60,eqY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.font='10px Poppins';
    ctx.fillText('equilibrium',cx+12,eqY-3);

    if (Math.abs(x)>0.01) {
        ctx.strokeStyle='#ff6f00'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
        ctx.beginPath(); ctx.moveTo(cx+60,eqY); ctx.lineTo(cx+60,endY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='#ff6f00'; ctx.font='10px Poppins';
        ctx.fillText('x='+x.toFixed(2)+'m', cx+64, (eqY+endY)/2+4);
    }

    // KE/PE energy bars
    const KE=0.5*m*sprV*sprV, PE=0.5*k*x*x, total=KE+PE||1;
    const barW=80, barH=8, barX=8, barY=H()-28;
    ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fillRect(barX,barY,barW,barH);
    ctx.fillStyle='#1e88e5'; ctx.fillRect(barX,barY,barW*(KE/total),barH);
    ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fillRect(barX,barY+12,barW,barH);
    ctx.fillStyle='#e53935'; ctx.fillRect(barX,barY+12,barW*(PE/total),barH);
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font='9px Poppins';
    ctx.fillText('KE',barX+barW+4,barY+8);
    ctx.fillText('PE',barX+barW+4,barY+20);

    setStats(
        stat('Spring Force',Math.abs(F).toFixed(1),'N')+
        stat('Direction',F>0?'up ↑':F<0?'down ↓':'none','')+
        stat('KE',KE.toFixed(2),'J')+
        stat('PE',PE.toFixed(2),'J')+
        stat('Displacement',x.toFixed(2),'m')
    );
    setFormulas(
        `F = −kx = <span>${F.toFixed(1)} N</span>`+
        `k = <span>${k} N/m</span>`+
        `W = mg = <span>${W_.toFixed(1)} N</span>`+
        `x = <span>${x.toFixed(2)} m</span>`
    );
}

/**
 * draws the spring scene at the current displacement, resetting velocity if not running
 */
function drawSpring() {
    const {x0}=getSpringParams();
    if (!sprRunning) { sprX=x0; sprV=0; }
    drawSpringAt(sprX);
}

/**
 * starts the spring oscillation animation from the current initial displacement
 */
function releaseSpr() {
    const {k,m,x0}=getSpringParams();
    sprX=x0; sprV=0; sprRunning=true;
    if (sprAnim) cancelAnimationFrame(sprAnim);
    /** @type {number} */
    const dt=0.016;
    /** @type {number} */
    const damping=0.015;
    function tick() {
        const F=-k*sprX - damping*sprV*Math.sqrt(k*m);
        sprV += F/m*dt;
        sprX += sprV*dt;
        drawSpringAt(sprX);
        sprAnim=requestAnimationFrame(tick);
    }
    sprAnim=requestAnimationFrame(tick);
}

/**
 * cancels the spring animation and clears the running flag
 */
function stopSpr() {
    if (sprAnim) { cancelAnimationFrame(sprAnim); sprAnim=null; }
    sprRunning=false;
}

/**
 * stops the spring animation and redraws the spring at zero displacement
 */
function resetSpr() { stopSpr(); sprX=0; sprV=0; drawSpringAt(0); }

// ── CIRCULAR MOTION ───────────────────────────────────────────────────────────
/** @type {number} */
let circAngle=0;
/** @type {number|null} */
let circAnim=null;
/** @type {boolean} */
let circCut=false;
/** @type {number} */
let circVx=0;
/** @type {number} */
let circVy=0;
/** @type {number} */
let circPx=0;
/** @type {number} */
let circPy=0;

/**
 * reads circular motion input values from the DOM
 * @returns {{m: number, r: number, v: number, ac: number, T: number}} Circular motion physics values
 */
function getCircular() {
    const m=parseFloat(document.getElementById('cir-m').value);
    const r=parseFloat(document.getElementById('cir-r').value);
    const v=parseFloat(document.getElementById('cir-v').value);
    return {m,r,v,ac:v*v/r,T:m*v*v/r};
}

/**
 * draws a single circular-motion animation frame with the penguin at the given position:
 * @param {number} cx - Canvas x coordinate of the circle centre in pixels
 * @param {number} cy - Canvas y coordinate of the circle centre in pixels
 * @param {number} rPx - Radius of the circular path in pixels
 * @param {number} ox - Current x position of the penguin in pixels
 * @param {number} oy - Current y position of the penguin in pixels
 * @param {{m: number, r: number, v: number, ac: number, T: number}} p - Circular motion physics values
 * @param {boolean} cut - Whether the string has been cut (free-flight mode)
 */
function drawCircularFrame(cx,cy,rPx,ox,oy,p,cut) {
    ctx.clearRect(0,0,W(),H());
    ctx.fillStyle='#f5f0e8'; ctx.fillRect(0,0,W(),H());

    if (!cut) {
        ctx.beginPath(); ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=1.5;
        ctx.setLineDash([4,6]); ctx.arc(cx,cy,rPx,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.fillStyle='#5d4037'; ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle='#5d4037'; ctx.lineWidth=2;
        ctx.moveTo(cx,cy); ctx.lineTo(ox,oy); ctx.stroke();
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.font='10px Poppins';
        ctx.fillText('r = '+p.r.toFixed(1)+'m', cx+6, cy-6);
        const fx=cx-ox, fy=cy-oy, flen=Math.sqrt(fx*fx+fy*fy);
        const sc=Math.min(60,p.T*1.5)/flen;
        arrow(ox,oy, ox+fx*sc,oy+fy*sc, '#e53935','T');
    } else {
        ctx.fillStyle='rgba(200,80,80,0.08)'; ctx.fillRect(0,0,W(),H());
        ctx.fillStyle='rgba(200,80,80,0.7)'; ctx.font='bold 12px Poppins'; ctx.textAlign='center';
        ctx.fillText('✂ string cut — penguin flies off tangentially!', W()/2, 18);
        ctx.textAlign='left';
    }

    const ps=28;
    ctx.save(); ctx.translate(ox,oy);
    ctx.rotate(cut ? Math.atan2(circVy,circVx) : circAngle+Math.PI/2);
    ctx.drawImage(penguinImg,-ps/2,-ps/2,ps,ps);
    ctx.restore();

    const vx=-Math.sin(circAngle), vy=Math.cos(circAngle);
    arrow(ox,oy, ox+vx*30,oy+vy*30, '#1e88e5','v');

    setStats(
        stat('Centripetal a',p.ac.toFixed(2),'m/s²')+stat('Tension',cut?'0':p.T.toFixed(1),'N')+
        stat('Speed',p.v.toFixed(1),'m/s')+stat('Radius',p.r.toFixed(1),'m')
    );
    setFormulas(
        `ac = v²/R = <span>${p.ac.toFixed(2)} m/s²</span>`+
        `T = m·v²/R = <span>${p.T.toFixed(1)} N</span>`+
        `v = <span>${p.v.toFixed(1)} m/s</span>`+
        `R = <span>${p.r.toFixed(1)} m</span>`
    );
}

/**
 * starts the circular-motion animation loop if it is not already running
 */
function startCircAnim() {
    if (circAnim) return;
    circCut=false;
    function tick() {
        const p=getCircular();
        const cx=W()/2, cy=H()*0.48;
        const rPx=p.r*Math.min(W(),H())*0.12;
        circAngle += p.v/(p.r*60);
        const ox=cx+rPx*Math.cos(circAngle), oy=cy+rPx*Math.sin(circAngle);
        drawCircularFrame(cx,cy,rPx,ox,oy,p,false);
        circAnim=requestAnimationFrame(tick);
    }
    circAnim=requestAnimationFrame(tick);
}

/**
 * cuts the circular-motion string and launches the penguin on a tangential free-flight path
 */
function cutString() {
    if (!circAnim && !circCut) return;
    cancelAnimationFrame(circAnim); circAnim=null;
    circCut=true;
    const p=getCircular();
    const cx=W()/2, cy=H()*0.48;
    const rPx=p.r*Math.min(W(),H())*0.12;
    circPx=cx+rPx*Math.cos(circAngle);
    circPy=cy+rPx*Math.sin(circAngle);
    // tangential velocity direction
    circVx=-Math.sin(circAngle)*p.v*0.5;
    circVy= Math.cos(circAngle)*p.v*0.5;
    function fly() {
        circPx+=circVx; circPy+=circVy;
        const p2=getCircular();
        drawCircularFrame(cx,cy,rPx,circPx,circPy,p2,true);
        if (circPx>W()+40||circPx<-40||circPy>H()+40||circPy<-40) return;
        circAnim=requestAnimationFrame(fly);
    }
    circAnim=requestAnimationFrame(fly);
}

/**
 * resets the circular-motion scene to angle zero and restarts the animation
 */
function resetCirc() {
    if (circAnim) { cancelAnimationFrame(circAnim); circAnim=null; }
    circCut=false; circAngle=0;
    startCircAnim();
}

/**
 * cancels the circular-motion animation frame if one is active
 */
function stopCircAnim() {
    if (circAnim) { cancelAnimationFrame(circAnim); circAnim=null; }
}

/**
 * dispatches a redraw to the currently active simulation mode
 */
function draw() {
    if (mode==='incline')        drawIncline();
    else if (mode==='connected') drawConnected();
    else if (mode==='spring')    drawSpring();
    else if (mode==='circular')  { /* handled by anim */ }
}

// ── MODE SWITCHING ────────────────────────────────────────────────────────────
document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.controls').forEach(c=>c.classList.add('hidden'));
        document.querySelectorAll('.action-row').forEach(r=>r.classList.add('hidden'));
        stopInclineAnim(); stopConAnim(); stopSpr(); stopCircAnim();
        mode=btn.dataset.mode;
        document.getElementById('controls-'+mode).classList.remove('hidden');
        document.getElementById('actions-'+mode).classList.remove('hidden');
        // reset animation states
        incPos=0.15; conOffset=0; sprX=0; sprV=0; sprRunning=false; circCut=false; circAngle=0;
        if (mode==='circular') startCircAnim();
        else draw();
    });
});

// ── SLIDER LISTENERS ─────────────────────────────────────────────────────────
/**
 * binds a range slider to a display element, updating the label and redrawing on input:
 * @param {string} id - The DOM id of the range input
 * @param {string} displayId - The DOM id of the element that shows the current value
 * @param {string} suffix - Unit suffix appended to the displayed value
 * @param {number} [decimals=0] - Number of decimal places for the displayed value
 */
function bindSlider(id,displayId,suffix,decimals=0) {
    const el=document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
        document.getElementById(displayId).textContent=parseFloat(el.value).toFixed(decimals)+suffix;
        if (mode!=='circular') draw();
    });
}

bindSlider('inc-angle','inc-angle-val','°');
bindSlider('inc-mass', 'inc-mass-val',' kg');

const usSlider=document.getElementById('inc-us');
const ukSlider=document.getElementById('inc-uk');
const usVal=document.getElementById('inc-us-val');
const ukVal=document.getElementById('inc-uk-val');

usSlider.addEventListener('input',()=>{
    const us=parseFloat(usSlider.value);
    usVal.textContent=us.toFixed(2);
    if (parseFloat(ukSlider.value)>us) { ukSlider.value=us; ukVal.textContent=us.toFixed(2); }
    draw();
});
ukSlider.addEventListener('input',()=>{
    const uk=parseFloat(ukSlider.value), us=parseFloat(usSlider.value);
    if (uk>us) { ukSlider.value=us; ukVal.textContent=us.toFixed(2); }
    else ukVal.textContent=uk.toFixed(2);
    draw();
});

bindSlider('con-ma','con-ma-val',' kg');
bindSlider('con-mb','con-mb-val',' kg');
bindSlider('con-uk','con-uk-val','',2);
bindSlider('con-f', 'con-f-val',' N');
bindSlider('spr-k', 'spr-k-val',' N/m');
bindSlider('spr-m', 'spr-m-val',' kg');
bindSlider('spr-x', 'spr-x-val',' m',2);
bindSlider('cir-m', 'cir-m-val',' kg');
bindSlider('cir-r', 'cir-r-val',' m',1);
bindSlider('cir-v', 'cir-v-val',' m/s',1);

// ── ACTION BUTTONS ────────────────────────────────────────────────────────────
document.getElementById('btn-spr-release').addEventListener('click', releaseSpr);
document.getElementById('btn-spr-reset').addEventListener('click', resetSpr);
document.getElementById('btn-cir-cut').addEventListener('click', cutString);
document.getElementById('btn-cir-reset').addEventListener('click', resetCirc);

// ── INIT ──────────────────────────────────────────────────────────────────────
draw();