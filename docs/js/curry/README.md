## 柯里化

### 定义

在维基百科中，对柯里化的定义是：
> In mathematics and computer science, currying is the technique of translating the evaluation of a function that takes multiple arguments (or a tuple of arguments) into evaluating a sequence of functions, each with a single argument.

翻译成中文：

函数柯里化，就是可以将一个接受多个参数的函数分解成多个接收单个参数的函数的技术，直到接收的参数满足了原来所需的数量后，才执行原函数


例如，对于下面的这个求和函数

```js
function add(a, b) {
  return a + b
}
```

我们可以使用一个柯里化函数改造成这样：

```js
function add(a, b) {
  return a + b
}

function curry(fn) {
  return function (a) {
    return function (b) {
      return fn(a, b)
    }
  }
}
let fn  = curry(add)(1)(2)
```

这就是一个柯里化函数的基本使用，直观来看就是可以对参数做拆分，那么它具体有哪些使用场景呢？

### 运用

第一种场景是，可以把逻辑外置，实现一些代码的复用

```js
var person = [{name: 'kevin', age: 10}, {name: 'daisy', age: 20}];

// 获取所有的姓名，通常会这么来做
const names = person.map(item => {
  return item.name
})
```

那现在，要获取所有的年龄，我们还需要写重复的逻辑

```js
const ages = person.map(item => {
  return item.age
})
```

观察map的过程我们可以发现，遍历的过程中返回的对象(item)是固定的，唯一不同的是获取item的参数是不同的

利用柯里化的思想，把一个接收多个参数的函数改造成多个函数，我们可以把不变的参数固定下来，变动的参数抽象到外部，由用户传入

那我们可以把map的函数参数抽离出来，先写下我们想要的结果的函数

```js
let mapFn = (name, obj) => {
  return obj[name]
}
```

然后期望有这么一个curry函数

```js
let propFn = curry(mapFn)
```

改造上面的map函数：

```js
// 获取所有的姓名
const names = person.map(propFn('name'))

// 获取所有的年龄
const ages = person.map(propFn('age'))
```

那么，这个curry函数可以这么来实现

```js
function  curry(fn) {
  return function (name) {
    return function (obj) {
      return fn(obj, name)
    }
  }
}
```
这么做的好处是，propFn被定义了可以多次复用，把以前的map参数的三行代码精简到了一行，并且它的可读性貌似也更好了

`propFn('name')`就好像直白的告诉你：person 对象遍历(map)获取(prop) name 属性

实际上，我们平时使用的**redux**的**connect**函数也是一个柯里化函数，它是把一个接收两个参数的函数转化为了两个函数：

```js
connect(mpState, mpDispatch)(Component)
```

通过以上的两个例子我们发现，其实柯里化的过程就是一个收集参数的过程，当参数的数量到了预期的数量后，就把所有的参数传给原函数并执行，否则的话就返回一个新的函数继续收集参数。知道了这个，就为我们后面实现一个通用的柯里化函数提供了思路。

### 第一版

我们先实现一个基本版本的常见的柯里化函数：

```js
function curry(fn) {
  let args = [].slice.call(arguments, 1)
  return function () {
    return fn.apply(this, args.concat([].slice.call(arguments)))
  }
}
```

我们可以这样使用：

```js
function add(a, b) {
    return a + b;
}

let addCurry = curry(add, 1, 2);
addCurry() // 3
//或者
let addCurry = curry(add, 1);
addCurry(2) // 3
//或者
let addCurry = curry(add);
addCurry(1, 2) // 3
```

### 第一版

在上面我们虽然实现了两个例子的柯里化函数，但是这个柯里化函数只能接收有限的参数，并不够通用。

如果我想实现三个参数的柯里化函数，难道要在函数中返回三个函数吗，像这样？

```js
function add(a, b, c) {
  return a + b + c
}

function curry(fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return fn(a, b, c)
      }
    }
  }
}
let curryedAdd = curry(add)
curryedAdd(1)(2)(3)
```
显然这么做是不现实的，首先根据几个参数决定返回几个函数的做法是不合理的，假如参数再增加，还需要再手动无限返回；其次，上面的写法只满足单个参数的传递，不支持多个参数：

```js
curryedAdd(1, 2)(3)
```

所以我们希望实现一个curry函数解决上面两个问题：

```js
function curry(fn, ...args) {

  // 函数的形参，函数接收几个参数
  const argLength = fn.length

  return function (...nextArgs) {
    // 收集上一次的参数和本次接收的参数
    const allArgs = [...args, ...nextArgs]
    // 参数收集够了 就执行
    if (argLength <= allArgs.length) {

      return fn.call(this, ...allArgs)

    } else {
      // 参数不够，继续执行柯里化，递归执行返回一个新函数
      return curry.call(this, fn, ...allArgs)     
    }
  }
}

let fn = curry(function(a, b, c){
  console.log([a,b,c])
})

fn(1,2,3)
fn(1,2)(3)
fn(1)(2,3)
fn(1)(2)(3)
```

上面的函数已经基本实现了一个通用的柯里化函数，还可以再精简一下：

```js
// 一个递归的过程
const curry = function(fn, ...args) {
  if(fn.length <= args.length) {
    return fn(...args)
  } else {
    return function() {
      return curry.call(null, fn, ...args, ...arguments)
    }
  }
}
```

更进一步地，使用箭头函数再次精简一下：

```js
const curry = (fn, ...args) =>
        fn.length <= args.length
            ? fn(...args)
            : curry.bind(null, fn, ...args)
```

比较巧妙的地方在 curry.bind 会返回一个新的函数，并把传入的参数会传入到返回的新的函数中。这种写法就类似于上面写的：

```js
return curry.call(null, fn, ...args, ...arguments)
```

### 第三版

至此，我们基本实现了一个通用版的curry函数，但是这个函数接收的参数必须是从左到右依次传入的，我们想通过使用占位符的方式，不依次传入参数：

```js
let fn = curry(function(a, b, c, d) {
    console.log([a, b, c, d]);
});

fn(1, _, _, 4)(_, 3)(2) // [1, 2, 3, 4]
```

简单分析一下这个问题，通过占位符先占住一个位置，在下次传递参数过程中，依次遍历传入的参数

- 如果原参数中有 _ , 并且当前参数是 _, 需要记录当前参数中 _ 的个数，如果 _ 的个数比之前参数中的 _ 多，就把多的 _ 加入到新的参数列表中，剩下的 _ 的自动给忽略掉，相当于是覆盖到之前的 _
- 否则如果参数是 _, 并且原参数中没有 _, 那么就直接将 _ 加入到 参数列表中，并且记录新加的 _ 在args 中的位置
- 否则如果参数不是 _ , 并且原参数中有 _，那么就需要找到原参数中 _ 的下标位置，并用新的参数替换掉
- 否则参数 既不是 _, 原参数中也没有 _, 那么就直接把参数加入到参数列表中

现在有了这个思路，再基于我们之前实现的那版curry，我们就可以实现一个可以乱序传递参数的curry函数

```js
function curry(fn, args, holes) {
  length = fn.length;

  args = args || [];

  holes = holes || [];

  return function() {
    var _args = args.slice(0),
      _holes = holes.slice(0),
      argsLen = args.length,
      holesLen = holes.length,
      arg, i, index = 0;

    for (i = 0; i < arguments.length; i++) {
      arg = arguments[i];
      // 处理类似 fn(1, _, _, 4)(_, _, _ 3) 这种情况，index 需要指向 holes 正确的下标
      // 当 后面的参数为 _, 收集后面的 _ 的个数
      // 当 _ 的个数超出了前面的 _ 的个数后，首先往 参数数组中 添加超出原来的 _, 未超出的 _ 自动覆盖以前的 _
      // 然后，往 _holes中加入新增的 _ 的下标，这个下标记录的是 添加进 _args 中的 _ 的位置
      if (arg === _ && holesLen) {
        index++
        if (index > holesLen) {
          _args.push(arg);
          _holes.push(argsLen - 1 + index - holesLen)
        }
      }
      // 处理类似 fn(1)(_) 这种情况
      // 新加的参数是 _ , 并且上次的参数中没有 _ 的情况
      // 就把 _ 添加进_args 中，并且记录 _ 在args中的位置
      else if (arg === _) {
        _args.push(arg);
        _holes.push(argsLen + i);
      }
      // 处理类似 fn(_, 2)(1) 这种情况
      // 新的参数不是 _ , 并且之前的参数中有 _，此时就用新的参数替换掉以前参数中的 _
      else if (holesLen) {
        // fn(_, 2)(_, 3)
        // 如果当前参数中的个数的 _ 和之前参数中的 _ 数量相同
        // 那么 这次的 _ 就忽略调，相当于替换掉了之前的 _ 
        // 然后再把 新的非 _ 参数 添加进 _args 中
        if (index >= holesLen) {
          _args.push(arg);
        }
        // fn(_, 2)(1) 用参数 1 替换占位符
        // 此时 args：[_, 2], holes: [0] index: 0
        else {
          _args.splice(_holes[index], 1, arg);
          _holes.splice(index, 1)
        }
      }
      else {
        _args.push(arg);
      }
    }
    // 参数还未收集完成，继续递归执行，并把收集的参数，已经参数中的_的位置数组传入递归函数中
    if (_holes.length || _args.length < length) {
      return curry.call(this, fn, _args, _holes);
    } 
    else {
      return fn.apply(this, _args);
    }
  }
}

var _ = {};

var fn = curry(function(a, b, c, d, e) {
  console.log([a, b, c, d, e]);
});

// 验证 输出全部都是 [1, 2, 3, 4, 5]
// fn(1, 2, 3, 4, 5);
// fn(_, 2, 3, 4, 5)(1);
// fn(1, _, 3, 4, 5)(2);
// fn(1, _, 3)(_, 4)(2)(5);
// fn(1, _, _, 4)(_, 3)(2)(5);
// fn(_, 2)(_, _, 4)(1)(3)(5)
fn(2,_, _, 4)(_, _, _, 5)(_, 1)(3)
```

我们拿最后一个例子来分析一下，
```js
fn(2,_, _, 4)(_, _, _ , 5)(_, 1)(3)(2)

```
- 首先执行 fn(2,_, _, 4),  args [2, _, _, 4 ]  holes: [1, 2]
- 再执行 (2, _, _, 4)(_, _, _, 5)，args [2, _, _, 4, _, 5] holes [1,2,4]
- 再执行 (2, _, _, 4, _, 5)(_, 1) index 为1 args [2, _, 1, 4, _, 5] holes: [1, 4]
- 再执行 (2, _, 1, 4, _, 5)(3) index 为 0 args [2, 3, 1, 4, _, 5] holes: [4]
- 再执行 (2, 3, 1, 4, _, 5)(2) index 为 0 args [2, 3, 1, 4, 2, 5] holes: [0]
- 此时发现 参数个数已经收集完毕，执行fn.apply(this, _args)

通过上面的分析，我们对参数的收集过程有了一定的了解，它的巧妙之处在于，每次递归的过程中会把保持的 _ 的下标数组作为参数传入，这样在每次替换的时候就知道要替换到原来参数中哪些部分。

### 总结

一个基本的curry函数更像是一个高阶函数，它们的共同点都是要返回一个新的函数，但是柯里化和高阶函数还是有本质上的区别的，柯里化的目的是把一个多元函数(接收多个参数的函数)转为多个一元函数，而高阶函数的目的是更多是一个闭包的作用，从某种意义上说，高阶函数也可以看成是一个特定场景下的柯里化函数。

refer:

[深入js实现](https://juejin.im/post/5dc3894051882517a652dbd7)