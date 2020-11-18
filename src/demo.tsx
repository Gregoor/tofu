import * as Babel from "@babel/standalone";
import styled from "@emotion/styled";
import * as React from "react";

import { Editor } from "./editor";
import { Key, font } from "./ui";

function debounce(func: Function, wait: number) {
  let timeout: null | NodeJS.Timeout;
  return function () {
    // @ts-ignore
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      func.apply(context, args);
    };
    timeout && clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as any;
}

const Card = styled.section`
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  padding: 20px;
  max-width: 600px;
  background: white;
  font-family: "Open Sans", sans-serif;
`;

const Spacer = styled.div`
  margin-bottom: 20px;
`;

const CanvasContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const Keyword = styled.span`
  font-weight: bold;
  ${font};
`;

const WELCOME_CODE =
  localStorage.getItem("code") ||
  `// Demo using p5js (https://p5js.org)
const TOTAL = 42;
const EXPONENT = 23;
const WEIGHT = 7;
const MODULO = 5000;

let factor;

sketch.setup = () => {
  sketch.createCanvas(300, 300);
  sketch.fill(255);
  factor = (sketch.width - WEIGHT) / 2 / Math.pow(2, EXPONENT);
};

sketch.draw = () => {
  const now = performance.now();

  sketch.noStroke();
  sketch.rect(0, 0, sketch.width, sketch.height);
  sketch.stroke(0);
  sketch.strokeWeight(WEIGHT);

  for (let i = 0; i < TOTAL; i++) {
    let n = 1 - i / TOTAL;
    sketch.circle(
      sketch.width / 2,
      sketch.height / 2,
      Math.sin((2 * Math.PI * (performance.now() % MODULO)) / MODULO) *
        Math.pow(1 + n, EXPONENT) *
        factor,
    );
  }
};`;

export class Demo extends React.Component {
  canvasRef = React.createRef<HTMLDivElement>();
  p5Instance: any = null;

  componentDidMount() {
    const script = document.createElement("script");

    script.onload = () => {
      this.updateP5(WELCOME_CODE);
    };
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/p5.js";
    script.async = true;

    document.body.appendChild(script);
  }

  updateP5 = debounce((code: string) => {
    localStorage.setItem("code", code);
    const el = this.canvasRef.current;
    if (this.p5Instance && el) {
      this.p5Instance.remove();
      el.innerHTML = "";
    }
    return;
    try {
      const result = Babel.transform(code, {
        plugins: [
          Babel.availablePlugins["syntax-jsx"],
          Babel.availablePlugins["transform-react-jsx"],
        ],
      });
      this.p5Instance = new (window as any).p5(
        new Function("sketch", result.code),
        el
      );
    } catch (e) {
      console.error(e);
    }
  }, 1000);

  render() {
    return (
      <>
        <CanvasContainer ref={this.canvasRef} />

        <Editor initialValue={WELCOME_CODE} onChange={this.updateP5} />

        <Spacer />

        <Card>
          <h3 style={{ marginTop: 0 }}>What is this?</h3>
          <p>
            Tofu is an exploration in fluid code editing, freeing you from
            making meaningless changes to your code, like syntax management or
            code styling. Thus keypresses are wholly reserved for meaningful
            actions like:
          </p>
          <ul>
            <li>
              Cursor keys only take you to places where you can make meaningful
              edits.
            </li>
            <li>
              Switching between <Keyword>const</Keyword>/<Keyword>let</Keyword>{" "}
              declaration requires only a single keypress.
            </li>
            <li>
              Putting a space after <Keyword>if</Keyword> always creates a
              complete if-block (that being the only syntactically valid
              option). Other keywords behave similarly.
            </li>
            <li>
              <Key value="Enter" /> always creates a new line underneath.
              Compare that to other editors, where Enter either breaks syntax or
              code style (unless you're already at the start/end of a line).
            </li>
          </ul>
        </Card>

        <Spacer />

        <Card>
          <h3 style={{ marginTop: 0 }}>Links</h3>
          <ul>
            <li>
              <a href="https://github.com/Gregoor/tofu">Source</a>
            </li>
            <li>
              <a href="https://github.com/Gregoor/tofu/issues">Issues</a>
            </li>
            <li>
              <a href="https://gregoor.github.io/syntactor/">Syntactor</a> - My
              previous attempt at tackling this
            </li>
            <li>
              <a href="https://dflate.io/code-is-not-just-text">
                Code is not just text
              </a>{" "}
              - A blog post I wrote in early 2017, lining out my thinking at the
              time about code editing
            </li>
          </ul>
        </Card>
      </>
    );
  }
}
