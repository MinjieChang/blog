# webpack 异步加载

## 前言

前端打包一个有效的优化方式是做代码切割，被切割的代码块只在需要的时候才加载，这样可以有效减少 `main bundle` 的体积，提升首屏的加载速度。目前做代码切割主要有两种方式，一种是使用 `require.ensure`，另外一种是使用 es6 的 `import`方法，下面我们来看看这两种方式是如何实现代码切割的

## require.ensure

`require.ensure`是 webpack1 就开始提供的用做代码切割的方式，使用方式如下：

```js
require.ensure(
  [],
  function (require) {
    const moduleA = require("./a.js");
  },
  function (error) {
    console.log(error)
  }
  "chunkIndex"
);
```

该方法主要接收四个参数:

- param 1：模块依赖，异步加载的模块所依赖的模块，在异步代码加载之前先加载这些依赖模块
- param 2：成功回调，异步代码加载成功后，会调用该方法，在该方法内部可以使用 `require` 获取到加载成功的 `chunk`
- param 3：失败回调，异步代码加载失败后的回调
- param 4：指定异步 `chunk` 名称，未指定按照默认数字递增

这段代码会被 webpack 编译成如下代码：

```js
__webpack_require__
  .e(/* require.ensure */ 0)
  .then(
    function () {
      const moduleA = __webpack_require__("./a.js");
      console.log(moduleA, "moduleA");
    }.bind(null, __webpack_require__)
  )
  .catch(function (error) {
    console.log(error, "error");
  });
```

这里会编译成 `__webpack_require__.e(/* require.ensure */ 'chunkIndex')`函数调用，其中两个参数会分别作为 `then` 和 `catch`的参数，此时我们发现，`__webpack_require__.e`这个函数会返回一个 `promise`，其中的参数 `chunkIndex` 就是我们自定义的 `chunk name`

### webpack_require.e

看看 webpack 给出的 `__webpack_require__.e` 的真容：

```js
var installedChunks = {
  main: 0,
};
// 加载异步代码
function jsonpScriptSrc(chunkId) {
  return __webpack_require__.p + "" + chunkId + ".bundle.js";
}
__webpack_require__.e = function requireEnsure(chunkId) {
  var promises = [];
  // JSONP chunk loading for javascript
  var installedChunkData = installedChunks[chunkId];
  if (installedChunkData !== 0) {
    // 0 means "already installed".
    // a Promise means "currently loading".
    if (installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      // setup Promise in chunk cache
      var promise = new Promise(function (resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push((installedChunkData[2] = promise));

      // start chunk loading
      var script = document.createElement("script");
      var onScriptComplete;

      script.charset = "utf-8";
      script.timeout = 120;
      if (__webpack_require__.nc) {
        script.setAttribute("nonce", __webpack_require__.nc);
      }
      script.src = jsonpScriptSrc(chunkId);

      // create error before stack unwound to get useful stacktrace later
      var error = new Error();
      onScriptComplete = function (event) {
        // avoid mem leaks in IE.
        script.onerror = script.onload = null;
        clearTimeout(timeout);
        var chunk = installedChunks[chunkId];
        console.log(chunk, "onScriptComplete");
        if (chunk !== 0) {
          if (chunk) {
            var errorType =
              event && (event.type === "load" ? "missing" : event.type);
            var realSrc = event && event.target && event.target.src;
            error.message =
              "Loading chunk " +
              chunkId +
              " failed.\n(" +
              errorType +
              ": " +
              realSrc +
              ")";
            error.name = "ChunkLoadError";
            error.type = errorType;
            error.request = realSrc;
            chunk[1](error);
          }
          installedChunks[chunkId] = undefined;
        }
      };
      var timeout = setTimeout(function () {
        onScriptComplete({ type: "timeout", target: script });
      }, 120000);
      script.onerror = script.onload = onScriptComplete;
      document.head.appendChild(script);
    }
  }
  return Promise.all(promises);
};
```

上面的代码看着不少，实际上核心的逻辑就是做了这两块：

1、创建一个 promise 对象，并将该 promise 的 resolve 和 reject 回调方法保存起来，方便后续使用

```js
var promise = new Promise(function (resolve, reject) {
  installedChunkData = installedChunks[chunkId] = [resolve, reject];
});
```

2、创建一个 script 标签，用以加载切割打包的 chunk 代码：

```js
var script = document.createElement("script");
script.charset = "utf-8";
script.timeout = 120;
script.src = jsonpScriptSrc(chunkId);
```

3、至于后面的监听 script 加载的结果的函数 onScriptComplete，我们稍后在看

### chunk

上边创建了 script 标签加载 chunk，现在来看看 chunk 长的啥样

```js
(window["webpackJsonptest"] = window["webpackJsonptest"] || []).push([
  ["chunkIndex"],
  {
    "./a.js": function (module, __webpack_exports__, __webpack_require__) {
      "use strict";
      __webpack_require__.d(__webpack_exports__, "a", function () {
        return a;
      });
      __webpack_require__.d(__webpack_exports__, "b", function () {
        return b;
      });
      var a = 333;
      var b = 222;
    },
  },
]);
```

这里调用了 `window["webpackJsonptest"] || []).push`，参数数组中有两个元素，第一个元素是包含 chunkName 的数组，第二个参数是个对象，其中 key 是 require 的模块名称，value 是该模块编译后的代码，再来看看 `window["webpackJsonptest"].push` 干了什么：

```js
var jsonpArray = (window["webpackJsonptest"] =
  window["webpackJsonptest"] || []);
var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
jsonpArray.push = webpackJsonpCallback;
```

可以发现实际上 `window["webpackJsonptest"].push方法`调用的实际上是`webpackJsonpCallback`：

```js
function webpackJsonpCallback(data) {
  var chunkIds = data[0];
  var moreModules = data[1];

  // add "moreModules" to the modules object,
  // then flag all "chunkIds" as loaded and fire callback
  var moduleId,
    chunkId,
    i = 0,
    resolves = [];
  for (; i < chunkIds.length; i++) {
    chunkId = chunkIds[i];
    if (
      Object.prototype.hasOwnProperty.call(installedChunks, chunkId) &&
      installedChunks[chunkId]
    ) {
      resolves.push(installedChunks[chunkId][0]);
    }
    installedChunks[chunkId] = 0;
  }
  for (moduleId in moreModules) {
    if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
      modules[moduleId] = moreModules[moduleId];
    }
  }
  while (resolves.length) {
    resolves.shift()();
  }
}
```

这段代码的大致逻辑解析一下：

1. 遍历 `chunkIds`拿到 `chunkId`，判断 `installedChunks[chunkId]`是否有值，实际上在 `__webpack_require__.e`方法中，设置了 `installedChunks[chunkId] = [resolve, reject]`，因此这里的值是包含了加载该 `chunk`对应的 promise 的 `resolve`和 `reject`的回调
2. `resolves.push(installedChunks[chunkId][0]);` `installedChunks[chunkId][0]`是 `resolve`回调，存入 `resolves`数组中
3. 设置 installedChunks[chunkId] = 0，这里的目的主要是标示 chunk 代码块加载成功，这里会在 script 的回调 `onScriptComplete`中判断使用
4. 设置 `modules[moduleId] = moreModules[moduleId]`，这块就比较核心了，这块是将 `moreModules`上的值挂载到 `modules`上，**为什么要这么做？这是为了在成功回调中使用 require 可以加载到该模块**

```js
function (require) {
  const moduleA = require("./a.js");
},
```

5. 最后执行

```js
while (resolves.length) {
  resolves.shift()();
}
```

这里实际上就是执行 `promise` 的 `resolve` 方法，从而触发 then 回调

```js
__webpack_require__.e(/* require.ensure */ 0).then(
  function () {
    const moduleA = __webpack_require__("./a.js");
    console.log(moduleA, "moduleA");
  }.bind(null, __webpack_require__)
);
```

以上就是 `webpackJsonpCallback`做的事情，现在再回看脚本的回调函数 `onScriptComplete`中对于代码是否加载成功的判断：

```js
if (chunk !== 0) {
  if (chunk) {
    var errorType = event && (event.type === "load" ? "missing" : event.type);
    var realSrc = event && event.target && event.target.src;
    error.message =
      "Loading chunk " +
      chunkId +
      " failed.\n(" +
      errorType +
      ": " +
      realSrc +
      ")";
    error.name = "ChunkLoadError";
    error.type = errorType;
    error.request = realSrc;
    chunk[1](error);
  }
  installedChunks[chunkId] = undefined;
}
```

当 `chunk !== 0` 说明 chunk 没有加载成功，因为只有加载成功并且代码执行后，才会将 `installedChunks[chunkId]`置为 0，然后再使用 `chunk[1](error)` 也就是 promise 的 reject 回调抛出错误。

### 小总结

以上在几个不同的函数中来回调整，这里面会涉及到不同函数的执行的时序问题，这里我们再重新来捋一下：

1. `__webpack_require__.e`首先创建 `script标签`加载 chunk 代码，并返回 promise
2. 加载成功后，由于是个执行函数，因此会执行 `webpackJsonpCallback`函数，此函数中会把加载的异步代码挂载到全局的 `modules`对象上，并且在此函数内部执行 promise 的 resolve 方法，此时再触发 promise 的 then 回调，在 then 回调中就可以使用同步方法 `require` 拿到异步代码
3. 最后这些执行完后再执行 script 加载的回调 `onScriptComplete`函数，此方法内根据 chunk 的值来最终判断 脚本是否加载成功了

## import

另外一个做异步加载的方法就是 es6 提供的 `import()`方法，该方法用法也比较简单：

```js
import("./b.js").then((module) => {
  console.log(module, 99999);
});
```

让我们看看，这段代码会被编译成什么样的：

```js
__webpack_require__
  .e(/* import() */ 0)
  .then(__webpack_require__.bind(null, "./b.js"))
  .then((module) => {
    console.log(module, 99999);
  });
```

可以发现，实际上 `import`的编译结果和 `require.ensure`的编译结果相似，只不过会多添加一个回调 `.then(__webpack_require__.bind(null, "./b.js"))` 帮我们导入异步的 chunk，总体上二者有异曲同工之妙吧

完整代码可查看[webpack-module-lazy-load](https://github.com/MinjieChang/module-analys/tree/master/webpack-module-lazy-load)

# 总结

webpack 做异步加载的实现方式总体上还是比较精妙的，实际上 webpack3 和 webpack4 的实现还不太一样，不过总体上思想还是一样的。其中对于 `promise` 的妙用还是值得我们学习的，这种处理异步的方式在我们平时的代码中还是可以借鉴一下的。
