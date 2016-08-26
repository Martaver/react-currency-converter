import * as React from 'react';
import classNames from 'classnames';

const styles = {
  main: {
    backgroundColor: '#f7f7f7'
  }
};

export function LayoutMain({className = '', children = undefined}) {

  const mainClass = classNames(
    className,
    'o-container o-container--large',
    'o-grid',
    'u-pillar-box--small'
  );

  return (
    <main className={mainClass} style={styles.main}>
      {children}
    </main>
  );
}
