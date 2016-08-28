import * as React from 'react';
import classNames from 'classnames';

// const inlineStyles = {};

export function PageSection({className = '', children = undefined}) {

  const parentClass = classNames(
    className,
    'o-grid'
  );
  const cellClas = classNames(
    'o-grid__cell'
  );

  return (
    <section className={parentClass}>
        <div className={cellClas}>{children}</div>
    </section>
  );
}
