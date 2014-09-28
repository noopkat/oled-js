var five = require('johnny-five'),
    pngparse = require('pngparse'),
    pngtolcd = require('png-to-lcd'),
    board = new five.Board(),
    Oled = require('../oled'),
    font = require('oled-font-5x7');

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
  //oled.stopscroll();

  // clear first just in case
  //oled.clearDisplay();
  //oled.update();

  // draw some test pixels in each corner limit
  oled.drawPixel([
    [128, 1, 1],
    [128, 32, 1],
    [128, 16, 1],
    [64, 16, 1]
  ]);
  // oled.update();

  //oled.dimDisplay(true);

  // // testing out my new module
  // pngtolcd(__dirname + '/images/cat.png', true, function(err, bitmapbuf) {
  //     oled.buffer = bitmapbuf;
  //     oled.update();
  // });
  
  // testing fonts
  //oled.buffer = [0x3E, 0x41, 0x41, 0x51, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7E, 0x11, 0x11, 0x11, 0x7E, 0x7F, 0x49, 0x49, 0x49, 0x36]; // G AB
  //oled.update();

  // var buf = new Buffer([0x41]);
  // oled._readByte(buf[0]);

  //oled.update();
  oled.setCursor(1, 17);
  //oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);
  //oled.writeString(font, 1, 'abcdefghijklmnopqrstuvwxyz', 1, true, false);
  //oled.setCursor(1, 13);
  //oled.writeString(font, 1, 'pigs', 1, true, true);
  //oled.update();

  //oled.altClearDisplay();

  // oled.fillRect(1, 1, 10, 20, 1);
  // oled.update();

  // oled.drawLine(1, 1, 128, 32, 1);
  // oled.drawLine(64, 16, 128, 16, 1);
  // oled.drawLine(1, 10, 40, 10, 1);
  // oled.drawLine(64, 0, 64, 32, 1);
  //oled.update();

  // /pass in an existing monochrome indexed image, then display
  // pngparse.parseFile(__dirname + '/bitmaps/parrot-index.png', function(err, image) {
  //   oled.drawBitmap(image.data);
  //   oled.update();
  // });

  // assign exisiting image buffer and display
  // oled.buffer = adafruitLogo;
  // oled.update();

  // dim the display
  //oled.dimDisplay(true);

  // invert display
  //oled.invertDisplay(true);

  // scroll right
  //oled.startscroll('left diagonal', 0x00, 0x0F);

  // clear display
  //oled.clearDisplay();
}