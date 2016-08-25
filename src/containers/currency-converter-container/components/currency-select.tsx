import * as React from 'react';

export function CurrencySelect({currencies, selectedCurrency, onSelect}) {
  return (
    <div className="">
      <select className="c-choice c-choice--padded" value={selectedCurrency} onChange={onSelect}>
        {
          Object.keys(currencies).map((currencyKey) => {
            return <option key={currencyKey}>{currencyKey}</option>;
          })
        }
      </select>
    </div>
  );
}
