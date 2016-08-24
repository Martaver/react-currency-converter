import * as React from 'react';
import {CurrencyConverterContainer} from '../containers/currency-converter-container/index';
import { PageHeader } from '../components/index';

export function CurrencyConverterPage() {
  return (
    <div>
      <PageHeader title="Currency Converter" />
      <CurrencyConverterContainer />
    </div>
  );
};
