export function logToConsole(...restParams: any[]) {
  console.log('>>> LOGGER:', ...restParams);
}

export function logRejection(err: Error) {
  console.log('Request Failed:', err);
};
