import * as React from 'react';
import { Link } from 'react-router';
export function MainLayout({children}) {
  return (
    <div>
      <header className="">
        <h1>Layout Header</h1>
      </header>
      <aside className="">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/currency-converter">Currency Converter</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>
      </aside>
      <main>
        {children}
      </main>
    </div>
  );
};
