import type { EDITOR_LS_KEYS } from "../constants";
import type { JSONValue } from "../types";

/**
 * EditorLocalStorage 类封装了与浏览器 localStorage 的交互，
 * 提供了类型安全的存储操作方法，并处理了可能的错误。
 */
export class EditorLocalStorage {
    /**
   * 检查指定键是否存在于 localStorage 中
   * @param key - 要检查的键名，必须为 EDITOR_LS_KEYS 中定义的键
   * @returns 如果键存在且可访问返回 true，否则返回 false
   */
  static has(key: typeof EDITOR_LS_KEYS[keyof typeof EDITOR_LS_KEYS]) {
    try {
      return !!window.localStorage.getItem(key);
    } catch (error: any) {
      console.warn(`localStorage.getItem error: ${error.message}`);
      return false;
    }
  }

    /**
   * 从 localStorage 中获取指定键的值
   * @param key - 要获取的键名，必须为 EDITOR_LS_KEYS 中定义的键
   * @returns 如果键存在且可访问，返回解析后的值，否则返回 null
   */
  static get<T extends JSONValue>(
    key: typeof EDITOR_LS_KEYS[keyof typeof EDITOR_LS_KEYS],
  ) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error: any) {
      console.warn(`localStorage.getItem error: ${error.message}`);
      return null;
    }
  }

    /**
   * 将值存储到 localStorage 中
   * @param key - 要设置的键名，必须为 EDITOR_LS_KEYS 中定义的键
   * @param value - 要存储的值，必须为 JSON 可序列化的值
   * @returns 如果存储成功返回 true，否则返回 false
   */
  static set = (
    key: typeof EDITOR_LS_KEYS[keyof typeof EDITOR_LS_KEYS],
    value: JSONValue,
  ) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error: any) {
      console.warn(`localStorage.setItem error: ${error.message}`);
      return false;
    }
  };

    /**
   * 从 localStorage 中删除指定键
   * @param name - 要删除的键名，必须为 EDITOR_LS_KEYS 中定义的键
   */
  static delete = (
    name: typeof EDITOR_LS_KEYS[keyof typeof EDITOR_LS_KEYS],
  ) => {
    try {
      window.localStorage.removeItem(name);
    } catch (error: any) {
      console.warn(`localStorage.removeItem error: ${error.message}`);
    }
  };
}
