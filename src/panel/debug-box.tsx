import styled from "@emotion/styled";
import * as React from "react";

import { Code, ValidCode } from "../code";
import { Range } from "../utils";
import { ActionText, BareButton, HiddenItemsProps, TextButton } from "./utils";

export const DEBUG_KEY = "DEBUG_BOX";

const stripLocs = (ast: ValidCode["ast"]): any =>
  Array.isArray(ast)
    ? ast.map(stripLocs)
    : typeof ast == "object" && ast !== null
    ? Object.entries(ast)
        .filter(([key]) => key != "loc")
        .map(([k, v]) => [k, stripLocs(v)])
        .reduce((o: any, [k, v]) => {
          o[k] = v;
          return o;
        }, {})
    : ast;

const Root = styled.div`
  margin-bottom: ${({ theme }) => theme.l.space};
  display: flex;
  justify-content: space-between;
`;

const LogASTButton = ({ ast }: { ast: ValidCode["ast"] }) => (
  <BareButton
    onClick={() => {
      console.log(JSON.stringify(stripLocs(ast), null, 2));
    }}
  >
    <ActionText>Log AST</ActionText>
  </BareButton>
);

export function DebugBox({
  code,
  cursor,
  hiddenItems,
  toggleItem,
}: { code: Code; cursor: Range } & HiddenItemsProps) {
  if (hiddenItems.has(DEBUG_KEY)) {
    return null;
  }

  return (
    <Root>
      {code.isValid() && <LogASTButton ast={code.ast} />}
      <div style={{ whiteSpace: "nowrap" }}>
        Cursor: <em>{cursor.toString()}</em>
      </div>
      <TextButton
        small
        onClick={() => {
          toggleItem(DEBUG_KEY);
        }}
      >
        hide
      </TextButton>
    </Root>
  );
}
