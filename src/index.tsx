import { ThemeProvider } from "emotion-theming";
import React from "react";
import ReactDOM from "react-dom";

import { Demo } from "./demo";
import { theme } from "./ui";

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Demo />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
