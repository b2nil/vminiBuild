# `vmini-build`
> 配合 `@vue-mini/wechat` 使用的 `vue sfc` 编译器 + 脚手架
> - 基于 `esbuild` 的脚手架
> - 轻量 + 快速

## 特性
  - [x] vue 3 单文件组件语法
    - [x] script setup
    - [x] cssVars
    - [x] cssModules
    - [x] pug
    - [x] css preprocess
    - [x] postcss， 默认使用 `Taro` 的 `postcss-pxtransform`
  - [x] 基于 `esbuild` 的快速编译脚手架
    - [x] 编译时宏函数，友好的类型提示和代码补全

## TODOs
- [x] wrapp esbuild as a cli
  - [x] esbuild config file
    - [x] use `mini.config.ts/js` as default
    - [x] use `-c, --config <filepath>` to specify a config file
      - [x] use `vite.config.ts` for ide icon highlight
    - [x] use `defineBuildConfig` for type suggests and code completion
      - [x] use the same method adopted for project config macros
- [x] compiler macros
  - [x] use `@babel/parser` and `magic-string` from `@vue/compiler-sfc`
    - [x] to minimize dependencies
    - [x] and to maintain a reasonable speed
  - [x] project, app and page config files
    - [x] `defineProjectConfig`
    - [x] `defineSitemapConfig`
    - [x] `defineAppConfig`
    - [x] `definePageConfig`
    - [x] extract config from file
      - [x] bundle with esbuild to a `cjs` output for requiring module from string
      - [x] support `esm` and `cjs` syntaxes
  - [x] script setup
    - [x] inject css modules 
    - [x] `defineProps` for props
    - [x] `defineExpose` for setup returns
    - [x] `defineHookConfig` for lifecycle hook configuration
    - [ ] `defineEmits` ??
- [x] alias imports
  - [x] use alias setting from config file
  - [x] or load from `tsconfig.json` 
- [x] assets imports
  - [x] assets used in app config file
  - [x] assets using in template
  - [ ] assets using in style
- [x] entry plugins for esbuild
  - [x] `app.ts/js`
  - [x] `app.config.ts/js`
    - [x] warn if `app.config.ts/js` not exist
    - [x] extract app config from file
    - [x] emit app config file
    - [x] bundling all `.vue` entries into this config file
      - [ ] import `.vue` components as global components?
      - [x] import pages
      - [x] import subpackage pages
      - [x] import component entries
  - [x] `project.config.ts/js`
  - [x] `sitemap.ts/js`
- [x] `plugin-vue` for esbuild
  - [ ] `wxs` support, using custom block
    - [x] `<wxs lang="ts" module="mod"></wxs>`, using `lang` for syntax highlighting
    - [x] directly prepend to `wxml`
    - [ ] `wxs` block with `src` attr
  - [ ] template transforms
    - [ ] h5 tag transform
    - [x] directives transforms
      - [x] `v-model`, change to events?
      - [x] `v-on`
      - [x] `v-if`
      - [x] `v-for`
      - [x] `v-show`
      - [ ] `v-slot`
        - [ ] special use cases
      - [x] `v-bind`
        - [x] normal bindings
        - [ ] style bindings
        - [ ] class bindings
      - [x] cssVars transforms
        - [x] mark template as a `page` or a `component` for cssVars transforms
          - [x] using `definePageConfig`'s `component` option
        - [x] page
          - [x] use `page-meta` to wrap a page for fragments
          - [x] bind cssVars to `page-meta`'s `page-style`
          - [x] merge cssVars to `page-meta`'s `page-style` if `page-meta` already exist
        - [x] component
          - [x] single root: bind cssVars to root element's `style`
          - [x] fragments: wrap with `view` for cssVars binding
      - [ ] asset url transforms
          - [ ] serve locally if `useCDN` is enabled
          - [x] cache files and directly copy to `dist`
      - [x] not to support `template` with `src` attr, use component instead
  - [ ] script
    - [x] not to support `script` with `src` attr, use import instead 
    - [x] cssVars shall be returned in `setup`
    - [x] script setup transform
      - [x] `definePageConfig` for properties
      - [x] `defineProps` for properties
      - [x] `defineExpose` for setup returns and cssVars
      - [x] `defineHookConfig` for lifecycle hook configuration
    - [ ] native component imports using `usingComponent`
      - [ ] local components :-> cache directory and directly copy to `dist`
      - [ ] third party libs :-> cache module name for bundling to `miniprogram_npm`
    - [x] sfc component imports by analysing `.vue` import declaration
    - [ ] extend `definePage` and `defineComponent` definition to allow `components` option to avoid type check error
  - [ ] style
    - [x] global style
    - [x] style imports
    - [x] style preprocess
    - [x] style postprocess, support Taro's `postcss-pxtransform` by default
    - [x] style cssVars, using `v-bind`
      - [x] variables shall be returned in setup option 
      - [x] or shall be exposed by `defineExpose` in script setup
    - [x] postcss transform
      - [x] px -> rpx, directly use Taro's postcss plugin
      - [ ] url transforms
        - [ ] serve locally if `useCDN` is enabled
        - [ ] convert to base64 if not
    - [x] style module
    - [ ] style scoped
      - [ ] mini-app does not support `btn[data-v-xxx]`, possible implementation is to convert to `.btn.data-v-xxx` and add `data-v-xxx` to every element with `class` attr
- [ ] mini-app tag.d.ts for volar syntax highlighting