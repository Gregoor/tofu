import { Global, css, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Editor, EditorHandle } from "../editor";
import { Abyss } from "../ui";
import { AboutCard, Card, CardTitle, DesignCard, LinksCard } from "./content";
import { jsRunner } from "./javascript";
import { p5Runner } from "./p5";
import { reactRunner } from "./react";
import { Runner } from "./runner";

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Output = styled.div`
  max-height: 100vh;
`;

const ExampleButton = styled.button<{ isActive: boolean }>`
  border: 2px solid ${({ theme }) => theme.c.light};
  margin-right: ${({ theme }) => theme.l.abyss};
  padding: ${({ theme }) => theme.l.space};
  display: flex;
  align-items: center;
  font-weight: bold;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.kind == "light" ? theme.c.cardBg : theme.c.bg};

  ${(p) => p.isActive && "border-color: " + p.theme.c.softText + ";"}
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
    <CardTitle id="examples">Examples</CardTitle>
    <p>
      Click one of these buttons to change the editor runtime environment and
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

function useRunner() {
  const [runner, setRunner] = useState<Runner>(
    () =>
      [jsRunner, reactRunner, p5Runner].find(
        (runner) => runner.id == localStorage.getItem("runner")
      ) || reactRunner
  );
  const iteration = useRef(0);
  return useMemo(
    () =>
      [
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
      ] as const,
    [runner]
  );
}

export function Demo() {
  const [runner, setRunner] = useRunner();
  const [source, setSource] = useState(
    () => localStorage.getItem("source") || runner.example
  );
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const output = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const theme = useTheme();

  useEffect(() => {
    const container = output.current!;
    const timeout = setTimeout(() => {
      try {
        runner.run(container, source, (error: Error) => {
          setRuntimeError(error);
        });
      } catch (e) {
        setRuntimeError(e);
      }
    }, 500);
    return () => {
      runner.cleanUp(container);
      clearTimeout(timeout);
    };
  }, [runner, source]);

  const handleChange = useCallback((value: string) => {
    setRuntimeError(null);
    setSource(value);
    localStorage.setItem("source", value);
  }, []);

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
        {...{ initialSource: source, runtimeError }}
        onChange={handleChange}
      />

      <Abyss />

      <DesignCard />

      <Abyss />

      <LinksCard />
    </Rows>
  );
}
