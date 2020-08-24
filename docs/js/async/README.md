## async await 机制

异步逻辑的处理一直是前端届老生常谈的问题，从回调函数到事件监听到es6的promise、generator，再到最后的异步解决方案终结者async、await，现在我们一步步解开async、await的魔法

在做异步请求时，我们通常用async await的方式，很神奇的可以将异步转为同步的写法:

```js
function fetchData(params) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(2);
    }, 100)
  })
}

async function getData(params) {
  console.log('start');
  let d = await fetchData();
  console.log(d);
  console.log('end');
  return 'getData end'
}
getData().then(val => console.log(val))
```
打印结果依次是：start 2 end getData end

从这个例子，我们发现，在async函数内部，代码是一行一行执行的(同步执行)，然后async函数会返回一个promise对象，并把最后的返回值作为此promise的resolve结果的值。

那么这种异步转同步的方式如何实现，我们如何来模拟实现这样一个async的功能的函数？

其实在，async之前，es6也推出了generator函数来辅助异步的操作，通过generator函数的控制流的方式，调用者可以决定何时让函数向下执行，先看一下generator如何使用：

```js
function fetchData(params) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(2);
    }, 100)
  })
}

function *gen(params) {
  console.log('start');
  let a = yield 1;
  console.log(a);
  let b = yield fetchData();
  console.log(b);
  let c = yield 3;
  console.log(c);
  console.log('end');
  return 'getData end'
}
```

执行gen会返回一个迭代器

```js
let g = gen()
```

执行迭代器的next方法，控制函数向下执行，每次执行会返回一个对象，包含value属性和done属性，其中value属性的值是yield语句后面的返回值，done属性表示该generator函数是否执行完毕，值为true或false

```js
// 第一次执行next，执行的结果是打印一下 start 然后返回 {value: 1, done: false}
let first = g.next()
```

需要注意的是，第一次执行g.next()方法，虽然返回了 {value: 1, done: false}，但是并没有将此返回值赋值给first变量。而是函数停止等号的右边，把执行的控制权交给了函数外部，直到下次执行next方法，才会继续回到函数内部继续向下执行，直到遇到了下个yield语句，依次类推。

现在我们再次执行next

```js
let second = g.next() 
// 此时走到了这里 yield fetchData(); 返回的结果是 {value: Promise, done: false} 并赋值给 second
```

此时执行了console.log(a)这条语句了，但是打印出来的确实undefined，why？这是由于只有在下次执行next方法传入的参数才会赋值给变量a，而此时我们什么也没有传入，如果我们这样执行next：

```js
let second = g.next('赋值给a的值')
```

那么此时打印的a的值就是'赋值给a的值'，那如果我想把上个yield的结果赋值给a呢？很简单，这样做：

```js
let second = g.next(first.value)
```

还没完，再执行一下yield，但是由于上次yield的value是个promise，我们需要等他的状态resolve后拿到了它的结果了再执行下次的yield，这样才能把结果传给b

```js
second.value.then(data => {
  let third = g.next(data)
  // 此时data的值是2，执行 g.next(data)，把值赋值给了b，所以打印出来的就是2

  // 执行了g.next(data)现在来到了执行 yield 3，返回 {value: 3, done: false}，
  // 所以 third的值就是 {value: 3, done: false}
})
```

那么如果我下次执行next，这就比较麻烦了，因为我要拿到 third 的值，难道我要接着在上次在then内部执行？

```js
second.value.then(data => {
  let third = g.next(data) // 执行到这里来到了 yield 3 返回 {value: 3, done: false}

  let four = g.next(third.value)
  // 此时 third.value 的值是3 赋值给了 c，打印的c的值就是 3
  // 执行 g.next(third.value)，返回的结果是 {value: 'getData end', done: true} 由于后面没有了yield语句，所以done的值就是true，表示执行结束，并把最终返回值赋值给了value属性
})
```

实际上确实要这样做，但是和之前的yild后面返回的同步的值的做法就不一致了，那么如何才能保持同步的和异步的执行next过程保持一致呢？

为了达到一致的效果，我们可以把每次执行yild返回值的value属性的值使用promise包装一下，就是value的值实际是就转换成promise对象了，这样每次调用next方法就是这样的方式：

```js
let first = g.next()
Promise.resolve(first.value).then(data => {
  let second = g.next(data)
  Promise.resolve(second.value).then(data => {
    let third = g.next(data)
    Promise.resolve(third.value).then(data => {
      let four = g.next(data)
      ...
      // 过程如何停止呢？ 就是判断done属性是否为true了
    })
  })
})
```

这个看起来像callback hell的东西其实可以看成是generator函数的控制流过程。这个东西看着是不是相当熟悉？是的，之前我们在分析koa2的中间件的compose函数实际上跟这个过程很类似，只不过这里的g.next方法是自动执行的，而compose中的next中间件是交给用户手动执行的

那么现在我们要做的就是，实现一个函数来自动执行generator函数，我们想达到类似async函数一样的效果：

```js
function runGenerator(genFn){
}

let fn = runGenerator(gen)

fn().then((result) => {})
```

runGenerator函数接收一个generator函数，执行完会返回一个新的函数，这个新函数会返回一个promise对象，以接收generator函数最终的返回值

分析到现在，现在要实现这个函数就是比较容易的事情了：

```js
function runGenerator(generatorFn){
  return function(){
    return new Promise((resolve, reject) => {
      let g = generatorFn.call(this, ...arguments)
      function walk(data){
        let result = g.next(data);
        if(result.done){
          // 如果执行完毕，则返回
          return resolve(result.value)
        } else {
          return Promise.resolve(result.value).then(data => {
            walk(data)
          })
        }
      }
      walk()
    })
  }
}
```

简单分析一下这个函数，主要在内部使用了递归，判断done属性，如果执行完就返回最终的结果，否则就使用Promise.resolve包装一下result.value，并在then回调中再次执行next的过程。

现在我们来测试一下这个函数：

```js
function *gen(params) {
  console.log('start');
  let a = yield 1;
  console.log(a, 'a======');
  let b = yield fetchData();
  console.log(b, 'b======');
  let c = yield 3;
  console.log(c, 'c======');
  let d = yield fetchData();
  console.log(d, 'd======');
  console.log('end');
  return 'getData end'
}

let fn = runGenerator(gen)
fn().then((data) => {
  console.log(data, 'data========')
})
```

打印的结果依次是：start、1、2、3、2、end、getData end，很棒。

其实这里还有点小瑕疵，就是没有处理错误的情况，比如执行yield语句抛错了，现在完善一下：

```js
function runGenerator(generatorFn){
  return function(){
    return new Promise((resolve, reject) => {
      let g = generatorFn.call(this, ...arguments)
      function walk(data,type){
        let result = {}
        try {
          result = g[type](data); // type 有两种 next 和 throw
        } catch (error) {
          // 碰到 g.next() 报错或者g.throw() 执行，会走到catch，将错误抛出
          return reject(error)
        }
        if(result.done){
          // 如果执行完毕，则返回
          return resolve(result.value)
        } else {
          return Promise.resolve(result.value).then(data => {
            walk(data, 'next')
          }).catch(error => {
            // 异步的结果报错 执行g.throw(error)
            walk(error, 'throw')
          })
        }
      }
      walk(null, 'next')
    })
  }
}
```

## async

有了上面的对generator的认识，现在就来解答下async是什么，它和generator是什么关系？

到现在可以发现，我们实现的generator自执行函数runGenerator，它其实更像是个民间低配版本的async awat

熟悉async await应该知道，await执行结果返回的结果是promise，async函数执行最后返回的也是个promise函数

而我们的runGenerator已经完全满足了这个特性。只不过await 只接收返回resolve结果的promise，否则报错，而我们的函数会捕获yield报错语句，并将错误结果抛出。

所以，为什么说async函数只是promise的语法糖，它的底层实际使用的是generator + promise 的实现。实际上，在babel编译async函数的时候，也会转化成generatora函数，并使用自动执行器来执行它。

## generator 机制

现在我们明白了async是怎么回事了，它底层实际是基于generator的，但是这里又有个问题了，为什么每次使用yield，在generator内部使用都能知道执行到哪一步了呢？我们从一个例子来简单的了解一下

```js
function *gen(){
  yield 1;
  yield 2;
  yield 3;
}
let g = gen()
console.log(g.next().value) // 1
console.log(g.next().value) // 2
console.log(g.next().value) // 3
console.log(g.next().value) // undefined
```

实际上，babel在编译这个函数的时候主要是做了两个事情：

- 切割generator函数的yield代码
- 生成一个变量用以保存generator函数的执行状态
- 生成一个invoke方法，并绑定next方法，这个过程相当于创建了一个迭代器

首先，切割generator函数，切割后的会如下：

```js
// 生成器函数根据yield语句将代码分割为switch-case块，后续通过切换_context.prev和_context.next来分别执行各个case
function gen$(_context) {
  while (1) {
    switch (_context.prev = _context.next) {
      case 0:
        _context.next = 2;
        return 'result1';

      case 2:
        _context.next = 4;
        return 'result2';

      case 4:
        _context.next = 6;
        return 'result3';

      case 6:
      case "end":
        return _context.stop();
    }
  }
}
```

然后，创建一个context变量：

```js
var context = {
  next:0,
  prev: 0,
  done: false,
  stop: function stop () {
    this.done = true
  }
}
```

最后，创建一个invoke函数：

```js
let gen = function() {
  return {
    next: function() {
      value = context.done ? undefined: gen$(context)
      done = context.done
      return {
        value,
        done
      }
    }
  }
}
```

测试一下

```js
var g = gen()
g.next()  // {value: "result1", done: false}
g.next()  // {value: "result2", done: false}
g.next()  // {value: "result3", done: false}
g.next()  // {value: undefined, done: true}
```

这段代码不难理解，分析一下它的调用过程：
- 调用gen()，返回g对象，包含next属性
- 调用g.next()，会判断一下context的done属性，如果done为false，会执行一下gen$(context)，
- gen$(context)是个switch语句，根据context.prev值执行对应的case语句，并把结果返回，如果执行到最后没有yield语句，会把done属性置为true；
- 最终g.next()方法返回一个对象，包含value属性和done属性，这个value属性值就是gen$(context)返回值，done属性值就是context的done属性值。

从中我们可以看出，`「Generator实现的核心在于上下文的保存，函数并没有真的被挂起，每一次yield，其实都执行了一遍传入的生成器函数，只是在这个过程中间用了一个context对象储存上下文，使得每次执行生成器函数的时候，都可以从上一个执行结果开始执行，看起来就像函数被挂起了一样」`

babel在编译时做了比较多的复杂工作，感兴趣的同学可以在babel官网编译看看，但是核心的工作还是上面的流程。

## 总结

本篇文章就是大致讲解了一下async await的实现机制，并简单的探索了一下generator的yield的挂起原理，感兴趣的同学可以顺着这个思路再深挖一下。

有了对于generator函数的基本认识，下一篇文章就分析一下基于generator函数的redux-saga，看看它是如何处理异步请求的。

refer：

[Babel将Generator编译成了什么样子](https://juejin.im/post/5bd85cfbf265da0a9e535c10)<br>
[Generator实现原理解析](https://juejin.im/post/5e3b9ae26fb9a07ca714a5cc)<br>
[async 函数的含义和用法](http://www.ruanyifeng.com/blog/2015/05/async.html)