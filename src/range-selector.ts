const t = require('@babel/types');
import moveCursor, { Cursor, Direction, spreadCursor } from './move-cursor';
import { getFocusPath, getNode } from './ast-utils';

export function selectNode(ancestor): Cursor {
  return Array.isArray(ancestor)
    ? [ancestor[0].start, ancestor[ancestor.length - 1].end]
    : [ancestor.start, ancestor.end];
}

function findIndexForCursor(collection, cursor: number | [number, number]) {
  const [start, end] = spreadCursor(cursor);
  return collection.findIndex(node => node.start <= start && node.end >= end);
}

export default class RangeSelector {
  initialRange: Cursor;

  run(ast, code: string, cursor: Cursor, direction: Direction): Cursor {
    if (!this.initialRange) {
      this.initialRange = cursor;
    }

    if (direction == 'UP') {
      for (const node of getFocusPath(ast, cursor[0])[0].reverse()) {
        const nextCursor = selectNode(node);

        if (cursor[0] > nextCursor[0] || cursor[1] < nextCursor[1]) {
          return nextCursor;
        }
      }
      return cursor;
    } else if (direction == 'DOWN') {
      let selectedNodeFound = false;
      for (const node of getFocusPath(ast, this.initialRange[0])[0]) {
        const nodeCursor = selectNode(node);
        const selectOverlaps =
          cursor[0] == nodeCursor[0] && cursor[1] == nodeCursor[1];
        if (!selectOverlaps && selectedNodeFound) {
          return nodeCursor;
        }
        selectedNodeFound = selectOverlaps;
      }
      return cursor;
    }

    const parents = getFocusPath(ast, cursor[0])[0].reverse();
    const node = getNode(ast, cursor[0]);

    const isRight = direction == 'RIGHT';
    const nextCursor = moveCursor(
      ast,
      code,
      direction,
      isRight ? Math.max(...cursor) : Math.min(...cursor)
    );
    const nextNode = getNode(ast, nextCursor[0]);

    if (
      node == nextNode &&
      (t.isLiteral(nextNode) || t.isIdentifier(nextNode)) &&
      nextNode.start < nextCursor[0] &&
      nextNode.end > nextCursor[1]
    ) {
      return [
        Math.min(cursor[0], nextCursor[0]),
        Math.max(cursor[1], nextCursor[1])
      ];
    } else {
      const collection = parents.find(node => Array.isArray(node));
      if (!collection) return cursor;

      const [initialIndex, startIndex, endIndex] = [
        this.initialRange,
        cursor[0],
        cursor[1]
      ].map(findIndexForCursor.bind(null, collection));

      let nextStartIndex, nextEndIndex;
      if (isRight) {
        if (startIndex == initialIndex) {
          nextStartIndex = startIndex;
          nextEndIndex = Math.min(endIndex + 1, collection.length - 1);
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

      return [collection[nextStartIndex].start, collection[nextEndIndex].end];
    }
  }

  reset() {
    this.initialRange = null;
  }
}
