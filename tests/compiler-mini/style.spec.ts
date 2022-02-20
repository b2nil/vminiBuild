import { compileStyleAsync } from '../../src/compiler-mini'

const defaultOption = {
  id: "test",
  filename: "test.css"
}

async function compile (
  css: string,
  options: any = defaultOption
) {
  const res = await compileStyleAsync({
    source: css,
    ...options
  })
  return res
}

const css = `
.btn {
  color: red;
}
`

describe("transform styles", () => {
  it("should transform css module", async () => {
    const res = await compile(css, { ...defaultOption, modules: true })
    expect(res.code).toMatchSnapshot()
    expect(res.modules).toMatchSnapshot()
  })
})

