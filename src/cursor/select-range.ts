import t from "@babel/types";
import { useState } from "react";

import {
  Path,
  getLineage,
  getLineageNodes,
  getNode,
  getNodeFromPath,
} from "../ast-utils";
import { Code, isValid } from "../code";
import { Direction, Range } from "../utils";
import { findCursor } from "./find";
import { selectNode } from "./utils";

const findIndexForCursor = (collection: t.Node[], { start, end }: Range) =>
  collection.findIndex((node) => node.start! <= start && node.end! >= end);

function selectRangeUp(ast: t.File, cursor: Range) {
  for (const node of getLineageNodes(ast, cursor.start).reverse()) {
    const nodeCursor = selectNode(node);

    if (cursor.start > nodeCursor.start || cursor.end < nodeCursor.end) {
      return nodeCursor;
    }
  }
  return cursor;
}

function selectRangeDown(
  ast: t.File,
  cursor: Range,
  initialRange: Range | null
) {
  let selectedNodeFound = false;
  if (!initialRange || cursor.isSingle()) {
    return cursor;
  }
  for (const node of getLineageNodes(ast, initialRange!.start)) {
    const nodeCursor = selectNode(node);
    const selectOverlaps =
      cursor.start == nodeCursor.start && cursor.end == nodeCursor.end;
    if (!selectOverlaps && selectedNodeFound) {
      return nodeCursor;
    }
    selectedNodeFound = selectOverlaps;
  }
  return initialRange;
}

function findNextChildCursor(
  ast: t.File,
  path: Path,
  cursor: Range,
  initialRange: Range | null,
  isRight: boolean
) {
  if (typeof path[path.length - 1] != "number") {
    return;
  }

  const collection = getNodeFromPath(ast, path.slice(0, -1)) as t.Node[];
  if (!Array.isArray(collection)) {
    return;
  }

  const [initialIndex, startIndex, endIndex] = ([
    initialRange || cursor,
    new Range(cursor.start),
    new Range(cursor.end),
  ] as const).map((cursor) => findIndexForCursor(collection, cursor));

  const lastIndex = collection.length - 1;

  let nextStartIndex, nextEndIndex;
  if (isRight) {
    if (startIndex == initialIndex) {
      nextStartIndex = startIndex;
      nextEndIndex = Math.min(endIndex + 1, lastIndex);
    } else {
      nextStartIndex = Math.min(startIndex + 1, lastIndex);
      nextEndIndex = endIndex;
    }
  } else {
    if (endIndex == initialIndex) {
      nextStartIndex = Math.max(startIndex - 1, 0);
      nextEndIndex = endIndex;
    } else {
      nextStartIndex = startIndex;
      nextEndIndex = endIndex - 1;
    }
  }

  const nextCursor = new Range(
    collection[nextStartIndex].start!,
    collection[nextEndIndex].end
  );
  if (!nextCursor.equals(cursor)) {
    return nextCursor;
  }
}

export function useSelectRange() {
  const [initialRange, setInitialRange] = useState<null | Range>(null);
  return function selectRange(
    code: Code,
    cursor: Range,
    direction: Direction
  ): Range {
    if (!isValid(code)) {
      return initialRange || cursor;
    }
    const { ast } = code;
    if (!initialRange || cursor.isSingle()) {
      setInitialRange(cursor);
    }

    if (direction == "UP") {
      return selectRangeUp(ast, cursor);
    } else if (direction == "DOWN") {
      return selectRangeDown(ast, cursor, initialRange);
    }

    const node = getNode(ast, cursor.start);

    const isRight = direction == "RIGHT";
    const nextCursor = findCursor(
      code,
      direction,
      (isRight ? Math.max : Math.min)(cursor.start, cursor.end)
    );
    const nextNode = getNode(ast, nextCursor.start);

    if (
      node == nextNode &&
      (t.isLiteral(nextNode) || t.isIdentifier(nextNode)) &&
      nextNode.start! <= nextCursor.start &&
      nextNode.end! >= nextCursor.end
    ) {
      return new Range(
        Math.min(cursor.start, nextCursor.start),
        Math.max(cursor.end, nextCursor.end)
      );
    }

    const reverseLineage = getLineage(ast, cursor.start).reverse();
    for (const [node, path] of reverseLineage) {
      const childCursor = findNextChildCursor(
        ast,
        path,
        cursor,
        initialRange,
        isRight
      );
      if (childCursor) {
        return childCursor;
      }
    }
    return cursor;
  };
}
