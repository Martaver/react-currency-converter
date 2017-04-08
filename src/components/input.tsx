import * as React from 'react';

type Props = {
  value: string,
  onChange: (value: string) => void,
};

const Component: React.StatelessComponent<Props> = (
  { value, onChange },
) => {
  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    onChange(ev.currentTarget.value);
  };

  return (
    <input
      className="c-field u-xlarge"
      type="text"
      value={value}
      onChange={handleChange}
    />
  );
};

export const Input = Component;
