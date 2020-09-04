import styled, { css, createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  ::selection {
    background: yellow;
  }
`;

const borderRadius = "10px";

const font = css`
  font-family: "Roboto Mono", monospace;
`;

const codeFontSize = css`
  font-size: 13.3333px;
`;

export const ActionBar = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0 ${borderRadius} ${borderRadius} 0;
  border-left: none;
  padding: 20px;
  padding-right: 30px;
  min-width: 300px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  height: fit-content;
  display: flex;
  flex-direction: column;
  background: white;
`;

export const ActionItem = styled.li<{ highlighted: boolean; hidden: boolean }>`
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
  ${(props) => props.highlighted && "background: yellow;"};
  ${(props) => props.hidden && "display: none;"} &:hover {
    font-weight: bold;
  }
`;

export const ActionList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const ActionSection = styled.div`
  margin-bottom: 5px;
`;

export const Container = styled.div`
  display: flex;
  justify-content: center;
  ${font};
`;

export const CodeWrap = styled.div`
  border-radius: ${borderRadius} 0 0 ${borderRadius};
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-right: none;
  display: flex;
  flex-direction: row;
  background: white;
  overflow: hidden;
  min-width: 300px;
  min-height: 300px;

  .codeflask.codeflask {
    position: relative;
    width: initial;
    height: initial;
    min-width: 600px;
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

export const ResizeHandle = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-left: none;
  border-right: 2px dashed rgba(0, 0, 0, 0.1);
  width: 8px;
  background: white;
  cursor: col-resize;
  user-select: none;
`;

export const SectionTitle = styled.h4`
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const Keys = styled.div`
  display: flex;
  flex-direction: row;

  & > :nth-child(2n) {
    margin-left: 5px;
  }
`;

export const Key = styled.span`
  border: 1px solid grey;
  padding: 0 4px;
  font-weight: normal;
  ${codeFontSize};
  ${font};
`;

export const Keyword = styled.span`
  font-weight: bold;
  ${font};
`;
