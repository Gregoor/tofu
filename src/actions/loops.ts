import * as t from "@babel/types";

import {
  getNodeFromPath,
  getParentsAndPathBU,
  getParentsAndPathTD,
} from "../ast-utils";
import { buildActionCreators, withAST } from "./utils";
import { CodeWithAST } from "../history";

export const loopActions = buildActionCreators([
  {
    info: { type: "CHANGE_FOR_OF_TO_FOR" },
    on: { key: "i", metaKey: true },
    /**
     * from:
     * for ($kind $element of $list) $any
     * to:
     * for (let i = 0; i < $list.length; i++) {
     *     $kind $element = $list[i];
     *     ...$any
     * }
     */
    do: withAST(function changeForOfToFor({ ast }, { start }) {
      const SEARCH_DEPTH = 5;
      const forIndexBU = getParentsAndPathBU(ast, start)[0]
        .slice(0, SEARCH_DEPTH)
        .findIndex((n) => t.isForOfStatement(n));
      if (forIndexBU == -1) {
        return null;
      }

      return () => ({
        codeWithAST: CodeWithAST.fromMutatedAST(ast, (ast) => {
          const [parents, path] = getParentsAndPathTD(ast, start);
          const forIndex = parents.length - forIndexBU - 1;
          const forStatement = parents[forIndex] as t.ForOfStatement;
          const i = t.identifier("i");
          getNodeFromPath(ast, path.slice(0, forIndex - 1))[
            path[forIndex - 1]
          ] = t.forStatement(
            t.variableDeclaration("let", [
              t.variableDeclarator(i, t.numericLiteral(0)),
            ]),
            t.binaryExpression(
              "<",
              i,
              t.memberExpression(forStatement.right, t.identifier("length"))
            ),
            t.updateExpression("++", i),
            t.blockStatement([
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  (forStatement.left as t.VariableDeclaration).declarations[0]
                    .id,
                  t.memberExpression(forStatement.right, i, true)
                ),
              ]),
              ...(forStatement.body as t.BlockStatement).body,
            ])
          );
        }),
      });
    }),
  },
]);
