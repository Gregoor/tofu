import generate from "@babel/generator";
import { parse } from "@babel/parser";
import t from "@babel/types";
import produce, { immerable } from "immer";

import { Range } from "./utils";

class BaseCode {
  source: string;

  constructor(source: string) {
    this.source = source;
  }

  replaceSource({ start, end }: Range, replacement: string) {
    return codeFromSource(
      this.source.slice(0, Math.max(start, 0)) +
        replacement +
        this.source.slice(end)
    );
  }
}

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
    return new ValidCode(
      generate(newAST as any, { retainLines: true }).code,
      newAST
    );
  }
}

export type Code = ValidCode | InvalidCode;

export function isValid(code: Code): code is ValidCode {
  return code instanceof ValidCode;
}

export function codeFromSource(source: string) {
  try {
    return new ValidCode(
      source,
      parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] })
    );
  } catch (error) {
    if (!(error instanceof SyntaxError) && error.message != "Assert fail") {
      throw new Error(error);
    }
    return new InvalidCode(source, error);
  }
}
