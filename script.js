// ======================== 状态管理 ========================
const state = {
  answers: [],
  currentQuestionId: 'q1',
  currentPoolId: null,
  currentActivity: null,
  currentPoolActivities: [],
}

// ======================== DOM引用 ========================
const $ = id => document.getElementById(id)
const pages = {
  home: $('page-home'),
  question: $('page-question'),
  result: $('page-result'),
}

// ======================== 页面切换 ========================
function showPage(pageId, direction) {
  Object.values(pages).forEach(p => {
    p.classList.remove('active', 'slide-left', 'slide-right')
  })
  const target = pages[pageId]
  if (direction === 'left') target.classList.add('slide-left')
  else if (direction === 'right') target.classList.add('slide-right')
  // 触发回流后去掉过渡方向，再显示
  void target.offsetWidth
  target.classList.remove('slide-left', 'slide-right')
  target.classList.add('active')
}

// ======================== 问答导航 ========================
function startQuiz() {
  state.answers = []
  state.currentQuestionId = 'q1'
  state.currentPoolId = null
  state.currentActivity = null
  showPage('question', 'right')
  showQuestion('q1')
}

function showQuestion(qId) {
  const q = questions[qId]
  if (!q) return

  $('question-text').textContent = q.text

  // 计算进度
  const total = state.answers[0] === 'free' ? 5 : 4
  const current = state.answers.length + 1
  $('progress-fill').style.width = (current / total * 100) + '%'

  // 生成选项按钮
  const container = $('options-container')
  container.innerHTML = ''
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button')
    btn.className = `option-btn color-${i % 4}`
    btn.textContent = opt.text
    btn.addEventListener('click', () => selectOption(opt, qId))
    container.appendChild(btn)
  })

  // 卡片入场动画
  const card = $('question-card')
  card.style.animation = 'none'
  void card.offsetWidth
  card.style.animation = ''
}

function selectOption(option, qId) {
  state.answers.push(option.id)

  if (option.next) {
    // 如果下一题和当前在同一路线，切换时用前进方向
    state.currentQuestionId = option.next
    showQuestion(option.next)
  } else {
    // 最后一题 → 计算结果
    const poolId = getPoolId()
    state.currentPoolId = poolId
    showResultPage(poolId)
  }
}

// ======================== 池匹配 ========================
function getPoolId() {
  const key = state.answers.join(':')
  return pathToPool[key] || 'A01' // fallback
}

// ======================== 随机抽取 ========================
function pickFromPool(poolId) {
  const pool = pools[poolId]
  if (!pool || pool.length === 0) return activities[0]
  const id = pool[Math.floor(Math.random() * pool.length)]
  return activities.find(a => a.id === id)
}

// ======================== 结果页 ========================
function showResultPage(poolId) {
  state.currentPoolActivities = pools[poolId] || []
  state.currentActivity = pickFromPool(poolId)
  renderResult()
  showPage('result', 'left')
  fireConfetti()
}

function renderResult() {
  const a = state.currentActivity
  $('result-emoji').textContent = a.emoji
  $('result-name').textContent = a.name
  $('result-desc').textContent = a.desc

  // 重新触发结果卡片动画
  const card = $('result-card')
  card.style.animation = 'none'
  void card.offsetWidth
  card.style.animation = ''
}

function tryAgain() {
  state.currentActivity = pickFromPool(state.currentPoolId)
  renderResult()
  fireConfetti()
}

function restart() {
  // 清除纸屑
  $('confetti-container').innerHTML = ''
  startQuiz()
}

// ======================== 纸屑效果 ========================
function fireConfetti() {
  const container = $('confetti-container')
  const colors = ['#FF6B8A', '#FF9F43', '#A66CFF', '#00D2D3', '#FDCB6E', '#00B894', '#E17055', '#6C5CE7']

  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div')
    el.className = 'confetti'
    el.style.left = Math.random() * 100 + '%'
    el.style.background = colors[Math.floor(Math.random() * colors.length)]
    el.style.width = (Math.random() * 6 + 4) + 'px'
    el.style.height = (Math.random() * 6 + 4) + 'px'
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
    el.style.animationDuration = (Math.random() * 2 + 2) + 's'
    el.style.animationDelay = (Math.random() * 0.8) + 's'
    container.appendChild(el)
  }

  // 自动清理
  setTimeout(() => { container.innerHTML = '' }, 4000)
}

// ======================== QR二维码生成 ========================
// 基于 ISO/IEC 18004 的简化实现
const QR = {
  // GF(256) 运算表
  _gf256: (function() {
    const exp = new Array(256), log = new Array(256)
    for (let i = 0, v = 1; i < 256; i++) {
      exp[i] = v
      log[v] = i
      v = v * 2 ^ (v >= 128 ? 0x11d : 0)
    }
    return { exp, log }
  })(),

  // 生成纠错码多项式
  _genPoly(n) {
    let poly = [1]
    for (let i = 0; i < n; i++) {
      poly = this._mulPoly(poly, [1, this._gf256.exp[i]])
    }
    return poly
  },

  _mulPoly(a, b) {
    const res = new Array(a.length + b.length - 1).fill(0)
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (a[i] && b[j]) {
          res[i + j] ^= this._gf256.exp[(this._gf256.log[a[i]] + this._gf256.log[b[j]]) % 255]
        }
      }
    }
    return res
  },

  // 计算纠错码
  _encodeECC(data, eccCount) {
    const gen = this._genPoly(eccCount)
    const remainder = data.slice()
    for (let i = 0; i < data.length; i++) {
      if (remainder[i]) {
        const factor = this._gf256.log[remainder[i]]
        for (let j = 0; j < gen.length; j++) {
          remainder[i + j] ^= this._gf256.exp[(factor + this._gf256.log[gen[j]]) % 255]
        }
      }
    }
    return remainder.slice(data.length)
  },

  // 生成版本2, M 纠错等级的 QR 码矩阵 (25x25)
  // 最大可容纳 20 字节数据
  generate(text) {
    // 1. 数据编码 (byte mode)
    const data = [64 | (text.length & 0xff)] // mode: byte, length
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      data.push(c > 127 ? 0x3f : c) // 非ASCII替换为?
    }
    // 补齐到 16 字节 (version 2-M 的数据容量)
    while (data.length < 16) data.push(0xec) // 填充码
    while (data.length < 16) data.push(0x11)

    // 2. 纠错码 (M 级需要 16 个纠错码字)
    const ecc = this._encodeECC(data, 16)

    // 3. 合并
    const allData = data.concat(ecc)

    // 4. 构建矩阵 (25x25)
    const size = 25
    const matrix = Array.from({ length: size }, () => new Array(size).fill(0))

    // 功能图案
    // Finder pattern (定位图案) - 3个角
    const drawFinder = (row, col) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const x = col + c, y = row + r
          if (x < 0 || x >= size || y < 0 || y >= size) continue
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isOuter = r === 0 || r === 6 || c === 0 || c === 6
            const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
            matrix[y][x] = (isOuter || isInner) ? 1 : 0
          } else {
            matrix[y][x] = 0 // 分隔符
          }
        }
      }
    }
    drawFinder(0, 0)
    drawFinder(0, size - 7)
    drawFinder(size - 7, 0)

    // Timing patterns (时钟图案)
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0
      matrix[i][6] = i % 2 === 0 ? 1 : 0
    }

    // Dark module (暗模块)
    matrix[size - 8][8] = 1

    // Format info area (预留)
    const formatBits = [0,1,1,1,1,0,1,1,0,0,0,1,0,0,1] // M mask 0
    const fi = formatBits
    for (let i = 0; i <= 5; i++) { matrix[8][i] = fi[i]; matrix[i][8] = fi[fi.length-1-i] }
    for (let i = 7; i <= 8; i++) { matrix[8][i] = fi[i-1]; matrix[i][8] = fi[fi.length-1-(i-1)] }
    for (let i = 9; i <= 14; i++) { matrix[8][i] = fi[i-2] }
    matrix[8][size-8] = fi[7]; matrix[size-8][8] = fi[7]
    for (let i = size-7; i < size; i++) { matrix[8][i] = fi[i-(size-9)] }
    matrix[7][8] = fi[size-9+1]; matrix[8][7] = fi[size-9+1]
    for (let i = size-7; i < size; i++) { matrix[i][8] = fi[i-(size-9)] }

    // 5. 放置数据
    let dataIdx = 0
    let bitIdx = 7
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col = 5 // Skip timing
      for (let row = 0; row < size; row++) {
        for (const c of [col, col - 1]) {
          if (c < 0 || c >= size) continue
          const r = (col % 4 === 0) ? (size - 1 - row) : row
          if (matrix[r][c] !== 0) continue // skip functional patterns
          if (dataIdx < allData.length) {
            matrix[r][c] = (allData[dataIdx] >> bitIdx) & 1
            bitIdx--
            if (bitIdx < 0) { bitIdx = 7; dataIdx++ }
          }
        }
      }
    }

    return matrix
  }
}

// ======================== 分享截图 ========================
async function shareResult() {
  const a = state.currentActivity
  const siteUrl = window.location.href.includes('file://')
    ? 'https://ni-de-yong-hu.github.io/jin-tian-xiang-zuo-shi-me'
    : window.location.origin + window.location.pathname.replace(/\/$/, '')

  const canvas = $('share-canvas')
  const width = 400, height = 560
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // 1. 背景渐变
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#FFE5E5')
  grad.addColorStop(0.5, '#FFF3CD')
  grad.addColorStop(1, '#D4F5E9')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 2. 白色卡片背景
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  roundRect(ctx, 30, 70, width - 60, 300, 20)
  ctx.fill()

  // 3. 标题
  ctx.fillStyle = '#2D3436'
  ctx.font = 'bold 28px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('✨ 今天我想做什么 ✨', width / 2, 50)

  // 4. Emoji
  ctx.font = '56px sans-serif'
  ctx.fillText(a.emoji, width / 2, 150)

  // 5. 活动名称
  ctx.fillStyle = '#2D3436'
  ctx.font = 'bold 24px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(a.name, width / 2, 210)

  // 6. 描述（自动换行）
  ctx.fillStyle = '#636E72'
  ctx.font = '15px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  const maxWidth = width - 100
  const words = a.desc
  const lines = []
  let line = ''
  for (const ch of words) {
    const testLine = line + ch
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)
  const lineHeight = 24
  const startY = 260
  lines.forEach((l, i) => {
    ctx.fillText(l, width / 2, startY + i * lineHeight)
  })

  // 7. QR 码
  const qrSize = 120
  const qrX = (width - qrSize) / 2
  const qrY = startY + lines.length * lineHeight + 20
  drawQRToCanvas(ctx, siteUrl, qrX, qrY, qrSize)

  // 8. 二维码提示文字
  ctx.fillStyle = '#636E72'
  ctx.font = '12px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('总要找点事做吧（吧唧吧唧）', width / 2, qrY + qrSize + 22)

  // 9. 下载 / 分享
  canvas.toBlob(async (blob) => {
    // 尝试 Web Share API（移动端）
    if (navigator.share && navigator.canShare({ files: [new File([blob], 'today.png', { type: 'image/png' })] })) {
      try {
        await navigator.share({
          title: '今天我想做什么',
          files: [new File([blob], 'today.png', { type: 'image/png' })],
        })
        return
      } catch (e) { /* user cancelled or fallback */ }
    }
    // 降级：下载图片
    const url = URL.createObjectURL(blob)
    const aEl = document.createElement('a')
    aEl.href = url
    aEl.download = '今天我想做什么.png'
    aEl.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// Canvas 圆角矩形辅助
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Canvas 绘制 QR 码
function drawQRToCanvas(ctx, text, x, y, size) {
  const matrix = QR.generate(text)
  const cellSize = size / matrix.length
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#2D3436'
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(x + c * cellSize, y + r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize))
      }
    }
  }
}

// ======================== 事件绑定 ========================
$('btn-start').addEventListener('click', startQuiz)
$('btn-retry').addEventListener('click', tryAgain)
$('btn-restart').addEventListener('click', restart)
$('btn-share').addEventListener('click', shareResult)

// ======================== 键盘快捷键 ========================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (pages.home.classList.contains('active')) startQuiz()
  }
})
