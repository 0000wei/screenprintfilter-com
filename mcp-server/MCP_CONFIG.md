# ScreenPrintFilter MCP Server - 配置说明

## 概述

这是一个本地 MCP (Model Context Protocol) 服务器，用于将图片转换为 halftone 网点图案。所有处理都在本地进行，不会上传到任何服务器。

## 安装

### 1. 系统依赖

需要安装以下系统包（Ubuntu/Debian）：

```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libpixman-1-dev pkg-config
```

对于其他 Linux 发行版，请安装对应的 Cairo、Pango 和图像处理库开发包。

### 2. Node.js 依赖

```bash
cd mcp-server
npm install
```

## MCP 配置

将以下配置添加到你的 MCP 客户端配置文件中：

### Claude Desktop 配置

编辑 `~/.config/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "screenprintfilter": {
      "command": "node",
      "args": ["/home/wu/screenprintfilter-com/mcp-server/index.js"]
    }
  }
}
```

**注意**：请将路径 `/home/wu/screenprintfilter-com/mcp-server/index.js` 替换为你的实际路径。

### 其他 MCP 客户端

参考你的客户端文档配置 stdio 类型的 MCP 服务器。

## 使用方法

### 通过 AI Agent 调用

配置完成后，AI Agent 可以直接调用 `convert_halftone` 工具：

```javascript
{
  "input_path": "/path/to/your/image.jpg",
  "output_path": "/path/to/output/halftone.png",
  "dot_size": 4,
  "spacing": 1.5,
  "contrast": 60,
  "brightness": 0,
  "shape": "circle",
  "angle": 45,
  "use_original_colors": true
}
```

### 可用参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `input_path` | string | 必填 | 输入图片路径 |
| `output_path` | string | 必填 | 输出 PNG 路径 |
| `dot_size` | number | 4 | 网点大小 (2-30px) |
| `spacing` | number | 1.0 | 网点间距倍率 (1.0-2.0) |
| `contrast` | number | 50 | 对比度 (0-100) |
| `brightness` | number | 0 | 亮度 (-50~50) |
| `shape` | string | "circle" | 网点形状 (circle/square/diamond/line) |
| `angle` | number | 0 | 旋转角度 (0-360°) |
| `fg_color` | string | "#000000" | 前景色 (仅当 use_original_colors=false) |
| `bg_color` | string | "#FFFFFF" | 背景色 |
| `use_original_colors` | boolean | true | 是否保留原图颜色 |
| `output_width` | number | null | 自定义输出宽度 |
| `output_height` | number | null | 自定义输出高度 |

## 测试

运行测试脚本验证安装：

```bash
node mcp-server/test-mcp.js
```

应该看到：
```
✓ Canvas module available
✓ Test image created: /tmp/test-input.png
✓ Halftone conversion completed
✓ Output saved to: /tmp/test-halftone.png
✓ Test completed successfully!
```

## 故障排除

### Canvas 模块错误

如果遇到 canvas 相关错误，请确保：
1. 已安装所有系统依赖
2. Node.js 版本 >= 18.0.0
3. 已运行 `npm install`

### MCP 服务器无法启动

检查：
1. Node.js 路径是否正确
2. index.js 文件路径是否正确
3. 文件是否有执行权限

### 图片格式不支持

支持的输入格式：JPG、PNG、WebP、GIF、BMP
输出格式：PNG

## 隐私说明

- 所有图片处理都在本地进行
- 不会上传到任何服务器
- 不收集任何用户数据
- 处理完成后图片不会保留

## 性能建议

- 大图片（>4000px）处理时间较长，建议先缩小尺寸
- 网点越小 (dot_size=2-4)，处理时间越长
- 旋转角度 (angle≠0) 会略微增加处理时间
- 使用原始颜色模式比单色模式处理时间稍长

## 与网页版本对比

MCP 服务器版本与网页版本 (https://screenprintfilter.online/) 使用相同的算法，但有以下优势：

- ✅ 批量处理能力
- ✅ 可集成到自动化流程
- ✅ 无需手动操作
- ✅ 可通过 AI Agent 调用
- ✅ 完全本地运行，无网络需求

## 开源信息

- 源代码：与 ScreenPrintFilter 主项目一起开源
- 许可证：MIT
- 问题反馈：通过项目 GitHub Issues