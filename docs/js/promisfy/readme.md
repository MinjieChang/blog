### 背景

js中的异步函数一般的执行逻辑是，他们通常需要接收一个回调函数作为参数，当异步的方法有返回结果的时候再调用回调函数，把异步的结果作为回调函数的参数，比如node的异步api基本是使用的这种方式，还有ajax。

这么做的方式也未为不可，但是遗憾的是，一不小心就掉入了回调的地狱：

```js
const fs = require('fs')

fs.readFile(path.join(__dirname, './a.js'), function(err, data){
  if (!err) {
    fs.readFile('xxx', function (err, data) {
      ...
    })
  }
})
```

### promisefy

为了避免这种回调函数的缺陷，现在一些node库对于异步的操作改为基于promise的方式，比如mongoose等，异步的操作通常返回的是promise。

所以，有了一些更好的做法作为参照，我们也可以尝试把node中的异步的api使用promise的方法来改造一下，我们称这个过程是对这些异步api的promisfy的过程：

```js
function promisefy(fn){
  return function (...params) {
    return new Promise((resolve, reject) => {
      fn(...params, function name(err, data) {
        if(err){
          reject(err)
        }else{
          resolve(data)
        }
      })
    })
  }
}
```

这个promisefy函数还是很简单的，在其内部就是使用promise对异步操作包装了一下，异步操作成功，就调用resolve方法，否则调用reject方法，这样决定了执行promise的then回调还是catch回调了

测试一下这个函数

```js
const fs = require('fs')
const path = require('path')

const promisefiedFs = promisefy(fs.readFile)
promisefiedFs(path.join(__dirname, './4promisefy.js')).then((data)=>{
  console.log(data, 'data')
}).catch(err => {
  console.log(err, 'err')
})
```