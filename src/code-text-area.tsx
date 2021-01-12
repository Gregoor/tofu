import styled from "@emotion/styled";
import CodeFlask from "codeflask";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { isValid } from "./code";
import { EditorState } from "./history";

const CodeWrap = styled.div`
  border-radius: ${({ theme }) => theme.borderRadius} 0 0
    ${({ theme }) => theme.borderRadius};
  border: 2px solid ${({ theme }) => theme.c.cardBg};
  border-right: none;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 300px;

  .codeflask {
    position: relative;
    width: initial;
    height: initial;

    ${({ theme }) =>
      `background: ${theme.kind == "light" ? theme.c.cardBg : theme.c.bg};`};

    &.codeflask--has-line-numbers:before,
    & .codeflask__lines {
      background: ${({ theme }) => theme.c.cardBg};
    }

    & .codeflask__code {
      color: ${({ theme }) => theme.c.text};
    }

    & textarea {
      position: static;
      width: auto;
      height: 100% !important;
      color: transparent;
      caret-color: ${({ theme }) => theme.c.text};

      &:focus {
        outline: none;
      }
    }

    & pre {
      position: absolute;
    }

    & .token.keyword {
      color: #0070c1;
    }

    & .token.function {
      color: #795e26;
    }

    ${({ theme }) =>
      theme.kind == "dark" &&
      `
      color: ${theme.c.text};
      
      & .token.punctuation {
        color: #949494;
      }
      
      & .token.keyword {
        color: #e06ecb;
      }
      
      & .token.boolean, & .token.number {
        color: #3ae038;
      }
      
      & .token.function {
        color: #ebdb72;
      }
    `}
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
  onKeyDown,
  onClick,
  onCut,
  onPaste,
}: Pick<
  React.HTMLProps<"textarea">,
  "cols" | "onClick" | "onCut" | "onPaste"
> & {
  editorState: EditorState;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
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
  }, [flask, code, formattedForPrintWidth, updateSelection]);

  useEffect(() => {
    updateSelection();
  }, [updateSelection]);

  useEffect(() => {
    if (!flask) {
      return;
    }
    flask.elTextarea.cols = cols;
  }, [flask, cols]);

  useEventListener(flask?.elTextarea, "keydown", onKeyDown);
  useEventListener(flask?.elTextarea, "click", onClick);
  useEventListener(flask?.elTextarea, "cut", onCut);
  useEventListener(flask?.elTextarea, "paste", onPaste);

  return <CodeWrap ref={rootRef} />;
}
