import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import * as React from "react";
import { useEffect, useState } from "react";

import { findDetailActions } from "../actions";
import { InvalidCode, isValid } from "../code";
import { EditorState } from "../history";
import { font } from "../ui";
import { ActionList } from "./action-list";
import { DEBUG_KEY, DebugBox } from "./debug-box";
import { HiddenItemsList } from "./hidden-items-list";
import { BareList, OnAction } from "./utils";

function usePersistedSet(key: string, defaults: string[]) {
  const [value, setValue] = useState<Set<string>>(() => {
    const storedValue = localStorage.getItem(key);
    return new Set(storedValue ? JSON.parse(storedValue) : defaults);
  });
  return [
    value,
    function toggle(name: string) {
      const newValue = new Set(value);
      if (value.has(name)) {
        newValue.delete(name);
      } else {
        newValue.add(name);
      }
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(Array.from(newValue)));
    },
  ] as const;
}

const Root = styled.div`
  border: 1px solid transparent;
  border-radius: 0 ${({ theme }) => theme.borderRadius}
    ${({ theme }) => theme.borderRadius} 0;
  border-left: none;
  padding: ${({ theme }) => theme.l.abyss} 20px;
  min-width: 300px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  ${font};
  font-size: 13.333px;
  background: ${({ theme }) => theme.c.cardBg};
  overflow: auto;
`;

const NodeListItem = styled.li`
  margin-bottom: ${({ theme }) => theme.l.abyss};
`;

const NodeTitle = styled.div`
  margin-bottom: ${({ theme }) => theme.l.gap};
  width: 100%;
  display: flex;
  justify-content: center;
  font-size: 15px;
`;

export function Panel({
  editorState: { code, cursor, formattedForPrintWidth },
  runtimeError,
  onAction,
}: {
  editorState: EditorState;
  runtimeError: Error | null;
} & OnAction) {
  const [hiddenItems, toggleItem] = usePersistedSet("hiddenItems", [DEBUG_KEY]);
  const [actions, setActions] = useState(() => findDetailActions(code, cursor));
  const theme = useTheme();

  useEffect(() => {
    if (!isValid(code) || formattedForPrintWidth !== null) {
      // by delaying setting of actions until it is formatted, we prevent
      // flickers and unnecessary re-renders
      setActions(findDetailActions(code, cursor));
    }
  }, [code, cursor, formattedForPrintWidth]);

  return (
    <Root>
      <HiddenItemsList {...{ hiddenItems, toggleItem }} />

      {isValid(code) && runtimeError && (
        <div style={{ color: "red", marginBottom: theme.l.space }}>
          {runtimeError.stack!.split("\n").slice(0, 2).join(" -- ")}
        </div>
      )}

      {!isValid(code) && (
        <div style={{ color: "red", marginBottom: theme.l.space }}>
          {code.error.message}
        </div>
      )}

      <DebugBox {...{ code, cursor, hiddenItems, toggleItem }} />

      <ActionList
        actions={actions.base}
        onAction={onAction}
        {...{ hiddenItems, toggleItem }}
      />

      <BareList>
        {actions.nodes.map(({ node, actions }, i) =>
          Object.keys(actions).length == 0 ? (
            <NodeTitle key={i}>...</NodeTitle>
          ) : (
            <NodeListItem key={i}>
              <NodeTitle>{node.type}</NodeTitle>
              <ActionList {...{ actions, onAction, hiddenItems, toggleItem }} />
            </NodeListItem>
          )
        )}
      </BareList>
    </Root>
  );
}
