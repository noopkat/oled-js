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

  this.cursor_x = 0;
  this.cursor_y = 0;

  // new blank buffer
  this.buffer = new Buffer((this.WIDTH * this.HEIGHT) / 8);
  this.buffer.fill(0x00);

  this.dirtyBytes = [];

  this.board = board;

  var config = {
    '128x32': {
      'multiplex': 0x1F,
      'compins': 0x02
    },
    '128x64': {
      'multiplex': 0x3F,
      'compins': 0x12  
    },
    '96x16': {
      'multiplex': 0x0F,
      'compins': 0x2
    }
  };

  var screenSize = this.WIDTH + 'x' + this.HEIGHT,
      screenConfig = config[screenSize];

  // enable i2C in firmata
  this.board.io.sendI2CConfig(0);

  // set up the display so it knows what to do
  var initSeq = [
    this.DISPLAY_OFF,
    this.SET_DISPLAY_CLOCK_DIV, 0x80,
    this.SET_MULTIPLEX, screenConfig.multiplex, // set the last value dynamically based on screen size requirement
    this.SET_DISPLAY_OFFSET, 0x0, // sets offset pro to 0
    this.SET_START_LINE,
    this.CHARGE_PUMP, 0x14, // charge pump val
    this.MEMORY_MODE, 0x00, // 0x0 act like ks0108
    this.SEG_REMAP, // screen orientation
    this.COM_SCAN_INC, // screen orientation
    this.SET_COM_PINS, screenConfig.compins, // com pins val sets dynamically to match each screen size requirement
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


// writes both commands and data buffers to this device
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

  setTimeout(tick(callback), 0);
}

Oled.prototype.setCursor = function(x, y) {
  this.cursor_x = x;
  this.cursor_y = y;
}

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

Oled.prototype._findCharBuf = function(font, c) {
  // use the lookup array as a ref to find where the current char bytes start
  var cBufPos = font.lookup.indexOf(c) * font.width;
  // slice just the current char's bytes out of the fontData array and return
  var cBuf = font.fontData.slice(cBufPos, cBufPos + font.width);
  return cBuf;
}

Oled.prototype.update = function() {
  // TODO: either keep this, or push asynchronous handling onto the consumer
  this._waitUntilReady(function() {
    var displaySeq = [
      this.COLUMN_ADDR, 0, this.WIDTH - 1, // column start and end address 
      this.PAGE_ADDR, 0, 3 // page start and end address
    ];

    var displaySeqLen = displaySeq.length,
        bufferLen = this.buffer.length,
        i, v;

    // send intro seq
    for (i = 0; i < displaySeqLen; i += 1) {
      this._writeI2C('cmd', displaySeq[i]);
    }

    // write buffer data
    for (v = 0; v < bufferLen; v += 1) {
      this._writeI2C('data', this.buffer[v]);
    }

  }.bind(this));
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

Oled.prototype.turnOffDisplay = function() {
  this._writeI2C('cmd', this.DISPLAY_OFF);
}

Oled.prototype.turnOnDisplay = function() {
  this._writeI2C('cmd', this.DISPLAY_ON);
}

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

Oled.prototype.invertDisplay = function(bool) {
  if (bool) {
    this._writeI2C('cmd', this.INVERT_DISPLAY); // invert
  } else {
    this._writeI2C('cmd', this.NORMAL_DISPLAY); // non invert
  }
}

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

// looks at dirty bytes, and sends the updated byte to the display
Oled.prototype._updateDirtyBytes = function(byteArray) {
  var blen = byteArray.length, i,
      displaySeq = [];

  // check to see if this will even save time
  if (blen > (this.buffer.length / 7)) {
    // now that all bytes are synced, reset dirty state
    this.dirtyBytes = [];
    // just call regular update at this stage, saves on bytes sent
    this.update();

    //return;
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
          this._writeI2C('cmd', displaySeq[v]);
        }
        // send byte, then move on to next byte
        this._writeI2C('data', this.buffer[byte]);
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

// activate a right handed scroll for rows start through stop
Oled.prototype.startscroll = function(dir, start, stop) {
  //start = '0x' + start.toString(16),
  //stop = '0x' + stop.toString(16),
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

  // TODO: either keep this, or push asynchronous handling onto the consumer
  this._waitUntilReady(function() {
    cmdSeq.push(
      0x00, start,
      0x00, stop,
      // TODO: these need to change when diag
      0x00, 0xFF,
      this.ACTIVATE_SCROLL
    );

    var i, cmdSeqLen = cmdSeq.length;

    for (i = 0; i < cmdSeqLen; i += 1) {
      this._writeI2C('cmd', cmdSeq[i]);
    }
  }.bind(this));
}

Oled.prototype.stopscroll = function() {
  this._writeI2C('cmd', this.DEACTIVATE_SCROLL); // stahp
}

module.exports = Oled;