import { CodeWithAST } from "../history";
import { Direction, Range } from "../utils";
import { findCursor, findCursorY } from "./find";

function moveCursorWithAST(
  codeWithAST: CodeWithAST,
  { start, end }: Range,
  direction: Direction
): Range {
  let nextCursor: ReturnType<typeof moveCursorWithAST>;
  if (start != end) {
    if (direction == "LEFT") {
      nextCursor = new Range(start);
    } else if (direction == "RIGHT") {
      nextCursor = new Range(end);
    }
  }

  // this.rangeSelector.reset();

  if (!nextCursor) {
    nextCursor = findCursor(
      codeWithAST,
      direction,
      (direction == "DOWN" ? Math.max : Math.min)(start, end)
    );
  }

  return nextCursor;
}

function moveCursorWithoutAST(
  code: string,
  { start }: Range,
  direction: Direction
) {
  if (!direction) {
    return new Range(start);
  }

  const newStart = (() => {
    switch (direction) {
      case "LEFT":
        return start - 1;
      case "RIGHT":
        return start + 1;
      case "UP":
      case "DOWN":
        return findCursorY(code, start, direction);
    }
  })();

  return new Range(Math.max(Math.min(newStart, code.length), 0));
}

export function moveCursor(
  cursorWithAST: CodeWithAST,
  cursor: Range,
  direction: Direction
): Range {
  return cursorWithAST.ast
    ? moveCursorWithAST(cursorWithAST, cursor, direction)
    : moveCursorWithoutAST(cursorWithAST.code, cursor, direction);
}
