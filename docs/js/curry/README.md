## curry

 其实我们无时无刻不在使用柯里化函数，只是没有将它总结出来而已。它的本质就是将一个参数很多的函数分解成单一参数的多个函数。

实际应用中：

延迟计算 （用闭包把传入参数保存起来，当传入参数的数量足够执行函数时，开始执行函数）
动态创建函数 （参数不够时会返回接受剩下参数的函数）
参数复用（每个参数可以多次复用）

```js
const curry = fn =>
  (judge = (...args) =>
    args.length >= fn.length
      ? fn(...args)
      : (...arg) => judge(...args, ...arg));

const sum = (a, b, c, d) => a + b + c + d;
const currySum = curry(sum);

currySum(1)(2)(3)(4); // 10
currySum(1, 2)(3)(4); // 10
currySum(1)(2, 3)(4); // 10
```

refer:

[各种js原理实现](https://juejin.im/post/5dc3894051882517a652dbd7)