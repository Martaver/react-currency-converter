import { rm, cp, mkdir } from 'shelljs';
import { FuseBox } from 'fuse-box';

// paths
const SRC_PATH = 'src/';
const BUILD_PATH = 'dev/';

// clean build folder
rm('-rf', BUILD_PATH);
mkdir('-p', BUILD_PATH);
// copy assets
cp('-rf', 'assets/*', BUILD_PATH);

// start dev-server
FuseBox.init({
  homeDir: SRC_PATH,
  tsConfig: SRC_PATH + 'tsconfig.json',
  outFile: BUILD_PATH + 'app.js',
  sourceMaps: true,
  log: false,
}).devServer('>index-dev.tsx', {
  port: 3000,
});
