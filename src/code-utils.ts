import { Range } from "./utils";

export const replaceCode = (
  code: string,
  { start, end }: Range,
  replacement: string
): string => code.slice(0, Math.max(start, 0)) + replacement + code.slice(end);
