import { fileOpen, fileSave } from "./filesystem";
import { cleanAppStateForExport, clearAppStateForDatabase } from "../appState";
import {
  DEFAULT_FILENAME,
  EXPORT_DATA_TYPES,
  EXPORT_SOURCE,
  MIME_TYPES,
  VERSIONS,
} from "../constants";
import { clearElementsForDatabase, clearElementsForExport } from "../element";
import type { ExcalidrawElement } from "../element/types";
import type { AppState, BinaryFiles, LibraryItems } from "../types";
import { isImageFileHandle, loadFromBlob, normalizeFile } from "./blob";

import type {
  ExportedDataState,
  ImportedDataState,
  ExportedLibraryData,
  ImportedLibraryData,
} from "./types";

/**
 * Strips out files which are only referenced by deleted elements
 */
/**
 * 过滤掉仅被删除元素引用的文件
 * @param elements - Excalidraw元素数组
 * @param files - 二进制文件对象
 * @returns 返回仅被未删除元素引用的文件
 */
const filterOutDeletedFiles = (
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
) => {
  const nextFiles: BinaryFiles = {};
  for (const element of elements) {
    if (
      !element.isDeleted &&
      "fileId" in element &&
      element.fileId &&
      files[element.fileId]
    ) {
      nextFiles[element.fileId] = files[element.fileId];
    }
  }
  return nextFiles;
};

/**
 * 将Excalidraw数据序列化为JSON字符串
 * @param elements - Excalidraw元素数组
 * @param appState - 应用状态
 * @param files - 二进制文件对象
 * @param type - 序列化类型（local或database）
 * @returns 返回序列化后的JSON字符串
 */
export const serializeAsJSON = (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  type: "local" | "database",
): string => {
  const data: ExportedDataState = {
    type: EXPORT_DATA_TYPES.excalidraw,
    version: VERSIONS.excalidraw,
    source: EXPORT_SOURCE,
    elements:
      type === "local"
        ? clearElementsForExport(elements)
        : clearElementsForDatabase(elements),
    appState:
      type === "local"
        ? cleanAppStateForExport(appState)
        : clearAppStateForDatabase(appState),
    files:
      type === "local"
        ? filterOutDeletedFiles(elements, files)
        : // will be stripped from JSON
          undefined,
  };

  return JSON.stringify(data, null, 2);
};

/**
 * 将Excalidraw数据保存为JSON文件
 * @param elements - Excalidraw元素数组
 * @param appState - 应用状态
 * @param files - 二进制文件对象
 * @param name - 文件名（默认为应用状态中的名称或默认文件名）
 * @returns 返回包含文件句柄的对象
 */
export const saveAsJSON = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  /** filename */
  name: string = appState.name || DEFAULT_FILENAME,
) => {
  const serialized = serializeAsJSON(elements, appState, files, "local");
  const blob = new Blob([serialized], {
    type: MIME_TYPES.excalidraw,
  });

  const fileHandle = await fileSave(blob, {
    name,
    extension: "excalidraw",
    description: "Excalidraw file",
    fileHandle: isImageFileHandle(appState.fileHandle)
      ? null
      : appState.fileHandle,
  });
  return { fileHandle };
};

/**
 * 从JSON文件加载Excalidraw数据
 * @param localAppState - 本地应用状态
 * @param localElements - 本地元素数组
 * @returns 返回加载后的Excalidraw数据
 */
export const loadFromJSON = async (
  localAppState: AppState,
  localElements: readonly ExcalidrawElement[] | null,
) => {
  const file = await fileOpen({
    description: "Excalidraw files",
    // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
    // gets resolved. Else, iOS users cannot open `.excalidraw` files.
    // extensions: ["json", "excalidraw", "png", "svg"],
  });
  return loadFromBlob(
    await normalizeFile(file),
    localAppState,
    localElements,
    file.handle,
  );
};

/**
 * 验证是否为有效的Excalidraw数据
 * @param data - 待验证的数据对象
 * @returns 返回是否为有效的Excalidraw数据
 */
export const isValidExcalidrawData = (data?: {
  type?: any;
  elements?: any;
  appState?: any;
}): data is ImportedDataState => {
  return (
    data?.type === EXPORT_DATA_TYPES.excalidraw &&
    (!data.elements ||
      (Array.isArray(data.elements) &&
        (!data.appState || typeof data.appState === "object")))
  );
};

/**
 * 验证是否为有效的Excalidraw库数据
 * @param json - 待验证的JSON数据
 * @returns 返回是否为有效的Excalidraw库数据
 */
export const isValidLibrary = (json: any): json is ImportedLibraryData => {
  return (
    typeof json === "object" &&
    json &&
    json.type === EXPORT_DATA_TYPES.excalidrawLibrary &&
    (json.version === 1 || json.version === 2)
  );
};

/**
 * 将Excalidraw库项目序列化为JSON字符串
 * @param libraryItems - 库项目数组
 * @returns 返回序列化后的JSON字符串
 */
export const serializeLibraryAsJSON = (libraryItems: LibraryItems) => {
  const data: ExportedLibraryData = {
    type: EXPORT_DATA_TYPES.excalidrawLibrary,
    version: VERSIONS.excalidrawLibrary,
    source: EXPORT_SOURCE,
    libraryItems,
  };
  return JSON.stringify(data, null, 2);
};

/**
 * 将Excalidraw库项目保存为JSON文件
 * @param libraryItems - 库项目数组
 */
export const saveLibraryAsJSON = async (libraryItems: LibraryItems) => {
  const serialized = serializeLibraryAsJSON(libraryItems);
  await fileSave(
    new Blob([serialized], {
      type: MIME_TYPES.excalidrawlib,
    }),
    {
      name: "library",
      extension: "excalidrawlib",
      description: "Excalidraw library file",
    },
  );
};
