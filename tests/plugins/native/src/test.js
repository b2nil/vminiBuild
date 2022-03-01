import { ref } from "@vue-mini/wechat";
var stdin_default = definePage({
  properties: { hi: Number },
  setup() {
    const data = ref(0);
    const method = () => {
      console.log();
    };
    return {
      data,
      method
    };
  }
});
export {
  stdin_default as default
};
