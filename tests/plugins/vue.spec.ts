import esbuild from "esbuild"
const { vuePlugin } = require('../plugin')

const compileVue = async (src: string) => {
  const res = await esbuild.build({
    entryPoints: [src],
    format: "esm",
    bundle: false,
    write: false,
    loader: {
      ".ts": "ts"
    },
    plugins: [vuePlugin()]
  })

  const out = res.outputFiles[0]
  const code = String.fromCharCode.apply(null, out.contents)

  return code
}

it.concurrent("should transform normal script", async () => {
  expect.assertions(1)
  console.warn = jest.fn()
  await compileVue("./tests/plugins/vue/test.vue")
  expect(console.warn).toHaveBeenCalled()
})
