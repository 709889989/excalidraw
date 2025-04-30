import { useRef } from "react";

/**
 * 返回一个类型相同的稳定函数。
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  userFn: T,
) => {
  // 使用 useRef 保存 userFn 和稳定函数 stableFn 的引用
  const stableRef = useRef<{ userFn: T; stableFn?: T }>({ userFn });
  // 每次渲染时都更新 userFn 的引用
  stableRef.current.userFn = userFn;

  // 只在第一次渲染时创建稳定函数 stableFn
  if (!stableRef.current.stableFn) {
    stableRef.current.stableFn = ((...args: any[]) =>
      stableRef.current.userFn(...args)) as T;
  }

  // 返回稳定的函数引用
  return stableRef.current.stableFn as T;
};
