// style imports
import './main.css!';
// lib imports
import * as React from 'react';
// components imports
import * as Services from '../services/index';
import { AppStore } from '../stores/app-store';
import { CurrencyConverter } from './currency-converter';
import { CurrencyConverterHeader } from './currency-converter-header';
import { CurrencyValuationChange } from './currency-valuation-change';

const LOADING_PLACEHOLDER = "loading...";

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
  predefinedChangeValue?: string;
  predefinedChangePercent?: string;
  customChangeValue?: string;
  customChangePercent?: string;
}
// App pure component
export class Main extends React.Component<IProps, IState> {
  state: IState = {
    selectedPeriod: this.props.storage.selectedPeriod,
    selectedStartDate: this.props.storage.selectedStartDate,
    selectedEndDate: this.props.storage.selectedEndDate,
    fromCurrency: this.props.storage.fromCurrency,
    toCurrency: this.props.storage.toCurrency,
    predefinedChangeValue: LOADING_PLACEHOLDER,
    predefinedChangePercent: LOADING_PLACEHOLDER,
    customChangeValue: LOADING_PLACEHOLDER,
    customChangePercent: LOADING_PLACEHOLDER
  };

  componentDidUpdate(prevProps, prevState) {
    console.log('save main state');
    this.props.storage.save(this.state);
  }

  componentWillMount() {
    this.fetchPredefinedRates();
  }

  async fetchPredefinedRates() {
    // running loading indicator
    this.setState({
      predefinedChangeValue: LOADING_PLACEHOLDER,
      predefinedChangePercent: LOADING_PLACEHOLDER
    });

    // calculate date fo valuation change
    const days = parseInt(this.state.selectedPeriod, 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    // need to use base currency and use target for calculation
    const baseCurrency = this.state.fromCurrency;
    const targetCurrency = this.state.toCurrency;

    let results = await Promise.all([
      await Services.getLatest(baseCurrency),
      await Services.getByDate(date, baseCurrency)
    ]);
    const latestRate = results[0].rates[targetCurrency];
    const oldestRate = results[1].rates[targetCurrency];
    // simple caluclation of growth
    const change = latestRate - oldestRate;
    // claculation of percent growth
    const changePercent = (change * 100) / latestRate;

    console.log(oldestRate, latestRate, change, changePercent);

    // updating results
    this.setState({
      predefinedChangeValue: change.toFixed(4),
      predefinedChangePercent: changePercent.toFixed(3)
    });
  }


  handlePredefinedPeriodChange = (event) => {
    const newSelectedPeriod = event.target.value;
    this.fetchPredefinedRates();
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
    this.fetchPredefinedRates();
    this.setState({ fromCurrency: newCurrency });
  }

  handleToCurrencyChange = (newCurrency: string) => {
    this.fetchPredefinedRates();
    this.setState({ toCurrency: newCurrency });
  }

  render() {

    return (
      <div className="o-container o-container--medium c-text">

        <CurrencyConverterHeader />

        <CurrencyConverter storage={this.props.storage}
          fromCurrency={this.state.fromCurrency} toCurrency={this.state.toCurrency}
          onFromCurrencyChange={this.handleFromCurrencyChange}
          onToCurrencyChange={this.handleToCurrencyChange} />

        <div className="o-grid o-grid--small-full o-grid--medium-full">
          <div className="o-grid__cell u-letter-box--small">
            <CurrencyValuationChange changeValue={this.state.predefinedChangeValue}
              changePercent={this.state.predefinedChangePercent}
              onChange={this.handlePredefinedPeriodChange} selectedPeriod={this.state.selectedPeriod}
              fromCurrency={this.state.fromCurrency} toCurrency={this.state.toCurrency}
              />
          </div>
          <div className="o-grid__cell u-letter-box--small">
            <CurrencyValuationChange changeValue={this.state.customChangeValue}
              changePercent={this.state.customChangePercent} type={"Calendar"}
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
