import * as Babel from "@babel/standalone";
import styled from "@emotion/styled";
import * as React from "react";
import { useCallback, useEffect, useRef } from "react";

import { Editor } from "./editor";
import { Abyss, Key, Space, font } from "./ui";

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

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Card = styled.section`
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  padding: 20px;
  max-width: 600px;
  background: white;
  font-family: "Open Sans", sans-serif;
`;

const Output = styled.iframe`
  height: 350px;
  border: none;
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
const TOTAL = 23;
const EXPONENT = 5;
const WEIGHT = 3;
const MODULO = 10000;

let factor;

window.setup = () => {
  createCanvas(300, 300);
  fill(255);
  factor = (width - WEIGHT) / 2 / Math.pow(2, EXPONENT);
};

window.draw = () => {
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
};
`;

const AboutCard = () => (
  <Card>
    <h3 style={{ marginTop: 0 }}>What is this?</h3>
    <p>
      Tofu is an exploration in fluid code editing, freeing you from making
      meaningless changes to your code, like syntax management or code styling.
      Thus keypresses are wholly reserved for meaningful actions:
    </p>
    <ul>
      <li>
        Cursor keys only take you to places where you can make meaningful edits.
      </li>
      <li>
        Switching between <Keyword>const</Keyword>/<Keyword>let</Keyword>{" "}
        declaration requires only a single keypress.
      </li>
      <li>
        Putting a space after <Keyword>if</Keyword> always creates a complete
        if-statement (that being the only syntactically valid option since{" "}
        <Keyword>if</Keyword> can't be used as an identifier). Other keywords
        behave similarly.
      </li>
      <li>
        <Key value="Enter" /> always creates a new line underneath. Compare that
        to other editors, where Enter either breaks syntax or code style (unless
        you're already at the start/end of a line).
      </li>
    </ul>
  </Card>
);

const LinksCard = () => (
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
        - A blog post I wrote in early 2017, lining out my thinking at the time
        about code editing
      </li>
    </ul>
  </Card>
);

export function Demo() {
  const output = useRef<null | HTMLIFrameElement>(null);

  const updateP5 = useCallback(
    debounce((code: string) => {
      localStorage.setItem("code", code);

      const iframe = output.current!;
      iframe.addEventListener(
        "load",
        () => {
          try {
            const result = Babel.transform(code, {
              plugins: [
                Babel.availablePlugins["syntax-jsx"],
                Babel.availablePlugins["transform-react-jsx"],
              ],
            });
            (iframe.contentWindow as any).eval(result.code);
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/p5.js";
            const { body } = iframe.contentDocument!;
            Object.assign(body.style, {
              display: "flex",
              "justify-content": "center",
            });
            body.appendChild(script);
          } catch (e) {
            console.error(e);
          }
        },
        { once: true }
      );
      iframe.contentWindow!.location.reload();
    }, 1000),
    []
  );

  return (
    <Rows>
      <Output ref={output} />
      <Abyss />
      <Editor initialValue={WELCOME_CODE} onChange={updateP5} />

      <Abyss />

      <AboutCard />
      <Abyss />
      <LinksCard />
    </Rows>
  );
}
