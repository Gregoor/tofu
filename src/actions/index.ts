import { CodeWithAST } from "../history";

import { basicActions } from "./basic";
import { selectionActions } from "./selection";
import { collectionActions } from "./collections";
import { conditionalActions } from "./conditionals";
import { loopActions } from "./loops";
import { keywordActions } from "./keywords";
import { wrappingActions } from "./wrapping";
import { otherActions } from "./other";
import { Range } from "../utils";

export type { Change } from "./utils";

const actionCreators = [
  ...basicActions,
  ...selectionActions,
  ...collectionActions,
  ...conditionalActions,
  ...loopActions,
  ...keywordActions,
  ...wrappingActions,
  ...otherActions,
];

export function findActions(codeWithAST: CodeWithAST, cursor: Range) {
  return actionCreators.filter((actionCreator) =>
    actionCreator.do(codeWithAST, cursor)
  );
}

export function findAction(
  codeWithAST: CodeWithAST,
  cursor: Range,
  event: KeyboardEvent
) {
  const modifierKeys = ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const;
  const modifiers = Object.fromEntries(
    modifierKeys.map((key) => [key, !!event[key]])
  ) as any;
  for (const actionCreator of actionCreators) {
    const keyConfigs = Array.isArray(actionCreator.on)
      ? actionCreator.on
      : [actionCreator.on];
    const areKeysPressed = keyConfigs.some(
      (config) =>
        modifierKeys.every(
          (key) =>
            event[key] === (config[key] || false) || config[key] === "optional"
        ) && config.key === event.key
    );
    let action: ReturnType<typeof actionCreator.do>;
    if (areKeysPressed && (action = actionCreator.do(codeWithAST, cursor))) {
      return () => action(modifiers);
    }
  }
}
