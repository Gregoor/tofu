import { Cursor } from './move-cursor';

export function spreadCursor(cursor: number | Cursor): [number, number] {
  return Array.isArray(cursor) ? cursor : [cursor, cursor];
}

export function selectNode(ancestor): Cursor {
  return Array.isArray(ancestor)
    ? [ancestor[0].start, ancestor[ancestor.length - 1].end]
    : [ancestor.start, ancestor.end];
}

export const selectName = ({ start, name }) =>
  [start, start + name.length] as [number, number];

export const selectKind = ({ start, kind }) =>
  [start, start + kind.length] as [number, number];
