// style imports
import './main.css!';
// lib imports
import * as React from 'react';
// components imports
import * as AppUtils from '../app-utils';
import * as FixerService from '../services/fixer/index';
import { AppStore } from '../stores/app-store';
import { CurrencyConverter } from '../components/currency-converter';
import { CurrencyConverterHeader } from '../components/currency-converter-header';
import { CurrencyValuationChange } from '../components/currency-valuation-change';

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
    this.props.storage.save(this.state);
  }

  componentWillMount() {
    this.fetchPredefinedRates();
    this.fetchCustomRates(this.state.selectedStartDate, this.state.selectedEndDate);
  }

  async fetchPredefinedRates(newPeriod?) {
    // showing loading indicator
    // TODO: add opacity transition to avoid flickering
    this.setState({
      predefinedChangeValue: LOADING_PLACEHOLDER,
      predefinedChangePercent: LOADING_PLACEHOLDER
    });

    // calculate date fo valuation change
    const days = newPeriod ? newPeriod : parseInt(this.state.selectedPeriod, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    // need to use base currency and use target for calculation
    const changeCalculationResults = await this.calculateValueAndPercentGrowth(startDate, new Date());

    // updating results
    this.setState({
      predefinedChangeValue: changeCalculationResults.change.toFixed(4),
      predefinedChangePercent: changeCalculationResults.change.toFixed(3)
    });
  }

  async fetchCustomRates(selectedStartDate, selectedEndDate) {
    // showing loading indicator
    this.setState({
      customChangeValue: LOADING_PLACEHOLDER,
      customChangePercent: LOADING_PLACEHOLDER
    });

    // calculate date fo valuation change
    const startDate = selectedStartDate ? new Date(selectedStartDate) : new Date();
    const endDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
    // need to use base currency and use target for calculation
    const changeCalculationResults = await this.calculateValueAndPercentGrowth(startDate, endDate);

    // updating results
    this.setState({
      customChangeValue: changeCalculationResults.change.toFixed(4),
      customChangePercent: changeCalculationResults.change.toFixed(3)
    });
  }

  async calculateValueAndPercentGrowth(startDate: Date, endDate: Date) {
    const baseCurrency = this.state.fromCurrency;
    const targetCurrency = this.state.toCurrency;

    let results = await Promise.all([
      await FixerService.getByDate(startDate, baseCurrency),
      await FixerService.getByDate(endDate, baseCurrency)
    ]);
    const oldestRate = results[0].rates[targetCurrency];
    const latestRate = results[1].rates[targetCurrency];
    // simple caluclation of growth
    const change = latestRate - oldestRate;
    // claculation of percent growth
    const changePercent = (change * 100) / latestRate;

    AppUtils.logToConsole(oldestRate, latestRate, change, changePercent);
    return {
      change: change,
      changePercent: changePercent
    };
  }


  handlePredefinedPeriodChange = (event) => {
    const newSelectedPeriod = event.target.value;
    this.fetchPredefinedRates(newSelectedPeriod);
    this.setState({ selectedPeriod: newSelectedPeriod });
  }

  handleCalendarStartDateChange = (newStartDate: string) => {
    const dateObject = new Date(newStartDate);
    this.fetchCustomRates(dateObject, this.state.selectedEndDate);
    this.setState({ selectedStartDate: newStartDate });
  }

  handleCalendarEndDateChange = (newEndDate: string) => {
    const dateObject = new Date(newEndDate);
    this.fetchCustomRates(this.state.selectedStartDate, dateObject);
    this.setState({ selectedEndDate: newEndDate });
  }

  handleFromCurrencyChange = (newCurrency: string) => {
    this.fetchPredefinedRates();
    this.fetchCustomRates(this.state.selectedStartDate, this.state.selectedEndDate);
    this.setState({ fromCurrency: newCurrency });
  }

  handleToCurrencyChange = (newCurrency: string) => {
    this.fetchPredefinedRates();
    this.fetchCustomRates(this.state.selectedStartDate, this.state.selectedEndDate);
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
