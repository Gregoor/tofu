import t from "@babel/types";

import { getNode, getParentsAndPathTD } from "../ast-utils";
import { ValidCode } from "../code";
import { findNodeSlot } from "../nodes";
import { Direction, Range } from "../utils";

const isCursorable = (node: t.Node) =>
  [
    t.isStringLiteral,
    t.isTemplateLiteral,
    t.isTemplateElement,
    t.isIdentifier,
    t.isNumericLiteral,
    t.isExpressionStatement,
  ].some((check) => check(node));

function checkForEmptyElements(
  node: t.ArrayExpression,
  start: number
): boolean {
  const emptyElementIndexes: number[] = [];
  const elementEnds: number[] = [];
  for (let i = 0; i < node.elements.length; i++) {
    const element = node.elements[i];
    if (element) {
      elementEnds.push(element.end!);
      continue;
    }

    emptyElementIndexes.push(i);
    elementEnds.push(i == 0 ? node.start! + 1 : elementEnds[i - 1] + 2);
  }

  return elementEnds
    .filter((n, i) => emptyElementIndexes.includes(i))
    .includes(start);
}

function findCursorX(
  code: ValidCode,
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN" | null,
  isAtInitial: boolean,
  start: number
): Range {
  const { ast, source } = code;
  const { isLeft, isRight, isDown, isUp } = {
    isLeft: direction === "LEFT",
    isRight: direction === "RIGHT",
    isDown: direction === "DOWN",
    isUp: direction === "UP",
  };
  const [node, parent] = getParentsAndPathTD(ast, start)[0]
    .slice()
    .reverse() as t.Node[];
  const additive = isLeft ? -1 : isRight ? 1 : 0;
  const nextStart = start + additive;
  const moveOn = (newStart: number) =>
    findCursorX(code, direction, false, newStart);

  if (ast.start! > start) {
    return new Range(ast.start!);
  }
  if (ast.end! < start) {
    return new Range(ast.end!);
  }

  if (
    start !== nextStart &&
    source[start] == "\n" &&
    source[nextStart] == "\n"
  ) {
    if (isLeft && isAtInitial) {
      return findCursorX(code, null, false, nextStart);
    }
    return new Range(isRight ? nextStart : start);
  }

  if (
    t.isExpression(node) &&
    t.isExpression(getNode(ast, nextStart)) &&
    !t.isArrowFunctionExpression(node)
  ) {
    if (
      (source[nextStart] == "(" && isAtInitial) ||
      (source[start] == ")" && isAtInitial)
    ) {
      return new Range(nextStart);
    }
    if (source[nextStart] == ")" && !isAtInitial) {
      return new Range(start);
    }
  }

  if (!isAtInitial) {
    const slot = findNodeSlot(node, start, code);
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
    let left = findCursorX(code, "LEFT", false, start);
    let right = findCursorX(code, "RIGHT", false, start);
    const leftBreak = source.slice(left.end, start).includes("\n");
    const rightBreak = source.slice(start + 1, right.start).includes("\n");
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
  const accuCharCounts = charCounts.reduce<number[]>(
    (accu, n) => [...accu, (accu[accu.length - 1] || 0) + n],
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
  code: ValidCode,
  direction: Direction,
  start: number
): Range =>
  !direction || direction == "LEFT" || direction == "RIGHT"
    ? findCursorX(code, direction, true, start)
    : findCursorX(
        code,
        direction,
        false,
        findCursorY(code.source, start, direction)
      );
