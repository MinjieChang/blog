# 前端路由切换

## 背景

最近在公司项目迁移的过程中，进行微前端架构的调整，把原有的老项目改造成一个微前端的子项目，嵌入到微前端的基座项目中。但是在改造过程中发现了如下这个问题：

- 点击基座项目中的菜单进行路由切换，发现 url 可以切换成功，但是子组件中的页面却无法切换

这个问题的直观原因是，由于路由切换发生在基座运用，但是子运用未监听到路由的切换导致。

那么为什么子运用没有监听到路由的切换呢？这里需要关注的问题主要有两个

- 主运用的路由切换方式
- 子运用监听路由的方式

## 前端路由跳转

在传统的多页运用中，前端路由跳转意味着向服务器请求当前路由下的页面；对于单页面运用而言，浏览器不会重新请求页面，页面的切换实际上就是组件的切换

单页面应用项目的情况下，当前前端路由跳转的方式主要有两种，`hash` 和 `history` 方式

### hash

`hash` 方式是通过修改 上的 `hash` 值，再通过监听 `hash` 路由的更改，更新渲染匹配的页面

```js
// url: www.xxx.com/#/a/b
// 修改hash
location.hash = "xxxx";

// 监听hash
window.addEventListener("hashchange", () => {
  const url = location.hash.split(1);
  // 通过 route 匹配渲染对应的组件，这里不再展开
});
```

这种方式的特点是：

- 实现比较简单，直接使用浏览器提供的两个 api 即可，无需太多的包装
- 浏览器刷新只请求根页面，hash 值后面的路径不会携带上，因此这种方式无需服务端支持，非常友好
- 美中不足的是 url 上会携带一个 **#**，部分人会觉得这样不是很美观，实际我认为不影响，实用为本

### history

`html5` 提供了新的 `history api`，这些 `api` 也实现了改变 `url` 的情况下无需刷新页面，例如 `pushState`方法

```js
// url: www.xxx.com/a/b
// 改变url
history.pushState(state, title, url);
// 监听url改变
window.addEventListener("popstate", () => {});
```

但是这里需要注意的是，`popstate` 方法只在如下几种方式下才会被触发：

- 点击浏览器的前进后退按钮
- 调用 `history` 的 `go、forward、back` 等方法，实际上这三个 api 就类似前进和后退按钮

但是在调用 **pushState**只能修改 url，却无法触发 `popstate` 方法的监听。那如何监听 `pushState` 实现页面的切换呢？

这里结合 **react-router** 和 **vue-router** 基于 `pushState`实现页面切换来简单分析一下，这部分虽不是本文重点，但是也有助于我们来理解 `history` api 的使用

#### react-router history 方式

react-router 提供了 `BrowserRouter`组件，也是基于 `history 的 pushState`方式，其实现逻辑大致如下：

1、基于发布订阅的方式，`react-router`实现了一个`history`库，在`BrowserRouter`组件内往`history`中添加订阅者，并将自身的更新方法作为订阅回调，当`history`中的 url 被改变的情况下，再执行这些订阅回调，实现组件的重新渲染

```js
// 添加订阅者
export function BrowserRouter({
  basename,
  children,
  window
}: BrowserRouterProps) {
  let historyRef = React.useRef<BrowserHistory>();
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({ window });
  }

  let history = historyRef.current;
  let [state, setState] = React.useState({
    action: history.action,
    location: history.location
  });

  React.useLayoutEffect(() => history.listen(setState), [history]);

  return (
    <Router
      basename={basename}
      children={children}
      location={state.location}
      navigationType={state.action}
      navigator={history}
    />
  );
}
```

源码[查看这里](https://github.com/remix-run/react-router/blob/main/packages/react-router-dom/index.tsx)

核心代码是这句：

```js
React.useLayoutEffect(() => history.listen(setState), [history]);
```

通过 `history.listen`添加订阅者，并把 `setState`作为回调传入

2、看看 `history.listen` 干了什么

```js
var listeners = [];
function appendListener(fn) {
  var isActive = true;
  function listener() {
    if (isActive) fn.apply(void 0, arguments);
  }
  listeners.push(listener);
  return function () {
    isActive = false;
    listeners = listeners.filter(function (item) {
      return item !== listener;
    });
  };
}
```

这里核心是往 `listeners` 中添加订阅者

3、`history` 提供 `push`api 给用户调用，更改 url，并通知订阅者

```js
function push(path, state) {
  var action = "PUSH";
  var location = createLocation(path, state, createKey(), history.location);
  transitionManager.confirmTransitionTo(
    location,
    action,
    getUserConfirmation,
    function (ok) {
      if (!ok) return;
      var href = createHref(location);
      var key = location.key,
        state = location.state;

      if (canUseHistory) {
        // 更新url
        globalHistory.pushState(
          {
            key: key,
            state: state,
          },
          null,
          href
        );

        if (forceRefresh) {
          window.location.href = href;
        } else {
          var prevIndex = allKeys.indexOf(history.location.key);
          var nextKeys = allKeys.slice(0, prevIndex + 1);
          nextKeys.push(location.key);
          allKeys = nextKeys;
          // 通知订阅者
          setState({
            action: action,
            location: location,
          });
        }
      } else {
        window.location.href = href;
      }
    }
  );
}
// 通知订阅者
function setState(nextState) {
  transitionManager.notifyListeners(history.location, history.action);
}
```

通过 `transitionManager.notifyListeners()`方法通知订阅者，执行订阅者的回调，触法 `Router`重新渲染，更新页面

#### vue-router history 方式

`vue-router`利用双向绑定数据驱动视图的方式，他的处理方式大概是

1. `vue-router` 在顶层提供了 router 对象，router 上使用 current 属性保存当前 url，并使用 `_Vue.observable` 绑定对 router 属性的监听，最后通过 mixin 的方式，将 `router` 下发到各个子组件中
2. 注册 `router-link`组件，在监听点击跳转的方法中修改 `router.current`
3. 注册 `router-view`组件，通过 `router.current`在保存的 routerMap 中找到对应的组件渲染
4. 在 router.current 被修改后，会重新触发 `router-view`的渲染，实现组件的切换

基本代码逻辑如下：

```js
// 存储全局使用的Vue对象
let _Vue = null;
class VueRouter {
  // vue.use要求plugin具备一个install方法
  static install(Vue) {
    // 判断插件是否已经安装过
    if (VueRouter.install.installed) {
      return;
    }
    VueRouter.install.installed = true;
    _Vue = Vue;

    // 将main文件中实例化Vue对象时传入的router对象添加到Vue的原型链上。
    _Vue.mixin({
      beforeCreate() {
        if (this.$options.router) {
          _Vue.prototype.$router = this.$options.router;
        }
      },
    });
  }

  constructor(options) {
    this.options = options;
    // 用于快速查找route
    this.routeMap = {};
    this.data = _Vue.observable({
      current: window.location.hash.substr(1),
    });
    this.init();
  }

  init() {
    this.createRouteMap();
    this.initComponents(_Vue);
    this.initEvent();
  }

  createRouteMap() {
    // 遍历所有的路由规则 吧路由规则解析成键值对的形式存储到routeMap中
    this.options.routes.forEach((route) => {
      this.routeMap[route.path] = route.component;
    });
  }

  initComponents(Vue) {
    // 注册router-link组件
    Vue.component("router-link", {
      props: {
        to: String,
      },
      methods: {
        clickHandler(e) {
          // 修改hash
          location.hash = this.to;
          // 修改current，触发视图更新
          this.$router.data.current = this.to;
          e.preventDefault();
        },
      },
      render(h) {
        return h(
          "a",
          {
            attrs: {
              href: this.to,
            },
            on: {
              click: this.clickHandler,
            },
          },
          [this.$slots.default]
        );
      },
    });
    const that = this;
    // 注册router-view插件
    Vue.component("router-view", {
      render(h) {
        const component = that.routeMap[that.data.current];
        return h(component);
      },
    });
  }

  initEvent() {
    // 在hash发生更改的时候，修改current属性，触发组件更新
    window.addEventListener("hashchange", () => {
      this.data.current = window.location.hash.substr(1);
    });
  }
}
```

### 言归正传

上边说的比较多，主要是为弄清楚不同框架的组件切换的方式，方便我们来分析我们遇到的问题。

在我们的项目中，几乎全部子组建使用的 `hash router`的方式，所以子组建理当是通过 `window.addEventlistener('hashchange')`的方式

但是在基座项目中，由于基座项目使用的是 `vue-router`，所以使用的 `pushState`方式来切换 url，所以在我们的子项目中无法通过监听 `hash`或者 `popstate`来实现页面的切换，

那么如何才能触发子组建的 `hash`监听生效呢？没错，这里通过重写 `pushState`方法来强制 `hashchange` 生效

#### 方式一：

重写 `history.pushState/replaceState` 使其在执行后触发一个自定义事件，我们通过监听这个自定义事件来接收视图变化通知

```js
// 重写方法
const _wr = (type) => {
  const origin = history[type];
  return function () {
    const event = new Event(type);
    event.arguments = arguments;
    window.dispatchEvent(event);
    return origin.apply(this, arguments);
  };
};
//重写方法
history.pushState = _wr("pushState");
history.replaceState = _wr("replaceState");
//实现监听
window.addEventListener("replaceState", function (e) {
  // xxx
});
window.addEventListener("pushState", function (e) {
  // xxx
});
```

#### 方式二：

上面的方式固然可行，只不过还需要我们再手动监听 `window` 抛出的方法，然后再自己实现组件的切换，或者强制触发组建的更新，还不是很方便。

这里我们尝试强制触发子组建 `hashchange`生效的方法

```js
const hook = (target, name, before, after) => {
  if (!target) return;
  const origin = target[name];
  target[name] = (...args) => {
    try {
      before && before(...args);
    } catch (e) {
      console.log(e);
    }
    const result = origin.call(target, ...args);
    try {
      after && after(...args);
    } catch (e) {
      console.log(e);
    }
    return result;
  };
  return () => {
    target[name] = origin;
  };
};
hook(window.history, "pushState", null, (state, _, url) => {
  if (url.indexOf("?") > -1) {
    window.location.replace(url + `&_k=${Date.now()}`);
  } else {
    window.location.replace(url + `?_k=${Date.now()}`);
  }
});
```

这里也是通过重写了 `pushState`方法，在原 `pushState`执行更新 url 后，再使用 `window.location.replace(url + `&\_k=${Date.now()}`);`方法替换当前url，并在url后添加 `?_k=${Date.now()}`，这样的目的是，使用新的带_k参数的url替换掉旧的url，强制修改了当前页面的hash，这就相当于使用了 `location.hash = url + `?_k=${Date.now()}`，如此便能触发子运用的 `hashchang`事件，从而实现组件的切换

## 总结

上面我们主要分析了这么几点

1. 当前 url 切换的方式，主要有两种，`hash` 和 `history` 方式
2. 基于当前前端 url 切换的方式，主流的前端框架都是如何实现页面切换的，当然这里只分析了 `history` 的方式，实际上 `hash` 的方式比这个更加简单，只需监听 `hashchange`即可，无需使用发布订阅等方式绕太多。
3. 最终我们结合项目情况，通过重写 `pushState`的方式，来触发子组件的监听方法生效。

从一个问题实际上可以引出了多个问题，弄清楚了问题的本质，实际上问题本身也就比较好解决了。

refer：

[如何监听 URL 的变化](https://juejin.cn/post/6844903749421367303)
