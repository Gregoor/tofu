import * as babelParser from "@babel/parser";
import * as t from "@babel/types";
import memoizeOne from "memoize-one";

export type AST = t.File;

const parse = memoizeOne(
  (source: string): AST =>
    babelParser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    })
);

export type Code = { ast: AST; source: string };

export function codeFromSource(source: string) {
  try {
    return {
      ast: parse(source),
      source,
    };
  } catch (error) {
    return null;
  }
}
