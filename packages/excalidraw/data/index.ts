import {
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
} from "../clipboard";
import {
  DEFAULT_EXPORT_PADDING,
  DEFAULT_FILENAME,
  isFirefox,
  MIME_TYPES,
} from "../constants";
import { getNonDeletedElements } from "../element";
import { isFrameLikeElement } from "../element/typeChecks";
import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
} from "../element/types";
import { t } from "../i18n";
import { isSomeElementSelected, getSelectedElements } from "../scene";
import { exportToCanvas, exportToSvg } from "../scene/export";
import type { ExportType } from "../scene/types";
import type { AppState, BinaryFiles } from "../types";
import { cloneJSON } from "../utils";
import { canvasToBlob } from "./blob";
import type { FileSystemHandle } from "./filesystem";
import { fileSave } from "./filesystem";
import { serializeAsJSON } from "./json";
import { getElementsOverlappingFrame } from "../frame";

export { loadFromBlob } from "./blob";
export { loadFromJSON, saveAsJSON } from "./json";

export type ExportedElements = readonly NonDeletedExcalidrawElement[] & {
  _brand: "exportedElements";
};

/**
 * 准备要导出的元素，根据是否仅导出选中元素进行处理
 * @param elements - 所有元素数组
 * @param selectedElementIds - 当前选中的元素ID集合
 * @param exportSelectionOnly - 是否仅导出选中元素
 * @returns 返回导出帧（如果有）和准备导出的元素
 */
export const prepareElementsForExport = (
  elements: readonly ExcalidrawElement[],
  { selectedElementIds }: Pick<AppState, "selectedElementIds">,
  exportSelectionOnly: boolean,
) => {
  elements = getNonDeletedElements(elements);

  const isExportingSelection =
    exportSelectionOnly &&
    isSomeElementSelected(elements, { selectedElementIds });

  let exportingFrame: ExcalidrawFrameLikeElement | null = null;
  let exportedElements = isExportingSelection
    ? getSelectedElements(
        elements,
        { selectedElementIds },
        {
          includeBoundTextElement: true,
        },
      )
    : elements;

  if (isExportingSelection) {
    if (
      exportedElements.length === 1 &&
      isFrameLikeElement(exportedElements[0])
    ) {
      exportingFrame = exportedElements[0];
      exportedElements = getElementsOverlappingFrame(elements, exportingFrame);
    } else if (exportedElements.length > 1) {
      exportedElements = getSelectedElements(
        elements,
        { selectedElementIds },
        {
          includeBoundTextElement: true,
          includeElementsInFrames: true,
        },
      );
    }
  }

  return {
    exportingFrame,
    exportedElements: cloneJSON(exportedElements) as ExportedElements,
  };
};

/**
 * 导出画布内容到指定格式
 * @param type - 导出类型（svg/png/clipboard等）
 * @param elements - 要导出的元素
 * @param appState - 应用状态
 * @param files - 二进制文件
 * @param options - 导出选项，包括：
 *   exportBackground - 是否导出背景
 *   exportPadding - 导出边距
 *   viewBackgroundColor - 视图背景色
 *   name - 文件名
 *   fileHandle - 文件系统句柄
 *   exportingFrame - 导出帧
 * @returns 根据导出类型返回不同的结果
 * @throws 如果导出失败会抛出错误
 */
export const exportCanvas = async (
  type: Omit<ExportType, "backend">,
  elements: ExportedElements,
  appState: AppState,
  files: BinaryFiles,
  {
    exportBackground,
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
    name = appState.name || DEFAULT_FILENAME,
    fileHandle = null,
    exportingFrame = null,
  }: {
    exportBackground: boolean;
    exportPadding?: number;
    viewBackgroundColor: string;
    /** filename, if applicable */
    name?: string;
    fileHandle?: FileSystemHandle | null;
    exportingFrame: ExcalidrawFrameLikeElement | null;
  },
) => {
  if (elements.length === 0) {
    throw new Error(t("alerts.cannotExportEmptyCanvas"));
  }
  if (type === "svg" || type === "clipboard-svg") {
    const svgPromise = exportToSvg(
      elements,
      {
        exportBackground,
        exportWithDarkMode: appState.exportWithDarkMode,
        viewBackgroundColor,
        exportPadding,
        exportScale: appState.exportScale,
        exportEmbedScene: appState.exportEmbedScene && type === "svg",
      },
      files,
      { exportingFrame },
    );

    if (type === "svg") {
      return fileSave(
        svgPromise.then((svg) => {
          return new Blob([svg.outerHTML], { type: MIME_TYPES.svg });
        }),
        {
          description: "Export to SVG",
          name,
          extension: appState.exportEmbedScene ? "excalidraw.svg" : "svg",
          fileHandle,
        },
      );
    } else if (type === "clipboard-svg") {
      const svg = await svgPromise.then((svg) => svg.outerHTML);
      try {
        await copyTextToSystemClipboard(svg);
      } catch (e) {
        throw new Error(t("errors.copyToSystemClipboardFailed"));
      }
      return;
    }
  }

  const tempCanvas = exportToCanvas(elements, appState, files, {
    exportBackground,
    viewBackgroundColor,
    exportPadding,
    exportingFrame,
  });

  if (type === "png") {
    let blob = canvasToBlob(tempCanvas);

    if (appState.exportEmbedScene) {
      blob = blob.then((blob) =>
        import("./image").then(({ encodePngMetadata }) =>
          encodePngMetadata({
            blob,
            metadata: serializeAsJSON(elements, appState, files, "local"),
          }),
        ),
      );
    }

    return fileSave(blob, {
      description: "Export to PNG",
      name,
      // FIXME reintroduce `excalidraw.png` when most people upgrade away
      // from 111.0.5563.64 (arm64), see #6349
      extension: /* appState.exportEmbedScene ? "excalidraw.png" : */ "png",
      fileHandle,
    });
  } else if (type === "clipboard") {
    try {
      const blob = canvasToBlob(tempCanvas);
      await copyBlobToClipboardAsPng(blob);
    } catch (error: any) {
      console.warn(error);
      if (error.name === "CANVAS_POSSIBLY_TOO_BIG") {
        throw new Error(t("canvasError.canvasTooBig"));
      }
      // TypeError *probably* suggests ClipboardItem not defined, which
      // people on Firefox can enable through a flag, so let's tell them.
      if (isFirefox && error.name === "TypeError") {
        throw new Error(
          `${t("alerts.couldNotCopyToClipboard")}\n\n${t(
            "hints.firefox_clipboard_write",
          )}`,
        );
      } else {
        throw new Error(t("alerts.couldNotCopyToClipboard"));
      }
    }
  } else {
    // shouldn't happen
    throw new Error("Unsupported export type");
  }
};
