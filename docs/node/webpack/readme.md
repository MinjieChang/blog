# 简易webpack实现

## 前言

结合 `babel` 的解析能力，模拟实现 `webpack` 的核心模块加载功能

## 实现

首先新建一个项目，目录结构如下：

```js
├── package.json
├── src
│   ├── compiler.js
│   ├── index.js
│   ├── parser.js
├── test
│   ├── a.js
│   ├── b.js
│   ├── c.js
│   └── index.js
└── webpack.config.js
```
### 添加配置文件

首先添加上 `webpack.config.js`

```js
const path = require('path')

module.exports = {
  entry: './test/index.js',
  output: {
    path: path.join(__dirname, './dist'),
    filename: 'main.js'
  }
}
```

这里的 `./test/index.js` 是测试文件，可以看成是我们的 `webpack`要打包的项目的入口文件

`src/index.js`是我们的 `webpack` 的入口文件，这个文件主要是实例一个 `Compiler`对象并触发编译方法

```js
const Compiler = require('./compiler')
const config = require('../webpack.config')

new Compiler(config).run()
```
### 解析入口文件

现在来看 `compiler`文件，首先要做的是解析入口文件，从解析的结果中拿到入口文件的依赖项：

```js
class Compiler {
  constructor(options) {
    const { entry, output } = options
    this.entry = entry
    this.output = output
    this.modules = []
  }
  run() {
    // 依赖收集
    const entry = this.buildModules(path.resolve(this.entry))
  }
  buildModules(filename) {
    const file = fs.readFileSync(filename, 'utf-8')
    const ast = parser(file)
    const dependencies = getModuleDependences(ast)
    const { code } = transform(file)
    const result = {
      code,
      filename,
      dependencies,
    }
    return result
  }
}
```

那么如何解析入口文件，如何拿到入口文件的依赖？这里就需要使用 `babel`提供的能力了。关于 `babel`如何解析文件可以参考[这篇文章](https://minjiechang.github.io/node/babel/)

解析过程中使用到了三个方法：

1. parser：将文件解析成 `ast`
2. getModuleDependences：收集文件依赖
3. transform：将 `es6`文件转化为 `es5`

这几个方法统一放在了 `src/parser.js`中

```js
const babel = require("babel-core");
const babelParser = require("@babel/parser");
const babelTraverse = require("@babel/traverse").default;
const babelGenerator = require("@babel/generator").default;

const parser = (code) => {
  return babelParser.parse(code, { sourceType: 'module' })
}

const getModuleDependences = (ast) => {
  const dependencies = []
  const visitor = {
    ImportDeclaration: function(path) {
      dependencies.push(path.node.source.value)
    },
  }
  babelTraverse(ast, visitor)
  return dependencies
}

const transform = (code) => {
  return babel.transform(code, {
    presets: ['env']
  })
}
```
对 `babel`比较了解的话，这几个方法还是很容易理解的，不了解的话可以参考[这篇文章](https://minjiechang.github.io/node/babel/)

最终在 `buildModules`方法中返回了一个对象：

```js
const result = {
  code,
  filename,
  dependencies,
}
return result
```

其中 `code`代表解析成 `es5`格式的文件内容，`filename`表示文件名称，这里使用的绝对路径表示；`dependencies`表示文件的依赖项，结果如下：

```js
{
  code: 'use strict;'+
    '\n' +
    "var _a = require('./a.js');\n" +
    '\n' +
    'var _a2 = _interopRequireDefault(_a);\n' +
    '\n' +
    "var _c = require('./c.js');\n" +
    '\n' +
    'var _c2 = _interopRequireDefault(_c);\n' +
    '\n' +
    'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n' +
    '\n' +
    'console.log(_c2.default);\n' +
    '(0, _a2.default)();',
  filename: "/Users/chang/Desktop/simply-webpack/test/index.js",
  dependencies: ['./a.js', './c.js'],
}
```

### 解析依赖文件

现在得到了入口文件的编译后文件及其依赖文件，但是仅仅知道了依赖的文件还不够，还需要找到依赖的文件的内容及依赖文件的依赖，这么说有点绕，实际上就是还需要再递归解析依赖文件而已：

```js
{
  ...
  run() {
    // 依赖收集
    const entry = this.buildModules(path.resolve(this.entry))
    const modules = [entry]
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const { filename, dependencies } = module
      if (dependencies) {
        module.dependencieMap = {}
        dependencies.forEach((dependencie) => {
          const dependenciePath = path.join(path.dirname(filename), dependencie)
          module.dependencieMap[dependencie] = dependenciePath
          modules.push(this.buildModules(dependenciePath))
        })
      }
    }
    this.modules = modules
    this.emitFiles()
  }
}
```
上面代码中定义了一个 `modules`变量，从入口模块开始遍历，遍历模块的依赖再执行 `buildModules`操作：

```js
modules.push(this.buildModules(dependenciePath))
```
这里使用push的方式往modules中加入新的模块，这种递归使用的**广度优先**的方式，此处使用广度优先相对深度优先更合理，防止在递归层级较深的情况下栈溢出的情况

在遍历的过程中有这么一条语句：

```js
module.dependencieMap[dependencie] = dependenciePath
```
这是为了将文件中依赖的相对路径指向真实的文件路径，方便在模块中执行 `require`时候有对应的路径映射，这在后面会讲到

处理后最终得到的 modules 结果如下：

```js
[
  {
    code: '',
    filename: '/Users/chang/Desktop/simply-webpack/test/index.js',
    dependencies: [ './a.js', './c.js' ],
    dependencieMap: {
      './a.js': '/Users/chang/Desktop/simply-webpack/test/a.js',
      './c.js': '/Users/chang/Desktop/simply-webpack/test/c.js'
    }
  }
]

```
### 生成运行文件

在 `run`方法中，我们最终得到了包含所有模块内容的 `modules`数组。现在如何将这些模块代码组织并运行起来？查看编译后的文件，我们发现，有模块导入导出的文件都包含 `require`和 `exports`变量，所以需要向编译的代码中注入这两个变量。

首先将 `modules`转换一下，转换成文件名称对文件内容映射的关系：

```js
{
  emitFiles(){
    const modules = {}
    this.modules.forEach(module => {
      modules[module.filename] = {
        code: `function fn(module, require, exports){${module.code}}`,
        dependencieMap: module.dependencieMap
      }
    })
  }
}
```
同时，将模块转换得到的 `code` 包裹到了一个函数中，并传入 `module, require, exports` 三个变量。

现在的主要点在于实现 `require`方法，使代码能跑起来：

```js
const entry = path.resolve(this.entry)
function start(modules) {
  function rawRequire(path) {
    const module = {
      exports: {}
    }
    const { code, dependencieMap } = modules[path]
    const require = (path) => {
      return rawRequire(dependencieMap[path])
    }
    const codeFn = eval("(false || " + code + ")");
    codeFn(module, require, module.exports)
    return module.exports
  }
  return rawRequire(entry)
}
start(modules)
```

这里定义了一个 `start`方法并传入上面转换得到的`modules`，在此方法中主要做了这几件事：

1. 定义 `rawRequire`方法，初始下传入入口文件名称调用
2. `rawRequire` 方法中定义了 `module` 变量，这里的 module 实际上就是个对象，并且包含了 `exports`属性，该属性值同样也是个对象
3. 根据传入的path路径取出对应的模块，以及模块中的 `code`和 `dependencieMap`
4. 定义 `require` 方法，注意在此项目中实际的require传入的是相对路径，所以需要对路径做一下转换，转化成实际的文件路径再给 `rawRequire`执行， `rawRequire(dependencieMap[path])`
5. 使用 `eval`解析出代码，并传入 `module, require, module.exports`变量
6. 最后一定要返回模块的导出结果，这是引入的模块最终使用 `require`得到的结果

最终，我们可以完整的将代码 `run`起来了！！

还有最后一步，类似webpack的做法，需要把打包的代码导出到一个文件中：

```js
{
  emitFiles(){
    ...
    const { path: outputPath, filename } = this.output
    const file = `
      (function (modules) {
        function rawRequire(path) {
          const module = {
            exports: {}
          }
          const { code, dependencieMap } = modules[path]
          console.log(dependencieMap, 'dependencieMap');
          let require = (path) => {
            return rawRequire(dependencieMap[path])
          }
          let codeFn = eval("(false || " + code + ")");
          codeFn(module, require, module.exports)
          return module.exports
        }
        return rawRequire('${entry}')
      })(${JSON.stringify(modules)})
    `
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath)
    }
    fs.writeFileSync(path.join(outputPath, filename), file, 'utf-8')
  }
}
```
## 添加loader

webapack在解析文件的时候会使用到对应的 `loader`，譬如在解析js文件的时候会使用到 `babel-loader`，同时也可以添加对应的 `babel-plugin`，比如在 `webpack.config.js`中添加如下配置：

```js
{
  ...
  module: {
    rules: [
      {
        includes: /test\//,
        test: /\.js/,
        use: {
          plugins: [['console-omit', {env: 'production'}], 'lodash-import']
        }
      }
    ]
  }
}
```

我们的目标是，在解析 `test`目录下的js文件需要使用到两个插件 [babel-plugin-console-omit](https://www.npmjs.com/package/babel-plugin-console-omit)和[babel-plugin-lodash-import](https://www.npmjs.com/package/babel-plugin-lodash-import)，现在看如何将这些插件使用到代码的解析中

在 `buildModules`中添加如下代码：

```js
{
  buildModules(){
    let ast
    let dependencies
    let code

    let usePlugins = false
    let usePresets = false
    this.rules.forEach(rule => {
    // node_modules 下的文件不需要加上插件和presets
      if (rule.includes && rule.includes.test(filename) && rule.test.test         (addFileNameSuffix(filename))
      || rule.excludes && !rule.excludes.test(filename) && rule.test.test(addFileNameSuffix(filename))
      ) {
        usePlugins = true
        usePresets = true
      }
      // 将配置中的插件传入解析方法中
      ast = transformWithPlugins(file, usePlugins, rule.use.plugins).ast
      dependencies = getModuleDependences(ast)
      code = transformFromAst(ast, usePresets).code
    })
  }
}
```
实际上就是判断在解析文件时符合配置文件中的rule规则时，就使用插件解析文件，然后修改解析的方法如下：

```js
const transformWithPlugins = (code, usePlugins, plugins) => {
  return babel.transform(code, {
    plugins: usePlugins ? plugins: []
  })
}

const transformFromAst = (ast, usePresets) => {
  return babel.transformFromAst(ast, null, {
    presets: usePresets ? ['env'] : []
  })
}
```
此时再打包后发现，src/index解析后的文件中的 `console`语句都去掉了，说明我们添加的 `console-omit`插件已经生效了。

当然在这里我们对配置文件中传入的插件的格式没有做处理，主要是这里的插件的格式是按照 `babel`需要的格式提供的。

## 使用cli

在此项目中，我们执行打包是使用的 `package.json`中的命令：

```js
{
  "scripts": {
    "start": "babel-node src/index.js"
  },
}
```
但是，正常的 `webapck`的打包是使用的webpack命令：

```js
"scripts": {
  "start": "webpack --config webpack.config.js"
},
```
下面，把项目改造成使用命令的方式

首先在 `simply-webpack`项目 `package.json`文件中添加 `bin` 字段：

```js
{
  "bin": {
    "simply-webpack": "src/index.js"
  },
}
```

这里需要注意的是，在打包发布后需要把 `src/index.js`修改为 `lib/index.js`

然后需要在 `src/index.js`文件头部添加上如下：

```js
#!/usr/bin/env node
...
```
表明该文件需要使用 `node`执行

为了测试我们的 `simply-webpack` 的命令是否有效，我们还需要在本地再新建一个项目 `simply-webpack-test`，然后把 `simply-webpack`的 `test`目录和 `webpack.dev.js`拷贝到 `simply-webpack-test` 项目中，目录如下：

```js
├── dist
│   ├── index.html
│   └── main.js
├── package-lock.json
├── package.json
├── test
│   ├── a.js
│   ├── b.js
│   ├── c.js
│   └── index.js
└── webpack.dev.js
```

两个项目建好了，那如何在`simply-webpack-test`项目中调试呢？

这里需要使用 `npm link`的方式，将 `simply-webpack`映射到全局，然后再在`simply-webpack-test`中关联到全局的 `simply-webpack`即可。

1. 在 `simply-webpack`中执行：

```js
npm link
```

2. 在 `simply-webpack-test`中执行：

```js
npm link simply-webpack
```

3. 在 `simply-webpack-test`的 `package.json` 中添加脚本：

```js
{
  "scripts": {
    "build": "simply-webpack --config webpack.dev.js"
  },
}
```

然后可以在 `simply-webpack`中修改代码，在`simply-webpack-test`中执行 `build`命令即可调试了

完整项目地址[点这里](https://github.com/MinjieChang/simply-webpack)