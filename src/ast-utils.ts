import t from "@babel/types";

import { Range } from "./utils";

export function nodeToRange(node: t.Node | t.Node[]): Range | null {
  if (Array.isArray(node)) {
    const rangeFirst = node[0] && nodeToRange(node[0]);
    const rangeLast =
      node[node.length - 1] && nodeToRange(node[node.length - 1]);
    return rangeFirst && rangeLast
      ? new Range(rangeFirst.start, rangeLast.end)
      : null;
  } else {
    return new Range(node.start!, node.end);
  }
}

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

export function getParentsAndPathTD(
  node: t.File,
  pos: number,
  seen = new Set()
) {
  seen.add(node);

  let parents: (t.Node | t.Node[])[] = [];
  let path: (string | number)[] = [];
  let range = nodeToRange(node);
  if (range) {
    if (range.includes(pos)) {
      parents.push(node);
    } else {
      return [[], []];
    }
  }
  for (let { key, value } of forEachProperty(node)) {
    if (value && typeof value === "object" && !seen.has(value)) {
      let [childParents, childPath] = getParentsAndPathTD(value, pos, seen);
      if (childParents.length > 0) {
        parents = parents.concat(childParents);
        path = path.concat(key, childPath);
        break;
      }
    }
  }
  return [parents, path] as const;
}

export function getParentsAndPathBU(node: t.File, pos: number) {
  const [parentsTD, pathTD] = getParentsAndPathTD(node, pos);
  const parentsBU = parentsTD.slice().reverse();
  const pathBU = pathTD.slice().reverse();
  return [parentsBU, pathBU] as const;
}

export function getNode(ast: t.File, start: number) {
  const [parents] = getParentsAndPathTD(ast, start);
  return parents[parents.length - 1] as t.Node;
}

export function getNodeFromPath(ast: t.File, path: (string | number)[]) {
  return path.reduce<t.Node>((ast, property) => (ast as any)[property], ast);
}
