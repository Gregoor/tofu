import * as React from 'react';
import { render } from 'react-dom';
import Editor from './editor';

const WELCOME_CODE = [
  "const FEATURES = ['Edit code with few keystrokes', 'No syntax errors', 'Formatted code, no action required']",
  "const TODOS = ['Support all the JS language features', 'Squash all dem bugs']",
  '',
  'if (FEATURES.length > 10 * TODOS.length) { release(); }'
].join('\n');

render(<Editor code={WELCOME_CODE} />, document.querySelector('#editor'));
