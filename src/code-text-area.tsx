import CodeFlask from "codeflask";
import React, {
  HTMLProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { EditorState } from "./history";
import { CodeWrap } from "./ui";

function useEventListener(element, type: string, listener: Function) {
  useEffect(() => {
    if (!element) {
      return;
    }
    element.addEventListener(type, listener);
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [element, type, listener]);
}

export default function CodeTextArea({
  editorState: {
    codeWithAST,
    cursor: { start, end },
    formattedForPrintWidth,
  },
  cols,
  disabled,
  onKeyDown,
  onInput,
  onClick,
  onCut,
  onPaste,
}: Omit<HTMLProps<"textarea">, "value"> & { editorState: EditorState }) {
  const rootRef = useRef(null);
  const [flask, setFlask] = useState(null);

  const updateSelection = useCallback(() => {
    if (!flask) {
      return;
    }

    const textArea = flask.elTextarea;

    const [scrollX, scrollY] = [window.scrollX, window.scrollY];
    textArea.blur();
    textArea.focus();
    window.scrollTo(scrollX, scrollY);

    textArea.selectionStart = start;
    textArea.selectionEnd = end || start;

    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
  }, [flask, start, end]);

  useEffect(() => {
    setFlask(
      new CodeFlask(rootRef.current, { language: "js", handleTabs: false })
    );
  }, [rootRef]);

  useEffect(() => {
    if (flask && (!codeWithAST.ast || formattedForPrintWidth !== null)) {
      flask.updateCode(codeWithAST.code);
      updateSelection();
    }
  }, [flask, codeWithAST, formattedForPrintWidth]);

  useEffect(() => {
    updateSelection();
  }, [updateSelection]);

  useEffect(() => {
    if (!flask) {
      return;
    }
    flask.elTextarea.cols = cols;
  }, [flask, cols]);

  useEffect(() => {
    if (!flask) {
      return;
    }
    if (disabled) {
      flask.enableReadonlyMode();
    } else {
      flask.disableReadonlyMode();
    }
  }, [disabled, flask]);

  useEventListener(flask?.elTextarea, "keydown", onKeyDown);
  useEventListener(flask?.elTextarea, "input", onInput);
  useEventListener(flask?.elTextarea, "click", onClick);
  useEventListener(flask?.elTextarea, "cut", onCut);
  useEventListener(flask?.elTextarea, "paste", onPaste);

  return <CodeWrap ref={rootRef} />;
}
