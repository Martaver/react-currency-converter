import * as React from 'react';

export function LayoutHeader({children = undefined}) {
  return (
    <header>
      {children}
    </header>
  );
}
