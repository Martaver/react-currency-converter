import * as React from 'react';
import { Router, Route, hashHistory } from 'react-router';

import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home-page';
import { AboutPage } from './pages/about-page';

export default (
  <Router history={hashHistory}>
    <Route component={MainLayout}>
      <Route path="/" component={HomePage}/>
      <Route path="/about" component={AboutPage}/>
    </Route>
  </Router>
);
