import generate from "@babel/generator";
import * as t from "@babel/types";

import { getParentsAndPathTD, getNodeFromPath } from "../ast-utils";
import { replaceCode } from "../code-utils";
import { selectName, selectNode } from "../cursor/utils";
import { CodeWithAST } from "../history";
import { buildActionCreators } from "./utils";
import { Range } from "../utils";

const keywords: {
  name: string;
  label?: string;
  create: (child?: string) => string;
  getInitialCursor: (ast: t.File, path: (string | number)[]) => Range;
  canWrapStatement: boolean;
  hidden?: boolean;
}[] = [
  {
    name: "if",
    create: (child = "") => `if (someCondition) { ${child} }`,
    getInitialCursor: (ast, path) =>
      selectName(getNodeFromPath(ast, [...path, "test"]) as t.Identifier),
    canWrapStatement: true,
  },
  {
    name: "for",
    label: "for...of",
    create: (child = "") => `for (const item of iterable) { ${child} }`,
    getInitialCursor: (ast, path) =>
      selectName(
        getNodeFromPath(ast, [
          ...path,
          "left",
          "declarations",
          "0",
          "id",
        ]) as t.Identifier
      ),
    canWrapStatement: true,
  },
  {
    name: "return",
    create: () => "return null;",
    getInitialCursor: (ast, path) =>
      selectNode(getNodeFromPath(ast, path.concat("argument"))),
    hidden: true,
    canWrapStatement: false,
  },

  ...(["const", "let", "var"] as const).map((kind) => ({
    name: kind,
    create: (initial) =>
      generate(
        t.variableDeclaration(kind, [
          t.variableDeclarator(
            t.identifier("n"),
            initial || (kind == "const" ? t.nullLiteral() : null)
          ),
        ])
      ).code,
    getInitialCursor: (ast, path) =>
      selectName(
        getNodeFromPath(ast, [
          ...path,
          "declarations",
          "0",
          "id",
        ]) as t.Identifier
      ),
    canWrapStatement: false,
  })),
];

export const keywordActions = buildActionCreators(
  keywords.map(({ name, create, getInitialCursor }) => ({
    on: [{ key: " " }, { key: ",", shiftKey: "optional" }],
    do: ({ code }, { start }) => {
      if (
        code.slice(start - name.length, start) != name ||
        code[start + 1] != "\n"
      ) {
        return null;
      }

      return () => ({
        codeWithAST: CodeWithAST.fromCode(
          replaceCode(code, new Range(start - name.length, start), create())
        ),
        nextCursor: ({ ast }) =>
          getInitialCursor(ast, getParentsAndPathTD(ast, start)[1]),
      });
    },
  }))
);
