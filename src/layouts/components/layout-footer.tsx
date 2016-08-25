import * as React from 'react';
import csjs from 'csjs';
import insertCss from 'insert-css';
import classNames from 'classnames';

const styles = csjs`
  .footer {
    border-top: 1px solid #eee;
  }
`;
insertCss(csjs.getCss(styles));

export function LayoutFooter({children = undefined}) {
  const footerClass = classNames(
    'u-letter-box--medium u-centered',
    styles.footer
  );

  return (
    <footer className={footerClass}>
      {children}
    </footer>
  );
}
