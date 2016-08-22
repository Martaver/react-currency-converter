/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `value instanceof AwaitArgument` to determine if the yielded value is
  // meant to be awaited. Some may consider the name of this method too
  // cutesy, but they are curmudgeons.
  runtime.awrap = function(arg) {
    return new AwaitArgument(arg);
  };

  function AwaitArgument(arg) {
    this.arg = arg;
  }

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value instanceof AwaitArgument) {
          return Promise.resolve(value.arg).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if (typeof process === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" ||
              (method === "throw" && delegate.iterator[method] === undefined)) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(
            delegate.iterator[method],
            delegate.iterator,
            arg
          );

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = arg;

        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp[toStringTagSymbol] = "Generator";

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);
!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in v||(v[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==g.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=v[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(g.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=v[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return y[e]||(y[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return (t.locked=!1, r)},{id:r.name});t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=v[s],f=y[s];f?l=f.exports:c&&!c.declarative?l=c.esModule:c?(d(c),f=c.module,l=f.exports):l=p(s),f&&f.importers?(f.importers.push(t),t.dependencies.push(f)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=v[e];if(t)t.declarative?f(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=p(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=v[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){var t={};if(("object"==typeof r||"function"==typeof r)&&r!==e)if(m)for(var n in r)"default"!==n&&c(t,r,n);else{var o=r&&r.hasOwnProperty;for(var n in r)"default"===n||o&&!r.hasOwnProperty(n)||(t[n]=r[n])}return (t["default"]=r, x(t,"__useDefault",{value:!0}), t)}function c(e,r,t){try{var n;(n=Object.getOwnPropertyDescriptor(r,t))&&x(e,t,n)}catch(o){return (e[t]=r[t], !1)}}function f(r,t){var n=v[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==g.call(t,u)&&(v[u]?f(u,t):p(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function p(e){if(I[e])return I[e];if("@node/"==e.substr(0,6))return D(e.substr(6));var r=v[e];if(!r)throw"Module "+e+" not present.";return (a(e), f(e,[]), v[e]=void 0, r.declarative&&x(r.module.exports,"__esModule",{value:!0}), I[e]=r.declarative?r.module.exports:r.esModule)}var v={},g=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},m=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(h){m=!1}var x;!function(){try{Object.defineProperty({},"a",{})&&(x=Object.defineProperty)}catch(e){x=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var y={},D="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,I={"@empty":{}};return function(e,n,o,a){return function(u){u(function(u){for(var d={_nodeRequire:D,register:r,registerDynamic:t,get:p,set:function(e,r){I[e]=r},newModule:function(e){return e}},i=0;i<n.length;i++)(function(e,r){r&&r.__esModule?I[e]=r:I[e]=s(r)})(n[i],arguments[i]);a(d);var l=p(e[0]);if(e.length>1)for(var i=1;i<e.length;i++)p(e[i]);return o?l["default"]:l})}}}("undefined"!=typeof self?self:global)

(["1"], ["c","16","76"], false, function($__System) {
var require = this.require, exports = this.exports, module = this.module;
!function(e){function n(e,n){e=e.replace(l,"");var r=e.match(u),t=(r[1].split(",")[n]||"require").replace(s,""),i=p[t]||(p[t]=new RegExp(a+t+f,"g"));i.lastIndex=0;for(var o,c=[];o=i.exec(e);)c.push(o[2]||o[3]);return c}function r(e,n,t,o){if("object"==typeof e&&!(e instanceof Array))return r.apply(null,Array.prototype.splice.call(arguments,1,arguments.length-1));if("string"==typeof e&&"function"==typeof n&&(e=[e]),!(e instanceof Array)){if("string"==typeof e){var l=i.get(e);return l.__useDefault?l["default"]:l}throw new TypeError("Invalid require")}for(var a=[],f=0;f<e.length;f++)a.push(i["import"](e[f],o));Promise.all(a).then(function(e){n&&n.apply(null,e)},t)}function t(t,l,a){"string"!=typeof t&&(a=l,l=t,t=null),l instanceof Array||(a=l,l=["require","exports","module"].splice(0,a.length)),"function"!=typeof a&&(a=function(e){return function(){return e}}(a)),void 0===l[l.length-1]&&l.pop();var f,u,s;-1!=(f=o.call(l,"require"))&&(l.splice(f,1),t||(l=l.concat(n(a.toString(),f)))),-1!=(u=o.call(l,"exports"))&&l.splice(u,1),-1!=(s=o.call(l,"module"))&&l.splice(s,1);var p={name:t,deps:l,execute:function(n,t,o){for(var p=[],c=0;c<l.length;c++)p.push(n(l[c]));o.uri=o.id,o.config=function(){},-1!=s&&p.splice(s,0,o),-1!=u&&p.splice(u,0,t),-1!=f&&p.splice(f,0,function(e,t,l){return"string"==typeof e&&"function"!=typeof t?n(e):r.call(i,e,t,l,o.id)});var d=a.apply(-1==u?e:t,p);return ("undefined"==typeof d&&o&&(d=o.exports), "undefined"!=typeof d?d:void 0)}};if(t)c.anonDefine||c.isBundle?c.anonDefine&&c.anonDefine.name&&(c.anonDefine=null):c.anonDefine=p,c.isBundle=!0,i.registerDynamic(p.name,p.deps,!1,p.execute);else{if(c.anonDefine&&!c.anonDefine.name)throw new Error("Multiple anonymous defines in module "+t);c.anonDefine=p}}var i=$__System,o=Array.prototype.indexOf||function(e){for(var n=0,r=this.length;r>n;n++)if(this[n]===e)return n;return-1},l=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm,a="(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])",f="\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)",u=/\(([^\)]*)\)/,s=/^\s+|\s+$/g,p={};t.amd={};var c={isBundle:!1,anonDefine:null};i.amdDefine=t,i.amdRequire=r}("undefined"!=typeof self?self:global);
$__System.register("2", [], function() { return { setters: [], execute: function() {} } });

$__System.registerDynamic("3", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(root, undefined) {
    var fx = function(obj) {
      return new fxWrapper(obj);
    };
    fx.version = '0.2';
    var fxSetup = root.fxSetup || {
      rates: {},
      base: ""
    };
    fx.rates = fxSetup.rates;
    fx.base = fxSetup.base;
    fx.settings = {
      from: fxSetup.from || fx.base,
      to: fxSetup.to || fx.base
    };
    var convert = fx.convert = function(val, opts) {
      if (typeof val === 'object' && val.length) {
        for (var i = 0; i < val.length; i++) {
          val[i] = convert(val[i], opts);
        }
        return val;
      }
      opts = opts || {};
      if (!opts.from)
        opts.from = fx.settings.from;
      if (!opts.to)
        opts.to = fx.settings.to;
      return val * getRate(opts.to, opts.from);
    };
    var getRate = function(to, from) {
      var rates = fx.rates;
      rates[fx.base] = 1;
      if (!rates[to] || !rates[from])
        throw "fx error";
      if (from === fx.base) {
        return rates[to];
      }
      if (to === fx.base) {
        return 1 / rates[from];
      }
      return rates[to] * (1 / rates[from]);
    };
    var fxWrapper = function(val) {
      if (typeof val === "string") {
        this._v = parseFloat(val.replace(/[^0-9-.]/g, ""));
        this._fx = val.replace(/([^A-Za-z])/g, "");
      } else {
        this._v = val;
      }
    };
    var fxProto = fx.prototype = fxWrapper.prototype;
    fxProto.convert = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this._v);
      return convert.apply(fx, args);
    };
    fxProto.from = function(currency) {
      var wrapped = fx(convert(this._v, {
        from: currency,
        to: fx.base
      }));
      wrapped._fx = fx.base;
      return wrapped;
    };
    fxProto.to = function(currency) {
      return convert(this._v, {
        from: this._fx ? this._fx : fx.settings.from,
        to: currency
      });
    };
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = fx;
      }
      exports.fx = fx;
    } else if (typeof define === 'function' && define.amd) {
      define([], function() {
        return fx;
      });
    } else {
      fx.noConflict = (function(previousFx) {
        return function() {
          root.fx = previousFx;
          fx.noConflict = undefined;
          return fx;
        };
      })(root.fx);
      root['fx'] = fx;
    }
  }(this));
  return module.exports;
});

$__System.registerDynamic("4", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(self) {
    'use strict';
    if (self.fetch) {
      return;
    }
    var support = {
      searchParams: 'URLSearchParams' in self,
      iterable: 'Symbol' in self && 'iterator' in Symbol,
      blob: 'FileReader' in self && 'Blob' in self && (function() {
        try {
          new Blob();
          return true;
        } catch (e) {
          return false;
        }
      })(),
      formData: 'FormData' in self,
      arrayBuffer: 'ArrayBuffer' in self
    };
    function normalizeName(name) {
      if (typeof name !== 'string') {
        name = String(name);
      }
      if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
        throw new TypeError('Invalid character in header field name');
      }
      return name.toLowerCase();
    }
    function normalizeValue(value) {
      if (typeof value !== 'string') {
        value = String(value);
      }
      return value;
    }
    function iteratorFor(items) {
      var iterator = {next: function() {
          var value = items.shift();
          return {
            done: value === undefined,
            value: value
          };
        }};
      if (support.iterable) {
        iterator[Symbol.iterator] = function() {
          return iterator;
        };
      }
      return iterator;
    }
    function Headers(headers) {
      this.map = {};
      if (headers instanceof Headers) {
        headers.forEach(function(value, name) {
          this.append(name, value);
        }, this);
      } else if (headers) {
        Object.getOwnPropertyNames(headers).forEach(function(name) {
          this.append(name, headers[name]);
        }, this);
      }
    }
    Headers.prototype.append = function(name, value) {
      name = normalizeName(name);
      value = normalizeValue(value);
      var list = this.map[name];
      if (!list) {
        list = [];
        this.map[name] = list;
      }
      list.push(value);
    };
    Headers.prototype['delete'] = function(name) {
      delete this.map[normalizeName(name)];
    };
    Headers.prototype.get = function(name) {
      var values = this.map[normalizeName(name)];
      return values ? values[0] : null;
    };
    Headers.prototype.getAll = function(name) {
      return this.map[normalizeName(name)] || [];
    };
    Headers.prototype.has = function(name) {
      return this.map.hasOwnProperty(normalizeName(name));
    };
    Headers.prototype.set = function(name, value) {
      this.map[normalizeName(name)] = [normalizeValue(value)];
    };
    Headers.prototype.forEach = function(callback, thisArg) {
      Object.getOwnPropertyNames(this.map).forEach(function(name) {
        this.map[name].forEach(function(value) {
          callback.call(thisArg, value, name, this);
        }, this);
      }, this);
    };
    Headers.prototype.keys = function() {
      var items = [];
      this.forEach(function(value, name) {
        items.push(name);
      });
      return iteratorFor(items);
    };
    Headers.prototype.values = function() {
      var items = [];
      this.forEach(function(value) {
        items.push(value);
      });
      return iteratorFor(items);
    };
    Headers.prototype.entries = function() {
      var items = [];
      this.forEach(function(value, name) {
        items.push([name, value]);
      });
      return iteratorFor(items);
    };
    if (support.iterable) {
      Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
    }
    function consumed(body) {
      if (body.bodyUsed) {
        return Promise.reject(new TypeError('Already read'));
      }
      body.bodyUsed = true;
    }
    function fileReaderReady(reader) {
      return new Promise(function(resolve, reject) {
        reader.onload = function() {
          resolve(reader.result);
        };
        reader.onerror = function() {
          reject(reader.error);
        };
      });
    }
    function readBlobAsArrayBuffer(blob) {
      var reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      return fileReaderReady(reader);
    }
    function readBlobAsText(blob) {
      var reader = new FileReader();
      reader.readAsText(blob);
      return fileReaderReady(reader);
    }
    function Body() {
      this.bodyUsed = false;
      this._initBody = function(body) {
        this._bodyInit = body;
        if (typeof body === 'string') {
          this._bodyText = body;
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
          this._bodyBlob = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this._bodyText = body.toString();
        } else if (!body) {
          this._bodyText = '';
        } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {} else {
          throw new Error('unsupported BodyInit type');
        }
        if (!this.headers.get('content-type')) {
          if (typeof body === 'string') {
            this.headers.set('content-type', 'text/plain;charset=UTF-8');
          } else if (this._bodyBlob && this._bodyBlob.type) {
            this.headers.set('content-type', this._bodyBlob.type);
          } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
            this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
          }
        }
      };
      if (support.blob) {
        this.blob = function() {
          var rejected = consumed(this);
          if (rejected) {
            return rejected;
          }
          if (this._bodyBlob) {
            return Promise.resolve(this._bodyBlob);
          } else if (this._bodyFormData) {
            throw new Error('could not read FormData body as blob');
          } else {
            return Promise.resolve(new Blob([this._bodyText]));
          }
        };
        this.arrayBuffer = function() {
          return this.blob().then(readBlobAsArrayBuffer);
        };
        this.text = function() {
          var rejected = consumed(this);
          if (rejected) {
            return rejected;
          }
          if (this._bodyBlob) {
            return readBlobAsText(this._bodyBlob);
          } else if (this._bodyFormData) {
            throw new Error('could not read FormData body as text');
          } else {
            return Promise.resolve(this._bodyText);
          }
        };
      } else {
        this.text = function() {
          var rejected = consumed(this);
          return rejected ? rejected : Promise.resolve(this._bodyText);
        };
      }
      if (support.formData) {
        this.formData = function() {
          return this.text().then(decode);
        };
      }
      this.json = function() {
        return this.text().then(JSON.parse);
      };
      return this;
    }
    var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];
    function normalizeMethod(method) {
      var upcased = method.toUpperCase();
      return (methods.indexOf(upcased) > -1) ? upcased : method;
    }
    function Request(input, options) {
      options = options || {};
      var body = options.body;
      if (Request.prototype.isPrototypeOf(input)) {
        if (input.bodyUsed) {
          throw new TypeError('Already read');
        }
        this.url = input.url;
        this.credentials = input.credentials;
        if (!options.headers) {
          this.headers = new Headers(input.headers);
        }
        this.method = input.method;
        this.mode = input.mode;
        if (!body) {
          body = input._bodyInit;
          input.bodyUsed = true;
        }
      } else {
        this.url = input;
      }
      this.credentials = options.credentials || this.credentials || 'omit';
      if (options.headers || !this.headers) {
        this.headers = new Headers(options.headers);
      }
      this.method = normalizeMethod(options.method || this.method || 'GET');
      this.mode = options.mode || this.mode || null;
      this.referrer = null;
      if ((this.method === 'GET' || this.method === 'HEAD') && body) {
        throw new TypeError('Body not allowed for GET or HEAD requests');
      }
      this._initBody(body);
    }
    Request.prototype.clone = function() {
      return new Request(this);
    };
    function decode(body) {
      var form = new FormData();
      body.trim().split('&').forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
      return form;
    }
    function headers(xhr) {
      var head = new Headers();
      var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n');
      pairs.forEach(function(header) {
        var split = header.trim().split(':');
        var key = split.shift().trim();
        var value = split.join(':').trim();
        head.append(key, value);
      });
      return head;
    }
    Body.call(Request.prototype);
    function Response(bodyInit, options) {
      if (!options) {
        options = {};
      }
      this.type = 'default';
      this.status = options.status;
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = options.statusText;
      this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      this.url = options.url || '';
      this._initBody(bodyInit);
    }
    Body.call(Response.prototype);
    Response.prototype.clone = function() {
      return new Response(this._bodyInit, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers),
        url: this.url
      });
    };
    Response.error = function() {
      var response = new Response(null, {
        status: 0,
        statusText: ''
      });
      response.type = 'error';
      return response;
    };
    var redirectStatuses = [301, 302, 303, 307, 308];
    Response.redirect = function(url, status) {
      if (redirectStatuses.indexOf(status) === -1) {
        throw new RangeError('Invalid status code');
      }
      return new Response(null, {
        status: status,
        headers: {location: url}
      });
    };
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
    self.fetch = function(input, init) {
      return new Promise(function(resolve, reject) {
        var request;
        if (Request.prototype.isPrototypeOf(input) && !init) {
          request = input;
        } else {
          request = new Request(input, init);
        }
        var xhr = new XMLHttpRequest();
        function responseURL() {
          if ('responseURL' in xhr) {
            return xhr.responseURL;
          }
          if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
            return xhr.getResponseHeader('X-Request-URL');
          }
          return;
        }
        xhr.onload = function() {
          var options = {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: headers(xhr),
            url: responseURL()
          };
          var body = 'response' in xhr ? xhr.response : xhr.responseText;
          resolve(new Response(body, options));
        };
        xhr.onerror = function() {
          reject(new TypeError('Network request failed'));
        };
        xhr.ontimeout = function() {
          reject(new TypeError('Network request failed'));
        };
        xhr.open(request.method, request.url, true);
        if (request.credentials === 'include') {
          xhr.withCredentials = true;
        }
        if ('responseType' in xhr && support.blob) {
          xhr.responseType = 'blob';
        }
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
        xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
      });
    };
    self.fetch.polyfill = true;
  })(typeof self !== 'undefined' ? self : this);
  return module.exports;
});

$__System.registerDynamic("5", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(root, undefined) {
    var lib = {};
    lib.version = '0.4.1';
    lib.settings = {
      currency: {
        symbol: "$",
        format: "%s%v",
        decimal: ".",
        thousand: ",",
        precision: 2,
        grouping: 3
      },
      number: {
        precision: 0,
        grouping: 3,
        thousand: ",",
        decimal: "."
      }
    };
    var nativeMap = Array.prototype.map,
        nativeIsArray = Array.isArray,
        toString = Object.prototype.toString;
    function isString(obj) {
      return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    }
    function isArray(obj) {
      return nativeIsArray ? nativeIsArray(obj) : toString.call(obj) === '[object Array]';
    }
    function isObject(obj) {
      return obj && toString.call(obj) === '[object Object]';
    }
    function defaults(object, defs) {
      var key;
      object = object || {};
      defs = defs || {};
      for (key in defs) {
        if (defs.hasOwnProperty(key)) {
          if (object[key] == null)
            object[key] = defs[key];
        }
      }
      return object;
    }
    function map(obj, iterator, context) {
      var results = [],
          i,
          j;
      if (!obj)
        return results;
      if (nativeMap && obj.map === nativeMap)
        return obj.map(iterator, context);
      for (i = 0, j = obj.length; i < j; i++) {
        results[i] = iterator.call(context, obj[i], i, obj);
      }
      return results;
    }
    function checkPrecision(val, base) {
      val = Math.round(Math.abs(val));
      return isNaN(val) ? base : val;
    }
    function checkCurrencyFormat(format) {
      var defaults = lib.settings.currency.format;
      if (typeof format === "function")
        format = format();
      if (isString(format) && format.match("%v")) {
        return {
          pos: format,
          neg: format.replace("-", "").replace("%v", "-%v"),
          zero: format
        };
      } else if (!format || !format.pos || !format.pos.match("%v")) {
        return (!isString(defaults)) ? defaults : lib.settings.currency.format = {
          pos: defaults,
          neg: defaults.replace("%v", "-%v"),
          zero: defaults
        };
      }
      return format;
    }
    var unformat = lib.unformat = lib.parse = function(value, decimal) {
      if (isArray(value)) {
        return map(value, function(val) {
          return unformat(val, decimal);
        });
      }
      value = value || 0;
      if (typeof value === "number")
        return value;
      decimal = decimal || lib.settings.number.decimal;
      var regex = new RegExp("[^0-9-" + decimal + "]", ["g"]),
          unformatted = parseFloat(("" + value).replace(/\((.*)\)/, "-$1").replace(regex, '').replace(decimal, '.'));
      return !isNaN(unformatted) ? unformatted : 0;
    };
    var toFixed = lib.toFixed = function(value, precision) {
      precision = checkPrecision(precision, lib.settings.number.precision);
      var power = Math.pow(10, precision);
      return (Math.round(lib.unformat(value) * power) / power).toFixed(precision);
    };
    var formatNumber = lib.formatNumber = lib.format = function(number, precision, thousand, decimal) {
      if (isArray(number)) {
        return map(number, function(val) {
          return formatNumber(val, precision, thousand, decimal);
        });
      }
      number = unformat(number);
      var opts = defaults((isObject(precision) ? precision : {
        precision: precision,
        thousand: thousand,
        decimal: decimal
      }), lib.settings.number),
          usePrecision = checkPrecision(opts.precision),
          negative = number < 0 ? "-" : "",
          base = parseInt(toFixed(Math.abs(number || 0), usePrecision), 10) + "",
          mod = base.length > 3 ? base.length % 3 : 0;
      return negative + (mod ? base.substr(0, mod) + opts.thousand : "") + base.substr(mod).replace(/(\d{3})(?=\d)/g, "$1" + opts.thousand) + (usePrecision ? opts.decimal + toFixed(Math.abs(number), usePrecision).split('.')[1] : "");
    };
    var formatMoney = lib.formatMoney = function(number, symbol, precision, thousand, decimal, format) {
      if (isArray(number)) {
        return map(number, function(val) {
          return formatMoney(val, symbol, precision, thousand, decimal, format);
        });
      }
      number = unformat(number);
      var opts = defaults((isObject(symbol) ? symbol : {
        symbol: symbol,
        precision: precision,
        thousand: thousand,
        decimal: decimal,
        format: format
      }), lib.settings.currency),
          formats = checkCurrencyFormat(opts.format),
          useFormat = number > 0 ? formats.pos : number < 0 ? formats.neg : formats.zero;
      return useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(number), checkPrecision(opts.precision), opts.thousand, opts.decimal));
    };
    lib.formatColumn = function(list, symbol, precision, thousand, decimal, format) {
      if (!list)
        return [];
      var opts = defaults((isObject(symbol) ? symbol : {
        symbol: symbol,
        precision: precision,
        thousand: thousand,
        decimal: decimal,
        format: format
      }), lib.settings.currency),
          formats = checkCurrencyFormat(opts.format),
          padAfterSymbol = formats.pos.indexOf("%s") < formats.pos.indexOf("%v") ? true : false,
          maxLength = 0,
          formatted = map(list, function(val, i) {
            if (isArray(val)) {
              return lib.formatColumn(val, opts);
            } else {
              val = unformat(val);
              var useFormat = val > 0 ? formats.pos : val < 0 ? formats.neg : formats.zero,
                  fVal = useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(val), checkPrecision(opts.precision), opts.thousand, opts.decimal));
              if (fVal.length > maxLength)
                maxLength = fVal.length;
              return fVal;
            }
          });
      return map(formatted, function(val, i) {
        if (isString(val) && val.length < maxLength) {
          return padAfterSymbol ? val.replace(opts.symbol, opts.symbol + (new Array(maxLength - val.length + 1).join(" "))) : (new Array(maxLength - val.length + 1).join(" ")) + val;
        }
        return val;
      });
    };
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = lib;
      }
      exports.accounting = lib;
    } else if (typeof define === 'function' && define.amd) {
      define([], function() {
        return lib;
      });
    } else {
      lib.noConflict = (function(oldAccounting) {
        return function() {
          root.accounting = oldAccounting;
          lib.noConflict = undefined;
          return lib;
        };
      })(root.accounting);
      root['accounting'] = lib;
    }
  }(this));
  return module.exports;
});

$__System.register("6", ["5"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var accounting_1;
    function formatMoney(value) {
        return accounting_1.default.formatMoney(value, "");
    }
    exports_1("formatMoney", formatMoney);
    return {
        setters: [function (accounting_1_1) {
            accounting_1 = accounting_1_1;
        }],
        execute: function () {}
    };
});
$__System.register("7", [], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    function logToConsole() {
        var rest = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rest[_i - 0] = arguments[_i];
        }
        if (!System.production) {
            // tslint:disable-next-line
            console.log.apply(console, ['>>> LOGGER:'].concat(rest));
        }
    }
    exports_1("logToConsole", logToConsole);
    function logRejection(err) {
        console.log('Request Failed:', err);
    }
    exports_1("logRejection", logRejection);
    return {
        setters: [],
        execute: function () {
            ;
        }
    };
});
$__System.register("8", [], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    function isInputFocused(target) {
        return target === document.activeElement;
    }
    exports_1("isInputFocused", isInputFocused);
    function isNotValidCurrency(value) {
        if (value && (isNaN(parseFloat(value)) || !/^[0-9,.\s]+$/.test(value))) return true;
        var parts = value.toString().split(".");
        if (parts.length > 2) return true;
        var decimal = parts[1];
        return decimal && decimal.length > 2;
    }
    exports_1("isNotValidCurrency", isNotValidCurrency);
    function validateStatusCode(response) {
        if (response.status >= 200 && response.status < 300) {
            return true;
        } else {
            throw new Error(response.statusText);
        }
    }
    exports_1("validateStatusCode", validateStatusCode);
    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('9', ['6', '7', '8'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    function exportStar_1(m) {
        var exports = {};
        for (var n in m) {
            if (n !== "default") exports[n] = m[n];
        }
        exports_1(exports);
    }
    return {
        setters: [function (accounting_1_1) {
            exportStar_1(accounting_1_1);
        }, function (logging_1_1) {
            exportStar_1(logging_1_1);
        }, function (validation_1_1) {
            exportStar_1(validation_1_1);
        }],
        execute: function () {}
    };
});
$__System.register('a', ['4', '9'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator.throw(value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : new P(function (resolve) {
                    resolve(result.value);
                }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments)).next());
        });
    };
    var index_1;
    var FIXER_API_URL;
    // http://api.fixer.io/latest
    function getLatest(baseCurrency) {
        return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function callee$3$0() {
          var fixerLatestRates, response;

          return regeneratorRuntime.wrap(function callee$3$0$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
            case 0:
              fixerLatestRates = FIXER_API_URL + 'latest';
              if (baseCurrency) {
                  fixerLatestRates += '?base=' + baseCurrency;
              }
              context$4$0.prev = 2;
              context$4$0.next = 5;
              return fetch(fixerLatestRates);
            case 5:
              response = context$4$0.sent;
              index_1.validateStatusCode(response);
              return context$4$0.abrupt("return", response.json());
            case 10:
              context$4$0.prev = 10;
              context$4$0.t0 = context$4$0["catch"](2);
              index_1.logRejection(context$4$0.t0);
              return context$4$0.abrupt("return", context$4$0.t0);
            case 14:
            case "end":
              return context$4$0.stop();
            }
          }, callee$3$0, this, [[2, 10]]);
        }));
    }
    exports_1("getLatest", getLatest);
    // http://api.fixer.io/2000-01-03
    function getByDate(date, baseCurrency) {
        return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function callee$3$0() {
          var fixerRatesByDate, response;

          return regeneratorRuntime.wrap(function callee$3$0$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
            case 0:
              fixerRatesByDate = FIXER_API_URL + date.toISOString().slice(0, 10);
              if (baseCurrency) {
                  fixerRatesByDate += '?base=' + baseCurrency;
              }
              context$4$0.prev = 2;
              context$4$0.next = 5;
              return fetch(fixerRatesByDate);
            case 5:
              response = context$4$0.sent;
              index_1.validateStatusCode(response);
              return context$4$0.abrupt("return", response.json());
            case 10:
              context$4$0.prev = 10;
              context$4$0.t0 = context$4$0["catch"](2);
              index_1.logRejection(context$4$0.t0);
              return context$4$0.abrupt("return", context$4$0.t0);
            case 14:
            case "end":
              return context$4$0.stop();
            }
          }, callee$3$0, this, [[2, 10]]);
        }));
    }
    exports_1("getByDate", getByDate);
    return {
        setters: [function (_1) {}, function (index_1_1) {
            index_1 = index_1_1;
        }],
        execute: function () {
            // Get the latest foreign exchange reference rates in JSON format.
            FIXER_API_URL = 'https://api.fixer.io/';
        }
    };
});
$__System.register("b", ["c"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React;
    function CurrencySelect(_a) {
        var currencies = _a.currencies,
            selectedCurrency = _a.selectedCurrency,
            onSelect = _a.onSelect;
        return React.createElement("div", { className: "" }, React.createElement("select", { className: "c-choice c-choice--padded", value: selectedCurrency, onChange: onSelect }, Object.keys(currencies).map(function (currencyKey) {
            return React.createElement("option", { key: currencyKey }, currencyKey);
        })));
    }
    exports_1("CurrencySelect", CurrencySelect);
    return {
        setters: [function (React_1) {
            React = React_1;
        }],
        execute: function () {}
    };
});
$__System.register("d", ["c"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React;
    function CurrencyInput(_a) {
        var value = _a.value,
            onChange = _a.onChange;
        return React.createElement("div", { className: "" }, React.createElement("div", { className: "u-letter-box--medium" }, React.createElement("input", { className: "c-field c-field--xlarge", type: "text", value: value, onChange: onChange, onBlur: onChange })));
    }
    exports_1("CurrencyInput", CurrencyInput);
    return {
        setters: [function (React_1) {
            React = React_1;
        }],
        execute: function () {}
    };
});
$__System.register('e', ['c', '3', '9', 'a', 'b', 'd'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var __extends = this && this.__extends || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator.throw(value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : new P(function (resolve) {
                    resolve(result.value);
                }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments)).next());
        });
    };
    var React, money_1, index_1, CurrencyRatesService, currency_select_1, currency_input_1;
    var NUMBERS_LIMIT, CurrencyConverter;
    return {
        setters: [function (React_1) {
            React = React_1;
        }, function (money_1_1) {
            money_1 = money_1_1;
        }, function (index_1_1) {
            index_1 = index_1_1;
        }, function (CurrencyRatesService_1) {
            CurrencyRatesService = CurrencyRatesService_1;
        }, function (currency_select_1_1) {
            currency_select_1 = currency_select_1_1;
        }, function (currency_input_1_1) {
            currency_input_1 = currency_input_1_1;
        }],
        execute: function () {
            NUMBERS_LIMIT = 19;
            CurrencyConverter = function (_super) {
                __extends(CurrencyConverter, _super);
                function CurrencyConverter() {
                    var _this = this;
                    _super.apply(this, arguments);
                    this.state = {
                        currencies: JSON.parse(this.props.storage.currencies),
                        fromValue: this.props.storage.fromValue,
                        toValue: ""
                    };
                    this.handleFromCurrencySelect = function (node) {
                        var selectedFromCurrency = node.target.value;
                        var newToValue = _this.calculateRateOrEmptyString(_this.state.fromValue, selectedFromCurrency, _this.props.toCurrency, true);
                        // TODO: bug przy zmianie
                        _this.props.onFromCurrencyChange(selectedFromCurrency);
                        _this.setState({
                            toValue: newToValue
                        });
                    };
                    this.handleToCurrencySelect = function (node) {
                        var selectedToCurrency = node.target.value;
                        var newToValue = _this.calculateRateOrEmptyString(_this.state.fromValue, _this.props.fromCurrency, selectedToCurrency, true);
                        _this.props.onToCurrencyChange(selectedToCurrency);
                        _this.setState({
                            toValue: newToValue
                        });
                    };
                    this.handleFromValueChange = function (node) {
                        var newFromValue = node.target.value;
                        // check lenght on formatted value to include delimiters, also checking if lenght has reduced
                        // to cover overflow edge case, validate valid currency format
                        if (index_1.isNotValidCurrency(newFromValue) || index_1.formatMoney(newFromValue).length > NUMBERS_LIMIT && newFromValue.length >= _this.state.fromValue.length) return;
                        // format input value only when focus is lost because caret position will jump
                        if (!index_1.isInputFocused(node.target)) {
                            newFromValue = index_1.formatMoney(newFromValue);
                        }
                        var newToValue = _this.calculateRateOrEmptyString(newFromValue, _this.props.fromCurrency, _this.props.toCurrency, true);
                        // check lenght of calculated value so do not extend a limit
                        if (index_1.formatMoney(newToValue).length > NUMBERS_LIMIT) return;
                        _this.setState({
                            fromValue: newFromValue,
                            toValue: newToValue
                        });
                    };
                    this.handleToValueChange = function (node) {
                        var newToValue = node.target.value;
                        // check lenght on formatted value to include delimiters, also checking if lenght has reduced
                        // to cover overflow edge case, validate valid currency formatt
                        if (index_1.isNotValidCurrency(newToValue) || index_1.formatMoney(newToValue).length > NUMBERS_LIMIT && newToValue.length >= _this.state.fromValue.length) return;
                        // format input value only when focus is lost because caret position will jump
                        if (!index_1.isInputFocused(node.target)) {
                            newToValue = index_1.formatMoney(newToValue);
                        }
                        var newFromValue = _this.calculateRateOrEmptyString(newToValue, _this.props.toCurrency, _this.props.fromCurrency, true);
                        // check lenght of calculated value so do not extend a limit
                        if (index_1.formatMoney(newFromValue).length > NUMBERS_LIMIT) return;
                        _this.setState({
                            fromValue: newFromValue,
                            toValue: newToValue
                        });
                    };
                    this.calculateRateOrEmptyString = function (fromValue, fromCurrency, toCurrency, format) {
                        if (format === void 0) {
                            format = false;
                        }
                        // have to check if Money library is initialized with data from service or else Throws
                        if (money_1.default.base) {
                            var value = money_1.default(fromValue).from(fromCurrency).to(toCurrency);
                            return format ? index_1.formatMoney(value) : value;
                        } else {
                            return "";
                        }
                    };
                }
                CurrencyConverter.prototype.componentDidUpdate = function (prevProps, prevState) {
                    this.props.storage.save({
                        currencies: JSON.stringify(this.state.currencies),
                        fromValue: this.state.fromValue
                    });
                };
                CurrencyConverter.prototype.componentWillMount = function () {
                    this.fetchLatestRates();
                };
                CurrencyConverter.prototype.fetchLatestRates = function () {
                    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function callee$5$0() {
                      var data;

                      return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                        while (1) switch (context$6$0.prev = context$6$0.next) {
                        case 0:
                          context$6$0.next = 2;
                          return CurrencyRatesService.getLatest();
                        case 2:
                          data = context$6$0.sent;
                          money_1.default.base = data.base;
                          money_1.default.rates = data.rates;
                          this.setState({
                              currencies: data.rates,
                              toValue: this.calculateRateOrEmptyString(this.state.fromValue, this.props.fromCurrency, this.props.toCurrency, true)
                          });
                        case 6:
                        case "end":
                          return context$6$0.stop();
                        }
                      }, callee$5$0, this);
                    }));
                };
                CurrencyConverter.prototype.render = function () {
                    return React.createElement("div", { className: "o-grid o-grid--small-full o-grid--medium-full" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement(currency_select_1.CurrencySelect, { currencies: this.state.currencies, selectedCurrency: this.props.fromCurrency, onSelect: this.handleFromCurrencySelect }), React.createElement(currency_input_1.CurrencyInput, { value: this.state.fromValue, onChange: this.handleFromValueChange })), React.createElement("div", { className: "o-grid__cell" }, React.createElement(currency_select_1.CurrencySelect, { currencies: this.state.currencies, selectedCurrency: this.props.toCurrency, onSelect: this.handleToCurrencySelect }), React.createElement(currency_input_1.CurrencyInput, { value: this.state.toValue, onChange: this.handleToValueChange })));
                };
                return CurrencyConverter;
            }(React.Component);
            exports_1("CurrencyConverter", CurrencyConverter);
        }
    };
});
$__System.register("f", ["c"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React;
    function CurrencyConverterHeader() {
        return React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement("h3", { className: "c-heading c-heading--large" }, "Currency Converter")));
    }
    exports_1("CurrencyConverterHeader", CurrencyConverterHeader);
    return {
        setters: [function (React_1) {
            React = React_1;
        }],
        execute: function () {}
    };
});
$__System.register("10", ["c"], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React;
    function CurrencyValuationHeaderSelect(_a) {
        var fromCurrency = _a.fromCurrency,
            toCurrency = _a.toCurrency,
            selectedPeriod = _a.selectedPeriod,
            onChange = _a.onChange;
        return React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, fromCurrency, "/", toCurrency), React.createElement("div", { className: "o-grid__cell o-grid__cell--width-75" }, React.createElement("div", { className: "c-link--right" }, "Predefined Change Period"))), React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement("select", { className: "c-choice c-choice", defaultValue: selectedPeriod, onChange: onChange }, React.createElement("option", { value: 30 }, "1 Month"), React.createElement("option", { value: 60 }, "2 Months"), React.createElement("option", { value: 91 }, "3 Months"), React.createElement("option", { value: 182 }, "6 Months"), React.createElement("option", { value: 365 }, "1 Year"))))));
    }
    exports_1("CurrencyValuationHeaderSelect", CurrencyValuationHeaderSelect);
    return {
        setters: [function (React_1) {
            React = React_1;
        }],
        execute: function () {}
    };
});
$__System.registerDynamic("11", ["17", "18", "19", "1a", "1b", "c", "1c", "12", "13", "14", "15", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  var _getPrototypeOf = $__require('17');
  var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);
  var _classCallCheck2 = $__require('18');
  var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);
  var _createClass2 = $__require('19');
  var _createClass3 = _interopRequireDefault(_createClass2);
  var _possibleConstructorReturn2 = $__require('1a');
  var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);
  var _inherits2 = $__require('1b');
  var _inherits3 = _interopRequireDefault(_inherits2);
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  var _classnames = $__require('1c');
  var _classnames2 = _interopRequireDefault(_classnames);
  var _moment = $__require('12');
  var _moment2 = _interopRequireDefault(_moment);
  $__require('13');
  var _cell = $__require('14');
  var _cell2 = _interopRequireDefault(_cell);
  var _viewHeader = $__require('15');
  var _viewHeader2 = _interopRequireDefault(_viewHeader);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var DayView = function(_React$Component) {
    (0, _inherits3.default)(DayView, _React$Component);
    function DayView() {
      var _Object$getPrototypeO;
      var _temp,
          _this,
          _ret;
      (0, _classCallCheck3.default)(this, DayView);
      for (var _len = arguments.length,
          args = Array(_len),
          _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return (_ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)(this, (_Object$getPrototypeO = (0, _getPrototypeOf2.default)(DayView)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.cellClick = function(e) {
        var cell = e.target;
        var date = parseInt(cell.innerHTML, 10);
        var newDate = _this.props.date ? _this.props.date.clone() : (0, _moment2.default)();
        if (isNaN(date))
          return;
        if (cell.className.indexOf('prev') > -1) {
          newDate.subtract(1, 'months');
        } else if (cell.className.indexOf('next') > -1) {
          newDate.add(1, 'months');
        }
        newDate.date(date);
        _this.props.setDate(newDate, true);
      }, _this.next = function() {
        var nextDate = _this.props.date.clone().add(1, 'months');
        if (_this.props.maxDate && nextDate.isAfter(_this.props.maxDate, 'day')) {
          nextDate = _this.props.maxDate;
        }
        _this.props.setDate(nextDate);
      }, _this.prev = function() {
        var prevDate = _this.props.date.clone().subtract(1, 'months');
        if (_this.props.minDate && prevDate.isBefore(_this.props.minDate, 'day')) {
          prevDate = _this.props.minDate;
        }
        _this.props.setDate(prevDate);
      }, _temp), (0, _possibleConstructorReturn3.default)(_this, _ret));
    }
    (0, _createClass3.default)(DayView, [{
      key: 'getDays',
      value: function getDays() {
        var now = this.props.date ? this.props.date : (0, _moment2.default)();
        var start = now.clone().startOf('month').weekday(0);
        var end = now.clone().endOf('month').weekday(6);
        var minDate = this.props.minDate;
        var maxDate = this.props.maxDate;
        var month = now.month();
        var today = (0, _moment2.default)();
        var currDay = now.date();
        var year = now.year();
        var days = [];
        (0, _moment2.default)().range(start, end).by('days', function(day) {
          days.push({
            label: day.format('D'),
            prev: day.month() < month && !(day.year() > year) || day.year() < year,
            next: day.month() > month || day.year() > year,
            disabled: day.isBefore(minDate, 'day') || day.isAfter(maxDate, 'day'),
            curr: day.date() === currDay && day.month() === month,
            today: day.date() === today.date() && day.month() === today.month() && day.year() === today.year()
          });
        });
        return days;
      }
    }, {
      key: 'getDaysTitles',
      value: function getDaysTitles() {
        var now = (0, _moment2.default)();
        return [0, 1, 2, 3, 4, 5, 6].map(function(i) {
          var weekday = now.weekday(i).format('dd');
          return {
            val: weekday,
            label: weekday
          };
        });
      }
    }, {
      key: 'render',
      value: function render() {
        var titles = this.getDaysTitles().map(function(item, i) {
          return _react2.default.createElement(_cell2.default, {
            classes: 'day title',
            key: i,
            value: item.label
          });
        });
        var _class = void 0;
        var days = this.getDays().map(function(item, i) {
          _class = (0, _classnames2.default)({
            day: true,
            next: item.next,
            prev: item.prev,
            disabled: item.disabled,
            current: item.curr,
            today: item.today
          });
          return _react2.default.createElement(_cell2.default, {
            classes: _class,
            key: i,
            value: item.label
          });
        });
        var currentDate = this.props.date ? this.props.date.format('MMMM') : (0, _moment2.default)().format('MMMM');
        return _react2.default.createElement('div', {
          className: 'view days-view',
          onKeyDown: this.keyDown
        }, _react2.default.createElement(_viewHeader2.default, {
          data: currentDate,
          next: this.next,
          prev: this.prev,
          titleAction: this.props.nextView
        }), _react2.default.createElement('div', {className: 'days-title'}, titles), _react2.default.createElement('div', {
          className: 'days',
          onClick: this.cellClick
        }, days));
      }
    }]);
    return DayView;
  }(_react2.default.Component);
  DayView.propTypes = {
    date: _react2.default.PropTypes.object.isRequired,
    minDate: _react2.default.PropTypes.any,
    maxDate: _react2.default.PropTypes.any,
    setDate: _react2.default.PropTypes.func,
    nextView: _react2.default.PropTypes.func
  };
  exports.default = DayView;
  return module.exports;
});

$__System.registerDynamic("1d", ["17", "18", "19", "1a", "1b", "c", "1c", "12", "13", "14", "15", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  var _getPrototypeOf = $__require('17');
  var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);
  var _classCallCheck2 = $__require('18');
  var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);
  var _createClass2 = $__require('19');
  var _createClass3 = _interopRequireDefault(_createClass2);
  var _possibleConstructorReturn2 = $__require('1a');
  var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);
  var _inherits2 = $__require('1b');
  var _inherits3 = _interopRequireDefault(_inherits2);
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  var _classnames = $__require('1c');
  var _classnames2 = _interopRequireDefault(_classnames);
  var _moment = $__require('12');
  var _moment2 = _interopRequireDefault(_moment);
  $__require('13');
  var _cell = $__require('14');
  var _cell2 = _interopRequireDefault(_cell);
  var _viewHeader = $__require('15');
  var _viewHeader2 = _interopRequireDefault(_viewHeader);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var MonthView = function(_React$Component) {
    (0, _inherits3.default)(MonthView, _React$Component);
    function MonthView() {
      var _Object$getPrototypeO;
      var _temp,
          _this,
          _ret;
      (0, _classCallCheck3.default)(this, MonthView);
      for (var _len = arguments.length,
          args = Array(_len),
          _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return (_ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)(this, (_Object$getPrototypeO = (0, _getPrototypeOf2.default)(MonthView)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.cellClick = function(e) {
        var month = e.target.innerHTML;
        if (_this.checkIfMonthDisabled(month))
          return;
        var date = _this.props.date.clone().month(month);
        _this.props.prevView(date);
      }, _this.next = function() {
        var nextDate = _this.props.date.clone().add(1, 'years');
        if (_this.props.maxDate && nextDate.isAfter(_this.props.maxDate, 'day')) {
          nextDate = _this.props.maxDate;
        }
        _this.props.setDate(nextDate);
      }, _this.prev = function() {
        var prevDate = _this.props.date.clone().subtract(1, 'years');
        if (_this.props.minDate && prevDate.isBefore(_this.props.minDate, 'day')) {
          prevDate = _this.props.minDate;
        }
        _this.props.setDate(prevDate);
      }, _temp), (0, _possibleConstructorReturn3.default)(_this, _ret));
    }
    (0, _createClass3.default)(MonthView, [{
      key: 'checkIfMonthDisabled',
      value: function checkIfMonthDisabled(month) {
        var now = this.props.date;
        return now.clone().month(month).endOf('month').isBefore(this.props.minDate, 'day') || now.clone().month(month).startOf('month').isAfter(this.props.maxDate, 'day');
      }
    }, {
      key: 'getMonth',
      value: function getMonth() {
        var _this2 = this;
        var month = this.props.date.month();
        return _moment2.default.monthsShort().map(function(item, i) {
          return {
            label: item,
            disabled: _this2.checkIfMonthDisabled(i),
            curr: i === month
          };
        });
      }
    }, {
      key: 'render',
      value: function render() {
        var currentDate = this.props.date.format('YYYY');
        var months = this.getMonth().map(function(item, i) {
          var _class = (0, _classnames2.default)({
            month: true,
            disabled: item.disabled,
            current: item.curr
          });
          return _react2.default.createElement(_cell2.default, {
            classes: _class,
            key: i,
            value: item.label
          });
        });
        return _react2.default.createElement('div', {className: 'months-view'}, _react2.default.createElement(_viewHeader2.default, {
          data: currentDate,
          next: this.next,
          prev: this.prev,
          titleAction: this.props.nextView
        }), _react2.default.createElement('div', {
          className: 'months',
          onClick: this.cellClick
        }, months));
      }
    }]);
    return MonthView;
  }(_react2.default.Component);
  MonthView.propTypes = {
    date: _react2.default.PropTypes.object.isRequired,
    minDate: _react2.default.PropTypes.any,
    maxDate: _react2.default.PropTypes.any
  };
  exports.default = MonthView;
  return module.exports;
});

$__System.registerDynamic("1e", ["1f", "20", "21", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('1f'),
      core = $__require('20'),
      fails = $__require('21');
  module.exports = function(KEY, exec) {
    var fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
    exp[KEY] = exec(fn);
    $export($export.S + $export.F * fails(function() {
      fn(1);
    }), 'Object', exp);
  };
  return module.exports;
});

$__System.registerDynamic("22", ["23", "24", "1e", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toObject = $__require('23'),
      $getPrototypeOf = $__require('24');
  $__require('1e')('getPrototypeOf', function() {
    return function getPrototypeOf(it) {
      return $getPrototypeOf(toObject(it));
    };
  });
  return module.exports;
});

$__System.registerDynamic("25", ["22", "20", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('22');
  module.exports = $__require('20').Object.getPrototypeOf;
  return module.exports;
});

$__System.registerDynamic("17", ["25"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('25'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("18", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.__esModule = true;
  exports.default = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  return module.exports;
});

$__System.registerDynamic("26", ["1f", "27", "28", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('1f');
  $export($export.S + $export.F * !$__require('27'), 'Object', {defineProperty: $__require('28').f});
  return module.exports;
});

$__System.registerDynamic("29", ["26", "20", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('26');
  var $Object = $__require('20').Object;
  module.exports = function defineProperty(it, key, desc) {
    return $Object.defineProperty(it, key, desc);
  };
  return module.exports;
});

$__System.registerDynamic("2a", ["29"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('29'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("19", ["2a"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.__esModule = true;
  var _defineProperty = $__require('2a');
  var _defineProperty2 = _interopRequireDefault(_defineProperty);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  exports.default = function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        (0, _defineProperty2.default)(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();
  return module.exports;
});

$__System.registerDynamic("1a", ["2b"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.__esModule = true;
  var _typeof2 = $__require('2b');
  var _typeof3 = _interopRequireDefault(_typeof2);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  exports.default = function(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
  };
  return module.exports;
});

$__System.registerDynamic("2c", ["2d", "2e", "2f", "30", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('2d'),
      anObject = $__require('2e');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = $__require('2f')(Function.call, $__require('30').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) {
        buggy = true;
      }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy)
          O.__proto__ = proto;
        else
          set(O, proto);
        return O;
      };
    }({}, false) : undefined),
    check: check
  };
  return module.exports;
});

$__System.registerDynamic("31", ["1f", "2c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('1f');
  $export($export.S, 'Object', {setPrototypeOf: $__require('2c').set});
  return module.exports;
});

$__System.registerDynamic("32", ["31", "20", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('31');
  module.exports = $__require('20').Object.setPrototypeOf;
  return module.exports;
});

$__System.registerDynamic("33", ["32"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('32'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("34", ["1f", "35", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('1f');
  $export($export.S, 'Object', {create: $__require('35')});
  return module.exports;
});

$__System.registerDynamic("36", ["34", "20", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('34');
  var $Object = $__require('20').Object;
  module.exports = function create(P, D) {
    return $Object.create(P, D);
  };
  return module.exports;
});

$__System.registerDynamic("37", ["36"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('36'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("38", ["39", "3a", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('39'),
      defined = $__require('3a');
  module.exports = function(TO_STRING) {
    return function(that, pos) {
      var s = String(defined(that)),
          i = toInteger(pos),
          l = s.length,
          a,
          b;
      if (i < 0 || i >= l)
        return TO_STRING ? '' : undefined;
      a = s.charCodeAt(i);
      return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    };
  };
  return module.exports;
});

$__System.registerDynamic("3b", ["38", "3c", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $at = $__require('38')(true);
  $__require('3c')(String, 'String', function(iterated) {
    this._t = String(iterated);
    this._i = 0;
  }, function() {
    var O = this._t,
        index = this._i,
        point;
    if (index >= O.length)
      return {
        value: undefined,
        done: true
      };
    point = $at(O, index);
    this._i += point.length;
    return {
      value: point,
      done: false
    };
  });
  return module.exports;
});

$__System.registerDynamic("3d", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function() {};
  return module.exports;
});

$__System.registerDynamic("3e", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(done, value) {
    return {
      value: value,
      done: !!done
    };
  };
  return module.exports;
});

$__System.registerDynamic("3f", ["35", "40", "41", "42", "43", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var create = $__require('35'),
      descriptor = $__require('40'),
      setToStringTag = $__require('41'),
      IteratorPrototype = {};
  $__require('42')(IteratorPrototype, $__require('43')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  return module.exports;
});

$__System.registerDynamic("23", ["3a", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var defined = $__require('3a');
  module.exports = function(it) {
    return Object(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("24", ["44", "23", "45", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var has = $__require('44'),
      toObject = $__require('23'),
      IE_PROTO = $__require('45')('IE_PROTO'),
      ObjectProto = Object.prototype;
  module.exports = Object.getPrototypeOf || function(O) {
    O = toObject(O);
    if (has(O, IE_PROTO))
      return O[IE_PROTO];
    if (typeof O.constructor == 'function' && O instanceof O.constructor) {
      return O.constructor.prototype;
    }
    return O instanceof Object ? ObjectProto : null;
  };
  return module.exports;
});

$__System.registerDynamic("3c", ["46", "1f", "47", "42", "44", "48", "3f", "41", "24", "43", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var LIBRARY = $__require('46'),
      $export = $__require('1f'),
      redefine = $__require('47'),
      hide = $__require('42'),
      has = $__require('44'),
      Iterators = $__require('48'),
      $iterCreate = $__require('3f'),
      setToStringTag = $__require('41'),
      getPrototypeOf = $__require('24'),
      ITERATOR = $__require('43')('iterator'),
      BUGGY = !([].keys && 'next' in [].keys()),
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values';
  var returnThis = function() {
    return this;
  };
  module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
    $iterCreate(Constructor, NAME, next);
    var getMethod = function(kind) {
      if (!BUGGY && kind in proto)
        return proto[kind];
      switch (kind) {
        case KEYS:
          return function keys() {
            return new Constructor(this, kind);
          };
        case VALUES:
          return function values() {
            return new Constructor(this, kind);
          };
      }
      return function entries() {
        return new Constructor(this, kind);
      };
    };
    var TAG = NAME + ' Iterator',
        DEF_VALUES = DEFAULT == VALUES,
        VALUES_BUG = false,
        proto = Base.prototype,
        $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        $default = $native || getMethod(DEFAULT),
        $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined,
        $anyNative = NAME == 'Array' ? proto.entries || $native : $native,
        methods,
        key,
        IteratorPrototype;
    if ($anyNative) {
      IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
      if (IteratorPrototype !== Object.prototype) {
        setToStringTag(IteratorPrototype, TAG, true);
        if (!LIBRARY && !has(IteratorPrototype, ITERATOR))
          hide(IteratorPrototype, ITERATOR, returnThis);
      }
    }
    if (DEF_VALUES && $native && $native.name !== VALUES) {
      VALUES_BUG = true;
      $default = function values() {
        return $native.call(this);
      };
    }
    if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
      hide(proto, ITERATOR, $default);
    }
    Iterators[NAME] = $default;
    Iterators[TAG] = returnThis;
    if (DEFAULT) {
      methods = {
        values: DEF_VALUES ? $default : getMethod(VALUES),
        keys: IS_SET ? $default : getMethod(KEYS),
        entries: $entries
      };
      if (FORCED)
        for (key in methods) {
          if (!(key in proto))
            redefine(proto, key, methods[key]);
        }
      else
        $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
    }
    return methods;
  };
  return module.exports;
});

$__System.registerDynamic("49", ["3d", "3e", "48", "4a", "3c", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var addToUnscopables = $__require('3d'),
      step = $__require('3e'),
      Iterators = $__require('48'),
      toIObject = $__require('4a');
  module.exports = $__require('3c')(Array, 'Array', function(iterated, kind) {
    this._t = toIObject(iterated);
    this._i = 0;
    this._k = kind;
  }, function() {
    var O = this._t,
        kind = this._k,
        index = this._i++;
    if (!O || index >= O.length) {
      this._t = undefined;
      return step(1);
    }
    if (kind == 'keys')
      return step(0, index);
    if (kind == 'values')
      return step(0, O[index]);
    return step(0, [index, O[index]]);
  }, 'values');
  Iterators.Arguments = Iterators.Array;
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');
  return module.exports;
});

$__System.registerDynamic("48", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {};
  return module.exports;
});

$__System.registerDynamic("4b", ["49", "4c", "42", "48", "43", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('49');
  var global = $__require('4c'),
      hide = $__require('42'),
      Iterators = $__require('48'),
      TO_STRING_TAG = $__require('43')('toStringTag');
  for (var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'],
      i = 0; i < 5; i++) {
    var NAME = collections[i],
        Collection = global[NAME],
        proto = Collection && Collection.prototype;
    if (proto && !proto[TO_STRING_TAG])
      hide(proto, TO_STRING_TAG, NAME);
    Iterators[NAME] = Iterators.Array;
  }
  return module.exports;
});

$__System.registerDynamic("4d", ["3b", "4b", "4e", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('3b');
  $__require('4b');
  module.exports = $__require('4e').f('iterator');
  return module.exports;
});

$__System.registerDynamic("4f", ["4d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('4d'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("50", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (typeof it != 'function')
      throw TypeError(it + ' is not a function!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("2f", ["50", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var aFunction = $__require('50');
  module.exports = function(fn, that, length) {
    aFunction(fn);
    if (that === undefined)
      return fn;
    switch (length) {
      case 1:
        return function(a) {
          return fn.call(that, a);
        };
      case 2:
        return function(a, b) {
          return fn.call(that, a, b);
        };
      case 3:
        return function(a, b, c) {
          return fn.call(that, a, b, c);
        };
    }
    return function() {
      return fn.apply(that, arguments);
    };
  };
  return module.exports;
});

$__System.registerDynamic("1f", ["4c", "20", "2f", "42", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('4c'),
      core = $__require('20'),
      ctx = $__require('2f'),
      hide = $__require('42'),
      PROTOTYPE = 'prototype';
  var $export = function(type, name, source) {
    var IS_FORCED = type & $export.F,
        IS_GLOBAL = type & $export.G,
        IS_STATIC = type & $export.S,
        IS_PROTO = type & $export.P,
        IS_BIND = type & $export.B,
        IS_WRAP = type & $export.W,
        exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
        expProto = exports[PROTOTYPE],
        target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE],
        key,
        own,
        out;
    if (IS_GLOBAL)
      source = name;
    for (key in source) {
      own = !IS_FORCED && target && target[key] !== undefined;
      if (own && key in exports)
        continue;
      out = own ? target[key] : source[key];
      exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key] : IS_BIND && own ? ctx(out, global) : IS_WRAP && target[key] == out ? (function(C) {
        var F = function(a, b, c) {
          if (this instanceof C) {
            switch (arguments.length) {
              case 0:
                return new C;
              case 1:
                return new C(a);
              case 2:
                return new C(a, b);
            }
            return new C(a, b, c);
          }
          return C.apply(this, arguments);
        };
        F[PROTOTYPE] = C[PROTOTYPE];
        return F;
      })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
      if (IS_PROTO) {
        (exports.virtual || (exports.virtual = {}))[key] = out;
        if (type & $export.R && expProto && !expProto[key])
          hide(expProto, key, out);
      }
    }
  };
  $export.F = 1;
  $export.G = 2;
  $export.S = 4;
  $export.P = 8;
  $export.B = 16;
  $export.W = 32;
  $export.U = 64;
  $export.R = 128;
  module.exports = $export;
  return module.exports;
});

$__System.registerDynamic("47", ["42", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('42');
  return module.exports;
});

$__System.registerDynamic("51", ["52", "2d", "44", "28", "21", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var META = $__require('52')('meta'),
      isObject = $__require('2d'),
      has = $__require('44'),
      setDesc = $__require('28').f,
      id = 0;
  var isExtensible = Object.isExtensible || function() {
    return true;
  };
  var FREEZE = !$__require('21')(function() {
    return isExtensible(Object.preventExtensions({}));
  });
  var setMeta = function(it) {
    setDesc(it, META, {value: {
        i: 'O' + ++id,
        w: {}
      }});
  };
  var fastKey = function(it, create) {
    if (!isObject(it))
      return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
    if (!has(it, META)) {
      if (!isExtensible(it))
        return 'F';
      if (!create)
        return 'E';
      setMeta(it);
    }
    return it[META].i;
  };
  var getWeak = function(it, create) {
    if (!has(it, META)) {
      if (!isExtensible(it))
        return true;
      if (!create)
        return false;
      setMeta(it);
    }
    return it[META].w;
  };
  var onFreeze = function(it) {
    if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META))
      setMeta(it);
    return it;
  };
  var meta = module.exports = {
    KEY: META,
    NEED: false,
    fastKey: fastKey,
    getWeak: getWeak,
    onFreeze: onFreeze
  };
  return module.exports;
});

$__System.registerDynamic("41", ["28", "44", "43", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var def = $__require('28').f,
      has = $__require('44'),
      TAG = $__require('43')('toStringTag');
  module.exports = function(it, tag, stat) {
    if (it && !has(it = stat ? it : it.prototype, TAG))
      def(it, TAG, {
        configurable: true,
        value: tag
      });
  };
  return module.exports;
});

$__System.registerDynamic("53", ["54", "4a", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var getKeys = $__require('54'),
      toIObject = $__require('4a');
  module.exports = function(object, el) {
    var O = toIObject(object),
        keys = getKeys(O),
        length = keys.length,
        index = 0,
        key;
    while (length > index)
      if (O[key = keys[index++]] === el)
        return key;
  };
  return module.exports;
});

$__System.registerDynamic("55", ["54", "56", "57", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var getKeys = $__require('54'),
      gOPS = $__require('56'),
      pIE = $__require('57');
  module.exports = function(it) {
    var result = getKeys(it),
        getSymbols = gOPS.f;
    if (getSymbols) {
      var symbols = getSymbols(it),
          isEnum = pIE.f,
          i = 0,
          key;
      while (symbols.length > i)
        if (isEnum.call(it, key = symbols[i++]))
          result.push(key);
    }
    return result;
  };
  return module.exports;
});

$__System.registerDynamic("58", ["59", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('59');
  module.exports = Array.isArray || function isArray(arg) {
    return cof(arg) == 'Array';
  };
  return module.exports;
});

$__System.registerDynamic("5a", ["28", "2e", "54", "27", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var dP = $__require('28'),
      anObject = $__require('2e'),
      getKeys = $__require('54');
  module.exports = $__require('27') ? Object.defineProperties : function defineProperties(O, Properties) {
    anObject(O);
    var keys = getKeys(Properties),
        length = keys.length,
        i = 0,
        P;
    while (length > i)
      dP.f(O, P = keys[i++], Properties[P]);
    return O;
  };
  return module.exports;
});

$__System.registerDynamic("5b", ["4c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('4c').document && document.documentElement;
  return module.exports;
});

$__System.registerDynamic("35", ["2e", "5a", "5c", "45", "5d", "5b", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('2e'),
      dPs = $__require('5a'),
      enumBugKeys = $__require('5c'),
      IE_PROTO = $__require('45')('IE_PROTO'),
      Empty = function() {},
      PROTOTYPE = 'prototype';
  var createDict = function() {
    var iframe = $__require('5d')('iframe'),
        i = enumBugKeys.length,
        lt = '<',
        gt = '>',
        iframeDocument;
    iframe.style.display = 'none';
    $__require('5b').appendChild(iframe);
    iframe.src = 'javascript:';
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
    iframeDocument.close();
    createDict = iframeDocument.F;
    while (i--)
      delete createDict[PROTOTYPE][enumBugKeys[i]];
    return createDict();
  };
  module.exports = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      Empty[PROTOTYPE] = anObject(O);
      result = new Empty;
      Empty[PROTOTYPE] = null;
      result[IE_PROTO] = O;
    } else
      result = createDict();
    return Properties === undefined ? result : dPs(result, Properties);
  };
  return module.exports;
});

$__System.registerDynamic("5e", ["4a", "5f", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toIObject = $__require('4a'),
      gOPN = $__require('5f').f,
      toString = {}.toString;
  var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
  var getWindowNames = function(it) {
    try {
      return gOPN(it);
    } catch (e) {
      return windowNames.slice();
    }
  };
  module.exports.f = function getOwnPropertyNames(it) {
    return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
  };
  return module.exports;
});

$__System.registerDynamic("30", ["57", "40", "4a", "60", "44", "61", "27", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var pIE = $__require('57'),
      createDesc = $__require('40'),
      toIObject = $__require('4a'),
      toPrimitive = $__require('60'),
      has = $__require('44'),
      IE8_DOM_DEFINE = $__require('61'),
      gOPD = Object.getOwnPropertyDescriptor;
  exports.f = $__require('27') ? gOPD : function getOwnPropertyDescriptor(O, P) {
    O = toIObject(O);
    P = toPrimitive(P, true);
    if (IE8_DOM_DEFINE)
      try {
        return gOPD(O, P);
      } catch (e) {}
    if (has(O, P))
      return createDesc(!pIE.f.call(O, P), O[P]);
  };
  return module.exports;
});

$__System.registerDynamic("54", ["62", "5c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $keys = $__require('62'),
      enumBugKeys = $__require('5c');
  module.exports = Object.keys || function keys(O) {
    return $keys(O, enumBugKeys);
  };
  return module.exports;
});

$__System.registerDynamic("44", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var hasOwnProperty = {}.hasOwnProperty;
  module.exports = function(it, key) {
    return hasOwnProperty.call(it, key);
  };
  return module.exports;
});

$__System.registerDynamic("59", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toString = {}.toString;
  module.exports = function(it) {
    return toString.call(it).slice(8, -1);
  };
  return module.exports;
});

$__System.registerDynamic("63", ["59", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('59');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  return module.exports;
});

$__System.registerDynamic("3a", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("4a", ["63", "3a", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var IObject = $__require('63'),
      defined = $__require('3a');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("64", ["39", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('39'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  return module.exports;
});

$__System.registerDynamic("39", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var ceil = Math.ceil,
      floor = Math.floor;
  module.exports = function(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  };
  return module.exports;
});

$__System.registerDynamic("65", ["39", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('39'),
      max = Math.max,
      min = Math.min;
  module.exports = function(index, length) {
    index = toInteger(index);
    return index < 0 ? max(index + length, 0) : min(index, length);
  };
  return module.exports;
});

$__System.registerDynamic("66", ["4a", "64", "65", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var toIObject = $__require('4a'),
      toLength = $__require('64'),
      toIndex = $__require('65');
  module.exports = function(IS_INCLUDES) {
    return function($this, el, fromIndex) {
      var O = toIObject($this),
          length = toLength(O.length),
          index = toIndex(fromIndex, length),
          value;
      if (IS_INCLUDES && el != el)
        while (length > index) {
          value = O[index++];
          if (value != value)
            return true;
        }
      else
        for (; length > index; index++)
          if (IS_INCLUDES || index in O) {
            if (O[index] === el)
              return IS_INCLUDES || index || 0;
          }
      return !IS_INCLUDES && -1;
    };
  };
  return module.exports;
});

$__System.registerDynamic("45", ["67", "52", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var shared = $__require('67')('keys'),
      uid = $__require('52');
  module.exports = function(key) {
    return shared[key] || (shared[key] = uid(key));
  };
  return module.exports;
});

$__System.registerDynamic("62", ["44", "4a", "66", "45", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var has = $__require('44'),
      toIObject = $__require('4a'),
      arrayIndexOf = $__require('66')(false),
      IE_PROTO = $__require('45')('IE_PROTO');
  module.exports = function(object, names) {
    var O = toIObject(object),
        i = 0,
        result = [],
        key;
    for (key in O)
      if (key != IE_PROTO)
        has(O, key) && result.push(key);
    while (names.length > i)
      if (has(O, key = names[i++])) {
        ~arrayIndexOf(result, key) || result.push(key);
      }
    return result;
  };
  return module.exports;
});

$__System.registerDynamic("5c", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = ('constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf').split(',');
  return module.exports;
});

$__System.registerDynamic("5f", ["62", "5c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var $keys = $__require('62'),
      hiddenKeys = $__require('5c').concat('length', 'prototype');
  exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return $keys(O, hiddenKeys);
  };
  return module.exports;
});

$__System.registerDynamic("57", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  exports.f = {}.propertyIsEnumerable;
  return module.exports;
});

$__System.registerDynamic("56", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  exports.f = Object.getOwnPropertySymbols;
  return module.exports;
});

$__System.registerDynamic("40", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };
  return module.exports;
});

$__System.registerDynamic("42", ["28", "40", "27", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var dP = $__require('28'),
      createDesc = $__require('40');
  module.exports = $__require('27') ? function(object, key, value) {
    return dP.f(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  return module.exports;
});

$__System.registerDynamic("68", ["4c", "44", "27", "1f", "47", "51", "21", "67", "41", "52", "43", "4e", "69", "53", "55", "58", "2e", "4a", "60", "40", "35", "5e", "30", "28", "54", "5f", "57", "56", "46", "42", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('4c'),
      has = $__require('44'),
      DESCRIPTORS = $__require('27'),
      $export = $__require('1f'),
      redefine = $__require('47'),
      META = $__require('51').KEY,
      $fails = $__require('21'),
      shared = $__require('67'),
      setToStringTag = $__require('41'),
      uid = $__require('52'),
      wks = $__require('43'),
      wksExt = $__require('4e'),
      wksDefine = $__require('69'),
      keyOf = $__require('53'),
      enumKeys = $__require('55'),
      isArray = $__require('58'),
      anObject = $__require('2e'),
      toIObject = $__require('4a'),
      toPrimitive = $__require('60'),
      createDesc = $__require('40'),
      _create = $__require('35'),
      gOPNExt = $__require('5e'),
      $GOPD = $__require('30'),
      $DP = $__require('28'),
      $keys = $__require('54'),
      gOPD = $GOPD.f,
      dP = $DP.f,
      gOPN = gOPNExt.f,
      $Symbol = global.Symbol,
      $JSON = global.JSON,
      _stringify = $JSON && $JSON.stringify,
      PROTOTYPE = 'prototype',
      HIDDEN = wks('_hidden'),
      TO_PRIMITIVE = wks('toPrimitive'),
      isEnum = {}.propertyIsEnumerable,
      SymbolRegistry = shared('symbol-registry'),
      AllSymbols = shared('symbols'),
      OPSymbols = shared('op-symbols'),
      ObjectProto = Object[PROTOTYPE],
      USE_NATIVE = typeof $Symbol == 'function',
      QObject = global.QObject;
  var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;
  var setSymbolDesc = DESCRIPTORS && $fails(function() {
    return _create(dP({}, 'a', {get: function() {
        return dP(this, 'a', {value: 7}).a;
      }})).a != 7;
  }) ? function(it, key, D) {
    var protoDesc = gOPD(ObjectProto, key);
    if (protoDesc)
      delete ObjectProto[key];
    dP(it, key, D);
    if (protoDesc && it !== ObjectProto)
      dP(ObjectProto, key, protoDesc);
  } : dP;
  var wrap = function(tag) {
    var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
    sym._k = tag;
    return sym;
  };
  var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it) {
    return typeof it == 'symbol';
  } : function(it) {
    return it instanceof $Symbol;
  };
  var $defineProperty = function defineProperty(it, key, D) {
    if (it === ObjectProto)
      $defineProperty(OPSymbols, key, D);
    anObject(it);
    key = toPrimitive(key, true);
    anObject(D);
    if (has(AllSymbols, key)) {
      if (!D.enumerable) {
        if (!has(it, HIDDEN))
          dP(it, HIDDEN, createDesc(1, {}));
        it[HIDDEN][key] = true;
      } else {
        if (has(it, HIDDEN) && it[HIDDEN][key])
          it[HIDDEN][key] = false;
        D = _create(D, {enumerable: createDesc(0, false)});
      }
      return setSymbolDesc(it, key, D);
    }
    return dP(it, key, D);
  };
  var $defineProperties = function defineProperties(it, P) {
    anObject(it);
    var keys = enumKeys(P = toIObject(P)),
        i = 0,
        l = keys.length,
        key;
    while (l > i)
      $defineProperty(it, key = keys[i++], P[key]);
    return it;
  };
  var $create = function create(it, P) {
    return P === undefined ? _create(it) : $defineProperties(_create(it), P);
  };
  var $propertyIsEnumerable = function propertyIsEnumerable(key) {
    var E = isEnum.call(this, key = toPrimitive(key, true));
    if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))
      return false;
    return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
  };
  var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
    it = toIObject(it);
    key = toPrimitive(key, true);
    if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))
      return;
    var D = gOPD(it, key);
    if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))
      D.enumerable = true;
    return D;
  };
  var $getOwnPropertyNames = function getOwnPropertyNames(it) {
    var names = gOPN(toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i) {
      if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)
        result.push(key);
    }
    return result;
  };
  var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
    var IS_OP = it === ObjectProto,
        names = gOPN(IS_OP ? OPSymbols : toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i) {
      if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))
        result.push(AllSymbols[key]);
    }
    return result;
  };
  if (!USE_NATIVE) {
    $Symbol = function Symbol() {
      if (this instanceof $Symbol)
        throw TypeError('Symbol is not a constructor!');
      var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
      var $set = function(value) {
        if (this === ObjectProto)
          $set.call(OPSymbols, value);
        if (has(this, HIDDEN) && has(this[HIDDEN], tag))
          this[HIDDEN][tag] = false;
        setSymbolDesc(this, tag, createDesc(1, value));
      };
      if (DESCRIPTORS && setter)
        setSymbolDesc(ObjectProto, tag, {
          configurable: true,
          set: $set
        });
      return wrap(tag);
    };
    redefine($Symbol[PROTOTYPE], 'toString', function toString() {
      return this._k;
    });
    $GOPD.f = $getOwnPropertyDescriptor;
    $DP.f = $defineProperty;
    $__require('5f').f = gOPNExt.f = $getOwnPropertyNames;
    $__require('57').f = $propertyIsEnumerable;
    $__require('56').f = $getOwnPropertySymbols;
    if (DESCRIPTORS && !$__require('46')) {
      redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
    }
    wksExt.f = function(name) {
      return wrap(wks(name));
    };
  }
  $export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});
  for (var symbols = ('hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables').split(','),
      i = 0; symbols.length > i; )
    wks(symbols[i++]);
  for (var symbols = $keys(wks.store),
      i = 0; symbols.length > i; )
    wksDefine(symbols[i++]);
  $export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
    'for': function(key) {
      return has(SymbolRegistry, key += '') ? SymbolRegistry[key] : SymbolRegistry[key] = $Symbol(key);
    },
    keyFor: function keyFor(key) {
      if (isSymbol(key))
        return keyOf(SymbolRegistry, key);
      throw TypeError(key + ' is not a symbol!');
    },
    useSetter: function() {
      setter = true;
    },
    useSimple: function() {
      setter = false;
    }
  });
  $export($export.S + $export.F * !USE_NATIVE, 'Object', {
    create: $create,
    defineProperty: $defineProperty,
    defineProperties: $defineProperties,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    getOwnPropertySymbols: $getOwnPropertySymbols
  });
  $JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function() {
    var S = $Symbol();
    return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
  })), 'JSON', {stringify: function stringify(it) {
      if (it === undefined || isSymbol(it))
        return;
      var args = [it],
          i = 1,
          replacer,
          $replacer;
      while (arguments.length > i)
        args.push(arguments[i++]);
      replacer = args[1];
      if (typeof replacer == 'function')
        $replacer = replacer;
      if ($replacer || !isArray(replacer))
        replacer = function(key, value) {
          if ($replacer)
            value = $replacer.call(this, key, value);
          if (!isSymbol(value))
            return value;
        };
      args[1] = replacer;
      return _stringify.apply($JSON, args);
    }});
  $Symbol[PROTOTYPE][TO_PRIMITIVE] || $__require('42')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
  setToStringTag($Symbol, 'Symbol');
  setToStringTag(Math, 'Math', true);
  setToStringTag(global.JSON, 'JSON', true);
  return module.exports;
});

$__System.registerDynamic("6a", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  return module.exports;
});

$__System.registerDynamic("6b", ["69", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('69')('asyncIterator');
  return module.exports;
});

$__System.registerDynamic("46", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = true;
  return module.exports;
});

$__System.registerDynamic("67", ["4c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('4c'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  return module.exports;
});

$__System.registerDynamic("52", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var id = 0,
      px = Math.random();
  module.exports = function(key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };
  return module.exports;
});

$__System.registerDynamic("43", ["67", "52", "4c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var store = $__require('67')('wks'),
      uid = $__require('52'),
      Symbol = $__require('4c').Symbol,
      USE_SYMBOL = typeof Symbol == 'function';
  var $exports = module.exports = function(name) {
    return store[name] || (store[name] = USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
  };
  $exports.store = store;
  return module.exports;
});

$__System.registerDynamic("4e", ["43", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  exports.f = $__require('43');
  return module.exports;
});

$__System.registerDynamic("2e", ["2d", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('2d');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("4c", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number')
    __g = global;
  return module.exports;
});

$__System.registerDynamic("5d", ["2d", "4c", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('2d'),
      document = $__require('4c').document,
      is = isObject(document) && isObject(document.createElement);
  module.exports = function(it) {
    return is ? document.createElement(it) : {};
  };
  return module.exports;
});

$__System.registerDynamic("61", ["27", "21", "5d", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = !$__require('27') && !$__require('21')(function() {
    return Object.defineProperty($__require('5d')('div'), 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  return module.exports;
});

$__System.registerDynamic("2d", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };
  return module.exports;
});

$__System.registerDynamic("60", ["2d", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('2d');
  module.exports = function(it, S) {
    if (!isObject(it))
      return it;
    var fn,
        val;
    if (S && typeof(fn = it.toString) == 'function' && !isObject(val = fn.call(it)))
      return val;
    if (typeof(fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))
      return val;
    if (!S && typeof(fn = it.toString) == 'function' && !isObject(val = fn.call(it)))
      return val;
    throw TypeError("Can't convert object to primitive value");
  };
  return module.exports;
});

$__System.registerDynamic("21", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  return module.exports;
});

$__System.registerDynamic("27", ["21", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = !$__require('21')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  return module.exports;
});

$__System.registerDynamic("28", ["2e", "61", "60", "27", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('2e'),
      IE8_DOM_DEFINE = $__require('61'),
      toPrimitive = $__require('60'),
      dP = Object.defineProperty;
  exports.f = $__require('27') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
    anObject(O);
    P = toPrimitive(P, true);
    anObject(Attributes);
    if (IE8_DOM_DEFINE)
      try {
        return dP(O, P, Attributes);
      } catch (e) {}
    if ('get' in Attributes || 'set' in Attributes)
      throw TypeError('Accessors not supported!');
    if ('value' in Attributes)
      O[P] = Attributes.value;
    return O;
  };
  return module.exports;
});

$__System.registerDynamic("69", ["4c", "20", "46", "4e", "28", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('4c'),
      core = $__require('20'),
      LIBRARY = $__require('46'),
      wksExt = $__require('4e'),
      defineProperty = $__require('28').f;
  module.exports = function(name) {
    var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
    if (name.charAt(0) != '_' && !(name in $Symbol))
      defineProperty($Symbol, name, {value: wksExt.f(name)});
  };
  return module.exports;
});

$__System.registerDynamic("6c", ["69", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('69')('observable');
  return module.exports;
});

$__System.registerDynamic("20", ["16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  var core = module.exports = {version: '2.4.0'};
  if (typeof __e == 'number')
    __e = core;
  return module.exports;
});

$__System.registerDynamic("6d", ["68", "6a", "6b", "6c", "20", "16"], true, function($__require, exports, module) {
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  $__require('68');
  $__require('6a');
  $__require('6b');
  $__require('6c');
  module.exports = $__require('20').Symbol;
  return module.exports;
});

$__System.registerDynamic("6e", ["6d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('6d'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("2b", ["4f", "6e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.__esModule = true;
  var _iterator = $__require('4f');
  var _iterator2 = _interopRequireDefault(_iterator);
  var _symbol = $__require('6e');
  var _symbol2 = _interopRequireDefault(_symbol);
  var _typeof = typeof _symbol2.default === "function" && typeof _iterator2.default === "symbol" ? function(obj) {
    return typeof obj;
  } : function(obj) {
    return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default ? "symbol" : typeof obj;
  };
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  exports.default = typeof _symbol2.default === "function" && _typeof(_iterator2.default) === "symbol" ? function(obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof(obj);
  } : function(obj) {
    return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
  };
  return module.exports;
});

$__System.registerDynamic("1b", ["33", "37", "2b"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.__esModule = true;
  var _setPrototypeOf = $__require('33');
  var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);
  var _create = $__require('37');
  var _create2 = _interopRequireDefault(_create);
  var _typeof2 = $__require('2b');
  var _typeof3 = _interopRequireDefault(_typeof2);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  exports.default = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
    }
    subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
  };
  return module.exports;
});

$__System.registerDynamic("1c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    'use strict';
    var hasOwn = {}.hasOwnProperty;
    function classNames() {
      var classes = [];
      for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (!arg)
          continue;
        var argType = typeof arg;
        if (argType === 'string' || argType === 'number') {
          classes.push(arg);
        } else if (Array.isArray(arg)) {
          classes.push(classNames.apply(null, arg));
        } else if (argType === 'object') {
          for (var key in arg) {
            if (hasOwn.call(arg, key) && arg[key]) {
              classes.push(key);
            }
          }
        }
      }
      return classes.join(' ');
    }
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = classNames;
    } else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
      define('classnames', [], function() {
        return classNames;
      });
    } else {
      window.classNames = classNames;
    }
  }());
  return module.exports;
});

(function() {
var define = $__System.amdDefine;
;
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define("12", [], factory) : global.moment = factory();
}(this, function() {
  'use strict';
  var hookCallback;
  function utils_hooks__hooks() {
    return hookCallback.apply(null, arguments);
  }
  function setHookCallback(callback) {
    hookCallback = callback;
  }
  function isArray(input) {
    return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
  }
  function isObject(input) {
    return Object.prototype.toString.call(input) === '[object Object]';
  }
  function isObjectEmpty(obj) {
    var k;
    for (k in obj) {
      return false;
    }
    return true;
  }
  function isDate(input) {
    return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
  }
  function map(arr, fn) {
    var res = [],
        i;
    for (i = 0; i < arr.length; ++i) {
      res.push(fn(arr[i], i));
    }
    return res;
  }
  function hasOwnProp(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
  }
  function extend(a, b) {
    for (var i in b) {
      if (hasOwnProp(b, i)) {
        a[i] = b[i];
      }
    }
    if (hasOwnProp(b, 'toString')) {
      a.toString = b.toString;
    }
    if (hasOwnProp(b, 'valueOf')) {
      a.valueOf = b.valueOf;
    }
    return a;
  }
  function create_utc__createUTC(input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, true).utc();
  }
  function defaultParsingFlags() {
    return {
      empty: false,
      unusedTokens: [],
      unusedInput: [],
      overflow: -2,
      charsLeftOver: 0,
      nullInput: false,
      invalidMonth: null,
      invalidFormat: false,
      userInvalidated: false,
      iso: false,
      parsedDateParts: [],
      meridiem: null
    };
  }
  function getParsingFlags(m) {
    if (m._pf == null) {
      m._pf = defaultParsingFlags();
    }
    return m._pf;
  }
  var some;
  if (Array.prototype.some) {
    some = Array.prototype.some;
  } else {
    some = function(fun) {
      var t = Object(this);
      var len = t.length >>> 0;
      for (var i = 0; i < len; i++) {
        if (i in t && fun.call(this, t[i], i, t)) {
          return true;
        }
      }
      return false;
    };
  }
  function valid__isValid(m) {
    if (m._isValid == null) {
      var flags = getParsingFlags(m);
      var parsedParts = some.call(flags.parsedDateParts, function(i) {
        return i != null;
      });
      m._isValid = !isNaN(m._d.getTime()) && flags.overflow < 0 && !flags.empty && !flags.invalidMonth && !flags.invalidWeekday && !flags.nullInput && !flags.invalidFormat && !flags.userInvalidated && (!flags.meridiem || (flags.meridiem && parsedParts));
      if (m._strict) {
        m._isValid = m._isValid && flags.charsLeftOver === 0 && flags.unusedTokens.length === 0 && flags.bigHour === undefined;
      }
    }
    return m._isValid;
  }
  function valid__createInvalid(flags) {
    var m = create_utc__createUTC(NaN);
    if (flags != null) {
      extend(getParsingFlags(m), flags);
    } else {
      getParsingFlags(m).userInvalidated = true;
    }
    return m;
  }
  function isUndefined(input) {
    return input === void 0;
  }
  var momentProperties = utils_hooks__hooks.momentProperties = [];
  function copyConfig(to, from) {
    var i,
        prop,
        val;
    if (!isUndefined(from._isAMomentObject)) {
      to._isAMomentObject = from._isAMomentObject;
    }
    if (!isUndefined(from._i)) {
      to._i = from._i;
    }
    if (!isUndefined(from._f)) {
      to._f = from._f;
    }
    if (!isUndefined(from._l)) {
      to._l = from._l;
    }
    if (!isUndefined(from._strict)) {
      to._strict = from._strict;
    }
    if (!isUndefined(from._tzm)) {
      to._tzm = from._tzm;
    }
    if (!isUndefined(from._isUTC)) {
      to._isUTC = from._isUTC;
    }
    if (!isUndefined(from._offset)) {
      to._offset = from._offset;
    }
    if (!isUndefined(from._pf)) {
      to._pf = getParsingFlags(from);
    }
    if (!isUndefined(from._locale)) {
      to._locale = from._locale;
    }
    if (momentProperties.length > 0) {
      for (i in momentProperties) {
        prop = momentProperties[i];
        val = from[prop];
        if (!isUndefined(val)) {
          to[prop] = val;
        }
      }
    }
    return to;
  }
  var updateInProgress = false;
  function Moment(config) {
    copyConfig(this, config);
    this._d = new Date(config._d != null ? config._d.getTime() : NaN);
    if (updateInProgress === false) {
      updateInProgress = true;
      utils_hooks__hooks.updateOffset(this);
      updateInProgress = false;
    }
  }
  function isMoment(obj) {
    return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
  }
  function absFloor(number) {
    if (number < 0) {
      return Math.ceil(number) || 0;
    } else {
      return Math.floor(number);
    }
  }
  function toInt(argumentForCoercion) {
    var coercedNumber = +argumentForCoercion,
        value = 0;
    if (coercedNumber !== 0 && isFinite(coercedNumber)) {
      value = absFloor(coercedNumber);
    }
    return value;
  }
  function compareArrays(array1, array2, dontConvert) {
    var len = Math.min(array1.length, array2.length),
        lengthDiff = Math.abs(array1.length - array2.length),
        diffs = 0,
        i;
    for (i = 0; i < len; i++) {
      if ((dontConvert && array1[i] !== array2[i]) || (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
        diffs++;
      }
    }
    return diffs + lengthDiff;
  }
  function warn(msg) {
    if (utils_hooks__hooks.suppressDeprecationWarnings === false && (typeof console !== 'undefined') && console.warn) {
      console.warn('Deprecation warning: ' + msg);
    }
  }
  function deprecate(msg, fn) {
    var firstTime = true;
    return extend(function() {
      if (utils_hooks__hooks.deprecationHandler != null) {
        utils_hooks__hooks.deprecationHandler(null, msg);
      }
      if (firstTime) {
        warn(msg + '\nArguments: ' + Array.prototype.slice.call(arguments).join(', ') + '\n' + (new Error()).stack);
        firstTime = false;
      }
      return fn.apply(this, arguments);
    }, fn);
  }
  var deprecations = {};
  function deprecateSimple(name, msg) {
    if (utils_hooks__hooks.deprecationHandler != null) {
      utils_hooks__hooks.deprecationHandler(name, msg);
    }
    if (!deprecations[name]) {
      warn(msg);
      deprecations[name] = true;
    }
  }
  utils_hooks__hooks.suppressDeprecationWarnings = false;
  utils_hooks__hooks.deprecationHandler = null;
  function isFunction(input) {
    return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
  }
  function locale_set__set(config) {
    var prop,
        i;
    for (i in config) {
      prop = config[i];
      if (isFunction(prop)) {
        this[i] = prop;
      } else {
        this['_' + i] = prop;
      }
    }
    this._config = config;
    this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + (/\d{1,2}/).source);
  }
  function mergeConfigs(parentConfig, childConfig) {
    var res = extend({}, parentConfig),
        prop;
    for (prop in childConfig) {
      if (hasOwnProp(childConfig, prop)) {
        if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
          res[prop] = {};
          extend(res[prop], parentConfig[prop]);
          extend(res[prop], childConfig[prop]);
        } else if (childConfig[prop] != null) {
          res[prop] = childConfig[prop];
        } else {
          delete res[prop];
        }
      }
    }
    for (prop in parentConfig) {
      if (hasOwnProp(parentConfig, prop) && !hasOwnProp(childConfig, prop) && isObject(parentConfig[prop])) {
        res[prop] = extend({}, res[prop]);
      }
    }
    return res;
  }
  function Locale(config) {
    if (config != null) {
      this.set(config);
    }
  }
  var keys;
  if (Object.keys) {
    keys = Object.keys;
  } else {
    keys = function(obj) {
      var i,
          res = [];
      for (i in obj) {
        if (hasOwnProp(obj, i)) {
          res.push(i);
        }
      }
      return res;
    };
  }
  var defaultCalendar = {
    sameDay: '[Today at] LT',
    nextDay: '[Tomorrow at] LT',
    nextWeek: 'dddd [at] LT',
    lastDay: '[Yesterday at] LT',
    lastWeek: '[Last] dddd [at] LT',
    sameElse: 'L'
  };
  function locale_calendar__calendar(key, mom, now) {
    var output = this._calendar[key] || this._calendar['sameElse'];
    return isFunction(output) ? output.call(mom, now) : output;
  }
  var defaultLongDateFormat = {
    LTS: 'h:mm:ss A',
    LT: 'h:mm A',
    L: 'MM/DD/YYYY',
    LL: 'MMMM D, YYYY',
    LLL: 'MMMM D, YYYY h:mm A',
    LLLL: 'dddd, MMMM D, YYYY h:mm A'
  };
  function longDateFormat(key) {
    var format = this._longDateFormat[key],
        formatUpper = this._longDateFormat[key.toUpperCase()];
    if (format || !formatUpper) {
      return format;
    }
    this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function(val) {
      return val.slice(1);
    });
    return this._longDateFormat[key];
  }
  var defaultInvalidDate = 'Invalid date';
  function invalidDate() {
    return this._invalidDate;
  }
  var defaultOrdinal = '%d';
  var defaultOrdinalParse = /\d{1,2}/;
  function ordinal(number) {
    return this._ordinal.replace('%d', number);
  }
  var defaultRelativeTime = {
    future: 'in %s',
    past: '%s ago',
    s: 'a few seconds',
    m: 'a minute',
    mm: '%d minutes',
    h: 'an hour',
    hh: '%d hours',
    d: 'a day',
    dd: '%d days',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years'
  };
  function relative__relativeTime(number, withoutSuffix, string, isFuture) {
    var output = this._relativeTime[string];
    return (isFunction(output)) ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
  }
  function pastFuture(diff, output) {
    var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
    return isFunction(format) ? format(output) : format.replace(/%s/i, output);
  }
  var aliases = {};
  function addUnitAlias(unit, shorthand) {
    var lowerCase = unit.toLowerCase();
    aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
  }
  function normalizeUnits(units) {
    return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
  }
  function normalizeObjectUnits(inputObject) {
    var normalizedInput = {},
        normalizedProp,
        prop;
    for (prop in inputObject) {
      if (hasOwnProp(inputObject, prop)) {
        normalizedProp = normalizeUnits(prop);
        if (normalizedProp) {
          normalizedInput[normalizedProp] = inputObject[prop];
        }
      }
    }
    return normalizedInput;
  }
  var priorities = {};
  function addUnitPriority(unit, priority) {
    priorities[unit] = priority;
  }
  function getPrioritizedUnits(unitsObj) {
    var units = [];
    for (var u in unitsObj) {
      units.push({
        unit: u,
        priority: priorities[u]
      });
    }
    units.sort(function(a, b) {
      return a.priority - b.priority;
    });
    return units;
  }
  function makeGetSet(unit, keepTime) {
    return function(value) {
      if (value != null) {
        get_set__set(this, unit, value);
        utils_hooks__hooks.updateOffset(this, keepTime);
        return this;
      } else {
        return get_set__get(this, unit);
      }
    };
  }
  function get_set__get(mom, unit) {
    return mom.isValid() ? mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
  }
  function get_set__set(mom, unit, value) {
    if (mom.isValid()) {
      mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
    }
  }
  function stringGet(units) {
    units = normalizeUnits(units);
    if (isFunction(this[units])) {
      return this[units]();
    }
    return this;
  }
  function stringSet(units, value) {
    if (typeof units === 'object') {
      units = normalizeObjectUnits(units);
      var prioritized = getPrioritizedUnits(units);
      for (var i = 0; i < prioritized.length; i++) {
        this[prioritized[i].unit](units[prioritized[i].unit]);
      }
    } else {
      units = normalizeUnits(units);
      if (isFunction(this[units])) {
        return this[units](value);
      }
    }
    return this;
  }
  function zeroFill(number, targetLength, forceSign) {
    var absNumber = '' + Math.abs(number),
        zerosToFill = targetLength - absNumber.length,
        sign = number >= 0;
    return (sign ? (forceSign ? '+' : '') : '-') + Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
  }
  var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
  var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;
  var formatFunctions = {};
  var formatTokenFunctions = {};
  function addFormatToken(token, padded, ordinal, callback) {
    var func = callback;
    if (typeof callback === 'string') {
      func = function() {
        return this[callback]();
      };
    }
    if (token) {
      formatTokenFunctions[token] = func;
    }
    if (padded) {
      formatTokenFunctions[padded[0]] = function() {
        return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
      };
    }
    if (ordinal) {
      formatTokenFunctions[ordinal] = function() {
        return this.localeData().ordinal(func.apply(this, arguments), token);
      };
    }
  }
  function removeFormattingTokens(input) {
    if (input.match(/\[[\s\S]/)) {
      return input.replace(/^\[|\]$/g, '');
    }
    return input.replace(/\\/g, '');
  }
  function makeFormatFunction(format) {
    var array = format.match(formattingTokens),
        i,
        length;
    for (i = 0, length = array.length; i < length; i++) {
      if (formatTokenFunctions[array[i]]) {
        array[i] = formatTokenFunctions[array[i]];
      } else {
        array[i] = removeFormattingTokens(array[i]);
      }
    }
    return function(mom) {
      var output = '',
          i;
      for (i = 0; i < length; i++) {
        output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
      }
      return output;
    };
  }
  function formatMoment(m, format) {
    if (!m.isValid()) {
      return m.localeData().invalidDate();
    }
    format = expandFormat(format, m.localeData());
    formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);
    return formatFunctions[format](m);
  }
  function expandFormat(format, locale) {
    var i = 5;
    function replaceLongDateFormatTokens(input) {
      return locale.longDateFormat(input) || input;
    }
    localFormattingTokens.lastIndex = 0;
    while (i >= 0 && localFormattingTokens.test(format)) {
      format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
      localFormattingTokens.lastIndex = 0;
      i -= 1;
    }
    return format;
  }
  var match1 = /\d/;
  var match2 = /\d\d/;
  var match3 = /\d{3}/;
  var match4 = /\d{4}/;
  var match6 = /[+-]?\d{6}/;
  var match1to2 = /\d\d?/;
  var match3to4 = /\d\d\d\d?/;
  var match5to6 = /\d\d\d\d\d\d?/;
  var match1to3 = /\d{1,3}/;
  var match1to4 = /\d{1,4}/;
  var match1to6 = /[+-]?\d{1,6}/;
  var matchUnsigned = /\d+/;
  var matchSigned = /[+-]?\d+/;
  var matchOffset = /Z|[+-]\d\d:?\d\d/gi;
  var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi;
  var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/;
  var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;
  var regexes = {};
  function addRegexToken(token, regex, strictRegex) {
    regexes[token] = isFunction(regex) ? regex : function(isStrict, localeData) {
      return (isStrict && strictRegex) ? strictRegex : regex;
    };
  }
  function getParseRegexForToken(token, config) {
    if (!hasOwnProp(regexes, token)) {
      return new RegExp(unescapeFormat(token));
    }
    return regexes[token](config._strict, config._locale);
  }
  function unescapeFormat(s) {
    return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function(matched, p1, p2, p3, p4) {
      return p1 || p2 || p3 || p4;
    }));
  }
  function regexEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
  var tokens = {};
  function addParseToken(token, callback) {
    var i,
        func = callback;
    if (typeof token === 'string') {
      token = [token];
    }
    if (typeof callback === 'number') {
      func = function(input, array) {
        array[callback] = toInt(input);
      };
    }
    for (i = 0; i < token.length; i++) {
      tokens[token[i]] = func;
    }
  }
  function addWeekParseToken(token, callback) {
    addParseToken(token, function(input, array, config, token) {
      config._w = config._w || {};
      callback(input, config._w, config, token);
    });
  }
  function addTimeToArrayFromToken(token, input, config) {
    if (input != null && hasOwnProp(tokens, token)) {
      tokens[token](input, config._a, config, token);
    }
  }
  var YEAR = 0;
  var MONTH = 1;
  var DATE = 2;
  var HOUR = 3;
  var MINUTE = 4;
  var SECOND = 5;
  var MILLISECOND = 6;
  var WEEK = 7;
  var WEEKDAY = 8;
  var indexOf;
  if (Array.prototype.indexOf) {
    indexOf = Array.prototype.indexOf;
  } else {
    indexOf = function(o) {
      var i;
      for (i = 0; i < this.length; ++i) {
        if (this[i] === o) {
          return i;
        }
      }
      return -1;
    };
  }
  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }
  addFormatToken('M', ['MM', 2], 'Mo', function() {
    return this.month() + 1;
  });
  addFormatToken('MMM', 0, 0, function(format) {
    return this.localeData().monthsShort(this, format);
  });
  addFormatToken('MMMM', 0, 0, function(format) {
    return this.localeData().months(this, format);
  });
  addUnitAlias('month', 'M');
  addUnitPriority('month', 8);
  addRegexToken('M', match1to2);
  addRegexToken('MM', match1to2, match2);
  addRegexToken('MMM', function(isStrict, locale) {
    return locale.monthsShortRegex(isStrict);
  });
  addRegexToken('MMMM', function(isStrict, locale) {
    return locale.monthsRegex(isStrict);
  });
  addParseToken(['M', 'MM'], function(input, array) {
    array[MONTH] = toInt(input) - 1;
  });
  addParseToken(['MMM', 'MMMM'], function(input, array, config, token) {
    var month = config._locale.monthsParse(input, token, config._strict);
    if (month != null) {
      array[MONTH] = month;
    } else {
      getParsingFlags(config).invalidMonth = input;
    }
  });
  var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/;
  var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
  function localeMonths(m, format) {
    return isArray(this._months) ? this._months[m.month()] : this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
  }
  var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
  function localeMonthsShort(m, format) {
    return isArray(this._monthsShort) ? this._monthsShort[m.month()] : this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
  }
  function units_month__handleStrictParse(monthName, format, strict) {
    var i,
        ii,
        mom,
        llc = monthName.toLocaleLowerCase();
    if (!this._monthsParse) {
      this._monthsParse = [];
      this._longMonthsParse = [];
      this._shortMonthsParse = [];
      for (i = 0; i < 12; ++i) {
        mom = create_utc__createUTC([2000, i]);
        this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
        this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
      }
    }
    if (strict) {
      if (format === 'MMM') {
        ii = indexOf.call(this._shortMonthsParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._longMonthsParse, llc);
        return ii !== -1 ? ii : null;
      }
    } else {
      if (format === 'MMM') {
        ii = indexOf.call(this._shortMonthsParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._longMonthsParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._longMonthsParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortMonthsParse, llc);
        return ii !== -1 ? ii : null;
      }
    }
  }
  function localeMonthsParse(monthName, format, strict) {
    var i,
        mom,
        regex;
    if (this._monthsParseExact) {
      return units_month__handleStrictParse.call(this, monthName, format, strict);
    }
    if (!this._monthsParse) {
      this._monthsParse = [];
      this._longMonthsParse = [];
      this._shortMonthsParse = [];
    }
    for (i = 0; i < 12; i++) {
      mom = create_utc__createUTC([2000, i]);
      if (strict && !this._longMonthsParse[i]) {
        this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
        this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
      }
      if (!strict && !this._monthsParse[i]) {
        regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
        this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
      }
      if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
        return i;
      } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
        return i;
      } else if (!strict && this._monthsParse[i].test(monthName)) {
        return i;
      }
    }
  }
  function setMonth(mom, value) {
    var dayOfMonth;
    if (!mom.isValid()) {
      return mom;
    }
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) {
        value = toInt(value);
      } else {
        value = mom.localeData().monthsParse(value);
        if (typeof value !== 'number') {
          return mom;
        }
      }
    }
    dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
    mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
    return mom;
  }
  function getSetMonth(value) {
    if (value != null) {
      setMonth(this, value);
      utils_hooks__hooks.updateOffset(this, true);
      return this;
    } else {
      return get_set__get(this, 'Month');
    }
  }
  function getDaysInMonth() {
    return daysInMonth(this.year(), this.month());
  }
  var defaultMonthsShortRegex = matchWord;
  function monthsShortRegex(isStrict) {
    if (this._monthsParseExact) {
      if (!hasOwnProp(this, '_monthsRegex')) {
        computeMonthsParse.call(this);
      }
      if (isStrict) {
        return this._monthsShortStrictRegex;
      } else {
        return this._monthsShortRegex;
      }
    } else {
      if (!hasOwnProp(this, '_monthsShortRegex')) {
        this._monthsShortRegex = defaultMonthsShortRegex;
      }
      return this._monthsShortStrictRegex && isStrict ? this._monthsShortStrictRegex : this._monthsShortRegex;
    }
  }
  var defaultMonthsRegex = matchWord;
  function monthsRegex(isStrict) {
    if (this._monthsParseExact) {
      if (!hasOwnProp(this, '_monthsRegex')) {
        computeMonthsParse.call(this);
      }
      if (isStrict) {
        return this._monthsStrictRegex;
      } else {
        return this._monthsRegex;
      }
    } else {
      if (!hasOwnProp(this, '_monthsRegex')) {
        this._monthsRegex = defaultMonthsRegex;
      }
      return this._monthsStrictRegex && isStrict ? this._monthsStrictRegex : this._monthsRegex;
    }
  }
  function computeMonthsParse() {
    function cmpLenRev(a, b) {
      return b.length - a.length;
    }
    var shortPieces = [],
        longPieces = [],
        mixedPieces = [],
        i,
        mom;
    for (i = 0; i < 12; i++) {
      mom = create_utc__createUTC([2000, i]);
      shortPieces.push(this.monthsShort(mom, ''));
      longPieces.push(this.months(mom, ''));
      mixedPieces.push(this.months(mom, ''));
      mixedPieces.push(this.monthsShort(mom, ''));
    }
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    for (i = 0; i < 12; i++) {
      shortPieces[i] = regexEscape(shortPieces[i]);
      longPieces[i] = regexEscape(longPieces[i]);
    }
    for (i = 0; i < 24; i++) {
      mixedPieces[i] = regexEscape(mixedPieces[i]);
    }
    this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._monthsShortRegex = this._monthsRegex;
    this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
  }
  addFormatToken('Y', 0, 0, function() {
    var y = this.year();
    return y <= 9999 ? '' + y : '+' + y;
  });
  addFormatToken(0, ['YY', 2], 0, function() {
    return this.year() % 100;
  });
  addFormatToken(0, ['YYYY', 4], 0, 'year');
  addFormatToken(0, ['YYYYY', 5], 0, 'year');
  addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');
  addUnitAlias('year', 'y');
  addUnitPriority('year', 1);
  addRegexToken('Y', matchSigned);
  addRegexToken('YY', match1to2, match2);
  addRegexToken('YYYY', match1to4, match4);
  addRegexToken('YYYYY', match1to6, match6);
  addRegexToken('YYYYYY', match1to6, match6);
  addParseToken(['YYYYY', 'YYYYYY'], YEAR);
  addParseToken('YYYY', function(input, array) {
    array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
  });
  addParseToken('YY', function(input, array) {
    array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
  });
  addParseToken('Y', function(input, array) {
    array[YEAR] = parseInt(input, 10);
  });
  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }
  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
  utils_hooks__hooks.parseTwoDigitYear = function(input) {
    return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
  };
  var getSetYear = makeGetSet('FullYear', true);
  function getIsLeapYear() {
    return isLeapYear(this.year());
  }
  function createDate(y, m, d, h, M, s, ms) {
    var date = new Date(y, m, d, h, M, s, ms);
    if (y < 100 && y >= 0 && isFinite(date.getFullYear())) {
      date.setFullYear(y);
    }
    return date;
  }
  function createUTCDate(y) {
    var date = new Date(Date.UTC.apply(null, arguments));
    if (y < 100 && y >= 0 && isFinite(date.getUTCFullYear())) {
      date.setUTCFullYear(y);
    }
    return date;
  }
  function firstWeekOffset(year, dow, doy) {
    var fwd = 7 + dow - doy,
        fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;
    return -fwdlw + fwd - 1;
  }
  function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
    var localWeekday = (7 + weekday - dow) % 7,
        weekOffset = firstWeekOffset(year, dow, doy),
        dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
        resYear,
        resDayOfYear;
    if (dayOfYear <= 0) {
      resYear = year - 1;
      resDayOfYear = daysInYear(resYear) + dayOfYear;
    } else if (dayOfYear > daysInYear(year)) {
      resYear = year + 1;
      resDayOfYear = dayOfYear - daysInYear(year);
    } else {
      resYear = year;
      resDayOfYear = dayOfYear;
    }
    return {
      year: resYear,
      dayOfYear: resDayOfYear
    };
  }
  function weekOfYear(mom, dow, doy) {
    var weekOffset = firstWeekOffset(mom.year(), dow, doy),
        week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
        resWeek,
        resYear;
    if (week < 1) {
      resYear = mom.year() - 1;
      resWeek = week + weeksInYear(resYear, dow, doy);
    } else if (week > weeksInYear(mom.year(), dow, doy)) {
      resWeek = week - weeksInYear(mom.year(), dow, doy);
      resYear = mom.year() + 1;
    } else {
      resYear = mom.year();
      resWeek = week;
    }
    return {
      week: resWeek,
      year: resYear
    };
  }
  function weeksInYear(year, dow, doy) {
    var weekOffset = firstWeekOffset(year, dow, doy),
        weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
    return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
  }
  addFormatToken('w', ['ww', 2], 'wo', 'week');
  addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');
  addUnitAlias('week', 'w');
  addUnitAlias('isoWeek', 'W');
  addUnitPriority('week', 5);
  addUnitPriority('isoWeek', 5);
  addRegexToken('w', match1to2);
  addRegexToken('ww', match1to2, match2);
  addRegexToken('W', match1to2);
  addRegexToken('WW', match1to2, match2);
  addWeekParseToken(['w', 'ww', 'W', 'WW'], function(input, week, config, token) {
    week[token.substr(0, 1)] = toInt(input);
  });
  function localeWeek(mom) {
    return weekOfYear(mom, this._week.dow, this._week.doy).week;
  }
  var defaultLocaleWeek = {
    dow: 0,
    doy: 6
  };
  function localeFirstDayOfWeek() {
    return this._week.dow;
  }
  function localeFirstDayOfYear() {
    return this._week.doy;
  }
  function getSetWeek(input) {
    var week = this.localeData().week(this);
    return input == null ? week : this.add((input - week) * 7, 'd');
  }
  function getSetISOWeek(input) {
    var week = weekOfYear(this, 1, 4).week;
    return input == null ? week : this.add((input - week) * 7, 'd');
  }
  addFormatToken('d', 0, 'do', 'day');
  addFormatToken('dd', 0, 0, function(format) {
    return this.localeData().weekdaysMin(this, format);
  });
  addFormatToken('ddd', 0, 0, function(format) {
    return this.localeData().weekdaysShort(this, format);
  });
  addFormatToken('dddd', 0, 0, function(format) {
    return this.localeData().weekdays(this, format);
  });
  addFormatToken('e', 0, 0, 'weekday');
  addFormatToken('E', 0, 0, 'isoWeekday');
  addUnitAlias('day', 'd');
  addUnitAlias('weekday', 'e');
  addUnitAlias('isoWeekday', 'E');
  addUnitPriority('day', 11);
  addUnitPriority('weekday', 11);
  addUnitPriority('isoWeekday', 11);
  addRegexToken('d', match1to2);
  addRegexToken('e', match1to2);
  addRegexToken('E', match1to2);
  addRegexToken('dd', function(isStrict, locale) {
    return locale.weekdaysMinRegex(isStrict);
  });
  addRegexToken('ddd', function(isStrict, locale) {
    return locale.weekdaysShortRegex(isStrict);
  });
  addRegexToken('dddd', function(isStrict, locale) {
    return locale.weekdaysRegex(isStrict);
  });
  addWeekParseToken(['dd', 'ddd', 'dddd'], function(input, week, config, token) {
    var weekday = config._locale.weekdaysParse(input, token, config._strict);
    if (weekday != null) {
      week.d = weekday;
    } else {
      getParsingFlags(config).invalidWeekday = input;
    }
  });
  addWeekParseToken(['d', 'e', 'E'], function(input, week, config, token) {
    week[token] = toInt(input);
  });
  function parseWeekday(input, locale) {
    if (typeof input !== 'string') {
      return input;
    }
    if (!isNaN(input)) {
      return parseInt(input, 10);
    }
    input = locale.weekdaysParse(input);
    if (typeof input === 'number') {
      return input;
    }
    return null;
  }
  function parseIsoWeekday(input, locale) {
    if (typeof input === 'string') {
      return locale.weekdaysParse(input) % 7 || 7;
    }
    return isNaN(input) ? null : input;
  }
  var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
  function localeWeekdays(m, format) {
    return isArray(this._weekdays) ? this._weekdays[m.day()] : this._weekdays[this._weekdays.isFormat.test(format) ? 'format' : 'standalone'][m.day()];
  }
  var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
  function localeWeekdaysShort(m) {
    return this._weekdaysShort[m.day()];
  }
  var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
  function localeWeekdaysMin(m) {
    return this._weekdaysMin[m.day()];
  }
  function day_of_week__handleStrictParse(weekdayName, format, strict) {
    var i,
        ii,
        mom,
        llc = weekdayName.toLocaleLowerCase();
    if (!this._weekdaysParse) {
      this._weekdaysParse = [];
      this._shortWeekdaysParse = [];
      this._minWeekdaysParse = [];
      for (i = 0; i < 7; ++i) {
        mom = create_utc__createUTC([2000, 1]).day(i);
        this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
        this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
        this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
      }
    }
    if (strict) {
      if (format === 'dddd') {
        ii = indexOf.call(this._weekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else if (format === 'ddd') {
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      }
    } else {
      if (format === 'dddd') {
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else if (format === 'ddd') {
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._minWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      } else {
        ii = indexOf.call(this._minWeekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._weekdaysParse, llc);
        if (ii !== -1) {
          return ii;
        }
        ii = indexOf.call(this._shortWeekdaysParse, llc);
        return ii !== -1 ? ii : null;
      }
    }
  }
  function localeWeekdaysParse(weekdayName, format, strict) {
    var i,
        mom,
        regex;
    if (this._weekdaysParseExact) {
      return day_of_week__handleStrictParse.call(this, weekdayName, format, strict);
    }
    if (!this._weekdaysParse) {
      this._weekdaysParse = [];
      this._minWeekdaysParse = [];
      this._shortWeekdaysParse = [];
      this._fullWeekdaysParse = [];
    }
    for (i = 0; i < 7; i++) {
      mom = create_utc__createUTC([2000, 1]).day(i);
      if (strict && !this._fullWeekdaysParse[i]) {
        this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\.?') + '$', 'i');
        this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\.?') + '$', 'i');
        this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\.?') + '$', 'i');
      }
      if (!this._weekdaysParse[i]) {
        regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
        this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
      }
      if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
        return i;
      } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
        return i;
      }
    }
  }
  function getSetDayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
    if (input != null) {
      input = parseWeekday(input, this.localeData());
      return this.add(input - day, 'd');
    } else {
      return day;
    }
  }
  function getSetLocaleDayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
    return input == null ? weekday : this.add(input - weekday, 'd');
  }
  function getSetISODayOfWeek(input) {
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    if (input != null) {
      var weekday = parseIsoWeekday(input, this.localeData());
      return this.day(this.day() % 7 ? weekday : weekday - 7);
    } else {
      return this.day() || 7;
    }
  }
  var defaultWeekdaysRegex = matchWord;
  function weekdaysRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysStrictRegex;
      } else {
        return this._weekdaysRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        this._weekdaysRegex = defaultWeekdaysRegex;
      }
      return this._weekdaysStrictRegex && isStrict ? this._weekdaysStrictRegex : this._weekdaysRegex;
    }
  }
  var defaultWeekdaysShortRegex = matchWord;
  function weekdaysShortRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysShortStrictRegex;
      } else {
        return this._weekdaysShortRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysShortRegex')) {
        this._weekdaysShortRegex = defaultWeekdaysShortRegex;
      }
      return this._weekdaysShortStrictRegex && isStrict ? this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
    }
  }
  var defaultWeekdaysMinRegex = matchWord;
  function weekdaysMinRegex(isStrict) {
    if (this._weekdaysParseExact) {
      if (!hasOwnProp(this, '_weekdaysRegex')) {
        computeWeekdaysParse.call(this);
      }
      if (isStrict) {
        return this._weekdaysMinStrictRegex;
      } else {
        return this._weekdaysMinRegex;
      }
    } else {
      if (!hasOwnProp(this, '_weekdaysMinRegex')) {
        this._weekdaysMinRegex = defaultWeekdaysMinRegex;
      }
      return this._weekdaysMinStrictRegex && isStrict ? this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
    }
  }
  function computeWeekdaysParse() {
    function cmpLenRev(a, b) {
      return b.length - a.length;
    }
    var minPieces = [],
        shortPieces = [],
        longPieces = [],
        mixedPieces = [],
        i,
        mom,
        minp,
        shortp,
        longp;
    for (i = 0; i < 7; i++) {
      mom = create_utc__createUTC([2000, 1]).day(i);
      minp = this.weekdaysMin(mom, '');
      shortp = this.weekdaysShort(mom, '');
      longp = this.weekdays(mom, '');
      minPieces.push(minp);
      shortPieces.push(shortp);
      longPieces.push(longp);
      mixedPieces.push(minp);
      mixedPieces.push(shortp);
      mixedPieces.push(longp);
    }
    minPieces.sort(cmpLenRev);
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    for (i = 0; i < 7; i++) {
      shortPieces[i] = regexEscape(shortPieces[i]);
      longPieces[i] = regexEscape(longPieces[i]);
      mixedPieces[i] = regexEscape(mixedPieces[i]);
    }
    this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    this._weekdaysShortRegex = this._weekdaysRegex;
    this._weekdaysMinRegex = this._weekdaysRegex;
    this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
    this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
  }
  function hFormat() {
    return this.hours() % 12 || 12;
  }
  function kFormat() {
    return this.hours() || 24;
  }
  addFormatToken('H', ['HH', 2], 0, 'hour');
  addFormatToken('h', ['hh', 2], 0, hFormat);
  addFormatToken('k', ['kk', 2], 0, kFormat);
  addFormatToken('hmm', 0, 0, function() {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
  });
  addFormatToken('hmmss', 0, 0, function() {
    return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) + zeroFill(this.seconds(), 2);
  });
  addFormatToken('Hmm', 0, 0, function() {
    return '' + this.hours() + zeroFill(this.minutes(), 2);
  });
  addFormatToken('Hmmss', 0, 0, function() {
    return '' + this.hours() + zeroFill(this.minutes(), 2) + zeroFill(this.seconds(), 2);
  });
  function meridiem(token, lowercase) {
    addFormatToken(token, 0, 0, function() {
      return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
    });
  }
  meridiem('a', true);
  meridiem('A', false);
  addUnitAlias('hour', 'h');
  addUnitPriority('hour', 13);
  function matchMeridiem(isStrict, locale) {
    return locale._meridiemParse;
  }
  addRegexToken('a', matchMeridiem);
  addRegexToken('A', matchMeridiem);
  addRegexToken('H', match1to2);
  addRegexToken('h', match1to2);
  addRegexToken('HH', match1to2, match2);
  addRegexToken('hh', match1to2, match2);
  addRegexToken('hmm', match3to4);
  addRegexToken('hmmss', match5to6);
  addRegexToken('Hmm', match3to4);
  addRegexToken('Hmmss', match5to6);
  addParseToken(['H', 'HH'], HOUR);
  addParseToken(['a', 'A'], function(input, array, config) {
    config._isPm = config._locale.isPM(input);
    config._meridiem = input;
  });
  addParseToken(['h', 'hh'], function(input, array, config) {
    array[HOUR] = toInt(input);
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('hmm', function(input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('hmmss', function(input, array, config) {
    var pos1 = input.length - 4;
    var pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
    getParsingFlags(config).bigHour = true;
  });
  addParseToken('Hmm', function(input, array, config) {
    var pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
  });
  addParseToken('Hmmss', function(input, array, config) {
    var pos1 = input.length - 4;
    var pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
  });
  function localeIsPM(input) {
    return ((input + '').toLowerCase().charAt(0) === 'p');
  }
  var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
  function localeMeridiem(hours, minutes, isLower) {
    if (hours > 11) {
      return isLower ? 'pm' : 'PM';
    } else {
      return isLower ? 'am' : 'AM';
    }
  }
  var getSetHour = makeGetSet('Hours', true);
  var baseConfig = {
    calendar: defaultCalendar,
    longDateFormat: defaultLongDateFormat,
    invalidDate: defaultInvalidDate,
    ordinal: defaultOrdinal,
    ordinalParse: defaultOrdinalParse,
    relativeTime: defaultRelativeTime,
    months: defaultLocaleMonths,
    monthsShort: defaultLocaleMonthsShort,
    week: defaultLocaleWeek,
    weekdays: defaultLocaleWeekdays,
    weekdaysMin: defaultLocaleWeekdaysMin,
    weekdaysShort: defaultLocaleWeekdaysShort,
    meridiemParse: defaultLocaleMeridiemParse
  };
  var locales = {};
  var globalLocale;
  function normalizeLocale(key) {
    return key ? key.toLowerCase().replace('_', '-') : key;
  }
  function chooseLocale(names) {
    var i = 0,
        j,
        next,
        locale,
        split;
    while (i < names.length) {
      split = normalizeLocale(names[i]).split('-');
      j = split.length;
      next = normalizeLocale(names[i + 1]);
      next = next ? next.split('-') : null;
      while (j > 0) {
        locale = loadLocale(split.slice(0, j).join('-'));
        if (locale) {
          return locale;
        }
        if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
          break;
        }
        j--;
      }
      i++;
    }
    return null;
  }
  function loadLocale(name) {
    var oldLocale = null;
    if (!locales[name] && (typeof module !== 'undefined') && module && module.exports) {
      try {
        oldLocale = globalLocale._abbr;
        require('./locale/' + name);
        locale_locales__getSetGlobalLocale(oldLocale);
      } catch (e) {}
    }
    return locales[name];
  }
  function locale_locales__getSetGlobalLocale(key, values) {
    var data;
    if (key) {
      if (isUndefined(values)) {
        data = locale_locales__getLocale(key);
      } else {
        data = defineLocale(key, values);
      }
      if (data) {
        globalLocale = data;
      }
    }
    return globalLocale._abbr;
  }
  function defineLocale(name, config) {
    if (config !== null) {
      var parentConfig = baseConfig;
      config.abbr = name;
      if (locales[name] != null) {
        deprecateSimple('defineLocaleOverride', 'use moment.updateLocale(localeName, config) to change ' + 'an existing locale. moment.defineLocale(localeName, ' + 'config) should only be used for creating a new locale ' + 'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
        parentConfig = locales[name]._config;
      } else if (config.parentLocale != null) {
        if (locales[config.parentLocale] != null) {
          parentConfig = locales[config.parentLocale]._config;
        } else {
          deprecateSimple('parentLocaleUndefined', 'specified parentLocale is not defined yet. See http://momentjs.com/guides/#/warnings/parent-locale/');
        }
      }
      locales[name] = new Locale(mergeConfigs(parentConfig, config));
      locale_locales__getSetGlobalLocale(name);
      return locales[name];
    } else {
      delete locales[name];
      return null;
    }
  }
  function updateLocale(name, config) {
    if (config != null) {
      var locale,
          parentConfig = baseConfig;
      if (locales[name] != null) {
        parentConfig = locales[name]._config;
      }
      config = mergeConfigs(parentConfig, config);
      locale = new Locale(config);
      locale.parentLocale = locales[name];
      locales[name] = locale;
      locale_locales__getSetGlobalLocale(name);
    } else {
      if (locales[name] != null) {
        if (locales[name].parentLocale != null) {
          locales[name] = locales[name].parentLocale;
        } else if (locales[name] != null) {
          delete locales[name];
        }
      }
    }
    return locales[name];
  }
  function locale_locales__getLocale(key) {
    var locale;
    if (key && key._locale && key._locale._abbr) {
      key = key._locale._abbr;
    }
    if (!key) {
      return globalLocale;
    }
    if (!isArray(key)) {
      locale = loadLocale(key);
      if (locale) {
        return locale;
      }
      key = [key];
    }
    return chooseLocale(key);
  }
  function locale_locales__listLocales() {
    return keys(locales);
  }
  function checkOverflow(m) {
    var overflow;
    var a = m._a;
    if (a && getParsingFlags(m).overflow === -2) {
      overflow = a[MONTH] < 0 || a[MONTH] > 11 ? MONTH : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH]) ? DATE : a[HOUR] < 0 || a[HOUR] > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR : a[MINUTE] < 0 || a[MINUTE] > 59 ? MINUTE : a[SECOND] < 0 || a[SECOND] > 59 ? SECOND : a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND : -1;
      if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
        overflow = DATE;
      }
      if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
        overflow = WEEK;
      }
      if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
        overflow = WEEKDAY;
      }
      getParsingFlags(m).overflow = overflow;
    }
    return m;
  }
  var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
  var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
  var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;
  var isoDates = [['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/], ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/], ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/], ['GGGG-[W]WW', /\d{4}-W\d\d/, false], ['YYYY-DDD', /\d{4}-\d{3}/], ['YYYY-MM', /\d{4}-\d\d/, false], ['YYYYYYMMDD', /[+-]\d{10}/], ['YYYYMMDD', /\d{8}/], ['GGGG[W]WWE', /\d{4}W\d{3}/], ['GGGG[W]WW', /\d{4}W\d{2}/, false], ['YYYYDDD', /\d{7}/]];
  var isoTimes = [['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/], ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/], ['HH:mm:ss', /\d\d:\d\d:\d\d/], ['HH:mm', /\d\d:\d\d/], ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/], ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/], ['HHmmss', /\d\d\d\d\d\d/], ['HHmm', /\d\d\d\d/], ['HH', /\d\d/]];
  var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;
  function configFromISO(config) {
    var i,
        l,
        string = config._i,
        match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
        allowTime,
        dateFormat,
        timeFormat,
        tzFormat;
    if (match) {
      getParsingFlags(config).iso = true;
      for (i = 0, l = isoDates.length; i < l; i++) {
        if (isoDates[i][1].exec(match[1])) {
          dateFormat = isoDates[i][0];
          allowTime = isoDates[i][2] !== false;
          break;
        }
      }
      if (dateFormat == null) {
        config._isValid = false;
        return;
      }
      if (match[3]) {
        for (i = 0, l = isoTimes.length; i < l; i++) {
          if (isoTimes[i][1].exec(match[3])) {
            timeFormat = (match[2] || ' ') + isoTimes[i][0];
            break;
          }
        }
        if (timeFormat == null) {
          config._isValid = false;
          return;
        }
      }
      if (!allowTime && timeFormat != null) {
        config._isValid = false;
        return;
      }
      if (match[4]) {
        if (tzRegex.exec(match[4])) {
          tzFormat = 'Z';
        } else {
          config._isValid = false;
          return;
        }
      }
      config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
      configFromStringAndFormat(config);
    } else {
      config._isValid = false;
    }
  }
  function configFromString(config) {
    var matched = aspNetJsonRegex.exec(config._i);
    if (matched !== null) {
      config._d = new Date(+matched[1]);
      return;
    }
    configFromISO(config);
    if (config._isValid === false) {
      delete config._isValid;
      utils_hooks__hooks.createFromInputFallback(config);
    }
  }
  utils_hooks__hooks.createFromInputFallback = deprecate('moment construction falls back to js Date. This is ' + 'discouraged and will be removed in upcoming major ' + 'release. Please refer to ' + 'http://momentjs.com/guides/#/warnings/js-date/ for more info.', function(config) {
    config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
  });
  function defaults(a, b, c) {
    if (a != null) {
      return a;
    }
    if (b != null) {
      return b;
    }
    return c;
  }
  function currentDateArray(config) {
    var nowValue = new Date(utils_hooks__hooks.now());
    if (config._useUTC) {
      return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
    }
    return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
  }
  function configFromArray(config) {
    var i,
        date,
        input = [],
        currentDate,
        yearToUse;
    if (config._d) {
      return;
    }
    currentDate = currentDateArray(config);
    if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
      dayOfYearFromWeekInfo(config);
    }
    if (config._dayOfYear) {
      yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);
      if (config._dayOfYear > daysInYear(yearToUse)) {
        getParsingFlags(config)._overflowDayOfYear = true;
      }
      date = createUTCDate(yearToUse, 0, config._dayOfYear);
      config._a[MONTH] = date.getUTCMonth();
      config._a[DATE] = date.getUTCDate();
    }
    for (i = 0; i < 3 && config._a[i] == null; ++i) {
      config._a[i] = input[i] = currentDate[i];
    }
    for (; i < 7; i++) {
      config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
    }
    if (config._a[HOUR] === 24 && config._a[MINUTE] === 0 && config._a[SECOND] === 0 && config._a[MILLISECOND] === 0) {
      config._nextDay = true;
      config._a[HOUR] = 0;
    }
    config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
    if (config._tzm != null) {
      config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
    }
    if (config._nextDay) {
      config._a[HOUR] = 24;
    }
  }
  function dayOfYearFromWeekInfo(config) {
    var w,
        weekYear,
        week,
        weekday,
        dow,
        doy,
        temp,
        weekdayOverflow;
    w = config._w;
    if (w.GG != null || w.W != null || w.E != null) {
      dow = 1;
      doy = 4;
      weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
      week = defaults(w.W, 1);
      weekday = defaults(w.E, 1);
      if (weekday < 1 || weekday > 7) {
        weekdayOverflow = true;
      }
    } else {
      dow = config._locale._week.dow;
      doy = config._locale._week.doy;
      weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
      week = defaults(w.w, 1);
      if (w.d != null) {
        weekday = w.d;
        if (weekday < 0 || weekday > 6) {
          weekdayOverflow = true;
        }
      } else if (w.e != null) {
        weekday = w.e + dow;
        if (w.e < 0 || w.e > 6) {
          weekdayOverflow = true;
        }
      } else {
        weekday = dow;
      }
    }
    if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
      getParsingFlags(config)._overflowWeeks = true;
    } else if (weekdayOverflow != null) {
      getParsingFlags(config)._overflowWeekday = true;
    } else {
      temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
      config._a[YEAR] = temp.year;
      config._dayOfYear = temp.dayOfYear;
    }
  }
  utils_hooks__hooks.ISO_8601 = function() {};
  function configFromStringAndFormat(config) {
    if (config._f === utils_hooks__hooks.ISO_8601) {
      configFromISO(config);
      return;
    }
    config._a = [];
    getParsingFlags(config).empty = true;
    var string = '' + config._i,
        i,
        parsedInput,
        tokens,
        token,
        skipped,
        stringLength = string.length,
        totalParsedInputLength = 0;
    tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];
    for (i = 0; i < tokens.length; i++) {
      token = tokens[i];
      parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
      if (parsedInput) {
        skipped = string.substr(0, string.indexOf(parsedInput));
        if (skipped.length > 0) {
          getParsingFlags(config).unusedInput.push(skipped);
        }
        string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
        totalParsedInputLength += parsedInput.length;
      }
      if (formatTokenFunctions[token]) {
        if (parsedInput) {
          getParsingFlags(config).empty = false;
        } else {
          getParsingFlags(config).unusedTokens.push(token);
        }
        addTimeToArrayFromToken(token, parsedInput, config);
      } else if (config._strict && !parsedInput) {
        getParsingFlags(config).unusedTokens.push(token);
      }
    }
    getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
    if (string.length > 0) {
      getParsingFlags(config).unusedInput.push(string);
    }
    if (config._a[HOUR] <= 12 && getParsingFlags(config).bigHour === true && config._a[HOUR] > 0) {
      getParsingFlags(config).bigHour = undefined;
    }
    getParsingFlags(config).parsedDateParts = config._a.slice(0);
    getParsingFlags(config).meridiem = config._meridiem;
    config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);
    configFromArray(config);
    checkOverflow(config);
  }
  function meridiemFixWrap(locale, hour, meridiem) {
    var isPm;
    if (meridiem == null) {
      return hour;
    }
    if (locale.meridiemHour != null) {
      return locale.meridiemHour(hour, meridiem);
    } else if (locale.isPM != null) {
      isPm = locale.isPM(meridiem);
      if (isPm && hour < 12) {
        hour += 12;
      }
      if (!isPm && hour === 12) {
        hour = 0;
      }
      return hour;
    } else {
      return hour;
    }
  }
  function configFromStringAndArray(config) {
    var tempConfig,
        bestMoment,
        scoreToBeat,
        i,
        currentScore;
    if (config._f.length === 0) {
      getParsingFlags(config).invalidFormat = true;
      config._d = new Date(NaN);
      return;
    }
    for (i = 0; i < config._f.length; i++) {
      currentScore = 0;
      tempConfig = copyConfig({}, config);
      if (config._useUTC != null) {
        tempConfig._useUTC = config._useUTC;
      }
      tempConfig._f = config._f[i];
      configFromStringAndFormat(tempConfig);
      if (!valid__isValid(tempConfig)) {
        continue;
      }
      currentScore += getParsingFlags(tempConfig).charsLeftOver;
      currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;
      getParsingFlags(tempConfig).score = currentScore;
      if (scoreToBeat == null || currentScore < scoreToBeat) {
        scoreToBeat = currentScore;
        bestMoment = tempConfig;
      }
    }
    extend(config, bestMoment || tempConfig);
  }
  function configFromObject(config) {
    if (config._d) {
      return;
    }
    var i = normalizeObjectUnits(config._i);
    config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function(obj) {
      return obj && parseInt(obj, 10);
    });
    configFromArray(config);
  }
  function createFromConfig(config) {
    var res = new Moment(checkOverflow(prepareConfig(config)));
    if (res._nextDay) {
      res.add(1, 'd');
      res._nextDay = undefined;
    }
    return res;
  }
  function prepareConfig(config) {
    var input = config._i,
        format = config._f;
    config._locale = config._locale || locale_locales__getLocale(config._l);
    if (input === null || (format === undefined && input === '')) {
      return valid__createInvalid({nullInput: true});
    }
    if (typeof input === 'string') {
      config._i = input = config._locale.preparse(input);
    }
    if (isMoment(input)) {
      return new Moment(checkOverflow(input));
    } else if (isArray(format)) {
      configFromStringAndArray(config);
    } else if (isDate(input)) {
      config._d = input;
    } else if (format) {
      configFromStringAndFormat(config);
    } else {
      configFromInput(config);
    }
    if (!valid__isValid(config)) {
      config._d = null;
    }
    return config;
  }
  function configFromInput(config) {
    var input = config._i;
    if (input === undefined) {
      config._d = new Date(utils_hooks__hooks.now());
    } else if (isDate(input)) {
      config._d = new Date(input.valueOf());
    } else if (typeof input === 'string') {
      configFromString(config);
    } else if (isArray(input)) {
      config._a = map(input.slice(0), function(obj) {
        return parseInt(obj, 10);
      });
      configFromArray(config);
    } else if (typeof(input) === 'object') {
      configFromObject(config);
    } else if (typeof(input) === 'number') {
      config._d = new Date(input);
    } else {
      utils_hooks__hooks.createFromInputFallback(config);
    }
  }
  function createLocalOrUTC(input, format, locale, strict, isUTC) {
    var c = {};
    if (typeof(locale) === 'boolean') {
      strict = locale;
      locale = undefined;
    }
    if ((isObject(input) && isObjectEmpty(input)) || (isArray(input) && input.length === 0)) {
      input = undefined;
    }
    c._isAMomentObject = true;
    c._useUTC = c._isUTC = isUTC;
    c._l = locale;
    c._i = input;
    c._f = format;
    c._strict = strict;
    return createFromConfig(c);
  }
  function local__createLocal(input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, false);
  }
  var prototypeMin = deprecate('moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/', function() {
    var other = local__createLocal.apply(null, arguments);
    if (this.isValid() && other.isValid()) {
      return other < this ? this : other;
    } else {
      return valid__createInvalid();
    }
  });
  var prototypeMax = deprecate('moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/', function() {
    var other = local__createLocal.apply(null, arguments);
    if (this.isValid() && other.isValid()) {
      return other > this ? this : other;
    } else {
      return valid__createInvalid();
    }
  });
  function pickBy(fn, moments) {
    var res,
        i;
    if (moments.length === 1 && isArray(moments[0])) {
      moments = moments[0];
    }
    if (!moments.length) {
      return local__createLocal();
    }
    res = moments[0];
    for (i = 1; i < moments.length; ++i) {
      if (!moments[i].isValid() || moments[i][fn](res)) {
        res = moments[i];
      }
    }
    return res;
  }
  function min() {
    var args = [].slice.call(arguments, 0);
    return pickBy('isBefore', args);
  }
  function max() {
    var args = [].slice.call(arguments, 0);
    return pickBy('isAfter', args);
  }
  var now = function() {
    return Date.now ? Date.now() : +(new Date());
  };
  function Duration(duration) {
    var normalizedInput = normalizeObjectUnits(duration),
        years = normalizedInput.year || 0,
        quarters = normalizedInput.quarter || 0,
        months = normalizedInput.month || 0,
        weeks = normalizedInput.week || 0,
        days = normalizedInput.day || 0,
        hours = normalizedInput.hour || 0,
        minutes = normalizedInput.minute || 0,
        seconds = normalizedInput.second || 0,
        milliseconds = normalizedInput.millisecond || 0;
    this._milliseconds = +milliseconds + seconds * 1e3 + minutes * 6e4 + hours * 1000 * 60 * 60;
    this._days = +days + weeks * 7;
    this._months = +months + quarters * 3 + years * 12;
    this._data = {};
    this._locale = locale_locales__getLocale();
    this._bubble();
  }
  function isDuration(obj) {
    return obj instanceof Duration;
  }
  function offset(token, separator) {
    addFormatToken(token, 0, 0, function() {
      var offset = this.utcOffset();
      var sign = '+';
      if (offset < 0) {
        offset = -offset;
        sign = '-';
      }
      return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
    });
  }
  offset('Z', ':');
  offset('ZZ', '');
  addRegexToken('Z', matchShortOffset);
  addRegexToken('ZZ', matchShortOffset);
  addParseToken(['Z', 'ZZ'], function(input, array, config) {
    config._useUTC = true;
    config._tzm = offsetFromString(matchShortOffset, input);
  });
  var chunkOffset = /([\+\-]|\d\d)/gi;
  function offsetFromString(matcher, string) {
    var matches = ((string || '').match(matcher) || []);
    var chunk = matches[matches.length - 1] || [];
    var parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
    var minutes = +(parts[1] * 60) + toInt(parts[2]);
    return parts[0] === '+' ? minutes : -minutes;
  }
  function cloneWithOffset(input, model) {
    var res,
        diff;
    if (model._isUTC) {
      res = model.clone();
      diff = (isMoment(input) || isDate(input) ? input.valueOf() : local__createLocal(input).valueOf()) - res.valueOf();
      res._d.setTime(res._d.valueOf() + diff);
      utils_hooks__hooks.updateOffset(res, false);
      return res;
    } else {
      return local__createLocal(input).local();
    }
  }
  function getDateOffset(m) {
    return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
  }
  utils_hooks__hooks.updateOffset = function() {};
  function getSetOffset(input, keepLocalTime) {
    var offset = this._offset || 0,
        localAdjust;
    if (!this.isValid()) {
      return input != null ? this : NaN;
    }
    if (input != null) {
      if (typeof input === 'string') {
        input = offsetFromString(matchShortOffset, input);
      } else if (Math.abs(input) < 16) {
        input = input * 60;
      }
      if (!this._isUTC && keepLocalTime) {
        localAdjust = getDateOffset(this);
      }
      this._offset = input;
      this._isUTC = true;
      if (localAdjust != null) {
        this.add(localAdjust, 'm');
      }
      if (offset !== input) {
        if (!keepLocalTime || this._changeInProgress) {
          add_subtract__addSubtract(this, create__createDuration(input - offset, 'm'), 1, false);
        } else if (!this._changeInProgress) {
          this._changeInProgress = true;
          utils_hooks__hooks.updateOffset(this, true);
          this._changeInProgress = null;
        }
      }
      return this;
    } else {
      return this._isUTC ? offset : getDateOffset(this);
    }
  }
  function getSetZone(input, keepLocalTime) {
    if (input != null) {
      if (typeof input !== 'string') {
        input = -input;
      }
      this.utcOffset(input, keepLocalTime);
      return this;
    } else {
      return -this.utcOffset();
    }
  }
  function setOffsetToUTC(keepLocalTime) {
    return this.utcOffset(0, keepLocalTime);
  }
  function setOffsetToLocal(keepLocalTime) {
    if (this._isUTC) {
      this.utcOffset(0, keepLocalTime);
      this._isUTC = false;
      if (keepLocalTime) {
        this.subtract(getDateOffset(this), 'm');
      }
    }
    return this;
  }
  function setOffsetToParsedOffset() {
    if (this._tzm) {
      this.utcOffset(this._tzm);
    } else if (typeof this._i === 'string') {
      this.utcOffset(offsetFromString(matchOffset, this._i));
    }
    return this;
  }
  function hasAlignedHourOffset(input) {
    if (!this.isValid()) {
      return false;
    }
    input = input ? local__createLocal(input).utcOffset() : 0;
    return (this.utcOffset() - input) % 60 === 0;
  }
  function isDaylightSavingTime() {
    return (this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset());
  }
  function isDaylightSavingTimeShifted() {
    if (!isUndefined(this._isDSTShifted)) {
      return this._isDSTShifted;
    }
    var c = {};
    copyConfig(c, this);
    c = prepareConfig(c);
    if (c._a) {
      var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
      this._isDSTShifted = this.isValid() && compareArrays(c._a, other.toArray()) > 0;
    } else {
      this._isDSTShifted = false;
    }
    return this._isDSTShifted;
  }
  function isLocal() {
    return this.isValid() ? !this._isUTC : false;
  }
  function isUtcOffset() {
    return this.isValid() ? this._isUTC : false;
  }
  function isUtc() {
    return this.isValid() ? this._isUTC && this._offset === 0 : false;
  }
  var aspNetRegex = /^(\-)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?\d*)?$/;
  var isoRegex = /^(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;
  function create__createDuration(input, key) {
    var duration = input,
        match = null,
        sign,
        ret,
        diffRes;
    if (isDuration(input)) {
      duration = {
        ms: input._milliseconds,
        d: input._days,
        M: input._months
      };
    } else if (typeof input === 'number') {
      duration = {};
      if (key) {
        duration[key] = input;
      } else {
        duration.milliseconds = input;
      }
    } else if (!!(match = aspNetRegex.exec(input))) {
      sign = (match[1] === '-') ? -1 : 1;
      duration = {
        y: 0,
        d: toInt(match[DATE]) * sign,
        h: toInt(match[HOUR]) * sign,
        m: toInt(match[MINUTE]) * sign,
        s: toInt(match[SECOND]) * sign,
        ms: toInt(match[MILLISECOND]) * sign
      };
    } else if (!!(match = isoRegex.exec(input))) {
      sign = (match[1] === '-') ? -1 : 1;
      duration = {
        y: parseIso(match[2], sign),
        M: parseIso(match[3], sign),
        w: parseIso(match[4], sign),
        d: parseIso(match[5], sign),
        h: parseIso(match[6], sign),
        m: parseIso(match[7], sign),
        s: parseIso(match[8], sign)
      };
    } else if (duration == null) {
      duration = {};
    } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
      diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));
      duration = {};
      duration.ms = diffRes.milliseconds;
      duration.M = diffRes.months;
    }
    ret = new Duration(duration);
    if (isDuration(input) && hasOwnProp(input, '_locale')) {
      ret._locale = input._locale;
    }
    return ret;
  }
  create__createDuration.fn = Duration.prototype;
  function parseIso(inp, sign) {
    var res = inp && parseFloat(inp.replace(',', '.'));
    return (isNaN(res) ? 0 : res) * sign;
  }
  function positiveMomentsDifference(base, other) {
    var res = {
      milliseconds: 0,
      months: 0
    };
    res.months = other.month() - base.month() + (other.year() - base.year()) * 12;
    if (base.clone().add(res.months, 'M').isAfter(other)) {
      --res.months;
    }
    res.milliseconds = +other - +(base.clone().add(res.months, 'M'));
    return res;
  }
  function momentsDifference(base, other) {
    var res;
    if (!(base.isValid() && other.isValid())) {
      return {
        milliseconds: 0,
        months: 0
      };
    }
    other = cloneWithOffset(other, base);
    if (base.isBefore(other)) {
      res = positiveMomentsDifference(base, other);
    } else {
      res = positiveMomentsDifference(other, base);
      res.milliseconds = -res.milliseconds;
      res.months = -res.months;
    }
    return res;
  }
  function absRound(number) {
    if (number < 0) {
      return Math.round(-1 * number) * -1;
    } else {
      return Math.round(number);
    }
  }
  function createAdder(direction, name) {
    return function(val, period) {
      var dur,
          tmp;
      if (period !== null && !isNaN(+period)) {
        deprecateSimple(name, 'moment().' + name + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' + 'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
        tmp = val;
        val = period;
        period = tmp;
      }
      val = typeof val === 'string' ? +val : val;
      dur = create__createDuration(val, period);
      add_subtract__addSubtract(this, dur, direction);
      return this;
    };
  }
  function add_subtract__addSubtract(mom, duration, isAdding, updateOffset) {
    var milliseconds = duration._milliseconds,
        days = absRound(duration._days),
        months = absRound(duration._months);
    if (!mom.isValid()) {
      return;
    }
    updateOffset = updateOffset == null ? true : updateOffset;
    if (milliseconds) {
      mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    }
    if (days) {
      get_set__set(mom, 'Date', get_set__get(mom, 'Date') + days * isAdding);
    }
    if (months) {
      setMonth(mom, get_set__get(mom, 'Month') + months * isAdding);
    }
    if (updateOffset) {
      utils_hooks__hooks.updateOffset(mom, days || months);
    }
  }
  var add_subtract__add = createAdder(1, 'add');
  var add_subtract__subtract = createAdder(-1, 'subtract');
  function getCalendarFormat(myMoment, now) {
    var diff = myMoment.diff(now, 'days', true);
    return diff < -6 ? 'sameElse' : diff < -1 ? 'lastWeek' : diff < 0 ? 'lastDay' : diff < 1 ? 'sameDay' : diff < 2 ? 'nextDay' : diff < 7 ? 'nextWeek' : 'sameElse';
  }
  function moment_calendar__calendar(time, formats) {
    var now = time || local__createLocal(),
        sod = cloneWithOffset(now, this).startOf('day'),
        format = utils_hooks__hooks.calendarFormat(this, sod) || 'sameElse';
    var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);
    return this.format(output || this.localeData().calendar(format, this, local__createLocal(now)));
  }
  function clone() {
    return new Moment(this);
  }
  function isAfter(input, units) {
    var localInput = isMoment(input) ? input : local__createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
    if (units === 'millisecond') {
      return this.valueOf() > localInput.valueOf();
    } else {
      return localInput.valueOf() < this.clone().startOf(units).valueOf();
    }
  }
  function isBefore(input, units) {
    var localInput = isMoment(input) ? input : local__createLocal(input);
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
    if (units === 'millisecond') {
      return this.valueOf() < localInput.valueOf();
    } else {
      return this.clone().endOf(units).valueOf() < localInput.valueOf();
    }
  }
  function isBetween(from, to, units, inclusivity) {
    inclusivity = inclusivity || '()';
    return (inclusivity[0] === '(' ? this.isAfter(from, units) : !this.isBefore(from, units)) && (inclusivity[1] === ')' ? this.isBefore(to, units) : !this.isAfter(to, units));
  }
  function isSame(input, units) {
    var localInput = isMoment(input) ? input : local__createLocal(input),
        inputMs;
    if (!(this.isValid() && localInput.isValid())) {
      return false;
    }
    units = normalizeUnits(units || 'millisecond');
    if (units === 'millisecond') {
      return this.valueOf() === localInput.valueOf();
    } else {
      inputMs = localInput.valueOf();
      return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
    }
  }
  function isSameOrAfter(input, units) {
    return this.isSame(input, units) || this.isAfter(input, units);
  }
  function isSameOrBefore(input, units) {
    return this.isSame(input, units) || this.isBefore(input, units);
  }
  function diff(input, units, asFloat) {
    var that,
        zoneDelta,
        delta,
        output;
    if (!this.isValid()) {
      return NaN;
    }
    that = cloneWithOffset(input, this);
    if (!that.isValid()) {
      return NaN;
    }
    zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;
    units = normalizeUnits(units);
    if (units === 'year' || units === 'month' || units === 'quarter') {
      output = monthDiff(this, that);
      if (units === 'quarter') {
        output = output / 3;
      } else if (units === 'year') {
        output = output / 12;
      }
    } else {
      delta = this - that;
      output = units === 'second' ? delta / 1e3 : units === 'minute' ? delta / 6e4 : units === 'hour' ? delta / 36e5 : units === 'day' ? (delta - zoneDelta) / 864e5 : units === 'week' ? (delta - zoneDelta) / 6048e5 : delta;
    }
    return asFloat ? output : absFloor(output);
  }
  function monthDiff(a, b) {
    var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
        anchor = a.clone().add(wholeMonthDiff, 'months'),
        anchor2,
        adjust;
    if (b - anchor < 0) {
      anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
      adjust = (b - anchor) / (anchor - anchor2);
    } else {
      anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
      adjust = (b - anchor) / (anchor2 - anchor);
    }
    return -(wholeMonthDiff + adjust) || 0;
  }
  utils_hooks__hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
  utils_hooks__hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';
  function toString() {
    return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
  }
  function moment_format__toISOString() {
    var m = this.clone().utc();
    if (0 < m.year() && m.year() <= 9999) {
      if (isFunction(Date.prototype.toISOString)) {
        return this.toDate().toISOString();
      } else {
        return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
      }
    } else {
      return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    }
  }
  function format(inputString) {
    if (!inputString) {
      inputString = this.isUtc() ? utils_hooks__hooks.defaultFormatUtc : utils_hooks__hooks.defaultFormat;
    }
    var output = formatMoment(this, inputString);
    return this.localeData().postformat(output);
  }
  function from(time, withoutSuffix) {
    if (this.isValid() && ((isMoment(time) && time.isValid()) || local__createLocal(time).isValid())) {
      return create__createDuration({
        to: this,
        from: time
      }).locale(this.locale()).humanize(!withoutSuffix);
    } else {
      return this.localeData().invalidDate();
    }
  }
  function fromNow(withoutSuffix) {
    return this.from(local__createLocal(), withoutSuffix);
  }
  function to(time, withoutSuffix) {
    if (this.isValid() && ((isMoment(time) && time.isValid()) || local__createLocal(time).isValid())) {
      return create__createDuration({
        from: this,
        to: time
      }).locale(this.locale()).humanize(!withoutSuffix);
    } else {
      return this.localeData().invalidDate();
    }
  }
  function toNow(withoutSuffix) {
    return this.to(local__createLocal(), withoutSuffix);
  }
  function locale(key) {
    var newLocaleData;
    if (key === undefined) {
      return this._locale._abbr;
    } else {
      newLocaleData = locale_locales__getLocale(key);
      if (newLocaleData != null) {
        this._locale = newLocaleData;
      }
      return this;
    }
  }
  var lang = deprecate('moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.', function(key) {
    if (key === undefined) {
      return this.localeData();
    } else {
      return this.locale(key);
    }
  });
  function localeData() {
    return this._locale;
  }
  function startOf(units) {
    units = normalizeUnits(units);
    switch (units) {
      case 'year':
        this.month(0);
      case 'quarter':
      case 'month':
        this.date(1);
      case 'week':
      case 'isoWeek':
      case 'day':
      case 'date':
        this.hours(0);
      case 'hour':
        this.minutes(0);
      case 'minute':
        this.seconds(0);
      case 'second':
        this.milliseconds(0);
    }
    if (units === 'week') {
      this.weekday(0);
    }
    if (units === 'isoWeek') {
      this.isoWeekday(1);
    }
    if (units === 'quarter') {
      this.month(Math.floor(this.month() / 3) * 3);
    }
    return this;
  }
  function endOf(units) {
    units = normalizeUnits(units);
    if (units === undefined || units === 'millisecond') {
      return this;
    }
    if (units === 'date') {
      units = 'day';
    }
    return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
  }
  function to_type__valueOf() {
    return this._d.valueOf() - ((this._offset || 0) * 60000);
  }
  function unix() {
    return Math.floor(this.valueOf() / 1000);
  }
  function toDate() {
    return new Date(this.valueOf());
  }
  function toArray() {
    var m = this;
    return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
  }
  function toObject() {
    var m = this;
    return {
      years: m.year(),
      months: m.month(),
      date: m.date(),
      hours: m.hours(),
      minutes: m.minutes(),
      seconds: m.seconds(),
      milliseconds: m.milliseconds()
    };
  }
  function toJSON() {
    return this.isValid() ? this.toISOString() : null;
  }
  function moment_valid__isValid() {
    return valid__isValid(this);
  }
  function parsingFlags() {
    return extend({}, getParsingFlags(this));
  }
  function invalidAt() {
    return getParsingFlags(this).overflow;
  }
  function creationData() {
    return {
      input: this._i,
      format: this._f,
      locale: this._locale,
      isUTC: this._isUTC,
      strict: this._strict
    };
  }
  addFormatToken(0, ['gg', 2], 0, function() {
    return this.weekYear() % 100;
  });
  addFormatToken(0, ['GG', 2], 0, function() {
    return this.isoWeekYear() % 100;
  });
  function addWeekYearFormatToken(token, getter) {
    addFormatToken(0, [token, token.length], 0, getter);
  }
  addWeekYearFormatToken('gggg', 'weekYear');
  addWeekYearFormatToken('ggggg', 'weekYear');
  addWeekYearFormatToken('GGGG', 'isoWeekYear');
  addWeekYearFormatToken('GGGGG', 'isoWeekYear');
  addUnitAlias('weekYear', 'gg');
  addUnitAlias('isoWeekYear', 'GG');
  addUnitPriority('weekYear', 1);
  addUnitPriority('isoWeekYear', 1);
  addRegexToken('G', matchSigned);
  addRegexToken('g', matchSigned);
  addRegexToken('GG', match1to2, match2);
  addRegexToken('gg', match1to2, match2);
  addRegexToken('GGGG', match1to4, match4);
  addRegexToken('gggg', match1to4, match4);
  addRegexToken('GGGGG', match1to6, match6);
  addRegexToken('ggggg', match1to6, match6);
  addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function(input, week, config, token) {
    week[token.substr(0, 2)] = toInt(input);
  });
  addWeekParseToken(['gg', 'GG'], function(input, week, config, token) {
    week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
  });
  function getSetWeekYear(input) {
    return getSetWeekYearHelper.call(this, input, this.week(), this.weekday(), this.localeData()._week.dow, this.localeData()._week.doy);
  }
  function getSetISOWeekYear(input) {
    return getSetWeekYearHelper.call(this, input, this.isoWeek(), this.isoWeekday(), 1, 4);
  }
  function getISOWeeksInYear() {
    return weeksInYear(this.year(), 1, 4);
  }
  function getWeeksInYear() {
    var weekInfo = this.localeData()._week;
    return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
  }
  function getSetWeekYearHelper(input, week, weekday, dow, doy) {
    var weeksTarget;
    if (input == null) {
      return weekOfYear(this, dow, doy).year;
    } else {
      weeksTarget = weeksInYear(input, dow, doy);
      if (week > weeksTarget) {
        week = weeksTarget;
      }
      return setWeekAll.call(this, input, week, weekday, dow, doy);
    }
  }
  function setWeekAll(weekYear, week, weekday, dow, doy) {
    var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
        date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);
    this.year(date.getUTCFullYear());
    this.month(date.getUTCMonth());
    this.date(date.getUTCDate());
    return this;
  }
  addFormatToken('Q', 0, 'Qo', 'quarter');
  addUnitAlias('quarter', 'Q');
  addUnitPriority('quarter', 7);
  addRegexToken('Q', match1);
  addParseToken('Q', function(input, array) {
    array[MONTH] = (toInt(input) - 1) * 3;
  });
  function getSetQuarter(input) {
    return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
  }
  addFormatToken('D', ['DD', 2], 'Do', 'date');
  addUnitAlias('date', 'D');
  addUnitPriority('date', 9);
  addRegexToken('D', match1to2);
  addRegexToken('DD', match1to2, match2);
  addRegexToken('Do', function(isStrict, locale) {
    return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
  });
  addParseToken(['D', 'DD'], DATE);
  addParseToken('Do', function(input, array) {
    array[DATE] = toInt(input.match(match1to2)[0], 10);
  });
  var getSetDayOfMonth = makeGetSet('Date', true);
  addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');
  addUnitAlias('dayOfYear', 'DDD');
  addUnitPriority('dayOfYear', 4);
  addRegexToken('DDD', match1to3);
  addRegexToken('DDDD', match3);
  addParseToken(['DDD', 'DDDD'], function(input, array, config) {
    config._dayOfYear = toInt(input);
  });
  function getSetDayOfYear(input) {
    var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
    return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
  }
  addFormatToken('m', ['mm', 2], 0, 'minute');
  addUnitAlias('minute', 'm');
  addUnitPriority('minute', 14);
  addRegexToken('m', match1to2);
  addRegexToken('mm', match1to2, match2);
  addParseToken(['m', 'mm'], MINUTE);
  var getSetMinute = makeGetSet('Minutes', false);
  addFormatToken('s', ['ss', 2], 0, 'second');
  addUnitAlias('second', 's');
  addUnitPriority('second', 15);
  addRegexToken('s', match1to2);
  addRegexToken('ss', match1to2, match2);
  addParseToken(['s', 'ss'], SECOND);
  var getSetSecond = makeGetSet('Seconds', false);
  addFormatToken('S', 0, 0, function() {
    return ~~(this.millisecond() / 100);
  });
  addFormatToken(0, ['SS', 2], 0, function() {
    return ~~(this.millisecond() / 10);
  });
  addFormatToken(0, ['SSS', 3], 0, 'millisecond');
  addFormatToken(0, ['SSSS', 4], 0, function() {
    return this.millisecond() * 10;
  });
  addFormatToken(0, ['SSSSS', 5], 0, function() {
    return this.millisecond() * 100;
  });
  addFormatToken(0, ['SSSSSS', 6], 0, function() {
    return this.millisecond() * 1000;
  });
  addFormatToken(0, ['SSSSSSS', 7], 0, function() {
    return this.millisecond() * 10000;
  });
  addFormatToken(0, ['SSSSSSSS', 8], 0, function() {
    return this.millisecond() * 100000;
  });
  addFormatToken(0, ['SSSSSSSSS', 9], 0, function() {
    return this.millisecond() * 1000000;
  });
  addUnitAlias('millisecond', 'ms');
  addUnitPriority('millisecond', 16);
  addRegexToken('S', match1to3, match1);
  addRegexToken('SS', match1to3, match2);
  addRegexToken('SSS', match1to3, match3);
  var token;
  for (token = 'SSSS'; token.length <= 9; token += 'S') {
    addRegexToken(token, matchUnsigned);
  }
  function parseMs(input, array) {
    array[MILLISECOND] = toInt(('0.' + input) * 1000);
  }
  for (token = 'S'; token.length <= 9; token += 'S') {
    addParseToken(token, parseMs);
  }
  var getSetMillisecond = makeGetSet('Milliseconds', false);
  addFormatToken('z', 0, 0, 'zoneAbbr');
  addFormatToken('zz', 0, 0, 'zoneName');
  function getZoneAbbr() {
    return this._isUTC ? 'UTC' : '';
  }
  function getZoneName() {
    return this._isUTC ? 'Coordinated Universal Time' : '';
  }
  var momentPrototype__proto = Moment.prototype;
  momentPrototype__proto.add = add_subtract__add;
  momentPrototype__proto.calendar = moment_calendar__calendar;
  momentPrototype__proto.clone = clone;
  momentPrototype__proto.diff = diff;
  momentPrototype__proto.endOf = endOf;
  momentPrototype__proto.format = format;
  momentPrototype__proto.from = from;
  momentPrototype__proto.fromNow = fromNow;
  momentPrototype__proto.to = to;
  momentPrototype__proto.toNow = toNow;
  momentPrototype__proto.get = stringGet;
  momentPrototype__proto.invalidAt = invalidAt;
  momentPrototype__proto.isAfter = isAfter;
  momentPrototype__proto.isBefore = isBefore;
  momentPrototype__proto.isBetween = isBetween;
  momentPrototype__proto.isSame = isSame;
  momentPrototype__proto.isSameOrAfter = isSameOrAfter;
  momentPrototype__proto.isSameOrBefore = isSameOrBefore;
  momentPrototype__proto.isValid = moment_valid__isValid;
  momentPrototype__proto.lang = lang;
  momentPrototype__proto.locale = locale;
  momentPrototype__proto.localeData = localeData;
  momentPrototype__proto.max = prototypeMax;
  momentPrototype__proto.min = prototypeMin;
  momentPrototype__proto.parsingFlags = parsingFlags;
  momentPrototype__proto.set = stringSet;
  momentPrototype__proto.startOf = startOf;
  momentPrototype__proto.subtract = add_subtract__subtract;
  momentPrototype__proto.toArray = toArray;
  momentPrototype__proto.toObject = toObject;
  momentPrototype__proto.toDate = toDate;
  momentPrototype__proto.toISOString = moment_format__toISOString;
  momentPrototype__proto.toJSON = toJSON;
  momentPrototype__proto.toString = toString;
  momentPrototype__proto.unix = unix;
  momentPrototype__proto.valueOf = to_type__valueOf;
  momentPrototype__proto.creationData = creationData;
  momentPrototype__proto.year = getSetYear;
  momentPrototype__proto.isLeapYear = getIsLeapYear;
  momentPrototype__proto.weekYear = getSetWeekYear;
  momentPrototype__proto.isoWeekYear = getSetISOWeekYear;
  momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;
  momentPrototype__proto.month = getSetMonth;
  momentPrototype__proto.daysInMonth = getDaysInMonth;
  momentPrototype__proto.week = momentPrototype__proto.weeks = getSetWeek;
  momentPrototype__proto.isoWeek = momentPrototype__proto.isoWeeks = getSetISOWeek;
  momentPrototype__proto.weeksInYear = getWeeksInYear;
  momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;
  momentPrototype__proto.date = getSetDayOfMonth;
  momentPrototype__proto.day = momentPrototype__proto.days = getSetDayOfWeek;
  momentPrototype__proto.weekday = getSetLocaleDayOfWeek;
  momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
  momentPrototype__proto.dayOfYear = getSetDayOfYear;
  momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;
  momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;
  momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;
  momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;
  momentPrototype__proto.utcOffset = getSetOffset;
  momentPrototype__proto.utc = setOffsetToUTC;
  momentPrototype__proto.local = setOffsetToLocal;
  momentPrototype__proto.parseZone = setOffsetToParsedOffset;
  momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
  momentPrototype__proto.isDST = isDaylightSavingTime;
  momentPrototype__proto.isLocal = isLocal;
  momentPrototype__proto.isUtcOffset = isUtcOffset;
  momentPrototype__proto.isUtc = isUtc;
  momentPrototype__proto.isUTC = isUtc;
  momentPrototype__proto.zoneAbbr = getZoneAbbr;
  momentPrototype__proto.zoneName = getZoneName;
  momentPrototype__proto.dates = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
  momentPrototype__proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
  momentPrototype__proto.years = deprecate('years accessor is deprecated. Use year instead', getSetYear);
  momentPrototype__proto.zone = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
  momentPrototype__proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);
  var momentPrototype = momentPrototype__proto;
  function moment__createUnix(input) {
    return local__createLocal(input * 1000);
  }
  function moment__createInZone() {
    return local__createLocal.apply(null, arguments).parseZone();
  }
  function preParsePostFormat(string) {
    return string;
  }
  var prototype__proto = Locale.prototype;
  prototype__proto.calendar = locale_calendar__calendar;
  prototype__proto.longDateFormat = longDateFormat;
  prototype__proto.invalidDate = invalidDate;
  prototype__proto.ordinal = ordinal;
  prototype__proto.preparse = preParsePostFormat;
  prototype__proto.postformat = preParsePostFormat;
  prototype__proto.relativeTime = relative__relativeTime;
  prototype__proto.pastFuture = pastFuture;
  prototype__proto.set = locale_set__set;
  prototype__proto.months = localeMonths;
  prototype__proto.monthsShort = localeMonthsShort;
  prototype__proto.monthsParse = localeMonthsParse;
  prototype__proto.monthsRegex = monthsRegex;
  prototype__proto.monthsShortRegex = monthsShortRegex;
  prototype__proto.week = localeWeek;
  prototype__proto.firstDayOfYear = localeFirstDayOfYear;
  prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;
  prototype__proto.weekdays = localeWeekdays;
  prototype__proto.weekdaysMin = localeWeekdaysMin;
  prototype__proto.weekdaysShort = localeWeekdaysShort;
  prototype__proto.weekdaysParse = localeWeekdaysParse;
  prototype__proto.weekdaysRegex = weekdaysRegex;
  prototype__proto.weekdaysShortRegex = weekdaysShortRegex;
  prototype__proto.weekdaysMinRegex = weekdaysMinRegex;
  prototype__proto.isPM = localeIsPM;
  prototype__proto.meridiem = localeMeridiem;
  function lists__get(format, index, field, setter) {
    var locale = locale_locales__getLocale();
    var utc = create_utc__createUTC().set(setter, index);
    return locale[field](utc, format);
  }
  function listMonthsImpl(format, index, field) {
    if (typeof format === 'number') {
      index = format;
      format = undefined;
    }
    format = format || '';
    if (index != null) {
      return lists__get(format, index, field, 'month');
    }
    var i;
    var out = [];
    for (i = 0; i < 12; i++) {
      out[i] = lists__get(format, i, field, 'month');
    }
    return out;
  }
  function listWeekdaysImpl(localeSorted, format, index, field) {
    if (typeof localeSorted === 'boolean') {
      if (typeof format === 'number') {
        index = format;
        format = undefined;
      }
      format = format || '';
    } else {
      format = localeSorted;
      index = format;
      localeSorted = false;
      if (typeof format === 'number') {
        index = format;
        format = undefined;
      }
      format = format || '';
    }
    var locale = locale_locales__getLocale(),
        shift = localeSorted ? locale._week.dow : 0;
    if (index != null) {
      return lists__get(format, (index + shift) % 7, field, 'day');
    }
    var i;
    var out = [];
    for (i = 0; i < 7; i++) {
      out[i] = lists__get(format, (i + shift) % 7, field, 'day');
    }
    return out;
  }
  function lists__listMonths(format, index) {
    return listMonthsImpl(format, index, 'months');
  }
  function lists__listMonthsShort(format, index) {
    return listMonthsImpl(format, index, 'monthsShort');
  }
  function lists__listWeekdays(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
  }
  function lists__listWeekdaysShort(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
  }
  function lists__listWeekdaysMin(localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
  }
  locale_locales__getSetGlobalLocale('en', {
    ordinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal: function(number) {
      var b = number % 10,
          output = (toInt(number % 100 / 10) === 1) ? 'th' : (b === 1) ? 'st' : (b === 2) ? 'nd' : (b === 3) ? 'rd' : 'th';
      return number + output;
    }
  });
  utils_hooks__hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', locale_locales__getSetGlobalLocale);
  utils_hooks__hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', locale_locales__getLocale);
  var mathAbs = Math.abs;
  function duration_abs__abs() {
    var data = this._data;
    this._milliseconds = mathAbs(this._milliseconds);
    this._days = mathAbs(this._days);
    this._months = mathAbs(this._months);
    data.milliseconds = mathAbs(data.milliseconds);
    data.seconds = mathAbs(data.seconds);
    data.minutes = mathAbs(data.minutes);
    data.hours = mathAbs(data.hours);
    data.months = mathAbs(data.months);
    data.years = mathAbs(data.years);
    return this;
  }
  function duration_add_subtract__addSubtract(duration, input, value, direction) {
    var other = create__createDuration(input, value);
    duration._milliseconds += direction * other._milliseconds;
    duration._days += direction * other._days;
    duration._months += direction * other._months;
    return duration._bubble();
  }
  function duration_add_subtract__add(input, value) {
    return duration_add_subtract__addSubtract(this, input, value, 1);
  }
  function duration_add_subtract__subtract(input, value) {
    return duration_add_subtract__addSubtract(this, input, value, -1);
  }
  function absCeil(number) {
    if (number < 0) {
      return Math.floor(number);
    } else {
      return Math.ceil(number);
    }
  }
  function bubble() {
    var milliseconds = this._milliseconds;
    var days = this._days;
    var months = this._months;
    var data = this._data;
    var seconds,
        minutes,
        hours,
        years,
        monthsFromDays;
    if (!((milliseconds >= 0 && days >= 0 && months >= 0) || (milliseconds <= 0 && days <= 0 && months <= 0))) {
      milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
      days = 0;
      months = 0;
    }
    data.milliseconds = milliseconds % 1000;
    seconds = absFloor(milliseconds / 1000);
    data.seconds = seconds % 60;
    minutes = absFloor(seconds / 60);
    data.minutes = minutes % 60;
    hours = absFloor(minutes / 60);
    data.hours = hours % 24;
    days += absFloor(hours / 24);
    monthsFromDays = absFloor(daysToMonths(days));
    months += monthsFromDays;
    days -= absCeil(monthsToDays(monthsFromDays));
    years = absFloor(months / 12);
    months %= 12;
    data.days = days;
    data.months = months;
    data.years = years;
    return this;
  }
  function daysToMonths(days) {
    return days * 4800 / 146097;
  }
  function monthsToDays(months) {
    return months * 146097 / 4800;
  }
  function as(units) {
    var days;
    var months;
    var milliseconds = this._milliseconds;
    units = normalizeUnits(units);
    if (units === 'month' || units === 'year') {
      days = this._days + milliseconds / 864e5;
      months = this._months + daysToMonths(days);
      return units === 'month' ? months : months / 12;
    } else {
      days = this._days + Math.round(monthsToDays(this._months));
      switch (units) {
        case 'week':
          return days / 7 + milliseconds / 6048e5;
        case 'day':
          return days + milliseconds / 864e5;
        case 'hour':
          return days * 24 + milliseconds / 36e5;
        case 'minute':
          return days * 1440 + milliseconds / 6e4;
        case 'second':
          return days * 86400 + milliseconds / 1000;
        case 'millisecond':
          return Math.floor(days * 864e5) + milliseconds;
        default:
          throw new Error('Unknown unit ' + units);
      }
    }
  }
  function duration_as__valueOf() {
    return (this._milliseconds + this._days * 864e5 + (this._months % 12) * 2592e6 + toInt(this._months / 12) * 31536e6);
  }
  function makeAs(alias) {
    return function() {
      return this.as(alias);
    };
  }
  var asMilliseconds = makeAs('ms');
  var asSeconds = makeAs('s');
  var asMinutes = makeAs('m');
  var asHours = makeAs('h');
  var asDays = makeAs('d');
  var asWeeks = makeAs('w');
  var asMonths = makeAs('M');
  var asYears = makeAs('y');
  function duration_get__get(units) {
    units = normalizeUnits(units);
    return this[units + 's']();
  }
  function makeGetter(name) {
    return function() {
      return this._data[name];
    };
  }
  var milliseconds = makeGetter('milliseconds');
  var seconds = makeGetter('seconds');
  var minutes = makeGetter('minutes');
  var hours = makeGetter('hours');
  var days = makeGetter('days');
  var months = makeGetter('months');
  var years = makeGetter('years');
  function weeks() {
    return absFloor(this.days() / 7);
  }
  var round = Math.round;
  var thresholds = {
    s: 45,
    m: 45,
    h: 22,
    d: 26,
    M: 11
  };
  function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
    return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
  }
  function duration_humanize__relativeTime(posNegDuration, withoutSuffix, locale) {
    var duration = create__createDuration(posNegDuration).abs();
    var seconds = round(duration.as('s'));
    var minutes = round(duration.as('m'));
    var hours = round(duration.as('h'));
    var days = round(duration.as('d'));
    var months = round(duration.as('M'));
    var years = round(duration.as('y'));
    var a = seconds < thresholds.s && ['s', seconds] || minutes <= 1 && ['m'] || minutes < thresholds.m && ['mm', minutes] || hours <= 1 && ['h'] || hours < thresholds.h && ['hh', hours] || days <= 1 && ['d'] || days < thresholds.d && ['dd', days] || months <= 1 && ['M'] || months < thresholds.M && ['MM', months] || years <= 1 && ['y'] || ['yy', years];
    a[2] = withoutSuffix;
    a[3] = +posNegDuration > 0;
    a[4] = locale;
    return substituteTimeAgo.apply(null, a);
  }
  function duration_humanize__getSetRelativeTimeRounding(roundingFunction) {
    if (roundingFunction === undefined) {
      return round;
    }
    if (typeof(roundingFunction) === 'function') {
      round = roundingFunction;
      return true;
    }
    return false;
  }
  function duration_humanize__getSetRelativeTimeThreshold(threshold, limit) {
    if (thresholds[threshold] === undefined) {
      return false;
    }
    if (limit === undefined) {
      return thresholds[threshold];
    }
    thresholds[threshold] = limit;
    return true;
  }
  function humanize(withSuffix) {
    var locale = this.localeData();
    var output = duration_humanize__relativeTime(this, !withSuffix, locale);
    if (withSuffix) {
      output = locale.pastFuture(+this, output);
    }
    return locale.postformat(output);
  }
  var iso_string__abs = Math.abs;
  function iso_string__toISOString() {
    var seconds = iso_string__abs(this._milliseconds) / 1000;
    var days = iso_string__abs(this._days);
    var months = iso_string__abs(this._months);
    var minutes,
        hours,
        years;
    minutes = absFloor(seconds / 60);
    hours = absFloor(minutes / 60);
    seconds %= 60;
    minutes %= 60;
    years = absFloor(months / 12);
    months %= 12;
    var Y = years;
    var M = months;
    var D = days;
    var h = hours;
    var m = minutes;
    var s = seconds;
    var total = this.asSeconds();
    if (!total) {
      return 'P0D';
    }
    return (total < 0 ? '-' : '') + 'P' + (Y ? Y + 'Y' : '') + (M ? M + 'M' : '') + (D ? D + 'D' : '') + ((h || m || s) ? 'T' : '') + (h ? h + 'H' : '') + (m ? m + 'M' : '') + (s ? s + 'S' : '');
  }
  var duration_prototype__proto = Duration.prototype;
  duration_prototype__proto.abs = duration_abs__abs;
  duration_prototype__proto.add = duration_add_subtract__add;
  duration_prototype__proto.subtract = duration_add_subtract__subtract;
  duration_prototype__proto.as = as;
  duration_prototype__proto.asMilliseconds = asMilliseconds;
  duration_prototype__proto.asSeconds = asSeconds;
  duration_prototype__proto.asMinutes = asMinutes;
  duration_prototype__proto.asHours = asHours;
  duration_prototype__proto.asDays = asDays;
  duration_prototype__proto.asWeeks = asWeeks;
  duration_prototype__proto.asMonths = asMonths;
  duration_prototype__proto.asYears = asYears;
  duration_prototype__proto.valueOf = duration_as__valueOf;
  duration_prototype__proto._bubble = bubble;
  duration_prototype__proto.get = duration_get__get;
  duration_prototype__proto.milliseconds = milliseconds;
  duration_prototype__proto.seconds = seconds;
  duration_prototype__proto.minutes = minutes;
  duration_prototype__proto.hours = hours;
  duration_prototype__proto.days = days;
  duration_prototype__proto.weeks = weeks;
  duration_prototype__proto.months = months;
  duration_prototype__proto.years = years;
  duration_prototype__proto.humanize = humanize;
  duration_prototype__proto.toISOString = iso_string__toISOString;
  duration_prototype__proto.toString = iso_string__toISOString;
  duration_prototype__proto.toJSON = iso_string__toISOString;
  duration_prototype__proto.locale = locale;
  duration_prototype__proto.localeData = localeData;
  duration_prototype__proto.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', iso_string__toISOString);
  duration_prototype__proto.lang = lang;
  addFormatToken('X', 0, 0, 'unix');
  addFormatToken('x', 0, 0, 'valueOf');
  addRegexToken('x', matchSigned);
  addRegexToken('X', matchTimestamp);
  addParseToken('X', function(input, array, config) {
    config._d = new Date(parseFloat(input, 10) * 1000);
  });
  addParseToken('x', function(input, array, config) {
    config._d = new Date(toInt(input));
  });
  utils_hooks__hooks.version = '2.14.1';
  setHookCallback(local__createLocal);
  utils_hooks__hooks.fn = momentPrototype;
  utils_hooks__hooks.min = min;
  utils_hooks__hooks.max = max;
  utils_hooks__hooks.now = now;
  utils_hooks__hooks.utc = create_utc__createUTC;
  utils_hooks__hooks.unix = moment__createUnix;
  utils_hooks__hooks.months = lists__listMonths;
  utils_hooks__hooks.isDate = isDate;
  utils_hooks__hooks.locale = locale_locales__getSetGlobalLocale;
  utils_hooks__hooks.invalid = valid__createInvalid;
  utils_hooks__hooks.duration = create__createDuration;
  utils_hooks__hooks.isMoment = isMoment;
  utils_hooks__hooks.weekdays = lists__listWeekdays;
  utils_hooks__hooks.parseZone = moment__createInZone;
  utils_hooks__hooks.localeData = locale_locales__getLocale;
  utils_hooks__hooks.isDuration = isDuration;
  utils_hooks__hooks.monthsShort = lists__listMonthsShort;
  utils_hooks__hooks.weekdaysMin = lists__listWeekdaysMin;
  utils_hooks__hooks.defineLocale = defineLocale;
  utils_hooks__hooks.updateLocale = updateLocale;
  utils_hooks__hooks.locales = locale_locales__listLocales;
  utils_hooks__hooks.weekdaysShort = lists__listWeekdaysShort;
  utils_hooks__hooks.normalizeUnits = normalizeUnits;
  utils_hooks__hooks.relativeTimeRounding = duration_humanize__getSetRelativeTimeRounding;
  utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;
  utils_hooks__hooks.calendarFormat = getCalendarFormat;
  utils_hooks__hooks.prototype = momentPrototype;
  var _moment = utils_hooks__hooks;
  return _moment;
}));

})();
$__System.registerDynamic("13", ["12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      define(["moment"], function(a0) {
        return (root['DateRange'] = factory(a0));
      });
    } else if (typeof exports === 'object') {
      module.exports = factory($__require('12'));
    } else {
      root['DateRange'] = factory(moment);
    }
  }(this, function(moment) {
    var INTERVALS = {
      year: true,
      month: true,
      week: true,
      day: true,
      hour: true,
      minute: true,
      second: true
    };
    function DateRange(start, end) {
      var parts;
      var s = start;
      var e = end;
      if (arguments.length === 1 || end === undefined) {
        if (typeof start === 'object' && start.length === 2) {
          s = start[0];
          e = start[1];
        } else if (typeof start === 'string') {
          parts = start.split('/');
          s = parts[0];
          e = parts[1];
        }
      }
      this.start = (s === null) ? moment(-8640000000000000) : moment(s);
      this.end = (e === null) ? moment(8640000000000000) : moment(e);
    }
    DateRange.prototype.constructor = DateRange;
    DateRange.prototype.clone = function() {
      return moment().range(this.start, this.end);
    };
    DateRange.prototype.contains = function(other, exclusive) {
      var start = this.start;
      var end = this.end;
      if (other instanceof DateRange) {
        return start <= other.start && (end > other.end || (end.isSame(other.end) && !exclusive));
      } else {
        return start <= other && (end > other || (end.isSame(other) && !exclusive));
      }
    };
    DateRange.prototype.overlaps = function(range) {
      return this.intersect(range) !== null;
    };
    DateRange.prototype.intersect = function(other) {
      var start = this.start;
      var end = this.end;
      if ((start <= other.start) && (other.start < end) && (end < other.end)) {
        return new DateRange(other.start, end);
      } else if ((other.start < start) && (start < other.end) && (other.end <= end)) {
        return new DateRange(start, other.end);
      } else if ((other.start < start) && (start <= end) && (end < other.end)) {
        return this;
      } else if ((start <= other.start) && (other.start <= other.end) && (other.end <= end)) {
        return other;
      }
      return null;
    };
    DateRange.prototype.add = function(other) {
      if (this.overlaps(other)) {
        return new DateRange(moment.min(this.start, other.start), moment.max(this.end, other.end));
      }
      return null;
    };
    DateRange.prototype.subtract = function(other) {
      var start = this.start;
      var end = this.end;
      if (this.intersect(other) === null) {
        return [this];
      } else if ((other.start <= start) && (start < end) && (end <= other.end)) {
        return [];
      } else if ((other.start <= start) && (start < other.end) && (other.end < end)) {
        return [new DateRange(other.end, end)];
      } else if ((start < other.start) && (other.start < end) && (end <= other.end)) {
        return [new DateRange(start, other.start)];
      } else if ((start < other.start) && (other.start < other.end) && (other.end < end)) {
        return [new DateRange(start, other.start), new DateRange(other.end, end)];
      } else if ((start < other.start) && (other.start < end) && (other.end < end)) {
        return [new DateRange(start, other.start), new DateRange(other.start, end)];
      }
    };
    DateRange.prototype.toArray = function(by, exclusive) {
      var acc = [];
      this.by(by, function(unit) {
        acc.push(unit);
      }, exclusive);
      return acc;
    };
    DateRange.prototype.by = function(range, hollaback, exclusive) {
      if (typeof range === 'string') {
        _byString.call(this, range, hollaback, exclusive);
      } else {
        _byRange.call(this, range, hollaback, exclusive);
      }
      return this;
    };
    function _byString(interval, hollaback, exclusive) {
      var current = moment(this.start);
      while (this.contains(current, exclusive)) {
        hollaback.call(this, current.clone());
        current.add(1, interval);
      }
    }
    function _byRange(interval, hollaback, exclusive) {
      var div = this / interval;
      var l = Math.floor(div);
      if (l === Infinity) {
        return;
      }
      if (l === div && exclusive) {
        l--;
      }
      for (var i = 0; i <= l; i++) {
        hollaback.call(this, moment(this.start.valueOf() + interval.valueOf() * i));
      }
    }
    DateRange.prototype.toString = function() {
      return this.start.format() + '/' + this.end.format();
    };
    DateRange.prototype.valueOf = function() {
      return this.end - this.start;
    };
    DateRange.prototype.center = function() {
      var center = this.start + this.diff() / 2;
      return moment(center);
    };
    DateRange.prototype.toDate = function() {
      return [this.start.toDate(), this.end.toDate()];
    };
    DateRange.prototype.isSame = function(other) {
      return this.start.isSame(other.start) && this.end.isSame(other.end);
    };
    DateRange.prototype.diff = function(unit) {
      return this.end.diff(this.start, unit);
    };
    moment.range = function(start, end) {
      if (start in INTERVALS) {
        return new DateRange(moment(this).startOf(start), moment(this).endOf(start));
      } else {
        return new DateRange(start, end);
      }
    };
    moment.range.constructor = DateRange;
    moment.fn.range = moment.range;
    moment.fn.within = function(range) {
      return range.contains(this._d);
    };
    return DateRange;
  }));
  return module.exports;
});

$__System.registerDynamic("14", ["c", "13", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  exports.default = Cell;
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  $__require('13');
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  function Cell(_ref) {
    var value = _ref.value;
    var classes = _ref.classes;
    var _classes = classes + ' cell';
    return _react2.default.createElement('div', {className: _classes}, value);
  }
  return module.exports;
});

$__System.registerDynamic("15", ["c", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  exports.default = ViewHeader;
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  function ViewHeader(_ref) {
    var prev = _ref.prev;
    var next = _ref.next;
    var titleAction = _ref.titleAction;
    var data = _ref.data;
    return _react2.default.createElement("div", {className: "navigation-wrapper"}, _react2.default.createElement("span", {
      className: "icon",
      onClick: prev
    }, "<"), _react2.default.createElement("span", {
      className: "navigation-title",
      onClick: titleAction
    }, data), _react2.default.createElement("span", {
      className: "icon",
      onClick: next
    }, ">"));
  }
  return module.exports;
});

$__System.registerDynamic("6f", ["17", "18", "19", "1a", "1b", "c", "1c", "12", "13", "14", "15", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  var _getPrototypeOf = $__require('17');
  var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);
  var _classCallCheck2 = $__require('18');
  var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);
  var _createClass2 = $__require('19');
  var _createClass3 = _interopRequireDefault(_createClass2);
  var _possibleConstructorReturn2 = $__require('1a');
  var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);
  var _inherits2 = $__require('1b');
  var _inherits3 = _interopRequireDefault(_inherits2);
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  var _classnames = $__require('1c');
  var _classnames2 = _interopRequireDefault(_classnames);
  var _moment = $__require('12');
  var _moment2 = _interopRequireDefault(_moment);
  $__require('13');
  var _cell = $__require('14');
  var _cell2 = _interopRequireDefault(_cell);
  var _viewHeader = $__require('15');
  var _viewHeader2 = _interopRequireDefault(_viewHeader);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var YearsView = function(_React$Component) {
    (0, _inherits3.default)(YearsView, _React$Component);
    function YearsView() {
      var _Object$getPrototypeO;
      var _temp,
          _this,
          _ret;
      (0, _classCallCheck3.default)(this, YearsView);
      for (var _len = arguments.length,
          args = Array(_len),
          _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return (_ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)(this, (_Object$getPrototypeO = (0, _getPrototypeOf2.default)(YearsView)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.state = {years: []}, _this.cellClick = function(e) {
        var year = parseInt(e.target.innerHTML, 10);
        var date = _this.props.date.clone().year(year);
        if (_this.checkIfYearDisabled(date))
          return;
        _this.props.prevView(date);
      }, _this.next = function() {
        var nextDate = _this.props.date.clone().add(10, 'years');
        if (_this.props.maxDate && nextDate.isAfter(_this.props.maxDate, 'day')) {
          nextDate = _this.props.maxDate;
        }
        _this.props.setDate(nextDate);
      }, _this.prev = function() {
        var prevDate = _this.props.date.clone().subtract(10, 'years');
        if (_this.props.minDate && prevDate.isBefore(_this.props.minDate, 'day')) {
          prevDate = _this.props.minDate;
        }
        _this.props.setDate(prevDate);
      }, _this.rangeCheck = function(currYear) {
        var years = _this.state.years;
        if (years.length == 0) {
          return false;
        }
        return years[0].label <= currYear && years[years.length - 1].label >= currYear;
      }, _temp), (0, _possibleConstructorReturn3.default)(_this, _ret));
    }
    (0, _createClass3.default)(YearsView, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        this.getYears();
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps() {
        this.getYears();
      }
    }, {
      key: 'checkIfYearDisabled',
      value: function checkIfYearDisabled(year) {
        return year.clone().endOf('year').isBefore(this.props.minDate, 'day') || year.clone().startOf('year').isAfter(this.props.maxDate, 'day');
      }
    }, {
      key: 'getYears',
      value: function getYears() {
        var _this2 = this;
        var now = this.props.date;
        var start = now.clone().subtract(5, 'year');
        var end = now.clone().add(6, 'year');
        var currYear = now.year();
        var items = [];
        var inRange = this.rangeCheck(currYear);
        var years = this.state.years;
        if (years.length > 0 && inRange) {
          return years;
        }
        (0, _moment2.default)().range(start, end).by('years', function(year) {
          items.push({
            label: year.format('YYYY'),
            disabled: _this2.checkIfYearDisabled(year),
            curr: currYear === year.year()
          });
        });
        this.setState({years: items});
        return items;
      }
    }, {
      key: 'render',
      value: function render() {
        var years = this.state.years;
        var currYear = this.props.date.year();
        var _class = void 0;
        var yearsCells = years.map(function(item, i) {
          _class = (0, _classnames2.default)({
            year: true,
            disabled: item.disabled,
            current: item.label == currYear
          });
          return _react2.default.createElement(_cell2.default, {
            value: item.label,
            classes: _class,
            key: i
          });
        });
        var currentDate = [years[0].label, years[years.length - 1].label].join('-');
        return _react2.default.createElement('div', {className: 'years-view'}, _react2.default.createElement(_viewHeader2.default, {
          data: currentDate,
          next: this.next,
          prev: this.prev
        }), _react2.default.createElement('div', {
          className: 'years',
          onClick: this.cellClick
        }, yearsCells));
      }
    }]);
    return YearsView;
  }(_react2.default.Component);
  YearsView.propTypes = {
    date: _react2.default.PropTypes.object,
    minDate: _react2.default.PropTypes.any,
    maxDate: _react2.default.PropTypes.any,
    changeView: _react2.default.PropTypes.func
  };
  exports.default = YearsView;
  return module.exports;
});

$__System.registerDynamic("70", ["16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  var _keyDownViewHelper = [{
    prev: false,
    next: true,
    exit: true,
    unit: 'day',
    upDown: 7
  }, {
    prev: true,
    next: true,
    unit: 'months',
    upDown: 3
  }, {
    prev: true,
    next: false,
    unit: 'years',
    upDown: 3
  }];
  var KEYS = {
    backspace: 8,
    enter: 13,
    esc: 27,
    left: 37,
    up: 38,
    right: 39,
    down: 40
  };
  exports.default = {
    toDate: function toDate(date) {
      return date instanceof Date ? date : new Date(date);
    },
    keyDownActions: function keyDownActions(code) {
      var _viewHelper = _keyDownViewHelper[this.state.currentView];
      var unit = _viewHelper.unit;
      switch (code) {
        case KEYS.left:
          this.setDate(this.state.date.subtract(1, unit));
          break;
        case KEYS.right:
          this.setDate(this.state.date.add(1, unit));
          break;
        case KEYS.up:
          this.setDate(this.state.date.subtract(_viewHelper.upDown, unit));
          break;
        case KEYS.down:
          this.setDate(this.state.date.add(_viewHelper.upDown, unit));
          break;
        case KEYS.enter:
          if (_viewHelper.prev) {
            this.prevView(this.state.date);
          }
          if (_viewHelper.exit) {
            this.setState({isVisible: false});
          }
          break;
        case KEYS.esc:
          this.setState({isVisible: false});
          break;
        default:
          break;
      }
    }
  };
  return module.exports;
});

$__System.registerDynamic("71", ["17", "18", "19", "1a", "1b", "c", "1c", "12", "13", "11", "1d", "6f", "70", "16"], true, function($__require, exports, module) {
  "use strict";
  var process = $__require("16");
  var define,
      global = this,
      GLOBAL = this;
  Object.defineProperty(exports, "__esModule", {value: true});
  var _getPrototypeOf = $__require('17');
  var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);
  var _classCallCheck2 = $__require('18');
  var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);
  var _createClass2 = $__require('19');
  var _createClass3 = _interopRequireDefault(_createClass2);
  var _possibleConstructorReturn2 = $__require('1a');
  var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);
  var _inherits2 = $__require('1b');
  var _inherits3 = _interopRequireDefault(_inherits2);
  var _react = $__require('c');
  var _react2 = _interopRequireDefault(_react);
  var _classnames = $__require('1c');
  var _classnames2 = _interopRequireDefault(_classnames);
  var _moment = $__require('12');
  var _moment2 = _interopRequireDefault(_moment);
  $__require('13');
  var _dayView = $__require('11');
  var _dayView2 = _interopRequireDefault(_dayView);
  var _monthView = $__require('1d');
  var _monthView2 = _interopRequireDefault(_monthView);
  var _yearView = $__require('6f');
  var _yearView2 = _interopRequireDefault(_yearView);
  var _util = $__require('70');
  var _util2 = _interopRequireDefault(_util);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var Calendar = function(_React$Component) {
    (0, _inherits3.default)(Calendar, _React$Component);
    function Calendar(props, context) {
      (0, _classCallCheck3.default)(this, Calendar);
      var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Calendar).call(this, props, context));
      _initialiseProps.call(_this);
      var date = props.date ? (0, _moment2.default)(_util2.default.toDate(props.date)) : null;
      var minDate = props.minDate ? (0, _moment2.default)(_util2.default.toDate(props.minDate)) : null;
      var maxDate = props.maxDate ? (0, _moment2.default)(_util2.default.toDate(props.maxDate)) : null;
      var format = props.format || 'MM-DD-YYYY';
      var minView = parseInt(props.minView, 10) || 0;
      var computableFormat = props.computableFormat || 'MM-DD-YYYY';
      var strictDateParsing = props.strictDateParsing || false;
      var parsingFormat = props.parsingFormat || format;
      _this.state = {
        date: date,
        minDate: minDate,
        maxDate: maxDate,
        format: format,
        computableFormat: computableFormat,
        inputValue: date ? date.format(format) : undefined,
        views: ['days', 'months', 'years'],
        minView: minView,
        currentView: minView || 0,
        isVisible: false,
        strictDateParsing: strictDateParsing,
        parsingFormat: parsingFormat
      };
      return _this;
    }
    (0, _createClass3.default)(Calendar, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        document.addEventListener('click', this.documentClick);
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(nextProps) {
        var newState = {
          date: nextProps.date ? (0, _moment2.default)(_util2.default.toDate(nextProps.date)) : this.state.date,
          inputValue: nextProps.date ? (0, _moment2.default)(_util2.default.toDate(nextProps.date)).format(this.state.format) : null
        };
        if (nextProps.disabled === true) {
          newState.isVisible = false;
        }
        this.setState(newState);
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        document.removeEventListener('click', this.documentClick);
      }
    }, {
      key: 'checkIfDateDisabled',
      value: function checkIfDateDisabled(date) {
        return date && this.state.minDate && date.isBefore(this.state.minDate, 'day') || date && this.state.maxDate && date.isAfter(this.state.maxDate, 'day');
      }
    }, {
      key: 'setVisibility',
      value: function setVisibility(val) {
        var value = val !== undefined ? val : !this.state.isVisible;
        var eventMethod = value ? 'addEventListener' : 'removeEventListener';
        document[eventMethod]('keydown', this.keyDown);
        if (this.state.isVisible !== value && !this.props.disabled) {
          this.setState({isVisible: value});
        }
      }
    }, {
      key: 'render',
      value: function render() {
        var calendarDate = this.state.date || (0, _moment2.default)();
        var view = void 0;
        switch (this.state.currentView) {
          case 0:
            view = _react2.default.createElement(_dayView2.default, {
              date: calendarDate,
              nextView: this.nextView,
              maxDate: this.state.maxDate,
              minDate: this.state.minDate,
              setDate: this.setDate
            });
            break;
          case 1:
            view = _react2.default.createElement(_monthView2.default, {
              date: calendarDate,
              nextView: this.nextView,
              maxDate: this.state.maxDate,
              minDate: this.state.minDate,
              prevView: this.prevView,
              setDate: this.setDate
            });
            break;
          case 2:
            view = _react2.default.createElement(_yearView2.default, {
              date: calendarDate,
              maxDate: this.state.maxDate,
              minDate: this.state.minDate,
              prevView: this.prevView,
              setDate: this.setDate
            });
            break;
          default:
            view = _react2.default.createElement(_dayView2.default, {
              date: calendarDate,
              nextView: this.nextView,
              maxDate: this.state.maxDate,
              minDate: this.state.minDate,
              setDate: this.setDate
            });
        }
        var todayText = this.props.todayText || (_moment2.default.locale() === 'de' ? 'Heute' : 'Today');
        var calendarClass = (0, _classnames2.default)({
          'input-calendar-wrapper': true,
          'icon-hidden': this.props.hideIcon
        });
        var calendar = !this.state.isVisible || this.props.disabled ? '' : _react2.default.createElement('div', {
          className: calendarClass,
          onClick: this.calendarClick
        }, view, _react2.default.createElement('span', {
          className: 'today-btn' + (this.checkIfDateDisabled((0, _moment2.default)().startOf('day')) ? ' disabled' : ''),
          onClick: this.todayClick
        }, todayText));
        var readOnly = false;
        if (this.props.hideTouchKeyboard) {
          try {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
              readOnly = true;
            }
          } catch (e) {
            console.warn(e);
          }
        }
        var calendarIcon = void 0;
        if (this.props.customIcon == null) {
          calendarIcon = this.props.hideIcon || this.props.disabled ? '' : _react2.default.createElement('span', {
            className: 'icon-wrapper calendar-icon',
            onClick: this.toggleClick
          }, _react2.default.createElement('svg', {
            width: '16',
            height: '16',
            viewBox: '0 0 16 16'
          }, _react2.default.createElement('path', {d: 'M5 6h2v2h-2zM8 6h2v2h-2zM11 6h2v2h-2zM2 12h2v2h-2zM5 12h2v2h-2zM8 12h2v2h-2zM5 9h2v2h-2zM8 9h2v2h-2zM11 9h2v2h-2zM2 9h2v2h-2zM13 0v1h-2v-1h-7v1h-2v-1h-2v16h15v-16h-2zM14 15h-13v-11h13v11z'})));
        } else {
          calendarIcon = _react2.default.createElement('span', {
            className: (0, _classnames2.default)('icon-wrapper', 'calendar-icon', this.props.customIcon),
            onClick: this.toggleClick
          });
        }
        var inputClass = this.props.inputFieldClass || 'input-calendar-field';
        return _react2.default.createElement('div', {className: 'input-calendar'}, _react2.default.createElement('input', {
          name: this.props.inputName,
          className: inputClass,
          id: this.props.inputFieldId,
          onBlur: this.inputBlur,
          onChange: this.changeDate,
          onFocus: this.inputFocus,
          placeholder: this.props.placeholder,
          readOnly: readOnly,
          disabled: this.props.disabled,
          type: 'text',
          value: this.state.inputValue
        }), calendarIcon, calendar);
      }
    }]);
    return Calendar;
  }(_react2.default.Component);
  var _initialiseProps = function _initialiseProps() {
    var _this2 = this;
    this.changeDate = function(e) {
      _this2.setState({inputValue: e.target.value});
    };
    this.documentClick = function(e) {
      e.preventDefault();
      if (!_this2.state.isCalendar) {
        _this2.setVisibility(false);
      }
      _this2.setState({isCalendar: false});
    };
    this.inputBlur = function(e) {
      var newDate = null;
      var computableDate = null;
      var date = _this2.state.inputValue;
      var format = _this2.state.format;
      var parsingFormat = _this2.state.parsingFormat;
      if (date) {
        newDate = (0, _moment2.default)(date, parsingFormat, true);
        if (!newDate.isValid() && !_this2.props.strictDateParsing) {
          var d = new Date(date);
          if (isNaN(d.getTime())) {
            d = new Date();
          }
          newDate = (0, _moment2.default)(d);
        }
        computableDate = newDate.format(_this2.state.computableFormat);
      }
      _this2.setState({
        date: newDate,
        inputValue: newDate ? newDate.format(format) : null
      });
      if (_this2.props.onChange) {
        _this2.props.onChange(computableDate);
      }
      if (_this2.props.onBlur) {
        _this2.props.onBlur(e, computableDate);
      }
    };
    this.inputFocus = function(e) {
      if (_this2.props.openOnInputFocus) {
        _this2.toggleClick();
      }
      if (_this2.props.onFocus) {
        _this2.props.onFocus(e);
      }
    };
    this.keyDown = function(e) {
      _util2.default.keyDownActions.call(_this2, e.keyCode);
    };
    this.nextView = function() {
      if (_this2.checkIfDateDisabled(_this2.state.date))
        return;
      _this2.setState({currentView: ++_this2.state.currentView});
    };
    this.prevView = function(date) {
      var newDate = date;
      if (_this2.state.minDate && date.isBefore(_this2.state.minDate, 'day')) {
        newDate = _this2.state.minDate.clone();
      }
      if (_this2.state.maxDate && date.isAfter(_this2.state.maxDate, 'day')) {
        newDate = _this2.state.maxDate.clone();
      }
      if (_this2.state.currentView === _this2.state.minView) {
        _this2.setState({
          date: newDate,
          inputValue: date.format(_this2.state.format),
          isVisible: false
        });
        if (_this2.props.onChange) {
          _this2.props.onChange(date.format(_this2.state.computableFormat));
        }
      } else {
        _this2.setState({
          date: date,
          currentView: --_this2.state.currentView
        });
      }
    };
    this.setDate = function(date) {
      var isDayView = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];
      if (_this2.checkIfDateDisabled(date))
        return;
      _this2.setState({
        date: date,
        inputValue: date.format(_this2.state.format),
        isVisible: _this2.props.closeOnSelect && isDayView ? !_this2.state.isVisible : _this2.state.isVisible
      });
      if (_this2.props.onChange) {
        _this2.props.onChange(date.format(_this2.state.computableFormat));
      }
    };
    this.calendarClick = function() {
      _this2.setState({isCalendar: true});
    };
    this.todayClick = function() {
      var today = (0, _moment2.default)().startOf('day');
      if (_this2.checkIfDateDisabled(today))
        return;
      _this2.setState({
        date: today,
        inputValue: today.format(_this2.state.format),
        currentView: _this2.state.minView
      });
      if (_this2.props.onChange) {
        _this2.props.onChange(today.format(_this2.state.computableFormat));
      }
    };
    this.toggleClick = function() {
      _this2.setState({isCalendar: true});
      _this2.setVisibility();
    };
  };
  Calendar.propTypes = {
    closeOnSelect: _react2.default.PropTypes.bool,
    computableFormat: _react2.default.PropTypes.string,
    strictDateParsing: _react2.default.PropTypes.bool,
    parsingFormat: _react2.default.PropTypes.oneOfType([_react2.default.PropTypes.string, _react2.default.PropTypes.arrayOf(_react2.default.PropTypes.string)]),
    date: _react2.default.PropTypes.any,
    minDate: _react2.default.PropTypes.any,
    maxDate: _react2.default.PropTypes.any,
    format: _react2.default.PropTypes.string,
    inputName: _react2.default.PropTypes.string,
    inputFieldId: _react2.default.PropTypes.string,
    inputFieldClass: _react2.default.PropTypes.string,
    minView: _react2.default.PropTypes.number,
    onBlur: _react2.default.PropTypes.func,
    onChange: _react2.default.PropTypes.func,
    onFocus: _react2.default.PropTypes.func,
    openOnInputFocus: _react2.default.PropTypes.bool,
    placeholder: _react2.default.PropTypes.string,
    hideTouchKeyboard: _react2.default.PropTypes.bool,
    hideIcon: _react2.default.PropTypes.bool,
    customIcon: _react2.default.PropTypes.string,
    todayText: _react2.default.PropTypes.string,
    disabled: _react2.default.PropTypes.bool
  };
  exports.default = Calendar;
  return module.exports;
});

$__System.register('72', ['c', '71'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React, react_input_calendar_1;
    function CurrencyValuationHeaderCalendar(_a) {
        var fromCurrency = _a.fromCurrency,
            toCurrency = _a.toCurrency,
            selectedStartDate = _a.selectedStartDate,
            selectedEndDate = _a.selectedEndDate,
            onCalendarStartDateChange = _a.onCalendarStartDateChange,
            onCalendaEndDateChange = _a.onCalendaEndDateChange;
        return React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, fromCurrency, "/", toCurrency), React.createElement("div", { className: "o-grid__cell o-grid__cell--width-66" }, React.createElement("div", { className: "c-link--right" }, "Custom Change Period"))), React.createElement("div", { className: "o-grid" }, React.createElement("div", { className: "o-grid__cell" }, React.createElement(react_input_calendar_1.default, { format: "YYYY-MM-DD", date: selectedStartDate, onChange: onCalendarStartDateChange, openOnInputFocus: true, inputFieldClass: "c-field" })), React.createElement("div", { className: "o-grid__cell" }, React.createElement(react_input_calendar_1.default, { format: "YYYY-MM-DD", date: selectedEndDate, onChange: onCalendaEndDateChange, openOnInputFocus: true, inputFieldClass: "c-field" })))));
    }
    exports_1("CurrencyValuationHeaderCalendar", CurrencyValuationHeaderCalendar);
    return {
        setters: [function (React_1) {
            React = React_1;
        }, function (react_input_calendar_1_1) {
            react_input_calendar_1 = react_input_calendar_1_1;
        }],
        execute: function () {}
    };
});
$__System.register('73', ['c', '10', '72'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React, currency_valuation_header_select_1, currency_valuation_header_calendar_1;
    var DEFAULT_DATE;
    function CurrencyValuationChange(_a) {
        var changeValue = _a.changeValue,
            changePercent = _a.changePercent,
            _b = _a.type,
            type = _b === void 0 ? "Select" : _b,
            fromCurrency = _a.fromCurrency,
            toCurrency = _a.toCurrency,
            _c = _a.onChange,
            onChange = _c === void 0 ? null : _c,
            _d = _a.onCalendarStartDateChange,
            onCalendarStartDateChange = _d === void 0 ? null : _d,
            _e = _a.onCalendaEndDateChange,
            onCalendaEndDateChange = _e === void 0 ? null : _e,
            _f = _a.selectedPeriod,
            selectedPeriod = _f === void 0 ? "60" : _f,
            _g = _a.selectedStartDate,
            selectedStartDate = _g === void 0 ? DEFAULT_DATE : _g,
            _h = _a.selectedEndDate,
            selectedEndDate = _h === void 0 ? DEFAULT_DATE : _h;
        var positive = parseFloat(changeValue) >= 0;
        var signClass = positive ? "c-link--success" : "c-link--error";
        var signedValue = positive ? '+' + changeValue : changeValue;
        var positivePercent = parseFloat(changePercent) >= 0;
        var signClassPercent = positivePercent ? "c-link--success" : "c-link--error";
        var signedValuePercent = positivePercent ? '+' + changePercent : changePercent;
        return React.createElement("div", { className: "c-card--high" }, React.createElement("div", { className: "c-card__item u-letter-box--medium" }, type === "Select" ? React.createElement(currency_valuation_header_select_1.CurrencyValuationHeaderSelect, { fromCurrency: fromCurrency, toCurrency: toCurrency, selectedPeriod: selectedPeriod, onChange: onChange }) : React.createElement(currency_valuation_header_calendar_1.CurrencyValuationHeaderCalendar, { fromCurrency: fromCurrency, toCurrency: toCurrency, selectedStartDate: selectedStartDate, selectedEndDate: selectedEndDate, onCalendarStartDateChange: onCalendarStartDateChange, onCalendaEndDateChange: onCalendaEndDateChange })), React.createElement("div", { className: "c-card__item u-pillar-box--super" }, "Change:", React.createElement("span", { className: "c-link c-link--right " + signClass }, signedValue)), React.createElement("div", { className: "c-card__item u-pillar-box--super" }, "Change%:", React.createElement("span", { className: "c-link c-link--right " + signClassPercent }, signedValuePercent, "%")));
    }
    exports_1("CurrencyValuationChange", CurrencyValuationChange);
    return {
        setters: [function (React_1) {
            React = React_1;
        }, function (currency_valuation_header_select_1_1) {
            currency_valuation_header_select_1 = currency_valuation_header_select_1_1;
        }, function (currency_valuation_header_calendar_1_1) {
            currency_valuation_header_calendar_1 = currency_valuation_header_calendar_1_1;
        }],
        execute: function () {
            DEFAULT_DATE = new Date().toISOString();
        }
    };
});
$__System.register('74', ['2', 'c', 'a', 'e', 'f', '73'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var __extends = this && this.__extends || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator.throw(value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : new P(function (resolve) {
                    resolve(result.value);
                }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments)).next());
        });
    };
    var React, CurrencyRatesService, currency_converter_1, currency_converter_header_1, currency_valuation_change_1;
    var LOADING_PLACEHOLDER, Main;
    return {
        setters: [function (_1) {}, function (React_1) {
            React = React_1;
        }, function (CurrencyRatesService_1) {
            CurrencyRatesService = CurrencyRatesService_1;
        }, function (currency_converter_1_1) {
            currency_converter_1 = currency_converter_1_1;
        }, function (currency_converter_header_1_1) {
            currency_converter_header_1 = currency_converter_header_1_1;
        }, function (currency_valuation_change_1_1) {
            currency_valuation_change_1 = currency_valuation_change_1_1;
        }],
        execute: function () {
            LOADING_PLACEHOLDER = "loading...";
            // App pure component
            Main = function (_super) {
                __extends(Main, _super);
                function Main() {
                    var _this = this;
                    _super.apply(this, arguments);
                    this.state = {
                        selectedPeriod: this.props.storage.selectedPeriod,
                        selectedStartDate: this.props.storage.selectedStartDate,
                        selectedEndDate: this.props.storage.selectedEndDate,
                        fromCurrency: this.props.storage.fromCurrency,
                        toCurrency: this.props.storage.toCurrency,
                        predefinedChangeValue: LOADING_PLACEHOLDER,
                        predefinedChangePercent: LOADING_PLACEHOLDER,
                        customChangeValue: LOADING_PLACEHOLDER,
                        customChangePercent: LOADING_PLACEHOLDER
                    };
                    this.handlePredefinedPeriodChange = function (event) {
                        var newSelectedPeriod = event.target.value;
                        _this.fetchPredefinedRates(newSelectedPeriod);
                        _this.setState({ selectedPeriod: newSelectedPeriod });
                    };
                    this.handleCalendarStartDateChange = function (newStartDate) {
                        var dateObject = new Date(newStartDate);
                        _this.fetchCustomRates(dateObject, _this.state.selectedEndDate);
                        _this.setState({ selectedStartDate: newStartDate });
                    };
                    this.handleCalendarEndDateChange = function (newEndDate) {
                        var dateObject = new Date(newEndDate);
                        _this.fetchCustomRates(_this.state.selectedStartDate, dateObject);
                        _this.setState({ selectedEndDate: newEndDate });
                    };
                    this.handleFromCurrencyChange = function (newCurrency) {
                        _this.fetchPredefinedRates();
                        _this.fetchCustomRates(_this.state.selectedStartDate, _this.state.selectedEndDate);
                        _this.setState({ fromCurrency: newCurrency });
                    };
                    this.handleToCurrencyChange = function (newCurrency) {
                        _this.fetchPredefinedRates();
                        _this.fetchCustomRates(_this.state.selectedStartDate, _this.state.selectedEndDate);
                        _this.setState({ toCurrency: newCurrency });
                    };
                }
                Main.prototype.componentDidUpdate = function (prevProps, prevState) {
                    this.props.storage.save(this.state);
                };
                Main.prototype.componentWillMount = function () {
                    this.fetchPredefinedRates();
                    this.fetchCustomRates(this.state.selectedStartDate, this.state.selectedEndDate);
                };
                Main.prototype.fetchPredefinedRates = function (newPeriod) {
                    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function callee$5$0() {
                      var days, startDate, baseCurrency, _a, olderRates, latestRates, targetCurrency, oldestRateValue, latestRateValue, changeCalculationResults;

                      return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                        while (1) switch (context$6$0.prev = context$6$0.next) {
                        case 0:
                          // showing loading indicator
                          // TODO: add opacity transition to avoid flickering
                          this.setState({
                              predefinedChangeValue: LOADING_PLACEHOLDER,
                              predefinedChangePercent: LOADING_PLACEHOLDER
                          });
                          days = newPeriod ? newPeriod : parseInt(this.state.selectedPeriod, 10);
                          startDate = new Date();
                          startDate.setDate(startDate.getDate() - days);
                          baseCurrency = this.state.fromCurrency;
                          context$6$0.t0 = Promise;
                          context$6$0.next = 8;
                          return CurrencyRatesService.getByDate(startDate, baseCurrency);
                        case 8:
                          context$6$0.t1 = context$6$0.sent;
                          context$6$0.next = 11;
                          return CurrencyRatesService.getByDate(new Date(), baseCurrency);
                        case 11:
                          context$6$0.t2 = context$6$0.sent;
                          context$6$0.t3 = [context$6$0.t1, context$6$0.t2];
                          context$6$0.next = 15;
                          return context$6$0.t0.all.call(context$6$0.t0, context$6$0.t3);
                        case 15:
                          _a = context$6$0.sent;
                          olderRates = _a[0];
                          latestRates = _a[1];
                          targetCurrency = this.state.toCurrency;
                          oldestRateValue = olderRates.rates[targetCurrency];
                          latestRateValue = latestRates.rates[targetCurrency];
                          context$6$0.next = 23;
                          return this.calculateValueAndPercentChange(oldestRateValue, latestRateValue);
                        case 23:
                          changeCalculationResults = context$6$0.sent;
                          // updating results
                          this.setState({
                              predefinedChangeValue: changeCalculationResults.changeValue.toFixed(4),
                              predefinedChangePercent: changeCalculationResults.changePercent.toFixed(3)
                          });
                        case 25:
                        case "end":
                          return context$6$0.stop();
                        }
                      }, callee$5$0, this);
                    }));
                };
                Main.prototype.fetchCustomRates = function (selectedStartDate, selectedEndDate) {
                    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function callee$5$0() {
                      var startDate, endDate, baseCurrency, _a, olderRates, latestRates, targetCurrency, oldestRateValue, latestRateValue, calculationResults;

                      return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                        while (1) switch (context$6$0.prev = context$6$0.next) {
                        case 0:
                          // showing loading indicator
                          this.setState({
                              customChangeValue: LOADING_PLACEHOLDER,
                              customChangePercent: LOADING_PLACEHOLDER
                          });
                          startDate = selectedStartDate ? new Date(selectedStartDate) : new Date();
                          endDate = selectedEndDate ? new Date(selectedEndDate) : new Date();
                          baseCurrency = this.state.fromCurrency;
                          context$6$0.t0 = Promise;
                          context$6$0.next = 7;
                          return CurrencyRatesService.getByDate(startDate, baseCurrency);
                        case 7:
                          context$6$0.t1 = context$6$0.sent;
                          context$6$0.next = 10;
                          return CurrencyRatesService.getByDate(endDate, baseCurrency);
                        case 10:
                          context$6$0.t2 = context$6$0.sent;
                          context$6$0.t3 = [context$6$0.t1, context$6$0.t2];
                          context$6$0.next = 14;
                          return context$6$0.t0.all.call(context$6$0.t0, context$6$0.t3);
                        case 14:
                          _a = context$6$0.sent;
                          olderRates = _a[0];
                          latestRates = _a[1];
                          targetCurrency = this.state.toCurrency;
                          oldestRateValue = olderRates.rates[targetCurrency];
                          latestRateValue = latestRates.rates[targetCurrency];
                          context$6$0.next = 22;
                          return this.calculateValueAndPercentChange(oldestRateValue, latestRateValue);
                        case 22:
                          calculationResults = context$6$0.sent;
                          // updating results
                          this.setState({
                              customChangeValue: calculationResults.changeValue.toFixed(4),
                              customChangePercent: calculationResults.changePercent.toFixed(3)
                          });
                        case 24:
                        case "end":
                          return context$6$0.stop();
                        }
                      }, callee$5$0, this);
                    }));
                };
                Main.prototype.calculateValueAndPercentChange = function (oldestRate, latestRate) {
                    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function callee$5$0() {
                      var change, changePercent;

                      return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                        while (1) switch (context$6$0.prev = context$6$0.next) {
                        case 0:
                          change = latestRate - oldestRate;
                          changePercent = change * 100 / latestRate;

                          return context$6$0.abrupt("return", {
                              changeValue: change,
                              changePercent: changePercent
                          });
                        case 3:
                        case "end":
                          return context$6$0.stop();
                        }
                      }, callee$5$0, this);
                    }));
                };
                Main.prototype.render = function () {
                    return React.createElement("div", { className: "o-container o-container--medium c-text" }, React.createElement(currency_converter_header_1.CurrencyConverterHeader, null), React.createElement(currency_converter_1.CurrencyConverter, { storage: this.props.storage, fromCurrency: this.state.fromCurrency, toCurrency: this.state.toCurrency, onFromCurrencyChange: this.handleFromCurrencyChange, onToCurrencyChange: this.handleToCurrencyChange }), React.createElement("div", { className: "o-grid o-grid--small-full o-grid--medium-full" }, React.createElement("div", { className: "o-grid__cell u-letter-box--small" }, React.createElement(currency_valuation_change_1.CurrencyValuationChange, { changeValue: this.state.predefinedChangeValue, changePercent: this.state.predefinedChangePercent, onChange: this.handlePredefinedPeriodChange, selectedPeriod: this.state.selectedPeriod, fromCurrency: this.state.fromCurrency, toCurrency: this.state.toCurrency })), React.createElement("div", { className: "o-grid__cell u-letter-box--small" }, React.createElement(currency_valuation_change_1.CurrencyValuationChange, { changeValue: this.state.customChangeValue, changePercent: this.state.customChangePercent, type: "Calendar", onCalendarStartDateChange: this.handleCalendarStartDateChange, onCalendaEndDateChange: this.handleCalendarEndDateChange, fromCurrency: this.state.fromCurrency, toCurrency: this.state.toCurrency, selectedStartDate: this.state.selectedStartDate, selectedEndDate: this.state.selectedEndDate }))));
                };
                return Main;
            }(React.Component);
            exports_1("Main", Main);
        }
    };
});
$__System.register("75", [], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var STORAGE_PREFIX, INITIAL_DATE, AppStore;
    return {
        setters: [],
        execute: function () {
            // app data models
            STORAGE_PREFIX = 'cc_';
            INITIAL_DATE = new Date().toISOString();
            AppStore = function () {
                function AppStore() {
                    // initial state
                    this.currencies = "{}";
                    this.fromCurrency = "SEK";
                    this.toCurrency = "EUR";
                    this.fromValue = "100.00";
                    this.selectedPeriod = "60";
                    this.selectedStartDate = INITIAL_DATE;
                    this.selectedEndDate = INITIAL_DATE;
                    this.load();
                }
                AppStore.prototype.save = function (stateObject) {
                    var _this = this;
                    // remember to stringify the objects that you want to store
                    Object.keys(stateObject).forEach(function (key) {
                        var storageKey = STORAGE_PREFIX + key;
                        var stateItem = stateObject[key];
                        if (stateItem) {
                            _this[key] = stateItem;
                            sessionStorage.setItem(storageKey, stateItem);
                        }
                    });
                };
                AppStore.prototype.load = function () {
                    var _this = this;
                    Object.keys(this).forEach(function (key) {
                        var storageKey = STORAGE_PREFIX + key;
                        var storageItem = sessionStorage.getItem(storageKey);
                        if (storageItem) {
                            _this[key] = storageItem;
                        }
                    });
                };
                return AppStore;
            }();
            exports_1("AppStore", AppStore);
        }
    };
});
$__System.register('1', ['c', '76', '74', '75'], function (exports_1, context_1) {
    "use strict";

    var __moduleName = context_1 && context_1.id;
    var React, ReactDOM, main_1, app_store_1;
    var appContainer, appStore, app;
    // here you can customize hot-module-reload hook
    // you could also copy to other modules
    function __reload(prev) {
        if (prev.app.state) app.setState(prev.app.state);
    }
    exports_1("__reload", __reload);
    return {
        setters: [function (React_1) {
            React = React_1;
        }, function (ReactDOM_1) {
            ReactDOM = ReactDOM_1;
        }, function (main_1_1) {
            main_1 = main_1_1;
        }, function (app_store_1_1) {
            app_store_1 = app_store_1_1;
        }],
        execute: function () {
            // auto create app container if missing
            appContainer = document.getElementById('app-container');
            if (appContainer == null) {
                appContainer = document.createElement('div');
                appContainer.id = 'app-container';
                document.body.appendChild(appContainer);
            }
            appStore = new app_store_1.AppStore();
            exports_1("app", app = ReactDOM.render(React.createElement(main_1.Main, { storage: appStore }), appContainer));
        }
    };
});
$__System.register('app/views/main.css!github:systemjs/plugin-css@0.1.23/css.js', [], false, function() {});
(function(c){if (typeof document == 'undefined') return; var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
(".c-link--right{float:right}.c-choice--padded{padding:0 6px!important}.input-calendar{font-family:'Pontano Sans',sans-serif;position:relative}.input-calendar-wrapper{z-index:100;position:absolute;padding:5px 12px;border:1px solid #c4c4c4;border-radius:5px;box-shadow:0 0 9px 5px rgba(0,0,0,.05);background-color:#fff;text-align:center;left:0;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.input-calendar .input-calendar-field{width:120px;border:1px solid #ccc;border-radius:4px;font-family:'Pontano Sans',sans-serif;font-size:16px;padding:2px 8px}.input-calendar .input-calendar-field:focus{outline:0;border:1px solid #f39c12}.input-calendar .calendar-icon{display:inline-block;padding:0 1px 0 5px;height:27px;line-height:27px;transform:translateY(4px);cursor:pointer}.input-calendar .days,.input-calendar .months,.input-calendar .years{width:189px;padding-bottom:2px}.input-calendar .cell{display:inline-block;text-align:center;cursor:pointer;border:1px solid #fff;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.input-calendar .cell:hover{color:#f39c12;border:1px solid #f39c12;border-radius:4px}.input-calendar .cell.current{background:#f39c12;color:#fff;border-radius:4px;opacity:.8}.input-calendar .day{width:25px;height:25px;line-height:25px}.input-calendar .day.next,.input-calendar .day.prev{opacity:.4}.input-calendar .month{width:58px;height:38px;line-height:38px}.input-calendar .year{width:58px;height:38px;line-height:38px}.input-calendar .days-title .cell{height:25px;line-height:28px;opacity:.5;cursor:default}.input-calendar .days-title .cell:hover{color:#000;border:1px solid #fff}.input-calendar .navigation-title{width:100px;display:inline-block;cursor:pointer}.input-calendar .years-view .navigation-title{cursor:default}.input-calendar .years-view .navigation-title:hover{color:#000}.input-calendar .navigation-title:hover{color:#f39c12}.input-calendar .icon-wrapper{cursor:pointer}.input-calendar .icon-wrapper:hover,.input-calendar .icon:hover,.input-calendar .today-btn:hover{color:#f39c12}.input-calendar .icon{cursor:pointer;width:20px}.input-calendar .today-btn{cursor:pointer}.input-calendar .cell.day.today{position:relative}.input-calendar .cell.day.today:after{content:'.';position:absolute;bottom:15px;font-size:20px;color:#F39C12}");
})
(function(factory) {
  if (typeof define == 'function' && define.amd)
    define(["react","process/process.js","react-dom"], factory);
  else if (typeof module == 'object' && module.exports && typeof require == 'function')
    module.exports = factory(require("react"), require("process/process.js"), require("react-dom"));
  else
    throw new Error("Module must be loaded as AMD or CommonJS");
});
