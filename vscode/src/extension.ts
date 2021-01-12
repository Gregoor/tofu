import * as vscode from "vscode";

import { EditorProvider } from "./editor";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(EditorProvider.register(context));
  // vscode.window.activeTextEditor?.selection

  // let disposable = vscode.commands.registerCommand("tofu.helloWorld", () => {
  //   console.log("command ran");
  // });

  // context.subscriptions.push(disposable);
}
