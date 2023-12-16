/**
 * 公用工具方法
 * @date 2023/12/16 - 16:51:17
 * @author Holy-Mortal
 */

/** 导入 crypto 加密解密模块 */
import CryptoJS from "crypto-js";
/** 自定义一个加密字段 */
const PRIVATE_KEY = "e4f5b8c2f6c2c9931f8e6a22267b9b5a";

// 判断当前是否是浏览器环境
export const isBrowser = () => {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
};

// 外部设置缓存使用的key
let cacheKeys = [];
export const setCacheKey = (options) => {
  if (Array.isArray(options)) {
    cacheKeys = options;
  }
};

// 通过加密方式将请求加密成一个字符串
export const generateRequestKey = (config) => {
  let cacheObj = {};
  if (cacheKeys.length > 0) {
    cacheKeys.forEach((key) => {
      if (config[key]) {
        cacheObj[key] = config[key];
      }
    });
  }
  // 解构出 url、method、data、params
  const { url, method, data, params } = config;
  // 定义一个 key 表示每一个请求
  let key = Object.assign(cacheObj, {
    url,
    method,
    data: data || {},
    params: params || {},
  });
  // config.data 如果为 JSON 字符串，将其转为对象
  if (config.data && isJson(config.data)) {
    key.data = JSON.parse(config.data);
  }
  // 对 key 中所有属性进行排序
  // 转换为一个 json 字符串，并对其加密
  return generateKey(JSON.stringify(sortObject(key)));
};

// 排序对象中所有属性，生成一个新对象
export const sortObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }
  const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const sortedObj = {};
  sortedKeys.forEach((key) => {
    sortedObj[key] = sortObject(obj[key]);
  });
  return sortedObj;
};

// 生成一个唯一加密后的 key
export const generateKey = (str) => {
  return CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString();
};

// 判断是否是 json 字符串
export const isJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};
