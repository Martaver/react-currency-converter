import * as React from 'react';
import classNames from 'classnames';

const styles = {
  footer: {
    borderTop: '1px solid #eee'
  }
};

export function LayoutFooter({className = '', children = undefined}) {

  const footerClass = classNames(
    className,
    'u-letter-box--medium u-centered'
  );

  return (
    <footer className={footerClass} style={styles.footer}>
      {children}
    </footer>
  );
}
