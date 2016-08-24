// lib imports
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

// app imports
import { router } from './router';
import { store } from './store';

class App extends React.Component<{ router: any, store: any }, {}> {
  render() {
    return (
      <Provider store={this.props.store}>{this.props.router}</Provider>
    );
  }
}

export const app: any = ReactDOM.render(
  <App router={router} store={store} />,
  document.getElementById('app-container')
);
