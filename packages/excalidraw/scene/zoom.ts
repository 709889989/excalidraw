import { MIN_ZOOM } from "../constants";
import type { AppState, NormalizedZoomValue } from "../types";

// 获取归一化后的缩放值，限制在MIN_ZOOM和30之间
export const getNormalizedZoom = (zoom: number): NormalizedZoomValue => {
  return Math.max(MIN_ZOOM, Math.min(zoom, 30)) as NormalizedZoomValue;
};

// 根据给定的视口坐标和目标缩放值，计算新的滚动位置和缩放状态
export const getStateForZoom = (
  {
    viewportX,
    viewportY,
    nextZoom,
  }: {
    viewportX: number;
    viewportY: number;
    nextZoom: NormalizedZoomValue;
  },
  appState: AppState,
) => {
  // 计算视口坐标在应用层的相对位置
  const appLayerX = viewportX - appState.offsetLeft;
  const appLayerY = viewportY - appState.offsetTop;

  const currentZoom = appState.zoom.value;

  // 获取未缩放时的原始滚动位置
  const baseScrollX = appState.scrollX + (appLayerX - appLayerX / currentZoom);
  const baseScrollY = appState.scrollY + (appLayerY - appLayerY / currentZoom);

  // 计算目标缩放级别下的滚动偏移量
  const zoomOffsetScrollX = -(appLayerX - appLayerX / nextZoom);
  const zoomOffsetScrollY = -(appLayerY - appLayerY / nextZoom);

  return {
    scrollX: baseScrollX + zoomOffsetScrollX,
    scrollY: baseScrollY + zoomOffsetScrollY,
    zoom: {
      value: nextZoom,
    },
  };
};
