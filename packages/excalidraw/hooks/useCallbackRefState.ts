import { useCallback, useState } from "react";

// 自定义 Hook：用于创建一个带有回调的 ref 状态
export const useCallbackRefState = <T>() => {
  // refValue 用于存储 ref 的当前值，初始为 null
  const [refValue, setRefValue] = useState<T | null>(null);
  // refCallback 是一个回调函数，用于更新 refValue
  const refCallback = useCallback((value: T | null) => setRefValue(value), []);
  // 返回当前 ref 的值和回调函数
  return [refValue, refCallback] as const;
};
