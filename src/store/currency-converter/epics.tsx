import 'rxjs/add/operator/map';
import { combineEpics, Epic } from 'redux-observable';

import { RootState, Action } from '../index';
import { actionCreators } from './reducer';
import { convertValueWithBaseRateToTargetRate } from './utils';
import * as currencyConverterSelectors from './selectors';
import * as currencyRatesSelectors from '../currency-rates/selectors';

// Epics - handling side effects of actions
const changeCurrencyEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(
    actionCreators.changeBaseCurrency.type,
    actionCreators.changeTargetCurrency.type,
  ).map((action: any) => actionCreators.updateCurrencyConverterState({
    targetValue: convertValueWithBaseRateToTargetRate(
      currencyConverterSelectors.getBaseValue(store.getState()),
      currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
    ),
  }));

const changeBaseValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(actionCreators.changeBaseValue.type)
    .map((action: any) => actionCreators.updateCurrencyConverterState({
      targetValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
        currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
      ),
    }));

const changeTargetValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(actionCreators.changeTargetValue.type)
    .map((action: any) => actionCreators.updateCurrencyConverterState({
      baseValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
        currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      ),
    }));

export const epics = combineEpics(
  changeCurrencyEpic, changeBaseValueEpic, changeTargetValueEpic,
);
