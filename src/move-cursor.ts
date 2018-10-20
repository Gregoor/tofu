const t = require('@babel/types');
import { getNode } from './ast-utils';

const isCursorable = node =>
  [
    t.isStringLiteral,
    t.isIdentifier,
    t.isNumericLiteral,
    t.isCallExpression,
    node => t.isMemberExpression(node) && node.computed
  ].some(check => check(node));

export type Cursor = [number, number];

export function spreadCursor(cursor: number | Cursor): [number, number] {
  return Array.isArray(cursor) ? cursor : [cursor, cursor];
}

function withSpreadCursor<T>(fn: (...args: T[]) => number | Cursor) {
  return (...args: T[]) => spreadCursor(fn(...args));
}

let moveCursorX = function(
  ast,
  code: string,
  direction: 'LEFT' | 'RIGHT' | null,
  recursionDepth: number,
  start: number
): number | Cursor {
  const { isLeft, isRight } = {
    isLeft: direction === 'LEFT',
    isRight: direction === 'RIGHT'
  };
  const node = getNode(ast, start);
  const additive = isLeft ? -1 : isRight ? 1 : 0;
  const nextStart = start + additive;
  const nextCursor = nextStart;
  const moveOn = moveCursorX.bind(
    null,
    ast,
    code,
    direction,
    recursionDepth + 1
  );

  if (ast.start > start) {
    return ast.start;
  }
  if (ast.end < start) {
    return ast.end;
  }

  if (start !== nextStart && code[start] == '\n' && code[nextStart] == '\n') {
    return isRight ? nextStart : start;
  }

  if (t.isVariableDeclaration(node)) {
    const kindLength = node.kind.length;
    if (isRight && start - node.start == kindLength) {
      return start + additive;
    }
    if (start > node.start && start <= node.start + kindLength) {
      return [node.start, node.start + kindLength];
    }
  }

  if (
    recursionDepth > 0 &&
    (t.isBooleanLiteral(node) || t.isNullLiteral(node)) &&
    ((isRight && start == node.start) || (isLeft && start == node.end))
  ) {
    return [node.start, node.end];
  }

  if (
    (t.isBinaryExpression(node) || t.isLogicalExpression(node)) &&
    ((isRight && start == node.left.end + 1) ||
      (isLeft && start == node.right.start - 1))
  ) {
    return [node.left.end + 1, node.right.start - 1];
  }

  if (t.isArrayExpression(node)) {
    if (start == node.start) {
      return [node.start, node.end];
    }
    if (recursionDepth > 0 && start == node.end) {
      return start;
    }
  }

  if (t.isBlockStatement(node) && node.body.length == 0) {
    const nextStart = node.start + 1;
    if (start == nextStart) {
      return moveOn(isRight ? node.end + 1 : node.start - 1);
    }
    return nextStart;
  }

  // Only skip over the starting quote, we might want to call functions on that
  // string so we need the cursor after the closing quote
  if (t.isStringLiteral(node) && start == node.start) {
    return moveOn(nextCursor);
  }

  if (isCursorable(node) && (recursionDepth > 0 || direction == null)) {
    return start;
  }

  if (direction == null) {
    const left = moveCursorX(ast, code, 'LEFT', 0, start);
    const right = moveCursorX(ast, code, 'RIGHT', 0, start);
    const leftBreak = code.slice(left[0], start).includes('\n');
    const rightBreak = code.slice(start, right[0]).includes('\n');
    if (leftBreak) return right;
    if (rightBreak) return left;
    return start - left[0] < right[0] - start ? left : right;
  }

  return moveOn(nextCursor);
};

moveCursorX = withSpreadCursor(moveCursorX);

export type Direction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | null;

let moveCursor = function(ast, code, direction: Direction, start: number) {
  if (direction != 'UP' && direction != 'DOWN') {
    return moveCursorX(ast, code, direction, 0, start);
  }

  const isUp = direction == 'UP';
  const charCounts = code
    .split('\n')
    .map((s, i) => s.length + (i == 0 ? 0 : 1));
  const accuCharCounts = charCounts.reduce(
    (accu, n) => accu.concat((accu[accu.length - 1] || 0) + n),
    []
  );

  const line = accuCharCounts.findIndex(n => n >= start);
  const nextLine = line + (isUp ? -1 : 1);
  if (line == -1) {
    return ast.end;
  }
  if (nextLine < 0) {
    return 0;
  }

  let nextStart;
  if (start - (accuCharCounts[line - 1] || 0) > charCounts[nextLine]) {
    nextStart = accuCharCounts[nextLine];
  } else {
    nextStart =
      start +
      (isUp
        ? -charCounts[nextLine] + (nextLine == 0 ? -1 : 0)
        : charCounts[line] + (line == 0 ? 1 : 0));
  }

  return moveCursorX(ast, code, null, 0, nextStart);
};

export default withSpreadCursor(moveCursor);
