SystemJS.config({
  paths: {
    "github:": "jspm_packages/github/",
    "npm:": "jspm_packages/npm/",
    "app/": "src/"
  },
  browserConfig: {
    "baseURL": ".",
    "bundles": {
      "out/dev-bundle.js": [
        "dev-bundle.config.js",
        "github:capaj/systemjs-hot-reloader@0.6.0/hot-reloader.js",
        "github:capaj/systemjs-hot-reloader@0.6.0.json",
        "npm:debug@2.2.0/browser.js",
        "npm:debug@2.2.0.json",
        "npm:debug@2.2.0/debug.js",
        "npm:ms@0.7.1/index.js",
        "npm:ms@0.7.1.json",
        "npm:weakee@1.0.0/weakee.js",
        "npm:weakee@1.0.0.json",
        "github:socketio/socket.io-client@1.4.8/socket.io.js",
        "github:socketio/socket.io-client@1.4.8.json",
        "github:systemjs/plugin-css@0.1.23/css.js",
        "github:systemjs/plugin-css@0.1.23.json",
        "github:frankwallis/plugin-typescript@4.0.16/plugin.js",
        "github:frankwallis/plugin-typescript@4.0.16.json",
        "github:frankwallis/plugin-typescript@4.0.16/utils.js",
        "npm:typescript@1.8.10/lib/typescript.js",
        "npm:typescript@1.8.10.json",
        "npm:os-browserify@0.2.1/browser.js",
        "npm:os-browserify@0.2.1.json",
        "github:jspm/nodelibs-os@0.2.0-alpha.json",
        "github:frankwallis/plugin-typescript@4.0.16/format-errors.js",
        "github:frankwallis/plugin-typescript@4.0.16/factory.js",
        "github:frankwallis/plugin-typescript@4.0.16/type-checker.js",
        "github:frankwallis/plugin-typescript@4.0.16/compiler-host.js",
        "github:frankwallis/plugin-typescript@4.0.16/logger.js",
        "github:frankwallis/plugin-typescript@4.0.16/resolver.js",
        "github:frankwallis/plugin-typescript@4.0.16/transpiler.js",
        "npm:react-dom@15.2.1/index.js",
        "npm:react-dom@15.2.1.json",
        "npm:react@15.2.1/lib/ReactDOM.js",
        "npm:react@15.2.1.json",
        "github:jspm/nodelibs-process@0.2.0-alpha/process.js",
        "github:jspm/nodelibs-process@0.2.0-alpha.json",
        "npm:fbjs@0.8.3/lib/ExecutionEnvironment.js",
        "npm:fbjs@0.8.3.json",
        "npm:fbjs@0.8.3/lib/warning.js",
        "npm:fbjs@0.8.3/lib/emptyFunction.js",
        "npm:react@15.2.1/lib/renderSubtreeIntoContainer.js",
        "npm:react@15.2.1/lib/ReactMount.js",
        "npm:react@15.2.1/lib/shouldUpdateReactComponent.js",
        "npm:react@15.2.1/lib/setInnerHTML.js",
        "npm:react@15.2.1/lib/createMicrosoftUnsafeLocalFunction.js",
        "npm:react@15.2.1/lib/DOMNamespaces.js",
        "npm:fbjs@0.8.3/lib/invariant.js",
        "npm:react@15.2.1/lib/instantiateReactComponent.js",
        "npm:react@15.2.1/lib/ReactInstrumentation.js",
        "npm:react@15.2.1/lib/ReactDebugTool.js",
        "npm:fbjs@0.8.3/lib/performanceNow.js",
        "npm:fbjs@0.8.3/lib/performance.js",
        "npm:react@15.2.1/lib/ReactComponentTreeDevtool.js",
        "npm:react@15.2.1/lib/ReactCurrentOwner.js",
        "npm:react@15.2.1/lib/reactProdInvariant.js",
        "npm:react@15.2.1/lib/ReactHostOperationHistoryDevtool.js",
        "npm:react@15.2.1/lib/ReactInvalidSetStateWarningDevTool.js",
        "npm:react@15.2.1/lib/ReactHostComponent.js",
        "npm:object-assign@4.1.0/index.js",
        "npm:object-assign@4.1.0.json",
        "npm:react@15.2.1/lib/ReactEmptyComponent.js",
        "npm:react@15.2.1/lib/ReactCompositeComponent.js",
        "npm:fbjs@0.8.3/lib/emptyObject.js",
        "npm:react@15.2.1/lib/checkReactTypeSpec.js",
        "npm:react@15.2.1/lib/ReactPropTypeLocationNames.js",
        "npm:react@15.2.1/lib/ReactReconciler.js",
        "npm:react@15.2.1/lib/ReactRef.js",
        "npm:react@15.2.1/lib/ReactOwner.js",
        "npm:react@15.2.1/lib/ReactPropTypeLocations.js",
        "npm:fbjs@0.8.3/lib/keyMirror.js",
        "npm:react@15.2.1/lib/ReactNodeTypes.js",
        "npm:react@15.2.1/lib/ReactElement.js",
        "npm:react@15.2.1/lib/canDefineProperty.js",
        "npm:react@15.2.1/lib/ReactInstanceMap.js",
        "npm:react@15.2.1/lib/ReactErrorUtils.js",
        "npm:react@15.2.1/lib/ReactComponentEnvironment.js",
        "npm:react@15.2.1/lib/ReactUpdates.js",
        "npm:react@15.2.1/lib/Transaction.js",
        "npm:react@15.2.1/lib/ReactFeatureFlags.js",
        "npm:react@15.2.1/lib/PooledClass.js",
        "npm:react@15.2.1/lib/CallbackQueue.js",
        "npm:react@15.2.1/lib/ReactUpdateQueue.js",
        "npm:react@15.2.1/lib/ReactMarkupChecksum.js",
        "npm:react@15.2.1/lib/adler32.js",
        "npm:react@15.2.1/lib/ReactDOMFeatureFlags.js",
        "npm:react@15.2.1/lib/ReactDOMContainerInfo.js",
        "npm:react@15.2.1/lib/validateDOMNesting.js",
        "npm:react@15.2.1/lib/ReactDOMComponentTree.js",
        "npm:react@15.2.1/lib/ReactDOMComponentFlags.js",
        "npm:react@15.2.1/lib/DOMProperty.js",
        "npm:react@15.2.1/lib/ReactBrowserEventEmitter.js",
        "npm:react@15.2.1/lib/isEventSupported.js",
        "npm:react@15.2.1/lib/getVendorPrefixedEventName.js",
        "npm:react@15.2.1/lib/ViewportMetrics.js",
        "npm:react@15.2.1/lib/ReactEventEmitterMixin.js",
        "npm:react@15.2.1/lib/EventPluginHub.js",
        "npm:react@15.2.1/lib/forEachAccumulated.js",
        "npm:react@15.2.1/lib/accumulateInto.js",
        "npm:react@15.2.1/lib/EventPluginUtils.js",
        "npm:react@15.2.1/lib/EventConstants.js",
        "npm:react@15.2.1/lib/EventPluginRegistry.js",
        "npm:react@15.2.1/lib/DOMLazyTree.js",
        "npm:react@15.2.1/lib/setTextContent.js",
        "npm:react@15.2.1/lib/escapeTextContentForBrowser.js",
        "npm:react@15.2.1/lib/getHostComponentFromComposite.js",
        "npm:react@15.2.1/lib/findDOMNode.js",
        "npm:react@15.2.1/lib/ReactVersion.js",
        "npm:react@15.2.1/lib/ReactDefaultInjection.js",
        "npm:react@15.2.1/lib/SimpleEventPlugin.js",
        "npm:fbjs@0.8.3/lib/keyOf.js",
        "npm:react@15.2.1/lib/getEventCharCode.js",
        "npm:react@15.2.1/lib/SyntheticWheelEvent.js",
        "npm:react@15.2.1/lib/SyntheticMouseEvent.js",
        "npm:react@15.2.1/lib/getEventModifierState.js",
        "npm:react@15.2.1/lib/SyntheticUIEvent.js",
        "npm:react@15.2.1/lib/getEventTarget.js",
        "npm:react@15.2.1/lib/SyntheticEvent.js",
        "npm:react@15.2.1/lib/SyntheticTransitionEvent.js",
        "npm:react@15.2.1/lib/SyntheticTouchEvent.js",
        "npm:react@15.2.1/lib/SyntheticDragEvent.js",
        "npm:react@15.2.1/lib/SyntheticKeyboardEvent.js",
        "npm:react@15.2.1/lib/getEventKey.js",
        "npm:react@15.2.1/lib/SyntheticFocusEvent.js",
        "npm:react@15.2.1/lib/SyntheticClipboardEvent.js",
        "npm:react@15.2.1/lib/SyntheticAnimationEvent.js",
        "npm:react@15.2.1/lib/EventPropagators.js",
        "npm:fbjs@0.8.3/lib/EventListener.js",
        "npm:react@15.2.1/lib/SelectEventPlugin.js",
        "npm:fbjs@0.8.3/lib/shallowEqual.js",
        "npm:react@15.2.1/lib/isTextInputElement.js",
        "npm:fbjs@0.8.3/lib/getActiveElement.js",
        "npm:react@15.2.1/lib/ReactInputSelection.js",
        "npm:fbjs@0.8.3/lib/focusNode.js",
        "npm:fbjs@0.8.3/lib/containsNode.js",
        "npm:fbjs@0.8.3/lib/isTextNode.js",
        "npm:fbjs@0.8.3/lib/isNode.js",
        "npm:react@15.2.1/lib/ReactDOMSelection.js",
        "npm:react@15.2.1/lib/getTextContentAccessor.js",
        "npm:react@15.2.1/lib/getNodeForCharacterOffset.js",
        "npm:react@15.2.1/lib/SVGDOMPropertyConfig.js",
        "npm:react@15.2.1/lib/ReactReconcileTransaction.js",
        "npm:react@15.2.1/lib/ReactInjection.js",
        "npm:react@15.2.1/lib/ReactClass.js",
        "npm:react@15.2.1/lib/ReactNoopUpdateQueue.js",
        "npm:react@15.2.1/lib/ReactComponent.js",
        "npm:react@15.2.1/lib/ReactEventListener.js",
        "npm:fbjs@0.8.3/lib/getUnboundedScrollPosition.js",
        "npm:react@15.2.1/lib/ReactDefaultBatchingStrategy.js",
        "npm:react@15.2.1/lib/ReactDOMTextComponent.js",
        "npm:react@15.2.1/lib/DOMChildrenOperations.js",
        "npm:react@15.2.1/lib/ReactMultiChildUpdateTypes.js",
        "npm:react@15.2.1/lib/Danger.js",
        "npm:fbjs@0.8.3/lib/createNodesFromMarkup.js",
        "npm:fbjs@0.8.3/lib/getMarkupWrap.js",
        "npm:fbjs@0.8.3/lib/createArrayFromMixed.js",
        "npm:react@15.2.1/lib/ReactDOMTreeTraversal.js",
        "npm:react@15.2.1/lib/ReactDOMEmptyComponent.js",
        "npm:react@15.2.1/lib/ReactDOMComponent.js",
        "npm:react@15.2.1/lib/ReactServerRenderingTransaction.js",
        "npm:react@15.2.1/lib/ReactServerUpdateQueue.js",
        "npm:react@15.2.1/lib/ReactMultiChild.js",
        "npm:react@15.2.1/lib/flattenChildren.js",
        "npm:react@15.2.1/lib/traverseAllChildren.js",
        "npm:react@15.2.1/lib/KeyEscapeUtils.js",
        "npm:react@15.2.1/lib/getIteratorFn.js",
        "npm:react@15.2.1/lib/ReactChildReconciler.js",
        "npm:react@15.2.1/lib/ReactDOMTextarea.js",
        "npm:react@15.2.1/lib/LinkedValueUtils.js",
        "npm:react@15.2.1/lib/ReactPropTypes.js",
        "npm:react@15.2.1/lib/DisabledInputUtils.js",
        "npm:react@15.2.1/lib/ReactDOMSelect.js",
        "npm:react@15.2.1/lib/ReactDOMOption.js",
        "npm:react@15.2.1/lib/ReactChildren.js",
        "npm:react@15.2.1/lib/ReactDOMInput.js",
        "npm:react@15.2.1/lib/DOMPropertyOperations.js",
        "npm:react@15.2.1/lib/quoteAttributeValueForBrowser.js",
        "npm:react@15.2.1/lib/ReactDOMInstrumentation.js",
        "npm:react@15.2.1/lib/ReactDOMDebugTool.js",
        "npm:react@15.2.1/lib/ReactDOMUnknownPropertyDevtool.js",
        "npm:react@15.2.1/lib/ReactDOMNullInputValuePropDevtool.js",
        "npm:react@15.2.1/lib/ReactDOMButton.js",
        "npm:react@15.2.1/lib/ReactComponentBrowserEnvironment.js",
        "npm:react@15.2.1/lib/ReactDOMIDOperations.js",
        "npm:react@15.2.1/lib/CSSPropertyOperations.js",
        "npm:fbjs@0.8.3/lib/memoizeStringOnly.js",
        "npm:fbjs@0.8.3/lib/hyphenateStyleName.js",
        "npm:fbjs@0.8.3/lib/hyphenate.js",
        "npm:react@15.2.1/lib/dangerousStyleValue.js",
        "npm:react@15.2.1/lib/CSSProperty.js",
        "npm:fbjs@0.8.3/lib/camelizeStyleName.js",
        "npm:fbjs@0.8.3/lib/camelize.js",
        "npm:react@15.2.1/lib/AutoFocusUtils.js",
        "npm:react@15.2.1/lib/HTMLDOMPropertyConfig.js",
        "npm:react@15.2.1/lib/EnterLeaveEventPlugin.js",
        "npm:react@15.2.1/lib/DefaultEventPluginOrder.js",
        "npm:react@15.2.1/lib/ChangeEventPlugin.js",
        "npm:react@15.2.1/lib/BeforeInputEventPlugin.js",
        "npm:react@15.2.1/lib/SyntheticInputEvent.js",
        "npm:react@15.2.1/lib/SyntheticCompositionEvent.js",
        "npm:react@15.2.1/lib/FallbackCompositionState.js",
        "npm:react@15.2.1/react.js",
        "npm:react@15.2.1/lib/React.js",
        "npm:react@15.2.1/lib/ReactElementValidator.js",
        "npm:react@15.2.1/lib/onlyChild.js",
        "npm:react@15.2.1/lib/ReactDOMFactories.js",
        "npm:fbjs@0.8.3/lib/mapObject.js"
      ]
    }
  },
  devConfig: {
    "map": {
      "plugin-typescript": "github:frankwallis/plugin-typescript@4.0.16",
      "systemjs-hot-reloader": "github:capaj/systemjs-hot-reloader@0.6.0",
      "blue-tape": "npm:blue-tape@0.2.0"
    },
    "packages": {
      "github:frankwallis/plugin-typescript@4.0.16": {
        "map": {
          "typescript": "npm:typescript@1.8.10"
        }
      },
      "npm:debug@2.2.0": {
        "map": {
          "ms": "npm:ms@0.7.1"
        }
      },
      "github:capaj/systemjs-hot-reloader@0.6.0": {
        "map": {
          "weakee": "npm:weakee@1.0.0",
          "debug": "npm:debug@2.2.0",
          "socket.io-client": "github:socketio/socket.io-client@1.4.8"
        }
      },
      "npm:blue-tape@0.2.0": {
        "map": {
          "tape": "npm:tape@4.6.0"
        }
      },
      "npm:tape@4.6.0": {
        "map": {
          "resumer": "npm:resumer@0.0.0",
          "function-bind": "npm:function-bind@1.1.0",
          "has": "npm:has@1.0.1",
          "glob": "npm:glob@7.0.5",
          "deep-equal": "npm:deep-equal@1.0.1",
          "object-inspect": "npm:object-inspect@1.2.1",
          "string.prototype.trim": "npm:string.prototype.trim@1.1.2",
          "minimist": "npm:minimist@1.2.0",
          "defined": "npm:defined@1.0.0",
          "inherits": "npm:inherits@2.0.1",
          "through": "npm:through@2.3.8",
          "resolve": "npm:resolve@1.1.7"
        }
      },
      "npm:has@1.0.1": {
        "map": {
          "function-bind": "npm:function-bind@1.1.0"
        }
      },
      "npm:string.prototype.trim@1.1.2": {
        "map": {
          "function-bind": "npm:function-bind@1.1.0",
          "es-abstract": "npm:es-abstract@1.5.1",
          "define-properties": "npm:define-properties@1.1.2"
        }
      },
      "npm:glob@7.0.5": {
        "map": {
          "inherits": "npm:inherits@2.0.1",
          "inflight": "npm:inflight@1.0.5",
          "minimatch": "npm:minimatch@3.0.2",
          "once": "npm:once@1.3.3",
          "path-is-absolute": "npm:path-is-absolute@1.0.0",
          "fs.realpath": "npm:fs.realpath@1.0.0"
        }
      },
      "npm:resumer@0.0.0": {
        "map": {
          "through": "npm:through@2.3.8"
        }
      },
      "npm:inflight@1.0.5": {
        "map": {
          "once": "npm:once@1.3.3",
          "wrappy": "npm:wrappy@1.0.2"
        }
      },
      "npm:es-abstract@1.5.1": {
        "map": {
          "function-bind": "npm:function-bind@1.1.0",
          "es-to-primitive": "npm:es-to-primitive@1.1.1",
          "is-callable": "npm:is-callable@1.1.3",
          "is-regex": "npm:is-regex@1.0.3"
        }
      },
      "npm:once@1.3.3": {
        "map": {
          "wrappy": "npm:wrappy@1.0.2"
        }
      },
      "npm:minimatch@3.0.2": {
        "map": {
          "brace-expansion": "npm:brace-expansion@1.1.5"
        }
      },
      "npm:define-properties@1.1.2": {
        "map": {
          "foreach": "npm:foreach@2.0.5",
          "object-keys": "npm:object-keys@1.0.11"
        }
      },
      "npm:es-to-primitive@1.1.1": {
        "map": {
          "is-callable": "npm:is-callable@1.1.3",
          "is-symbol": "npm:is-symbol@1.0.1",
          "is-date-object": "npm:is-date-object@1.0.1"
        }
      },
      "npm:brace-expansion@1.1.5": {
        "map": {
          "concat-map": "npm:concat-map@0.0.1",
          "balanced-match": "npm:balanced-match@0.4.1"
        }
      }
    }
  },
  transpiler: "plugin-typescript",
  typescriptOptions: {
    "target": "es5",
    "jsx": "react",
    "module": "system",
    "noImplicitAny": false,
    "typeCheck": false,
    "tsconfig": false
  },
  packages: {
    "app": {
      "main": "app.tsx",
      "defaultExtension": "tsx",
      "format": "esm",
      "meta": {
        "*.tsx": {
          "loader": "plugin-typescript"
        }
      }
    }
  }
});

SystemJS.config({
  packageConfigPaths: [
    "github:*/*.json",
    "npm:@*/*.json",
    "npm:*.json"
  ],
  map: {
    "accounting": "npm:accounting@0.4.1",
    "assert": "github:jspm/nodelibs-assert@0.2.0-alpha",
    "buffer": "github:jspm/nodelibs-buffer@0.2.0-alpha",
    "child_process": "github:jspm/nodelibs-child_process@0.2.0-alpha",
    "classnames": "npm:classnames@2.2.5",
    "constants": "github:jspm/nodelibs-constants@0.2.0-alpha",
    "crypto": "github:jspm/nodelibs-crypto@0.2.0-alpha",
    "css": "github:systemjs/plugin-css@0.1.23",
    "domain": "github:jspm/nodelibs-domain@0.2.0-alpha",
    "events": "github:jspm/nodelibs-events@0.2.0-alpha",
    "fs": "github:jspm/nodelibs-fs@0.2.0-alpha",
    "http": "github:jspm/nodelibs-http@0.2.0-alpha",
    "https": "github:jspm/nodelibs-https@0.2.0-alpha",
    "module": "github:jspm/nodelibs-module@0.2.0-alpha",
    "moment": "npm:moment@2.14.1",
    "moment-range": "npm:moment-range@2.2.0",
    "money": "npm:money@0.2.0",
    "net": "github:jspm/nodelibs-net@0.2.0-alpha",
    "os": "github:jspm/nodelibs-os@0.2.0-alpha",
    "path": "github:jspm/nodelibs-path@0.2.0-alpha",
    "process": "github:jspm/nodelibs-process@0.2.0-alpha",
    "react": "npm:react@15.2.1",
    "react-dom": "npm:react-dom@15.2.1",
    "react-input-calendar": "npm:react-input-calendar@0.3.11",
    "stream": "github:jspm/nodelibs-stream@0.2.0-alpha",
    "string_decoder": "github:jspm/nodelibs-string_decoder@0.2.0-alpha",
    "tty": "github:jspm/nodelibs-tty@0.2.0-alpha",
    "url": "github:jspm/nodelibs-url@0.2.0-alpha",
    "util": "github:jspm/nodelibs-util@0.2.0-alpha",
    "vm": "github:jspm/nodelibs-vm@0.2.0-alpha",
    "whatwg-fetch": "npm:whatwg-fetch@1.0.0",
    "zlib": "github:jspm/nodelibs-zlib@0.2.0-alpha"
  },
  packages: {
    "github:jspm/nodelibs-buffer@0.2.0-alpha": {
      "map": {
        "buffer-browserify": "npm:buffer@4.7.1"
      }
    },
    "github:jspm/nodelibs-http@0.2.0-alpha": {
      "map": {
        "http-browserify": "npm:stream-http@2.3.1"
      }
    },
    "github:jspm/nodelibs-os@0.2.0-alpha": {
      "map": {
        "os-browserify": "npm:os-browserify@0.2.1"
      }
    },
    "github:jspm/nodelibs-stream@0.2.0-alpha": {
      "map": {
        "stream-browserify": "npm:stream-browserify@2.0.1"
      }
    },
    "github:jspm/nodelibs-url@0.2.0-alpha": {
      "map": {
        "url-browserify": "npm:url@0.11.0"
      }
    },
    "npm:stream-browserify@2.0.1": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "readable-stream": "npm:readable-stream@2.1.4"
      }
    },
    "npm:url@0.11.0": {
      "map": {
        "punycode": "npm:punycode@1.3.2",
        "querystring": "npm:querystring@0.2.0"
      }
    },
    "npm:readable-stream@2.1.4": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "isarray": "npm:isarray@1.0.0",
        "string_decoder": "npm:string_decoder@0.10.31",
        "process-nextick-args": "npm:process-nextick-args@1.0.7",
        "util-deprecate": "npm:util-deprecate@1.0.2",
        "buffer-shims": "npm:buffer-shims@1.0.0",
        "core-util-is": "npm:core-util-is@1.0.2"
      }
    },
    "npm:react@15.2.1": {
      "map": {
        "fbjs": "npm:fbjs@0.8.3",
        "loose-envify": "npm:loose-envify@1.2.0",
        "object-assign": "npm:object-assign@4.1.0"
      }
    },
    "npm:fbjs@0.8.3": {
      "map": {
        "loose-envify": "npm:loose-envify@1.2.0",
        "promise": "npm:promise@7.1.1",
        "object-assign": "npm:object-assign@4.1.0",
        "isomorphic-fetch": "npm:isomorphic-fetch@2.2.1",
        "immutable": "npm:immutable@3.8.1",
        "ua-parser-js": "npm:ua-parser-js@0.7.10",
        "core-js": "npm:core-js@1.2.7"
      }
    },
    "npm:loose-envify@1.2.0": {
      "map": {
        "js-tokens": "npm:js-tokens@1.0.3"
      }
    },
    "npm:isomorphic-fetch@2.2.1": {
      "map": {
        "whatwg-fetch": "npm:whatwg-fetch@1.0.0",
        "node-fetch": "npm:node-fetch@1.5.3"
      }
    },
    "npm:node-fetch@1.5.3": {
      "map": {
        "encoding": "npm:encoding@0.1.12",
        "is-stream": "npm:is-stream@1.1.0"
      }
    },
    "npm:promise@7.1.1": {
      "map": {
        "asap": "npm:asap@2.0.4"
      }
    },
    "npm:encoding@0.1.12": {
      "map": {
        "iconv-lite": "npm:iconv-lite@0.4.13"
      }
    },
    "github:jspm/nodelibs-domain@0.2.0-alpha": {
      "map": {
        "domain-browserify": "npm:domain-browser@1.1.7"
      }
    },
    "github:jspm/nodelibs-string_decoder@0.2.0-alpha": {
      "map": {
        "string_decoder-browserify": "npm:string_decoder@0.10.31"
      }
    },
    "github:jspm/nodelibs-zlib@0.2.0-alpha": {
      "map": {
        "zlib-browserify": "npm:browserify-zlib@0.1.4"
      }
    },
    "npm:browserify-zlib@0.1.4": {
      "map": {
        "readable-stream": "npm:readable-stream@2.1.4",
        "pako": "npm:pako@0.2.9"
      }
    },
    "github:jspm/nodelibs-crypto@0.2.0-alpha": {
      "map": {
        "crypto-browserify": "npm:crypto-browserify@3.11.0"
      }
    },
    "npm:crypto-browserify@3.11.0": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "diffie-hellman": "npm:diffie-hellman@5.0.2",
        "randombytes": "npm:randombytes@2.0.3",
        "browserify-cipher": "npm:browserify-cipher@1.0.0",
        "create-hash": "npm:create-hash@1.1.2",
        "create-hmac": "npm:create-hmac@1.1.4",
        "pbkdf2": "npm:pbkdf2@3.0.4",
        "browserify-sign": "npm:browserify-sign@4.0.0",
        "public-encrypt": "npm:public-encrypt@4.0.0",
        "create-ecdh": "npm:create-ecdh@4.0.0"
      }
    },
    "npm:diffie-hellman@5.0.2": {
      "map": {
        "randombytes": "npm:randombytes@2.0.3",
        "miller-rabin": "npm:miller-rabin@4.0.0",
        "bn.js": "npm:bn.js@4.11.5"
      }
    },
    "npm:create-hash@1.1.2": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "ripemd160": "npm:ripemd160@1.0.1",
        "sha.js": "npm:sha.js@2.4.5",
        "cipher-base": "npm:cipher-base@1.0.2"
      }
    },
    "npm:create-hmac@1.1.4": {
      "map": {
        "create-hash": "npm:create-hash@1.1.2",
        "inherits": "npm:inherits@2.0.1"
      }
    },
    "npm:pbkdf2@3.0.4": {
      "map": {
        "create-hmac": "npm:create-hmac@1.1.4"
      }
    },
    "npm:browserify-cipher@1.0.0": {
      "map": {
        "browserify-des": "npm:browserify-des@1.0.0",
        "browserify-aes": "npm:browserify-aes@1.0.6",
        "evp_bytestokey": "npm:evp_bytestokey@1.0.0"
      }
    },
    "npm:browserify-sign@4.0.0": {
      "map": {
        "create-hash": "npm:create-hash@1.1.2",
        "create-hmac": "npm:create-hmac@1.1.4",
        "inherits": "npm:inherits@2.0.1",
        "parse-asn1": "npm:parse-asn1@5.0.0",
        "bn.js": "npm:bn.js@4.11.5",
        "browserify-rsa": "npm:browserify-rsa@4.0.1",
        "elliptic": "npm:elliptic@6.3.1"
      }
    },
    "npm:browserify-des@1.0.0": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "des.js": "npm:des.js@1.0.0",
        "cipher-base": "npm:cipher-base@1.0.2"
      }
    },
    "npm:browserify-aes@1.0.6": {
      "map": {
        "create-hash": "npm:create-hash@1.1.2",
        "inherits": "npm:inherits@2.0.1",
        "evp_bytestokey": "npm:evp_bytestokey@1.0.0",
        "cipher-base": "npm:cipher-base@1.0.2",
        "buffer-xor": "npm:buffer-xor@1.0.3"
      }
    },
    "npm:public-encrypt@4.0.0": {
      "map": {
        "create-hash": "npm:create-hash@1.1.2",
        "randombytes": "npm:randombytes@2.0.3",
        "parse-asn1": "npm:parse-asn1@5.0.0",
        "bn.js": "npm:bn.js@4.11.5",
        "browserify-rsa": "npm:browserify-rsa@4.0.1"
      }
    },
    "npm:miller-rabin@4.0.0": {
      "map": {
        "bn.js": "npm:bn.js@4.11.5",
        "brorand": "npm:brorand@1.0.5"
      }
    },
    "npm:create-ecdh@4.0.0": {
      "map": {
        "bn.js": "npm:bn.js@4.11.5",
        "elliptic": "npm:elliptic@6.3.1"
      }
    },
    "npm:evp_bytestokey@1.0.0": {
      "map": {
        "create-hash": "npm:create-hash@1.1.2"
      }
    },
    "npm:parse-asn1@5.0.0": {
      "map": {
        "browserify-aes": "npm:browserify-aes@1.0.6",
        "create-hash": "npm:create-hash@1.1.2",
        "pbkdf2": "npm:pbkdf2@3.0.4",
        "evp_bytestokey": "npm:evp_bytestokey@1.0.0",
        "asn1.js": "npm:asn1.js@4.8.0"
      }
    },
    "npm:sha.js@2.4.5": {
      "map": {
        "inherits": "npm:inherits@2.0.1"
      }
    },
    "npm:des.js@1.0.0": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "minimalistic-assert": "npm:minimalistic-assert@1.0.0"
      }
    },
    "npm:browserify-rsa@4.0.1": {
      "map": {
        "bn.js": "npm:bn.js@4.11.5",
        "randombytes": "npm:randombytes@2.0.3"
      }
    },
    "npm:elliptic@6.3.1": {
      "map": {
        "brorand": "npm:brorand@1.0.5",
        "bn.js": "npm:bn.js@4.11.5",
        "inherits": "npm:inherits@2.0.1",
        "hash.js": "npm:hash.js@1.0.3"
      }
    },
    "npm:cipher-base@1.0.2": {
      "map": {
        "inherits": "npm:inherits@2.0.1"
      }
    },
    "npm:hash.js@1.0.3": {
      "map": {
        "inherits": "npm:inherits@2.0.1"
      }
    },
    "npm:asn1.js@4.8.0": {
      "map": {
        "bn.js": "npm:bn.js@4.11.5",
        "inherits": "npm:inherits@2.0.1",
        "minimalistic-assert": "npm:minimalistic-assert@1.0.0"
      }
    },
    "npm:buffer@4.7.1": {
      "map": {
        "isarray": "npm:isarray@1.0.0",
        "base64-js": "npm:base64-js@1.1.2",
        "ieee754": "npm:ieee754@1.1.6"
      }
    },
    "npm:react-input-calendar@0.3.11": {
      "map": {
        "classnames": "npm:classnames@2.2.5",
        "babel-runtime": "npm:babel-runtime@6.11.6"
      }
    },
    "npm:babel-runtime@6.11.6": {
      "map": {
        "regenerator-runtime": "npm:regenerator-runtime@0.9.5",
        "core-js": "npm:core-js@2.4.1"
      }
    },
    "npm:stream-http@2.3.1": {
      "map": {
        "inherits": "npm:inherits@2.0.1",
        "readable-stream": "npm:readable-stream@2.1.4",
        "xtend": "npm:xtend@4.0.1",
        "to-arraybuffer": "npm:to-arraybuffer@1.0.1",
        "builtin-status-codes": "npm:builtin-status-codes@2.0.0"
      }
    }
  }
});
