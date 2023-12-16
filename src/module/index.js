/**
 * axios 封装
 * @date 2023/12/16 - 14:43:21
 * @author Holy-Mortal
 * @class FalconAxios
 * @typedef {FalconAxios}
 */

/** 导入 abort 接口取消类 */
import AbortAxios from "./abort";
/** 导入 cache 接口缓存类 */
import CacheAxios from "./cache";
/** 导入 retry 接口重连类 */
import RetryAxios from "./retry";
/** 导入 axios 网络传输核心模块 */
import axios from "axios";

export default class FalconAxios {
  /** default: 响应处理对象 */
  responseHandler = {
    200: (response) => {
      return Promise.resolve(response.data);
    },
    400: (error) => {
      return Promise.reject(error);
    },
    404: (error) => {
      return Promise.reject(error);
    },
    /** 请求已取消 */
    ERR_CANCELED: (error) => {
      return Promise.reject(error);
    },
    /** 请求超时 */
    ECONNABORTED: (error) => {
      return Promise.reject(error);
    },
    error: (error) => {
      return Promise.reject(error);
    },
  };

  /** default: 请求头 */
  headers = {
    "Content-Type": "application/json; charset=utf-8",
  };

  /** 构造器 */
  constructor(options) {
    /** 定义 axios 实例 */
    this.axiosInstance = null;
    /** 实例初始化必要参数 baseURL: 主服务器地址 */
    this.baseURL = options.baseURL || "";
    /** 实例初始化必要参数 timeout: 超时时间 */
    this.timeout = Math.max(options.timeout || 5000, 0);
    /** 实例初始化必要参数 headers: 请求头 */
    this.headers = Object.assign(this.headers, options.headers);
    /** 实例初始化额外参数 */
    this.extraParams = options.extraParams || {};
    /** 实例初始化全局响应处理对象*/
    this.responseHandler = Object.assign(
      this.responseHandler,
      options.responseHandler
    );
    /** 实例初始化全局拦截器 */
    this.interceptors = Object.assign(
      {
        /** 自定义请求拦截器 */
        request: (config) => {},
        /** 自定义响应拦截器 */
        response: (response) => {},
      },
      options.interceptors
    );
    /** default: 自定义接口缓存配置 */
    this.customCache = {
      /** 是否缓存请求 */
      isCache: false,
      /** 缓存有效期 */
      expire: 2 * 60 * 60 * 1000,
      /** 是否刷新缓存 */
      isRefresh: false,
    };
    /** 创建 CacheAxios 接口缓存实例 */
    this.cacheAxios = new CacheAxios();
    /** default: 自定义接口取消配置 */
    this.customAbort = {
      /** 是否取消请求 */
      isAbort: false,
    };
    /** 创建 AbortAxios 接口取消实例 */
    this.abortAxios = new AbortAxios();
    /** default: 自定义接口重连配置 */
    this.customRetry = Object.assign(
      {
        /** 是否重连 */
        isRetry: false,
        /** 断线重连次数 */
        count: 3,
        /** 重连间隔时间 */
        delay: 1000,
      },
      options.customRetry
    );
    /** 创建 RetryAxios 接口重连实例 */
    this.retryAxios = new RetryAxios();
    /** 初始化 axios 实例 */
    this.initAxios();
  }

  /**
   * 创建 axios 实例，配置请求、响应拦截器
   */
  initAxios() {
    /** 创建 axios 实例 */
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: this.headers,
      ...this.extraParams,
    });
    /** 创建 request 请求拦截器中间件 */
    this.requestMiddleware();
    /** 创建 response 响应拦截器中间件 */
    this.responseMiddleware();
  }

  /**
   * 创建 request 请求拦截器中间件
   */
  requestMiddleware() {
    /** 挂载 axios 请求拦截器 */
    this.axiosInstance.interceptors.request.use(
      (config) => {
        /** 统一修改请求方式为小写 */
        config.method = config.method.toLowerCase();
        /** 自定义全局、单接口请求拦截器方法 */
        const { request: customRequest } = Object.assign(
          this.interceptors,
          config.interceptors
        );
        customRequest(config);
        /** 挂载接口重连方法 */
        this.requestRetry(config);
        /** 挂载接口取消方法 */
        this.requestAbort(config);
        /** 挂载接口缓存方法 */
        this.requestCache(config);
        /** 传递请求至服务器 */
        return config;
      },
      (error) => {
        /** 请求校验异常等，抛出异常 */
        return Promise.reject(error);
      }
    );
  }

  /**
   * 接口重连
   * @param {AxiosRequestConfig} config
   */
  requestRetry(config) {
    /** 全局、单接口重连配置 */
    config.customRetry = Object.assign(this.customRetry, config.customRetry);
  }

  /**
   * 接口取消
   * @param {AxiosRequestConfig} config
   */
  requestAbort(config) {
    /** 单接口手动取消配置 */
    const { isAbort } = Object.assign(this.customAbort, config.customAbort);
    /** 是否手动取消请求 */
    if (isAbort) {
      /** 手动取消队列中已有请求 */
      this.abortAxios.abort(config);
    }
    /** 向请求队列中追加请求 */
    this.abortAxios.setPending(config);
  }

  /**
   * 接口缓存
   * @param {AxiosRequestConfig} config
   * @returns {CUSTOM_ERROR} CUSTOM_CACHE
   */
  requestCache(config) {
    /** 接口缓存配置 */
    const { isCache, isRefresh } = Object.assign(
      this.customCache,
      config.customCache
    );
    /** 是否需要进行缓存 */
    if (isCache) {
      /** 是否要刷新缓存接口 */
      if (isRefresh) {
        /** 刷新缓存接口 */
        this.cacheAxios.refreshCache(config);
      }
      /** 读取接口缓存数据 */
      const cacheResult = this.cacheAxios.getCache(config);
      /** 缓存数据是否存在 */
      if (cacheResult) {
        /** 将缓存数据以异常形式抛出 */
        return Promise.reject({
          code: "CUSTOM_CACHE",
          response: cacheResult,
        });
      }
    }
  }

  /**
   * 取消全部正在进行请求
   */
  abortAll() {
    /** 取消全部接口 */
    this.abortAxios.abortAll();
    /** 清空请求队列 */
    this.abortAxios.clearPending();
  }

  /**
   * 响应的接口缓存方法
   * @param {*} response
   */
  responseCache(response) {
    /** 接口缓存配置 */
    const { isCache, expire } = Object.assign(
      this.customCache,
      response.config?.customCache
    );
    /** 是否缓存 */
    if (isCache) {
      /** 配置缓存有效期 */
      this.cacheAxios.setExprire(expire);
      /** 向缓存队列中追加请求 */
      this.cacheAxios.setCache(response);
    }
  }

  /**
   * 响应的接口取消方法
   * @param {*} response
   */
  responseAbort(response) {
    /** 移除请求队列已经取消的请求 */
    this.abortAxios.removePending(response.config);
  }

  /**
   * 响应的接口重连方法
   */
  responseRetry(response) {
    /** 移除响应成功或者失败后，重连的请求 */
    this.retryAxios.removeRetry(response.config);
  }

  /**
   * 异常处理机制
   * @param {*} error
   * @returns {*}
   */
  errorHandler(error) {
    if (error.code === "CUSTOM_CACHE") {
      /** 缓存存在，返回缓存数据 */
      return Promise.resolve(error.response);
    } else if (error.code === "ERR_CANCELED") {
      /** 移除已取消请求 */
      this.responseAbort(error);
      /** 返回请求取消异常信息 */
      return this.responseResult(error.code, "error")(error);
    } else if (error.code === "ECONNABORTED") {
      /** 返回请求超时异常信息 */
      return this.responseResult(error.code, "error")(error);
    } else {
      /** 响应对象是否存在 */
      if (error.response) {
        /** 返回 status 对应异常信息 */
        return this.responseResult(error.response.status, "error")(error);
      } else {
        /** 返回 code 对应异常信息 */
        return this.responseResult(error.code, "error")(error);
      }
    }
  }

  /**
   * 响应结果
   * @param {*} statusCode 响应标志
   * @param {*} def 默认响应标志
   * @returns {*}
   */
  responseResult(statusCode, def) {
    const result = this.responseHandler[statusCode];
    if (result) {
      return result;
    } else {
      return this.responseHandler[def];
    }
  }

  /**
   * 创建 response 响应拦截器中间件
   */
  responseMiddleware() {
    /** 挂载 axios 响应拦截器 */
    this.axiosInstance.interceptors.response.use(
      (response) => {
        /** 响应的接口缓存处理方法 */
        this.responseCache(response);
        /** 响应的接口取消处理方法 */
        this.responseAbort(response);
        /** 响应的接口重连方法 */
        this.responseRetry(response);
        /** 自定义全局、单接口响应拦截器 */
        const { response: customResponse } = Object.assign(
          this.interceptors,
          response.config.interceptors
        );
        customResponse(config);
        /** 响应成功结果 */
        return this.responseResult(response.status, 200)(response);
      },
      async (error) => {
        /** 是否需要异常请求重连 */
        if (this.retryAxios.arrowRetry(error)) {
          /** 向重连请求队列中追加异常请求 */
          this.retryAxios.setRetry(error.config);
          /** 异常请求重连 */
          await this.retryAxios.retryRequest(error.config, this.axiosInstance);
        }
        return this.errorHandler(error);
      }
    );
  }

  /**
   * 创建一个新的的 axios 实例
   */
  request(options) {
    return this.axiosInstance(options);
  }
}
