import {
    colorFunctionConverters,
    colorTypes,
    namedColors,
    colorSpaceConverters,
    colorFunctions,
} from "./converters.js";
import { EASINGS, fit } from "./utils.js";
import type {
    ComponentDefinition,
    Component,
    Interface,
    MixOptions,
    EvaluateAccessibilityOptions,
    ColorFunction,
    ColorType,
    OutputType,
    FormattingOptions,
    NamedColor,
    ColorSpace,
    FitMethod,
    ColorFunctionConverter,
} from "./types.js";

/**
 * The `Color` class represents a dynamic CSS color object, allowing for the manipulation
 * and retrieval of colors in various formats (e.g., RGB, HEX, HSL).
 */
export class Color<M extends ColorFunction> {
    model: ColorFunction = "rgb";
    coords: number[] = [0, 0, 0, 1];

    constructor(model: M, coords: number[] | Partial<Record<Component<M>, number>>) {
        if (!(model in colorFunctions)) {
            throw new Error(`Unsupported color model: ${model}`);
        }

        if (
            Array.isArray(coords) &&
            coords.every((c) => typeof c !== "number" && !Number.isNaN(c) && c !== Infinity && c !== -Infinity)
        ) {
            this.model = model;
            this.coords = coords.slice(0, 4);
        } else if (Array.isArray(coords)) {
            const newCoords = coords.slice(0, 3).map((c, i) => {
                const { components } = colorFunctionConverters[model];
                const indexToComponent = Object.values(components).reduce(
                    (map: { [index: number]: ComponentDefinition }, def) => {
                        map[def.index] = def;
                        return map;
                    },
                    {} as { [index: number]: ComponentDefinition }
                );

                const { value } = indexToComponent[i];
                if (!value) return 0;

                if (typeof c !== "number") {
                    throw new Error(`Invalid coordinate value: ${c}`);
                }

                const [min, max] = Array.isArray(value) ? value : value === "hue" ? [0, 360] : [0, 100];

                if (Number.isNaN(c)) return 0;
                if (c === Infinity) return max;
                if (c === -Infinity) return min;

                return c;
            });

            this.model = model;
            this.coords = [...newCoords, coords[3] ?? 1];
        } else if (typeof coords === "object") {
            const { components } = colorFunctionConverters[model];

            const coordsArray = Object.entries(components)
                .map(([comp, def]) => {
                    let value: number;
                    if (comp === "alpha") {
                        value = coords[comp] ?? 1;
                    } else if (comp in coords) {
                        const coordValue = coords[comp as keyof typeof coords];
                        if (typeof coordValue !== "number") {
                            throw new Error(`Invalid coordinate value for ${comp}: ${coordValue}`);
                        }
                        value = coordValue;
                    } else {
                        value = def.value[0];
                    }

                    return { index: def.index, value };
                })
                .sort((a, b) => a.index - b.index)
                .map((item) => item.value);

            this.model = model;
            this.coords = coordsArray;
        } else {
            throw new Error(`Invalid coordinates: ${coords}. Expected an array or object.`);
        }

        return this;
    }

    /**
     * Creates a new `Color` instance from a given color string.
     *
     * @param color - The color string to convert.
     * @returns A new `Color` instance.
     */
    static from(color: NamedColor): Color<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    static from(color: string): Color<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    static from(color: NamedColor | string) {
        for (const type in colorTypes) {
            const colorType = colorTypes[type as keyof typeof colorTypes];
            if (colorType.isValid(color)) {
                if (type in colorFunctions) {
                    const result = new Color(type as ColorFunction, colorType.parse(color));
                    return result;
                }

                const { bridge, toBridge, parse } = colorType;
                const coords = toBridge(parse(color));
                const result = new Color(bridge as ColorFunction, coords);
                return result;
            }
        }

        throw new Error(`Unsupported or invalid color format: ${color}`);
    }

    /**
     * Determines the type of a given color string.
     *
     * @param color - The color string to analyze.
     * @returns The color type if recognized, or `undefined` if not.
     */
    static type(color: string): ColorType | undefined {
        for (const type in colorTypes) {
            const colorType = colorTypes[type as ColorType];
            if (colorType.isValid(color)) return type as ColorType;
        }
        return undefined;
    }

    /**
     * Generates a random color in the specified format or space.
     * If no type is provided, a random format or space is chosen.
     *
     * @param type - The desired color format. If omitted, a random format or space is selected.
     * @returns A random color string in the specified format or space.
     */
    static random(type?: string): string; // eslint-disable-line no-unused-vars
    static random(type?: OutputType): string; // eslint-disable-line no-unused-vars
    static random(type?: OutputType | string) {
        if (!type) {
            const types = Object.entries(colorTypes)
                .filter(([, t]) => "fromBridge" in t)
                .map(([key]) => key);
            type = types[Math.floor(Math.random() * types.length)];
        }

        if (type === "named-color") {
            return Object.keys(namedColors)[Math.floor(Math.random() * Object.keys(namedColors).length)];
        }

        const randomChannel = () => Math.floor(Math.random() * 200 + 30);
        const randomColor = new Color("rgb", [randomChannel(), randomChannel(), randomChannel()]);
        return randomColor.to(type);
    }

    /**
     * Returns an array of supported output color types.
     *
     * @returns An array of supported output type names.
     */
    static getSupportedOutputTypes() {
        return Object.keys(colorTypes).filter(
            (key) => typeof (colorTypes as any)[key]?.fromBridge === "function" // eslint-disable-line @typescript-eslint/no-explicit-any
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
     * Converts the current color to the specified format.
     *
     * @param format - The target color format.
     * @param options - Formatting options.
     * @returns The color in the specified format.
     */
    to(type: string, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(type: OutputType, options?: FormattingOptions): string; // eslint-disable-line no-unused-vars
    to(type: OutputType | string, options: FormattingOptions = {}) {
        const { legacy = false, fit = "clip", precision = undefined, units = false } = options;
        const converter = colorTypes[type as OutputType];

        if (!converter) throw new Error(`Unsupported color type: ${String(type)}.`);

        const { fromBridge, bridge, format } = converter;

        if (!fromBridge || !format) {
            throw new Error(`Invalid output type: ${String(type)}.`);
        }

        if (type === this.model) {
            return format(this.coords, { legacy, fit, precision, units });
        }

        const coords = this.in(bridge).getCoords();
        return format(fromBridge(coords), { legacy, fit, precision, units });
    }

    /**
     * Allows access to the raw values of the color in a specified model.
     *
     * @param model - The target color model.
     * @returns An object containing methods to get, set, and mix color components in the specified color model.
     */
    in<N extends ColorFunction>(model: N): Interface<N>; // eslint-disable-line no-unused-vars
    in(model: string): Interface<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    in<N extends ColorFunction>(model: string | N): Interface<N> {
        const converter = colorFunctionConverters[model as N];
        const { components } = converter as unknown as Record<
            string,
            Record<Component<N> | "alpha", ComponentDefinition>
        >;
        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        const get = (fitMethod: FitMethod = "none") => {
            const coords = getCoords();

            // eslint-disable-next-line no-unused-vars
            const result: { [key in Component<N> | "alpha"]: number } = {} as {
                [key in Component<N> | "alpha"]: number; // eslint-disable-line no-unused-vars
            };

            for (const [comp, { index }] of Object.entries(components)) {
                if (fitMethod) {
                    const clipped = fit(coords.slice(0, 3), { model: model as N, method: fitMethod });
                    result[comp as Component<N>] = clipped[index];
                } else {
                    result[comp as Component<N>] = coords[index];
                }
            }

            result.alpha = this.coords[3];

            return result;
        };

        const getCoords = (fitMethod: FitMethod = "none") => {
            const current = this.model;
            const currentCoords = this.coords;

            const converters = { ...colorFunctionConverters, ...colorSpaceConverters };

            let value = currentCoords;

            if (model === current) {
                value = currentCoords.slice(0, 3);
            } else {
                const buildGraph = () => {
                    const graph: { [key: string]: string[] } = {};

                    for (const [modelName, conv] of Object.entries(converters)) {
                        if (!graph[modelName]) graph[modelName] = [];

                        if ((conv as ColorFunctionConverter).toBridge && conv.bridge) {
                            graph[modelName].push(conv.bridge);
                            graph[conv.bridge] = graph[conv.bridge] || [];
                        }

                        if ((conv as ColorFunctionConverter).fromBridge && conv.bridge) {
                            graph[conv.bridge] = graph[conv.bridge] || [];
                            graph[conv.bridge].push(modelName);
                        }
                    }

                    return graph;
                };

                const graph = buildGraph();

                const findPath = (start: string, end: string) => {
                    const visited = new Set();
                    const queue = [[start]];

                    while (queue.length > 0) {
                        const path = queue.shift() as string[];
                        const node = path[path.length - 1];

                        if (node === end) {
                            return path;
                        }

                        if (!visited.has(node)) {
                            visited.add(node);
                            (graph[node] || []).forEach((neighbor) => {
                                queue.push([...path, neighbor]);
                            });
                        }
                    }

                    return null;
                };

                const path = findPath(current, model);

                if (!path) {
                    throw new Error(`Cannot convert from ${current} to ${model}. No path found.`);
                }

                for (let i = 0; i < path.length - 1; i++) {
                    const from = path[i];
                    const to = path[i + 1];

                    const conv = converters[from as keyof typeof converters] as ColorFunctionConverter;
                    const toConv = converters[to as keyof typeof converters] as ColorFunctionConverter;

                    if (conv.toBridge && conv.bridge === to) {
                        value = conv.toBridge(value);
                    } else if (toConv?.fromBridge && toConv.bridge === from) {
                        value = toConv.fromBridge(value);
                    } else {
                        throw new Error(`No conversion found between ${from} and ${to}`);
                    }
                }
            }

            if (fitMethod) {
                const clipped = fit(value.slice(0, 3), { model: model as N, method: fitMethod });
                return [...clipped, this.coords[3]];
            }

            return [...value.slice(0, 3), this.coords[3]];
        };

        const set = (
            values: // eslint-disable-next-line no-unused-vars
            | Partial<{ [K in Component<N> | "alpha"]: number | ((prev: number) => number) }>
                // eslint-disable-next-line no-unused-vars
                | ((components: { [K in Component<N> | "alpha"]: number }) => Partial<{
                      // eslint-disable-next-line no-unused-vars
                      [K in Component<N> | "alpha"]?: number;
                  }>)
        ) => {
            const coords = getCoords();
            const compNames = Object.keys(components) as (Component<N> | "alpha")[];

            let newAlpha = this.coords[3];

            if (typeof values === "function") {
                const currentComponents = {} as { [K in Component<N> | "alpha"]: number }; // eslint-disable-line no-unused-vars
                compNames.forEach((comp) => {
                    const { index } = components[comp as keyof typeof components] as ComponentDefinition;
                    currentComponents[comp] = coords[index];
                });
                values = values(currentComponents);
            }

            compNames.forEach((comp) => {
                if (comp in values) {
                    const { index, value } = components[comp as keyof typeof components] as ComponentDefinition;
                    const currentValue = coords[index];
                    const valueOrFunc = values[comp];
                    let newValue = typeof valueOrFunc === "function" ? valueOrFunc(currentValue) : valueOrFunc;

                    if (typeof newValue === "number") {
                        const [min, max] = Array.isArray(value) ? value : value === "hue" ? [0, 360] : [0, 100];
                        if (Number.isNaN(newValue)) {
                            newValue = 0;
                        } else if (newValue === Infinity) {
                            newValue = max;
                        } else if (newValue === -Infinity) {
                            newValue = min;
                        }
                    }

                    if (comp === "alpha") {
                        newAlpha = newValue as number;
                    } else {
                        coords[index] = newValue as number;
                    }
                }
            });

            console.log({ coords });

            return new Color(model as N, [...coords.slice(0, 3), newAlpha]);
        };

        const setCoords = (newCoords: (number | undefined)[]) => {
            const baseCoords = getCoords();
            const indexToComponent = Object.values(components).reduce(
                (map: { [index: number]: ComponentDefinition }, def) => {
                    map[def.index] = def;
                    return map;
                },
                {} as { [index: number]: ComponentDefinition }
            );

            const adjustedCoords = baseCoords.map((current, index) => {
                const incoming = newCoords[index];
                const { value } = indexToComponent[index];
                if (!value) return current;

                if (typeof incoming !== "number") return current;

                const [min, max] = Array.isArray(value) ? value : value === "hue" ? [0, 360] : [0, 100];

                if (Number.isNaN(incoming)) return 0;
                if (incoming === Infinity) return max;
                if (incoming === -Infinity) return min;

                return incoming;
            });

            return new Color(model as N, [...adjustedCoords.slice(0, 3), this.coords[3]]);
        };

        const mix = (other: Color<N> | string, options: MixOptions = {}) => {
            const interpolateHue = (from: number, to: number, t: number, method: string) => {
                const deltaHue = (a: number, b: number) => {
                    const d = (((b - a) % 360) + 360) % 360;
                    return d > 180 ? d - 360 : d;
                };

                const deltaHueLong = (a: number, b: number) => {
                    const short = deltaHue(a, b);
                    return short >= 0 ? short - 360 : short + 360;
                };

                let mixed: number;

                switch (method) {
                    case "shorter":
                        mixed = from + t * deltaHue(from, to);
                        break;
                    case "longer":
                        mixed = from + t * deltaHueLong(from, to);
                        break;
                    case "increasing":
                        mixed = from * (1 - t) + (to < from ? to + 360 : to) * t;
                        break;
                    case "decreasing":
                        mixed = from * (1 - t) + (to > from ? to - 360 : to) * t;
                        break;
                    default:
                        throw new Error("Invalid hue interpolation method");
                }

                return ((mixed % 360) + 360) % 360;
            };

            const { hue = "shorter", amount = 0.5, easing = "linear", gamma = 1.0 } = options;

            const t = 1 - Math.max(0, Math.min(amount, 1));
            const easedT = (typeof easing === "function" ? easing : EASINGS[easing])(t);
            const gammaCorrectedT = Math.pow(easedT, 1 / gamma);

            const thisCoords = getCoords().slice(0, 3);
            const otherColor = typeof other === "string" ? Color.from(other) : other;
            const otherCoords = otherColor.in(model).getCoords().slice(0, 3);

            const thisAlpha = this.coords[3];
            const otherAlpha = otherColor.coords[3];

            const hueIndex = Object.entries(components).find(([k]) => k === "h")?.[1].index;

            if (amount === 0) {
                return setCoords([...thisCoords, thisAlpha]);
            } else if (amount === 1) {
                return setCoords([...otherCoords, otherAlpha]);
            } else if (thisAlpha < 1 || otherAlpha < 1) {
                const premixed = thisCoords.map((start, index) => {
                    const end = otherCoords[index];

                    if (index === hueIndex) {
                        return interpolateHue(start, end, gammaCorrectedT, hue);
                    }

                    const premultA = start * thisAlpha;
                    const premultB = end * otherAlpha;
                    return premultA * gammaCorrectedT + premultB * (1 - gammaCorrectedT);
                });

                const mixedAlpha = thisAlpha * gammaCorrectedT + otherAlpha * (1 - gammaCorrectedT);

                const mixed =
                    mixedAlpha > 0
                        ? premixed.map((c, i) => (i === hueIndex ? c : c / mixedAlpha))
                        : thisCoords.map((_, i) => (i === hueIndex ? premixed[i] : 0));

                return setCoords([...mixed, mixedAlpha]);
            } else {
                const mixedCoords = thisCoords.map((start, index) => {
                    const compEntry = Object.entries(components).find(([, def]) => def.index === index);
                    if (!compEntry) return start;

                    const [key] = compEntry;
                    const end = otherCoords[index];

                    if (key === "h") {
                        return interpolateHue(start, end, gammaCorrectedT, hue);
                    }

                    return start + (end - start) * gammaCorrectedT;
                });

                return setCoords([...mixedCoords, 1]);
            }
        };

        return { get, getCoords, set, setCoords, mix };
    }

    // eslint-disable-next-line no-unused-vars
    get(fitMethod: FitMethod = "none"): { [key in Component<M>]: number } {
        return this.in(this.model).get(fitMethod) as { [key in Component<M>]: number }; // eslint-disable-line no-unused-vars
    }

    getCoords(fitMethod: FitMethod = "none") {
        return this.in(this.model).getCoords(fitMethod);
    }

    set(
        values: // eslint-disable-next-line no-unused-vars
        | Partial<{ [K in Component<M> | "alpha"]: number | ((prev: number) => number) }>
            // eslint-disable-next-line no-unused-vars
            | ((components: { [K in Component<M> | "alpha"]: number }) => Partial<{
                  // eslint-disable-next-line no-unused-vars
                  [K in Component<M> | "alpha"]?: number;
              }>)
    ): Color<M> {
        return this.in(this.model).set(
            // eslint-disable-next-line no-unused-vars
            values as Partial<{ [K in Component<M> | "alpha"]: number | ((prev: number) => number) }>
        ) as Color<M>;
    }

    setCoords(newCoords: (number | undefined)[]): Color<M> {
        return this.in(this.model).setCoords(newCoords) as Color<M>;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mix(other: Color<any> | string, options: MixOptions = {}): Color<M> {
        const otherColor = typeof other === "string" ? Color.from(other) : other;
        return this.in(this.model).mix(otherColor as Color<any>, options) as Color<M>; // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    /**
     * Calculates the luminance of the color.
     *
     * @param space - The color space to use for luminance calculation. Can be "xyz" (default) or "oklab".
     * @returns The luminance value of the color, a number between 0 and 1.
     */
    luminance(space: "xyz" | "oklab" = "xyz"): number {
        switch (space) {
            case "xyz": {
                const [, Y] = this.in("xyz").getCoords();
                return Y;
            }
            case "oklab": {
                const [L] = this.in("oklab").getCoords();
                return L;
            }
            default:
                throw new Error(`Invalid color space for luminance: must be 'xyz' or 'oklab'.`);
        }
    }

    /**
     * Calculates the contrast ratio between the current color and a given color.
     *
     * @param other - The color to compare against (as a Color instance or string).
     * @param algorithm - The contrast algorithm to use: "wcag21" (default), "apca", or "oklab".
     *                  - "wcag21": Uses WCAG 2.1 contrast ratio (1 to 21). Limited by sRGB assumptions and poor hue handling.
     *                  - "apca": Uses APCA-W3 (Lc 0 to ~100), better for perceptual accuracy. See https://git.myndex.com.
     *                  - "oklab": Uses lightness difference in OKLab (0 to 1) for perceptual uniformity.
     *                  Note: WCAG 2.1 is standard but limited; consider APCA or OKLab for modern displays and test visually.
     * @returns The contrast value:
     *          - "wcag21": Ratio from 1 to 21.
     *          - "apca": Lc value (positive for light text on dark background, negative for dark text).
     *          - "oklab": Lightness difference (0 to 1).
     * @throws If the algorithm is invalid.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contrast(other: Color<any> | string, algorithm: "wcag21" | "apca" | "oklab" = "wcag21"): number {
        const otherColor = typeof other === "string" ? Color.from(other) : other;

        if (algorithm === "wcag21") {
            const L_bg = otherColor.luminance();
            const L_text = this.luminance();
            return (Math.max(L_text, L_bg) + 0.05) / (Math.min(L_text, L_bg) + 0.05);
        } else if (algorithm === "oklab") {
            const oklab1 = this.in("oklab").getCoords();
            const oklab2 = otherColor.in("oklab").getCoords();
            return Math.abs(oklab1[0] - oklab2[0]);
        } else if (algorithm === "apca") {
            const L_text = this.luminance();
            const L_bg = otherColor.luminance();

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
     * @param other - The other color to evaluate against (as a Color instance or string).
     * @param options - Optional settings to customize the evaluation.
     * @returns An object with accessibility status, contrast, required contrast, and helpful info.
     * @throws If the algorithm, level, or font parameters are invalid.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessibility(other: Color<any> | string, options: EvaluateAccessibilityOptions = {}) {
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
        const otherColor = typeof other === "string" ? Color.from(other) : other;

        const contrast = this.contrast(otherColor, algorithm);
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
                if (fontSize >= 24) {
                    requiredContrast = level === "AA" ? 75 : 90;
                } else if (fontSize >= 18) {
                    requiredContrast = fontWeight >= 700 ? (level === "AA" ? 75 : 90) : level === "AA" ? 90 : 105;
                } else if (fontSize >= 16) {
                    requiredContrast = level === "AA" ? 90 : 105;
                } else {
                    requiredContrast = level === "AA" ? 100 : 115;
                }
            } else {
                requiredContrast = level === "AA" ? 60 : 75;
            }
            wcagSuccessCriterion = "APCA (WCAG 3.0 draft)";
            message =
                Math.abs(contrast) >= requiredContrast
                    ? `APCA contrast ${Math.abs(contrast).toFixed(2)} meets level ${level} for ${type === "text" ? "text" : "non-text"} elements.`
                    : `APCA contrast ${Math.abs(contrast).toFixed(2)} fails level ${level} for ${type === "text" ? "text" : "non-text"} elements (needs at least ${requiredContrast}).`;
            return {
                passes: Math.abs(contrast) >= requiredContrast,
                contrast: Math.abs(contrast),
                requiredContrast,
                wcagSuccessCriterion,
                message,
            };
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

        const passes = Math.abs(contrast) >= requiredContrast;
        const impact = !passes
            ? algorithm === "wcag21" && level === "AAA"
                ? "minor"
                : type === "text" && (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700))
                  ? "moderate"
                  : "serious"
            : "none";

        return {
            passes,
            contrast: +Math.abs(contrast).toFixed(2),
            requiredContrast,
            level,
            fontSize: type === "text" ? fontSize : undefined,
            fontWeight: type === "text" ? fontWeight : undefined,
            textColor: this as Color<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
            otherColor,
            wcagSuccessCriterion,
            impact,
            algorithm,
            message,
        };
    }

    /**
     * Calculates the color difference (ΔEOK) between the current color and another color using the OKLAB color space.
     *
     * @param other - The other color to compare against (as a Color instance or string).
     * @returns The ΔEOK value (a non-negative number; smaller indicates more similar colors).
     *
     * @remarks
     * This method uses the Euclidean distance in OKLAB color space, scaled to approximate a Just Noticeable Difference (JND) of ~2.
     * OKLAB's perceptual uniformity allows for a straightforward distance calculation without additional weighting.
     * The result is normalized by a factor of 100 to align with OKLAB's L range (0-1) and approximate the JND scale.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deltaEOK(other: Color<any> | string) {
        const [L1, a1, b1] = this.in("oklab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("oklab").getCoords();

        const ΔL = L1 - L2;
        const Δa = a1 - a2;
        const Δb = b1 - b2;
        const distance = Math.sqrt(ΔL ** 2 + Δa ** 2 + Δb ** 2);

        return distance * 100;
    }

    /**
     * Calculates the color difference (ΔE) between two colors using the CIE76 formula.
     * This is a simple Euclidean distance in LAB color space.
     *
     * @param other - The other color to compare against (as a Color instance or string).
     * @returns The ΔE76 value — a non-negative number where smaller values indicate more similar colors.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deltaE76(other: Color<any> | string) {
        const [L1, a1, b1] = this.in("lab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").getCoords();

        const ΔL = L1 - L2;
        const ΔA = a1 - a2;
        const ΔB = b1 - b2;

        return Math.sqrt(ΔL * ΔL + ΔA * ΔA + ΔB * ΔB);
    }

    /**
     * Calculates the color difference (ΔE) between two colors using the CIE94 formula.
     * This method improves perceptual accuracy over CIE76 by applying weighting factors.
     *
     * @param other - The other color to compare against (as a Color instance or string).
     * @returns The ΔE94 value — a non-negative number where smaller values indicate more similar colors.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deltaE94(other: Color<any> | string): number {
        const [L1, a1, b1] = this.in("lab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").getCoords();

        const ΔL = L1 - L2;
        const ΔA = a1 - a2;
        const ΔB = b1 - b2;

        const C1 = Math.sqrt(a1 * a1 + b1 * b1);
        const C2 = Math.sqrt(a2 * a2 + b2 * b2);
        const ΔC = C1 - C2;
        const ΔH = Math.sqrt(Math.max(0, ΔA * ΔA + ΔB * ΔB - ΔC * ΔC));

        const kL = 1,
            kC = 1,
            kH = 1;
        const K1 = 0.045,
            K2 = 0.015;

        const sC = 1 + K1 * C1;
        const sH = 1 + K2 * C1;

        return Math.sqrt((ΔL / kL) ** 2 + (ΔC / (kC * sC)) ** 2 + (ΔH / (kH * sH)) ** 2);
    }

    /**
     * Calculates the color difference (ΔE) between two colors using the CIEDE2000 formula.
     * This is the most perceptually accurate method, accounting for interactions between hue, chroma, and lightness.
     *
     * @param other - The other color to compare against (as a Color instance or string).
     * @returns The ΔE2000 value — a non-negative number where smaller values indicate more similar colors.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deltaE2000(other: Color<any> | string): number {
        const [L1, a1, b1] = this.in("lab").getCoords();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").getCoords();

        const π = Math.PI,
            d2r = π / 180,
            r2d = 180 / π;

        const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
        const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
        const Cbar = (C1 + C2) / 2;

        const Gfactor = Math.pow(25, 7);
        const C7 = Math.pow(Cbar, 7);
        const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + Gfactor)));

        const adash1 = (1 + G) * a1;
        const adash2 = (1 + G) * a2;

        const Cdash1 = Math.sqrt(adash1 ** 2 + b1 ** 2);
        const Cdash2 = Math.sqrt(adash2 ** 2 + b2 ** 2);

        let h1 = Math.atan2(b1, adash1);
        let h2 = Math.atan2(b2, adash2);
        if (h1 < 0) h1 += 2 * π;
        if (h2 < 0) h2 += 2 * π;
        h1 *= r2d;
        h2 *= r2d;

        const ΔL = L2 - L1;
        const ΔC = Cdash2 - Cdash1;

        const hdiff = h2 - h1;
        const habs = Math.abs(hdiff);
        let Δh = 0;
        if (Cdash1 * Cdash2 !== 0) {
            if (habs <= 180) Δh = hdiff;
            else if (hdiff > 180) Δh = hdiff - 360;
            else Δh = hdiff + 360;
        }
        const ΔH = 2 * Math.sqrt(Cdash1 * Cdash2) * Math.sin((Δh * d2r) / 2);

        const Ldash = (L1 + L2) / 2;
        const Cdash = (Cdash1 + Cdash2) / 2;
        const Cdash7 = Math.pow(Cdash, 7);

        const hsum = h1 + h2;
        let hdash = 0;
        if (Cdash1 === 0 && Cdash2 === 0) {
            hdash = hsum;
        } else if (habs <= 180) {
            hdash = hsum / 2;
        } else if (hsum < 360) {
            hdash = (hsum + 360) / 2;
        } else {
            hdash = (hsum - 360) / 2;
        }

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

    /**
     * Compares the current color object with another color string or Color object.
     *
     * @param other - The other color to compare against (as a Color instance or string).
     * @param epsilon - Tolerance for floating point comparison. Defaults to 1e-5.
     * @returns Whether the two colors are equal within the given epsilon.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    equals(other: Color<any> | string, epsilon = 1e-5): boolean {
        const otherColor = typeof other === "string" ? Color.from(other) : other;

        if (otherColor.model !== this.model) {
            return this.coords.every((value, i) => Math.abs(value - otherColor.coords[i]) <= epsilon);
        }

        const thisXyz = this.in("xyz").getCoords();
        const otherXyz = otherColor.in("xyz").getCoords();
        return thisXyz.every((value, i) => Math.abs(value - otherXyz[i]) <= epsilon);
    }

    /**
     * Checks if the current color is within the specified gamut.
     *
     * @param gamut - The color space to check against.
     * @param epsilon - Tolerance for floating point comparison. Defaults to 1e-5.
     * @returns `true` if the color is within the gamut, `false` otherwise.
     */
    inGamut(gamut: ColorSpace, epsilon = 1e-5) {
        if (!(gamut in colorSpaceConverters)) {
            throw new Error(`Unsupported color gamut: ${gamut}.`);
        }
        const { components, targetGamut } = colorFunctionConverters[gamut];

        if (targetGamut === null) return true;

        const coords = this.in(gamut).getCoords();

        for (const [, props] of Object.entries(components)) {
            const value = coords[props.index];
            const [min, max] = Array.isArray(props.value) ? props.value : props.value === "hue" ? [0, 360] : [0, 100];
            if (value < min - epsilon || value > max + epsilon) {
                return false;
            }
        }

        return true;
    }
}
