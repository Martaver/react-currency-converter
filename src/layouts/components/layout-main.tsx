import * as React from 'react';
import classNames from 'classnames';

const inlineStyles = {
  background: {
    backgroundColor: '#f7f7f7'
  }
};

export function LayoutMain({className = '', children = undefined}) {

  const parentClass = classNames(
    className,
    'o-container o-container--large',
    'o-grid',
    'u-pillar-box--small'
  );

  return (
    <main className={parentClass} style={inlineStyles.background}>
      {children}
    </main>
  );
}
