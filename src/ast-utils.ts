import memoizeOne from 'memoize-one';

function isInRange([start, end], pos) {
  return pos >= start && pos <= end;
}

export function nodeToRange(node) {
  let range;
  if (typeof node.start !== 'undefined') {
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
    if (new Set(['__clone']).has(prop)) {
      continue;
    }
    yield {
      value: node[prop],
      key: prop,
      computed: false
    };
  }
}

export const getFocusPath = memoizeOne((node, pos, seen = new Set()) => {
  seen.add(node);

  let parents = [];
  let path = [];
  let range = nodeToRange(node);
  if (range) {
    if (isInRange(range, pos)) {
      parents.push(node);
    } else {
      return [[], []];
    }
  }
  for (let { key, value } of forEachProperty(node)) {
    if (value && typeof value === 'object' && !seen.has(value)) {
      let [childParents, childPath] = getFocusPath(value, pos, seen);
      if (childParents.length > 0) {
        parents = parents.concat(childParents);
        path = path.concat(key, childPath);
        break;
      }
    }
  }
  return [parents, path];
});

export function getParent(ast, start: number) {
  const [parents] = getFocusPath(ast, start);
  return parents.length > 1 ? parents[parents.length - 2] : null;
}

export function getNode(ast, start: number) {
  const [parents] = getFocusPath(ast, start);
  return parents[parents.length - 1];
}

export function getNodeFromPath(ast, path: (string | number)[]) {
  return path.reduce((ast, property) => ast[property], ast);
}
