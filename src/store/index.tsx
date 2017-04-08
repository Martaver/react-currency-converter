import { returntypeof } from 'react-redux-typescript';
import { combineReducers, createStore, compose, applyMiddleware } from 'redux';
import { combineEpics, createEpicMiddleware } from 'redux-observable';

declare const window: Window & { devToolsExtension: any, __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any };

import {
  reducer as currencyRatesReducer, State as CurrencyRatesState,
  actionCreators as currencyRatesActionCreators,
} from './currency-rates/reducer';
import {
  reducer as currencyConverterReducer, State as CurrencyConverterState,
  actionCreators as currencyConverterActionCreators,
} from './currency-converter/reducer';
import { epics as currencyConverterEpics } from './currency-converter/epics';

export type RootState = {
  routing: any;
  currencyRates: CurrencyRatesState;
  currencyConverter: CurrencyConverterState;
};

const actionCreators = {
  ...currencyRatesActionCreators,
  ...currencyConverterActionCreators,
};
const actions = Object.values(actionCreators).map(returntypeof);
export type Action = typeof actions[number];

const rootReducer = combineReducers<RootState>({
  currencyConverter: currencyConverterReducer,
  currencyRates: currencyRatesReducer,
});

// rehydrating state on app start: implement here...
const recoverState = (): RootState => ({} as RootState);

const rootEpic = combineEpics(
  currencyConverterEpics,
);
const epicMiddleware = createEpicMiddleware(rootEpic);
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// store singleton instance
export const store = createStore(
  rootReducer,
  recoverState(),
  composeEnhancers(applyMiddleware(epicMiddleware)),
);
