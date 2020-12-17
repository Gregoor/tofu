import { Code, ValidCode, isValid } from "../code";
import { Direction, Range } from "../utils";
import { findCursor, findCursorY } from "./find";

function moveCursorWithAST(
  code: ValidCode,
  { start, end }: Range,
  direction: Direction
): Range {
  let nextCursor: null | ReturnType<typeof moveCursorWithAST> = null;
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
      code,
      direction,
      (direction == "DOWN" ? Math.max : Math.min)(start, end)
    );
  }

  return nextCursor;
}

function moveCursorWithoutAST(
  source: string,
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
        return findCursorY(source, start, direction);
    }
  })();

  return new Range(Math.max(Math.min(newStart, source.length), 0));
}

export function moveCursor(
  code: Code,
  cursor: Range,
  direction: Direction
): Range {
  return isValid(code)
    ? moveCursorWithAST(code, cursor, direction)
    : moveCursorWithoutAST(code.source, cursor, direction);
}
