declare module 'cli-table3' {
  interface TableConstructorOptions {
    head?: string[];
    style?: {
      head?: string[];
      border?: string[];
    };
    chars?: {
      top?: string;
      'top-mid'?: string;
      'top-left'?: string;
      'top-right'?: string;
      bottom?: string;
      'bottom-mid'?: string;
      'bottom-left'?: string;
      'bottom-right'?: string;
      left?: string;
      'left-mid'?: string;
      mid?: string;
      'mid-mid'?: string;
      right?: string;
      'right-mid'?: string;
      middle?: string;
    };
    colWidths?: number[];
    wordWrap?: boolean;
  }

  class Table {
    constructor(options?: TableConstructorOptions);
    push(row: (string | number)[]): void;
    toString(): string;
  }

  export default Table;
}
