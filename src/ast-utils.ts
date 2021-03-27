import * as t from "@babel/types";

import { selectNode } from "./cursor/utils";
import { Range } from "./utils";

function* forEachProperty(node: t.Node) {
  for (const prop in node) {
    if (new Set(["__clone"]).has(prop)) {
      continue;
    }
    yield {
      value: (node as any)[prop],
      key: prop,
      computed: false,
    };
  }
}

export type Path = (string | number)[];

export function getLineage(
  parentNode: t.Node,
  pos: number | Range,
  parentPath: Path = []
): [t.Node, Path][] {
  const cursor = pos instanceof Range ? pos : new Range(pos);
  const candidates: ReturnType<typeof getLineage> = [];
  for (const { key, value } of forEachProperty(parentNode)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const childNode = value[i];
        if (t.isNode(childNode) && selectNode(childNode).includes(cursor)) {
          candidates.push([childNode, [...parentPath, key, i]]);
        }
      }
    } else if (t.isNode(value) && selectNode(value).includes(cursor)) {
      candidates.push([value, [...parentPath, key]]);
    }
  }
  // TODO: Invert that control, finding multiple candidates seems to be JSX exclusive
  const candidate =
    candidates.length == 1
      ? candidates[0]
      : !candidates.every(
          ([node]) => t.isJSXOpeningElement(node) && t.isJSXClosingElement(node)
        ) &&
        candidates.find(([node1]) =>
          candidates.every(([node2]) => node1.start! >= node2.start!)
        );
  return candidate
    ? [candidate, ...getLineage(candidate[0], cursor, candidate[1])]
    : [];
}

export function getLineageNodes(ast: t.File, start: number) {
  return getLineage(ast, start).map(([node]) => node);
}

export function getNode(ast: t.File, start: number) {
  const parentsAndPaths = getLineage(ast, start);
  const node = parentsAndPaths[parentsAndPaths.length + -1][0];
  if (!node) {
    throw new Error("No node found at " + start);
  }
  return node;
}

export function getNodeFromPath(ast: t.File, path: Path) {
  return path.reduce<t.Node | t.Node[]>(
    (ast, property) => (ast as any)[property],
    ast
  );
}
