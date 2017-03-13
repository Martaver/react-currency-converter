import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';

ReactDOM.render(<App />, document.getElementById('app-container'));
console.log('ENV:', process.env.NODE_ENV);
