const $ = (id) => document.getElementById(id);
const button = $("summon");
const bubble = $("bubble");
const svg = $("jjolla");
const hero = $("hero");
const squish = $("squish");
const scareEl = $("scare");
const noise = $("noise");
const strokes = svg.querySelectorAll(".stroke");
const eyes = svg.querySelectorAll(".eye");
const pupils = svg.querySelectorAll(".pupil");

const MESSAGE = "재민 게이야 빨리 웹 사이트 만들어라";
const TAUNTS = [
  "왜 누르냐",
  "눌러도 아무 일 없음",
  "아프진 않은데 기분은 나쁨",
  "재민아 사이트 언제 만들래",
  "지금 뭐 하는 거임",
  "그만 눌러라",
  "피 나는 건 원래 그럼",
  "너 진짜 할 일 없구나",
  "웃고 있는 거 아님",
];
const STROKE_MS = 240;
const TYPE_MS = 55;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

let ready = false;
let clicks = 0;
let lastTaunt = -1;
let scaring = false;
let scareTimer = 0;
let scareClicks = 0;

function setBubble(text) {
  bubble.textContent = text;
  bubble.classList.toggle("show", Boolean(text));
}

function setReady(value) {
  ready = value;
  svg.classList.toggle("ready", value);
}

function resetDrawing() {
  setReady(false);
  clearTimeout(scareTimer);
  clicks = 0;
  svg.classList.remove("done");
  hero.classList.remove("dance");
  strokes.forEach((el) => {
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.opacity = 0;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
  });
  setBubble("");
}

async function drawStroke(el) {
  el.style.opacity = 1;
  el.getBoundingClientRect();
  el.style.transition = reduceMotion ? "none" : `stroke-dashoffset ${STROKE_MS}ms ease-out`;
  el.style.strokeDashoffset = 0;
  await sleep(STROKE_MS);
}

function typeMessage(text) {
  return new Promise((resolve) => {
    bubble.classList.add("show");
    if (reduceMotion) { bubble.textContent = text; return resolve(); }
    let i = 0;
    const timer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
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
button.addEventListener("click", async () => {
  button.disabled = true;
  audio(); // 클릭 시점에 소리 잠금 해제
  resetDrawing();
  for (const el of strokes) await drawStroke(el);
  svg.classList.add("done");
  hero.classList.add("dance");
  await sleep(350);
  await typeMessage(MESSAGE);
  setReady(true);
  scareClicks = rand(4, 7);
  armScare(rand(8000, 16000));
  button.textContent = "또 소환";
  button.disabled = false;
});

squish.addEventListener("click", () => {
  if (!ready) return;
  clicks++;
  if (clicks === scareClicks) return scare();
  if (clicks % 10 === 0) {
    setBubble(`${clicks}번 눌렀네. 상품 없음`);
  } else {
    let i;
    do { i = Math.floor(Math.random() * TAUNTS.length); } while (i === lastTaunt);
    lastTaunt = i;
    setBubble(TAUNTS[i]);
  }
  squish.classList.remove("boing");
  squish.getBoundingClientRect();
  squish.classList.add("boing");
});

window.addEventListener("pointermove", (e) => {
  eyes.forEach((eye, i) => {
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const dist = Math.min(6, Math.hypot(e.clientX - cx, e.clientY - cy) / 20);
    pupils[i].style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
  });
});

resetDrawing();
