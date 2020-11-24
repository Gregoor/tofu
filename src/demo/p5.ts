import { Runner } from "./utils";

export const EXAMPLE_CODE = `// Demo using p5js (https://p5js.org)
const TOTAL = 23;
const EXPONENT = 5;
const WEIGHT = 3;
const MODULO = 10000;

let factor;

function setup() {
  createCanvas(300, 300);
  fill(255);
  factor = (width - WEIGHT) / Math.pow(2, EXPONENT);
}

function draw() {
  const now = performance.now();

  clear();
  stroke(0);
  strokeWeight(WEIGHT);

  for (let i = 0; i < TOTAL; i++) {
    let n = 1 - i / TOTAL;
    circle(
      width / 2,
      height / 2,
      Math.sin((2 * Math.PI * (performance.now() % MODULO)) / MODULO) *
        Math.pow(1 + n, EXPONENT) *
        factor,
    );
  }
}
`;

export const p5Runner: Runner = {
  example: EXAMPLE_CODE,
  run(container, source) {
    container.textContent = "";
    const iframe = document.createElement("iframe");
    iframe.style.border = "none";
    container.appendChild(iframe);
    (iframe.contentWindow as any).eval(source);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/p5@1.1.9/lib/p5.min.js";
    const { body } = iframe.contentDocument!;
    Object.assign(body.style, {
      display: "flex",
      "justify-content": "center",
    });
    body.appendChild(script);
  },
};
