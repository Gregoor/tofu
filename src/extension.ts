import generate from "@babel/generator";
import * as t from "@babel/types";
import typescript from "prettier/parser-typescript";
import prettier from "prettier/standalone";
import * as vscode from "vscode";

import { baseDetailActions } from "./actions";
import { Path, getLineage } from "./ast-utils";
import { AST, codeFromSource } from "./code";
import { selectRange } from "./cursor/select-range";
import { handleNodeInput, nodeDefs } from "./nodes";
import { Expression } from "./nodes/expressions";
import { Statement } from "./nodes/statements";
import { NodeKindDef } from "./nodes/utils";
import { createQueue } from "./queue";
import { Change, DetailAction, Range, commandFromId } from "./utils";

let isSupported = false;
const enabledCommands = new Set<string>();
let initialRange: Range | null = null;

const format = (source: string, cursorOffset: number, ast: AST | null = null) =>
  prettier.formatWithCursor(source, {
    cursorOffset,
    parser: ast ? () => ast : "typescript",
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

function getState(textEditor = vscode.window.activeTextEditor) {
  if (!textEditor) {
    return;
  }
  const { document, selection } = textEditor;
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

async function applyChange(
  state: NonNullable<ReturnType<typeof getState>>,
  change: Change
) {
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

  if (newSource && !skipFormatting) {
    try {
      const result = format(
        newSource,
        state.cursor.start,
        codeFromSource(newSource)?.ast
      );
      newSource = result.formatted;
      newCursor = new Range(result.cursorOffset);
    } catch (e) {}
  }

  if ("cursor" in change && change.cursor) {
    if (typeof change.cursor == "function") {
      const newCode = newSource ? codeFromSource(newSource) : state.code;
      if (newCode) {
        try {
          newCursor = change.cursor(newCode, newCursor);
        } catch (e) {
          console.error("error while updating cursor", e);
        }
      }
    } else {
      newCursor = change.cursor;
    }
  }

  if ("rangeSelect" in change) {
    if (!initialRange || state.cursor.isSingle()) {
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
    ? reverseLineage.find(([node, path]) => {
        switch (nodeType) {
          case Statement.kind:
            return Statement.isKindOf({ node, path, code, cursor });

          case Expression.kind:
            return Expression.isKindOf({ node, path, code, cursor });

          case node.type:
            return true;
        }
        return false;
      })!
    : [leafNode, reverseLineage[0][1]];

  try {
    const change = detail.do({ node, path, code, cursor });
    await applyChange(state, change);
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

const findActions = (): {
  nodeType: string;
  detail: DetailAction<t.Node>;
  node: t.Node;
  path: Path;
}[] => {
  const { code, cursor, reverseLineage } = getState()!;
  return reverseLineage.flatMap(([node, path]) => [
    ...([Expression, Statement] as NodeKindDef<t.Node>[]).flatMap(
      (NodeKind) =>
        (NodeKind.isKindOf({ node, path, code, cursor }) &&
          NodeKind.actions.map((detail) => ({
            nodeType: NodeKind.kind,
            detail,
            node,
            path,
          }))) ||
        []
    ),

    ...((nodeDefs[node.type]?.actions as DetailAction<t.Node>[])?.map(
      (detail) => ({
        nodeType: node.type,
        detail,
        node,
        path,
      })
    ) || []),
  ]);
};

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

  try {
    for (const { nodeType, detail, node, path } of findActions()) {
      if (!detail.if || detail.if({ node, path, ...state } as any)) {
        const command = commandFromId(nodeType, detail.id);
        enabledCommands.add(command);
        setContext(command, true);
      }
    }

    actionDataProvider.refresh();
  } catch (e) {
    console.error(e);
  }
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

  for (const [nodeType, def] of [
    ...Object.entries(nodeDefs),
    [Expression.kind, Expression] as const,
    [Statement.kind, Statement] as const,
  ]) {
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

const enqueue = createQueue<{
  textEditor: vscode.TextEditor;
  text: string;
}>(async ({ textEditor, text }) => {
  const state = getState(textEditor);

  if (state) {
    for (const { nodeType, detail, node, path } of findActions()) {
      if (
        detail.on &&
        (Array.isArray(detail.on.char)
          ? detail.on.char
          : [detail.on.char]
        ).some((char) => char == text) &&
        (!detail.if || detail.if({ node, path, ...state } as any)) &&
        detail.on.at({ ...state, node, path } as any)
      ) {
        const command = commandFromId(nodeType, detail.id);
        return vscode.commands.executeCommand(command);
      }
    }

    try {
      const change = handleNodeInput(state.code, state.cursor, text);
      if (change) {
        return applyChange(state, change);
      }
    } catch (e) {
      console.error("error while inputting text", e);
    }
  }

  const { document } = textEditor;
  const source = document.getText();
  const startOffset = document.offsetAt(textEditor.selection.start);
  let newSource =
    source.slice(0, startOffset) +
    text +
    source.slice(document.offsetAt(textEditor.selection.end));
  let newOffset = startOffset + text.length;

  if (text != " " && text != ",") {
    try {
      const result = format(
        newSource,
        newOffset,
        codeFromSource(newSource)?.ast
      );
      newSource = result.formatted;
      newOffset = result.cursorOffset;
    } catch (e) {}
  }

  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(0, 0, document.lineCount + 1, 0),
    newSource
  );

  await vscode.workspace.applyEdit(edit);
  const newPosition = document.positionAt(newOffset);
  textEditor.selection = new vscode.Selection(newPosition, newPosition);

  vscode.commands.executeCommand("editor.action.triggerSuggest");
});

export function activate(context: vscode.ExtensionContext) {
  registerActionsView(context);

  registerActions(context);
  updateContext();

  context.subscriptions.push(
    vscode.commands.registerCommand("type", ({ text }) => {
      if (!isSupported) {
        return vscode.commands.executeCommand("default:type", { text });
      }
      enqueue({
        textEditor: vscode.window.activeTextEditor!,
        text,
      });
    }),

    vscode.workspace.onDidChangeTextDocument(({ document }) => {
      if (
        !isSupported ||
        vscode.window.activeTextEditor?.document.uri != document.uri
      ) {
        return;
      }

      updateContext();
    }),

    vscode.window.onDidChangeTextEditorSelection(() => {
      updateContext();
    }),

    vscode.window.onDidChangeActiveTextEditor(() => {
      updateContext();
    })
  );
}
