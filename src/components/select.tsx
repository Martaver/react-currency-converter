import * as React from 'react';

type Props = {
  options: string[],
  value: string,
  onChange: (value: string) => void,
};

const Component: React.StatelessComponent<Props> = (
  { options = [], value, onChange },
) => {
  const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(ev.target.value);
  };
  const renderOptions = options.map(currency => (
    <option key={currency}>{currency}</option>
  ));

  return (
    <select
      className="c-field u-xlarge"
      value={value}
      onChange={handleChange}
    >
      {renderOptions}
    </select>
  );
};

export const Select = Component;
