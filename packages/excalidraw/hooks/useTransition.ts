import React, { useCallback } from "react";

/**
 * React 17 的 useTransition 的空操作（noop）polyfill。
 * 仅提供部分 API 以保证兼容性。
 */
function useTransitionPolyfill() {
  // startTransition 立即执行回调，模拟 useTransition 行为
  const startTransition = useCallback((callback: () => void) => callback(), []);
  // 返回 [false, startTransition]，false 表示没有 transition 进行中
  return [false, startTransition] as const;
}

// 如果 React 已经有 useTransition，则直接使用，否则使用 polyfill
export const useTransition = React.useTransition || useTransitionPolyfill;
