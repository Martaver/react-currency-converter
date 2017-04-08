export function logDebug(...restParams: any[]) {
  // tslint:disable-next-line:no-console
  console.debug('[DEBUG]:', ...restParams);
}

export function logError(err: Error) {
  console.error('[ERROR]:', err);
}
