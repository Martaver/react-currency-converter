import { createAction } from 'redux-actions';

// Actions - LOAD, CREATE, UPDATE, REMOVE
export const UPDATE_BASE_CURRENCY = 'currencyConverter/UPDATE_BASE_CURRENCY';
export const UPDATE_TARGET_CURRENCY = 'currencyConverter/UPDATE_TARGET_CURRENCY';

const defaultState = {
  currencies: {
    'PLN': 1,
    'SEK': 1.4782
  },
  baseCurrency: 'PLN',
  targetCurrency: 'SEK',
  baseValue: 100,
  targetValue: 100
};

// Reducer
export default function reducer(state = defaultState, action: FluxStandardAction<any> = {}) {
  switch (action.type) {
    case UPDATE_BASE_CURRENCY:
      return Object.assign(
        {},
        state,
        { baseCurrency: action.payload }
      );
    case UPDATE_TARGET_CURRENCY:
      return Object.assign(
        {},
        state,
        { targetCurrency: action.payload }
      );

    default: return state;
  }
}

// Action Creators
export const updateBaseCurrency = createAction(UPDATE_BASE_CURRENCY);

export const updateTargetCurrency = createAction(UPDATE_TARGET_CURRENCY);
