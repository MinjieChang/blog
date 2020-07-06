#### 文本溢出隐藏总结

1、单行文本溢出

```css
.hidden {
  overflow: hidden;（文字长度超出限定宽度，则隐藏超出的内容）
  white-space: nowrap;（设置文字在一行显示，不能换行）
  text-overflow: ellipsis;（规定当文本溢出时，显示省略符号来代表被修剪的文本）
}
```

2、多行文本溢出省略

```css
.hidden {
  -webkit-line-clamp: 2;（用来限制在一个块元素显示的文本的行数，2 表示最多显示 2 行。为了实现该效果，它需要组合其他的 WebKit 属性）
  display: -webkit-box;（和 1 结合使用，将对象作为弹性伸缩盒子模型显示 ）
  -webkit-box-orient: vertical;（和 1 结合使用 ，设置或检索伸缩盒对象的子元素的排列方式 ）
  overflow: hidden;（文本溢出限定的宽度就隐藏内容）
  text-overflow: ellipsis;（多行文本的情况下，用省略号 “…” 隐藏溢出范围的文本)
}
```
示例：
```html
.hidden {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
<div class='hidden'>这里是很长的文本</div>
```

短板：

- line-clamp 属性只在 webkit 内核的浏览器中支持

3、js 实现多行文本隐藏溢出
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
</head>
<body>
  <div class='demo'></div>
</body>
<script type="text/javascript">
  const text = '这是一段很长的文本这是一段很长的文本这是一段很长的文本这是一段很长的文本这是一段很长的文本这是一段很长的文本这是一段很长的文本这是一段很长的文本';
  const totalTextLen = text.length;
  const formatStr = () => {
      const ele = document.getElementsByClassName('demo')[0];
      const lineNum = 2; // 设置行数
      const baseWidth = window.getComputedStyle(ele).width; // 获取容器的宽度
      console.log(baseWidth, 'baseWidth')
      const baseFontSize = window.getComputedStyle(ele).fontSize; // 获取容器的fontSize
      console.log(baseFontSize, 'baseFontSize')
      const lineWidth = +baseWidth.slice(0, -2); // 容器宽度去掉px，得到数字类型

      // 所计算的strNum为元素内部一行可容纳的字数(不区分中英文)
      const strNum = Math.floor(lineWidth / +baseFontSize.slice(0, -2));

      let content = '';

        // 多行可容纳总字数
      const totalStrNum = Math.floor(strNum * lineNum);

      // 判断多行可容纳的文字数量是否大于实际文字长度
      const lastIndex = totalStrNum - totalTextLen;
      
      // 如果实际文字数量超出了多行可容纳的最大数量
      if (totalTextLen > totalStrNum) {
          // 就把多余的文字数量及前三个去掉
          // 把去掉多余的文字去掉后，再加上 ...
          content = text.slice(0, lastIndex - 3).concat('...');
      } else {
          content = text;
      }
      ele.innerHTML = content;
  }

  formatStr();
  
  // 比较好的做法是 这里再加上函数防抖
  window.onresize = () => {
    formatStr();
  };
</script>
</html>
```

4、根据高度判断是否溢出 css实现

```css
.hidden {
  max-height: 80px;
  line-height: 40px;
  overflow: hidden;
}
```
特点：
- 当内容高度超出了设定的高度，超出部分将被隐藏

缺点：
- 超出部分没有...提示，观感上比较生硬

5、根据高度判断是否溢出 溢出使用...提示 css实现

```css
.hidden {
  position: relative;
  max-height: 80px;
  line-height: 40px;
  word-break: break-all;  // 使用该属性，可使英文换行
  overflow: hidden;
}

.hidden::after{
  content: '...';
  position: absolute;
  top: 100%;
  left: 100%;
  width: 20px;
  height: 20px;
  transform: translate(-100%, -100%);
}
```
特点：
- 使用伪元素实现...,将伪元素定位到右下角

缺点
- 这种方式不论在文字是否溢出的情况下都会显示...，整体效果也不是很好

4、根据高度判断是否溢出 js实现
```js

// 在react中实现

.part {
  overflow hidden
  max-height 280px
  -webkit-mask-image linear-gradient(to bottom, #000 0, #000 240px, rgba(0, 0, 0, 0) 270px, rgba(0, 0, 0, 0))
}

componentDidMount() {
  const range = document.createRange();
  range.selectNodeContents(this.jdRef);
  const rect = range.getBoundingClientRect();
  // 判断是否超出设定的值
  if (rect.height <= 280) {
    this.setState({ showAll: true });
  }
}

<div className={styles.jd_wrapper}>
  <div
    // 在这里如果只显示部分 就给元素添加上 styles.part
    className={`${styles.jd} ${showAll ? '' : styles.part}`}
    dangerouslySetInnerHTML={dangerouslySetInnerHTML}
    ref={this.setJdRef}
  ></div>
  {!this.state.showAll && (
    <div className={styles.more}>
      <Text onClick={this.showMore}>{i18n.t`查看更多`}</Text>
    </div>
  )}
</div>
```

基本思路是，使用js动态获取填充了内容的元素的高度(设为textHeight)，判断它的高度是否超过了设定的值(设为maxHeight)，如果textHeight不大于maxHeight，那么就显示全部内容，否则就显示部分内容，把超出的部分隐藏即可