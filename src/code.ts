import generate from "@babel/generator";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import produce, { immerable } from "immer";

import { replaceCode } from "./code-utils";
import { Range } from "./utils";

class BaseCode {
  source: string;

  constructor(source: string) {
    this.source = source;
  }

  isValid(): this is ValidCode {
    return this instanceof ValidCode;
  }

  replaceSource(range: Range, replacement: string) {
    return codeFromSource(replaceCode(this.source, range, replacement));
  }
}

export type Code = BaseCode;

export class InvalidCode extends BaseCode {
  error: SyntaxError;

  constructor(source: string, error: SyntaxError) {
    super(source);
    this.error = error;
  }
}

export class ValidCode extends BaseCode {
  ast: t.File;

  constructor(source: string, ast: t.File) {
    super(source);
    this.ast = ast;
  }

  mutateAST(produceAST: (ast: t.File) => void) {
    (this.ast as any)[immerable] = true;
    const newAST = produce(this.ast as t.File, produceAST);
    return new ValidCode(generate(newAST, { retainLines: true }).code, newAST);
  }
}

export function codeFromSource(source: string) {
  try {
    return new ValidCode(source, parse(source));
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    return new InvalidCode(source, error);
  }
}
