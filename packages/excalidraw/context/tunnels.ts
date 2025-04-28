import React from "react";
import tunnel from "tunnel-rat";

/**
 * Tunnel类型表示一个隧道实例，用于在React组件树中创建跨层级的渲染通道
 * 通过tunnel-rat库创建，允许在组件树的不同位置渲染内容
 */
export type Tunnel = ReturnType<typeof tunnel>;

/**
 * TunnelsContextValue接口定义了应用中所有隧道的集合
 * 每个隧道对应不同的UI区域，用于跨组件渲染内容
 */
type TunnelsContextValue = {
  MainMenuTunnel: Tunnel;
  WelcomeScreenMenuHintTunnel: Tunnel;
  WelcomeScreenToolbarHintTunnel: Tunnel;
  WelcomeScreenHelpHintTunnel: Tunnel;
  WelcomeScreenCenterTunnel: Tunnel;
  FooterCenterTunnel: Tunnel;
  DefaultSidebarTriggerTunnel: Tunnel;
  DefaultSidebarTabTriggersTunnel: Tunnel;
  OverwriteConfirmDialogTunnel: Tunnel;
  TTDDialogTriggerTunnel: Tunnel;
  jotaiScope: symbol;
};

export const TunnelsContext = React.createContext<TunnelsContextValue>(null!);

export const useTunnels = () => React.useContext(TunnelsContext);

/**
 * useInitializeTunnels钩子用于初始化所有隧道实例
 * 使用React.useMemo确保隧道实例在应用生命周期中保持稳定
 * @returns 包含所有隧道实例的对象
 */
export const useInitializeTunnels = () => {
  return React.useMemo((): TunnelsContextValue => {
    return {
      MainMenuTunnel: tunnel(),
      WelcomeScreenMenuHintTunnel: tunnel(),
      WelcomeScreenToolbarHintTunnel: tunnel(),
      WelcomeScreenHelpHintTunnel: tunnel(),
      WelcomeScreenCenterTunnel: tunnel(),
      FooterCenterTunnel: tunnel(),
      DefaultSidebarTriggerTunnel: tunnel(),
      DefaultSidebarTabTriggersTunnel: tunnel(),
      OverwriteConfirmDialogTunnel: tunnel(),
      TTDDialogTriggerTunnel: tunnel(),
      jotaiScope: Symbol(),
    };
  }, []);
};
