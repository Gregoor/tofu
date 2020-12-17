import * as Babel from "@babel/standalone";
import React from "react";
import ReactDOM from "react-dom";

import { Runner } from "./runner";

const EXAMPLE_CODE = `function App() {
  const [value, setValue] = useState("");
  const [items, setItems] = useState(
    [
      "Delete actions",
      "Select previous/next",
    ].map((text) => ({
      text,
      checked: false,
    })),
  );

  return (
    <div>
      <h2>ToDo list demo playground</h2>
      <ul>
        <input
          type="text"
          placeholder="Search/enter new item"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setValue("");
              setItems(items.concat({ text: value }));
            }
          }}
          style={{ marginBottom: 10 }}
        />

        {items
          .filter((i) => i.text.includes(value))
          .map((item, i) => (
            <li
              key={i}
              style={{
                textDecoration: item.checked ? "line-through" : undefined,
                cursor: "pointer",
              }}
              onClick={() => {
                const newItems = items.slice();
                newItems[i] = {
                  ...item,
                  checked: !item.checked,
                };

                setItems(newItems);
              }}
            >
              {item.text}
            </li>
          ))}
      </ul>
    </div>
  );
}
`;

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
  name: "react",
  example: EXAMPLE_CODE,
  run(container, source, onError, iteration) {
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
      onError(e);
    }
  },
  cleanUp(container) {
    ReactDOM.unmountComponentAtNode(container);
  },
};
