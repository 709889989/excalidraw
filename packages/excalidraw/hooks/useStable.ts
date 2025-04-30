import { useRef } from "react";

// useStable 是一个自定义 Hook，用于返回一个在组件生命周期内保持稳定引用的对象
export const useStable = <T extends Record<string, any>>(value: T) => {
  // 使用 useRef 创建一个 ref，初始值为传入的 value
  const ref = useRef<T>(value);
  // 将最新的 value 属性合并到 ref.current 上，确保属性始终是最新的
  Object.assign(ref.current, value);
  // 返回 ref.current，保证引用稳定
  return ref.current;
};
