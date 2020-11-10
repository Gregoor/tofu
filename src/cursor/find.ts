import { getParentsAndPathTD } from "../ast-utils";
import { ValidCode } from "../code";
import { findNodeSlot } from "../nodes";
import { Direction, Range } from "../utils";

function findCursorX(
  code: ValidCode,
  direction: Direction,
  start: number
): Range {
  const { ast, source } = code;
  const { isLeft, isRight } = {
    isLeft: direction === "LEFT",
    isRight: direction === "RIGHT",
  };
  const additive = isLeft ? -1 : isRight ? 1 : 0;
  const nextStart = start + additive;

  if (ast.start! > nextStart) {
    return new Range(ast.start!);
  }
  if (ast.end! < nextStart) {
    return new Range(ast.end!);
  }

  if (source[nextStart - 1] == "\n" && source[nextStart] == "\n") {
    return new Range(nextStart);
  }

  for (const node of getParentsAndPathTD(ast, nextStart)[0].reverse()) {
    if (Array.isArray(node)) {
      continue;
    }
    const slot = findNodeSlot(node, nextStart, code);
    if (slot) {
      return slot;
    }
  }

  if (!direction || direction == "UP" || direction == "DOWN") {
    const left = findCursorX(code, "LEFT", nextStart);
    const right = findCursorX(code, "RIGHT", nextStart);
    const leftBreak = source.slice(left.end, nextStart).includes("\n");
    const rightBreak = source.slice(nextStart + 1, right.start).includes("\n");
    if (leftBreak) {
      return right;
    }
    if (rightBreak) {
      return left;
    }
    return nextStart - left.end < right.start - nextStart ? left : right;
  }

  return findCursorX(code, direction, nextStart);
}

export function findCursorY(
  code: string,
  start: number,
  direction: "UP" | "DOWN"
): number {
  const isUp = direction == "UP";
  const charCounts = code
    .split("\n")
    .map((s, i) => s.length + (i == 0 ? 0 : 1));
  const accuCharCounts = charCounts.reduce<number[]>(
    (accu, n) => [...accu, (accu[accu.length - 1] || 0) + n],
    []
  );

  const line = accuCharCounts.findIndex((n) => n >= start);
  const nextLine = line + (isUp ? -1 : 1);
  if (line == -1) {
    return code.length;
  }
  if (nextLine < 0) {
    return 0;
  }

  return start - (accuCharCounts[line - 1] || 0) > charCounts[nextLine]
    ? accuCharCounts[nextLine]
    : start +
        (isUp
          ? -charCounts[nextLine] + (nextLine == 0 ? -1 : 0)
          : charCounts[line] + (line == 0 ? 1 : 0));
}

export const findCursor = (
  code: ValidCode,
  direction: Direction,
  start: number
): Range =>
  !direction || direction == "LEFT" || direction == "RIGHT"
    ? findCursorX(code, direction, start)
    : findCursorX(code, direction, findCursorY(code.source, start, direction));
