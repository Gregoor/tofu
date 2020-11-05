import * as t from "@babel/types";
import { useState } from "react";

import { getParentsAndPathTD, getNode } from "./ast-utils";
import { findCursor } from "./cursor/find";
import { selectNode } from "./cursor/utils";
import { CodeWithAST } from "./history";
import { Direction, Range } from "./utils";

const findIndexForCursor = (collection: t.Node[], { start, end }: Range) =>
  collection.findIndex((node) => node.start <= start && node.end >= end);

export function useRangeSelect() {
  const [initialRange, setInitialRange] = useState<null | Range>(null);
  return {
    run(codeWithAST: CodeWithAST, cursor: Range, direction: Direction): Range {
      const { ast } = codeWithAST;
      if (!initialRange) {
        setInitialRange(cursor);
      }

      if (direction == "UP") {
        for (const node of getParentsAndPathTD(ast, cursor.start)[0]
          .slice()
          .reverse()) {
          const nextCursor = selectNode(node);

          if (cursor.start > nextCursor.start || cursor.end < nextCursor.end) {
            return nextCursor;
          }
        }
        return cursor;
      } else if (direction == "DOWN") {
        let selectedNodeFound = false;
        for (const node of getParentsAndPathTD(ast, initialRange[0])[0]) {
          const nodeCursor = selectNode(node);
          const selectOverlaps =
            cursor.start == nodeCursor.start && cursor.end == nodeCursor.end;
          if (!selectOverlaps && selectedNodeFound) {
            return nodeCursor;
          }
          selectedNodeFound = selectOverlaps;
        }
        return cursor;
      }

      const parents = getParentsAndPathTD(ast, cursor.start)[0]
        .slice()
        .reverse();
      const node = getNode(ast, cursor.start);

      const isRight = direction == "RIGHT";
      const nextCursor = findCursor(
        codeWithAST,
        direction,
        (isRight ? Math.max : Math.min)(cursor.start, cursor.end)
      );
      const nextNode = getNode(ast, nextCursor[0]);

      if (
        node == nextNode &&
        (t.isLiteral(nextNode) || t.isIdentifier(nextNode)) &&
        nextNode.start <= nextCursor.start &&
        nextNode.end >= nextCursor.end
      ) {
        return new Range(
          Math.min(cursor.start, nextCursor.start),
          Math.max(cursor.end, nextCursor.end)
        );
      }
      const collection = parents.find((node) => Array.isArray(node));
      if (!collection) {
        return cursor;
      }

      const [initialIndex, startIndex, endIndex] = ([
        initialRange,
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
        collection[nextStartIndex].start,
        collection[nextEndIndex].end
      );
    },
    reset() {
      setInitialRange(null);
    },
  };
}
