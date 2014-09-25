johnny-five-oled
========================

(currently a work in progress)

## What is this?

This repo is a library compatible with Rick Waldron's johnny-five project. It adds support for I2C compatible OLED screens. It works with all sized screens, of the SSD1306 OLED/PLED Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf)).

## Install 

1. `git clone`
2. `npm install`
3. Upload standard firmata lib to an Arduino of choice
4. hook up I2C compatible oled to the Arduino  
(A4 -> SDL, A5 -> SCL if using an Uno, look up your board if not Uno)
5. `node tests/not-real-test.js` (just a demo right now)

Todo list:
+ ~~display~~
+ ~~clearDisplay~~
+ ~~dimDisplay~~
+ ~~drawPixel~~
+ ~~drawLine~~
+ ?drawCircle
+ ~~drawRectangle~~
+ ~~drawBitmap~~
+ ~~scrollLeft~~
+ ~~scrollRight~~
+ ~~writeText~~