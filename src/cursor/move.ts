import { Code } from "../code";
import { Direction, Range } from "../utils";
import { findCursor } from "./find";

export function moveCursor(
  code: Code,
  { start, end }: Range,
  direction: Direction
): Range {
  let nextCursor: null | ReturnType<typeof moveCursor> = null;
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
