# Fitted Mobile

这是 React Native + Expo + TypeScript 的可运行原型。流程包括身材资料、商品浏览、尺码比较、试穿示意和购买后评价。

## 运行

需要 Node.js 和 npm。在项目根目录打开 PowerShell：

```powershell
cd mobile
npm install
npx expo start
```

手机安装 Expo Go，扫描终端二维码。电脑与手机需连接同一网络。浏览器预览可运行 `npm run web`。

如果浏览器出现 `localhost:8000` 的 **Directory listing**，那是旧 HTML 文件服务器，不是这个 App。请从 `mobile/` 运行 `npx expo start --web`，打开终端显示的 Expo 地址（通常为 `http://localhost:8081`）。

在 Windows 的 Chrome 中预览 iPhone 17 Pro Max 尺寸：打开 Expo 网页，按 `F12`、再按 `Ctrl+Shift+M`，将设备栏设为自定义 `440 × 956`、DPR `3`。这只模拟网页视口；真正的 iOS Simulator 需要 macOS。Windows 上可用真实 iPhone 的 Expo Go 测试 iOS 体验。

## 文件夹

| 路径 | 内容 |
| --- | --- |
| `mobile/src/app/` | 五个页面和导航 |
| `mobile/src/features/catalog/` | 商品和尺码表演示数据 |
| `mobile/src/features/fit/` | 身材资料类型、尺码评分和推荐规则 |
| `mobile/src/features/state/` | 应用状态和本机保存 |
| `mobile/src/features/reviews/` | 穿着评价类型 |
| `mobile/src/features/ui/` | 共用界面组件 |
| `mobile/assets/` | Expo 图标和字体资源 |
| `references/html/` | 原始 HTML 原型与依赖脚本 |
| `references/screenshots/`、`references/uploads/` | 原始截图与上传素材 |
| `docs/` | 设计、实施计划与后续接入说明 |

## 核心演示

默认身材胸围 92 cm，羊毛衫推荐 M。切换到 XL 后，当前尺码显示 26 cm 胸围余量、明显宽大的文字说明，试穿页的衣服轮廓也会变宽。推荐 M 和选择 XL 同时存在，系统不会替用户改回推荐尺码。

试穿页只是轮廓叠加示意，不是 AI 生成的真人试穿图。尺码分数基于本地演示规则；评价保存在本机，还没有后端或模型训练。系统照片选择器返回缓存路径，若重启后照片不显示，请重新选择照片。
