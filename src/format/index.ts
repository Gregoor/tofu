import { useCallback, useState } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker";

import { FormatParameters, FormatResult } from "./worker";

export function useFormat() {
  const [isWorking, setIsWorking] = useState(false);
  const [worker, setWorker] = useState(() => new Worker());

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
            setWorker(new Worker());
          }
        },
      ];
    },
    [isWorking, worker]
  );
}
