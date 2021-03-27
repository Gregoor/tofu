import generate from "@babel/generator";
import * as t from "@babel/types";
import typescript from "prettier/parser-typescript";
import prettier from "prettier/standalone";
import * as vscode from "vscode";

import { baseDetailActions } from "./actions";
import { getLineage } from "./ast-utils";
import { codeFromSource } from "./code";
import { selectRange } from "./cursor/select-range";
import { nodeDefs } from "./nodes";
import { expressions } from "./nodes/expressions";
import { statements } from "./nodes/statements";
import { DetailAction, Range, commandFromId } from "./utils";

let isSupported = false;
const enabledCommands = new Set<string>();
const reformattedSources = new Set<string>();
let initialRange: Range | null = null;

const format = (source: string, cursorOffset: number) =>
  prettier.formatWithCursor(source, {
    cursorOffset,
    parser: "typescript",
    plugins: [typescript],
  });

const setContext = (key: string, value: any) =>
  vscode.commands.executeCommand("setContext", key, value);

async function logErrors(fn: Function) {
  try {
    await fn();
  } catch (e) {
    console.error(e);
  }
}

const onDidChangeTreeData = new vscode.EventEmitter<any>();
const actionDataProvider: vscode.TreeDataProvider<string> & {
  refresh: Function;
} = {
  getChildren: (key = "") => [
    ...new Set(
      Array.from(enabledCommands)
        .filter((command) => command.startsWith(key))
        .map((command) =>
          command
            .split(":")
            .slice(0, key ? key.split(":").length + 1 : 2)
            .join(":")
        )
    ),
  ],
  // [
  //   ...new Set(
  //     Array.from(enabledCommands).flatMap((command) =>
  //       command
  //         .split(":")
  //         .map((part, i, parts) => [...parts.slice(0, i), part].join(":"))
  //     )
  //   ),
  // ],
  getTreeItem(key: string) {
    const isCommand = enabledCommands.has(key);
    return {
      label: key.split(":").slice(-1)[0],
      ...(isCommand ? { command: { title: key, command: key } } : {}),
      collapsibleState:
        vscode.TreeItemCollapsibleState[isCommand ? "None" : "Expanded"],
    };
  },
  getParent: (key) => key.split(":").slice(0, -1).join(":"),
  onDidChangeTreeData: onDidChangeTreeData.event,
  refresh() {
    onDidChangeTreeData.fire(undefined);
  },
};

function registerActionsView(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.createTreeView("tofuActionsView", {
      treeDataProvider: actionDataProvider,
    })
  );
}

function getState() {
  const { activeTextEditor } = vscode.window;
  if (!activeTextEditor) {
    return;
  }

  const { document, selection } = activeTextEditor;
  const source = document.getText()!;
  const code = codeFromSource(source);
  if (!code) {
    return;
  }

  const cursor = new Range(
    ...([selection.start, selection.end].map((position) =>
      document.offsetAt(position)
    ) as [number, number])
  );

  const reverseLineage = getLineage(code.ast, cursor).reverse();
  const leafNode = reverseLineage[0][0];

  return { code, cursor, reverseLineage, leafNode };
}

async function runAction(
  detail: DetailAction<t.Node>,
  nodeType: string | null
) {
  const state = getState();
  if (!state) {
    return;
  }

  const { reverseLineage, leafNode, code, cursor } = state;

  const [node, path] = nodeType
    ? reverseLineage.find(([node]) => {
        switch (nodeType) {
          case "Statement":
            return t.isStatement(node);

          case "Expression":
            return t.isExpression(node);

          case node.type:
            return true;
        }
        return false;
      })!
    : [leafNode, reverseLineage[0][1]];

  try {
    const change = detail.do({ node, path, leafNode, code, cursor });

    let newSource: string | null = null;
    if ("ast" in change) {
      change.ast(state.code.ast);
      newSource = generate(state.code.ast, { retainLines: true }).code;
    } else if ("source" in change) {
      newSource = change.source;
    } else if ("sourceReplace" in change) {
      const [{ start, end }, replacement] = change.sourceReplace;
      newSource =
        state.code.source.slice(0, Math.max(start, 0)) +
        replacement +
        state.code.source.slice(end);
    }

    let newCursor = state.cursor;

    const skipFormatting = "skipFormatting" in change && change.skipFormatting;

    if (skipFormatting) {
      reformattedSources.add(newSource!);
    }

    if (newSource && !skipFormatting) {
      try {
        const result = format(newSource, state.cursor.start);
        newSource = result.formatted;
        reformattedSources.add(newSource);
        newCursor = new Range(result.cursorOffset);
      } catch (e) {}
    }

    if ("cursor" in change && change.cursor) {
      if (typeof change.cursor == "function") {
        const newCode = newSource ? codeFromSource(newSource) : state.code;
        if (newCode) {
          newCursor = change.cursor(newCode, newCursor);
        }
      } else {
        newCursor = change.cursor;
      }
    }

    if ("rangeSelect" in change) {
      if (!initialRange || cursor.isSingle()) {
        initialRange = state.cursor;
      }
      newCursor = selectRange(
        state.code,
        state.cursor,
        change.rangeSelect,
        initialRange
      );
    }

    const editor = vscode.window.activeTextEditor!;
    const { document } = editor;

    if (newSource) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        newSource
      );
      await vscode.workspace.applyEdit(edit);
    }

    editor.selection = new vscode.Selection(
      document.positionAt(newCursor.start),
      document.positionAt(newCursor.end)
    );

    const { anchor, active } = editor.selection;
    editor.revealRange(new vscode.Range(anchor, active));
  } catch (error) {
    console.error(
      "Error running action",
      commandFromId(node.type, detail.id),
      "on",
      generate(node).code,
      ":",
      error
    );
  }
}

function updateContext() {
  for (const command of enabledCommands) {
    setContext(command, false);
  }
  enabledCommands.clear();

  isSupported = ["typescript", "javascript"].some((id) =>
    vscode.window.activeTextEditor?.document.languageId.includes(id)
  );

  if (!isSupported) {
    actionDataProvider.refresh();
    return;
  }

  const state = getState();
  if (!state) {
    setContext("tofu:hasAST", false);
    actionDataProvider.refresh();
    return;
  }
  setContext("tofu:hasAST", true);

  for (const detail of baseDetailActions) {
    if (
      !detail.if ||
      detail.if({ ...(state as any), leafNode: state.reverseLineage[0][0] })
    ) {
      const command = commandFromId(null, detail.id);
      enabledCommands.add(command);
      setContext(command, true);
    }
  }

  for (const [node, path] of state.reverseLineage) {
    for (const [typeCheck, def, nodeType] of [
      [t.isExpression, expressions.Expression!, "Expression"],
      [t.isStatement, statements.Statement!, "Statement"],
    ] as const) {
      if (!typeCheck(node)) {
        continue;
      }
      for (const detail of def.actions || []) {
        if (!detail.if || detail.if({ node, path, ...state } as any)) {
          const command = commandFromId(nodeType, detail.id);
          enabledCommands.add(command);
          setContext(command, true);
        }
      }
    }

    const def = nodeDefs[node.type];
    const detailActions = def && def.actions;
    if (!detailActions) {
      continue;
    }
    for (const detail of detailActions) {
      if (!detail.if || detail.if({ node, path, ...state } as any)) {
        const command = commandFromId(node.type, detail.id);
        enabledCommands.add(command);
        setContext(command, true);
      }
    }
  }

  actionDataProvider.refresh();
}

function registerActions(context: vscode.ExtensionContext) {
  for (const detail of baseDetailActions) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        commandFromId("", detail.id),
        async () => {
          await logErrors(() => runAction(detail, null));
        }
      )
    );
  }

  for (const [nodeType, def] of Object.entries(nodeDefs)) {
    if (!def || !def.actions) {
      continue;
    }
    for (const detail of def.actions) {
      context.subscriptions.push(
        vscode.commands.registerCommand(
          commandFromId(nodeType, detail.id),
          async () => {
            await logErrors(() =>
              runAction(detail as DetailAction<t.Node>, nodeType)
            );
          }
        )
      );
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  registerActionsView(context);

  registerActions(context);
  updateContext();

  let pendingSource: string | null = null;
  const queue: [string, number][] = [];

  let isRunning = false;
  async function startReformatting() {
    if (isRunning) {
      return;
    }
    isRunning = true;

    for (let item = queue.pop(); item; item = queue.pop()) {
      const [source, offset] = item;

      const editor = vscode.window.activeTextEditor!;
      const { document } = editor;
      try {
        const { formatted, cursorOffset } = format(source, offset);

        // // const escaped = formatted.replaceAll("$", "\\$");
        // // const start =
        // //   cursorOffset +
        // //   (formatted.slice(0, cursorOffset).match(/\$/g) || []).length;
        // const didEdit =
        //   formatted == source ||
        //   (await editor.insertSnippet(
        //     new vscode.SnippetString(
        //       escaped.slice(0, start) + "$0" + escaped.slice(start)
        //     ),
        //     new vscode.Range(0, 0, document.lineCount + 1, 0),
        //     { undoStopAfter: true, undoStopBefore: false }
        //   ));
        const didEdit =
          formatted == source ||
          (await editor
            .edit(
              (builder) => {
                builder.replace(
                  new vscode.Range(0, 0, document.lineCount + 1, 0),
                  formatted
                );
              },
              { undoStopAfter: true, undoStopBefore: false }
            )
            .then((didEdit) => {
              if (didEdit) {
                const position = document.positionAt(cursorOffset);
                editor.selection = new vscode.Selection(position, position);
              }
              return didEdit;
            }));
        if (didEdit) {
          reformattedSources.add(formatted);
          updateContext();
        }
      } catch (e) {}
    }
    isRunning = false;
  }

  context.subscriptions.push(
    // vscode.commands.registerCommand("type", ({ text }) => {}),

    vscode.workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
      const source = document.getText();

      if (
        !isSupported ||
        vscode.window.activeTextEditor?.document.uri != document.uri ||
        reformattedSources.has(source)
      ) {
        reformattedSources.delete(source);
        return;
      }

      const [{ text }] = contentChanges;
      if (!(contentChanges.length == 1 && (text == " " || text == ","))) {
        pendingSource = source;
      }

      updateContext();
    }),

    vscode.window.onDidChangeActiveTextEditor(() => {
      updateContext();
    }),

    vscode.window.onDidChangeTextEditorSelection(() => {
      if (!isSupported) {
        return;
      }
      if (pendingSource) {
        const editor = vscode.window.activeTextEditor!;
        const { document } = editor;
        queue.push([pendingSource, document.offsetAt(editor.selection.active)]);
        pendingSource = null;
        startReformatting();
      }
      updateContext();
    })
  );
}
