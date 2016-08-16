// auto create app container if missing
let appContainer = document.getElementById('app-container');
if (appContainer == null) {
  appContainer = document.createElement('div');
  appContainer.id = 'app-container';
  document.body.appendChild(appContainer);
}

// lib imports
import * as React from 'react';
import * as ReactDOM from 'react-dom';
// components imports
import { Main } from './views/main';
import { AppStore } from './stores/app-store';

const appStore = new AppStore();
export var app: any = ReactDOM.render(<Main storage={appStore} />, appContainer);

// here you can customize hot-module-reload hook
// you could also copy to other modules
export function __reload(prev) {
  if (prev.app.state)
    app.setState(prev.app.state);
}
