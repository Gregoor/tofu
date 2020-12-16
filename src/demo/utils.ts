export type Runner = {
  name: string;
  example: string;
  run: (
    container: HTMLDivElement,
    code: string,
    onError: (error: Error) => void,
    iteration: number
  ) => void;
  cleanUp: (container: HTMLDivElement) => void;
};
