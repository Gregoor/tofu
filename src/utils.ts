export class Range {
  start: number;
  private readonly _end: null | number;
  constructor(start: number, end: number = null) {
    this.start = start;
    this._end = end;
  }

  get end() {
    return this._end ?? this.start;
  }

  includes(pos: number): boolean {
    return pos >= this.start && pos <= this.end;
  }

  toString = () =>
    this._end == null ? this.start : this.start + " - " + this._end;
}

export type Direction = "LEFT" | "RIGHT" | "UP" | "DOWN" | null;
