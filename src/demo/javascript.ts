import { Runner } from "./runner";

export const EXAMPLE_CODE = `
function greet(who) {
  return \`Hello \${who}!\`;
}

console.log(greet("World"));
`;

export const jsRunner: Runner = {
  id: "js",
  label: "JS Console",
  docsURL: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  example: EXAMPLE_CODE,
  run(container, source) {
    container.textContent = "";

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { display: "none" });
    container.appendChild(iframe);

    const consoleView = document.createElement("div");
    consoleView.classList.add("console-log");
    container.appendChild(consoleView);

    (iframe.contentWindow as any).console.log = (...rest: any[]) => {
      const entry = document.createElement("div");
      entry.textContent = rest.map((e) => e.toString()).join(",");
      consoleView.appendChild(entry);
    };
    (iframe.contentWindow as any).eval(source);
  },
  cleanUp(container) {
    container.innerText = "";
  },
};
