johnny-five-oled
========================

(currently a work in progress)

## What is this?

This repo is a library compatible with Rick Waldron's [johnny-five](https://github.com/rwaldron/johnny-five) project. It adds support for I2C compatible monochrome OLED screens. Works with all sized screens, of the SSD1306 OLED/PLED Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf)).

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
  
  var oled = new Oled(board, 128, 32, 0x3C); // args: (board, width, height, I2C address)
  // do cool oled things here
});
    
```

## Available methods

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

### invertDisplay
Inverts the pixels on the display. Black becomes white, white becomes black. This method takes one argument, a boolean. True for inverted state, false to restore normal pixel colors. Calling update() afterwards is not required.

Usage:
```javascript
oled.invertDisplay(true|false);
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
Draws a one pixel wide line.

Arguments:
+ int **x0, y0** - start location of line
+ int **x1, y1** - end location of line
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Call update() when done.

Usage:
```javascript
// args: (x0, y0, x1, y1, color)
oled.drawLine(1, 1, 128, 32, 1); 
oled.update();
```

### fillRect
Draws a filled rectangle.

Arguments:
+ int **x0, y0** - top left corner of rectangle
+ int **x1, y1** - bottom right corner of rectangle
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Call update() when done.

Usage:
```javascript
// args: (x0, y0, x1, y1, color)
oled.fillRect(1, 1, 10, 20, 1);
oled.update();
```

### drawBitmap
Draws a bitmap using raw pixel data returned from an image parser. The image sourced must be monochrome, and indexed to only 2 colors. Using an image editor or ImageMagick might be required.

Tip: use a NodeJS image parser to get the pixel data, such as [pngparse](https://www.npmjs.org/package/pngparse). A demonstration of using this is below.


Example usage:
```
npm install pngparse
```

```javascript
var pngparse = require('pngparse');

pngparse.parseFile('indexed_file.png', function(err, image) {
	oled.drawBitmap(image.data);
	oled.update();
});
```

This method is provided as a primitive convenience. A better way to display images is to use NodeJS package [png-to-lcd](https://www.npmjs.org/package/png-to-lcd) instead. It's just as easy to use at drawBitmap, but is compatible with all image depths (lazy is good!). This alternative method is covered further down in this documentation.

### startScroll
Scrolls the current display either left or right.
Arguments:
+ string **direction** - direction of scrolling. 'left' or 'right'
+ hex **start** - starting row of scrolling area
+ hex **stop** - end row of scrolling area

TODO: accept decimal instead of hex

Usage:
```javascript
// args: (direction, start, stop)
oled.startscroll('left', 0x00, 0x0F);
```

### stopScroll
Stops all current scrolling behaviour.

Usage:
```javascript
oled.stopscroll();
```

### setCursor
Sets the x and y position of 'cursor', when about to write text. This effectively helps tell the display where to start typing when writeString() method is called.

Call setCursor just before writeString().

Usage:
```javascript
// sets cursor to x = 1, y = 1
oled.setCursor(1, 1);
```

### writeString
Writes a string of text to the display.  
Call setCursor() just before, if you need to set starting text position.

Arguments:
+ obj **font** - font object in JSON format (see note below on sourcing a font)
+ int **size** - font size, as multiplier. Eg. 2 would double size, 3 would triple etc.
+ string **text** - the actual text you want to show on the display.
+ int **color** - color of text. Can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.
+ bool **wrapping** - true applies word wrapping at the screen limit, false for no wrapping. If a long string without spaces is supplied as the text, just letter wrapping will apply instead.

Before all of this text can happen, you need to load a font buffer for use. A good font to start with is NodeJS package [oled-font-5x7](https://www.npmjs.org/package/oled-font-5x7).

Usage:
```
npm install oled-font-5x7
```

```javascript
var font = require('oled-font-5x7');

// sets cursor to x = 1, y = 1
oled.setCursor(1, 1);
oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);
```

## Displaying images - the better way
TODO.  
Something something `npm install png-to-lcd`