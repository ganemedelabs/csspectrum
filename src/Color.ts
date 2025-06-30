import { colorFunctionConverters, colorTypes, namedColors, colorSpaceConverters, colorBases } from "./converters";
import { EASINGS, interpolateComponents, fit, functionConverterFromSpaceConverter } from "./utils";
import type {
    XYZ,
    ComponentDefinition,
    Component,
    Interface,
    InterfaceWithSetOnly,
    InGamutOptions,
    GetOptions,
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
    EqualsOptions,
    ColorConverter,
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
    /** The color represented as an XYZ tuple, with the last value being alpha (opacity). */
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
     * @throws If the color format is unsupported.
     */
    static type(color: string): ColorType | undefined {
        for (const type in colorTypes) {
            const colorType = colorTypes[type as ColorType];
            if (colorType.isValid(color)) return type as ColorType;
        }
        return undefined;
    }

    /**
     * Registers a new `<named-color>` with the specified RGB value.
     *
     * @param name - The name to register for the color.
     * @param rgb - The RGB tuple representing the color, as an array of three numbers [red, green, blue].
     * @throws If the color name is already registered.
     * @throws If the RGB value is already registered under a different name.
     */
    static registerNamedColor(name: string, rgb: [number, number, number]) {
        const cleanedName = name.replace(/(?:\s+|-)/g, "").toLowerCase();

        const colorMap = namedColors as Record<NamedColor, [number, number, number]>;

        if (colorMap[cleanedName as NamedColor]) {
            throw new Error(`<named-color> "${name}" is already registered.`);
        }

        const existingName = Object.entries(colorMap).find(([, value]) =>
            value.every((channel, i) => channel === rgb[i])
        )?.[0];

        if (existingName) {
            throw new Error(`RGB value [${rgb.join(", ")}] is already registered as "${existingName}".`);
        }

        colorMap[cleanedName as NamedColor] = rgb;
    }

    /**
     * Registers a new `<color-function>` converter under the specified name.
     *
     * @param name - The unique name to associate with the color function converter.
     * @param converter - The converter object implementing the color function conversion logic.
     * @throws If a color function name is already used.
     */
    static registerColorFunction(name: string, converter: ColorFunctionConverter) {
        const obj = colorFunctionConverters as unknown as Record<string, ColorFunctionConverter>;

        if (name in colorTypes) {
            throw new Error(`The name "${name}" is already used.`);
        }

        obj[name] = converter;
    }

    /**
     * Registers a new color space converter for `<color()>` function under the specified name.
     *
     * @param name - The unique name to associate with the color space converter.
     * @param converter - The converter object implementing the color space conversion logic.
     * @throws If a color space name is already used.
     */
    static registerColorSpace(name: string, converter: ColorSpaceConverter) {
        const obj = colorSpaceConverters as unknown as Record<string, ColorFunctionConverter>;

        if (name in colorTypes) {
            throw new Error(`The name "${name}" is already used.`);
        }

        obj[name] = functionConverterFromSpaceConverter(name, converter);
    }

    /**
     * Registers a new `<color-base>` converter under the specified name.
     *
     * @param name - The unique name to associate with the color base converter.
     * @param converter - The converter object implementing the color base conversion logic.
     * @throws If a color base name is already used.
     */
    static registerColorBase(name: string, converter: ColorConverter) {
        const obj = colorBases as unknown as Record<string, ColorConverter>;

        if (name in colorTypes) {
            throw new Error(`The name "${name}" is already used.`);
        }

        obj[name] = converter;
    }

    /**
     * Registers a new `<color>` converter under the specified name.
     *
     * @param name - The unique name to associate with the color converter.
     * @param converter - The converter object implementing the color conversion logic.
     * @throws If a color name is already used.
     */
    static registerColorType(name: string, converter: ColorConverter) {
        const obj = colorTypes as unknown as Record<string, ColorConverter>;

        if (name in colorTypes) {
            throw new Error(`The name "${name}" is already used.`);
        }

        obj[name] = converter;
    }

    /**
     * Returns an array of supported output color types.
     *
     * @returns An array of supported output type names.
     */
    static getSupportedOutputTypes() {
        return Object.keys(colorTypes).filter(
            (key) => typeof (colorTypes as any)[key]?.fromXYZ === "function" // eslint-disable-line @typescript-eslint/no-explicit-any
        ) as OutputType[];
    }

    /**
     * Returns an array of all supported color types.
     *
     * @returns An array of supported color types.
     */
    static getSupportedColorTypes() {
        return Array.from(Object.keys(colorTypes)) as ColorType[];
    }

    /**
     * Generates a random color in the specified format or space.
     * If no type is provided, a random format or space is chosen.
     *
     * @param type - The desired color format. If omitted, a random format or space is selected.
     * @returns A random color string in the specified format or space.
     */
    static random(type?: string): string; // eslint-disable-line no-unused-vars
    static random(type?: ColorFunction): string; // eslint-disable-line no-unused-vars
    static random(type?: ColorFunction | string) {
        if (!type) {
            const types = Object.keys(colorTypes).concat(Object.keys(colorSpaceConverters));
            type = types[Math.floor(Math.random() * types.length)];
        }

        if (type === "named") {
            return Object.keys(namedColors)[Math.floor(Math.random() * Object.keys(namedColors).length)];
        }

        const randomChannel = () => Math.floor(Math.random() * 200 + 30);
        const randomColor = this.in("rgb").setCoords([randomChannel(), randomChannel(), randomChannel()]);
        return randomColor.to(type);
    }

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
                    const { index, min, max } = components[comp as keyof typeof components] as ComponentDefinition;
                    const currentValue = coords[index];
                    const valueOrFunc = values[comp];
                    let newValue = typeof valueOrFunc === "function" ? valueOrFunc(currentValue) : valueOrFunc;

                    if (typeof newValue === "number") {
                        if (Number.isNaN(newValue)) {
                            newValue = 0;
                        } else if (newValue === Infinity) {
                            newValue = max;
                        } else if (newValue === -Infinity) {
                            newValue = min;
                        }
                    }

                    coords[index] = newValue as number;
                }
            });

            this.xyz = converter.toXYZ(coords);
            return Object.assign(this, { ...this.in(model) }) as typeof this & Interface<M>;
        };

        const setCoords = (coords: number[]) => {
            const indexToComponent = Object.values(components).reduce(
                (map, def) => {
                    map[def.index] = def;
                    return map;
                },
                {} as { [index: number]: ComponentDefinition }
            );

            const adjustedCoords = coords.map((value, index) => {
                const compDef = indexToComponent[index];
                if (!compDef) return value;

                const { min, max } = compDef;

                if (Number.isNaN(value)) return 0;
                if (value === Infinity) return max;
                if (value === -Infinity) return min;
                return value;
            });

            this.xyz = converter.toXYZ(adjustedCoords);
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
     * @throws if the algorithm or background is invalid.
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
     * @throws if the algorithm, background, level, or font parameters are invalid.
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
     * @throws If an unsupported method is specified.
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
     * Compares the current color object with another color string or Color object.
     *
     * @param other - The color string or Color object to compare with the current color object.
     * @param options - Optional comparison settings.
     * @param options.epsilon - Tolerance for floating point comparison. Defaults to 1e-5.
     * @returns Whether the two colors are equal within the given epsilon.
     */
    equals(other: Color | string, options: EqualsOptions = {}): boolean {
        const { epsilon = 1e-5 } = options;
        const otherColor = typeof other === "string" ? Color.from(other) : other;

        return (
            this.xyz.length === otherColor.xyz.length &&
            this.xyz.every((value, i) => Math.abs(value - otherColor.xyz[i]) <= epsilon)
        );
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
