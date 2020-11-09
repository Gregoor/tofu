import pick from "lodash.pick";
import { useEffect, useState } from "react";

import { Code, codeFromSource } from "./code";
import { useFormat } from "./format";
import { useRangeSelect } from "./range-select";
import { Change, Range } from "./utils";

export type EditorState = Readonly<{
  code: Code;
  cursor: Range;
  formattedForPrintWidth: null | number;
}>;

function logAndEventuallyReportToSentry(error: Error) {
  console.error(error);
}

export function useHistory(
  initialValue: string,
  printWidth: number
): [EditorState, (change: Change<Code>) => void] {
  const [history, setHistory] = useState<EditorState[]>(() => [
    {
      code: codeFromSource(initialValue),
      cursor: new Range(0),
      formattedForPrintWidth: null,
    },
  ]);
  const [index, setIndex] = useState(0);
  const [formatOptions, setFormatOptions] = useState<null | {
    nextCursor: (code: Code, cursor: Range) => Range;
  }>(null);
  const rangeSelect = useRangeSelect();
  const format = useFormat();

  const current = history[index];

  useEffect(() => {
    const { code, cursor, formattedForPrintWidth } = current;
    if (formattedForPrintWidth == printWidth && !formatOptions) {
      return;
    }

    if (formattedForPrintWidth == printWidth && formatOptions) {
      const newHistory = history.slice();
      try {
        newHistory[index] = {
          code,
          cursor: formatOptions.nextCursor(code, cursor),
          formattedForPrintWidth: printWidth,
        };
        setHistory(newHistory);
      } catch (error) {
        logAndEventuallyReportToSentry(error);
      }
      setFormatOptions(null);
      return;
    }

    const [formatPromise, cancel] = format({
      code: code.source,
      cursorOffset: cursor.start,
      printWidth,
    });

    formatPromise.then((result: any) => {
      if (!result) {
        if (formatOptions) {
          logAndEventuallyReportToSentry(
            new Error("error while formatting, uck!")
          );
        }
        return;
      }

      const newHistory = history.slice();
      const newCode = codeFromSource(result.formatted);
      const newCursor = new Range(Math.max(result.cursorOffset, 0));
      newHistory[index] = {
        code: newCode.source === code.source ? code : newCode,
        cursor: formatOptions?.nextCursor(newCode, newCursor) || newCursor,
        formattedForPrintWidth: printWidth,
      };
      setHistory(newHistory);
      setFormatOptions(null);
    });

    return cancel;
  }, [history, formatOptions, printWidth]);

  return [
    current,
    function applyChange(change) {
      if ("history" in change) {
        const hasCodeChange = (state: EditorState) =>
          current.code.source !== state.code.source;
        if (change.history == "UNDO") {
          const nextIndex = index + 1;
          const lastCodeChangeIndex = history
            .slice(nextIndex)
            .findIndex(hasCodeChange);
          if (lastCodeChangeIndex != -1) {
            setIndex(nextIndex + lastCodeChangeIndex);
          }
        } else if (change.history == "REDO") {
          const previousIndex = index - 1;
          const lastCodeChangeIndex = history
            .slice(0, Math.max(previousIndex, 0))
            .reverse()
            .findIndex(hasCodeChange);
          if (lastCodeChangeIndex != -1) {
            setIndex(previousIndex - lastCodeChangeIndex);
          }
        }
        return;
      }
      setHistory([
        {
          ...current,
          ...pick(change, "code", "cursor"),
          formattedForPrintWidth:
            "code" in change &&
            change.code &&
            change.code.source !== current.code.source
              ? null
              : current.formattedForPrintWidth,
          ...("rangeSelect" in change
            ? {
                cursor: rangeSelect.run(
                  current.code,
                  current.cursor,
                  change.rangeSelect
                ),
              }
            : {}),
        },
        ...history.slice(index),
      ]);
      setIndex(0);
      if ("nextCursor" in change) {
        setFormatOptions(pick(change, "nextCursor"));
      }
    },
  ];
}
