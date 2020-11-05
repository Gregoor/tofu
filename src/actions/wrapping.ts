import * as t from "@babel/types";

import { getParentsAndPathBU } from "../ast-utils";
import { replaceCode } from "../code-utils";
import { selectNode } from "../cursor/utils";
import { CodeWithAST } from "../history";
import { Action, ActionCreator, buildActionCreators, withNode } from "./utils";
import { Range } from "../utils";

const withNonStringExpression: (
  runFn: (
    node: t.Node,
    codeWithAST: { ast: t.File; code: string },
    cursor: Range
  ) => Action
) => ActionCreator = (runFn) =>
  withNode((node, codeWithAST, cursor) => {
    const isNonStringExpression =
      t.isExpression(node) &&
      !t.isStringLiteral(node) &&
      !t.isTemplateLiteral(node);

    return !isNonStringExpression
      ? undefined
      : runFn(node, codeWithAST, cursor);
  });

export const wrappingActions = buildActionCreators([
  ...buildActionCreators(
    (["(", "[", "{"] as const).map((par) => ({
      on: { key: par, shiftKey: "optional" },
      do: withNonStringExpression((node, { code }, { start, end }) => () => {
        const wrapEnd = start == end && start != node.end ? node.end : end;
        return {
          codeWithAST: CodeWithAST.fromCode(
            code.slice(0, start) +
              par +
              (par == "{" ? "" : code.slice(start, wrapEnd)) +
              { "(": ")", "[": "]", "{": "}" }[par] +
              code.slice(wrapEnd)
          ),
          nextCursor: (_, { start }) => new Range(start + 1),
        };
      }),
    }))
  ),

  {
    on: { key: "?", shiftKey: "optional" },
    do: withNonStringExpression((node, { code }) => () => ({
      codeWithAST: CodeWithAST.fromCode(
        replaceCode(
          code,
          selectNode(node),
          code.slice(node.start, node.end) + " ? null : null"
        )
      ),
      nextCursor: ({ ast }, { start }) => {
        const [[, parent]] = getParentsAndPathBU(ast, start);
        return selectNode(parent.consequent);
      },
    })),
  },
]);
