import { colorModels, colorTypes, colorSpaces } from "./converters.js";
import { cache, clean, fit } from "./utils.js";
import type {
    ComponentDefinition,
    Component,
    MixOptions,
    ColorType,
    OutputType,
    FormattingOptions,
    NamedColor,
    ColorSpace,
    FitMethod,
    ColorModelConverter,
    ColorModel,
    RandomOptions,
    GetOptions,
} from "./types.js";
import { EASINGS } from "./math.js";

/**
 * The `Color` class represents a dynamic CSS color object, allowing for the manipulation
 * and retrieval of colors in various formats (e.g., RGB, HEX, HSL).
 */
export class Color<M extends ColorModel = ColorModel> {
    model: M;
    coords: number[];

    constructor(model: M, coords: number[] = [0, 0, 0, 0]) {
        if (!(model in colorModels)) {
            throw new Error(`Unsupported color model: '${model}'`);
        }

        if (coords.length < 3 || coords.length > 4) {
            throw new Error("Coordinates array must have 3 or 4 elements.");
        }

        const normalized = coords.slice();

        if (normalized.length === 3) {
            normalized.push(1);
        }

        this.model = model;
        this.coords = normalized;
    }

    /**
     * Creates a new `Color` instance from a given color string.
     *
     * @param color - The color string to convert.
     * @returns A new `Color` instance.
     */
    /* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */
    static from(color: NamedColor): Color<"rgb">;
    static from(color: string): Color<any>;
    static from<T extends ColorModel = ColorModel>(color: string): Color<T>;
    static from<T extends ColorModel = ColorModel>(color: NamedColor | string): Color<T | any> {
        /* eslint-enable no-unused-vars, @typescript-eslint/no-explicit-any */
        const cleaned = clean(color);

        for (const type in colorTypes) {
            const { parse, bridge, toBridge, isValid } = colorTypes[type as ColorModel];

            if (isValid(cleaned)) {
                const parsed = parse(cleaned);

                if (type in colorModels) return new Color(type as T, parsed);

                return new Color(bridge as T, toBridge(parsed));
            }
        }

        throw new Error(`Unsupported or invalid color format: '${color}'`);
    }

    /**
     * Determines the type of a given color string.
     *
     * @param color - The color string to analyze.
     * @returns The color type if recognized, or `undefined` if not.
     */
    static type(color: string, strict = false): ColorType | undefined {
        const cleaned = clean(color);

        for (const type in colorTypes) {
            const { isValid, bridge, parse, toBridge } = colorTypes[type as ColorType];

            if (isValid(cleaned)) {
                if (!strict) return type as ColorType;

                try {
                    const coords = toBridge(parse(cleaned));
                    const test = new Color(bridge as ColorModel, coords);
                    return typeof test === "object" ? (type as ColorType) : undefined;
                } catch {
                    return undefined;
                }
            }
        }

        return undefined;
    }

    /**
     * Checks if the provided color string is valid, optionally for a specific color type.
     *
     * @param color - The color string to validate.
     * @param type - (Optional) The color type to validate against.
     * @returns `true` if the color string is valid for the specified type (or any type if not specified), otherwise `false`.
     */
    static isValid(color: string, type?: ColorType): boolean; // eslint-disable-line no-unused-vars
    static isValid(color: string, type?: string): boolean; // eslint-disable-line no-unused-vars
    static isValid(color: string, type?: ColorType | string) {
        const cleanedType = type?.trim().toLowerCase();
        const cleanedColor = clean(color);

        try {
            if (cleanedType) {
                const { isValid, bridge, parse, toBridge } = colorTypes[cleanedType as ColorType];
                if (isValid(cleanedColor)) {
                    const coords = toBridge(parse(cleanedColor));
                    return typeof new Color(bridge as ColorModel, coords) === "object";
                } else return false;
            } else return typeof Color.from(cleanedColor) === "object";
        } catch {
            return false;
        }
    }

    /**
     * Generates a random `Color` instance using the specified options.
     *
     * @param options - Configuration for random color generation.
     * @returns A new `Color` instance with randomly generated components according to the specified options.
     * @throws If an invalid component is specified in options for the selected color model.
     */
    static random(options: RandomOptions = {}) {
        const modelNames = Object.keys(colorModels) as (keyof typeof colorModels)[];
        const { model = modelNames[Math.floor(Math.random() * modelNames.length)] } = options;
        const converter = colorModels[model];

        const validComponents = new Set([...Object.keys(converter.components), "alpha"]);

        for (const section of ["limits", "bias", "base", "deviation"] as const) {
            const record = options[section];
            if (!record) continue;

            for (const key of Object.keys(record)) {
                if (!validComponents.has(key)) {
                    throw new Error(
                        `Invalid component "${key}" for model "${model}". ` +
                            `Valid components are: ${Array.from(validComponents).join(", ")}`
                    );
                }
            }
        }

        const coords: number[] = [];

        for (const [name, comp] of Object.entries(converter.components)) {
            let value: number;

            if (options.base?.[name] != null && options.deviation?.[name] != null) {
                const base = options.base[name]!;
                const dev = options.deviation[name]!;
                const u = Math.random() || 1e-9;
                const v = Math.random() || 1e-9;
                const gaussian = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                value = base + gaussian * dev;
            } else {
                let min: number;
                let max: number;

                if (comp.value === "angle") {
                    min = 0;
                    max = 360;
                } else if (comp.value === "percentage") {
                    min = 0;
                    max = 100;
                } else {
                    [min, max] = comp.value;
                }

                if (options.limits?.[name]) {
                    const [limMin, limMax] = options.limits[name];
                    min = Math.max(min, limMin);
                    max = Math.min(max, limMax);
                }

                let r = Math.random();
                if (options.bias?.[name]) {
                    r = options.bias[name](r);
                }

                value = min + r * (max - min);
            }

            if (comp.value === "angle") {
                value = ((value % 360) + 360) % 360;
            } else if (comp.value === "percentage") {
                value = Math.min(100, Math.max(0, value));
            } else if (Array.isArray(comp.value)) {
                const [min, max] = comp.value;
                value = Math.min(max, Math.max(min, value));
            }

            coords[comp.index] = value;
        }

        return new Color(model, coords);
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
        const cleanedType = type.toLowerCase();

        const { legacy = false, fit = "clip", precision = undefined, units = false } = options;
        const converter = colorTypes[cleanedType as OutputType];

        if (!converter) throw new Error(`Unsupported color type: '${String(cleanedType)}'.`);

        const { fromBridge, bridge, format } = converter;

        if (!fromBridge || !format) {
            throw new Error(`Invalid output type: ${String(cleanedType)}.`);
        }

        if (cleanedType === this.model) {
            return format(this.coords, { legacy, fit, precision, units });
        }

        if (cleanedType in colorModels) {
            const coords = this.in(cleanedType).toArray();
            return format(coords, { legacy, fit, precision, units });
        }

        const coords = this.in(bridge).toArray();
        return format(fromBridge(coords), { legacy, fit, precision, units });
    }

    /**
     * Allows access to the raw values of the color in a specified model.
     *
     * @param model - The target color model.
     * @returns An object containing methods to get, set, and mix color components in the specified color model.
     */
    in<T extends ColorModel = ColorModel>(model: T): Color<T>; // eslint-disable-line no-unused-vars
    in(model: string): Color<any>; // eslint-disable-line no-unused-vars, @typescript-eslint/no-explicit-any
    in<T extends ColorModel = ColorModel>(model: string | T): Color<T> {
        const { model: currentModel, coords: currentCoords } = this;
        const targetModel = model.trim().toLowerCase();

        let value = currentCoords;

        if ((targetModel as string) !== currentModel) {
            const buildGraph = () => {
                const graph: Record<string, string[]> = {};

                for (const [modelName, convRaw] of Object.entries(colorModels)) {
                    const conv = convRaw as ColorModelConverter;
                    const { bridge } = conv;

                    if (!graph[modelName]) graph[modelName] = [];
                    graph[modelName].push(bridge);

                    if (!graph[bridge]) graph[bridge] = [];
                    graph[bridge].push(modelName);
                }

                return graph;
            };

            const findPath = (start: string, end: string) => {
                const cacheKey = `${start}-${end}`;
                if (pathsMap.has(cacheKey)) return pathsMap.get(cacheKey);

                const visited = new Set();
                const parent: Record<string, string | null> = {};
                const queue: string[] = [start];
                parent[start] = null;

                for (let i = 0; i < queue.length; i++) {
                    const node = queue[i];

                    if (node === end) {
                        const path: string[] = [];
                        for (let cur: string | null = end; cur; cur = parent[cur]) {
                            path.push(cur);
                        }
                        path.reverse();
                        pathsMap.set(cacheKey, path);
                        return path;
                    }

                    if (!visited.has(node)) {
                        visited.add(node);
                        for (const neighbor of graph[node] || []) {
                            if (!(neighbor in parent)) {
                                parent[neighbor] = node;
                                queue.push(neighbor);
                            }
                        }
                    }
                }

                return null;
            };

            let graph = cache.get("graph");
            let pathsMap = cache.get("paths");

            if (!graph) {
                graph = buildGraph();
                cache.set("graph", graph);
            }
            if (!pathsMap) {
                pathsMap = new Map();
                cache.set("paths", pathsMap);
            }

            const path = findPath(currentModel, targetModel);

            if (!path) {
                throw new Error(`Cannot convert from ${currentModel} to ${targetModel}. No path found.`);
            }

            for (let i = 0; i < path.length - 1; i++) {
                const from = path[i];
                const to = path[i + 1];

                const conv = colorModels[from as ColorModel] as ColorModelConverter;
                const toConv = colorModels[to as ColorModel] as ColorModelConverter;

                if (conv.toBridge && conv.bridge === to) {
                    value = conv.toBridge(value);
                } else if (toConv?.fromBridge && toConv.bridge === from) {
                    value = toConv.fromBridge(value);
                } else {
                    throw new Error(`No conversion found between ${from} and ${to}`);
                }
            }
        }

        return new Color(targetModel as T, [...value.slice(0, 3), currentCoords[3] ?? 1]);
    }

    /**
     * Formats the color as a string in its current color model.
     *
     * @param options - Formatting options.
     * @returns The color formatted as a string in its current model.
     */
    toString(options?: FormattingOptions) {
        return this.to(this.model, options);
    }

    /**
     * Converts the color instance to an object representation based on the specified options.
     *
     * @param options - Optional configuration for retrieving color coordinates.
     * @returns An object with keys for each color component and "alpha", mapped to their numeric values.
     * @throws If the color model does not have defined components.
     */
    toObject(options: GetOptions = {}) {
        const { model } = this;
        const coords = this.toArray(options);

        const { components } = colorModels[model] as unknown as Record<
            string,
            Record<Component<M> | "alpha", ComponentDefinition>
        >;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        // eslint-disable-next-line no-unused-vars
        const result: { [key in Component<M> | "alpha"]: number } = {} as {
            [key in Component<M> | "alpha"]: number; // eslint-disable-line no-unused-vars
        };

        for (const [comp, { index }] of Object.entries(components)) {
            result[comp as Component<M>] = coords[index];
        }

        result.alpha = coords[3];

        return result;
    }

    /**
     * Converts the color instance to an array representation, optionally normalizing and fitting the color components.
     *
     * @param options - Configuration options for conversion.
     * @returns An array containing the normalized color components and alpha value.
     * @throws If the color model does not have defined components.
     */
    toArray(options: GetOptions = {}) {
        const { fit: fitMethod = "none", precision } = options;
        const { model, coords } = this;

        const { components } = colorModels[model] as unknown as Record<
            string,
            Record<Component<M> | "alpha", ComponentDefinition>
        >;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        const normalized = coords.slice(0, 3).map((c, i) => {
            const componentProps: ComponentDefinition[] = [];
            for (const [, props] of Object.entries(components)) {
                componentProps[props.index] = props;
                componentProps[3] = { index: 3, value: [0, 1], precision: 3 };
            }

            const value = componentProps[i]?.value;
            const [min, max] = Array.isArray(value) ? value : value === "angle" ? [0, 360] : [0, 100];
            if (Number.isNaN(c)) return 0;
            if (c === Infinity) return max;
            if (c === -Infinity) return min;
            return typeof c === "number" ? c : 0;
        });

        if (fitMethod) {
            const clipped = fit(normalized.slice(0, 3), model, {
                method: fitMethod as FitMethod,
                precision: "precision" in options ? precision : null,
            });
            return [...clipped.slice(0, 3), coords[3]];
        }

        return [...normalized.slice(0, 3), coords[3]];
    }

    /**
     * Returns a new `Color` instance with updated color components.
     *
     * @param values - Either a partial object mapping component names to new values or updater functions,
     *                 or a function that receives the current components and returns a partial object of updated values.
     * @returns A new `Color` instance with the updated components.
     * @throws If the color model does not have defined components.
     *
     * @example
     * ```typescript
     * // Direct value update
     * set({ l: 50 }) // sets lightness to 50%
     *
     * // Using updater functions
     * set({ r: r => r * 2 }) // doubles the red component
     *
     * // Using a function that returns multiple updates
     * set(({ r, g, b }) => ({
     *   r: r * 0.393 + g * 0.769 + b * 0.189,
     *   g: r * 0.349 + g * 0.686 + b * 0.168,
     *   b: r * 0.272 + g * 0.534 + b * 0.131,
     * })) // applies a sepia filter
     * ```
     */
    with(
        values: // eslint-disable-next-line no-unused-vars
        | Partial<{ [K in Component<M> | "alpha"]: number | ((prev: number) => number) }>
            // eslint-disable-next-line no-unused-vars
            | ((components: { [K in Component<M> | "alpha"]: number }) => Partial<{
                  // eslint-disable-next-line no-unused-vars
                  [K in Component<M> | "alpha"]?: number;
              }>)
    ) {
        const { model } = this;
        const coords = this.toArray();

        const { components } = colorModels[model] as unknown as Record<
            string,
            Record<Component<M> | "alpha", ComponentDefinition>
        >;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        const compNames = Object.keys(components) as (Component<M> | "alpha")[];

        let newAlpha = coords[3];

        if (typeof values === "function") {
            const currentComponents = {} as { [K in Component<M> | "alpha"]: number }; // eslint-disable-line no-unused-vars
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
                    const [min, max] = Array.isArray(value) ? value : value === "angle" ? [0, 360] : [0, 100];
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

        return new Color(model, [...coords.slice(0, 3), newAlpha]);
    }

    /**
     * Returns a new `Color` instance with updated coordinate values.
     *
     * @param newCoords - An array of new coordinate values to apply to the color model.
     * @returns A new `Color` instance with the adjusted coordinates.
     * @throws If the color model does not have defined components.
     */
    withCoords(newCoords: (number | undefined)[]) {
        const { model } = this;
        const coords = this.toArray();

        const { components } = colorModels[model] as unknown as Record<
            string,
            Record<Component<M> | "alpha", ComponentDefinition>
        >;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        const indexToComponent = Object.values(components).reduce(
            (map: { [index: number]: ComponentDefinition }, def) => {
                map[def.index] = def;
                return map;
            },
            {} as { [index: number]: ComponentDefinition }
        );

        const adjustedCoords = coords.map((current, index) => {
            const incoming = newCoords[index];
            const { value } = indexToComponent[index];
            if (!value) return current;

            if (typeof incoming !== "number") return current;

            const [min, max] = Array.isArray(value) ? value : value === "angle" ? [0, 360] : [0, 100];

            if (Number.isNaN(incoming)) return 0;
            if (incoming === Infinity) return max;
            if (incoming === -Infinity) return min;

            return incoming;
        });

        return new Color(model, [...adjustedCoords.slice(0, 3), coords[3]]);
    }

    /**
     * Mixes this color with another by a specified amount.
     *
     * @param other - The color to mix with. Can be a string, or Color instance.
     * @param options - Options for mixing the colors.
     * @return A new Color instance representing the mixed color.
     * @throws If the color model does not have defined components.
     */
    mix<T extends ColorModel = ColorModel>(other: Color<T> | string, options: MixOptions = {}) {
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

        const { model } = this;
        const coords = this.toArray();

        const { hue = "shorter", amount = 0.5, easing = "linear", gamma = 1.0 } = options;
        const { components } = colorModels[model] as unknown as Record<
            string,
            Record<Component<M> | "alpha", ComponentDefinition>
        >;

        if (!components) {
            throw new Error(`Model ${model} does not have defined components.`);
        }

        components.alpha = {
            index: 3,
            value: [0, 1],
            precision: 3,
        };

        const t = 1 - Math.max(0, Math.min(1 - amount, 1));
        const easedT = (typeof easing === "function" ? easing : EASINGS[easing])(t);
        const gammaCorrectedT = Math.pow(easedT, 1 / gamma);

        const thisCoords = coords.slice(0, 3);
        const otherColor = typeof other === "string" ? Color.from(other) : other;
        const otherCoords = otherColor.in(model).toArray().slice(0, 3);

        const thisAlpha = coords[3];
        const otherAlpha = otherColor.coords[3];

        const hueIndex = Object.entries(components).find(([k]) => k === "h")?.[1].index;

        if (amount === 0) {
            return new Color(model, [...thisCoords, thisAlpha]);
        } else if (amount === 1) {
            return new Color(model, [...otherCoords, otherAlpha]);
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

            return new Color(model, [...mixed, mixedAlpha]);
        } else {
            const mixedCoords = thisCoords.map((start, index) => {
                const compEntry = Object.entries(components).find(([, def]) => def.index === index);
                if (!compEntry) return start;

                const [, meta] = compEntry;
                const end = otherCoords[index];

                if (meta.value === "angle") {
                    return interpolateHue(start, end, gammaCorrectedT, hue);
                }

                return start + (end - start) * gammaCorrectedT;
            });

            return new Color(model, [...mixedCoords, 1]);
        }
    }

    /**
     * Calculates the contrast ratio between this color and another color, following the WCAG 2.1 formula.
     *
     * @param other - The color to compare against. Can be a `Color` instance or a color string.
     * @returns The contrast ratio as a number (1 to 21). Ratios above 4.5 are generally considered accessible for normal text.
     *
     * @remarks
     * - WCAG 2.1 is the standard for contrast, but may be limited for modern displays.
     * - Consider using APCA for more accurate results..
     */
    contrast(other: Color<ColorModel> | string) {
        const otherColor = typeof other === "string" ? Color.from(other) : other;
        const [, L_bg] = otherColor.in("xyz-d65").toArray();
        const [, L_text] = this.in("xyz-d65").toArray();
        return (Math.max(L_text, L_bg) + 0.05) / (Math.min(L_text, L_bg) + 0.05);
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
    deltaEOK(other: Color<ColorModel> | string) {
        const [L1, a1, b1] = this.in("oklab").toArray();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("oklab").toArray();

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
    deltaE76(other: Color<ColorModel> | string) {
        const [L1, a1, b1] = this.in("lab").toArray();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").toArray();

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
    deltaE94(other: Color<ColorModel> | string) {
        const [L1, a1, b1] = this.in("lab").toArray();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").toArray();

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
    deltaE2000(other: Color<ColorModel> | string) {
        const [L1, a1, b1] = this.in("lab").toArray();
        const [L2, a2, b2] = (typeof other === "string" ? Color.from(other) : other).in("lab").toArray();

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
     *
     * @remarks
     * - This method checks **numeric equality** in the underlying color space
     *   (or XYZ if the models differ). It is not a perceptual comparison.
     * - Use this for exactness in conversions, testing, or serialization,
     *   not for determining whether two colors "look the same" to the human eye.
     * - For perceptual comparisons, use one of the ΔE methods instead:
     *   - {@link deltaEOK} (modern, based on OKLAB)
     *   - {@link deltaE76} (basic, Euclidean distance in LAB)
     *   - {@link deltaE94} (weighted improvements over LAB)
     *   - {@link deltaE2000} (most accurate, accounts for perceptual interactions)
     */
    equals(other: Color<ColorModel> | string, epsilon = 1e-5) {
        const otherColor = typeof other === "string" ? Color.from(other) : other;

        if (otherColor.model !== this.model) {
            return this.coords.every((value, i) => Math.abs(value - otherColor.coords[i]) <= epsilon);
        }

        const thisXyz = this.in("xyz-d65").toArray();
        const otherXyz = otherColor.in("xyz-d65").toArray();
        return thisXyz.every((value, i) => Math.abs(value - otherXyz[i]) <= epsilon);
    }

    /**
     * Checks if the current color is within the specified gamut.
     *
     * @param gamut - The color space to check against.
     * @param epsilon - Tolerance for floating point comparison. Defaults to 1e-5.
     * @returns `true` if the color is within the gamut, `false` otherwise.
     */
    inGamut(gamut: ColorSpace, epsilon?: number): boolean; // eslint-disable-line no-unused-vars
    inGamut(gamut: string, epsilon?: number): boolean; // eslint-disable-line no-unused-vars
    inGamut(gamut: ColorSpace | string, epsilon = 1e-5) {
        const cleanedGamut = gamut.trim().toLowerCase();

        if (cleanedGamut in colorSpaces === false) {
            throw new Error(`Unsupported color gamut: '${cleanedGamut}'.`);
        }
        const { components, targetGamut } = colorModels[cleanedGamut as ColorSpace];

        if (targetGamut === null) return true;

        const coords = this.in(cleanedGamut).toArray();

        for (const [, props] of Object.entries(components)) {
            const value = coords[props.index];
            const [min, max] = Array.isArray(props.value) ? props.value : props.value === "angle" ? [0, 360] : [0, 100];
            if (value < min - epsilon || value > max + epsilon) {
                return false;
            }
        }

        return true;
    }

    /**
     * Clones the current `Color` instance.
     *
     * @returns A copy of the current `Color` instance.
     */
    clone() {
        return new Color(this.model, this.coords);
    }
}
