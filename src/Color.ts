/* eslint-disable no-unused-vars */

/**
 * Represents a color in the XYZA color space with an optional alpha channel.
 * Format: [X, Y, Z, A?]
 */
export type XYZA = [number, number, number, number?];

/**
 * Represents a color in the RGBA color space with an optional alpha channel.
 * Format: [red, green, blue, alpha?]
 */
export type RGBA = [number, number, number, number?];

/**
 * The supported color format names, derived from the keys of the `formatConverters` object.
 * For example, valid values might include "hex", "rgb", "hsl", etc.
 */
export type Format = keyof typeof formatConverters;

/**
 * The supported color space names, derived from the keys of the `spaceConverters` object.
 * Examples include "srgb", "display-p3", "rec2020", etc.
 */
export type Space = keyof typeof spaceConverters;

/**
 * Represents a named color identifier, derived from the keys of the `namedColors` object.
 * Examples include "red", "darkslategrey", "mediumvioletred", etc.
 */
export type Name = keyof typeof namedColors;

/**
 * Represents a color model, which can be either a `Space` or a `Format` that has a converter with components.
 * Filters `Format` to only include those with `ConverterWithComponents`.
 */
export type Model = {
    [K in Format | Space]: (typeof converters)[K] extends ConverterWithComponents ? K : never;
}[Format | Space];

/**
 * Defines the properties of a color component within a converter.
 */
export type ComponentDefinition = {
    /** Position of the component in the color array */
    index: number;

    /** Minimum allowed value */
    min: number;

    /** Maximum allowed value */
    max: number;

    /** Whether the value loops (e.g., hue in HSL) */
    loop?: boolean;

    /** Precision for rounding the component value */
    precision?: number;
};

/**
 * Converter for color formats with components (e.g., RGB, HSL).
 */
export interface ConverterWithComponents {
    /** Regular expression to match the color string format. */
    pattern: RegExp;

    /** Component definitions for this format (e.g., 'r', 'g', 'b'). */
    components: Record<string, ComponentDefinition>;

    /** Converts a color string to an array of component values. */
    toComponents: (colorString: string) => number[];

    /** Converts an array of component values to a color string. */
    fromComponents: (colorArray: number[], options?: FormattingOptions) => string;

    /** Converts component values to XYZA color space. */
    toXYZA: (colorArray: number[]) => XYZA;

    /** Converts XYZA color space to component values. */
    fromXYZA: (xyza: XYZA) => number[];
}

/**
 * Converter for color formats without components (e.g., named colors or simple formats).
 */
export interface ConverterWithoutComponents {
    /** Regular expression to match the color string format. */
    pattern: RegExp;

    /** Identifier for the color model this converter applies to. */
    model: string;

    /** Converts a color string directly to XYZA color space. */
    toXYZA: (colorString: string) => XYZA;

    /** Converts XYZA color space directly to a color string. */
    fromXYZA: (xyza: XYZA) => string;
}

/**
 * Union type for all possible color converters.
 */
export type ColorConverter = ConverterWithComponents | ConverterWithoutComponents;

/**
 * Maps each `Format` to its corresponding converter.
 * Keys are specific format strings (e.g., 'rgb', 'hsl'), values are converters.
 */
export interface Converters {
    [key: string]: ColorConverter;
}

/**
 * Extracts the component names from a converter's component definitions,
 * adding the "alpha" channel as a possible component.
 *
 * @template T - A type which may include a `components` property.
 */
export type ComponentNames<T> = T extends {
    components: Record<infer N, ComponentDefinition>;
}
    ? N | "alpha"
    : never;

/**
 * Represents a component type for a given color model.
 *
 * @template M - The color model type.
 */
export type Component<M extends Model> = (typeof converters)[M] extends ConverterWithComponents
    ? ComponentNames<(typeof converters)[M]>
    : never;

/**
 * Defines operations on a color within a specific `Model`, enabling method chaining.
 */
export interface Interface<M extends Model> {
    /** Gets the value of a specific component. */
    get: (component: Component<M>) => number;

    /** Gets all component values as an object. */
    getComponents: () => { [K in Component<M>]: number };

    /** Gets all component values as an array. */
    getArray: () => number[];

    /** Sets component values using an object, supporting updater functions. */
    set: (values: Partial<{ [K in Component<M>]: number | ((prev: number) => number) }>) => Color & Interface<M>;

    /** Sets component values using an array. */
    setArray: (array: number[]) => Color & Interface<M>;

    /** Mixes this color with another by a specified amount. */
    mixWith: (color: string, amount?: number, hueInterpolationMethod?: HueInterpolationMethod) => Color & Interface<M>;
}

/**
 * Extracts only the `set` methods from a type, used for specific constraints.
 */
export type InterfaceWithSetOnly<T> = {
    [K in keyof T as K extends `set${string}` ? K : never]: T[K];
};

/**
 * Options for formatting color output.
 */
export interface FormattingOptions {
    /** Use modern syntax (e.g., `rgb(255 0 0)` vs `rgb(255, 0, 0)`). */
    modern?: boolean;
}

/**
 * Options for generating the next color, extending formatting options.
 */
export type ToNextColorOptions = FormattingOptions & {
    /** Color formats or spaces to exclude from the sequence. */
    exclude?: (Format | Space)[];
};

/**
 * Defines a color space’s transformation properties.
 */
export type SpaceMatrixMap = {
    /** Names of components in this space. */
    components: string[];

    /** Linearization function. */
    toLinear: (c: number) => number;

    /** Inverse linearization. */
    fromLinear: (c: number) => number;

    /** Matrix to convert to XYZ. */
    toXYZMatrix: number[][];

    /** Matrix to convert from XYZ. */
    fromXYZMatrix: number[][];
};

/**
 * Maps space identifiers to their matrix definitions.
 */
export type Spaces = Record<string, SpaceMatrixMap>;

/**
 * Specifies the method used for interpolating hue values during color mixing.
 *
 * Options:
 * - "shorter": Interpolate along the shorter angle between hues.
 * - "longer": Interpolate along the longer angle between hues.
 * - "increasing": Force hue values to increase.
 * - "decreasing": Force hue values to decrease.
 */
export type HueInterpolationMethod = "shorter" | "longer" | "increasing" | "decreasing";

/* eslint-enable no-unused-vars */

function multiplyMatrices(A: number[][] | number[], B: number[][] | number[]): number[][] | number[] {
    const m = Array.isArray(A[0]) ? A.length : 1;
    const A_matrix: number[][] = Array.isArray(A[0]) ? (A as number[][]) : [A as number[]];
    const B_matrix: number[][] = Array.isArray(B[0]) ? (B as number[][]) : (B as number[]).map((x) => [x]);
    const p = B_matrix[0].length;
    const B_cols = B_matrix[0].map((_, i) => B_matrix.map((x) => x[i]));
    const product = A_matrix.map((row) =>
        B_cols.map((col) => {
            return row.reduce((a, c, i) => a + c * (col[i] || 0), 0);
        })
    );
    if (m === 1) return product[0];
    if (p === 1) return product.map((x) => x[0]);
    return product;
}

/**
 * Creates a color space converter for a given color space.
 *
 * @returns An object containing:
 * - pattern: RegExp for parsing color strings
 * - components: Object defining the properties of each color component
 * - toComponents: Function to parse color strings into component arrays
 * - fromComponents: Function to convert component arrays to color strings
 * - toXYZA: Function to convert color components to XYZA values
 * - fromXYZA: Function to convert XYZA values back to color components
 *
 * @throws {Error} When invalid color string is provided to toComponents
 */
function createSpaceConverter<T extends string, C extends readonly string[]>(
    name: T,
    space: SpaceMatrixMap & { components: C; whitePoint?: "D50" | "D65" }
) {
    const isD50 = space.whitePoint === "D50";
    const toXYZMatrix = isD50 ? (multiplyMatrices(D50_to_D65, space.toXYZMatrix) as number[][]) : space.toXYZMatrix;
    const fromXYZMatrix = isD50
        ? (multiplyMatrices(space.fromXYZMatrix, D65_to_D50) as number[][])
        : space.fromXYZMatrix;

    const pattern = new RegExp(
        `^color\\(\\s*${name}\\s+(none|[\\d.]+%?)\\s+(none|[\\d.]+%?)\\s+(none|[\\d.]+%?)(?:\\s*\\/\\s*(none|[\\d.]+%?))?\\s*\\)$`,
        "i"
    );

    return {
        pattern,

        components: Object.fromEntries(
            space.components.map((comp, index) => [comp, { index, min: 0, max: 1, precision: 5 }])
        ) as { [K in C[number]]: ComponentDefinition }, // eslint-disable-line no-unused-vars

        toComponents: (colorString: string): number[] => {
            const match = colorString.match(pattern);
            if (!match) {
                throw new Error(`Invalid ${name} color: ${colorString}`);
            }
            const parseComponent = (s: string): number => {
                if (s === "none") return 0;
                if (s.endsWith("%")) return parseFloat(s.slice(0, -1)) / 100;
                return parseFloat(s);
            };
            const parseAlpha = (s: string | undefined): number => {
                if (s == null) return 1;
                if (s === "none") return 0;
                if (s.endsWith("%")) return parseFloat(s) / 100;
                return parseFloat(s);
            };
            const components = [1, 2, 3].map((i) => parseComponent(match[i]));
            const alpha = parseAlpha(match[4]);
            return [...components, alpha];
        },

        fromComponents: (colorArray: (number | undefined)[]): string => {
            const [comp1, comp2, comp3, alpha = 1] = colorArray;
            const compStr = [comp1, comp2, comp3].map((c) => c).join(" ");
            const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
            return `color(${name} ${compStr}${alphaStr})`;
        },

        toXYZA: (colorArray: number[]): XYZA => {
            const [r, g, b, a = 1] = colorArray;
            const linear = [space.toLinear(r), space.toLinear(g), space.toLinear(b)];
            const [X, Y, Z] = multiplyMatrices(toXYZMatrix, linear) as number[];
            return [X, Y, Z, a];
        },

        fromXYZA: (xyza: XYZA): number[] => {
            const [X, Y, Z, a = 1] = xyza;
            const [lr, lg, lb] = multiplyMatrices(fromXYZMatrix, [X, Y, Z]) as number[];
            const r = space.fromLinear ? space.fromLinear(lr) : lr;
            const g = space.fromLinear ? space.fromLinear(lg) : lg;
            const b = space.fromLinear ? space.fromLinear(lb) : lb;
            return [r, g, b, a];
        },
    } satisfies ConverterWithComponents;
}

const D50_to_D65 = [
    [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
    [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
    [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];

const D65_to_D50 = [
    [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
    [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
    [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

/**
 * A collection of named colors and their RGBA values.
 */
const namedColors = {
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
 */
const formatConverters = (() => {
    const percentage = "(?:none|(?:100(?:\\.0+)?|(?:\\d{1,2}(?:\\.\\d+)?|\\.[0-9]+))%)";
    const percentageOptional = "(?:none|(?:100(?:\\.0+)?|(?:\\d{1,2}(?:\\.\\d+)?|\\.[0-9]+))(?:%)?)";
    const rgbNum = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|\\d{1,2})(?:\\.\\d+)?";
    const rgbComponent = `(?:${rgbNum}|${percentage})`;
    const spaceOrComma = "\\s*(?:,\\s*|\\s+)";
    const slashOrComma = "(?:\\s*(?:,\\s*|\\s+|\\/\\s*)";
    const hue = "(none|[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:deg)?)";
    const alphaNum = "(?:0|1|0?\\.\\d+)";
    const alpha = `(?:(?:${alphaNum})|(?:${percentage})|(?:none))`;
    const labComponent = "(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?|none)";
    const lchChroma = "((?:\\d+(?:\\.\\d+)?|\\.\\d+)%?|none)";
    const lchPercentage = "(" + percentage + "|" + labComponent.replace(/^\(|\|none\)$/g, "") + "|none)";

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

    const OKLabtoLMS = [
        [1.0, 0.3963377773761749, 0.2158037573099136],
        [1.0, -0.1055613458156586, -0.0638541728258133],
        [1.0, -0.0894841775298119, -1.2914855480194092],
    ];

    const LMStoXYZ = [
        [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
        [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
        [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
    ];

    const converters = {
        rgb: {
            pattern: new RegExp(
                "^rgba?\\(\\s*" +
                    rgbComponent +
                    spaceOrComma +
                    rgbComponent +
                    spaceOrComma +
                    rgbComponent +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                r: { index: 0, min: 0, max: 255, precision: 0 },
                g: { index: 1, min: 0, max: 255, precision: 0 },
                b: { index: 2, min: 0, max: 255, precision: 0 },
            },

            toComponents: (rgbStr: string) => {
                const convert = (value: string) => {
                    if (value.toLowerCase() === "none") return 0;
                    return Math.round(value.includes("%") ? (parseFloat(value) / 100) * 255 : parseFloat(value));
                };

                const match = rgbStr.match(/(\d*\.?\d+%?|none)/gi);
                if (!match || match.length < 3) {
                    throw new Error(`Invalid RGB color format: ${rgbStr}`);
                }

                const r = convert(match[0]);
                const g = convert(match[1]);
                const b = convert(match[2]);

                /* eslint-disable indent */
                const a =
                    match[3] != null
                        ? match[3].toLowerCase() === "none"
                            ? 1
                            : match[3].includes("%")
                              ? parseFloat(match[3]) / 100
                              : parseFloat(match[3])
                        : 1;
                /* eslint-enable indent */

                return [r, g, b, a];
            },

            fromComponents: (rgbArray: number[], options?: FormattingOptions) => {
                const [r, g, b, a = 1] = rgbArray;
                if (options?.modern) {
                    if (a === 1) {
                        return `rgb(${r} ${g} ${b})`;
                    } else {
                        const alphaPercentage = Math.round(a * 100);
                        return `rgb(${r} ${g} ${b} / ${alphaPercentage}%)`;
                    }
                } else {
                    if (a === 1) {
                        return `rgb(${r}, ${g}, ${b})`;
                    } else {
                        return `rgba(${r}, ${g}, ${b}, ${a})`;
                    }
                }
            },

            fromXYZA: (xyza: XYZA): number[] => {
                const toSrgb = (value: number) => {
                    const v = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
                    return v * 255;
                };

                const [X, Y, Z, a = 1] = xyza;
                const lr = (12831 / 3959) * X + (-329 / 214) * Y + (-1974 / 3959) * Z;
                const lg = (-851781 / 878810) * X + (1648619 / 878810) * Y + (36519 / 878810) * Z;
                const lb = (705 / 12673) * X + (-2585 / 12673) * Y + (705 / 667) * Z;
                const r = toSrgb(lr);
                const g = toSrgb(lg);
                const b = toSrgb(lb);
                return [r, g, b, a];
            },

            toXYZA: (rgbArray: number[]): XYZA => {
                const toLinear = (value: number) => {
                    const v = value / 255;
                    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                };

                const [r, g, b, a = 1] = rgbArray;
                const lr = toLinear(r);
                const lg = toLinear(g);
                const lb = toLinear(b);
                const X = (506752 / 1228815) * lr + (87881 / 245763) * lg + (12673 / 70218) * lb;
                const Y = (87098 / 409605) * lr + (175762 / 245763) * lg + (12673 / 175545) * lb;
                const Z = (7918 / 409605) * lr + (87881 / 737289) * lg + (1001167 / 1053270) * lb;
                return [X, Y, Z, a];
            },
        },

        named: {
            pattern: new RegExp(`^\\b(${Object.keys(namedColors).join("|")})\\b$`, "i"),
            model: "rgb",
            toXYZA: (named: string): XYZA => {
                const cleanedName = named.replace(/(?:\s+|-)/g, "").toLowerCase();
                const rgb = namedColors[cleanedName as Name];

                if (!rgb) {
                    throw new Error(`Invalid named color: ${named}`);
                }

                return converters.rgb.toXYZA([rgb[0], rgb[1], rgb[2], rgb[3] ?? 1]);
            },
            fromXYZA: (xyza: XYZA): string => {
                const [r, g, b, a] = converters.rgb.fromXYZA(xyza);
                const clampedR = Math.max(0, Math.min(255, Math.round(r)));
                const clampedG = Math.max(0, Math.min(255, Math.round(g)));
                const clampedB = Math.max(0, Math.min(255, Math.round(b)));

                for (const [name, rgb] of Object.entries(namedColors)) {
                    if (
                        clampedR === rgb[0] &&
                        clampedG === rgb[1] &&
                        clampedB === rgb[2] &&
                        (rgb[3] === undefined || rgb[3] === a)
                    ) {
                        return name;
                    }
                }
                throw new Error(
                    `No named color found for the color ${converters.rgb.fromComponents([clampedR, clampedG, clampedB, a])}`
                );
            },
        },

        hex: {
            pattern: /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})\b$/,
            model: "rgb",
            toXYZA: (hex: string): XYZA => {
                const match = hex.match(converters.hex.pattern);
                if (!match) {
                    throw new Error(`Invalid HEX color format: ${hex}`);
                }

                const HEX = hex.slice(1);
                let r: number = 0,
                    g: number = 0,
                    b: number = 0,
                    a: number = 1;

                if (HEX.length === 3) {
                    r = parseInt(HEX[0] + HEX[0], 16);
                    g = parseInt(HEX[1] + HEX[1], 16);
                    b = parseInt(HEX[2] + HEX[2], 16);
                } else if (HEX.length === 4) {
                    r = parseInt(HEX[0] + HEX[0], 16);
                    g = parseInt(HEX[1] + HEX[1], 16);
                    b = parseInt(HEX[2] + HEX[2], 16);
                    a = parseInt(HEX[3] + HEX[3], 16) / 255;
                } else if (HEX.length === 6) {
                    r = parseInt(HEX.slice(0, 2), 16);
                    g = parseInt(HEX.slice(2, 4), 16);
                    b = parseInt(HEX.slice(4, 6), 16);
                } else if (HEX.length === 8) {
                    r = parseInt(HEX.slice(0, 2), 16);
                    g = parseInt(HEX.slice(2, 4), 16);
                    b = parseInt(HEX.slice(4, 6), 16);
                    a = parseInt(HEX.slice(6, 8), 16) / 255;
                }

                const rgbArray = converters.rgb.toComponents(`rgb(${r}, ${g}, ${b})`);
                const [X, Y, Z] = converters.rgb.toXYZA(rgbArray);
                return [X, Y, Z, a];
            },
            fromXYZA: (xyza: XYZA) => {
                const [r, g, b, a] = converters.rgb.fromXYZA(xyza);
                const clampedR = Math.max(0, Math.min(255, Math.round(r)));
                const clampedG = Math.max(0, Math.min(255, Math.round(g)));
                const clampedB = Math.max(0, Math.min(255, Math.round(b)));

                const toHex = (x: number) => {
                    const hex = Math.round(x).toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                };

                const rHex = toHex(clampedR);
                const gHex = toHex(clampedG);
                const bHex = toHex(clampedB);

                if (a === 1) {
                    return `#${rHex}${gHex}${bHex}`.toUpperCase();
                } else {
                    const aHex = toHex(Math.round(a * 255));
                    return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
                }
            },
        },

        hsl: {
            pattern: new RegExp(
                "^hsla?\\(\\s*" +
                    hue +
                    spaceOrComma +
                    percentageOptional +
                    spaceOrComma +
                    percentageOptional +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                h: { index: 0, min: 0, max: 360, loop: true, precision: 0 },
                s: { index: 1, min: 0, max: 100, precision: 1 },
                l: { index: 2, min: 0, max: 100, precision: 1 },
            },

            toComponents: (hslStr: string): number[] => {
                const inner = hslStr
                    .replace(/^[^(]+\(/, "")
                    .replace(/\)$/, "")
                    .trim();
                const partsBySlash = inner.split("/").map((p) => p.trim());
                let alpha = 1;
                let parts;

                const parseAlpha = (alphaStr: string) => {
                    alphaStr = alphaStr.trim().toLowerCase();
                    if (alphaStr === "none") return 1;
                    if (alphaStr.endsWith("%")) {
                        return parseFloat(alphaStr) / 100;
                    }
                    return parseFloat(alphaStr);
                };

                if (partsBySlash.length === 2) {
                    alpha = parseAlpha(partsBySlash[1]);
                    parts = partsBySlash[0].split(/[\s,]+/);
                } else {
                    parts = inner.split(/[\s,]+/);
                    if (parts.length === 4) {
                        alpha = parseAlpha(parts.pop() as string);
                    }
                }

                if (parts.length < 3) {
                    throw new Error(`Invalid HSL(A) format: ${hslStr}`);
                }

                const hStr = parts[0].toLowerCase() === "none" ? "0" : parts[0];
                const hClean = hStr.replace(/deg$/i, "");
                const h = parseFloat(hClean);

                const sStr = parts[1].toLowerCase() === "none" ? "0" : parts[1];
                const s = parseFloat(sStr.replace("%", ""));

                const lStr = parts[2].toLowerCase() === "none" ? "0" : parts[2];
                const l = parseFloat(lStr.replace("%", ""));

                return [h, s, l, alpha];
            },

            fromComponents: (hslArray: number[], options: FormattingOptions = { modern: false }) => {
                const [h, s, l, a = 1] = hslArray;
                if (options.modern) {
                    if (a === 1) {
                        return `hsl(${h} ${s}% ${l}%)`;
                    } else {
                        const alphaPercentage = Math.round(a * 100);
                        return `hsl(${h} ${s}% ${l}% / ${alphaPercentage}%)`;
                    }
                } else {
                    if (a === 1) {
                        return `hsl(${h}, ${s}%, ${l}%)`;
                    } else {
                        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
                    }
                }
            },

            fromXYZA: (xyza: XYZA): number[] => {
                const rgb = converters.rgb.fromXYZA(xyza);
                const [r, g, b] = rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))));
                const a = rgb[3];

                const rNorm = r / 255;
                const gNorm = g / 255;
                const bNorm = b / 255;
                const max = Math.max(rNorm, gNorm, bNorm);
                const min = Math.min(rNorm, gNorm, bNorm);
                const chroma = max - min;
                let hue = 0;
                if (chroma !== 0) {
                    if (max === rNorm) {
                        hue = ((gNorm - bNorm) / chroma) % 6;
                    } else if (max === gNorm) {
                        hue = (bNorm - rNorm) / chroma + 2;
                    } else {
                        hue = (rNorm - gNorm) / chroma + 4;
                    }
                    hue *= 60;
                    if (hue < 0) hue += 360;
                }
                const lightness = (max + min) / 2;
                const saturation = lightness === 0 || lightness === 1 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));
                return [Math.round(hue), Math.round(saturation * 100), Math.round(lightness * 100), a];
            },

            toXYZA: (hslArray: number[]): XYZA => {
                const [h, s, l, a = 1] = hslArray;
                const hNorm = h / 360;
                const sNorm = s / 100;
                const lNorm = l / 100;
                const chroma = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
                const hPrime = hNorm * 6;
                const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
                let r1 = 0,
                    g1 = 0,
                    b1 = 0;
                const sector = Math.floor(hPrime) % 6;

                /* eslint-disable indent */
                switch (sector) {
                    case 0:
                        r1 = chroma;
                        g1 = x;
                        b1 = 0;
                        break;
                    case 1:
                        r1 = x;
                        g1 = chroma;
                        b1 = 0;
                        break;
                    case 2:
                        r1 = 0;
                        g1 = chroma;
                        b1 = x;
                        break;
                    case 3:
                        r1 = 0;
                        g1 = x;
                        b1 = chroma;
                        break;
                    case 4:
                        r1 = x;
                        g1 = 0;
                        b1 = chroma;
                        break;
                    case 5:
                        r1 = chroma;
                        g1 = 0;
                        b1 = x;
                        break;
                }
                /* eslint-enable indent */

                const m = lNorm - chroma / 2;
                const red = (r1 + m) * 255;
                const green = (g1 + m) * 255;
                const blue = (b1 + m) * 255;
                const rgbArray = converters.rgb.toComponents(`rgb(${red}, ${green}, ${blue}, ${a})`);
                return converters.rgb.toXYZA(rgbArray);
            },
        },

        hwb: {
            pattern: new RegExp(
                "^hwb\\(\\s*" +
                    hue +
                    spaceOrComma +
                    percentageOptional +
                    spaceOrComma +
                    percentageOptional +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                h: { index: 0, min: 0, max: 360, loop: true, precision: 3 },
                w: { index: 1, min: 0, max: 100, precision: 3 },
                b: { index: 2, min: 0, max: 100, precision: 3 },
            },

            toComponents: (hwbStr: string) => {
                const inner = hwbStr
                    .replace(/^[^(]+\(/, "")
                    .replace(/\)$/, "")
                    .trim();
                const partsBySlash = inner.split("/").map((p) => p.trim());
                let alpha = 1;
                let parts;

                const parseAlpha = (alphaStr: string) => {
                    alphaStr = alphaStr.trim().toLowerCase();
                    if (alphaStr === "none") return 1;
                    if (alphaStr.endsWith("%")) {
                        return parseFloat(alphaStr) / 100;
                    }
                    return parseFloat(alphaStr);
                };

                if (partsBySlash.length === 2) {
                    alpha = parseAlpha(partsBySlash[1]);
                    parts = partsBySlash[0].split(/[\s,]+/);
                } else {
                    parts = inner.split(/[\s,]+/);
                    if (parts.length === 4) {
                        alpha = parseAlpha(parts.pop() as string);
                    }
                }

                if (parts.length < 3) {
                    throw new Error(`Invalid HWB format: ${hwbStr}`);
                }

                const hStr = parts[0].toLowerCase() === "none" ? "0" : parts[0];
                const hClean = hStr.replace(/deg$/i, "");
                const h = parseFloat(hClean);

                const wStr = parts[1].toLowerCase() === "none" ? "0" : parts[1];
                const w = parseFloat(wStr.replace("%", ""));

                const bStr = parts[2].toLowerCase() === "none" ? "0" : parts[2];
                const b = parseFloat(bStr.replace("%", ""));

                return [h, w, b, alpha];
            },

            fromComponents: (hwbArray: number[]) => {
                const [h, w, bl, alpha = 1] = hwbArray;
                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
                return `hwb(${Math.round(h)} ${Math.round(w)}% ${Math.round(bl)}%${alphaStr})`;
            },

            fromXYZA: (xyza: XYZA): number[] => {
                const rgb = converters.rgb.fromXYZA(xyza);
                const [r, g, b] = rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))));
                const a = rgb[3];

                const rNorm = r / 255;
                const gNorm = g / 255;
                const bNorm = b / 255;
                const max = Math.max(rNorm, gNorm, bNorm);
                const min = Math.min(rNorm, gNorm, bNorm);
                let hue = 0;
                if (max !== min) {
                    if (max === rNorm) {
                        hue = ((gNorm - bNorm) / (max - min)) % 6;
                    } else if (max === gNorm) {
                        hue = (bNorm - rNorm) / (max - min) + 2;
                    } else {
                        hue = (rNorm - gNorm) / (max - min) + 4;
                    }
                    hue = hue * 60;
                    if (hue < 0) hue += 360;
                }
                const whiteness = min * 100;
                const blackness = (1 - max) * 100;
                return [Math.round(hue), Math.round(whiteness), Math.round(blackness), a];
            },

            toXYZA: (hwbArray: number[]): XYZA => {
                const [h, w, bl, a = 1] = hwbArray;
                const W = w / 100;
                const Bl = bl / 100;
                if (W + Bl >= 1) {
                    const gray = W / (W + Bl);
                    const c = gray * 255;
                    const rgbArray = converters.rgb.toComponents(`rgb(${c}, ${c}, ${c}, ${a})`);
                    return converters.rgb.toXYZA(rgbArray);
                }

                let hue = h % 360;
                if (hue < 0) hue += 360;
                const hPrime = hue / 60;
                const C = 1;
                const x = C * (1 - Math.abs((hPrime % 2) - 1));
                let r1 = 0,
                    g1 = 0,
                    b1 = 0;
                if (hPrime >= 0 && hPrime < 1) {
                    r1 = C;
                    g1 = x;
                    b1 = 0;
                } else if (hPrime < 2) {
                    r1 = x;
                    g1 = C;
                    b1 = 0;
                } else if (hPrime < 3) {
                    r1 = 0;
                    g1 = C;
                    b1 = x;
                } else if (hPrime < 4) {
                    r1 = 0;
                    g1 = x;
                    b1 = C;
                } else if (hPrime < 5) {
                    r1 = x;
                    g1 = 0;
                    b1 = C;
                } else if (hPrime < 6) {
                    r1 = C;
                    g1 = 0;
                    b1 = x;
                }

                const red = (r1 * (1 - W - Bl) + W) * 255;
                const green = (g1 * (1 - W - Bl) + W) * 255;
                const blue = (b1 * (1 - W - Bl) + W) * 255;
                const rgbArray = converters.rgb.toComponents(`rgb(${red}, ${green}, ${blue}, ${a})`);
                return converters.rgb.toXYZA(rgbArray);
            },
        },

        lab: {
            pattern: new RegExp(
                "^lab\\(\\s*" +
                    labComponent +
                    spaceOrComma +
                    labComponent +
                    spaceOrComma +
                    labComponent +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                l: { index: 0, min: 0, max: 100, precision: 5 },
                a: { index: 1, min: -125, max: 125, precision: 5 },
                b: { index: 2, min: -125, max: 125, precision: 5 },
            },

            toComponents: (labStr: string): number[] => {
                const match = labStr.match(converters.lab.pattern);
                if (!match) {
                    throw new Error(`Invalid LAB color format: ${labStr}`);
                }
                const convertComponent = (value: string, isL = false) => {
                    if (value === "none") return 0;
                    if (value.includes("%")) {
                        const percent = parseFloat(value) / 100;
                        return isL ? percent * 100 : percent * 125;
                    }
                    return parseFloat(value);
                };
                const L = convertComponent(match[1], true);
                const A = convertComponent(match[2]);
                const B = convertComponent(match[3]);

                /* eslint-disable indent */
                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;
                /* eslint-enable indent */

                return [L, A, B, alpha];
            },

            fromComponents: (labArray: number[]) => {
                const [L, A, B, alpha = 1] = labArray;

                const lPrecision = converters.lab.components.l.precision;
                const aPrecision = converters.lab.components.a.precision;
                const bPrecision = converters.lab.components.b.precision;

                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";

                return `lab(${L.toFixed(lPrecision)} ${A.toFixed(aPrecision)} ${B.toFixed(bPrecision)}${alphaStr})`;
            },

            toXYZA: (labComponents: number[]): XYZA => {
                const [L, A, B, alpha = 1] = labComponents;
                const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
                const κ = 24389 / 27;
                const ε = 216 / 24389;
                const fy = (L + 16) / 116;
                const fx = fy + A / 500;
                const fz = fy - B / 200;
                const xyz = [
                    Math.pow(fx, 3) > ε ? Math.pow(fx, 3) : (116 * fx - 16) / κ,
                    L > κ * ε ? Math.pow(fy, 3) : L / κ,
                    Math.pow(fz, 3) > ε ? Math.pow(fz, 3) : (116 * fz - 16) / κ,
                ];
                const [X_D50, Y_D50, Z_D50] = xyz.map((value, i) => value * D50[i]);
                const [X, Y, Z] = multiplyMatrices([X_D50, Y_D50, Z_D50], D50_to_D65) as number[];
                return [X, Y, Z, alpha];
            },

            fromXYZA: (xyza: XYZA) => {
                const [X, Y, Z, alpha = 1] = xyza;
                const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
                const ε = 216 / 24389;
                const κ = 24389 / 27;
                const [X_D50, Y_D50, Z_D50] = multiplyMatrices([X, Y, Z], D65_to_D50) as number[];
                const xyz = [X_D50 / D50[0], Y_D50 / D50[1], Z_D50 / D50[2]];
                const f = xyz.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
                return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2]), alpha];
            },
        },

        lch: {
            pattern: new RegExp(
                "^lch\\(\\s*" +
                    lchPercentage +
                    spaceOrComma +
                    lchChroma +
                    spaceOrComma +
                    hue +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                l: { index: 0, min: 0, max: 100, precision: 5 },
                c: { index: 1, min: 0, max: 150, precision: 5 },
                h: { index: 2, min: 0, max: 360, loop: true, precision: 5 },
            },

            toComponents: (lchStr: string): number[] => {
                const match = lchStr.match(converters.lch.pattern);
                if (!match) {
                    throw new Error(`Invalid LCH color format: ${lchStr}`);
                }
                const convertComponent = (value: string, type: string) => {
                    if (value === "none") return 0;
                    if (value.includes("%")) {
                        const percent = parseFloat(value) / 100;
                        if (type === "L") return percent * 100;
                        if (type === "C") return percent * 150;
                        if (type === "H") return percent * 360;
                    }
                    return parseFloat(value);
                };
                const L = convertComponent(match[1], "L");
                const C = convertComponent(match[2], "C");
                const H = convertComponent(match[3], "H");

                /* eslint-disable indent */
                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;
                /* eslint-enable indent */

                return [L, C, H, alpha];
            },

            fromComponents: (lchArray: number[]) => {
                const [L, C, H, alpha = 1] = lchArray;

                const lPrecision = converters.lch.components.l.precision;
                const cPrecision = converters.lch.components.c.precision;
                const hPrecision = converters.lch.components.h.precision;

                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";

                return `lch(${L.toFixed(lPrecision)} ${C.toFixed(cPrecision)} ${H.toFixed(hPrecision)}${alphaStr})`;
            },

            toXYZA: (lchArray: number[]) => {
                const [L, C, H, alpha = 1] = lchArray;
                const Lab = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
                return converters.lab.toXYZA(Lab.concat([alpha]));
            },

            fromXYZA: (xyza: XYZA) => {
                const [L, A, B, alpha] = converters.lab.fromXYZA(xyza);
                const C = Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2));
                let H = (Math.atan2(B, A) * 180) / Math.PI;
                H = H >= 0 ? H : H + 360;
                return [L, C, H, alpha];
            },
        },

        oklab: {
            pattern: new RegExp(
                "^oklab\\(\\s*" +
                    labComponent +
                    spaceOrComma +
                    labComponent +
                    spaceOrComma +
                    labComponent +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                l: { index: 0, min: 0, max: 1, precision: 5 },
                a: { index: 1, min: -0.4, max: 0.4, precision: 5 },
                b: { index: 2, min: -0.4, max: 0.4, precision: 5 },
            },

            toComponents: (oklabStr: string) => {
                const parseComponent = (value: string, isL = false) => {
                    if (value === "none") return 0;
                    const isPercentage = value.endsWith("%");
                    const num = parseFloat(value);
                    if (isPercentage) {
                        if (isL) return num / 100;
                        return (num / 100) * 0.4;
                    }
                    return num;
                };

                const match = oklabStr.match(converters.oklab.pattern);
                if (!match) throw new Error(`Invalid OKLab format: ${oklabStr}`);

                const L = parseComponent(match[1], true);
                const a = parseComponent(match[2]);
                const b = parseComponent(match[3]);

                /* eslint-disable indent */
                const alpha = match[4]
                    ? match[4] === "none"
                        ? 0
                        : match[4].endsWith("%")
                          ? parseFloat(match[4]) / 100
                          : parseFloat(match[4])
                    : 1;
                /* eslint-enable indent */

                return [L, a, b, alpha];
            },

            fromComponents: (oklabArray: number[]) => {
                const [L, a, b, alpha = 1] = oklabArray;
                const lPrecision = converters.oklab.components.l.precision;
                const aPrecision = converters.oklab.components.a.precision;
                const bPrecision = converters.oklab.components.b.precision;

                const formattedL = L.toFixed(lPrecision);
                const formattedA = a.toFixed(aPrecision);
                const formattedB = b.toFixed(bPrecision);

                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";

                return `oklab(${formattedL} ${formattedA} ${formattedB}${alphaStr})`;
            },

            toXYZA: (oklabArray: number[]): XYZA => {
                const [L, a, b, alpha = 1] = oklabArray;

                const LMSnl = multiplyMatrices(OKLabtoLMS, [L, a, b]) as number[];
                const LMSlinear = LMSnl.map((c) => c ** 3);
                const XYZ = multiplyMatrices(LMStoXYZ, LMSlinear) as number[];

                return [XYZ[0], XYZ[1], XYZ[2], alpha];
            },

            fromXYZA: (xyza: XYZA) => {
                const [X, Y, Z, alpha = 1] = xyza;

                const LMSnl = multiplyMatrices(XYZtoLMS, [X, Y, Z]) as number[];
                const LMS = LMSnl.map((c) => Math.cbrt(c));
                const OKLab = multiplyMatrices(LMStoOKLab, LMS) as number[];

                return [OKLab[0], OKLab[1], OKLab[2], alpha];
            },
        },

        oklch: {
            pattern: new RegExp(
                "^oklch\\(\\s*" +
                    lchPercentage +
                    spaceOrComma +
                    lchChroma +
                    spaceOrComma +
                    hue +
                    slashOrComma +
                    "(" +
                    alpha +
                    ")" +
                    ")?\\s*\\)$",
                "i"
            ),

            components: {
                l: { index: 0, min: 0, max: 1, precision: 5 },
                c: { index: 1, min: 0, max: 0.4, precision: 5 },
                h: { index: 2, min: 0, max: 360, loop: true, precision: 5 },
            },

            toComponents: (oklchStr: string) => {
                const parseComponent = (value: string, isL = false, isC = false) => {
                    if (value === "none") return 0;
                    const isPercentage = value.endsWith("%");
                    const num = parseFloat(value);
                    if (isPercentage) {
                        if (isL) return num / 100;
                        if (isC) return (num / 100) * 0.4;
                        return num / 100;
                    }
                    return num;
                };

                const parseAngle = (value: string) => {
                    if (value === "none") return 0;
                    const match = value.match(/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/);
                    if (!match) throw new Error(`Invalid angle: ${value}`);
                    let num = parseFloat(match[1]);

                    /* eslint-disable indent */
                    switch (match[2]) {
                        case "rad":
                            num *= 180 / Math.PI;
                            break;
                        case "grad":
                            num *= 0.9;
                            break;
                        case "turn":
                            num *= 360;
                            break;
                        default:
                            break;
                    }
                    /* eslint-enable indent */

                    return ((num % 360) + 360) % 360;
                };

                const match = oklchStr.match(converters.oklch.pattern);
                if (!match) throw new Error(`Invalid OKLCH format: ${oklchStr}`);

                const L = parseComponent(match[1], true);
                const C = parseComponent(match[2], false, true);
                const h = parseAngle(match[3]);
                const alpha = match[4] ? (match[4] === "none" ? 0 : parseComponent(match[4])) : 1;

                return [L, C, h, alpha];
            },

            fromComponents: (oklchComponents: number[]) => {
                const [L, C, h, alpha = 1] = oklchComponents;
                const lPrecision = converters.oklch.components.l.precision;
                const cPrecision = converters.oklch.components.c.precision;
                const hPrecision = converters.oklch.components.h.precision;

                const formattedL = L.toFixed(lPrecision);
                const formattedC = C.toFixed(cPrecision);
                const formattedH = h.toFixed(hPrecision);

                const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";

                return `oklch(${formattedL} ${formattedC} ${formattedH}${alphaStr})`;
            },

            toXYZA: (oklchComponents: number[]): XYZA => {
                const [L, C, h, alpha = 1] = oklchComponents;

                const hRad = (h * Math.PI) / 180;
                const a = C * Math.cos(hRad);
                const b = C * Math.sin(hRad);

                return converters.oklab.toXYZA([L, a, b, alpha]);
            },

            fromXYZA: (xyza: XYZA) => {
                const [X, Y, Z, alpha = 1] = xyza;

                const OKLab = converters.oklab.fromXYZA([X, Y, Z, alpha]);
                const [L_oklab, a, b] = OKLab;

                const C = Math.sqrt(a ** 2 + b ** 2);
                let h = (Math.atan2(b, a) * 180) / Math.PI;
                if (h < 0) h += 360;

                return [L_oklab, C, h, alpha];
            },
        },
    };

    return converters;
})();

/**
 * A collection of color space converters for various color spaces.
 */
const spaceConverters = (() => {
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
            components: ["x", "y", "z"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: identityMatrix,
            fromXYZMatrix: identityMatrix,
            whitePoint: "D65",
        }),

        "xyz-d50": createSpaceConverter("xyz-d50", {
            components: ["x", "y", "z"],
            toLinear: identity,
            fromLinear: identity,
            toXYZMatrix: identityMatrix,
            fromXYZMatrix: identityMatrix,
            whitePoint: "D50",
        }),

        xyz: createSpaceConverter("xyz", {
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
const converters = (() => {
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

/**
 * The `Color` class represents a dynamic CSS color object, allowing for the manipulation
 * and retrieval of colors in various formats (e.g., RGB, HEX, HSL). This class provides
 * methods to modify the color values, convert between formats, and interact with CSS properties.
 */
class Color {
    private _xyza: XYZA = [0, 0, 0, 1];

    /**
     * The name of the color.
     * This property can be a string or undefined.
     */
    private name: string | undefined;

    constructor(x: number, y: number, z: number, a?: number) {
        this.xyza = [x, y, z, a];
    }

    /**
     * Gets the XYZA color values.
     *
     * @returns A tuple containing the X, Y, Z, and A (alpha) color values.
     *          If the alpha value is not defined, it defaults to 1.
     */
    private get xyza(): [number, number, number, number] {
        const [x, y, z, a = 1] = this._xyza;
        return [x, y, z, a];
    }

    /**
     * Sets the XYZA color value and updates the corresponding RGB and color name.
     *
     * @param newValue An array representing the XYZA color value. The array contains four elements:
     *                   - x: The X component of the color.
     *                   - y: The Y component of the color.
     *                   - z: The Z component of the color.
     *                   - a: The alpha (opacity) component of the color. Defaults to 1 if not provided.
     */
    private set xyza(newValue: XYZA) {
        this._xyza = newValue;

        const [r1, g1, b1, a1 = 1] = this.in("rgb").getArray();

        for (const [name, rgb] of Object.entries(namedColors)) {
            const [r2, g2, b2, a2 = 1] = rgb;
            if (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2) {
                this.name = name;
                break;
            }
        }
    }

    /**
     * ────────────────────────────────────────────────────────
     * Static Variables
     * ────────────────────────────────────────────────────────
     */

    /**
     * A collection of regular expressions for parsing color strings.
     */
    // eslint-disable-next-line no-unused-vars
    static patterns: { [K in Format | Space | "relative" | "color-mix"]: RegExp } = (() => {
        const formatPatterns = Object.values(formatConverters)
            .map((fc) => fc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const spacePatterns = Object.values(spaceConverters)
            .map((sc) => sc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const color = `(?:${formatPatterns}|${spacePatterns})`;

        const relative = (() => {
            const funcNames = "color|" + Object.keys(formatConverters).join("|");
            const spaceNames = Object.keys(spaceConverters).join("|");
            const numberOrCalc = "([a-z]+|calc\\((?:[^()]+|\\([^()]*\\))*\\)|[+-]?\\d*\\.?\\d+(?:%|[a-z]+)?)";
            const components = `${numberOrCalc}(?:\\s+${numberOrCalc}){2,3}`;
            const alpha = `(?:\\s*\\/\\s*${numberOrCalc})?`;
            const pattern = `^(${funcNames})\\(\\s*from\\s+(${color})((?:\\s+(${spaceNames}))?\\s+${components}${alpha})\\s*\\)$`;
            return new RegExp(pattern, "i");
        })();

        const colorMix = (() => {
            const modelNames = Object.keys(converters).join("|");
            const percentage = "(?:(?:100(?:\\.0+)?|(?:\\d{1,2}(?:\\.\\d+)?|\\.[0-9]+))%)";
            const hueInterpolationMethods = "shorter|longer|increasing|decreasing";
            const colorWithOptionalPercentage = `${color}(?:\\s+${percentage})?`;
            const pattern = `^color-mix\\(\\s*in\\s+(${modelNames})(?:\\s+(${hueInterpolationMethods})\\s+hue)?\\s*,\\s*${colorWithOptionalPercentage}\\s*,\\s*${colorWithOptionalPercentage}\\s*\\)$`;
            return new RegExp(pattern, "i");
        })();

        return {
            ...Object.fromEntries(Object.entries(converters).map(([key, value]) => [key, value.pattern])),
            relative,
            "color-mix": colorMix,
        } as { [K in Format | Space | "relative" | "color-mix"]: RegExp }; // eslint-disable-line no-unused-vars
    })();

    /**
     * ────────────────────────────────────────────────────────
     * Static Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * ────────────────────────────────────────────────────────
     * Parsing Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Creates a new `Color` instance from a given color string and optional format.
     *
     * @param color - The color string to convert.
     * @returns A new `Color` instance.
     */
    static from(color: Name): Color; // eslint-disable-line no-unused-vars
    static from(color: string): Color; // eslint-disable-line no-unused-vars
    static from(color: Name | string) {
        color = color.toLowerCase();

        if (Color.isRelative(color)) {
            const { type, components } = Color.parseRelative(color);
            return Color.in(type).setArray(components);
        }

        if (Color.isColorMix(color)) {
            const parsed = Color.parseColorMix(color);
            const { model, hueInterpolationMethod, color1, color2 } = parsed;
            let { weight1, weight2 } = parsed;

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

            const weight2Prime = weight2 / (weight1 + weight2);

            const colorInstance = Color.from(color1).in(model).mixWith(color2, weight2Prime, hueInterpolationMethod);

            // Create a new Color instance because .in(model) methods return chainable .in(model) methods.
            return new Color(...colorInstance.xyza);
        }

        for (const [, converter] of Object.entries(converters)) {
            if (converter.pattern.test(color)) {
                let x, y, z, a;
                if ("components" in converter) {
                    const components = converter.toComponents(color);
                    [x, y, z, a] = converter.toXYZA(components);
                } else {
                    [x, y, z, a] = converter.toXYZA(color);
                }
                return new Color(x, y, z, a);
            }
        }

        throw new Error(`Unsupported color format: ${color}\nSupported formats: ${Object.keys(converters).join(", ")}`);
    }

    /**
     * Defines a color from individual components in a color model.
     *
     * @param model - The color model to create components from.
     * @returns Set functions to define numbers for each component in the specified color model.
     */
    static in<M extends Model>(model: M): InterfaceWithSetOnly<Interface<M>>; // eslint-disable-line no-unused-vars
    static in(model: string): InterfaceWithSetOnly<Interface<any>>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    static in<M extends Model>(model: string | M): InterfaceWithSetOnly<Interface<M>> {
        const result = Object.fromEntries(
            Object.entries(new Color(0, 0, 0, 1).in(model)).filter(([key]) => key.startsWith("set"))
        );
        return result as InterfaceWithSetOnly<Interface<M>>;
    }

    /**
     * ────────────────────────────────────────────────────────
     * Static Utility Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Registers a new named color in the system.
     *
     * @param name - The name of the color to register. Spaces and hyphens will be removed, and the name will be converted to lowercase.
     * @param rgba - The RGBA color values to associate with the name.
     * @throws {Error} If a color with the same name (after cleaning) is already registered.
     * @example
     * ```ts
     * Color.registerNamedColor("light-blue", [173, 216, 230, 1]);
     * ```
     */
    static registerNamedColor(name: string, rgba: RGBA) {
        const cleanedName = name.replace(/(?:\s+|-)/g, "").toLowerCase();
        if ((namedColors as Record<Name, RGBA>)[cleanedName as Name]) {
            throw new Error(`Color name "${name}" is already registered.`);
        }

        (namedColors as Record<Name, RGBA>)[cleanedName as Name] = rgba;
    }

    /**
     * Registers a new color format with its corresponding converter.
     *
     * @param formatName - The name of the color format to register
     * @param formatObject - The converter object that handles the color format. Can be either:
     *                      - A ConverterWithComponents object that specifies component definitions
     *                      - A ConverterWithoutComponents object for formats without defined components
     *
     * @remarks
     * If the format object contains components, an alpha component will be automatically added
     * with an index after all existing components, range of 0-1, and precision of 3.
     *
     * The converter is registered both in the formatConverters and converters collections.
     */
    static registerFormat(formatName: string, converter: ConverterWithComponents | ConverterWithoutComponents) {
        (formatConverters as Record<Format, ConverterWithComponents | ConverterWithoutComponents>)[
            formatName as Format
        ] = converter;

        if ("components" in converter) {
            const components = converter.components as Record<string, ComponentDefinition>;
            components["alpha"] = {
                index: Object.keys(components).length,
                min: 0,
                max: 1,
                precision: 3,
            };
        }

        (converters as Record<string, ColorConverter>)[formatName] = converter;
    }

    /**
     * Registers a new color space with its corresponding conversion matrix.
     *
     * @param spaceName - The name of the color space to register
     * @param spaceObject - The matrix mapping object containing conversion data
     *
     * @remarks
     * This method automatically adds an alpha channel component to the color space.
     * The alpha component is always added with a range of 0-1 and precision of 3.
     */
    static registerSpace(spaceName: string, spaceMatrix: SpaceMatrixMap) {
        const spaceConverter = createSpaceConverter(spaceName, spaceMatrix);
        (spaceConverters as Record<Space, ConverterWithComponents>)[spaceName as Space] = spaceConverter;

        const components = spaceConverter.components as Record<string, ComponentDefinition>;
        components["alpha"] = {
            index: Object.keys(components).length,
            min: 0,
            max: 1,
            precision: 3,
        };

        (converters as Record<string, ColorConverter>)[spaceName] = spaceConverter;
    }

    /**
     * Determines the type of the given color string based on predefined patterns.
     *
     * @param color - The color string to be evaluated.
     * @returns The key corresponding to the matched color pattern.
     */
    static type(color: string): Format | Space {
        const error = `Unsupported color format: ${color}\nSupported formats: ${Object.keys(this.patterns).join(", ")}`;

        if (this.isRelative(color)) {
            const { type } = Color.parseRelative(color);
            return type;
        }

        if (this.isColorMix(color)) {
            const { model } = Color.parseColorMix(color);
            return model;
        }

        for (const [key, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(color.trim())) {
                return key as Format;
            }
        }

        throw new Error(error);
    }

    /**
     * Retrieves a list of all supported color formats.
     *
     * @returns An array of supported color format names.
     */
    static getSupportedFormats() {
        return Array.from(Object.keys(formatConverters)) as Format[];
    }

    /**
     * Retrieves a list of all supported color spaces.
     *
     * @returns An array of supported color space names.
     */
    static getSupportedSpaces() {
        return Array.from(Object.keys(spaceConverters)) as Space[];
    }

    /**
     * Generates a random color in the specified format or space.
     * If no type is provided, a random format or space is chosen.
     *
     * @param type - The desired color format or space.
     *               If omitted, a random format or space is selected.
     * @returns A random color string in the specified format or space.
     */
    static random(type?: string): string; // eslint-disable-line no-unused-vars
    static random(type?: Format | Space): string; // eslint-disable-line no-unused-vars
    static random(type?: Format | Space | string) {
        if (!type) {
            const types = Object.keys(formatConverters).concat(Object.keys(spaceConverters));
            type = types[Math.floor(Math.random() * types.length)];
        }

        if (type === "named") {
            return Object.keys(namedColors)[Math.floor(Math.random() * Object.keys(namedColors).length)];
        }

        const randomChannel = () => Math.floor(Math.random() * 200 + 30);
        const randomColor = this.from(`rgb(${randomChannel()}, ${randomChannel()}, ${randomChannel()})`);
        return randomColor.to(type) as string;
    }

    /**
     * Parses a relative color format string into its components.
     * Supports various formats including:
     * - Function-based: `color-function(from origin-color channel1 channel2 channel3 / alpha)`
     * - Color-based: `color(from origin-color colorspace channel1 channel2 channel3 / alpha)`
     *
     * Components can be specified as:
     * 1. Pure numbers (e.g., "255")
     * 2. Percentages (e.g., "50%")
     * 3. calc() expressions (e.g., "calc(r * 2)")
     * 4. Component names (e.g., "r", "g", "b")
     *
     * @param color - The relative color format string to parse
     * @returns An object containing:
     *  - funcName: The name of the color function used
     *  - baseColor: The reference color string
     *  - type: The color model/space being used
     *  - components: Array of parsed component values
     *
     * @throws {Error} If the color string format is invalid
     * @throws {Error} If an invalid space is specified for color()
     * @throws {Error} If an invalid function name is used
     * @throws {Error} If an invalid component name is used for the specified model
     *
     * @example
     * ```
     * Color.parseRelative("rgb(from #ff0000 r g b)");
     * Color.parseRelative("color(from #ff0000 rgb 50% calc(g * 2) b)");
     * ```
     */
    static parseRelative(color: string) {
        function parseAngle(angleStr: string): number {
            const match = angleStr.match(/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/);
            if (!match) throw new Error(`Invalid angle format: ${angleStr}`);
            const value = parseFloat(match[1]);
            const unit = match[2] || "deg";
            /* eslint-disable indent */
            switch (unit) {
                case "deg":
                    return value;
                case "rad":
                    return (value * 180) / Math.PI;
                case "grad":
                    return (value * 360) / 400;
                case "turn":
                    return value * 360;
                default:
                    throw new Error(`Unknown angle unit: ${unit}`);
            }
            /* eslint-enable indent */
        }

        const parseComponent = <M extends Model>(
            component: string,
            colorInstance: Color,
            model: M,
            index: number
        ): number => {
            const componentDef = Object.values(converters[model].components).find((c) => c.index === index);
            if (!componentDef) throw new Error(`Invalid component index for ${model}: ${index}`);
            const isAngle = componentDef.loop === true;

            if (/^-?\d*\.?\d+$/.test(component)) {
                // Case 1: Pure number (e.g., "30", "-45.5")
                return parseFloat(component);
            } else if (/^-?\d*\.?\d+%$/.test(component)) {
                // Case 2: Percentage (e.g., "50%", "-10%")
                const percentage = parseFloat(component.slice(0, -1)) / 100;
                if (isAngle) {
                    return percentage * 360;
                } else {
                    const { min, max } = componentDef;
                    return min + percentage * (max - min);
                }
            } else if (component.startsWith("calc(") && component.endsWith(")")) {
                // Case 3: Calc expression (e.g., "calc(r * 2)")
                const expression = component.slice(5, -1).trim();
                return evaluateExpression(expression, colorInstance, model);
            } else if (component in converters[model].components) {
                // Case 4: Component name (e.g., "h", "s")
                return colorInstance.in(model).get(component as Component<M>);
            } else if (isAngle) {
                // Case 5: Angle with unit (e.g., "30deg", "0.5turn")
                try {
                    return parseAngle(component);
                } catch {
                    throw new Error(`Invalid angle format for ${model} component ${index}: ${component}`);
                }
            } else {
                throw new Error(`Invalid component format for ${model} component ${index}: ${component}`);
            }
        };

        const evaluateExpression = <M extends Model>(expression: string, baseColor: Color, model: M): number => {
            const infixToPostfix = (tokens: string[]): string[] => {
                const output: string[] = [];
                const operatorStack: string[] = [];
                type Operator = "+" | "-" | "*" | "/";
                const precedence: Record<Operator, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

                for (const token of tokens) {
                    if (/^-?\d*\.?\d+$/.test(token) || /^-?\d*\.?\d+%$/.test(token) || /^[a-zA-Z]+$/.test(token)) {
                        output.push(token);
                    } else if (token === "(") {
                        operatorStack.push(token);
                    } else if (token === ")") {
                        while (operatorStack.length && operatorStack[operatorStack.length - 1] !== "(") {
                            output.push(operatorStack.pop()!);
                        }
                        operatorStack.pop();
                    } else if (token in precedence) {
                        while (
                            operatorStack.length &&
                            operatorStack[operatorStack.length - 1] !== "(" &&
                            precedence[operatorStack[operatorStack.length - 1] as Operator] >=
                                precedence[token as Operator]
                        ) {
                            output.push(operatorStack.pop()!);
                        }
                        operatorStack.push(token);
                    }
                }
                while (operatorStack.length) {
                    output.push(operatorStack.pop()!);
                }
                return output;
            };

            const evaluatePostfix = (postfix: string[]): number => {
                const stack: number[] = [];

                for (const token of postfix) {
                    if (/^-?\d*\.?\d+$/.test(token)) {
                        stack.push(parseFloat(token));
                    } else if (/^-?\d*\.?\d+%$/.test(token)) {
                        stack.push(parseFloat(token.slice(0, -1)) / 100);
                    } else if (/^[a-zA-Z]+$/.test(token)) {
                        stack.push(baseColor.in(model).get(token as Component<M>));
                    } else if (token in { "+": 1, "-": 1, "*": 1, "/": 1 }) {
                        const b = stack.pop()!;
                        const a = stack.pop()!;
                        /* eslint-disable indent */
                        switch (token) {
                            case "+":
                                stack.push(a + b);
                                break;
                            case "-":
                                stack.push(a - b);
                                break;
                            case "*":
                                stack.push(a * b);
                                break;
                            case "/":
                                stack.push(a / b);
                                break;
                        }
                        /* eslint-enable indent */
                    }
                }
                return stack[0];
            };

            const tokens = expression.split(/\s+/);
            const postfix = infixToPostfix(tokens);
            return evaluatePostfix(postfix);
        };

        color = color.toLowerCase();

        const funcNameMatch = color.match(/^(\w+)(?=\()/);
        if (!funcNameMatch) throw new Error(`"${color}" is not a valid relative format.`);
        const funcName = funcNameMatch[1];

        let baseColor: string, type: Model, componentsStr: string;

        const formatPatterns = Object.values(formatConverters)
            .map((fc) => fc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const spacePatterns = Object.values(spaceConverters)
            .map((sc) => sc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const colorPatterns = `(?:${formatPatterns}|${spacePatterns})`;
        const spaceNames = Object.keys(spaceConverters).join("|");

        if (funcName === "color") {
            const match = color.match(
                new RegExp(`^color\\(from\\s+(?<color>${colorPatterns}) (?<space>${spaceNames}) (.*)\\)$`)
            );
            if (!match) throw new Error(`"${color}" is not a valid relative format.`);

            const { color: colorMatch, space: spaceMatch } = match.groups!;

            baseColor = colorMatch;
            type = spaceMatch as Model;

            const fullMatch = match[0];
            const startIndex = fullMatch.indexOf(type) + type.length;
            componentsStr = fullMatch.substring(startIndex, fullMatch.length - 1).trim();

            if (!(type in spaceConverters))
                throw new Error(
                    `Invalid space for color(): ${type}\nSupported spaces are: ${Object.keys(spaceConverters).join(", ")}`
                );
        } else {
            const match = color.match(new RegExp(`^${funcName}\\(from\\s+(?<color>${colorPatterns}) (.*)\\)$`));
            if (!match) throw new Error(`"${color}" is not a valid relative format.`);

            const { color: colorMatch } = match.groups!;

            baseColor = colorMatch;
            type = funcName as Model;

            const fullMatch = match[0];
            const startIndex = fullMatch.indexOf(baseColor) + baseColor.length;
            componentsStr = fullMatch.substring(startIndex, fullMatch.length - 1).trim();

            if (!(type in formatConverters))
                throw new Error(
                    `Invalid function name for relative format: ${type}\nSupported function names are: ${Object.keys(formatConverters).join(", ")}`
                );
        }

        const tokens: string[] = [];
        let currentToken = "";
        let parenCount = 0;
        let inCalc = false;

        for (const char of componentsStr) {
            if (char === " " && parenCount === 0) {
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = "";
                }
            } else {
                currentToken += char;
                if (currentToken === "calc(") inCalc = true;
                if (inCalc) {
                    if (char === "(") parenCount++;
                    if (char === ")") parenCount--;
                    if (parenCount === 0 && inCalc) {
                        tokens.push(currentToken);
                        currentToken = "";
                        inCalc = false;
                    }
                }
            }
        }
        if (currentToken) tokens.push(currentToken);

        const colorInstance = Color.from(baseColor);

        const components: number[] = [];
        let i = 0;
        while (components.length < 3 && i < tokens.length) {
            components.push(parseComponent(tokens[i], colorInstance, type, i));
            i++;
        }
        if (i < tokens.length && tokens[i] !== "/") {
            i++;
            if (i < tokens.length) {
                components.push(parseComponent(tokens[i], colorInstance, type, i));
            }
        }

        return { funcName, baseColor, type, components };
    }

    /**
     * Parses a CSS color-mix() function string into its component parts.
     *
     * @param colorStr - The color-mix string to parse (e.g., "color-mix(in srgb, red, blue)")
     * @returns An object containing:
     *  - model: The color space model (e.g., "srgb", "hsl")
     *  - hueInterpolationMethod: Method for interpolating hue ("shorter", "longer", "increasing", "decreasing")
     *  - color1: First Color string
     *  - weight1: Optional weight for first color (0-1)
     *  - color2: Second Color string
     *  - weight2: Optional weight for second color (0-1)
     *
     * @throws {Error} If the color-mix string format is invalid
     * @throws {Error} If the "in" keyword is missing
     * @throws {Error} If comma separator is missing
     * @throws {Error} If model/hue interpolation part is invalid
     * @throws {Error} If number of colors is not exactly two
     *
     * @example
     * Color.parseColorMix("color-mix(in srgb shorter hue, red 40%, blue)");
     */
    static parseColorMix(color: string) {
        const parseColorAndWeight = (part: string) => {
            const tokens = part.split(/\s+/);
            let weight: number | undefined;
            if (tokens.length > 1 && tokens[tokens.length - 1].endsWith("%")) {
                const pct = tokens.pop()!;
                weight = parseFloat(pct.slice(0, -1)) / 100;
            }
            const colorComponent = tokens.join(" ");
            return { colorComponent, weight };
        };

        const parseColorString = (colorStr: string) => {
            const match = colorStr.match(/^(\w+)\(([^)]+)\)$/);
            if (!match) {
                throw new Error(`Invalid color format: "${colorStr}"`);
            }
            const model = match[1];
            const components = match[2].trim().split(/\s+/);
            return { model, components };
        };

        const replaceNoneComponents = (
            color1Parts: { model: string; components: string[] },
            color2Parts: { model: string; components: string[] }
        ) => {
            const comps1 = [...color1Parts.components];
            const comps2 = [...color2Parts.components];

            for (let i = 0; i < Math.max(comps1.length, comps2.length); i++) {
                if (comps1[i] === "none" && comps2[i] !== undefined && comps2[i] !== "none") {
                    comps1[i] = comps2[i];
                }
                if (comps2[i] === "none" && comps1[i] !== undefined && comps1[i] !== "none") {
                    comps2[i] = comps1[i];
                }
            }
            return {
                color1Parts: { model: color1Parts.model, components: comps1 },
                color2Parts: { model: color2Parts.model, components: comps2 },
            };
        };

        const buildColorString = (color: { model: string; components: string[] }) => {
            return `${color.model}(${color.components.join(" ")})`;
        };

        color = color.toLowerCase();

        if (!this.patterns["color-mix"].test(color)) {
            throw new Error(`"${color}" is not a valid color-mix format.`);
        }

        const inner = color.slice(color.indexOf("(") + 1, color.lastIndexOf(")")).trim();
        if (!inner.startsWith("in ")) {
            throw new Error('Invalid color-mix syntax; expected "in" keyword.'); // eslint-disable-line quotes
        }
        const rest = inner.slice(3).trim();

        const firstComma = rest.indexOf(",");
        if (firstComma === -1) {
            throw new Error("Missing comma separator in color-mix declaration.");
        }
        const preComma = rest.slice(0, firstComma).trim();
        const afterComma = rest.slice(firstComma + 1).trim();

        const preTokens = preComma.split(/\s+/);
        let model: Model;
        let hueInterpolationMethod: HueInterpolationMethod = "shorter";
        if (preTokens.length === 1) {
            model = preTokens[0] as Model;
        } else if (preTokens.length === 3 && preTokens[2].toLowerCase() === "hue") {
            model = preTokens[0] as Model;
            hueInterpolationMethod = preTokens[1] as HueInterpolationMethod;
        } else {
            throw new Error(`Invalid model and hue interpolation part: "${preComma}"`);
        }

        const parts = afterComma.split(/\s*,\s*/);
        if (parts.length !== 2) {
            throw new Error(`Expected exactly two colors in color-mix but got: ${parts.length}`);
        }

        const firstColorData = parseColorAndWeight(parts[0]);
        const secondColorData = parseColorAndWeight(parts[1]);

        const firstColorModel = Color.type(firstColorData.colorComponent);
        const secondColorModel = Color.type(secondColorData.colorComponent);

        if (
            firstColorModel === secondColorModel &&
            "components" in converters[firstColorModel] &&
            "components" in converters[secondColorModel]
        ) {
            const parsedColor1 = parseColorString(firstColorData.colorComponent);
            const parsedColor2 = parseColorString(secondColorData.colorComponent);

            const replaced = replaceNoneComponents(parsedColor1, parsedColor2);
            firstColorData.colorComponent = buildColorString(replaced.color1Parts);
            secondColorData.colorComponent = buildColorString(replaced.color2Parts);
        }

        const colorInstance1 = Color.from(firstColorData.colorComponent);
        const colorInstance2 = Color.from(secondColorData.colorComponent);

        return {
            model,
            hueInterpolationMethod,
            color1: colorInstance1.to(firstColorModel),
            weight1: firstColorData.weight,
            color2: colorInstance2.to(secondColorModel),
            weight2: secondColorData.weight,
        };
    }

    /**
     * ────────────────────────────────────────────────────────
     * Static Validation Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Checks if the given value matches the pattern for the specified type.
     *
     * @param type - The type of pattern to validate against.
     * @param value - The string value to be validated.
     * @returns Whether the value matches the pattern for the specified type.
     */
    static isValid(type: Format | Space, value: string) {
        return this.patterns[type].test(value.trim());
    }

    /**
     * Determines if a color string is a relative color format.
     *
     * @param color - The color string to test
     * @returns True if the color is a relative color format, false otherwise
     *
     * @example
     * Color.isRelative('rgb(from red 255 0 0)') // returns true
     * Color.isRelative('rgb(255 0 0)') // returns false
     */
    static isRelative(color: string) {
        return this.patterns.relative.test(color);
    }

    /**
     * Determines if a color string is a color-mix() format.
     *
     * @param color - The color string to test
     * @returns True if the string is a valid color-mix() format, false otherwise
     *
     * @example
     * Color.isColorMix('color-mix(in srgb, plum, #f00)') // returns true
     * Color.isColorMix('hsl(200deg 50% 80%)') // returns false
     */
    static isColorMix(color: string) {
        return this.patterns["color-mix"].test(color);
    }

    /**
     * ────────────────────────────────────────────────────────
     * Instance Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * ────────────────────────────────────────────────────────
     * Convertion Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Converts the current color to the specified format.
     *
     * @param format - The target color format.
     * @param options - Optional formatting options. Defaults to `{ modern: false }`.
     * @returns The color in the specified format.
     */
    to(format: string, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(format: Format | Space, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(format: Format | Space | string, options?: FormattingOptions) {
        const converter = converters[format as Format | Space];
        if (!converter) {
            throw new Error(
                `Unsupported color format: ${format}\nSupported formats: ${Object.keys(converters).join(", ")}`
            );
        }

        if ("components" in converter) {
            const components = converter.fromXYZA(this.xyza);
            const componentProps: ComponentDefinition[] = [];
            for (const [, props] of Object.entries(converter.components)) {
                componentProps[props.index] = props;
            }

            const clampedComponents = components.map((value, i) => {
                const props = componentProps[i];
                if (!props) {
                    throw new Error(`Missing component properties for index ${i}`);
                }

                let clipped: number;
                if (props.loop) {
                    const range = props.max - props.min;
                    clipped = props.min + ((((value - props.min) % range) + range) % range);
                } else {
                    clipped = Math.min(props.max, Math.max(props.min, value));
                }

                const precision = props.precision ?? 5;
                const rounded = Number(clipped.toFixed(precision));

                return rounded;
            });

            return converter.fromComponents(clampedComponents, options);
        } else {
            return converter.fromXYZA(this.xyza);
        }
    }

    /**
     * Converts the current color instance to all available formats.
     *
     * @returns An object where the keys are the format names and the values are the color representations in those formats.
     */
    toAllFormats(): Record<Format, string> {
        const formats = Object.keys(formatConverters) as Format[];

        return formats.reduce(
            (acc, format) => {
                acc[format] = this.to(format);
                return acc;
            },
            {} as Record<Format, string>
        );
    }

    /**
     * Converts the current color to all available color spaces.
     *
     * @returns {Record<Space, string>} An object where each key is a color space and the value is the color in that space.
     */
    toAllSpaces(): Record<Space, string> {
        const spaces = Object.keys(spaceConverters) as Space[];

        return spaces.reduce(
            (acc, space) => {
                acc[space] = this.to(space);
                return acc;
            },
            {} as Record<Space, string>
        );
    }

    /**
     * Advances to the next color format based on the current index.
     *
     * @param currentColorString - The current color's string in any supported format.
     * @returns A tuple containing the next color as a string and the updated index.
     */
    toNextColor(currentColorString: string, options: ToNextColorOptions = { modern: false, exclude: [] }) {
        let formats = Object.keys(converters);

        if (options.exclude?.length) {
            formats = formats.filter((format) => !options.exclude?.includes(format as Format));
        }

        if (!this.name) {
            formats = formats.filter((format) => format !== "named");
        }

        if (formats.length === 0) {
            throw new Error("No available formats after applying exclusions.");
        }

        const type = Color.type(currentColorString);
        const currentIndex = formats.lastIndexOf(type);
        const nextFormat = formats[(currentIndex + 1) % formats.length];

        const nextColor = this.to(nextFormat as Format | Space, options) as string;

        return nextColor;
    }

    /**
     * ────────────────────────────────────────────────────────
     * Manipulation Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Converts the current color to a specified color model and provides methods to get, set, and mix color components.
     *
     * @param model - The target color model.
     * @returns An object containing methods to get, set, and mix color components in the specified color model.
     *
     * @example
     * ```typescript
     * Color.from("red")
     *     .in("hsl")
     *     .set({ s: (s) => s += 20 })
     *     .to("rgb");
     * ```
     */
    in<M extends Model>(model: M): Interface<M>; // eslint-disable-line no-unused-vars
    in(model: string): Interface<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    in<M extends Model>(model: string | M): Interface<M> {
        const converter = converters[model as M];

        if (!("components" in converter)) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        const clampValue = (value: number, min: number, max: number, precision: number) => {
            const clamped = Math.max(min, Math.min(max, value));
            return Number(clamped.toFixed(precision));
        };

        const get = (component: Component<M>) => {
            const colorArray = converter.fromXYZA(this.xyza);
            const {
                min,
                max,
                precision = 10,
                index,
            } = converter.components[component as keyof typeof converter.components];
            return clampValue(colorArray[index], min, max, precision);
        };

        const getComponents = () => {
            const colorArray = converter.fromXYZA(this.xyza);
            const compNames = Object.keys(converter.components) as Component<M>[];
            const result: Record<Component<M>, number> = {} as Record<Component<M>, number>;

            compNames.forEach((comp) => {
                const {
                    min,
                    max,
                    precision = 10,
                    index,
                } = converter.components[comp as keyof typeof converter.components];
                result[comp] = clampValue(colorArray[index], min, max, precision);
            });

            return result;
        };

        const getArray = () => {
            const components = converter.fromXYZA(this.xyza);

            const processedComponents = components.map((value, index) => {
                const props = Object.values(converter.components)[index];
                if (!props) {
                    throw new Error(`Missing component properties for index ${index}`);
                }

                const clampedValue = Math.min(props.max, Math.max(props.min, value));
                return Number(clampedValue.toFixed(props.precision ?? 10));
            });

            return processedComponents;
        };

        // eslint-disable-next-line no-unused-vars
        const set = (values: Partial<{ [K in Component<M>]: number | ((prev: number) => number) }>) => {
            const colorArray = converter.fromXYZA(this.xyza);
            const compNames = Object.keys(converter.components) as Component<M>[];
            compNames.forEach((comp) => {
                if (comp in values) {
                    const idx = (converter.components[comp as keyof typeof converter.components] as ComponentDefinition)
                        .index;
                    const currentValue = colorArray[idx];
                    const valueOrFunc = values[comp];
                    const newValue = typeof valueOrFunc === "function" ? valueOrFunc(currentValue) : valueOrFunc;
                    colorArray[idx] = newValue as number;
                }
            });
            this.xyza = converter.toXYZA(colorArray);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const setArray = (array: number[]) => {
            this.xyza = converter.toXYZA(array);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const mixWith = (color: string, amount = 0.5, hueInterpolationMethod = "shorter") => {
            const t = Math.max(0, Math.min(amount, 1));

            const otherColor = Color.from(color);
            const otherInterface = otherColor.in(model);
            const components = converter.components;

            for (const component in components) {
                if (Object.prototype.hasOwnProperty.call(components, component)) {
                    const comp = component as Component<M>;
                    if (comp === "h") {
                        const currentHue = get("h" as Component<M>);
                        const otherHue = otherInterface.get("h" as Component<M>);
                        let mixedHue: number;

                        /* eslint-disable indent */
                        switch (hueInterpolationMethod) {
                            case "shorter": {
                                let deltaShort = otherHue - currentHue;
                                deltaShort = ((deltaShort + 180) % 360) - 180;
                                mixedHue = currentHue + t * deltaShort;
                                break;
                            }
                            case "longer": {
                                let deltaLong = otherHue - currentHue;
                                deltaLong = ((deltaLong + 180) % 360) - 180;
                                if (deltaLong !== 0) {
                                    deltaLong = deltaLong > 0 ? deltaLong - 360 : deltaLong + 360;
                                }
                                mixedHue = currentHue + t * deltaLong;
                                break;
                            }
                            case "increasing": {
                                let adjustedHueInc = otherHue;
                                if (otherHue < currentHue) {
                                    adjustedHueInc += 360;
                                }
                                mixedHue = currentHue * (1 - t) + adjustedHueInc * t;
                                break;
                            }
                            case "decreasing": {
                                let adjustedHueDec = otherHue;
                                if (otherHue > currentHue) {
                                    adjustedHueDec -= 360;
                                }
                                mixedHue = currentHue * (1 - t) + adjustedHueDec * t;
                                break;
                            }
                            default:
                                throw new Error("Invalid hueInterpolationMethod");
                        }
                        /* eslint-enable indent */

                        mixedHue = ((mixedHue % 360) + 360) % 360;
                        set({ ["h" as Component<M>]: mixedHue } as Partial<{
                            [K in Component<M>]: number | ((prev: number) => number); // eslint-disable-line no-unused-vars
                        }>);
                    } else {
                        const currentValue = get(comp);
                        const otherValue = otherInterface.get(comp);
                        const mixedValue = currentValue * (1 - t) + otherValue * t;
                        set({ [comp]: mixedValue } as Partial<{
                            [K in Component<M>]: number | ((prev: number) => number); // eslint-disable-line no-unused-vars
                        }>);
                    }
                }
            }

            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };
        return { get, getComponents, getArray, set, setArray, mixWith };
    }

    /**
     * ────────────────────────────────────────────────────────
     * CSS Filter Functions
     * ────────────────────────────────────────────────────────
     */

    /**
     * Adjusts the opacity of the color instance.
     *
     * @param amount - A number between 0 and 1 (inclusive) representing the desired opacity level.
     * @returns A new `Color` instance with the adjusted opacity.
     * @throws {Error} If the `amount` is not between 0 and 1 (inclusive).
     */
    opacity(amount: number) {
        if (amount < 0 || amount > 1) {
            throw new Error("Amount must be between 0 and 1 (inclusive).");
        }

        const instance = this.in("rgb").set({ alpha: (a) => a * amount });
        return new Color(...instance.xyza);
    }

    /**
     * Increases the saturation of the color by a given amount.
     *
     * @param amount - The factor by which to increase the saturation. Must be 0 or greater.
     * @returns A new `Color` instance with the increased saturation.
     * @throws {Error} If the amount is less than 0.
     */
    saturate(amount: number) {
        if (amount < 0) {
            throw new Error("Amount must be 0 or greater.");
        }

        const instance = this.in("hsl").set({ s: (s) => s * amount });
        return new Color(...instance.xyza);
    }

    /**
     * Rotates the hue of the color by the specified amount.
     *
     * @param amount - The amount to rotate the hue, in degrees.
     * @returns A new `Color` instance with the hue rotated by the specified amount.
     */
    hueRotate(amount: number) {
        const instance = this.in("hsl").set({ h: (h) => h + amount });
        return new Color(...instance.xyza);
    }

    /**
     * Adjusts the contrast of the color by a given amount.
     *
     * @param amount - The amount to adjust the contrast by. Must be 0 or greater.
     * @returns A new `Color` instance with the adjusted contrast.
     * @throws {Error} If the amount is less than 0.
     */
    contrast(amount: number) {
        if (amount < 0) {
            throw new Error("Amount must be 0 or greater.");
        }

        const instance = this.in("rgb").set({
            r: (r) => Math.round((r - 128) * amount + 128),
            g: (g) => Math.round((g - 128) * amount + 128),
            b: (b) => Math.round((b - 128) * amount + 128),
        });

        return new Color(...instance.xyza);
    }

    /**
     * Applies a sepia filter to the current color instance.
     *
     * @param amount - The intensity of the sepia effect, must be between 0 and 1 (inclusive).
     * @returns A new `Color` instance with the sepia effect applied.
     * @throws {Error} If the `amount` is not between 0 and 1 (inclusive).
     */
    sepia(amount: number) {
        if (amount < 0 || amount > 1) {
            throw new Error("Amount must be between 0 and 1 (inclusive).");
        }

        const inRGB = this.in("rgb");

        const { r, g, b } = inRGB.getComponents();

        const sepiaR = 0.393 * r + 0.769 * g + 0.189 * b;
        const sepiaG = 0.349 * r + 0.686 * g + 0.168 * b;
        const sepiaB = 0.272 * r + 0.534 * g + 0.131 * b;

        const instance = inRGB.set({
            r: r + (sepiaR - r) * amount,
            g: g + (sepiaG - g) * amount,
            b: b + (sepiaB - b) * amount,
        });

        return new Color(...instance.xyza);
    }

    /**
     * Adjusts the brightness of the color by a given amount.
     *
     * @param amount - The factor by which to adjust the brightness. Must be 0 or greater.
     * @returns A new Color instance with the adjusted brightness.
     * @throws {Error} If the amount is less than 0.
     */
    brightness(amount: number) {
        if (amount < 0) {
            throw new Error("Amount must be 0 or greater.");
        }

        const instance = this.in("hsl").set({ l: (l) => l * amount });
        return new Color(...instance.xyza);
    }

    /**
     * Adjusts the saturation of the color to create a grayscale effect.
     *
     * @param amount - A number between 0 and 1 (inclusive) representing the degree of desaturation.
     *                 0 means no change, and 1 means fully desaturated (grayscale).
     * @returns A new `Color` instance with the adjusted saturation.
     * @throws {Error} If the amount is not between 0 and 1 (inclusive).
     */
    grayscale(amount: number) {
        if (amount < 0 || amount > 1) {
            throw new Error("Amount must be between 0 and 1 (inclusive).");
        }

        const instance = this.in("hsl").set({ s: (s) => s * (1 - amount) });
        return new Color(...instance.xyza);
    }

    /**
     * Inverts the color by a given amount.
     *
     * @param amount - A number between 0 and 1 (inclusive) representing the amount of inversion.
     *                 0 means no inversion, 1 means full inversion.
     * @returns A new `Color` instance with the inverted color.
     * @throws {Error} If the amount is not between 0 and 1 (inclusive).
     */
    invert(amount: number) {
        if (amount < 0 || amount > 1) {
            throw new Error("Amount must be between 0 and 1 (inclusive).");
        }

        const instance = this.in("rgb").set({
            r: (r) => Math.round(r * (1 - amount) + (255 - r) * amount),
            g: (g) => Math.round(g * (1 - amount) + (255 - g) * amount),
            b: (b) => Math.round(b * (1 - amount) + (255 - b) * amount),
        });

        return new Color(...instance.xyza);
    }

    /**
     * ────────────────────────────────────────────────────────
     * Instance Utility Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Calculates the luminance of the color.
     *
     * @param backgroundColor - The background color used if the color is not fully opaque. Defaults to white ("rgb(255, 255, 255)").
     * @returns The luminance value of the color, a number between 0 and 1.
     */
    getLuminance(backgroundColor: string = "rgb(255, 255, 255)") {
        const [, Y, , alpha] = this.xyza;

        if (alpha === 1) {
            return Y;
        }

        const bgXYZ = Color.from(backgroundColor).in("xyz").getArray();
        const blendedY = (1 - alpha) * bgXYZ[1] + alpha * Y;

        return blendedY;
    }

    /**
     * Calculates the contrast ratio between the current color and a given color.
     * The contrast ratio is determined using the luminance values of the two colors
     * and follows the WCAG (Web Content Accessibility Guidelines) formula.
     *
     * @param color - The color to compare against, represented as a string (e.g., hex, RGB, etc.).
     * @returns The contrast ratio as a number. A higher value indicates greater contrast.
     *          The ratio ranges from 1 (no contrast) to 21 (maximum contrast).
     */
    getContrastRatio(color: string) {
        const l1 = this.getLuminance();
        const l2 = Color.from(color).getLuminance();
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    /**
     * ────────────────────────────────────────────────────────
     * Instance Validation Methods
     * ────────────────────────────────────────────────────────
     */

    /**
     * Compares the current color object with another color string.
     *
     * @param color - The color string to compare with the current color object.
     * @returns Whether the two colors are equal.
     */
    equals(color: string) {
        return this.to("xyz") === Color.from(color).to("xyz");
    }

    /**
     * Determines if the color is considered "cool".
     * A color is considered cool if its hue (in HSL format) is between 60 and 300 degrees.
     *
     * @returns True if the color is cool, false otherwise.
     */
    isCool() {
        const [h] = (this.to("hsl") as string).match(/\d+/g)!.map(Number);
        return h > 60 && h < 300;
    }

    /**
     * Determines if the color is warm based on its hue value in the HSL color space.
     * A color is considered warm if its hue is less than or equal to 60 degrees
     * or greater than or equal to 300 degrees.
     *
     * @returns True if the color is warm, false otherwise.
     */
    isWarm() {
        const [h] = (this.to("hsl") as string).match(/\d+/g)!.map(Number);
        return h <= 60 || h >= 300;
    }

    /**
     * Determines if the given background color is considered dark.
     *
     * @param backgroundColor - The background color. Defaults to "rgb(255, 255, 255)".
     * @returns Whether the color is considered dark.
     */
    isDark(backgroundColor: string = "rgb(255, 255, 255)") {
        return this.getLuminance(backgroundColor) < 0.5;
    }

    /**
     * Determines if the given background color is considered light.
     *
     * @param backgroundColor - The background color. Defaults to "rgb(255, 255, 255)".
     * @returns Whether the color is considered light.
     */
    isLight(backgroundColor: string = "rgb(255, 255, 255)") {
        return !this.isDark(backgroundColor);
    }

    /**
     * Checks if the current color is within the specified gamut.
     *
     * @param gamut - The color space to check against.
     * @returns `true` if the color is within the gamut, `false` otherwise.
     */
    isInGamut(gamut: Space) {
        const converter = converters[gamut];
        const components = converter.fromXYZA(this.xyza);

        for (const [, props] of Object.entries(converter.components)) {
            const [value, min, max] = [components[props.index], props.min, props.max];
            if (value < min || value > max) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determines if the current color is accessible when compared to another color
     * based on the specified WCAG accessibility level and text size.
     *
     * @param color - The color to compare against, represented as a string (e.g., a hex code or color name).
     * @param level - The WCAG accessibility level to check against. Can be "AA" or "AAA". Defaults to "AA".
     * @param isLargeText - Indicates whether the text is considered large (e.g., 18pt or bold 14pt). Defaults to `false`.
     * @returns A boolean indicating whether the contrast ratio meets the specified accessibility level.
     */
    isAccessibleWith(color: string, level: "AA" | "AAA" = "AA", isLargeText = false) {
        const contrast = this.getContrastRatio(color);

        const levels = {
            AA: isLargeText ? 3.0 : 4.5,
            AAA: isLargeText ? 4.5 : 7.0,
        };

        return contrast >= levels[level];
    }
}

export default Color;
