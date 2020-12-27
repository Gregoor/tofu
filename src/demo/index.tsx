import { Global, css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import * as React from "react";
import { useCallback, useRef, useState } from "react";

import { Editor, EditorHandle } from "../editor";
import { Abyss, Key, font } from "../ui";
import { p5Runner } from "./p5";
import { reactRunner } from "./react";
import { Runner } from "./runner";

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
  background: ${({ theme }) => theme.c.cardBg};
  font-family: "Open Sans", sans-serif;
`;

const Output = styled.div`
  max-height: 100vh;
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const Keyword = styled.span`
  font-weight: bold;
  ${font};
`;

const AboutCard = ({
  onSelectRunner,
}: {
  onSelectRunner: (runner: Runner) => void;
}) => (
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
    <br />
    <button onClick={() => onSelectRunner(reactRunner)}>
      Show React example
    </button>
    <button onClick={() => onSelectRunner(p5Runner)}>Show P5 example</button>
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

function useRunner() {
  const [runner, setRunner] = useState<Runner>(
    ({ react: reactRunner, p5: p5Runner } as any)[
      localStorage.getItem("runner")!
    ] || reactRunner
  );
  const iteration = useRef(0);
  return [
    {
      example: runner.example,
      run: (...params: any[]) => {
        (runner.run as any)(...params, iteration.current++);
      },
      cleanUp: runner.cleanUp,
    },
    (runner: Runner) => {
      localStorage.setItem("runner", runner.name);
      setRunner(runner);
    },
  ] as const;
}

export function Demo() {
  const [runner, setRunner] = useRunner();
  const [initialSource] = useState(
    () => localStorage.getItem("source") || runner.example
  );
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const output = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const theme = useTheme();

  const updateOutput = useCallback(
    debounce((source: string) => {
      try {
        runner.run(output.current!, source, (error: Error) => {
          setRuntimeError(error);
        });
      } catch (e) {
        console.error("asd", e);
      }
    }, 200),
    [runner]
  );

  return (
    <Rows>
      <Global
        styles={css`
          body {
            background: ${theme.c.bg};
            color: ${theme.c.text};
          }
          h2 {
            color: ${theme.c.softText};
          }
          a:visited {
            color: ${theme.c.visitedLink};
          }
        `}
      />

      <Abyss />

      <AboutCard
        onSelectRunner={(newRunner) => {
          runner.cleanUp(output.current!);
          setRunner(newRunner);
          editorRef.current!.setSource(newRunner.example);
        }}
      />

      <Abyss />

      <Output ref={output} />
      <Abyss />
      <Editor
        ref={editorRef}
        {...{ initialSource, runtimeError }}
        onChange={(value) => {
          updateOutput(value);
          localStorage.setItem("source", value);
        }}
      />

      <Abyss />

      <LinksCard />
    </Rows>
  );
}
