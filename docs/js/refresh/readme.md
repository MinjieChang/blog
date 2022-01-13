# 判断页面是首次进入还是刷新

## 题外话

阔别已久，已经好几个月没写博客了，主要是前几个月实在忙，九月和十月连个两个月上新的项目，还都是倒排项目，人手不够，无奈只能加班，感觉这两个月把一年的班快加完了。今天全年写了十三万行代码，八月到十月底三个月有七万多行，差不多占了一半之多。只能说经历的苦只有自己知道吧 😭。

不管怎么，项目进入平稳期，现在总算是回到了正轨上，有空可以梳理下这段时间在项目中遇到的问题。

## 正题

新老平台切换的时候，用户进入老系统的时候需要给出移步到新平台的弹窗提示，为了有一个更好的体验，在用户刷新的时候依然需要给出这个弹窗提示。

面对这个问题，估计有的同学马上能意识到，这不就是一个很简单的问题嘛，要不要出弹窗只需要后端出个接口告诉前端就可以啦，重新刷新的时候再调这个接口就行啦，如此简单！！

正常情况下，在我们的单页面运用中，这么做是完全问题的。但是由于老系统的架构的特殊性，这个方案行不通。

## 为何要判断用户刷新

由于我们老系统使用的架构是**express+ejs**，因此当用户进行页面切换的时候，会向服务器重新请求页面，如此之前说到的判断是否要弹窗的接口会被重新再调用一次，此时会再次出现弹窗。当用户切换一次页面就会出一次弹窗，这个体验显然不好。

改进方式之一就是，在用户进入系统后，可以使用**sessionStorage**来保存用户进入系统的快照，这样当用户再切换页面的时候，可以判断**sessionStorage**中是否有此快照，有的话就不再弹窗，这件就不用每次切换页面的时候弹窗都出。

这个方案看似完美，但是还有问题就是，当用户再次刷新页面的时候，由于此时**sessionStorage**中已经保存了快找，所以弹窗不再出现，这又与我们的想要的效果不符

因此，我们需要知道用户刷新的时机，此时让弹窗重新出现

## 如何判断刷新页面

判断用户刷新页面的操作主要有如下几种方法：

### window.name

利用 **window.name** 在页面刷新时不会重置进行判断，初次进入页面，该属性是空值，进入页面后给该属性赋值，刷新页面该值不会改变

```js
if (window.name === "") {
  // 空值的情况，进入页面
  window.name = "xxx";
} else if ((window.name = "xxx")) {
  // 此时代表刷新页面
  // do some work
}
```

### 使用 sessionStorage 或 cookie 来判断

和使用 **window.name** 类似，使用 sessionStorage 或 cookie 也可记录用户首次进入页面的快照，在刷新可不被重置

```js
if (sessionStorage.getItem("xxx")) {
  console.log("页面被刷新");
} else {
  console.log("首次被加载");
  sessionStorage.setItem("xxx", true);
}
```

### 使用 window.performance 对象判断

使用 **window.performance.navigation.type** 属性可判断页面是刷新还是初次进入

该属性在 IE9 以上的浏览器都支持

```js
// 兼容的写法
const performance =
  window.performance || window.msPerformance || window.webkitPerformance;
if (performance.navigation.type === 0) {
  // 代表页面初次进入
} else {
  // 页面刷新
}
```

## 回到主题

再回到我们的问题，用户在切换页面的时候，都会触发页面的刷新，但此时我们不希望弹窗出现；用户在当前页面手动刷新的时候，此时我们希望的是弹窗出现，那如何同时满足这两种情况呢？

实际上根据上面的分析，用户手动刷新的时候，我们可以把某个变量赋值给 **window.name**，那如何区分是不同页面的刷新呢？答案是，我们可以把当前页面的路由地址赋值给 **window.name**。

先看下如何实现：

```js
if (window.name == "") {
  // 在首次进入页面时我们可以给window.name设置一个固定值
  // console.log('首次进入页面========')
  window.name = location.pathname;
} else {
  if (location.pathname === window.name) {
    // console.log('当前页面被刷新========')
    sessionStorage.removeItem("updateModalFlag");
  } else {
    // console.log('切换了页面========')
    window.name = location.pathname;
  }
}
```

分析一下上面的逻辑：

- window.name 为空值，代表首次进入页面，此时将当前页面地址赋值给 window.name
- window.name 不为空值，说明此时是页面刷新，需要知道是在当前页面刷新还是用户切换了地址
  - 当 window.name 等于 location.pathname，说明此时是在当前页面刷新，此时清空 sessionStorage 中保存的出现弹窗的快照，让弹窗再次出现
  - 当 window.name 不等于 location.pathname，说明是用户切换了路由，此时我们重新给 window.name 赋值当前的路由地址即可，此时不需要弹窗出现，因此无需清除 sessionStorage 中保存的出现弹窗的快照。

这里简单贴一下出现弹窗的判断

```js
if (!sessionStorage.getItem("updateModalFlag")) {
  $("#updateModal").modal("show");
  sessionStorage.setItem("updateModalFlag", true);
}
```

## 总结

以上就是基于 window.name 对于页面刷新的判断，当然也可以基于 sessionStorage 来做，基本一样的实现逻辑，这里就不做展示了。
