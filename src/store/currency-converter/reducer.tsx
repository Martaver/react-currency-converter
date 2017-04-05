import { createActionCreator } from '../action-creator';

import { Action } from '../index';
import { latestResponse } from '../../services/fixer/fixtures';
const INITIAL_BASE_CURRENCY = latestResponse.base;
const INITIAL_TARGET_CURRENCY = Object.entries(latestResponse.rates)[0][0];

// Action Creators
export const actionCreators = {
  changeBaseCurrency: createActionCreator('changeBaseCurrency', (p: string) => p),
  changeTargetCurrency: createActionCreator('changeTargetCurrency', (p: string) => p),
  changeBaseValue: createActionCreator('changeBaseValue', (p: string) => p),
  changeTargetValue: createActionCreator('changeTargetValue', (p: string) => p),
  updateCurrencyConverterState: createActionCreator('updateCurrencyConverterState', (p: Partial<State>) => p),
};

// State
export type State = {
  readonly baseCurrency: string;
  readonly targetCurrency: string;
  readonly baseValue: string;
  readonly targetValue: string;
};
export const initialState: State = {
  baseCurrency: INITIAL_BASE_CURRENCY,
  targetCurrency: INITIAL_TARGET_CURRENCY,
  baseValue: '100',
  targetValue: (latestResponse.rates[INITIAL_TARGET_CURRENCY] * 100).toString(),
};

// Reducer
export default function reducer(state: State = initialState, action: Action): State {
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
  if (action.type === actionCreators.updateCurrencyConverterState.type) {
    partialState = action.payload;
  }

  return partialState != null ? { ...state, ...partialState } : state;
}
