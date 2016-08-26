import * as React from 'react';
import classNames from 'classnames';
import { Link } from 'react-router';

// const styles = {};

export function LayoutTopNav({className = '', children = undefined}) {
  const navClass = classNames(
    className,
    'c-nav c-nav--inline c-nav--high'
  );

  return (
    <nav className={navClass}>
      {children}
    </nav>
  );
}

export function LayoutTopNavLink(
  {className = '', children = undefined, href = '/', isRight = false, isPrimary = false}
) {

  const linkClass = classNames(className, 'c-nav__item', {
    'c-nav__item--primary': isPrimary,
    'c-nav__item--right': isRight
  });
  const linkActiveClass = classNames(
    'c-nav__item--active'
  );

  return (
    <Link to={href} className={linkClass} activeClassName={linkActiveClass}>
      {children}
    </Link>
  );
}
