import { actionToggleTheme } from "../../actions";
import type { CommandPaletteItem } from "./types";

// 定义主题切换命令项
export const toggleTheme: CommandPaletteItem = {
  // 继承主题切换操作的所有属性
  ...actionToggleTheme,
  // 设置命令分类为"App"
  category: "App",
  // 设置命令显示标签
  label: "Toggle theme",
  // 定义命令执行逻辑
  perform: ({ actionManager }) => {
    // 通过actionManager执行主题切换操作，并标记来源为命令面板
    actionManager.executeAction(actionToggleTheme, "commandPalette");
  },
};
