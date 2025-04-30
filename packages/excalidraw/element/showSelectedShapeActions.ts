import type { NonDeletedExcalidrawElement } from "./types";
import { getSelectedElements } from "../scene";
import type { UIAppState } from "../types";

/**
 * 判断是否显示选中形状的操作按钮。
 * @param appState 当前应用状态
 * @param elements 当前画布中的元素
 * @returns 是否显示操作按钮
 */
export const showSelectedShapeActions = (
  appState: UIAppState,
  elements: readonly NonDeletedExcalidrawElement[],
) =>
  Boolean(
    !appState.viewModeEnabled &&
      ((appState.activeTool.type !== "custom" &&
        (appState.editingElement ||
          (appState.activeTool.type !== "selection" &&
            appState.activeTool.type !== "eraser" &&
            appState.activeTool.type !== "hand" &&
            appState.activeTool.type !== "laser"))) ||
        getSelectedElements(elements, appState).length),
  );
