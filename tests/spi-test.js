// nb: do not use this demo file right now, it's for testing SPI

var five = require('johnny-five'),
    pngtolcd = require('png-to-lcd'),
    board = new five.Board(),
    Oled = require('../oled'),
    font = require('oled-font-5x7'),
    temporal = require('temporal');

// testing features
board.on('ready', function() {
  console.log('Connected to Arduino, ready.');

  // passing in board as a temp strategy.
  //var oled = new Oled(board, 128, 32, 0x3C, 'I2C'); // 128x32
  //var oled = new Oled(board, 128, 64, 0x3D, 'I2C'); // 128x64
  var oled = new Oled(five, 128, 64, 12, 'SPI');

  test(oled);
});

// sequence of test displays
function test(oled) {

  // if it was already scrolling, stop
  oled.stopscroll();

  oled.clearDisplay();

  // clear first just in case
  oled.update();

  // make it prettier 
  oled.dimDisplay(true);

  temporal.queue([
    {
      delay: 100,
      task: function() {
        // draw some test pixels
        oled.drawPixel([
          [127, 0, 1],
          [127, 31, 1],
          [127, 16, 1],
          [64, 16, 1]
        ]);
      }
    },
    {
      delay: 3000,
      task: function() {
        oled.clearDisplay();
        // display a bitmap
        pngtolcd(__dirname + '/images/cat.png', true, function(err, bitmapbuf) {
          oled.buffer = bitmapbuf;
          oled.update();
        });
        
      }
    },
    {
      delay: 3000,
      task: function() {
        oled.clearDisplay();
        // display text
        oled.setCursor(0, 0);
        oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);
      }
    },
    {
      delay: 3000,
      task: function() {
        oled.clearDisplay();
        // draw some lines
        oled.drawLine(0, 0, 127, 31, 1);
        oled.drawLine(64, 16, 127, 16, 1);
        oled.drawLine(0, 10, 40, 10, 1);
      }
    },
    {
      delay: 3000,
      task: function() {
        oled.clearDisplay();
        // draw a rectangle
        oled.fillRect(0, 0, 10, 20, 1);
      }
    },
    {
      delay: 3000,
      task: function() {
        oled.clearDisplay();
        // display text
        oled.setCursor(0, 7);
        oled.writeString(font, 2, 'SCROLL!', 1, true);
        oled.startscroll('right', 0, 3);
      }
    }
  ]);
}