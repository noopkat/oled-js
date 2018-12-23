class Oled {
  constructor (board, five, opts) {
    this.HEIGHT = opts.height || 32
    this.WIDTH = opts.width || 128
    this.ADDRESS = opts.address || 0x3C
    this.PROTOCOL = (opts.address) ? 'I2C' : 'SPI'
    this.MICROVIEW = opts.microview || false
    this.SLAVEPIN = opts.slavePin || 12
    this.RESETPIN = opts.resetPin || 4
    this.DATA = opts.data || 0x40
    this.COMMAND = opts.command || 0x00

    // create command buffers
    this.DISPLAY_OFF = 0xAE
    this.DISPLAY_ON = 0xAF
    this.SET_DISPLAY_CLOCK_DIV = 0xD5
    this.SET_MULTIPLEX = 0xA8
    this.SET_DISPLAY_OFFSET = 0xD3
    this.SET_START_LINE = 0x00
    this.CHARGE_PUMP = 0x8D
    this.EXTERNAL_VCC = false
    this.MEMORY_MODE = 0x20
    this.SEG_REMAP = 0xA1 // using 0xA0 will flip screen
    this.COM_SCAN_DEC = 0xC8
    this.COM_SCAN_INC = 0xC0
    this.SET_COM_PINS = 0xDA
    this.SET_CONTRAST = 0x81
    this.SET_PRECHARGE = 0xd9
    this.SET_VCOM_DETECT = 0xDB
    this.DISPLAY_ALL_ON_RESUME = 0xA4
    this.NORMAL_DISPLAY = 0xA6
    this.COLUMN_ADDR = 0x21
    this.PAGE_ADDR = 0x22
    this.INVERT_DISPLAY = 0xA7
    this.ACTIVATE_SCROLL = 0x2F
    this.DEACTIVATE_SCROLL = 0x2E
    this.SET_VERTICAL_SCROLL_AREA = 0xA3
    this.RIGHT_HORIZONTAL_SCROLL = 0x26
    this.LEFT_HORIZONTAL_SCROLL = 0x27
    this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL = 0x29
    this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL = 0x2A

    this.cursor_x = 0
    this.cursor_y = 0

    // new blank buffer
    this.buffer = Buffer.alloc((this.WIDTH * this.HEIGHT) / 8)
    this.buffer.fill(0x00)

    this.dirtyBytes = []

    // this is necessary as we're not natively sitting within johnny-five lib
    this.board = board
    this.five = five

    const config = {
      '128x32': {
        'multiplex': 0x1F,
        'compins': 0x02,
        'coloffset': 0
      },
      '128x64': {
        'multiplex': 0x3F,
        'compins': 0x12,
        'coloffset': 0
      },
      '96x16': {
        'multiplex': 0x0F,
        'compins': 0x2,
        'coloffset': 0
      },
      // this is blended microview / normal 64 x 48, currently wip
      '64x48': {
        'multiplex': 0x2F,
        'compins': 0x12,
        'coloffset': (this.MICROVIEW) ? 32 : 0
      }
    }

    // microview is wip
    if (this.MICROVIEW) {
      // microview spi pins
      this.SPIconfig = {
        'dcPin': 8,
        'ssPin': 10,
        'rstPin': 7,
        'clkPin': 13,
        'mosiPin': 11
      }
    } else if (this.PROTOCOL === 'SPI') {
      // generic spi pins
      this.SPIconfig = {
        'dcPin': 11,
        'ssPin': this.SLAVEPIN,
        'rstPin': 13,
        'clkPin': 10,
        'mosiPin': 9
      }
    }

    const screenSize = `${this.WIDTH}x${this.HEIGHT}`
    this.screenConfig = config[screenSize]

    if (this.PROTOCOL === 'I2C') {
      this._setUpI2C(opts)
    } else {
      this._setUpSPI()
    }

    this._initialise()
  }

  _initialise () {
    // sequence of bytes to initialise with
    const initSeq = [
      this.DISPLAY_OFF,
      this.SET_DISPLAY_CLOCK_DIV, 0x80,
      this.SET_MULTIPLEX, this.screenConfig.multiplex, // set the last value dynamically based on screen size requirement
      this.SET_DISPLAY_OFFSET, 0x00, // sets offset pro to 0
      this.SET_START_LINE,
      this.CHARGE_PUMP, 0x14, // charge pump val
      this.MEMORY_MODE, 0x00, // 0x0 act like ks0108
      this.SEG_REMAP, // screen orientation
      this.COM_SCAN_DEC, // screen orientation change to INC to flip
      this.SET_COM_PINS, this.screenConfig.compins, // com pins val sets dynamically to match each screen size requirement
      this.SET_CONTRAST, 0x8F, // contrast val
      this.SET_PRECHARGE, 0xF1, // precharge val
      this.SET_VCOM_DETECT, 0x40, // vcom detect
      this.DISPLAY_ALL_ON_RESUME,
      this.NORMAL_DISPLAY,
      this.DISPLAY_ON
    ]

    // write init seq commands
    for (let i = 0; i < initSeq.length; i++) {
      this._transfer('cmd', initSeq[i])
    }
  }

  _setUpSPI () {
    // set up spi pins
    this.dcPin = new this.five.Pin(this.SPIconfig.dcPin)
    this.ssPin = new this.five.Pin(this.SPIconfig.ssPin)
    this.clkPin = new this.five.Pin(this.SPIconfig.clkPin)
    this.mosiPin = new this.five.Pin(this.SPIconfig.mosiPin)
    // reset won't be used as it causes a bunch of default initialisations
    this.rstPin = new this.five.Pin(this.SPIconfig.rstPin)

    // get the screen out of default mode
    this.rstPin.low()
    this.rstPin.high()
    // Set SS to high so a connected chip will be "deselected" by default
    this.ssPin.high()
  }

  _setUpI2C (opts) {
    // enable i2C in firmata
    this.board.io.i2cConfig(opts)
    // set up reset pin and hold high
    this.rstPin = new this.five.Pin(this.RESETPIN)
    this.rstPin.low()
    this.rstPin.high()
  }

  // writes both commands and data buffers to this device
  _transfer (type, val) {
    let control

    if (type === 'data') {
      control = this.DATA
    } else if (type === 'cmd') {
      control = this.COMMAND
    } else {
      return
    }

    if (this.PROTOCOL === 'I2C') {
      // send control and actual val
      this.board.io.i2cWrite(this.ADDRESS, [control, val])
    } else {
      // send val via SPI, no control byte
      this._writeSPI(val, type)
    }
  }

  _writeSPI (byte, mode) {
    // set dc to low if command byte, high if data byte
    if (mode === 'cmd') {
      this.dcPin.low()
    } else {
      this.dcPin.high()
    }

    // select the device as slave
    this.ssPin.low()

    for (let bit = 7; bit >= 0; bit--) {
      // pull clock low
      this.clkPin.low()

      // shift out a bit for mosi
      if (byte & (1 << bit)) {
        this.mosiPin.high()
      } else {
        this.mosiPin.low()
      }

      // pull clock high to collect bit
      this.clkPin.high()
    }

    // turn off slave select so other devices can use SPI
    // don't be an SPI hogging jerk basically
    this.ssPin.high()
  }

  // read a byte from the oled
  _readI2C (fn) {
    this.board.io.i2cReadOnce(this.ADDRESS, 1, data => {
      fn(data)
    })
  }

  // sometimes the oled gets a bit busy with lots of bytes.
  // Read the response byte to see if this is the case
  _waitUntilReady (callback) {
    const oled = this

    const tick = (callback) => {
      oled._readI2C((byte) => {
        // read the busy byte in the response
        const busy = byte >> 7 & 1
        if (!busy) {
          // if not busy, it's ready for callback
          callback()
        } else {
          console.log('I\'m busy!')
          setTimeout(tick, 0)
        }
      })
    }

    if (this.PROTOCOL === 'I2C') {
      setTimeout(() => { tick(callback) }, 0)
    } else {
      callback()
    }
  }

  // set starting position of a text string on the oled
  setCursor (x, y) {
    this.cursor_x = x
    this.cursor_y = y
  }

  // write text to the oled
  writeString (font, size, string, color, wrap, linespacing, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync
    const wordArr = string.split(' ')

    const len = wordArr.length

    // start x offset at cursor pos
    let offset = this.cursor_x
    let padding = 0

    const letspace = 1
    const leading = linespacing || 2

    // loop through words
    for (let i = 0; i < len; i += 1) {
      // put the word space back in
      wordArr[i] += ' '

      const stringArr = wordArr[i].split('')
      const slen = stringArr.length
      const compare = (font.width * size * slen) + (size * (len - 1))

      // wrap words if necessary
      if (wrap && len > 1 && (offset >= (this.WIDTH - compare))) {
        offset = 1
        this.cursor_y += (font.height * size) + size + leading
        this.setCursor(offset, this.cursor_y)
      }

      // loop through the array of each char to draw
      for (let i = 0; i < slen; i += 1) {
        // look up the position of the char, pull out the buffer slice
        const charBuf = this._findCharBuf(font, stringArr[i])
        // read the bits in the bytes that make up the char
        const charBytes = this._readCharBytes(charBuf)
        // draw the entire character
        this._drawChar(font, charBytes, size, false)

        // calc new x position for the next char, add a touch of padding too if it's a non space char
        padding = (stringArr[i] === ' ') ? 0 : size + letspace
        offset += (font.width * size) + padding

        // wrap letters if necessary
        if (wrap && (offset >= (this.WIDTH - font.width - letspace))) {
          offset = 1
          this.cursor_y += (font.height * size) + size + leading
        }
        // set the 'cursor' for the next char to be drawn, then loop again for next char
        this.setCursor(offset, this.cursor_y)
      }
    }
    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  // draw an individual character to the screen
  _drawChar (font, byteArray, size, sync) {
    // take your positions...
    const x = this.cursor_x
    const y = this.cursor_y

    let c = 0
    let pagePos = 0
    // loop through the byte array containing the hexes for the char
    for (let i = 0; i < byteArray.length; i += 1) {
      pagePos = Math.floor(i / font.width) * 8
      for (let j = 0; j < 8; j += 1) {
        // pull color out
        const color = byteArray[i][j]
        let xpos
        let ypos
        // standard font size
        if (size === 1) {
          xpos = x + c
          ypos = y + j + pagePos
          this.drawPixel([xpos, ypos, color], false)
        } else {
          // MATH! Calculating pixel size multiplier to primitively scale the font
          xpos = x + (i * size)
          ypos = y + (j * size)
          this.fillRect(xpos, ypos, size, size, color, false)
        }
      }
      c = (c < font.width - 1) ? c += 1 : 0
    }
  }

  // get character bytes from the supplied font object in order to send to framebuffer
  _readCharBytes (byteArray) {
    let bitArr = []
    const bitCharArr = []
    // loop through each byte supplied for a char
    for (let i = 0; i < byteArray.length; i += 1) {
      // set current byte
      const byte = byteArray[i]
      // read each byte
      for (let j = 0; j < 8; j += 1) {
        // shift bits right until all are read
        const bit = byte >> j & 1
        bitArr.push(bit)
      }
      // push to array containing flattened bit sequence
      bitCharArr.push(bitArr)
      // clear bits for next byte
      bitArr = []
    }

    return bitCharArr
  }

  // find where the character exists within the font object
  _findCharBuf (font, c) {
    const charLength = Math.ceil((font.width * font.height) / 8)
    // use the lookup array as a ref to find where the current char bytes start
    const cBufPos = font.lookup.indexOf(c) * charLength
    // slice just the current char's bytes out of the fontData array and return
    return font.fontData.slice(cBufPos, cBufPos + charLength)
  }

  // send the entire framebuffer to the oled
  update () {
    // wait for oled to be ready
    this._waitUntilReady(() => {
      // set the start and endbyte locations for oled display update
      const displaySeq = [
        this.COLUMN_ADDR,
        this.screenConfig.coloffset,
        this.screenConfig.coloffset + this.WIDTH - 1, // column start and end address
        this.PAGE_ADDR, 0, (this.HEIGHT / 8) - 1 // page start and end address
      ]

      const displaySeqLen = displaySeq.length
      const bufferLen = this.buffer.length

      // send intro seq
      for (let i = 0; i < displaySeqLen; i += 1) {
        this._transfer('cmd', displaySeq[i])
      }

      // write buffer data
      for (let i = 0; i < bufferLen; i += 1) {
        this._transfer('data', this.buffer[i])
      }
    })

    // now that all bytes are synced, reset dirty state
    this.dirtyBytes = []
  }

  // send dim display command to oled
  dimDisplay (bool) {
    let contrast

    if (bool) {
      contrast = 0 // Dimmed display
    } else {
      contrast = 0xCF // Bright display
    }

    this._transfer('cmd', this.SET_CONTRAST)
    this._transfer('cmd', contrast)
  }

  // turn oled off
  turnOffDisplay () {
    this._transfer('cmd', this.DISPLAY_OFF)
  }

  // turn oled on
  turnOnDisplay () {
    this._transfer('cmd', this.DISPLAY_ON)
  }

  // clear all pixels currently on the display
  clearDisplay (sync) {
    const immed = (typeof sync === 'undefined') ? true : sync
    // write off pixels
    for (let i = 0; i < this.buffer.length; i += 1) {
      if (this.buffer[i] !== 0x00) {
        this.buffer[i] = 0x00
        if (this.dirtyBytes.indexOf(i) === -1) {
          this.dirtyBytes.push(i)
        }
      }
    }

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  // invert pixels on oled
  invertDisplay (bool) {
    if (bool) {
      this._transfer('cmd', this.INVERT_DISPLAY) // inverted
    } else {
      this._transfer('cmd', this.NORMAL_DISPLAY) // non inverted
    }
  }

  // draw an image pixel array on the screen
  drawBitmap (pixels, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync

    for (let i = 0; i < pixels.length; i++) {
      const x = Math.floor(i % this.WIDTH)
      const y = Math.floor(i / this.WIDTH)

      this.drawPixel([x, y, pixels[i]], false)
    }

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  // draw one or many pixels on oled
  drawPixel (pixels, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync

    // handle lazy single pixel case
    if (typeof pixels[0] !== 'object') pixels = [pixels]

    pixels.forEach(el => {
      // return if the pixel is out of range
      const [ x, y, color ] = el

      if (x > this.WIDTH || y > this.HEIGHT) return

      // thanks, Martin Richards.
      // I wanna can this, this tool is for devs who get 0 indexes
      // x -= 1; y -=1;
      let byte = 0

      const page = Math.floor(y / 8)
      const pageShift = 0x01 << (y - 8 * page);

      // is the pixel on the first row of the page?
      (page === 0) ? byte = x : byte = x + (this.WIDTH * page)

      // colors! Well, monochrome.
      if (color === 'BLACK' || color === 0) {
        this.buffer[byte] &= ~pageShift
      }

      if (color === 'WHITE' || color > 0) {
        this.buffer[byte] |= pageShift
      }

      // push byte to dirty if not already there
      if (this.dirtyBytes.indexOf(byte) === -1) {
        this.dirtyBytes.push(byte)
      }
    }, this)

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  // looks at dirty bytes, and sends the updated bytes to the display
  _updateDirtyBytes (byteArray) {
    const blen = byteArray.length

    this._waitUntilReady(() => {
      let pageStart = Infinity
      let pageEnd = 0
      let colStart = Infinity
      let colEnd = 0
      let any = false

      // iterate through dirty bytes
      for (let i = 0; i < blen; i += 1) {
        const b = byteArray[i]
        if ((b >= 0) && (b < this.buffer.length)) {
          const page = b / this.WIDTH | 0
          if (page < pageStart) pageStart = page
          if (page > pageEnd) pageEnd = page
          const col = b % this.WIDTH
          if (col < colStart) colStart = col
          if (col > colEnd) colEnd = col
          any = true
        }
      }

      if (!any) return

      const displaySeq = [
        this.COLUMN_ADDR, colStart, colEnd, // column start and end address
        this.PAGE_ADDR, pageStart, pageEnd // page start and end address
      ]

      const displaySeqLen = displaySeq.length

      // send intro seq
      for (let i = 0; i < displaySeqLen; i += 1) {
        this._transfer('cmd', displaySeq[i])
      }

      // send byte, then move on to next byte
      for (let i = pageStart; i <= pageEnd; i += 1) {
        for (let j = colStart; j <= colEnd; j += 1) {
          this._transfer('data', this.buffer[this.WIDTH * i + j])
        }
      }
    })

    // now that all bytes are synced, reset dirty state
    this.dirtyBytes = []
  }

  // using Bresenham's line algorithm
  drawLine (x0, y0, x1, y1, color, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync

    const dx = Math.abs(x1 - x0)
    const sx = x0 < x1 ? 1 : -1
    const dy = Math.abs(y1 - y0)
    const sy = y0 < y1 ? 1 : -1

    let err = (dx > dy ? dx : -dy) / 2

    while (true) {
      this.drawPixel([x0, y0, color], false)

      if (x0 === x1 && y0 === y1) break

      const e2 = err

      if (e2 > -dx) { err -= dy; x0 += sx }
      if (e2 < dy) { err += dx; y0 += sy }
    }

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  // Draw an outlined  rectangle
  drawRect (x, y, w, h, color, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync
    // top
    this.drawLine(x, y, x + w, y, color, false)

    // left
    this.drawLine(x, y + 1, x, y + h - 1, color, false)

    // right
    this.drawLine(x + w, y + 1, x + w, y + h - 1, color, false)

    // bottom
    this.drawLine(x, y + h - 1, x + w, y + h - 1, color, false)

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  };

  // draw a filled rectangle on the oled
  fillRect (x, y, w, h, color, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync
    // one iteration for each column of the rectangle
    for (let i = x; i < x + w; i += 1) {
      // draws a vert line
      this.drawLine(i, y, i, y + h - 1, color, false)
    }
    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  }

  /**
   * Draw a circle outline
   *
   * This method is ad verbatim translation from the corresponding
   * method on the Adafruit GFX library
   * https://github.com/adafruit/Adafruit-GFX-Library
   */
  drawCircle (x0, y0, r, color, sync) {
    const immed = (typeof sync === 'undefined') ? true : sync

    let f = 1 - r
    let ddF_x = 1
    let ddF_y = -2 * r
    let x = 0
    let y = r

    this.drawPixel(
      [[x0, y0 + r, color],
        [x0, y0 - r, color],
        [x0 + r, y0, color],
        [x0 - r, y0, color]],
      false
    )

    while (x < y) {
      if (f >= 0) {
        y--
        ddF_y += 2
        f += ddF_y
      }
      x++
      ddF_x += 2
      f += ddF_x

      this.drawPixel(
        [[x0 + x, y0 + y, color],
          [x0 - x, y0 + y, color],
          [x0 + x, y0 - y, color],
          [x0 - x, y0 - y, color],
          [x0 + y, y0 + x, color],
          [x0 - y, y0 + x, color],
          [x0 + y, y0 - x, color],
          [x0 - y, y0 - x, color]],
        false
      )
    }

    if (immed) {
      this._updateDirtyBytes(this.dirtyBytes)
    }
  };

  // activate scrolling for rows start through stop
  startScroll (dir, start, stop) {
    const cmdSeq = []

    switch (dir) {
      case 'right':
        cmdSeq.push(this.RIGHT_HORIZONTAL_SCROLL); break
      case 'left':
        cmdSeq.push(this.LEFT_HORIZONTAL_SCROLL); break
      case 'left diagonal':
        cmdSeq.push(
          this.SET_VERTICAL_SCROLL_AREA,
          0x00,
          this.HEIGHT,
          this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL,
          0x00,
          start,
          0x00,
          stop,
          0x01,
          this.ACTIVATE_SCROLL
        )
        break
      case 'right diagonal':
        cmdSeq.push(
          this.SET_VERTICAL_SCROLL_AREA,
          0x00,
          this.HEIGHT,
          this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL,
          0x00,
          start,
          0x00,
          stop,
          0x01,
          this.ACTIVATE_SCROLL
        )
        break
    }

    this._waitUntilReady(() => {
      if (dir === 'right' || dir === 'left') {
        cmdSeq.push(
          0x00, start,
          0x00, stop,
          0x00, 0xFF,
          this.ACTIVATE_SCROLL
        )
      }

      for (let i = 0; i < cmdSeq.length; i += 1) {
        this._transfer('cmd', cmdSeq[i])
      }
    })
  }

  // stop scrolling display contents
  stopScroll () {
    this._transfer('cmd', this.DEACTIVATE_SCROLL) // stahp
  }
}

module.exports = Oled
