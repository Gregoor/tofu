import { generate } from "@babel/generator";
import { parse } from "@babel/parser";
import { useState } from "react";

import { Cursor } from './cursor/types';

type AST = { type: string; start: number; end: number };

export class CodeWithAST {
  code: string;
  ast: AST | null = null;

  private constructor(code: string, ast: AST) {
    this.code = code;
    this.ast = ast;
  }

  static fromCode(code: string) {
    try {
      return new CodeWithAST(code, parse(code));
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      return new CodeWithAST(code, null);
    }
  }

  static fromAST(ast: AST) {
    return new CodeWithAST(generate(ast, { retainLines: true }).code, ast);
  }
}

export type EditorState = Readonly<{
  codeWithAST: CodeWithAST;
  cursor: Cursor;
  formattedForPrintWidth: null | number;
}>;

export default function useHistory(
  initialValue: string
): [
  EditorState,
  {
    add(state: Partial<EditorState>): void;
    override(state: Partial<EditorState>): void;
    undo(): void;
    redo(): void;
  }
] {
  const [history, setHistory] = useState<EditorState[]>(() => [
    {
      codeWithAST: CodeWithAST.fromCode(initialValue),
      cursor: [0, 0],
      formattedForPrintWidth: null,
    },
  ]);
  const [index, setIndex] = useState(0);

  const current = history[index];
  return [
    current,
    {
      add(state) {
        setHistory([{ ...current, ...state }, ...history]);
      },
      override(state) {
        const newHistory = history.slice();
        newHistory[index] = { ...newHistory[index], ...state };
        setHistory(newHistory);
      },
      undo() {},
      redo() {},
    },
  ];
}
