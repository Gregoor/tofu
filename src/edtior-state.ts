import { Cursor } from './move-cursor';

export type EditorState = {
  ast: null | { type: string, start: number, end: number };
  code: string;
  printWidth: number;
  cursor: Cursor;
};