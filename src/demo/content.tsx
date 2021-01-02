import styled from "@emotion/styled";
import * as React from "react";

import { Key, font } from "../ui";

export const Card = styled.section`
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  padding: 20px;
  max-width: 600px;
  width: 100%;
  background: ${({ theme }) => theme.c.cardBg};
  font-family: "Open Sans", sans-serif;
`;

export const CardTitle = styled.h3`
  margin-top: 0;
`;

const Keyword = styled.span`
  font-weight: bold;
  ${font};
`;

export const AboutCard = () => (
  <Card>
    <CardTitle>What is this?</CardTitle>
    <p>
      Tofu is an exploration in fluid code editing. It manages syntax and code
      style for you. Thus keypresses are wholly reserved for meaningful actions:
    </p>
    <ul>
      <li>
        Switching between <Keyword>const</Keyword>/<Keyword>let</Keyword>{" "}
        declaration requires only a single keypress.
      </li>
      <li>
        Putting a space after <Keyword>if</Keyword> always creates a complete
        if-statement (that being the only syntactically valid option since{" "}
        <Keyword>if</Keyword> can't be used as an identifier). Other keywords
        behave similarly.
      </li>
      <li>
        <Key value="Enter" /> always creates a new line underneath. Compare that
        to other editors, where Enter either breaks syntax or code style (unless
        you're already at the start/end of a line).
      </li>
      <li>
        Cursor keys only take you to places where you can make meaningful edits.
      </li>
    </ul>
    <p>
      Tofu is embedded in this very page, you can use it with a set of{" "}
      <a href="#examples">examples</a> in the editor below. At the bottom of the
      page you can read about its <a href="#design">design principles</a> and
      find various <a href="#links">links</a> regarding the project.
    </p>
  </Card>
);

const Spin = styled.span`
  display: inline-block;
  transition: transform 300ms ease-in-out;

  &:hover {
    transform: rotateY(180deg);
  }
`;

export const DesignCard = () => (
  <Card>
    <CardTitle id="design">Design Principles</CardTitle>

    <p>
      These are the base assumptions I am making while developing Tofu. The list
      is ordered by importance, higher principles beat lower ones in conflicting
      situations:
    </p>

    <h4>Meaningless interactions should be replaced by meaningful ones</h4>
    <p>
      This is the core <Spin>tenet</Spin>. Meaningful changes are those that not
      only affect code style and syntax, but program semantics. Any action which
      would result in a meaningless change should be turned into a meaningful
      one.
    </p>

    <h4>Interactions should confirm existing expectations</h4>
    <p>
      Prior text-editing experience creates expectations which Tofu plays into
      by appearing text-like. Its interaction model should confirm them to both
      prevent dissonance and to give people a head-start.
    </p>
    <ul>
      <li>
        Changes should have a textual relationship to the key that was pressed.
      </li>
      <li>
        Additive changes should be reversible with the Backspace and Delete
        keys.
      </li>
    </ul>

    <h4>Every available action should be discoverable in context</h4>
    <p>
      The action panel on the side should show all actions applicable to the
      current context, but only those.
    </p>

    <h4>Entering "raw-mode" should be straightforward</h4>
    <p>
      This is the only principle which <em>might</em> be temporary. If no
      meaningful interaction can be introduced or if the break-out key is
      pressed, Tofu should permit raw text editing.
    </p>
  </Card>
);

export const LinksCard = () => (
  <Card>
    <CardTitle id="links">Links</CardTitle>
    <ul>
      <li>
        <a href="https://github.com/Gregoor/tofu">Repo</a>
      </li>
      <li>
        <a href="https://github.com/Gregoor/tofu/issues">Issues</a>
      </li>
      <li>
        <a href="https://gregoor.github.io/syntactor/">Syntactor</a> - a past
        attempt at solving a smaller problem (JSON editing)
      </li>
      <li>
        <a href="https://dflate.io/code-is-not-just-text">
          Code is not just text
        </a>{" "}
        - A blog post I wrote in early 2017
      </li>
    </ul>
  </Card>
);
