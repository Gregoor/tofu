const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const t = require('@babel/types');
import prettier from 'prettier/standalone';
import { getFocusPath, getNode } from './utils';
import moveCursor, { Cursor, spreadCursor } from './move-cursor';

const babylon = require('prettier/parser-babylon');

const WELCOME_CODE = [
  "const FEATURES = ['Edit code with few keystrokes', 'No syntax errors', 'Properly formatted code, no action required']",
  "const TODOS = ['Side Panel', 'Support all the JS language features', 'Syntax Highlighting', 'Proper changes history']",
  '',
  'if (FEATURES.length > TODOS.length) { release(); }'
].join('\n');

const emptyBlock = t.blockStatement([t.emptyStatement()]);

function findLastStatementIndex(nodes: any[]) {
  const reverseIndex = nodes
    .slice()
    .reverse()
    .findIndex(n => t.isStatement(n));
  return reverseIndex < 0 ? -1 : nodes.length - 1 - reverseIndex;
}

class Editor {
  el: HTMLTextAreaElement;
  resizeHandle: HTMLElement;
  code;
  ast;
  parseOnNavigation = false;
  resizeStartX = null;
  printWidth = 80;

  constructor(container: HTMLElement) {
    const el = (this.el = container.querySelector(
      'textarea'
    ) as HTMLTextAreaElement);
    this.resizeHandle = container.querySelector('.handle');

    this.code = this.format(WELCOME_CODE).formatted;
    this.ast = parse(this.code);
    el.value = this.code;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    el.cols = this.printWidth;
    el.addEventListener('keydown', this.handleKeyDown);
    el.addEventListener('input', this.handleInput);
    el.addEventListener('click', this.handleClick);

    this.resizeHandle.addEventListener(
      'mousedown',
      (event: MouseEvent) => (this.resizeStartX = event.clientX)
    );
    document.addEventListener('mouseup', () => (this.resizeStartX = null));
    document.addEventListener(
      'mousemove',
      event => this.resizeStartX && this.handleResize(event)
    );
  }

  get selectionStart() {
    return this.el.selectionStart;
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const { ast, code, el, selectionStart } = this;

    if (event.altKey) {
      if (event.key == 'i') {
        this.insertIfStatement();
        return;
      }
    }

    if (event.key == ',' && !t.isStringLiteral(getNode(ast, selectionStart))) {
      event.preventDefault();
      const [parents, path] = getFocusPath(ast, selectionStart);
      console.log(parents, path, parents.slice().reverse());
    }
    if (
      event.key == 'Enter' &&
      !t.isTemplateLiteral(getNode(ast, selectionStart))
    ) {
      event.preventDefault();
      const accuCharCounts = code
        .split('\n')
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      const pos = accuCharCounts.find(n => n >= el.selectionStart);
      this.updateCode(code.slice(0, pos) + '\n' + code.slice(pos), pos + 1);
      return;
    }

    if (
      event.key == '(' &&
      t.isExpression(getNode(this.ast, this.selectionStart))
    ) {
      event.preventDefault();
      const { formatted, cursorOffset } = this.replaceAndFormat(
        selectionStart,
        '()'
      );
      this.updateCode(formatted, cursorOffset + 1);
      return;
    }

    const direction = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN'
    }[event.key];
    if (!direction) return;

    if (this.parseOnNavigation) {
      // try parsing the current editor state first
      try {
        this.updateCode(this.el.value, this.selectionStart);
      } catch (e) {
        this.updateCode(this.code, this.selectionStart);
        if (!(e instanceof SyntaxError)) {
          throw e;
        }
      }
      this.parseOnNavigation = false;
    }

    event.preventDefault();
    const [start, end] = moveCursor(ast, code, direction, [
      el.selectionStart,
      el.selectionEnd
    ]);
    console.debug([el.selectionStart, el.selectionStart], '=>', [start, end]);
    el.selectionStart = start;
    el.selectionEnd = end;
  };

  handleInput = event => {
    if (event.data == '.') {
      const node = getNode(this.ast, this.selectionStart);
      const unfinishedExpression = !(
        t.isStringLiteral(node) && node.end != this.selectionStart
      );
      if (unfinishedExpression) {
        this.parseOnNavigation = true;
        return;
      }
    }

    try {
      const { cursorOffset, formatted } = this.format();
      this.updateCode(formatted, cursorOffset);
    } catch (e) {
      this.updateCode(this.code, this.selectionStart);
      if (!(e instanceof SyntaxError)) {
        throw e;
      }
    }
  };

  handleClick = (event: MouseEvent) => {
    const { ast, code, el } = this;
    const [start, end] = moveCursor(ast, code, null, [
      el.selectionStart,
      el.selectionEnd
    ]);
    console.debug([el.selectionStart, el.selectionStart], '=>', [start, end]);
    el.selectionStart = start;
    el.selectionEnd = end;
  };

  handleResize = (event: MouseEvent) => {
    const colChange = Math.round((event.clientX - this.resizeStartX) / 2.9);
    if (colChange == 0) {
      return;
    }
    this.resizeStartX = event.clientX;
    this.printWidth += colChange;
    this.el.cols = this.printWidth;
    this.resizeHandle.title = this.printWidth.toString();
    const { formatted, cursorOffset } = this.format();
    this.updateCode(formatted, cursorOffset);
  };

  insertIfStatement = () => {
    const [parents, path] = getFocusPath(this.ast, this.selectionStart);
    const parentStatementIndex = findLastStatementIndex(parents);
    const parentStatement = parents[parentStatementIndex];
    let pathToTest;
    const testIdentifier = t.identifier('someCondition');
    if (parentStatement && !t.isBlockStatement(parentStatement)) {
      pathToTest = path.slice(0, parentStatementIndex);

      const { formatted } = this.replaceAndFormat(
        [parentStatement.start, parentStatement.end + 1],
        generate(
          t.ifStatement(testIdentifier, t.blockStatement([parentStatement]))
        ).code
      );
      this.updateCode(formatted);
    } else {
      const parent = path.reduce((ast, property) => ast[property], this.ast);
      const siblings = Array.isArray(parent) ? parent : parent.body;
      let index = siblings.findIndex(n => n.start > this.selectionStart);
      if (index == -1) index = siblings.length;
      pathToTest = path.concat(Array.isArray(parent) ? [] : 'body', index);

      const { formatted } = this.replaceAndFormat(
        this.selectionStart,
        generate(t.ifStatement(testIdentifier, emptyBlock)).code
      );
      this.updateCode(formatted);
    }

    if (pathToTest) {
      const test = [...pathToTest, 'test'].reduce(
        (ast, property) => ast[property],
        this.ast
      );
      this.el.selectionStart = test.start;
      this.el.selectionEnd = test.start + test.name.length;
    }
  };

  format = (code?: string) => {
    return prettier.formatWithCursor(
      typeof code == 'string' ? code : this.el.value,
      {
        parser: 'babylon',
        plugins: [babylon],
        cursorOffset: this.el.selectionStart,
        printWidth: this.printWidth
      }
    );
  };

  replaceAndFormat = (cursor: Cursor, replacement: string) => {
    const [from, to] = spreadCursor(cursor);
    return this.format(
      this.code.slice(0, Math.max(from, 0)) + replacement + this.code.slice(to)
    );
  };

  updateCode = (
    code: string,
    selectionStart?: number,
    selectionEnd?: number
  ) => {
    const { el } = this;
    this.ast = parse(code);
    this.code = el.value = code;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    if (selectionStart) {
      el.selectionStart = selectionStart;
      el.selectionEnd = selectionEnd || selectionStart;
    }
  };
}

new Editor(document.querySelector('#editor') as HTMLTextAreaElement);
