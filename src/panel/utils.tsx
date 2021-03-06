import styled from "@emotion/styled";
import * as React from "react";

import { DetailAction } from "../utils";

export type OnAction = { onAction: (action: DetailAction) => void };

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
  color: ${({ theme }) => theme.c.text};
  cursor: pointer;
`;

export const ActionText = styled.span<{ small?: boolean }>`
  text-decoration: underline;
  font-size: ${(p) => (p.small ? 11 : 13.33)}px;
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
