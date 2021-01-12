import type { CursorOptions } from "prettier";
import typescript from "prettier/parser-typescript";
import prettier from "prettier/standalone";

// import { reportError } from "./report";

export const options: Omit<CursorOptions, "cursorOffset"> = {};

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
      ...options,
      parser: "typescript",
      plugins: [typescript],
      cursorOffset,
      printWidth,
    });
  } catch (error) {
    // TODO Can't report from a worker!
    // reportError(error);
    console.error(error);
    return null;
  }
}
