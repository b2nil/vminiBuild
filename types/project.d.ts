
/**
 * 项目的编译设置
 */
interface Setting {
  /**
   * 是否启用 es6 转 es5
   */
  es6?: boolean
  /**
   *上传代码时样式是否自动补全
   */
  postcss?: boolean
  /**
   *上传代码时是否自动压缩
   */
  minified?: boolean
  /**
   * 是否检查安全域名和 TLS 版本
   */
  urlCheck?: boolean
  /**
   * 是否进行代码保护
   */
  uglifyFileName?: boolean
  /**
   * 是否打开 SiteMap 索引提示
   * @default true
   */
  checkSiteMap: boolean
  /**
   * 是否使用工具渲染 CoverView
   */
  coverView?: boolean
  /**
   * 是否打开增强编译
   */
  enhance?: boolean
  /**
   * 增强编译下 Babel 的配置项
   */
  babelSetting?: BabelSetting
  /**
   * 是否禁用增强编译的严格模式
   */
  disableUseStrict?: boolean
  /**
   * 上传时是否带上 sourcemap
   * @default true
   */
  uploadWithSourceMap: boolean
  /**
   * 编译插件配置
   */
  useCompilerPlugins?: ("typescript" | "less" | "sass")[]
  /**
   * 预览、真机调试和本地模拟器等开发阶段是否过滤无依赖文件
   * @default true
   */
  ignoreDevUnusedFiles: boolean
  /**
   * 上传时是否过滤无依赖文件
   * @default true
   */
  ignoreUploadUnusedFiles?: boolean
  /**
   *在小游戏插件项目中，是否启用 “以本地目录为插件资源来源”特性
   */
  localPlugins?: boolean
  /**
   * 是否自动运行体验评分
   */
  autoAudits?: boolean
  /**
   * 是否自动校验结构化数据
   */
  scopeDataCheck?: boolean
  /**
   * 是否开启文件保存后自动热重载
   */
  compileHotReLoad?: boolean
  /**
   * 小程序加载时是否数据预拉取
   */
  preloadBackgroundData?: boolean
  /**
   * 是否启用懒注入占位组件调试
   */
  lazyloadPlaceholderEnable?: boolean
  /**
   * 是否展示 JSON 文件校验错误信息
   */
  checkInvalidKey?: boolean
  /**
   * 是否开启调试器 WXML 面板展示 shadow-root
   */
  showShadowRootInWxmlPanel?: boolean
  /**
   * 是否开启小程序独立域调试特性
   */
  useIsolateContext?: boolean
  /**
   * 是否开启独立域调试能力。此设定的优先级高于 useIsolateContext
   */
  userConfirmedUseIsolateContext?: boolean
  /**
   * 是否开启模拟器预先载入小程序的某些资源。
   * 此设定为 false 时会导致 useIsolateContext 失效
   */
  useMultiFrameRuntime?: boolean
  /**
   * 是否启用 API Hook 功能
   */
  useApiHook?: boolean
  /**
   * 是否在额外的进程处理一些小程序 API
   */
  useApiHostProcess?: boolean
  /**
   * 是否手动配置构建 npm 的路径
   */
  packNpmManually?: boolean
  /**
   * 仅 packNpmManually 为 true 时生效，详细参考构建 npm 文档
   */
  packNpmRelationList?: Array<{
    packageJsonPath: string,
    miniprogramNpmDistDir: string
  }>
  /**
   * 是否在游戏引擎项目中开启支持引用 node 原生模块的底层加速特性
   */
  enableEngineNative?: boolean
  /**
   * 小游戏项目是否开启静态资源服务器
   */
  useStaticServer?: boolean
  /**
   * 上传代码时是否自动压缩样式文件
   */
  minifyWXSS?: boolean
  /**
   * 上传代码时是否自动压缩 WXML 文件
   */
  minifyWXML?: boolean
  /**
   * 小游戏项目是否开启局域网调试服务器
   */
  useLanDebug?: boolean
  /**
   * 是否在本地设置中展示传统的 ES6 转 ES5 开关
   */
  showES6CompileOption?: boolean
}

/**
 * 增强编译下 Babel 的配置项
 */
interface BabelSetting {
  /**
   * Babel 辅助函数的输出目录
   * @default @babel/runtime
   */
  outputPath?: string
  /**
   * 配置需要跳过 Babel 编译(包括代码压缩)处理的文件或目录
   */
  ignore?: string[]
  /**
   * 禁用插件？
   */
  disablePlugins?: string[]
}

interface PackOption {
  /** 路径或取值
   * 
   * value 字段的值若表示文件或文件夹路径，
   * 以小程序目录 (miniprogramRoot) 为根目录
   */
  value?: string
  /** 类型
   */
  type?: "folder" | "file" | "suffix" | "prefix" | "regexp" | "glob"
}

/**
 * packOptions 用以配置项目在打包过程中的选项。
 * 打包是预览、上传时对项目进行的必须步骤。
 */
interface PackOptions {
  ignore?: PackOption[]
  include?: PackOption[]
}

/**
 * debugOptions 用以配置在对项目代码进行调试时的选项。
 */
interface DebugOptions {
  hidedInDevtools?: PackOption[]
}

/**
 * watchOptions 用以配置项目中可以被忽略展示和监听文件变化的文件匹配规则。
 */
interface WatchOptions {
  ignore?: string[]
}

/**
 * 指定自定义预处理的命令
 */
interface Scripts {
  /**
   * 编译前预处理命令
   */
  beforeCompile?: string
  /**
   * 预览前预处理命令
   */
  beforePreview?: string
  /**
   * 上传前预处理命令
   */
  beforeUpload?: string
}

interface ConditionList {
  id?: number
  name?: string
  pathName?: string
  query?: string
  scene?: string
}

interface ConditionObject {
  current?: number
  list: ConditionList[]
}

interface Condition {
  miniprogram?: ConditionObject
  plugin?: ConditionObject
  game?: ConditionObject
  gamePlugin?: ConditionObject
}

export interface ProjectConfig {
  description?: string
  /**
   * 指定小程序源码的目录 (需为相对路径)
   */
  miniprogramRoot?: string
  /**
   * 指定腾讯云项目的目录 (需为相对路径)
   */
  qcloudRoot?: string
  /**
   * 指定插件项目的目录 (需为相对路径)
   */
  pluginRoot?: string
  /**
   * 云开发代码根目录
   */
  cloudbaseRoot?: string
  /**
   * 编译类型
   * @default "miniprogram"
   */
  compileType?: "miniprogram" | "plugin"
  /**
   * 项目编译设置
   */
  setting?: Setting
  /**
   * 基础库版本
   */
  libVersion?: string
  /**
   * 项目的 appid，只在新建项目时读取
   * @default "touristappid"
   */
  appid?: string
  /**
   * 项目名字，只在新建项目时读取
   */
  projectname: string
  /**
   * 打包配置选项
   */
  packOptions?: PackOptions
  /**
   * 调试配置选项
   */
  debugOptions?: DebugOptions
  /**
   * 文件监听配置设置
   */
  watchOptions?: WatchOptions
  /**
   * 自定义预处理
   */
  scripts?: Scripts
  /**
   * condition 暂无文档支持
   */
  condition?: Condition
}