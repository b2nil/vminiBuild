
export default defineBuildConfig({
  outDir: `dist`,
  emptyOutDir: true,
  designWidth: 750,
  platform: "weapp",
  vue: {
    script: {
      reactivityTransform: true
    }
  }
})
