import styled from "@emotion/styled";
import * as React from "react";
import { ButtonHTMLAttributes } from "react";

import { Gap, Key, Space, font } from "../ui";
import { DetailAction, Direction, modifierKeys } from "../utils";
import {
  ActionText,
  BareButton,
  BareList,
  HiddenItemsProps,
  OnAction,
  TextButton,
  humanize,
} from "./utils";

type SomeModifiers = typeof modifierKeys[number][];

const getActionText = (info: DetailAction["info"]) => {
  switch (info.type) {
    case "RANGE_SELECT":
      return {
        UP: "Surrounding",
        DOWN: "Inner",
        LEFT: "Previous",
        RIGHT: "Next",
      }[info.direction as NonNullable<Direction>];

    case "MOVE_ELEMENT":
      return humanize(info.direction);

    case "CHANGE_OPERATION":
      return (
        ({
          UP: "Surrounding",
          DOWN: "inner",
          LEFT: "Previous",
          RIGHT: "Next",
        } as any)[info.operator] || info.operator
      );

    case "WRAP":
      return humanize(info.wrapper);

    case "CHANGE_DECLARATION_KIND":
      return info.kind;

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

    case "CHANGE_ELSE_TO_ELSE_IF":
      return (
        <>
          Change <code>else</code> to <code>else if</code>
        </>
      );

    default: {
      const { type, ...rest } = info;
      return (
        humanize(type) +
        (Object.keys(rest).length ? ` (${JSON.stringify(rest)})` : "")
      );
    }
  }
};

const ActionVariant = styled.li`
  margin-bottom: ${({ theme }) => theme.l.gap};
  display: flex;
  align-items: center;
`;

const ActionVariants = styled(BareList)`
  margin-bottom: ${({ theme }) => theme.l.space};
`;

const ActionTitle = styled.span`
  margin-bottom: ${({ theme }) => theme.l.gap};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ActionButtonRoot = styled.div<{ single?: boolean }>`
  ${({ single, theme }) => (single ? `margin-bottom: ${theme.l.gap};` : "")};

  width: 100%;

  display: flex;
  justify-content: space-between;
  align-items: center;

  ${font};
`;

const ActionButton = ({
  info,
  on,
  hideModifiers,
  single,
  toggleItem,
  ...props
}: DetailAction & {
  single?: true;
  toggleItem: HiddenItemsProps["toggleItem"];
} & {
  single?: boolean;
  hideModifiers?: SomeModifiers;
} & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <ActionButtonRoot single={single}>
    <div>
      <BareButton {...props}>
        <ActionText>{getActionText(info)}</ActionText>
      </BareButton>
      <Gap />
      {single && (
        <TextButton small onClick={() => toggleItem(info.type)}>
          ╳
        </TextButton>
      )}
    </div>
    <BareButton {...props}>
      {on &&
        (Array.isArray(on) ? on : [on]).map((on, i) => (
          <Key key={i} value={"key" in on ? on.key : on.code} />
        ))}
    </BareButton>
  </ActionButtonRoot>
);

export const ActionList = ({
  actions,
  onAction,
  hiddenItems,
  toggleItem,
}: {
  actions: Record<string, DetailAction[]>;
} & HiddenItemsProps &
  OnAction) => (
  <>
    {Object.entries(actions).map(([type, actions], i) => {
      if (hiddenItems.has(type)) {
        return null;
      }
      if (actions.length == 1 && Object.keys(actions[0].info).length == 1) {
        return (
          <ActionButton
            key={i}
            {...actions[0]}
            single
            toggleItem={toggleItem}
          />
        );
      }
      const sharedModifiers = actions.reduce(
        (modifierKeys, action) =>
          modifierKeys.filter(
            (modifier) =>
              action.on &&
              (Array.isArray(action.on) ? action.on : [action.on]).every(
                (on) => on[modifier]
              )
          ),
        (modifierKeys as unknown) as SomeModifiers
      );
      return (
        <React.Fragment key={i}>
          <ActionTitle>
            <div>
              {humanize(type)}
              <Space />
              <TextButton small onClick={() => toggleItem(type)}>
                ╳
              </TextButton>
            </div>

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
                  toggleItem={() => null}
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
