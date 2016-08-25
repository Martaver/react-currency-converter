import './main-layout.css!';
import * as React from 'react';
import { LayoutTopNav, LayoutTopNavItem } from './components/layout-top-nav';
import { LayoutHeader } from './components/layout-header';
import { LayoutMain } from './components/layout-main';

export class MainLayout extends React.Component<{}, {}> {
  render() {
    const {children} = this.props;

    return (
      <div className="c-text">
        <LayoutTopNav>
          <LayoutTopNavItem text="Home" route="/" primary />
          <LayoutTopNavItem text="Currency Converter" route="/currency-converter" />
          <LayoutTopNavItem text="About" route="/about" right />
        </LayoutTopNav>

        <LayoutHeader text="Welcome" />

        <LayoutMain>
          {children}
        </LayoutMain>
      </div>
    );
  };
};
