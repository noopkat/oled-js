var five = require('johnny-five'),
    pngtolcd = require('png-to-lcd'),
    board = new five.Board(),
    Oled = require('../oled'),
    font = require('oled-font-5x7'),
    temporal = require('temporal');

// testing features
board.on('ready', function() {
  console.log('Connected to Arduino, ready.');

  // I2C va USB
  // var opts = {
  //   width: 128,
  //   height: 64, 
  //   address: 0x3D
  // };

  // SPI via USB
  // var opts = {
  //   width: 128,
  //   height: 64, 
  //   slavePin: 12
  // };

  // SPI Microview via USB
  var opts = {
    width: 64,
    height: 48, 
    microview: true
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
        oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true, 2);
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
        // create concenctric rectangle outlines
        oled.clearDisplay();

        //calc how many squares we can fit on the screen 
        var padding = 2;
        var square_count = ((oled.WIDTH / 2 ) / (padding * 2) ) - 1;

        for(var i = 0; i < square_count; i ++){
          var x =  ((i + 1) * padding);
          var y =  ((i + 1) * padding);
          var w = oled.WIDTH - (x * padding);
          var h = oled.HEIGHT - (y * padding);
          oled.drawRect(x, y, w, h, 1, false);
        }
        oled.update();
      }
    },
    {
      delay: 10000,
      task: function() {
        // create concenctric circle outlines
        oled.clearDisplay();

        var x = oled.WIDTH / 2;
        var y = oled.HEIGHT / 2;
        var radius = oled.HEIGHT - 1 

        //calc how many circles we can fit on the screen 
        var circle_count = radius / 3;

        for(var i = 0; i < circle_count; i++){
          var r = radius - (i * 3); 
          oled.drawCircle(x, y, r, 1, false);
        }
        oled.update();
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.clearDisplay();
        // display text
        oled.setCursor(0, 7);
        oled.writeString(font, 2, 'SCROLL!', 1, true, 1);
        oled.startScroll('left', 0, 6);
      }
    },
    {
      delay: 10000,
      task: function() {
        oled.stopScroll();
        oled.clearDisplay();
        oled.update();
        oled.setCursor(0, 7);
        oled.writeString(font, 2, 'DIAGONAL SCROLL', 1, true, 1);
        oled.startScroll('left diagonal', 0, 15);
      }
    }
  ]);
}
