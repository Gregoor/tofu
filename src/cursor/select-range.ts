import t from "@babel/types";
import { useState } from "react";

import { getLineageNodes, getNode } from "../ast-utils";
import { Code, isValid } from "../code";
import { Direction, Range } from "../utils";
import { findCursor } from "./find";
import { selectNode } from "./utils";

const findIndexForCursor = (collection: t.Node[], { start, end }: Range) =>
  collection.findIndex((node) => node.start! <= start && node.end! >= end);

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
      for (const node of getLineageNodes(ast, cursor.start).reverse()) {
        const nodeCursor = selectNode(node);

        if (cursor.start > nodeCursor.start || cursor.end < nodeCursor.end) {
          return nodeCursor;
        }
      }
      return cursor;
    } else if (direction == "DOWN") {
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
    const collection = getLineageNodes(ast, cursor.start)
      .reverse()
      .find((node) => Array.isArray(node));
    if (!collection || !Array.isArray(collection)) {
      return cursor;
    }

    const [initialIndex, startIndex, endIndex] = ([
      initialRange!,
      new Range(cursor.start),
      new Range(cursor.end),
    ] as const).map((cursor) =>
      findIndexForCursor(collection as t.Node[], cursor)
    );

    let nextStartIndex, nextEndIndex;
    if (isRight) {
      if (startIndex == initialIndex) {
        nextStartIndex = startIndex;
        nextEndIndex = Math.min(endIndex + 1, (collection as any).length - 1);
      } else {
        nextStartIndex = startIndex + 1;
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

    return new Range(
      collection[nextStartIndex].start!,
      collection[nextEndIndex].end
    );
  };
}
