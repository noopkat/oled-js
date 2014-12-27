var five = require('johnny-five'),
    pngtolcd = require('png-to-lcd'),
    blendMicroIO = require('blend-micro-io'),
    Oled = require('../oled'),
    font = require('oled-font-5x7'),
    temporal = require('temporal');

var board = new five.Board({
  io: new blendMicroIO()
});

// testing features
board.on('ready', function() {
  console.log('Connected to Arduino, ready.');

  var opts = {
    width: 128,
    height: 64, 
    address: 0x3D
  };

  var oled = new Oled(board, five, opts); 

  test(oled);
});

// sequence of test displays
function test(oled) {

  // if it was already scrolling, stop
  oled.stopScroll();

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
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // display a bitmap
        pngtolcd(__dirname + '/images/cat-128x64.png', true, function(err, bitmapbuf) {
          oled.buffer = bitmapbuf;
          oled.update();
        });
        
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // display text
        oled.setCursor(0, 0);
        oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // draw some lines
        oled.drawLine(0, 0, 127, 31, 1);
        oled.drawLine(64, 16, 127, 16, 1);
        oled.drawLine(0, 10, 40, 10, 1);
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // draw a rectangle
        oled.fillRect(0, 0, 10, 20, 1);
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // display text
        oled.setCursor(0, 7);
        oled.writeString(font, 2, 'SCROLL!', 1, true);
        oled.startScroll('left', 0, 6);
      }
    }
  ]);
}