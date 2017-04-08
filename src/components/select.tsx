import * as React from 'react';

type Props = {
  options: string[],
  value: string,
  onChange: (value: string) => void,
};

const Select: React.StatelessComponent<Props> =
  ({ options = [], value, onChange }) => {
    const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(ev.target.value);
    };

    return (
      <select
        className="c-field u-xlarge"
        value={value}
        onChange={handleChange}
      >
        {options.map(currency =>
          <option key={currency}>{currency}</option>,
        )}
      </select>
    );
  };

export default Select;
