# ScreenPrintFilter AI友好 + 本地API MCP Server 规格书

## 两个目标

### 1. 完善 AI 友好网页配置
让 AI agent 能发现、理解并能使用这个网站。

### 2. 创建本地 MCP Server
把 halftone 算法封装成 MCP Server，AI 可以在用户本地调用（不是远程 API）。
Server 在本地读取图片 → 用 Node Canvas 渲染 halftone → 输出结果图片。

---

## 一、AI 友好网页优化

### 现有的
- `/llms.txt` ✅ 存在但内容偏简单
- `/.well-known/llms.txt` ✅ 同上
- `/.well-known/ai-plugin.json` ✅ 存在
- `<link rel="llms.txt">` ✅ 在 head 中
- `<link rel="mcp.txt">` ✅ 在 head 中
- `<link rel="ai-plugin">` ✅ 在 head 中

### 需要改的

#### 1.1 更新 llms.txt 和 .well-known/llms.txt
让 AI agent 能看懂这个网站能做什么、参数怎么用。内容要包含：
- 网站用途
- 所有可调参数及取值范围
- 使用示例（AI agent 可以用什么 prompt 来调用）
- FAQ 摘要
- 技术实现说明（Canvas, 纯前端, 无服务端）

#### 1.2 更新 ai-plugin.json
确保 URL、描述准确。

#### 1.3 给 index.html 的 head 加 robots meta
```
<meta name="robots" content="index, follow">
```

---

## 二、MCP Server（本地 API）

这是一个 standalone Node.js MCP Server，安装在用户本地执行。
AI Agent 通过 MCP 协议调用它来处理图片。

### 功能
```
convert_halftone(input_path, output_path, params)
```

### 参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| input_path | string | 必填 | 输入图片路径 |
| output_path | string | 必填 | 输出 PNG 路径 |
| dot_size | int | 4 | 2-30, 最大网点直径 |
| spacing | float | 1.0 | 1.0-2.0, 网点间距倍率 |
| contrast | int | 50 | 0-100, 对比度 |
| brightness | int | 0 | -50~50, 亮度 |
| shape | string | "circle" | circle/square/diamond/line |
| angle | int | 0 | 0-360, 网点旋转角度 |
| fg_color | string | "#000000" | 前景色 |
| bg_color | string | "#FFFFFF" | 背景色 |
| use_original_colors | bool | true | 是否保留原图颜色 |
| output_width | int | null | 自定义输出宽度（null=原图宽） |
| output_height | int | null | 自定义输出高度（null=原图高） |

### 实现方式
- 使用 Node.js + `canvas` 包 (node-canvas, 已在 devDependencies 中)
- 使用 MCP 协议 sdks (@modelcontextprotocol/sdk)
- 用 npm 包管理
- 输出 `convert_halftone` tool

### 代码结构
```
screenprintfilter-com/
├── index.html          # 网页
├── mcp-server/
│   ├── package.json    # 独立 package
│   ├── index.js        # MCP Server 入口
│   └── halftone.js     # 核心 halftone 算法（从网页 JS 移植）
├── llms.txt            # 更新
├── .well-known/
│   ├── llms.txt        # 更新
│   └── ai-plugin.json  # 更新
```

### halftone.js 算法
从 index.html 的 JS 中提取 `applyHalftone` 核心算法，移植到 Node.js：
1. 用 `canvas` 包加载图片
2. 计算亮度数组（precompute）
3. 按 dotSize/spacing/angle/shape 绘制网点
4. 输出 PNG

### MCP Server 配置说明
Server 跑在 stdio 模式（标准 MCP 方式），AI agent 通过 MCP client 调用。
用户需要在 MCP 配置中添加：
```json
{
  "halftone": {
    "command": "node",
    "args": ["/path/to/screenprintfilter-com/mcp-server/index.js"]
  }
}
```

---

## 三、执行顺序

1. 更新 llms.txt + .well-known/llms.txt
2. 更新 .well-known/ai-plugin.json
3. 给 index.html head 加 robots meta
4. 创建 mcp-server/package.json
5. 创建 mcp-server/halftone.js（核心算法）
6. 创建 mcp-server/index.js（MCP Server 入口）
7. 安装依赖并测试
