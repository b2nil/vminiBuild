export default defineProjectConfig({
  description: "项目配置文件",
  projectname: "vmini-build-demo",
  appid: "touristid",
  compileType: "miniprogram",
  packOptions: {
    ignore: []
  },
  setting: {
    es6: true,
    urlCheck: true,
    checkSiteMap: true,
    uploadWithSourceMap: true,
    ignoreDevUnusedFiles: true,
  }
})