import generate from "@babel/generator";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import produce, { immerable } from "immer";
import pick from "lodash.pick";
import { useEffect, useState } from "react";

import { replaceCode } from "./code-utils";
import { useFormat } from "./format";
import { useRangeSelect } from "./range-select";
import { Change, Range } from "./utils";

export class CodeWithAST {
  code: string;
  ast: t.File | null = null;
  error: SyntaxError;

  private constructor(code: string, ast: t.File, error?: SyntaxError) {
    this.code = code;
    this.ast = ast;
    this.error = error;
  }

  static fromCode(code: string) {
    try {
      return new CodeWithAST(code, parse(code));
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      return new CodeWithAST(code, null, error);
    }
  }

  static fromMutatedAST(ast: t.File, produceAST: (ast: t.File) => void) {
    ast[immerable] = true;
    const newAST = produce(ast as t.File, produceAST);
    return new CodeWithAST(
      generate(newAST, { retainLines: true }).code,
      newAST
    );
  }

  replaceCode(range: Range, replacement: string) {
    return CodeWithAST.fromCode(replaceCode(this.code, range, replacement));
  }

  mutateAST(produceAST: (ast: t.File) => void) {
    return CodeWithAST.fromMutatedAST(this.ast, produceAST);
  }
}

export type EditorState = Readonly<{
  codeWithAST: CodeWithAST;
  cursor: Range;
  formattedForPrintWidth: null | number;
}>;

function logAndEventuallyReportToSentry(error: Error) {
  console.error(error);
}

export function useHistory(
  initialValue: string,
  printWidth: number
): [EditorState, (change: Change) => void] {
  const [history, setHistory] = useState<EditorState[]>(() => [
    {
      codeWithAST: CodeWithAST.fromCode(initialValue),
      cursor: new Range(0),
      formattedForPrintWidth: null,
    },
  ]);
  const [index, setIndex] = useState(0);
  const [formatOptions, setFormatOptions] = useState<null | {
    nextCursor: (codeWithAST: CodeWithAST, cursor: Range) => Range;
  }>(null);
  const rangeSelect = useRangeSelect();
  const format = useFormat();

  const current = history[index];

  useEffect(() => {
    const { codeWithAST, cursor, formattedForPrintWidth } = current;
    if (formattedForPrintWidth == printWidth && !formatOptions) {
      return;
    }

    if (formattedForPrintWidth == printWidth && formatOptions) {
      const newHistory = history.slice();
      try {
        newHistory[index] = {
          codeWithAST,
          cursor: formatOptions.nextCursor(codeWithAST, cursor),
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
      code: codeWithAST.code,
      cursorOffset: cursor.start,
      printWidth,
    });

    formatPromise.then((result) => {
      if (!result) {
        if (formatOptions) {
          logAndEventuallyReportToSentry(
            new Error("error while formatting, uck!")
          );
        }
        return;
      }

      const newHistory = history.slice();
      const newCodeWithAST = CodeWithAST.fromCode(result.formatted);
      const newCursor = new Range(Math.max(result.cursorOffset, 0));
      newHistory[index] = {
        codeWithAST:
          newCodeWithAST.code === codeWithAST.code
            ? codeWithAST
            : newCodeWithAST,
        cursor:
          formatOptions?.nextCursor(newCodeWithAST, newCursor) || newCursor,
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
          current.codeWithAST.code !== state.codeWithAST.code;
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
          ...pick(change, "codeWithAST", "cursor"),
          formattedForPrintWidth:
            "codeWithAST" in change &&
            change.codeWithAST.code !== current.codeWithAST.code
              ? null
              : current.formattedForPrintWidth,
          ...("rangeSelect" in change
            ? {
                cursor: rangeSelect.run(
                  current.codeWithAST,
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
