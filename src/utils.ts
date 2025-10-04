import { Color } from "./Color.js";
import { config } from "./config.js";
import { colorBases, colorModels, colorFunctions, colorSpaces, colorTypes, namedColors } from "./converters.js";
import { fitMethods } from "./math.js";
import type {
    ColorBase,
    ColorConverter,
    ColorFunction,
    ColorModelConverter,
    ColorModel,
    ColorSpace,
    ColorSpaceConverter,
    ColorType,
    ComponentDefinition,
    FitFunction,
    FitMethod,
    FormattingOptions,
    NamedColor,
    Plugin,
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
export function configure(options: Partial<typeof config>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merge = (target: any, source: any) => {
        for (const key in source) {
            if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== "object") {
                    target[key] = {};
                }
                merge(target[key], source[key]);
            } else if (source[key] !== undefined) {
                target[key] = source[key];
            }
        }
    };

    merge(config, options);
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
 * Registers a new `<color>` converter under the specified name.
 *
 * @param name - The unique name to associate with the color converter.
 * @param converter - The converter object implementing the color conversion logic.
 * @throws If the name is already used by another color type.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorType(name: string, converter: ColorConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "-").toLowerCase() as ColorType;
    const types = colorTypes as Record<string, ColorConverter>;

    if (cleaned in types) {
        throw new Error(`The name '${cleaned}' is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    const requiredFns: Array<[keyof ColorConverter, string]> = [
        ["isValid", "function"],
        ["bridge", "string"],
        ["toBridge", "function"],
        ["parse", "function"],
    ];

    for (const [key, type] of requiredFns) {
        if (typeof converter[key] !== type) {
            throw new TypeError(`Converter.${String(key)} must be a ${type}.`);
        }
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

    types[cleaned] = converter;
    cache.delete("graph");
}

/**
 * Registers a new `<color-base>` converter under the specified name.
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

    if (cleaned in types) {
        throw new Error(`The name '${cleaned}' is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    const requiredFns: Array<[keyof ColorConverter, string]> = [
        ["isValid", "function"],
        ["bridge", "string"],
        ["toBridge", "function"],
        ["parse", "function"],
    ];

    for (const [key, type] of requiredFns) {
        if (typeof converter[key] !== type) {
            throw new TypeError(`Converter.${String(key)} must be a ${type}.`);
        }
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
 * Registers a new `<color-function>` converter under the specified name.
 *
 * @param name - The unique name to associate with the color function converter.
 * @param converter - The converter object implementing the color function conversion logic.
 * @throws If the name is already used by another color type.
 * @throws If the converter object is missing required properties or has invalid types.
 */
export function registerColorFunction(name: string, converter: ColorModelConverter) {
    const cleaned = name.replace(/(?:\s+)/g, "").toLowerCase() as ColorType;
    const models = colorModels as unknown as Record<string, ColorModelConverter>;
    const functions = colorFunctions as Record<string, ColorConverter>;
    const types = colorTypes as Record<string, ColorConverter>;

    if (
        typeof converter.components === "object" &&
        converter.components !== null &&
        !Array.isArray(converter.components)
    ) {
        const normalized: Record<string, ComponentDefinition> = {};
        for (const key of Object.keys(converter.components)) {
            normalized[key.toLowerCase()] = converter.components[key];
        }
        converter.components = normalized;
    } else {
        throw new TypeError("Converter.components must be a non-null object.");
    }

    if (cleaned in types) {
        throw new Error(`The name '${cleaned}' is already used.`);
    }

    if (typeof converter !== "object" || converter === null) {
        throw new TypeError("Converter must be a non-null object.");
    }

    const requiredFns: Array<[keyof ColorModelConverter, string]> = [
        ["bridge", "string"],
        ["toBridge", "function"],
        ["fromBridge", "function"],
    ];

    for (const [key, type] of requiredFns) {
        if (typeof converter[key] !== type) {
            throw new TypeError(`Converter.${String(key)} must be a ${type}.`);
        }
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

    const componentNames = Object.keys(converter.components);
    if (new Set(componentNames).size !== componentNames.length) {
        throw new Error("Converter.components must have unique component names.");
    }
    if (componentNames.includes("none")) {
        throw new Error('Converter.components cannot have a component named "none".');
    }

    const colorConv = modelConverterToColorConverter(cleaned, converter);
    models[cleaned] = converter;
    functions[cleaned] = colorConv;
    types[cleaned] = colorConv;
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
    const spaces = colorSpaces as unknown as Record<string, ColorModelConverter>;
    const models = colorModels as unknown as Record<string, ColorModelConverter>;
    const functions = colorFunctions as Record<string, ColorConverter>;
    const types = colorTypes as Record<string, ColorConverter>;

    if (cleaned in types) {
        throw new Error(`The name '${cleaned}' is already used.`);
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

    const matrixChecks: Array<[keyof ColorSpaceConverter, string]> = [
        ["toBridgeMatrix", "toBridgeMatrix"],
        ["fromBridgeMatrix", "fromBridgeMatrix"],
    ];

    for (const [key, label] of matrixChecks) {
        const matrix = converter[key];
        if (
            !Array.isArray(matrix) ||
            matrix.some((row) => !Array.isArray(row) || row.some((val) => typeof val !== "number"))
        ) {
            throw new TypeError(`Converter.${label} must be a 2D array of numbers.`);
        }
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

    const modelConv = spaceConverterToModelConverter(cleaned, converter);
    const colorConv = modelConverterToColorConverter(cleaned, modelConv);

    spaces[cleaned] = modelConv;
    models[cleaned] = modelConv;
    functions[cleaned] = colorConv;
    types[cleaned] = colorConv;
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
    const names = namedColors as Record<NamedColor, [number, number, number]>;

    if (names[cleaned]) {
        throw new Error(`<named-color> '${name}' is already registered.`);
    }

    const duplicate = Object.entries(names).find(([, value]) => value.every((channel, i) => channel === rgb[i]));

    if (duplicate) {
        throw new Error(`RGB value [${rgb.join(", ")}] is already registered as '${duplicate[0]}'.`);
    }

    names[cleaned] = rgb;
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
        throw new Error(`The name '${cleaned}' is already used.`);
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
        delete colorModels[type as ColorModel];
        delete colorSpaces[type as ColorSpace];
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
 * @param options - Optional settings for fitting or clipping.
 * @returns The fitted or clipped color coordinates.
 * @throws If component properties are missing or an invalid method is specified.
 */
export function fit(
    coords: number[],
    model: ColorModel,
    options: { method?: FitMethod; precision?: number | null } = {}
) {
    const { method = "clip", precision } = options;

    let clipped: number[];

    const converter = colorModels[model] as ColorModelConverter;
    const components = converter.components;
    let targetGamut = converter.targetGamut as ColorSpace;
    if (targetGamut !== null && typeof targetGamut !== "string") targetGamut = "srgb";

    const componentProps: ComponentDefinition[] = [];
    for (const [, props] of Object.entries(components)) {
        componentProps[props.index] = props;
    }

    if (method === "none") {
        clipped = coords;
    } else if (method === "clip") {
        clipped = coords.slice(0, 3).map((value, i) => {
            const props = componentProps[i];
            if (!props) {
                throw new Error(`Missing component properties for index ${i}.`);
            }
            if (props.value === "angle") {
                return ((value % 360) + 360) % 360;
            } else {
                const [min, max] = Array.isArray(props.value) ? props.value : [0, 100];
                return Math.min(max, Math.max(min, value));
            }
        });
    } else {
        const fn = fitMethods[method];
        if (!fn) {
            throw new Error(`Invalid gamut cliiping method: must be ${Object.keys(fitMethods).join(", ")} or "none".`);
        }

        clipped = fn(coords, model);
    }

    if (precision === null) return clipped;

    return clipped.map((value, i) => {
        let p: number | null | undefined;

        if (typeof precision === "number") {
            p = precision;
        } else {
            const localPrecision = componentProps[i]?.precision;
            if (localPrecision === null) {
                p = null;
            } else if (typeof localPrecision === "number") {
                p = localPrecision;
            } else {
                p = 3;
            }
        }

        if (p === null) return value;

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
export function modelConverterToColorConverter(name: string, converter: ColorModelConverter) {
    type AST = {
        fn: string;
        space: string | null;
        fromOrigin: string | null;
        c1: string;
        c2: string;
        c3: string;
        alpha: string;
        commaSeparated: boolean;
    };

    const evaluateComponent = (
        token: string,
        value: number[] | "angle" | "percentage",
        base: Record<string, number> = {},
        commaSeparated = false,
        relative = false
    ) => {
        const parsePercent = (str: string, min: number, max: number) => {
            const percent = parseFloat(str);
            if (isNaN(percent)) throw new Error(`Invalid percentage value: '${str}'.`);
            if (value === "percentage") return percent;
            if (min < 0 && max > 0) return ((percent / 100) * (max - min)) / 2;
            return (percent / 100) * (max - min) + min;
        };

        const parseAngle = (token: string) => {
            const value = parseFloat(token);
            if (isNaN(value)) throw new Error(`Invalid angle value: '${token}'.`);
            if (token.endsWith("deg")) return value;
            if (token.endsWith("rad")) return value * (180 / pi);
            if (token.endsWith("grad")) return value * 0.9;
            if (token.endsWith("turn")) return value * 360;
            return value;
        };

        const parseCalc = (token: string, _min: number, _max: number) => {
            let inner = token.slice(5, -1).trim();
            if (inner === "infinity") return _max;
            if (inner === "-infinity") return _min;
            if (inner === "NaN") return 0;

            inner = inner.replace(/(\d+(\.\d+)?)%/g, (match) => {
                if (relative === true)
                    throw new Error("<angle> and <percentage> values are converted to <number> in relative syntax.");
                const result = parsePercent(match, _min, _max);
                return result !== undefined ? String(result) : "0";
            });

            inner = inner.replace(/(\d+(\.\d+)?)(deg|rad|grad|turn)/g, (_, num, __, unit) => {
                if (relative === true)
                    throw new Error("<angle> and <percentage> values are converted to <number> in relative syntax.");
                return String(parseAngle(`${parseFloat(num)}${unit}`));
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
                return func(...values) as number;
            } catch (error) {
                throw new Error(`Evaluation error: ${error}`);
            }
        };

        const evaluateAngle = () => {
            if (/^-?(?:\d+|\d*\.\d+)(?:deg|rad|grad|turn)$/.test(token)) {
                return parseAngle(token);
            }

            if (/^-?(?:\d+|\d*\.\d+)$/.test(token)) {
                return parseFloat(token);
            }

            const [min, max] = [0, 360];

            if (token.endsWith("%")) {
                if (commaSeparated && supportsLegacy === true) {
                    throw new Error("The legacy color syntax does not allow percentages for <angle> components.");
                }
                if (relative === true) {
                    throw new Error("The relative color syntax doesn't allow percentages for <angle> components.");
                }
                return parsePercent(token, min, max);
            }

            if (token.startsWith("calc(")) {
                return parseCalc(token, min, max);
            }

            throw new Error(
                `Invalid angle value: '${token}'. Must be a number, a number with a unit (deg, rad, grad, turn), or a percentage.`
            );
        };

        const evaluatePercent = () => {
            if (/^-?(?:\d+|\d*\.\d+)$/.test(token)) {
                if (commaSeparated && supportsLegacy === true) {
                    throw new Error("The legacy color syntax does not allow numbers for <percentage> components.");
                }
                return parseFloat(token);
            }

            const [min, max] = [0, 100];

            if (token.endsWith("%")) {
                return parsePercent(token, min, max);
            }

            if (token.startsWith("calc(")) {
                return parseCalc(token, min, max);
            }

            throw new Error(`Invalid percentage value: '${token}'. Must be a percentage or a number.`);
        };

        const evaluateNumber = () => {
            if (/^-?(?:\d+|\d*\.\d+)$/.test(token)) {
                return parseFloat(token);
            }

            const [min, max] = value as number[];

            if (token.endsWith("%")) {
                return parsePercent(token, min, max);
            }

            if (token.startsWith("calc(")) {
                return parseCalc(token, min, max);
            }

            throw new Error(
                `Invalid number value: '${token}'. Must be a number${relative === false ? " or a percentage" : ""}.`
            );
        };

        if (token === "none") return 0;

        if (token in base) return base[token];

        if (value === "angle") return evaluateAngle();

        if (value === "percentage") return evaluatePercent();

        if (Array.isArray(value)) return evaluateNumber();

        throw new Error(`Unable to parse component token: ${token}`);
    };

    const parseAST = (ast: AST) => {
        const { fn, space, fromOrigin, c1, c2, c3, alpha, commaSeparated } = ast;
        const { components, supportsLegacy } = converter;
        components.alpha = { index: 3, value: [0, 1], precision: 3 };

        if (commaSeparated && supportsLegacy !== true) {
            throw new Error(`<${fn}()> does not support comma-separated syntax.`);
        }

        const sorted = Object.entries(components).sort((a, b) => a[1].index - b[1].index);

        if (fromOrigin) {
            let colorSpace;
            if (fn === "color") {
                colorSpace = space;
            } else if (fn in colorModels) {
                colorSpace = fn;
            } else {
                for (const model in colorModels) {
                    if ((colorModels[model as ColorModel] as ColorModelConverter).alphaVariant === fn) {
                        colorSpace = model;
                        break;
                    }
                }
            }

            const originComponents = Color.from(fromOrigin)
                .in(colorSpace as ColorModel)
                .toObject();

            const evaluatedComponents = [c1, c2, c3, alpha].map((token, i) => {
                const [, meta] = sorted[i];

                return evaluateComponent(token, meta.value, originComponents, commaSeparated, true);
            });

            return evaluatedComponents.slice(0, 4);
        } else {
            const result: number[] = [];
            const percentFlags: boolean[] = [];
            const tokens = [c1, c2, c3, alpha];

            for (let i = 0; i < sorted.length; i++) {
                const [, meta] = sorted[i];
                const token = tokens[i];

                if (commaSeparated && token === "none") {
                    throw new Error(`${fn}() cannot use "none" in comma-separated syntax.`);
                }

                if (
                    meta.index !== 3 &&
                    meta.value !== "angle" &&
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
                    throw new Error(`${fn}()'s <number> components must all be numbers or all percentages.`);
                }
            }

            return result.slice(0, 4);
        }
    };

    /**
     * Index reference
     *
     * | 0     | 1    | 2   | 3    | 4 | 5   | 6   | 7     | 8     |
     * -------------------------------------------------------------
     * | rgb   | 255  | ,   | 0    | , | 0   |     |       |       |
     * | rgb   | 255  | ,   | 0    | , | 0   | ,   | 0.5   |       |
     * | rgb   | 255  | 0   | 0    |   |     |     |       |       |
     * | rgb   | 255  | 0   | 0    | / | 0.5 |     |       |       |
     * | rgb   | from | red | r    | g | b   |     |       |       |
     * | rgb   | from | red | r    | g | b   | /   | alpha |       |
     * | color | srgb | 1   | 0    | 0 |     |     |       |       |
     * | color | srgb | 1   | 0    | 0 | /   | 0.5 |       |       |
     * | color | from | red | srgb | r | g   | b   |       |       |
     * | color | from | red | srgb | r | g   | b   | /     | alpha |
     */
    const getAST = (tokens: string[]) => {
        const getAlpha = (index: number, separator: "/" | "," = "/") => {
            if (tokens[index] !== undefined) {
                if (tokens[index] === separator) {
                    return { value: tokens[index + 1], hasAlpha: true };
                }
                throw new Error("Invalid alpha separator");
            }
            return { value: "1", hasAlpha: false };
        };

        let fn: string,
            space: string | null,
            fromOrigin: string | null,
            c1: string,
            c2: string,
            c3: string,
            alpha: string,
            commaSeparated = false,
            expectedLength: number;

        if (tokens[0] === "color") {
            fn = "color";
            if (tokens[1] === "from") {
                // color(from red srgb r g b) OR color(from red srgb r g b / alpha)
                space = tokens[3];
                fromOrigin = tokens[2];
                c1 = tokens[4];
                c2 = tokens[5];
                c3 = tokens[6];
                const { value, hasAlpha } = getAlpha(7);
                expectedLength = hasAlpha ? 9 : 7;
                alpha = value;
            } else {
                // color(srgb 1 0 0) OR color(srgb 1 0 0 / 0.5)
                space = tokens[1];
                fromOrigin = null;
                c1 = tokens[2];
                c2 = tokens[3];
                c3 = tokens[4];
                const { value, hasAlpha } = getAlpha(5);
                expectedLength = hasAlpha ? 7 : 5;
                alpha = value;
            }
        } else {
            fn = tokens[0];
            space = null;
            if (tokens[1] === "from") {
                // rgb(from red r g b) OR rgb(from red r g b / alpha)
                fromOrigin = tokens[2];
                c1 = tokens[3];
                c2 = tokens[4];
                c3 = tokens[5];
                const { value, hasAlpha } = getAlpha(6);
                expectedLength = hasAlpha ? 8 : 6;
                alpha = value;
            } else {
                fromOrigin = null;
                c1 = tokens[1];
                if (tokens[2] === ",") {
                    // rgb(255, 0, 0) OR rgb(255, 0, 0, 0.5)
                    commaSeparated = true;
                    c2 = tokens[3];
                    c3 = tokens[5];
                    const { value, hasAlpha } = getAlpha(6, ",");
                    expectedLength = hasAlpha ? 8 : 6;
                    alpha = value;
                } else {
                    // rgb(255 0 0) OR rgb(255 0 0 / 0.5)
                    c2 = tokens[2];
                    c3 = tokens[3];
                    const { value, hasAlpha } = getAlpha(4);
                    expectedLength = hasAlpha ? 6 : 4;
                    alpha = value;
                }
            }
        }

        if (tokens.length !== expectedLength) {
            throw new Error();
        }

        return { fn, space, fromOrigin, c1, c2, c3, alpha, commaSeparated };
    };

    /**
     * Tokenization examples
     *
     * ─── rgb() ────────────────────────────────────────────────
     * "rgb(255, 0, 0)"          --> [ "rgb", "255", ",", "0", ",", "0" ]
     * "rgb(255, 0, 0, 0.5)"       --> [ "rgb", "255", ",", "0", ",", "0", ",", "0.5" ]
     * "rgb(255 0 0)"              --> [ "rgb", "255", "0", "0" ]
     * "rgb(255 0 0 / 0.5)"        --> [ "rgb", "255", "0", "0", "/", "0.5" ]
     * "rgb(from red r g b)"       --> [ "rgb", "from", "red", "r", "g", "b" ]
     * "rgb(from red r g b / a)"   --> [ "rgb", "from", "red", "r", "g", "b", "/", "alpha" ]
     *
     * ─── color() ─────────────────────────────────────────────
     * "color(srgb 1 0 0)"                --> [ "color", "srgb", "1", "0", "0" ]
     * "color(srgb 1 0 0 / 0.5)"          --> [ "color", "srgb", "1", "0", "0", "/", "0.5" ]
     * "color(from red srgb r g b)"       --> [ "color", "from", "red", "srgb", "r", "g", "b" ]
     * "color(from red srgb r g b / a)"   --> [ "color", "from", "red", "srgb", "r", "g", "b", "/", "alpha" ]
     */
    const tokenize = (str: string) => {
        const tokens: string[] = [];
        let i = 0;
        let funcName = "";

        while (i < str.length && str[i] !== "(") {
            funcName += str[i];
            i++;
        }
        funcName = funcName.trim();
        tokens.push(funcName);

        const innerStart = str.indexOf("(") + 1;
        const innerStr = str.slice(innerStart, -1).trim();

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
                tokens.push(",");
                i++;
                if (innerStr[i] === " ") i++;
            } else if (char === "/") {
                tokens.push("/");
                i++;
                if (innerStr[i] === " ") i++;
            } else if (char === " ") {
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

        return tokens;
    };

    const validateRelativeColorSpace = (str: string, name: string) => {
        const prefix = "color(from ";
        if (!str.startsWith(prefix) || !str.endsWith(")")) {
            return false;
        }

        const innerStr = str.slice(prefix.length, -1).trim();

        const { expression, end } = extractBalancedExpression(innerStr, 0);

        if (!expression) {
            return false;
        }

        const rest = innerStr.slice(end).trim();

        const parts = rest.split(/\s+/);
        if (parts.length < 1) {
            return false;
        }

        const colorSpace = parts[0];
        return colorSpace === name;
    };

    const { components, bridge, fromBridge, toBridge, alphaVariant, supportsLegacy } = converter;

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
            const { alphaVariant = name } = converter;

            if (name in colorSpaces) {
                const startsWithColor = str.startsWith(`color(${name} `);
                const startsWithFrom = str.startsWith("color(from") && validateRelativeColorSpace(str, name);

                return (startsWithColor || startsWithFrom) && str[str.length - 1] === ")";
            }

            return (str.startsWith(`${name}(`) || str.startsWith(`${alphaVariant}(`)) && str[str.length - 1] === ")";
        },

        bridge,

        toBridge: (coords: number[]) => [...toBridge(coords.slice(0, 3)), coords[3] ?? 1],

        parse: (str: string) => {
            try {
                const tokens = tokenize(str);
                const ast = getAST(tokens);
                const components = parseAST(ast);
                return [...components.slice(0, 3), components[3] ?? 1];
            } catch {
                throw new Error(`Invalid <color-function> syntax: ${str}.`);
            }
        },

        fromBridge: (coords: number[]) => [...fromBridge(coords), coords[3] ?? 1],

        format: ([c1, c2, c3, a = 1]: number[], options: FormattingOptions = {}) => {
            const { legacy = false, fit: fitMethod = "clip", precision = undefined, units = false } = options;

            const clipped = fit([c1, c2, c3], name as ColorModel, { method: fitMethod, precision });
            const alpha = Number(min(max(a, 0), 1).toFixed(3)).toString();

            let formatted: string[];

            if (units && components) {
                formatted = clipped.map((v, index) => {
                    const def = Object.values(components).find((comp) => comp.index === index);
                    if (!def) return v.toString();

                    if (def.value === "percentage") {
                        return `${v}%`;
                    } else if (def.value === "angle") {
                        return `${v}deg`;
                    }

                    return v.toString();
                });
            } else {
                formatted = clipped.map((v) => v.toString());
            }

            if (name in colorSpaces) {
                return `color(${name} ${formatted.join(" ")}${a !== 1 ? ` / ${alpha}` : ""})`;
            }

            if (legacy === true && supportsLegacy === true) {
                if (a === 1) return `${name}(${formatted.join(", ")})`;
                return `${alphaVariant || name}(${formatted.join(", ")}, ${alpha})`;
            }

            return `${name}(${formatted.join(" ")}${a !== 1 ? ` / ${alpha}` : ""})`;
        },
    };
}

/**
 * Creates a `<color-function>` converter object from a given color space converter definition.
 *
 * @template C - A tuple of component names for the color space (e.g., ["r", "g", "b"]).
 * @param name - The name of the color space (used for target gamut identification).
 * @param converter - The color space converter definition.
 * @returns An object of type `ColorModelConverter`.
 */
export function spaceConverterToModelConverter<const C extends readonly string[]>(
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
    } satisfies ColorModelConverter;
}
