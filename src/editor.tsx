const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const t = require('@babel/types');
const CodeFlask = require('codeflask').default;
import prettier from 'prettier/standalone';
import * as React from 'react';
import produce from 'immer';
import getAvailableActions, {
  Action,
  ActionSections,
  keywords,
  wrappingStatement
} from './actions';
import { getFocusPath, getNode, getNodeFromPath } from './ast-utils';
import { replaceCode } from './code-utils';
import { PrintASTButton } from './components';
import { selectNode, spreadCursor } from './cursor-utils';
import { EditorState } from './edtior-state';
import Keymap from './keymap';
import moveCursor, { Cursor, Direction } from './move-cursor';
import RangeSelector from './range-selector';
import {
  ActionBar,
  Container,
  FlaskContainer,
  GlobalStyle,
  ResizeHandle
} from './ui';

const babylon = require('prettier/parser-babylon');

export default class Editor extends React.Component<
  { code: string },
  {
    actions: ActionSections;
    searchIn: string;
  }
> {
  flaskContainer: React.RefObject<HTMLDivElement> = React.createRef();
  flask: any;
  textArea: HTMLTextAreaElement;

  history: EditorState[] = [
    { ast: null, lastValidAST: null, code: '', cursor: [0, 0], printWidth: 80 }
  ];
  future: EditorState[] = [];
  rangeSelector = new RangeSelector();

  resizeStartX = null;

  state = { actions: [], searchIn: null };

  searchRef: React.RefObject<HTMLInputElement> = React.createRef();

  componentDidMount() {
    this.flask = new CodeFlask(this.flaskContainer.current, {
      language: 'js'
    });
    const textArea = (this.textArea = this.flask.elTextarea);

    this.updateCode({ code: this.props.code, cursor: [0, 0], printWidth: 80 });

    textArea.addEventListener('keydown', this.handleKeyDown);
    textArea.addEventListener('click', this.handleClick);

    document.addEventListener('mouseup', () => (this.resizeStartX = null));
    document.addEventListener(
      'mousemove',
      event => this.resizeStartX && this.handleResize(event)
    );
  }

  get editorState() {
    return this.history[this.history.length - 1];
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;
    const { textArea, editorState } = this;
    const { ast, code, cursor } = editorState;
    const [start, end] = cursor;
    let { selectionStart, selectionEnd, value } = this.textArea;

    let [parents, path] = ast ? getFocusPath(ast, start) : [[], []];
    parents = parents.slice().reverse();
    let node;
    let parent;
    if (Array.isArray(parents[0])) {
      node = parents[1];
      parent = parents[2];
    } else {
      node = parents[0];
      parent = parents[1];
    }

    if (t.isBlock(node) && key == '(') {
      this.updateCode({
        code:
          code.slice(0, start) +
          generate(t.arrowFunctionExpression([], t.nullLiteral())).code +
          code.slice(end),
      });
      event.preventDefault();
      return;
    }

    if (t.isNullLiteral(node) && key == '(') {
      this.updateCode({
        ast: produce(ast, ast => {
          getNodeFromPath(ast, path.slice(0, -1))[
            path[path.length - 1]
          ] = t.arrowFunctionExpression([], t.nullLiteral());
        })
      });
      this.moveCursor(null);
      event.preventDefault();
      return;
    }

    {
      const isExpressionOrBlock =
        t.isExpression(node) &&
        !t.isStringLiteral(node) &&
        !t.isTemplateLiteral(node);

      if (isExpressionOrBlock && ['(', '[', '{'].includes(key)) {
        this.updateCode(
          {
            code:
              code.slice(0, start) +
              key +
              (key == '{' ? '' : code.slice(start, end)) +
              { '(': ')', '[': ']', '{': '}' }[key] +
              code.slice(end),
            cursor: start + 1
          },
          { prettify: false }
        );
        event.preventDefault();
        return;
      }

      if (isExpressionOrBlock && key == '?') {
        this.updateCode({
          ast: produce(ast, ast => {
            getNodeFromPath(ast, path.slice(0, -1))[
              path[path.length - 1]
            ] = t.conditionalExpression(
              getNodeFromPath(ast, path),
              t.nullLiteral(),
              t.nullLiteral()
            );
          })
        });
        this.moveCursor(null);
        event.preventDefault();
        return;
      }
    }

    if (
      (t.isBinaryExpression(node) || t.isLogicalExpression(node)) &&
      key.length == 1
    ) {
      let newOperator = key;
      if (key == '=') {
        newOperator =
          node.operator == '>' || node.operator == '<'
            ? node.operator + '='
            : '='.repeat(node.operator == '==' ? 3 : 2);
      } else if (key == '&' || key == '|') {
        newOperator =
          node.operator[0] == key ? key.repeat(3 - node.operator.length) : key;
      }
      this.updateCode({
        code: code.slice(0, start) + newOperator + code.slice(end)
      });
      this.moveCursor(null);
      event.preventDefault();
      return;
    }

    if (key == ' ' || key == '(') {
      const keyword = keywords.find(
        ({ name }) => code.slice(start - name.length, start) == name
      );
      if (keyword) {
        event.preventDefault();
        const { name, create, getInitialCursor } = keyword;

        const nextStart = start - name.length;
        const nextCode = code.slice(0, nextStart) + code.slice(start + 1);
        const ast = parse(nextCode);
        if (code[start + 1] == '\n') {
          this.updateCode({
            ast,
            cursorFromAST: wrappingStatement(create, getInitialCursor)({
              ast,
              cursor: [nextStart, nextStart]
            })
          });
          event.preventDefault();
          return;
        }
      }

      if (t.isVariableDeclarator(parent) && !parent.init) {
        const varPath = path.slice(0, -1);
        this.updateCode({
          ast: produce(ast, ast => {
            getNodeFromPath(ast, varPath).init = t.nullLiteral();
          }),
          cursorFromAST: () => {
            //???
            console.log(getNodeFromPath(ast, varPath.concat('init')));
            return selectNode(getNodeFromPath(ast, varPath.concat('init')));
          }
        });
        event.preventDefault();
        return;
      }
    }

    const searchable = this.state.actions.find(
      s =>
        s.searchable &&
        Boolean(s.alt) == event.altKey &&
        Boolean(s.ctrl) == event.ctrlKey &&
        Boolean(s.shift) == event.shiftKey &&
        key == s.key
    );
    if (searchable) {
      this.setState({ searchIn: searchable.title }, () => {
        this.searchRef.current.value = '';
        this.searchRef.current.focus();
      });
      event.preventDefault();
      return;
    }

    let action = this.state.actions
      .filter(
        s =>
          Boolean(s.alt) == event.altKey &&
          Boolean(s.ctrl) == event.ctrlKey &&
          Boolean(s.shift) == event.shiftKey
      )
      .map(s => s.children)
      .flat()
      .find(a => a.key == key || (a.codes || []).includes(event.code));
    if (action) {
      this.executeAction(action);
      event.preventDefault();
      return;
    }

    if (event.code == 'KeyZ' && event.ctrlKey) {
      if (event.shiftKey && this.future.length > 0) {
        this.history.push(this.future.pop());
        this.updateEditor();
      } else if (!event.shiftKey && this.history.length > 1) {
        this.future.push(this.editorState);
        this.history = this.history.slice(0, -1);
        this.updateEditor();
      }
      event.preventDefault();
      return;
    }

    {
      let data = key;
      if (["'", '"', '`'].includes(key)) {
        data += data;
      }

      if (
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        key.length == 1
      ) {
        this.updateCode({
          code: replaceCode(
            code,
            [selectionStart, selectionEnd],
            data +
              (t.isArrayExpression(node) && start > node.start && end < node.end
                ? ','
                : '')
          ),
          cursor: [selectionStart + data.length, selectionEnd + data.length]
        });
        this.moveCursor(null);
        event.preventDefault();
        return;
      }
    }

    if (key == 'Tab') {
      this.updateCode({
        cursor: moveCursor(
          ast,
          code,
          ...(event.shiftKey
            ? ['LEFT', node.start]
            : ['RIGHT', start == end ? node.end : end])
        )
      });
      return;
    }

    {
      const isBackspace = key == 'Backspace';
      const isDelete = key == 'Delete';
      if (isBackspace || isDelete) {
        const isRange = selectionStart !== selectionEnd;
        this.updateCode({
          code: isRange
            ? code.substr(0, selectionStart - 1) + code.substr(selectionEnd)
            : isBackspace
              ? code.substr(0, selectionStart - 1) + code.substr(selectionStart)
              : code.substr(0, selectionStart) +
                code.substr(selectionStart + 1),
          cursor: !isRange && isBackspace ? selectionStart - 1 : selectionStart
        });
        event.preventDefault();

        this.moveCursor(null);
        return;
      }

      if (!ast) {
        return true;
      }
    }

    if (key == 'Enter' && !t.isTemplateLiteral(node)) {
      event.preventDefault();
      const accuCharCounts = code
        .split('\n')
        .map((s, i) => s.length + (i == 0 ? 0 : 1))
        .reduce((accu, n) => accu.concat((accu[accu.length - 1] || 0) + n), []);
      let index = accuCharCounts.findIndex(
        n => n >= textArea.selectionStart - 2 // I don't quite get this one
      );
      if (event.shiftKey && index > 0) {
        index -= 1;
      }
      const pos = index == -1 ? 0 : accuCharCounts[index];
      this.updateCode(
        {
          code: code.slice(0, pos) + '\n' + code.slice(pos),
          cursor: pos == 0 ? 0 : pos + 1
        },
        { prettify: false }
      );
      return;
    }

    if (key == 'Home' || key == 'End') {
      // don't judge me
      setTimeout(() => {
        this.updateCode({ cursor: textArea.selectionStart });
        this.moveCursor(null);
      });
    }

    const direction = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN'
    }[key];
    if (direction) {
      this.moveCursor(direction);
      event.preventDefault();
      return;
    }
  };

  handleClick = () => {
    const { textArea } = this;
    this.updateCode({
      cursor: [textArea.selectionStart, textArea.selectionEnd]
    });
    this.moveCursor(null);
  };

  handleResize = (event: MouseEvent) => {
    const colChange = Math.round((event.clientX - this.resizeStartX) / 2.9);
    if (colChange == 0) {
      return;
    }
    this.resizeStartX = event.clientX;

    this.updateCode({
      printWidth: Math.max(20, this.editorState.printWidth + colChange)
    });
  };

  executeAction = (action: { execute: Action }) => {
    let cursorFromAST;
    let restoreAST = false;
    const nextState = produce(this.editorState, state => {
      const result = action.execute(state);
      if (typeof result == 'function') {
        cursorFromAST = result;
      } else if (result.restoreAST) {
        restoreAST = true;
      }
    });
    const fullNextState = { ...nextState, cursorFromAST };
    if (restoreAST) {
      fullNextState.ast = nextState.lastValidAST;
    }
    try {
      this.updateCode(fullNextState);
    } catch (e) {
      console.error(e);
    }
  };

  moveCursor = (direction: Direction) => {
    const { ast, code, cursor } = this.editorState;

    if (!ast) {
      this.updateCode({});
      return;
    }

    let nextCursor;
    if (cursor[0] != cursor[1]) {
      if (direction == 'LEFT') {
        nextCursor = cursor[0];
      } else if (direction == 'RIGHT') {
        nextCursor = cursor[1];
      }
    }

    this.rangeSelector.reset();

    if (!nextCursor) {
      nextCursor = moveCursor(
        ast,
        code,
        direction,
        (direction == 'DOWN' ? Math.max : Math.min)(...cursor)
      );
    }

    if (JSON.stringify(cursor) != JSON.stringify(nextCursor)) {
      this.updateCode({
        cursor: nextCursor
      });
    }
  };

  updateCode = (
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

    const prevState = this.editorState || ({} as any);

    const cursor =
      state.cursor !== undefined
        ? spreadCursor(state.cursor)
        : prevState.cursor;
    let [start, end] = cursor;

    const newState = { ...prevState, ...{ ...state, cursor } };
    let { ast, code, cursorFromAST, lastValidAST, printWidth } = newState;

    if (state.ast) {
      code = generate(state.ast, { retainLines: true }).code;
    }

    const newWidth = printWidth !== prevState.printWidth;

    const prettierOptions = {
      parser: 'babel',
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
          }
        }
      } else {
        try {
          ast = parse(code);
        } catch (e) {
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
        }
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

    this.setState({
      actions: getAvailableActions(this.editorState, this.rangeSelector),
      searchIn: null
    });

    this.updateEditor();
  };

  updateEditor = () => {
    const { editorState, textArea } = this;

    this.flask.updateCode(editorState.code);

    textArea.cols = editorState.printWidth;

    this.textArea.blur();
    this.textArea.focus();

    const [start, end] = editorState.cursor;
    textArea.selectionStart = start;
    textArea.selectionEnd = end || start;

    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';
  };

  render() {
    const { editorState, state } = this;
    const { actions, searchIn } = state;
    return (
      <Container>
        <GlobalStyle />
        <FlaskContainer ref={this.flaskContainer} />
        <ResizeHandle
          title={editorState.printWidth.toString()}
          onMouseDown={event => (this.resizeStartX = event.clientX)}
        />
        <ActionBar>
          <PrintASTButton ast={this.editorState.ast} />
          <Keymap
            actions={actions}
            onExecute={this.executeAction}
            onSearchBlur={() =>
              this.setState({
                searchIn: null
              })
            }
            searchIn={searchIn}
            searchRef={this.searchRef}
          />
        </ActionBar>
      </Container>
    );
  }
}
