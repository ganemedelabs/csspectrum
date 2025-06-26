import {
    colorFunctionConverters,
    colorFunctions,
    colorTypes,
    namedColors,
    colorSpaceConverters,
    createSpaceConverter,
} from "./converters";
import { EASINGS, interpolateComponents, fit } from "./utils";
import type {
    XYZ,
    ComponentDefinition,
    Component,
    Interface,
    InterfaceWithSetOnly,
    InGamutOptions,
    GetOptions,
    FitMethod,
    MixOptions,
    EvaluateAccessibilityOptions,
    ColorFunction,
    ColorType,
    OutputType,
    FormattingOptions,
    NamedColor,
    ColorSpace,
    ColorFunctionConverter,
    ColorSpaceConverter,
} from "./types";

const config = {
    theme: "light",
    systemColors: {
        Canvas: [
            [255, 255, 255],
            [30, 30, 30],
        ],
        CanvasText: [
            [0, 0, 0],
            [255, 255, 255],
        ],
        LinkText: [
            [0, 0, 255],
            [0, 128, 255],
        ],
        VisitedText: [
            [128, 0, 128],
            [128, 0, 128],
        ],
        ButtonFace: [
            [240, 240, 240],
            [60, 60, 60],
        ],
        ButtonText: [
            [0, 0, 0],
            [255, 255, 255],
        ],
        Field: [
            [255, 255, 255],
            [45, 45, 45],
        ],
        FieldText: [
            [0, 0, 0],
            [255, 255, 255],
        ],
        Highlight: [
            [0, 120, 215],
            [80, 80, 80],
        ],
        HighlightText: [
            [255, 255, 255],
            [0, 0, 0],
        ],
        GrayText: [
            [128, 128, 128],
            [169, 169, 169],
        ],
        ActiveText: [
            [0, 0, 255],
            [0, 128, 255],
        ],
        ActiveCaption: [
            [0, 120, 215],
            [30, 30, 30],
        ],
        CaptionText: [
            [255, 255, 255],
            [255, 255, 255],
        ],
        InfoBackground: [
            [255, 255, 225],
            [50, 50, 50],
        ],
        InfoText: [
            [0, 0, 0],
            [255, 255, 255],
        ],
    },
    naiveCmyk: false,
};

/**
 * The `Color` class represents a dynamic CSS color object, allowing for the manipulation
 * and retrieval of colors in various formats (e.g., RGB, HEX, HSL).
 */
class Color {
    xyz: XYZ = [0, 0, 0, 1];

    static config = config;

    constructor(x: number, y: number, z: number, alpha: number = 1) {
        if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number" || typeof alpha !== "number") {
            throw new TypeError("Color constructor expects four numeric arguments: x, y, z, and alpha.");
        }
        this.xyz = [x, y, z, alpha];
    }

    /**
     * Creates a new `Color` instance from a given color string and optional format.
     *
     * @param color - The color string to convert.
     * @returns A new `Color` instance.
     */
    static from(color: NamedColor): Color; // eslint-disable-line no-unused-vars
    static from(color: string): Color; // eslint-disable-line no-unused-vars
    static from(color: NamedColor | string) {
        for (const type in colorTypes) {
            const colorType = colorTypes[type as keyof typeof colorTypes];
            if (colorType.isValid(color)) {
                const [x, y, z, alpha] = colorType.toXYZ(color) || [0, 0, 0, 1];
                return new Color(x, y, z, alpha);
            }
        }
        throw new Error(`Unsupported or invalid color format: ${color}`);
    }

    /**
     * Defines a color from individual components in a color model.
     *
     * @param model - The color model to create components from.
     * @returns Set functions to define numbers for each component in the specified color model.
     */
    static in<M extends ColorFunction>(model: M): InterfaceWithSetOnly<Interface<M>>; // eslint-disable-line no-unused-vars
    static in(model: string): InterfaceWithSetOnly<Interface<any>>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    static in<M extends ColorFunction>(model: string | M): InterfaceWithSetOnly<Interface<M>> {
        const color = new Color(0, 0, 0, 1);
        const result = Object.fromEntries(Object.entries(color.in(model)).filter(([key]) => key.startsWith("set")));
        return result as InterfaceWithSetOnly<Interface<M>>;
    }

    /**
     * Determines the type of a given color string.
     *
     * @param color - The color string to analyze.
     * @returns The detected color format if resolve is true, otherwise the detected color pattern type.
     * @throws {Error} If the color format is unsupported.
     */
    static type(color: string): ColorType | undefined {
        for (const type in colorTypes) {
            const colorType = colorTypes[type as ColorType];
            if (colorType.isValid(color)) return type as ColorType;
        }
        return undefined;
    }

    /**
     * Registers a new named color in the system.
     *
     * @param name - The name of the color to register. Spaces and hyphens will be removed, and the name will be converted to lowercase.
     * @param rgb - The RGB color values to associate with the name.
     * @throws {Error} If a color with the same name is already registered.
     */
    static registerNamedColor(name: string, rgb: [number, number, number]) {
        const cleanedName = name.replace(/(?:\s+|-)/g, "").toLowerCase();
        if ((namedColors as Record<NamedColor, [number, number, number]>)[cleanedName as NamedColor]) {
            throw new Error(`Color name "${name}" is already registered.`);
        }

        for (const existingRgb of Object.values(namedColors)) {
            if (existingRgb[0] === rgb[0] && existingRgb[1] === rgb[1] && existingRgb[2] === rgb[2]) {
                throw new Error(`RGB value [${rgb.join(", ")}] is already registered under another name.`);
            }
        }

        (namedColors as Record<NamedColor, [number, number, number]>)[cleanedName as NamedColor] = rgb;
    }

    static registerColorFunction(name: string, converter: ColorFunctionConverter) {
        if (name in colorFunctionConverters) {
            throw new Error(`Color function "${name}" is already registered.`);
        }

        (colorFunctionConverters as unknown as Record<string, ColorFunctionConverter>)[name] = converter;
    }

    static registerColorSpace(name: string, converter: ColorSpaceConverter) {
        if (name in colorSpaceConverters) {
            throw new Error(`Color space "${name}" is already registered.`);
        }

        (colorSpaceConverters as unknown as Record<string, ColorFunctionConverter>)[name] = createSpaceConverter(
            name,
            converter
        );
    }

    /**
     * Retrieves a list of all supported color formats.
     *
     * @returns An array of supported color format names.
     */
    static getSupportedFormats() {
        return Array.from(Object.keys(colorFunctions)) as ColorFunction[];
    }

    /**
     * Generates a random color in the specified format or space.
     * If no type is provided, a random format or space is chosen.
     *
     * @param type - The desired color format or space.
     *               If omitted, a random format or space is selected.
     * @returns A random color string in the specified format or space.
     */
    // static random(type?: string): string; // eslint-disable-line no-unused-vars
    // static random(type?: ColorFunction): string; // eslint-disable-line no-unused-vars
    // static random(type?: ColorFunction | string) {
    //     if (!type) {
    //         const types = Object.keys(colorTypes).concat(Object.keys(colorSpaceConverters));
    //         type = types[Math.floor(Math.random() * types.length)];
    //     }

    //     if (type === "named") {
    //         return Object.keys(namedColors)[Math.floor(Math.random() * Object.keys(namedColors).length)];
    //     }

    //     const randomChannel = () => Math.floor(Math.random() * 200 + 30);
    //     const randomColor = this.from(`rgb(${randomChannel()}, ${randomChannel()}, ${randomChannel()})`);
    //     return randomColor.to(type);
    // }

    /**
     * Parses a CSS relative color string into its components.
     *
     * @param color - The relative color string to parse (e.g., "rgb(from red r g b)")
     * @returns An object containing the parsed relative color string.
     * @throws {Error} If the relative color string format is invalid
     */
    // static parseRelative(color: string) {
    //     const parseAngle = (angleStr: string) => {
    //         const match = angleStr.match(/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/);
    //         if (!match) throw new Error(`Invalid angle format: ${angleStr}`);
    //         const value = parseFloat(match[1]);
    //         const unit = match[2] || "deg";

    //         switch (unit) {
    //             case "deg":
    //                 return value;
    //             case "rad":
    //                 return (value * 180) / Math.PI;
    //             case "grad":
    //                 return (value * 360) / 400;
    //             case "turn":
    //                 return value * 360;
    //             default:
    //                 throw new Error(`Unknown angle unit: ${unit}`);
    //         }
    //     };

    //     const parseComponent = <M extends Model>(component: string, colorInstance: Color, model: M, index: number) => {
    //         const componentDef = Object.values(converters[model].components).find((c) => c.index === index);
    //         if (!componentDef) throw new Error(`Invalid component index for ${model}: ${index}`);
    //         const isAngle = componentDef.loop === true;

    //         if (/^-?\d*\.?\d+$/.test(component)) {
    //             // Case 1: Pure number (e.g., "30", "-45.5")
    //             return parseFloat(component);
    //         } else if (/^-?\d*\.?\d+%$/.test(component)) {
    //             // Case 2: Percentage (e.g., "50%", "-10%")
    //             const percentage = parseFloat(component.slice(0, -1)) / 100;
    //             if (isAngle) {
    //                 return percentage * 360;
    //             } else {
    //                 const { min, max } = componentDef;
    //                 return min + percentage * (max - min);
    //             }
    //         } else if (component.startsWith("calc(") && component.endsWith(")")) {
    //             // Case 3: Calc expression (e.g., "calc(r * 2)")
    //             const expression = component.slice(5, -1).trim();
    //             return parseCalc(expression, model);
    //         } else if (component in converters[model].components) {
    //             // Case 4: Component name (e.g., "h", "s")
    //             return colorInstance.in(model).get()[component as Component<M>];
    //         } else if (isAngle) {
    //             // Case 5: Angle with unit (e.g., "30deg", "0.5turn")
    //             return parseAngle(component);
    //         } else {
    //             throw new Error(`Invalid component format for ${model} component ${index}: ${component}`);
    //         }
    //     };

    //     const parseCalc = (str: string, model: Model) => {
    //         const expr = str
    //             .split("")
    //             .map((char) => {
    //                 if (/[a-zA-Z]/.test(char)) {
    //                     const value = colorInstance.in(model).get()[char as Component<Model>];
    //                     return isNaN(value) ? char : value;
    //                 }
    //                 return char;
    //             })
    //             .join("")
    //             .replace(/\s/g, "");

    //         const evaluate = (expr: string) => {
    //             while (expr.includes("(")) {
    //                 expr = expr.replace(/\(([^()]+)\)/, (_, inner) => evaluate(inner).toString());
    //             }

    //             const tokens = expr.match(/(\d*\.?\d+|\+|-|\*|\/)/g) || [];
    //             if (!tokens) return NaN;

    //             let i = 0;
    //             while (i < tokens.length) {
    //                 if (tokens[i] === "*" || tokens[i] === "/") {
    //                     const left = Number(tokens[i - 1]);
    //                     const right = Number(tokens[i + 1]);
    //                     const result = tokens[i] === "*" ? left * right : left / right;
    //                     tokens.splice(i - 1, 3, result.toString());
    //                 } else {
    //                     i++;
    //                 }
    //             }

    //             let result = Number(tokens[0]);
    //             for (i = 1; i < tokens.length; i += 2) {
    //                 const op = tokens[i];
    //                 const num = Number(tokens[i + 1]);
    //                 result = op === "+" ? result + num : result - num;
    //             }

    //             return result;
    //         };

    //         const result = evaluate(expr);
    //         return isNaN(result) ? NaN : result;
    //     };

    //     color = color.toLowerCase();

    //     const funcNameMatch = color.match(/^(\w+)(?=\()/);
    //     if (!funcNameMatch) throw new Error(`"${color}" is not a valid relative format.`);
    //     const funcName = funcNameMatch[1];

    //     let baseColor: string, type: Model, componentsStr: string;

    //     const formatPatterns = Object.values(formatConverters)
    //         .map((fc) => fc.pattern.source.replace(/^\^|\$$/g, ""))
    //         .join("|");
    //     const spacePatterns = Object.values(spaceConverters)
    //         .map((sc) => sc.pattern.source.replace(/^\^|\$$/g, ""))
    //         .join("|");
    //     const colorPatterns = `(?:${formatPatterns}|${spacePatterns})`;
    //     const spaceNames = Object.keys(spaceConverters).join("|");

    //     if (funcName === "color") {
    //         const match = color.match(
    //             new RegExp(`^color\\(from\\s+(?<color>${colorPatterns}) (?<space>${spaceNames}) (.*)\\)$`)
    //         );
    //         if (!match) throw new Error(`"${color}" is not a valid relative format.`);

    //         const { color: colorMatch, space: spaceMatch } = match.groups!;

    //         baseColor = colorMatch;
    //         type = spaceMatch as Model;

    //         const fullMatch = match[0];
    //         const startIndex = fullMatch.indexOf(type) + type.length;
    //         componentsStr = fullMatch.substring(startIndex, fullMatch.length - 1).trim();

    //         if (!(type in spaceConverters)) throw new Error(`Invalid space for color(): ${type}`);
    //     } else {
    //         const match = color.match(new RegExp(`^${funcName}\\(from\\s+(?<color>${colorPatterns}) (.*)\\)$`));
    //         if (!match) throw new Error(`"${color}" is not a valid relative format.`);

    //         const { color: colorMatch } = match.groups!;

    //         baseColor = colorMatch;
    //         type = funcName as Model;

    //         const fullMatch = match[0];
    //         const startIndex = fullMatch.indexOf(baseColor) + baseColor.length;
    //         componentsStr = fullMatch.substring(startIndex, fullMatch.length - 1).trim();

    //         if (!(type in formatConverters)) throw new Error(`Invalid function name for relative format: ${type}`);
    //     }

    //     const tokens: string[] = [];
    //     let currentToken = "";
    //     let parenCount = 0;
    //     let inCalc = false;

    //     for (const char of componentsStr) {
    //         if (char === " " && parenCount === 0) {
    //             if (currentToken) {
    //                 tokens.push(currentToken);
    //                 currentToken = "";
    //             }
    //         } else {
    //             currentToken += char;
    //             if (currentToken === "calc(") inCalc = true;
    //             if (inCalc) {
    //                 if (char === "(") parenCount++;
    //                 if (char === ")") parenCount--;
    //                 if (parenCount === 0 && inCalc) {
    //                     tokens.push(currentToken);
    //                     currentToken = "";
    //                     inCalc = false;
    //                 }
    //             }
    //         }
    //     }
    //     if (currentToken) tokens.push(currentToken);

    //     const colorInstance = Color.from(baseColor);

    //     const components: number[] = [];
    //     let i = 0;
    //     while (components.length < 3 && i < tokens.length) {
    //         components.push(parseComponent(tokens[i], colorInstance, type, i));
    //         i++;
    //     }
    //     if (i < tokens.length && tokens[i] !== "/") {
    //         i++;
    //         if (i < tokens.length) {
    //             components.push(parseComponent(tokens[i], colorInstance, type, i));
    //         }
    //     }

    //     return { funcName, baseColor, type, components };
    // }

    /**
     * Parses a CSS color-mix() function string into its component parts.
     *
     * @param color - The color-mix string to parse (e.g., "color-mix(in srgb, red, blue)")
     * @returns An object containing the parsed color-mix string.
     * @throws {Error} If the color-mix string format is invalid
     */
    // static parseColorMix(color: string) {
    //     const parseColorAndWeight = (part: string) => {
    //         const tokens = part.split(/\s+/);
    //         let weight: number | undefined;
    //         if (tokens.length > 1 && tokens[tokens.length - 1].endsWith("%")) {
    //             const pct = tokens.pop()!;
    //             weight = parseFloat(pct.slice(0, -1)) / 100;
    //         }
    //         const colorComponent = tokens.join(" ");
    //         return { colorComponent, weight };
    //     };

    //     const parseColorString = (colorStr: string) => {
    //         const match = colorStr.match(/^(\w+)\(([^)]+)\)$/);
    //         if (!match) {
    //             throw new Error(`Invalid color format: "${colorStr}"`);
    //         }
    //         const model = match[1];
    //         const components = match[2].trim().split(/\s+/);
    //         return { model, components };
    //     };

    //     const replaceNoneComponents = (
    //         color1Parts: { model: string; components: string[] },
    //         color2Parts: { model: string; components: string[] }
    //     ) => {
    //         const comps1 = [...color1Parts.components];
    //         const comps2 = [...color2Parts.components];

    //         for (let i = 0; i < Math.max(comps1.length, comps2.length); i++) {
    //             if (comps1[i] === "none" && comps2[i] !== undefined && comps2[i] !== "none") {
    //                 comps1[i] = comps2[i];
    //             }
    //             if (comps2[i] === "none" && comps1[i] !== undefined && comps1[i] !== "none") {
    //                 comps2[i] = comps1[i];
    //             }
    //         }
    //         return {
    //             color1Parts: { model: color1Parts.model, components: comps1 },
    //             color2Parts: { model: color2Parts.model, components: comps2 },
    //         };
    //     };

    //     const buildColorString = (color: { model: string; components: string[] }) => {
    //         return `${color.model}(${color.components.join(" ")})`;
    //     };

    //     color = color.toLowerCase();

    //     if (!this.patterns["color-mix"].test(color)) {
    //         throw new Error(`"${color}" is not a valid color-mix format.`);
    //     }

    //     const inner = color.slice(color.indexOf("(") + 1, color.lastIndexOf(")")).trim();
    //     if (!inner.startsWith("in ")) {
    //         throw new Error('Invalid color-mix syntax; expected "in" keyword.');
    //     }
    //     const rest = inner.slice(3).trim();

    //     const firstComma = rest.indexOf(",");
    //     if (firstComma === -1) {
    //         throw new Error("Missing comma separator in color-mix declaration.");
    //     }
    //     const preComma = rest.slice(0, firstComma).trim();
    //     const afterComma = rest.slice(firstComma + 1).trim();

    //     const preTokens = preComma.split(/\s+/);
    //     let model: Model;
    //     let hue: HueInterpolationMethod = "shorter";
    //     if (preTokens.length === 1) {
    //         model = preTokens[0] as Model;
    //     } else if (preTokens.length === 3 && preTokens[2].toLowerCase() === "hue") {
    //         model = preTokens[0] as Model;
    //         hue = preTokens[1] as HueInterpolationMethod;
    //     } else {
    //         throw new Error(`Invalid model and hue interpolation part: "${preComma}"`);
    //     }

    //     const parts = afterComma.split(/\s*,\s*/);
    //     if (parts.length !== 2) {
    //         throw new Error(`Expected exactly two colors in color-mix but got: ${parts.length}`);
    //     }

    //     const firstColorData = parseColorAndWeight(parts[0]);
    //     const secondColorData = parseColorAndWeight(parts[1]);

    //     const firstColorModel = this.type(firstColorData.colorComponent, true);
    //     const secondColorModel = this.type(firstColorData.colorComponent, true);

    //     if (
    //         firstColorModel === secondColorModel &&
    //         "components" in converters[firstColorModel] &&
    //         "components" in converters[secondColorModel]
    //     ) {
    //         const parsedColor1 = parseColorString(firstColorData.colorComponent);
    //         const parsedColor2 = parseColorString(secondColorData.colorComponent);

    //         const replaced = replaceNoneComponents(parsedColor1, parsedColor2);
    //         firstColorData.colorComponent = buildColorString(replaced.color1Parts);
    //         secondColorData.colorComponent = buildColorString(replaced.color2Parts);
    //     }

    //     const colorInstance1 = Color.from(firstColorData.colorComponent);
    //     const colorInstance2 = Color.from(secondColorData.colorComponent);

    //     return {
    //         model,
    //         hue,
    //         color1: colorInstance1,
    //         weight1: firstColorData.weight,
    //         color2: colorInstance2,
    //         weight2: secondColorData.weight,
    //     };
    // }

    /**
     * Converts the current color to the specified format.
     *
     * @param format - The target color format.
     * @param options - Formatting options.
     * @returns The color in the specified format.
     */
    to(format: string, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(format: OutputType, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(format: OutputType | string, options: FormattingOptions = {}) {
        const { legacy = false, fit = "minmax" } = options;
        const converter = colorTypes[format as OutputType];

        if (!converter) throw new Error(`Unsupported color format: ${String(format)}.`);

        if (typeof converter.fromXYZ !== "function") {
            throw new Error(`Invalid output type: ${String(format)}.`);
        }

        return converter.fromXYZ(this.xyz, { legacy, fit });
    }

    /**
     * Allows access to the raw values of the color in a specified model.
     *
     * @param model - The target color model.
     * @returns An object containing methods to get, set, and mix color components in the specified color model.
     */
    in<M extends ColorFunction>(model: M): Interface<M>; // eslint-disable-line no-unused-vars
    in(model: string): Interface<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    in<M extends ColorFunction>(model: string | M): Interface<M> {
        const converter = colorFunctionConverters[model as M];
        const { components } = converter;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        const get = (options: GetOptions = {}) => {
            const coords = converter.fromXYZ(this.xyz);
            const { fit: fitMethod } = options;

            const result: { [key in Component<M>]: number } = {} as { [key in Component<M>]: number }; // eslint-disable-line no-unused-vars

            for (const [comp, { index }] of Object.entries(components)) {
                if (fitMethod) {
                    const clipped = fit(coords, model as M, fitMethod);
                    result[comp as Component<M>] = clipped[index];
                } else {
                    result[comp as Component<M>] = coords[index];
                }
            }

            return result;
        };

        const getCoords = (options: GetOptions = {}) => {
            const coords = converter.fromXYZ(this.xyz);
            const { fit: fitMethod } = options;

            if (fitMethod) {
                const clipped = fit(coords, model as M, fitMethod);
                return clipped;
            }

            return coords;
        };

        // TODO: should treat NaN like none in css, and Infinity and -Infinity like calc(infinity) and calc(-infinity)
        const set = (
            values:
                | Partial<{ [K in Component<M>]: number | ((prev: number) => number) }> // eslint-disable-line no-unused-vars
                | ((components: { [K in Component<M>]: number }) => Partial<{ [K in Component<M>]?: number }>) // eslint-disable-line no-unused-vars
        ) => {
            const coords = converter.fromXYZ(this.xyz);
            const compNames = Object.keys(components) as Component<M>[];

            if (typeof values === "function") {
                const currentComponents = {} as { [K in Component<M>]: number }; // eslint-disable-line no-unused-vars
                compNames.forEach((comp) => {
                    const { index } = components[comp as keyof typeof components] as ComponentDefinition;
                    currentComponents[comp] = coords[index];
                });
                values = values(currentComponents);
            }

            compNames.forEach((comp) => {
                if (comp in values) {
                    const { index } = components[comp as keyof typeof components] as ComponentDefinition;
                    const currentValue = coords[index];
                    const valueOrFunc = values[comp];
                    const newValue = typeof valueOrFunc === "function" ? valueOrFunc(currentValue) : valueOrFunc;
                    coords[index] = newValue as number;
                }
            });

            this.xyz = converter.toXYZ(coords);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const setCoords = (coords: number[]) => {
            this.xyz = converter.toXYZ(coords);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const mix = (other: Color | string, options: MixOptions = {}) => {
            const { hue = "shorter", amount = 0.5, easing = "linear", gamma = 1.0 } = options;

            const t = Math.max(0, Math.min(amount, 1));
            const easedT = (typeof easing === "function" ? easing : EASINGS[easing])(t);

            const otherColor = typeof other === "string" ? Color.from(other) : other;
            const otherCoords = otherColor.in(model).getCoords();
            const thisCoords = converter.fromXYZ(this.xyz);

            const gammaCorrectedT = Math.pow(easedT, 1 / gamma);

            const mixedCoords = interpolateComponents(thisCoords, otherCoords, components, gammaCorrectedT, hue);
            setCoords(mixedCoords);

            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        return { get, getCoords, set, setCoords, mix };
    }

    /**
     * Calculates the luminance of the color.
     *
     * @param background - The background color used if the color is not fully opaque. Defaults to white.
     * @param space - The color space to use for luminance calculation. Can be "xyz" (default) or "oklab".
     * @returns The luminance value of the color, a number between 0 and 1.
     */
    luminance(
        background: string | Color = Color.in("srgb").setCoords([1, 1, 1]),
        space: "xyz" | "oklab" = "xyz"
    ): number {
        const bgColor = typeof background === "string" ? Color.from(background) : background;
        switch (space) {
            case "xyz": {
                const [, Y, , alpha = 1] = this.xyz;
                if (alpha === 1) return Y;
                const [, bgY] = bgColor.xyz;
                const blendedY = (1 - alpha) * bgY + alpha * Y;
                return blendedY;
            }
            case "oklab": {
                const [L, , , alpha] = this.in("oklab").getCoords();
                if (alpha === 1) return L;
                const [bgL] = bgColor.in("oklab").getCoords();
                const blendedL = (1 - alpha) * bgL + alpha * L;
                return blendedL;
            }
            default:
                throw new Error(`Invalid color space for luminance: must be 'xyz' or 'oklab'.`);
        }
    }

    /**
     * Calculates the contrast ratio between the current color and a given color.
     *
     * @param background - The color to compare against, represented as a string (e.g., hex, RGB, etc.).
     * @param algorithm - The contrast algorithm to use: "wcag21" (default), "apca", or "oklab".
     *                  - "wcag21": Uses WCAG 2.1 contrast ratio (1 to 21). Limited by sRGB assumptions and poor hue handling.
     *                  - "apca": Uses APCA-W3 (Lc 0 to ~100), better for perceptual accuracy. See https://git.myndex.com.
     *                  - "oklab": Uses lightness difference in OKLab (0 to 1) for perceptual uniformity.
     *                  Note: WCAG 2.1 is standard but limited; consider APCA or OKLab for modern displays and test visually.
     * @returns The contrast value:
     *          - "wcag21": Ratio from 1 to 21.
     *          - "apca": Lc value (positive for light text on dark background, negative for dark text).
     *          - "oklab": Lightness difference (0 to 1).
     * @throws {Error} if the algorithm or background is invalid.
     */
    contrastRatio(background: string | Color, algorithm: "wcag21" | "apca" | "oklab" = "wcag21"): number {
        const bgColor = typeof background === "string" ? Color.from(background) : background;
        if (!bgColor) throw new Error(`Invalid background color: ${background}.`);

        if (algorithm === "wcag21") {
            const L_bg = bgColor.luminance(undefined, "xyz");
            const L_text = this.luminance(background, "xyz");
            return (Math.max(L_text, L_bg) + 0.05) / (Math.min(L_text, L_bg) + 0.05);
        } else if (algorithm === "oklab") {
            const oklab1 = this.in("oklab").getCoords();
            const oklab2 = bgColor.in("oklab").getCoords();
            return Math.abs(oklab1[0] - oklab2[0]);
        } else if (algorithm === "apca") {
            const L_text = this.luminance(background, "xyz");
            const L_bg = bgColor.luminance(undefined, "xyz");

            const Ntx = 0.57;
            const Nbg = 0.56;
            const Rtx = 0.62;
            const Rbg = 0.65;
            const W_scale = 1.14;
            const W_offset = 0.027;
            const W_clamp = 0.1;
            const B_thrsh = 0.022;
            const B_clip = 1.414;

            const yText = Math.max(L_text, 0);
            const yBg = Math.max(L_bg, 0);

            const yTextClamped = yText < B_thrsh ? yText + Math.pow(B_thrsh - yText, B_clip) : yText;
            const yBgClamped = yBg < B_thrsh ? yBg + Math.pow(B_thrsh - yBg, B_clip) : yBg;

            let S_apc: number;
            if (yBg > yText) S_apc = (Math.pow(yBgClamped, Nbg) - Math.pow(yTextClamped, Ntx)) * W_scale;
            else S_apc = (Math.pow(yBgClamped, Rbg) - Math.pow(yTextClamped, Rtx)) * W_scale;

            if (Math.abs(S_apc) < W_clamp) return 0;

            return S_apc > 0 ? (S_apc - W_offset) * 100 : (S_apc + W_offset) * 100;
        }
        throw new Error(`Unsupported contrast algorithm: must be 'wcag21', 'apca', or 'oklab'.`);
    }

    /**
     * Evaluates the accessibility of the current color against another color using WCAG 2.x or alternative contrast guidelines.
     *
     * @param background - The background color to evaluate against.
     * @param options - The accessibility options.
     * @returns An object with accessibility status, contrast, required contrast, and helpful info.
     * @throws {Error} if the algorithm, background, level, or font parameters are invalid.
     */
    evaluateAccessibility(background: string | Color, options: EvaluateAccessibilityOptions = {}) {
        const { type = "text", level = "AA", fontSize = 12, fontWeight = 400, algorithm = "wcag21" } = options;

        if (!["AA", "AAA"].includes(level)) {
            throw new Error("Invalid level: must be 'AA' or 'AAA'");
        }
        if (type === "text" && (fontSize <= 0 || !isFinite(fontSize))) {
            throw new Error("Invalid fontSize: must be a positive number.");
        }

        if (type === "text" && (fontWeight < 100 || fontWeight > 900)) {
            throw new Error("Invalid fontWeight: must be 100-900.");
        }
        const backgroundColor = typeof background === "string" ? Color.from(background) : background;

        const contrast = this.contrastRatio(background, algorithm);
        let requiredContrast: number, wcagSuccessCriterion: string, message: string;

        if (algorithm === "wcag21") {
            if (type === "text") {
                const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
                requiredContrast = { AA: isLargeText ? 3.0 : 4.5, AAA: isLargeText ? 4.5 : 7.0 }[level];
                wcagSuccessCriterion = { AA: "1.4.3", AAA: "1.4.6" }[level];
                message =
                    contrast >= requiredContrast
                        ? `Contrast ratio ${contrast.toFixed(2)} meets WCAG ${level} for ${isLargeText ? "large" : "normal"} text (${fontSize}pt, weight ${fontWeight}).`
                        : `Contrast ratio ${contrast.toFixed(2)} fails WCAG ${level} (needs at least ${requiredContrast} for ${fontSize}pt, weight ${fontWeight}).`;
            } else {
                requiredContrast = 3.0;
                wcagSuccessCriterion = "1.4.11";
                message =
                    contrast >= requiredContrast
                        ? `Contrast ratio ${contrast.toFixed(2)} meets WCAG ${level} for non-text elements.`
                        : `Contrast ratio ${contrast.toFixed(2)} fails WCAG ${level} for non-text (needs at least 3.0).`;
            }
        } else if (algorithm === "apca") {
            if (type === "text") {
                let lcThreshold: number;
                if (fontSize >= 24 || (fontSize >= 18 && fontWeight >= 700)) {
                    lcThreshold = level === "AA" ? 60 : 75;
                } else if (fontSize >= 16 || (fontSize >= 14 && fontWeight >= 700)) {
                    lcThreshold = level === "AA" ? 75 : 90;
                } else {
                    lcThreshold = level === "AA" ? 90 : 100;
                }
                requiredContrast = lcThreshold;
                wcagSuccessCriterion = "APCA (WCAG 3.0 draft)";
                message =
                    Math.abs(contrast) >= requiredContrast
                        ? `APCA contrast ${Math.abs(contrast).toFixed(2)} meets level ${level} for text (${fontSize}pt, weight ${fontWeight}).`
                        : `APCA contrast ${Math.abs(contrast).toFixed(2)} fails level ${level} (needs at least ${requiredContrast} for ${fontSize}pt, weight ${fontWeight}).`;
            } else {
                requiredContrast = 60;
                wcagSuccessCriterion = "APCA (WCAG 3.0 draft)";
                message =
                    Math.abs(contrast) >= requiredContrast
                        ? `APCA contrast ${Math.abs(contrast).toFixed(2)} meets level ${level} for non-text elements.`
                        : `APCA contrast ${Math.abs(contrast).toFixed(2)} fails level ${level} for non-text (needs at least ${requiredContrast}).`;
            }
        } else if (algorithm === "oklab") {
            if (type === "text") {
                requiredContrast = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700) ? 0.2 : 0.3;
                wcagSuccessCriterion = "OKLab (experimental)";
                message =
                    contrast >= requiredContrast
                        ? `OKLab lightness difference ${contrast.toFixed(2)} meets requirements for text (${fontSize}pt, weight ${fontWeight}).`
                        : `OKLab lightness difference ${contrast.toFixed(2)} fails requirements (needs at least ${requiredContrast} for ${fontSize}pt, weight ${fontWeight}).`;
            } else {
                requiredContrast = 0.25;
                wcagSuccessCriterion = "OKLab (experimental)";
                message =
                    contrast >= requiredContrast
                        ? `OKLab lightness difference ${contrast.toFixed(2)} meets requirements for non-text elements.`
                        : `OKLab lightness difference ${contrast.toFixed(2)} fails requirements (needs at least ${requiredContrast}).`;
            }
        } else {
            throw new Error("Unsupported contrast algorithm: must be 'wcag21', 'apca', or 'oklab'.");
        }

        const isAccessible = Math.abs(contrast) >= requiredContrast;
        const impact = !isAccessible
            ? algorithm === "wcag21" && level === "AAA"
                ? "minor"
                : type === "text" && (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700))
                  ? "moderate"
                  : "serious"
            : "none";

        return {
            isAccessible,
            contrast: +Math.abs(contrast).toFixed(2),
            requiredContrast,
            level,
            fontSize: type === "text" ? fontSize : undefined,
            fontWeight: type === "text" ? fontWeight : undefined,
            textColor: this as Color,
            backgroundColor,
            wcagSuccessCriterion,
            impact,
            algorithm,
            message,
        };
    }

    /**
     * Calculates the color difference (ΔEOK) between the current color and another color using the OKLAB color space.
     *
     * @param other - The other color to compare against.
     * @returns The ΔEOK value (a non-negative number; smaller indicates more similar colors).
     *
     * @remarks
     * This method uses the Euclidean distance in OKLAB color space, scaled to approximate a Just Noticeable Difference (JND) of ~2.
     * OKLAB's perceptual uniformity allows for a straightforward distance calculation without additional weighting.
     * The result is normalized by a factor of 100 to align with OKLAB's L range (0-1) and approximate the JND scale.
     *
     * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
     */
    deltaEOK(other: Color | string) {
        const [L1, a1, b1] = this.in("oklab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("oklab").getCoords();

        const ΔL = L1 - L2;
        const Δa = a1 - a2;
        const Δb = b1 - b2;
        const distance = Math.sqrt(ΔL ** 2 + Δa ** 2 + Δb ** 2);

        return distance * 100;
    }

    /**
     * Calculates the color difference (ΔE) between the current color and another color using CIE LAB-based methods.
     *
     * @param other - The other color to compare against, specified as a string.
     * @param method - The Delta E method to use: "76" (CIE76), "94" (CIE94), or "2000" (CIEDE2000). Defaults to "94".
     * @returns The ΔE value (a non-negative number; smaller indicates more similar colors).
     * @throws {Error} If an unsupported method is specified.
     *
     * @remarks
     * This method calculates the perceptual difference between two colors in CIE LAB color space using one of three methods:
     * - CIE76: Simple Euclidean distance in LAB space.
     * - CIE94: Improved weighting for better perceptual accuracy.
     * - CIEDE2000: Most accurate, accounting for hue, chroma, and lightness interactions.
     * The choice of method affects the accuracy and computational complexity, with CIEDE2000 being the most sophisticated.
     *
     * @see {@link https://www.w3.org/TR/css-color-4/|CSS Color Module Level 4}
     */
    deltaE(other: Color | string, method: "76" | "94" | "2000" = "94") {
        const [L1, a1, b1] = this.in("lab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").getCoords();

        const ΔL = L1 - L2;
        const ΔA = a1 - a2;
        const ΔB = b1 - b2;
        const C1 = Math.sqrt(a1 * a1 + b1 * b1);
        const C2 = Math.sqrt(a2 * a2 + b2 * b2);
        const ΔC = C1 - C2;
        const ΔH = Math.sqrt(Math.max(0, ΔA * ΔA + ΔB * ΔB - ΔC * ΔC));

        if (method === "76") {
            return Math.sqrt(ΔL * ΔL + ΔA * ΔA + ΔB * ΔB);
        }

        if (method === "94") {
            const kL = 1;
            const kC = 1;
            const kH = 1;
            const K1 = 0.045;
            const K2 = 0.015;

            const sC = 1 + K1 * C1;
            const sH = 1 + K2 * C1;

            const ΔE94 = Math.sqrt((ΔL / kL) ** 2 + (ΔC / (kC * sC)) ** 2 + (ΔH / (kH * sH)) ** 2);

            return ΔE94;
        }

        if (method === "2000") {
            const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
            const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);

            const Cbar = (C1 + C2) / 2;

            const C7 = Math.pow(Cbar, 7);
            const Gfactor = Math.pow(25, 7);
            const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + Gfactor)));

            const adash1 = (1 + G) * a1;
            const adash2 = (1 + G) * a2;

            const Cdash1 = Math.sqrt(adash1 ** 2 + b1 ** 2);
            const Cdash2 = Math.sqrt(adash2 ** 2 + b2 ** 2);

            const π = Math.PI;
            const r2d = 180 / π;
            const d2r = π / 180;
            let h1 = adash1 === 0 && b1 === 0 ? 0 : Math.atan2(b1, adash1);
            let h2 = adash2 === 0 && b2 === 0 ? 0 : Math.atan2(b2, adash2);

            if (h1 < 0) h1 += 2 * π;
            if (h2 < 0) h2 += 2 * π;

            h1 *= r2d;
            h2 *= r2d;

            const ΔL = L2 - L1;
            const ΔC = Cdash2 - Cdash1;

            const hdiff = h2 - h1;
            const hsum = h1 + h2;
            const habs = Math.abs(hdiff);
            let Δh;

            if (Cdash1 * Cdash2 === 0) Δh = 0;
            else if (habs <= 180) Δh = hdiff;
            else if (hdiff > 180) Δh = hdiff - 360;
            else Δh = hdiff + 360;

            const ΔH = 2 * Math.sqrt(Cdash2 * Cdash1) * Math.sin((Δh * d2r) / 2);

            const Ldash = (L1 + L2) / 2;
            const Cdash = (Cdash1 + Cdash2) / 2;
            const Cdash7 = Math.pow(Cdash, 7);

            let hdash;
            if (Cdash1 == 0 && Cdash2 == 0) hdash = hsum;
            else if (habs <= 180) hdash = hsum / 2;
            else if (hsum < 360) hdash = (hsum + 360) / 2;
            else hdash = (hsum - 360) / 2;

            const lsq = (Ldash - 50) ** 2;
            const SL = 1 + (0.015 * lsq) / Math.sqrt(20 + lsq);
            const SC = 1 + 0.045 * Cdash;

            let T = 1;
            T -= 0.17 * Math.cos((hdash - 30) * d2r);
            T += 0.24 * Math.cos(2 * hdash * d2r);
            T += 0.32 * Math.cos((3 * hdash + 6) * d2r);
            T -= 0.2 * Math.cos((4 * hdash - 63) * d2r);

            const SH = 1 + 0.015 * Cdash * T;
            const Δθ = 30 * Math.exp(-1 * ((hdash - 275) / 25) ** 2);
            const RC = 2 * Math.sqrt(Cdash7 / (Cdash7 + Gfactor));
            const RT = -1 * Math.sin(2 * Δθ * d2r) * RC;

            let dE = (ΔL / SL) ** 2;
            dE += (ΔC / SC) ** 2;
            dE += (ΔH / SH) ** 2;
            dE += RT * (ΔC / SC) * (ΔH / SH);
            return Math.sqrt(dE);
        }

        throw new Error(`Unsupported Delta E method: must be '76', '94', or '2000'.`);
    }

    /**
     * Compares the current color object with another color string.
     *
     * @param other - The color string to compare with the current color object.
     * @returns Whether the two colors are equal.
     */
    // TODO: add epsilon option
    equals(other: Color | string) {
        const otherColor = typeof other === "string" ? Color.from(other) : other;
        return this.xyz.length === otherColor.xyz.length && this.xyz.every((value, i) => value === otherColor.xyz[i]);
    }

    /**
     * Checks if the current color is within the specified gamut.
     *
     * @param gamut - The color space to check against.
     * @param options - Optional parameters, including epsilon for tolerance.
     * @returns `true` if the color is within the gamut, `false` otherwise.
     */
    inGamut(gamut: ColorSpace, options: InGamutOptions = {}) {
        if (!(gamut in colorSpaceConverters)) {
            throw new Error(`Unsupported color gamut: ${gamut}.`);
        }
        const { components, targetGamut } = colorFunctionConverters[gamut];
        const { epsilon = 1e-5 } = options;
        const coords = this.in(gamut).getCoords();

        if (targetGamut === null) return true;

        for (const [, props] of Object.entries(components)) {
            const [value, min, max] = [coords[props.index], props.min, props.max];
            if (value < min - epsilon || value > max + epsilon) {
                return false;
            }
        }

        return true;
    }
}

export default Color;
