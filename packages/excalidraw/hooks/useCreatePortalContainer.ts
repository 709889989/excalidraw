// 引入 React 的 useState 和 useLayoutEffect 钩子
import { useState, useLayoutEffect } from "react";
// 引入自定义的设备和容器相关的 hook
import { useDevice, useExcalidrawContainer } from "../components/App";
// 引入主题常量
import { THEME } from "../constants";
// 引入 UI 状态的上下文 hook
import { useUIAppState } from "../context/ui-appState";

// 创建 portal 容器的自定义 hook
export const useCreatePortalContainer = (opts?: {
  className?: string; // 可选的 className
  parentSelector?: string; // 可选的父容器选择器
}) => {
  // 用于存储创建的 div 元素
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  // 获取设备信息
  const device = useDevice();
  // 获取当前主题
  const { theme } = useUIAppState();

  // 获取 excalidraw 的主容器
  const { container: excalidrawContainer } = useExcalidrawContainer();

  // 监听 div、主题、设备和 className 的变化，动态设置 div 的 class
  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("excalidraw", ...(opts?.className?.split(/\s+/) || []));
      div.classList.toggle("excalidraw--mobile", device.editor.isMobile);
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, theme, device.editor.isMobile, opts?.className]);

  // 创建并挂载 div 到指定的父容器
  useLayoutEffect(() => {
    // 根据 parentSelector 查找父容器，否则默认挂载到 body
    const container = opts?.parentSelector
      ? excalidrawContainer?.querySelector(opts.parentSelector)
      : document.body;

    if (!container) {
      return;
    }

    // 创建 div 元素
    const div = document.createElement("div");

    // 挂载到父容器
    container.appendChild(div);

    // 保存 div 到 state
    setDiv(div);

    // 组件卸载时移除 div
    return () => {
      container.removeChild(div);
    };
  }, [excalidrawContainer, opts?.parentSelector]);

  // 返回创建的 div
  return div;
};
