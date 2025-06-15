import Color from "./Color.js";
import { ComponentDefinition, Converters, FormattingOptions, Name, RGBA, XYZA } from "./types";
import { createSpaceConverter, D50, multiplyMatrices } from "./utils";

/**
 * A collection of named colors and their RGBA values.
 *
 * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
 */
export const namedColors = {
    aliceblue: [240, 248, 255],
    antiquewhite: [250, 235, 215],
    aqua: [0, 255, 255],
    aquamarine: [127, 255, 212],
    azure: [240, 255, 255],
    beige: [245, 245, 220],
    bisque: [255, 228, 196],
    black: [0, 0, 0],
    blanchedalmond: [255, 235, 205],
    blue: [0, 0, 255],
    blueviolet: [138, 43, 226],
    brown: [165, 42, 42],
    burlywood: [222, 184, 135],
    cadetblue: [95, 158, 160],
    chartreuse: [127, 255, 0],
    chocolate: [210, 105, 30],
    coral: [255, 127, 80],
    cornflowerblue: [100, 149, 237],
    cornsilk: [255, 248, 220],
    crimson: [220, 20, 60],
    cyan: [0, 255, 255],
    darkblue: [0, 0, 139],
    darkcyan: [0, 139, 139],
    darkgoldenrod: [184, 134, 11],
    darkgray: [169, 169, 169],
    darkgreen: [0, 100, 0],
    darkgrey: [169, 169, 169],
    darkkhaki: [189, 183, 107],
    darkmagenta: [139, 0, 139],
    darkolivegreen: [85, 107, 47],
    darkorange: [255, 140, 0],
    darkorchid: [153, 50, 204],
    darkred: [139, 0, 0],
    darksalmon: [233, 150, 122],
    darkseagreen: [143, 188, 143],
    darkslateblue: [72, 61, 139],
    darkslategray: [47, 79, 79],
    darkslategrey: [47, 79, 79],
    darkturquoise: [0, 206, 209],
    darkviolet: [148, 0, 211],
    deeppink: [255, 20, 147],
    deepskyblue: [0, 191, 255],
    dimgray: [105, 105, 105],
    dimgrey: [105, 105, 105],
    dodgerblue: [30, 144, 255],
    firebrick: [178, 34, 34],
    floralwhite: [255, 250, 240],
    forestgreen: [34, 139, 34],
    fuchsia: [255, 0, 255],
    gainsboro: [220, 220, 220],
    ghostwhite: [248, 248, 255],
    gold: [255, 215, 0],
    goldenrod: [218, 165, 32],
    gray: [128, 128, 128],
    green: [0, 128, 0],
    greenyellow: [173, 255, 47],
    grey: [128, 128, 128],
    honeydew: [240, 255, 240],
    hotpink: [255, 105, 180],
    indianred: [205, 92, 92],
    indigo: [75, 0, 130],
    ivory: [255, 255, 240],
    khaki: [240, 230, 140],
    lavender: [230, 230, 250],
    lavenderblush: [255, 240, 245],
    lawngreen: [124, 252, 0],
    lemonchiffon: [255, 250, 205],
    lightblue: [173, 216, 230],
    lightcoral: [240, 128, 128],
    lightcyan: [224, 255, 255],
    lightgoldenrodyellow: [250, 250, 210],
    lightgray: [211, 211, 211],
    lightgreen: [144, 238, 144],
    lightgrey: [211, 211, 211],
    lightpink: [255, 182, 193],
    lightsalmon: [255, 160, 122],
    lightseagreen: [32, 178, 170],
    lightskyblue: [135, 206, 250],
    lightslategray: [119, 136, 153],
    lightslategrey: [119, 136, 153],
    lightsteelblue: [176, 196, 222],
    lightyellow: [255, 255, 224],
    lime: [0, 255, 0],
    limegreen: [50, 205, 50],
    linen: [250, 240, 230],
    magenta: [255, 0, 255],
    maroon: [128, 0, 0],
    mediumaquamarine: [102, 205, 170],
    mediumblue: [0, 0, 205],
    mediumorchid: [186, 85, 211],
    mediumpurple: [147, 112, 219],
    mediumseagreen: [60, 179, 113],
    mediumslateblue: [123, 104, 238],
    mediumspringgreen: [0, 250, 154],
    mediumturquoise: [72, 209, 204],
    mediumvioletred: [199, 21, 133],
    midnightblue: [25, 25, 112],
    mintcream: [245, 255, 250],
    mistyrose: [255, 228, 225],
    moccasin: [255, 228, 181],
    navajowhite: [255, 222, 173],
    navy: [0, 0, 128],
    oldlace: [253, 245, 230],
    olive: [128, 128, 0],
    olivedrab: [107, 142, 35],
    orange: [255, 165, 0],
    orangered: [255, 69, 0],
    orchid: [218, 112, 214],
    palegoldenrod: [238, 232, 170],
    palegreen: [152, 251, 152],
    paleturquoise: [175, 238, 238],
    palevioletred: [219, 112, 147],
    papayawhip: [255, 239, 213],
    peachpuff: [255, 218, 185],
    peru: [205, 133, 63],
    pink: [255, 192, 203],
    plum: [221, 160, 221],
    powderblue: [176, 224, 230],
    purple: [128, 0, 128],
    rebeccapurple: [102, 51, 153],
    red: [255, 0, 0],
    rosybrown: [188, 143, 143],
    royalblue: [65, 105, 225],
    saddlebrown: [139, 69, 19],
    salmon: [250, 128, 114],
    sandybrown: [244, 164, 96],
    seagreen: [46, 139, 87],
    seashell: [255, 245, 238],
    sienna: [160, 82, 45],
    silver: [192, 192, 192],
    skyblue: [135, 206, 235],
    slateblue: [106, 90, 205],
    slategray: [112, 128, 144],
    slategrey: [112, 128, 144],
    snow: [255, 250, 250],
    springgreen: [0, 255, 127],
    steelblue: [70, 130, 180],
    tan: [210, 180, 140],
    teal: [0, 128, 128],
    thistle: [216, 191, 216],
    tomato: [255, 99, 71],
    transparent: [0, 0, 0, 0],
    turquoise: [64, 224, 208],
    violet: [238, 130, 238],
    wheat: [245, 222, 179],
    white: [255, 255, 255],
    whitesmoke: [245, 245, 245],
    yellow: [255, 255, 0],
    yellowgreen: [154, 205, 50],
} satisfies { [named: string]: RGBA };

/**
 * A collection of color format converters and utilities for handling various color spaces.
 *
 * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
 */
export const formatConverters = (() => {
    const toLRGB = (value: number) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    const toSRGB = (value: number) => {
        const v = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
        return v * 255;
    };

    const hslToSRGB = (H: number, S: number, L: number) => {
        S /= 100;
        L /= 100;
        const f = (n: number) => {
            const k = (n + H / 30) % 12;
            const a = S * Math.min(L, 1 - L);
            return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [f(0), f(8), f(4)];
    };

    const converters = {
        rgb: {
            pattern:
                /^rgba?\(\s*(-?\d*\.?\d+%?)\s*[,\s]+\s*(-?\d*\.?\d+%?)\s*[,\s]+\s*(-?\d*\.?\d+%?)\s*(?:[,/]\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: "srgb",

            components: {
                r: { index: 0, min: 0, max: 255, precision: 0 },
                g: { index: 1, min: 0, max: 255, precision: 0 },
                b: { index: 2, min: 0, max: 255, precision: 0 },
            },

            toComponents: (str: string) => {
                const convert = (val: string) =>
                    val.toLowerCase() === "none"
                        ? 0
                        : Math.round(val.includes("%") ? (parseFloat(val) / 100) * 255 : parseFloat(val));

                const match = str.match(/(\d*\.?\d+%?|none)/gi);
                if (!match || match.length < 3) throw new Error(`Invalid RGB color format: ${str}`);

                const [r, g, b] = match.slice(0, 3).map(convert);

                const a =
                    match[3] != null
                        ? match[3].toLowerCase() === "none"
                            ? 1
                            : match[3].includes("%")
                              ? parseFloat(match[3]) / 100
                              : parseFloat(match[3])
                        : 1;

                return [r, g, b, a];
            },

            fromComponents: ([r, g, b, a = 1]: number[], options?: FormattingOptions) => {
                if (options?.modern) {
                    return a === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${Math.round(a * 100)}%)`;
                }
                return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA): number[] => {
                const M = [
                    [12831 / 3959, -329 / 214, -1974 / 3959],
                    [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
                    [705 / 12673, -2585 / 12673, 705 / 667],
                ];
                const [lr, lg, lb] = multiplyMatrices(M, [X, Y, Z]);
                return [toSRGB(lr), toSRGB(lg), toSRGB(lb), alpha];
            },

            toXYZA: ([R, G, B, alpha = 1]: number[]): XYZA => {
                const M = [
                    [506752 / 1228815, 87881 / 245763, 12673 / 70218],
                    [87098 / 409605, 175762 / 245763, 12673 / 175545],
                    [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
                ];
                const [X, Y, Z] = multiplyMatrices(M, [toLRGB(R), toLRGB(G), toLRGB(B)]);
                return [X, Y, Z, alpha];
            },
        },

        named: {
            pattern: new RegExp(`^\\b(${Object.keys(namedColors).join("|")})\\b$`, "i"),

            toXYZA: (name: string): XYZA => {
                const key = name.replace(/[\s-]/g, "").toLowerCase() as Name;
                const rgb = namedColors[key];
                if (!rgb) throw new Error(`Invalid named color: ${name}`);
                return converters.rgb.toXYZA([...rgb, rgb[3] ?? 1]);
            },

            fromXYZA: (xyza: XYZA): string | "undefined" => {
                const [r, g, b, a] = converters.rgb
                    .fromXYZA(xyza)
                    .map((v, i) => (i < 3 ? Math.round(Math.min(255, Math.max(0, v))) : v));
                for (const [name, [nr, ng, nb, na = 1]] of Object.entries(namedColors)) {
                    if (r === nr && g === ng && b === nb && a === na) return name;
                }
                return "undefined";
            },
        },

        hex: {
            pattern: /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})\b$/,

            toXYZA: (str: string): XYZA => {
                const HEX = str.slice(1);
                if (!converters.hex.pattern.test(str)) throw new Error(`Invalid HEX color format: ${str}`);

                const expand = (c: string) => parseInt(c.length === 1 ? c + c : c, 16);

                const [r, g, b, a = 255] =
                    HEX.length <= 4
                        ? HEX.split("").map(expand)
                        : [HEX.slice(0, 2), HEX.slice(2, 4), HEX.slice(4, 6), HEX.slice(6, 8)].map((c) =>
                              parseInt(c || "ff", 16)
                          );

                const [X, Y, Z] = converters.rgb.toXYZA([r, g, b]);
                return [X, Y, Z, a / 255];
            },

            fromXYZA: (xyza: XYZA) => {
                const [r, g, b, a = 1] = converters.rgb.fromXYZA(xyza);
                const toHex = (v: number) => v.toString(16).padStart(2, "0");
                const hex = [r, g, b].map((v) => toHex(Math.round(Math.max(0, Math.min(255, v))))).join("");
                return `#${hex}${a < 1 ? toHex(Math.round(a * 255)) : ""}`.toUpperCase();
            },
        },

        hsl: {
            pattern:
                /^hsla?\(\s*(-?\d*\.?\d+(?:deg|rad|grad|turn)?)\s*[,\s]+\s*(-?\d*\.?\d+%?)\s*[,\s]+\s*(-?\d*\.?\d+%?)\s*(?:[,/]\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: "srgb",

            components: {
                h: { index: 0, min: 0, max: 360, loop: true, precision: 0 },
                s: { index: 1, min: 0, max: 100, precision: 1 },
                l: { index: 2, min: 0, max: 100, precision: 1 },
            },

            toComponents: (str: string): number[] => {
                const parseAlpha = (val: string) =>
                    val.trim().toLowerCase() === "none"
                        ? 1
                        : val.endsWith("%")
                          ? parseFloat(val) / 100
                          : parseFloat(val);

                const clean = str.replace(/^[^(]+\(|\)$/g, "").trim();
                const [main, aStr] = clean.split("/").map((s) => s.trim());
                const parts = main.split(/[\s,]+/);
                const alpha = aStr ? parseAlpha(aStr) : parts.length === 4 ? parseAlpha(parts.pop()!) : 1;

                if (parts.length < 3) throw new Error(`Invalid HSL(A) format: ${str}`);

                const h = parseFloat((parts[0].toLowerCase() === "none" ? "0" : parts[0]).replace(/deg$/i, ""));
                const s = parseFloat((parts[1].toLowerCase() === "none" ? "0" : parts[1]).replace("%", ""));
                const l = parseFloat((parts[2].toLowerCase() === "none" ? "0" : parts[2]).replace("%", ""));
                return [h, s, l, alpha];
            },

            fromComponents: ([h, s, l, a = 1]: number[], options: FormattingOptions = { modern: false }) => {
                if (options.modern) {
                    return a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${Math.round(a * 100)}%)`;
                }
                return a === 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`;
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const [R, G, B] = converters.rgb.fromXYZA([X, Y, Z, alpha]).map((c) => c / 255);
                const max = Math.max(R, G, B);
                const min = Math.min(R, G, B);
                let [H, S] = [0, 0];
                const L = (min + max) / 2;
                const d = max - min;

                if (d !== 0) {
                    S = L === 0 || L === 1 ? 0 : (max - L) / Math.min(L, 1 - L);

                    switch (max) {
                        case R:
                            H = (G - B) / d + (G < B ? 6 : 0);
                            break;
                        case G:
                            H = (B - R) / d + 2;
                            break;
                        case B:
                            H = (R - G) / d + 4;
                    }

                    H = H * 60;
                }

                let h = Math.round(H);
                let s = Math.round(S * 100);
                const l = Math.round(L * 100);

                if (s < 0) {
                    h += 180;
                    s = Math.abs(s);
                }
                if (h >= 360) h -= 360;
                if (l === 0) s = 0;
                if (S === 0 || l === 0) h = 0;
                return [h, s, l, alpha];
            },

            toXYZA: ([h, s, l, a = 1]: number[]): XYZA => {
                const [r, g, b] = hslToSRGB(h, s, l).map((c) => c * 255);
                const [x, y, z] = converters.rgb.toXYZA([r, g, b, a]);
                return [x, y, z, a];
            },
        },

        hwb: {
            pattern:
                /^hwb\(\s*(-?\d*\.?\d+(?:deg|rad|grad|turn)?)\s+(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s*(?:\/\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: "srgb",

            components: {
                h: { index: 0, min: 0, max: 360, loop: true, precision: 3 },
                w: { index: 1, min: 0, max: 100, precision: 3 },
                b: { index: 2, min: 0, max: 100, precision: 3 },
            },

            toComponents: (str: string) => {
                const parseAlpha = (v: string) =>
                    v.trim().toLowerCase() === "none" ? 1 : v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);

                const clean = str.replace(/^[^(]+\(|\)$/g, "").trim();
                const [main, aStr] = clean.split("/").map((s) => s.trim());
                const parts = main.split(/[\s,]+/);
                const alpha = aStr ? parseAlpha(aStr) : parts.length === 4 ? parseAlpha(parts.pop()!) : 1;

                if (parts.length < 3) throw new Error(`Invalid HWB format: ${str}`);

                const h = parseFloat((parts[0].toLowerCase() === "none" ? "0" : parts[0]).replace(/deg$/i, ""));
                const w = parseFloat((parts[1].toLowerCase() === "none" ? "0" : parts[1]).replace("%", ""));
                const b = parseFloat((parts[2].toLowerCase() === "none" ? "0" : parts[2]).replace("%", ""));
                return [h, w, b, alpha];
            },

            fromComponents: ([h, w, bl, a = 1]: number[]) => {
                return `hwb(${Math.round(h)} ${Math.round(w)}% ${Math.round(bl)}%${a < 1 ? ` / ${a}` : ""})`;
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const sRGBToHue = (red: number, green: number, blue: number) => {
                    const max = Math.max(red, green, blue);
                    const min = Math.min(red, green, blue);
                    let hue = 0;
                    const d = max - min;
                    if (d !== 0) {
                        switch (max) {
                            case red:
                                hue = (green - blue) / d + (green < blue ? 6 : 0);
                                break;
                            case green:
                                hue = (blue - red) / d + 2;
                                break;
                            case blue:
                                hue = (red - green) / d + 4;
                        }

                        hue *= 60;
                    }
                    return hue >= 360 ? hue - 360 : hue;
                };
                const [sR, sG, sB] = converters.rgb.fromXYZA([X, Y, Z]).map((c) => c / 255);
                const hue = sRGBToHue(sR, sG, sB);
                const white = Math.min(sR, sG, sB);
                const black = 1 - Math.max(sR, sG, sB);
                return [Math.round(hue), Math.round(white * 100), Math.round(black * 100), alpha];
            },

            toXYZA: ([H, W, B, alpha = 1]: number[]): XYZA => {
                W /= 100;
                B /= 100;
                if (W + B >= 1) {
                    const gray = W / (W + B);
                    return [gray, gray, gray];
                }
                const RGB = hslToSRGB(H, 100, 50);
                for (let i = 0; i < 3; i++) {
                    RGB[i] *= 1 - W - B;
                    RGB[i] += W;
                }
                return converters.rgb.toXYZA([...RGB.map((c) => c * 255), alpha]);
            },
        },

        lab: {
            pattern: /^lab\(\s*(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s*(?:\/\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: null,

            components: {
                l: { index: 0, min: 0, max: 100, precision: 5 },
                a: { index: 1, min: -125, max: 125, precision: 5 },
                b: { index: 2, min: -125, max: 125, precision: 5 },
            },

            toComponents: (str: string) => {
                const match = str.match(converters.lab.pattern);
                if (!match) throw new Error(`Invalid LAB color format: ${str}`);

                const parse = (v: string, isL = false) =>
                    v === "none" ? 0 : v.endsWith("%") ? (parseFloat(v) / 100) * (isL ? 100 : 125) : parseFloat(v);

                const [L, A, B] = [parse(match[1], true), parse(match[2]), parse(match[3])];

                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;

                return [L, A, B, alpha];
            },

            fromComponents: ([L, A, B, alpha = 1]: number[]) => {
                const { l, a, b } = converters.lab.components;
                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
                return `lab(${L.toFixed(l.precision)}% ${A.toFixed(a.precision)} ${B.toFixed(b.precision)}${alphaStr})`;
            },

            toXYZA: ([L, a, b, alpha = 1]: number[]): XYZA => {
                const κ = 24389 / 27;
                const ε = 216 / 24389;
                const fy = (L + 16) / 116;
                const fx = a / 500 + fy;
                const fz = fy - b / 200;
                const xyz = [
                    Math.pow(fx, 3) > ε ? Math.pow(fx, 3) : (116 * fx - 16) / κ,
                    L > κ * ε ? Math.pow(fy, 3) : L / κ,
                    Math.pow(fz, 3) > ε ? Math.pow(fz, 3) : (116 * fz - 16) / κ,
                ];
                const [X, Y, Z] = xyz.map((value, i) => value * D50[i]);
                return [X, Y, Z, alpha];
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const ε = 216 / 24389;
                const κ = 24389 / 27;
                const xyz = [X, Y, Z].map((value, i) => value / D50[i]);
                const [fx, fy, fz] = xyz.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
                const [L, a, b] = [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
                return [L, a, b, alpha];
            },
        },

        lch: {
            pattern:
                /^lch\(\s*(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+(?:deg|rad|grad|turn)?)\s*(?:\/\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: null,

            components: {
                l: { index: 0, min: 0, max: 100, precision: 5 },
                c: { index: 1, min: 0, max: 150, precision: 5 },
                h: { index: 2, min: 0, max: 360, loop: true, precision: 5 },
            },

            toComponents: (str: string) => {
                const match = str.match(converters.lch.pattern);
                if (!match) throw new Error(`Invalid LCH color format: ${str}`);

                const parse = (v: string, type: "L" | "C" | "H") =>
                    v === "none"
                        ? 0
                        : v.endsWith("%")
                          ? (parseFloat(v) / 100) * (type === "L" ? 100 : type === "C" ? 150 : 360)
                          : parseFloat(v);

                const [L, C, H] = [parse(match[1], "L"), parse(match[2], "C"), parse(match[3], "H")];
                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;

                return [L, C, H, alpha];
            },

            fromComponents: ([L, C, H, alpha = 1]: number[]) => {
                const { l, c, h } = converters.lch.components;
                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
                return `lch(${L.toFixed(l.precision)} ${C.toFixed(c.precision)} ${H.toFixed(h.precision)}${alphaStr})`;
            },

            toXYZA: ([L, C, H, alpha = 1]: number[]): XYZA => {
                const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
                return converters.lab.toXYZA([L, a, b, alpha]);
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const [L, a, b] = converters.lab.fromXYZA([X, Y, Z, alpha]);
                const C = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
                let H = (Math.atan2(b, a) * 180) / Math.PI;
                if (H < 0) H = H + 360;
                return [L, C, H, alpha];
            },
        },

        oklab: {
            pattern:
                /^oklab\(\s*(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s*(?:\/\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: null,

            components: {
                l: { index: 0, min: 0, max: 1, precision: 5 },
                a: { index: 1, min: -0.4, max: 0.4, precision: 5 },
                b: { index: 2, min: -0.4, max: 0.4, precision: 5 },
            },

            toComponents: (str: string): number[] => {
                const match = str.match(converters.oklab.pattern);
                if (!match) throw new Error(`Invalid OKLab format: ${str}`);

                const parse = (v: string, isL = false) =>
                    v === "none" ? 0 : v.endsWith("%") ? (parseFloat(v) / 100) * (isL ? 1 : 0.4) : parseFloat(v);

                const [L, A, B] = [parse(match[1], true), parse(match[2]), parse(match[3])];

                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;

                return [L, A, B, alpha];
            },

            fromComponents: ([L, A, B, alpha = 1]: number[]) => {
                const { l, a, b } = converters.oklab.components;
                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
                return `oklab(${(L * 100).toFixed(l.precision)}% ${A.toFixed(a.precision)} ${B.toFixed(b.precision)}${alphaStr})`;
            },

            toXYZA: ([L, a, b, alpha = 1]: number[]): XYZA => {
                const LMStoXYZ = [
                    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
                    [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
                    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
                ];
                const OKLabtoLMS = [
                    [1.0, 0.3963377773761749, 0.2158037573099136],
                    [1.0, -0.1055613458156586, -0.0638541728258133],
                    [1.0, -0.0894841775298119, -1.2914855480194092],
                ];
                const LMSnl = multiplyMatrices(OKLabtoLMS, [L, a, b]);
                const [X, Y, Z] = multiplyMatrices(
                    LMStoXYZ,
                    LMSnl.map((c) => c ** 3)
                );
                return [X, Y, Z, alpha];
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const XYZtoLMS = [
                    [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
                    [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
                    [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
                ];
                const LMStoOKLab = [
                    [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
                    [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
                    [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
                ];
                const LMS = multiplyMatrices(XYZtoLMS, [X, Y, Z]);
                const [L, a, b] = multiplyMatrices(
                    LMStoOKLab,
                    LMS.map((c) => Math.cbrt(c))
                );
                return [L, a, b, alpha];
            },
        },

        oklch: {
            pattern:
                /^oklch\(\s*(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+%?)\s+(-?\d*\.?\d+(?:deg|rad|grad|turn)?)\s*(?:\/\s*(-?\d*\.?\d+%?))?\s*\)$/i,

            targetGamut: null,

            components: {
                l: { index: 0, min: 0, max: 1, precision: 5 },
                c: { index: 1, min: 0, max: 0.4, precision: 5 },
                h: { index: 2, min: 0, max: 360, loop: true, precision: 5 },
            },

            toComponents: (str: string): number[] => {
                const match = str.match(converters.oklch.pattern);
                if (!match) throw new Error(`Invalid OKLCH format: ${str}`);

                const parse = (v: string, isL = false, isC = false) =>
                    v === "none"
                        ? 0
                        : v.endsWith("%")
                          ? (parseFloat(v) / 100) * (isL ? 1 : isC ? 0.4 : 1)
                          : parseFloat(v);

                const parseAngle = (v: string) => {
                    if (v === "none") return 0;
                    const m = v.match(/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/);
                    if (!m) throw new Error(`Invalid angle: ${v}`);
                    let num = parseFloat(m[1]);
                    switch (m[2]) {
                        case "rad":
                            num *= 180 / Math.PI;
                            break;
                        case "grad":
                            num *= 0.9;
                            break;
                        case "turn":
                            num *= 360;
                            break;
                    }
                    return ((num % 360) + 360) % 360;
                };

                const [L, C, H] = [parse(match[1], true), parse(match[2], false, true), parseAngle(match[3])];
                const alpha = match[4] ? (match[4] === "none" ? 0 : parse(match[4])) : 1;

                return [L, C, H, alpha];
            },

            fromComponents: ([L, C, H, alpha = 1]: number[]) => {
                const { l, c, h } = converters.oklch.components;
                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
                return `oklch(${L.toFixed(l.precision)} ${C.toFixed(c.precision)} ${H.toFixed(h.precision)}${alphaStr})`;
            },

            toXYZA: ([L, C, H, alpha = 1]: number[]): XYZA => {
                const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
                return converters.oklab.toXYZA([L, a, b, alpha]);
            },

            fromXYZA: ([X, Y, Z, alpha = 1]: XYZA) => {
                const [L, a, b] = converters.oklab.fromXYZA([X, Y, Z, alpha]);
                let H = (Math.atan2(b, a) * 180) / Math.PI;
                const C = Math.sqrt(a ** 2 + b ** 2);
                if (H < 0) H += 360;
                return [L, C, H, alpha];
            },
        },

        "device-cmyk": {
            pattern: /device-cmyk\(\s*((\d+%?|\d*\.\d+%?)\s+){3}(\d+%?|\d*\.\d+%?)(\s*,\s*.+?)?\s*\)/i,

            toXYZA: (str: string): XYZA => {
                const match = str.match(/device-cmyk\([^)]*?,\s*(.+?)\s*\)$/i);
                if (match && match[1]) {
                    try {
                        return Color.from(match[1]).in("xyz").getCoords() as XYZA;
                    } catch {
                        return [0, 0, 0, 1];
                    }
                }

                return [0, 0, 0, 1];
            },

            fromXYZA: () => "undefined",
        },
    };

    return converters;
})();

/**
 * A collection of color space converters for various color spaces.
 *
 * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
 */
export const spaceConverters = (() => {
    const identity = (c: number) => c;
    const identityMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ];

    return {
        srgb: createSpaceConverter("srgb", {
            components: ["r", "g", "b"],
            toLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs <= 0.04045) {
                    return sign * (abs / 12.92);
                }
                return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
            },
            fromLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs > 0.0031308) {
                    return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
                }
                return sign * (12.92 * abs);
            },
            toXYZMatrix: [
                [506752 / 1228815, 87881 / 245763, 12673 / 70218],
                [87098 / 409605, 175762 / 245763, 12673 / 175545],
                [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
            ],
            fromXYZMatrix: [
                [12831 / 3959, -329 / 214, -1974 / 3959],
                [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
                [705 / 12673, -2585 / 12673, 705 / 667],
            ],
            whitePoint: "D65",
        }),

        "srgb-linear": createSpaceConverter("srgb-linear", {
            components: ["r", "g", "b"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: [
                [506752 / 1228815, 87881 / 245763, 12673 / 70218],
                [87098 / 409605, 175762 / 245763, 12673 / 175545],
                [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
            ],
            fromXYZMatrix: [
                [12831 / 3959, -329 / 214, -1974 / 3959],
                [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
                [705 / 12673, -2585 / 12673, 705 / 667],
            ],
            whitePoint: "D65",
        }),

        "display-p3": createSpaceConverter("display-p3", {
            components: ["r", "g", "b"],
            toLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs <= 0.04045) {
                    return sign * (abs / 12.92);
                }
                return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
            },
            fromLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs > 0.0031308) {
                    return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
                }
                return sign * (12.92 * abs);
            },
            toXYZMatrix: [
                [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
                [35783 / 156275, 247089 / 357200, 198249 / 2500400],
                [0 / 1, 32229 / 714400, 5220557 / 5000800],
            ],
            fromXYZMatrix: [
                [446124 / 178915, -333277 / 357830, -72051 / 178915],
                [-14852 / 17905, 63121 / 35810, 423 / 17905],
                [11844 / 330415, -50337 / 660830, 316169 / 330415],
            ],
            whitePoint: "D65",
        }),

        rec2020: createSpaceConverter("rec2020", {
            components: ["r", "g", "b"],
            toLinear: (c: number) => {
                const α = 1.09929682680944;
                const β = 0.018053968510807;
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs < β * 4.5) {
                    return sign * (abs / 4.5);
                }
                return sign * Math.pow((abs + α - 1) / α, 1 / 0.45);
            },
            fromLinear: (c: number) => {
                const α = 1.09929682680944;
                const β = 0.018053968510807;
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs > β) {
                    return sign * (α * Math.pow(abs, 0.45) - (α - 1));
                }
                return sign * (4.5 * abs);
            },
            toXYZMatrix: [
                [63426534 / 99577255, 20160776 / 139408157, 47086771 / 278816314],
                [26158966 / 99577255, 472592308 / 697040785, 8267143 / 139408157],
                [0 / 1, 19567812 / 697040785, 295819943 / 278816314],
            ],
            fromXYZMatrix: [
                [30757411 / 17917100, -6372589 / 17917100, -4539589 / 17917100],
                [-19765991 / 29648200, 47925759 / 29648200, 467509 / 29648200],
                [792561 / 44930125, -1921689 / 44930125, 42328811 / 44930125],
            ],
            whitePoint: "D65",
        }),

        "a98-rgb": createSpaceConverter("a98-rgb", {
            components: ["r", "g", "b"],
            toLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                return sign * Math.pow(abs, 563 / 256);
            },
            fromLinear: (c: number) => {
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                return sign * Math.pow(abs, 256 / 563);
            },
            toXYZMatrix: [
                [573536 / 994567, 263643 / 1420810, 187206 / 994567],
                [591459 / 1989134, 6239551 / 9945670, 374412 / 4972835],
                [53769 / 1989134, 351524 / 4972835, 4929758 / 4972835],
            ],
            fromXYZMatrix: [
                [1829569 / 896150, -506331 / 896150, -308931 / 896150],
                [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
                [16779 / 1248040, -147721 / 1248040, 1266979 / 1248040],
            ],
            whitePoint: "D65",
        }),

        "prophoto-rgb": createSpaceConverter("prophoto-rgb", {
            components: ["r", "g", "b"],
            toLinear: (c: number) => {
                const Et2 = 16 / 512;
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs <= Et2) {
                    return sign * (abs / 16);
                }
                return sign * Math.pow(abs, 1.8);
            },
            fromLinear: (c: number) => {
                const Et = 1 / 512;
                const sign = c < 0 ? -1 : 1;
                const abs = Math.abs(c);
                if (abs >= Et) {
                    return sign * Math.pow(abs, 1 / 1.8);
                }
                return sign * (16 * abs);
            },
            toXYZMatrix: [
                [0.7977666449006423, 0.13518129740053308, 0.0313477341283922],
                [0.2880748288194013, 0.711835234241873, 0.00008993693872564],
                [0.0, 0.0, 0.8251046025104602],
            ],
            fromXYZMatrix: [
                [1.3457868816471583, -0.25557208737979464, -0.05110186497554526],
                [-0.5446307051249019, 1.5082477428451468, 0.02052744743642139],
                [0.0, 0.0, 1.2119675456389452],
            ],
            whitePoint: "D50",
        }),

        "xyz-d65": createSpaceConverter("xyz-d65", {
            targetGamut: null,
            components: ["x", "y", "z"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: identityMatrix,
            fromXYZMatrix: identityMatrix,
            whitePoint: "D65",
        }),

        "xyz-d50": createSpaceConverter("xyz-d50", {
            targetGamut: null,
            components: ["x", "y", "z"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: identityMatrix,
            fromXYZMatrix: identityMatrix,
            whitePoint: "D50",
        }),

        xyz: createSpaceConverter("xyz", {
            targetGamut: null,
            components: ["x", "y", "z"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: identityMatrix,
            fromXYZMatrix: identityMatrix,
            whitePoint: "D65",
        }),
    };
})();

/**
 * A collection of color format and color space converters with added alpha component.
 */
export const converters = (() => {
    const converterObjects = { ...formatConverters, ...spaceConverters };

    Object.values(converterObjects).forEach((converter) => {
        if ("components" in converter) {
            const components = converter.components as Record<string, ComponentDefinition>;

            components["alpha"] = {
                index: Object.keys(components).length,
                min: 0,
                max: 1,
                precision: 3,
            };
        }
    });

    return converterObjects;
})() satisfies Converters;
