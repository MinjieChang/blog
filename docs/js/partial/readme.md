## 偏函数

### 定义

关于偏函数的定义：在计算机科学中，固定一个函数的一些参数，然后产生另一个更小单元的函数

何为元，元就是函数参数的个数 比如有两个参数的函数 就叫二元函数

我们发现，所谓的便函数实际上也是对接收多参数函数的一种拆分，它和柯里化函数很类似，实际上偏函数是柯里化函数的一种

柯里化函数可以将一个接收n个参数的函数转化成n个接收一个参数函数，或者转化为多个函数，每个函数可接收一个或多个参数

偏函数固定一个或多个参数 把一个接收n元函数，转化为一个n-x元函数

讲了那么多的概念，我们通过一个例子来加深认识。

第一版：

```js
function add(a, b) {
  return a + b
}
function partial(fn){
  const args = [].slice.call(arguments, 1)
  return fn.bind(null, ...args)
}
const add1 = partial(add, 1)
console.log(add1(2))
```

它的实现和柯里化很类似，有没有。

上述的偏函数通过bind改变了原函数的this指向，现在改进一下

第二版：

```js
const partial2 = function(fn) {
  const args = [].slice.call(arguments, 1)
  return function(){
    const newArgs = args.concat([].slice.call(arguments))
    return fn.apply(this, newArgs)
  }
}

const add2 = partial2(add, 1)
console.log(add2(3))
```

还可以再改进一下，我们在柯里化实现中，函数可以接收占位符，这里我们也来实现这个功能

第三版：

```js
let _ = {}

const partial3 = function(fn) {
  const args = [].slice.call(arguments, 1)
  return function(){
    let nextArgs = [].slice.call(arguments)
    let flag = 0
    for (let i = 0; i < args.length; i++) {
      const ele = args[i];
      // 判断原参数是否为 _ ,是的话 就用后面的参数替换掉 _
      if(ele === _) {
        args[i] = nextArgs[flag++]
      }
    }
    // 判断后面的参数个数是否多于 前面参数中_的个数，如果有多的，就添加进原参数中
    // 就是避免这种情况 partial3(add, _, 2)(3, 4.5)
    while(nextArgs.length > flag){
      args.push(nextArgs[flag++])
    }
    return fn.apply(this, args)
  }
}

const add3 = partial3(add, _, 2)
console.log(add3(3))
```

### 总结

总体上，偏函数的实现相较柯里化函数简单一些，它是柯里化函数的一个特例，只进行了两层的柯里化。