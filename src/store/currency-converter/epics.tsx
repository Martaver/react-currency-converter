import 'rxjs/add/operator/map';
import { combineEpics, Epic } from 'redux-observable';
// import { returntypeof } from 'react-redux-typescript';

import { RootState, Action } from '../index';
import { actionCreators } from './reducer';
import { convertValueWithBaseRateToTargetRate } from './utils';
import * as currencyConverterSelectors from './selectors';
import * as currencyRatesSelectors from '../currency-rates/selectors';
// type Action =
//   { type: 'changeBaseCurrency'; payload: string; } |
//   { type: 'changeTargetCurrency'; payload: string; } |
//   { type: 'changeBaseValue'; payload: string; } |
//   { type: 'changeTargetValue'; payload: number; };

// function ofType<A extends { type: T }, T extends string, K extends T>(
//   obj: A, key: K,
// ): obj is A[] {
//   return obj && obj.type === key;
// }
// const testObj: Action = {} as any;
// if (ofType(testObj, 'changeBaseCurrency')) {
//   // TypeScript know that testObj has the property name
//   console.log(testObj.type);
// }

// Epics - handling side effects of actions
const changeCurrencyEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(
    actionCreators.changeBaseCurrency.type,
    actionCreators.changeTargetCurrency.type,
  ).map((action: any): Action => actionCreators.updateCurrencyConverterState({
    targetValue: convertValueWithBaseRateToTargetRate(
      currencyConverterSelectors.getBaseValue(store.getState()),
      currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
    ),
  }));

// TODO: ofType should return limited types Record
const changeBaseValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(actionCreators.changeBaseValue.type)
    .map((action: any): Action => actionCreators.updateCurrencyConverterState({
      targetValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
        currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
      ),
    }));

const changeTargetValueEpic: Epic<Action, RootState> = (action$, store) =>
  action$.ofType(actionCreators.changeTargetValue.type)
    .map((action: any): Action => actionCreators.updateCurrencyConverterState({
      baseValue: convertValueWithBaseRateToTargetRate(
        action.payload,
        currencyRatesSelectors.getTargetCurrencyRate(store.getState()),
        currencyRatesSelectors.getBaseCurrencyRate(store.getState()),
      ),
    }));

export const epics = combineEpics(
  changeCurrencyEpic, changeBaseValueEpic, changeTargetValueEpic,
);
