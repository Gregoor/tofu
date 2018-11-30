const t = require('@babel/types');
import { getFocusPath, getNode } from './ast-utils';
import { selectKind, selectName, selectNode } from './cursor-utils';
import { EditorState } from './edtior-state';
import { Cursor } from './move-cursor';

function getNodeFromPath(ast, path: (string | number)[]) {
  return path.reduce((ast, property) => ast[property], ast);
}

function findLastIndex(nodes: any[], check: (n) => boolean) {
  const reverseIndex = nodes
    .slice()
    .reverse()
    .findIndex(check);
  return reverseIndex < 0 ? -1 : nodes.length - 1 - reverseIndex;
}

function findSlotIndex(collection, start: number) {
  let index = collection.findIndex(n => n.start > start);
  if (index == -1) {
    index = collection.length;
  }
  return index;
}

export const keywords: {
  name: string;
  label?: string;
  create: (child?) => any;
  getInitialCursor: (ast, path) => [number, number];
}[] = [
  {
    name: 'if',
    create: (child = t.blockStatement([t.emptyStatement()])) =>
      t.ifStatement(t.identifier('someCondition'), child),
    getInitialCursor: (ast, path) =>
      selectName(getNodeFromPath(ast, [...path, 'test']))
  },
  {
    name: 'for',
    label: 'for...of',
    create: (child = t.blockStatement([t.emptyStatement()])) =>
      t.forOfStatement(
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('item'))
        ]),
        t.identifier('iterable'),
        child
      ),
    getInitialCursor: (ast, path) =>
      selectName(
        getNodeFromPath(ast, [...path, 'left', 'declarations', '0', 'id'])
      )
  },

  ...['const', 'let', 'var'].map(kind => ({
    name: kind,
    create: initial =>
      t.variableDeclaration(kind, [
        t.variableDeclarator(
          t.identifier('n'),
          initial || (kind == 'const' ? t.nullLiteral() : null)
        )
      ]),
    getInitialCursor: (ast, path) =>
      selectName(getNodeFromPath(ast, [...path, 'declarations', '0', 'id']))
  }))
];

export type Action = ({ ast, cursor: Cursor }) => (ast) => number | Cursor;

const addVariableDeclaration: Action = ({ ast, cursor: [start] }) => {
  const [parents, path] = getFocusPath(ast, start);
  const parent = parents
    .reverse()
    .find(node => t.isBlockStatement(node) || t.isProgram(node));
  const index = findSlotIndex(parent.body, start);
  parent.body.splice(
    index,
    0,
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('name'), t.nullLiteral())
    ])
  );
  return ast =>
    selectKind(
      getNodeFromPath(
        ast,
        path.concat(path[path.length - 1] == 'body' ? [] : 'body', index)
      )
    );
};

const toggleLogicalExpression = (node, newOperator) =>
  (({ ast, cursor: [start] }) => {
    node.operator = newOperator;
    return ast => {
      const node = getNode(ast, start);
      return [node.left.end + 1, node.right.start - 1];
    };
  }) as Action;

const isInCollection = ([start, end]: Cursor) => node =>
  (t.isArrayExpression(node) && start > node.start && end < node.end) ||
  (t.isCallExpression(node) &&
    start >
      node.end -
        // ()
        2 -
        node.arguments.reduce((sum, node) => sum + node.end - node.start, 0) -
        // ", " between arguments
        (node.arguments.length - 1) * 2 &&
    end < node.end);

const addToCollection: Action = ({ ast, cursor: [start, end] }) => {
  const [parents, path] = getFocusPath(ast, start);
  const collectionIndex = findLastIndex(parents, isInCollection([start, end]));
  const collection = parents[collectionIndex];
  const node = parents[parents.length - 1];
  const childKey = { ArrayExpression: 'elements', CallExpression: 'arguments' }[
    collection.type
  ];
  let index = findSlotIndex(collection[childKey], start);
  if (start == node.start && end == node.start) {
    index = Math.max(0, index - 1);
  }
  collection[childKey].splice(index, 0, t.nullLiteral());
  return ast =>
    selectNode(
      getNodeFromPath(
        ast,
        path.slice(0, collectionIndex).concat(childKey, index)
      )
    );
};

const changeDeclarationKindTo = (kind: string) =>
  (({ ast, cursor: [start] }) => {
    const node = getNode(ast, start);
    node.kind = kind;
    return ast => selectKind(getNode(ast, start));
  }) as Action;

const removeCallOrMember: Action = ({ ast, cursor }) => {
  const [parents, path] = getFocusPath(ast, cursor[0]);
  const [node, parent] = parents.slice().reverse();
  const [lastKey] = path.slice().reverse();
  parent[lastKey] = node.callee || node.object;
  return ast => getNodeFromPath(ast, path).end;
};

const addElseBranch = block =>
  (({ ast, cursor: [start] }) => {
    const [parents, path] = getFocusPath(ast, start);
    const [, ifStatement] = parents.reverse();
    ifStatement.alternate = block || t.blockStatement([t.emptyStatement()]);
    return ast =>
      getNodeFromPath(ast, [...path.slice(0, -1), 'alternate']).start + 1;
  }) as Action;

const addIfElseBranch = block =>
  (({ ast, cursor: [start] }) => {
    const [parents, path] = getFocusPath(ast, start);
    const [, ifStatement] = parents.reverse();
    ifStatement.alternate = t.ifStatement(
      t.identifier('test'),
      block || t.blockStatement([t.emptyStatement()])
    );
    return ast =>
      selectNode(
        getNodeFromPath(ast, [...path.slice(0, -1), 'alternate', 'test'])
      );
  }) as Action;

export const wrappingStatement = (
  wrapper: (child?) => any,
  getInitialCursor: (ast, path: string[]) => Cursor
) =>
  (({ ast, cursor: [start] }) => {
    const [parents, path] = getFocusPath(ast, start);
    const parentStatementIndex = findLastIndex(parents, n => t.isStatement(n));
    const parentStatement = parents[parentStatementIndex];

    let basePath;
    if (parentStatement && !t.isBlockStatement(parentStatement)) {
      basePath = path.slice(0, parentStatementIndex);
      getNodeFromPath(ast, basePath.slice(0, -1))[
        basePath[basePath.length - 1]
      ] = wrapper(t.blockStatement([parentStatement]));
    } else {
      const parent = getNodeFromPath(ast, path);
      const siblings = Array.isArray(parent) ? parent : parent.body;
      const index = findSlotIndex(siblings, start);
      basePath = path.concat(Array.isArray(parent) ? [] : 'body', index);
      getNodeFromPath(ast, basePath.slice(0, -1)).splice(index, 0, wrapper());
    }

    return ast => getInitialCursor(ast, basePath);
  }) as Action;

export type ActionSections = {
  title?: string;
  children: {
    name: string;
    codes?: string[];
    key?: string;
    execute: Action;
  }[];
  key?: string;
  ctrlModifier?: boolean;
  searchable?: boolean;
}[];

export default function getAvailableActions({
  ast,
  cursor: [start, end]
}: EditorState): ActionSections {
  const [parents, path] = getFocusPath(ast, start);
  path.reverse();
  parents.reverse();
  const parentStatement = parents.find(node => t.isStatement(node));
  const insertMode = !parentStatement || t.isBlockStatement(parentStatement);
  const [node, parent] = parents;
  const actions = [];

  if (t.isLogicalExpression(node)) {
    const newOperator = node.operator == '||' ? '&' : '|';
    actions.push({
      title: 'Modify',
      children: [
        {
          name: newOperator.repeat(2),
          key: newOperator,
          execute: toggleLogicalExpression(node, newOperator.repeat(2))
        }
      ]
    });
  }

  const parentCollection = parents.find(isInCollection([start, end]));
  if (parentCollection) {
    actions.push({
      title: { ArrayExpression: 'Array', CallExpression: 'Arguments' }[
        parentCollection.type
      ],
      children: [
        {
          name: 'Add',
          codes: ['Comma', 'Space'],
          execute: addToCollection
        }
      ],
      ctrlModifier:
        parentCollection !== node && start !== node.start && start !== node.end
    });
  }

  if (t.isVariableDeclaration(node)) {
    actions.push({
      title: 'Change to',
      children: ['const', 'let', 'var']
        .filter(n => n !== node.kind)
        .map(name => ({
          name,
          key: name[0],
          execute: changeDeclarationKindTo(name)
        }))
    });
  }

  actions.push({
    title: insertMode ? 'Insert' : 'Wrap with',
    children: keywords.map(({ name, label, create, getInitialCursor }) => ({
      name: label || name,
      execute: wrappingStatement(create, getInitialCursor)
    })),
    ctrlModifier: true,
    key: 'd',
    searchable: true
  });

  if (
    (t.isCallExpression(node) || t.isMemberExpression(node)) &&
    start == node.end
  ) {
    actions.push({
      children: [{ name: '', key: 'Backspace', execute: removeCallOrMember }]
    });
  }

  if (
    t.isIfStatement(parent) &&
    t.isBlockStatement(node) &&
    start == node.end
  ) {
    const children = [];
    const { alternate } = parent;

    if (!alternate || t.isIfStatement(alternate)) {
      children.push({
        name: 'else',
        key: 'e',
        execute: addElseBranch(alternate ? alternate.consequent : null)
      });
    }
    if (!alternate || t.isBlockStatement(alternate)) {
      children.push({
        name: 'else if',
        key: 'i',
        execute: addIfElseBranch(alternate || null)
      });
    }

    actions.push({
      title: alternate ? 'Change branch' : 'Add branch',
      children
    });
  }

  const forIndex = parents.slice(0, 5).findIndex(n => t.isForOfStatement(n));
  if (forIndex != -1) {
    actions.push({
      title: 'Change "for..of" to',
      children: [
        {
          name: 'i++',
          key: 'i',
          execute: ({ ast }) => {
            const forStatement = parents[forIndex];
            getNodeFromPath(ast, path.slice(forIndex + 1).reverse())[
              path[forIndex]
            ] = t.forStatement(null, null, null, forStatement.body);
            // t.forStatement();
          }
        }
      ],
      ctrlModifier: true
    });
  }

  return actions;
}
