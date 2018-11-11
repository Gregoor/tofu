const t = require('@babel/types');
import { getNode } from './ast-utils';

const isCursorable = node =>
  [
    t.isStringLiteral,
    t.isTemplateLiteral,
    t.isTemplateElement,
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
  direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | null,
  recursionDepth: number,
  start: number
): number | Cursor {
  const { isLeft, isRight, isDown, isUp } = {
    isLeft: direction === 'LEFT',
    isRight: direction === 'RIGHT',
    isDown: direction === 'DOWN',
    isUp: direction === 'UP'
  };
  const node = getNode(ast, start);
  const additive = isLeft ? -1 : isRight ? 1 : 0;
  const nextStart = start + additive;
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
    if (isLeft && recursionDepth == 0) {
      return nextStart;
    }
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

  if (t.isArrayExpression(node) && recursionDepth > 0) {
    if (node.elements.length == 0) {
      return start;
    }
    if (start == node.end) {
      return start;
    }
  }

  if (t.isBlockStatement(node) && node.body.length == 0) {
    const nextStart = node.start + 1;

    if (start == nextStart || (start > nextStart && (isRight || isDown))) {
      return moveOn(isRight || isDown ? node.end + 1 : node.start - 1);
    }
    return nextStart;
  }

  // Only skip over the starting quote, we might want to call functions on that
  // string so we need the cursor after the closing quote
  if (t.isStringLiteral(node) && start == node.start) {
    return moveOn(nextStart);
  }
  const isHorizontal = isLeft || isRight;

  if (isCursorable(node) && (recursionDepth > 0 || !isHorizontal)) {
    return start;
  }

  if (!isHorizontal) {
    const left = moveCursorX(ast, code, 'LEFT', 1, start);
    const right = moveCursorX(ast, code, 'RIGHT', 1, start);
    const leftBreak = code.slice(left[0], start).includes('\n');
    const rightBreak = code.slice(start, right[0]).includes('\n');
    if (leftBreak) return right;
    if (rightBreak) return left;
    return start - left[0] < right[0] - start ? left : right;
  }

  return moveOn(nextStart);
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

  return moveCursorX(ast, code, direction, 1, nextStart);
};

export default withSpreadCursor(moveCursor);
