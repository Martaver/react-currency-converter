import { combineReducers } from 'redux';

import currencyRatesReducer from './currency-rates-reducer';
import currencyConverterReducer from './currency-converter-reducer';

export const initialState = {
};

export const rootReducer = combineReducers({
  currencyRates: currencyRatesReducer,
  currencyConverter: currencyConverterReducer
});

export const hotReloadReducer = (state, action) => action.payload;
