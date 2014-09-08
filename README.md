johnny-five-oled-example
========================

sending ze buffers over I2C

(Currently a work in progress)

1. `npm install johnny-five`
2. hook up I2C compatible oled to an Arduino  
(A4 -> SDL, A5 -> SCL if using an Uno, look up your board if not Uno)
3. `node index.js` (just a demo right now)

Todo list:
+ ~~display~~
+ ~~clearDisplay~~
+ drawPixel
+ drawLine
+ drawCircle
+ drawRectangle
+ drawBitmap
+ scrollLeft
+ scrollRight
+ writeText