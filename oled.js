var Oled = function(board, five, opts) {

  this.HEIGHT = opts.height || 32;
  this.WIDTH = opts.width || 128;
  this.ADDRESS = opts.address || 0x3C;
  this.PROTOCOL = (opts.address) ? 'I2C' : 'SPI';
  this.MICROVIEW = opts.microview || false;
  this.SLAVEPIN = opts.slavePin || 12;

  // create command buffers
  this.DISPLAY_OFF = 0xAE;
  this.DISPLAY_ON = 0xAF;
  this.SET_DISPLAY_CLOCK_DIV = 0xD5;
  this.SET_MULTIPLEX = 0xA8;
  this.SET_DISPLAY_OFFSET = 0xD3;
  this.SET_START_LINE = 0x00;
  this.CHARGE_PUMP = 0x8D;
  this.EXTERNAL_VCC = false;
  this.MEMORY_MODE = 0x20;
  this.SEG_REMAP = 0xA1; // using 0xA0 will flip screen
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

  this.cursor_x = 0;
  this.cursor_y = 0;

  // new blank buffer
  this.buffer = new Buffer((this.WIDTH * this.HEIGHT) / 8);
  this.buffer.fill(0x00);

  this.dirtyBytes = [];

  // this is necessary as we're not natively sitting within johnny-five lib
  this.board = board;
  this.five = five;

  var config = {
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
      'coloffset': 0,
    },
    // this is blended microview / normal 64 x 48, currently wip
    '64x48': {
      'multiplex': 0x2F,
      'compins': 0x12,
      'coloffset': (this.MICROVIEW) ? 32 : 0
    }
  };

  // microview is wip
  if (this.MICROVIEW) {
    // microview spi pins
    this.SPIconfig = {
      'dcPin': 8,
      'ssPin': 10,
      'rstPin': 7,
      'clkPin': 13,
      'mosiPin': 11
    };
  } else if (this.PROTOCOL === 'SPI') {
    // generic spi pins
    this.SPIconfig = {
      'dcPin': 11,
      'ssPin': this.SLAVEPIN,
      'rstPin': 13,
      'clkPin': 10,
      'mosiPin': 9
    };
  }

  var screenSize = this.WIDTH + 'x' + this.HEIGHT;
  this.screenConfig = config[screenSize];

  if (this.PROTOCOL === 'I2C') {
    // enable i2C in firmata
    this.board.io.i2cConfig(0);
  } else {
    this._setUpSPI();
  }

  this._initialise();
}

Oled.prototype._initialise = function() {

  // sequence of bytes to initialise with
  var initSeq = [
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
  ];

  var i, initSeqLen = initSeq.length;

  // write init seq commands
  for (i = 0; i < initSeqLen; i ++) {
    this._transfer('cmd', initSeq[i]);
  }
}

Oled.prototype._setUpSPI = function() {

    // set up spi pins
    this.dcPin = new this.five.Pin(this.SPIconfig.dcPin);
    this.ssPin = new this.five.Pin(this.SPIconfig.ssPin);
    this.clkPin = new this.five.Pin(this.SPIconfig.clkPin);
    this.mosiPin = new this.five.Pin(this.SPIconfig.mosiPin);
    // reset won't be used as it causes a bunch of default initialisations
    this.rstPin = new this.five.Pin(this.SPIconfig.rstPin);

    // get the screen out of default mode
    this.rstPin.low();
    this.rstPin.high();
    // Set SS to high so a connected chip will be "deselected" by default
    this.ssPin.high();
}

// writes both commands and data buffers to this device
Oled.prototype._transfer = function(type, val) {
  var control;
  if (type === 'data') {
    control = 0x40;
  } else if (type === 'cmd') {
    control = 0x00;
  } else {
    return;
  }

  if (this.PROTOCOL === 'I2C') {
    // send control and actual val
    this.board.io.i2cWrite(this.ADDRESS, [control, val]);
  } else {
    // send val via SPI, no control byte
    this._writeSPI(val, type);
  }
}

Oled.prototype._writeSPI = function(byte, mode) {
  var bit;

  // set dc to low if command byte, high if data byte
  if (mode === 'cmd') {
    this.dcPin.low();
  } else {
    this.dcPin.high();
  }

  // select the device as slave
  this.ssPin.low();

  for (bit = 7; bit >= 0; bit--) {

    // pull clock low
    this.clkPin.low();

    // shift out a bit for mosi
    if (byte & (1 << bit)) {
      this.mosiPin.high();
    } else {
      this.mosiPin.low();
    }

    // pull clock high to collect bit
    this.clkPin.high();

  }

  // turn off slave select so other devices can use SPI
  // don't be an SPI hogging jerk basically
  this.ssPin.high();
}

// read a byte from the oled
Oled.prototype._readI2C = function(fn) {
  this.board.io.i2cReadOnce(this.ADDRESS, 1, function(data) {
    fn(data);
  });
}

// sometimes the oled gets a bit busy with lots of bytes.
// Read the response byte to see if this is the case
Oled.prototype._waitUntilReady = function(callback) {
  var done,
      oled = this;

  function tick(callback) {
    oled._readI2C(function(byte) {
      // read the busy byte in the response
      busy = byte >> 7 & 1;
      if (!busy) {
        // if not busy, it's ready for callback
        callback();
      } else {
        console.log('I\'m busy!');
        setTimeout(tick, 0);
      }
    });
  };

  if (this.PROTOCOL === 'I2C') {
    setTimeout(tick(callback), 0);
  } else {
    callback();
  }
}

// set starting position of a text string on the oled
Oled.prototype.setCursor = function(x, y) {
  this.cursor_x = x;
  this.cursor_y = y;
}

// write text to the oled
Oled.prototype.writeString = function(font, size, string, color, wrap, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;
  var wordArr = string.split(' '),
      len = wordArr.length,
      // start x offset at cursor pos
      offset = this.cursor_x,
      padding = 0, letspace = 1, leading = 2;

  // loop through words
  for (var w = 0; w < len; w += 1) {
    // put the word space back in
    wordArr[w] += ' ';
    var stringArr = wordArr[w].split(''),
        slen = stringArr.length,
        compare = (font.width * size * slen) + (size * (len -1));

    // wrap words if necessary
    if (wrap && len > 1 && (offset >= (this.WIDTH - compare)) ) {
      offset = 1;
      this.cursor_y += (font.height * size) + size + leading;
      this.setCursor(offset, this.cursor_y);
    }

    // loop through the array of each char to draw
    for (var i = 0; i < slen; i += 1) {
      // look up the position of the char, pull out the buffer slice
      var charBuf = this._findCharBuf(font, stringArr[i]);
      // read the bits in the bytes that make up the char
      var charBytes = this._readCharBytes(charBuf);
      // draw the entire character
      this._drawChar(charBytes, size, false);

      // calc new x position for the next char, add a touch of padding too if it's a non space char
      padding = (stringArr[i] === ' ') ? 0 : size + letspace;
      offset += (font.width * size) + padding;

      // wrap letters if necessary
      if (wrap && (offset >= (this.WIDTH - font.width - letspace))) {
        offset = 1;
        this.cursor_y += (font.height * size) + size + leading;
      }
      // set the 'cursor' for the next char to be drawn, then loop again for next char
      this.setCursor(offset, this.cursor_y);
    }
  }
  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

// draw an individual character to the screen
Oled.prototype._drawChar = function(byteArray, size, sync) {
  // take your positions...
  var x = this.cursor_x,
      y = this.cursor_y;

  // loop through the byte array containing the hexes for the char
  for (var i = 0; i < byteArray.length; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      // pull color out
      var color = byteArray[i][j],
          xpos, ypos;
      // standard font size
      if (size === 1) {
        xpos = x + i;
        ypos = y + j;
        this.drawPixel([xpos, ypos, color], false);
      } else {
        // MATH! Calculating pixel size multiplier to primitively scale the font
        xpos = x + (i * size);
        ypos = y + (j * size);
        this.fillRect(xpos, ypos, size, size, color, false);
      }
    }
  }
}

// get character bytes from the supplied font object in order to send to framebuffer
Oled.prototype._readCharBytes = function(byteArray) {
  var bitArr = [],
      bitCharArr = [];
  // loop through each byte supplied for a char
  for (var i = 0; i < byteArray.length; i += 1) {
    // set current byte
    var byte = byteArray[i];
    // read each byte
    for (var j = 0; j < 8; j += 1) {
      // shift bits right until all are read
      var bit = byte >> j & 1;
      bitArr.push(bit);
    }
    // push to array containing flattened bit sequence
    bitCharArr.push(bitArr);
    // clear bits for next byte
    bitArr = [];
  }
  return bitCharArr;
}

// find where the character exists within the font object
Oled.prototype._findCharBuf = function(font, c) {
  // use the lookup array as a ref to find where the current char bytes start
  var cBufPos = font.lookup.indexOf(c) * font.width;
  // slice just the current char's bytes out of the fontData array and return
  var cBuf = font.fontData.slice(cBufPos, cBufPos + font.width);
  return cBuf;
}

// send the entire framebuffer to the oled
Oled.prototype.update = function() {
  // wait for oled to be ready
  this._waitUntilReady(function() {
    // set the start and endbyte locations for oled display update
    var displaySeq = [
      this.COLUMN_ADDR,
      this.screenConfig.coloffset,
      this.screenConfig.coloffset + this.WIDTH - 1, // column start and end address
      this.PAGE_ADDR, 0, (this.HEIGHT / 8) - 1 // page start and end address
    ];

    var displaySeqLen = displaySeq.length,
        bufferLen = this.buffer.length,
        i, v;

    // send intro seq
    for (i = 0; i < displaySeqLen; i += 1) {
      this._transfer('cmd', displaySeq[i]);
    }

    // write buffer data
    for (v = 0; v < bufferLen; v += 1) {
      this._transfer('data', this.buffer[v]);
    }

  }.bind(this));
}

// send dim display command to oled
Oled.prototype.dimDisplay = function(bool) {
  var contrast;

  if (bool) {
    contrast = 0; // Dimmed display
  } else {
    contrast = 0xCF; // Bright display
  }

  this._transfer('cmd', this.SET_CONTRAST);
  this._transfer('cmd', contrast);
}

// turn oled off
Oled.prototype.turnOffDisplay = function() {
  this._transfer('cmd', this.DISPLAY_OFF);
}

// turn oled on
Oled.prototype.turnOnDisplay = function() {
  this._transfer('cmd', this.DISPLAY_ON);
}

// clear all pixels currently on the display
Oled.prototype.clearDisplay = function(sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;
  // write off pixels
  //this.buffer.fill(0x00);
  for (var i = 0; i < this.buffer.length; i += 1) {
    if (this.buffer[i] !== 0x00) {
      this.buffer[i] = 0x00;
      if (this.dirtyBytes.indexOf(i) === -1) {
        this.dirtyBytes.push(i);
      }
    }
  }
  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

// invert pixels on oled
Oled.prototype.invertDisplay = function(bool) {
  if (bool) {
    this._transfer('cmd', this.INVERT_DISPLAY); // inverted
  } else {
    this._transfer('cmd', this.NORMAL_DISPLAY); // non inverted
  }
}

// draw an image pixel array on the screen
Oled.prototype.drawBitmap = function(pixels, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;
  var x, y,
      pixelArray = [];

  for (var i = 0; i < pixels.length; i++) {
    x = Math.floor(i % this.WIDTH);
    y = Math.floor(i / this.WIDTH);

    this.drawPixel([x, y, pixels[i]], false);
  }

  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

// draw one or many pixels on oled
Oled.prototype.drawPixel = function(pixels, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;

  // handle lazy single pixel case
  if (typeof pixels[0] !== 'object') pixels = [pixels];

  pixels.forEach(function(el) {
    // return if the pixel is out of range
    var x = el[0], y = el[1], color = el[2];
    if (x > this.WIDTH || y > this.HEIGHT) return;

    // thanks, Martin Richards.
    // I wanna can this, this tool is for devs who get 0 indexes
    //x -= 1; y -=1;
    var byte = 0,
        page = Math.floor(y / 8),
        pageShift = 0x01 << (y - 8 * page);

    // is the pixel on the first row of the page?
    (page == 0) ? byte = x : byte = x + (this.WIDTH * page);

    // colors! Well, monochrome.
    if (color === 'BLACK' || color === 0) {
      this.buffer[byte] &= ~pageShift;
    }
    if (color === 'WHITE' || color > 0) {
      this.buffer[byte] |= pageShift;
    }

    // push byte to dirty if not already there
    if (this.dirtyBytes.indexOf(byte) === -1) {
      this.dirtyBytes.push(byte);
    }

  }, this);

  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

// looks at dirty bytes, and sends the updated bytes to the display
Oled.prototype._updateDirtyBytes = function(byteArray) {
  var blen = byteArray.length, i,
      displaySeq = [];

  // check to see if this will even save time
  if (blen > (this.buffer.length / 7)) {
    // just call regular update at this stage, saves on bytes sent
    this.update();
    // now that all bytes are synced, reset dirty state
    this.dirtyBytes = [];

  } else {

    this._waitUntilReady(function() {
      // iterate through dirty bytes
      for (var i = 0; i < blen; i += 1) {

        var byte = byteArray[i];
        var page = Math.floor(byte / this.WIDTH);
        var col = Math.floor(byte % this.WIDTH);

        var displaySeq = [
          this.COLUMN_ADDR, col, col, // column start and end address
          this.PAGE_ADDR, page, page // page start and end address
        ];

        var displaySeqLen = displaySeq.length, v;

        // send intro seq
        for (v = 0; v < displaySeqLen; v += 1) {
          this._transfer('cmd', displaySeq[v]);
        }
        // send byte, then move on to next byte
        this._transfer('data', this.buffer[byte]);
        this.buffer[byte];
      }
    }.bind(this));
  }
  // now that all bytes are synced, reset dirty state
  this.dirtyBytes = [];
}

// using Bresenham's line algorithm
Oled.prototype.drawLine = function(x0, y0, x1, y1, color, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;

  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1,
      dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1,
      err = (dx > dy ? dx : -dy) / 2;

  while (true) {
    this.drawPixel([x0, y0, color], false);

    if (x0 === x1 && y0 === y1) break;

    var e2 = err;

    if (e2 > -dx) {err -= dy; x0 += sx;}
    if (e2 < dy) {err += dx; y0 += sy;}
  }

  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

// Draw an outlined  rectangle
Oled.prototype.drawRect = function(x, y, w, h, color, sync){
  var immed = (typeof sync === 'undefined') ? true : sync;
  //top 
  this.drawLine(x, y, x + w, y,color,false);

  //left
  this.drawLine(x, y + 1, x, y + h - 1, color, false);

  //right
  this.drawLine(x + w, y + 1, x + w, y + h - 1, color, false);

  //bottom
  this.drawLine(x, y + h - 1, x + w, y + h - 1, color, false);

  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
};

// draw a filled rectangle on the oled
Oled.prototype.fillRect = function(x, y, w, h, color, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;
  // one iteration for each column of the rectangle
  for (var i = x; i < x + w; i += 1) {
    // draws a vert line
    this.drawLine(i, y, i, y+h-1, color, false);
  }
  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
}

/**
 * Draw a circle outline
 *
 * This method is ad verbatim translation from the corresponding
 * method on the Adafruit GFX library
 * https://github.com/adafruit/Adafruit-GFX-Library
 */
Oled.prototype.drawCircle = function(x0, y0, r, color, sync) {
  var immed = (typeof sync === 'undefined') ? true : sync;

  var f = 1 - r;
  var ddF_x = 1;
  var ddF_y = -2 * r;
  var x = 0;
  var y = r;

  this.drawPixel(
    [[x0, y0 + r, color],
    [x0, y0 - r, color],
    [x0 + r, y0, color],
    [x0 - r, y0, color]],
    false
  );

  while(x < y) {
    if (f >=0) {
      y--;
      ddF_y += 2;
      f += ddF_y;
    }
    x++;
    ddF_x += 2;
    f += ddF_x;

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
    );
  }

  if (immed) {
    this._updateDirtyBytes(this.dirtyBytes);
  }
};

// activate scrolling for rows start through stop
Oled.prototype.startScroll = function(dir, start, stop) {
  var scrollHeader,
      cmdSeq = [];

  switch (dir) {
    case 'right':
      cmdSeq.push(this.RIGHT_HORIZONTAL_SCROLL); break;
    case 'left':
      cmdSeq.push(this.LEFT_HORIZONTAL_SCROLL); break;
    // TODO: left diag and right diag not working yet
    case 'left diagonal':
      cmdSeq.push(
        this.SET_VERTICAL_SCROLL_AREA, 0x00,
        this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL,
        this.HEIGHT
      );
      break;
    // TODO: left diag and right diag not working yet
    case 'right diagonal':
      cmdSeq.push(
        this.SET_VERTICAL_SCROLL_AREA, 0x00,
        this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL,
        this.HEIGHT
      );
      break;
  }

  this._waitUntilReady(function() {
    cmdSeq.push(
      0x00, start,
      0x00, stop,
      // TODO: these need to change when diagonal
      0x00, 0xFF,
      this.ACTIVATE_SCROLL
    );

    var i, cmdSeqLen = cmdSeq.length;

    for (i = 0; i < cmdSeqLen; i += 1) {
      this._transfer('cmd', cmdSeq[i]);
    }
  }.bind(this));
}

// stop scrolling display contents
Oled.prototype.stopScroll = function() {
  this._transfer('cmd', this.DEACTIVATE_SCROLL); // stahp
}

module.exports = Oled;
