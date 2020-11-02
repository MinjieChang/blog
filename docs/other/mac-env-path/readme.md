## mac是如何在全局中添加命令的

### 引子

当我们在mac中安装了node或者git后，然后就可以在命令行中使用node和git命令了。那mac是如何在全局中添加这些命令的呢？

### 环境变量

之所以可以使用这些命令，是因为系统把这些命令添加到了环境变量中，mac存储环境变量主要有这几个地方：

- /etc/profile
- /etc/bashrc (mac默认shell是bash，配置文件是bashrc, 最新mac系统默认使用zsh，配置文件是zshrc)
- /etc/paths
- ~/.bash_profile # mac
- ~/.bash_login
- ~/.profile
- ~/.bashrc # linux

mac系统在启动时候，会依次查看这些文件，其中前三个命令是系统级别的，对所有用户会生效；后面几个是用户级别的，其中.bash_profile是mac系统下的用户配置，.bashrc是linux下的配置

然后查看/etc/paths下的内容

```shell
cat /etc/paths
```

返回的结果如下：

```js
/usr/local/bin
/usr/bin
/bin
/usr/sbin
/sbin
```

然后再来到/usr/local/bin

```shell
cd /usr/local/bin
```

结果如下，这里面列出的是安装在全局的命令

```shell
brew             code             create-react-app n                node             npm              npx
```
实际上，我们还可以再进入到其中一个文件中，比如npm，可以看到里面就是js文件，使用node来执行的。

同样的，打开/bin目录，得到结果如下，这里只列出部分内内容，这些是系统置的命令

```shell
ln        mv        pwd       sh        cp      unlink
```
至此，我们就知道了，为什么安装了相关软件后就能在全局中使用命令行来执行了。

### which 与 where

如果在这些目录中找到某个命令存放在哪个目录下会很麻烦。使用which和where命令可以快速进行定位

```shell
where git  # /usr/bin/git
```

### 自定义命令

知道了mac是如何在全局中添加命令的原因后，我们就可以添加自定义的命令行了。我们可以添加系统级别的和用户级别的两种

#### 系统级自定义命令

我们可以模仿nvm，在/usr/local/bin下增加一个文件比如now，然后增加如下内容：

```js
#!/usr/bin/env node

let date = new Date()
let year = date.getFullYear()
let month = date.getMonth() + 1
let day = date.getDate()
let hour = date.getHours()
let minute = date.getMinutes()
let second = date.getSeconds()

console.log(`${year}/${month}/${day} ${hour}:${minute}:${second}`);
```
目的就是打印出当前的时间

注意，需要给此文件添加执行权限：
```shell
chmod +x /usr/local/bin/now # +x 表示执行权限
```

然后重新链接一下shell配置文件：

```shell
source /etc/paths
```
最后在终端中输入 now 即可生效，还是很简单的

#### 用户级自定义命令

用户级的命令主要是在.bash_profile或者.zshrc文件中映射PATH环境变量即可：

1、在桌面上新增一个文件夹myCmd，然后新增一个文件a
```shell
cd ~/Desktop && mkdir mycmd && touch a
```

2、然后在a中添加如下内容

```shell
#!/usr/local/bin/node

console.log(55555)
```

3、给此文件添加执行权限

4、修改 ~/.zshrc，增加这行
```shell
export PATH=$HOME/bin:/usr/local/bin:~/Desktop/myCmd:$PATH
```
注意，这里不能是添加~/Desktop/myCmd/a

意思是，把myCmd下的文件添加到环境变量中，此时在终端中就可以输入a命令执行了

```shell
a
```

### 关于shell

在最新的OSX系统中(catalina)，mac默认使用zsh作为shell，因此zsh的配置文件为~/.zshrc文件，而在此之前的默认shell是bash

查看系统支持的shell类型

```shell
cat /etc/shells

# 输出结果
/bin/bash
/bin/csh
/bin/ksh
/bin/sh
/bin/tcsh
/bin/zsh
```

查看当前使用的shell

```shell
echo $SHELL
```

切换shell

```shell
chsh -s /bin/zsh  # chsh 意味着 change shell
chsh -s /bin/bash
```

refer:

[mac添加环境变量](https://zhuanlan.zhihu.com/p/25976099)
