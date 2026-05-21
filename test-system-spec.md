# ScreenPrintFilter 完整用户视角测试

## 测试范围
对 index.html 进行完整的用户使用流程测试，包括 UI 交互、功能正确性、边界情况。

## 测试预备
打开本地 `/home/wu/screenprintfilter-com/index.html`，或启动一个 dev server:
```
cd /home/wu/screenprintfilter-com && npx serve .
```

然后用浏览器访问 `http://localhost:3000`（或实际端口）。

---

## Test 1: 首屏加载

1. 打开页面
2. 确认：
   - [ ] 顶部 Logo + 导航正常显示
   - [ ] 工具栏按钮（Load Image, ↩, ↪, Download PNG, Reset）可见且已 disabled
   - [ ] 所有 slider（Dot Size, Spacing, Contrast, Brightness, Angle）可见且已 disabled
   - [ ] Color pickers 可见且 disabled
   - [ ] Canvas 区域显示 placeholder "Drop image here or click Load Image"
   - [ ] Example Gallery 显示 8 个预设缩略图，可点击
   - [ ] FAQ 部分可展开/阅读
   - [ ] Footer 显示
   - [ ] Browser console 无 JS Error

## Test 2: 上传图片

3. 点击 "Load Image" 按钮
4. 选择一张 JPG 图片（建议 800x600 以上）
5. 确认：
   - [ ] 上传后 placeholder 消失，canvas 显示 halftone 效果
   - [ ] Canvas 在 wrapper 中**水平和垂直居中**
   - [ ] 状态提示 "Processing..." 出现并消失
   - [ ] 工具栏所有 control 变为 enabled
   - [ ] Zoom controls 区域出现
   - [ ] Canvas 区域底部显示原图尺寸（如 "1920 × 1080px"）
   - [ ] Download 按钮在 hover canvas 时出现
   - [ ] Console 无 JS Error

## Test 3: 参数调整

6. 拖动 Dot Size slider（4px → 30px）
   - [ ] 滑条拖动过程中不卡顿，松开后快速渲染
   - [ ] 网点大小明显变化
   - [ ] 数值显示实时更新

7. 调整 Spacing (1.0x → 2.0x)
   - [ ] 网点间距变化

8. 调整 Contrast (0% → 100%)
   - [ ] 对比度变化，暗部更暗亮部更亮

9. 调整 Brightness (-50 → +50)
   - [ ] 整体亮度变化

10. 调整 Angle (0° → 360°)
    - [ ] 网点旋转
    - [ ] 旋转 45° 时效果明显

11. 切换 Dot Shape（Circle → Square → Diamond → Line）
    - [ ] 每种形状正确渲染

12. 切换 Foreground/Background Color（如红色前景 #FF0000）
    - [ ] 颜色变化

13. 勾选/取消 "Original Colors"
    - [ ] 勾选时点使用原图颜色
    - [ ] 取消时点为单色（foreground color）

## Test 4: 缩放功能

14. 点击 Zoom 按钮（25%, 50%, 100%, 150%, 200%, Fit）
    - [ ] 100% 时 Canvas 正常大小，居中
    - [ ] 200% 时 Canvas 放大 2 倍，从中心放大
    - [ ] 放大后有滚动条出现
    - [ ] Fit 时自适应填满容器
    - [ ] 当前缩放百分比正确显示

15. 缩放 > 100% 时拖拽平移
    - [ ] 鼠标变为 grab 图标
    - [ ] 可以拖拽平移画面

## Test 5: Undo/Redo

16. 调整参数后点击 ↩ (Undo)
    - [ ] 恢复到上一个参数状态
    - [ ] 画面重新渲染

17. 点击 ↪ (Redo)
    - [ ] 恢复到撤销前的状态

18. 连续多次 Undo/Redo
    - [ ] 不崩溃，状态正确

19. Ctrl+Z / Ctrl+Shift+Z 快捷键
    - [ ] 正常工作

## Test 6: Reset

20. 调整参数后点击 Reset
    - [ ] 所有参数恢复默认值（Dot=4px, Spacing=1.0x, Contrast=50%, etc.）
    - [ ] 画面重新渲染

## Test 7: Download

21. 点击 Download PNG
    - [ ] PNG 文件被下载
    - [ ] 下载的图片画面正确

22. 取消 "Original" Size 勾选，输入自定义尺寸（如 200x200），点击 Download
    - [ ] 下载的图片大小为 200x200

## Test 8: 拖拽上传

23. 拖拽一张图片到 canvas 区域
    - [ ] 拖拽时 canvas 边框高亮
    - [ ] 释放后图片加载并应用 halftone 效果

## Test 9: Example Gallery 预设

24. 点击每个 gallery 预设（8 个）
    - [ ] 预设参数被应用（slider 值变化）
    - [ ] 画面重新渲染（如果已有图片）
    - [ ] 如果没有图片，显示提示 "Parameters loaded! Upload an image to try this look."

## Test 10: 边界情况

25. 上传非常大的图片（如 10MB+）
    - [ ] 提示 "File too large"

26. 上传非图片文件
    - [ ] 忽略或提示不支持

27. 连续快速拖动 slider
    - [ ] 不卡死
    - [ ] 最终画面正确

28. 上传后立即切换图片
    - [ ] 正常工作

## Test 11: 输出尺寸

29. 上传一张大图（如 4000x3000），不勾选 Original Size
    - [ ] 输入框变为可编辑
    - [ ] 输入 500x300，画面按此尺寸渲染
    - [ ] 下载的图片为 500x300

## Test 12: AI 友好文件

30. 访问 `/llms.txt`
    - [ ] 文件存在且内容正确
31. 访问 `/.well-known/llms.txt`
    - [ ] 文件存在
32. 访问 `/.well-known/ai-plugin.json`
    - [ ] 文件存在

---

## 执行要求

- 每个 Test Case 标记 ✅ 通过 / ❌ 失败
- 失败的 Test Case 必须：
  1. 描述具体现象
  2. 定位根因（哪行代码）
  3. 修复
  4. 重新验证通过后标记 ✅
- 最终输出一份完整的测试报告
