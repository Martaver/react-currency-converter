import { FuseBox } from 'fuse-box';

FuseBox.init({
  homeDir: 'src',
  outFile: 'out/app.js',
  log: false,
  sourceMaps: true,
}).devServer('>index.ts', {
  port: 3000,
});
