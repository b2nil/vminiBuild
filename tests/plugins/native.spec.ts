import esbuild from "esbuild"
const { nativePlugin } = require('../plugin')

const compileNative = async (src: string) => {
  const res = await esbuild.build({
    entryPoints: [src],
    format: "esm",
    bundle: false,
    write: false,
    plugins: [nativePlugin()]
  })

  const out = res.outputFiles[0]
  const code: string = String.fromCharCode.apply(null, out.contents)

  return code
}

describe("mini-app native plugin", () => {

  it.concurrent("should transform and emit js file", async () => {
    const res = await compileNative("./tests/plugins/native/src/test.js?native&type=js")
    expect(res).toMatch(/var stdin_default = definePage\(\{/)
    expect(res).toMatch(/export \{\W+stdin_default as default\W+\}/)
  })

  it.concurrent("should transform and emit json file", async () => {
    const res = await compileNative("./tests/plugins/native/src/test.json?native&type=json")
    expect(res).toMatch(`import "./comp/index.js?native&type=js";\n`)
    expect(res).toMatch(`import "./comp/index.json?native&type=json";\n`)
    expect(res).toMatch(`import "./comp/index.wxml?native&type=wxml";\n`)
  })

  it.concurrent("should transform and emit wxml file", async () => {
    const res = await compileNative("./tests/plugins/native/src/test.wxml?native&type=wxml")
    expect(res).toMatch(`import "./test.wxs";\n`)
  })

  it.concurrent("should transform and emit wxss file", async () => {
    const res = await compileNative("./tests/plugins/native/src/test.wxss?native&type=wxss")
  })

  it.concurrent("should transform and emit wxs file", async () => {
    const res = await compileNative("./tests/plugins/native/src/test.wxs")
    expect(res).toMatch(`import "./pseudo.wxs";\n`)
  })
})