import styled from "@emotion/styled";
import CodeFlask from "codeflask";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { isValid } from "./code";
import { EditorState } from "./history";

const CodeWrap = styled.div`
  border-radius: ${({ theme }) => theme.borderRadius} 0 0
    ${({ theme }) => theme.borderRadius};
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-right: none;
  display: flex;
  flex-direction: row;
  background: white;
  overflow: hidden;
  min-height: 300px;

  .codeflask.codeflask {
    position: relative;
    width: initial;
    height: initial;
  }

  .codeflask textarea {
    position: static;
    width: auto;
    height: 100% !important;
  }

  .codeflask pre {
    position: absolute;
  }

  .keyword {
    font-weight: bold;
  }
`;

function useEventListener(
  element: HTMLTextAreaElement,
  type: string,
  listener: any
) {
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

export function CodeTextArea({
  editorState: {
    code,
    cursor: { start, end },
    formattedForPrintWidth,
  },
  cols,
  disabled,
  onKeyDown,
  onClick,
  onCut,
  onPaste,
}: Pick<
  React.HTMLProps<"textarea">,
  "cols" | "disabled" | "onClick" | "onCut" | "onPaste"
> & { editorState: EditorState; onKeyDown: (event: KeyboardEvent) => void }) {
  const rootRef = useRef<null | HTMLDivElement>(null);
  const [flask, setFlask] = useState<null | any>(null);

  const updateSelection = useCallback(() => {
    if (!flask) {
      return;
    }

    const textArea = flask.elTextarea as HTMLTextAreaElement;

    textArea.selectionStart = start;
    textArea.selectionEnd = end || start;

    textArea.blur();
    textArea.focus();

    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
  }, [flask, start, end]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    setFlask(
      new CodeFlask(rootRef.current, {
        language: "js",
        handleTabs: false,
        lineNumbers: true,
      })
    );
  }, [rootRef]);

  useEffect(() => {
    if (flask && (!isValid(code) || formattedForPrintWidth !== null)) {
      flask.updateCode(code.source);
      updateSelection();
    }
  }, [flask, code, formattedForPrintWidth]);

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
  useEventListener(flask?.elTextarea, "click", onClick);
  useEventListener(flask?.elTextarea, "cut", onCut);
  useEventListener(flask?.elTextarea, "paste", onPaste);

  return <CodeWrap ref={rootRef} />;
}
