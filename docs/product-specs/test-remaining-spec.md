# ScreenPrintFilter 剩余测试 - 继续执行

## 背景
你之前已经跑了大部分测试并修了 6 个问题，改动已经在 git commit 474a961 中。
现在需要继续跑完剩余未通过的测试。

## 已完成并通过的测试
Test 1, 2, 3, 4, 6, 8, 9, 10 — 全部 ✅ 通过

## 需要继续的重点
### Test 5: Undo/Redo (当前 2/4 通过)
测试记得 Ctrl+Z 和连续多次 Undo/Redo
- handleControlInput 用了 dataset.undoStateSaved 标记在第一次 input 时保存状态
- handleControlChange 也保存状态（确保 select/color/checkbox 等也能 undo）
- 测试是否所有控件的 undo/redo 都正常工作

### Test 7: Download (当前 1/2 通过)
测试自定义尺寸下载是否正确

### Test 11: 输出尺寸
测试已有图片的情况下切换 Output Size

### Test 12: AI 友好文件
验证 llms.txt, .well-known/llms.txt, .well-known/ai-plugin.json 存在

## 执行方式
1. 启动: npx serve . (在 /home/wu/screenprintfilter-com 目录)
2. 用浏览器打开 localhost:3000
3. 逐个测试，标记 ✅/❌
4. ❌ 就修复然后重新验证
5. 最后出一份完整测试报告

## 输出要求
- 每条测试结果单独一行，格式清晰
- 所有 ✅/❌ 一目了然
- 最终总通过率
