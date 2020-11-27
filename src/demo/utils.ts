export type Runner = {
  example: string;
  run: (container: HTMLDivElement, code: string, iteration: number) => void;
};
