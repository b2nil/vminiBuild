import path from "path"
import { compileScript } from '../../src/compiler-mini'
import { externals } from '../../src/utils'
import { parse } from '@vue/compiler-sfc'
import type { TransformResult } from '../../types'

externals.push("@vue-mini/wechat")

const script = `
<script>
import { ref } from "@vue-mini/wechat"
import ComOne from "../components/comp.vue"
import ComTwo from "../components/comp2.vue"
definePageConfig({
  a: {c: "d"},
  b: "a"
})
export default definePage({
  components: {
    ComOne,
    ComTwo
  },
  props: { hi: Number },
  setup(){
    const data = ref(0)
    const method = () => { console.log() }
    return { 
      data,
      method
    }
  }
})
</script>
`

const scriptSetup = `
<script setup>
import { ref } from "@vue-mini/wechat"
import ComOne from "../components/comp.vue"
import ComTwo from "../components/comp2.vue"

definePageConfig({
  a: {c: "d"},
  b: "a"
})

defineProps({
  hi: Number
})

defineHookConfig({
  listenPageScroll: true
})

const data = ref(null)

const method = () => { console.log() }

defineExpose({
  data,
  method
})
</script>
`
const extractedConfig = {
  a: { c: "d" },
  b: "a",
  usingComponents: {
    "com-one": "../components/comp.vue",
    "com-two": "../components/comp2.vue"
  }
}

describe("transform script", () => {
  it("should transform normal script", async () => {
    const { descriptor } = parse(script, {
      filename: "./test.vue"
    })
    let ret: TransformResult = {}
    ret = compileScript(descriptor, ret)

    expect(ret.config).toEqual(extractedConfig)

    expect(ret.components).toEqual({
      "com-one": "../components/comp.vue",
      "com-two": "../components/comp2.vue"
    })

    expect(ret.imports).toEqual(new Set<string>([
      `${path.resolve(process.cwd(), "../components/comp.vue")}`,
      `${path.resolve(process.cwd(), "../components/comp2.vue")}`,
    ]))

    expect(ret.code).not.toMatch(/"\.\.\/components\/.+\.vue"/)
    expect(ret.code).toMatchSnapshot()

    const post = compileScript(descriptor, ret, undefined, true)
    expect(post.code).toMatchSnapshot()
    expect(ret.config).toMatchSnapshot()
  })

  it("should transform scriptSetup", async () => {
    const { descriptor } = parse(scriptSetup, {
      filename: "./test.vue"
    })
    let ret: TransformResult = {}
    ret = compileScript(descriptor, ret)

    expect(ret.config).toEqual(extractedConfig)

    expect(ret.components).toEqual({
      "com-one": "../components/comp.vue",
      "com-two": "../components/comp2.vue"
    })

    expect(ret.imports).toEqual(new Set<string>([
      `${path.resolve(process.cwd(), "../components/comp.vue")}`,
      `${path.resolve(process.cwd(), "../components/comp2.vue")}`,
    ]))
    expect(ret.code).toMatchSnapshot()

    const post = compileScript(descriptor, ret, undefined, true)
    expect(post.code).toMatchSnapshot()
    expect(post.config).toMatchSnapshot()
  })
})