import * as React from 'react';
import { Provider } from 'react-redux';

import { store } from './store/index';
import CurrencyConverterContainer from './containers/currency-converter';

export function App() {
  return (
    <Provider store={store}>
      <CurrencyConverterContainer />
    </Provider>
  );
}
