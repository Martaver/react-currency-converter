export function isInputFocused(target: Element) {
  return target === document.activeElement;
}

export function isResponseStatusOk(response: Response) {
  // tslint:disable-next-line:no-magic-numbers
  return (response.status >= 200 && response.status < 300);
}
