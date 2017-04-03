import 'rxjs/add/operator/map';
import { combineEpics, Epic } from 'redux-observable';
// import { returntypeof } from 'react-redux-typescript';

import { RootState } from '../index';
import { ActionCreators, Action } from './reducer';
import { convertValueWithBaseRateToTargetRate } from './utils';
import * as CurrencyConverterSelectors from './selectors';
import * as CurrencyRatesSelectors from '../currency-rates/selectors';

// Epics - handling side effects of actions
const changeCurrencyEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(
    ActionCreators.ChangeBaseCurrency.type,
    ActionCreators.ChangeTargetCurrency.type,
  ).map((action): Action => ActionCreators.UpdateCurrencyConverterState({
    targetValue: convertValueWithBaseRateToTargetRate(
      CurrencyConverterSelectors.getBaseValue(store.getState()),
      CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
    ),
  }));

const changeBaseValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(ActionCreators.ChangeBaseValue.type)
    .map((action): Action => ActionCreators.UpdateCurrencyConverterState({
      targetValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
        CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
      ),
    }));

const changeTargetValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(ActionCreators.ChangeTargetValue.type)
    .map((action): Action => ActionCreators.UpdateCurrencyConverterState({
      baseValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
        CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      ),
    }));

export const epics = combineEpics(
  changeCurrencyEpic, changeBaseValueEpic, changeTargetValueEpic,
);
