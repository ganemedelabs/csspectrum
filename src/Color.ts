import { _converters, _formatConverters, _namedColors, _spaceConverters } from "./converters";
import { createSpaceConverter, EASINGS, interpolateComponents, multiplyMatrices } from "./utils";
import type {
    XYZA,
    RGBA,
    ColorOptions,
    Format,
    Space,
    Name,
    Model,
    ComponentDefinition,
    ConverterWithComponents,
    ConverterWithoutComponents,
    ColorConverter,
    Component,
    Interface,
    InterfaceWithSetOnly,
    ToNextColorOptions,
    SpaceMatrixMap,
    HueInterpolationMethod,
    ScaleOptions,
    InGamutOptions,
    GetOptions,
    LightnessRangeOptions,
    FitMethod,
    ToOptions,
    HarmonyType,
    MixOptions,
    EvaluateAccessibilityOptions,
} from "./types";

/**
 * The `Color` class represents a dynamic CSS color object, allowing for the manipulation
 * and retrieval of colors in various formats (e.g., RGB, HEX, HSL).
 */
class Color {
    private _xyza: XYZA = [0, 0, 0, 1];
    private _name: string | undefined;
    private _originalString: string;
    private _cleanString: string;

    constructor(xyza: XYZA, options: ColorOptions) {
        const { originalString } = options;
        this.xyza = xyza;
        this._originalString = originalString;
        this._cleanString = this._clean(originalString);
    }

    private get xyza(): [number, number, number, number] {
        const [x, y, z, a = 1] = this._xyza;
        return [x, y, z, a];
    }

    private set xyza(newValue: XYZA) {
        this._xyza = newValue;

        const [r1, g1, b1, a1 = 1] = this.in("rgb").getCoords();

        for (const [name, rgb] of Object.entries(_namedColors)) {
            const [r2, g2, b2, a2 = 1] = rgb;
            if (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2) {
                this._name = name;
                break;
            }
        }
    }

    private _clean(string: string) {
        return string
            .replace(/\bnone\b/gi, "0")
            .replace(/calc\(\s*([+-]?infinity)\s*\)/gi, "0")
            .trim();
    }

    /**
     * Maps the color to the target gamut using the specified method.
     *
     * @param model - Target color space (e.g., "srgb", "display-p3").
     * @param method - Gamut mapping method:
     *   - "minmax": Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
     *   - "chroma-reduction": Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
     *   - "css-gamut-map": CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
     *
     * @see https://www.w3.org/TR/css-color-4/
     */
    private _fit(model: Model, method: FitMethod = "minmax") {
        const roundCoords = (coords: number[]) => {
            return coords.map((value, i) => {
                const precision = componentProps[i]?.precision ?? 5;
                return Number(value.toFixed(precision));
            });
        };

        const { targetGamut, components } = _converters[model] as ConverterWithComponents;
        const coords = this.in(model).getCoords();

        const componentProps: ComponentDefinition[] = [];
        for (const [, props] of Object.entries(components)) {
            componentProps[props.index] = props;
        }

        switch (method) {
            case "minmax": {
                const clipped = coords.map((value, i) => {
                    const props = componentProps[i];
                    if (!props) {
                        throw new Error(`Missing component properties for index ${i}`);
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
                if (targetGamut === null || this.inGamut(targetGamut as Space, { epsilon: 1e-5 })) {
                    return roundCoords(coords);
                }

                const [L, , H, alpha] = this.in("oklch").getCoords();
                const [L_min, L_max] = this.lightnessRange(targetGamut as Space);
                const L_adjusted = Math.min(L_max, Math.max(L_min, L));

                let C_low = 0;
                let C_high = 1.0;
                const epsilon = 1e-6;
                let clipped: number[] = [];

                while (C_high - C_low > epsilon) {
                    const C_mid = (C_low + C_high) / 2;
                    const candidate_color = Color.in("oklch").setCoords([L_adjusted, C_mid, H, alpha]);

                    if (candidate_color.inGamut(targetGamut as Space, { epsilon: 1e-5 })) {
                        C_low = C_mid;
                    } else {
                        const clipped_coords = candidate_color._fit(model, "minmax");
                        const clipped_color = Color.in(model).setCoords(clipped_coords);
                        const deltaE = candidate_color.deltaEOK(clipped_color);
                        if (deltaE < 2) {
                            clipped = clipped_coords;
                            return roundCoords(clipped);
                        } else {
                            C_high = C_mid;
                        }
                    }
                }

                const finalColor = Color.in("oklch").setCoords([L_adjusted, C_low, H, alpha]);
                clipped = finalColor.in(model).getCoords();
                return roundCoords(clipped);
            }

            case "css-gamut-map": {
                if (targetGamut === null) {
                    return roundCoords(coords);
                }

                const [L, C, H, alpha] = this.in("oklch").getCoords();

                if (L >= 1.0) {
                    const white = Color.in("oklab").setCoords([1, 0, 0, alpha]);
                    return roundCoords(white.in(model).getCoords());
                }

                if (L <= 0.0) {
                    const black = Color.in("oklab").setCoords([0, 0, 0, alpha]);
                    return roundCoords(black.in(model).getCoords());
                }

                if (this.inGamut(targetGamut as Space, { epsilon: 1e-5 })) {
                    return roundCoords(coords);
                }

                const JND = 0.02;
                const epsilon = 0.0001;

                const current = Color.in("oklch").setCoords([L, C, H, alpha]);
                let clipped: number[] = current._fit(model, "minmax");

                const initialClippedColor = Color.in(model).setCoords(clipped);
                const E = current.deltaEOK(initialClippedColor);

                if (E < JND) {
                    return roundCoords(clipped);
                }

                let min = 0;
                let max = C;
                let min_inGamut = true;

                while (max - min > epsilon) {
                    const chroma = (min + max) / 2;
                    const candidate = Color.in("oklch").setCoords([L, chroma, H, alpha]);

                    if (min_inGamut && candidate.inGamut(targetGamut as Space, { epsilon: 1e-5 })) {
                        min = chroma;
                    } else {
                        const clippedCoords = candidate._fit(model, "minmax");
                        clipped = clippedCoords;
                        const clippedColor = Color.in(model).setCoords(clippedCoords);
                        const deltaE = candidate.deltaEOK(clippedColor);

                        if (deltaE < JND) {
                            if (JND - deltaE < epsilon) {
                                return roundCoords(clipped);
                            } else {
                                min_inGamut = false;
                                min = chroma;
                            }
                        } else {
                            max = chroma;
                        }
                    }
                }

                return roundCoords(clipped);
            }

            default:
                throw new Error(`Invalid gamut clipping method: ${method}`);
        }
    }

    /**
     * A collection of regular expressions for parsing color strings.
     */
    // eslint-disable-next-line no-unused-vars
    static patterns: { [K in Format | Space | "relative" | "color-mix"]: RegExp } = (() => {
        const formatPatterns = Object.values(_formatConverters)
            .map((fc) => fc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const spacePatterns = Object.values(_spaceConverters)
            .map((sc) => sc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const color = `(?:${formatPatterns}|${spacePatterns})`;

        const relative = (() => {
            const funcNames = "color|" + Object.keys(_formatConverters).join("|");
            const spaceNames = Object.keys(_spaceConverters).join("|");
            const numberOrCalc = "([a-z]+|calc\\((?:[^()]+|\\([^()]*\\))*\\)|[+-]?\\d*\\.?\\d+(?:%|[a-z]+)?)";
            const components = `${numberOrCalc}(?:\\s+${numberOrCalc}){2,3}`;
            const alpha = `(?:\\s*\\/\\s*${numberOrCalc})?`;
            const pattern = `^(${funcNames})\\(\\s*from\\s+(${color})((?:\\s+(${spaceNames}))?\\s+${components}${alpha})\\s*\\)$`;
            return new RegExp(pattern, "i");
        })();

        const colorMix = (() => {
            const modelNames = Object.keys(_converters).join("|");
            const percentage = "(?:(?:100(?:\\.0+)?|(?:\\d{1,2}(?:\\.\\d+)?|\\.[0-9]+))%)";
            const hueInterpolationMethods = "shorter|longer|increasing|decreasing";
            const colorWithOptionalPercentage = `${color}(?:\\s+${percentage})?`;
            const pattern = `^color-mix\\(\\s*in\\s+(${modelNames})(?:\\s+(${hueInterpolationMethods})\\s+hue)?\\s*,\\s*${colorWithOptionalPercentage}\\s*,\\s*${colorWithOptionalPercentage}\\s*\\)$`;
            return new RegExp(pattern, "i");
        })();

        return {
            ...Object.fromEntries(Object.entries(_converters).map(([key, value]) => [key, value.pattern])),
            relative,
            "color-mix": colorMix,
        } as { [K in Format | Space | "relative" | "color-mix"]: RegExp }; // eslint-disable-line no-unused-vars
    })();

    /**
     * Creates a new `Color` instance from a given color string and optional format.
     *
     * @param color - The color string to convert.
     * @returns A new `Color` instance.
     */
    static from(color: Name): Color; // eslint-disable-line no-unused-vars
    static from(color: string): Color; // eslint-disable-line no-unused-vars
    static from(color: Name | string) {
        const instance = new Color([0, 0, 0, 1], { originalString: color });
        color = color?.toLowerCase();

        if (instance.isRelative()) {
            const { type, components } = Color.parseRelative(color);

            const colorString =
                type in _formatConverters
                    ? `${type}(${components.join(" ")})`
                    : `color(${type} ${components.join(" ")})`;

            const xyza = _converters[type].toXYZA(components);

            return new Color(xyza, { originalString: colorString });
        }

        if (instance.isColorMix()) {
            const parsed = Color.parseColorMix(color);
            const { model, hue, color1, color2 } = parsed;
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

            const colorInstance = color1.in(model).mix(color2, { amount: weight2Prime, hue });

            // Create a new Color instance because .in(model) methods return chainable .in(model) methods.
            return new Color(colorInstance.xyza, { originalString: color });
        }

        for (const [, converter] of Object.entries(_converters)) {
            if (converter.pattern.test(color)) {
                let xyza;
                if ("toComponents" in converter) {
                    const components = converter.toComponents(color);
                    xyza = converter.toXYZA(components);
                } else {
                    xyza = converter.toXYZA(color);
                }
                return new Color(xyza, { originalString: color });
            }
        }

        throw new Error(`Unsupported color format: ${color}`);
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
        const originalString = _converters[model as Model].fromComponents([0, 0, 0, 1]);
        const color = new Color([0, 0, 0, 1], { originalString });
        const result = Object.fromEntries(Object.entries(color.in(model)).filter(([key]) => key.startsWith("set")));
        return result as InterfaceWithSetOnly<Interface<M>>;
    }

    /**
     * Registers a new named color in the system.
     *
     * @param name - The name of the color to register. Spaces and hyphens will be removed, and the name will be converted to lowercase.
     * @param rgba - The RGBA color values to associate with the name.
     * @throws {Error} If a color with the same name (after cleaning) is already registered.
     */
    static registerNamedColor(name: string, rgba: RGBA) {
        const cleanedName = name.replace(/(?:\s+|-)/g, "").toLowerCase();
        if ((_namedColors as Record<Name, RGBA>)[cleanedName as Name]) {
            throw new Error(`Color name "${name}" is already registered.`);
        }

        (_namedColors as Record<Name, RGBA>)[cleanedName as Name] = rgba;
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
     * The alpha component is added automatically with a range of 0-1 and precision of 3.
     */
    static registerFormat(formatName: string, converter: ConverterWithComponents | ConverterWithoutComponents) {
        (_formatConverters as Record<Format, ConverterWithComponents | ConverterWithoutComponents>)[
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

        (_converters as Record<string, ColorConverter>)[formatName] = converter;
    }

    /**
     * Registers a new color space with its corresponding conversion matrix.
     *
     * @param spaceName - The name of the color space to register
     * @param spaceObject - The matrix mapping object containing conversion data
     *
     * @remarks
     * The alpha component is added automatically with a range of 0-1 and precision of 3.
     */
    static registerSpace(spaceName: string, spaceMatrix: SpaceMatrixMap) {
        const spaceConverter = createSpaceConverter(spaceName, spaceMatrix);
        (_spaceConverters as Record<Space, ConverterWithComponents>)[spaceName as Space] = spaceConverter;

        const components = spaceConverter.components as Record<string, ComponentDefinition>;
        components["alpha"] = {
            index: Object.keys(components).length,
            min: 0,
            max: 1,
            precision: 3,
        };

        (_converters as Record<string, ColorConverter>)[spaceName] = spaceConverter;
    }

    /**
     * Retrieves a list of all supported color formats.
     *
     * @returns An array of supported color format names.
     */
    static getSupportedFormats() {
        return Array.from(Object.keys(_formatConverters)) as Format[];
    }

    /**
     * Retrieves a list of all supported color spaces.
     *
     * @returns An array of supported color space names.
     */
    static getSupportedSpaces() {
        return Array.from(Object.keys(_spaceConverters)) as Space[];
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
            const types = Object.keys(_formatConverters).concat(Object.keys(_spaceConverters));
            type = types[Math.floor(Math.random() * types.length)];
        }

        if (type === "named") {
            return Object.keys(_namedColors)[Math.floor(Math.random() * Object.keys(_namedColors).length)];
        }

        const randomChannel = () => Math.floor(Math.random() * 200 + 30);
        const randomColor = this.from(`rgb(${randomChannel()}, ${randomChannel()}, ${randomChannel()})`);
        return randomColor.to(type) as string;
    }

    /**
     * Parses a CSS relative color string into its components.
     *
     * @param color - The relative color string to parse (e.g., "rgb(from red r g b)")
     * @returns An object containing the parsed relative color string.
     * @throws {Error} If the relative color string format is invalid
     */
    static parseRelative(color: string) {
        function parseAngle(angleStr: string): number {
            const match = angleStr.match(/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/);
            if (!match) throw new Error(`Invalid angle format: ${angleStr}`);
            const value = parseFloat(match[1]);
            const unit = match[2] || "deg";

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
        }

        const parseComponent = <M extends Model>(
            component: string,
            colorInstance: Color,
            model: M,
            index: number
        ): number => {
            const componentDef = Object.values(_converters[model].components).find((c) => c.index === index);
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
                return parseCalc(expression, model);
            } else if (component in _converters[model].components) {
                // Case 4: Component name (e.g., "h", "s")
                return colorInstance.in(model).get(component as Component<M>);
            } else if (isAngle) {
                // Case 5: Angle with unit (e.g., "30deg", "0.5turn")
                return parseAngle(component);
            } else {
                throw new Error(`Invalid component format for ${model} component ${index}: ${component}`);
            }
        };

        const parseCalc = (str: string, model: Model) => {
            const expr = str
                .split("")
                .map((char) => {
                    if (/[a-zA-Z]/.test(char)) {
                        const value = colorInstance.in(model).get(char as Component<Model>);
                        return isNaN(value) ? char : value;
                    }
                    return char;
                })
                .join("")
                .replace(/\s/g, "");

            const evaluate = (expr: string) => {
                while (expr.includes("(")) {
                    expr = expr.replace(/\(([^()]+)\)/, (_, inner) => evaluate(inner).toString());
                }

                const tokens = expr.match(/(\d*\.?\d+|\+|-|\*|\/)/g) || [];
                if (!tokens) return NaN;

                let i = 0;
                while (i < tokens.length) {
                    if (tokens[i] === "*" || tokens[i] === "/") {
                        const left = Number(tokens[i - 1]);
                        const right = Number(tokens[i + 1]);
                        const result = tokens[i] === "*" ? left * right : left / right;
                        tokens.splice(i - 1, 3, result.toString());
                    } else {
                        i++;
                    }
                }

                let result = Number(tokens[0]);
                for (i = 1; i < tokens.length; i += 2) {
                    const op = tokens[i];
                    const num = Number(tokens[i + 1]);
                    result = op === "+" ? result + num : result - num;
                }

                return result;
            };

            const result = evaluate(expr);
            return isNaN(result) ? NaN : result;
        };

        color = color.toLowerCase();

        const funcNameMatch = color.match(/^(\w+)(?=\()/);
        if (!funcNameMatch) throw new Error(`"${color}" is not a valid relative format.`);
        const funcName = funcNameMatch[1];

        let baseColor: string, type: Model, componentsStr: string;

        const formatPatterns = Object.values(_formatConverters)
            .map((fc) => fc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const spacePatterns = Object.values(_spaceConverters)
            .map((sc) => sc.pattern.source.replace(/^\^|\$$/g, ""))
            .join("|");
        const colorPatterns = `(?:${formatPatterns}|${spacePatterns})`;
        const spaceNames = Object.keys(_spaceConverters).join("|");

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

            if (!(type in _spaceConverters)) throw new Error(`Invalid space for color(): ${type}`);
        } else {
            const match = color.match(new RegExp(`^${funcName}\\(from\\s+(?<color>${colorPatterns}) (.*)\\)$`));
            if (!match) throw new Error(`"${color}" is not a valid relative format.`);

            const { color: colorMatch } = match.groups!;

            baseColor = colorMatch;
            type = funcName as Model;

            const fullMatch = match[0];
            const startIndex = fullMatch.indexOf(baseColor) + baseColor.length;
            componentsStr = fullMatch.substring(startIndex, fullMatch.length - 1).trim();

            if (!(type in _formatConverters)) throw new Error(`Invalid function name for relative format: ${type}`);
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
     * @param color - The color-mix string to parse (e.g., "color-mix(in srgb, red, blue)")
     * @returns An object containing the parsed color-mix string.
     * @throws {Error} If the color-mix string format is invalid
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
            throw new Error('Invalid color-mix syntax; expected "in" keyword.');
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
        let hue: HueInterpolationMethod = "shorter";
        if (preTokens.length === 1) {
            model = preTokens[0] as Model;
        } else if (preTokens.length === 3 && preTokens[2].toLowerCase() === "hue") {
            model = preTokens[0] as Model;
            hue = preTokens[1] as HueInterpolationMethod;
        } else {
            throw new Error(`Invalid model and hue interpolation part: "${preComma}"`);
        }

        const parts = afterComma.split(/\s*,\s*/);
        if (parts.length !== 2) {
            throw new Error(`Expected exactly two colors in color-mix but got: ${parts.length}`);
        }

        const firstColorData = parseColorAndWeight(parts[0]);
        const secondColorData = parseColorAndWeight(parts[1]);

        const firstColorModel = Color.from(firstColorData.colorComponent).type();
        const secondColorModel = Color.from(secondColorData.colorComponent).type();

        if (
            firstColorModel === secondColorModel &&
            "components" in _converters[firstColorModel] &&
            "components" in _converters[secondColorModel]
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
            hue,
            color1: colorInstance1,
            weight1: firstColorData.weight,
            color2: colorInstance2,
            weight2: secondColorData.weight,
        };
    }

    /**
     * Converts the current color to the specified format.
     *
     * @param format - The target color format.
     * @param options - Formatting options.
     * @returns The color in the specified format.
     */
    to(format: string, options?: ToOptions): string; // eslint-disable-line no-unused-vars
    to(format: Format | Space, options?: ToOptions): string; // eslint-disable-line no-unused-vars
    to(format: Format | Space | string, options: ToOptions = { modern: false, fit: "minmax" }) {
        const { modern, fit } = options;
        const converter = _converters[format as Format | Space];
        if (!converter) {
            throw new Error(`Unsupported color format: ${format}`);
        }

        if ("components" in converter) {
            const coords = this.in(format).getCoords({ fit });
            return converter.fromComponents(coords, { modern });
        } else {
            return converter.fromXYZA(this.xyza);
        }
    }

    /**
     * Converts the current color instance to all available formats, excluding any specified in the exclude array.
     *
     * @param exclude - An array of format or space names to exclude from the result.
     * @returns An object where the keys are the format names and the values are the color representations in those formats.
     */
    toAll(exclude: (Format | Space)[] = []): Record<Format | Space, string> {
        const formats = (Object.keys(_converters) as (Format | Space)[]).filter((format) => !exclude.includes(format));

        return formats.reduce(
            (acc, format) => {
                acc[format] = this.to(format);
                return acc;
            },
            {} as Record<Format | Space, string>
        );
    }

    /**
     * Advances to the next color format based on the current index.
     *
     * @returns A tuple containing the next color as a string and the updated index.
     */
    toNext(options: ToNextColorOptions = { modern: false, exclude: [] }) {
        const color = this._originalString.toLowerCase();
        const type = Color.from(color).type();

        let formats = Object.keys(_converters);

        if (options.exclude?.length) {
            formats = formats.filter((format) => !options.exclude?.includes(format as Format));
        }

        if (!this._name) {
            formats = formats.filter((format) => format !== "named");
        }

        if (formats.length === 0) {
            throw new Error("No available formats after applying exclusions.");
        }

        const currentIndex = formats.lastIndexOf(type);
        const nextFormat = formats[(currentIndex + 1) % formats.length];

        const nextColor = this.to(nextFormat as Format | Space, options) as string;

        return nextColor;
    }

    /**
     * Allows access to the raw values of the color in a specified model.
     *
     * @param model - The target color model.
     * @returns An object containing methods to get, set, and mix color components in the specified color model.
     */
    in<M extends Model>(model: M): Interface<M>; // eslint-disable-line no-unused-vars
    in(model: string): Interface<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    in<M extends Model>(model: string | M): Interface<M> {
        const converter = _converters[model as M];
        const { components } = converter;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        const get = (component: Component<M>, options: GetOptions = {}) => {
            const coords = getCoords();
            const { index } = components[component as keyof typeof components];
            const { fit } = options;

            if (fit) {
                const clipped = this._fit(model as M, fit);
                return clipped[index];
            }

            return coords[index];
        };

        const getCoords = (options: GetOptions = {}) => {
            const coords = converter.fromXYZA(this.xyza);
            const { fit } = options;

            if (fit) {
                const clipped = this._fit(model as M, fit);
                return clipped;
            }

            return coords;
        };

        const set = (
            values:
                | Partial<{ [K in Component<M>]: number | ((prev: number) => number) }> // eslint-disable-line no-unused-vars
                | ((components: { [K in Component<M>]: number }) => Partial<{ [K in Component<M>]?: number }>) // eslint-disable-line no-unused-vars
        ) => {
            const coords = getCoords();
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

            this.xyza = converter.toXYZA(coords);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const setCoords = (coords: number[]) => {
            this.xyza = converter.toXYZA(coords);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const mix = (other: Color | string, options: MixOptions = {}) => {
            const { hue = "shorter", amount = 0.5, easing = "linear" } = options;
            const t = Math.max(0, Math.min(amount, 1));
            const easedT = (typeof easing === "function" ? easing : EASINGS[easing])(t);

            const otherColor = typeof other === "string" ? Color.from(other) : other;
            const otherCoords = otherColor.in(model).getCoords();
            const thisCoords = getCoords();

            const mixedCoords = interpolateComponents(thisCoords, otherCoords, components, easedT, hue);
            setCoords(mixedCoords);

            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        return { get, getCoords, set, setCoords, mix };
    }

    /**
     * Determines the type of the given color string based on predefined patterns.
     *
     * @returns The key corresponding to the matched color pattern.
     * @throws {Error} If the color format is unsupported.
     */
    type(): Format | Space {
        const color = this._cleanString;

        if (this.isRelative()) {
            const { type } = Color.parseRelative(color);
            return type;
        }

        if (this.isColorMix()) {
            const { model } = Color.parseColorMix(color);
            return model;
        }

        for (const [key, pattern] of Object.entries(Color.patterns)) {
            if (pattern.test(color)) {
                return key as Format;
            }
        }

        throw new Error(`Unsupported color format: ${this._originalString}`);
    }

    contrastColor() {
        return this.luminance() > 0.5 ? Color.in("srgb").setCoords([0, 0, 0]) : Color.in("srgb").setCoords([]);
    }

    /**
     * Calculates the luminance of the color.
     *
     * @param background - The background color used if the color is not fully opaque. Defaults to white.
     * @returns The luminance value of the color, a number between 0 and 1.
     */
    luminance(background: Color | string = Color.in("srgb").setCoords([1, 1, 1])) {
        const [, Y, , alpha] = this.xyza;

        if (alpha === 1) {
            return Y;
        }

        const bgXYZ = (typeof background === "string" ? Color.from(background) : background).in("xyz").getCoords();
        const blendedY = (1 - alpha) * bgXYZ[1] + alpha * Y;

        return blendedY;
    }

    /**
     * Calculates the contrast ratio between the current color and a given color.
     *
     * @param color - The color to compare against, represented as a string (e.g., hex, RGB, etc.).
     * @returns The contrast ratio as a number. A higher value indicates greater contrast.
     *          The ratio ranges from 1 (no contrast) to 21 (maximum contrast).
     */
    contrastRatio(background: Color | string) {
        const L_bg = (typeof background === "string" ? Color.from(background) : background).luminance();
        const L_text = this.luminance(background);
        return (Math.max(L_text, L_bg) + 0.05) / (Math.min(L_text, L_bg) + 0.05);
    }

    /**
     * Evaluates the accessibility of the current color against another color using WCAG 2.x contrast guidelines.
     *
     * @param background - The background color to evaluate against.
     * @returns An object with accessibility status, ratio, required ratio, and helpful info.
     */
    evaluateAccessibility(background: Color | string, options: EvaluateAccessibilityOptions = {}) {
        const contrastRatio = this.contrastRatio(background);
        const { level = "AA", isLargeText = false } = options;

        const requiredRatio = {
            AA: isLargeText ? 3.0 : 4.5,
            AAA: isLargeText ? 4.5 : 7.0,
        }[level];

        const isAccessible = contrastRatio >= requiredRatio;

        const wcagSuccessCriterion = {
            AA: "1.4.3",
            AAA: "1.4.6",
        }[level];

        const impact = !isAccessible ? (level === "AAA" ? "minor" : isLargeText ? "moderate" : "serious") : "none";

        const colorType = this.type();
        const textColor = this.to(colorType);
        const backgroundColor = (typeof background === "string" ? Color.from(background) : background).to(colorType);

        const textType = isLargeText ? "large text" : "normal text";

        return {
            isAccessible,
            contrastRatio: +contrastRatio.toFixed(2),
            requiredRatio,
            level,
            isLargeText,
            textColor,
            backgroundColor,
            wcagSuccessCriterion,
            impact,
            tags: [`wcag2${level.toLowerCase()}`, `wcag21${level.toLowerCase()}`],
            message: isAccessible
                ? `Contrast ratio ${contrastRatio.toFixed(2)} meets WCAG ${level} for ${textType}.`
                : `Contrast ratio ${contrastRatio.toFixed(2)} fails WCAG ${level} (needs at least ${requiredRatio}).`,
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
     * @see https://www.w3.org/TR/css-color-4/
     */
    deltaEOK(other: Color | string): number {
        const [L1, a1, b1] = this.in("oklab").getCoords().slice(0, 3);
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other)
            .in("oklab")
            .getCoords()
            .slice(0, 3);

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
     * @see https://www.w3.org/TR/css-color-4/
     */
    deltaE(other: Color | string, method: "76" | "94" | "2000" = "94"): number {
        const lab1 = this.in("lab").getCoords();
        const lab2 = (typeof other === "string" ? Color.from(other) : other).in("lab").getCoords();

        const [L1, a1, b1] = lab1;
        const [L2, a2, b2] = lab2;

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

        throw new Error(`Unsupported Delta E method: ${method}`);
    }

    lightnessRange(gamut: Space, options: LightnessRangeOptions = {}) {
        const C = 0.05;
        const epsilon = options.epsilon || 1e-5;
        const hue = this.in("oklch").get("h");

        function isInGamut(L: number): boolean {
            const color = Color.in("oklch").setCoords([L, C, hue]);
            return color.inGamut(gamut, { epsilon });
        }

        const searchMinL = (): number => {
            let low = 0,
                high = 1;
            while (high - low > epsilon) {
                const mid = (low + high) / 2;
                if (isInGamut(mid)) high = mid;
                else low = mid;
            }
            return high;
        };

        const searchMaxL = (): number => {
            let low = 0,
                high = 1;
            while (high - low > epsilon) {
                const mid = (low + high) / 2;
                if (isInGamut(mid)) low = mid;
                else high = mid;
            }
            return low;
        };

        const L_min = searchMinL();
        const L_max = searchMaxL();

        return [L_min, L_max];
    }

    /**
     * Generates an array of harmonious colors based on the specified harmony type.
     *
     * @param type - The type of harmony to generate.
     * @returns An array of `Color` instances, including the base color and its harmonious counterparts.
     * @throws {Error} If an unsupported harmony type is provided.
     */
    harmony(type: HarmonyType): Color[] {
        const harmonyOffsets: Record<HarmonyType, number[]> = {
            complementary: [180],
            "split-complementary": [150, 210],
            triadic: [120, 240],
            tetradic: [60, 180, 240],
            analogous: [-30, 30],
        };

        if (!(type in harmonyOffsets)) {
            throw new Error(`Unsupported harmony type: ${type}`);
        }

        const [L, C, H] = this.in("oklch").getCoords();

        const result: Color[] = [Color.in("oklch").setCoords([L, C, H])];

        for (const offset of harmonyOffsets[type]) {
            const newH = (H + offset + 360) % 360;
            result.push(Color.in("oklch").setCoords([L, C, newH]));
        }

        return result;
    }

    /**
     * Generates a color scale between the current color and a target color.
     *
     * @param target - The target color to interpolate to.
     * @param options - Options for the scale generation.
     * @returns An array of `Color` instances representing the interpolated scale.
     */
    scale(target: Color | string, { steps = 10, model = "lab", easing = "linear", hue = "shorter" }: ScaleOptions) {
        if (steps < 2) {
            throw new Error("Scale must include at least 2 steps.");
        }

        const fromInterface = this.in(model);
        const toInterface = (typeof target === "string" ? Color.from(target) : target).in(model);
        const converter = _converters[model];
        const components = converter.components;

        const fromCoords = fromInterface.getCoords();
        const toCoords = toInterface.getCoords();

        const interpolatedColors = [];

        for (let i = 0; i < steps; i++) {
            const t = (typeof easing === "function" ? easing : EASINGS[easing])(i / (steps - 1));
            const mixed = interpolateComponents(fromCoords, toCoords, components, t, hue);

            const instance = Color.in(model).setCoords(mixed);
            interpolatedColors.push(instance);
        }

        return interpolatedColors;
    }

    /**
     * Simulates color vision deficiencies (color blindness).
     *
     * @param type - The type of color blindness to simulate: "protanopia", "deuteranopia", or "tritanopia".
     * @param severity - The severity of the simulation, ranging from 0 (no effect) to 1 (full simulation). Defaults to 1.
     * @returns A new `Color` instance representing the simulated color.
     * @throws {Error} If an unsupported type is passed or severity is out of range.
     *
     * @see https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
     */
    simulate(type: "protanopia" | "deuteranopia" | "tritanopia", severity: number = 1) {
        const PROTAN_MATRICES: Record<number, number[][]> = {
            0.0: [
                [1.0, 0.0, 0.0],
                [0.0, 1.0, 0.0],
                [0.0, 0.0, 1.0],
            ],
            0.1: [
                [0.856167, 0.182038, -0.038205],
                [0.029342, 0.955115, 0.015544],
                [-0.00288, -0.001563, 1.004443],
            ],
            0.2: [
                [0.734766, 0.334872, -0.069637],
                [0.05184, 0.919198, 0.028963],
                [-0.004928, -0.004209, 1.009137],
            ],
            0.3: [
                [0.627937, 0.477713, -0.10565],
                [0.070376, 0.886046, 0.043578],
                [-0.006605, -0.008261, 1.014866],
            ],
            0.4: [
                [0.534006, 0.615339, -0.149345],
                [0.086674, 0.853618, 0.059708],
                [-0.008083, -0.013923, 1.022006],
            ],
            0.5: [
                [0.450676, 0.750106, -0.200782],
                [0.101469, 0.821429, 0.077102],
                [-0.00951, -0.021058, 1.030568],
            ],
            0.6: [
                [0.375797, 0.882083, -0.25788],
                [0.115319, 0.789693, 0.094988],
                [-0.010668, -0.030508, 1.041177],
            ],
            0.7: [
                [0.308256, 1.011047, -0.319303],
                [0.128298, 0.757721, 0.113981],
                [-0.011652, -0.041842, 1.053494],
            ],
            0.8: [
                [0.247513, 1.138565, -0.386078],
                [0.140636, 0.725206, 0.134158],
                [-0.012514, -0.055316, 1.06783],
            ],
            0.9: [
                [0.192793, 1.265779, -0.458572],
                [0.15246, 0.691576, 0.155965],
                [-0.013267, -0.071196, 1.084463],
            ],
            1.0: [
                [0.152286, 1.052583, -0.204868],
                [0.114503, 0.786281, 0.099216],
                [-0.003882, -0.048116, 1.051998],
            ],
        };

        const DEUTAN_MATRICES: Record<number, number[][]> = {
            0.0: [
                [1.0, 0.0, 0.0],
                [0.0, 1.0, 0.0],
                [0.0, 0.0, 1.0],
            ],
            0.1: [
                [0.86679, 0.163186, -0.029976],
                [0.046022, 0.924631, 0.029347],
                [-0.005363, -0.00263, 1.007993],
            ],
            0.2: [
                [0.747405, 0.312895, -0.0603],
                [0.085624, 0.854517, 0.059859],
                [-0.00927, -0.006336, 1.015606],
            ],
            0.3: [
                [0.639318, 0.458675, -0.097993],
                [0.120706, 0.787744, 0.09155],
                [-0.012406, -0.011875, 1.024281],
            ],
            0.4: [
                [0.541088, 0.603389, -0.144477],
                [0.152987, 0.722898, 0.124115],
                [-0.015186, -0.019259, 1.034445],
            ],
            0.5: [
                [0.451195, 0.747835, -0.19903],
                [0.183117, 0.658991, 0.157892],
                [-0.017691, -0.028735, 1.046426],
            ],
            0.6: [
                [0.368516, 0.893108, -0.261624],
                [0.211636, 0.5953, 0.193064],
                [-0.020011, -0.040316, 1.060327],
            ],
            0.7: [
                [0.292093, 1.040203, -0.332296],
                [0.238835, 0.531311, 0.229854],
                [-0.022177, -0.054517, 1.076694],
            ],
            0.8: [
                [0.221629, 1.189945, -0.411574],
                [0.265298, 0.466293, 0.268409],
                [-0.024162, -0.071463, 1.095625],
            ],
            0.9: [
                [0.156616, 1.343101, -0.499717],
                [0.291265, 0.39968, 0.309055],
                [-0.025974, -0.091679, 1.117653],
            ],
            1.0: [
                [0.367322, 0.860646, -0.227968],
                [0.280085, 0.672501, 0.047413],
                [-0.01182, 0.04294, 0.968881],
            ],
        };

        const TRITAN_MATRICES: Record<number, number[][]> = {
            0.0: [
                [1.0, 0.0, 0.0],
                [0.0, 1.0, 0.0],
                [0.0, 0.0, 1.0],
            ],
            0.1: [
                [1.0, 0.0, 0.0],
                [0.0, 0.991366, 0.008634],
                [0.0, 0.058058, 0.941942],
            ],
            0.2: [
                [0.999508, 0.000492, 0.0],
                [0.0, 0.982752, 0.017248],
                [0.0, 0.115829, 0.884171],
            ],
            0.3: [
                [0.998516, 0.001484, 0.0],
                [0.0, 0.974172, 0.025828],
                [0.0, 0.173016, 0.826984],
            ],
            0.4: [
                [0.996987, 0.003013, 0.0],
                [0.0, 0.965617, 0.034383],
                [0.0, 0.230336, 0.769664],
            ],
            0.5: [
                [0.994911, 0.005089, 0.0],
                [0.0, 0.957091, 0.042909],
                [0.0, 0.287776, 0.712224],
            ],
            0.6: [
                [0.992374, 0.007626, 0.0],
                [0.0, 0.948592, 0.051408],
                [0.0, 0.345336, 0.654664],
            ],
            0.7: [
                [0.989351, 0.010649, 0.0],
                [0.0, 0.940116, 0.059884],
                [0.0, 0.402991, 0.597009],
            ],
            0.8: [
                [0.985764, 0.014236, 0.0],
                [0.0, 0.931663, 0.068337],
                [0.0, 0.46075, 0.53925],
            ],
            0.9: [
                [0.981608, 0.018392, 0.0],
                [0.0, 0.923233, 0.076767],
                [0.0, 0.518627, 0.481373],
            ],
            1.0: [
                [1.255528, -0.076749, -0.178779],
                [-0.078411, 0.930809, 0.147602],
                [0.004733, 0.691367, 0.3039],
            ],
        };

        const MATRICES: Record<string, Record<number, number[][]>> = {
            protanopia: PROTAN_MATRICES,
            deuteranopia: DEUTAN_MATRICES,
            tritanopia: TRITAN_MATRICES,
        };

        if (severity < 0 || severity > 1) {
            throw new Error("Severity must be between 0 and 1");
        }

        const typeMatrices = MATRICES[type];
        if (!typeMatrices) {
            throw new Error(`Unsupported simulation type: ${type}`);
        }

        const s1 = Math.floor(severity * 10) / 10;
        const s2 = Math.min(s1 + 0.1, 1.0);

        let matrix: number[][];
        if (s1 === s2) {
            matrix = typeMatrices[s1];
        } else {
            const w = (severity - s1) / (s2 - s1);
            const m1 = typeMatrices[s1];
            const m2 = typeMatrices[s2];
            matrix = m1.map((row, i) => row.map((val, j) => (1 - w) * val + w * m2[i][j]));
        }

        const inSRGB = this.in("srgb");
        const coords = inSRGB.getCoords();
        const simCoords = multiplyMatrices(matrix, coords);
        const instance = inSRGB.setCoords(multiplyMatrices(matrix, simCoords));

        return new Color(instance.xyza, { originalString: this._originalString });
    }

    /**
     * Compares the current color object with another color string.
     *
     * @param other - The color string to compare with the current color object.
     * @returns Whether the two colors are equal.
     */
    equals(other: Color | string) {
        return this.to("xyz") === (typeof other === "string" ? Color.from(other) : other).to("xyz");
    }

    /**
     * Checks if the given value matches the pattern for the specified type.
     *
     * @param type - The type of pattern to validate against.
     * @returns Whether the value matches the pattern for the specified type.
     */
    isValid(type: Format | Space) {
        const color = this._originalString.toLowerCase().trim();
        return Color.patterns[type].test(color);
    }

    /**
     * Determines if a color string is a relative color format (e.g., rgb(from red r g b)).
     *
     * @returns True if the color is a relative color format, false otherwise
     */
    isRelative() {
        const color = this._originalString.toLowerCase().trim();
        return Color.patterns.relative.test(color);
    }

    /**
     * Determines if a color string is a color-mix() format (e.g., color-mix(in srgb, plum, red)).
     *
     * @returns True if the string is a valid color-mix() format, false otherwise
     */
    isColorMix() {
        const color = this._originalString.toLowerCase().trim();
        return Color.patterns["color-mix"].test(color);
    }

    /**
     * Checks if the current color is within the specified gamut.
     *
     * @param gamut - The color space to check against.
     * @param options - Optional parameters, including epsilon for tolerance.
     * @returns `true` if the color is within the gamut, `false` otherwise.
     */
    inGamut(gamut: Space, options: InGamutOptions = {}) {
        const { components, targetGamut } = _converters[gamut];
        const coords = this.in(gamut).getCoords();
        const epsilon = options.epsilon ?? 1e-5;

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
