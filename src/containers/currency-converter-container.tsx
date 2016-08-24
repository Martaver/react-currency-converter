// lib imports
import * as React from 'react';
// components imports
import * as CurrencyRatesService from '../services/fixer/currency-rates';
import { CurrencyConverter } from '../components/currency-converter';
import { CurrencyConverterHeader } from '../components/currency-converter-header';

const LOADING_PLACEHOLDER = "Loading...";
const ERROR_PLACEHOLDER = "Service Offline";

interface IProps {
}

interface IState {
}

export class CurrencyConverterContainer extends React.Component<IProps, IState> {
  state: IState = {
  };

  render() {

    return (
      <div className="o-container o-container--medium c-text">
        <CurrencyConverterHeader />
      </div>
    );
  }
}
