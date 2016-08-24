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

declare module "money" {
  const lib: any;
  export default lib;
}

declare module "accounting" {
  const lib: any;
  export default lib;
}

declare module "csjs" {
  const lib: any;
  export default lib;
}
