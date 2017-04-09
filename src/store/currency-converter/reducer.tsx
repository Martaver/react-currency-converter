import { createActionCreator } from '../action-creator';
import { cachedResponse } from '../../services/fixer/fixtures';

import { Action } from '../index';

const INITIAL_BASE_CURRENCY = cachedResponse.base;
const INITIAL_TARGET_CURRENCY = Object.keys(cachedResponse.rates)[0];
const INITIAL_BASE_VALUE = 100;
const INITIAL_TARGET_VALUE =
  (cachedResponse.rates[INITIAL_TARGET_CURRENCY] * INITIAL_BASE_VALUE);

// Action Creators
export const actionCreators = {
  changeBaseCurrency: createActionCreator('CHANGE_BASE_CURRENCY', (p: string) => p),
  changeTargetCurrency: createActionCreator('CHANGE_TARGET_CURRENCY', (p: string) => p),
  changeBaseValue: createActionCreator('CHANGE_BASE_VALUE', (p: string) => p),
  changeTargetValue: createActionCreator('CHANGE_TARGET_VALUE', (p: string) => p),
};

// State
export type State = Readonly<{
  baseCurrency: string,
  targetCurrency: string,
  baseValue: string,
  targetValue: string,
}>;
const initialState: State = {
  baseCurrency: INITIAL_BASE_CURRENCY,
  targetCurrency: INITIAL_TARGET_CURRENCY,
  baseValue: INITIAL_BASE_VALUE.toString(),
  targetValue: INITIAL_TARGET_VALUE.toString(),
};

// Reducer
export const reducer = (state: State = initialState, action: Action): State => {
  let partialState: Partial<State> | undefined;

  if (action.type === actionCreators.changeBaseCurrency.type) {
    partialState = { baseCurrency: action.payload };
  }
  if (action.type === actionCreators.changeTargetCurrency.type) {
    partialState = { targetCurrency: action.payload };
  }
  if (action.type === actionCreators.changeBaseValue.type) {
    partialState = { baseValue: action.payload };
  }
  if (action.type === actionCreators.changeTargetValue.type) {
    partialState = { targetValue: action.payload };
  }

  return partialState != null ? { ...state, ...partialState } : state;
};
