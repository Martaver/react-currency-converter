import { createStore, combineReducers } from 'redux';
import currencyRatesReducer from './currency-rates-reducer';

const routeReducer = function(state = '/', action) {
  return state;
};
// Combine Reducers
const reducers = combineReducers({
  currencyRates: currencyRatesReducer,
  route: routeReducer
});

export default createStore(reducers);
