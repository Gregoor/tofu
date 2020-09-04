import { CodeWithAST } from "../use-history";
import { findCursor } from "./find";
import { Cursor, Direction } from "./types";
import { spreadCursor } from "./utils";

function moveCursorWithAST(
  { ast, code }: CodeWithAST,
  [start, end]: Cursor,
  direction: Direction
) {
  // if (!ast) {
  //   this.updateCode({});
  //   return;
  // }

  let nextCursor;
  if (start != end) {
    if (direction == "LEFT") {
      nextCursor = start;
    } else if (direction == "RIGHT") {
      nextCursor = end;
    }
  }

  // this.rangeSelector.reset();

  if (!nextCursor) {
    nextCursor = findCursor(
      ast,
      code,
      direction,
      (direction == "DOWN" ? Math.max : Math.min)(start, end)
    );
  }

  return spreadCursor(nextCursor);
}

function moveCursorWithoutAST(
  code: string,
  [start]: Cursor,
  direction: Direction
) {
  if (!direction) {
    return spreadCursor(start);
  }
  const newStart = { LEFT: start - 1, RIGHT: start + 1, UP: 0, DOWN: 0 }[
    direction
  ];
  return spreadCursor(Math.max(Math.min(newStart, code.length), 0));
}

export function moveCursor(
  cursorWithAST: CodeWithAST,
  cursor: Cursor,
  direction: Direction
) {
  return cursorWithAST.ast
    ? moveCursorWithAST(cursorWithAST, cursor, direction)
    : moveCursorWithoutAST(cursorWithAST.code, cursor, direction);
}
