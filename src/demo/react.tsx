import * as Babel from "@babel/standalone";
import React from "react";
import ReactDOM from "react-dom";

import { justLogErrorButInTheFutureThisWillNeedToReportToSentry } from "../utils";
import { Runner } from "./utils";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? (
      <h1>Something went wrong.</h1>
    ) : (
      this.props.children
    );
  }
}

export const reactRunner: Runner = {
  example: "",
  run(container, source) {
    const result = Babel.transform(source, {
      plugins: [
        Babel.availablePlugins["syntax-jsx"],
        Babel.availablePlugins["transform-react-jsx"],
      ],
    });

    try {
      const Main =
        new Function(
          "React",
          `{${Object.keys(React).join(", ")}}`,
          result.code + "return typeof App == 'undefined' ? null : App;"
        )(React, React) ||
        (() => (
          <p>
            Declare a component named <code>App</code> to see results
          </p>
        ));
      ReactDOM.render(
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>,
        container
      );
    } catch (e) {
      justLogErrorButInTheFutureThisWillNeedToReportToSentry(e);
    }
  },
};
