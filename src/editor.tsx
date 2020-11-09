import { Global, css } from "@emotion/core";
import styled from "@emotion/styled";
import React, { useCallback, useEffect, useState } from "react";

import ActionPanel from "./action-panel";
import { findAction } from "./actions";
import CodeTextArea from "./code-text-area";
import { moveCursor } from "./cursor/move";
import { CodeWithAST, useHistory } from "./history";
import { font } from "./ui";
import { Direction, Range } from "./utils";

const Container = styled.div`
  display: flex;
  justify-content: center;
  ${font};
`;

const ResizeHandle = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-left: none;
  border-right: 2px dashed rgba(0, 0, 0, 0.1);
  width: 8px;
  background: white;
  cursor: col-resize;
  user-select: none;
`;

export default function Editor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: Function;
}) {
  const [printWidth, setPrintWidth] = useState(80);
  const [resizeStartX, setResizeStartX] = useState<null | number>(null);

  const [editorState, applyChange] = useHistory(initialValue, printWidth);
  const { codeWithAST, cursor } = editorState;
  const { code, ast } = codeWithAST;
  const { start, end } = cursor;

  const moveCursorInHistory = useCallback(
    (direction: Direction, from?: Range) => {
      const nextCursor = moveCursor(codeWithAST, from || cursor, direction);
      if (JSON.stringify(cursor) != JSON.stringify(nextCursor)) {
        applyChange({ cursor: nextCursor });
      }
    },
    [cursor, codeWithAST]
  );

  useEffect(() => {
    onChange(code);
  }, [code]);

  useEffect(() => {
    if (resizeStartX == null) {
      return;
    }

    const handleResize = (event) => {
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
          const action = findAction(codeWithAST, cursor, event as any);
          if (action) {
            applyChange(action());
            event.preventDefault();
            return;
          }
        }}
        onInput={(event: any) => {
          if (!event.data) {
            return;
          }

          const newCode = code.slice(0, start) + event.data + code.slice(end);

          const newStart = start + event.data.length;
          applyChange({
            codeWithAST: CodeWithAST.fromCode(newCode),
            cursor: new Range(newStart),
          });
        }}
        onCut={(event) => {
          if (start === end) {
            return;
          }
          applyChange({
            codeWithAST: CodeWithAST.fromCode(
              code.substr(0, start) + code.substr(end)
            ),
            cursor: new Range(start),
          });
          event.clipboardData.setData(
            "text/plain",
            code.substr(start, end - start)
          );
          event.preventDefault();
        }}
        onPaste={(event) => {
          const clipboardText = event.clipboardData.getData("text/plain");
          applyChange({
            codeWithAST: CodeWithAST.fromCode(
              code.slice(0, start) + clipboardText + code.slice(end)
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
      <ActionPanel
        {...{ codeWithAST, cursor }}
        onAction={(action) => {
          const change = action.do(codeWithAST, cursor);
          if (change) {
            applyChange(change);
          }
        }}
      />
    </Container>
  );
}
