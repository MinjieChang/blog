# 项目配置eslint+prettier

### 背景

在一个多人协作的项目中，不同的开发人员写的代码的风格不太一样，比如是否需要在行末加分号，换行、空格、缩紧、项目中散落的console处理方法、单行代码最大长度等等，如果项目中没有统一的规范就会导致代码风格的五花八门，不利于代码的阅读和维护。

### 目标

为了项目中有统一的编码规范，我们使用eslint + prettier 来进行约束。

1、使用 eslint + prettier添加统一代码规范

2、格式化现有项目下的不符合规范的文件

3、配置编辑器，自动检测新增或修改的代码的规范合法性

### 配置

这里我们以react项目为例，进行规范的配置，下文中涉及到的插件部分是与react相关。

#### 安装eslint

```shell
npm i -D eslint babel-eslint eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-react
```

这里有两个react插件：

- eslint-plugin-jsx-a11y：检验jsx语法
- eslint-plugin-react：设定react组件的相关规范

然后，添加.eslintrc配置文件

```js
{
  "parser": "babel-eslint",
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "plugins": [
    "react",
  ],
  "rules": {
    "semi": 0, // 行末分号，根据编码习惯选择添加，这里配置的不加分号
    "no-console": 0,
    "comma-dangle": [2,"always-multiline"],
    "max-len": 0,
    "space-before-function-paren": [0,"always"],
    "no-unused-expressions": [
      0,
      {
        "allowShortCircuit": true,
        "allowTernary": true
      }
    ],
    "arrow-body-style": [0, "never"],
    "func-names": 0,
    "prefer-const": 0,
    "no-extend-native": 0,
    "no-param-reassign": 0,
    "no-restricted-syntax": 0,
    "no-eval": 0,
    "no-continue": 0,
    "no-unused-vars": [
      0,
      {
        "ignoreRestSiblings": true
      }
    ],
    "no-underscore-dangle": 0,
    "global-require": 0,
    "import/no-extraneous-dependencies": 0,
    "import/prefer-default-export": 0,
    "import/no-unresolved": 0,
    "import/extensions": 0,
    // react
    "react/jsx-first-prop-new-line": 0,
    "react/jsx-filename-extension": 0,
    "react/jsx-no-bind": 0,
    "react/no-array-index-key": 0,
    "react/require-default-props": 0,
    "react/forbid-prop-types": 0,
    "react/no-string-refs": 0,
    "react/no-find-dom-node": 0,
    "react/no-danger": 0,
    "react/prop-types": 0,
    "react/display-name": 0,
    "react/no-deprecated": 0,
    "react/no-direct-mutation-state": 0,
    "jsx-a11y/href-no-hash": 0,
    "jsx-a11y/no-static-element-interactions": 0,
  },
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 8,
    "ecmaFeatures": {
      "jsx": true,
      "experimentalObjectRestSpread": true
    }
  },
  "settings": {
    "import/resolver": "node"
  }
}
```

然后在package.json中添加脚本：

```js
{
  scripts: {
    "lint-fix": "eslint --fix .js src"
  }
}
```

接下来，执行这个命令，这个命令会检测src目录下的所有的js文件.

如果发现在src目录下有不需要检测的文件夹，比如vendors文件夹下有三方开源的代码，不需要做格式的校验，可以通过配置下.eslintignore，忽略此文件夹目录。

```js
/src/vendors
```

执行完lint-fix命令后，eslint会根据配置文件标注出不符合规范的地方，并且自动添加一些修改，比如去掉行末添加分号

但是对于一些其它的代码格式的设置，比如缩进是使用空格还是tab，大括号是否要添加空格等等，而这些正是prettier插件擅长做的。

#### 添加 prettier

prettier专门做代码格式化的事情，包括缩进、换行、添加空格等等，有了它可以让我们写的代码规范统一，增加代码的可读性、美观性。prettier可以作为eslint的一个插件使用。

首先安装prettier插件：

```shell
npm i -D prettier eslint-plugin-prettier eslint-config-prettier
```

然后在.eslintrc文件中添加对prettier的配置，主要有这几处：

```js
{
  "extends": [ // extends 指定扩展的配置, 支持规则的覆盖和聚合
    ...
    "plugin:prettier/recommended", // 如果同时使用了eslint和prettier发生冲突了，会关闭掉与prettier有冲突的规则，也就是使用prettier认为对的规则
  ],
  "plugins": [ // plugins 配置那些我们想要Linting规则的插件。
    ...
    "prettier", // eslint 会使用pretter的规则对代码格式化
  ],
  "rules": {
    "prettier/prettier": 2, // 这项配置 对于不符合prettier规范的写法，eslint会提示报错
  }  
}
```
增加.prettierrc配置文件， 设定代码格式化的规则：

```js
module.exports = {
  "printWidth": 100, // 指定代码长度，超出换行
  "tabWidth": 2, // tab 键的宽度
  "useTabs": false, // 不使用tab
  "semi": false, // 结尾加上分号
  "singleQuote": true, // 使用单引号
  "quoteProps": "as-needed", // 要求对象字面量属性是否使用引号包裹,(‘as-needed’: 没有特殊要求，禁止使用，'consistent': 保持一致 , preserve: 不限制，想用就用)
  "jsxSingleQuote": false, // jsx 语法中使用单引号
  "trailingComma": "es5", // 确保对象的最后一个属性后有逗号
  "bracketSpacing": true, // 大括号有空格 { name: 'rose' }
  "jsxBracketSameLine": false, // 在多行JSX元素的最后一行追加 >
  "arrowParens": "always", // 箭头函数，单个参数添加括号
  "requirePragma": false, // 是否严格按照文件顶部的特殊注释格式化代码
  "insertPragma": false, // 是否在格式化的文件顶部插入Pragma标记，以表明该文件被prettier格式化过了
  "proseWrap": "preserve", // 按照文件原样折行
  "htmlWhitespaceSensitivity": "ignore", // html文件的空格敏感度，控制空格是否影响布局
  "endOfLine": "auto" // 结尾是 \n \r \n\r auto
}
```

有了这个配置文件，再执行lint命令，eslint会按照这个prettier配置文件格式化我们的文件。

到这里，我们的项目中的eslint + prettier 的规则配置基本就完成了。

但是，当我们新增一个文件，需要对新写的代码进行格式化的时候，每次都要执行一下lint命令，这样也太不方便了，我们就希望在保存文件的时候，编辑器可以帮我们做格式化的事情。

下面以vscode为例，配置一下保存自动格式化

#### 配置vscode

首先在拓展中安装eslint和prettier插件

然后配置setting.json如下：

```js
{
    // 下面这三个是关键配置
    "editor.formatOnSave": true,
    // "eslint.autoFixOnSave": true, 这个设置被废弃了，使用下面的editor.codeActionsOnSave的配置
    "editor.codeActionsOnSave": {
        // "source.fixAll": true,
        "source.fixAll.eslint": true
    },
    "eslint.format.enable": true,
    "[javascript]": {
        "editor.defaultFormatter": "dbaeumer.vscode-eslint"
        // 这里也可以使用 "editor.defaultFormatter": "esbenp.prettier-vscode"，但是要保证安装了prettier插件
        // 这样使用快捷键格式化 command + k \ command + f，可以进行选择部分代码进行格式化
    },
}
```

其他的编辑器，比如webstorm的配置读者自行配置

#### 配置 pre-commit

通过上面的配置，不出意外的话，我们基本已经可以实现对老的代码和新的添加的代码实现了格式化的效果，然后就能愉快的提交代码了。

还有一个问题是，并不一定每个人都配置好了格式化的插件，这就没法保证所有人提交的代码都是格式化后的，所以我们还需要增加最后一道防线，在代码提交前验证一遍。这需要添加git的pre-commit钩子，添加钩子可以手动配置，也可以选择目前成熟的方案，这里我们使用husky + lint-staged方案

首先安装这两个包：

```shell
npm i -D husky lint-staged
```

husky 是提供git钩子的解决方案，它可以提供git在多个阶段前的操作，比如pre-commit、pre-push等，这里我们使用pre-commit

lint-staged，它只对git暂存区的文件执行linter检测，相对每次执行lint命令，这种只对增量修改的检测效率会高很多

在package.json中添加如下脚本：

```js
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx}": [
      "eslint --fix",
      "git add"
    ]
  },
}
```

现在每次在提交的代码的时候，会默认执行pre-commit，然后执行lint-staged检测，在lint-staged脚本中先执行eslint --fix，如前所述，此时会使用prettier规则格式化文件，没有错误会执行git add把fix过后的文件添加到暂存区，否则会报错退出。

至此，我们就完成了在项目配置eslint和prettier的全部工作了。

### 遇到的问题

需要注意的是，prettier 和 eslint 会存在一些规则重复导致冲突的问题，同一个规则eslint会检测一次，prettier也会检测一次，导致修改了一方，另一方还会报问题，这种问题一般可以在.eslintrc中extends中添加如下配置即可：

```js
{
  "extends": ["plugin:prettier/recommended"]
}
```

注意，上面的配置前提是需要安装`eslint-config-prettier`这个包

如上配置可以解决大部分冲突，但是还有部分无法解决掉，比如在函数名和()之间要不要加上空格这个

```js
// fn 和 括号间要不要空格
function fn() {}
```

eslint 默认标准是需要加上空格的，但是prettier是没有这个配置的，所以经过prettier格式化后会把空格去掉，去掉后eslint就又提示错误，这就形成了死循环，解决办法呢就是只能关闭掉eslint对这个配置的检测

```js
{
  "space-before-function-paren": 0,
}
```

实际上，大部分冲突都可以使用这个思路来解决，要么关闭eslint的相关配置，要么关闭prettier的相关配置，避免它俩产生冲突

refer:

[最全eslint配置模版](https://juejin.im/post/6844903859488292871)

[eslint配置和prettier冲突了怎么办](https://juejin.im/post/6844903621805473800)

[如何在项目中配置eslint和prettier](https://juejin.im/post/6844903941503729678)

