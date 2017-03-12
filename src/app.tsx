import * as React from 'react';
import * as ReactDOM from 'react-dom';
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

export const app = ReactDOM.render(
  <App />, document.getElementById('app-container'),
);
