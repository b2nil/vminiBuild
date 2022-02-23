import { compileTemplate } from '../../src/compiler-mini/template'

async function compile (
  html: string,
  options: any = {
    id: "test",
    filename: "test.vue",
    cssVars: [],
    cssModules: {},
    platformDir: "wx"
  }
) {
  const res = await compileTemplate(html, options)
  return res.code
}

describe("transform v-on", () => {
  it.concurrent("should transform v-on to bind", async () => {
    const res = await compile(`<input v-on:input="handleClick"/>`)
    expect(res).toMatch(`<input bind:input="handleClick"/>\r\n`)
  })
  it.concurrent("should transform @click to bind:tap", async () => {
    const res = await compile(`<view @click="handleClick"></view>`)
    expect(res).toMatch(`<view bind:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.stop to catch:tap", async () => {
    const res = await compile(`<view @click.stop="handleClick"></view>`)
    expect(res).toMatch(`<view catch:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.catch to catch:tap", async () => {
    const res = await compile(`<view @click.catch="handleClick"></view>`)
    expect(res).toMatch(`<view catch:tap="handleClick"></view>\r\n`)
  })
  it("should transform @click.mut to mut-bind:tap", async () => {
    const res = await compile(`<view @click.mut="handleClick"></view>`)
    expect(res).toMatch(`<view mut-bind:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.capture to capture-bind:tap", async () => {
    const res = await compile(`<view @click.capture="handleClick"></view>`)
    expect(res).toMatch(`<view capture-bind:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.capture.stop to capture-catch:tap", async () => {
    const res = await compile(`<view @click.capture.stop="handleClick"></view>`)
    expect(res).toMatch(`<view capture-catch:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.capture.catch to capture-catch:tap", async () => {
    const res = await compile(`<view @click.capture.catch="handleClick"></view>`)
    expect(res).toMatch(`<view capture-catch:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.stop.capture to capture-catch:tap", async () => {
    const res = await compile(`<view @click.stop.capture="handleClick"></view>`)
    expect(res).toMatch(`<view capture-catch:tap="handleClick"></view>\r\n`)
  })
  it.concurrent("should transform @click.catch.capture to capture-catch:tap", async () => {
    const res = await compile(`<view @click.catch.capture="handleClick"></view>`)
    expect(res).toMatch(`<view capture-catch:tap="handleClick"></view>\r\n`)
  })
})

describe("transform v-if/else-if/else", () => {
  it.concurrent("should transform v-if to wx:if", async () => {
    const res = await compile(`<view v-if="isCond(var)">True</view>`)
    expect(res).toMatch(`<view wx:if="{{isCond(var)}}">True</view>\r\n`)
  })

  it.concurrent("should transform v-else-if to wx:elif", async () => {
    const res = await compile(`<view v-else-if="length > 2">2</view>`)
    expect(res).toMatch(`<view wx:elif="{{length > 2}}">2</view>\r\n`)
  })

  it.concurrent("should transform v-else to wx:else", async () => {
    const res = await compile(`<view v-else>3</view>`)
    expect(res).toMatch(`<view wx:else>3</view>\r\n`)
  })
})

describe("transform v-for", () => {
  it.concurrent("should transform array mapping: item in items ", async () => {
    const res = await compile(`<li v-for="item in items">{{ item }}</li>`)
    expect(res).toMatch(
      `<li wx:for="{{items}}" wx:for-item="item" wx:key="*this">{{ item }}</li>\r\n`
    )
  })

  it.concurrent("should transform array mapping: item of items ", async () => {
    const res = await compile(`<li v-for="item in items">{{ item }}</li>`)
    expect(res).toMatch(
      `<li wx:for="{{items}}" wx:for-item="item" wx:key="*this">{{ item }}</li>\r\n`
    )
  })

  it.concurrent("should transform array mapping with index: (item, index) in items ", async () => {
    const res = await compile(
      '<li v-for="(item, index) in items">{{ `${item}-${index}` }}</li>'
    )
    expect(res).toMatch(
      '<li wx:for="{{items}}" wx:for-item="item" wx:for-index="index" wx:key="*this">{{ `${item}-${index}` }}</li>\r\n'
    )
  })

  it.concurrent("should transform array mapping with index: (item, index) of items ", async () => {
    const res = await compile(
      '<li v-for="(item, index) of items">{{ `${item}-${index}` }}</li>'
    )
    expect(res).toMatch(
      '<li wx:for="{{items}}" wx:for-item="item" wx:for-index="index" wx:key="*this">{{ `${item}-${index}` }}</li>\r\n'
    )
  })
})

describe("transform v-model", () => {
  it.concurrent("should transform v-model='data' to model:value='data'", async () => {
    const res = await compile(
      '<input v-model="data"/>'
    )
    expect(res).toMatch(
      '<input model:value="{{data}}"/>\r\n'
    )
  })

  it.concurrent("should transform v-model:checked='data' to model:checked='data'", async () => {
    const res = await compile(
      '<input v-model:checked="data"/>'
    )
    expect(res).toMatch(
      '<input model:checked="{{data}}"/>\r\n'
    )
  })
})

describe("transform v-slot", () => {
  it.concurrent("should transform default slot", async () => {
    const res = await compile(
      '<template v-slot/>'
    )
    expect(res).toMatch(
      '<view/>\r\n'
    )
  })
})

describe("transform cssVars", () => {
  const opts = {
    id: "abcd123",
    cssVars: ["color", "bgColor"],
    filename: "test.vue",
    cssModules: {}
  }

  const inlineCssVars = opts.cssVars.map(v => `--${opts.id}-${v}: {{${v}}}`).join("; ")

  describe("- page", () => {
    it.concurrent("should add page-meta for attaching cssVars info", async () => {
      const res = await compile(
        '<view/>',
        opts
      )
      expect(res).toMatch(
        `<page-meta page-style="${inlineCssVars}">\r\n  <view/>\r\n</page-meta>`
      )
    })

    it.concurrent("should add cssVars info to existing page-meta with no page-style", async () => {
      const res = await compile(
        '<page-meta/>',
        opts
      )
      expect(res).toMatch(
        `<page-meta page-style="${inlineCssVars}"/>`
      )
    })

    it.concurrent("should add cssVars info to existing page-meta's static page-style", async () => {
      const res = await compile(
        '<page-meta page-style="padding: 2;"/>',
        opts
      )
      expect(res).toMatch(
        `<page-meta page-style="padding: 2; ${inlineCssVars}"/>`
      )
    })

    // TODO: dynamic style binding
    it.concurrent.skip("should add cssVars info to existing page-meta's dynamic page-style", async () => {
      const res = await compile(
        '<page-meta :page-style="{padding: 2}"/>',
        opts
      )
      expect(res).toMatch(
        `<page-meta page-style="padding: 2; ${inlineCssVars}"/>`
      )
    })
  })

  describe("- component", () => {
    const options = {
      ...opts,
      isComponent: true
    }

    it.concurrent("should add a new `view` for attaching cssVars info", async () => {
      const res = await compile(
        '<view/><view/>',
        options
      )
      expect(res).toMatch(
        `<view style="${inlineCssVars}">\r\n  <view/>\r\n  <view/>\r\n</view>`
      )
    })

    it.concurrent("should add cssVars to existing `view` with no style prop", async () => {
      const res = await compile(
        '<view/>',
        options
      )
      expect(res).toMatch(
        `<view style="${inlineCssVars}"/>`
      )
    })

    it.concurrent("should add cssVars to existing `view`'s static style prop", async () => {
      const res = await compile(
        '<view style="padding: 2;"/>',
        options
      )
      expect(res).toMatch(
        `<view style="padding: 2; ${inlineCssVars}"/>`
      )
    })

    // TODO: dynamic style binding
    it.concurrent.skip("should add cssVars to existing `view`'s dynamic style prop", async () => {
      const res = await compile(
        '<view :style="{padding: 2}"/>',
        options
      )
      expect(res).toMatch(
        `<view style="padding: 2; ${inlineCssVars}"/>`
      )
    })
  })
})

describe("transform asset urls", () => {

  it.concurrent("should image's src attr", async () => {
    const res = await compile(
      `<image src="../images/asset.png"/>`)
    expect(res).toMatch(
      `<image src="../images/asset.png"/>`
    )
  })

  it.concurrent("should prefix asset url with base host name", async () => {
    const res = await compile(
      `<image src="../images/asset.png"/>`,
      {
        id: "test",
        filename: "test.vue",
        cssVars: [],
        scoped: true,
        cssModules: {},
        transformAssetUrls: {
          base: "http://192.168.1.2:3000"
        }
      }
    )
    expect(res).toMatch(
      `<image src="http://192.168.1.2:3000/images/asset.png"/>`
    )
  })
})

describe("transform css modules", () => {
  it.concurrent("shall transform class with cssModules", async () => {
    const res = await compile(
      `<button :class="styles.btn"/>`,
      {
        id: "test",
        filename: "test.vue",
        cssVars: [],
        cssModules: {
          styles: {
            btn: "_btn_8ydhi"
          }
        }
      }
    )

    expect(res).toMatch(`<button class="_btn_8ydhi"/>`)
  })
})