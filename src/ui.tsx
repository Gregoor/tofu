import { css } from "@emotion/core";
import emotionStyled, { CreateStyled } from "@emotion/styled";
import React from "react";

const GAP = 5;

export const theme = {
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

export const styled: CreateStyled<typeof theme> = emotionStyled;

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

export const Key = ({ value }: { value: string }) => (
  <KeyRoot title={value}>
    {{
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",

      shiftKey: "⇧",
      Enter: "↵",
    }[value] ||
      (value.startsWith("Key") ? value.slice(3).toLowerCase() : value)}
  </KeyRoot>
);
