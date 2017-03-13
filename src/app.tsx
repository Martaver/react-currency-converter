import * as React from 'react';
import { Provider } from 'react-redux';

import { store } from './store/index';
import CurrencyConverterContainer from './containers/currency-converter-container/index';

function App() {
  return (
    <Provider store={store}>
      <CurrencyConverterContainer />
    </Provider>
  );
}

export default App;
