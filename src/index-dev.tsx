// tslint:disable-next-line:no-import-side-effect
import './index';

import { setStatefulModules } from 'fuse-box/modules/fuse-hmr';

const statefulModules = [
  'store/',
  'router/',
];

setStatefulModules((updatedModuleName: string) =>
  statefulModules.some(statefulModuleName => {
    const isStatefulUpdate = RegExp(statefulModuleName).test(updatedModuleName);
    // console.log(isStatefulUpdate, updatedModule);
    return isStatefulUpdate;
  }),
);
