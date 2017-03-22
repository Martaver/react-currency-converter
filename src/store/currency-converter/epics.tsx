import 'rxjs/add/operator/map';
import { combineEpics, ActionsObservable } from 'redux-observable';

import { LightStore } from '../index';
import { ActionCreators, Action } from './reducer';
import { convertValueWithBaseRateToTargetRate } from './utils';
import * as CurrencyConverterSelectors from './selectors';
import * as CurrencyRatesSelectors from '../currency-rates/selectors';

// Epics - handling side effects of actions
const changeCurrencyEpic = (action$: ActionsObservable<Action>, store: LightStore) =>
  action$.ofType(
    ActionCreators.ChangeBaseCurrency.type,
    ActionCreators.ChangeTargetCurrency.type,
  ).map((action: typeof ActionCreators.ChangeBaseCurrency): Action => ({
    type: ActionCreators.UpdateCurrencyConverterState.type,
    payload: {
      targetValue: convertValueWithBaseRateToTargetRate(
        CurrencyConverterSelectors.getBaseValue(store.getState()),
        CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
        CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
      ),
    },
  }));

const changeBaseValueEpic = (action$: any, store: LightStore) =>
  action$.ofType(ActionCreators.ChangeBaseValue.type)
    .map((action: typeof ActionCreators.ChangeBaseValue): Action => ({
      type: ActionCreators.UpdateCurrencyConverterState.type,
      payload: {
        targetValue: convertValueWithBaseRateToTargetRate(
          action.payload,
          CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
          CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
        ),
      },
    }));

const changeTargetValueEpic = (action$: any, store: LightStore) =>
  action$.ofType(ActionCreators.ChangeTargetValue.type)
    .map((action: typeof ActionCreators.ChangeTargetValue): Action => ({
      type: ActionCreators.UpdateCurrencyConverterState.type,
      payload: {
        baseValue: convertValueWithBaseRateToTargetRate(
          action.payload,
          CurrencyRatesSelectors.getTargetCurrencyRate(store.getState()),
          CurrencyRatesSelectors.getBaseCurrencyRate(store.getState()),
        ),
      },
    }));

export const epics = combineEpics(
  changeCurrencyEpic, changeBaseValueEpic, changeTargetValueEpic,
);
