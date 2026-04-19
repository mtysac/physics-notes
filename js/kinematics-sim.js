const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const wrap   = document.getElementById('canvas-wrap');

function resizeCanvas() {
    canvas.width  = wrap.clientWidth;
    canvas.height = Math.min(400, wrap.clientWidth * 0.46);
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); if (!running) drawStatic(); });

const COLORS = [
    'rgba(186,186,191,0.9)',
    'rgba(200,140,80,0.9)',
    'rgba(80,160,100,0.9)',
    'rgba(80,120,200,0.9)',
    'rgba(180,80,180,0.9)',
];

let animId = null, running = false, paused = false, t = 0;
let v0, angleRad, g, h0, vx, vy0, scale, originX, originY, maxRange, maxHeight;
let trail = [];
let savedTrails = [];
let colorIdx = 0;
let useDrag = false, showComps = true, compareMode = true, simSpeed = 1.0;
const DRAG_K = 0.05;

// preload penguin image
const penguinImg = new Image();
penguinImg.src = './assets/penguin.png';
penguinImg.onload = () => { if (!running) drawStatic(); };

function getParams() {
    v0       = parseFloat(document.getElementById('v0').value);
    angleRad = parseFloat(document.getElementById('angle').value) * Math.PI / 180;
    g        = parseFloat(document.getElementById('gravity').value);
    h0       = parseFloat(document.getElementById('height0').value);
    simSpeed = parseFloat(document.getElementById('simspeed').value);
    vx       = v0 * Math.cos(angleRad);
    vy0      = v0 * Math.sin(angleRad);
    maxRange  = (v0 * v0 * Math.sin(2 * angleRad)) / g;
    maxHeight = h0 + (vy0 * vy0) / (2 * g);
}

function setupScale() {
    const W = canvas.width, H = canvas.height, pad = 44;
    const effRange  = Math.max(maxRange, 1);
    const effHeight = Math.max(maxHeight, 1);
    scale   = Math.min((W - pad * 2) / effRange, (H - pad * 2) / effHeight);
    originX = pad;
    originY = H - pad;
}

function toScreen(x, y) {
    return [originX + x * scale, originY - y * scale];
}

function updateDYK() {
    const deg = Math.round(parseFloat(document.getElementById('angle').value));
    const dyk = document.getElementById('dyk');
    let msg = '';
    if (deg === 45)      msg = 'At <span>45°</span> the range is maximised on flat ground.';
    else if (deg < 20)   msg = 'Very shallow angles give a low, fast trajectory — great for skipping stones!';
    else if (deg > 70)   msg = 'Steep angles maximise height but sacrifice range.';
    else if (deg === 30) msg = '<span>30°</span> and <span>60°</span> produce the same range on flat ground.';
    else if (deg === 60) msg = '<span>60°</span> and <span>30°</span> produce the same range on flat ground.';
    else                 msg = 'Complementary angles (e.g. <span>' + deg + '°</span> & <span>' + (90 - deg) + '°</span>) give the same range on flat ground.';
    if (useDrag) msg += ' <span>(air resistance is ON — range will be shorter)</span>';
    dyk.innerHTML = '💡 ' + msg;
}

function updateLegend() {
    const row = document.getElementById('legend-row');
    row.innerHTML = '';
    savedTrails.forEach(s => {
        const el = document.createElement('span');
        el.innerHTML = `<span class="legend-dot" style="background:${s.color}"></span>${s.label}`;
        row.appendChild(el);
    });
}

function drawGrid() {
    const W = canvas.width, H = canvas.height;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    const step = scale > 6 ? 10 : 20;
    for (let x = 0; x <= maxRange * 1.1; x += step) {
        const [sx] = toScreen(x, 0); if (sx > W) break;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    }
    for (let y = 0; y <= maxHeight * 1.1; y += step) {
        const [, sy] = toScreen(0, y); if (sy < 0) break;
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }
}

function drawAxes() {
    const W = canvas.width, H = canvas.height;
    const [ox, oy] = toScreen(0, 0);

    // green ground fill — from ground line to bottom of canvas
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, oy, W, H - oy);
    // darker top edge
    ctx.fillStyle = '#388e3c';
    ctx.fillRect(0, oy, W, 3);

    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(W - 10, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, 10);     ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.font = '11px Poppins';
    ctx.fillText('x (m)', W - 36, oy - 6);
    ctx.fillText('y (m)', ox + 6, 18);
    if (h0 > 0) {
        const [, launchY] = toScreen(0, h0);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(ox, launchY); ctx.lineTo(W - 10, launchY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.font = '10px Poppins';
        ctx.fillText('y₀ = ' + h0 + 'm', ox + 6, launchY - 4);
    }
}

function drawGhostTrajectory() {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    if (useDrag) {
        let px = 0, py = h0, pvx = vx, pvy = vy0, dt = 0.02;
        ctx.moveTo(...toScreen(px, py));
        for (let i = 0; i < 2000; i++) {
            pvx += -DRAG_K * pvx * dt;
            pvy -= g * dt;
            py  += pvy * dt; px += pvx * dt;
            if (py < 0) break;
            ctx.lineTo(...toScreen(px, Math.max(py, 0)));
        }
    } else {
        const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
        for (let i = 0; i <= 300; i++) {
            const tt = tFlight * (i / 300);
            const px = vx * tt;
            const py = h0 + vy0 * tt - 0.5 * g * tt * tt;
            if (py < -0.5) break;
            const [sx, sy] = toScreen(px, Math.max(py, 0));
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
    }
    ctx.stroke(); ctx.setLineDash([]);
}

function drawAngleArc() {
    const [ox, oy] = toScreen(0, h0);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.arc(ox, oy, 28, -Math.PI, -Math.PI + angleRad, false);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.font = '10px Poppins';
    ctx.fillText(Math.round(angleRad * 180 / Math.PI) + '°', ox + 32, oy - 10);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5;
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + 40 * Math.cos(angleRad), oy - 40 * Math.sin(angleRad));
    ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
}

function drawMaxHeightLine() {
    const [, sy] = toScreen(0, maxHeight);
    const W = canvas.width;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.font = '10px Poppins';
    ctx.fillText('H = ' + maxHeight.toFixed(1) + 'm', 6, sy - 4);
}

function drawSavedTrails() {
    savedTrails.forEach(s => {
        if (s.trail.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.5;
        s.trail.forEach(([px, py], i) => {
            const [sx, sy] = toScreen(px, py);
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    });
}

function drawStatic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getParams(); setupScale();
    drawGrid(); drawAxes(); drawMaxHeightLine();
    drawSavedTrails();
    drawGhostTrajectory(); drawAngleArc();

    // show penguin at launch origin when idle
    const [ox, oy] = toScreen(0, h0);
    const size = 28;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-angleRad);
    ctx.drawImage(penguinImg, -size / 2, -size / 2, size, size);
    ctx.restore();}

function drawBall(px, py, curVx, curVy) {
    const [sx, sy] = toScreen(px, py);
    const speed = Math.sqrt(curVx * curVx + curVy * curVy);
    if (showComps) {
        const sc = 2.8;
        ctx.beginPath(); ctx.strokeStyle = 'rgba(80,120,200,0.85)'; ctx.lineWidth = 1.5;
        ctx.moveTo(sx, sy); ctx.lineTo(sx + curVx * sc, sy); ctx.stroke();
        ctx.fillStyle = 'rgba(80,120,200,0.85)'; ctx.font = '9px Poppins';
        ctx.fillText('vₓ', sx + curVx * sc + 3, sy + 4);
        ctx.beginPath(); ctx.strokeStyle = 'rgba(80,160,100,0.85)'; ctx.lineWidth = 1.5;
        ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - curVy * sc); ctx.stroke();
        ctx.fillStyle = 'rgba(80,160,100,0.85)';
        ctx.fillText('vᵧ', sx + 3, sy - curVy * sc - 4);
    }
    // resultant velocity vector
    ctx.beginPath(); ctx.strokeStyle = 'rgba(200,80,80,0.85)'; ctx.lineWidth = 1.5;
    ctx.moveTo(sx, sy); ctx.lineTo(sx + curVx * 2.8, sy - curVy * 2.8); ctx.stroke();

    // rotate penguin to match velocity direction
    const angle = Math.atan2(-curVy, curVx); // canvas y is flipped
    const size = 28;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.drawImage(penguinImg, -size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawFrame(px, py, curVx, curVy) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(); drawAxes(); drawMaxHeightLine();
    drawSavedTrails();
    drawGhostTrajectory(); drawAngleArc();
    if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
            const [ax, ay] = toScreen(trail[i-1][0], trail[i-1][1]);
            const [bx, by] = toScreen(trail[i][0],   trail[i][1]);
            const spd = trail[i][2] || 0;
            const t01 = Math.min(spd / v0, 1);
            const r  = Math.round(80  + t01 * 106);
            const gb = Math.round(186 - t01 * 80);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${gb},${gb},0.6)`;
            ctx.lineWidth = 2;
            ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
    }
    drawBall(px, py, curVx, curVy);
    const speed = Math.sqrt(curVx * curVx + curVy * curVy);
    document.getElementById('s-time').innerHTML  = t.toFixed(2) + '<span class="stat-unit">s</span>';
    document.getElementById('s-dx').innerHTML    = px.toFixed(1) + '<span class="stat-unit">m</span>';
    document.getElementById('s-dy').innerHTML    = py.toFixed(1) + '<span class="stat-unit">m</span>';
    document.getElementById('s-speed').innerHTML = speed.toFixed(1) + '<span class="stat-unit">m/s</span>';
}

let state = { px: 0, py: 0, pvx: 0, pvy: 0 };

function physicsStep(dt) {
    if (useDrag) {
        const spd = Math.sqrt(state.pvx ** 2 + state.pvy ** 2);
        state.pvx += -DRAG_K * state.pvx * spd * dt;
        state.pvy += (-g - DRAG_K * state.pvy * spd) * dt;
        state.px  += state.pvx * dt;
        state.py  += state.pvy * dt;
    } else {
        state.pvy = vy0 - g * t;
        state.px  = vx * t;
        state.py  = h0 + vy0 * t - 0.5 * g * t * t;
        state.pvx = vx;
    }
}

const BASE_DT = 0.025;
function animate() {
    const dt = BASE_DT * simSpeed;
    t += dt;
    physicsStep(dt);
    const { px, py, pvx, pvy } = state;
    const spd = Math.sqrt(pvx ** 2 + pvy ** 2);
    trail.push([px, Math.max(py, 0), spd]);
    if (py <= 0 && t > 0.05) {
        drawFrame(px, 0, pvx, pvy);
        const [lx, ly] = toScreen(px, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx - 6, ly); ctx.lineTo(lx + 6, ly); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx, ly + 6); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = '11px Poppins';
        ctx.fillText('R = ' + px.toFixed(1) + 'm', lx + 8, ly - 4);
        document.getElementById('s-peak').innerHTML = maxHeight.toFixed(1) + '<span class="stat-unit">m</span>';
        if (compareMode) {
            const col = COLORS[colorIdx % COLORS.length];
            const label = `v₀=${v0}m/s θ=${Math.round(angleRad * 180 / Math.PI)}° g=${g}`;
            savedTrails.push({ trail: [...trail], color: col, label });
            colorIdx++;
            updateLegend();
        }
        running = false;
        document.getElementById('btn-pause').disabled = true;
        document.getElementById('btn-launch').textContent = '▶ Launch';
        return;
    }
    drawFrame(px, Math.max(py, 0), pvx, pvy);
    animId = requestAnimationFrame(animate);
}

function launch() {
    if (running && !paused) return;
    if (paused) { paused = false; animId = requestAnimationFrame(animate); return; }
    if (animId) cancelAnimationFrame(animId);
    getParams(); setupScale();
    trail = []; t = 0; running = true; paused = false;
    state = { px: 0, py: h0, pvx: vx, pvy: vy0 };
    document.getElementById('btn-pause').disabled = false;
    animId = requestAnimationFrame(animate);
}

function pauseSim() {
    if (!running) return;
    if (!paused) {
        paused = true;
        cancelAnimationFrame(animId);
        document.getElementById('btn-pause').textContent = '▶ Resume';
    } else {
        paused = false;
        document.getElementById('btn-pause').textContent = '⏸ Pause';
        animId = requestAnimationFrame(animate);
    }
}

function reset() {
    if (animId) cancelAnimationFrame(animId);
    running = false; paused = false; trail = []; t = 0;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-pause').textContent = '⏸ Pause';
    document.getElementById('btn-launch').textContent = '▶ Launch';
    getParams(); setupScale(); drawStatic();
    document.getElementById('s-time').innerHTML  = '0.00<span class="stat-unit">s</span>';
    document.getElementById('s-dx').innerHTML    = '0.0<span class="stat-unit">m</span>';
    document.getElementById('s-dy').innerHTML    = '0.0<span class="stat-unit">m</span>';
    document.getElementById('s-speed').innerHTML = '0.0<span class="stat-unit">m/s</span>';
    document.getElementById('s-peak').innerHTML  = '—';
}

function clearTrails() { savedTrails = []; colorIdx = 0; updateLegend(); if (!running) drawStatic(); }

document.getElementById('v0').addEventListener('input', e => {
    document.getElementById('v-display').textContent = e.target.value + ' m/s';
    if (!running) { getParams(); setupScale(); drawStatic(); } updateDYK();
});
document.getElementById('angle').addEventListener('input', e => {
    document.getElementById('a-display').textContent = e.target.value + '°';
    if (!running) { getParams(); setupScale(); drawStatic(); } updateDYK();
});
document.getElementById('height0').addEventListener('input', e => {
    document.getElementById('h-display').textContent = e.target.value + ' m';
    if (!running) { getParams(); setupScale(); drawStatic(); }
});
document.getElementById('gravity').addEventListener('input', e => {
    document.getElementById('g-display').textContent = parseFloat(e.target.value).toFixed(1) + ' m/s²';
    if (!running) { getParams(); setupScale(); drawStatic(); }
});
document.getElementById('simspeed').addEventListener('input', e => {
    simSpeed = parseFloat(e.target.value);
    document.getElementById('spd-display').textContent = simSpeed.toFixed(1) + '×';
});

function bindToggle(id, getter, setter) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
        setter(!getter());
        btn.classList.toggle('active', getter());
        if (!running) drawStatic();
    });
}
bindToggle('tog-drag',       () => useDrag,     v => { useDrag = v; updateDYK(); });
bindToggle('tog-components', () => showComps,   v => { showComps = v; });
bindToggle('tog-compare',    () => compareMode, v => { compareMode = v; });

document.getElementById('btn-launch').addEventListener('click', launch);
document.getElementById('btn-pause').addEventListener('click', pauseSim);
document.getElementById('btn-reset').addEventListener('click', reset);
document.getElementById('btn-clear').addEventListener('click', clearTrails);

function getAngleFromEvent(e, rect) {
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const [ox, oy] = toScreen(0, h0);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = (clientX - rect.left) * scaleX - ox;
    const dy = oy - (clientY - rect.top) * scaleY;
    if (dx <= 0) return null;
    const deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
    if (deg < 1 || deg > 89) return null;
    return deg;
}

function applyAngle(deg) {
    const slider = document.getElementById('angle');
    slider.value = deg;
    document.getElementById('a-display').textContent = deg + '°';
    getParams(); setupScale(); drawStatic(); updateDYK();
}

let isDraggingAngle = false;

canvas.addEventListener('mousedown', e => {
    if (running && !paused) return;
    const rect = canvas.getBoundingClientRect();
    const deg = getAngleFromEvent(e, rect);
    if (deg === null) return;
    isDraggingAngle = true;
    applyAngle(deg);
});

canvas.addEventListener('mousemove', e => {
    if (!isDraggingAngle) return;
    const rect = canvas.getBoundingClientRect();
    const deg = getAngleFromEvent(e, rect);
    if (deg === null) return;
    applyAngle(deg);
});

canvas.addEventListener('mouseup', () => { isDraggingAngle = false; });
canvas.addEventListener('mouseleave', () => { isDraggingAngle = false; });

// touch support
canvas.addEventListener('touchstart', e => {
    if (running && !paused) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const deg = getAngleFromEvent(e, rect);
    if (deg === null) return;
    isDraggingAngle = true;
    applyAngle(deg);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!isDraggingAngle) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const deg = getAngleFromEvent(e, rect);
    if (deg === null) return;
    applyAngle(deg);
}, { passive: false });

canvas.addEventListener('touchend', () => { isDraggingAngle = false; });


document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); running ? pauseSim() : launch(); }
    if (e.code === 'KeyR')  reset();
});

getParams(); setupScale(); drawStatic(); updateDYK();
