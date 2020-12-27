import { Runner } from "./runner";

export const EXAMPLE_CODE = `
const TOTAL = 10;
const WEIGHT = 3;

function setup() {
  createCanvas(300, 300);
  fill(0, 0);
}

function draw() {
  const now = performance.now() / 100;

  clear();
  stroke(0);
  strokeWeight(WEIGHT);

  for (let i = 0; i < TOTAL; i++) {
    let n = 1 - i / TOTAL;
    let radius = width - ((now * i) % width) - WEIGHT;
    circle(width / 2, height / 2, radius);
  }
}`;

export const p5Runner: Runner = {
  id: "p5",
  label: "p5.js",
  docsURL: "https://p5js.org/get-started/",
  example: EXAMPLE_CODE,
  run(container, source) {
    container.textContent = "";
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      width: "100%",
      "min-height": "300px",
      border: "none",
    });
    container.appendChild(iframe);
    (iframe.contentWindow as any).eval(source);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/p5@1.1.9/lib/p5.min.js";
    const { body } = iframe.contentDocument!;
    Object.assign(body.style, {
      margin: 0,
      display: "flex",
      "justify-content": "center",
    });
    body.appendChild(script);
  },
  cleanUp(container) {
    container.innerText = "";
  },
};
