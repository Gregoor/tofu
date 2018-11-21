import { css, injectGlobal } from 'emotion';

injectGlobal`
  ::selection {
    background: yellow;
  }
`;

const borderRadius = '10px';

const font = css`
  font-family: 'Roboto Mono', monospace;
`;

const codeFontSize = css`
  font-size: 13.3333px;
`;

const action = css`
  display: flex;
  justify-content: space-between;
  border: none;
  margin: 5px 0;
  padding: 0;
  width: 100%;
  ${font};
  ${codeFontSize};
  background: none;
  cursor: pointer;

  &:hover {
    font-weight: bold;
  }
`;

const actionBar = css`
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0 ${borderRadius} ${borderRadius} 0;
  border-left: none;
  padding: 20px;
  padding-right: 30px;
  min-width: 230px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  height: fit-content;
  display: flex;
  flex-direction: column;
  background: white;

  h4 {
    margin: 0;
    display: flex;
    justify-content: space-between;
  }
`;

const actionSection = css`
  margin-bottom: 5px;
`;

const editor = css`
  display: flex;
  justify-content: center;
  ${font};
`;

const flaskContainer = css`
  border-radius: ${borderRadius} 0 0 ${borderRadius};
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-right: none;
  display: flex;
  flex-direction: row;
  background: white;

  .codeflask.codeflask {
    position: relative;
    width: initial;
    height: initial;
  }
  
  .codeflask textarea {
    position: static;
  }
  
  .codeflask pre {
    position: absolute;
  }
  
  .keyword {
    font-weight: bold;
  }
`;

const handle = css`
  border-right: 2px dashed rgba(0, 0, 0, 0.1);
  width: 8px;
  background: white;
  cursor: col-resize;
  user-select: none;
`;

const key = css`
  border: 1px solid grey;
  padding: 0 4px;
  ${codeFontSize};
  font-weight: normal;
`;

const keys = css`
  display: flex;
  flex-direction: row;

  & > :nth-child(2n) {
    margin-left: 5px;
  }
`;

export default {
  action,
  actionBar,
  actionSection,
  editor,
  flaskContainer,
  handle,
  key,
  keys
};
