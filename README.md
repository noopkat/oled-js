johnny-five-oled-example
========================

(currently a work in progress)

sending ze buffers over I2C

works with all sizes of SSD1306 OLED/PLED Segment/Common Driver with Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf))

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
+ ?drawRectangle
+ ~~drawBitmap~~
+ scrollLeft
+ scrollRight
+ writeText