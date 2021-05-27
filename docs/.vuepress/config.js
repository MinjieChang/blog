const themeConfig = {
  themeConfig: {
    nav: [
        { text: '主页', link: '/' },
        { text: "最新文章", link: '/recent/' },
        { text: '前端', link: '/web/',
          items: [
            { text: 'react', link: '/react/' },
            { text: 'vue', link: '/vue/' },
            { text: 'css', link: '/css/' },
          ] 
        },
        { text: 'node', link: '/node/' },
        { text: '关于', link: '/about/' },
        {
          text: "知乎",
          link: "https://www.zhihu.com/people/jay-55-9/posts"
        },
        { text: 'Github', link: 'https://github.com/MinjieChang/myblog' },
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
        title: 'designPattern',
        // path: '/designPattern/',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          '/designPattern/subscribe/',
          '/designPattern/aop/',
          '/designPattern/iterator/',
          '/designPattern/proxy/',
          '/designPattern/strategy/',
        ]
      },
      {
        title: 'js',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          "/js/async/",
          "/js/promise/",
          "/js/curry/",
          "/js/partial/",
          "/js/promisfy/",
        ]
      },
      {
        title: 'react',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          "/react/optimization/",
          "/react/ssr/",
          "/react/redux-saga/",
          "/react/breadcrumb/",
          "/react/roadhog/",
        ]
      },
      {
        title: 'vue',   // 必要的
        // path: '/web/',      // 可选的, 应该是一个绝对路径
        collapsable: true, // 可选的, 默认值是 true,
        sidebarDepth: 2,    // 可选的, 默认值是 1
        children: [
          "/vue/myVue/",
          "/vue/nextTick/",
          "/vue/vuex/",
        ]
      },
      {
        title: 'css',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          "/css/csshoudini/",
          "/css/textOverflow/",
          "/css/word-break/",
          "/css/svgCircle/",
          "/css/c3Circle/",
        ]
      },
      {
        title: 'node',
        // path: '/node/',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          "/node/koa2/",
          "/node/module/",
          "/node/babel/",
          "/node/babel-plugin-console/",
          "/node/babel-plugin-lodash/",
        ]
      },
      {
        title: 'helpers',
        collapsable: true,
        sidebarDepth: 2,
        children: [
          "/helpers/eslint-prettier/",
          "/helpers/mac-env-path/",
        ]
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