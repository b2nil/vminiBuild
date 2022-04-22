import type { SitemapConfig } from "./sitemap"
import type { ProjectConfig } from "./project"
import type { AppConfig, PageConfig } from "./config"
import type { BuildOptions, ServeOptions } from "esbuild"
import type {
  SFCTemplateCompileOptions,
  SFCScriptCompileOptions,
  SFCAsyncStyleCompileOptions
} from '@vue/compiler-sfc'

export * from "./config"
export * from "./project"
export * from "./sitemap"

export interface TransformResult {
  s?: MagicString
  lang?: string
  source?: string
  code?: string
  imports?: Set<string>
  config?: PageConfig
  components?: Record<string, any>
  scriptAst?: Statement[]
  isScriptSetup?: boolean
  vueComp?: Set<string>
  importedHelpers?: string[]
}

export interface CliOptions {
  platform?: UserConfig["platform"]
  p?: UserConfig["platform"]
  l?: BuildOptions["logLevel"]
  logLevel?: BuildOptions["logLevel"]
  w?: boolean
  watch?: boolean
  c?: string
  config?: string
  minify?: boolean
  emptyOutDir?: boolean
}

export interface VueOptions {
  useCDN?: boolean
  template?: Pick<
    SFCTemplateCompileOptions,
    'scoped' | 'compiler' | 'preprocessLang' | 'preprocessOptions' | 'compilerOptions' | 'transformAssetUrls' | 'preprocessCustomRequire'
  >
  script?: Pick<SFCScriptCompileOptions, 'babelParserPlugins' | 'reactivityTransform'>
  style?: Pick<
    SFCAsyncStyleCompileOptions,
    'modules' | 'modulesOptions' | 'preprocessLang' | 'preprocessOptions' | 'postcssOptions' | 'postcssPlugins' | 'preprocessCustomRequire'
  >
}

export interface UserConfig {
  outDir?: string,
  emptyOutDir?: boolean,
  platform?: "weapp" | "alipay" | "swan" | "tt"
  designWidth?: number
  aliases?: false | Record<string, string>
  useCDN?: ServeOptions["serve"]
  watch?: BuildOptions["watch"]
  minify?: BuildOptions["minify"]
  define?: BuildOptions["define"]
  logLevel?: BuildOptions["logLevel"],
  plugins?: BuildOptions["plugins"],
  vue?: VueOptions
}

// https://vuemini.org/guide/page.html#%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F
interface LifeHookConfig {
  listenPageScroll?: boolean
  canShareToOthers?: boolean
  canShareToTimeline?: boolean
}

declare global {
  const defineProps: (props: Record<string, any>) => Record<string, any>
  const defineExpose: (setupReturn: Record<string, any>) => Record<string, any>
  const defineAppConfig: (appConfig: AppConfig) => AppConfig
  const definePageConfig: (pageConfig: PageConfig) => PageConfig
  const defineHookConfig: (config: LifeHookConfig) => LifeHookConfig
  const defineBuildConfig: (config: UserConfig) => UserConfig
  const defineProjectConfig: (projectConfig: ProjectConfig) => ProjectConfig
  const defineSitemapConfig: (sitemapConfig: SitemapConfig) => SitemapConfig
}

declare namespace NodeJS {
  interface ProcessEnv {
    __PLATFORM__: 'weapp' | 'swan' | 'alipay' | 'tt' | 'jd'
  }
}