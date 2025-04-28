import type { ExcalidrawElement } from "../element/types";
import type {
  AppState,
  BinaryFiles,
  LibraryItems,
  LibraryItems_anyVersion,
} from "../types";
import type { cleanAppStateForExport } from "../appState";
import type { VERSIONS } from "../constants";

/**
 * 表示导出的绘图数据状态
 * 包含绘图元素、应用状态和文件信息
 */
export interface ExportedDataState {
  type: string;
  version: number;
  source: string;
  elements: readonly ExcalidrawElement[];
  appState: ReturnType<typeof cleanAppStateForExport>;
  files: BinaryFiles | undefined;
}

/**
 * Map of legacy AppState keys, with values of:
 *  [<legacy type>, <new AppState proeprty>]
 *
 * This is a helper type used in downstream abstractions.
 * Don't consume on its own.
 */
export type LegacyAppState = {
  /** @deprecated #6213 TODO remove 23-06-01 */
  isSidebarDocked: [boolean, "defaultSidebarDockedPreference"];
};

/**
 * 表示导入的绘图数据状态
 * 包含可选的绘图元素、应用状态和文件信息
 */
export interface ImportedDataState {
  type?: string;
  version?: number;
  source?: string;
  elements?: readonly ExcalidrawElement[] | null;
  appState?: Readonly<
    Partial<
      AppState & {
        [T in keyof LegacyAppState]: LegacyAppState[T][0];
      }
    >
  > | null;
  scrollToContent?: boolean;
  libraryItems?: LibraryItems_anyVersion;
  files?: BinaryFiles;
}

/**
 * 表示导出的库数据
 * 包含库项目的版本和来源信息
 */
export interface ExportedLibraryData {
  type: string;
  version: typeof VERSIONS.excalidrawLibrary;
  source: string;
  libraryItems: LibraryItems;
}

/**
 * 表示导入的库数据
 * 继承自ExportedLibraryData，支持部分属性和旧版本兼容
 */
export interface ImportedLibraryData extends Partial<ExportedLibraryData> {
  /** @deprecated v1 */
  library?: LibraryItems;
}
