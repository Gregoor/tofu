import { act, renderHook } from "@testing-library/react-hooks";

import { useHistory } from "./history";

it("changes declaration kind", async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useHistory("const n = 23;")
  );

  await act(async () => {
    const [, queueAction] = result.current;
    queueAction(
      new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight" })
    );
    await waitForNextUpdate();
  });

  expect(result.current[0].cursor.end).toBe(5);

  await act(async () => {
    const [, queueAction] = result.current;
    queueAction(new KeyboardEvent("keydown", { key: "l", code: "KeyL" }));
    await waitForNextUpdate();
  });

  expect(result.current[0].code.source).toBe("let n = 23;\n");
});
