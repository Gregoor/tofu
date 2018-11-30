import * as React from 'react';
import { render } from 'react-dom';
import Editor from './editor';

const WELCOME_CODE = [
  "const FEATURES = ['Edit code with few keystrokes', 'No syntax errors', 'Properly formatted code, no action required']",
  "const TODOS = ['Side Panel', 'Support all the JS language features', 'Syntax Highlighting', 'Proper changes history']",
  '',
  'if (FEATURES.length > TODOS.length) { release(); }'
].join('\n');

render(<Editor code={WELCOME_CODE} />, document.querySelector('#editor'));
