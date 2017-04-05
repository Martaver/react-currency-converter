import * as React from 'react';

type Props = {
  value: string,
  onChange: (newValue: string) => void,
};

export function CurrencyInput({ value = 0, onChange }: Props) {
  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ev.currentTarget.value);
  };

  const handleBlur = (ev: React.FocusEvent<HTMLInputElement>) => {
    onChange(parseFloat(ev.currentTarget.value).toFixed(2));
  };

  return (
    <input
      className="c-field u-xlarge"
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
