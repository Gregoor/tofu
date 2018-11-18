import { Cursor} from './move-cursor';
import { spreadCursor } from './cursor-utils';

export function replaceCode(
  code: string,
  cursor: Cursor | number,
  replacement: string
): string {
  const [from, to] = spreadCursor(cursor);
  return code.slice(0, Math.max(from, 0)) + replacement + code.slice(to);
}