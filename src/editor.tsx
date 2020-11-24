import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import React, { useCallback, useEffect, useState } from "react";

import { findAction, handleInput } from "./actions";
import { codeFromSource } from "./code";
import { CodeTextArea } from "./code-text-area";
import { moveCursor } from "./cursor/move";
import { useHistory } from "./history";
import { Panel } from "./panel";
import { font } from "./ui";
import { Direction, Range } from "./utils";

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

export function Editor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: Function;
}) {
  const [printWidth, setPrintWidth] = useState(80);
  const [resizeStartX, setResizeStartX] = useState<null | number>(null);

  const [editorState, applyChange] = useHistory(initialValue, printWidth);
  const { code, cursor } = editorState;
  const { source } = code;
  const { start, end } = cursor;

  const moveCursorInHistory = useCallback(
    (direction: Direction, from?: Range) => {
      const nextCursor = moveCursor(code, from || cursor, direction);
      if (JSON.stringify(cursor) != JSON.stringify(nextCursor)) {
        applyChange({ cursor: nextCursor });
      }
    },
    [cursor, source]
  );

  useEffect(() => {
    onChange(source);
  }, [source]);

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
          const action = findAction(code, cursor, event as any);
          const change = action && action();
          if (change) {
            applyChange(change);
            event.preventDefault();
            return;
          }
        }}
        onInput={(event: any) => {
          if (!event.data) {
            return;
          }
          applyChange(handleInput(code, cursor, event.data));
        }}
        onCut={(event) => {
          if (start === end) {
            return;
          }
          applyChange({
            code: codeFromSource(source.substr(0, start) + source.substr(end)),
            cursor: new Range(start),
          });
          event.clipboardData.setData(
            "text/plain",
            source.substr(start, end - start)
          );
          event.preventDefault();
        }}
        onPaste={(event) => {
          const clipboardText = event.clipboardData.getData("text/plain");
          applyChange({
            code: codeFromSource(
              source.slice(0, start) + clipboardText + source.slice(end)
            ),
            nextCursor: () => new Range(start + clipboardText.length),
          });
          event.preventDefault();
        }}
        onClick={(event) => {
          const textArea = event.target as HTMLTextAreaElement;
          moveCursorInHistory(
            null,
            new Range(textArea.selectionStart, textArea.selectionEnd)
          );
        }}
      />
      <ResizeHandle
        title={printWidth.toString()}
        onMouseDown={(event) => setResizeStartX(event.clientX)}
      />
      <Panel
        editorState={editorState}
        onAction={(action) => {
          const change = action.do(code, cursor);
          if (change) {
            applyChange(change);
          }
        }}
      />
    </Container>
  );
}
