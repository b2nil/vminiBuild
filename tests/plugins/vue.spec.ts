import esbuild from "esbuild"
const { vuePlugin } = require('../plugin')

const compileVue = async (src: string) => {
  const res = await esbuild.build({
    entryPoints: [src],
    format: "esm",
    bundle: false,
    write: false,
    plugins: [vuePlugin()]
  })

  const out = res.outputFiles[0]
  const code = String.fromCharCode.apply(null, out.contents)

  return code
}

describe("vue plugin", () => {
  it("should transform .vue with normal script for bundling", async () => {
    const res = await compileVue("./tests/plugins/vue/src/script.vue")
    expect(res).toMatch(/import "\.\/components\/comp\.vue"/)
    expect(res).toMatch(/import "\.\/components\/comp2\.vue"/)
    expect(res).toMatch(/import "\.\/pseudo.wxs"/)
    expect(res).toMatch("function definePageConfig(config)")
    expect(res).toMatchSnapshot()
  })

  it("should transform .vue with script setup for bundling", async () => {
    const res = await compileVue("./tests/plugins/vue/src/scriptSetup.vue")
    expect(res).toMatch(/import "\.\/components\/comp\.vue"/)
    expect(res).toMatch(/import "\.\/components\/comp2\.vue"/)
    expect(res).toMatch(/import "\.\/test.wxs"/)
    expect(res).toMatch("function definePageConfig(config)")
    expect(res).toMatch("function defineProps(config)")
    expect(res).toMatch("function defineExpose(config)")
    expect(res).toMatch("function defineHookConfig(config)")

    expect(res).toMatchSnapshot()
  })
})

