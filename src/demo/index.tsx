import { Global, css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import * as React from "react";
import { useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Editor, EditorHandle } from "../editor";
import { Abyss, Key, font } from "../ui";
import { jsRunner } from "./javascript";
import { p5Runner } from "./p5";
import { reactRunner } from "./react";
import { Runner } from "./runner";

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
  width: 100%;
  background: ${({ theme }) => theme.c.cardBg};
  font-family: "Open Sans", sans-serif;
`;

const Output = styled.div`
  max-height: 100vh;
`;

const Keyword = styled.span`
  font-weight: bold;
  ${font};
`;

const CardTitle = styled.h3`
  margin-top: 0;
`;

const AboutCard = () => (
  <Card>
    <CardTitle>What is this?</CardTitle>
    <p>
      Tofu is an exploration in fluid code editing. It manages syntax and code
      style for you. Thus keypresses are wholly reserved for meaningful actions:
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

const ExampleButton = styled.button<{ isActive: boolean }>`
  border: 2px solid #a2a2a2;
  margin-right: ${({ theme }) => theme.l.abyss};
  padding: ${({ theme }) => theme.l.space};
  display: flex;
  align-items: center;
  font-weight: bold;
  cursor: pointer;
  background: ${({ theme }) => theme.c.bg};

  ${(p) => p.isActive && "border-color: " + p.theme.c.text + ";"}
`;

const DocsLink = styled.a`
  color: ${({ theme }) => theme.c.visitedLink};
`;

const ExamplesCard = ({
  activeRunner,
  onSelectRunner,
}: {
  activeRunner: Runner;
  onSelectRunner: (runner: Runner) => void;
}) => (
  <Card>
    <CardTitle>Examples</CardTitle>
    <p>
      Click one of those buttons to change the editor runtime environment and
      see the sample code below.
      <br />
      Current selection is:{" "}
      <DocsLink href={activeRunner.docsURL} target="_blank" rel="noreferrer">
        {activeRunner.label} (click here to see the docs)
      </DocsLink>
    </p>

    <div style={{ display: "flex" }}>
      <ExampleButton
        isActive={activeRunner.id == jsRunner.id}
        onClick={() => onSelectRunner(jsRunner)}
        style={{ color: "#f0d000" }}
      >
        {jsRunner.label}
      </ExampleButton>

      <ExampleButton
        isActive={activeRunner.id == reactRunner.id}
        onClick={() => onSelectRunner(reactRunner)}
        style={{ color: "#5cceed" }}
      >
        <img
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMS41IC0xMC4yMzE3NCAyMyAyMC40NjM0OCI+CiAgPHRpdGxlPlJlYWN0IExvZ288L3RpdGxlPgogIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyLjA1IiBmaWxsPSIjNjFkYWZiIi8+CiAgPGcgc3Ryb2tlPSIjNjFkYWZiIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIi8+CiAgICA8ZWxsaXBzZSByeD0iMTEiIHJ5PSI0LjIiIHRyYW5zZm9ybT0icm90YXRlKDYwKSIvPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIiB0cmFuc2Zvcm09InJvdGF0ZSgxMjApIi8+CiAgPC9nPgo8L3N2Zz4K"
          height="20"
          style={{ marginRight: 5 }}
          alt="React"
        />
        {reactRunner.label}
      </ExampleButton>

      <ExampleButton
        isActive={activeRunner.id == p5Runner.id}
        onClick={() => onSelectRunner(p5Runner)}
        style={{ color: "#ed225d" }}
      >
        {p5Runner.label}
      </ExampleButton>
    </div>
  </Card>
);

const LinksCard = () => (
  <Card>
    <CardTitle>Links</CardTitle>
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
    () =>
      [jsRunner, reactRunner, p5Runner].find(
        (runner) => runner.id == localStorage.getItem("runner")
      ) || reactRunner
  );
  const iteration = useRef(0);
  return [
    {
      ...runner,
      run: (...params: any[]) => {
        (runner.run as any)(...params, iteration.current++);
      },
    },
    (runner: Runner) => {
      localStorage.setItem("runner", runner.id);
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

  const updateOutput = useDebouncedCallback((source: string) => {
    try {
      runner.run(output.current!, source, (error: Error) => {
        setRuntimeError(error);
      });
    } catch (e) {
      console.error("asd", e);
    }
  }, 200);

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

          p {
            margin-block-start: ${theme.l.abyss};
            margin-block-end: ${theme.l.abyss};
          }

          body > iframe {
            display: none !important;
          }

          .console-log {
            margin: 0 -${theme.l.abyss};
            padding: 0 ${theme.l.abyss};
            width: 100%;

            & > * {
              border-bottom: 1px solid #dbdbdb;
              margin: ${theme.l.gap} 0;
              width: 100%;

              &:last-child {
                border-bottom: none;
              }
            }
          }
        `}
      />

      <Abyss />

      <AboutCard />

      <Abyss />

      <ExamplesCard
        activeRunner={runner}
        onSelectRunner={(newRunner) => {
          runner.cleanUp(output.current!);
          setRunner(newRunner);
          editorRef.current!.setSource(newRunner.example);
        }}
      />

      <Abyss />

      <Card>
        <CardTitle>Result</CardTitle>
        <Output ref={output} />
      </Card>
      <Abyss />
      <Editor
        ref={editorRef}
        {...{ initialSource, runtimeError }}
        onChange={(value) => {
          updateOutput.callback(value);
          localStorage.setItem("source", value);
        }}
      />

      <Abyss />

      <LinksCard />
    </Rows>
  );
}
