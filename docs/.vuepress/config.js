const themeConfig = {
  themeConfig: {
    nav: [
        { text: '主页', link: '/' },
        { text: '前端', link: '/web/'
          // items: [
          //   { text: 'Web', link: '/web/' },
          //   { text: 'react', link: '/react/' },
          //   { text: 'vue', link: '/vue/' },
          // ] 
        },
        { text: 'node', link: '/node/' },
        { text: '关于', link: '/about/' },
        { text: 'Github', link: 'https://www.github.com/codeteenager' },
    ],
    sidebar: [
      {
				title: "目录", // 必要的
				path: "/" // 可选的, 应该是一个绝对路径
				// collapsable: true, // 可选的, 默认值是 true,
				// sidebarDepth: 2,    // 可选的, 默认值是 1
				// children: [
				// '../../README.md',
				// ]
			},
      {
        title: '设计模式系列',   // 必要的
        path: '/designPattern/',      // 可选的, 应该是一个绝对路径
        collapsable: true, // 可选的, 默认值是 true,
        sidebarDepth: 2,    // 可选的, 默认值是 1
        // children: [
        //   '/designPattern/subscribe'
        // ]
      },
      {
        title: '前端',   // 必要的
        // path: '/web/',      // 可选的, 应该是一个绝对路径
        collapsable: true, // 可选的, 默认值是 true,
        sidebarDepth: 2,    // 可选的, 默认值是 1
        children: [
          "/react/",
          "/vue/"
        ]
      },
      {
        title: 'node',   // 必要的
        path: '/node/',      // 可选的, 应该是一个绝对路径
        collapsable: false, // 可选的, 默认值是 true,
        sidebarDepth: 1,    // 可选的, 默认值是 1
      },
    ],
    // sidebarDepth: 2,
    lastUpdated: '最后更新时间', 
  }
}

module.exports = {
  title: '个人主页', 
  description: '常敏杰的博客',
  head: [
      ['link', { rel: 'icon', href: '/img/logo.ico' }],
      ['link', { rel: 'manifest', href: '/manifest.json' }],
      ['link', { rel: 'apple-touch-icon', href: '/img/logo.png' }],
  ],
  ...themeConfig,
}