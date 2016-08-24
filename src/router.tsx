import * as React from 'react';
import { Router, Route, hashHistory } from 'react-router';

import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home-page';
import { AboutPage } from './pages/about-page';
import { CurrencyConverterPage } from './pages/currency-converter-page';

export const router = (
  <Router history={hashHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={HomePage}/>
      <Route path="/about" component={AboutPage}/>
      <Route path="/currency-converter" component={CurrencyConverterPage}/>
    </Route>
  </Router>
);
