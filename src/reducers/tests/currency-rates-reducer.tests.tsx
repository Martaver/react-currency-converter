import test from 'blue-tape';
import * as reducerModule from '../currency-rates-reducer';

// testing action creators

test('testing action creator currencyRatesFetchSuccess', function(t) {
  // arrange
  const results = {
    "base": "EUR",
    "date": "2016-07-29",
    "rates": {
      "AUD": 1.4782
    }
  };

  // act
  const actual = reducerModule.loadCurrencyRatesSuccess(results);
  const expected = {
    type: reducerModule.LOAD_CURRENCY_RATES_SUCCESS,
    payload: results
  };

  // assert
  t.deepEqual(actual, expected, 'should deep equal expected action');
  t.end();

});

test('testing action creator currencyRatesFetchFailure', function(t) {
  // arrange
  const errorMessage = 'Error Message';

  // act
  const actual = reducerModule.loadCurrencyRatesFailure(errorMessage);
  const expected = {
    type: reducerModule.LOAD_CURRENCY_RATES_FAILURE,
    payload: errorMessage
  };

  // assert
  t.deepEqual(actual, expected, 'should deep equal expected action');
  t.end();
});

// testing reducer
