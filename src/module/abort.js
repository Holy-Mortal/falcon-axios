/**
 * 封装 abort 取消类
 * @date 2023/12/16 - 16:03:01
 * @author Holy-Mortal
 * @class AbortAxios
 * @typedef {AbortAxios}
 */

/** 导入 key 转换工具 */
import { generateRequestKey } from "../utils/common";

export default class AbortAxios {
  /** 构造器 */
  constructor() {
    /** 初始化请求队列 */
    this.pengdingMap = new Map();
  }

  /**
   * 统一转换 key
   */
  getKey(config) {
    return generateRequestKey(config);
  }

  /**
   * 创建 abort 实例
   */
  createAbort(config) {
    const controller = new AbortController();
    config.abortController = controller;
    config.signal = controller.signal;
  }

  /**
   * 追加请求取消队列
   * @param {AxiosRequestConfig} config
   */
  setPending(config) {
    /** 获取 key */
    const key = this.getKey(config);
    /** 创建 abort 实例 */
    this.createAbort(config);
    /** 请求是否已存在 */
    if (this.pengdingMap.has(key)) {
      /** 自动取消当前请求 */
      config.abortController.abort();
    } else {
      /** 追加至请求取消列表 */
      this.pengdingMap.set(key, config);
    }
  }

  /**
   * 手动取消请求
   * @param {AxiosRequestConfig} config
   */
  abort(config) {
    /** 获取 key */
    const key = this.getKey(config);
    /** 请求是否已存在 */
    if (this.pengdingMap.has(key)) {
      /** 读取请求中的 abortController */
      const controller = this.pengdingMap.get(key).abortController;
      /** 取消已存在请求 */
      controller.abort();
    }
  }

  /**
   * 手动取消全部请求
   */
  abortAll() {
    this.pengdingMap.forEach((item) => {
      const controller = item.abortController;
      controller.abort();
    });
  }

  /**
   * 移除请求列表单个请求
   * @param {AxiosRequestConfig} config
   */
  removePending(config) {
    /** 获取 key */
    const key = this.getKey(config);
    /** 请求是否已存在 */
    if (this.pengdingMap.has(key)) {
      /** 移除请求列表中的已取消请求 */
      this.pengdingMap.delete(key);
    }
  }

  /**
   * 清空请求列表
   */
  clearPending() {
    this.pengdingMap.clear();
  }
}
