import { ThemeProvider } from "@emotion/react";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { Demo } from "./demo";
import { darkTheme, lightTheme } from "./ui";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function App() {
  const [theme, setTheme] = useState(() =>
    mediaQuery.matches ? darkTheme : lightTheme
  );
  useEffect(() => {
    mediaQuery.addEventListener("change", () => {
      setTheme(mediaQuery.matches ? darkTheme : lightTheme);
    });
  }, [setTheme]);
  return (
    <ThemeProvider theme={theme}>
      <Demo />
    </ThemeProvider>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
