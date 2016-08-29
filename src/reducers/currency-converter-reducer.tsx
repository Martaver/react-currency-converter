import { createAction } from 'redux-actions';

// Action Types - LOAD, CREATE, UPDATE, REMOVE
export const UPDATE_BASE_CURRENCY = 'currencyConverter/UPDATE_BASE_CURRENCY';
export const UPDATE_TARGET_CURRENCY = 'currencyConverter/UPDATE_TARGET_CURRENCY';
export const UPDATE_BASE_VALUE = 'currencyConverter/UPDATE_BASE_VALUE';
export const UPDATE_TARGET_VALUE = 'currencyConverter/UPDATE_TARGET_CURRENCY';

// Action Creators
export const updateBaseCurrency = createAction(UPDATE_BASE_CURRENCY);
export const updateTargetCurrency = createAction(UPDATE_TARGET_CURRENCY);
export const updateBaseValue = createAction(UPDATE_BASE_VALUE);
export const updateTargetValue = createAction(UPDATE_TARGET_VALUE);

// Reducer
const defaultState = {
  baseCurrency: 'PLN',
  targetCurrency: 'SEK',
  baseValue: 100,
  targetValue: 100
};

export default function reducer(state = defaultState, action: FluxStandardAction<any> = {}) {
  switch (action.type) {
    case UPDATE_BASE_CURRENCY:
      return Object.assign({}, state, {
        baseCurrency: action.payload
      });
    case UPDATE_TARGET_CURRENCY:
      return Object.assign({}, state, {
        targetCurrency: action.payload
      });
    case UPDATE_BASE_VALUE:
      return Object.assign({}, state, {
        baseValue: action.payload
      });
    case UPDATE_TARGET_VALUE:
      return Object.assign({}, state, {
        targetValue: action.payload
      });

    default: return state;
  }
}
