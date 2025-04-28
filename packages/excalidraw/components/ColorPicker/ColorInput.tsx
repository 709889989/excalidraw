import { useCallback, useEffect, useRef, useState } from "react";
import { getColor } from "./ColorPicker";
import { useAtom } from "jotai";
import type { ColorPickerType } from "./colorPickerUtils";
import { activeColorPickerSectionAtom } from "./colorPickerUtils";
import { eyeDropperIcon } from "../icons";
import { jotaiScope } from "../../jotai";
import { KEYS } from "../../keys";
import { activeEyeDropperAtom } from "../EyeDropper";
import clsx from "clsx";
import { t } from "../../i18n";
import { useDevice } from "../App";
import { getShortcutKey } from "../../utils";

// ColorInput组件属性定义
interface ColorInputProps {
  // 当前颜色值
  color: string;
  // 颜色改变时的回调函数
  onChange: (color: string) => void;
  // 输入框的标签
  label: string;
  // 颜色选择器类型
  colorPickerType: ColorPickerType;
}

// ColorInput组件实现
// 该组件负责颜色输入框的渲染和交互，包括颜色值输入和EyeDropper工具集成
export const ColorInput = ({
  color,
  onChange,
  label,
  colorPickerType,
}: ColorInputProps) => {
  // 获取设备信息
const device = useDevice();
// 内部输入框的值状态
const [innerValue, setInnerValue] = useState(color);
// 当前激活的颜色选择器区域状态
const [activeSection, setActiveColorPickerSection] = useAtom(
  activeColorPickerSectionAtom,
);

  // 监听外部color变化，同步更新内部状态
useEffect(() => {
  setInnerValue(color);
}, [color]);

  // 颜色改变处理函数
const changeColor = useCallback(
  (inputValue: string) => {
    // 统一转为小写
    const value = inputValue.toLowerCase();
    // 获取有效颜色值
    const color = getColor(value);

    // 如果颜色有效则触发回调
    if (color) {
      onChange(color);
    }
    // 更新内部状态
    setInnerValue(value);
  },
  [onChange],
);

  // 输入框的ref
const inputRef = useRef<HTMLInputElement>(null);
// EyeDropper触发按钮的ref
const eyeDropperTriggerRef = useRef<HTMLDivElement>(null);

  // 当激活区域为hex时，自动聚焦输入框
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, [activeSection]);

  // EyeDropper工具状态
const [eyeDropperState, setEyeDropperState] = useAtom(
  activeEyeDropperAtom,
  jotaiScope,
);

  // 组件卸载时清除EyeDropper状态
useEffect(() => {
  return () => {
    setEyeDropperState(null);
  };
}, [setEyeDropperState]);

  return (
    <div className="color-picker__input-label">
      <div className="color-picker__input-hash">#</div>
      <input
        ref={activeSection === "hex" ? inputRef : undefined}
        style={{ border: 0, padding: 0 }}
        spellCheck={false}
        className="color-picker-input"
        aria-label={label}
        onChange={(event) => {
          changeColor(event.target.value);
        }}
        value={(innerValue || "").replace(/^#/, "")}
        onBlur={() => {
          setInnerValue(color);
        }}
        tabIndex={-1}
        onFocus={() => setActiveColorPickerSection("hex")}
        onKeyDown={(event) => {
          if (event.key === KEYS.TAB) {
            return;
          } else if (event.key === KEYS.ESCAPE) {
            eyeDropperTriggerRef.current?.focus();
          }
          event.stopPropagation();
        }}
      />
      {/* TODO reenable on mobile with a better UX */}
      {!device.editor.isMobile && (
        <>
          <div
            style={{
              width: "1px",
              height: "1.25rem",
              backgroundColor: "var(--default-border-color)",
            }}
          />
          <div
            ref={eyeDropperTriggerRef}
            className={clsx("excalidraw-eye-dropper-trigger", {
              selected: eyeDropperState,
            })}
            onClick={() =>
              setEyeDropperState((s) =>
                s
                  ? null
                  : {
                      keepOpenOnAlt: false,
                      onSelect: (color) => onChange(color),
                      colorPickerType,
                    },
              )
            }
            title={`${t(
              "labels.eyeDropper",
            )} — ${KEYS.I.toLocaleUpperCase()} or ${getShortcutKey("Alt")} `}
          >
            {eyeDropperIcon}
          </div>
        </>
      )}
    </div>
  );
};
