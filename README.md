johnny-five-oled
========================

(currently a work in progress)

## What is this?

This repo is a library compatible with Rick Waldron's [johnny-five](https://github.com/rwaldron/johnny-five) project. It adds support for I2C compatible OLED screens. It works with all sized screens, of the SSD1306 OLED/PLED Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf)).

## Install 

1. `git clone`
2. `npm install`
3. Upload standard firmata lib to an Arduino of choice
4. hook up I2C compatible oled to the Arduino  
(A4 -> SDL, A5 -> SCL if using an Uno, look up your board if not Uno)
5. `node tests/not-real-test.js` (just a demo right now)

## Example

```javascript
var five = require('johnny-five'),
    board = new five.Board(),
    Oled = require('johnny-five-oled');
    
board.on('ready', function() {
  console.log('Connected to Arduino, ready.');
  var oled = new Oled(board, 128, 32, 0x3C); // args: board, width, height, I2C address
  // do cool oled things here
});
    
```

## Methods

### update
Sends the entire buffer in its current state to the oled display, effectively syncing the two.

Usage:
```javascript
oled.update();
```

### clearDisplay
Fills the buffer with 'off' pixels (0x00). You'll need to call update() after this to send the buffer content update to the display.

Usage:
```javascript
oled.clearDisplay();
oled.update();
```

### dimDisplay
Lowers the contrast on the display. This method takes one argument, a boolean. True for dimming, false to restore normal contrast. Calling update() afterwards is not required.

Usage:
```javascript
oled.dimDisplay(true|false);
```

### turnOffDisplay
Turns the display off. Calling update() afterwards is not required.

Usage:
```javascript
oled.turnOffDisplay();
```

### turnOnDisplay
Turns the display on. Calling update() afterwards is not required.

Usage:
```javascript
oled.turnOnDisplay();
```


### drawPixel
Draws a pixel at a specified position on the display. This method takes one argument: a multi-dimensional array containing either one or more sets of pixels. 

Each pixel needs an x position, a y position, and a color. Colors can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Call update() when done.

Usage:
```javascript
// draws 4 white pixels total
// format: [x, y, color]
oled.drawPixel([
	[128, 1, 1],
	[128, 32, 1],
	[128, 16, 1],
	[64, 16, 1]
]);
oled.update();
```

### drawLine
TODO

### fillRect
TODO

### drawBitmap
TODO

### startScroll
TODO

### stopScroll
TODO

### setCursor
TODO

### writeString
TODO

## Features to implement
+ ~~display~~
+ ~~clearDisplay~~
+ ~~turnOffDisplay~~
+ ~~turnOnDisplay~~
+ ~~dimDisplay~~
+ ~~drawPixel~~
+ ~~drawLine~~
+ ?drawCircle
+ ~~drawRectangle~~
+ ~~drawBitmap~~
+ ~~scrollLeft~~
+ ~~scrollRight~~
+ ~~writeText~~