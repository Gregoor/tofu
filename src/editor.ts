const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const t = require('@babel/types');
import prettier from 'prettier/standalone';
import { el } from 'redom';
import getAvailableActions, { ActionSections } from './actions';
import { getFocusPath, getNode } from './ast-utils';
import { replaceCode } from './code-utils';
import { EditorState } from './edtior-state';
import moveCursor, { Cursor, Direction, spreadCursor } from './move-cursor';
import styles from './styles';

const babylon = require('prettier/parser-babylon');

export default class Editor {
  textArea: HTMLTextAreaElement;
  actionBar: HTMLElement;
  lineNumbers: HTMLElement;
  resizeHandle: HTMLElement;
  state: EditorState;

  resizeStartX = null;

  actions: ActionSections = [];

  constructor(container: HTMLElement, code: string) {
    const box = el('div', { class: styles.box });
    const actionBar = (this.actionBar = el('div', { class: styles.actionBar }));
    container.append(box, actionBar);
    container.classList.add(styles.editor);

    const textArea = (this.textArea = el('textarea', {
      class: styles.textArea
    }) as HTMLTextAreaElement);
    this.lineNumbers = el('div', { class: styles.lineNumbers });
    this.resizeHandle = el('div', {
      class: styles.handle
    });
    box.append(
      el('div', { class: styles.textAreaWrapper }, [
        this.lineNumbers,
        textArea
      ]),
      this.resizeHandle
    );

    this.update({ code, cursor: [0, 0], printWidth: 80 });

    textArea.addEventListener('keydown', this.handleKeyDown);
    textArea.addEventListener('input', this.handleInput);
    textArea.addEventListener('click', this.handleClick);

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

  handleKeyDown = (event: KeyboardEvent) => {
    const { textArea, state } = this;
    const { ast, code, cursor } = state;
    const [start] = cursor;

    let action = this.actions
      .filter(s => event.altKey || !s.needsAlt)
      .map(s => s.children)
      .flat()
      .find(a => a.key == event.key);
    if (action) {
      const result = action.execute(this.state);
      this.update(result);
      if (result.cursorFromAST) {
        this.update({ cursor: result.cursorFromAST(this.state.ast) });
      }
      event.preventDefault();
      return;
    }

    if (event.key == 'Enter' && !t.isTemplateLiteral(getNode(ast, start))) {
      event.preventDefault();
      const accuCharCounts = code
        .split('\n')
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      const pos = accuCharCounts.find(n => n >= textArea.selectionStart);
      this.update(
        {
          code: code.slice(0, pos) + '\n' + code.slice(pos),
          cursor: pos + 1
        },
        { prettify: false }
      );
      return;
    }

    if (event.key == 'Home' || event.key == 'End') {
      // don't judge me
      setTimeout(() => {
        this.update({ cursor: textArea.selectionStart });
        this.moveCursor(null);
      });
    }

    const direction = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN'
    }[event.key];
    if (!direction) return;

    if (!this.state.ast) {
      this.update({});
    }

    event.preventDefault();
    this.moveCursor(direction);
  };

  handleInput = ({ data }: any) => {
    const {
      ast,
      code,
      cursor: [start]
    } = this.state;
    let { selectionStart, selectionEnd, value } = this.textArea;

    let shouldParse = true;
    if (ast && data == '.') {
      const node = getNode(ast, start);
      shouldParse = t.isStringLiteral(node) && node.end != start;
    }

    const [parents] = ast ? getFocusPath(ast, start) : [null];
    parents.reverse();
    const node = Array.isArray(parents[0]) ? parents[1] : parents[0];

    if (data == '(' && t.isExpression(node)) {
      this.update({
        code: replaceCode(code, start, '()'),
        cursor: selectionStart
      });
      return;
    }

    if (["'", '"', '`'].includes(data)) {
      data += data;
    }

    this.update(
      {
        code:
          data && t.isArrayExpression(node)
            ? replaceCode(code, start, data + ',')
            : value,
        cursor: [selectionStart, selectionEnd]
      },
      { shouldParse }
    );
  };

  handleClick = () => {
    const { textArea } = this;
    this.update({ cursor: [textArea.selectionStart, textArea.selectionEnd] });
    this.moveCursor(null);
  };

  moveCursor(direction: Direction) {
    const { ast, code, cursor } = this.state;
    const newCursor = moveCursor(ast, code, direction, cursor);
    console.debug(cursor, '=>', newCursor);
    this.update({ cursor: newCursor });
  }

  handleResize = (event: MouseEvent) => {
    const colChange = Math.round((event.clientX - this.resizeStartX) / 2.9);
    if (colChange == 0) {
      return;
    }
    this.resizeStartX = event.clientX;

    this.update({ printWidth: Math.max(20, this.state.printWidth + colChange) });
  };

  update = (
    state: Partial<{
      ast: any;
      code: string;
      cursor: number | Cursor;
      printWidth: number;
    }>,
    options: { prettify?: boolean; shouldParse?: boolean } = {}
  ) => {
    const { prettify, shouldParse } = {
      prettify: true,
      shouldParse: true,
      ...options
    };

    const prevState = this.state || ({} as any);

    const cursor =
      state.cursor !== undefined
        ? spreadCursor(state.cursor)
        : prevState.cursor;
    let [start, end] = cursor;

    const newState = { ...prevState, ...{ ...state, cursor } };
    let { ast, code, printWidth } = newState;

    code = state.ast ? generate(state.ast).code : code;

    const { textArea } = this;
    const newWidth = printWidth !== prevState.printWidth;

    if (code !== prevState.code || newWidth) {
      if (prettify) {
        try {
          const { formatted, cursorOffset } = prettier.formatWithCursor(code, {
            parser: 'babylon',
            plugins: [babylon],
            cursorOffset: start,
            printWidth,
            trailingComma: 'all'
          });
          ast = parse(formatted);
          code = formatted;
          start = end = cursorOffset;
        } catch (e) {
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
          if (shouldParse) {
            ast = prevState.ast;
            code = prevState.code;
          } else {
            ast = null;
          }
        }
      } else {
        ast = parse(code);
      }

      textArea.value = code;
    }

    textArea.selectionStart = start;
    textArea.selectionEnd = end || start;

    if (newWidth) {
      textArea.cols = printWidth;
      this.resizeHandle.title = printWidth.toString();
    }

    this.state = { ...newState, ast, code, cursor: [start, end] };
    this.render();
  };

  render() {
    const { actionBar, state, textArea } = this;

    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';

    if (false) {
      this.lineNumbers.innerHTML = '';
      this.lineNumbers.append(
        ...state.code.split('\n').map((_, i) => el('div', i))
      );
    }

    this.actions = state.ast ? getAvailableActions(state) : [];
    actionBar.innerHTML = '';
    actionBar.append(
      ...this.actions.map(actionSection => {
        const section = el('section', { class: styles.actionSection });

        section.append(
          el('h4', [
            actionSection.title,
            actionSection.needsAlt && el('span', { class: styles.key }, 'Alt')
          ]),
          ...actionSection.children.map(action =>
            el('div', { class: styles.action }, [
              el('div', action.name),
              el('div', { class: styles.key }, action.key)
            ])
          )
        );

        return section;
      })
    );
  }
}
