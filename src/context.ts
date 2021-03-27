import * as vscode from "vscode";

type ContextValue = boolean | string;

/**
 * Wrapper around VS Code's `setContext`.
 * The API call takes several milliseconds to seconds to complete,
 * so let's cache the values and only call the API when necessary.
 * Stolen from https://github.com/VSCodeVim/Vim/blob/8a9f47d2be74bcf2268d451e1bd68ca6edc85dd3/src/util/vscodeContext.ts
 */
export abstract class VSCodeContext {
  private static readonly cache: Map<string, ContextValue> = new Map();

  public static async set(key: string, value: ContextValue): Promise<void> {
    const prev = this.get(key);
    if (prev !== value) {
      console.debug(
        "vscode-context",
        `Setting key='${key}' to value='${value}'`
      );
      this.cache.set(key, value);
      await vscode.commands.executeCommand("setContext", key, value);
    }
  }

  public static get(key: string): ContextValue | undefined {
    return this.cache.get(key);
  }
}
