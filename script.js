const $ = (id) => document.getElementById(id);
const button = $("summon");
const bubble = $("bubble");
const svg = $("jjolla");
const hero = $("hero");
const squish = $("squish");
const loader = $("loader");
const strokes = svg.querySelectorAll(".stroke");
const eyes = svg.querySelectorAll(".eye");
const pupils = svg.querySelectorAll(".pupil");

const MESSAGE = "재민 게이야 빨리 웹 사이트 만들어라";
const TAUNTS = [
  "메롱~ ㅋㅋㅋ",
  "약오르지? 약오르지?",
  "눌러도 소용없지롱",
  "어쭈? 또 눌렀어?",
  "간지러워 ㅋㅋㅋ 그만~",
  "재민아 빨리 만들라고~",
  "나 잡아봐라~ 못 잡지?",
  "아야! ...는 뻥이야 ㅋ",
];
const STROKE_MS = 260;
const TYPE_MS = 55;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

let ready = false;
let clicks = 0;
let lastTaunt = -1;

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

// 플래시 게임 특유의 가짜 로딩: 99%에서 멈췄다가 뻥이라고 함
async function fakeLoad() {
  const fill = $("fill");
  const pct = $("pct");
  const text = $("loadText");
  const setPct = (p) => { fill.style.width = p + "%"; pct.textContent = p + "%"; };

  loader.hidden = false;
  text.textContent = "쫄라맨 로딩중...";
  for (let p = 0; p < 99; p += 3) { setPct(p); await sleep(30); }
  setPct(99);
  text.textContent = "거의 다 됐어요~";
  await sleep(1100);
  text.textContent = "사실 뻥이지롱 ㅋㅋ";
  await sleep(900);
  setPct(100);
  await sleep(400);
  loader.hidden = true;
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

button.addEventListener("click", async () => {
  button.disabled = true;
  resetDrawing();
  await fakeLoad();
  for (const el of strokes) await drawStroke(el);
  svg.classList.add("done");
  hero.classList.add("dance");
  await sleep(350);
  await typeMessage(MESSAGE);
  setReady(true);
  button.textContent = "또 약올려줘!";
  button.disabled = false;
});

// 쫄라맨을 누르면 약올림
squish.addEventListener("click", () => {
  if (!ready) return;
  clicks++;
  if (clicks % 10 === 0) {
    setBubble(`${clicks}번 눌렀네? 상품은 없어 ㅋㅋ`);
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

// 눈동자가 마우스를 계속 쳐다봄
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
