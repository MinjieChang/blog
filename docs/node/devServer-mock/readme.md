# 基于 `webpack-dev-server` 搭建 mock 服务

在前后端分离背景下，前端和后端并行开发，前端往往会依赖于后端提供的接口 `api` 及 字段这些信息，但是又不能在提供真正可调用的接口后才进入开发，因此前端自行模拟真实数据，搭建数据 mock 服务就很有必要了。

本方案已发布到 npm 上 [quick-api-mocker](https://www.npmjs.com/package/quick-api-mocker)，配置简单，欢迎使用。

## 常见的 mock 方案

### mocker-api

第一个是[mocker-api](https://www.npmjs.com/package/mocker-api)，功能很全面，只需要修改 `mocker/index.js` 配置文件即可：

```js
{
  '/api/user': {
    id: 1,
    username: 'kenny',
    sex: 6
  },
  'GET /api/user': {
    id: 1,
    username: 'kenny',
    sex: 6
  },
}
```

### roadhog

还有一种方式是使用 `dva` 的 [roadhog](https://www.npmjs.com/package/roadhog) 提供的 `mock`服务，这里需要配置 `.roadhogrc.mock.js`：

```js
export default {
  // 支持值为 Object 和 Array
  "GET /api/users": { users: [1, 2] },

  // GET POST 可省略
  "/api/users/1": { id: 1 },

  // 支持自定义函数，API 参考 express@4
  "POST /api/users/create": (req, res) => {
    res.end("OK");
  },

  // Forward 到另一个服务器
  "GET /assets/*": "https://assets.online/",
};
```

上面的两种方案的配置方式比较相似，都是基于 `express` 提供的中间件能力，监听路由，返回对应的数据，或是做请求转发

但是上面两种方式有不方便的地方是：

1. 每次新建一个 `api`，都要手动修改配置文件
2. 对于 `roadhog` 的方式，每次修改完配置文件后，都得重启服务才能生效，比较耗时间

## apiMocker

基于以上问题，我们想实现一个 `mock`服务，减少手动配置和重启服务的过程，达到配置文件修改后具备热更新的能力

基本思路是，根据我们在项目中提供的 `api` 文件，这个文件实际上就是 `api` 名称对应实际地址的映射关系：

```js
const api = {
  aaa: "/api/xxx/aaa",
  bbb: "/api/xxx/bbb",
};
module.exports = api;
```

然后，我们再监听接口请求后，会根据实际的 `api` 地址，去项目的 `mock` 文件下找到对应的 `json` 文件，并将结果返回。

比如对于上面的 `api`，当请求地址是 `/api/xxx/aaa`，会去找 `aaa.json` 文件，如此当新增一个 `api`后，我们只需要建立一个对应的 `json` 文件即可，**无需再多写 api 和文件映射关系的配置文件**

那如何解决新增或修改 mock 文件后能不重启服务而及时生效的问题呢？

产生修改不生效的问题，其实是由于 **node 在 require 加载的时候会走缓存**，每次加载的时候都清理一下缓存再加载就可解决这个问题了

### 配置 webpack

首先在 `webpack.config.js` 文件中配置 `devServer`

webpack5：

```js
{
  devServer: {
    ...
    onBeforeSetupMiddleware(devServer) {
      apiMocker(devServer.app, {
        watch: '/gov/*',
        api: path.resolve(__dirname, '../src/utils/api.js'),
      })
    },
  }
}
```

webpack4：

```js
{
  devServer: {
    ...
    before(app) {
      apiMocker(app, {
        watch: '/prefix/*',
        api: path.resolve(__dirname, '../src/utils/api.js'),
      })
    },
  }
}
```

这里使用了 `apiMocker` 函数，稍后看下这个函数

第一个参数 `app`，很明显这个是 `devServer`提供的，`webpack4` 和 `webpack5`稍有区别

第二个参数`option` 选项有两个参数：

1. watch：需要监听的 `url` 前缀，默认为 `/api/*`
2. api：提供本地 `api`文件地址

### 建立 api 地址和 mock 文件的映射关系

在入口处提供了 `api` 参数，这里要将请求的 url 和请求的方法建立映射关系，为后面到 mock 文件夹下找到对应的文件做准备

先看看 api 文件的样子：

```js
// 这个文件会在node环境中使用，需要判断window
let locationOrigin =
  typeof window === "undefined" ? "" : window.location.origin;

if (!locationOrigin || locationOrigin.indexOf("localhost") > -1) {
  // 这里加的前缀和提供给 api-mocker 的前缀保持一致
  locationOrigin = locationOrigin + "/prefix";
}

let domain = locationOrigin + "/api/xxx";

const api = {
  getUserInfo: `${domain}/user/getUserInfo`,
  someOtherApi: `${domain}/otherApi`,
};
// 使用 commonjs 导出方式
module.exports = api;
```

实际上这里就是导出了一个 api 对象，需要特殊处理的是三点

1. 这个文件要在 node 环境下使用，因此需要对 `window`做判断
2. 在本地环境（`localhost`）或 `node` 环境下将请求的路径添加一个前缀 `/prefix`，目的是只在本地开发的环境下对于 `mock`监听有效，如果使用 `ip`或其他的路径，那么正常走其他配置，不会到本地 `mock`
3. 该文件在 `node` 环境下使用，注意使用 `commonjs`方式导出

在看如何将 api 名称和 api 别名建立对应关系：

```js
const getMockUrlMap = (apiPath) => {
  const api = load(apiPath);
  return Object.keys(api).reduce((prev, next) => {
    const urlPath = api[next];
    prev[urlPath] = path.resolve(rootDir, "./mock/", next);
    return prev;
  }, {});
};
```

### 建立 mock 文件名和地址的映射关系

这里我们会读取 `mock`文件夹下的所有的文件，将文件名和该文件所在地址建立对应关系，当请求过来后，实现读取本地 mock 文件的基本思路是：

1. 解析 url
2. 通过 url 名找到对应的 url 别名，也就是对应的 json 文件名
3. 通过 json 文件名找到对应的文件地址，加载该地址下的文件返回

```js
const getFileMap = (mockPath) => {
  const mockPaths = path.join(path.resolve(mockPath), "**/*");
  const fileMap = {};
  const files = glob.sync(mockPaths);
  files.forEach((mockFile) => {
    const stats = fs.statSync(mockFile);
    if (stats.isFile()) {
      fileMap[getBaseName(mockFile)] = mockFile;
    }
  });
  return fileMap;
};
```

这里返回的 fileMap 就是文件名和文件地址的映射关系

### 读取 mock 文件返回结果

最后就是对于 url 的监听了

```js
const mockServer = (app, options = {}) => {
  const { watch = "/api/*", api } = options;
  const mockPath = path.resolve(rootDir, "mock");
  const apiPath = path.resolve(rootDir, api);
  let fileMap = getFileMap(mockPath);
  if (!isFileExist(mockPath)) {
    console.log("");
    console.log(error("error: mock folder is required"));
    process.exit(0);
  }
  app.all(watch, (req, res) => {
    const url = req.path;
    let mockUrl = getMockUrlMap(apiPath)[url];
    const mockFileName = getBaseName(mockUrl);
    // 新增mock文件
    if (!fileMap[mockFileName]) {
      fileMap = getFileMap(mockPath);
    }
    if (getFileExt(fileMap[mockFileName]) === ".json") {
      res.json(load(fileMap[mockFileName]));
    } else {
      load(fileMap[mockFileName])(req, res);
    }
  });
};
```

需要注意的是，这里面用到了一个 `load`函数

```js
const load = function (path) {
  if (require.resolve(path)) {
    delete require.cache[require.resolve(path)];
    return require(path);
  }
};
```

这个 `load`函数的作用就是清除 `require`加载过的缓存，对于相同的目录，`require`加载后就会缓存起来，再次加载就会从缓存中读取，因此文件如果有修改并不会立即生效，因此为了达到修改后可以热更新的状态，我们需要在重新加载的时候，先清除掉缓存，然后再加载即可

## 总结

使用此种 mock 方式可以**支持 `mock` 文件热更新**，新增或修改 `mock` 文件后，无需重启服务，直接调用即可，具备写后不管的特点，同时 mock 文件支持 js 和 json 文件格式，具备一定的灵活度，但同时也存在一定的局限性，比如，需要在项目中提供一个表现 url 别名和 url 地址的 api 文件，这个文件也相当于是 mock 的配置文件，不过在我们的系统中，除非在调用时候直接使用 url 地址，一般都会建立一个单独的文件来管理所有的 api 地址。

本项目的地址 [api-mocker](<[https://link](https://github.com/MinjieChang/api-mocker)>)
