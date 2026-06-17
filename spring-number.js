/**
 * SpringNumber — spring-physics digit roller.
 *
 *   const num = new SpringNumber('#el', {
 *     value: 1234, k: 120, b: 16,
 *     digitHeight: 72, digitWidth: 36, fontSize: 56, color: '#fff',
 *   })
 *   num.setValue(5678)   // animate to value
 *   num.getValue()       // current value
 *   num.destroy()
 *
 * Each digit rolls on its own spring; motion blur scales with velocity and the
 * digit fades on change. New digits (when the length grows) drop in + fade in,
 * so transitions to/through 0 always animate.
 */
class SpringNumber {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container

    this.options = {
      value: 0,
      k: 120,
      b: 16,
      digitHeight: 72,
      digitWidth: 36,
      fontSize: 56,
      fontWeight: 300,
      color: '#fff',
      ...options,
    }

    this.digits = []
    this.animatedUntil = null
    this.rafId = null
    this.msPerStep = 4
    this.currentValue = this.options.value

    this._init()
  }

  _init() {
    this.container.style.display = 'flex'
    this._injectStyles()
    this._updateDisplay(this.options.value, false)
  }

  _injectStyles() {
    if (document.getElementById('spring-number-styles')) return
    const style = document.createElement('style')
    style.id = 'spring-number-styles'
    style.textContent = `
      .spring-digit {
        overflow: hidden;
        position: relative;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
      }
      .spring-digit-wrapper {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        will-change: transform, filter, opacity;
      }
      .spring-digit-wrapper span {
        display: flex;
        align-items: center;
        justify-content: center;
        font-variant-numeric: tabular-nums;
      }
    `
    document.head.appendChild(style)
  }

  _spring(pos, k = this.options.k, b = this.options.b) {
    return { pos, dest: pos, v: 0, k, b }
  }

  _springStep(s) {
    const t = this.msPerStep / 1000
    const a = -s.k * (s.pos - s.dest) - s.b * s.v
    s.v += a * t
    s.pos += s.v * t
  }

  _springIsDone(s) {
    return Math.abs(s.v) < 0.3 && Math.abs(s.dest - s.pos) < 0.3
  }

  _createDigits(count) {
    this.container.innerHTML = ''
    this.digits = []
    const { digitHeight, digitWidth, fontSize, fontWeight, color } = this.options

    for (let i = 0; i < count; i++) {
      const digitEl = document.createElement('div')
      digitEl.className = 'spring-digit'
      digitEl.style.width = `${digitWidth}px`
      digitEl.style.height = `${digitHeight}px`

      const wrapper = document.createElement('div')
      wrapper.className = 'spring-digit-wrapper'

      for (let n = 0; n <= 9; n++) {
        const span = document.createElement('span')
        span.textContent = n
        span.style.height = `${digitHeight}px`
        span.style.fontSize = `${fontSize}px`
        span.style.fontWeight = fontWeight
        span.style.color = color
        wrapper.appendChild(span)
      }

      digitEl.appendChild(wrapper)
      this.container.appendChild(digitEl)

      this.digits.push({
        wrapper,
        y: this._spring(0),
        opacity: this._spring(1, 200, 25),
      })
    }
  }

  _paint(d) {
    const blur = Math.min(Math.abs(d.y.v) / 600, 5)
    d.wrapper.style.transform = `translateY(${d.y.pos}px)`
    d.wrapper.style.filter = blur > 0.1 ? `blur(${blur}px)` : 'none'
    d.wrapper.style.opacity = Math.max(0, Math.min(1, d.opacity.pos))
  }

  _render = (now) => {
    if (this.animatedUntil === null) this.animatedUntil = now
    const steps = Math.floor((now - this.animatedUntil) / this.msPerStep)
    this.animatedUntil += steps * this.msPerStep

    let stillAnimating = false
    for (const d of this.digits) {
      for (let i = 0; i < steps; i++) {
        this._springStep(d.y)
        this._springStep(d.opacity)
      }
      if (this._springIsDone(d.y)) { d.y.pos = d.y.dest; d.y.v = 0 } else stillAnimating = true
      if (this._springIsDone(d.opacity)) { d.opacity.pos = d.opacity.dest; d.opacity.v = 0 } else stillAnimating = true
      this._paint(d)
    }

    if (stillAnimating) this.rafId = requestAnimationFrame(this._render)
    else { this.rafId = null; this.animatedUntil = null }
  }

  _scheduleRender() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this._render)
  }

  _setDigit(index, targetDigit, instant) {
    const d = this.digits[index]
    if (!d) return
    const targetY = -targetDigit * this.options.digitHeight

    // instant: roll straight to target, no fade/blink — for scrubbing & tweened counts
    if (instant) {
      d.y.dest = targetY; d.opacity.dest = 1
      this._scheduleRender()
      return
    }

    // same digit → a little dip + fade so cascaded carries still register motion
    if (Math.abs(d.y.dest - targetY) < 0.1) {
      d.y.dest = targetY - this.options.digitHeight * 0.35
      d.opacity.dest = 0.7
      this._scheduleRender()
      setTimeout(() => { d.y.dest = targetY; d.opacity.dest = 1; this._scheduleRender() }, 70)
      return
    }

    d.opacity.dest = 0.3
    setTimeout(() => { d.y.dest = targetY; d.opacity.dest = 1; this._scheduleRender() }, 80)
    this._scheduleRender()
  }

  _updateDisplay(num, animate = true, instant = false) {
    const str = String(num)

    if (str.length !== this.digits.length) {
      this._createDigits(str.length)
      for (let i = 0; i < str.length; i++) {
        const targetY = -parseInt(str[i]) * this.options.digitHeight
        if (animate) {
          this.digits[i].y.pos = targetY + this.options.digitHeight   // drop in
          this.digits[i].y.dest = targetY
          this.digits[i].opacity.pos = 0
          this.digits[i].opacity.dest = 1
        } else {
          this.digits[i].y.pos = targetY
          this.digits[i].y.dest = targetY
        }
      }
      for (const d of this.digits) this._paint(d)   // sync DOM so new digits don't flash a default 0
      if (animate) this._scheduleRender()
    } else if (!animate) {
      for (const d of this.digits) this._paint(d)
    }

    if (animate) {
      for (let i = 0; i < str.length; i++) this._setDigit(i, parseInt(str[i]), instant)
    }
  }

  // --- public API ---
  setValue(value, instant = false) { this.currentValue = value; this._updateDisplay(value, true, instant) }
  getValue() { return this.currentValue }
  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.container.innerHTML = ''
    this.digits = []
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = SpringNumber
