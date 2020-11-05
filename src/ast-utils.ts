import * as t from "@babel/types";
import memoizeOne from "memoize-one";

function isInRange([start, end], pos) {
  return pos >= start && pos <= end;
}

export function nodeToRange(node) {
  let range;
  if (typeof node.start !== "undefined") {
    range = [node.start, node.end];
  }
  if (range) {
    return range;
  }
  if (node.length > 0) {
    // check first and last child
    let rangeFirst = node[0] && nodeToRange(node[0]);
    let rangeLast = node[node.length - 1] && nodeToRange(node[node.length - 1]);
    if (rangeFirst && rangeLast) {
      return [rangeFirst[0], rangeLast[1]];
    }
  }
}

function* forEachProperty(node) {
  for (const prop in node) {
    if (new Set(["__clone"]).has(prop)) {
      continue;
    }
    yield {
      value: node[prop],
      key: prop,
      computed: false,
    };
  }
}

export const getParentsAndPathTD = memoizeOne(
  (node: t.File, pos, seen = new Set()) => {
    seen.add(node);

    let parents: (t.Node | t.Node[])[] = [];
    let path: (string | number)[] = [];
    let range = nodeToRange(node);
    if (range) {
      if (isInRange(range, pos)) {
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
);

export function getParentsAndPathBU(node: t.File, pos) {
  const [parentsTD, pathTD] = getParentsAndPathTD(node, pos);
  const parentsBU = parentsTD.slice().reverse();
  const pathBU = pathTD.slice().reverse();
  return [parentsBU, pathBU] as const;
}

export function getNode(ast, start: number) {
  const [parents] = getParentsAndPathTD(ast, start);
  return parents[parents.length - 1] as t.Node;
}

export function getNodeFromPath(ast: t.File, path: (string | number)[]) {
  return path.reduce<t.Node>((ast, property) => ast[property], ast);
}
