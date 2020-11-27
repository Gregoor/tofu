import * as Babel from "@babel/standalone";
import React from "react";
import ReactDOM from "react-dom";

import { justLogErrorButInTheFutureThisWillNeedToReportToSentry } from "../utils";
import { Runner } from "./utils";

class ErrorBoundary extends React.Component<{
  iteration: number;
  children: React.ReactNode;
}> {
  state = { errorAtIteration: -1 };

  componentDidCatch() {
    this.setState({ errorAtIteration: this.props.iteration });
  }

  render() {
    const { children, iteration } = this.props;
    return this.state.errorAtIteration == iteration ? (
      <h1>Something went wrong.</h1>
    ) : (
      children
    );
  }
}

export const reactRunner: Runner = {
  example: "",
  run(container, source, iteration) {
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
            Declare a component named <code>App</code> to see results. For
            example:
            <pre>
              <code>
                function App() {"{\n"}
                {"  "}return {"<h1>Hello World</h1>"};{"\n}"}
              </code>
            </pre>
          </p>
        ));
      ReactDOM.render(
        <ErrorBoundary iteration={iteration}>
          <Main />
        </ErrorBoundary>,
        container
      );
    } catch (e) {
      justLogErrorButInTheFutureThisWillNeedToReportToSentry(e);
    }
  },
};
