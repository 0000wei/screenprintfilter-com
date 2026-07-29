# 任务：重新设计 ScreenPrintFilter 暗色模式配色 + 修复 CSS 结构

## 项目位置
/home/wu/screenprintfilter-com/

## 需要修改的文件
/home/wu/screenprintfilter-com/index.html（内联 CSS 在 <style> 标签中）

## 问题
1. **[data-theme="dark"] { :root { ... } }** 是无效嵌套 CSS，浏览器忽略变量
2. **选择器特异性不足** — :root (0-1-0) 和 [data-theme="dark"] (0-1-0) 相同
3. **配色可以更精致** — 当前纯黑底色配灰色，但 header 和元素缺乏细节

## 修复方案

### 改动1：CSS 结构重构

将 `[data-theme="dark"] { :root { ... } }` 改为 `html[data-theme="dark"] { --var: val; }`

目前内联 CSS 中（在 index.html 内）：

```css
[data-theme="dark"] {
    :root {
        --bg-primary: #0a0a0a;
        --bg-secondary: #1a1a1a;
        ...
    }
    header { ... }
    nav a:hover { ... }
    ...
}
```

改为：

```css
html[data-theme="dark"] {
    --bg-primary: #0D0D0D;
    --bg-secondary: #1A1A1A;
    ...
}

html[data-theme="dark"] header { ... }
html[data-theme="dark"] nav a:hover { ... }
```

### 改动2：配色调整

| CSS 变量 | 旧值 | 新值 |
|---|---|---|
| --bg-primary | #0a0a0a | #0D0D0D（近乎纯黑） |
| --bg-secondary | #1a1a1a | #1A1A1A（不变） |
| --bg-tertiary | #2a2a2a | #2A2A2A（不变） |
| --text-primary | #e0e0e0 | #F5F5F5（暖白，提高对比度） |
| --text-secondary | #a0a0a0 | #A0A0A0（不变） |
| --text-disabled | #666 | #666（不变） |
| --accent | #FF4500 | #FF5722（暗色用更暖亮橙红） |
| --accent-hover | #FF5722 | #FF7043（更浅橙） |
| --border | #333 | #2A2A2A（稍柔和） |
| --border-hover | #555 | #555（不变） |

### 改动3：Header 升级

```css
html[data-theme="dark"] header {
    background: rgba(13, 13, 13, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
}
```

### 改动4：暗色下链接颜色升级

```css
html[data-theme="dark"] a {
    color: #FF7043;
}
html[data-theme="dark"] nav a {
    color: var(--text-secondary);
}
html[data-theme="dark"] nav a:hover {
    color: var(--accent);
}
```

### 改动5：主题切换 JS 中的 localStorage 键

不用动，已经是 `spf_theme`。

## 不要改动
1. 亮色模式 :root 部分完全不动
2. 所有 JS 代码不动（Theme Toggle 部分只需改选择器名）
3. 其他 HTML 文件不修改

## 验证
修改后用 Chrome 浏览器打开 https://screenprintfilter.online/，点击暗色切换按钮检查背景色是否为接近纯黑色。
