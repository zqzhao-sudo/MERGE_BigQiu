# 合成大球球

[点击开始游戏](https://zqzhao-sudo.github.io/MERGE_BigQiu/)

十级球球合成网页游戏，包含原创表情包、合成音效和可开关的生日彩蛋。纯静态网页，不需要安装依赖，也不需要服务端。

## GitHub Pages 发布

将本文件夹中的内容上传到一个 GitHub 仓库根目录（index.html 与 assets 同级）。然后在仓库 Settings → Pages 中，选择 Deploy from a branch，分支 main，目录 / (root)，保存。发布完成后使用 Pages 页面显示的网页链接。

参考：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 文件

- index.html：页面及彩蛋文案
- style.css：界面样式
- game.js：游戏逻辑
- assets/：图片、音频及 Matter.js 物理引擎

球球语：Bo-lu Qiu!。Bo＝出生，Lu＝日，Qiu＝快乐，采用「生日＋快乐」词序。

最高分、音效及彩蛋开关保存在玩家自己的浏览器中。

图片及录音归各自原作者所有。物理引擎使用 Matter.js 0.20.0，MIT 许可证：https://github.com/liabru/matter-js/blob/0.20.0/LICENSE
