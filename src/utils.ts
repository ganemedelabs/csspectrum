import { Color } from "./Color.js";
import { config } from "./config.js";
import { colorBases, colorFunctionConverters, colorSpaceConverters, colorTypes, namedColors } from "./converters.js";
import type {
    ColorConverter,
    ColorFunction,
    ColorFunctionConverter,
    ColorSpace,
    ColorSpaceConverter,
    ComponentDefinition,
    FitMethod,
    FormattingOptions,
    NamedColor,
    SystemColor,
} from "./types.js";

export const cache = new Map();

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
 * Configures the application's theme and system colors.
 *
 * @param options - Configuration options.
 */
export function configure(options: {
    theme?: typeof config.theme;
    systemColor?: {
        key: SystemColor;
        light?: [number, number, number];
        dark?: [number, number, number];
    };
}) {
    if (options.theme) {
        config.theme = options.theme;
    }

    if (options.systemColor) {
        const { key, light, dark } = options.systemColor;

        const current = config.systemColors[key];
        config.systemColors[key] = [light ?? current[0], dark ?? current[1]];
    }
}

/**
 * Registers one or more plugins to extend the Color class with additional functionality.
 *
 * @param plugins An array of plugin functions that extend the Color class.
 */
// eslint-disable-next-line no-unused-vars
export function use(...plugins: ((colorClass: typeof Color) => void)[]) {
    for (const plugin of plugins) {
        plugin(Color);
    }
}

/**
 * Registers a new `<color>` converter under the specified name.
 *
 * @param name - The unique name to associate with the color converter.
 * @param converter - The converter object implementing the color conversion logic.
 * @throws If a color name is already used.
 */
export function registerColorType(name: string, converter: ColorConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase();
    const obj = colorTypes as unknown as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    obj[cleaned] = converter;
}

/**
 * Registers a new `<color-base>` converter under the specified name.
 *
 * @param name - The unique name to associate with the color base converter.
 * @param converter - The converter object implementing the color base conversion logic.
 * @throws If a color base name is already used.
 */
export function registerColorBase(name: string, converter: ColorConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase();
    const obj = colorBases as unknown as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    obj[cleaned] = converter;
}

/**
 * Registers a new `<color-function>` converter under the specified name.
 *
 * @param name - The unique name to associate with the color function converter.
 * @param converter - The converter object implementing the color function conversion logic.
 * @throws If a color function name is already used.
 */
export function registerColorFunction(name: string, converter: ColorFunctionConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "").toLowerCase();
    const obj = colorFunctionConverters as unknown as Record<string, ColorFunctionConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    obj[cleaned] = converter;
}

/**
 * Registers a new color space converter for `<color()>` function under the specified name.
 *
 * @param name - The unique name to associate with the color space converter.
 * @param converter - The converter object implementing the color space conversion logic.
 * @throws If a color space name is already used.
 */
export function registerColorSpace(name: string, converter: ColorSpaceConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase();
    const obj = colorSpaceConverters as unknown as Record<string, ColorFunctionConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    obj[cleaned] = functionConverterFromSpaceConverter(cleaned, converter);
}

/**
 * Registers a new `<named-color>` with the specified RGB value.
 *
 * @param name - The name to register for the color.
 * @param rgb - The RGB tuple representing the color, as an array of three numbers [red, green, blue].
 * @throws If the color name is already registered.
 * @throws If the RGB value is already registered under a different name.
 */
export function registerNamedColor(name: string, rgb: [number, number, number]) {
    const cleaned = name.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const colorMap = namedColors as Record<NamedColor, [number, number, number]>;

    if (colorMap[cleaned as NamedColor]) {
        throw new Error(`<named-color> "${name}" is already registered.`);
    }

    const existingName = Object.entries(colorMap).find(([, value]) =>
        value.every((channel, i) => channel === rgb[i])
    )?.[0];

    if (existingName) {
        throw new Error(`RGB value [${rgb.join(", ")}] is already registered as "${existingName}".`);
    }

    colorMap[cleaned as NamedColor] = rgb;
}

/**
 * Unregisters one or more color types from the library.
 *
 * @param types - The names of the color types to unregister.
 */
export function unregister(...types: string[]) {
    for (const type of types) {
        delete colorTypes[type as keyof typeof colorTypes];
    }
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
 * - `"none"`: Returns the original coordinates without modification.
 * - `"round-unclipped"`: Rounds the coordinates according to the component precision withput gamut mapping.
 * - `"clip"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
 * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
 * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
 */
export function fit(coords: number[], options: { model?: ColorFunction; method?: FitMethod; precision?: number } = {}) {
    const roundCoords = (coords: number[]) => {
        return coords.map((value, i) => {
            const p = precision ?? componentProps[i]?.precision ?? 3;
            return Number(value.toFixed(p));
        });
    };

    const { model = "srgb", method = "clip", precision } = options;

    if (method === "none") return coords;

    const converter = colorFunctionConverters[model] as ColorFunctionConverter;
    const components = converter.components;
    let targetGamut = converter.targetGamut;
    if (targetGamut !== null && typeof targetGamut !== "string") targetGamut = "srgb";

    const componentProps: ComponentDefinition[] = [];
    for (const [, props] of Object.entries(components)) {
        componentProps[props.index] = props;
    }

    switch (method) {
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
                    const color = new Color("oklch", [L, C, H]);
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

            const color = new Color(model, coords);
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
                const candidate_color = new Color("oklch", [L_adjusted, C_mid, H]);

                if (candidate_color.inGamut(targetGamut as ColorSpace, 1e-5)) C_low = C_mid;
                else {
                    const clipped_coords = fit(candidate_color.getCoords().slice(0, 3), { model, method: "clip" });
                    const clipped_color = new Color(model, clipped_coords);
                    const deltaE = candidate_color.deltaEOK(clipped_color);
                    if (deltaE < 2) {
                        clipped = clipped_coords;
                        return roundCoords(clipped);
                    } else C_high = C_mid;
                }
            }

            const finalColor = new Color("oklch", [L_adjusted, C_low, H]);
            clipped = finalColor.in(model).getCoords();
            return roundCoords(clipped);
        }

        case "css-gamut-map": {
            if (targetGamut === null) return roundCoords(coords);

            const color = new Color(model, coords);
            const [L, C, H] = color.in("oklch").getCoords();

            if (L >= 1.0) {
                const white = new Color("oklab", [1, 0, 0]);
                return roundCoords(white.in(model).getCoords());
            }

            if (L <= 0.0) {
                const black = new Color("oklab", [0, 0, 0]);
                return roundCoords(black.in(model).getCoords());
            }

            if (color.inGamut(targetGamut as ColorSpace, 1e-5)) return roundCoords(coords);

            const JND = 0.02;
            const epsilon = 0.0001;

            const current = new Color("oklch", [L, C, H]);
            let clipped: number[] = fit(current.in(model).getCoords().slice(0, 3), { model, method: "clip" });

            const initialClippedColor = new Color(model, clipped);
            const E = current.deltaEOK(initialClippedColor);

            if (E < JND) return roundCoords(clipped);

            let min = 0;
            let max = C;
            let min_inGamut = true;

            while (max - min > epsilon) {
                const chroma = (min + max) / 2;
                const candidate = new Color("oklch", [L, chroma, H]);

                if (min_inGamut && candidate.inGamut(targetGamut as ColorSpace, 1e-5)) min = chroma;
                else {
                    const clippedCoords = fit(candidate.in(model).getCoords().slice(0, 3), { model, method: "clip" });
                    clipped = clippedCoords;
                    const clippedColor = new Color(model, clippedCoords);
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
 * Creates a `<color>` converter for a given `<color-function>` converter.
 *
 * @param name - The name of the color function (e.g., "rgb", "hsl", "lab", etc.).
 * @param converter - An object implementing the color function's conversion logic and component definitions.
 * @returns An object of type `ColorConverter`.
 */
export function converterFromFunctionConverter(name: string, converter: ColorFunctionConverter) {
    const evaluateComponent = (
        token: string,
        value: number[] | "hue" | "percentage",
        base: Record<string, number> = {}
    ) => {
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
                    const value = evaluateComponent(token, meta.value);
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
                        (/^color\(\s*from\s+/i.test(cleanedStr) && validateRelativeColorSpace(str, cleanedName))) &&
                    cleanedStr.endsWith(")")
                );
            }
            return (
                (cleanedStr.startsWith(`${cleanedName}(`) ||
                    cleanedStr.startsWith(`${cleanedName}${converter.supportsLegacy ? "a" : ""}(`)) &&
                cleanedStr.endsWith(")")
            );
        },
        bridge: converter.bridge,
        toBridge: (coords: number[]) => [...converter.toBridge(coords.slice(0, 3)), coords[3] ?? 1],
        parse: (str: string) => {
            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const tokens = tokenize(cleaned);
            const components = parseTokens(tokens);
            return [...components.slice(0, 3), components[3] ?? 1];
        },
        fromBridge: (coords: number[]) => [...converter.fromBridge(coords), coords[3] ?? 1],
        format: ([c1, c2, c3, alpha = 1]: number[], options: FormattingOptions = {}) => {
            const { legacy = false, fit: fitMethod = "clip", precision = undefined, units = false } = options;

            const clipped = fit([c1, c2, c3], { model: cleanedName as ColorFunction, method: fitMethod, precision });
            const alphaFormatted = Number(Math.min(Math.max(alpha, 0), 1).toFixed(3)).toString();

            let formattedComponents: string[];

            if (units && converter.components) {
                formattedComponents = clipped.map((value, index) => {
                    const componentConfig = Object.values(converter.components).find((comp) => comp.index === index);
                    if (!componentConfig) return value.toString();

                    if (componentConfig.value === "percentage") {
                        return `${value}%`;
                    } else if (componentConfig.value === "hue") {
                        return `${value}deg`;
                    }
                    return value.toString();
                });
            } else {
                formattedComponents = clipped.map((val) => val.toString());
            }

            if (cleanedName in colorSpaceConverters) {
                return `color(${cleanedName} ${formattedComponents.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
            }

            if (legacy === true && converter.supportsLegacy === true) {
                if (alpha === 1) return `${cleanedName}(${formattedComponents.join(", ")})`;
                return `${converter.alphaVariant || cleanedName}(${formattedComponents.join(", ")}, ${alphaFormatted})`;
            }

            return `${cleanedName}(${formattedComponents.join(" ")}${alpha !== 1 ? ` / ${alphaFormatted}` : ""})`;
        },
    };
}

/**
 * Creates a `<color-function>` converter object from a given color space converter definition.
 *
 * @template C - A tuple of component names for the color space (e.g., ["r", "g", "b"]).
 * @param name - The name of the color space (used for target gamut identification).
 * @param converter - The color space converter definition.
 * @returns An object of type `ColorFunctionConverter`.
 */
export function functionConverterFromSpaceConverter<const C extends readonly string[]>(
    name: string,
    converter: Omit<ColorSpaceConverter, "components"> & { components: C }
) {
    const { fromLinear = (c) => c, toLinear = (c) => c, toBridgeMatrix, fromBridgeMatrix } = converter;

    return {
        supportsLegacy: false,
        targetGamut: converter.targetGamut === null ? null : name,
        components: Object.fromEntries(
            converter.components.map((comp, index) => [comp, { index, value: [0, 1], precision: 5 }])
        ) as Record<C[number], ComponentDefinition>,
        bridge: converter.bridge,
        toBridge: (coords: number[]) => {
            return multiplyMatrices(
                toBridgeMatrix,
                coords.map((c) => toLinear(c))
            );
        },
        fromBridge: (coords: number[]) => multiplyMatrices(fromBridgeMatrix, coords).map((c) => fromLinear(c)),
    } satisfies ColorFunctionConverter;
}
