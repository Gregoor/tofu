import React, { useCallback, useEffect, useRef } from "react";

import { Editor, EditorHandle } from "./editor";

declare var acquireVsCodeApi: undefined | any;
const vscode =
  typeof acquireVsCodeApi === "undefined" ? null : acquireVsCodeApi();

export function VsCodeEditor() {
  const editorRef = useRef<EditorHandle>(null);
  const status = useRef<null | "initializing" | "done">(null);

  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, []);

  useEffect(() => {
    const handleMessage = ({ data: message }: MessageEvent<any>) => {
      switch (message.type) {
        case "update":
          status.current = "initializing";
          editorRef.current!.setSource(message.source);
          break;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleChange = useCallback((source) => {
    if (status.current == "done") {
      vscode.postMessage({ type: "update", source });
    }
    if (status.current == "initializing") {
      status.current = "done";
    }
  }, []);

  return <Editor ref={editorRef} initialSource="" onChange={handleChange} />;
}
