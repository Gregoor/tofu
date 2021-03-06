import { Theme, css } from "@emotion/react";
import styled from "@emotion/styled";
import React from "react";

import { isMac } from "./actions";

const GAP = 5;

export const lightTheme: Theme = {
  kind: "light",
  l: {
    gap: GAP + "px",
    space: 2 * GAP + "px",
    abyss: 3 * GAP + "px",
  },
  c: {
    text: "hsl(0, 0%, 5%)",
    softText: "hsla(0, 0%, 30%)",
    light: "hsla(0, 0%, 70%)",
    bg: "hsl(0, 0%, 95%)",
    cardBg: "white",
    visitedLink: "initial",
  },
  borderRadius: "10px",
};

export const darkTheme: Theme = {
  ...lightTheme,
  kind: "dark",
  c: {
    ...lightTheme.c,
    light: "hsla(0, 0%, 40%)",
    text: "hsl(0, 0%, 85%)",
    softText: "hsla(0, 0%, 70%)",
    bg: "hsl(0, 0%, 5%)",
    cardBg: "#2d2d2d",
    visitedLink: "lightblue",
  },
};

const room = (size: string) => css`
  width: ${size};
  height: ${size};
  display: inline-block;
`;

export const Gap = styled.div`
  ${({ theme }) => room(theme.l.gap)}
`;

export const Space = styled.div`
  ${({ theme }) => room(theme.l.space)}
`;

export const Abyss = styled.div`
  ${({ theme }) => room(theme.l.abyss)}
`;

export const font = css`
  font-family: "Roboto Mono", monospace;
`;

const KeyRoot = styled.div`
  display: inline-block;
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
