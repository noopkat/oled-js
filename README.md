johnny-five-oled-example
========================

sending ze buffers over I2C

(Currently a work in progress)

1. `npm install johnny-five`
2. Upload standard firmata lib to an Arduino of choice
3. hook up I2C compatible oled to the Arduino  
(A4 -> SDL, A5 -> SCL if using an Uno, look up your board if not Uno)
4. `node index.js` (just a demo right now)

Todo list:
+ ~~display~~
+ ~~clearDisplay~~
+ ~~dimDisplay~~
+ ~~drawPixel~~
+ drawLine
+ drawCircle
+ drawRectangle
+ ~~drawBitmap~~
+ scrollLeft
+ scrollRight
+ writeText