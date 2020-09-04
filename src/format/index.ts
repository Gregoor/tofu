import { useCallback, useState } from "react";
import { FormatParameters, FormatResult } from "./worker";

const initializeWorker = () => new Worker("./worker.ts");

type CancellablePromise<T> = Promise<T> & { cancel(): void };

export function useFormat() {
  const [worker, setWorker] = useState(initializeWorker);

  return useCallback(
    (params: FormatParameters) => {
      const promise: any = new Promise((resolve, reject) => {
        worker.onmessage = (message) => {
          worker.onmessage = undefined;
          worker.onmessageerror = undefined;
          resolve(message.data);
        };
        worker.onmessageerror = (message) => {
          worker.onmessage = undefined;
          worker.onmessageerror = undefined;
          reject(message.data);
        };

        worker.postMessage(params);
      });

      promise.cancel = () => {
        worker.terminate();
        setWorker(initializeWorker);
      };

      return promise as CancellablePromise<FormatResult>;
    },
    [worker]
  );
}
