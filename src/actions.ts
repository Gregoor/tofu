const generate = require('@babel/generator').default;
const t = require('@babel/types');
import { EditorState } from './edtior-state';
import { getFocusPath, getNode } from './ast-utils';
import { replaceCode } from './code-utils';
import { Cursor } from './move-cursor';

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

type ActionResult = ({ code: string } | { ast }) & {
  cursorFromAST?: (ast) => number | Cursor;
};

const addVariableDeclaration = ({
  ast,
  cursor: [start]
}: EditorState): ActionResult => {
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
  return {
    ast,
    cursorFromAST: ast => {
      const node = path
        .concat(path[path.length - 1] == 'body' ? [] : 'body', index)
        .reduce((ast, property) => ast[property], ast);
      return [node.start, node.start + node.kind.length];
    }
  };
};

const toggleLogicalExpression = (node, newOperator) => ({
  ast,
  cursor: [start]
}: EditorState): ActionResult => {
  node.operator = newOperator;
  return {
    ast,
    cursorFromAST: ast => {
      const node = getNode(ast, start);
      return [node.left.end + 1, node.right.start - 1];
    }
  };
};

const addLogicalExpression = operator => ({ ast, cursor: [start] }) => {
  const [parents] = getFocusPath(ast, start);
  console.log(parents);
  return { ast };
};

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
const addToCollection = (
  { ast, cursor: [start, end] }: EditorState,
  shift: boolean
): ActionResult => {
  const [parents, path] = getFocusPath(ast, start);
  const collectionIndex = findLastIndex(parents, isInCollection([start, end]));
  const collection = parents[collectionIndex];
  const childKey = { ArrayExpression: 'elements', CallExpression: 'arguments' }[
    collection.type
  ];
  let index = findSlotIndex(collection[childKey], start);
  if (shift) {
    index = Math.max(0, index - 1);
  }
  collection[childKey].splice(index, 0, t.nullLiteral());
  return {
    ast,
    cursorFromAST: ast => {
      const node = path
        .slice(0, collectionIndex)
        .concat(childKey, index)
        .reduce((ast, property) => ast[property], ast);
      return [node.start, node.end];
    }
  };
};

const changeDeclarationKindTo = (kind: string) => ({
  ast,
  cursor: [start]
}: EditorState): ActionResult => {
  const node = getNode(ast, start);
  node.kind = kind;
  return {
    ast,
    cursorFromAST: ast => {
      const node = getNode(ast, start);
      return [node.start, node.start + node.kind.length];
    }
  };
};

const wrappingStatement = (
  wrapper: (child) => any,
  cursorFromAST: (ast, path: string[]) => Cursor
) => ({ ast, code, cursor: [start] }: EditorState): ActionResult => {
  const [parents, path] = getFocusPath(ast, start);
  const parentStatementIndex = findLastIndex(parents, n => t.isStatement(n));
  const parentStatement = parents[parentStatementIndex];

  let newCode;
  let basePath;

  if (parentStatement && !t.isBlockStatement(parentStatement)) {
    basePath = path.slice(0, parentStatementIndex);

    newCode = replaceCode(
      code,
      [parentStatement.start, parentStatement.end + 1],
      generate(wrapper(t.blockStatement([parentStatement]))).code
    );
  } else {
    const parent = path.reduce((ast, property) => ast[property], ast);
    const siblings = Array.isArray(parent) ? parent : parent.body;
    const index = findSlotIndex(siblings, start);
    basePath = path.concat(Array.isArray(parent) ? [] : 'body', index);

    newCode = replaceCode(
      code,
      start,
      generate(wrapper(t.blockStatement([t.emptyStatement()]))).code
    );
  }

  return {
    code: newCode,
    cursorFromAST: ast => cursorFromAST(ast, basePath)
  };
};

const ifStatement = wrappingStatement(
  child => t.ifStatement(t.identifier('someCondition'), child),
  (ast, path) => {
    const test = [...path, 'test'].reduce(
      (ast, property) => ast[property],
      ast
    );
    return [test.start, test.start + test.name.length];
  }
);

const forStatement = wrappingStatement(
  child =>
    t.forOfStatement(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('item'))
      ]),
      t.identifier('iterable'),
      child
    ),
  (ast, path) => {
    const id = [...path, 'left', 'declarations', '0', 'id'].reduce(
      (ast, property) => ast[property],
      ast
    );
    return [id.start, id.start + id.name.length];
  }
);

export type ActionSections = {
  title: string;
  children: {
    name: string;
    code?: string;
    key?: string;
    execute: (EditorState, shift: boolean) => ActionResult;
  }[];
  ctrlModifier: boolean;
}[];

export default function getAvailableActions({
  ast,
  cursor: [start, end]
}: EditorState): ActionSections {
  const [parents] = getFocusPath(ast, start);
  parents.reverse();
  const parentStatement = parents.find(node => t.isStatement(node));
  const insertMode = !parentStatement || t.isBlockStatement(parentStatement);
  const [node] = parents;
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
  } else if (t.isExpression(node)) {
    actions.push({
      title: 'Insert',
      children: [
        ...['&', '|'].map(operator => ({
          name: operator.repeat(2),
          key: operator,
          execute: operator.repeat(2)
        }))
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
          code: 'Comma',
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
        })),
      ctrlModifier: false
    });
  }

  actions.push({
    title: insertMode ? 'Insert' : 'Surround with',
    ctrlModifier: true,
    children: [
      ...(insertMode
        ? [{ name: 'const/let/var', key: 'd', execute: addVariableDeclaration }]
        : []),
      {
        name: 'if',
        key: 'i',
        execute: ifStatement
      },
      {
        name: 'for...of',
        key: 'f',
        execute: forStatement
      }
    ]
  });

  return actions;
}
