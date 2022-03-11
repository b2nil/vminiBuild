import path from "path"
import fs from "fs"

export function requireModuleFromString (code: string, filename: string) {
  const Module = require("module")
  var paths = Module._nodeModulePaths(path.join(process.cwd(), "node_modules"))
  var parent = Module.parent
  var m = new Module(filename, parent)
  m.filename = filename
  m.paths = paths
  m._compile(code, filename)
  return m.exports
}

export function extractConfig (raw: string, filename: string, macro?: string) {
  let code = ``
  if (macro) {
    code += `function ${macro}(config) { return config; }\n`
    code += raw
  } else {
    code += `exports.config = ${raw}`
  }

  const res = requireModuleFromString(code, filename)
  return res.default || res.config || res
}

export async function extractConfigFromFile (filename: string, macro?: string) {
  if (!fs.existsSync(filename)) {
    console.warn(`[x] could not find file: ${filename}`)
    return null
  }
  const res = await require("esbuild").build({
    entryPoints: [filename],
    platform: "node",
    format: "cjs",
    bundle: true,
    write: false,
    external: ["/node_modules/*"],
    loader: { ".json": "json" }
  })

  // [WARNING] source file must use UTF-8 encoding
  const out = res.outputFiles[0]
  return extractConfig(out.text, out.path, macro)
}