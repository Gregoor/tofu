import {
  RenderHookResult,
  act,
  renderHook,
} from "@testing-library/react-hooks";

import { moveCursor } from "./cursor/move";
import { QueueItem, useHistory } from "./history";
import { Range } from "./utils";

async function queueActionFor(
  {
    result,
    waitForNextUpdate,
  }: RenderHookResult<unknown, ReturnType<typeof useHistory>>,
  item: QueueItem
) {
  await act(async () => {
    const [, queueAction] = result.current;
    queueAction(item);
    await waitForNextUpdate();
  });
}

it("changes declaration kind", async () => {
  const hook = renderHook(() => useHistory("const n = 23;"));
  const { result } = hook;

  await queueActionFor(
    hook,
    new KeyboardEvent("keydown", {
      key: "ArrowRight",
      code: "ArrowRight",
    })
  );
  expect(result.current[0].cursor.end).toBe(5);

  await queueActionFor(
    hook,
    new KeyboardEvent("keydown", { key: "l", code: "KeyL" })
  );
  expect(result.current[0].code.source).toBe("let n = 23;\n");
});

it("changes value to string", async () => {
  const hook = renderHook(() => useHistory("s = null;\n"));
  const { result } = hook;

  await queueActionFor(hook, (code) => ({
    cursor: moveCursor(code, new Range(5), null),
  }));
  const { start, end } = result.current[0].cursor;
  expect(start).toBe(4);
  expect(end).toBe(8);

  await queueActionFor(hook, new KeyboardEvent("keydown", { key: "'" }));
  const { code, cursor } = result.current[0];
  expect(code.source).toBe('s = "";\n');
  expect(cursor.isSingle()).toBeTruthy();
  expect(cursor.start).toBe(5);
});

it("changes value to string", async () => {
  const hook = renderHook(() => useHistory('s = "some string";\n'));

  await queueActionFor(hook, (code) => ({
    cursor: moveCursor(code, new Range(7), null),
  }));
  expect(hook.result.current[0].cursor.start).toBe(7);

  await queueActionFor(hook, new KeyboardEvent("keydown", { key: "(" }));
  expect(hook.result.current[0].code.source).toBe('s = "so(me string";\n');
});

it("adds a new line under cursor", async () => {
  const hook = renderHook(() => useHistory('s = "some string";\n'));

  await queueActionFor(hook, (code) => ({
    cursor: moveCursor(code, new Range(7), null),
  }));
  await queueActionFor(hook, new KeyboardEvent("keydown", { code: "Enter" }));
  expect(hook.result.current[0].code.source).toBe('s = "some string";\n\n');
  expect(hook.result.current[0].cursor.start).toBe(19);
});
