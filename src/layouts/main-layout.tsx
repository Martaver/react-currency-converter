import './main-layout.css!';
import * as React from 'react';
import { LayoutTopNav, LayoutTopNavItem } from './components/layout-top-nav';

export function MainLayout({children}) {
  return (
    <div className="c-text">
      <LayoutTopNav>
        <LayoutTopNavItem text="Home" route="/" primary />
        <LayoutTopNavItem text="Currency Converter" route="/currency-converter" />
        <LayoutTopNavItem text="About" route="/about" right />
      </LayoutTopNav>

      <main className="o-container o-container--large u-pillar-box--small">
        {children}
      </main>
    </div>
  );
};
