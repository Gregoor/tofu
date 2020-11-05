import * as React from "react";

import { findActions } from "./actions";
import { CodeWithAST } from "./history";
import { Range } from "./utils";

export default function Keymap({
  codeWithAST,
  cursor,
}: {
  codeWithAST: CodeWithAST;
  cursor: Range;
}) {
  const actions = findActions(codeWithAST, cursor)
    .filter((a) => a.info)
    .map((a) => a.info);

  return (
    <div>
      <em>{cursor.toString()}</em>
      {codeWithAST.error && (
        <div style={{ color: "red" }}>{codeWithAST.error.message}</div>
      )}
      <pre>{JSON.stringify(actions, null, 2)}</pre>
    </div>
  );
  // return actions
  //   .filter((a) => a.title)
  //   .map(({ title, key, modifiers, children, searchKeys }, i) => (
  //     <ActionSection key={i}>
  //       <Downshift
  //         defaultHighlightedIndex={0}
  //         onChange={(selection) =>
  //           onExecute(children.find((a) => a.name == selection))
  //         }
  //       >
  //         {({
  //           getInputProps,
  //           getItemProps,
  //           getLabelProps,
  //           getMenuProps,
  //           inputValue,
  //           highlightedIndex,
  //         }) => (
  //           <div>
  //             {searchIn == title ? (
  //               <input
  //                 {...getInputProps({
  //                   type: "text",
  //                   placeholder: `Search "${title}"`,
  //                   ref: searchRef,
  //                   onBlur: onSearchBlur,
  //                 })}
  //               />
  //             ) : (
  //               <SectionTitle>
  //                 {title}
  //                 <div>
  //                   {searchKeys && (
  //                     <div>
  //                       <Modifiers>{searchKeys.modifiers}</Modifiers>
  //                       {searchKeys.key && <Key>{searchKeys.key}</Key>}
  //                     </div>
  //                   )}
  //                   <div>
  //                     <Modifiers>{modifiers}</Modifiers>
  //                     {key && <Key>{key}</Key>}
  //                   </div>
  //                 </div>
  //               </SectionTitle>
  //             )}
  //             <ActionList {...getMenuProps()}>
  //               {children
  //                 .filter(
  //                   (a) =>
  //                     searchIn != title ||
  //                     a.name.toLowerCase().includes(inputValue.toLowerCase())
  //                 )
  //                 .map((action, i) => {
  //                   const keys = [];
  //                   if (action.key) {
  //                     keys.push(action.key);
  //                   }
  //                   if (action.codes) {
  //                     keys.push(
  //                       ...action.codes.map(
  //                         (code) => ({ Comma: "," }[code] || code)
  //                       )
  //                     );
  //                   }
  //                   return (
  //                     <ActionItem
  //                       {...getItemProps({
  //                         key: i,
  //                         item: action.name,
  //                       })}
  //                       highlighted={searchIn == title && highlightedIndex == i}
  //                     >
  //                       <div>{action.name}</div>
  //                       <Keys>
  //                         {keys.map((key) => (
  //                           <Key key={key}>
  //                             {{
  //                               ArrowLeft: "⬅",
  //                               ArrowRight: "➡",
  //                               ArrowDown: "⬇",
  //                               ArrowUp: "⬆",
  //                             }[key] || key}
  //                           </Key>
  //                         ))}
  //                       </Keys>
  //                     </ActionItem>
  //                   );
  //                 })}
  //             </ActionList>
  //           </div>
  //         )}
  //       </Downshift>
  //     </ActionSection>
  //   ));
}
