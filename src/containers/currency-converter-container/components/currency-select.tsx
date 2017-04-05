import * as React from 'react';

type Props = {
  currencies: string[],
  value: string,
  onChange: (newValue: string) => void,
};

export function CurrencySelect({ currencies = [], value, onChange }: Props) {
  const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(ev.target.value);
  };

  return (
    <select
      className="c-field u-xlarge"
      value={value}
      onChange={handleChange}
    >
      {currencies.map(currency =>
        <option key={currency}>{currency}</option>,
      )}
    </select>
  );
}
