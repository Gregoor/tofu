import React, { useCallback, useEffect, useRef, useState } from "react";

import CodeTextArea from "./code-text-area";
import { moveCursor } from "./cursor/move";
import { Cursor, Direction } from "./cursor/types";
import { spreadCursor } from "./cursor/utils";
import { useFormat } from "./format";
import { Container, GlobalStyle, ResizeHandle } from "./ui";
import useHistory, { CodeWithAST, EditorState } from "./use-history";

const KEY_ACTIONS: {
  [key: string]: (
    codeWithAST: CodeWithAST,
    cursor: Cursor
  ) => Partial<{
    codeWithAST: CodeWithAST;
    cursor: Cursor | number;
    skipFormatting: boolean;
  }>;
} = {
  ...Object.fromEntries(
    [
      ["ArrowLeft", "LEFT"],
      ["ArrowRight", "RIGHT"],
      ["ArrowUp", "UP"],
      ["ArrowDown", "DOWN"],
    ].map(([key, direction]: [string, Direction]) => [
      key,
      (codeWithAST, cursor) => ({
        cursor: moveCursor(codeWithAST, cursor, direction),
      }),
    ])
  ),

  Enter: ({ code }, [start]) => {
    const accuCharCounts = code
      .split("\n")
      .map((s, i) => s.length + (i == 0 ? 0 : 1))
      .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
    let index = accuCharCounts.findIndex(
      (n) => n >= start - 2 // I don't quite get this one
    );
    // if (event.shiftKey && index > 0) {
    //   index -= 1;
    // }
    const pos = index == -1 ? 0 : accuCharCounts[index];
    return {
      codeWithAST: CodeWithAST.fromCode(
        code.slice(0, pos) + "\n" + code.slice(pos)
      ),
      cursor: pos == 0 ? 0 : pos + 1,
      skipFormatting: true,
    };
  },

  Backspace: ({ code, ast }, [start, end]) => {
    const codeWithAST = CodeWithAST.fromCode(
      code.slice(0, start === end ? start - 1 : start) + code.slice(start)
    );
    return {
      codeWithAST,
      cursor: moveCursor(codeWithAST, [start, end], "LEFT"),
    };
  },

  Delete: ({ code, ast }, [start, end]) => ({
    codeWithAST: CodeWithAST.fromCode(
      code.slice(0, start) + code.slice(start === end ? end + 1 : end)
    ),
  }),
};

export default function Editor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: Function;
}) {
  const [printWidth, setPrintWidth] = useState(80);

  const [{ codeWithAST, cursor }, history] = useHistory(initialValue);
  const { code, ast } = codeWithAST;
  const [start, end] = cursor;
  const format = useFormat();

  const moveCursorInHistory = useCallback(
    (direction: Direction, from?: Cursor) => {
      const nextCursor = moveCursor(codeWithAST, from || cursor, direction);
      if (JSON.stringify(cursor) != JSON.stringify(nextCursor)) {
        history.add({ cursor: nextCursor });
      }
    },
    [cursor, codeWithAST]
  );

  const [formatPromise, setFormatPromise] = useState<ReturnType<typeof format>>(
    null
  );
  const formatInHistory = useCallback(
    async (code: string, cursorOffset: number) => {
      if (formatPromise) {
        formatPromise.cancel();
      }

      const newFormatPromise = format({
        code,
        cursorOffset,
        printWidth,
      });
      setFormatPromise(newFormatPromise);

      const result = await newFormatPromise;
      setFormatPromise(null);
      if (!result) {
        return;
      }
      const newCodeWithAST = CodeWithAST.fromCode(result.formatted);
      if (newCodeWithAST.code === code) {
        return;
      }
      history.override({
        codeWithAST: newCodeWithAST,
        cursor: [result.cursorOffset, result.cursorOffset],
        formattedForPrintWidth: printWidth,
      });
    },
    [history, formatPromise, printWidth]
  );

  useEffect(() => {
    onChange(code);
  }, [code]);

  console.log(JSON.stringify({ code, cursor }, null, 2));

  return (
    <Container>
      <GlobalStyle />
      <CodeTextArea
        value={code}
        cursor={cursor}
        cols={printWidth}
        disabled={!!formatPromise}
        onKeyDown={(event) => {
          if (formatPromise) {
            event.preventDefault();
            return;
          }
          const action = KEY_ACTIONS[event.key];
          if (action) {
            const state = action(codeWithAST, cursor);
            const newCursor = state.cursor
              ? spreadCursor(state.cursor)
              : cursor;
            history.add({ codeWithAST: state.codeWithAST, cursor: newCursor });
            if (state.codeWithAST && !state.skipFormatting) {
              formatInHistory(state.codeWithAST.code, newCursor[0]);
            }
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
          history.add({
            codeWithAST: CodeWithAST.fromCode(newCode),
            cursor: spreadCursor(newStart),
            formattedForPrintWidth: null,
          });

          formatInHistory(newCode, newStart);
        }}
        onClick={(event) => {
          const textArea = event.target as HTMLTextAreaElement;
          moveCursorInHistory(null, [
            textArea.selectionStart,
            textArea.selectionEnd,
          ]);
        }}
      />
      <ResizeHandle
        title={"80"}
        onMouseDown={(event) => (this.resizeStartX = event.clientX)}
      />
    </Container>
  );
}
