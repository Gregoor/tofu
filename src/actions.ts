const generate = require('@babel/generator').default;
const t = require('@babel/types');
import { EditorState } from './edtior-state';
import { getFocusPath, getNode } from './ast-utils';
import { replaceCode } from './code-utils';
import { Cursor } from './move-cursor';

function findLastStatementIndex(nodes: any[]) {
  const reverseIndex = nodes
    .slice()
    .reverse()
    .findIndex(n => t.isStatement(n));
  return reverseIndex < 0 ? -1 : nodes.length - 1 - reverseIndex;
}

type ActionResult = ({ code: string } | { ast }) & {
  cursorFromAST?: (ast) => number | Cursor;
};

const changeDeclarationKindFor = (kind: string) => ({
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
  const parentStatementIndex = findLastStatementIndex(parents);
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
    let index = siblings.findIndex(n => n.start > start);
    if (index == -1) index = siblings.length;
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
  child => t.forOfStatement(
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
  needsAlt: boolean;
}[];

export default function getAvailableActions({
  ast,
  cursor: [start]
}: EditorState): ActionSections {
  const [parents] = getFocusPath(ast, start);
  const parentStatement = parents.reverse().find(node => t.isStatement(node));
  const node = parents[0];
  return [
    ...(t.isVariableDeclaration(node)
      ? [
          {
            title: 'Change to',
            children: ['const', 'let', 'var']
              .filter(n => n !== node.kind)
              .map(name => ({
                name,
                key: name[0],
                execute: changeDeclarationKindFor(name)
              })),
            needsAlt: false
          }
        ]
      : []),
    {
      title: parentStatement ? 'Surround' : 'Insert',
      needsAlt: true,
      children: [
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
    }
  ];
}
