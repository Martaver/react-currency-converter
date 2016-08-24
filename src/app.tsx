// lib imports
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';

// app imports
import Router from './router';
import { rootReducer, hotReloadReducer } from './reducers/index';

// create store
const store = createStore(rootReducer);
// mount app
export var app: any = ReactDOM.render(
  <Provider store={store}>{Router}</Provider>,
  document.getElementById('app-container')
);

// hot-reload hook, rehydrating the state of redux store
export function __reload(prev) {
  if (prev.app) {
    const prevState = store.getState();
    console.log('prev state', prevState);

    store.replaceReducer(hotReloadReducer);
    store.dispatch({ type: null, payload: prevState });
    console.log('rehydrated state', store.getState());

    store.replaceReducer(rootReducer);
  }
}
