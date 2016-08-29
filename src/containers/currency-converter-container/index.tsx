// lib imports
import * as React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// components imports
import { updateBaseCurrency, updateTargetCurrency } from '../../reducers/currency-converter-reducer';
import * as CurrencyRatesService from '../../services/fixer/currency-rates';
import { CurrencyConverter } from './components/currency-converter';

interface IProps {
  currencyConverter: any;
  currencyRates: any;
  actions: any;
}

interface IState {
}

export class CurrencyConverterContainer extends React.Component<IProps, IState> {

  updateBaseCurrency = (newCurrency: string) => {
    console.log('update base currency');
  }

  updateTargetCurrency = (newCurrency: string) => {
    console.log('update target currency');
  }

  render() {
    console.log(this.props);
    if (this.props.currencyConverter == null) return null;
    const { currencies, baseCurrency, targetCurrency, baseValue, targetValue } = this.props.currencyConverter;

    return (
      <section className="">
        <CurrencyConverter currencies={currencies}
          baseCurrency={baseCurrency} targetCurrency={targetCurrency}
          onBaseCurrencyChange={this.updateBaseCurrency}
          onTargetCurrencyChange={this.updateTargetCurrency}
          baseValue={baseValue} targetValue={targetValue} />
      </section>
    );
  }
}

function mapStateToProps(state) {
  return {
    currencyConverter: state.currencyConverter,
    currencyRates: state.currencyRates
  };
}

function mapDispatchToProps(dispatch) {
  const actions = {
    updateBaseCurrency,
    updateTargetCurrency
  };

  return {
    actions: bindActionCreators(actions, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CurrencyConverterContainer);
