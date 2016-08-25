import * as React from 'react';
import { Link } from 'react-router';

export function LayoutTopNav({children = undefined}) {

  return (
    <nav className="c-nav c-nav--inline c-nav--high">
      {children}
    </nav>
  );
}

export function LayoutTopNavItem(
  {route = '/', text = '', right = false, primary = false}
) {

  const navItem = 'c-nav__item' +
    (primary ? ' c-nav__item--primary' : '') +
    (right ? ' c-nav__item--right' : '');
  const linkActiveClass = 'c-nav__item--active';

  return (
    <Link to={route} className={navItem} activeClassName={linkActiveClass}>{text}</Link>
  );
}
