import { defineComponent, onReady, ref } from "@vue-mini/wechat";
import { stringifyQuery2 } from "../utils2/index";
export default defineComponent({
  setup(options, ctx) {
    const color = ref("darkgray");
    const bgColor = ref("#1d1d1d");
    const greeting = ref("Hello, Vuemini!");
    const colors = ["red", "yellow", "blue", "teal", "green", "#1e1e1e", "#168", "#763453", "black", "darkgrey"];
    const changeColor = () => {
      bgColor.value = colors[Math.floor(Math.random() * 10)];
      console.log(stringifyQuery2({ a: "this is a test" }));
    };
    onReady(() => {
      console.log("ctx: ", ctx);
    });
    return {
      greeting,
      color,
      bgColor,
      changeColor
    };
  }
});
