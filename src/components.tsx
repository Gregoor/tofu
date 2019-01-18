import * as React from 'react';

const stripLocs = ast =>
  Array.isArray(ast)
    ? ast.map(stripLocs)
    : typeof ast == 'object' && ast !== null
      ? Object.entries(ast)
          .filter(([key]) => key != 'loc')
          .map(([k, v]) => [k, stripLocs(v)])
          .reduce((o, [k, v]) => {
            o[k] = v;
            return o;
          }, {})
      : ast;

export const PrintASTButton = ({ ast }) =>
  location.hostname !== 'localhost' ? null : (
    <button
      onClick={() => {
        console.log(JSON.stringify(stripLocs(ast), null, 2));
      }}
    >
      Print AST
    </button>
  );
