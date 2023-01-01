/// <reference types="node" />
/// <reference types="node" />
import { Board, Pin } from "johnny-five";
declare enum Protocol {
    I2C = 0,
    SPI = 1
}
declare enum TransferType {
    Command = 0,
    Data = 1
}
type Direction = 'left' | 'left diagonal' | 'right' | 'right diagonal';
type Black = 0x00;
type White = 0x01 | 0xff;
type Color = Black | White;
type Pixel = [number, number, Color];
interface OledOptions {
    height?: number;
    width?: number;
    address?: number;
    microview?: boolean;
    secondaryPin?: number;
    resetPin?: number;
    data?: number;
    command?: number;
}
interface Font {
    monospace: boolean;
    width: number;
    height: number;
    fontData: number[];
    lookup: string[];
}
interface ScreenConfig {
    multiplex: number;
    compins: number;
    coloffset: number;
}
interface SPIConfig {
    dcPin: number;
    ssPin: number;
    rstPin: number;
    clkPin: number;
    mosiPin: number;
}
declare const _default: {
    new (board: Board, five: any, opts: OledOptions): {
        readonly HEIGHT: number;
        readonly WIDTH: number;
        readonly ADDRESS: number;
        readonly PROTOCOL: Protocol;
        readonly MICROVIEW: boolean;
        readonly SECONDARYPIN: number;
        readonly RESETPIN: number;
        readonly DATA: number;
        readonly COMMAND: number;
        readonly board: Board;
        readonly five: any;
        readonly screenConfig: ScreenConfig;
        readonly SPIconfig: SPIConfig;
        dcPin: Pin;
        ssPin: Pin;
        clkPin: Pin;
        mosiPin: Pin;
        rstPin: Pin;
        buffer: Buffer;
        cursor_x: number;
        cursor_y: number;
        dirtyBytes: number[];
        _initialise(): void;
        _setUpSPI(): void;
        _setUpI2C(opts: OledOptions): void;
        _transfer(type: TransferType, val: number): void;
        _writeSPI(byte: number, mode: TransferType): void;
        _readI2C(fn: (data: number) => void): void;
        _waitUntilReady(callback: () => void): void;
        setCursor(x: number, y: number): void;
        _invertColor(color: Color): Color;
        writeString(font: Font, size: number, string: string, color: Color, wrap: boolean, linespacing: number | null, sync?: boolean): void;
        _drawChar(font: Font, byteArray: number[][], size: number, color: Color, sync?: boolean): void;
        _readCharBytes(byteArray: number[]): number[][];
        _findCharBuf(font: Font, c: string): number[];
        update(): void;
        updateDirty(): void;
        dimDisplay(bool: boolean): void;
        turnOffDisplay(): void;
        turnOnDisplay(): void;
        clearDisplay(sync?: boolean): void;
        invertDisplay(bool: boolean): void;
        drawBitmap(pixels: Color[], sync?: boolean): void;
        _isSinglePixel(pixels: Pixel | Pixel[]): pixels is Pixel;
        drawPixel(pixels: Pixel | Pixel[], sync?: boolean): void;
        _updateDirtyBytes(byteArray: number[]): void;
        drawLine(x0: number, y0: number, x1: number, y1: number, color: Color, sync?: boolean): void;
        drawRect(x: number, y: number, w: number, h: number, color: Color, sync?: boolean): void;
        fillRect(x: number, y: number, w: number, h: number, color: Color, sync?: boolean): void;
        drawCircle(x0: number, y0: number, r: number, color: Color, sync?: boolean): void;
        startScroll(dir: Direction, start: number, stop: number): void;
        stopScroll(): void;
    };
    readonly DISPLAY_OFF: number;
    readonly DISPLAY_ON: number;
    readonly SET_DISPLAY_CLOCK_DIV: number;
    readonly SET_MULTIPLEX: number;
    readonly SET_DISPLAY_OFFSET: number;
    readonly SET_START_LINE: number;
    readonly CHARGE_PUMP: number;
    readonly EXTERNAL_VCC: boolean;
    readonly MEMORY_MODE: number;
    readonly SEG_REMAP: number;
    readonly COM_SCAN_DEC: number;
    readonly COM_SCAN_INC: number;
    readonly SET_COM_PINS: number;
    readonly SET_CONTRAST: number;
    readonly SET_PRECHARGE: number;
    readonly SET_VCOM_DETECT: number;
    readonly DISPLAY_ALL_ON_RESUME: number;
    readonly NORMAL_DISPLAY: number;
    readonly COLUMN_ADDR: number;
    readonly PAGE_ADDR: number;
    readonly INVERT_DISPLAY: number;
    readonly ACTIVATE_SCROLL: number;
    readonly DEACTIVATE_SCROLL: number;
    readonly SET_VERTICAL_SCROLL_AREA: number;
    readonly RIGHT_HORIZONTAL_SCROLL: number;
    readonly LEFT_HORIZONTAL_SCROLL: number;
    readonly VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL: number;
    readonly VERTICAL_AND_LEFT_HORIZONTAL_SCROLL: number;
};
export = _default;
