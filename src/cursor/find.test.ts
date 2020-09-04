const fs = require("fs");
const path = require("path");

const { parse } = require("@babel/parser");
import { test } from "uvu";
import * as assert from "uvu/assert";

import { spreadCursor } from "./utils";
import { findCursor } from "./find";

function testPath(ast, code, path, direction) {
  for (let [before, after] of path) {
    test(`${direction}: ${before} => ${after}`, () => {
      assert.equal(
        findCursor(ast, code, direction == "null" ? null : direction, before),
        spreadCursor(after)
      );
    });
  }
}

const testCode = fs.readFileSync(path.join(__dirname, "sample.js"), "utf-8");

type Path = (number | [number, number])[][];
const tests = [
  [
    "let i = 23;",
    {
      X: [
        //
        [4, 5],
        [5, 8],
      ],
      RIGHT: [
        //
        [0, [0, 3]],
        [1, [0, 3]],
        [3, 4],
        [11, 11],
      ],
      LEFT: [
        //
        [0, 0],
        [4, [0, 3]],
      ],
      null: [
        //
        [0, [0, 3]],
        [1, [0, 3]],
        [2, [0, 3]],
        [3, [0, 3]],
      ],
    },
  ],
  [
    "const wat = true;",
    {
      RIGHT: [
        //
        [0, [0, 5]],
        [5, 6],
        [5, 6],
        [9, [12, 16]],
      ],
    },
  ],
  [
    "23 > 'wat'",
    {
      RIGHT: [
        //
        [2, [3, 4]],
        [4, 6],
      ],
      LEFT: [
        //
        [3, 2],
        [6, [3, 4]],
      ],
    },
  ],
  [
    "'you' > 'me'",
    {
      RIGHT: [
        //
        [4, 5],
        [5, [6, 7]],
        [7, 9],
      ],
      LEFT: [
        //
        [6, 5],
      ],
    },
  ],
  [
    "let a = [1, 2, 3] + false;",
    {
      RIGHT: [
        //
        [5, 9],
        [16, 17],
        [17, [18, 19]],
      ],
      LEFT: [
        //
        [17, 16],
        [18, 17],
      ],
    },
  ],
  [
    "true + false",
    {
      RIGHT: [
        //
        [4, [5, 6]],
      ],
    },
  ],
  [
    "a || b",
    {
      RIGHT: [
        //
        [1, [2, 4]],
      ],
    },
  ],
  [
    "a[0];",
    {
      X: [
        //
        [2, 3],
        [3, 4],
      ],
    },
  ],
  [
    ["let i;", "", "", "let x;"].join("\n"),
    {
      RIGHT: [
        //
        [5, 7],
        [7, 8],
        [8, [9, 12]],
      ],
    },
  ],
  [
    `if (t) {
}
`,
    {
      X: [
        //
        [8, 10],
        [10, 11],
      ],
      DOWN: [
        //
        [8, 10],
        [10, 11],
      ],
      UP: [
        //
        [10, 0],
        [11, 10],
      ],
    },
  ],
  [
    "[];",
    {
      RIGHT: [
        //
        [0, 1],
      ],
    },
  ],
  [
    "[1, , 2];",
    {
      X: [
        //
        [2, 4],
        [4, 6],
      ],
    },
  ],
  [
    "[, ,];",
    {
      X: [
        //
        [0, 1],
        [1, 3],
        [3, 5],
      ],
    },
  ],
  [
    "const a = [\n" +
      '  "a very very long line of text resulting in the array being split",\n' +
      "  asd,\n" +
      "];\n",
    {
      UP: [
        //
        [84, 15],
      ],
    },
  ],
  [
    "{};",
    {
      RIGHT: [
        //
        [0, 1],
      ],
    },
  ],
  [
    "for (;;) {}",
    {
      X: [
        //
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 10],
      ],
    },
  ],
  [
    "(1);",
    {
      X: [
        //
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    },
  ],
  [
    "n = (1);",
    {
      X: [
        //
        [6, 7],
      ],
    },
  ],
  [
    "(1) + (2);",
    {
      X: [
        //
        [3, [4, 5]],
        [[4, 5], 6],
      ],
    },
  ],
  [
    "() => null",
    {
      X: [
        //
        [0, 1],
        [1, [6, 10]],
      ],
    },
  ],
  [
    "const n = () => {\n" + "  asd;\n" + "  return;\n" + "};\n",
    {
      X: [
        //
        [24, 33],
      ],
    },
  ],
  [
    "1 + (1)",
    {
      X: [
        //
        [[2, 3], 4],
        [4, 5],
      ],
    },
  ],
  [
    testCode,
    {
      RIGHT: [
        //
        [0, [0, 5]],
        [12, 16],
        [19, 23],
        [55, 56],
        [85, 87],
        [150, 153],
      ],
      LEFT: [
        //
        [23, 19],
        [73, 70],
        [87, 85],
        [92, 87],
        [153, 150],
      ],
      UP: [
        //
        [4, 0],
        [24, 10],
        [28, 12],
        [43, 16],
        [55, 26],
        [74, 41],
        [93, 87],
      ],
      DOWN: [
        //
        [10, 24],
        [104, 125],
        [105, 126],
      ],
    },
  ],
].map(
  ([code, paths]) =>
    [code.replace(/\r/g, ""), paths] as [string, { [direction: string]: Path }]
);

for (const [code, paths] of tests) {
  test(code, () => {
    const ast = parse(code);
    for (const [direction, path] of Object.entries(paths).reduce(
      (a, [direction, path]) => [
        ...a,
        ...({
          X: [
            [
              "RIGHT",
              path.map(([from, to]) => [
                Array.isArray(from) ? from[1] : from,
                to,
              ]),
            ],
            [
              "LEFT",
              path.map(([to, from]) => [
                Array.isArray(from) ? from[0] : from,
                to,
              ]),
            ],
          ],
        }[direction] || [[direction, path]]),
      ],
      []
    )) {
      testPath(ast, code, path, direction);
    }
  });
}

test.run();
