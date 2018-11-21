const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const t = require('@babel/types');
const CodeFlask = require('codeflask').default;
import prettier from 'prettier/standalone';
import { el } from 'redom';
import produce from 'immer';
import getAvailableActions, {
  Action,
  ActionSections,
  keywords,
  wrappingStatement
} from './actions';
import { getFocusPath, getNode } from './ast-utils';
import { replaceCode } from './code-utils';
import { spreadCursor } from './cursor-utils';
import { EditorState } from './edtior-state';
import moveCursor, { Cursor, Direction } from './move-cursor';
import RangeSelector from './range-selector';
import styles from './styles';

const babylon = require('prettier/parser-babylon');

function generateCodeFromAST(ast) {
  return generate(ast, { retainLines: true }).code;
}

export default class Editor {
  textArea: HTMLTextAreaElement;
  flask: any;
  actionBar: HTMLElement;
  resizeHandle: HTMLElement;
  history: EditorState[] = [];
  future: EditorState[] = [];
  rangeSelector = new RangeSelector();

  renderIdleCallbackId: number;

  resizeStartX = null;

  actions: ActionSections = [];

  constructor(container: HTMLElement, code: string) {
    const actionBar = (this.actionBar = el('div', { class: styles.actionBar }));
    const flaskContainer = el('div', {class: styles.flaskContainer});

    this.flask = new CodeFlask(flaskContainer, {
      language: 'js',
      lineNumbers: !true
    });
    const textArea = (this.textArea = this.flask.elTextarea);
    this.resizeHandle = el('div', {
      class: styles.handle
    });

    container.append(flaskContainer, this.resizeHandle, actionBar);
    container.classList.add(styles.editor);

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

  get state() {
    return this.history[this.history.length - 1];
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const { textArea, state } = this;
    const { ast, code, cursor } = state;
    const [start] = cursor;

    let action = this.actions
      .filter(s => event.ctrlKey || !s.ctrlModifier)
      .map(s => s.children)
      .flat()
      .find(a => a.key == event.key || (a.codes || []).includes(event.code));
    if (action) {
      this.executeAction(action);
      event.preventDefault();
      return;
    }

    if (event.code == 'KeyZ' && event.ctrlKey) {
      if (event.shiftKey && this.future.length > 0) {
        this.history.push(this.future.pop());
        this.render();
      } else if (!event.shiftKey && this.history.length > 1) {
        this.future.push(this.state);
        this.history = this.history.slice(0, -1);
        this.render();
      }
      event.preventDefault();
      return;
    }

    const node = ast ? getNode(ast, start) : null;

    if (event.key == 'Enter' && !t.isTemplateLiteral(node)) {
      event.preventDefault();
      const accuCharCounts = code
        .split('\n')
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      let index = accuCharCounts.findIndex(n => n >= textArea.selectionStart);
      if (event.shiftKey && index > 0) {
        index -= 1;
      }
      const pos = event.shiftKey && index == 0 ? 0 : accuCharCounts[index];
      this.update(
        {
          code: code.slice(0, pos) + '\n' + code.slice(pos),
          cursor: pos == 0 ? 0 : pos + 1
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

    event.preventDefault();
    this.moveCursor(direction, event.shiftKey);
  };

  handleInput = ({ data }: any) => {
    const {
      ast,
      code,
      cursor: [start, end]
    } = this.state;
    let { selectionStart, selectionEnd, value } = this.textArea;

    const [parents] = ast ? getFocusPath(ast, start) : [[], []];
    parents.reverse();
    const node = Array.isArray(parents[0]) ? parents[1] : parents[0];

    if (
      ['(', '['].includes(data) &&
      (t.isExpression(node) || t.isBlock(node)) &&
      !t.isStringLiteral(node) &&
      !t.isTemplateLiteral(node)
    ) {
      this.update({
        code: replaceCode(code, start, data + { '(': ')', '[': ']' }[data]),
        cursor: selectionStart
      });
      return;
    }

    if (!ast && (data == ' ' || data == '(')) {
      const keyword = keywords.find(
        ({ name }) => code.slice(start - name.length, start) == name
      );
      if (keyword) {
        event.preventDefault();
        const { name, create, getInitialCursor } = keyword;

        const nextStart = start - name.length;
        const nextCode = code.slice(0, nextStart) + code.slice(start + 1);
        const ast = parse(nextCode);
        this.update({
          ast,
          cursorFromAST: wrappingStatement(create, getInitialCursor)({
            ast,
            cursor: [nextStart, nextStart]
          })
        });
        return;
      }
    }

    if (["'", '"', '`'].includes(data)) {
      data += data;
    }

    this.update({
      code:
        data &&
        t.isArrayExpression(node) &&
        start > node.start &&
        end < node.end
          ? replaceCode(code, start, data + ',')
          : value,
      cursor: [selectionStart, selectionEnd]
    });
  };

  handleClick = () => {
    const { textArea } = this;
    this.update({ cursor: [textArea.selectionStart, textArea.selectionEnd] });
    this.moveCursor(null);
  };

  handleResize = (event: MouseEvent) => {
    const colChange = Math.round((event.clientX - this.resizeStartX) / 2.9);
    if (colChange == 0) {
      return;
    }
    this.resizeStartX = event.clientX;

    this.update({
      printWidth: Math.max(20, this.state.printWidth + colChange)
    });
  };

  executeAction(action: { execute: Action }) {
    let cursorFromAST;
    const nextState = produce(this.state, state => {
      cursorFromAST = action.execute(state);
    });
    this.update({ ...nextState, cursorFromAST });
  }

  moveCursor(direction: Direction, rangeSelect = false) {
    if (!this.state.ast) {
      this.update({});
    }
    const { ast, code, cursor } = this.state;

    if (rangeSelect) {
      this.update({
        cursor: this.rangeSelector.run(ast, code, cursor, direction)
      });
    } else {
      this.rangeSelector.reset();
      this.update({
        cursor: moveCursor(
          ast,
          code,
          direction,
          (direction == 'RIGHT' || direction == 'DOWN' ? Math.max : Math.min)(
            ...cursor
          )
        )
      });
    }
  }

  update = (
    state: Partial<
      {
        ast: any;
        code: string;
        cursor: number | Cursor;
        printWidth: number;
      } & { cursorFromAST?: (ast) => any }
    >,
    options: { prettify?: boolean } = {}
  ) => {
    const { prettify } = {
      prettify: true,
      ...options
    };

    const prevState = this.state || ({} as any);

    const cursor =
      state.cursor !== undefined
        ? spreadCursor(state.cursor)
        : prevState.cursor;
    let [start, end] = cursor;

    const newState = { ...prevState, ...{ ...state, cursor } };
    let { ast, code, cursorFromAST, lastValidAST, printWidth } = newState;

    if (state.ast) {
      code = generateCodeFromAST(state.ast);
    }

    const newWidth = printWidth !== prevState.printWidth;

    const prettierOptions = {
      parser: 'babylon',
      plugins: [babylon],
      cursorOffset: start,
      printWidth,
      trailingComma: 'all'
    };

    if (!ast || code !== prevState.code || newWidth) {
      if (prettify) {
        try {
          const { formatted, cursorOffset } = prettier.formatWithCursor(
            code,
            prettierOptions
          );
          ast = parse(formatted);
          code = formatted;
          start = end = cursorOffset;
        } catch (e) {
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
          if (ast) {
            ast = null;
          } else {
            const { formatted, cursorOffset } = prettier.formatWithCursor(
              generateCodeFromAST(lastValidAST),
              {
                ...prettierOptions,
                cursorOffset: prevState.cursor[0] || start
              }
            );
            ast = parse(formatted);
            code = formatted;
            start = end = cursorOffset;
          }
        }
      } else {
        ast = parse(code);
      }
    }

    if (cursorFromAST) {
      const cursor = spreadCursor(cursorFromAST(ast));
      start = cursor[0];
      end = cursor[1];
    }

    this.history.push({
      ...newState,
      ast,
      code,
      cursor: [start, end],
      cursorFromAST: null,
      lastValidAST: ast || lastValidAST
    });
    (window as any).cancelIdleCallback(this.renderIdleCallbackId);
    this.renderIdleCallbackId = (window as any).requestIdleCallback(
      this.render
    );
  };

  render = () => {
    const { actionBar, state, textArea } = this;

    this.flask.updateCode(state.code);

    textArea.cols = state.printWidth;
    this.resizeHandle.title = state.printWidth.toString();

    this.textArea.blur();
    this.textArea.focus();

    const [start, end] = state.cursor;
    textArea.selectionStart = start;
    textArea.selectionEnd = end || start;

    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';

    this.actions = state.ast ? getAvailableActions(state) : [];
    actionBar.innerHTML = '';
    actionBar.append(
      ...this.actions.filter(a => a.title).map(actionSection => {
        const section = el('section', { class: styles.actionSection });

        section.append(
          el('h4', [
            actionSection.title,
            actionSection.ctrlModifier &&
              el('span', { class: styles.key }, 'Ctrl')
          ]),
          ...actionSection.children.map(action => {
            const keys = [];
            if (action.key) {
              keys.push(action.key);
            }
            if (action.codes) {
              keys.push(
                ...action.codes.map(code => ({ Comma: ',' }[code] || code))
              );
            }
            return el(
              'button',
              {
                class: styles.action,
                onclick: () => this.executeAction(action)
              },
              [
                el('div', action.name),
                el(
                  'div',
                  { class: styles.keys },
                  keys.map(key => el('div', { class: styles.key }, key))
                )
              ]
            );
          })
        );

        return section;
      })
    );
  };
}
