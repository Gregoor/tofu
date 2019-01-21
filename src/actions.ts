const t = require('@babel/types');
import { getFocusPath, getNode, getNodeFromPath } from './ast-utils';
import { selectKind, selectName, selectNode } from './cursor-utils';
import { EditorState } from './edtior-state';
import { Cursor, Direction } from './move-cursor';
import RangeSelector from './range-selector';

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
  canWrapStatement: boolean;
  hidden?: boolean;
}[] = [
  {
    name: 'if',
    create: (child = t.blockStatement([t.emptyStatement()])) =>
      t.ifStatement(t.identifier('someCondition'), child),
    getInitialCursor: (ast, path) =>
      selectName(getNodeFromPath(ast, [...path, 'test'])),
    canWrapStatement: true
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
      ),
    canWrapStatement: true
  },
  {
    name: 'return',
    create: () => t.returnStatement(t.nullLiteral()),
    getInitialCursor: (ast, path) =>
      selectNode(getNodeFromPath(ast, path.concat('argument'))),
    hidden: true,
    canWrapStatement: false
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
      selectName(getNodeFromPath(ast, [...path, 'declarations', '0', 'id'])),
    canWrapStatement: false
  }))
];

export type Action = (
  { ast, cursor: Cursor }
) => ((ast) => number | Cursor) | { restoreAST: true };

const toggleLogicalExpression = (node, newOperator) =>
  (({ ast, cursor: [start] }) => {
    node.operator = newOperator;
    return ast => {
      const node = getNode(ast, start);
      return [node.left.end + 1, node.right.start - 1];
    };
  }) as Action;

const isInCollectionExpression = ([start, end]: Cursor) => node =>
  ((t.isArrayExpression(node) || t.isObjectExpression(node)) &&
    start > node.start &&
    end < node.end) ||
  (t.isCallExpression(node) &&
    start >
      node.end -
        // ()
        2 -
        node.arguments.reduce((sum, node) => sum + node.end - node.start, 0) -
        // ", " between arguments
        (node.arguments.length - 1) * 2 &&
    end < node.end) ||
  t.isArrowFunctionExpression(node);

const addToCollection: Action = ({ ast, cursor: [start, end] }) => {
  const [parents, path] = getFocusPath(ast, start);
  const collectionIndex = findLastIndex(
    parents,
    isInCollectionExpression([start, end])
  );
  const collection = parents[collectionIndex];
  const node = parents[parents.length - 1];
  const [childKey, init] = {
    ArrayExpression: ['elements', t.nullLiteral()],
    ArrowFunctionExpression: ['params', t.identifier('p')],
    CallExpression: ['arguments', t.nullLiteral()],
    ObjectExpression: [
      'properties',
      t.objectProperty(t.identifier('p'), t.identifier('p'), false, true)
    ]
  }[collection.type];
  let index = findSlotIndex(collection[childKey], start);
  if (start == node.start && end == node.start) {
    index = Math.max(0, index - 1);
  }
  collection[childKey].splice(index, 0, init);
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
    const [parents, path] = getFocusPath(ast, start);
    const [node] = parents.slice().reverse();
    node.kind = kind;
    return ast => selectKind(getNodeFromPath(ast, path));
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
    const [, ifStatement] = parents.slice().reverse();
    ifStatement.alternate = block || t.blockStatement([t.emptyStatement()]);
    return ast =>
      getNodeFromPath(ast, [...path.slice(0, -1), 'alternate']).start + 1;
  }) as Action;

const addIfElseBranch = block =>
  (({ ast, cursor: [start] }) => {
    const [parents, path] = getFocusPath(ast, start);
    const [, ifStatement] = parents.slice().reverse();
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
) => ({ ast, cursor: [start] }: { ast: any; cursor: Cursor }) => {
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
};

export type ActionSections = {
  title?: string;
  children: {
    name: string;
    codes?: string[];
    key?: string;
    execute: Action;
  }[];
  key?: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  searchable?: boolean;
}[];

export default function getAvailableActions(
  { ast, lastValidAST, code, cursor }: EditorState,
  rangeSelector: RangeSelector
): ActionSections {
  const [start, end] = cursor;
  if (!ast) {
    return [
      {
        title: 'SyntaxError',
        children: [
          {
            name: 'Restore AST',
            codes: ['Escape'],
            execute: () => ({ restoreAST: true })
          }
        ]
      }
    ];
  }

  let [parents, path] = getFocusPath(ast, start);
  path = path.slice().reverse();
  parents = parents.slice().reverse();
  const parentStatement = parents.find(node => t.isStatement(node));
  const insertMode = !parentStatement || t.isBlockStatement(parentStatement);
  const [node, parent] = parents;
  const actions = [];

  actions.push({
    title: 'Range Select',
    children: ['LEFT', 'RIGHT', 'UP', 'DOWN'].map(direction => ({
      name: {
        LEFT: 'Previous',
        RIGHT: 'Next',
        UP: 'Surrounding',
        DOWN: 'Inner'
      }[direction],
      key: {
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        UP: 'ArrowUp',
        DOWN: 'ArrowDown'
      }[direction],
      execute: () => () =>
        rangeSelector.run(ast, code, cursor, direction as Direction)
    })),
    shift: true
  });

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

  {
    const moveChildren = [];
    const collectionIndex = parents.findIndex(
      n => t.isProgram(n) || t.isBlockStatement(n) || t.isArrayExpression(n)
    );
    const collectionNode = parents[collectionIndex];
    const collection = collectionNode[path[collectionIndex - 1]];
    const itemIndex = Number(path[collectionIndex - 2]);
    const move = (direction: -1 | 1) => {
      const innerStart = start - parents[0].start;

      const newIndex = itemIndex + direction;
      const node = collection[itemIndex];
      const target = collection[newIndex];

      // const [first, second] =
      //   itemIndex > newIndex ? [node, target] : [target, node];
      // const firstLength = first.end - first.start;
      // const secondLength = second.end - second.start;
      // second.start = first.start;
      // second.end = first.start + secondLength;
      // first.start += secondLength;
      // first.end = first.start + firstLength;

      collection[newIndex] = node;
      collection[itemIndex] = target;

      return ast => {
        const newPath = path.slice();
        newPath[collectionIndex - 2] = newIndex.toString();
        return getNodeFromPath(ast, [...newPath.reverse()]).start + innerStart;
      };
    };

    if (itemIndex > 0) {
      moveChildren.push({
        name: 'backwards',
        key: 'ArrowLeft',
        execute: () => move(-1)
      });
    }
    if (collection && itemIndex < collection.length - 1) {
      moveChildren.push({
        name: 'forwards',
        key: 'ArrowRight',
        execute: () => move(1)
      });
    }
    if (moveChildren.length > 0) {
      actions.push({
        title:
          'Move ' +
          (t.isArrayExpression(collectionNode) ? 'element' : 'statement'),
        children: moveChildren,
        alt: true
      });
    }
  }

  {
    const parentCollectionExpression = parents.find(
      isInCollectionExpression([start, end])
    );
    if (parentCollectionExpression) {
      actions.push({
        title: {
          ArrayExpression: 'Array',
          ArrowFunctionExpression: 'Parameters',
          CallExpression: 'Arguments',
          ObjectExpression: 'Properties'
        }[parentCollectionExpression.type],
        children: [
          {
            name: 'Add',
            codes: ['Comma', 'Space'],
            execute: addToCollection
          }
        ],
        ctrl:
          parentCollectionExpression !== node &&
          start !== node.start &&
          start !== node.end
      });
    }
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
    children: [
      ...(t.isExpression(node) &&
      !(t.isVariableDeclarator(parent) && path[0] == 'id')
        ? [
            {
              name: 'Function Call',
              execute: ({ ast }) => {
                const expressionPath = path.slice().reverse();
                getNodeFromPath(ast, expressionPath.slice(0, -1))[
                  expressionPath[expressionPath.length - 1]
                ] = t.callExpression(t.identifier('call'), [node]);
                return ast =>
                  selectName(
                    getNodeFromPath(ast, expressionPath.concat('callee'))
                  );
              }
            }
          ]
        : []),
      ...keywords
        .filter(a => (insertMode || a.canWrapStatement) && !a.hidden)
        .map(({ name, label, create, getInitialCursor }) => ({
          name: label || name,
          execute: wrappingStatement(create, getInitialCursor)
        }))
    ],
    alt: true,
    key: 'w',
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

  {
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
        ctrl: true
      });
    }
  }

  return actions;
}
