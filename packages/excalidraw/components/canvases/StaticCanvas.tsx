import React, { useEffect, useRef } from "react";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { renderStaticScene } from "../../renderer/staticScene";
import { isShallowEqual } from "../../utils";
import type { AppState, StaticCanvasAppState } from "../../types";
import type {
  RenderableElementsMap,
  StaticCanvasRenderConfig,
} from "../../scene/types";
import type {
  NonDeletedExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "../../element/types";
import { isRenderThrottlingEnabled } from "../../reactUtils";

type StaticCanvasProps = {
  // HTML 画布元素
  canvas: HTMLCanvasElement;
  // Rough.js 库的画布实例，用于绘制粗糙风格的图形
  rc: RoughCanvas;
  // 可渲染元素
  elementsMap: RenderableElementsMap;
  // 所有元素
  allElementsMap: NonDeletedSceneElementsMap;
  // 可见元素的只读数组
  visibleElements: readonly NonDeletedExcalidrawElement[];
  // 场景随机数
  sceneNonce: number | undefined;
  // 选择随机数
  selectionNonce: number | undefined;
  // 画布的缩放比例
  scale: number;
  // 应用状态对象，包含了与静态画布渲染相关的状态信息
  appState: StaticCanvasAppState;
  // 静态画布的渲染配置对象，包含了渲染相关的各种设置。
  renderConfig: StaticCanvasRenderConfig;
};

/**
 * 静态画布组件，负责渲染静态场景
 * @param props - 组件属性，包含画布、元素、状态等配置
 */
const StaticCanvas = (props: StaticCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const canvas = props.canvas;

    if (!isComponentMounted.current) {
      isComponentMounted.current = true;

      wrapper.replaceChildren(canvas);
      canvas.classList.add("excalidraw__canvas", "static");
    }

    const widthString = `${props.appState.width}px`;
    const heightString = `${props.appState.height}px`;
    if (canvas.style.width !== widthString) {
      canvas.style.width = widthString;
    }
    if (canvas.style.height !== heightString) {
      canvas.style.height = heightString;
    }

    const scaledWidth = props.appState.width * props.scale;
    const scaledHeight = props.appState.height * props.scale;
    // setting width/height resets the canvas even if dimensions not changed,
    // which would cause flicker when we skip frame (due to throttling)
    if (canvas.width !== scaledWidth) {
      canvas.width = scaledWidth;
    }
    if (canvas.height !== scaledHeight) {
      canvas.height = scaledHeight;
    }

    renderStaticScene(
      {
        canvas,
        rc: props.rc,
        scale: props.scale,
        elementsMap: props.elementsMap,
        allElementsMap: props.allElementsMap,
        visibleElements: props.visibleElements,
        appState: props.appState,
        renderConfig: props.renderConfig,
      },
      isRenderThrottlingEnabled(),
    );
  });

  return <div className="excalidraw__canvas-wrapper" ref={wrapperRef} />;
};

/**
 * 从完整的应用状态中提取与静态画布相关的属性
 * @param appState - 完整的应用状态对象
 * @returns 返回与静态画布相关的状态属性
 */
const getRelevantAppStateProps = (
  appState: AppState,
): StaticCanvasAppState => ({
  zoom: appState.zoom,
  scrollX: appState.scrollX,
  scrollY: appState.scrollY,
  width: appState.width,
  height: appState.height,
  viewModeEnabled: appState.viewModeEnabled,
  offsetLeft: appState.offsetLeft,
  offsetTop: appState.offsetTop,
  theme: appState.theme,
  pendingImageElementId: appState.pendingImageElementId,
  shouldCacheIgnoreZoom: appState.shouldCacheIgnoreZoom,
  viewBackgroundColor: appState.viewBackgroundColor,
  exportScale: appState.exportScale,
  selectedElementsAreBeingDragged: appState.selectedElementsAreBeingDragged,
  gridSize: appState.gridSize,
  frameRendering: appState.frameRendering,
  selectedElementIds: appState.selectedElementIds,
  frameToHighlight: appState.frameToHighlight,
  editingGroupId: appState.editingGroupId,
  currentHoveredFontFamily: appState.currentHoveredFontFamily,
});

/**
 * 比较前后props是否相等，用于React.memo的性能优化
 * @param prevProps - 前一次的props
 * @param nextProps - 下一次的props
 * @returns 返回布尔值表示props是否相等
 */
const areEqual = (
  prevProps: StaticCanvasProps,
  nextProps: StaticCanvasProps,
) => {
  if (
    prevProps.sceneNonce !== nextProps.sceneNonce ||
    prevProps.scale !== nextProps.scale ||
    // we need to memoize on elementsMap because they may have renewed
    // even if sceneNonce didn't change (e.g. we filter elements out based
    // on appState)
    prevProps.elementsMap !== nextProps.elementsMap ||
    prevProps.visibleElements !== nextProps.visibleElements
  ) {
    return false;
  }

  return (
    isShallowEqual(
      // asserting AppState because we're being passed the whole AppState
      // but resolve to only the StaticCanvas-relevant props
      getRelevantAppStateProps(prevProps.appState as AppState),
      getRelevantAppStateProps(nextProps.appState as AppState),
    ) && isShallowEqual(prevProps.renderConfig, nextProps.renderConfig)
  );
};
// React.memo 是一个高阶组件，用于优化函数组件的性能。它通过浅比较组件的 props 来决定是否需要重新渲染组件。
// 在这个例子中，areEqual 函数用于比较前后的 props 是否相等。如果 props 相等，则组件不会重新渲染，否则会重新渲染。
// 这样可以避免不必要的渲染，提高性能。
export default React.memo(StaticCanvas, areEqual);
