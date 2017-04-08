import { createActionCreator } from '../action-creator';
import { Action } from '../index';
import { cachedResponse } from '../../services/fixer/fixtures';

const INITIAL_BASE_CURRENCY = cachedResponse.base;
const INITIAL_TARGET_CURRENCY = Object.keys(cachedResponse.rates)[0];
const INITIAL_BASE_VALUE = 100;
const INITIAL_TARGET_VALUE = (cachedResponse.rates[INITIAL_TARGET_CURRENCY] * INITIAL_BASE_VALUE);

// Action Creators
export const actionCreators = {
  changeBaseCurrency: createActionCreator('changeBaseCurrency', (p: string) => p),
  changeTargetCurrency: createActionCreator('changeTargetCurrency', (p: string) => p),
  changeBaseValue: createActionCreator('changeBaseValue', (p: string) => p),
  changeTargetValue: createActionCreator('changeTargetValue', (p: string) => p),
  updateCurrencyConverterState: createActionCreator('updateCurrencyConverterState', (p: Partial<State>) => p),
};

// State
export type State = Readonly<{
  selectedBase: string,
  selectedTarget: string,
  baseValue: string,
  targetValue: string,
}>;
const initialState: State = {
  selectedBase: INITIAL_BASE_CURRENCY,
  selectedTarget: INITIAL_TARGET_CURRENCY,
  baseValue: INITIAL_BASE_VALUE.toString(),
  targetValue: INITIAL_TARGET_VALUE.toString(),
};

// Reducer
export const reducer = (state: State = initialState, action: Action): State => {
  let partialState: Partial<State> | undefined;

  if (action.type === actionCreators.changeBaseCurrency.type) {
    partialState = { selectedBase: action.payload };
  }
  if (action.type === actionCreators.changeTargetCurrency.type) {
    partialState = { selectedTarget: action.payload };
  }
  if (action.type === actionCreators.changeBaseValue.type) {
    partialState = { baseValue: action.payload };
  }
  if (action.type === actionCreators.changeTargetValue.type) {
    partialState = { targetValue: action.payload };
  }
  if (action.type === actionCreators.updateCurrencyConverterState.type) {
    partialState = action.payload;
  }

  return partialState != null ? { ...state, ...partialState } : state;
};
