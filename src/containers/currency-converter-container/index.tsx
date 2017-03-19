import * as React from 'react';
import { connect } from 'react-redux';
import { returntypeof } from 'react-redux-typescript';

import { RootState } from '../../store';
import { ActionCreators } from '../../store/currency-converter/reducer';
import * as CurrencyRatesSelectors from '../../store/currency-rates/selectors';
import { CurrencyConverter } from './components/currency-converter';

const mapStateToProps = (state: RootState) => ({
  currencies: CurrencyRatesSelectors.getCurrencies(state),
  currencyConverter: state.currencyConverter,
});
const dispatchToProps = {
  changeBaseCurrency: ActionCreators.ChangeBaseCurrency.create,
  changeTargetCurrency: ActionCreators.ChangeTargetCurrency.create,
  changeBaseValue: ActionCreators.ChangeBaseValue.create,
  changeTargetValue: ActionCreators.ChangeTargetValue.create,
};

const stateProps = returntypeof(mapStateToProps);
type Props = typeof stateProps & typeof dispatchToProps;
type State = {};

class CurrencyConverterContainer extends React.Component<Props, State> {
  render() {
    const {
      baseCurrency, targetCurrency, baseValue, targetValue,
    } = this.props.currencyConverter;
    const {
      currencies, changeBaseCurrency, changeBaseValue, changeTargetCurrency, changeTargetValue,
    } = this.props;

    return (
      <article>
        <header>Currency Converter</header>

        <section className="u-centered">
          <p>
            Example application to showcase TypeScript patterns used in React & Redux projects.
          </p>
          <p>
            To learn more about usefull TypeScript Patterns in React & Redux Apps go here:<br />
            <a href="https://github.com/piotrwitek/react-redux-typescript-patterns/">React / Redux / TypeScript Patterns</a>
          </p>
          <p>
            Async Flows are handled using <a href="https://github.com/redux-observable/redux-observable/">redux-observable</a>
          </p>
        </section>

        <section className="u-letter-box--xlarge">
          <CurrencyConverter currencies={currencies}
            baseCurrency={baseCurrency} targetCurrency={targetCurrency}
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
