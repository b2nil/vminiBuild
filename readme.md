# `vmini-build`
> 配合 `@vue-mini/wechat` 使用的 `vue sfc` 编译器 + 脚手架
> - 基于 `esbuild` 的脚手架
> - 轻量 + 快速
> - 只支持开发微信小程序
> - 个人玩具，请谨慎使用

## 特性
  - [x] 基于 `esbuild` 的快速编译脚手架
  - [x] vue 3 单文件组件语法
  - [x] 编译时宏函数，友好的类型提示和代码补全
  - [x] 原生混合开发

## 安装

- 开发依赖
  ```bash
  yarn add -D vmini-build esbuild @vue/compiler-sfc
  ```
  - 如果使用 `pug` 或 css 预编译器，请自行安装依赖。
  - 如果需要 `px` 转 `rpx`, 请安装 [`postcss-pxtransform`](https://github.com/NervJS/taro/tree/next/packages/postcss-pxtransform)，或其他类似 `postcss` 插件。
  
- 项目依赖
  - 请参考 [`vue-mini`](https://vuemini.org/guide/installation.html) 文档
  - 以及 [`vue-mini` 脚手架模板](https://github.com/vue-mini/template) 的推荐


## 使用

#### 配置文件
- 构建配置文件
  - 默认使用 `mini.config.ts/js` 命名
  - 可自行命名，然后在脚本中使用 `-c` 或 `--config` 指定配置文件位置, 如 `vmini build -c vite.config.ts`。
    > Tips： 命名为 `vite.config.ts` 有图标
  - 配置参数如下，其中：
    - `platform` 和 `designWidth` 用于 `postcss-pxtransform`； 
    - `aliases` 用于设置别名，如果不提供，别名默认使用 `tsconfig.json` 中的 `compilerOptions.paths`。明确设置为 `false`，禁用别名。
    - `vue` 用于 vue 相关的编译设置，与 `@vue/compiler-sfc` 的配置基本相同，具体见 [`VueOptions`](./types/index.d.ts)；
    - 其他均与 esbuild 的 `build` 配置相同，具体见 [`esbuild` 文档]([./types/index.d.ts](https://esbuild.github.io/api/#build-api))。
    ```ts
    interface UserConfig {
      outDir?: string,
      emptyOutDir?: boolean,
      platform?: "weapp"
      designWidth?: number
      aliases?: false | Record<string, string>
      watch?: BuildOptions["watch"]
      minify?: BuildOptions["minify"]
      define?: BuildOptions["define"]
      logLevel?: BuildOptions["logLevel"],
      plugins?: BuildOptions["plugins"],
      vue?: VueOptions
    }
    ```
  - 构建配置文件中必须使用 `cjs` 或 `esm` 格式默认导出配置：
    ```ts
    exports.default = {
      outDir: "dist"
    }
    // 可直接使用 `defineBuildConfig` 来获得类型提示和代码补全, 无需引用
    export default defineBuildConfig({
      outDir: "dist"
    })
    ```
- 项目配置和 sitemap 配置
  - `project.config.json` 必须以 `js` 或 `ts` 格式提供，可使用宏函数 `defineProjectConfig` 来获得类型提示和代码补全。
  - `sitemap.json`, 必须以 `js` 或 `ts` 格式提供，可使用宏函数 `defineSitemapConfig` 来获得类型提示和代码补全，放在 `src` 目录中。
- 构建脚本：
  ```json
  {
    "scripts": {
      "dev": "vmini build -w",
      "build": "vmini build"
    }
  }
  ```

#### 项目开发

- 项目结构
  ```bash
  |-projectDir
    |-src
      |-assets
      |-components
      |-pages
      |-app.config.ts   // app 配置文件，所有页面、组件的打包入口
      |-app.css
      |-app.ts          // app 入口
      |-sitemap.ts      // sitemap 配置文件
    |-package.json
    |-tsconfig.json     // 需设置 `typeRoots` 和 `types` 字段
    |-project.config.ts // 小程序项目配置
    |-mini.config.ts    // 构建配置文件
  ```
- `tsconfig.json` 和 `jsconfig.json` 设置
  > 请添加以下设置，以便充分利用编译时宏函数
  ```json
  {
    "compilerOptions": {
      "typeRoots": [
        "node_modules/vmini-build/types"
      ],
      "types": [
        "vmini-build"
      ]
    }
  }
  ```
- app 入口, 详见 [`vue-mini` 文档](https://vuemini.org/guide/app.html)
  ```ts
  import { createApp } from '@vue-mini/wechat'
  createApp({
    setup(options) {
      // options 为小程序启动参数
    },
  })
  ```
- app 配置文件
  ```ts
  // 语法不限，默认导出配置即可
  export default {
    pages: [],
    subPackages: [],
    window: {},
    tabBar: {},
    // ...
  }
  // 可使用直接使用 `defineAppConfig` 宏函数获取类型提示和代码补全
  export default defineAppConfig({
    // ...
  })
  ```
- 页面文件, 详见 [`vue-mini` 文档](https://vuemini.org/guide/page.html)
  - 采用 vue 单文件组件形式, 但不支持通过 `template`, `script`, `style` 的 `src` 属性引用其他文件
  - 页面根据 app 配置中的 `pages` 和 `subPackages` 字段下的 pages 入口按需编译
  - 语法基本与 vue 3.0 一致，增添了部分特性
    - 编译时宏函数 `definePageConfig` 用于声明页面配置
    - 使用 `script setup` 时
      - 编译时宏函数 `defineProps`, 用于声明小程序组件声明 `properties`
      - 编译时宏函数 `defineExpose`, 用于声明暴露给 `template` 和 `style` 的数据，作用如常规 `script` 中 `setup` 中 `return` 的数据
      - 编译时宏函数 `defineHookConfig`, 用于声明[生命周期钩子](https://vuemini.org/guide/page.html#%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F)的部分设置
    - 使用 cssVars 特性时
      - 生成的 css 变量会挂载到
        - 页面文件： `page-meta` 的 `page-style` 中，如果没有 `page-meta`，则包裹一层 `page-meta`
        - 组件文件： 首个节点的 `style` 中，如果是多节点，则包裹一层 `view`
      - `script` 或 `script setup` 中必须将 `v-bind` 使用的参数明确通过 `setup` 函数的 `return` 或 `defineExpose` 暴露出来
    - 使用 cssModules 特性时
      - 使用 `<style module>` 时，默认的 module 名称为 `styles`，如：`<view :class="styles.className"/>`，请注意避免命名冲突
      - 使用 `<style module="modName">` 时，使用具体声明的 module 名称，如：`<view :class="modName.className"/>`
    - 支持原生混合开发
    - 不支持 `scoped` 样式
  - 示例
    - 常规写法
      ```html
      <template>
        <view class="home">
          <button :class="cssModule.btn">{{msg}}</button>
          <view>{{wxs.msg}}<view>
          <vue-comp/>
        </view>
      </template>
      <wxs lang="ts" module="wxs">
        var hi = "hello, vue-mini";
        module.exports.msg = hi;
      </wxs>
      <script lnag="ts">
      import { definePage, onPageScroll, ref } from '@vue-mini/wechat'
      // `.vue` 组件引用可按照 vue 的语法应用
      // 亦可在 `definePageConfig` 通过 `usingComponents` 引用，但必须带 `.vue` 扩展名
      import VueComp from "@/components/VueComp.vue"

      definePageConfig({
        navigationBarTitleText: "Home",
        usingComponents: {
          // "vue-comp": "@/components/VueComp.vue" // `.vue` 组件
          // "native-comp": "@/components/NativeComp" // 原生组件
        }
      })

      export default definePage({
        components: { VueComp },
        setup() {
          const msg = ref("click me")
          const color = ref("#168")
          const onClick = () => { msg.value = "clicked" }

          onPageScroll(({ scrollTop }) => {
            console.log('scrollTop:', scrollTop)
          })

          return {
            msg,
            color,
            onClick
          }
        }
      }, { listenPageScroll: true })
      </script>
      <style>
        .home {
          background-color: v-bind(color);
        }
      </style>
      <style module="cssModule">
        .btn {
          color: red;
        }
      </style>
      ```
    - `script setup` 写法
      ```html
      <script setup lang="ts">
      import { onPageScroll, ref } from '@vue-mini/wechat'
      import VueComp from "@/components/VueComp.vue"

      definePageConfig({
        navigationBarTitleText: "script setup"
      })

      const msg = ref("click me")
      const color = ref("#168")
      const onClick = () => { msg.value = "clicked" }

      onPageScroll(({ scrollTop }) => {
        console.log('scrollTop:', scrollTop)
      })

      defineHookConfig({
        listenPageScroll: true
      })

      defineExpose({
        msg,
        color,
        onClick
      })
      </script>
      <style>
        .home {
          background-color: v-bind(color);
        }
      </style>
      <style module="cssModule">
        .btn {
          color: red;
        }
      </style>
      ```
- 组件文件，详见 [`vue-mini` 文档](https://vuemini.org/guide/component.html)
  - 语法与组件语法一致
  - 必须在 `definePageConfig` 明确声明 `component: true`
  - 示例
    ```html
    <template>
      <view class="home">
        <button :class="cssModule.btn">{{msg}}</button>
      </view>
    </template>
    <script setup lang="ts">
      import { ref } from '@vue-mini/wechat'

      definePageConfig({
        component: true
      })

      defineProps({
        prop: Number
      })

      const msg = ref("click me")
      const color = ref("#168")
      const onClick = () => { msg.value = "clicked" }

      defineExpose({
        msg,
        color,
        onClick
      })
      </script>
    ```

## TODOs
- [ ] script setup
  - [ ] `defineEmits` ??
- [ ] template transforms
  - [ ] h5 tag transform
  - [ ] directives transforms
    - [x] `v-model`, change to events?
    - [ ] `v-slot`
      - [ ] special use cases
    - [x] `v-bind`
      - [ ] style bindings
      - [ ] class bindings
- [ ] native page and components bundling
  - [x] native template asset url transform
  - [ ] components
    - [ ] third party libs
      - [ ] cache module name for bundling to `miniprogram_npm` 
- [ ] style
  - [ ] postcss transform
    - [ ] serve url locally if `useCDN` is enabled
    - [ ] or convert url to base64 if not
- [ ] mini-app tag.d.ts for volar syntax highlighting

## 关于 `vue-mini`
> [`vue-mini`](https://vuemini.org/) 是一个基于 `@vue/reactivity` 且非常`轻量`的小程序<u>**纯运行时**</u>库（目前仅支持微型小程序），仅聚焦于小程序逻辑部分，支持使用 vue 的 `Composition API` 语法以及与小程序原生语法协同工作。如果大家希望 `vue-mini` 增加更多特性，可考虑[赞助](https://vuemini.org/guide/sponsor.html)其[作者](https://github.com/yangmingshan)。