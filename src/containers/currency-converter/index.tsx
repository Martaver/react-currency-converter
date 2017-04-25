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
const dispatchProps = {
  changeBaseCurrency: actionCreators.changeBaseCurrency,
  changeBaseValue: actionCreators.changeBaseValue,
  changeTargetCurrency: actionCreators.changeTargetCurrency,
  changeTargetValue: actionCreators.changeTargetValue,
};

const stateProps = returntypeof(mapStateToProps);
type Props = typeof stateProps & typeof dispatchProps;

class CurrencyConverterContainer extends React.Component<Props, {}> {
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
            Example application teaching how to correctly use TypeScript in React & Redux projects.
          </p>
          <p>
            Learn more about static typing with TypeScript in "React & Redux" apps here:<br />
            <a
              href="https://github.com/piotrwitek/react-redux-typescript-guide/"
            >
              A comprehensive guide to static typing "React & Redux" apps using TypeScript
            </a>
          </p>
          <p>
            Async Flows are handled using <a
              href="https://github.com/redux-observable/redux-observable/"
            >
              redux-observable
            </a>
          </p>
        </section>

        <section className="u-letter-box--xlarge">
          <CurrencyConverter
            currencies={currencies}
            baseCurrency={baseCurrency}
            targetCurrency={targetCurrency}
            baseValue={baseValue}
            targetValue={targetValue}
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

// tslint:disable-next-line:no-default-export
export default connect(mapStateToProps, dispatchProps)(CurrencyConverterContainer);
