import * as React from 'react';

export function PageHeader({title}) {
  return (
    <div className="o-grid">
      <div className="o-grid__cell">
        <h3 className="c-heading c-heading--large">{title}</h3>
      </div>
    </div>
  );
}
