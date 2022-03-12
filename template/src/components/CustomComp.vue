<template lang="pug">
view.home
  image.logo(src="../images/vue-mini.png")
  button(class="btn" type="secondary" @click="changeColor") change color
  view.greeting {{ m.message }}
</template>

<wxs lang="js" module="m">
var msg = "Hi, this is a message from wxs module!";
module.exports.message = msg;
</wxs>

<script lang="ts">
import { defineComponent, onReady, ref } from '@vue-mini/wechat'
import { stringifyQuery } from "@/utils/index"

definePageConfig({
  component: true
})

export default defineComponent({
  setup (options, ctx) {
    const color = ref("whitesmoke")
    const bgColor = ref("#1d1d1d")
    const greeting = ref("Hello, Vuemini!")
    const colors = ["red", "yellow", "blue", "teal", "green", "#1e1e1e", "#168", "#763453", "black", "darkgrey"]

    const changeColor = () => {
      bgColor.value = colors[Math.floor(Math.random() * 10)]
      console.log(stringifyQuery({ a: "this is a test" }))
    }

    onReady(() => {
      console.log("ctx: ", ctx)
    })

    return {
      greeting,
      color,
      bgColor,
      changeColor,
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
  margin-bottom: 60px;
  background-color: #168;
  color: whitesmoke;
}
</style>