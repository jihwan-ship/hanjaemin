const button = document.getElementById("summon");
const bubble = document.getElementById("bubble");
const strokes = document.querySelectorAll("#jjolla .stroke");

const MESSAGE = "재민 게이야 빨리 웹 사이트 만들어라";
const STROKE_MS = 350;   // 획 하나 그리는 시간
const TYPE_MS = 60;      // 글자 하나 나오는 간격

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 처음엔 선을 전부 숨김
function resetDrawing() {
  strokes.forEach((el) => {
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
  });
  bubble.textContent = "";
  bubble.classList.remove("show");
}

function drawStroke(el) {
  return new Promise((resolve) => {
    el.getBoundingClientRect(); // 리플로우로 transition 초기화
    el.style.transition = reduceMotion ? "none" : `stroke-dashoffset ${STROKE_MS}ms ease-out`;
    el.style.strokeDashoffset = 0;
    setTimeout(resolve, reduceMotion ? 0 : STROKE_MS);
  });
}

function typeMessage(text) {
  return new Promise((resolve) => {
    bubble.classList.add("show");
    if (reduceMotion) {
      bubble.textContent = text;
      return resolve();
    }
    let i = 0;
    const timer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, TYPE_MS);
  });
}

button.addEventListener("click", async () => {
  button.disabled = true;
  resetDrawing();

  for (const el of strokes) {
    await drawStroke(el);
  }
  await typeMessage(MESSAGE);

  button.textContent = "한 번 더!";
  button.disabled = false;
});

resetDrawing();
