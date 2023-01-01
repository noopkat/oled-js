"use strict";
var _a;
var qr = null;
try {
    qr = require("qr-image");
}
catch (err) {
}
var Protocol;
(function (Protocol) {
    Protocol[Protocol["I2C"] = 0] = "I2C";
    Protocol[Protocol["SPI"] = 1] = "SPI";
})(Protocol || (Protocol = {}));
var TransferType;
(function (TransferType) {
    TransferType[TransferType["Command"] = 0] = "Command";
    TransferType[TransferType["Data"] = 1] = "Data";
})(TransferType || (TransferType = {}));
module.exports = (_a = (function () {
        function Oled(board, five, opts) {
            this.HEIGHT = opts.height || 32;
            this.WIDTH = opts.width || 128;
            this.ADDRESS = opts.address || 0x3C;
            this.PROTOCOL = (opts.address) ? Protocol.I2C : Protocol.SPI;
            this.MICROVIEW = opts.microview || false;
            this.SECONDARYPIN = opts.secondaryPin || 12;
            this.RESETPIN = opts.resetPin || 4;
            this.DATA = opts.data || 0x40;
            this.COMMAND = opts.command || 0x00;
            this.cursor_x = 0;
            this.cursor_y = 0;
            this.buffer = Buffer.alloc((this.WIDTH * this.HEIGHT) / 8);
            this.buffer.fill(0x00);
            this.dirtyBytes = [];
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
                    'coloffset': 0
                },
                '64x48': {
                    'multiplex': 0x2F,
                    'compins': 0x12,
                    'coloffset': (this.MICROVIEW) ? 32 : 0
                }
            };
            if (this.MICROVIEW) {
                this.SPIconfig = {
                    'dcPin': 8,
                    'ssPin': 10,
                    'rstPin': 7,
                    'clkPin': 13,
                    'mosiPin': 11
                };
            }
            else if (this.PROTOCOL === Protocol.SPI) {
                this.SPIconfig = {
                    'dcPin': 11,
                    'ssPin': this.SECONDARYPIN,
                    'rstPin': 13,
                    'clkPin': 10,
                    'mosiPin': 9
                };
            }
            var screenSize = "".concat(this.WIDTH, "x").concat(this.HEIGHT);
            this.screenConfig = config[screenSize];
            if (this.PROTOCOL === Protocol.I2C) {
                this._setUpI2C(opts);
            }
            else {
                this._setUpSPI();
            }
            this._initialise();
        }
        Oled.prototype._initialise = function () {
            var initSeq = [
                Oled.DISPLAY_OFF,
                Oled.SET_DISPLAY_CLOCK_DIV, 0x80,
                Oled.SET_MULTIPLEX, this.screenConfig.multiplex,
                Oled.SET_DISPLAY_OFFSET, 0x00,
                Oled.SET_START_LINE,
                Oled.CHARGE_PUMP, 0x14,
                Oled.MEMORY_MODE, 0x00,
                Oled.SEG_REMAP,
                Oled.COM_SCAN_DEC,
                Oled.SET_COM_PINS, this.screenConfig.compins,
                Oled.SET_CONTRAST, 0x8F,
                Oled.SET_PRECHARGE, 0xF1,
                Oled.SET_VCOM_DETECT, 0x40,
                Oled.DISPLAY_ALL_ON_RESUME,
                Oled.NORMAL_DISPLAY,
                Oled.DISPLAY_ON
            ];
            for (var i = 0; i < initSeq.length; i++) {
                this._transfer(TransferType.Command, initSeq[i]);
            }
        };
        Oled.prototype._setUpSPI = function () {
            this.dcPin = new this.five.Pin(this.SPIconfig.dcPin);
            this.ssPin = new this.five.Pin(this.SPIconfig.ssPin);
            this.clkPin = new this.five.Pin(this.SPIconfig.clkPin);
            this.mosiPin = new this.five.Pin(this.SPIconfig.mosiPin);
            this.rstPin = new this.five.Pin(this.SPIconfig.rstPin);
            this.rstPin.low();
            this.rstPin.high();
            this.ssPin.high();
        };
        Oled.prototype._setUpI2C = function (opts) {
            this.board.io.i2cConfig(opts);
            this.rstPin = new this.five.Pin({ pin: this.RESETPIN, board: this.board });
            this.rstPin.low();
            this.rstPin.high();
        };
        Oled.prototype._transfer = function (type, val) {
            var control;
            if (type === TransferType.Data) {
                control = this.DATA;
            }
            else if (type === TransferType.Command) {
                control = this.COMMAND;
            }
            else {
                return;
            }
            if (this.PROTOCOL === Protocol.I2C) {
                this.board.io.i2cWrite(this.ADDRESS, [control, val]);
            }
            else {
                this._writeSPI(val, type);
            }
        };
        Oled.prototype._writeSPI = function (byte, mode) {
            if (mode === TransferType.Command) {
                this.dcPin.low();
            }
            else {
                this.dcPin.high();
            }
            this.ssPin.low();
            for (var bit = 7; bit >= 0; bit--) {
                this.clkPin.low();
                if (byte & (1 << bit)) {
                    this.mosiPin.high();
                }
                else {
                    this.mosiPin.low();
                }
                this.clkPin.high();
            }
            this.ssPin.high();
        };
        Oled.prototype._readI2C = function (fn) {
            this.board.io.i2cReadOnce(this.ADDRESS, 1, function (data) {
                fn(data);
            });
        };
        Oled.prototype._waitUntilReady = function (callback) {
            var oled = this;
            var tick = function (callback) {
                oled._readI2C(function (byte) {
                    var busy = byte >> 7 & 1;
                    if (!busy) {
                        callback();
                    }
                    else {
                        console.log('I\'m busy!');
                        setTimeout(tick, 0);
                    }
                });
            };
            if (this.PROTOCOL === Protocol.I2C) {
                setTimeout(function () { tick(callback); }, 0);
            }
            else {
                callback();
            }
        };
        Oled.prototype.setCursor = function (x, y) {
            this.cursor_x = x;
            this.cursor_y = y;
        };
        Oled.prototype._invertColor = function (color) {
            return (color === 0) ? 1 : 0;
        };
        Oled.prototype.writeString = function (font, size, string, color, wrap, linespacing, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            var wordArr = string.split(' ');
            var len = wordArr.length;
            var offset = this.cursor_x;
            var padding = 0;
            var letspace = 1;
            var leading = linespacing || 2;
            for (var i = 0; i < len; i += 1) {
                if (i < len - 1)
                    wordArr[i] += ' ';
                var stringArr = wordArr[i].split('');
                var slen = stringArr.length;
                var compare = (font.width * size * slen) + (size * (len - 1));
                if (wrap && len > 1 && (offset >= (this.WIDTH - compare))) {
                    offset = 1;
                    this.cursor_y += (font.height * size) + size + leading;
                    this.setCursor(offset, this.cursor_y);
                }
                for (var i_1 = 0; i_1 < slen; i_1 += 1) {
                    var charBuf = this._findCharBuf(font, stringArr[i_1]);
                    var charBytes = this._readCharBytes(charBuf);
                    this._drawChar(font, charBytes, size, color, false);
                    this.fillRect(offset - padding, this.cursor_y, padding, (font.height * size), this._invertColor(color), false);
                    padding = (stringArr[i_1] === ' ') ? 0 : size + letspace;
                    offset += (font.width * size) + padding;
                    if (wrap && (offset >= (this.WIDTH - font.width - letspace))) {
                        offset = 1;
                        this.cursor_y += (font.height * size) + size + leading;
                    }
                    this.setCursor(offset, this.cursor_y);
                }
            }
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        Oled.prototype._drawChar = function (font, byteArray, size, color, sync) {
            var x = this.cursor_x;
            var y = this.cursor_y;
            var c = 0;
            var pagePos = 0;
            for (var i = 0; i < byteArray.length; i += 1) {
                pagePos = Math.floor(i / font.width) * 8;
                for (var j = 0; j < 8; j += 1) {
                    var pixelState = (byteArray[i][j] === 1) ? color : this._invertColor(color);
                    var xpos = void 0;
                    var ypos = void 0;
                    if (size === 1) {
                        xpos = x + c;
                        ypos = y + j + pagePos;
                        this.drawPixel([xpos, ypos, pixelState], false);
                    }
                    else {
                        xpos = x + (i * size);
                        ypos = y + (j * size);
                        this.fillRect(xpos, ypos, size, size, pixelState, false);
                    }
                }
                c = (c < font.width - 1) ? c += 1 : 0;
            }
        };
        Oled.prototype._readCharBytes = function (byteArray) {
            var bitArr = [];
            var bitCharArr = [];
            for (var i = 0; i < byteArray.length; i += 1) {
                var byte = byteArray[i];
                for (var j = 0; j < 8; j += 1) {
                    var bit = byte >> j & 1;
                    bitArr.push(bit);
                }
                bitCharArr.push(bitArr);
                bitArr = [];
            }
            return bitCharArr;
        };
        Oled.prototype._findCharBuf = function (font, c) {
            var charLength = Math.ceil((font.width * font.height) / 8);
            var cBufPos = font.lookup.indexOf(c) * charLength;
            return font.fontData.slice(cBufPos, cBufPos + charLength);
        };
        Oled.prototype.update = function () {
            var _this = this;
            this._waitUntilReady(function () {
                var displaySeq = [
                    Oled.COLUMN_ADDR,
                    _this.screenConfig.coloffset,
                    _this.screenConfig.coloffset + _this.WIDTH - 1,
                    Oled.PAGE_ADDR, 0, (_this.HEIGHT / 8) - 1
                ];
                var displaySeqLen = displaySeq.length;
                var bufferLen = _this.buffer.length;
                for (var i = 0; i < displaySeqLen; i += 1) {
                    _this._transfer(TransferType.Command, displaySeq[i]);
                }
                for (var i = 0; i < bufferLen; i += 1) {
                    _this._transfer(TransferType.Data, _this.buffer[i]);
                }
            });
            this.dirtyBytes = [];
        };
        Oled.prototype.updateDirty = function () {
            this._updateDirtyBytes(this.dirtyBytes);
        };
        Oled.prototype.dimDisplay = function (bool) {
            var contrast;
            if (bool) {
                contrast = 0;
            }
            else {
                contrast = 0xCF;
            }
            this._transfer(TransferType.Command, Oled.SET_CONTRAST);
            this._transfer(TransferType.Command, contrast);
        };
        Oled.prototype.turnOffDisplay = function () {
            this._transfer(TransferType.Command, Oled.DISPLAY_OFF);
        };
        Oled.prototype.turnOnDisplay = function () {
            this._transfer(TransferType.Command, Oled.DISPLAY_ON);
        };
        Oled.prototype.clearDisplay = function (sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
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
        };
        Oled.prototype.invertDisplay = function (bool) {
            if (bool) {
                this._transfer(TransferType.Command, Oled.INVERT_DISPLAY);
            }
            else {
                this._transfer(TransferType.Command, Oled.NORMAL_DISPLAY);
            }
        };
        Oled.prototype.drawBitmap = function (pixels, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            for (var i = 0; i < pixels.length; i++) {
                var x = Math.floor(i % this.WIDTH);
                var y = Math.floor(i / this.WIDTH);
                this.drawPixel([x, y, pixels[i]], false);
            }
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        Oled.prototype._isSinglePixel = function (pixels) {
            return typeof pixels[0] !== 'object';
        };
        Oled.prototype.drawPixel = function (pixels, sync) {
            var _this = this;
            var immed = (typeof sync === 'undefined') ? true : sync;
            if (this._isSinglePixel(pixels))
                pixels = [pixels];
            pixels.forEach(function (el) {
                var x = el[0], y = el[1], color = el[2];
                if (x > _this.WIDTH || y > _this.HEIGHT)
                    return;
                var byte = 0;
                var page = Math.floor(y / 8);
                var pageShift = 0x01 << (y - 8 * page);
                (page === 0) ? byte = x : byte = x + (_this.WIDTH * page);
                if (color === 0) {
                    _this.buffer[byte] &= ~pageShift;
                }
                else {
                    _this.buffer[byte] |= pageShift;
                }
                if (_this.dirtyBytes.indexOf(byte) === -1) {
                    _this.dirtyBytes.push(byte);
                }
            }, this);
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        Oled.prototype._updateDirtyBytes = function (byteArray) {
            var _this = this;
            var blen = byteArray.length;
            this._waitUntilReady(function () {
                var pageStart = Infinity;
                var pageEnd = 0;
                var colStart = Infinity;
                var colEnd = 0;
                var any = false;
                for (var i = 0; i < blen; i += 1) {
                    var b = byteArray[i];
                    if ((b >= 0) && (b < _this.buffer.length)) {
                        var page = b / _this.WIDTH | 0;
                        if (page < pageStart)
                            pageStart = page;
                        if (page > pageEnd)
                            pageEnd = page;
                        var col = b % _this.WIDTH;
                        if (col < colStart)
                            colStart = col;
                        if (col > colEnd)
                            colEnd = col;
                        any = true;
                    }
                }
                if (!any)
                    return;
                var displaySeq = [
                    Oled.COLUMN_ADDR, colStart, colEnd,
                    Oled.PAGE_ADDR, pageStart, pageEnd
                ];
                var displaySeqLen = displaySeq.length;
                for (var i = 0; i < displaySeqLen; i += 1) {
                    _this._transfer(TransferType.Command, displaySeq[i]);
                }
                for (var i = pageStart; i <= pageEnd; i += 1) {
                    for (var j = colStart; j <= colEnd; j += 1) {
                        _this._transfer(TransferType.Data, _this.buffer[_this.WIDTH * i + j]);
                    }
                }
            });
            this.dirtyBytes = [];
        };
        Oled.prototype.drawLine = function (x0, y0, x1, y1, color, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            var dx = Math.abs(x1 - x0);
            var sx = x0 < x1 ? 1 : -1;
            var dy = Math.abs(y1 - y0);
            var sy = y0 < y1 ? 1 : -1;
            var err = (dx > dy ? dx : -dy) / 2;
            while (true) {
                this.drawPixel([x0, y0, color], false);
                if (x0 === x1 && y0 === y1)
                    break;
                var e2 = err;
                if (e2 > -dx) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dy) {
                    err += dx;
                    y0 += sy;
                }
            }
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        Oled.prototype.drawRect = function (x, y, w, h, color, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            this.drawLine(x, y, x + w, y, color, false);
            this.drawLine(x, y + 1, x, y + h - 1, color, false);
            this.drawLine(x + w, y + 1, x + w, y + h - 1, color, false);
            this.drawLine(x, y + h - 1, x + w, y + h - 1, color, false);
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        ;
        Oled.prototype.drawQRCode = function (x, y, data, margin, sync) {
            if (margin === void 0) { margin = 4; }
            if (qr) {
                var immed = (typeof sync === 'undefined') ? true : sync;
                var matrix = qr.matrix(data);
                var pixels = matrix.flat();
                var bitmap = pixels.map(function (pixel) { return (pixel ? 0 : 1); });
                var width = Math.sqrt(pixels.length);
                this.fillRect(x, y, width + margin * 2, width + margin * 2, 1);
                for (var i = 0; i < bitmap.length; i++) {
                    var px = Math.floor(i % width);
                    var py = Math.floor(i / width);
                    px += margin + x;
                    py += margin + y;
                    this.drawPixel([px, py, bitmap[i]], false);
                }
                if (immed) {
                    this._updateDirtyBytes(this.dirtyBytes);
                }
            }
            else {
                console.log("Missing optional dependency: qr-image");
            }
        };
        Oled.prototype.fillRect = function (x, y, w, h, color, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            for (var i = x; i < x + w; i += 1) {
                this.drawLine(i, y, i, y + h - 1, color, false);
            }
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        Oled.prototype.drawCircle = function (x0, y0, r, color, sync) {
            var immed = (typeof sync === 'undefined') ? true : sync;
            var f = 1 - r;
            var ddF_x = 1;
            var ddF_y = -2 * r;
            var x = 0;
            var y = r;
            this.drawPixel([[x0, y0 + r, color],
                [x0, y0 - r, color],
                [x0 + r, y0, color],
                [x0 - r, y0, color]], false);
            while (x < y) {
                if (f >= 0) {
                    y--;
                    ddF_y += 2;
                    f += ddF_y;
                }
                x++;
                ddF_x += 2;
                f += ddF_x;
                this.drawPixel([[x0 + x, y0 + y, color],
                    [x0 - x, y0 + y, color],
                    [x0 + x, y0 - y, color],
                    [x0 - x, y0 - y, color],
                    [x0 + y, y0 + x, color],
                    [x0 - y, y0 + x, color],
                    [x0 + y, y0 - x, color],
                    [x0 - y, y0 - x, color]], false);
            }
            if (immed) {
                this._updateDirtyBytes(this.dirtyBytes);
            }
        };
        ;
        Oled.prototype.startScroll = function (dir, start, stop) {
            var _this = this;
            var cmdSeq = [];
            switch (dir) {
                case 'right':
                    cmdSeq.push(Oled.RIGHT_HORIZONTAL_SCROLL);
                    break;
                case 'left':
                    cmdSeq.push(Oled.LEFT_HORIZONTAL_SCROLL);
                    break;
                case 'left diagonal':
                    cmdSeq.push(Oled.SET_VERTICAL_SCROLL_AREA, 0x00, this.HEIGHT, Oled.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL, 0x00, start, 0x00, stop, 0x01, Oled.ACTIVATE_SCROLL);
                    break;
                case 'right diagonal':
                    cmdSeq.push(Oled.SET_VERTICAL_SCROLL_AREA, 0x00, this.HEIGHT, Oled.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL, 0x00, start, 0x00, stop, 0x01, Oled.ACTIVATE_SCROLL);
                    break;
            }
            this._waitUntilReady(function () {
                if (dir === 'right' || dir === 'left') {
                    cmdSeq.push(0x00, start, 0x00, stop, 0x00, 0xFF, Oled.ACTIVATE_SCROLL);
                }
                for (var i = 0; i < cmdSeq.length; i += 1) {
                    _this._transfer(TransferType.Command, cmdSeq[i]);
                }
            });
        };
        Oled.prototype.stopScroll = function () {
            this._transfer(TransferType.Command, Oled.DEACTIVATE_SCROLL);
        };
        return Oled;
    }()),
    _a.DISPLAY_OFF = 0xAE,
    _a.DISPLAY_ON = 0xAF,
    _a.SET_DISPLAY_CLOCK_DIV = 0xD5,
    _a.SET_MULTIPLEX = 0xA8,
    _a.SET_DISPLAY_OFFSET = 0xD3,
    _a.SET_START_LINE = 0x00,
    _a.CHARGE_PUMP = 0x8D,
    _a.EXTERNAL_VCC = false,
    _a.MEMORY_MODE = 0x20,
    _a.SEG_REMAP = 0xA1,
    _a.COM_SCAN_DEC = 0xC8,
    _a.COM_SCAN_INC = 0xC0,
    _a.SET_COM_PINS = 0xDA,
    _a.SET_CONTRAST = 0x81,
    _a.SET_PRECHARGE = 0xd9,
    _a.SET_VCOM_DETECT = 0xDB,
    _a.DISPLAY_ALL_ON_RESUME = 0xA4,
    _a.NORMAL_DISPLAY = 0xA6,
    _a.COLUMN_ADDR = 0x21,
    _a.PAGE_ADDR = 0x22,
    _a.INVERT_DISPLAY = 0xA7,
    _a.ACTIVATE_SCROLL = 0x2F,
    _a.DEACTIVATE_SCROLL = 0x2E,
    _a.SET_VERTICAL_SCROLL_AREA = 0xA3,
    _a.RIGHT_HORIZONTAL_SCROLL = 0x26,
    _a.LEFT_HORIZONTAL_SCROLL = 0x27,
    _a.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL = 0x29,
    _a.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL = 0x2A,
    _a);
