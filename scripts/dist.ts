import { rm, cp, mkdir } from 'shelljs';
import { FuseBox, UglifyJSPlugin, EnvPlugin } from 'fuse-box';

// paths
const BUILD_PATH = 'dist/';

// dependencies
const dependencyExceptions = ['rxjs'];
const packageJson = require('../package.json');
const prodDependencies = Object.keys(packageJson.dependencies)
  .filter(moduleName => !dependencyExceptions.includes(moduleName));

// clean build folder
rm('-rf', BUILD_PATH);
mkdir('-p', BUILD_PATH);

// copy assets
cp('-rf', 'assets/*', BUILD_PATH);

// create bundles
FuseBox.init({
  homeDir: 'src/',
  outFile: BUILD_PATH + 'app.js',
  tsConfig: 'src/tsconfig.json',
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
