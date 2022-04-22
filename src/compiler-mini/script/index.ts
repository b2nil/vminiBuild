import { DEFINE } from '../../utils'
import {
  extractImports,
  findKeyPositions,
  isExprStatementOf,
  extractConfigFromAST,
} from './ast'
import {
  MagicString,
  babelParse,
  SFCDescriptor
} from "@vue/compiler-sfc"
import { transformAST, shouldTransform } from "@vue/reactivity-transform"

import type {
  VueOptions,
  TransformResult
} from 'types'
import type {
  ParserPlugin
} from '@babel/parser'
import type {
  Identifier,
  CallExpression,
  ImportDeclaration,
  ExpressionStatement,
} from '@babel/types'

function preScriptTransform (
  filename: string,
  ret: TransformResult,
) {
  const { s, scriptAst } = ret
  scriptAst!.forEach(stmt => {
    if (stmt.type === "ImportDeclaration") {
      extractImports(stmt, filename, ret)
    } else if (isExprStatementOf(stmt, /^definePageConfig$/)) {
      ret.config = extractConfigFromAST(stmt as ExpressionStatement)
    }
  })

  if (ret.config && ret.components) {
    ret.config["usingComponents"] = {
      ...(ret.config["usingComponents"] || {}),
      ...(ret.components)
    }
  }

  ret.code = s!.toString()
}

export function postScriptTransform (ret: TransformResult) {
  const { s, scriptAst } = ret
  scriptAst!.forEach(stmt => {
    if (stmt.type === "ImportDeclaration") {
      if (stmt.source.value.endsWith(".vue")) {
        const { start, end } = stmt
        s!.remove(start!, end!)
      }
    } else if (isExprStatementOf(stmt, /^definePageConfig$/)) {
      s!.remove(stmt.start!, stmt.end!)
    } else if (isExprStatementOf(stmt, /^define(Page|Component)$/, "ExportDefaultDeclaration")) {
      const loc = findKeyPositions(stmt as any)
      if (loc.props) {
        s!.overwrite(loc.props.start, loc.props.end, "properties")
      }
      if (loc.components) {
        s!.remove(loc.components.start, loc.components.end + 1) // +1 to remove comma,
      }
    }
  })

  ret.code = s!.toString()
}

function analyzeSetupAST (ret: TransformResult) {
  const res: {
    imports?: string
    props?: string
    expose?: string
    hook?: string
  } = {}
  const decls: ImportDeclaration[] = []
  const { scriptAst, s } = ret
  let hasVueminiImported = false

  scriptAst!.forEach(n => {
    if (n.type === "ImportDeclaration") {
      decls.push(n)
      if (n.source.value.endsWith(".vue")) {
        s!.remove(n.start!, n.end!)
      }

      if (n.source.value === "@vue-mini/wechat") {
        s!.appendRight(n.specifiers[0].end!, `, defineComponent`)
        hasVueminiImported = true
      }
    } else if (isExprStatementOf(n, /^define(PageConfig|Props|Expose|HookConfig)$/)) {
      const expr = (n as ExpressionStatement).expression as CallExpression
      const arg = expr.arguments[0]
      const rawArg = s?.slice(arg.start!, arg.end!)
      switch ((expr.callee as Identifier).name) {
        case DEFINE.EXPOSE:
          res.expose = rawArg
          break
        case DEFINE.HOOK:
          res.hook = rawArg
          break
        case DEFINE.PROPS:
          res.props = rawArg
          break
      }
      s!.remove(n.start!, n.end!)
    }
  })

  const lastImport = decls[decls.length - 1]
  const imports = s!.slice(0, lastImport.end!)

  s!.remove(0, lastImport.end!)

  if (lastImport) {
    res.imports = hasVueminiImported
      ? imports
      : imports + `\nimport { defineComponent } from "@vue-mini/wechat"\n`
  } else {
    res.imports = `\nimport { defineComponent } from "@vue-mini/wechat"\n`
  }

  return res
}

function genImporterHelpers (importedHelpers: string[]) {
  return `import { ${importedHelpers
    .map(h => `${h} as _${h}`)
    .join(', ')} } from '@vue-mini/wechat'\n`
}

function postScriptSetupTransform (ret: TransformResult) {
  const res = analyzeSetupAST(ret)
  let code = `\n`
  if (ret.importedHelpers?.length) {
    code += genImporterHelpers(ret.importedHelpers)
  }
  if (res.imports) {
    code += res.imports
  }
  code += `\nexport default defineComponent({\n`
  if (res.props) {
    code += `properties: ${res.props},\n`
  }
  code += `setup() {\n    ${ret.s!.toString()}\n`
  code += `return ${res.expose || "{}"}\n`
  code += `}\n`
  code += res.hook ? `},\n${res.hook})` : `})\n`
  ret.code = code
}

const genMacroFuncCode = (funcName: string) => `function ${funcName}(config) { return config }\n`

export function compileScript (
  descriptor: SFCDescriptor,
  ret: TransformResult,
  scriptOptions?: VueOptions["script"],
  post?: boolean
): TransformResult {
  if (post) {
    ret.isScriptSetup
      ? postScriptSetupTransform(ret)
      : postScriptTransform(ret)
    const { code } = require("esbuild").transformSync(ret.code, { loader: "ts" })
    ret.code = code
    return ret
  }

  if (descriptor.script) {
    ret.lang = descriptor.script.lang
    ret.source = descriptor.script.content || ""
    ret.scriptAst = descriptor.script.scriptAst
  } else if (descriptor.scriptSetup) {
    ret.lang = descriptor.scriptSetup.lang
    ret.source = descriptor.scriptSetup.content || ""
    ret.scriptAst = descriptor.scriptSetup.scriptSetupAst
    ret.isScriptSetup = true
  }

  const plugins: ParserPlugin[] = []
  if (scriptOptions?.babelParserPlugins) plugins.push(...scriptOptions.babelParserPlugins)
  if (ret.lang === "ts") plugins.push("typescript", "decorators-legacy")

  ret.s = new MagicString(ret.source!)
  if (!ret.scriptAst) {
    const scriptAst = babelParse(ret.source!, {
      plugins,
      sourceType: "module"
    }).program

    if (scriptOptions?.reactivityTransform && shouldTransform(ret.source!)) {
      const { importedHelpers } = transformAST(scriptAst, ret.s)
      if (importedHelpers.length) {
        ret.isScriptSetup
          ? ret.importedHelpers = importedHelpers
          : ret.s.prepend(genImporterHelpers(importedHelpers))
      }
    }

    ret.scriptAst = scriptAst.body
  }

  preScriptTransform(descriptor.filename, ret)

  ret.code += `\n` + genMacroFuncCode(DEFINE.PAGE_CONFIG)
  if (ret.isScriptSetup) {
    ret.code += genMacroFuncCode(DEFINE.PROPS)
    ret.code += genMacroFuncCode(DEFINE.EXPOSE)
    ret.code += genMacroFuncCode(DEFINE.HOOK)
    ret.code += `const COMP_r3m0v3 = { ${Array.from(ret.vueComp || []).map(v => v).join(", ")} }\n`
    ret.code += `export default COMP_r3m0v3\n`
  }

  return ret
}