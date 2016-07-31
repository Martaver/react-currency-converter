declare const System: any;

// example external ES Module declaration

interface IFixerServiceResponse {
  base: string;
  date: string;
  rates: Object;
}

declare module "money" {
  const lib: any;
  export default lib;
}

declare module "accounting" {
  const lib: any;
  export default lib;
}
