# 嗅嗅-Niffler

## 维护中...

功能点开发：

- [x] 插件基础开发
- [x] 被动识别
- [x] 拦截
- [x] 消息提醒
- [x] 弹窗
- [x] 分网页拦截
- [x] 白名单
- [x] 拦截算法优化（针对主域名而不是所有）
- [ ] 拦截精准性优化
- [ ] 自动更新

有其他需求可以提issue哦(^_^)
## 简介

嗅嗅是一款运行在firefox上的jsonp蜜罐被动扫描插件

（工具可能影响日常网页感受，建议只在进行渗透测试时开启插件）

Niffler is a JSONP honeypot passive scanner that runs on Firefox.
(The tool may affect your regular web browsing experience. It is recommended to enable the add-on only during penetration testing.)

![](https://yuy0ung.oss-cn-chengdu.aliyuncs.com/icon-96.png)

安装好扩展后，可以在浏览器左上角打开它：

![image-20250318163945729](https://yuy0ung.oss-cn-chengdu.aliyuncs.com/image-20250318163945729.png)

运行后，嗅嗅可以在后台检测当前网页发起的跨站请求，若具有jsonp接口特征的请求或对一些媒体网站请求数量过大，嗅嗅会对网站的请求进行拦截并发起告警:

* 弹窗告警：
  ![328a1bd4d2595c2e5515af4552aee14b](https://yuy0ung.oss-cn-chengdu.aliyuncs.com/328a1bd4d2595c2e5515af4552aee14b.png)

* 消息告警：

  ![image-20250318162931625](https://yuy0ung.oss-cn-chengdu.aliyuncs.com/image-20250318162931625.png)

## 插件安装
打开浏览器临时扩展管理界面：about:debugging#/runtime/this-firefox
找到“临时加载附加组件” 添加下载的插件文件夹
<img width="1125" alt="image" src="https://yuy0ung.oss-cn-chengdu.aliyuncs.com/1ab5a432-7fee-4c62-a489-7cb005f76206.png" />
最后固定到工具栏中即可使用！
