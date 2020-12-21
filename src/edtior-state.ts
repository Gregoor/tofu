import { Cursor } from './move-cursor';

type AST = { type: string, start: number, end: number };
export type EditorState = Readonly<{
  ast: null | AST;
  lastValidAST: AST;
  code: string;
  printWidth: number;
  cursor: Cursor;
}>;