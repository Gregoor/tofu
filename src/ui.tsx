import { Theme, css } from "@emotion/react";
import styled from "@emotion/styled";
import React from "react";

import { isMac } from "./actions";

const GAP = 5;

export const theme: Theme = {
  // Lengths
  l: {
    gap: GAP + "px",
    space: 2 * GAP + "px",
    abyss: 3 * GAP + "px",
  },

  // Colors
  c: {},

  borderRadius: "10px",
};

export const font = css`
  font-family: "Roboto Mono", monospace;
`;

const KeyRoot = styled.span`
  border: 1px solid grey;
  padding: 0 ${({ theme }) => theme.l.gap};
  height: 22px;
  font-weight: normal;
  font-size: 15px;
  ${font};
`;

const KEY_MAP = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",

  shiftKey: "⇧",
  altKey: isMac ? "⌥" : "Alt",
  Enter: "↵",
};

export const Key = ({ value }: { value: string }) => (
  <KeyRoot title={value}>
    {(KEY_MAP as any)[value] ||
      (value.startsWith("Key") ? value.slice(3).toLowerCase() : value)}
  </KeyRoot>
);
