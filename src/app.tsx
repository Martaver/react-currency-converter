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

ReactDOM.render(<App />, document.getElementById('app-container'));

import { setStatefulModules } from 'fuse-box/modules/fuse-hmr';

setStatefulModules(name => {
  console.log(name);
  // Add the things you think are stateful:
  return /router/.test(name) || /state/.test(name);
});
