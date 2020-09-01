### 代理模式

#### 定义

代理模式是为一个对象提供代理对象，此代理对象用来承接外界对原对象的访问，以过滤和筛选外界的请求，并在合适的时机再访问原对象，达到对原对象保护的作用。

这么理解或许比较费解，我们可以在现实中找到对应的例子，比如明星一般都有自己的经纪人，这个经纪人可以被认为是一个代理对象。

代理模式的作用是，可以保证原对象职责的单一性(相对对立性)，而把一些访问原对象之前需要做的一些逻辑交给代理对象来做，从而可以提高代码效率(缓存代理) 和 用户体验(图片加载代理)

#### 从一个小例子看

小明想给喜欢的女神送花，但是他是个怂逼，怕被直接pass掉不敢送，于是他找到女神的朋友，请求她帮忙送一下：

```js
// 定义Flower类
function Flower (color) {
  this.color = color
}
// 女神
const lady = {
  getFlower (flower) {
    console.log(`女神本人收到${flower.color}的花了`)
  }
}
// 朋友
const friend = {
  sendFlower (flower) {
    // 给女神送花
    lady.getFlower(flower)
  }
}
// 小明
const xiaoming = {
  sendFlower () {
    let flower = new Flower('红色')
    // 找代理人送花
    friend.sendFlower(flower)
  }
}
xiaoming.sendFlower()
```

但是小明这么鲁莽的送花是有风险的，因为万一送花的时候女神心情不好，那不是糟糕了吗，花白送了不说，还增加了被直接pass的风险。

于是，他把这个苦恼跟女神的朋友讲了，好朋友说，这好办呀，等你的女神心情好的时候再送呗，小明一听连连称赞说，这确实是个好办法呀：

```js
// export default isType
function Flower (color) {
  this.color = color
}
const lady = {
  getFlower (flower) {
    console.log(`女神本人收到${flower.color}的花了`)
  },
  spirit () {
    return true
  }
}
const friend = {
  getFlower (flower) {
    // 好朋友先看女神的心情
    const ladySpirit = lady.spirit()
    if (ladySpirit) {
      // 女神心情好的时候再送花
      let flower = new Flower('红色')
      lady.getFlower(flower)
    }
  }
}
const xiaoming = {
  sendFlower () {
    // 找代理人送花
    friend.getFlower()
  }
}
xiaoming.sendFlower()
```

通过上面的改进，我们可以看见，在女神心情好的时候才 new Flower('红色') ，而不是小明送花的时候就实例一个花，一定程度上节省了开销

##### 虚拟代理

虚拟代理的作用是，把一些开销比较大的对象，延迟到真正使用到的时候再去创建，上例中，实例出一个flower对象是在代理对象内部做的，也就是需要真正需要的时候才创建这么一个对象

> 图片预加载代理

尺寸较大的图片的加载通常会比较耗时，图片会一点一点的出现，这种体验会不太好。我们希望，在图片正式加载出来之前，先显示一个默认的本地图片，在加载完成后，再用真实图片替换掉默认的图片。此时我们就可以使用一个图片预加载代理。

首先定义一个真实的图片加载方法：

```js
const myImg = (function loadImg (src) {
  const img = document.createElement('img')
  document.body.appendChild(img)
  return {
    setSrc (src) {
      img.src = src
    }
  }
})()
```

我们看见，这个函数职责非常单一，创建了一个img标签，并对外暴露一个设置img对象src属性的接口，它不需要关心src是什么，来自哪里。

再定义一个图片预加载代理

```js
const proxyImg = (function loadImg () {
  const img = new Image()
  img.onload = function () {
    // 再给 myImg 设置为真实的图片
    myImg.setSrc(this.src)
  }
  return {
    setSrc (src) {
      // 先给 myImg 设置本地图片
      myImg.setSrc('file:///Users/changminjie/Desktop/11111.jpg')
      img.src = src
    }
  }
})()
proxyImg.setSrc('http://pic21.nipic.com/20120426/9940080_164340613124_2.jpg')
```

预加载图片的请求在proxyImg内部做的，在真实图片加载完成之前，先给原对象设置一个本地图片，真实图片加载完成以后，再给原对象设置真实图片。

需要注意的细节是，代理对象其实也定义了和原对象一样的接口即setSrc。这样做的好处是，代理对象和原对象保持对外接口的一致性，这样调用者在调用的时候不用关心请求的是原对象还是代理对象，外界只需要关心获取到了正确的结果即可，==调用者不需要再学习额外的调用接口==。

另外，结合这个代理对象，我们可以再来实现一下图片懒加载的实现。在稍后的例子中会给出具体实现。

> 虚拟代理合并http请求

在浏览器中，除了图片加载是比较耗时的操作之外，http请求其实也是比较耗时的。

比如有这样的一个文件上传场景，用户选择一个文件的时候调用一次上传接口，当用户点击多次的时候会多次调用上传接口，这就会给服务器造成较大的压力。

改进的做法是，在用户点击的时候，先把点击的文件缓存起来，到一定的时间后再做上传图片

```js
// 先定义上传方法
let syncFile = function (id) {
  console.log('上传文件', id)
}

// 定义代理上传方法
let proxySyncFile = (function proxySyncFile (id) {
  let caches = []
  let timeout

  return function (id) {
    // 先缓存选中项
    caches[caches.length] = id
    if (timeout) return
    // 设置2秒后再上传
    timeout = setTimeout(function () {
      syncFile(caches.join(','))
      clearTimeout(timeout)
      timeout = null
    }, 2000)
  }
})()

// 绑定点击事件
let input = document.getElementsByTagName('input')
for (let i = 0, item; item = input[i++];) {
  item.onclick = function () {
    if (item.checked) {
      proxySyncFile(item.id)
    }
  }
}
```

其实，在真实的场景中，一般会有一个上传按钮，在选择文件的时候先保存文件，只有点击了上传按钮才会真正上传，这个时候就不需要再使用代理对象了。

##### 缓存代理

有一些比较耗时的计算会多次使用到，如果在每次使用的时候再重复计算一遍显然是比较消耗性能的。此时我们可把这样的一些计算结果给缓存起来，下次需要用的时候直接从缓存里取出来即可，这个时候缓存代理就派上用场了: 

```js
let calc = function (...args) {
  let sum = 0
  for (let i = 0, itme; item = args[i++];) {
    sum += itme
  }
  return sum
}

let proxyCalc = function (...args) {
  let cach = {}
  let s = args.join(',')
  if (cach[s]) {
    return cach[s]
  }
  return (cach[s] = calc(...args))
}

proxyCalc(1, 2, 3, 4)
```

##### 图片懒加载

使用到了虚拟代理 + 缓存代理，其中图片加载使用了预加载代理，创建懒加载对象使用缓存代理，避免对象的重复创建

```js
// 节流函数
function throttle (func, gapTime = 300) {
  let timer = null
  let startTime = Date.now()
  return function (...args) {
    let currentTime = Date.now()
    let remainTime = gapTime - (currentTime - startTime)
    clearTimeout(timer)
    if (remainTime <= 0) {
      func(...args)
      startTime = Date.now()
    } else {
      // 这样保证函数会在最后执行一次
      timer = setTimeout(() => {
        func(...args)
      }, remainTime)
    }
  }
}

// 图片预加载代理
const proxyImg = (function () {
  const proImg = new Image()
  let rawImg
  proImg.onload = function () {
    rawImg && (rawImg.src = this.src)
  }
  return {
    setSrc (img, src, altImg) {
      // 先给 myImg 设置本地图片
      rawImg = img
      rawImg.src = altImg
      // 添加rawImg引用
      proImg.src = src
    }
  }
})()

// 图片懒加载类
class ImgLazyLoad {
  constructor (imgDomList) {
    this.imgList = [].slice.call(imgDomList)
    this.throttleFn = throttle(this.canLoad)
    this.init()
  }
  // 添加额外的dom标签
  addDoms (doms) {
    this.imgDomList.push.apply(this.imgDomList, doms)
  }
  // 获取标签位置
  getBound = (img) => {
    const bound = img.getBoundingClientRect()
    const clientH = window.innerHeight
    // 图片在视窗下100时开始加载
    return bound.top <= clientH + 100
  }
  // 加载图片
  loadImg = (img, i) => {
    // 获取src属性
    let src = img.getAttribute('data-src')
    // 正式加载图片
    proxyImg.setSrc(img, src, noImg)
    // 加载完后 从imgList中移除
    this.imgList.splice(i, 1)
  }
  // 判断图片是否要显示
  canLoad = () => {
    for (let i = 0; i < this.imgList.length; i++) {
      const img = this.imgList[i]
      this.getBound(img) && this.loadImg(img, i)
    }
  }
  init = () => {
    this.canLoad()
    // 监听滚动
    this.bindEvent()
  }
  // 绑定页面滚动
  bindEvent = () => {
    window.addEventListener('scroll', () => {
      // 滚动使用函数节流
      this.throttleFn()
    }, true)
  }
}

export const getLazyLoadImg = (function () {
  // 使用map，doms作为key，把创建的ins缓存起来
  const weakMap = new WeakMap()
  return {
    create (doms) {
      if (weakMap.has(doms)) {
        return weakMap.get(doms)
      }
      const ins = new ImgLazyLoad(doms)
      weakMap.set(doms, ins)
      return ins
    }
  }
})()
```

然后在vue文件中引入使用：

```js
mounted () {
  // 获取带data-src属性的img标签
  const imgList = document.querySelectorAll('img[data-src]')
  getLazyLoadImg.create(imgList)
},
```

最后编辑于 2019.11.4