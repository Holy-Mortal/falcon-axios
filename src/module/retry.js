/**
 * 封装 retry 重连类
 * @date 2023/12/16 - 16:36:11
 * @author Holy-Mortal
 * @export
 * @class RetryAxios
 * @typedef {RetryAxios}
 */

/** 导入 key 转换工具 */
import { generateRequestKey } from "../utils/common";

export class RetryAxios {
  /** 构造器 */
  constructor() {
    /** 创建一个重连请求队列 */
    this.retryMap = new Map();
    /** 定义重连的 code 类型 */
    this.retryCode = ["ERR_CANCELED", "ECONNABORTED"];
  }

  /**
   * 统一转换 key
   */
  getKey(config) {
    return generateRequestKey(config);
  }

  /**
   * 设置异常重连队列
   * @param {AxiosRequestConfig} config
   */
  setRetry(config) {
    /** 获取 key */
    const key = this.getKey(config);
    /** 异常存在 */
    if (this.retryMap.has(key)) {
      /** 更新重连队列 */
      this.retryMap.set(key, {
        /** 重连次数 */
        count: this.retryMap.get(key).count + 1,
        /** 重连间隔时间 */
        delay: config.customRetry.delay,
        /** 请求配置 */
        request: config,
      });
    } else {
      /** 初始化重连队列 */
      this.retryMap.set(key, {
        count: 1,
        delay: config.customRetry.delay,
        request: config,
      });
    }
  }

  /**
   * 请求重连
   * @param {AxiosRequestConfig} config
   * @param {AxiosInstance} axiosInstance
   * @returns {*}
   */
  retryRequest(config, axiosInstance) {
    /** 获取 key */
    const key = this.getKey(config);
    /** 异常存在 */
    if (this.retryMap.has(key)) {
      /** 读取重连次数、间隔时间、请求配置 */
      const { count, delay, request } = this.retryMap.get(key);
      /** 是否在最大重连次数内 */
      if (count <= config.customRetry.count) {
        const newRequest = new Promise((resolve) => {
          if (config.__retryTimer) {
            clearTimeout(config.__retryTimer);
          }
          config.__retryTimer = setTimeout(() => {
            resolve();
          }, delay);
        });
        /** 重发请求 */
        return newRequest.then(() => {
          return axiosInstance(request);
        });
      } else {
        /** 超过重连次数，移除接口 */
        this.retryMap.delete(key);
      }
    }
  }

  /**
   * 重连过程中，成功移除接口
   * @param {AxiosRequestConfig} config
   */
  removeRetry(config) {
    /** 获取 key */
    const key = this.getKey(config);
    if (this.retryMap.has(key)) {
      this.retryMap.delete(key);
    }
  }

  /**
   * 判断是否需要接口重连
   * @param {Error} error
   * @returns {boolean}
   */
  arrowRetry(error) {
    const config = error.config;
    const code = error.code;
    const response = error.response;
    if (!config) {
      return false;
    }
    if (!config.customRetry.isRetry) {
      return false;
    }
    if (this.retryCode.includes(code)) {
      return true;
    }
    if (
      response &&
      error.response.status >= 400 &&
      error.response.status < 600
    ) {
      return true;
    }
    return false;
  }
}
