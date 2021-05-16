import * as fs from "fs";

import * as t from "@babel/types";

import { baseDetailActions } from "./actions";
import { nodeDefs } from "./nodes";
import { Expression } from "./nodes/expressions";
import { Statement } from "./nodes/statements";
import { DetailAction, commandFromId } from "./utils";

const when =
  "editorTextFocus && !findWidgetVisible && !suggestWidgetVisible && !renameInputVisible && !inReferenceSearchEditor && !quickFixWidgetVisible && tofu:hasAST";

const commands = [] as any[];
const keybindings = [] as any[];
function addCommand(
  nodeType: string | null,
  { id, keybinding }: DetailAction<t.Node>
) {
  const command = commandFromId(nodeType, id);
  commands.push({ command, title: command });
  if (keybinding) {
    keybindings.push({
      command,
      key: keybinding,
      when: when + " && " + command,
    });
  }
}

for (const detail of baseDetailActions) {
  addCommand(null, detail);
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
    addCommand(nodeType, detail as DetailAction<t.Node>);
  }
}

const packageJSON = JSON.parse(fs.readFileSync("package.json", "utf-8"));
packageJSON.contributes = { ...packageJSON.contributes, commands, keybindings };
fs.writeFileSync("package.json", JSON.stringify(packageJSON, null, 2));
