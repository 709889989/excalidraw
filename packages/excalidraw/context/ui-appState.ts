import React from "react";
import type { UIAppState } from "../types";

/**
 * UIAppStateContext 是一个 React 上下文对象，用于在组件树中共享 UI 应用状态
 * 该上下文提供了一个 UIAppState 类型的值，可以在整个应用中使用
 * 初始值为 null!，表示在使用时必须有 Provider 提供值
 */
export const UIAppStateContext = React.createContext<UIAppState>(null!);

/**
 * useUIAppState 是一个自定义 React Hook，用于方便地访问 UIAppStateContext 的值
 * @returns 返回当前 UIAppStateContext 的值
 * 必须在 UIAppStateContext.Provider 的子树中使用，否则会抛出错误
 */
export const useUIAppState = () => React.useContext(UIAppStateContext);
