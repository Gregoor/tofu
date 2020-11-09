import * as React from "react";
import { ButtonHTMLAttributes } from "react";

import { Action, findActions, isMac } from "./actions";
import { CodeWithAST } from "./history";
import { Key, font, styled } from "./ui";
import { Range, modifierKeys } from "./utils";

const Root = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0 ${({ theme }) => theme.borderRadius}
    ${({ theme }) => theme.borderRadius} 0;
  border-left: none;
  padding: ${({ theme }) => theme.l.abyss} 20px;
  min-width: 300px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  height: fit-content;
  display: flex;
  flex-direction: column;
  ${font};
  font-size: 13.333px;
  background: white;
`;

const DebugBox = styled.div`
  display: ${location.hostname == "localhost" ? "block" : "none"};
  margin-bottom: 10px;
  padding: ${({ theme }) => theme.l.gap};
  border: 3px solid orange;
`;

const stripLocs = (ast) =>
  Array.isArray(ast)
    ? ast.map(stripLocs)
    : typeof ast == "object" && ast !== null
    ? Object.entries(ast)
        .filter(([key]) => key != "loc")
        .map(([k, v]) => [k, stripLocs(v)])
        .reduce((o, [k, v]) => {
          o[k] = v;
          return o;
        }, {})
    : ast;

const ActionButtonRoot = styled.button<{ single?: boolean }>`
  border: none;
  ${({ single, theme }) => (single ? `margin-bottom: ${theme.l.gap};` : "")};
  padding: 0;
  width: 100%;

  display: flex;
  justify-content: space-between;
  align-items: center;

  background: none;
  cursor: pointer;
  ${font};
`;

const ActionText = styled.span`
  text-decoration: underline;
`;

const LogASTButton = ({ ast }) => (
  <ActionButtonRoot
    onClick={() => {
      console.log(JSON.stringify(stripLocs(ast), null, 2));
    }}
  >
    <ActionText>Log AST</ActionText>
  </ActionButtonRoot>
);

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ActionTitle = styled.span`
  margin-bottom: ${({ theme }) => theme.l.gap};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NodeListItem = styled.li`
  margin-bottom: ${({ theme }) => theme.l.abyss};
`;

const ActionVariant = styled.li`
  margin-bottom: ${({ theme }) => theme.l.gap};
  display: flex;
  align-items: center;
`;

const getActionText = (info) => {
  switch (info.type) {
    case "RANGE_SELECT":
      return {
        UP: "Surrounding",
        DOWN: "inner",
        LEFT: "Previous",
        RIGHT: "Next",
      }[info.direction];

    case "WRAP_WITH":
      return humanize(info.wrapper);

    case "ADD_ELSE":
      return (
        <>
          Add <code>else {"{}"}</code>
        </>
      );

    case "ADD_ELSE_IF":
      return (
        <>
          Add <code>else if (t) {"{}"}</code>
        </>
      );

    default:
      return JSON.stringify(info);
  }
};

function humanize(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

type SomeModifiers = typeof modifierKeys[number][];

const ActionVariants = styled(List)`
  margin-bottom: ${({ theme }) => theme.l.space};
`;

const ActionButton = ({
  info,
  on,
  hideModifiers,
  single,
  ...props
}: Action & {
  single?: boolean;
  hideModifiers?: SomeModifiers;
} & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <ActionButtonRoot {...props} single={single}>
    <ActionText>{getActionText(info)}</ActionText>
    <Key value={"key" in on ? on.key : on.code} />
  </ActionButtonRoot>
);

type OnAction = { onAction: (action: Action) => void };

type ExpectedValue = string | number;

const ActionList = ({
  actions,
  onAction,
}: { actions: Record<string, Action[]> } & OnAction) => (
  <>
    {Object.entries(actions).map(([type, actions], i) => {
      if (actions.length == 1) {
        return <ActionButton key={i} {...actions[0]} single />;
      }
      const sharedModifiers = actions.reduce(
        (modifierKeys, action) =>
          modifierKeys.filter((modifier) => action.on[modifier]),
        (modifierKeys as unknown) as SomeModifiers
      );
      return (
        <React.Fragment key={i}>
          <ActionTitle>
            {humanize(type)}
            <div style={{ cursor: "default" }}>
              {sharedModifiers.map((modifier) => (
                <React.Fragment key={modifier}>
                  <span style={{ padding: "0 5px" }}>+</span>
                  <Key value={modifier} />
                </React.Fragment>
              ))}
            </div>
          </ActionTitle>
          <ActionVariants>
            {actions.map((action, i) => (
              <ActionVariant key={i}>
                <span style={{ paddingRight: 5 }}>-</span>
                <ActionButton
                  {...action}
                  hideModifiers={sharedModifiers}
                  onClick={() => onAction(action)}
                />
              </ActionVariant>
            ))}
          </ActionVariants>
        </React.Fragment>
      );
    })}
  </>
);

const NodeTitle = styled.div`
  margin-bottom: ${({ theme }) => theme.l.gap};
  width: 100%;
  display: flex;
  justify-content: center;
  font-size: 15px;
`;

export default function ActionPanel({
  codeWithAST,
  cursor,
  onAction,
}: {
  codeWithAST: CodeWithAST;
  cursor: Range;
} & OnAction) {
  const { base, nodes } = findActions(codeWithAST, cursor);
  return (
    <Root>
      <DebugBox>
        <LogASTButton ast={codeWithAST.ast} />
        Cursor: <em>{cursor.toString()}</em>
        {codeWithAST.error && (
          <div style={{ color: "red" }}>{codeWithAST.error.message}</div>
        )}
      </DebugBox>

      <ActionList actions={base} onAction={onAction} />

      {nodes.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ paddingRight: 5 }}>+</span>
          <Key value={isMac ? "⌥" : "Alt"} />
        </div>
      )}
      <List>
        {nodes.map(({ node, actions }, i) =>
          Object.keys(actions).length == 0 ? (
            <NodeTitle key={i}>...</NodeTitle>
          ) : (
            <NodeListItem key={i}>
              <NodeTitle>{node.type}</NodeTitle>
              <ActionList {...{ actions, onAction }} />
            </NodeListItem>
          )
        )}
      </List>
    </Root>
  );
}
