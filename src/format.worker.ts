import babel from "prettier/parser-babel";
import prettier from "prettier/standalone";

import { reportError } from "./report";

export async function format({
  code,
  cursorOffset,
  printWidth,
}: {
  code: string;
  cursorOffset: number;
  printWidth: number;
}) {
  try {
    return prettier.formatWithCursor(code, {
      parser: "babel",
      plugins: [babel],
      cursorOffset,
      printWidth,
      trailingComma: "all",
    });
  } catch (error) {
    reportError(error);
    return null;
  }
}
