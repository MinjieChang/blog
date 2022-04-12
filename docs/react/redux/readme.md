# redux 实现

本文结合 `ts`模拟实现一版 `redux`

## redux 是什么

`redux`就是一个纯状态管理器，最开始接触它的时候是在学习 `react`了解到的 `react-redux`，对于其中的一些新的概念，比如 `store`、`reducer`、`state`、`dispatch`等概念觉得很高大上，当然现在用了很久了已经是比较熟悉了

今天我们再重新梳理一下 `redux`，结合 `ts`来模拟实现一版，主要是为了学习其中的思想，把一些好的实践运用于我们的实际工作中。

## 开始

本项目使用 `ts` 实现，首先需要安装 `typescript`、`ts-node`，然后在 `package.json` 中添加如下内容：

```js
{
  ...
  "scripts": {
    "start": "nodemon --exec node --loader ts-node/esm --experimental-modules --es-module-specifier-resolution=node ./test/index.ts",
    "build": "tsc -p ."
  },
}
```

`start`命令用于测试，`build`命令用于项目打包。

项目整体结构如下：

```js
.
├── package.json
├── readme.md
├── src
│   ├── applyMiddleware.ts
│   ├── bindActionCreators.ts
│   ├── combineReducers.ts
│   ├── compose.ts
│   ├── createStore.ts
│   ├── index.ts
│   └── types.ts
├── test
│   ├── index.ts
│   ├── middlewares
│   │   ├── log.ts
│   │   └── time.ts
│   └── reducers
│       ├── goods.ts
│       ├── index.ts
│       └── user.ts
└── tsconfig.json
```

完整[项目地址](https://github.com/MinjieChang/redux)，感兴趣可以 `start` 查看

### createStore

首先看一下 `createStore`的用法：

```js
const store = createStore(reducer[, initialState[, storeEnhencer);
const { getState, dispatch, subscribe } = store;
```

其中，`createStore`接受两个参数，`reducer` 和 `initialState`，返回一个 `store`对象，这里贴上实现：

```js
const createStore: CreateStore = (reducer, initialState, storeEnhencer): Store => {
  const listeners: Listeners = []
  let state = initialState || {}
  const getState = () => {
    return state
  }
  const dispatch = (action: Action) => {
    let nextState = reducer(state, action) as State
    state = nextState
    listeners.forEach((listener: Listener) => {
      listener(nextState)
    })
  }
  const subscribe = (listener: Listener) => {
    listeners.push(listener)
    // 返回退订函数
    return function unSubscribe() {
      listeners.splice(listeners.findIndex(listener), 1)
    }
  }
  const store = { getState, dispatch, subscribe }
  return store
}
```

可以看到，在 `createStore`内部实际是使用了发布订阅的模式，通过 `subscribe`方法在 `listeners`数组中添加监听者，再通过 `dispatch`方法更新 `state`，并且通知订阅者。

然后，我们新建 `test/index.ts`文件，添加如下测试内容：

```js
import { createStore } from "../src/index";

const initialState = { name: "jack", age: 10 };

const reducer = (state = initialState, action: Action) => {
  switch (action.type) {
    case "INCREACE":
      return {
        ...state,
        age: state.age + 1,
      };
    default:
      return initialState;
  }
};

const store = createStore(reducer);

store.subscribe((state: State) => {
  console.log(state, "subscribe");
});

console.log(store.getState(), "getState");

setTimeout(() => {
  store.dispatch({ type: "INCREACE" });
}, 1000);
```

可以看到，初始输出结果是 10，一秒后输出为 11

### combineReducers

上面的 `reducer` 中只存储了一个 `state`，如果是多个 `state`放在一个 `reducer`中，那维护起来就比较困难了，此时我们需要实现一个 `combineReducers` 方法，将各个子模块的 `reducer` 聚合起来

`combineReducers`的用法如下：

```js
const reducer1 = function (state = {}, action) {
  switch (action.type) {
    case "xxx":
    default:
      return state1;
  }
};

const reducer2 = function (state = {}, action) {
  switch (action.type) {
    case "xxx":
    default:
      return state2;
  }
};

const reducer = combineReducers({ reducer1, reducer2 });
```

然后实现 `combineReducers` 如下：

```js
const combineReducers = (reducers: Reducers) => {
  const keys = Object.keys(reducers);
  const newState: State = {};
  return function newReducer(state: State, action: Action) {
    keys.forEach((key) => {
      const reducer = reducers[key];
      const prevState = state[key];
      newState[key] = reducer(prevState, action);
    });
    return newState;
  };
};
```

在 `combineReducers` 返回了一个新的 `reducer`函数，这个函数将作为传递给 `createStore`的参数，返回的`newReducer` 函数和原来的 `reducer`函数一致，都是接收 `state` 和 `action` 参数

在 `newReducer`方法中，通过遍历执行 `reducers` 中的方法，将每个 `reducer`模块执行的结果保存到 `newState`中，作为新的 `state`保存到 `createStore`中

### applyMiddleware

在 `createStore`方法中，我们还可以传入 `applyMiddleware`参数，用以拓展 `dispatch` 的能力

`applyMiddleware` 的使用方式如下：

```js
const mid1 = (store: Store) => (next: Dispatch) => (action: Action) => {
  console.log(store.getState(), "state==========>before");
  next(action);
  console.log(store.getState(), "state==========>after");
};

const mid2 = (store: Store) => (next: Dispatch) => (action: Action) => {
  console.log(store.getState(), "state==========>before");
  next(action);
  console.log(store.getState(), "state==========>after");
};

const store = createStore(reducer, {}, applyMiddleware(mid1, mid2));
```

当我们执行 `dispatch` 的时候，会依次执行 **mid1 => mid2 => dispatch**

现在看下 `applyMiddleware` 如何实现：

```js
const applyMiddleware = (...middlewares: Middleware[]) => {

  return function storeEnhencer(oldCreateStore: CreateStore) {

    return function newCreateStore (reducer: Reducer, initialState: State) {

      const store = oldCreateStore(reducer, initialState)

      const partialStore = { getState: store.getState }

      const midders = middlewares.map((item: Middleware) => item(partialStore as Store))

      midders.reverse().forEach((middle: Middle) => {
        store.dispatch = middle(store.dispatch)
      });

      return store
    }
  }
}
```

首先执行 `applyMiddleware` 返回一个 `storeEnhencer`函数，该方法接收 `oldCreateStore` 作为参数，`oldCreateStore`实际上就是当前的 `createStore` 方法

此处我们需要修改一下 `createStore` 方法，这样再看 `applyMiddleware` 就比较好理解了：

**createStore**

```js
const createStore: CreateStore = (reducer, initialState, storeEnhencer): Store => {
  // initialState 作为第二个参数没有传递
  if (typeof initialState === 'function' && !storeEnhencer) {
    storeEnhencer = initialState
    initialState = {}
    return storeEnhencer(createStore)(reducer, initialState)
  }
  // other
  ...
}
```

当传递有第二个参数的时候，并且第二个参数是函数的情况下(实际 initialState 没有传入)，然后执行 `storeEnhencer` 并把 `createStore` 作为参数传入，此时返回的是 `newCreateStore` 方法，然后再执行了 `newCreateStore(reducer, initialState)`，在这个函数内部实际上是执行了 `oldCreateStore` 方法，`oldCreateStore` 对应的就是 `createStore`，此处就是创建出了 `store`

然后再执行：

```js
// 这里只是将 store 的 getState 和 dispatch 方法暴露出去了
const partialStore = {
  getState: store.getState,
  dispatch: (action, ...args) => store.dispatch(action, ...args)
}

const midders = middlewares.map((item: Middleware) => item(partialStore as Store))
```

实际上是将 `store` 传入到各个中间件方法中执行一遍，返回的结果如下

```js
const m1 = (next) => (action) => {};

const m2 = (next) => (action) => {};

const midders = [m1, m2];
```

得到的是包含高阶函数的数组，然后再执行

```js
midders.reverse().forEach((middle: Middle) => {
  store.dispatch = middle(store.dispatch);
});
```

这一步相当于装饰器的作用，就是将 `store.dispatch` 放入到每个高阶函数中执行一遍，相当于通过每个高阶函数来增强一下 `dispatch`的能力

**这部分装饰器的理解可以查看之前的写的这篇文章**[AOP](https://minjiechang.github.io/designPattern/aop/)

通过上面的分析可以看到，在`redux`中提供的这几个方法，`createStore`、`combineReducers`、`applyMiddleware`这几个方法中，都使用到了 **闭包**，由此可见，正确的使用好闭包可以实现出很强大的功能

### compose

在 `applyMiddleware` 方法中，重写 `dispatch` 使用的是如下的方式：

```js
midders.reverse().forEach((middle: Middle) => {
  store.dispatch = middle(store.dispatch);
});
```

使用一个函数可以如下表示：

```js
function compose(midders, dispatch) {
  midders.reverse().forEach((middle: Middle) => {
    dispatch = middle(dispatch);
  });
  return dispatch;
}
```

这种方式比较好理解，但是有个问题是 **不够函数式**，因为我们需要传递一个 `dispatch` 参数，并且在函数内部还修改了 `dispatch`参数，产生了副作用，这对于追求 **函数式**编程的 `redux`来说显然是不太合适的。

于是 `redux` 给出了一个 `compose` 的实现方式：

```js
const compose = (middlewares: Middle[]) => {
  if (middlewares.length === 1) {
    return middlewares[0];
  }
  return middlewares.reduce(function (prev, next) {
    return function (...args) {
      return prev(next(...args));
    };
  });
};
```

分析 `compose` 可知，每次 `reduce` 迭代返回一个新的函数，并且在该新函数中，`prev` 保存着对于上次迭代返回的函数的引用，这样函数内部有对于外部变量的引用，形成一个 **闭包**

对于 `compose` 函数的解析可以查看之前写的[compose 解析](https://minjiechang.github.io/designPattern/aop/#%E5%AE%9E%E7%8E%B0redux-compose%E5%87%BD%E6%95%B0)

### bindActionCreators

`bindActionCreators` 这个方法在开发中使用的很少，主要在 `react-redux` 的
`connect`函数中使用到

这个方法主要将 `dispatch action` 的细节隐藏起来，用户只需要传递创建 `action` 的函数给 `redux`即可：

```js
// action creators
const increment = () => ({ type: "INCREMENT" });
const setName = (name: any) => ({ type: "SET_NAME", name: name });

// 转换成可调用的 actions
const actions = {
  increment() {
    return store.dispatch(increment());
  },
  setName() {
    return store.dispatch(setName("jack"));
  },
};

// 组件中调用
actions.increment();
actions.setName();
```

以上生成 `actions` 的过程，我们发现内部的方法结构都比较相似，于是我们将这个过程来优化一下

我们期望优化后使用的方式如下：

```js
const actions = bindActionCreators({ increment, setName }, store.dispatch);
actions.increment();
```

实现 `bindActionCreators`：

```js
const actionCreator = (creator: ActionCreator, dispatch: Dispatch) => {
  return function name() {
    return dispatch(creator.apply(this, arguments));
  };
};

const bindActionCreators = (
  actionCreators: ActionCreators,
  dispatch: Dispatch
) => {
  if (typeof actionCreators === "function") {
    return actionCreator(actionCreators, dispatch);
  }

  let boundActions: BoundActions = {};
  Object.keys(actionCreators).forEach((key) => {
    boundActions[key] = actionCreator(actionCreators[key], dispatch);
  });

  return boundActions;
};
```

总体上，这个过程还是比较简单的，只是将创建 `actions` 的过程给隐藏了起来

## 总结

以上基本是 `redux` 的主要内容，基本没有太难理解的东西，这里总结下项目中用到的比较核心的东西：

1. 发布订阅模式：总体的结构实际上就是在 `createStore` 中使用了发布订阅的模式
2. 闭包：此项目频繁使用到了闭包，闭包的灵活使用确实可以很巧妙的解决一些问题
3. `commose` 方法：项目中的一大亮点可以说是提供的一个 `compose` 函数，所谓的 `洋葱模型`可以是对这个函数模型的解析，实质上就是 **装饰者模式**，这个函数可以说是遵守 `函数式编程` 的极好体现，它可以运用于需要 `高阶函数`的地方，比如 `react` 的多个 `高阶组件` 的组合就可以使用这种方式

refer:

[完全理解 redux](https://github.com/brickspert/blog/issues/22)
