import * as t from "@babel/types";

import { getNodeFromPath, getParentsAndPathTD } from "../ast-utils";
import { replaceCode } from "../code-utils";
import { CodeWithAST } from "../history";
import { buildActionCreators, withAST, withNode } from "./utils";
import { selectNode } from "../cursor/utils";
import { Range } from "../utils";

export const conditionalActions = buildActionCreators([
  {
    on: { key: "e" },
    do: withAST(function addElseBranch({ ast, code }, cursor) {
      const [parents, path] = getParentsAndPathTD(ast, cursor.start);
      const node = parents[parents.length - 1];
      const parent = parents[parents.length - 2];

      if (
        !(
          t.isIfStatement(parent) &&
          t.isBlockStatement(node) &&
          cursor.start == node.end &&
          !parent.alternate
        )
      ) {
        return null;
      }

      return () => ({
        codeWithAST: CodeWithAST.fromCode(replaceCode(code, cursor, "else {}")),
        nextCursor: ({ ast }) =>
          new Range(
            getNodeFromPath(ast, [...path.slice(0, -1), "alternate"]).start - 1
          ),
      });
    }),
  },

  {
    on: { key: "i" },
    do: withNode(function addIfToElse(node, { ast, code }, cursor) {
      if (!t.isIfStatement(node) || !node.alternate) {
        return null;
      }
      return () => ({
        codeWithAST: CodeWithAST.fromCode(replaceCode(code, cursor, " if (t)")),
        nextCursor: ({ ast }) =>
          selectNode(
            getNodeFromPath(
              ast,
              getParentsAndPathTD(ast, cursor.start)[1].concat(
                "alternate",
                "test"
              )
            )
          ),
      });
    }),
  },

  {
    on: { key: "i" },
    do: withAST(function addElseIfBranch({ ast, code }, cursor) {
      const [parents, path] = getParentsAndPathTD(ast, cursor.start);
      const node = parents[parents.length - 1];
      const parent = parents[parents.length - 2];

      if (
        !(
          t.isIfStatement(parent) &&
          t.isBlockStatement(node) &&
          cursor.start == node.end &&
          !parent.alternate
        )
      ) {
        return null;
      }

      return () => ({
        codeWithAST: CodeWithAST.fromCode(
          replaceCode(code, cursor, "else if(null) {}")
        ),
        nextCursor: ({ ast }) =>
          selectNode(
            getNodeFromPath(ast, [...path.slice(0, -1), "alternate", "test"])
          ),
      });
    }),
  },
]);
