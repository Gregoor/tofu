import * as React from 'react';
import { render } from 'react-dom';
import styled from 'styled-components';
import Editor from './editor';
import { Key, Keyword } from './ui';

const Card = styled.section`
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  padding: 20px;
  max-width: 600px;
  background: white;
  font-family: 'Open Sans', sans-serif;
`;

const Spacer = styled.div`
  margin-bottom: 20px;
`;

const WELCOME_CODE = [
  "const FEATURES = ['Edit code with few keystrokes', 'No syntax errors', 'Formatted code, no action required']",
  "const TODOS = ['Support all the JS language features', 'Squash all dem bugs', 'Make it speedy']",
  '',
  'if (FEATURES.length > 10 * TODOS.length) { release(); }'
].join('\n');

render(
  <>
    <Editor code={WELCOME_CODE} />

    <Spacer />

    <Card>
      <h3 style={{ marginTop: 0 }}>What is this?</h3>
      <p>
        Tofu is a code editor that frees you from making meaningless changes to
        your code, that is you don't have to manage syntax or code style. Thus
        common keys can trigger more meaningful actions. Here are a few
        examples:
      </p>
      <ul>
        <li>
          Cursor keys only take you to places where you can make meaningful
          edits.
        </li>
        <li>
          Switching between <Keyword>const</Keyword>/<Keyword>let</Keyword>{' '}
          declaration requires only a single keypress.
        </li>
        <li>
          Putting a space after <Keyword>if</Keyword> always creates a complete
          if-block (as that is the only syntactically valid option). Other
          keywords behave similarly.
        </li>
        <li>
          <Key>Enter</Key> always creates a new line underneath. Compare that to
          other editors, where Enter either breaks syntax or code style (unless
          you're already at the start/end of a line).
        </li>
      </ul>
    </Card>

    {/*<Spacer />

    <Card>
      <h3 style={{ marginTop: 0 }}>Try it!</h3>
      <p>
        Embed some sort of quiz here, that shows how Tofu fares when adding code
        with changing requirements. I.e. don't just make people write code, make
        people rewrite code.
      </p>
    </Card>*/}

    <Spacer />

    <Card>
      <h3 style={{ marginTop: 0 }}>Links</h3>
      <ul>
        <li>
          <a href="https://github.com/Gregoor/tofu">Source</a>
        </li>
        <li>
          <a href="https://github.com/Gregoor/tofu/issues">Issues</a>
        </li>
        <li>
          <a href="https://gregoor.github.io/syntactor/">Syntactor</a> - My
          previous attempt at tackling this
        </li>
        <li>
          <a href="https://medium.com/@grgtwt/code-is-not-just-text-1082981ae27f">
            Code is not just text
          </a>{' '}
          - A blog post I wrote in early 2017, lining out my thinking at the
          time about code editor
        </li>
      </ul>
    </Card>
  </>,
  document.querySelector('#root')
);
