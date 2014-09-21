var Oled = function(board, width, height, address) {

  // create command buffers
  this.HEIGHT = height;
  this.WIDTH = width;
  this.ADDRESS = address || 0x3C;
  this.DISPLAY_OFF = 0xAE;
  this.DISPLAY_ON = 0xAF;
  this.SET_DISPLAY_CLOCK_DIV = 0xD5;
  this.SET_MULTIPLEX = 0xA8;
  this.SET_DISPLAY_OFFSET = 0xD3;
  this.SET_START_LINE = 0x0;
  this.CHARGE_PUMP = 0x8D;
  this.EXTERNAL_VCC = false;
  this.MEMORY_MODE = 0x20;
  this.SEG_REMAP = 0xA0;
  this.COM_SCAN_DEC = 0xC8;
  this.COM_SCAN_INC = 0xC0;
  this.SET_COM_PINS = 0xDA;
  this.SET_CONTRAST = 0x81;
  this.SET_PRECHARGE = 0xd9;
  this.SET_VCOM_DETECT = 0xDB;
  this.DISPLAY_ALL_ON_RESUME = 0xA4;
  this.NORMAL_DISPLAY = 0xA6;
  this.COLUMN_ADDR = 0x21;
  this.PAGE_ADDR = 0x22;
  this.INVERT_DISPLAY = 0xA7;
  this.ACTIVATE_SCROLL = 0x2F;
  this.DEACTIVATE_SCROLL = 0x2E;
  this.SET_VERTICAL_SCROLL_AREA = 0xA3;
  this.RIGHT_HORIZONTAL_SCROLL = 0x26;
  this.LEFT_HORIZONTAL_SCROLL = 0x27;
  this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL = 0x29;
  this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL = 0x2A;

  // new blank buffer
  this.buffer = new Buffer((this.WIDTH * this.HEIGHT) / 8);
  this.buffer.fill(0x00);

  this.board = board;

  // enable i2C in firmata
  this.board.io.sendI2CConfig(0);

  // set up the display so it knows what to do
  var initSeq = [
    this.DISPLAY_OFF,
    this.SET_DISPLAY_CLOCK_DIV, 0x80,
    this.SET_MULTIPLEX, 0x1F,
    this.SET_DISPLAY_OFFSET, 0x0, // sets offset pro to 0
    this.SET_START_LINE,
    this.CHARGE_PUMP, 0x14, // charge pump val
    this.MEMORY_MODE, 0x00, // 0x0 act like ks0108
    this.SEG_REMAP, // screen orientation
    this.COM_SCAN_INC, // screen orientation
    this.SET_COM_PINS, 0x02, // com pins val
    this.SET_CONTRAST, 0x8F, // contrast val
    this.SET_PRECHARGE, 0xF1, // precharge val
    this.SET_VCOM_DETECT, 0x40, // vcom detect
    this.DISPLAY_ALL_ON_RESUME,
    this.NORMAL_DISPLAY,
    this.DISPLAY_ON
  ];

  var i, initSeqLen = initSeq.length;

  // write init seq commands
  for (i = 0; i < initSeqLen; i ++) {
    this._writeI2C('cmd', initSeq[i]);
  }
}


// writes both commands and data buffers to the this device
Oled.prototype._writeI2C = function(type, val) {
  var control;
  if (type === 'data') {
    control = 0x40;
  } else if (type === 'cmd') {
    control = 0x00;
  } else {
    return;
  }
  // send control and actual val
  this.board.io.sendI2CWriteRequest(this.ADDRESS, [control, val]);
}

// read a byte from the oled
Oled.prototype._readI2C = function(fn) {
  this.board.io.sendI2CReadRequest(this.ADDRESS, 1, function(data) {
    fn(data);
  });
}

Oled.prototype._waitUntilReady = function(callback) {
  var done;
  var oled = this;
  // TODO: attempt to use setImmediate
  setTimeout(function tick() {
    oled._readI2C(function(byte) {
      done = byte << 7;
      if (done) {
        callback();
      } else {
        setTimeout(tick, 0);
      }
    });
  }, 0);
}

Oled.prototype.update = function() {
  var oled = this;
  // TODO: either keep this, or push asynchronous handling onto the consumer
  oled._waitUntilReady(function() {
    var displaySeq = [
      oled.COLUMN_ADDR, 0, oled.WIDTH - 1, // column start and end address 
      oled.PAGE_ADDR, 0, 3 // page start and end address
    ];

    var displaySeqLen = displaySeq.length,
        bufferLen = oled.buffer.length,
        i, v;

    // send intro seq
    for (i = 0; i < displaySeqLen; i += 1) {
      oled._writeI2C('cmd', displaySeq[i]);
    }

    // write buffer data
    for (v = 0; v < bufferLen; v += 1) {
      oled._writeI2C('data', oled.buffer[v]);
    }

  });
}

Oled.prototype.dimDisplay = function(bool) {
  var contrast;

  if (bool) {
    contrast = 0; // Dimmed display
  } else {
    contrast = 0xCF; // High contrast
  }

  this._writeI2C('cmd', this.SET_CONTRAST);
  this._writeI2C('cmd', contrast);
}

Oled.prototype.clearDisplay = function() {
  // write off pixels
  this.buffer.fill(0x00);
}

Oled.prototype.invertDisplay = function(bool) {
  if (bool) {
    this._writeI2C('cmd', this.INVERT_DISPLAY);
  } else {
    this._writeI2C('cmd', this.NORMAL_DISPLAY);
  }
}

Oled.prototype.drawBitmap = function(pixels) {
  var x, y;
  var pixelArray = [];

  for (var i = 0; i < pixels.length; i++) {
    x = Math.floor(i % this.WIDTH) + 1;
    y = Math.floor(i / this.WIDTH) + 1;

    this.drawPixel([[x, y, pixels[i]]]);
  }
}

Oled.prototype.drawPixel = function(pixels) {
  var oled = this;
  pixels.forEach(function(el) {
    // return if the pixel is out of range
    var x = el[0], y = el[1], color = el[2];
    if (x > oled.WIDTH || y > oled.HEIGHT) return;

    // thanks, Martin Richards
    x -= 1; y -=1;
    var byte = 0,
        page = Math.floor(y / 8),
        pageShift = 0x01 << (y - 8 * page);

    // is the pixel on the first row of the page?
    (page == 0) ? byte = x : byte = x + oled.WIDTH * page; 

      // colors! Well, monochrome.
    
      if (color === 'BLACK' || color === 0) {
        oled.buffer[byte] &= ~pageShift;
      }
      if (color === 'WHITE' || color > 0) {
        oled.buffer[byte] |= pageShift;
      }

    // sanity check
    // console.log(color + ' pixel at ' + x + ', ' + y);
  });
}

// using Bresenham's line algorithm
Oled.prototype.drawLine = function(x0, y0, x1, y1) {
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  var err = (dx > dy ? dx : -dy) / 2;
  while (true) {
    this.drawPixel([[x0, y0, 1]]);
    if (x0 === x1 && y0 === y1) break;
    var e2 = err;
    if (e2 > -dx) {err -= dy; x0 += sx;}
    if (e2 < dy) {err += dx; y0 += sy;}
  }
}

// activate a right handed scroll for rows start through stop
Oled.prototype.startscrollright = function(start, stop) {
  var oled = this;
  // TODO: either keep this, or push asynchronous handling onto the consumer
  this._waitUntilReady(function() {
    var cmdSeq = [
      oled.RIGHT_HORIZONTAL_SCROLL,
      0X00, start,
      0X00, stop,
      0X00, 0XFF,
      oled.ACTIVATE_SCROLL
    ];

    var i, cmdSeqLen = cmdSeq.length;

    for (i = 0; i < cmdSeqLen; i += 1) {
      oled._writeI2C('cmd', cmdSeq[i]);
    }
  });
}

Oled.prototype.stopscroll = function() {
  this._writeI2C('cmd', this.DEACTIVATE_SCROLL);
}

module.exports = Oled;