import { rm, cp, mkdir } from 'shelljs';
import { FuseBox } from 'fuse-box';

// paths
const BUILD_PATH = 'build/dev/';

// clean build folder
rm('-rf', BUILD_PATH);
mkdir('-p', BUILD_PATH);

// copy assets
cp('-rf', 'assets/*', BUILD_PATH);
// process.exit();
// start dev-server
FuseBox.init({
  homeDir: 'src/',
  outFile: BUILD_PATH + 'app.js',
  tsConfig: 'tsconfig.json',
  sourceMaps: true,
  log: false,
}).devServer('>index-dev.tsx', {
  port: 3000,
});
