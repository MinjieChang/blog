### word-wrap 与 word-break

最近被这两个css属性： **word-break: break-all** 和 **word-wrap: break-word** 给整懵了，那么这两个东西究竟是干什么的？

#### word-break

word-break，用来做文字换行，它有三个值：
- normal：使用默认的换行规则。
- break-all：允许任意非CJK(Chinese/Japanese/Korean)文本间的单词断行。
- keep-all：不允许CJK(Chinese/Japanese/Korean)文本中的单词换行，只能在半角空格或连字符处换行。非CJK文本的行为实际上和normal一致。

其中 break-all 的值表明的意思是，对于英文单词，如果超出了宽度，它也会给你截断换行，不会认为你的多个字符是一个整体单词，这个属性对于一些英文符号换行比较有效。


#### word-wrap

word-wrap，也是用来做文字换行，它有三个值：
- normal：使用默认的换行规则。
- break-word：一行单词中优先CJK(Chinese/Japanese/Korean)这些文字或者空格换行，但是对于一个英文单词不会截断

#### 总结

基本上如果要使英文可换行的化，就要使用 word-break: break-all 这个属性了，而 word-wrap：break-word 这个属性貌似用不上。

但是难点就是这个连个东西这么区分了

首字母走起：wbba(微博吧), wwbw(我五百万)