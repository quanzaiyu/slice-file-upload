# 文件切片上传及断点续传

本项目主要参考[字节跳动面试官：请你实现一个大文件上传和断点续传](https://juejin.im/post/5dff8a26e51d4558105420ed)，但是做了很多优化和调整

技术栈：使用 Node.js 实现服务器端逻辑，使用Vue实现客户端逻辑

用到的依赖：

- `vue` 使用MVVM，方便代码编写
- `fs-extra` fs的扩展实现
- `live-server` 搭建简单的http服务器
- `multiparty` 处理FormData数据
- `nodemon` 服务器端代码更新后自动重启服务

## 实现功能

- 切片上传
- 服务器端合并切片
- 计算hash
- 文件秒传
- 上传进度监控
- 暂停与恢复上传
