import * as React from 'react';
import { Router, Route, hashHistory } from 'react-router';

import { MainLayout } from './layouts/main-layout';
import { HomeContainer } from './containers/home-container/index';
import { AboutContainer } from './containers/about-container/index';
import CurrencyConverterContainer from './containers/currency-converter-container/index';

export const router = (
  <Router history={hashHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={HomeContainer}/>
      <Route path="/about" component={AboutContainer}/>
      <Route path="/currency-converter" component={CurrencyConverterContainer}/>
    </Route>
  </Router>
);
