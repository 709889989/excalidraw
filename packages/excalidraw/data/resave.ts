import type { ExcalidrawElement } from "../element/types";
import type { AppState, BinaryFiles } from "../types";
import { exportCanvas, prepareElementsForExport } from ".";
import { getFileHandleType, isImageFileHandleType } from "./blob";

/**
 * 将当前画布重新保存为包含场景信息的图像文件
 * @param elements - 画布中的元素数组
 * @param appState - 应用程序状态，包含导出设置等信息
 * @param files - 二进制文件集合
 * @param name - 导出文件的名称
 * @returns 包含文件句柄的对象
 * @throws 当文件句柄不存在或不是SVG/PNG类型时抛出错误
 */
export const resaveAsImageWithScene = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  name: string,
) => {
  const { exportBackground, viewBackgroundColor, fileHandle } = appState;

  const fileHandleType = getFileHandleType(fileHandle);

  if (!fileHandle || !isImageFileHandleType(fileHandleType)) {
    throw new Error(
      "fileHandle should exist and should be of type svg or png when resaving",
    );
  }
  appState = {
    ...appState,
    exportEmbedScene: true,
  };

  const { exportedElements, exportingFrame } = prepareElementsForExport(
    elements,
    appState,
    false,
  );

  await exportCanvas(fileHandleType, exportedElements, appState, files, {
    exportBackground,
    viewBackgroundColor,
    name,
    fileHandle,
    exportingFrame,
  });

  return { fileHandle };
};
