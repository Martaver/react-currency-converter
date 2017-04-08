import { createActionCreator } from '../action-creator';
import { Action } from '../index';
import Cache from '../../services/fixer/cache';

const INITIAL_BASE_CURRENCY = Cache.latest.base;
const INITIAL_TARGET_CURRENCY = Object.keys(Cache.latest.rates)[0];
const INITIAL_BASE_VALUE = 100;
const INITIAL_TARGET_VALUE = (Cache.latest.rates[INITIAL_TARGET_CURRENCY] * INITIAL_BASE_VALUE);

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
  readonly selectedBase: string;
  readonly selectedTarget: string;
  readonly baseValue: string;
  readonly targetValue: string;
};
export const initialState: State = {
  selectedBase: INITIAL_BASE_CURRENCY,
  selectedTarget: INITIAL_TARGET_CURRENCY,
  baseValue: INITIAL_BASE_VALUE.toString(),
  targetValue: INITIAL_TARGET_VALUE.toString(),
};

// Reducer
export default function reducer(state: State = initialState, action: Action): State {
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
}
