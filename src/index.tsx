import { ThemeProvider } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom";

import { Demo } from "./demo";
import { darkTheme, theme } from "./ui";

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider
      theme={
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? darkTheme
          : theme
      }
    >
      <Demo />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
