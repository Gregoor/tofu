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

const variableDeclaration = ({ ast, cursor }: EditorState): ActionResult => {
  return { ast };
};

const addToCollection = ({
  ast,
  cursor: [start, end]
}: EditorState): ActionResult => {
  const [parents, path] = getFocusPath(ast, start);
  const collectionIndex = findLastIndex(
    parents,
    node => t.isArrayExpression(node) && start > node.start && end < node.end
  );
  const collection = parents[collectionIndex];
  const index = findSlotIndex(collection.elements, start);
  collection.elements.splice(index, 0, t.nullLiteral());
  return {
    ast,
    cursorFromAST: ast => {
      const node = path
        .slice(0, collectionIndex)
        .concat('elements', index)
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
    key: string;
    execute: (EditorState) => ActionResult;
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

  const parentCollection = parents.find(
    node => t.isArrayExpression(node) && start > node.start && end < node.end
  );
  if (t.isArrayExpression(parentCollection)) {
    actions.push({
      title: { ArrayExpression: 'Array' }[parentCollection.type],
      children: [
        {
          name: 'Add',
          key: ',',
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
        ? [{ name: 'const/let/var', key: 'd', execute: variableDeclaration }]
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
