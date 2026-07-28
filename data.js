// ==================== 问题树 ====================
const questions = {
  q1: {
    text: '你现在什么状态？',
    options: [
      { id: 'busy',   text: '😮‍💨 有事干，想摸鱼放松',    next: 'q2a' },
      { id: 'free',   text: '🥱 无聊没事干，找点事做',    next: 'q2b' },
    ]
  },
  // ---- A 路线：忙里偷闲 ----
  q2a: {
    text: '你在哪？',
    options: [
      { id: 'office',   text: '🏢 工位 / 办公室',   next: 'q3a' },
      { id: 'home',     text: '🏠 在家里',          next: 'q3a' },
      { id: 'outside',  text: '🌳 在外面',          next: 'q3a' },
    ]
  },
  q3a: {
    text: '还能盯屏幕吗？',
    options: [
      { id: 'noscreen', text: '🙅 不想看了，让眼睛歇歇',  next: 'q4a' },
      { id: 'screen',   text: '✅ 可以，再刷会儿',        next: 'q4a' },
    ]
  },
  q4a: {
    text: '现在什么感觉？',
    options: [
      { id: 'tired',      text: '😴 有点困',     next: null },
      { id: 'irritated',  text: '😤 有点烦躁',   next: null },
      { id: 'calm',       text: '😌 还算平静',   next: null },
    ]
  },
  // ---- B 路线：闲得发慌 ----
  q2b: {
    text: '想在家还是出门？',
    options: [
      { id: 'home', text: '🏠 宅在家里',        next: 'q3b' },
      { id: 'out',  text: '🚶 出去走走',        next: 'q3b' },
    ]
  },
  q3b: {
    text: '想动脑还是放空？',
    options: [
      { id: 'brain', text: '🧠 动动脑子',    next: 'q4b' },
      { id: 'chill', text: '🌬️ 纯放空',     next: 'q4b' },
    ]
  },
  q4b: {
    text: '一个人还是约人？',
    options: [
      { id: 'alone',  text: '🐺 自己待着',    next: 'q5b' },
      { id: 'social', text: '👫 约人一起',    next: 'q5b' },
    ]
  },
  q5b: {
    text: '有多少时间？',
    options: [
      { id: 'short', text: '⏱ 短时（3小时内）',  next: null },
      { id: 'long',  text: '🌅 一下午都行',      next: null },
    ]
  },
}

// ==================== 路径 → 池映射 ====================
const pathToPool = {
  // A 路线（完整路径，含情绪）
  'busy:office:noscreen:tired':       'A01',
  'busy:office:noscreen:irritated':   'A01',
  'busy:office:noscreen:calm':        'A01',
  'busy:office:screen:tired':         'A02',
  'busy:office:screen:irritated':     'A03',
  'busy:office:screen:calm':          'A04',
  'busy:home:noscreen:tired':         'A05',
  'busy:home:noscreen:irritated':     'A05',
  'busy:home:noscreen:calm':          'A05',
  'busy:home:screen:tired':           'A06',
  'busy:home:screen:irritated':       'A06',
  'busy:home:screen:calm':            'A06',
  'busy:outside:noscreen:tired':      'A07',
  'busy:outside:noscreen:irritated':  'A07',
  'busy:outside:noscreen:calm':       'A07',
  'busy:outside:screen:tired':        'A08',
  'busy:outside:screen:irritated':    'A08',
  'busy:outside:screen:calm':         'A08',
  // B 路线（短时）
  'free:home:brain:alone:short':    'B01s',
  'free:home:brain:social:short':   'B02s',
  'free:home:chill:alone:short':    'B03s',
  'free:home:chill:social:short':   'B04s',
  'free:out:brain:alone:short':     'B05s',
  'free:out:chill:alone:short':     'B06s',
  'free:out:brain:social:short':    'B07s',
  'free:out:chill:social:short':    'B08s',
  // B 路线（一下午）
  'free:home:brain:alone:long':     'B01l',
  'free:home:brain:social:long':    'B02l',
  'free:home:chill:alone:long':     'B03l',
  'free:home:chill:social:long':    'B04l',
  'free:out:brain:alone:long':      'B05l',
  'free:out:chill:alone:long':      'B06l',
  'free:out:brain:social:long':     'B07l',
  'free:out:chill:social:long':     'B08l',
}

// ==================== 活动池 ====================
const pools = {
  // A 路线
  A01: [1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20],
  A02: [9, 10, 11, 12, 13],
  A03: [8, 10, 11, 13, 18, 19],
  A04: [7, 9, 10, 12, 14, 15, 16, 17],
  A05: [1, 2, 3, 4, 5, 6, 7, 8, 17, 19, 20],
  A06: [9, 10, 11, 12, 13, 15, 16, 17],
  A07: [2, 3, 4, 5, 8, 15, 18, 19],
  A08: [9, 10, 11, 16],
  // B 路线（短时 + 一下午，内容相同）
  B01s: [22, 25, 26, 28, 30, 33, 41, 43, 45],
  B01l: [22, 25, 26, 28, 30, 33, 41, 43, 45],
  B02s: [36],
  B02l: [36],
  B03s: [21, 22, 25, 26, 27, 30, 31, 35, 42, 43, 45],
  B03l: [21, 22, 25, 26, 27, 30, 31, 35, 42, 43, 45],
  B04s: [21, 29, 35, 37],
  B04l: [21, 29, 35, 37],
  B05s: [24, 33, 34, 38, 39, 40, 41],
  B05l: [24, 33, 34, 38, 39, 40, 41],
  B06s: [23, 24, 31, 32, 34, 39, 40],
  B06l: [23, 24, 31, 32, 34, 39, 40],
  B07s: [36, 38, 44],
  B07l: [36, 38, 44],
  B08s: [23, 29, 32, 37, 40, 44],
  B08l: [23, 29, 32, 37, 40, 44],
}

// ==================== 活动列表 ====================
const activities = [
  // ---- A 路线：忙里偷闲（#1~20） ----
  { id: 1,  emoji: '🤸',  name: '伸个懒腰',           desc: '站起来把手举高，拉伸一下僵硬的身体' },
  { id: 2,  emoji: '💧',  name: '喝杯水',             desc: '慢慢喝完一整杯温水。有时候困只是因为缺水了' },
  { id: 3,  emoji: '🧘',  name: '深呼吸十次',          desc: '闭上眼睛，慢慢吸一口气数到4，再缓缓呼出。10次就好' },
  { id: 4,  emoji: '👀',  name: '看看窗外',           desc: '走到窗边，看看远处的天空、树、行人。让眼睛和大脑放个假' },
  { id: 5,  emoji: '🚶',  name: '起来走两步',          desc: '离开座位随便走几步，去接杯水、上个厕所，动一动就好' },
  { id: 6,  emoji: '💦',  name: '洗把脸',             desc: '去洗手间用凉水洗把脸，瞬间清醒，顺便给自己一个微笑' },
  { id: 7,  emoji: '📋',  name: '收拾桌面',           desc: '花3分钟把桌面整理一下，整齐的环境让心情也跟着清爽' },
  { id: 8,  emoji: '😌',  name: '发会儿呆',           desc: '什么都不想，放空大脑，就安静地待一会儿' },
  { id: 9,  emoji: '📱',  name: '刷会儿手机',          desc: '随便刷刷感兴趣的内容，看看朋友动态，放松一下' },
  { id: 10, emoji: '🎵',  name: '听一首歌',           desc: '找一首喜欢的歌戴上耳机听完，让旋律带走疲惫' },
  { id: 11, emoji: '🐱',  name: '看萌宠视频',          desc: '看两分钟小猫小狗，没有什么烦恼是毛茸茸治不了的' },
  { id: 12, emoji: '🎮',  name: '玩一局小游戏',        desc: '玩一局俄罗斯方块或消消乐，简单又解压' },
  { id: 13, emoji: '🍪',  name: '吃点小零食',          desc: '吃块饼干或巧克力，补充能量顺便犒劳自己' },
  { id: 14, emoji: '✍️',  name: '写写待办清单',       desc: '把接下来要做的事列在便签上，写下来就不怕忘了' },
  { id: 15, emoji: '🌿',  name: '给植物浇浇水',        desc: '看看身边的绿植，摸摸叶子，给它们浇点水' },
  { id: 16, emoji: '☕',  name: '泡杯喝的',           desc: '泡杯茶或冲杯咖啡，享受香气飘出来的那一刻' },
  { id: 17, emoji: '🖍️',  name: '随手涂鸦两笔',       desc: '拿张纸随便画几笔，画得好不好不重要，画得开心就行' },
  { id: 18, emoji: '💺',  name: '换个地方坐',          desc: '换一张椅子或者换个位置，换个角度看东西' },
  { id: 19, emoji: '🎧',  name: '听段白噪音',          desc: '找段雨声或海浪声闭上眼睛听一会儿，让大脑放空' },
  { id: 20, emoji: '😴',  name: '闭目养神',           desc: '靠在椅背上闭上眼，什么都不想，就休息3分钟' },
  // ---- B 路线：闲得发慌（#21~45） ----
  { id: 21, emoji: '🎬',  name: '看一部电影',          desc: '找一部一直想看但没看过的电影，给自己一段完整的沉浸时光' },
  { id: 22, emoji: '📖',  name: '读几页书',           desc: '随便翻开一本书，也许书里的某句话刚好能回应你此刻的心情' },
  { id: 23, emoji: '🚲',  name: '骑车兜风',           desc: '扫一辆共享单车没有目的地地骑，感受风吹过脸颊' },
  { id: 24, emoji: '🌳',  name: '去公园坐坐',          desc: '找最近的公园，坐在长椅上看人来人往，什么都不用想' },
  { id: 25, emoji: '🍳',  name: '学做一道菜',          desc: '找一个简单的菜谱，给自己做一顿好吃的' },
  { id: 26, emoji: '🧹',  name: '整理房间',           desc: '放一首喜欢的歌当背景音，边听边把房间收拾干净' },
  { id: 27, emoji: '🎮',  name: '痛快打一把游戏',      desc: '打开游戏沉浸到另一个世界里，暂时忘掉现实' },
  { id: 28, emoji: '✍️',  name: '写点东西',           desc: '写写今天的感受、记个流水账、或者编个小故事' },
  { id: 29, emoji: '📞',  name: '给朋友打个电话',      desc: '找个好久没联系的朋友，随便聊聊最近过得怎么样' },
  { id: 30, emoji: '🧩',  name: '拼图或乐高',          desc: '做点手工类的事，让手和脑子都忙起来，做完特有成就感' },
  { id: 31, emoji: '🏃',  name: '出去跑一圈',          desc: '换上运动鞋出门跑一跑，出出汗比什么都解压' },
  { id: 32, emoji: '🛒',  name: '去逛超市',           desc: '去超市慢慢逛一圈，看看有什么新出的零食和饮料' },
  { id: 33, emoji: '🎨',  name: '学一个小技能',        desc: '折纸、魔术、手势舞…找一个好玩的小技能花时间学会它' },
  { id: 34, emoji: '☕',  name: '去咖啡店发呆',        desc: '带本书或耳机去咖啡店，换个环境节奏也会不一样' },
  { id: 35, emoji: '📺',  name: '追两集剧',           desc: '找一部评分高的剧点开看两集，说不定就停不下来了' },
  { id: 36, emoji: '♟️',  name: '下盘棋或玩桌游',      desc: '约朋友线上或线下来一盘，用脑子的感觉也很爽' },
  { id: 37, emoji: '🎤',  name: '唱几首歌',           desc: '打开K歌软件或者去KTV吼几嗓子，什么烦恼都没了' },
  { id: 38, emoji: '🏛️',  name: '去博物馆逛逛',        desc: '去附近的博物馆或美术馆转一圈，看看有意思的展品' },
  { id: 39, emoji: '🌅',  name: '找个地方看日落',      desc: '查一下今天的日落时间，提前去楼顶或河边找个好位置' },
  { id: 40, emoji: '📸',  name: '出门拍拍照',          desc: '带上手机去街上走走，拍下你觉得有趣的人和物' },
  { id: 41, emoji: '🗺️',  name: '规划一次旅行',       desc: '打开地图看看想去的地方，做做攻略，光想想就开心' },
  { id: 42, emoji: '🛁',  name: '泡个热水澡',          desc: '放一缸热水，泡进去什么烦恼都暂时与你无关了' },
  { id: 43, emoji: '✂️',  name: '做点手工',           desc: '折纸、串珠子、做手账…做一些能看得见成果的小事' },
  { id: 44, emoji: '🏸',  name: '打球或运动',          desc: '约朋友去打羽毛球、乒乓球，动起来总比躺着强' },
  { id: 45, emoji: '🎂',  name: '做个小甜点',          desc: '烤点饼干或整个小蛋糕，厨房里飘着香气的时候心情就好了' },
]
