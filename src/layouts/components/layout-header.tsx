import * as React from 'react';
import csjs from 'csjs';
import insertCss from 'insert-css';

const styles = csjs`
  .header {
    border-bottom: 1px solid #e7e7e7;
    background-color: #f7f7f7;
  }
`;
insertCss(csjs.getCss(styles));

export function LayoutHeader({children = undefined}) {
  return (
    <header className={`u-letter-box--medium u-centered ${styles.header}`}>
      <h3 className="c-heading c-heading--medium u-window-box--none">{children}</h3>
    </header>
  );
}
