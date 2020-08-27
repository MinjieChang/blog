### vue nextTick 实现

我们知道vue的更新使用的异步的更新，vue为了性能考虑，在改变数据后不会立即更新页面，而是会在主线程任务执行完后，再执行更新操作。这个过程有点类似于js 的event loop。

有如下操作

```html
<template>
  <div>
    <span id="text">{{ message }}</span>
    <button @click="changeData">changeData</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: "hello",
    };
  },
  methods: {
    changeData() {
      this.message = "hello world";
      const textContent = document.getElementById("text").textContent;
      // 直接获取，不是最新的
      console.log(textContent === "hello world"); // false
			// $nextTick 回调中，是最新的
      this.$nextTick(() => {
        const textContent = document.getElementById("text").textContent;
        console.warn(textContent === "hello world"); // true
      });
    },
  },
};
</script>
```

所以，在修改数据后，页面中的数据并没有立即更新，但是我们可以在$nextTick中可以得到更新后的ui，那么它的异步更新是如何实现的？带着疑问，翻看一些vue的源码：

当一个 Data 更新时，会依次执行以下代码
1. 触发 Data.set
2. 调用 dep.notify
3. Dep 会遍历所有相关的 Watcher 执行 update 方法

```js
class Watcher {
  // 4. 执行更新操作
  update() {
    queueWatcher(this);
  }
  run(){
    // 更新dom操作
  }
}

const queue = [];

function queueWatcher(watcher: Watcher) {
  // 5. 将当前 Watcher 添加到异步队列
  queue.push(watcher);
  // 6. 执行异步队列，并传入回调
  nextTick(flushSchedulerQueue);
}

// 更新视图的具体方法
function flushSchedulerQueue() {
  let watcher, id;
  // 排序，先渲染父节点，再渲染子节点
  // 这样可以避免不必要的子节点渲染，如：父节点中 v-if 为 false 的子节点，就不用渲染了
  queue.sort((a, b) => a.id - b.id);
  // 遍历所有 Watcher 进行批量更新。
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index];
    // 更新 DOM
    watcher.run();
  }
}
```

我们发现实际上的更新是在flushSchedulerQueue这个方法中，这个方法被当作参数放入在 nextTick 方法中，实际上就是由nextTick来执行更新方法了，所以现在的关键就是看nextTick是如何做的

在看代码前，先简单给出它的实现思路：
- 使用一个队列，维护所有的要操作的方法(比如更新操作)
- 每一次修改数据只是往该数组中推入回调方法，而不是立即执行这些方法
- 在下次事件循环中再执行这个队列中的所有方法，避免阻塞主线程(下次事件循环可以是微任务，也可是宏任务)
- 每次执行完毕后，把任务队列清空

```js
let callbacks = []

let pending = false

let timerFun = null

let isUsingMicroTask = false

function run(){
  pending = false
  // 这里相当于一个浅拷贝
  let cbs = callbacks.slice(0)
  // 这里比较重要，会在每次执行完后，清空消息队列
  callbacks.length = 0
  cbs.forEach(cb => {
    cb()
  })
}

// 能力检测，做兼容处理
function getTimeFun() {

  let timerFun = null

  if(!!Promise && typeof Promise === 'function'){
    timerFun = () => {
      let p = Promise.resolve()
      p.then(run)
    }
    // 标记使用微任务
    isUsingMicroTask = true
  } else if (MutationObserver && typeof MutationObserver === 'function') {
    let counter = 1
    let mo = new MutationObserver(run)
    let node = document.createTextNode(String(counter))
    mo.observe(node, {
      characterData: true
    })
    timerFun = () => {
      counter = (counter + 1) % 2
      node.data = String(counter)
    }
    isUsingMicroTask = true
  }else if(typeof setImmediate !== 'undefined') {
    timerFun = () => setimmediate(run);
  }else{
    timerFun = () => setTimeout(run, 0);
  }
  return timerFun
}

function nextTick(cb, context) {
  let _resolve
  callbacks.push(() => {
    if(cb){
      cb.call(context)
    } else if(_resolve) {
      _resolve(context)
    }
  })
  // 第一次执行，由于pendding为false，进入条件判断
  if(!pending) {
    // 进入pending后，把条件置反，并且初始化 timerFun
    pending = true
    timerFun = timerFun || getTimeFun()
    // 进入pending状态，此时意味着把任务队列加入到微任务中
    timerFun()
  }
  if(!cb && Promise) {
    return new Promise((resolve) => {
      _resolve = resolve
    })
  }
}
```

我们来测试一下nextTick方法：

```js
const context = {
  name: 'hhhh'
}
let f1 = function () {
  console.log(this.name)
}
console.log('start')
nextTick(f1, context)
nextTick(f1, context)
nextTick(null, context).then(data => {
  console.log('最后执行')
})
nextTick(f1, context)
console.log('end')
```
执行结果： start、end、hhhh、hhhh、hhhh、最后执行

分析一下nextTick函数：

- 执行nextTick，会往callbacks中推入回调函数
- 第一次执行会有一个细节，此时pending变量是false，进入条件语句，会初始化timerFun，这个timerFun就是包含promise的一个函数，执行这个函数后，初始化一个promise，此时就往微任务队列中加入一个任务 run 函数，这个任务就是依次执行callbacks中的所有方法
- 执行 run 函数的时候，主要做了三件事
  - 把pending再次置为false，此次异步操作结束
  - 执行callbacks队列中的任务
  - 清空callbacks队列

### this.$nextTick

Vue把nextTick挂载在原型上，可供所有的组件使用：

```js
Vue.prototype.$nextTick = function (fn) {
  // this 就是fn执行绑定的组件实例
  nextTick(fn, this)
}
```

为什么使用this.$nextTick可以访问到更新后的ui？

这是由于我们调用了 this.$nextTick，把回调函数放到了任务队列的尾部，当所有的更新操作完成后，再执行我们的nextTick的回调，所以此次的ui已经是更新过的。
