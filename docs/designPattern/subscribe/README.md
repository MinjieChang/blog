## 发布订阅模式

### 实际遇到的问题
当涉及到多个模块之间需要进行通信，我们通常会想到把一个模块引入到另一个模块中，然后把a模块的消息发送给b

例如，我们的系统中有个登陆模块，有菜单模块，当用户登陆成功后，需要刷新一下菜单模块，通常我们会这么做

```js
login().then((data)=>{
    nvaiMenu.refresh()
})
```
假如，又来个新的购物车模块，要求在用户登陆成功后，还要再刷新用户购物车信息，此时我们需要代码如下

```js
login().then((data) => {
    nvaiMenu.refresh()
    shoppingCar.refresh()
})
```
如此，随着业务的增长，这块的代码将会陷入无尽的修改中。。。。。

其实，我们分析导致这个问题的原因，就是将多个业务逻辑强耦合，没有分离出可变不可变部分。在这里，用户登陆系统是不可变的部分，而登陆后要做的其他的操作就是可变部分。假如我们把这些其他的业务逻辑从登陆回调中抽离出来，那么这里的代码就会变得平静很多，所谓的岁月静好莫过如此。

那么如何将这些可变部分抽来出来，这就需要我们的发布订阅模式登场了

### 何为发布订阅模式
认识这个模式前，我们先看一个现实中的例子

假如小明想买房子，他肯定不会是每隔一段时间就去售楼处去问什么时候会开盘，而是把自己的手机号先在售楼处登记，然后等售楼处给自己打电话

等到售楼处有新盘开的时候，售楼处的销售员会翻开登记客户信息的花名册，通知每个客户就可以了

从这个例子中，我们可以看到两个参与对象(售楼处和小明)和一个事件(打电话告知楼盘信息)

联系发布订阅模式，售楼处扮演的是消息发布者，小明等众多购房者扮演的是订阅者。

### 发布订阅模式的模型
在js中通常使用事件模型来表示一个发布订阅模式

我们实现一个基本的事件模型


```js
const shift = Array.prototype.shift;

const each = function(agrs, cb){
  for (let index = 0; index < agrs.length; index++) {
    const fn = agrs[index];
    cb.call(fn, fn, index)
  }
}

// 事件对象
var Event = (function(){
  let caches = {};
  const addEventListerner = function(key, fn){
    if(!caches[key]) {
      caches[key] = [];
    }
    caches[key].push(fn)
  }

  const trigger = function(){
    const key = shift.call(arguments)
    const args = shift.call(arguments)
    if(caches[key] && caches[key].length){
      // 循环执行
      each(caches[key], function(fn, index){
        fn(args)
      })
    }
  }

  const removeEventListener = function(key, fn){
    const fns = caches[key]
    if (fn) {
      for (var i = fns.length; i >= 0; i--) {
        if (fns[i] === fn) {
          fns.splice(i, 1);
        }
      }
    } else {
      cache[key] = [];
    }
  }


  return {
    trigger,
    addEventListerner,
    removeEventListener
  };
})()
```

上面是个初版的事件模型，定义了三个方法：  
> **addEventListerner**: 添加事件监听到缓存对象中  
**trigger**：事件触发器，使用此方法触发添加的监听事件  
**removeEventListener**：移除监听事件


### 使用发布订阅解决问题
以上是一个通用的事件模型，后面会继续完善这个模型，现在我们看看如何用这个模型来改造我们开始时候遇到的问题

> 改造登陆模块

```js
// 在购物车业务模块中监听登陆事件
Event.addEventListener('login', () => {
    console.log('登陆成功了，刷新购物车')
})

// 登陆模块中发布登陆事件
login().then((data)=>{
    Event.trigger('login')
})

```
现在就把登陆成功事件和各个业务模块给分离开了，假如导航栏在用户登陆成功后也需要刷新，此时只需要在导航模块中添加监听登陆即可：

```js
// 在导航业务模块中监听登陆事件
Event.addEventListener('login', () => {
    console.log('登陆成功了，需要刷新导航栏')
})
```


> 改造楼盘给购房者发布消息业务


```js
购房者有不同房屋面积的购买需求，所以售楼处会收集这些购房者的信息，当对应的房屋面积的价格有消息后，就推送价格信息给这些对应的购房者：

// 要购买100平以上的面积的
Event.addEventListener('large100', (price) => {
    console.log('100平的房屋的价格是：'， price)
})

// 要购买200平以上的面积的
Event.addEventListener('large200', (price) => {
    console.log('200平的房屋的价格是：'， price)
})

// 发布楼盘价格信息
Event.trigger('large100', 12000)
Event.trigger('large200', 10000)

```

小总结，通过上面的两个例子，我们发现发布订阅模式主要解决的是一对多的问题

### 进一步完善该模式

上面的事件模型还存在两个问题

##### 问题一

缺少命名空间，当项目规模变大后，监听的事件名称很容易发生冲突，这时候需要使用一个命名空间来区分不同的模块


##### 问题二
上面的事件模型还存在一个问题，我们只能先监听事件，然后才能再发布事件。但是在一些常见下，我们的监听事件还并没有执行，但是事件却已经发布了，这就导致消息会像消失在宇宙中一样，再也找不回了。

比如，在异步加载的场景下，如果购物车模块的加载速度后于用户登陆模块加载，那么在用户登陆成功后，并不会触发购物车模块的更新

所以我们需要一种事件模型，使之支持先发布后监听的场景，此种模型支持如下的使用方式：

```js
// 先触发
Event.trigger('signal', 'value')

// 再监听
Event.addEventListener(‘signal’, (value) => {})
```

可见，我们需要给trigger事件添加一个缓存机制，当发布的事件并没有添加监听的时候，需要将该事件缓存起来，当消息被添加监听的时候，先去缓存中查找有无缓存消息，如果有缓存消息，先执行，**然后再将缓存清除**(z注意缓存消息只能被执行一次)，没有的话，就走正常的流程即可。


最终的发布订阅模式如下：

```js
var Event = (function() {
  var global = this,
    Event,
    _default = 'default';

  Event = (function() {
    var _listen,
      _trigger,
      _remove,
      _slice = Array.prototype.slice,
      _shift = Array.prototype.shift,
      _unshift = Array.prototype.unshift,
      namespaceCache = {},
      _create,
      find,
      each = function(ary, fn) {
        var ret;
        for (var i = 0, l = ary.length; i < l; i++) {
          var n = ary[i];
          ret = fn.call(n, i, n);
        }
        return ret;
      };

    _listen = function(key, fn, cache) {
      if (!cache[key]) {
        cache[key] = [];
      }
      cache[key].push(fn);
    };

    _remove = function(key, cache, fn) {
      if (cache[key]) {
        if (fn) {
          for (var i = cache[key].length; i >= 0; i--) {
            if (cache[key][i] === fn) {
              cache[key].splice(i, 1);
            }
          }
        } else {
          cache[key] = [];
        }
      }
    };

    _trigger = function() {
      var cache = _shift.call(arguments),
        key = _shift.call(arguments),
        args = arguments,
        _self = this,
        ret,
        stack = cache[key];

      if (!stack || !stack.length) {
        return;
      }

      return each(stack, function() {
        return this.apply(_self, args);
      });
    };

    /**
     * 这个方法是关键，为每个发布订阅过程创建一个事件模型，并缓存起来
     * 一个项目中，可能会存在多个事件对象
     */
    _create = function(namespace) {
      var namespace = namespace || _default;
      var cache = {},
        offlineStack = [], // 离线事件
        ret = {
          listen: function(key, fn, last) {
            // 执行listen，先将事件添加到事件缓存中
            _listen(key, fn, cache);
            if (offlineStack === null) {
              return;
            }
            // 判断是否有离线事件缓存，就是判断是否先执行到trigger事件
            if (last === 'last') {
              offlineStack.length && offlineStack.pop()();
            } else {
              each(offlineStack, function() {
                this();
              });
            }
            // 离线事件执行完后，将离线事件清除，进入正常执行流程
            offlineStack = null;
          },
          one: function(key, fn, last) {
            _remove(key, cache);
            this.listen(key, fn, last);
          },
          remove: function(key, fn) {
            _remove(key, cache, fn);
          },
          trigger: function() {
            var fn,
              args,
              _self = this;
            // 把事件缓存添加到arguments头部
            _unshift.call(arguments, cache);
            args = arguments;
            fn = function() {
              return _trigger.apply(_self, args);
            };
            /**
             * 这里会判断，如果当前是离线状态，就将事件放入离线缓存队列中
             * 否则就执行对应监听的缓存队列中的事件
             */
            if (offlineStack) {
              return offlineStack.push(fn);
            }
            return fn();
          },
        };

      /**
       * 单例模式
       * 如果有namespace，则返回缓存中的对象
       * 没有namespace，就创建一个新的ret
       * 相当于在这里会给每个namespace创建一个发布监听实例对象
       */
      return namespace
        ? namespaceCache[namespace]
          ? namespaceCache[namespace]
          : (namespaceCache[namespace] = ret)
        : ret;
    };

    /**
     * 代理模式
     */
    return {
      create: _create,
      one: function(key, fn, last) {
        var event = this.create();
        event.one(key, fn, last);
      },
      remove: function(key, fn) {
        var event = this.create();
        event.remove(key, fn);
      },
      listen: function(key, fn, last) {
        var event = this.create();
        event.listen(key, fn, last);
      },
      trigger: function() {
        var event = this.create();
        event.trigger.apply(this, arguments);
      },
    };
  })();

  return Event;
})();

```


### 发布订阅模式的问题

发布订阅模式在解决一对多的问题中可以起到解耦业务模块的作用，比如redux/vuex使用的即是这种模式。但是这种模式也会带来一定的成本：

- 创建事件模型对象会消耗一定的内存
- 订阅过的消息并不一定会被触发，导致订阅的消息一直存在内存中
- 模块之间的消息通信被隐藏在事件模型背后，弱化模块之间的联系，导致后来会弄不清消息来自哪个模块、消息又会流向哪些模块，增加维护难度和调试难度

### 总结
发布订阅模式的有点还是非常明显的，可以帮助我们实现时间上的解耦和对象之间的解耦。在异步编程中的消息广播运用广泛。它主要是为解决一对多消息发送的问题。当然带来便利性的同时也会带来一些问题，这需要我们的综合把控。

虽然现在发布订阅模式比较少会直接在项目中使用，更多的会被封装在一些框架背后，但是其中的一些设计思路还是值得我们学习。比如在其中就使用到了代理模式和单利模式。