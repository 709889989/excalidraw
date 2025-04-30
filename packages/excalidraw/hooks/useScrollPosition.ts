// 引入 React 的 useEffect，用于副作用处理
import { useEffect } from "react";
// 引入 jotai 的 atom 和 useAtom，用于全局状态管理
import { atom, useAtom } from "jotai";
// 引入 lodash.throttle，用于节流滚动事件
import throttle from "lodash.throttle";

// 创建一个全局的原子状态，用于存储滚动位置
const scrollPositionAtom = atom<number>(0);

// 自定义 Hook：用于获取并响应指定元素的滚动位置
export const useScrollPosition = <T extends HTMLElement>(
  elementRef: React.RefObject<T>, // 传入需要监听滚动的元素引用
) => {
  // 通过 Jotai 获取和设置滚动位置的状态
  const [scrollPosition, setScrollPosition] = useAtom(scrollPositionAtom);

  useEffect(() => {
    // 获取当前元素
    const { current: element } = elementRef;
    if (!element) {
      // 如果元素不存在，直接返回
      return;
    }

    // 滚动事件处理函数，使用 throttle 限流，避免高频触发
    const handleScroll = throttle(() => {
      const { scrollTop } = element;
      setScrollPosition(scrollTop); // 更新滚动位置状态
    }, 200);

    // 监听元素的 scroll 事件
    element.addEventListener("scroll", handleScroll);

    // 清理函数，组件卸载时移除事件监听，并取消节流
    return () => {
      handleScroll.cancel();
      element.removeEventListener("scroll", handleScroll);
    };
  }, [elementRef, setScrollPosition]);

  // 返回当前的滚动位置
  return scrollPosition;
};
