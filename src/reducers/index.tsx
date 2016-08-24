import { combineReducers } from 'redux';

import currencyRatesReducer from './currency-rates-reducer';

export const initialState = {
};

export const rootReducer = combineReducers({
  currencyRates: currencyRatesReducer
});

export const hotReloadReducer = (state, action) => action.payload;
