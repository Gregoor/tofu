import { suite, test } from "uvu";
import * as assert from "uvu/assert";

import { codeFromSource } from "../code";
import { findCursor } from "./find";

const tests = ([
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
        [4, 5],
      ],
      LEFT: [
        //
        [3, 2],
        [5, [3, 4]],
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
        [7, 8],
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
        [5, 8],
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
    `if (t) {
} else {
  fn();
}
`,
    {
      X: [
        //
        [8, 15],
      ],
      DOWN: [
        //
        [10, 20],
        [20, 28],
      ],
      UP: [
        //
        [28, 24],
        [20, 15],
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
        [84, 14],
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
        [23, 33],
      ],
    },
  ],
  [
    "someLongFunctionName(\n" +
      "  firstParameter,\n" +
      "  secondParameter,\n" +
      "  thirdParameter,\n" +
      ");\n",
    { X: [[20, 24]] },
  ],
  [
    `const n = 42,
  msg = "We been doin this";
const arr = [42, "asd", 525, [["wat"], n]];

if (n > arr[3][1]) {
  console.log(msg + "!");
}

if (someTest) {
}
t;
`,
    {
      X: [
        //
        [19, 22],
        [85, 87],
        [150, 153],
      ],
      RIGHT: [
        //
        [0, [0, 5]],
        [12, 16],
        [55, 56],
      ],
      LEFT: [
        //
        [73, 72],
        [92, 87],
      ],
      UP: [
        //
        [5, [0, 5]],
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
] as const).map(([code, paths]) => [code.replace(/\r/g, ""), paths] as const);

for (const [source, paths] of tests) {
  const testSuite = suite(source);
  for (const [direction, path] of Object.entries(paths).reduce<any>(
    (a, [direction, path]) =>
      [
        ...a,
        ...(({
          X: [
            [
              "RIGHT",
              path.map(([from, to]: any) => [
                Array.isArray(from) ? from[1] : from,
                to,
              ]),
            ],
            [
              "LEFT",
              path.map(([to, from]: any) => [
                Array.isArray(from) ? from[0] : from,
                to,
              ]),
            ],
          ],
        } as any)[direction] || [[direction, path]]),
      ] as any,
    []
  )) {
    for (let [before, after] of path) {
      testSuite(`${direction}: ${before} => ${after}`, () => {
        const code = codeFromSource(source);
        assert.ok(code.isValid());
        if (!code.isValid()) {
          return;
        }

        const afterCursor = findCursor(
          code,
          direction == "null" ? null : direction,
          before
        );

        assert.equal(
          afterCursor.start == afterCursor.end
            ? afterCursor.start
            : [afterCursor.start, afterCursor.end],
          after
        );
      });
    }
  }
  testSuite.run();
}

test.run();
