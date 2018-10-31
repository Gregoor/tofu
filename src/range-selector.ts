const t = require('@babel/types');
import moveCursor, { Cursor, Direction } from './move-cursor';
import { getFocusPath, getNode } from './ast-utils';

function cursorFromNode(ancestor): Cursor {
  return Array.isArray(ancestor)
    ? [ancestor[0].start, ancestor[ancestor.length - 1].end]
    : [ancestor.start, ancestor.end];
}

export default class RangeSelector {
  initialRange: Cursor;

  run(ast, code: string, cursor: Cursor, direction: Direction): Cursor {
    if (!this.initialRange) {
      this.initialRange = cursor;
    }

    if (direction == 'UP') {
      for (const node of getFocusPath(ast, cursor[0])[0].reverse()) {
        const nextCursor = cursorFromNode(node);

        if (cursor[0] > nextCursor[0] || cursor[1] < nextCursor[1]) {
          return nextCursor;
        }
      }
      return cursor;
    } else if (direction == 'DOWN') {
      let selectedNodeFound = false;
      for (const node of getFocusPath(ast, this.initialRange[0])[0]) {
        const nodeCursor = cursorFromNode(node);
        const selectOverlaps =
          cursor[0] == nodeCursor[0] && cursor[1] == nodeCursor[1];
        if (!selectOverlaps && selectedNodeFound) {
          return nodeCursor;
        }
        selectedNodeFound = selectOverlaps;
      }
      return cursor;
    }

    const nextCursor = moveCursor(
      ast,
      code,
      direction,
      direction == 'RIGHT' ? Math.max(...cursor) : Math.min(...cursor)
    );
    const nextNode = getNode(ast, nextCursor[0]);

    return (t.isLiteral(nextNode) || t.isIdentifier(nextNode)) &&
      nextNode.start < nextCursor[0] &&
      nextNode.end > nextCursor[1]
      ? [Math.min(cursor[0], nextCursor[0]), Math.max(cursor[1], nextCursor[1])]
      : [Math.min(nextNode.start, getNode(ast, cursor[0]).start), nextNode.end];
  }

  reset() {
    this.initialRange = null;
  }
}
