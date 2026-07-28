# 技术方案

## 1. 架构概览

```
your_spacial_web/
├── index.html       # 主页面（HTML 结构，引用外部 CSS/JS）
├── style.css        # 全部样式（糖果色主题 + 动画）
├── script.js        # 全部逻辑（状态管理、导航、随机、分享）
└── data.js          # 数据层（问题树、池映射、45个活动）
```

纯静态站点，零后端，零构建步骤。

## 2. 技术选型

| 层面 | 选型 | 理由 |
|------|------|------|
| 语言 | HTML5 + CSS3 + ES6 | 原生，零依赖 |
| 截图分享 | Canvas API（原生） | 绘制结果卡片 + 二维码为一张图片 |
| 二维码 | JS 本地生成（QRCode.js 算法） | 不依赖外部服务，国内可用，离线可用 |
| 动画 | CSS transition / animation | 卡片切换平滑过渡 |
| 部署 | GitHub Pages + 腾讯云 Nginx（备用） | 免费 + 国内快速访问 |

## 3. 数据流

```
用户选择答案
    ↓
script.js 记录答案路径（如 ['busy', 'office', 'noscreen', 'tired']）
    ↓
根据路径 → data.js 中的池映射 → 得到活动池（如 A01）
    ↓
从池中随机取一个活动 → 展示到页面
    ↓
「换一个」→ 从同一池重新随机
```

## 4. 核心逻辑模块（script.js）

### 4.1 页面状态机

```
HOME ──→ QUESTION ──→ RESULT
              ↑            │
              └── 重新开始 ──┘
```

3 个状态，用 JS 控制显示/隐藏对应的 DOM 容器。

### 4.2 问答导航
- 点击选项 → 记录答案 ID → 查找下一题
- 最后一题答完 → 根据答案路径算出池 ID → 进入结果页
- 进度条 = (当前题号 / 总题数)
- 切换时有滑入/滑出动画

### 4.3 随机抽取
```javascript
function pickFromPool(poolId) {
  const pool = pools[poolId];    // 池 → 活动ID列表
  const id = pool[Math.floor(Math.random() * pool.length)];
  return activities.find(a => a.id === id);
}
```

### 4.4 分享截图
```
用 Canvas API 绘制分享图，结构如下：

┌──────────────────────────────────┐
│                                  │
│        ✨ 今天我想做什么 ✨        │  ← 网站标题
│                                  │
│          🎬 看一部电影            │  ← emoji + 活动名
│                                  │
│   找一部一直想看但没看过的电影，   │  ← 暖心描述
│   给自己一段完整的沉浸时光        │
│                                  │
│        ┌──────────┐             │
│        │  二维码   │             │  ← JS 本地绘制的二维码
│        └──────────┘             │
│      扫码来试试你的运气 👆       │
│                                  │
└──────────────────────────────────┘

流程: canvas.drawText() + canvas.drawImage(QR) → toBlob() → 触发下载/分享
```

### 4.5 二维码生成
- 用纯 JS 实现 QR 码编码和绘制（约 200 行代码）
- 不依赖外部 API 或 CDN
- 输入当前页面 URL → 生成二维码 → 绘制到 Canvas 分享图

## 5. 数据模型（data.js）

```javascript
// 问题树
const questions = {
  q1: {
    text: '你现在什么状态？',
    options: [
      { id: 'busy', text: '😮‍💨 有事干，想摸鱼放松', next: 'q2a' },
      { id: 'free', text: '🥱 无聊没事干', next: 'q2b' },
    ]
  },
  q2a: { text: '你在哪？', options: [...] },
  // ...
}

// 池映射：答案路径 → 池ID
const pathToPool = {
  'busy:office:noscreen': 'A01',
  'busy:office:screen:tired': 'A02',
  'free:home:brain:alone:short': 'B01s',
  'free:home:brain:alone:long': 'B01l',
  // ...
}

// 活动池：池ID → 活动ID列表
const pools = {
  A01: [1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20],
  B01s: [22, 25, 26, 28, 30, 33, 41, 43, 45],
  B01l: [22, 25, 26, 28, 30, 33, 41, 43, 45],  // 内容相同，后续可独立调整
  // ...
}

// 活动列表
const activities = [
  { id: 1, emoji: '🤸', name: '伸个懒腰', desc: '站起来把手举高，拉伸一下僵硬的身体' },
  // ...
]
```

## 6. UI 设计

### 6.1 配色方案（糖果色）
```
主背景渐变: #FFE5E5 → #FFF3CD → #D4F5E9（粉→黄→薄荷）
卡片: rgba(255,255,255,0.88) 毛玻璃 + 圆角 20px
主按钮: 粉红 #FF6B8A
选项按钮: 粉 #FF6B8A / 橙 #FF9F43 / 紫 #A66CFF / 青 #00D2D3
文字主色: #2D3436
文字次要: #636E72
```

### 6.2 排版
- 系统字体（PingFang / Microsoft YaHei）
- 标题 1.6rem 加粗，正文 1rem
- 行高 1.6，段落间距舒适

### 6.3 关键动画
- 页面切换：transform + opacity，transition 0.4s
- 选项点击：scale 0.95 → 1 的微反馈
- 结果弹出：scale 0 → 1.1 → 1 弹性效果
- 纸屑：纯 CSS 实现简化彩色圆点飘落

## 7. 移动端适配
- `<meta name="viewport">` 已配置
- 使用 rem + 百分比弹性布局
- 按钮最小 44px 触摸区域
- 结果卡片 max-width: 420px，居中显示
- 在手机上全屏显示，上下留白

## 8. 部署

### 8.1 开发期
- 双击 index.html 即可在浏览器预览
- 所有资源本地加载，无需网络

### 8.2 生产部署（GitHub Pages）
1. 在 GitHub 创建仓库
2. 上传 4 个文件到 main 分支
3. 仓库 Settings → Pages → 选 main 分支 → 保存
4. 获取链接后配置到代码的 `SITE_URL` 变量

### 8.3 备用方案（腾讯云 Nginx）
1. 服务器安装 Nginx
2. 将文件上传到 `/var/www/html/`
3. 配域名即可访问
