/**
 * 封装 cache 类
 * @date 2023/12/16 - 16:21:27
 * @author Holy-Mortal
 * @export
 * @class CacheAxios
 * @typedef {CacheAxios}
 */

/** 导入 key 转换工具 */
import { generateRequestKey } from "../utils/common";

export default class CacheAxios {
  /** 构造器 */
  constructor(options = {}) {
    /** 定义缓存请求集合 */
    this.cacheMap = new Map();
    /** 定义缓存标志前缀 */
    this.sign = options.sign || "FALCON_AXIOS_";
    /** 定义缓存有效期 */
    this.expire = null;
  }

  /**
   * 设置缓存有效期
   * @param {Number} ms
   */
  setExprire(ms) {
    this.expire = ms;
  }

  /**
   * 统一转换 key
   */
  getKey(config) {
    return generateRequestKey(config);
  }

  /**
   * 判断 key 是否存在
   * @param {String} key
   * @returns Boolean
   */
  hasKey(key) {
    return this.cacheMap.has(key);
  }

  /**
   * 判断 key 存在时，缓存是否在有效期内
   * @param {String} key
   * @returns Boolean
   */
  hasOverdue(key) {
    if (this.hasKey(key)) {
      /** 读取有效期、缓存时间戳 */
      const { expire, timestamp } = this.getItem(key);
      return new Date().getTime() - timestamp < expire;
    }
    return false;
  }

  /**
   * 设置 session 缓存
   * @param {String} key
   * @param {*} data
   */
  setItem(key, data) {
    sessionStorage.setItem(
      `${this.sign}${key}`,
      JSON.stringify({
        /** 成功响应结果 */
        response: data,
        /** 缓存时间戳 */
        timestamp: new Date().getTime(),
        /** 缓存有效期 */
        expire: this.expire,
      })
    );
  }

  /**
   * 读取 session 缓存
   * @param {String} key
   * @returns
   */
  getItem(key) {
    return JSON.parse(sessionStorage.getItem(`${this.sign}${key}`));
  }

  /**
   * 缓存响应结果
   * @param {*} response
   */
  setCache(response) {
    const key = this.getKey(response.config);
    if (!this.hasOverdue(key)) {
      // 1.将请求缓存到 map 中
      this.cacheMap.set(key, response);
      // 2.将请求缓存到 sessionStorage 中
      this.setItem(key, response);
    }
  }

  // 读取缓存数据
  getCache(config) {
    /** 获取 key */
    const key = this.getKey(config);
    if (this.hasOverdue(key)) {
      /** 缓存存在，且未过期 */
      const { response } = this.getItem(key);
      /** 刷新缓存有效期 */
      this.setItem(key, response);
      return response;
    }
    /** 读取失败，返回 false */
    return false;
  }

  /**
   * 强制刷新缓存数据，删除单条缓存数据
   * @param {AxiosRequestConfig} config
   */
  refreshCache(config) {
    /** 获取 key */
    const key = this.getKey(config);
    if (this.hasOverdue(key)) {
      /** 从缓存列表中移除 */
      this.cacheMap.delete(key);
      /** 移除当前缓存 */
      sessionStorage.removeItem(`${this.sign}${key}`);
    }
  }

  /**
   * 关闭浏览器，清空所有缓存数据
   */
  clearCache() {
    if (this.cacheMap.size) {
      this.cacheMap.keys().forEach((key) => {
        sessionStorage.removeItem(`${this.sign}${key}`);
      });
      this.cacheMap.clear();
    }
  }
}
