import { Color } from "./Color.js";
import { config } from "./config.js";
import {
    HSL_to_RGB,
    HWB_to_RGB,
    LAB_to_LCH,
    LAB_to_XYZD50,
    LCH_to_LAB,
    MATRICES,
    OKLAB_to_OKLCH,
    OKLAB_to_XYZD65,
    OKLCH_to_OKLAB,
    RGB_to_HSL,
    RGB_to_HWB,
    RGB_to_XYZD65,
    XYZD50_to_LAB,
    XYZD65_to_OKLAB,
    XYZD65_to_RGB,
} from "./math.js";
import type {
    ColorConverter,
    ColorFunction,
    ColorFunctionConverter,
    FormattingOptions,
    HueInterpolationMethod,
    NamedColor,
} from "./types.js";
import {
    converterFromFunctionConverter,
    functionConverterFromSpaceConverter,
    fit,
    extractBalancedExpression,
} from "./utils.js";

/** A collection of `<named-color>`s and their RGB values. */
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
    turquoise: [64, 224, 208],
    violet: [238, 130, 238],
    wheat: [245, 222, 179],
    white: [255, 255, 255],
    whitesmoke: [245, 245, 245],
    yellow: [255, 255, 0],
    yellowgreen: [154, 205, 50],
} satisfies { [named: string]: [number, number, number] };

/** A collection of color spaces for `<color()>` function and their conversion logic. */
export const colorSpaceConverters = {
    srgb: functionConverterFromSpaceConverter("srgb", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
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
        toBridgeMatrix: MATRICES.SRGB_to_XYZD65,
        fromBridgeMatrix: MATRICES.XYZD65_to_SRGB,
    }),
    "srgb-linear": functionConverterFromSpaceConverter("srgb-linear", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
        toBridgeMatrix: MATRICES.SRGB_to_XYZD65,
        fromBridgeMatrix: MATRICES.XYZD65_to_SRGB,
    }),
    "display-p3": functionConverterFromSpaceConverter("display-p3", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
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
        toBridgeMatrix: MATRICES.P3_to_XYZD65,
        fromBridgeMatrix: MATRICES.XYZD65_to_P3,
    }),
    rec2020: functionConverterFromSpaceConverter("rec2020", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
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
        toBridgeMatrix: MATRICES.REC2020_to_XYZD65,
        fromBridgeMatrix: MATRICES.XYZD65_to_REC2020,
    }),
    "a98-rgb": functionConverterFromSpaceConverter("a98-rgb", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
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
        toBridgeMatrix: MATRICES.A98_to_XYZD65,
        fromBridgeMatrix: MATRICES.XYZD65_to_A98,
    }),
    "prophoto-rgb": functionConverterFromSpaceConverter("prophoto-rgb", {
        components: ["r", "g", "b"],
        bridge: "xyz-d50",
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
        toBridgeMatrix: MATRICES.ProPhoto_to_XYZD50,
        fromBridgeMatrix: MATRICES.XYZD50_to_ProPhoto,
    }),
    "xyz-d65": functionConverterFromSpaceConverter("xyz-d65", {
        targetGamut: null,
        components: ["x", "y", "z"],
        bridge: "xyz-d65",
        toBridgeMatrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        fromBridgeMatrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
    }),
    "xyz-d50": functionConverterFromSpaceConverter("xyz-d50", {
        targetGamut: null,
        components: ["x", "y", "z"],
        bridge: "xyz-d65",
        toBridgeMatrix: MATRICES.D50_to_D65,
        fromBridgeMatrix: MATRICES.D65_to_d50,
    }),
    xyz: functionConverterFromSpaceConverter("xyz", {
        targetGamut: null,
        components: ["x", "y", "z"],
        bridge: "xyz-d65",
        toBridgeMatrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        fromBridgeMatrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
    }),
} as const satisfies Record<string, ColorFunctionConverter>;

/** A collection of `<color-function>`s and their conversion logic. */
export const colorFunctionConverters = {
    rgb: {
        supportsLegacy: true,
        alphaVariant: "rgba",
        components: {
            r: { index: 0, value: [0, 255], precision: 0 },
            g: { index: 1, value: [0, 255], precision: 0 },
            b: { index: 2, value: [0, 255], precision: 0 },
        },
        bridge: "xyz-d65",
        toBridge: RGB_to_XYZD65,
        fromBridge: XYZD65_to_RGB,
    },
    hsl: {
        supportsLegacy: true,
        alphaVariant: "hsla",
        components: {
            h: { index: 0, value: "hue", precision: 1 },
            s: { index: 1, value: "percentage", precision: 1 },
            l: { index: 2, value: "percentage", precision: 1 },
        },
        bridge: "rgb",
        toBridge: HSL_to_RGB,
        fromBridge: RGB_to_HSL,
    },
    hwb: {
        components: {
            h: { index: 0, value: "hue", precision: 1 },
            w: { index: 1, value: "percentage", precision: 1 },
            b: { index: 2, value: "percentage", precision: 1 },
        },
        bridge: "rgb",
        toBridge: HWB_to_RGB,
        fromBridge: RGB_to_HWB,
    },
    lab: {
        targetGamut: null,
        components: {
            l: { index: 0, value: "percentage", precision: 5 },
            a: { index: 1, value: [-125, 125], precision: 5 },
            b: { index: 2, value: [-125, 125], precision: 5 },
        },
        bridge: "xyz-d50",
        toBridge: LAB_to_XYZD50,
        fromBridge: XYZD50_to_LAB,
    },
    lch: {
        targetGamut: null,
        components: {
            l: { index: 0, value: "percentage", precision: 5 },
            c: { index: 1, value: [0, 150], precision: 5 },
            h: { index: 2, value: "hue", precision: 5 },
        },
        bridge: "lab",
        toBridge: LCH_to_LAB,
        fromBridge: LAB_to_LCH,
    },
    oklab: {
        targetGamut: null,
        components: {
            l: { index: 0, value: [0, 1], precision: 5 },
            a: { index: 1, value: [-0.4, 0.4], precision: 5 },
            b: { index: 2, value: [-0.4, 0.4], precision: 5 },
        },
        bridge: "xyz-d65",
        toBridge: OKLAB_to_XYZD65,
        fromBridge: XYZD65_to_OKLAB,
    },
    oklch: {
        targetGamut: null,
        components: {
            l: { index: 0, value: [0, 1], precision: 5 },
            c: { index: 1, value: [0, 0.4], precision: 5 },
            h: { index: 2, value: "hue", precision: 5 },
        },
        bridge: "oklab",
        toBridge: OKLCH_to_OKLAB,
        fromBridge: OKLAB_to_OKLCH,
    },
    ...colorSpaceConverters,
} as const;

/** A collection of `<color-function>`s as <color> converters. */
export const colorFunctions = Object.fromEntries(
    Object.entries(colorFunctionConverters).map(([name, converter]) => [
        name as ColorFunction,
        converterFromFunctionConverter(name, converter as ColorFunctionConverter),
    ])
) as Record<ColorFunction, ColorConverter>;

/** A collection of `<color-base>`s as <color> converters. */
export const colorBases = {
    "hex-color": {
        isValid: (str: string) => str.startsWith("#"),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const HEX = str.slice(1);
            const expand = (c: string) => parseInt(c.length === 1 ? c + c : c, 16);
            const [r, g, b, a = 255] =
                HEX.length <= 4
                    ? HEX.split("").map(expand)
                    : [HEX.slice(0, 2), HEX.slice(2, 4), HEX.slice(4, 6), HEX.slice(6, 8)].map((c) =>
                          parseInt(c || "ff", 16)
                      );
            return [r, g, b, a / 255];
        },
        fromBridge: (coords: number[]) => coords,
        format: ([r, g, b, a = 1]: number[]) => {
            const toHex = (v: number) => v.toString(16).padStart(2, "0");
            const hex = [r, g, b].map((v) => toHex(Math.round(Math.max(0, Math.min(255, v))))).join("");
            return `#${hex}${a < 1 ? toHex(Math.round(a * 255)) : ""}`.toUpperCase();
        },
    },
    "named-color": {
        isValid: (str: string) => Object.keys(namedColors).some((key) => key === str),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (name: string) => {
            const key = name.replace(/[\s-]/g, "") as NamedColor;
            const rgb = namedColors[key];
            if (!rgb) throw new Error(`Invalid named-color: ${name}`);
            return [...rgb, 1];
        },
        fromBridge: (coords: number[]) => coords,
        format: (rgb: number[]) => {
            const [r, g, b] = rgb.map((v, i) => (i < 3 ? Math.round(Math.min(255, Math.max(0, v))) : v));
            for (const [name, [nr, ng, nb]] of Object.entries(namedColors)) {
                if (r === nr && g === ng && b === nb) return name;
            }
        },
    },
    "color-mix": {
        isValid: (str: string) => str.startsWith("color-mix(") && str.endsWith(")"),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const fnName = "color-mix";

            const fnIndex = str.indexOf(fnName);
            if (fnIndex === -1) throw new Error("not a color-mix expression");

            const { expression } = extractBalancedExpression(str, fnIndex + fnName.length);
            if (!expression) throw new Error("malformed color-mix expression");

            const inner = expression.slice(1, -1).trim();

            const parts: string[] = [];
            let i = 0;
            let current = "";

            while (i < inner.length) {
                const char = inner[i];

                if (char === ",") {
                    parts.push(current.trim());
                    current = "";
                    i++;
                    continue;
                }

                if (char === "(" || /[a-zA-Z]/.test(char)) {
                    const { expression: expr, end } = extractBalancedExpression(inner, i);
                    if (expr) {
                        current += expr;
                        i = end;
                        continue;
                    }
                }

                current += char;
                i++;
            }

            parts.push(current.trim());

            if (parts.length !== 3) {
                throw new Error("color-mix must have three comma-separated parts");
            }

            const inPart = parts[0];
            const inMatch = inPart.match(/^in\s+([a-z0-9-]+)(?:\s+(shorter|longer|increasing|decreasing)\s+hue)?$/);
            if (!inMatch) {
                throw new Error("Invalid model and hue format");
            }
            const model = inMatch[1];
            const hue = (inMatch[2] || "shorter") as HueInterpolationMethod;

            const extractColorAndWeight = (colorStr: string) => {
                const s = colorStr.trim();

                let colorExpression = "";
                let rest = "";

                if (/^[a-z]/.test(s)) {
                    const { expression: expr, end: e } = extractBalancedExpression(s, 0);
                    if (expr) {
                        colorExpression = expr;
                        rest = s.slice(e).trim();
                    } else {
                        const m = s.match(/^([^\s]+)(.*)$/);
                        colorExpression = m ? m[1] : s;
                        rest = m ? m[2].trim() : "";
                    }
                } else {
                    const m = s.match(/^([^\s]+)(.*)$/);
                    colorExpression = m ? m[1] : s;
                    rest = m ? m[2].trim() : "";
                }

                const weightMatch = rest.match(/^(\d+)%/);
                const weight = weightMatch ? parseInt(weightMatch[1], 10) : undefined;

                const color = Color.from(colorExpression.trim());
                return { color, weight };
            };

            const { color: color1, weight: weight1 } = extractColorAndWeight(parts[1]);
            const { color: color2, weight: weight2 } = extractColorAndWeight(parts[2]);

            const getWeight2Prime = (weight1?: number, weight2?: number) => {
                if (weight1 === undefined && weight2 !== undefined) {
                    weight1 = 1 - weight2;
                } else if (weight1 !== undefined && weight2 === undefined) {
                    weight2 = 1 - weight1;
                } else {
                    weight1 = 0.5;
                    weight2 = 0.5;
                }

                const totalWeight = weight1 + weight2;
                if (totalWeight > 1) {
                    weight1 /= totalWeight;
                    weight2 /= totalWeight;
                }

                return weight2 / (weight1 + weight2);
            };

            const amount = getWeight2Prime(weight1, weight2);

            return color1.in(model).mix(color2, { amount, hue }).in("rgb").getCoords();
        },
    },
    transparent: {
        isValid: (str: string) => str === "transparent",
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => [0, 0, 0, 0], // eslint-disable-line no-unused-vars
    },
    ...colorFunctions,
} satisfies Record<string, ColorConverter>;

/**
 * A collection of `<color>` converters.
 *
 * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
 */
export const colorTypes = {
    currentColor: {
        isValid: (str: string) => str === "currentcolor",
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => [0, 0, 0, 1], // eslint-disable-line no-unused-vars
    },
    "contrast-color": {
        isValid: (str: string) => str.startsWith("contrast-color(") && str.endsWith(")"),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const inner = str.slice(15, -1);
            const luminance = Color.from(inner).luminance();
            return luminance > 0.5 ? [0, 0, 0, 1] : [255, 255, 255, 1];
        },
    },
    "device-cmyk": {
        isValid: (str: string) => str.startsWith("device-cmyk(") && str.endsWith(")"),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const fnName = "device-cmyk";
            const fnIndex = str.indexOf(fnName);
            if (fnIndex === -1) throw new Error("Invalid device-cmyk syntax");

            const { expression } = extractBalancedExpression(str, fnIndex + fnName.length);
            if (!expression) throw new Error("Malformed device-cmyk expression");

            const content = expression.slice(1, -1).trim();

            const tokens: string[] = [];
            let i = 0;

            while (i < content.length) {
                const char = content[i];

                if (char === " ") {
                    i++;
                    continue;
                }

                if (char === "(" || /[a-zA-Z-]/.test(char)) {
                    const { expression: expr, end } = extractBalancedExpression(content, i);
                    if (expr) {
                        tokens.push(expr);
                        i = end;
                        continue;
                    }
                }

                if (/[\d.+-]/.test(char)) {
                    let num = "";
                    while (i < content.length && /[\d.eE+-]/.test(content[i])) {
                        num += content[i];
                        i++;
                    }
                    if (i < content.length && content[i] === "%") {
                        num += "%";
                        i++;
                    } else if (i < content.length && /[a-zA-Z]/.test(content[i])) {
                        while (i < content.length && /[a-zA-Z]/.test(content[i])) {
                            num += content[i];
                            i++;
                        }
                    }
                    tokens.push(num);
                    continue;
                }

                if (char === "," || char === "/") {
                    tokens.push(char);
                    i++;
                    continue;
                }

                throw new Error(`Unexpected character: ${char}`);
            }

            const parseValue = (token: string) => (token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token));

            if (tokens.length >= 2 && tokens[1] === ",") {
                const values = tokens.filter((t) => t !== ",");
                if (values.length === 4 || values.length === 5) {
                    const [c, m, y, k, alpha = 1] = values.map(parseValue);
                    const red = 1 - Math.min(1, c * (1 - k) + k);
                    const green = 1 - Math.min(1, m * (1 - k) + k);
                    const blue = 1 - Math.min(1, y * (1 - k) + k);
                    return [red * 255, green * 255, blue * 255, alpha];
                }
                throw new Error("Invalid number of components for comma-separated device-cmyk");
            }

            let idx = 0;
            const components: string[] = [];
            while (idx < tokens.length && components.length < 4 && tokens[idx] !== "/" && tokens[idx] !== ",") {
                components.push(tokens[idx]);
                idx++;
            }
            if (components.length !== 4) {
                throw new Error("Invalid number of components for space-separated device-cmyk");
            }
            const [c, m, y, k] = components.map(parseValue);

            let alpha = 1;
            if (idx < tokens.length && tokens[idx] === "/") {
                idx++;
                if (idx >= tokens.length) throw new Error("Missing alpha value");
                alpha = parseValue(tokens[idx]);
                idx++;
            }

            if (idx < tokens.length && tokens[idx] === ",") {
                idx++;
                const fallbackStr = tokens.slice(idx).join(" ");
                return Color.from(fallbackStr).in("rgb").getCoords();
            }

            const red = 1 - Math.min(1, c * (1 - k) + k);
            const green = 1 - Math.min(1, m * (1 - k) + k);
            const blue = 1 - Math.min(1, y * (1 - k) + k);
            return [red * 255, green * 255, blue * 255, alpha];
        },
        fromBridge: (coords: number[]) => coords,
        format: ([red, green, blue, alpha = 1]: number[], options: FormattingOptions = {}) => {
            const { legacy = false, precision = 3, fit: fitMethod = "clip" } = options;
            const [fr, fg, fb] = fit([red, green, blue], { model: "rgb", method: fitMethod });

            const r = fr / 255;
            const g = fg / 255;
            const b = fb / 255;
            const k = 1 - Math.max(r, g, b);

            const formatComponent = (value: number) => Number(value.toFixed(precision)).toString();

            const c = formatComponent(k === 1 ? 0 : (1 - r - k) / (1 - k));
            const m = formatComponent(k === 1 ? 0 : (1 - g - k) / (1 - k));
            const y = formatComponent(k === 1 ? 0 : (1 - b - k) / (1 - k));
            const kFormatted = formatComponent(k);
            const alphaFormatted = Number(alpha.toFixed(3)).toString();

            if (legacy) {
                return `device-cmyk(${c}, ${m}, ${y}, ${kFormatted}${alpha < 1 ? `, ${alphaFormatted}` : ""})`;
            }

            const rgbPart = colorFunctions.rgb.format?.([fr, fg, fb, alpha], options);
            return `device-cmyk(${c} ${m} ${y} ${kFormatted}${alpha < 1 ? ` / ${alphaFormatted}` : ""}, ${rgbPart})`;
        },
    },
    "light-dark": {
        isValid: (str: string) => str.startsWith("light-dark(") && str.endsWith(")"),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const fnName = "light-dark";
            const fnIndex = str.indexOf(fnName);
            if (fnIndex === -1) throw new Error("Not a light-dark expression");

            const { expression } = extractBalancedExpression(str, fnIndex + fnName.length);
            if (!expression) throw new Error("Malformed light-dark expression");

            const inner = expression.slice(1, -1).trim();

            const parts: string[] = [];
            let current = "";
            let i = 0;

            while (i < inner.length) {
                const char = inner[i];

                if (char === ",") {
                    parts.push(current.trim());
                    current = "";
                    i++;
                    continue;
                }

                if (char === "(" || /[a-zA-Z]/.test(char)) {
                    const { expression: expr, end } = extractBalancedExpression(inner, i);
                    if (expr) {
                        current += expr;
                        i = end;
                        continue;
                    }
                }

                current += char;
                i++;
            }
            parts.push(current.trim());

            if (parts.length !== 2) {
                throw new Error("Invalid light-dark format");
            }

            const [color1, color2] = parts;

            const { theme } = config;
            return Color.from(theme === "light" ? color1 : color2).getCoords();
        },
    },
    "system-color": {
        isValid: (str: string) => Object.keys(config.systemColors).some((key) => key.toLowerCase() === str),
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const { systemColors } = config;
            const key = Object.keys(systemColors).find((k) => k.toLowerCase() === str);
            const rgbArr = systemColors[key as keyof typeof systemColors][config.theme === "light" ? 0 : 1];
            return [...rgbArr, 1];
        },
    },
    ...colorBases,
} satisfies Record<string, ColorConverter>;
