### 迭代器模式

#### 定义

提供一种方式，可以顺序的访问迭代对象的内部元素，而又不暴露对象的内部结构

使用迭代器的优势是，==可以把迭代过程和我们的业务逻辑分离开来==，即我们在迭代的过程中，不用考虑对象的内部构造，也可以顺序访问每个元素。

es6提供的forEach、map、filter 等方法均使用了迭代器模式

迭代器模式又分为内部模式

#### 内部迭代器

类似forEach 等方法就就属于内部迭代，在函数内部已经做好了迭代的过程，它完全接手整个迭代过程，外部只需要一次初始调用。我们来实现一下：

```js
function forEach (obj, fn) {
  console.log(arguments)
  // 数组
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const ele = obj[i]
      fn.call(ele, ele, i, obj)
    }
  }
  // 对象
  if (Object.prototype.toString.call(obj) === '[object Object]' && !obj.length) {
    let i = 0
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const ele = obj[key]
        fn.call(ele, ele, i, obj)
      }
      i++
    }
  }
  // 类数组对象
  if (Object.prototype.toString.call(obj) === '[object Object]' && obj.length) {
    const arr = [].slice.call(obj)
    for (let i = 0; i < arr.length; i++) {
      const ele = arr[i]
      fn.call(ele, ele, i, obj)
    }
  }
}

let arr = { 0: 1, 1: 2, 2: 3, length: 3 }
forEach(arr, function (item, idx, arr) {
  console.log(item, idx, arr)
})
```

内部迭代器的优点恰好也是它的缺点：使用方便，迭代交互也仅仅是一次初始调用

使用内部迭代器，判断两个数组的元素是否完全相等：

```js
function compare (arr1, arr2) {
  if (arr1.length !== arr2.length) return false
  forEach(arr1, function (ele, i) {
    if (ele !== arr2[i]) {
      return false
    }
  })
  return true
}
compare([1,2,3,4], [1,2,3]) // 输出false
```

#### 外部迭代器

外部迭代器必须显示的请求迭代下一个元素

外部迭代器增加了调用的难度，但是相对也增加了迭代的灵活度，我们可以手工控制迭代的过程或者顺序

我们实现一个内部迭代器：

```js
let iterator = function (obj) {
  let current = 0
  // 获取当前项
  let getCurrent = function () {
    return obj[current]
  }
  // 往后移动下表指针
  let next = function () {
    current++
  }
  // 判断是否迭代结束
  let isDone = function () {
    return current >= obj.length
  }
  return {
    getCurrent,
    next,
    isDone
  }
}
```
iterator函数使用闭包的方式，返回一个对象，内部为三个函数

现在使用外部迭代器再验证两个数组的元素是否一致：

```js
function compare (arr1, arr2) {
  if (arr1.length !== arr2.length) return false
  const iterator1 = iterator(arr1)
  const iterator2 = iterator(arr2)
  while (!iterator1.isDone() && !iterator2.isDone()) {
    if (iterator1.getCurrent() !== iterator2.getCurrent()) {
      return false
    }
    iterator1.next()
    iterator2.next()
  }
  return true
}
console.log(compare([1, 2, 3, 4], [1, 2, 3, 4]))
```

#### 使用场景

> 找钥匙

在前面的aop模式中，我们使用after函数实现了找钥匙的功能，现在我们再尝试用迭代器的模式来实现一下：

```js
function Key1 (lock) {
  return lock === 1 ? '钥匙1' : false
}
function Key2 (lock) {
  return lock === 2 ? '钥匙2' : false
}
function Key3 (lock) {
  return lock === 3 ? '钥匙3' : false
}

function generate () {
  let args = [].slice.call(arguments)
  for (let i = 0, fn; fn = args[i++];) {
    let ret = fn()
    if (ret) return ret
  }
}

let ret = generate(() => Key1(2), () => Key2(2), () => Key3(2))
console.log(ret)
```

这种方式需要给迭代器传入多个函数参数，对于需要参数的方法(如k1)还需要包裹一下(如：() => Key1(2))  
这些函数没有aop的方式好看，但是灵活性却有所提高，因为可以根据需要向函数内部传递参数，而aop却是统一传入的参数  

根据以上特性，我们发现这种迭代器模式其实对于form表单的验证比较友好：

```js
const validateRules = {
  notEmpty (val) {
    return val.length > 0
  },
  maxLength (val, length = 10) {
    return val.length < length
  }
}
function validate () {
  let args = [].slice.call(arguments)
  for (let i = 0, fn; fn = args[i++];) {
    if (!fn()) {
      return false
    }
  }
  return true
}
let val = ''
let ret = validate(
  () => validateRules.notEmpty(val),
  () => validateRules.notEmpty(val, 8)
)
```

找到合适的上传组件

```js
function get_plugin () {
  return false
}
function get_html5 () { return false }
function get_flash () { return '' }
function get_form () { return 'form' }

function generate () {
  let args = [].slice.call(arguments)
  for (let i = 0, fn; fn = args[i++];) {
    let ret = fn()
    if (ret) return ret
  }
}
let ret = generate(get_plugin, get_html5, get_flash, get_form)
console.log(ret)
```

#### 总结

迭代器模式的主要作用就是帮我们把迭代的过程和我们的业务剥离开来，我们不用关心对象的内部数据结构，不用关心迭代的过程是怎么的，只需要关心迭代的过程中暴露的数据供我们使用，从而可以聚焦于我们业务。
