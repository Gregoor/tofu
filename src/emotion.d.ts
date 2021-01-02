import "@emotion/react";

declare module "@emotion/react" {
  export interface Theme {
    kind: "light" | "dark";
    l: { gap: string; abyss: string; space: string };
    c: {
      softText: string;
      light: string;
      bg: string;
      text: string;
      cardBg: string;
      visitedLink: string;
    };
    borderRadius: string;
  }
}
