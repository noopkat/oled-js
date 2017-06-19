// test deps
var test = require('tape');
var td = require('testdouble');

// require and stub oled.js
var oledjs = require('../../oled.js');
oledjs.prototype._setUpI2C = td.function();
oledjs.prototype._transfer = td.function();

// require and stub johnny-five
var five = td.function();
var board = new td.constructor();

// import framebuffer snapshots
var drawPixelBuffer = require('../buffers/drawPixel');

test('drawPixel outputs correct buffer', function (t) {
  t.plan(1);
      
  var options = {
    width: 128,
    height: 64, 
    address: 0x3D
  };

  var oled = new oledjs(board, five, options);

  oled.drawPixel([
    [127, 0, 1],
    [127, 31, 1],
    [127, 16, 1],
    [64, 16, 1]
  ], false);

  t.ok(oled.buffer.equals(Buffer.from(drawPixelBuffer)));
});
