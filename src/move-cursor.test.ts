import { spreadCursor } from './cursor-utils';

const { parse } = require('@babel/parser');
const fs = require('fs');
const path = require('path');
import moveCursor from './move-cursor';

function testPath(ast, code, path, direction) {
  for (let [before, after] of path) {
    test(`${direction}: ${before} => ${after}`, () => {
      expect(
        moveCursor(ast, code, direction == 'null' ? null : direction, before)
      ).toEqual(spreadCursor(after));
    });
  }
}

const testCode = fs.readFileSync(path.join(__dirname, 'test.js'), 'utf-8');

type Path = (number | [number, number])[][];
const tests = [
  [
    'let i = 23;',
    {
      RIGHT: [
        //
        [0, [0, 3]],
        [1, [0, 3]],
        [3, 4],
        [4, 5],
        [5, 8],
        [11, 11]
      ],
      LEFT: [
        //
        [0, 0],
        [4, [0, 3]],
        [5, 4],
        [8, 5]
      ],
      null: [
        //
        [0, [0, 3]],
        [1, [0, 3]],
        [2, [0, 3]],
        [3, [0, 3]]
      ]
    }
  ],
  [
    'const wat = true;',
    {
      RIGHT: [
        //
        [0, [0, 5]],
        [5, 6],
        [5, 6],
        [9, [12, 16]]
      ]
    }
  ],
  [
    "23 > 'wat'",
    {
      RIGHT: [
        //
        [2, [3, 4]],
        [4, 6]
      ],
      LEFT: [
        //
        [3, 2],
        [6, [3, 4]]
      ]
    }
  ],
  [
    "'you' > 'me'",
    {
      RIGHT: [
        //
        [4, 5],
        [5, [6, 7]],
        [7, 9]
      ],
      LEFT: [
        //
        [6, 5]
      ]
    }
  ],
  [
    'let a = [1, 2, 3] + false;',
    {
      RIGHT: [
        //
        [5, 9],
        [16, 17],
        [17, [18, 19]]
      ],
      LEFT: [
        //
        [17, 16],
        [18, 17]
      ]
    }
  ],
  [
    'true + false',
    {
      RIGHT: [
        //
        [4, [5, 6]]
      ]
    }
  ],
  [
    'a || b',
    {
      RIGHT: [
        //
        [1, [2, 4]]
      ]
    }
  ],
  [
    'a[0];',
    {
      RIGHT: [
        //
        [2, 3],
        [3, 4]
      ],
      LEFT: [
        //
        [3, 2],
        [4, 3]
      ]
    }
  ],
  [
    ['let i;', '', '', 'let x;'].join('\n'),
    {
      RIGHT: [
        //
        [5, 7],
        [7, 8],
        [8, [9, 12]]
      ]
    }
  ],
  [
    `if (t) {
}
`,
    {
      RIGHT: [
        //
        [8, 10]
      ],
      DOWN: [
        //
        [8, 10],
        [10, 11]
      ],
      UP: [
        //
        [10, 0],
        [11, 10]
      ]
    }
  ],
  [
    '[];',
    {
      RIGHT: [
        [0, 1]
      ]
    }
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
        [150, 153]
      ],
      LEFT: [
        //
        [23, 19],
        [73, 70],
        // [87, 85],
        [92, 87],
        [153, 150]
      ],
      UP: [
        //
        [4, 0],
        [24, 10],
        [28, 12],
        [43, 16],
        [55, 26],
        [74, 41],
        [93, 87]
      ],
      DOWN: [
        //
        [10, 24],
        [104, 125],
        [105, 126]
      ]
    }
  ]
].map(
  ([code, paths]) =>
    [code.replace(/\r/g, ''), paths] as [string, { [direction: string]: Path }]
);

for (const [code, paths] of tests) {
  describe(code, () => {
    const ast = parse(code);
    for (const [direction, path] of Object.entries(paths)) {
      testPath(ast, code, path, direction);
    }
  });
}
