import * as React from 'react';
import { connect } from 'react-redux';
import { returntypeof } from 'react-redux-typescript';

import { RootState } from '../../store';
import { actionCreators } from '../../store/currency-converter/reducer';
import * as currencyRatesSelectors from '../../store/currency-rates/selectors';
import { CurrencyConverter } from './currency-converter';

const mapStateToProps = (state: RootState) => ({
  currencies: currencyRatesSelectors.getCurrencies(state),
  currencyConverter: state.currencyConverter,
});
const dispatchToProps = {
  changeBaseCurrency: actionCreators.changeBaseCurrency,
  changeBaseValue: actionCreators.changeBaseValue,
  changeTargetCurrency: actionCreators.changeTargetCurrency,
  changeTargetValue: actionCreators.changeTargetValue,
};

const stateProps = returntypeof(mapStateToProps);
type Props = typeof stateProps & typeof dispatchToProps;
type State = {};

class CurrencyConverterContainer extends React.Component<Props, State> {
  render() {
    const {
      selectedBase, selectedTarget, baseValue, targetValue,
    } = this.props.currencyConverter;
    const {
      currencies, changeBaseCurrency, changeBaseValue, changeTargetCurrency, changeTargetValue,
    } = this.props;

    return (
      <article>
        <header>Currency Converter</header>

        <section className="u-centered">
          <p>
            Example application teaching how to correctly use TypeScript in React & Redux projects.
          </p>
          <p>
            To learn more about TypeScript Guidelines & Patterns
             to help you build bug-free React & Redux Apps, check here:<br />
            <a
              href="https://github.com/piotrwitek/react-redux-typescript-patterns/"
            >React / Redux / TypeScript Patterns</a>
          </p>
          <p>
            Async Flows are handled using <a
              href="https://github.com/redux-observable/redux-observable/"
            >redux-observable</a>
          </p>
        </section>

        <section className="u-letter-box--xlarge">
          <CurrencyConverter currencies={currencies}
            baseCurrency={selectedBase} targetCurrency={selectedTarget}
            baseValue={baseValue} targetValue={targetValue}
            onBaseCurrencyChange={changeBaseCurrency}
            onTargetCurrencyChange={changeTargetCurrency}
            onBaseValueChange={changeBaseValue}
            onTargetValueChange={changeTargetValue}
          />
        </section>
      </article>
    );
  }
}

const decorator = connect(mapStateToProps, dispatchToProps);
export default decorator(CurrencyConverterContainer);
