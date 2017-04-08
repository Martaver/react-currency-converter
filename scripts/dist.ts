import { rm, cp, mkdir } from 'shelljs';
import { FuseBox, UglifyJSPlugin, EnvPlugin } from 'fuse-box';

// dependencies
// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');
const dependencyExceptions = ['rxjs'];
const prodDependencies = Object.values(packageJson.dependencies)
  .filter(moduleName => !dependencyExceptions.includes(moduleName));

// paths
const SRC_PATH = 'src/';
const BUILD_PATH = 'dist/';

// clean build folder
rm('-rf', BUILD_PATH);
mkdir('-p', BUILD_PATH);
// copy assets
cp('-rf', 'assets/*', BUILD_PATH);

// create bundles
FuseBox.init({
  homeDir: SRC_PATH,
  tsConfig: SRC_PATH + 'tsconfig.json',
  outFile: BUILD_PATH + 'app.js',
  sourceMaps: true,
  log: false,
  plugins: [
    EnvPlugin({ NODE_ENV: 'production' }),
    UglifyJSPlugin({}),
  ],
}).bundle({
  [BUILD_PATH + 'app.js']: `>index.tsx - ${prodDependencies.join(' - ')}`,
  [BUILD_PATH + 'vendor.js']: `${prodDependencies.join(' + ')}`,
});
