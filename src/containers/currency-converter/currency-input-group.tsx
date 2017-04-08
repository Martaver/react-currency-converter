import * as React from 'react';

import { Input, Select } from '../../components';

type Props = {
  currencies: string[],
  currencyType: string,
  currencyValue: string,
  onCurrencyTypeChange: (payload: string) => void,
  onCurrencyValueChange: (payload: string) => void,
};

const Component: React.StatelessComponent<Props> = (
  { currencies, currencyType, currencyValue, onCurrencyTypeChange, onCurrencyValueChange },
) => {
  return (
    <div className="c-input-group">
      <div className="o-field o-field--fixed" style={{ width: '90px' }}>
        <Select
          options={currencies}
          value={currencyType}
          onChange={onCurrencyTypeChange}
        />
      </div>
      <div className="o-field">
        <Input
          value={currencyValue}
          onChange={onCurrencyValueChange}
        />
      </div>
    </div>
  );
};

export const CurrencyInputGroup = Component;
