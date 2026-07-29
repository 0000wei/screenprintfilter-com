为 ScreenPrintFilter 网站修复 theme toggle 功能不起作用的问题。

项目路径: /home/wu/screenprintfilter-com/
应用类型: 单页应用（首页 ~2300行） + 7种语言的翻译页面

## 问题

用户反映点击暗色/亮色切换按钮没有反应。

## 需要做的

### 1. 首页 index.html

先 read_file 读取 /home/wu/screenprintfilter-com/index.html。

检查以下几点：
a) 页面中是否有 <button id="themeToggle"> 按钮
b) CSS 中是否有 .theme-toggle 样式和 .sun-icon / .moon-icon 的显示控制
c) 是否有 theme toggle 的 JS 代码，以及它是在哪里执行的

如果按钮存在但功能不工作，在 </body> 之前（最后一个 </script> 之后）添加一个独立的 inline script：

```html
<script>
(function(){
    var btn = document.getElementById('themeToggle');
    if(!btn) return;
    var t = localStorage.getItem('spf_theme');
    if(t) {
        document.documentElement.setAttribute('data-theme', t);
    } else if(window.matchMedia('(prefers-color-scheme: dark)').matches){
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('spf_theme', 'dark');
    }
    btn.onclick = function(){
        var cur = document.documentElement.getAttribute('data-theme');
        var next = cur === 'dark' ? '' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('spf_theme', next || 'light');
    };
})();
</script>
```

同时删除页面中已有的其他 theme toggle JS（如果有重复的）。

### 2. 所有语言版本的 index.html

对 zh, ja, de, fr, es, pt, ar 每种语言的 /{lang}/index.html 做同样的事情：
- 确保有 theme-toggle 按钮
- 确保 CSS 有 .theme-toggle / .sun-icon / .moon-icon 样式
- 在 body 底部加 inline script

### 3. CSS 检查

确保所有 @media (prefers-color-scheme: dark) 已被替换为 [data-theme="dark"]。

完成后 git add, commit, push。
