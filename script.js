const $ = (id) => document.getElementById(id);
const bubble = $("bubble");
const svg = $("jjolla");
const hero = $("hero");
const squish = $("squish");
const scareEl = $("scare");
const noise = $("noise");
const face = $("face");
const strokes = svg.querySelectorAll(".stroke");
const lids = svg.querySelectorAll(".lid");

const MESSAGE = "재민 게이야 빨리 웹 사이트 만들어라";
const TAUNTS = [
  "왜 누르냐", "눌러도 아무 일 없음", "아프진 않은데 기분은 나쁨", "재민아 사이트 언제 만들래",
  "지금 뭐 하는 거임", "그만 눌러라", "졸린 거 아님", "표정 원래 이럼", "너 진짜 할 일 없구나",
];
const MOVES = { boing: 450, spin: 750, faint: 1750, sip: 1450 };
const ENDINGS = [
  { n: 10, t: "엔딩 1. 상품은 없다", d: "열 번을 눌렀지만 받은 건 아무것도 없었다." },
  { n: 25, t: "엔딩 2. 재민이는 아직도 안 만들었다", d: "쫄라맨은 오늘도 재민이를 기다린다." },
  { n: 50, t: "엔딩 3. 쫄라맨은 화가 났다", d: "오십 번째에서 쫄라맨은 눈을 떴다.", scare: true },
  { t: "히든엔딩. 아무것도 안 눌렀다", d: "20초 동안 가만히 있었더니 쫄라맨이 컵을 내려놓고 고개를 저었다." },
];
const STROKE_MS = 240;
const TYPE_MS = 55;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

let ready = false, clicks = 0, lastTaunt = -1, scaring = false;
let scareTimer = 0, idleTimer = 0, scareClicks = 0, token = 0;
let seen = new Set();
try { seen = new Set(JSON.parse(localStorage.getItem("jjolla-endings") || "[]")); } catch (e) {}

function show(id) {
  ["title", "howto", "stage", "ending"].forEach((s) => { $(s).hidden = s !== id; });
}
function setBubble(text) { bubble.textContent = text; bubble.classList.toggle("show", Boolean(text)); }
function setReady(v) { ready = v; svg.classList.toggle("ready", v); }

function beep(freq, dur = 0.08, type = "square", vol = 0.12) {
  try {
    const c = audio(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}

function resetDrawing() {
  setReady(false);
  clearTimeout(scareTimer); clearTimeout(idleTimer);
  clicks = 0; $("cnt").textContent = 0;
  svg.classList.remove("done");
  hero.classList.remove("dance");
  strokes.forEach((el) => {
    const len = el.getTotalLength();
    el.style.transition = "none"; el.style.opacity = 0;
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
  });
  setBubble("");
}

async function drawStroke(el) {
  el.style.opacity = 1; el.getBoundingClientRect();
  el.style.transition = reduceMotion ? "none" : `stroke-dashoffset ${STROKE_MS}ms ease-out`;
  el.style.strokeDashoffset = 0;
  beep(220 + Math.random() * 180, 0.05, "triangle", 0.06);
  await sleep(STROKE_MS);
}

function typeMessage(text) {
  return new Promise((resolve) => {
    bubble.classList.add("show");
    if (reduceMotion) { bubble.textContent = text; return resolve(); }
    let i = 0;
    const timer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
      if (i % 2) beep(500, 0.03, "square", 0.04);
      if (i >= text.length) { clearInterval(timer); resolve(); }
    }, TYPE_MS);
  });
}

/* ---------- 점프 스케어 ---------- */
let actx;
function audio() {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function playScream() {
  try {
    const c = audio();
    const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.6, t + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    master.connect(c.destination);

    [[380, 900], [402, 860]].forEach(([from, to]) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(to, t + 0.9);
      o.connect(master);
      o.start(t);
      o.stop(t + 1);
    });

    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    src.connect(bp);
    bp.connect(master);
    src.start(t);
  } catch (e) { /* 소리 실패해도 화면은 나감 */ }
}

function drawNoise() {
  const ctx = noise.getContext("2d");
  const img = ctx.createImageData(noise.width, noise.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function scare() {
  if (scaring) return;
  scaring = true;
  scareEl.classList.add("on");
  playScream();
  const started = performance.now();
  (function frame() {
    drawNoise();
    if (performance.now() - started < 1000) requestAnimationFrame(frame);
  })();
  setTimeout(() => {
    scareEl.classList.remove("on");
    scaring = false;
    setBubble("놀랐냐");
  }, 1050);
}

function armScare(ms) {
  clearTimeout(scareTimer);
  scareTimer = setTimeout(() => {
    if (ready) scare();
    armScare(rand(25000, 45000));
  }, ms);
}

/* ---------- 이벤트 ---------- */
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (ready) showEnding(3); }, 20000);
}

function showEnding(i) {
  const e = ENDINGS[i];
  setReady(false);
  clearTimeout(scareTimer); clearTimeout(idleTimer);
  seen.add(i);
  try { localStorage.setItem("jjolla-endings", JSON.stringify([...seen])); } catch (err) {}
  const go = () => {
    $("endTitle").textContent = e.t;
    $("endDesc").textContent = e.d;
    show("ending");
    beep(330, 0.25, "triangle", 0.15);
  };
  if (e.scare) { scare(); setTimeout(go, 1200); } else go();
}

async function summon() {
  const run = ++token;
  resetDrawing();
  $("endcnt").textContent = seen.size;
  for (const el of strokes) { await drawStroke(el); if (run !== token) return; }
  svg.classList.add("done");
  hero.classList.add("dance");
  await sleep(350);
  await typeMessage(MESSAGE);
  if (run !== token) return;
  setReady(true);
  scareClicks = rand(30, 40);
  armScare(rand(9000, 16000));
  armIdle();
}

$("btnStart").addEventListener("click", () => { audio(); beep(440); show("stage"); summon(); });
$("btnHow").addEventListener("click", () => { audio(); beep(300); show("howto"); });
$("btnBack").addEventListener("click", () => { beep(260); show("title"); });
$("btnMenu").addEventListener("click", () => { token++; resetDrawing(); beep(260); show("title"); });
$("btnRetry").addEventListener("click", () => { beep(440); show("stage"); summon(); });

squish.addEventListener("click", () => {
  if (!ready) return;
  clicks++;
  $("cnt").textContent = clicks;
  armIdle();
  const idx = ENDINGS.findIndex((e) => e.n === clicks);
  if (idx >= 0) return showEnding(idx);
  if (clicks === scareClicks) return scare();
  let i;
  do { i = Math.floor(Math.random() * TAUNTS.length); } while (i === lastTaunt);
  lastTaunt = i;
  setBubble(TAUNTS[i]);
  const names = Object.keys(MOVES);
  const move = clicks % 7 === 0 ? "faint" : names[rand(0, names.length - 1)];
  Object.keys(MOVES).forEach((m) => squish.classList.remove(m));
  squish.getBoundingClientRect();
  squish.classList.add(move);
  beep(move === "faint" ? 120 : rand(160, 260), 0.14, "sawtooth", 0.1);
  setTimeout(() => squish.classList.remove(move), MOVES[move]);
});

// 반쯤 감은 눈이 마우스 쪽으로 살짝 쏠림
window.addEventListener("pointermove", (e) => {
  const r = face.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const a = Math.atan2(dy, dx), d = Math.min(5, Math.hypot(dx, dy) / 40);
  lids.forEach((l) => { l.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.6}px)`; });
});

show("title");
resetDrawing();
