// 引入 React 的 useEffect 和 useState 钩子
import { useEffect, useState } from "react";
// 引入 Emitter 类型
import type { Emitter } from "../emitter";

// 自定义 hook：用于监听 emitter 事件并返回最新事件数据
export const useEmitter = <TEvent extends unknown>(
  emitter: Emitter<[TEvent]>, // 事件发射器
  initialState: TEvent,       // 初始事件数据
) => {
  // 用于存储当前事件数据的 state
  const [event, setEvent] = useState<TEvent>(initialState);

  // 监听 emitter 的事件变化
  useEffect(() => {
    // 订阅事件，事件触发时更新 state
    const unsubscribe = emitter.on((event) => {
      setEvent(event);
    });

    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [emitter]);

  // 返回当前事件数据
  return event;
};
