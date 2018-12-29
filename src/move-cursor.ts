import { getFocusPath, getNode, getParent } from './ast-utils';
import { spreadCursor } from './cursor-utils';

const t = require('@babel/types');

const isCursorable = node =>
  [
    t.isStringLiteral,
    t.isTemplateLiteral,
    t.isTemplateElement,
    t.isIdentifier,
    t.isNumericLiteral,
    t.isCallExpression,
    t.isExpressionStatement
  ].some(check => check(node));

export type Cursor = [number, number];

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
  const [node, parent] = getFocusPath(ast, start)[0]
    .slice()
    .reverse();
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
      return moveCursorX(ast, code, null, recursionDepth, nextStart);
    }
    return isRight ? nextStart : start;
  }

  if (
    t.isExpression(node) &&
    t.isExpression(getNode(ast, nextStart)) &&
    !t.isArrowFunctionExpression(node)
  ) {
    if (code[start] == ')' && recursionDepth === 0) {
      return nextStart;
    }
    if (code[nextStart] == ')' && recursionDepth > 0) {
      return start;
    }
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
    const start =
      node.left.end + code.slice(node.left.end).indexOf(node.operator);
    return [start, start + node.operator.length];
  }

  if ((t.isArrayExpression(node) || t.isObjectExpression(node)) && recursionDepth > 0) {
    if ((node.elements || node.properties).length == 0) {
      return start;
    }

    if (start == node.end) {
      return start;
    }
  }

  if (
    (t.isArrayExpression(node) || t.isArrayExpression(parent)) &&
    recursionDepth > 0
  ) {
    const arrayNode = t.isArrayExpression(node) ? node : parent;
    const emptyElementIndexes = [];
    const elementEnds = [];
    for (let i = 0; i < arrayNode.elements.length; i++) {
      const element = arrayNode.elements[i];
      if (element) {
        elementEnds.push(element.end);
        continue;
      }

      emptyElementIndexes.push(i);
      elementEnds.push(i == 0 ? arrayNode.start + 1 : elementEnds[i - 1] + 2);
    }

    if (
      elementEnds
        .filter((n, i) => emptyElementIndexes.includes(i))
        .includes(start)
    ) {
      return start;
    }
  }

  if (
    t.isMemberExpression(node) &&
    node.computed &&
    recursionDepth > 0 &&
    start == node.end
  ) {
    return start;
  }

  if (t.isForStatement(node) && recursionDepth > 0) {
    const init = node.init ? node.init.end : node.start + 5;
    const test = node.test ? node.test.end : init + (node.init ? 2 : 1);
    const update = node.update ? node.update.end : test + (node.test ? 2 : 1);

    if (
      (!node.init && start == init) ||
      (!node.test && start == test) ||
      (!node.update && start == update)
    ) {
      return start;
    }
  }

  if (
    t.isArrowFunctionExpression(node) &&
    node.params.length == 0 &&
    recursionDepth > 0 &&
    start == node.start + 1
  ) {
    return start;
  }

  if (
    t.isReturnStatement(node) &&
    recursionDepth > 0 &&
    !node.argument &&
    (isRight || start == node.end - 1)
  ) {
    return node.end - 1;
  }

  const shouldEndBlock =
    t.isBlockStatement(node) &&
    t.isIfStatement(getParent(ast, start)) &&
    ((isRight && start !== node.end) || recursionDepth > 0);

  if (t.isBlockStatement(node) && node.body.length == 0) {
    const blockStart = node.start + 1;
    return start >= blockStart &&
      !(isLeft && start == node.end && recursionDepth == 0)
      ? shouldEndBlock
        ? node.end
        : moveOn(isRight || isDown ? node.end + 1 : node.start - 1)
      : blockStart;
  }

  if (start == node.end && shouldEndBlock) {
    return node.end;
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
    return Math.min(start - left[0], start - left[1]) <
      Math.min(right[0] - start, right[1] - start)
      ? left
      : right;
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
