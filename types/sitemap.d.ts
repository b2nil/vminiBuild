/**
 * sitemap 索引规则
 */
interface Rule {
  /**
   * 命中该规则的页面是否能被索引
   * @default "allow"
   */
  action?: "allow" | "disallow"
  /**
   * \* 表示所有页面，不能作为通配符使用
   * @default "*"
   */
  page: string
  /**
   * 当 page 字段指定的页面在被本规则匹配时
   * 可能使用的页面参数名称的列表（不含参数值）
   * @default []
   */
  params?: string[]
  /**
   * 当 page 字段指定的页面在被本规则匹配时，
   * 此参数说明 params 匹配方式
   * @default "inclusive"
   */
  matching?: "exact" | "inclusive" | "exclusive" | "partial"
  /**
   * 优先级，值越大则规则越早被匹配，否则默认从上到下匹配
   */
  priority?: number
}

/**
 * 小程序根目录下的 `sitemap.json` 文件
 * 用于配置小程序及其页面是否允许被微信索引，
 * 文件内容为一个 JSON 对象，
 * 如果没有 sitemap.json ，则默认为所有页面都允许被索引
 * @link https://developers.weixin.qq.com/miniprogram/dev/framework/sitemap.html
 */
export interface SitemapConfig {
  /**
   * sitemap 配置描述
   */
  desc?: string
  /**
   * sitemap 索引规则配置项
   * @default [{ action: "allow", page: "*" }]
   */
  rules: Rule[]
}