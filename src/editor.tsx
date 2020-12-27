import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import React, { useEffect, useImperativeHandle, useState } from "react";

import { isMac } from "./actions";
import { codeFromSource } from "./code";
import { CodeTextArea } from "./code-text-area";
import { moveCursor } from "./cursor/move";
import { useHistory } from "./history";
import { Panel } from "./panel";
import { font } from "./ui";
import { Range } from "./utils";

const Container = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  ${font};
`;

const ResizeHandle = styled.div`
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  border-left: 2px dashed rgba(0, 0, 0, 0.1);
  padding-right: ${({ theme }) => theme.l.gap};
  background: white;
  cursor: col-resize;
  user-select: none;
`;

export type EditorHandle = { setSource: (value: string) => void };

const EditorInternal: React.ForwardRefRenderFunction<
  EditorHandle,
  {
    initialSource: string;
    runtimeError: Error | null;
    onChange: (value: string) => void;
  }
> = ({ initialSource, runtimeError, onChange }, ref) => {
  const [printWidth, setPrintWidth] = useState(80);
  const [resizeStartX, setResizeStartX] = useState<null | number>(null);
  const [editorState, queueAction] = useHistory(initialSource, printWidth);

  useImperativeHandle(ref, () => ({
    setSource(value) {
      queueAction(() => ({ code: codeFromSource(value) }));
    },
  }));

  useEffect(() => {
    onChange(editorState.code.source);
  }, [onChange, editorState.code]);

  useEffect(() => {
    if (resizeStartX == null) {
      return;
    }

    const handleResize = (event: MouseEvent) => {
      const colChange = Math.round((event.clientX - resizeStartX) / 2.9);
      if (colChange == 0) {
        return;
      }
      setResizeStartX(event.clientX);
      setPrintWidth(Math.max(20, printWidth + colChange));
    };
    const handleResizeStop = () => setResizeStartX(null);
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleResizeStop);
    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", handleResizeStop);
    };
  }, [printWidth, resizeStartX]);

  return (
    <Container>
      <Global
        styles={css`
          ::selection {
            background: yellow;
          }
        `}
      />
      <CodeTextArea
        editorState={editorState}
        cols={printWidth}
        onKeyDown={(event) => {
          if (
            (isMac ? event.metaKey : event.ctrlKey) &&
            ["c", "v", "r", "t", "w", "l"].some(
              (key) => event.code == `Key${key.toUpperCase()}`
            )
          ) {
            return;
          }
          event.preventDefault();
          queueAction(event);
        }}
        onCut={(event) => {
          event.preventDefault();

          queueAction(({ source }, { start, end }) => {
            if (start === end) {
              return;
            }
            event.clipboardData.setData(
              "text/plain",
              source.substr(start, end - start)
            );
            return {
              code: codeFromSource(
                source.substr(0, start) + source.substr(end)
              ),
              cursor: new Range(start),
            };
          });
        }}
        onPaste={(event) => {
          event.preventDefault();

          const clipboardText = event.clipboardData.getData("text/plain");
          queueAction(({ source }, { start, end }) => ({
            code: codeFromSource(
              source.slice(0, start) + clipboardText + source.slice(end)
            ),
            cursor: () => new Range(start + clipboardText.length),
          }));
        }}
        onClick={(event) => {
          const textArea = event.target as HTMLTextAreaElement;
          queueAction((code) => ({
            cursor: moveCursor(
              code,
              new Range(textArea.selectionStart, textArea.selectionEnd),
              null
            ),
          }));
        }}
      />
      <ResizeHandle
        title={printWidth.toString()}
        onMouseDown={(event) => setResizeStartX(event.clientX)}
      />
      <Panel
        {...{ editorState, runtimeError }}
        onAction={(action) => {
          queueAction((code, cursor) => action.do(code, cursor));
        }}
      />
    </Container>
  );
};

export const Editor = React.forwardRef(EditorInternal);
