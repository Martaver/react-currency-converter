// style imports
import './main.css!';
// lib imports
import * as React from 'react';
// components imports
import { AppStore } from '../stores/app-store';
import { CurrencyConverter } from './currency-converter';
import { CurrencyConverterHeader } from './currency-converter-header';
import { CurrencyValuationChange } from './currency-valuation-change';

interface IProps {
  storage: AppStore;
}

interface IState {
  selectedPeriod?: string;
  selectedStartDate?: string;
  selectedEndDate?: string;
  /** base currency */
  fromCurrency?: string;
  /** target currency */
  toCurrency?: string;
}
// App pure component
export class Main extends React.Component<IProps, IState> {
  state: IState = {
    selectedPeriod: this.props.storage.selectedPeriod,
    selectedStartDate: this.props.storage.selectedStartDate,
    selectedEndDate: this.props.storage.selectedEndDate,
    fromCurrency: this.props.storage.fromCurrency,
    toCurrency: this.props.storage.toCurrency,
  };

  componentDidUpdate(prevProps, prevState) {
    console.log('save main state');
    this.props.storage.save(this.state);
  }

  componentWillMount() {
    // console.log('main mounted!');
  }

  handleOnSelect = (event) => {
    const newSelectedPeriod = event.target.value;
    console.log(newSelectedPeriod);
    this.setState({ selectedPeriod: newSelectedPeriod });
  }

  handleCalendarStartDateChange = (newStartDate: string) => {
    console.log(newStartDate);
    this.setState({ selectedStartDate: newStartDate });
  }

  handleCalendarEndDateChange = (newEndDate: string) => {
    console.log(newEndDate);
    this.setState({ selectedEndDate: newEndDate });
  }

  handleFromCurrencyChange = (newCurrency: string) => {
    console.log(newCurrency);
    this.setState({ fromCurrency: newCurrency });
  }

  handleToCurrencyChange = (newCurrency: string) => {
    console.log(newCurrency);
    this.setState({ toCurrency: newCurrency });
  }

  render() {

    const value = 0.004;

    return (
      <div className="o-container o-container--medium c-text">

        <CurrencyConverterHeader />

        <CurrencyConverter storage={this.props.storage}
        fromCurrency={this.state.fromCurrency} toCurrency={this.state.toCurrency}
        onFromCurrencyChange={this.handleFromCurrencyChange}
        onToCurrencyChange={this.handleToCurrencyChange} />

        <div className="o-grid o-grid--small-full o-grid--medium-full">
          <div className="o-grid__cell u-letter-box--small">
            <CurrencyValuationChange value={value} onChange={this.handleOnSelect}
              selectedPeriod={this.state.selectedPeriod}
              fromCurrency={this.state.fromCurrency} toCurrency={this.state.toCurrency}
              />
          </div>
          <div className="o-grid__cell u-letter-box--small">
            <CurrencyValuationChange value={-value} type={"Calendar"}
              onCalendarStartDateChange={this.handleCalendarStartDateChange}
              onCalendaEndDateChange={this.handleCalendarEndDateChange}
              fromCurrency={this.state.fromCurrency} toCurrency={this.state.toCurrency}
              selectedStartDate={this.state.selectedStartDate}
              selectedEndDate={this.state.selectedEndDate}
              />
          </div>
        </div>

      </div>
    );
  }
}
