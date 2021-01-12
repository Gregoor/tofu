import { useEffect, useState } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import * as FormatWorker from "workerize-loader?inline!./format.worker";

import { findAction, handleInput } from "./actions";
import { Code, codeFromSource, isValid } from "./code";
import { useSelectRange } from "./cursor/select-range";
import type { format } from "./format.worker";
import { reportError } from "./report";
import { Action, Change, Range } from "./utils";

const formatInWorker = ((FormatWorker as any).format ||
  new (FormatWorker as any)().format) as typeof format;

export type EditorState = Readonly<{
  code: Code;
  cursor: Range;
  formattedForPrintWidth: null | number;
}>;

export type QueueItem = Action | KeyboardEvent;

export function useHistory(
  initialSource: string,
  printWidth = 80
): [EditorState, (item: QueueItem) => void] {
  const [[index, editorStates], setHistory] = useState<[number, EditorState[]]>(
    () => [
      0,
      [
        {
          code: codeFromSource(initialSource),
          cursor: new Range(0),
          formattedForPrintWidth: null,
        },
      ],
    ]
  );
  const current = editorStates[index];

  const [queue, setQueue] = useState<QueueItem[]>([]);

  const selectRange = useSelectRange();

  useEffect(() => {
    const { code, cursor, formattedForPrintWidth } = current;
    if (!isValid(code) || formattedForPrintWidth == printWidth) {
      return;
    }

    const formatPromise = formatInWorker({
      code: code.source,
      cursorOffset: cursor.start,
      printWidth,
    });

    formatPromise
      .then((result: any) => {
        if (!result) {
          reportError(new Error("error while formatting, uck!"));
          return;
        }

        const newEditorStates = editorStates.slice();
        const newCode = codeFromSource(result.formatted);
        newEditorStates[index] = {
          code: newCode.source === code.source ? code : newCode,
          cursor: new Range(Math.max(result.cursorOffset, 0)),
          formattedForPrintWidth: printWidth,
        };
        setHistory([index, newEditorStates]);
      })
      .catch((error: any) => reportError(error));
  }, [current, index, editorStates, printWidth]);

  useEffect(() => {
    if (
      queue.length == 0 ||
      (isValid(current.code) && current.formattedForPrintWidth != printWidth)
    ) {
      return;
    }

    const actionOrEvent = queue[0];
    setQueue(queue.slice(1));

    const { code, cursor } = current;
    let action: undefined | null | Action;
    if (actionOrEvent instanceof KeyboardEvent) {
      const event = actionOrEvent;
      action = findAction(code, cursor, event);
      if (!action && event.key.length <= 2) {
        action = () => handleInput(code, cursor, event.key);
      }
    } else {
      action = actionOrEvent;
    }

    let change: undefined | null | Change;
    try {
      change = action && action(code, cursor);
    } catch (e) {
      reportError(e);
    }
    if (!change) {
      return;
    }

    if ("history" in change) {
      const hasCodeChange = (state: EditorState) =>
        code.source !== state.code.source;
      if (change.history == "UNDO") {
        const nextIndex = index + 1;
        const lastCodeChangeIndex = editorStates
          .slice(nextIndex)
          .findIndex(hasCodeChange);
        if (lastCodeChangeIndex != -1) {
          setHistory([nextIndex + lastCodeChangeIndex, editorStates]);
        }
      } else if (change.history == "REDO") {
        const previousIndex = index - 1;
        const lastCodeChangeIndex = editorStates
          .slice(0, Math.max(previousIndex, 0))
          .reverse()
          .findIndex(hasCodeChange);
        if (lastCodeChangeIndex != -1) {
          setHistory([previousIndex - lastCodeChangeIndex, editorStates]);
        }
      }
      return;
    }

    if ("cursor" in change && typeof change.cursor == "function") {
      const cursorAction = change.cursor;
      try {
        setQueue((queue) => [
          (code, cursor) => ({ cursor: cursorAction(code, cursor) }),
          ...queue,
        ]);
      } catch (e) {
        reportError(e);
      }
    }

    const newEditorState = {
      ...current,
      ...("code" in change && { code: change.code }),
      ...("cursor" in change &&
        typeof change.cursor !== "function" && { cursor: change.cursor }),
      ...("rangeSelect" in change && {
        cursor: selectRange(current.code, current.cursor, change.rangeSelect),
      }),
      formattedForPrintWidth:
        "code" in change &&
        change.code.source !== current.code.source &&
        !("skipFormatting" in change && change.skipFormatting)
          ? null
          : current.formattedForPrintWidth,
    };
    setHistory([0, [newEditorState, ...editorStates.slice(index)]]);
  }, [editorStates, index, current, queue, printWidth, selectRange]);

  return [current, (item) => setQueue((queue) => queue.concat(item))];
}
