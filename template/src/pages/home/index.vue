<template lang="pug">
view.home
  image.logo(src="../../images/vue-mini.png")
  view.greeting {{ greeting }}
  view.greeting {{ m.message }}
  van-button(custom-class="btn" round type="info" size="large" @click="changeColor") change color
  van-button(custom-class="btn" round type="info" size="large" @click="go") go to subpackageA
</template>

<wxs module="m" src="./msg.wxs"/>

<script lang="ts">
import { defineComponent, onReady, ref } from '@vue-mini/wechat'
import { stringifyQuery } from "@/utils/index"

definePageConfig({
  navigationBarTitleText: "Home Page",
  usingComponents: {
    "van-button": "@vant/weapp/button/index"
  }
})

export default defineComponent({
  setup (options, ctx) {
    const color = ref("whitesmoke")
    const bgColor = ref("#1d1d1d")
    const greeting = ref("hi, vue-mini")
    const colors = ["red", "yellow", "blue", "teal", "green", "#1e1e1e", "#168", "#763453", "black", "darkgrey"]

    const changeColor = () => {
      bgColor.value = colors[Math.floor(Math.random() * 10)]
      console.log(stringifyQuery({ a: "this is a test" }))
    }

    const go = () => {
      wx.navigateTo({ url: "/subPackageA/another/index" })
    }

    onReady(() => {
      console.log("options: ", options)
      console.log("ctx: ", ctx)
    })

    return {
      greeting,
      color,
      bgColor,
      changeColor,
      go
    }
  }
})
</script>

<style>
.home {
  text-align: center;
  background-color: v-bind(bgColor);
  color: v-bind(color);
}

.logo {
  width: 400px;
  height: 400px;
  margin-top: 120px;
}

.greeting {
  color: v-bind(color);
  font-size: 64px;
  font-weight: bold;
  margin-bottom: 120px;
}

.btn {
  margin-bottom: 20px;
  background-color: #168;
  color: whitesmoke;
}
</style>