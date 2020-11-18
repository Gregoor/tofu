import "@emotion/react";

declare module "@emotion/react" {
  export interface Theme {
    // Lengths
    l: {
      gap: string;
      space: string;
      abyss: string;
    };

    // Colors
    c: {};

    borderRadius: string;
  }
}
