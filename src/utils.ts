import Color from "./Color.js";
import { colorFunctionConverters, colorSpaceConverters } from "./converters.js";
import type {
    ColorFunction,
    ColorFunctionConverter,
    ColorSpace,
    ColorSpaceConverter,
    ComponentDefinition,
    FitMethod,
    FormattingOptions,
    XYZ,
} from "./types.js";

export const D50_to_D65 = [
    [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
    [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
    [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];

export const D65_to_D50 = [
    [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
    [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
    [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

export const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
export const D65 = [0.3127 / 0.329, 1.0, (1.0 - 0.3127 - 0.329) / 0.329];

export const EASINGS = {
    linear: (t: number) => t,
    "ease-in": (t: number) => t * t,
    "ease-out": (t: number) => t * (2 - t),
    "ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    "ease-in-cubic": (t: number) => t * t * t,
    "ease-out-cubic": (t: number) => --t * t * t + 1,
    "ease-in-out-cubic": (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * Multiplies two matrices or vectors and returns the resulting product.
 *
 * @param A - The first matrix or vector. If it's a 1D array, it is treated as a row vector.
 * @param B - The second matrix or vector. If it's a 1D array, it is treated as a column vector.
 * @returns The product of the two inputs:
 * - If both `A` and `B` are 1D arrays (vectors), the result is a scalar (number).
 * - If `A` is a 1D array and `B` is a 2D array, the result is a 1D array (vector).
 * - If `A` is a 2D array and `B` is a 1D array, the result is a 1D array (vector).
 * - If both `A` and `B` are 2D arrays (matrices), the result is a 2D array (matrix).
 * @throws If the dimensions of `A` and `B` are incompatible for multiplication.
 *
 */
export function multiplyMatrices<A extends number[] | number[][], B extends number[] | number[][]>(
    A: A,
    B: B
): A extends number[] ? (B extends number[] ? number : number[]) : B extends number[] ? number[] : number[][] {
    const m = Array.isArray(A[0]) ? A.length : 1;
    const A_matrix: number[][] = Array.isArray(A[0]) ? (A as number[][]) : [A as number[]];
    const B_matrix: number[][] = Array.isArray(B[0]) ? (B as number[][]) : (B as number[]).map((x) => [x]);
    const p = B_matrix[0].length;
    const B_cols = B_matrix[0].map((_, i) => B_matrix.map((x) => x[i]));
    const product = A_matrix.map((row) => B_cols.map((col) => row.reduce((a, c, i) => a + c * (col[i] || 0), 0)));

    if (m === 1) return product[0] as A extends number[] ? (B extends number[] ? number : number[]) : never;
    if (p === 1)
        return product.map((x) => x[0]) as A extends number[] ? (B extends number[] ? number : number[]) : never;
    return product as A extends number[]
        ? B extends number[]
            ? number
            : number[]
        : B extends number[]
          ? number[]
          : number[][];
}

/**
 * Fits or clips a set of color coordinates to a specified color model and gamut using the given fitting method.
 *
 * @param coords - The color coordinates to fit or clip.
 * @param model - The color model to use (e.g., "rgb", "oklch", "xyz-d50", etc.).
 * @param method - The fitting method to use. Defaults to "minmax".
 * @param precision - Overrides the default precision of component definitions.
 * @returns The fitted or clipped color coordinates.
 * @throws If component properties are missing or an invalid method is specified.
 *
 * @remarks
 * This function supports several fitting methods:
 * - `"no-fit"`: Returns the original coordinates without modification.
 * - `"round-only"`: Rounds the coordinates according to the component precision withput gamut mapping.
 * - `"minmax"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
 * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
 * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
 */
export function fit(coords: number[], model: ColorFunction, method: FitMethod = "clip", precision?: number) {
    const roundCoords = (coords: number[]) => {
        return coords.map((value, i) => {
            const p = precision ?? componentProps[i]?.precision ?? 3;
            return Number(value.toFixed(p));
        });
    };

    const { targetGamut, components } = colorFunctionConverters[model];

    const componentProps: ComponentDefinition[] = [];
    for (const [, props] of Object.entries(components)) {
        componentProps[props.index] = props;
    }

    switch (method) {
        case "none":
            return coords;

        case "round-unclipped":
            return roundCoords(coords);

        case "clip": {
            const clipped = coords.slice(0, 3).map((value, i) => {
                const props = componentProps[i];
                if (!props) {
                    throw new Error(`Missing component properties for index ${i}.`);
                }
                if (props.value === "hue") {
                    return ((value % 360) + 360) % 360;
                } else {
                    const [min, max] = Array.isArray(props.value) ? props.value : [0, 100];
                    return Math.min(max, Math.max(min, value));
                }
            });
            return roundCoords(clipped);
        }

        case "chroma-reduction": {
            const lightnessRange = () => {
                const C = 0.05;
                const epsilon = 1e-5;

                const isInGamut = (L: number) => {
                    const color = Color.in("oklch").setCoords([L, C, H]);
                    return color.inGamut(targetGamut as ColorSpace, epsilon);
                };

                const searchMinL = () => {
                    let low = 0,
                        high = 1;
                    while (high - low > epsilon) {
                        const mid = (low + high) / 2;
                        if (isInGamut(mid)) high = mid;
                        else low = mid;
                    }
                    return high;
                };

                const searchMaxL = () => {
                    let low = 0,
                        high = 1;
                    while (high - low > epsilon) {
                        const mid = (low + high) / 2;
                        if (isInGamut(mid)) low = mid;
                        else high = mid;
                    }
                    return low;
                };

                return [searchMinL(), searchMaxL()];
            };

            const color = Color.in(model).setCoords(coords);
            if (targetGamut === null || color.inGamut(targetGamut as ColorSpace, 1e-5)) return roundCoords(coords);

            const [L, , H] = color.in("oklch").getCoords();
            const [L_min, L_max] = lightnessRange();
            const L_adjusted = Math.min(L_max, Math.max(L_min, L));

            let C_low = 0;
            let C_high = 1.0;
            const epsilon = 1e-6;
            let clipped: number[] = [];

            while (C_high - C_low > epsilon) {
                const C_mid = (C_low + C_high) / 2;
                const candidate_color = Color.in("oklch").setCoords([L_adjusted, C_mid, H]);

                if (candidate_color.inGamut(targetGamut as ColorSpace, 1e-5)) C_low = C_mid;
                else {
                    const clipped_coords = fit(candidate_color.getCoords().slice(0, 3), model, "clip");
                    const clipped_color = Color.in(model).setCoords(clipped_coords);
                    const deltaE = candidate_color.deltaEOK(clipped_color);
                    if (deltaE < 2) {
                        clipped = clipped_coords;
                        return roundCoords(clipped);
                    } else C_high = C_mid;
                }
            }

            const finalColor = Color.in("oklch").setCoords([L_adjusted, C_low, H]);
            clipped = finalColor.in(model).getCoords();
            return roundCoords(clipped);
        }

        case "css-gamut-map": {
            if (targetGamut === null) return roundCoords(coords);

            const color = Color.in(model).setCoords(coords);
            const [L, C, H] = color.in("oklch").getCoords();

            if (L >= 1.0) {
                const white = Color.in("oklab").setCoords([1, 0, 0]);
                return roundCoords(white.in(model).getCoords());
            }

            if (L <= 0.0) {
                const black = Color.in("oklab").setCoords([0, 0, 0]);
                return roundCoords(black.in(model).getCoords());
            }

            if (color.inGamut(targetGamut as ColorSpace, 1e-5)) return roundCoords(coords);

            const JND = 0.02;
            const epsilon = 0.0001;

            const current = Color.in("oklch").setCoords([L, C, H]);
            let clipped: number[] = fit(current.in(model).getCoords().slice(0, 3), model, "clip");

            const initialClippedColor = Color.in(model).setCoords(clipped);
            const E = current.deltaEOK(initialClippedColor);

            if (E < JND) return roundCoords(clipped);

            let min = 0;
            let max = C;
            let min_inGamut = true;

            while (max - min > epsilon) {
                const chroma = (min + max) / 2;
                const candidate = Color.in("oklch").setCoords([L, chroma, H]);

                if (min_inGamut && candidate.inGamut(targetGamut as ColorSpace, 1e-5)) min = chroma;
                else {
                    const clippedCoords = fit(candidate.in(model).getCoords().slice(0, 3), model, "clip");
                    clipped = clippedCoords;
                    const clippedColor = Color.in(model).setCoords(clippedCoords);
                    const deltaE = candidate.deltaEOK(clippedColor);

                    if (deltaE < JND) {
                        if (JND - deltaE < epsilon) return roundCoords(clipped);
                        else {
                            min_inGamut = false;
                            min = chroma;
                        }
                    } else max = chroma;
                }
            }

            return roundCoords(clipped);
        }

        default:
            throw new Error(
                `Invalid gamut clipping method: must be 'minmax', 'chroma-reduction', 'css-gamut-map', 'round-only', or 'no-fit'.`
            );
    }
}

/**
 * Creates a <color> converter for a given <color-function> converter.
 *
 * @param name - The name of the color function (e.g., "rgb", "hsl", "lab", etc.).
 * @param converter - An object implementing the color function's conversion logic and component definitions.
 * @returns A <color> convereter object.
 */
export function converterFromFunctionConverter(name: string, converter: ColorFunctionConverter) {
    const evaluateComponent = (token: string, value: number[] | "hue" | "percentage", base: Record<string, number>) => {
        const parsePercent = (str: string) => {
            const percent = parseFloat(str);
            if (!isNaN(percent)) {
                if (value === "percentage") return percent;
                return (percent / 100) * (max - min) + min;
            }
        };

        if (token === "none") return 0;

        const [min, max] = Array.isArray(value) ? value : value === "hue" ? [0, 360] : [0, 100];

        if (/^\d+(\.\d+)?$/.test(token)) return parseFloat(token);

        if (token.endsWith("%")) {
            return parsePercent(token);
        }

        if (/deg|rad|grad|turn$/.test(token)) {
            const value = parseFloat(token);
            if (isNaN(value)) return 0;

            if (token.endsWith("deg")) return value;
            if (token.endsWith("rad")) return value * (180 / Math.PI);
            if (token.endsWith("grad")) return value * 0.9;
            if (token.endsWith("turn")) return value * 360;

            return 0;
        }

        if (token.startsWith("calc(")) {
            const inner = token.slice(5, -1);
            if (inner === "infinity") return max;
            if (inner === "-infinity") return min;

            if (/\d+(\.\d+)?%/i.test(inner)) {
                return parsePercent(inner);
            }

            let expr = inner;
            for (const [key, value] of Object.entries(base)) {
                expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), value.toString());
            }
            try {
                return eval(expr);
            } catch {
                return 0;
            }
        }

        const number = parseFloat(token);
        const fromBase = base[token];
        return fromBase !== undefined ? fromBase : !isNaN(number) ? number : 0;
    };

    const parseTokens = (tokens: string[]) => {
        const funcName = tokens[0];

        const { components } = converter;
        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        if (tokens[1] === "from") {
            let colorSpace;
            let componentStartIndex;
            if (funcName === "color") {
                colorSpace = tokens[3];
                componentStartIndex = 4;
            } else {
                colorSpace = funcName;
                componentStartIndex = 3;
            }

            const baseColor = tokens[2];
            const componentTokens = tokens.slice(componentStartIndex);

            const baseComponents = Color.from(baseColor).in(colorSpace).get();

            const evaluatedComponents = componentTokens.map((token, i) => {
                const sorted = Object.entries(components).sort((a, b) => a[1].index - b[1].index);
                const [, meta] = sorted[i];
                return evaluateComponent(token, meta.value, baseComponents);
            });

            return evaluatedComponents.slice(0, 4);
        } else {
            const result: number[] = [];
            const sorted = Object.entries(components).sort((a, b) => a[1].index - b[1].index);

            for (let i = 0; i < sorted.length; i++) {
                const [, meta] = sorted[i];
                const token = tokens[i + 1];
                if (token) {
                    const value = evaluateComponent(token, meta.value, {});
                    result[meta.index] = value;
                }
            }

            return result.slice(0, 4);
        }
    };

    const tokenize = (str: string) => {
        const tokens = [];
        let i = 0;
        let funcName = "";
        while (i < str.length && str[i] !== "(") {
            funcName += str[i];
            i++;
        }
        funcName = funcName.trim();
        tokens.push(funcName);

        const innerStart = str.indexOf("(") + 1;
        const innerEnd = str.lastIndexOf(")");
        const innerStr = str.slice(innerStart, innerEnd).trim();

        i = 0;
        if (innerStr.startsWith("from ")) {
            tokens.push("from");

            i += 5;
            while (i < innerStr.length && innerStr[i] === " ") i++;

            const colorStart = i;
            while (i < innerStr.length && innerStr[i] !== " ") i++;
            const colorStr = innerStr.slice(colorStart, i);

            if (colorStr.includes("(")) {
                let depth = 1;
                let funcStr = colorStr;
                while (i < innerStr.length && depth > 0) {
                    if (innerStr[i] === "(") depth++;
                    else if (innerStr[i] === ")") depth--;
                    if (depth > 0) funcStr += innerStr[i];
                    i++;
                }
                funcStr += ")";
                tokens.push(funcStr);
            } else {
                tokens.push(colorStr);
            }
            while (i < innerStr.length && innerStr[i] === " ") i++;
        }

        if (tokens[0] === "color" && i < innerStr.length) {
            const spaceStart = i;
            while (i < innerStr.length && innerStr[i] !== " ") i++;
            tokens.push(innerStr.slice(spaceStart, i));
            while (i < innerStr.length && innerStr[i] === " ") i++;
        }

        while (i < innerStr.length) {
            while (i < innerStr.length && innerStr[i] === " ") i++;
            if (i >= innerStr.length) break;

            const char = innerStr[i];
            if (/[a-zA-Z-]/.test(char)) {
                let ident = "";
                while (i < innerStr.length && /[a-zA-Z0-9-%]/.test(innerStr[i])) {
                    ident += innerStr[i];
                    i++;
                }
                if (i < innerStr.length && innerStr[i] === "(") {
                    let depth = 1;
                    let funcStr = ident + "(";
                    i++;
                    while (i < innerStr.length && depth > 0) {
                        if (innerStr[i] === "(") depth++;
                        else if (innerStr[i] === ")") depth--;
                        if (depth > 0) funcStr += innerStr[i];
                        i++;
                    }
                    funcStr += ")";
                    tokens.push(funcStr);
                } else {
                    tokens.push(ident);
                }
            } else if (/[\d.-]/.test(char)) {
                let num = "";
                while (i < innerStr.length && /[\d.eE+-]/.test(innerStr[i])) {
                    num += innerStr[i];
                    i++;
                }
                if (i < innerStr.length && innerStr[i] === "%") {
                    num += "%";
                    i++;
                    tokens.push(num);
                } else if (i < innerStr.length && /[a-zA-Z]/.test(innerStr[i])) {
                    let unit = "";
                    while (i < innerStr.length && /[a-zA-Z]/.test(innerStr[i])) {
                        unit += innerStr[i];
                        i++;
                    }
                    tokens.push(num + unit);
                } else {
                    tokens.push(num);
                }
            } else if (char === "/" || char === ",") {
                i++;
            } else {
                throw new Error(`Unexpected character: ${char}`);
            }
        }

        return tokens;
    };

    const validateRelativeColorSpace = (str: string, name: string) => {
        const prefix = "color(from ";
        if (!str.startsWith(prefix) || !str.endsWith(")")) {
            return false;
        }
        const innerStr = str.slice(prefix.length, -1).trim();

        let depth = 0;
        let colorEnd = innerStr.length;
        for (let i = 0; i < innerStr.length; i++) {
            const char = innerStr[i];
            if (char === "(") {
                depth++;
            } else if (char === ")") {
                if (depth === 0) {
                    return false;
                }
                depth--;
            } else if (char === " " && depth === 0) {
                colorEnd = i;
                break;
            }
        }

        const rest = innerStr.slice(colorEnd).trim();
        const parts = rest.split(/\s+/);
        if (parts.length < 1) {
            return false;
        }
        const colorSpace = parts[0];
        return colorSpace === name;
    };

    const cleanedName = name.replace(/\s+/g, " ").trim().toLowerCase();

    return {
        isValid: (str: string) => {
            const cleanedStr = str.trim().toLowerCase();
            if (cleanedName in colorSpaceConverters) {
                return (
                    (cleanedStr.startsWith(`color(${cleanedName} `) ||
                        (cleanedStr.startsWith("color(from ") && validateRelativeColorSpace(str, cleanedName))) &&
                    cleanedStr.endsWith(")")
                );
            }
            return (
                (cleanedStr.startsWith(`${cleanedName}(`) ||
                    cleanedStr.startsWith(`${cleanedName}${converter.supportsLegacy ? "a" : ""}(`)) &&
                cleanedStr.endsWith(")")
            );
        },
        toXYZ: (str: string) => {
            const cleaned = str.replace(/\s+/g, " ").trim().toLowerCase();
            const tokens = tokenize(cleaned);
            const components = parseTokens(tokens);
            return [...converter.toXYZ(components.slice(0, 3)), components[3] ?? 1];
        },
        fromXYZ: (xyz: XYZ, options: FormattingOptions = {}) => {
            const { legacy = false, fit: fitMethod = "clip", precision = undefined, units = false } = options;
            const [c1, c2, c3, alpha] = [...converter.fromXYZ(xyz), xyz[3] ?? 1];

            const clipped = fit([c1, c2, c3], cleanedName as ColorFunction, fitMethod, precision);
            const alphaFormatted = Number(Math.min(Math.max(alpha, 0), 1).toFixed(3)).toString();

            if (cleanedName in colorSpaceConverters) {
                return `color(${cleanedName} ${clipped.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
            }

            if (legacy === true && converter.supportsLegacy === true && alpha > 1) {
                if (alpha === 1) return `${cleanedName}(${clipped.join(", ")})`;
                return `${cleanedName}a(${clipped.join(", ")}, ${alphaFormatted})`;
            }

            return `${cleanedName}(${clipped.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
        },
    };
}

/**
 * Creates a <color-function> converter object from a given color space converter definition.
 *
 * @template C - A tuple of component names for the color space (e.g., ['r', 'g', 'b']).
 * @param name - The name of the color space (used for target gamut identification).
 * @param space - The color space converter definition, including component names,
 *                conversion matrices, linearization functions, and white point.
 * @returns An object implementing the `ColorFunctionConverter` interface, with methods
 *          for converting to and from XYZ color space, and component metadata.
 */
export function functionConverterFromSpaceConverter<const C extends readonly string[]>(
    name: string,
    converter: Omit<ColorSpaceConverter, "components"> & { components: C }
) {
    const isD50 = converter.whitePoint === "D50";
    const toXYZMatrix = isD50 ? multiplyMatrices(D50_to_D65, converter.toXYZMatrix) : converter.toXYZMatrix;
    const fromXYZMatrix = isD50 ? multiplyMatrices(converter.fromXYZMatrix, D65_to_D50) : converter.fromXYZMatrix;

    return {
        supportsLegacy: false,
        targetGamut: converter.targetGamut === null ? null : name,
        components: Object.fromEntries(
            converter.components.map((comp, index) => [comp, { index, value: [0, 1], precision: 5 }])
        ) as Record<C[number], ComponentDefinition>,

        toXYZ: ([c1, c2, c3]: number[]) => {
            const linear = [converter.toLinear(c1), converter.toLinear(c2), converter.toLinear(c3)];
            return multiplyMatrices(toXYZMatrix, linear);
        },

        fromXYZ: (xyz: number[]) => {
            const [lc1, lc2, lc3] = multiplyMatrices(fromXYZMatrix, xyz);
            const c1 = converter.fromLinear ? converter.fromLinear(lc1) : lc1;
            const c2 = converter.fromLinear ? converter.fromLinear(lc2) : lc2;
            const c3 = converter.fromLinear ? converter.fromLinear(lc3) : lc3;
            return [c1, c2, c3];
        },
    } satisfies ColorFunctionConverter;
}
