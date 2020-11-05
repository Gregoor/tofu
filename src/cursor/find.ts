import * as t from "@babel/types";

import { getNode, getParentsAndPathTD } from "../ast-utils";
import { CodeWithAST } from "../history";
import { Direction, Range } from "../utils";
import { selectNode, selectOperator } from "./utils";

const isCursorable = (node) =>
  [
    t.isStringLiteral,
    t.isTemplateLiteral,
    t.isTemplateElement,
    t.isIdentifier,
    t.isNumericLiteral,
    t.isExpressionStatement,
  ].some((check) => check(node));

function checkForEmptyElements(node: t.ArrayExpression, start): boolean {
  const emptyElementIndexes = [];
  const elementEnds: number[] = [];
  for (let i = 0; i < node.elements.length; i++) {
    const element = node.elements[i];
    if (element) {
      elementEnds.push(element.end);
      continue;
    }

    emptyElementIndexes.push(i);
    elementEnds.push(i == 0 ? node.start + 1 : elementEnds[i - 1] + 2);
  }

  return elementEnds
    .filter((n, i) => emptyElementIndexes.includes(i))
    .includes(start);
}

const NODE_SLOT_CHECKERS: Partial<
  {
    [T in t.Node["type"]]: (
      node: Extract<t.Node, { type: T }>,
      start: number,
      codeWithAST: CodeWithAST
    ) => boolean | Range;
  }
> = {
  BooleanLiteral: selectNode,
  NullLiteral: selectNode,
  StringLiteral: (node, start) => start !== node.start,

  BinaryExpression: (node, start, { code }) => {
    const operator = selectOperator(node, code);
    return operator.includes(start) ? operator : false;
  },
  LogicalExpression: (node: t.LogicalExpression, start, { code }) => {
    const operator = selectOperator(node, code);
    return operator.includes(start) ? operator : false;
  },

  ArrayExpression: (node, start) => {
    if (
      (node.elements.length == 0 && start == node.start + 1) ||
      start == node.end
    ) {
      return true;
    }
    return checkForEmptyElements(node, start);
  },
  ObjectExpression: (node, start) =>
    (node.properties.length == 0 && start == node.start + 1) ||
    start == node.end,
  MemberExpression: (node, start) => node.computed && start == node.end,
  ArrowFunctionExpression: (node: t.ArrowFunctionExpression, start) =>
    node.params.length == 0 && node.start + 1 == start,

  // VariableDeclaration: (node) =>
  //   new Range(node.start, node.start + node.kind.length),

  BlockStatement: (node, start) =>
    node.body.length == 0 && node.start + 1 == start,
  IfStatement(node, start, { code }) {
    const { consequent, alternate } = node;
    return (
      alternate &&
      consequent.end +
        code.slice(consequent.end, alternate.start).indexOf("else") +
        "else".length ==
        start
    );
  },
  ForStatement(node, start) {
    const init = node.init ? node.init.end : node.start + 5;
    const test = node.test ? node.test.end : init + (node.init ? 2 : 1);
    const update = node.update ? node.update.end : test + (node.test ? 2 : 1);

    return (
      (!node.init && start == init) ||
      (!node.test && start == test) ||
      (!node.update && start == update)
    );
  },
  ReturnStatement: (node, start) => !node.argument && node.end - 1 == start,
};

function findSlot(
  node: t.Node,
  start: number,
  codeWithAST: CodeWithAST
): null | Range {
  const check = NODE_SLOT_CHECKERS[node.type];
  if (!check) {
    return null;
  }
  const slot = check(node as any, start, codeWithAST);
  return slot ? (slot instanceof Range ? slot : new Range(start)) : null;
}

function findCursorX(
  codeWithAST: CodeWithAST,
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN" | null,
  isAtInitial: boolean,
  start: number
): Range {
  const { ast, code } = codeWithAST;
  const { isLeft, isRight, isDown, isUp } = {
    isLeft: direction === "LEFT",
    isRight: direction === "RIGHT",
    isDown: direction === "DOWN",
    isUp: direction === "UP",
  };
  const [node, parent] = getParentsAndPathTD(ast, start)[0].slice().reverse();
  const additive = isLeft ? -1 : isRight ? 1 : 0;
  const nextStart = start + additive;
  const moveOn = (newStart: number) =>
    findCursorX(codeWithAST, direction, false, newStart);

  if (ast.start > start) {
    return new Range(ast.start);
  }
  if (ast.end < start) {
    return new Range(ast.end);
  }

  if (start !== nextStart && code[start] == "\n" && code[nextStart] == "\n") {
    if (isLeft && isAtInitial) {
      return findCursorX(codeWithAST, null, false, nextStart);
    }
    return new Range(isRight ? nextStart : start);
  }

  if (
    t.isExpression(node) &&
    t.isExpression(getNode(ast, nextStart)) &&
    !t.isArrowFunctionExpression(node)
  ) {
    if (
      (code[nextStart] == "(" && isAtInitial) ||
      (code[start] == ")" && isAtInitial)
    ) {
      return new Range(nextStart);
    }
    if (code[nextStart] == ")" && !isAtInitial) {
      return new Range(start);
    }
  }

  if (t.isVariableDeclaration(node)) {
    const kindLength = node.kind.length;
    if (isRight && start - node.start == kindLength) {
      return new Range(start + additive);
    }
    if (start > node.start && start <= node.start + kindLength) {
      return new Range(node.start, node.start + kindLength);
    }
  }

  if (!isAtInitial) {
    const slot = findSlot(node, start, codeWithAST);
    if (slot) {
      return slot;
    }

    if (t.isArrayExpression(parent) && checkForEmptyElements(parent, start)) {
      return new Range(start);
    }

    if (!Array.isArray(node) && start == node.end) {
      return new Range(start);
    }
  }

  // Only skip over the starting quote, we might want to call functions on that
  // string so we need the cursor after the closing quote
  if (t.isStringLiteral(node) && start == node.start) {
    if (start == nextStart) {
      return new Range(start + 1);
    }
    return moveOn(nextStart);
  }
  const isHorizontal = isLeft || isRight;

  if (isCursorable(node) && (!isAtInitial || !isHorizontal)) {
    return new Range(start);
  }

  if (!isHorizontal) {
    let left = findCursorX(codeWithAST, "LEFT", false, start);
    let right = findCursorX(codeWithAST, "RIGHT", false, start);
    const leftBreak = code.slice(left.end, start).includes("\n");
    const rightBreak = code.slice(start + 1, right.start).includes("\n");
    if (leftBreak) {
      return right;
    }
    if (rightBreak) {
      return left;
    }
    return Math.min(start - left.start, start - left.end) <
      Math.min(right.start - start, right.end - start)
      ? left
      : right;
  }

  return moveOn(nextStart);
}

export function findCursorY(
  code: string,
  start: number,
  direction: "UP" | "DOWN"
): number {
  const isUp = direction == "UP";
  const charCounts = code
    .split("\n")
    .map((s, i) => s.length + (i == 0 ? 0 : 1));
  const accuCharCounts = charCounts.reduce(
    (accu, n) => accu.concat((accu[accu.length - 1] || 0) + n),
    []
  );

  const line = accuCharCounts.findIndex((n) => n >= start);
  const nextLine = line + (isUp ? -1 : 1);
  if (line == -1) {
    return code.length;
  }
  if (nextLine < 0) {
    return 0;
  }

  return start - (accuCharCounts[line - 1] || 0) > charCounts[nextLine]
    ? accuCharCounts[nextLine]
    : start +
        (isUp
          ? -charCounts[nextLine] + (nextLine == 0 ? -1 : 0)
          : charCounts[line] + (line == 0 ? 1 : 0));
}

export const findCursor = (
  codeWithAST: CodeWithAST,
  direction: Direction,
  start: number
): Range =>
  !direction || direction == "LEFT" || direction == "RIGHT"
    ? findCursorX(codeWithAST, direction, true, start)
    : findCursorX(
        codeWithAST,
        direction,
        false,
        findCursorY(codeWithAST.code, start, direction)
      );
