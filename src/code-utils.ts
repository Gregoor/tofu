import { Cursor, spreadCursor } from './move-cursor';

export function replaceCode(
  code: string,
  cursor: Cursor | number,
  replacement: string
): string {
  const [from, to] = spreadCursor(cursor);
  return code.slice(0, Math.max(from, 0)) + replacement + code.slice(to);
}