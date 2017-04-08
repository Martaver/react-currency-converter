import { Action } from '../index';
import { cachedResponse } from '../../services/fixer/fixtures';

// Action Types
export const LOAD_CURRENCY_RATES = 'currencyRates/LOAD_CURRENCY_RATES';
export const LOAD_CURRENCY_RATES_SUCCESS = 'currencyRates/LOAD_CURRENCY_RATES_SUCCESS';
export const LOAD_CURRENCY_RATES_ERROR = 'currencyRates/LOAD_CURRENCY_RATES_ERROR';

// Action Creators
export const actionCreators = {
  loadCurrencyRates: () => ({
    type: LOAD_CURRENCY_RATES as typeof LOAD_CURRENCY_RATES,
  }),
  loadCurrencyRatesSuccess: (payload: IFixerServiceResponse) => ({
    type: LOAD_CURRENCY_RATES_SUCCESS as typeof LOAD_CURRENCY_RATES_SUCCESS,
    payload,
  }),
  loadCurrencyRatesError: (payload: string) => ({
    type: LOAD_CURRENCY_RATES_ERROR as typeof LOAD_CURRENCY_RATES_ERROR,
    payload,
  }),
};

// State
export type State = Readonly<{
  isLoading: boolean,
  error: string | null,
  lastUpdated: number | null,
  base: string,
  rates: { [key: string]: number },
  date: string,
}>;
const initialState: State = {
  isLoading: false,
  error: null,
  lastUpdated: null,
  base: cachedResponse.base,
  rates: cachedResponse.rates,
  date: cachedResponse.date,
};

// Reducer
export const reducer = (state: State = initialState, action: Action): State => {
  let partialState: Partial<State> | undefined;

  switch (action.type) {
    case LOAD_CURRENCY_RATES:
      partialState = {
        isLoading: true, error: null,
      };
      break;
    case LOAD_CURRENCY_RATES_SUCCESS:
      const { base, rates, date } = action.payload;
      partialState = {
        isLoading: false, lastUpdated: Date.now(), base, rates, date,
      };
      break;
    case LOAD_CURRENCY_RATES_ERROR:
      partialState = {
        isLoading: false, error: action.payload,
      };
      break;

    default: return state;
  }

  return { ...state, ...partialState };
};
