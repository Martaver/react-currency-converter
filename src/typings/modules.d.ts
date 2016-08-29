// System
type Global = {};
type System = { global: Global, production: boolean };
declare const System: System;

declare module '*!json' {
  const def: any;
  export default def;
}

declare module 'es6-promise' {
  const def: any;
  export default def;
}

declare module 'money' {
  const lib: any;
  export default lib;
}

declare module 'accounting' {
  const lib: any;
  export default lib;
}

declare module 'csjs' {
  const lib: any;
  export default lib;
}

declare module 'insert-css' {
  const lib: any;
  export default lib;
}

declare module 'seamless-immutable' {
  interface IImmutableArray {
    asMutable(): any[];
  }
  function Immutable(array: any[]): IImmutableArray;

  interface IImmutableObject {
    from(object: Object): IImmutableObject;
    merge(obj: Object): IImmutableObject;
    without(key: string | string[], ...restKeys: string[]): IImmutableObject;
    asMutable(): Object;
  }
  function Immutable(object: Object): IImmutableObject;

  export default Immutable;
}
