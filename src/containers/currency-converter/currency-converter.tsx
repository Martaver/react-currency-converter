import * as React from 'react';

import { CurrencyInputGroup } from './currency-input-group';

type Props = {
  currencies: string[],
  baseCurrency: string,
  targetCurrency: string,
  baseValue: string,
  targetValue: string,
  onBaseCurrencyChange: (payload: string) => void,
  onTargetCurrencyChange: (payload: string) => void,
  onBaseValueChange: (payload: string) => void,
  onTargetValueChange: (payload: string) => void,
};

export class CurrencyConverter extends React.Component<Props, {}> {
  render(): JSX.Element {
    const {
      currencies,
      baseCurrency,
      targetCurrency,
      baseValue,
      targetValue,
      onBaseCurrencyChange,
      onTargetCurrencyChange,
      onBaseValueChange,
      onTargetValueChange,
    } = this.props;

    return (
      <div className="o-grid o-grid--xsmall-full o-grid--small-full o-grid--medium-full">
        <div className="o-grid__cell u-window-box--medium">
          <CurrencyInputGroup
            currencies={currencies}
            currencyType={baseCurrency}
            onCurrencyTypeChange={onBaseCurrencyChange}
            currencyValue={baseValue}
            onCurrencyValueChange={onBaseValueChange}
          />
        </div>

        <div className="o-grid__cell o-grid__cell--width-10 u-letter-box--xlarge u-centered">
          =>
        </div>

        <div className="o-grid__cell u-window-box--medium">
          <CurrencyInputGroup
            currencies={currencies}
            currencyType={targetCurrency}
            onCurrencyTypeChange={onTargetCurrencyChange}
            currencyValue={targetValue}
            onCurrencyValueChange={onTargetValueChange}
          />
        </div>
      </div>
    );
  }
}
