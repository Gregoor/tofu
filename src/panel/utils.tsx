import styled from "@emotion/styled";
import * as React from "react";

import { Action } from "../actions";

export type OnAction = { onAction: (action: Action) => void };

export type HiddenItemsProps = {
  hiddenItems: Set<string>;
  toggleItem: (name: string) => void;
};

export function humanize(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export const BareList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const BareButton = styled.button`
  border: none;
  padding: 0;

  background: none;
  cursor: pointer;
`;

export const ActionText = styled.span<{ small?: boolean }>`
  text-decoration: underline;
  ${({ small }) => small && "font-size: 11px;"}
`;

export const TextButton = ({
  children,
  small,
  ...props
}: React.ComponentProps<typeof BareButton> &
  Pick<React.ComponentProps<typeof ActionText>, "children" | "small">) => (
  <BareButton {...props}>
    <ActionText {...{ children, small }} />
  </BareButton>
);
