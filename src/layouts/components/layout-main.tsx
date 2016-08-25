import * as React from 'react';

export function LayoutMain({children = undefined}) {
  return (
    <main className="o-container o-container--large u-pillar-box--small">
      {children}
    </main>
  );
}
