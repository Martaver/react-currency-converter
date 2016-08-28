// lib imports
import * as React from 'react';
import Money from 'money';

import { formatMoney, isInputFocused, isNotValidCurrency } from '../../../utils/index';
import { CurrencySelect } from './currency-select';
import { CurrencyInput } from './currency-input';

interface LocalProps {
  currencies?: Object;
  baseCurrency: string;
  targetCurrency: string;
  onBaseCurrencyChange: (newCurrency: string) => void;
  onTargetCurrencyChange: (newCurrency: string) => void;
  baseValue?: string;
  targetValue?: string;
}

interface LocalState {
  /** target value - calculated */
  toValue?: string;
}

export class CurrencyConverter extends React.Component<LocalProps, LocalState> {
  state: LocalState = {
    toValue: ''
  };

  componentDidUpdate(prevProps, prevState) {
    // local storage service save
  }


  render(): JSX.Element {
    const { currencies, baseCurrency, targetCurrency, baseValue, targetValue,
      onBaseCurrencyChange, onTargetCurrencyChange } = this.props;

    return (
      <div className="o-grid o-grid--small-full o-grid--medium-full">
        <div className="o-grid__cell">
          <CurrencySelect
            currencies={currencies}
            selectedCurrency={baseCurrency}
            onSelect={onBaseCurrencyChange}
            />
          <CurrencyInput
            value={baseValue}
            onChange={onBaseCurrencyChange}
            />
        </div>
        <div className="o-grid__cell">
          <CurrencySelect
            currencies={currencies}
            selectedCurrency={targetCurrency}
            onSelect={onTargetCurrencyChange}
            />
          <CurrencyInput
            value={targetValue}
            onChange={onTargetCurrencyChange}
            />
        </div>
      </div>
    );
  }
}
