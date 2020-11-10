import { useCallback, useState } from "react";

import { FormatParameters, FormatResult } from "./worker";

const loadWorker = () =>
  new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

export function useFormat() {
  const [isWorking, setIsWorking] = useState(false);
  const [worker, setWorker] = useState(loadWorker);

  return useCallback(
    (params: FormatParameters) => {
      const promise: any = new Promise((resolve, reject) => {
        // TODO: BUG!!! Some messages are not reaching the promise
        function handleMessage(message: { data: FormatResult }) {
          removeHandlers();
          resolve(message.data);
        }
        function handleMessageError(message: any) {
          removeHandlers();
          reject(message.data);
        }
        function removeHandlers() {
          setIsWorking(false);
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("messageerror", handleMessageError);
        }

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("messageerror", handleMessageError);
        setIsWorking(true);
        worker.postMessage(params);
      });

      return [
        promise,
        () => {
          if (isWorking) {
            worker.terminate();
            setWorker(loadWorker);
          }
        },
      ];
    },
    [isWorking, worker]
  );
}
