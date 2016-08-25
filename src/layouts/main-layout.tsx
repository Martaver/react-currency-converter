import './main-layout.css!';
import * as React from 'react';
import { LayoutTopNav, LayoutTopNavLink } from './components/layout-top-nav';
import { LayoutHeader } from './components/layout-header';
import { LayoutMain } from './components/layout-main';

export class MainLayout extends React.Component<{}, {}> {
  render() {
    const {children} = this.props;

    return (
      <div className="c-text">
        <LayoutTopNav>
          <LayoutTopNavLink href="/" primary>Home</LayoutTopNavLink>
          <LayoutTopNavLink href="/currency-converter">Currency Converter</LayoutTopNavLink>
          <LayoutTopNavLink href="/about" right>About</LayoutTopNavLink>
        </LayoutTopNav>

        <LayoutHeader>
          Welcome
        </LayoutHeader>

        <LayoutMain>
          {children}
        </LayoutMain>
      </div>
    );
  };
};
