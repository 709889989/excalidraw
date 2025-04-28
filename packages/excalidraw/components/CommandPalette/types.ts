import type { ActionManager } from "../../actions/manager";
import type { Action } from "../../actions/types";
import type { UIAppState } from "../../types";

export type CommandPaletteItem = {
  /** 命令的显示名称 */
  label: string;
  /** 用于搜索匹配的额外关键词
   * (会追加到haystack中，但不会显示) */
  keywords?: string[];
  /** 搜索时用于匹配的字符串
   * (去除特殊字符后的名称 + 关键词) */
  haystack?: string;
  /** 命令图标，可以是静态节点或根据应用状态动态生成的节点 */
  icon?: React.ReactNode | ((appState: UIAppState) => React.ReactNode);
  /** 命令所属的分类 */
  category: string;
  /** 命令在列表中的显示顺序 */
  order?: number;
  /** 判断命令是否可用的条件 */
  predicate?: boolean | Action["predicate"];
  /** 命令的快捷键 */
  shortcut?: string;
  /** 如果为false，在查看模式下不会显示该命令 */
  viewMode?: boolean;
  /** 执行命令时的回调函数 */
  perform: (data: {
    /** 动作管理器实例 */
    actionManager: ActionManager;
    /** 触发命令的事件 */
    event: React.MouseEvent | React.KeyboardEvent | KeyboardEvent;
  }) => void;
};
