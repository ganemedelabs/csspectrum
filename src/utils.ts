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
export function fit(coords: number[], model: ColorFunction, method: FitMethod = "minmax", precision?: number) {
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
        case "no-fit":
            return coords;

        case "round-only":
            return roundCoords(coords);

        case "minmax": {
            const clipped = coords.slice(0, 3).map((value, i) => {
                const props = componentProps[i];
                if (!props) {
                    throw new Error(`Missing component properties for index ${i}.`);
                }
                if (props.loop) {
                    const range = props.max - props.min;
                    return props.min + ((((value - props.min) % range) + range) % range);
                } else {
                    return Math.min(props.max, Math.max(props.min, value));
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
                    const clipped_coords = fit(candidate_color.getCoords().slice(0, 3), model, "minmax");
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
            let clipped: number[] = fit(current.in(model).getCoords().slice(0, 3), model, "minmax");

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
                    const clippedCoords = fit(candidate.in(model).getCoords().slice(0, 3), model, "minmax");
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
// FIXME: fix the tokeninzing logic
export function converterFromFunctionConverter(name: string, converter: ColorFunctionConverter) {
    const tokenizeInner = (inner: string) => {
        const tokens = [];
        let i = 0;
        inner = inner.trim();

        if (inner.startsWith("from ")) {
            tokens.push("from");
            i += 5;

            let colorToken = "";
            let depth = 0;
            while (i < inner.length) {
                if (inner[i] === "(") depth++;
                else if (inner[i] === ")") depth--;
                if (depth < 0) break;
                if (/\s/.test(inner[i]) && depth === 0) break;
                colorToken += inner[i];
                i++;
            }
            tokens.push(colorToken);

            while (i < inner.length && /\s/.test(inner[i])) i++;
        }

        while (i < inner.length) {
            if (/\s/.test(inner[i])) {
                i++;
                continue;
            }
            if (inner.slice(i, i + 5) === "calc(") {
                let depth = 1;
                let j = i + 5;
                while (j < inner.length && depth > 0) {
                    if (inner[j] === "(") depth++;
                    else if (inner[j] === ")") depth--;
                    j++;
                }
                tokens.push(inner.slice(i, j));
                i = j;
            } else if (inner[i] === "/") {
                tokens.push("/");
                i++;
            } else {
                let j = i;
                while (
                    j < inner.length &&
                    !/\s/.test(inner[j]) &&
                    inner[j] !== "/" &&
                    inner.slice(j, j + 5) !== "calc("
                ) {
                    j++;
                }
                tokens.push(inner.slice(i, j));
                i = j;
            }
        }
        return tokens;
    };

    const evaluateComponent = (
        componentString: string,
        baseComponents: Record<string, number>,
        componentDef: { min: number; max: number }
    ) => {
        if (componentString === "none") return 0;
        if (componentString === "calc(infinity)") return componentDef.max;
        if (componentString === "calc(-infinity)") return componentDef.min;
        if (/^\d+(\.\d+)?$/.test(componentString)) return parseFloat(componentString);
        if (componentString.startsWith("calc(")) {
            let expr = componentString.slice(5, -1).trim();
            for (const [key, value] of Object.entries(baseComponents)) {
                expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), value.toString());
            }
            try {
                return eval(expr);
            } catch {
                return 0;
            }
        } else {
            return baseComponents[componentString] || 0;
        }
    };

    const tokenize = (str: string) => {
        const cleaned = str.trim().toLowerCase();
        let inner;
        if (cleaned.startsWith("color(")) {
            inner = cleaned.slice(6, -1).trim();
        } else {
            inner = cleaned.slice(name.length + 1, -1).trim();
        }
        return tokenizeInner(inner);
    };

    const parseTokens = (tokens: string[]) => {
        if (tokens[0] === "from") {
            const baseColorIndex = 1;
            let colorSpace;
            let componentStartIndex;
            if (name === "color") {
                colorSpace = tokens[2];
                componentStartIndex = 3;
            } else {
                colorSpace = name;
                componentStartIndex = 2;
            }
            const baseColor = tokens[baseColorIndex];
            const componentTokens = tokens.slice(componentStartIndex);
            const alphaIndex = componentTokens.indexOf("/");
            let alphaToken;
            if (alphaIndex !== -1) {
                alphaToken = componentTokens[alphaIndex + 1];
                componentTokens.splice(alphaIndex, 2);
            }
            const baseComponents = Color.from(baseColor).in(colorSpace).get();
            const componentNames = Object.keys(converter.components).sort(
                (a, b) => converter.components[a].index - converter.components[b].index
            );
            const evaluatedComponents = componentTokens.map((token, i) => {
                const componentDef = converter.components[componentNames[i]];
                return evaluateComponent(token, baseComponents, componentDef);
            });
            const alphaDef = { min: 0, max: 1, index: 3 };
            const alpha = alphaToken ? evaluateComponent(alphaToken, baseComponents, alphaDef) : 1;
            return [evaluatedComponents[0], evaluatedComponents[1], evaluatedComponents[2], alpha];
        } else {
            const result: number[] = [];
            const comps = converter.components;
            const sorted = Object.entries(comps).sort((a, b) => a[1].index - b[1].index);
            for (let i = 0; i < sorted.length; i++) {
                const [, meta] = sorted[i];
                const token = tokens[i];
                const value = parseComponentValue(token, meta);
                result[meta.index] = value;
            }
            const slashIndex = tokens.indexOf("/");
            if (slashIndex !== -1 && slashIndex + 1 < tokens.length) {
                const alphaToken = tokens[slashIndex + 1];
                result[3] = parseFloat(alphaToken);
            } else if (tokens[3]) result[3] = parseFloat(tokens[3]);
            return result;
        }
    };

    const parseComponentValue = (token: string, component: { min: number; max: number }) => {
        token = token.trim().toLowerCase();
        if (token === "none") return 0;
        if (token === "calc(infinity)") return component.max;
        if (token === "calc(-infinity)") return component.min;
        if (token.startsWith("calc(")) {
            const innerExpr = token.slice(5, -1).trim();
            if (innerExpr.endsWith("%")) {
                const percent = parseFloat(innerExpr.slice(0, -1));
                if (!isNaN(percent)) {
                    return (percent / 100) * (component.max - component.min) + component.min;
                }
            }
            return evaluateComponent(token, {}, component);
        }
        if (token.endsWith("%")) {
            const percent = parseFloat(token.slice(0, -1));
            if (!isNaN(percent)) {
                return (percent / 100) * (component.max - component.min) + component.min;
            }
        }
        if (/deg|rad|grad|turn$/.test(token)) {
            const value = parseFloat(token);
            return isNaN(value) ? 0 : value;
        }
        const value = parseFloat(token);
        return isNaN(value) ? 0 : value;
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

    name = name.trim().toLowerCase();

    return {
        isValid: (str: string) => {
            const cleaned = str.trim().toLowerCase();
            if (name in colorSpaceConverters) {
                return (
                    (cleaned.startsWith(`color(${name} `) ||
                        (cleaned.startsWith("color(from ") && validateRelativeColorSpace(str, name))) &&
                    cleaned.endsWith(")")
                );
            }
            return (
                (cleaned.startsWith(`${name}(`) ||
                    cleaned.startsWith(`${name}${converter.supportsLegacy ? "a" : ""}(`)) &&
                cleaned.endsWith(")")
            );
        },
        toXYZ: (str: string) => {
            const tokens = tokenize(str);
            const components = parseTokens(tokens);
            return [...converter.toXYZ([components[0], components[1], components[2]]), components[3] ?? 1];
        },
        fromXYZ: (xyz: XYZ, options: FormattingOptions = {}) => {
            const { legacy = false, fit: fitMethod = "minmax", precision = undefined } = options;
            const [c1, c2, c3, alpha] = [...converter.fromXYZ(xyz), xyz[3] ?? 1];

            const clipped = fit([c1, c2, c3], name as ColorFunction, fitMethod, precision);
            const alphaFormatted = Math.min(Math.max(alpha, 0), 1).toFixed(3);

            if (name in colorSpaceConverters) {
                return `color(${name} ${clipped.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
            }

            if (legacy === true && converter.supportsLegacy === true && alpha > 1) {
                if (alpha === 1) return `${name}(${clipped.join(", ")})`;
                return `${name}a(${clipped.join(", ")}, ${alphaFormatted})`;
            }

            return `${name}(${clipped.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
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
    space: Omit<ColorSpaceConverter, "components"> & { components: C }
) {
    const isD50 = space.whitePoint === "D50";
    const toXYZMatrix = isD50 ? multiplyMatrices(D50_to_D65, space.toXYZMatrix) : space.toXYZMatrix;
    const fromXYZMatrix = isD50 ? multiplyMatrices(space.fromXYZMatrix, D65_to_D50) : space.fromXYZMatrix;

    return {
        supportsLegacy: false,
        targetGamut: space.targetGamut === null ? null : name,
        components: Object.fromEntries(
            space.components.map((comp, index) => [comp, { index, min: 0, max: 1, precision: 5 }])
        ) as Record<C[number], ComponentDefinition>,

        toXYZ: ([c1, c2, c3]: number[]) => {
            const linear = [space.toLinear(c1), space.toLinear(c2), space.toLinear(c3)];
            return multiplyMatrices(toXYZMatrix, linear);
        },

        fromXYZ: (xyz: number[]) => {
            const [lc1, lc2, lc3] = multiplyMatrices(fromXYZMatrix, xyz);
            const c1 = space.fromLinear ? space.fromLinear(lc1) : lc1;
            const c2 = space.fromLinear ? space.fromLinear(lc2) : lc2;
            const c3 = space.fromLinear ? space.fromLinear(lc3) : lc3;
            return [c1, c2, c3];
        },
    } satisfies ColorFunctionConverter;
}
