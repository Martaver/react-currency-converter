export function isInputFocused(target) {
  return target === document.activeElement;
}

export function isNotValidCurrency(value) {
  if (value && (isNaN(parseFloat(value)) || !/^[0-9,.\s]+$/.test(value))) return true;

  const parts = value.toString().split(".");
  if (parts.length > 2) return true;

  const decimal = parts[1];
  return decimal && decimal.length > 2;
}
