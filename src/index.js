import FalconAxios from "./module";
import { setCacheKey, isBrowser } from "./utils/common";

if (!isBrowser()) {
  throw new Error("当前不是浏览器环境！");
}

(function () {
  if (!isBrowser()) {
    throw new Error("当前不是浏览器环境！");
  }
})();

export const setDefaultKey = setCacheKey;

export default FalconAxios;
