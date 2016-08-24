import { createAction } from 'redux-actions';

// Actions - LOAD, CREATE, UPDATE, REMOVE
export const LOAD_CURRENCY_RATES = 'currencyRates/LOAD';
export const LOAD_CURRENCY_RATES_SUCCESS = 'currencyRates/LOAD_SUCCESS';
export const LOAD_CURRENCY_RATES_FAILURE = 'currencyRates/LOAD_FAILURE';

const defaultState = {
  isLoading: false,
  errorMessage: null
};

// Reducer
export default function reducer(state = defaultState, action: FluxStandardAction<any> = {}) {
  switch (action.type) {
    case LOAD_CURRENCY_RATES:
      return Object.assign(
        defaultState,
        state,
        { isFetching: true }
      );
    case LOAD_CURRENCY_RATES_SUCCESS:
      return Object.assign(
        defaultState,
        state,
        { results: action.payload, lastUpdated: Date.now() }
      );
    case LOAD_CURRENCY_RATES_FAILURE:
      return Object.assign(
        defaultState,
        state,
        { errorMessage: action.payload }
      );

    default: return state;
  }
}

// Action Creators
export const loadCurrencyRates = createAction(LOAD_CURRENCY_RATES);

export const loadCurrencyRatesSuccess = createAction(LOAD_CURRENCY_RATES_SUCCESS);

export const loadCurrencyRatesFailure = createAction(LOAD_CURRENCY_RATES_FAILURE);
