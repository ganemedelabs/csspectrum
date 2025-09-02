import { Color } from "./Color.js";
import { config } from "./config.js";
import {
    colorBases,
    colorFunctionConverters,
    colorFunctions,
    colorSpaceConverters,
    colorTypes,
    namedColors,
} from "./converters.js";
import { fitMethods } from "./math.js";
import type {
    ColorBase,
    ColorConverter,
    ColorFunction,
    ColorFunctionConverter,
    ColorSpace,
    ColorSpaceConverter,
    ColorType,
    ComponentDefinition,
    FitFunction,
    FitMethod,
    FormattingOptions,
    NamedColor,
    Plugin,
    SystemColor,
} from "./types.js";

export const cache = new Map();
export const plugins = new Set<(colorClass: typeof Color) => void>(); // eslint-disable-line no-unused-vars

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
export function use(...pluginFns: Plugin[]) {
    if (pluginFns.length === 0) {
        throw new Error("use() requires at least one plugin function.");
    }

    for (const [index, plugin] of Array.from(pluginFns.entries())) {
        if (typeof plugin !== "function") {
            throw new TypeError(`Plugin at index ${index} is not a function. Received: ${typeof plugin}`);
        }

        if (plugins.has(plugin)) {
            console.warn(`Plugin at index ${index} has already been registered. Skipping.`);
            continue;
        }

        try {
            plugin(Color);
            plugins.add(plugin);
        } catch (err) {
            console.error(`Error while running plugin at index ${index}:`, err);
        }
    }
}

/**
 * Registers a new <color> converter under the specified name.
 *
 * @param name - The unique name to associate with the color converter.
 * @param converter - The converter object implementing the color conversion logic.
 * @throws If the name is already used by another color type.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorType(name: string, converter: ColorConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase() as ColorType;
    const obj = colorTypes as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    if (typeof converter.isValid !== "function") {
        throw new TypeError("Converter.isValid must be a function.");
    }

    if (typeof converter.bridge !== "string") {
        throw new TypeError("Converter.bridge must be a string.");
    }

    if (typeof converter.toBridge !== "function") {
        throw new TypeError("Converter.toBridge must be a function.");
    }

    if (typeof converter.parse !== "function") {
        throw new TypeError("Converter.parse must be a function.");
    }

    const hasFromBridge = "fromBridge" in converter;
    const hasFormat = "format" in converter;

    if (hasFromBridge && typeof converter.fromBridge !== "function") {
        throw new TypeError("Converter.fromBridge must be a function if provided.");
    }

    if (hasFormat && typeof converter.format !== "function") {
        throw new TypeError("Converter.format must be a function if provided.");
    }

    if (hasFromBridge !== hasFormat) {
        throw new Error("Converter.fromBridge and Converter.format must either both be provided or both be omitted.");
    }

    obj[cleaned] = converter;
    cache.delete("graph");
}

/**
 * Registers a new <color-base> converter under the specified name.
 *
 * @param name - The unique name to associate with the color base converter.
 * @param converter - The converter object implementing the color base conversion logic.
 * @throws If the name is already used by another color base type.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorBase(name: string, converter: ColorConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase() as ColorType;
    const bases = colorBases as Record<string, ColorConverter>;
    const types = colorTypes as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    if (typeof converter.isValid !== "function") {
        throw new TypeError("Converter.isValid must be a function.");
    }

    if (typeof converter.bridge !== "string") {
        throw new TypeError("Converter.bridge must be a string.");
    }

    if (typeof converter.toBridge !== "function") {
        throw new TypeError("Converter.toBridge must be a function.");
    }

    if (typeof converter.parse !== "function") {
        throw new TypeError("Converter.parse must be a function.");
    }

    const hasFromBridge = "fromBridge" in converter;
    const hasFormat = "format" in converter;

    if (hasFromBridge && typeof converter.fromBridge !== "function") {
        throw new TypeError("Converter.fromBridge must be a function if provided.");
    }

    if (hasFormat && typeof converter.format !== "function") {
        throw new TypeError("Converter.format must be a function if provided.");
    }

    if (hasFromBridge !== hasFormat) {
        throw new Error("Converter.fromBridge and Converter.format must either both be provided or both be omitted.");
    }

    bases[cleaned] = converter;
    types[cleaned] = converter;
    cache.delete("graph");
}

/**
 * Registers a new <color-function> converter under the specified name.
 *
 * @param name - The unique name to associate with the color function converter.
 * @param converter - The converter object implementing the color function conversion logic.
 * @throws If the name is already used by another color type.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorFunction(name: string, converter: ColorFunctionConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "").toLowerCase() as ColorType;
    const functions = colorFunctionConverters as unknown as Record<string, ColorFunctionConverter>;
    const cf = colorFunctions as Record<string, ColorConverter>;
    const types = colorTypes as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    if (typeof converter.bridge !== "string") {
        throw new TypeError(`Converter.bridge must be a string.`);
    }

    if (typeof converter.toBridge !== "function") {
        throw new TypeError(`Converter.toBridge must be a function.`);
    }

    if (typeof converter.fromBridge !== "function") {
        throw new TypeError(`Converter.fromBridge must be a function.`);
    }

    if (
        typeof converter.components !== "object" ||
        converter.components === null ||
        Array.isArray(converter.components)
    ) {
        throw new TypeError(`Converter.components must be a non-null object.`);
    }

    if ("targetGamut" in converter && converter.targetGamut !== null && typeof converter.targetGamut !== "string") {
        throw new TypeError(`Converter.targetGamut must be a string or null.`);
    }

    if ("supportsLegacy" in converter && typeof converter.supportsLegacy !== "boolean") {
        throw new TypeError(`Converter.supportsLegacy must be a boolean.`);
    }

    if ("alphaVariant" in converter && typeof converter.alphaVariant !== "string") {
        throw new TypeError(`Converter.alphaVariant must be a string.`);
    }

    functions[cleaned] = converter;
    cf[cleaned] = converterFromFunctionConverter(cleaned, converter);
    types[cleaned] = converterFromFunctionConverter(cleaned, converter);
    cache.delete("graph");
}

/**
 * Registers a new color space converter for `<color()>` function under the specified name.
 *
 * @param name - The unique name to associate with the color space converter.
 * @param converter - The converter object implementing the color space conversion logic.
 * @throws If the name is already used by another color space.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorSpace(name: string, converter: ColorSpaceConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase() as ColorType;
    const spaces = colorSpaceConverters as unknown as Record<string, ColorFunctionConverter>;
    const functions = colorFunctionConverters as unknown as Record<string, ColorFunctionConverter>;
    const cf = colorFunctions as Record<string, ColorConverter>;
    const types = colorTypes as Record<string, ColorConverter>;

    if (cleaned in colorTypes) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    if (!Array.isArray(converter.components) || converter.components.some((c) => typeof c !== "string")) {
        throw new TypeError("Converter.components must be an array of strings.");
    }

    if (typeof converter.bridge !== "string") {
        throw new TypeError("Converter.bridge must be a string.");
    }

    if (
        !Array.isArray(converter.toBridgeMatrix) ||
        converter.toBridgeMatrix.some((row) => !Array.isArray(row) || row.some((val) => typeof val !== "number"))
    ) {
        throw new TypeError("Converter.toBridgeMatrix must be a 2D array of numbers.");
    }

    if (
        !Array.isArray(converter.fromBridgeMatrix) ||
        converter.fromBridgeMatrix.some((row) => !Array.isArray(row) || row.some((val) => typeof val !== "number"))
    ) {
        throw new TypeError("Converter.fromBridgeMatrix must be a 2D array of numbers.");
    }

    if ("targetGamut" in converter && converter.targetGamut !== null) {
        throw new TypeError("Converter.targetGamut must be null if provided.");
    }

    if ("toLinear" in converter && typeof converter.toLinear !== "function") {
        throw new TypeError("Converter.toLinear must be a function if provided.");
    }

    if ("fromLinear" in converter && typeof converter.fromLinear !== "function") {
        throw new TypeError("Converter.fromLinear must be a function if provided.");
    }

    spaces[cleaned] = functionConverterFromSpaceConverter(cleaned, converter);
    functions[cleaned] = functionConverterFromSpaceConverter(cleaned, converter);
    cf[cleaned] = converterFromFunctionConverter(cleaned, functionConverterFromSpaceConverter(cleaned, converter));
    types[cleaned] = converterFromFunctionConverter(cleaned, functionConverterFromSpaceConverter(cleaned, converter));
    cache.delete("graph");
}

/**
 * Registers a new `<named-color>` with the specified RGB value.
 *
 * @param name - The color name to register. Non-letter characters are removed, and case is ignored.
 * @param rgb - The RGB tuple representing the color, as an array of three numbers [red, green, blue].
 * @throws If the RGB array does not contain exactly three elements.
 * @throws If the color name is already registered.
 * @throws If the RGB value is already registered under a different name.
 */
export function registerNamedColor(name: string, rgb: [number, number, number]) {
    if (!Array.isArray(rgb) || rgb.length !== 3) {
        throw new Error(`RGB value must be an array of exactly three numbers, received length ${rgb.length}.`);
    }

    const cleaned = name.replace(/[^a-zA-Z]/g, "").toLowerCase() as NamedColor;
    const colorMap = namedColors as Record<NamedColor, [number, number, number]>;

    if (colorMap[cleaned]) {
        throw new Error(`<named-color> "${name}" is already registered.`);
    }

    const duplicate = Object.entries(colorMap).find(([, value]) => value.every((channel, i) => channel === rgb[i]));

    if (duplicate) {
        throw new Error(`RGB value [${rgb.join(", ")}] is already registered as "${duplicate[0]}".`);
    }

    colorMap[cleaned] = rgb;
}

/**
 * Registers a new fit method under a specified name.
 *
 * @param name - The name to register the fit method under. Whitespace will be replaced with hyphens and the name will be lowercased.
 * @param method - The fit function to register.
 * @throws If a fit method with the cleaned name already exists.
 * @throws If the provided method is not a function.
 */
export function registerFitMethod(name: string, method: FitFunction) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase() as FitMethod;
    const methods = fitMethods as Record<string, FitFunction>;

    if (cleaned in fitMethods) {
        throw new Error(`The name "${cleaned}" is already used.`);
    }

    if (typeof method !== "function") {
        throw new TypeError("Fit method must be a function.");
    }

    methods[cleaned] = method;
}

/**
 * Unregisters one or more color types from the library.
 *
 * @param types - The names of the color types to unregister.
 */
export function unregister(...types: string[]) {
    for (const type of types) {
        delete colorTypes[type as ColorType];
        delete colorBases[type as ColorBase];
        delete colorFunctions[type as ColorFunction];
        delete colorFunctionConverters[type as ColorFunction];
        delete colorSpaceConverters[type as ColorSpace];
    }
    cache.delete("graph");
    cache.delete("paths");
}

/**
 * Cleans and normalizes a CSS color string.
 *
 * @param color - The CSS color string to clean.
 * @returns The cleaned and normalized color string.
 */
export function clean(color: string) {
    return color
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\( /g, "(")
        .replace(/ \)/g, ")")
        .replace(/\s*,\s*/g, ", ")
        .replace(/ ,/g, ",")
        .replace(/calc\(NaN\)/g, "0")
        .replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/**
 * Extracts a balanced expression from the input string starting at the given index.
 *
 * If the character at the start index is an opening parenthesis '(', the function
 * extracts the entire balanced parenthetical expression, including nested parentheses.
 * Otherwise, it extracts a contiguous sequence of alphanumeric characters, hyphens, or percent signs.
 *
 * @param input - The string to extract the expression from.
 * @param start - The index in the string to start extraction.
 * @returns An object containing the extracted expression as a string the index after the end of it.
 */
export function extractBalancedExpression(input: string, start: number) {
    let i = start;
    let expression = "";
    let depth = 0;

    if (input[i] !== "(") {
        while (i < input.length && /[a-zA-Z0-9-%#]/.test(input[i])) {
            expression += input[i];
            i++;
        }
    }

    if (input[i] === "(") {
        expression += "(";
        i++;
        depth = 1;

        while (i < input.length && depth > 0) {
            const char = input[i];
            if (char === "(") depth++;
            else if (char === ")") depth--;
            if (depth > 0) expression += char;
            i++;
        }
        expression += ")";
    }

    return { expression, end: i };
}

/**
 * Fits or clips a set of color coordinates to a specified color model and gamut using the given fitting method.
 *
 * @param coords - The color coordinates to fit or clip.
 * @param model - The color model to use (e.g., "rgb", "oklch", "xyz-d50", etc.).
 * @param method - The fitting method to use. Defaults to "clip".
 * @param precision - Overrides the default precision of component definitions.
 * @returns The fitted or clipped color coordinates.
 * @throws If component properties are missing or an invalid method is specified.
 */
export function fit(coords: number[], options: { model?: ColorFunction; method?: FitMethod; precision?: number } = {}) {
    const { model = "srgb", method = "clip", precision } = options;

    if (method === "none") return coords;

    const converter = colorFunctionConverters[model] as ColorFunctionConverter;
    const components = converter.components;
    let targetGamut = converter.targetGamut as ColorSpace;
    if (targetGamut !== null && typeof targetGamut !== "string") targetGamut = "srgb";

    const componentProps: ComponentDefinition[] = [];
    for (const [, props] of Object.entries(components)) {
        componentProps[props.index] = props;
    }

    const fn = fitMethods[method];
    if (!fn) {
        throw new Error(`Invalid gamut cliiping method: must be ${Object.keys(fitMethods).join(", ")} or "none".`);
    }

    const clipped = fn(coords, { model, componentProps, targetGamut });

    return clipped.map((value, i) => {
        const p = precision ?? componentProps[i]?.precision ?? 3;
        return Number(value.toFixed(p));
    });
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
        base: Record<string, number> = {},
        commaSeparated = false
    ) => {
        const parsePercent = (str: string) => {
            const percent = parseFloat(str);
            if (isNaN(percent)) return undefined;
            if (value === "percentage") return percent;
            if (_min < 0 && _max > 0) return ((percent / 100) * (_max - _min)) / 2;
            return (percent / 100) * (_max - _min) + _min;
        };

        const parseHue = (token: string): number => {
            const value = parseFloat(token);
            if (isNaN(value)) return 0;
            if (token.endsWith("deg")) return value;
            if (token.endsWith("rad")) return value * (180 / pi);
            if (token.endsWith("grad")) return value * 0.9;
            if (token.endsWith("turn")) return value * 360;
            return 0;
        };

        if (token === "none") return 0;

        const [_min, _max] = Array.isArray(value) ? value : value === "hue" ? [0, 360] : [0, 100];

        if (/^-?(?:\d+|\d*\.\d+)$/.test(token)) {
            if (commaSeparated && converter.supportsLegacy === true && value === "percentage") {
                throw new Error("The legacy color syntax does not allow numbers for <percentage> components.");
            }
            return parseFloat(token);
        }

        if (token.endsWith("%")) {
            if (commaSeparated && converter.supportsLegacy === true && value === "hue") {
                throw new Error("The legacy color syntax does not allow percentages for <hue> components.");
            }
            return parsePercent(token);
        }

        if (/^-?(?:\d+|\d*\.\d+)(?:deg|rad|grad|turn)$/.test(token)) {
            if (value === "hue") return parseHue(token);
            else throw new Error(`Angle units are only valid for <hue> components.`);
        }

        if (token.startsWith("calc(")) {
            let inner = token.slice(5, -1).trim();
            if (inner === "infinity") return _max;
            if (inner === "-infinity") return _min;
            if (inner === "NaN") return 0;

            inner = inner.replace(/(\d+(\.\d+)?)%/g, (match) => {
                const result = parsePercent(match);
                return result !== undefined ? String(result) : "0";
            });

            inner = inner.replace(/(\d+(\.\d+)?)(deg|rad|grad|turn)/g, (_, num, __, unit) => {
                return String(parseHue(`${parseFloat(num)}${unit}`));
            });

            const caclEnv = {
                ...base,
                pi,
                e,
                tau: pi * 2,
                pow,
                sqrt,
                sin,
                cos,
                tan,
                asin,
                acos,
                atan,
                atan2,
                exp,
                log,
                log10,
                log2,
                abs,
                min,
                max,
                hypot,
                round,
                ceil,
                floor,
                sign,
                trunc,
                random,
            };

            try {
                const keys = Object.keys(caclEnv);
                const values = Object.values(caclEnv);
                const func = new Function(...keys, `return ${inner};`);
                return func(...values);
            } catch (error) {
                throw new Error(`Evaluation error: ${error}`);
            }
        }

        if (token in base) return base[token];

        throw new Error(`Unable to parse component token: ${token}`);
    };

    const parseTokens = (tokens: string[], commaSeparated: boolean) => {
        const funcName = tokens[0];
        if (
            (funcName === "color" ||
                !(colorFunctionConverters[cleanedName as ColorFunction] as ColorFunctionConverter).supportsLegacy) &&
            commaSeparated
        ) {
            throw new Error(`<${funcName}()> does not support comma-separated syntax.`);
        }

        if (tokens[1] === "from" && commaSeparated) {
            throw new Error("Comma-separated syntax cannot be used with the 'from' keyword.");
        }

        const { components } = converter;
        components.alpha = { index: 3, value: [0, 1], precision: 3 };

        const sorted = Object.entries(components).sort((a, b) => a[1].index - b[1].index);
        const expectedBase = sorted.length - 1;
        const expectedMax = sorted.length;

        let componentStartIndex: number;
        if (tokens[1] === "from") {
            componentStartIndex = funcName === "color" ? 4 : 3;
        } else {
            componentStartIndex = funcName === "color" ? 2 : 1;
        }

        const provided = Math.max(0, tokens.length - componentStartIndex);

        if (provided < expectedBase || provided > expectedMax) {
            const range = expectedMax !== expectedBase ? `${expectedBase}–${expectedMax}` : String(expectedBase);
            throw new Error(`${funcName}() expects ${range} components, but got ${provided}.`);
        }

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
                const [, meta] = sorted[i];

                return evaluateComponent(token, meta.value, baseComponents, commaSeparated);
            });

            return evaluatedComponents.slice(0, 4);
        } else {
            const result: number[] = [];
            const percentFlags: boolean[] = [];
            const sorted = Object.entries(components).sort((a, b) => a[1].index - b[1].index);

            for (let i = 0; i < sorted.length; i++) {
                const [, meta] = sorted[i];
                const token = tokens[i + (funcName === "color" ? 2 : 1)];

                if (commaSeparated && token === "none") {
                    throw new Error(`${funcName}() cannot use "none" in comma-separated syntax.`);
                }

                if (
                    meta.index !== 3 &&
                    meta.value !== "hue" &&
                    meta.value !== "percentage" &&
                    !token.startsWith("calc(")
                ) {
                    percentFlags.push(token.trim().endsWith("%"));
                }

                if (token) {
                    const value = evaluateComponent(token, meta.value, {}, commaSeparated);
                    result[meta.index] = value;
                }
            }

            if (commaSeparated && percentFlags.length > 1) {
                const allPercent = percentFlags.every(Boolean);
                const nonePercent = percentFlags.every((f) => !f);
                if (!allPercent && !nonePercent) {
                    throw new Error(`${funcName}()'s <number> components must all be numbers or all percentages.`);
                }
            }

            return result.slice(0, 4);
        }
    };

    const tokenize = (str: string) => {
        const tokens = [];
        let i = 0;
        let funcName = "";
        let commaSeparated = false;
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
                const { expression, end } = extractBalancedExpression(innerStr, colorStart);
                tokens.push(expression);
                i = end;
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
            const char = innerStr[i];

            if (char === ",") {
                if (tokens.length === 1) {
                    throw new Error("Leading commas are invalid");
                }

                if (tokens[0] === "color" || tokens[2] === "from") {
                    throw new Error("Cannot mix comma-separated and space-separated syntax.");
                } else if (commaSeparated === false && !(tokens.length in [2, 3, 4])) {
                    throw new Error("Comma optional syntax requires no commas at all");
                }

                if (innerStr[i + 1] === ",") {
                    throw new Error("Double commas are invalid");
                }

                commaSeparated = true;
                i++;
                if (innerStr[i] === " ") i++;
            } else if (char === "/") {
                if (commaSeparated) {
                    throw new Error("Cannot mix comma-separated and space-separated syntax.");
                }
                const error = new Error("'/' can only be used before the alpha component.");
                if (tokens[0] === "color") {
                    if (tokens[1] === "from") {
                        if (tokens.length !== 7) throw error;
                    } else if (tokens.length !== 5) throw error;
                } else {
                    if (tokens[1] === "from") {
                        if (tokens.length !== 6) throw error;
                    } else if (tokens.length !== 4) throw error;
                }
                i++;
                if (innerStr[i] === " ") i++;
            } else if (char === " ") {
                if (commaSeparated) {
                    throw new Error(`Cannot mix comma-separated and space-separated syntax: ${innerStr}`);
                }
                i++;
            } else if (/[a-zA-Z#]/.test(char)) {
                const identStart = i;
                let ident = "";
                while (i < innerStr.length && /[a-zA-Z0-9-%#]/.test(innerStr[i])) {
                    ident += innerStr[i];
                    i++;
                }

                if (i < innerStr.length && innerStr[i] === "(") {
                    const { expression, end } = extractBalancedExpression(innerStr, identStart);
                    tokens.push(expression);
                    i = end;
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
            } else {
                throw new Error(`Unexpected character: ${char}`);
            }
        }

        return { tokens, commaSeparated };
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

    const {
        PI: pi,
        E: e,
        pow,
        sqrt,
        sin,
        cos,
        tan,
        asin,
        acos,
        atan,
        atan2,
        exp,
        log,
        log10,
        log2,
        abs,
        min,
        max,
        hypot,
        round,
        ceil,
        floor,
        sign,
        trunc,
        random,
    } = Math;

    return {
        isValid: (str: string) => {
            const cleanedStr = str.trim().toLowerCase();
            const { alphaVariant = cleanedName } = converter;

            if (cleanedName in colorSpaceConverters) {
                const startsWithColor = cleanedStr.startsWith(`color(${cleanedName} `);
                const startsWithFrom =
                    cleanedStr.startsWith("color(from") && validateRelativeColorSpace(cleanedStr, cleanedName);

                return (startsWithColor || startsWithFrom) && cleanedStr[cleanedStr.length - 1] === ")";
            }

            return (
                (cleanedStr.startsWith(`${cleanedName}(`) || cleanedStr.startsWith(`${alphaVariant}(`)) &&
                cleanedStr[cleanedStr.length - 1] === ")"
            );
        },
        bridge: converter.bridge,
        toBridge: (coords: number[]) => [...converter.toBridge(coords.slice(0, 3)), coords[3] ?? 1],
        parse: (str: string) => {
            const cleaned = str.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim().toLowerCase();
            const { tokens, commaSeparated } = tokenize(cleaned);
            const components = parseTokens(tokens, commaSeparated);
            return [...components.slice(0, 3), components[3] ?? 1];
        },
        fromBridge: (coords: number[]) => [...converter.fromBridge(coords), coords[3] ?? 1],
        format: ([c1, c2, c3, alpha = 1]: number[], options: FormattingOptions = {}) => {
            const { legacy = false, fit: fitMethod = "clip", precision = undefined, units = false } = options;

            const clipped = fit([c1, c2, c3], { model: cleanedName as ColorFunction, method: fitMethod, precision });
            const alphaFormatted = Number(min(max(alpha, 0), 1).toFixed(3)).toString();

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
