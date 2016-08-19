# Based on React / TypeScript / JSPM / Hot-Reload - starter-kit - https://github.com/piotrwitek/react-ts-jspm-starter-kit

DEMO: https://piotrwitek.github.io/react-currency-converter/

---

## Installation

#### Prerequisites
- Node.js and Git
- Install JSPM with global flag to have jspm command available: `npm install jspm -g` (otherwise you'll have to use a local version from `~/node_modules/`)


#### 1. Clone repo
    git clone https://github.com/piotrwitek/react-currency-converter.git my-project-folder

#### 2. Install npm dependencies
    npm install

#### 3. Run development server with HMR and enjoy best possible dev feedback-loop
    npm start

---

## Usage

#### Dev Workflow
1. `npm run bundle-dev` - _**OPTIONAL:** re-run only when your dependencies has changed_
2. `npm start`

#### Build for Production Workflow
1. `npm run build`
2. `npm run build-deps` - _**OPTIONAL:** re-run only when your dependencies has changed_
3. open `http://localhost/dist/` to check
4. deploy 'dist' contents on your server

---

## All Npm Commands & Scripts

`npm start` - start local dev server with hot-module-reload for JSPM [jspm-hmr](https://www.npmjs.com/package/jspm-hmr)

#### Development Bundling

`npm run bundle-dev` - bundle static dependencies for quick full-page reload, app sources remain as seperate modules for on-the-fly HMR & transpilation

`npm run unbundle` - un-bundle static dependencies (usefull when changing app dependencies)

#### Production Bundling (`dist/` folder)

`npm run build` - build app bundle (only your app source) - minified, no source-maps

`npm run build-deps` - build dependency bundle (only external dependencies) - minified, no source-maps

`npm run build-all` - build both app & dependecy bundle

`npm run build-debug` - build app bundle - debug version with source-maps

#### Deployment

`npm run init-deploy` - initialize new git repository in `/dist` folder aiming at gh-pages branch

`npm run deploy` - checkout, add, commit and push changes in `/dist` folder to gh-pages branch

#### Utility & Git Hooks

`npm run bd` - build and deploy your app bundle

`npm run bdd` - build and deploy your deps bundle

`npm run lint` - run linter

`npm run test` - run test suites

`npm run precommit` - pre commit git hook - runs linter

`npm run prepush` - pre push git hook - runs linter and tests

---

## Dependencies
- https://github.com/Microsoft/TypeScript/
- https://github.com/facebook/react/
- https://github.com/jspm/jspm-cli/
- https://github.com/piotrwitek/jspm-hmr/

---

## The MIT License (MIT)

Copyright (c) 2016 Piotr Witek <piotrek.witek@gmail.com> (http://piotrwitek.github.io/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
