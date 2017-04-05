type IFixerServiceResponse = {
  base: string;
  date: string;
  rates: { [key: string]: number };
};
