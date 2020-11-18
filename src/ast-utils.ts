import t from "@babel/types";

import { selectNode } from "./cursor/utils";

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

type Path = (string | number)[];

export function getLineage(
  parentNode: t.Node,
  pos: number,
  parentPath: Path = []
): [t.Node, Path][] {
  for (const { key, value } of forEachProperty(parentNode)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const childNode = value[i];
        if (t.isNode(childNode) && selectNode(childNode).includes(pos)) {
          const childPath = [...parentPath, key, i];
          return [
            [childNode, childPath],
            ...getLineage(childNode, pos, childPath),
          ];
        }
      }
    } else if (t.isNode(value) && selectNode(value).includes(pos)) {
      const childPath = [...parentPath, key];
      return [[value, childPath], ...getLineage(value, pos, childPath)];
    }
  }
  return [];
}

export function getParents(ast: t.File, start: number) {
  return getLineage(ast, start).map(([node]) => node);
}

export function getNode(ast: t.File, start: number, negIndex = -1) {
  const parentsAndPaths = getLineage(ast, start);
  return parentsAndPaths[parentsAndPaths.length + negIndex][0];
}

export function getNodeFromPath(ast: t.File, path: Path) {
  return path.reduce<t.Node>((ast, property) => (ast as any)[property], ast);
}
