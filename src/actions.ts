const generate = require('@babel/generator').default;
const t = require('@babel/types');
import { getFocusPath, getNode } from './ast-utils';
import { replaceCode } from './code-utils';
import { EditorState } from './edtior-state';
import { Cursor } from './move-cursor';
import { selectNode } from './range-selector';

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

const selectName = ({ start, name }) =>
  [start, start + name.length] as [number, number];

const selectKind = ({ start, kind }) =>
  [start, start + kind.length] as [number, number];

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
    cursorFromAST: ast =>
      selectKind(
        getNodeFromPath(
          ast,
          path.concat(path[path.length - 1] == 'body' ? [] : 'body', index)
        )
      )
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

const addToCollection = ({
  ast,
  cursor: [start, end]
}: EditorState): ActionResult => {
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
  return {
    ast,
    cursorFromAST: ast =>
      selectNode(
        getNodeFromPath(
          ast,
          path.slice(0, collectionIndex).concat(childKey, index)
        )
      )
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
    cursorFromAST: ast => selectKind(getNode(ast, start))
  };
};

function removeCallOrMember({ ast, cursor }: EditorState): ActionResult {
  const [parents, path] = getFocusPath(ast, cursor[0]);
  const [node, parent] = parents.slice().reverse();
  const [lastKey] = path.slice().reverse();
  parent[lastKey] = node.callee || node.object;
  return {
    ast,
    cursorFromAST: ast => {
      const callee = getNodeFromPath(ast, path);
      return [callee.end, callee.end];
    }
  };
}

const addElseBranch = block => ({
  ast,
  cursor: [start]
}: EditorState): ActionResult => {
  const [parents, path] = getFocusPath(ast, start);
  const [, ifStatement] = parents.reverse();
  ifStatement.alternate = block || t.blockStatement([t.emptyStatement()]);
  return {
    ast,
    cursorFromAST: ast => {
      const block = getNodeFromPath(ast, [...path.slice(0, -1), 'alternate']);
      return [block.start + 1, block.start + 1];
    }
  };
};

const addIfElseBranch = block => ({
  ast,
  cursor: [start]
}: EditorState): ActionResult => {
  const [parents, path] = getFocusPath(ast, start);
  const [, ifStatement] = parents.reverse();
  ifStatement.alternate = t.ifStatement(
    t.identifier('test'),
    block || t.blockStatement([t.emptyStatement()])
  );
  return {
    ast,
    cursorFromAST: ast =>
      selectNode(
        getNodeFromPath(ast, [...path.slice(0, -1), 'alternate', 'test'])
      )
  };
};

export const wrappingStatement = (
  wrapper: (child?) => any,
  getInitialCursor: (ast, path: string[]) => Cursor
) => ({
  ast,
  code,
  cursor: [start]
}: Pick<EditorState, 'ast' | 'code' | 'cursor'>): ActionResult => {
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
    const parent = getNodeFromPath(ast, path);
    const siblings = Array.isArray(parent) ? parent : parent.body;
    const index = findSlotIndex(siblings, start);
    basePath = path.concat(Array.isArray(parent) ? [] : 'body', index);

    newCode = replaceCode(code, start, generate(wrapper()).code);
  }

  return {
    code: newCode,
    cursorFromAST: ast => getInitialCursor(ast, basePath)
  };
};

export type ActionSections = {
  title?: string;
  children: {
    name: string;
    codes?: string[];
    key?: string;
    execute: (EditorState, shift: boolean) => ActionResult;
  }[];
  ctrlModifier?: boolean;
}[];

export default function getAvailableActions({
  ast,
  cursor: [start, end]
}: EditorState): ActionSections {
  const [parents] = getFocusPath(ast, start);
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

  if (!insertMode) {
    actions.push({
      title: 'Wrap with',
      children: keywords.map(({ name, label, create, getInitialCursor }) => ({
        name: label || name,
        execute: wrappingStatement(create, getInitialCursor)
      }))
    });
  }

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

  return actions;
}
