export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/mine/index",
  ],
  subPackages: [
    {
      root: "subPackageA",
      pages: ["another/index"]
    },
  ],
  window: {
    navigationBarBackgroundColor: "#1e1e1e",
    navigationBarTextStyle: "white",
    navigationBarTitleText: "vue-mini",
    navigationStyle: "default"
  },
  tabBar: {
    color: "#000",
    selectedColor: "#168",
    backgroundColor: "#fff",
    list: [
      {
        text: "Home",
        pagePath: "pages/home/index",
        iconPath: "assets/home.png",
        selectedIconPath: "assets/home-selected.png"
      },
      {
        text: "Mine",
        pagePath: "pages/mine/index",
        iconPath: "assets/mine.png",
        selectedIconPath: "assets/mine-selected.png"
      }
    ]
  }
})