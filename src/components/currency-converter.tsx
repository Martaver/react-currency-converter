// lib imports
import * as React from 'react';
import Money from 'money';

import { formatMoney, isInputFocused, isNotValidCurrency } from '../utils/index';
import * as CurrencyRatesService from '../services/fixer/currency-rates';
import { CurrencySelect } from './currency-select';
import { CurrencyInput } from './currency-input';

const NUMBERS_LIMIT = 19;

interface LocalProps {
  storage?: any;
  fromCurrency: string;
  toCurrency: string;
  onFromCurrencyChange: (newCurrency: string) => void;
  onToCurrencyChange: (newCurrency: string) => void;
}

interface LocalState {
  /** list of currencies */
  currencies?: Object;
  /** base value */
  fromValue?: string;
  /** target value - calculated on load */
  toValue?: string;
}

export class CurrencyConverter extends React.Component<LocalProps, LocalState> {
  state: LocalState = {
    currencies: JSON.parse(this.props.storage.currencies),
    fromValue: this.props.storage.fromValue,
    toValue: ""
  };

  componentDidUpdate(prevProps, prevState) {
    this.props.storage.save({
      currencies: JSON.stringify(this.state.currencies),
      fromValue: this.state.fromValue
    });
  }

  componentWillMount() {
    this.fetchLatestRates();
  }

  async fetchLatestRates() {
    const data = await CurrencyRatesService.getLatest();
    Money.base = data.base;
    Money.rates = data.rates;

    this.setState({
      currencies: data.rates,
      toValue: this.calculateRateOrEmptyString(
        this.state.fromValue,
        this.props.fromCurrency,
        this.props.toCurrency,
        true
      )
    });
  }

  handleFromCurrencySelect = (node) => {
    const selectedFromCurrency = node.target.value;
    const newToValue = this.calculateRateOrEmptyString(
      this.state.fromValue,
      selectedFromCurrency,
      this.props.toCurrency,
      true
    );
    // TODO: bug przy zmianie

    this.props.onFromCurrencyChange(selectedFromCurrency);
    this.setState({
      toValue: newToValue
    });
  }

  handleToCurrencySelect = (node) => {
    const selectedToCurrency = node.target.value;
    const newToValue = this.calculateRateOrEmptyString(
      this.state.fromValue,
      this.props.fromCurrency,
      selectedToCurrency,
      true
    );

    this.props.onToCurrencyChange(selectedToCurrency);
    this.setState({
      toValue: newToValue
    });
  }

  handleFromValueChange = (node) => {
    let newFromValue = node.target.value;
    // check lenght on formatted value to include delimiters, also checking if lenght has reduced
    // to cover overflow edge case, validate valid currency format
    if (isNotValidCurrency(newFromValue)
      || (formatMoney(newFromValue).length > NUMBERS_LIMIT && newFromValue.length >= this.state.fromValue.length)
    ) return;
    // format input value only when focus is lost because caret position will jump
    if (!isInputFocused(node.target)) {
      newFromValue = formatMoney(newFromValue);
    }

    const newToValue = this.calculateRateOrEmptyString(
      newFromValue,
      this.props.fromCurrency,
      this.props.toCurrency,
      true
    );
    // check lenght of calculated value so do not extend a limit
    if (formatMoney(newToValue).length > NUMBERS_LIMIT) return;

    this.setState({
      fromValue: newFromValue,
      toValue: newToValue
    });
  }

  handleToValueChange = (node) => {
    let newToValue = node.target.value;
    // check lenght on formatted value to include delimiters, also checking if lenght has reduced
    // to cover overflow edge case, validate valid currency formatt
    if (isNotValidCurrency(newToValue)
      || (formatMoney(newToValue).length > NUMBERS_LIMIT && newToValue.length >= this.state.fromValue.length)
    ) return;
    // format input value only when focus is lost because caret position will jump
    if (!isInputFocused(node.target)) {
      newToValue = formatMoney(newToValue);
    }

    const newFromValue = this.calculateRateOrEmptyString(
      newToValue,
      this.props.toCurrency,
      this.props.fromCurrency,
      true
    );
    // check lenght of calculated value so do not extend a limit
    if (formatMoney(newFromValue).length > NUMBERS_LIMIT) return;

    this.setState({
      fromValue: newFromValue,
      toValue: newToValue
    });
  }

  calculateRateOrEmptyString = (fromValue, fromCurrency, toCurrency, format = false) => {
    // have to check if Money library is initialized with data from service or else Throws
    if (Money.base) {
      const value = Money(fromValue)
        .from(fromCurrency)
        .to(toCurrency);

      return format ? formatMoney(value) : value;
    } else {
      return "";
    }
  }

  render(): JSX.Element {

    return (
      <div className="o-grid o-grid--small-full o-grid--medium-full">
        <div className="o-grid__cell">
          <CurrencySelect
            currencies={this.state.currencies}
            selectedCurrency={this.props.fromCurrency}
            onSelect={this.handleFromCurrencySelect}
            />
          <CurrencyInput
            value={this.state.fromValue}
            onChange={this.handleFromValueChange}
            />
        </div>
        <div className="o-grid__cell">
          <CurrencySelect
            currencies={this.state.currencies}
            selectedCurrency={this.props.toCurrency}
            onSelect={this.handleToCurrencySelect}
            />
          <CurrencyInput
            value={this.state.toValue}
            onChange={this.handleToValueChange}
            />
        </div>
      </div>
    );
  }
}
