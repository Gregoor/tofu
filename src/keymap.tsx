import Downshift from 'downshift';
import * as React from 'react';
import { Action } from './actions';
import {
  ActionItem,
  ActionList,
  ActionSection,
  Key,
  Keys,
  SectionTitle
} from './ui';

const Modifiers = ({ children }) =>
  (children || []).map(m => <Key key={m}>{m.substr(0, m.length - 3)}</Key>);

export default function Keymap(props: {
  actions: any;
  onExecute: (action: { execute: Action }) => any;
  onSearchBlur: () => any;
  searchIn: string;
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const { actions, onExecute, onSearchBlur, searchIn, searchRef } = props;

  return actions
    .filter(a => a.title)
    .map(({ title, key, modifiers, children, searchKeys }, i) => (
      <ActionSection key={i}>
        <Downshift
          defaultHighlightedIndex={0}
          onChange={selection =>
            onExecute(children.find(a => a.name == selection))
          }
        >
          {({
            getInputProps,
            getItemProps,
            getLabelProps,
            getMenuProps,
            inputValue,
            highlightedIndex
          }) => (
            <div>
              {searchIn == title ? (
                <input
                  {...getInputProps({
                    type: 'text',
                    placeholder: `Search "${title}"`,
                    ref: searchRef,
                    onBlur: onSearchBlur
                  })}
                />
              ) : (
                <SectionTitle>
                  {title}
                  <div>
                    {searchKeys && (
                      <div>
                        <Modifiers>{searchKeys.modifiers}</Modifiers>
                        {searchKeys.key && <Key>{searchKeys.key}</Key>}
                      </div>
                    )}
                    <div>
                      <Modifiers>{modifiers}</Modifiers>
                      {key && <Key>{key}</Key>}
                    </div>
                  </div>
                </SectionTitle>
              )}
              <ActionList {...getMenuProps()}>
                {children
                  .filter(
                    a =>
                      searchIn != title ||
                      a.name.toLowerCase().includes(inputValue.toLowerCase())
                  )
                  .map((action, i) => {
                    const keys = [];
                    if (action.key) {
                      keys.push(action.key);
                    }
                    if (action.codes) {
                      keys.push(
                        ...action.codes.map(
                          code => ({ Comma: ',' }[code] || code)
                        )
                      );
                    }
                    return (
                      <ActionItem
                        {...getItemProps({
                          key: i,
                          item: action.name
                        })}
                        highlighted={searchIn == title && highlightedIndex == i}
                      >
                        <div>{action.name}</div>
                        <Keys>
                          {keys.map(key => (
                            <Key key={key}>
                              {{
                                ArrowLeft: '⬅',
                                ArrowRight: '➡',
                                ArrowDown: '⬇',
                                ArrowUp: '⬆'
                              }[key] || key}
                            </Key>
                          ))}
                        </Keys>
                      </ActionItem>
                    );
                  })}
              </ActionList>
            </div>
          )}
        </Downshift>
      </ActionSection>
    ));
}
