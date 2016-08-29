import { createAction } from 'redux-actions';

// Action Types - LOAD, CREATE, UPDATE, REMOVE
export const LOAD_CURRENCY_RATES = 'currencyRates/LOAD';
export const LOAD_CURRENCY_RATES_SUCCESS = 'currencyRates/LOAD_SUCCESS';
export const LOAD_CURRENCY_RATES_ERROR = 'currencyRates/LOAD_ERROR';

// Action Creators
export const loadCurrencyRates = createAction(LOAD_CURRENCY_RATES);
export const loadCurrencyRatesSuccess = createAction(LOAD_CURRENCY_RATES_SUCCESS);
export const loadCurrencyRatesError = createAction(LOAD_CURRENCY_RATES_ERROR);

// Reducer
const rates = {
  'PLN': 1,
  'SEK': 1.4782
};
const defaultState = {
  isLoading: false,
  errorMessage: null,
  lastUpdated: null,
  currencies: Object.keys(rates)
};

export default function reducer(state = defaultState, action: FluxStandardAction<any> = {}) {
  switch (action.type) {
    case LOAD_CURRENCY_RATES:
      return Object.assign({}, state, {
        isLoading: true
      });
    case LOAD_CURRENCY_RATES_SUCCESS:
      return Object.assign({}, state, {
        isLoading: false,
        errorMessage: null,
        results: action.payload,
        lastUpdated: Date.now()
      });
    case LOAD_CURRENCY_RATES_ERROR:
      return Object.assign({}, state, {
        isLoading: false,
        errorMessage: action.payload
      });

    default: return state;
  }
}
