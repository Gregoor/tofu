const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const t = require('@babel/types');
const CodeFlask = require('codeflask').default;
import Downshift from 'downshift';
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
import { selectNode, spreadCursor } from './cursor-utils';
import { EditorState } from './edtior-state';
import moveCursor, { Cursor, Direction } from './move-cursor';
import RangeSelector from './range-selector';
import {
  ActionBar,
  ActionItem,
  ActionList,
  ActionSection,
  Container,
  FlaskContainer,
  GlobalStyle,
  Key,
  Keys,
  ResizeHandle,
  SectionTitle
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
    textArea.addEventListener('input', this.handleInput);
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
    const { textArea, editorState } = this;
    const { ast, code, cursor } = editorState;
    const [start] = cursor;

    const searchable = this.state.actions.find(
      s =>
        s.searchable &&
        Boolean(s.alt) == event.altKey &&
        Boolean(s.ctrl) == event.ctrlKey &&
        Boolean(s.shift) == event.shiftKey &&
        event.key == s.key
    );
    if (searchable) {
      this.setState({ searchIn: searchable.title }, () => {
        this.searchRef.current.focus();
      });
      event.preventDefault();
      return;
    }

    let action = this.state.actions
      .filter(s => event.ctrlKey || !s.ctrl)
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
        this.updateEditor();
      } else if (!event.shiftKey && this.history.length > 1) {
        this.future.push(this.editorState);
        this.history = this.history.slice(0, -1);
        this.updateEditor();
      }
      event.preventDefault();
      return;
    }

    if (!ast) {
      return true;
    }

    const node = getNode(ast, start);

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
      this.updateCode(
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
        this.updateCode({ cursor: textArea.selectionStart });
        this.moveCursor(null);
      });
    }

    if (event.key == 'Backspace') {
      // stop judging me
      setTimeout(() => {
        this.moveCursor(null);
      });
    }

    const direction = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN'
    }[event.key];
    if (direction) {
      event.preventDefault();
      this.moveCursor(direction, event.shiftKey);
    }
  };

  handleInput = ({ data }: any) => {
    const {
      ast,
      code,
      cursor: [start, end]
    } = this.editorState;
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

    if (t.isNullLiteral(node) && data == '(') {
      this.updateCode({
        ast: produce(ast, ast => {
          getNodeFromPath(ast, path.slice(0, -1))[
            path[path.length - 1]
          ] = t.arrowFunctionExpression([], t.nullLiteral());
        })
      });
      this.moveCursor(null);
      return;
    }

    const isExpressionOrBlock =
      (t.isExpression(node) || t.isBlock(node)) &&
      !t.isStringLiteral(node) &&
      !t.isTemplateLiteral(node);

    if (isExpressionOrBlock && ['(', '[', '{'].includes(data)) {
      this.updateCode(
        {
          code:
            code.slice(0, start) +
            data +
            (data == '{' ? '' : code.slice(start, end)) +
            { '(': ')', '[': ']', '{': '}' }[data] +
            code.slice(end),
          cursor: start + 1
        },
        { prettify: false }
      );
      return;
    }

    if (isExpressionOrBlock && data == '?') {
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
      return;
    }

    if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
      let newOperator;
      if (data == '=') {
        newOperator =
          node.operator == '>' || node.operator == '<'
            ? node.operator + '='
            : '='.repeat(node.operator == '==' ? 3 : 2);
      } else if (data == '&' || data == '|') {
        newOperator =
          node.operator[0] == data
            ? data.repeat(3 - node.operator.length)
            : data;
      }
      this.updateCode({
        code: newOperator
          ? code.slice(0, start) + newOperator + code.slice(end)
          : value
      });
      this.moveCursor(null);
      return;
    }

    if (data == ' ' || data == '(') {
      const keyword = keywords.find(
        ({ name }) => code.slice(start - name.length, start) == name
      );
      if (keyword) {
        event.preventDefault();
        const { name, create, getInitialCursor } = keyword;

        const nextStart = start - name.length;
        const nextCode = code.slice(0, nextStart) + code.slice(start + 1);
        const ast = parse(nextCode);
        this.updateCode({
          ast,
          cursorFromAST: wrappingStatement(create, getInitialCursor)({
            ast,
            cursor: [nextStart, nextStart]
          })
        });
        return;
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
        return;
      }
    }

    if (["'", '"', '`'].includes(data)) {
      data += data;
    }

    this.updateCode({
      code:
        data &&
        t.isArrayExpression(node) &&
        start > node.start &&
        end < node.end
          ? replaceCode(code, start, data + ',')
          : value,
      cursor: [selectionStart, selectionEnd]
    });
    this.moveCursor(null);
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
    this.updateCode(fullNextState);
  };

  moveCursor = (direction: Direction, rangeSelect = false) => {
    const { ast, code, cursor } = this.editorState;

    if (!ast) {
      this.updateCode({});
      return;
    }

    if (rangeSelect) {
      let nextCursor = this.rangeSelector.run(ast, code, cursor, direction);
      if (
        (direction == 'LEFT' || direction == 'RIGHT') &&
        JSON.stringify(cursor) == JSON.stringify(nextCursor)
      ) {
        nextCursor = this.rangeSelector.run(ast, code, cursor, 'UP');
      }
      this.updateCode({
        cursor: nextCursor
      });
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

    this.setState({
      actions: getAvailableActions(this.editorState),
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
          {location.hostname == 'localhost' && (
            <button
              onClick={() => {
                const stripLocs = a =>
                  Array.isArray(a)
                    ? a.map(stripLocs)
                    : typeof a == 'object' && a !== null
                      ? Object.entries(a)
                          .filter(([key]) => key != 'loc')
                          .map(([k, v]) => [k, stripLocs(v)])
                          .reduce((o, [k, v]) => {
                            o[k] = v;
                            return o;
                          }, {})
                      : a;

                console.log(
                  JSON.stringify(stripLocs(this.editorState.ast), null, 2)
                );
              }}
            >
              Print AST
            </button>
          )}
          {actions
            .filter(a => a.title)
            .map(({ title, alt, ctrl, shift, key, children }, i) => (
              <ActionSection key={i}>
                <Downshift
                  defaultHighlightedIndex={0}
                  onChange={selection =>
                    this.executeAction(children.find(a => a.name == selection))
                  }
                >
                  {({
                    getInputProps,
                    getItemProps,
                    getLabelProps,
                    getMenuProps,
                    inputValue,
                    highlightedIndex
                  }) => (
                    <div>
                      {searchIn == title ? (
                        <input
                          {...getInputProps({
                            type: 'text',
                            placeholder: `Search "${title}"`,
                            ref: this.searchRef,
                            onBlur: () =>
                              this.setState({
                                searchIn: null
                              })
                          })}
                        />
                      ) : (
                        <SectionTitle>
                          {title}
                          <div>
                            {alt && <Key>Alt</Key>}
                            {ctrl && <Key>Ctrl</Key>}
                            {shift && <Key>Shift</Key>}
                            {key && <Key>{key}</Key>}
                          </div>
                        </SectionTitle>
                      )}
                      <ActionList {...getMenuProps()}>
                        {children
                          .filter(
                            a =>
                              searchIn != title ||
                              a.name
                                .toLowerCase()
                                .includes(inputValue.toLowerCase())
                          )
                          .map((action, i) => {
                            const keys = [];
                            if (action.key) {
                              keys.push(action.key);
                            }
                            if (action.codes) {
                              keys.push(
                                ...action.codes.map(
                                  code => ({ Comma: ',' }[code] || code)
                                )
                              );
                            }
                            return (
                              <ActionItem
                                {...getItemProps({
                                  key: i,
                                  item: action.name,
                                  highlighted:
                                    searchIn == title && highlightedIndex == i
                                })}
                              >
                                <div>{action.name}</div>
                                <Keys>
                                  {keys.map(key => (
                                    <Key key={key}>{key}</Key>
                                  ))}
                                </Keys>
                              </ActionItem>
                            );
                          })}
                      </ActionList>
                    </div>
                  )}
                </Downshift>
              </ActionSection>
            ))}
        </ActionBar>
      </Container>
    );
  }
}
