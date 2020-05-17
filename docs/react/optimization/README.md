# react 性能优化

## 前言


关于react的性能优化是一个会经常被讨论到的问题，同时在面试中也会经常被问，现在我们来看看，为什么要进行性能优化，及有哪些可优化点

react的性能优化会有比较多的点，现在我们从**工程方面**和**代码层面**两个方面来看工程优化的点

## 代码方面

代码方面主要根据react的特性，通过改进一些代码的写法来提升渲染的效率

### 渲染机制
在了解优化之前，先看看react的渲染机制。react的渲染是框架通过调用render函数，render函数会在这几种情况下被调用

1、初始化

2、setState

调用此方法会触发render函数，框架采用diff算法进行virtualDom的比对，更新变更的部分。尽管react的diff算法性能优化已经做的很好，但是当比对的dom树结构很大，特别是在顶层组件进行更新时，对性能的损耗也是比较大的

3、父组件更新，子组件也被重新渲染

父组件的更新会导致其子组件也重新渲染，此时不论父组件传入子组件的prop是否发生变化，都会引起子组件的更新：

```
class App extends React.Component {
  state = {
    a: 1
  };

  render() {
    console.log("render");
    return (
      <React.Fragement>
        <p>{this.state.a}</p>
        <button
          onClick={() => {
            this.setState({ a: 1 }); // 这里并没有改变 a 的值
          }}
        >
          Click me
        </button>
        <button onClick={() => this.setState(null)}>setState null</button>
        <Child />
      </React.Fragement>
    );
  }
}
```

### 性能优化的点
从上面的分析中，我们可以看出可优化的主要是后面的两个点，据此再得出具体的实践方案

#### 慎用setState
有些地方，我们只是想更新下组件中保存的state值，并不想重新触发渲染，这时候可以选择重新给state赋值，而不是调用setState

```
// bad
this.setState({a: 'a'})
// good
this.state.a = 'a'
```

#### pureComponent
对于父组件更新引发子组件更新的问题，可以使用生命周期shouldComponentUpdate和PureComponent

```
class Child extends React.Component {
  shouldComponentUpdate(nextProps, nextState){
    if(xxx){
        return false
    }
    return true
  }
}

```
react提供的PureComponent可以来减少不必要的渲染

PureComponent的源码为：

```
if (this._compositeType === CompositeTypes.PureClass) {
  shouldUpdate = !shallowEqual(prevProps, nextProps) || ! shallowEqual(inst.state, nextState);
}
```
可以看到，在内部使用shallowEqual函数对新老props和state做了一层**浅对比**

**浅对比**(shallowEqual)，我们看一下他的浅对比是如何实现的

```
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * is 方法来判断两个值是否是相等的值，为何这么写可以移步 MDN 的文档
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
function is(x: mixed, y: mixed): boolean {
  if (x === y) {
    // 这么写是为了区分 +0 和 -0
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    // 由于NaN !== NaN
    // 这里这么写其实是判断NaN等于自身
    return x !== x && y !== y;
  }
}

function shallowEqual(objA: mixed, objB: mixed): boolean {
  // 首先对基本类型进行比较
  if (is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  // 长度不相等直接返回false
  if (keysA.length !== keysB.length) {
    return false;
  }

  // key相等的情况下，再去循环比较
  for (let i = 0; i < keysA.length; i++) {
    // 这里只是对对象的key进行了一层的比较
    if (
      !hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}
```
上面的函数对前后的值做一次浅比较，但是如果当对象的层级比较深，这个浅比较就无能为力了

```
let a = {
    name: 'jack',
    address: {
        city: 'wuhan'
    }
}
// 修改a内部的值
a.address.province = 'beijing'
// 使用浅比较
is(a, a)  // 返回true，此时不会触发react的更新
```

所以，pureRender虽然在一些条件下会节省性能，但是也有它的局限性。

上述的pureRender函数是用于类组件中，那对于函数组件有没有类似的实现方式？我们可以用**高阶组件**来实现

#### 高阶组件

所谓的高阶组件就是高阶函数，在一个函数内部返回另外一个函数，或者在一个函数内部返回另外一个类，关于高阶组件可以查看另外一篇文章[高阶组件](http://note.youdao.com/noteshare?id=995896c0294e288f4d79bed09dcb9b89)


下面我们实现一个高阶组件版的pureRender


```
import { shallowEqual } from 'react-redux';

// 定义一个基本组件
const Comp = (props) => <div>{props.name}</div>;

const High = (cb) => (BaseComponent) => {
  class ShouldComponentUpdate extends React.Component {
    shouldComponentUpdate(nextProps) {
      return cb(nextProps, this.props);
    }
    render() {
      return <BaseComponent {...this.props}></BaseComponent>;
    }
  }
  ShouldComponentUpdate.displayName = `Pure(${BaseComponent.displayName})`;
  return ShouldComponentUpdate;
};

const PureRender = (Component) => {
  const cb = (nextProps, oldProps) => shallowEqual(nextProps, oldProps);
  const Com = High(cb)(Component);
  return Com;
};

// 最后的用法
const PuredCom = PureRender(Comp);
```
#### 使用React.memo

React.memo 是react16.1新出的一个hooks api, 其实也是一个高阶组件，主要作用是缓存组件的渲染，避免不必要的更新

基本用法：

```
import { memo } from 'react';

function Button(props) {
  // Component code
}

export default memo(Button);
```
高级用法：

默认情况下，memo会对props做浅比较，这与pureComponentb比较类似，所以当props的层级较深，memo也无法捕捉到prpos深层的更新，导致组件不会重新渲染，所以此时需要我们手动判断props是否有修改，决定组件是否需要更新，memo提供的第二个参数可以做到这点

```
function arePropsEqual(prevProps, nextProps) {
  // your code
  return prevProps === nextProps;
}

export default memo(Button, arePropsEqual);
```
需要注意的是，与pureRender不同的是，当arePropsEqual返回false的时候，会触发render,返回true的时候不会触发render, 这点和pureRender正好相反。

#### 长列表渲染

对于列表组件，在数据量大的情况下，如果一次将所有的数据展示出来，每条数据对应生成一个dom元素，这必然是i个很耗时的过程。

当然这种场景通常可以使用分页来做。但是如果使用场景是无限下拉的情况，这时候我们就需要将数据**分段展示**

实现思路就是，只把出现在页面视口中的元素展示出来。每次只展示部分的数据，这样可以有效提升页面渲染效率


#### 其他优化点
 
> 1、合理拆分组件

微服务的核心思想是，以更轻、更小的粒度来纵向拆分应用，各个小应用可以独立选择技术、开发、部署。我们在开发组件的过程中也可以用到类似的思想。试想，当一个页面中只有一个组件的时候，无论哪处改动都会触发整个页面的重新渲染。**在对组件拆分之后，render的粒度会更加精细，性能也能得到一定的提升。**

> 2、慎用props

props尽量只传组件使用到的数据，避免多余的更新
```
// bad
<Component {...props}></Component>
```
当然，对于一些公共类库的组件，我们不知道外界在使用的时候会传入什么样的数据，就需要使用这种方式，将外界的数据再传入到内部组件中


> 3、bind函数优化

绑定元素事件，通常有三种方式

1、constructor绑定
```
constructor(){
    // 定义
    this.bindEvent = this.bindEvent.bind(this);
}

// 定义函数
bindEvent(){}
// 使用
<p onClick = {this.bindEvent}></p>
```

2、使用时绑定

```
<p onClick = {this.bindEvent.bind(this)}></p>
```

3、使用箭头函数

```
// 定义事件
bindEvent = () => {}
// 使用
<p onClick = {this.bindEvent}></p>
```
以上三种方式，第一种只在初始化的时候生成一次，第二种每次渲染都要重新生成一个函数，第三种也是定义一个函数，重新渲染的时候不会重新生成函数

比较发现，第一第三种方式较好，在语法上第三种写起来更加简洁



## 工程方面

工程方面，通过webpack提供的代码分割(code Spliting)、组件懒加载等方式，来把运用从单个bundle拆分为单个bundle + 多份动态代码的方式

### 代码懒加载
webpack提供三种代码分割方式：
1. 入口起点：配置entry入口
2. 防止重复：使用splitChunks去重和分离chunk
3. 动态导入：使用模块的内联函数调用如import() 函数

我们主要了解下动态导入的方式：

> 使用动态导入的方式

我们可以将如下导入方式
```
import { add } from './math'
add()
```
改成import的形式，从而在初次加载时不去加载math模块，减少首次加载资源的体积
```
import('./math').then(math => {
    math.add()
})
```
> 组件使用懒加载的方式

使用react提供的高阶组件react-loadable来动态加载组件


```
import Loadable from 'react-loadable';
import Loading from './loading-component';

const LoadableComponent = Loadable({
  loader: () => import('./my-component'),
  loading: Loading,
});

export default class App extends React.Component {
  render() {
    return <LoadableComponent/>;
  }
}
```
### 服务端渲染

采用服务端渲染端方式，可以使用户更快的看到渲染完成的页面，可以参考
[ReactDomServer](https://note.youdao.com/)

服务端渲染，需要起一个node服务，可以使用express、koa等，调用react的renderToString方法，将根组件渲染成字符串，再输出到response

```
// using Express

import { renderToString } from "react-dom/server";
import MyPage from "./MyPage";
app.get("/", (req, res) => {
  res.write("<!DOCTYPE html><html><head><title>My Page</title></head><body>");
  res.write("<div id='content'>");  
  res.write(renderToString(<MyPage/>));
  res.write("</div></body></html>");
  res.end();
});
```

客户端使用render方法来生成HTML

```
import ReactDOM from 'react-dom';
import MyPage from "./MyPage";
ReactDOM.render(<MyPage />, document.getElementById('app'));
```


后续服务端渲染单独写一个

#### 总结

在这篇文章中，我们主要通过代码和前端工程这两个方面来做react的性能优化。代码方面主要是梳理平时react的书写技巧：
1. 减少不必要的setState
2. 减少无用props的传递
3. 类组件可以使用shouldComponentUpdate或pureComponent，函数组件可以结合react.memo或着高阶组件等方式控制组件的更新
4. 合理拆分组件

工程方面，通过组件的懒加载、分bundle打包等方式来减少main bundle体积，减少首次请求的资源体积，另外，对于seo要求较高的应用，可以采用服务端渲染的方式