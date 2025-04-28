import React, { useEffect, useRef } from "react";
import { isShallowEqual, sceneCoordsToViewportCoords } from "../../utils";
import { CURSOR_TYPE } from "../../constants";
import { t } from "../../i18n";
import type { DOMAttributes } from "react";
import type { AppState, Device, InteractiveCanvasAppState } from "../../types";
import type {
  InteractiveCanvasRenderConfig,
  RenderableElementsMap,
  RenderInteractiveSceneCallback,
} from "../../scene/types";
import type {
  NonDeletedExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "../../element/types";
import { isRenderThrottlingEnabled } from "../../reactUtils";
import { renderInteractiveScene } from "../../renderer/interactiveScene";

/**
 * InteractiveCanvas组件的属性类型定义
 * 包含画布、元素、状态等配置信息
 */
type InteractiveCanvasProps = {
  // 画布容器的React ref对象
  containerRef: React.RefObject<HTMLDivElement>;
  // HTML canvas元素，用于绘制图形
  canvas: HTMLCanvasElement | null;
  // 可渲染元素映射表
  elementsMap: RenderableElementsMap;
  // 当前可见元素的只读数组
  visibleElements: readonly NonDeletedExcalidrawElement[];
  // 当前选中元素的只读数组
  selectedElements: readonly NonDeletedExcalidrawElement[];
  // 所有场景元素的映射表
  allElementsMap: NonDeletedSceneElementsMap;
  // 场景随机数，用于检测场景变化
  sceneNonce: number | undefined;
  // 选择随机数，用于检测选择变化
  selectionNonce: number | undefined;
  // 画布的缩放比例
  scale: number;
  // 交互式画布的应用状态
  appState: InteractiveCanvasAppState;
  // 设备信息
  device: Device;
  // 交互场景渲染回调函数
  renderInteractiveSceneCallback: (
    data: RenderInteractiveSceneCallback,
  ) => void;
  // 处理画布ref的回调函数
  handleCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  // 右键菜单事件处理函数
  onContextMenu: Exclude<
    DOMAttributes<HTMLCanvasElement | HTMLDivElement>["onContextMenu"],
    undefined
  >;
  // 指针移动事件处理函数
  onPointerMove: Exclude<
    DOMAttributes<HTMLCanvasElement>["onPointerMove"],
    undefined
  >;
  // 指针抬起事件处理函数
  onPointerUp: Exclude<
    DOMAttributes<HTMLCanvasElement>["onPointerUp"],
    undefined
  >;
  // 指针取消事件处理函数
  onPointerCancel: Exclude<
    DOMAttributes<HTMLCanvasElement>["onPointerCancel"],
    undefined
  >;
  // 触摸移动事件处理函数
  onTouchMove: Exclude<
    DOMAttributes<HTMLCanvasElement>["onTouchMove"],
    undefined
  >;
  // 指针按下事件处理函数
  onPointerDown: Exclude<
    DOMAttributes<HTMLCanvasElement>["onPointerDown"],
    undefined
  >;
  // 双击事件处理函数
  onDoubleClick: Exclude<
    DOMAttributes<HTMLCanvasElement>["onDoubleClick"],
    undefined
  >;
};

/**
 * 交互式画布组件，负责处理用户交互和实时渲染
 * @param props - 组件属性，包含画布、元素、状态等配置
 * @returns 返回一个HTML canvas元素
 */
const InteractiveCanvas = (props: InteractiveCanvasProps) => {
  const isComponentMounted = useRef(false);

  // * 处理画布渲染和协作指针更新的副作用钩子
  // * 主要功能：
  // * - 初始化组件挂载状态
  // * - 处理协作指针的渲染配置
  // * - 调用renderInteractiveScene进行画布渲染
useEffect(() => {
    if (!isComponentMounted.current) {
      isComponentMounted.current = true;
      return;
    }

    const remotePointerButton: InteractiveCanvasRenderConfig["remotePointerButton"] =
      new Map();
    const remotePointerViewportCoords: InteractiveCanvasRenderConfig["remotePointerViewportCoords"] =
      new Map();
    const remoteSelectedElementIds: InteractiveCanvasRenderConfig["remoteSelectedElementIds"] =
      new Map();
    const remotePointerUsernames: InteractiveCanvasRenderConfig["remotePointerUsernames"] =
      new Map();
    const remotePointerUserStates: InteractiveCanvasRenderConfig["remotePointerUserStates"] =
      new Map();

    props.appState.collaborators.forEach((user, socketId) => {
      if (user.selectedElementIds) {
        for (const id of Object.keys(user.selectedElementIds)) {
          if (!remoteSelectedElementIds.has(id)) {
            remoteSelectedElementIds.set(id, []);
          }
          remoteSelectedElementIds.get(id)!.push(socketId);
        }
      }
      if (!user.pointer || user.pointer.renderCursor === false) {
        return;
      }
      if (user.username) {
        remotePointerUsernames.set(socketId, user.username);
      }
      if (user.userState) {
        remotePointerUserStates.set(socketId, user.userState);
      }
      remotePointerViewportCoords.set(
        socketId,
        sceneCoordsToViewportCoords(
          {
            sceneX: user.pointer.x,
            sceneY: user.pointer.y,
          },
          props.appState,
        ),
      );
      remotePointerButton.set(socketId, user.button);
    });

    const selectionColor =
      (props.containerRef?.current &&
        getComputedStyle(props.containerRef.current).getPropertyValue(
          "--color-selection",
        )) ||
      "#6965db";

    renderInteractiveScene(
      {
        canvas: props.canvas,
        elementsMap: props.elementsMap,
        visibleElements: props.visibleElements,
        selectedElements: props.selectedElements,
        allElementsMap: props.allElementsMap,
        scale: window.devicePixelRatio,
        appState: props.appState,
        renderConfig: {
          remotePointerViewportCoords,
          remotePointerButton,
          remoteSelectedElementIds,
          remotePointerUsernames,
          remotePointerUserStates,
          selectionColor,
          renderScrollbars: false,
        },
        device: props.device,
        callback: props.renderInteractiveSceneCallback,
      },
      isRenderThrottlingEnabled(),
    );
  });

  // 返回一个HTML canvas元素，用于交互式绘图
  // 包含各种事件处理程序和样式配置
return (
    <canvas
      className="excalidraw__canvas interactive"
      style={{
        width: props.appState.width,
        height: props.appState.height,
        cursor: props.appState.viewModeEnabled
          ? CURSOR_TYPE.GRAB
          : CURSOR_TYPE.AUTO,
      }}
      width={props.appState.width * props.scale}
      height={props.appState.height * props.scale}
      ref={props.handleCanvasRef}
      onContextMenu={props.onContextMenu}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
      onTouchMove={props.onTouchMove}
      onPointerDown={props.onPointerDown}
      onDoubleClick={
        props.appState.viewModeEnabled ? undefined : props.onDoubleClick
      }
    >
      {t("labels.drawingCanvas")}
    </canvas>
  );
};

/**
 * 从完整的应用状态中提取与交互画布相关的属性
 * @param appState - 完整的应用状态对象
 * @returns 返回与交互画布相关的状态属性
 */
const getRelevantAppStateProps = (
  appState: AppState,
): InteractiveCanvasAppState => ({
  zoom: appState.zoom,
  scrollX: appState.scrollX,
  scrollY: appState.scrollY,
  width: appState.width,
  height: appState.height,
  viewModeEnabled: appState.viewModeEnabled,
  editingGroupId: appState.editingGroupId,
  editingLinearElement: appState.editingLinearElement,
  selectedElementIds: appState.selectedElementIds,
  frameToHighlight: appState.frameToHighlight,
  offsetLeft: appState.offsetLeft,
  offsetTop: appState.offsetTop,
  theme: appState.theme,
  pendingImageElementId: appState.pendingImageElementId,
  selectionElement: appState.selectionElement,
  selectedGroupIds: appState.selectedGroupIds,
  selectedLinearElement: appState.selectedLinearElement,
  multiElement: appState.multiElement,
  isBindingEnabled: appState.isBindingEnabled,
  suggestedBindings: appState.suggestedBindings,
  isRotating: appState.isRotating,
  elementsToHighlight: appState.elementsToHighlight,
  collaborators: appState.collaborators, // Necessary for collab. sessions
  activeEmbeddable: appState.activeEmbeddable,
  snapLines: appState.snapLines,
  zenModeEnabled: appState.zenModeEnabled,
  editingElement: appState.editingElement,
});

/**
 * 比较前后props是否相等，用于React.memo的性能优化
 * @param prevProps - 前一次的props
 * @param nextProps - 下一次的props
 * @returns 返回布尔值表示props是否相等
 */
const areEqual = (
  prevProps: InteractiveCanvasProps,
  nextProps: InteractiveCanvasProps,
) => {
  // This could be further optimised if needed, as we don't have to render interactive canvas on each scene mutation
  if (
    prevProps.selectionNonce !== nextProps.selectionNonce ||
    prevProps.sceneNonce !== nextProps.sceneNonce ||
    prevProps.scale !== nextProps.scale ||
    // we need to memoize on elementsMap because they may have renewed
    // even if sceneNonce didn't change (e.g. we filter elements out based
    // on appState)
    prevProps.elementsMap !== nextProps.elementsMap ||
    prevProps.visibleElements !== nextProps.visibleElements ||
    prevProps.selectedElements !== nextProps.selectedElements
  ) {
    return false;
  }

  // Comparing the interactive appState for changes in case of some edge cases
  return isShallowEqual(
    // asserting AppState because we're being passed the whole AppState
    // but resolve to only the InteractiveCanvas-relevant props
    getRelevantAppStateProps(prevProps.appState as AppState),
    getRelevantAppStateProps(nextProps.appState as AppState),
  );
};

export default React.memo(InteractiveCanvas, areEqual);
