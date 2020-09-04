import babel from "prettier/parser-babel";
import prettier from "prettier/standalone";

const format = ({
  code,
  cursorOffset,
  printWidth,
}: {
  code: string;
  cursorOffset: number;
  printWidth: number;
}) => {
  try {
    return prettier.formatWithCursor(code, {
      parser: "babel",
      plugins: [babel],
      cursorOffset,
      printWidth,
      trailingComma: "all",
    });
  } catch (error) {
    return null;
  }
};

export type FormatParameters = Parameters<typeof format>[0];
export type FormatResult = null | ReturnType<typeof format>;

onmessage = (event: MessageEvent<FormatParameters>) => {
  (postMessage as Worker["postMessage"])(format(event.data));
};
