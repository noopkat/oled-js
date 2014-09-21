var five = require('johnny-five'),
    pngparse = require('pngparse'),
    pngtolcd = require('png-to-lcd'),
    board = new five.Board(),
    Oled = require('../oled');

// testing features
board.on('ready', function() {
  console.log('Connected to Arduino, ready.');

  // passing in board as a temp strategy.
  var oled = new Oled(board, 128, 32, 0x3C);
  test(oled);
});

// sequence of test displays
function test(oled) {
  // create new oled instance
  oled.stopscroll();

  // clear first just in case
  oled.clearDisplay();
  oled.display();

  // draw some test pixels in each corner limit
  // oled.drawPixel([
  //   [128, 1, 'WHITE'],
  //   [128, 32, 'WHITE'],
  //   [128, 16, 'WHITE'],
  //   [64, 16, 'WHITE']
  // ]);
  // oled.display();

  oled.dimDisplay(true);

  // // testing out my new module
  pngtolcd(__dirname + '/bitmaps/cat.png', true, function(err, bitmapbuf) {
      oled.buffer = bitmapbuf;
      oled.display();
  });

  // oled.drawLine(1, 1, 128, 32);
  // oled.drawLine(64, 16, 128, 16);
  // oled.drawLine(1, 10, 40, 10);
  // oled.drawLine(64, 0, 64, 32);
  // oled.display();

  // /pass in an existing monochrome indexed image, then display
  // pngparse.parseFile(__dirname + '/bitmaps/parrot-index.png', function(err, image) {
  //   oled.drawBitmap(image.data);
  //   oled.display();
  // });

  // assign exisiting image buffer and display
  // oled.buffer = adafruitLogo;
  // oled.display();

  // dim the display
  //oled.dimDisplay(true);

  // invert display
  //oled.invertDisplay(true);

  // scroll right
  //oled.startscrollright(0x00, 0x0F);

  // clear display
  //oled.clearDisplay();
}