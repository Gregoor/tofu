import { css } from 'emotion';

const codeFontSize = css`
  font-size: 13.3333px;
`;

const action = css`
  display: flex;
  justify-content: space-between;
  ${codeFontSize};
  margin: 5px 0;
`;

const actionBar = css`
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-left: none;
  padding: 10px;
  min-width: 170px;
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

const box = css`
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-right: none;
  display: flex;
  flex-direction: row;
`;

const editor = css`
  display: flex;
  justify-content: center;
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

const lineNumbers = css`
  //margin-right: 15px;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  text-align: right;
  ${codeFontSize};
  color: lightgrey;
  user-select: none;
`;

const textArea = css`
  border: none;
  padding: 0;
  display: block;
  resize: none;
  outline: none;
  overflow: hidden;
`;

const textAreaWrapper = css`
  padding: 20px 20px 20px 30px;
  display: flex;
  flex-direction: row;
  background: white;
`;

export default {
  action,
  actionBar,
  actionSection,
  box,
  editor,
  handle,
  key,
  lineNumbers,
  textArea,
  textAreaWrapper
};
