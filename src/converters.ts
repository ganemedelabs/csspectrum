import { Color } from "./Color.js";
import { config } from "./config.js";
import type {
    ColorConverter,
    ColorFunction,
    ColorFunctionConverter,
    FormattingOptions,
    HueInterpolationMethod,
    NamedColor,
} from "./types.js";
import { converterFromFunctionConverter, functionConverterFromSpaceConverter, multiplyMatrices, fit } from "./utils.js";

function hslToRgb([h, s, l]: number[]) {
    s /= 100;
    l /= 100;

    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };

    return [f(0), f(8), f(4)];
}

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
        toBridgeMatrix: [
            [506752 / 1228815, 87881 / 245763, 12673 / 70218],
            [87098 / 409605, 175762 / 245763, 12673 / 175545],
            [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
        ],
        fromBridgeMatrix: [
            [12831 / 3959, -329 / 214, -1974 / 3959],
            [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
            [705 / 12673, -2585 / 12673, 705 / 667],
        ],
    }),
    "srgb-linear": functionConverterFromSpaceConverter("srgb-linear", {
        components: ["r", "g", "b"],
        bridge: "xyz-d65",
        toBridgeMatrix: [
            [506752 / 1228815, 87881 / 245763, 12673 / 70218],
            [87098 / 409605, 175762 / 245763, 12673 / 175545],
            [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
        ],
        fromBridgeMatrix: [
            [12831 / 3959, -329 / 214, -1974 / 3959],
            [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
            [705 / 12673, -2585 / 12673, 705 / 667],
        ],
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
        toBridgeMatrix: [
            [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
            [35783 / 156275, 247089 / 357200, 198249 / 2500400],
            [0 / 1, 32229 / 714400, 5220557 / 5000800],
        ],
        fromBridgeMatrix: [
            [446124 / 178915, -333277 / 357830, -72051 / 178915],
            [-14852 / 17905, 63121 / 35810, 423 / 17905],
            [11844 / 330415, -50337 / 660830, 316169 / 330415],
        ],
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
        toBridgeMatrix: [
            [63426534 / 99577255, 20160776 / 139408157, 47086771 / 278816314],
            [26158966 / 99577255, 472592308 / 697040785, 8267143 / 139408157],
            [0 / 1, 19567812 / 697040785, 295819943 / 278816314],
        ],
        fromBridgeMatrix: [
            [30757411 / 17917100, -6372589 / 17917100, -4539589 / 17917100],
            [-19765991 / 29648200, 47925759 / 29648200, 467509 / 29648200],
            [792561 / 44930125, -1921689 / 44930125, 42328811 / 44930125],
        ],
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
        toBridgeMatrix: [
            [573536 / 994567, 263643 / 1420810, 187206 / 994567],
            [591459 / 1989134, 6239551 / 9945670, 374412 / 4972835],
            [53769 / 1989134, 351524 / 4972835, 4929758 / 4972835],
        ],
        fromBridgeMatrix: [
            [1829569 / 896150, -506331 / 896150, -308931 / 896150],
            [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
            [16779 / 1248040, -147721 / 1248040, 1266979 / 1248040],
        ],
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
        toBridgeMatrix: [
            [0.7977666449006423, 0.13518129740053308, 0.0313477341283922],
            [0.2880748288194013, 0.711835234241873, 0.00008993693872564],
            [0.0, 0.0, 0.8251046025104602],
        ],
        fromBridgeMatrix: [
            [1.3457868816471583, -0.25557208737979464, -0.05110186497554526],
            [-0.5446307051249019, 1.5082477428451468, 0.02052744743642139],
            [0.0, 0.0, 1.2119675456389452],
        ],
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
        toBridgeMatrix: [
            [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
            [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
            [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
        ],
        fromBridgeMatrix: [
            [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
            [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
            [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
        ],
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
        toBridge: (rgb: number[]) => {
            const rgbNorm = rgb.map((v) => v / 255);

            const lin_sRGB = (RGB: number[]) =>
                RGB.map((val) => {
                    const sign = val < 0 ? -1 : 1;
                    const abs = Math.abs(val);
                    if (abs <= 0.04045) {
                        return val / 12.92;
                    }
                    return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
                });

            const linearRGB = lin_sRGB(rgbNorm);

            const M = [
                [506752 / 1228815, 87881 / 245763, 12673 / 70218],
                [87098 / 409605, 175762 / 245763, 12673 / 175545],
                [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
            ];

            return multiplyMatrices(M, linearRGB);
        },
        fromBridge: (xyz: number[]) => {
            const M = [
                [12831 / 3959, -329 / 214, -1974 / 3959],
                [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
                [705 / 12673, -2585 / 12673, 705 / 667],
            ];

            const linRGB = multiplyMatrices(M, xyz);

            const gam_sRGB = (RGB: number[]) =>
                RGB.map((val) => {
                    const sign = val < 0 ? -1 : 1;
                    const abs = Math.abs(val);
                    if (abs > 0.0031308) {
                        return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
                    }
                    return 12.92 * val;
                });

            const gammaRGB = gam_sRGB(linRGB);

            return gammaRGB.map((v) => v * 255);
        },
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
        toBridge: (hsl: number[]) => {
            return hslToRgb(hsl).map((c) => c * 255);
        },
        fromBridge: (rgb: number[]) => {
            const [R, G, B] = rgb.map((c) => c / 255);
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

            let h = H;
            let s = S * 100;
            const l = L * 100;

            if (s < 0) {
                h += 180;
                s = Math.abs(s);
            }
            if (h >= 360) h -= 360;
            if (l === 0) s = 0;
            if (S === 0 || l === 0) h = 0;
            return [h, s, l];
        },
    },
    hwb: {
        components: {
            h: { index: 0, value: "hue", precision: 1 },
            w: { index: 1, value: "percentage", precision: 1 },
            b: { index: 2, value: "percentage", precision: 1 },
        },
        bridge: "rgb",
        toBridge: ([H, W, B]: number[]) => {
            W /= 100;
            B /= 100;
            if (W + B >= 1) {
                const gray = W / (W + B);
                return [gray, gray, gray];
            }
            const rgb = hslToRgb([H, 100, 50]);
            for (let i = 0; i < 3; i++) {
                rgb[i] *= 1 - W - B;
                rgb[i] += W;
            }
            return rgb.map((c) => c * 255);
        },
        fromBridge: (rgb: number[]) => {
            const rgbToHue = (red: number, green: number, blue: number) => {
                const max = Math.max(red, green, blue);
                const min = Math.min(red, green, blue);
                let hue = NaN;
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
                    if (hue >= 360) hue -= 360;
                }

                return hue;
            };

            const [sR, sG, sB] = rgb.map((c) => c / 255);
            const hue = rgbToHue(sR, sG, sB);
            const white = Math.min(sR, sG, sB);
            const black = 1 - Math.max(sR, sG, sB);

            return [hue, white * 100, black * 100];
        },
    },
    lab: {
        targetGamut: null,
        components: {
            l: { index: 0, value: "percentage", precision: 5 },
            a: { index: 1, value: [-125, 125], precision: 5 },
            b: { index: 2, value: [-125, 125], precision: 5 },
        },
        bridge: "xyz-d50",
        toBridge: ([L, a, b]: number[]) => {
            const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
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
            return xyz.map((value, i) => value * D50[i]);
        },
        fromBridge: (xyz: number[]) => {
            const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
            const ε = 216 / 24389;
            const κ = 24389 / 27;
            const xyz_d50 = xyz.map((value, i) => value / D50[i]);
            const [fx, fy, fz] = xyz_d50.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
            return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
        },
    },
    lch: {
        targetGamut: null,
        components: {
            l: { index: 0, value: "percentage", precision: 5 },
            c: { index: 1, value: [0, 150], precision: 5 },
            h: { index: 2, value: "hue", precision: 5 },
        },
        bridge: "lab",
        toBridge: ([L, C, H]: number[]) => {
            const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
            return [L, a, b];
        },
        fromBridge: ([L, a, b]: number[]) => {
            const C = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
            const H = (Math.atan2(b, a) * 180) / Math.PI;
            return [L, C, H < 0 ? H + 360 : H];
        },
    },
    oklab: {
        targetGamut: null,
        components: {
            l: { index: 0, value: [0, 1], precision: 5 },
            a: { index: 1, value: [-0.4, 0.4], precision: 5 },
            b: { index: 2, value: [-0.4, 0.4], precision: 5 },
        },
        bridge: "xyz-d65",
        toBridge: (lab: number[]) => {
            const LMStoBridge = [
                [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
                [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
                [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
            ];
            const OKLabtoLMS = [
                [1.0, 0.3963377773761749, 0.2158037573099136],
                [1.0, -0.1055613458156586, -0.0638541728258133],
                [1.0, -0.0894841775298119, -1.2914855480194092],
            ];
            const LMSnl = multiplyMatrices(OKLabtoLMS, lab);
            return multiplyMatrices(
                LMStoBridge,
                LMSnl.map((c) => c ** 3)
            );
        },
        fromBridge: (xyz: number[]) => {
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
            const LMS = multiplyMatrices(XYZtoLMS, xyz);
            return multiplyMatrices(
                LMStoOKLab,
                LMS.map((c) => Math.cbrt(c))
            );
        },
    },
    oklch: {
        targetGamut: null,
        components: {
            l: { index: 0, value: [0, 1], precision: 5 },
            c: { index: 1, value: [0, 0.4], precision: 5 },
            h: { index: 2, value: "hue", precision: 5 },
        },
        bridge: "oklab",
        toBridge: ([L, C, H]: number[]) => {
            const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
            return [L, a, b];
        },
        fromBridge: ([L, a, b]: number[]) => {
            const H = (Math.atan2(b, a) * 180) / Math.PI;
            const C = Math.sqrt(a ** 2 + b ** 2);
            return [L, C, H < 0 ? H + 360 : H];
        },
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
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            return cleaned.startsWith("#");
        },
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
        isValid: (str: string) => {
            return Object.keys(namedColors).some((key) => key === str.trim().toLowerCase());
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (name: string) => {
            const key = name.replace(/[\s-]/g, "").trim().toLowerCase() as NamedColor;
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
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            return cleaned.startsWith("color-mix(") && cleaned.endsWith(")");
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const extractColorAndWeight = (colorStr: string) => {
                const regex = /^(.*?)(?:\s+(\d+%))?$/;
                const match = colorStr.match(regex);
                if (!match) {
                    throw new Error("Invalid color format");
                }
                const color = Color.from(match[1].trim());
                const weight = parseInt(match[2]) || undefined;
                return { color, weight };
            };

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

            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const inner = cleaned.slice(10, -1).trim();

            const parts: string[] = [];
            let depth = 0;
            let current = "";
            for (const char of inner) {
                if (char === "(") depth++;
                if (char === ")") depth--;
                if (char === "," && depth === 0) {
                    parts.push(current.trim());
                    current = "";
                } else {
                    current += char;
                }
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

            const { color: color1, weight: weight1 } = extractColorAndWeight(parts[1]);
            const { color: color2, weight: weight2 } = extractColorAndWeight(parts[2]);

            const amount = getWeight2Prime(weight1, weight2);

            return color1.in(model).mix(color2, { amount, hue }).getCoords();
        },
    },
    transparent: {
        isValid: (str: string) => str.trim().toLowerCase() === "transparent",
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
        isValid: (str: string) => str.trim().toLowerCase() === "currentcolor",
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => [0, 0, 0, 1], // eslint-disable-line no-unused-vars
    },
    "contrast-color": {
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            return cleaned.startsWith("contrast-color(") && cleaned.endsWith(")");
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const inner = cleaned.slice(15, -1);
            const luminance = Color.from(inner).luminance();
            return luminance > 0.5 ? [0, 0, 0, 1] : [255, 255, 255, 1];
        },
    },
    "device-cmyk": {
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            return cleaned.startsWith("device-cmyk(") && cleaned.endsWith(")");
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const findMatchingParen = (str: string, startIndex: number) => {
                let depth = 0;
                for (let i = startIndex; i < str.length; i++) {
                    if (str[i] === "(") depth++;
                    else if (str[i] === ")") depth--;
                    if (depth === 0) return i;
                }
                throw new Error("Mismatched parentheses");
            };

            const tokenize = (str: string) => {
                const tokens = [];
                let i = 0;
                while (i < str.length) {
                    while (i < str.length && str[i] === " ") i++;
                    if (i >= str.length) break;

                    const char = str[i];
                    if (/[a-zA-Z-]/.test(char)) {
                        let ident = "";
                        while (i < str.length && /[a-zA-Z0-9-%]/.test(str[i])) {
                            ident += str[i];
                            i++;
                        }
                        if (i < str.length && str[i] === "(") {
                            let depth = 1;
                            let funcStr = ident + "(";
                            i++;
                            while (i < str.length && depth > 0) {
                                if (str[i] === "(") depth++;
                                else if (str[i] === ")") depth--;
                                if (depth > 0) funcStr += str[i];
                                i++;
                            }
                            funcStr += ")";
                            tokens.push(funcStr);
                        } else {
                            tokens.push(ident);
                        }
                    } else if (/[\d.-]/.test(char)) {
                        let num = "";
                        while (i < str.length && /[\d.eE+-]/.test(str[i])) {
                            num += str[i];
                            i++;
                        }
                        if (i < str.length && str[i] === "%") {
                            num += "%";
                            i++;
                            tokens.push(num);
                        } else if (i < str.length && /[a-zA-Z]/.test(str[i])) {
                            let unit = "";
                            while (i < str.length && /[a-zA-Z]/.test(str[i])) {
                                unit += str[i];
                                i++;
                            }
                            tokens.push(num + unit);
                        } else {
                            tokens.push(num);
                        }
                    } else if (char === "," || char === "/") {
                        tokens.push(char);
                        i++;
                    } else {
                        throw new Error(`Unexpected character: ${char}`);
                    }
                }
                return tokens;
            };

            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const openingIndex = cleaned.indexOf("(");
            if (openingIndex === -1) throw new Error("Invalid device-cmyk syntax");
            const closingIndex = findMatchingParen(cleaned, openingIndex);
            const content = cleaned.slice(openingIndex + 1, closingIndex).trim();
            const tokens = tokenize(content);

            const parseValue = (token: string) => {
                if (token.endsWith("%")) {
                    return parseFloat(token) / 100;
                } else {
                    return parseFloat(token);
                }
            };

            if (tokens.length >= 2 && tokens[1] === ",") {
                const values = tokens.filter((token) => token !== ",");
                if (values.length === 4) {
                    const [c, m, y, k] = values.map(parseValue);
                    const alpha = 1;
                    const red = 1 - Math.min(1, c * (1 - k) + k);
                    const green = 1 - Math.min(1, m * (1 - k) + k);
                    const blue = 1 - Math.min(1, y * (1 - k) + k);
                    return [red * 255, green * 255, blue * 255, alpha];
                } else if (values.length === 5) {
                    const [c, m, y, k, alpha] = values.map(parseValue);
                    const red = 1 - Math.min(1, c * (1 - k) + k);
                    const green = 1 - Math.min(1, m * (1 - k) + k);
                    const blue = 1 - Math.min(1, y * (1 - k) + k);
                    return [red * 255, green * 255, blue * 255, alpha];
                } else {
                    throw new Error("Invalid number of components for comma-separated device-cmyk");
                }
            } else {
                let i = 0;
                const components = [];
                while (i < tokens.length && components.length < 4 && tokens[i] !== "/" && tokens[i] !== ",") {
                    components.push(tokens[i]);
                    i++;
                }
                if (components.length !== 4)
                    throw new Error("Invalid number of components for space-separated device-cmyk");
                const [c, m, y, k] = components.map(parseValue);
                let alpha = 1;
                if (i < tokens.length && tokens[i] === "/") {
                    i++;
                    if (i >= tokens.length) throw new Error("Missing alpha value");
                    alpha = parseValue(tokens[i]);
                    i++;
                }
                if (i < tokens.length && tokens[i] === ",") {
                    i++;
                    const fallbackTokens = tokens.slice(i);
                    const fallbackStr = fallbackTokens.join(" ");
                    return Color.from(fallbackStr).in("rgb").getCoords();
                } else {
                    const red = 1 - Math.min(1, c * (1 - k) + k);
                    const green = 1 - Math.min(1, m * (1 - k) + k);
                    const blue = 1 - Math.min(1, y * (1 - k) + k);
                    return [red * 255, green * 255, blue * 255, alpha];
                }
            }
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
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            return cleaned.startsWith("light-dark(") && cleaned.endsWith(")");
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const inner = cleaned.slice(11, -1);

            let depth = 0;
            let splitIndex = -1;

            for (let i = 0; i < inner.length; i++) {
                const char = inner[i];
                if (char === "(") depth++;
                else if (char === ")") depth--;
                else if (char === "," && depth === 0) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex === -1) throw new Error("Invalid light-dark format");

            const color1 = inner.slice(0, splitIndex).trim();
            const color2 = inner.slice(splitIndex + 1).trim();

            const { theme } = config;
            return Color.from(theme === "light" ? color1 : color2).getCoords();
        },
    },
    "system-color": {
        isValid: (str: string) => {
            const { systemColors } = config;
            return Object.keys(systemColors).some((key) => key.toLowerCase() === str.trim().toLowerCase());
        },
        bridge: "rgb",
        toBridge: (coords: number[]) => coords,
        parse: (str: string) => {
            const { systemColors } = config;
            const cleaned = str.replace(/\s+/g, " ").trim().toLowerCase();
            const key = Object.keys(systemColors).find((k) => k.toLowerCase() === cleaned);
            const rgbArr = systemColors[key as keyof typeof systemColors][config.theme === "light" ? 0 : 1];
            return [...rgbArr, 1];
        },
    },
    ...colorBases,
} satisfies Record<string, ColorConverter>;
