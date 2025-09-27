import { Color } from "./Color.js";
import { systemColors } from "./config.js";
import { namedColors, colorTypes, colorModels, colorBases, colorSpaces } from "./converters.js";
import { EASINGS, fitMethods } from "./math.js";

/* eslint-disable no-unused-vars */

/** Represents the config object. */
export type Config = {
    /** The theme of the application, either "light" or "dark". */
    theme: "light" | "dark";

    /** System colors for light and dark themes. */
    systemColors: {
        [key: string]: number[][];
    };
};

/** Represents a plugin type for the `Color` class. */
export type Plugin = (colorClass: typeof Color) => void;

/** Represents the available `<color>`s. */
export type ColorType = keyof typeof colorTypes;

/** Represents the available `<color-base>`s. */
export type ColorBase = keyof typeof colorBases;

/** Represents the available `<color-function>`s. */
export type ColorFunction = keyof typeof colorModels;

/** Represents the available color spaces for `<color()>` function. */
export type ColorSpace = keyof typeof colorSpaces;

/** Represents the available manipulatable color models. */
export type ColorModel = keyof typeof colorModels;

/** Represents a <named-color> identifier. */
export type NamedColor = keyof typeof namedColors;

/** Represents a <system-color> identifier. */
export type SystemColor = keyof typeof systemColors;

/** Represents the color types that support conversion from XYZ. */
export type OutputType = {
    [K in ColorType]: (typeof colorTypes)[K] extends {
        fromBridge?: (components: number[]) => number[];
    }
        ? K
        : never;
}[ColorType];

/** Represents a converter for `<color>`s. */
export type ColorConverter = {
    /**
     * Checks whether a given string is a valid representation of this color type.
     *
     * @param str - The string to validate.
     * @returns `true` if the string is valid for this color type, otherwise `false`.
     */
    isValid: (str: string) => boolean;

    /** The intermediate "bridge" color space used for conversion. Must be another `<color-function>` identifier (e.g., `"rgb"`, `"xyz"`). */
    bridge: string;

    /**
     * Converts coordinates from the native color function into the bridge color space.
     *
     * @param coords - The coordinates in the native color function's space.
     * @returns The coordinates converted to the bridge color space.
     */
    toBridge: (coords: number[]) => number[];

    /**
     * Parses a string representation of the color into its numeric coordinates.
     *
     * @param str - The string to parse.
     * @returns The numeric coordinates of the color.
     */
    parse: (str: string) => number[];
} & (
    | {
          /**
           * Converts coordinates from the bridge color space back into the native color function's coordinate system.
           *
           * @param coords - The coordinates in the bridge color space.
           * @returns The coordinates converted back to the native color function's space.
           */
          fromBridge: (coords: number[]) => number[];

          /**
           * Formats numeric component values into a valid CSS color string.
           *
           * @param coords - The numeric component values to format.
           * @param options - Optional formatting options.
           * @returns A formatted CSS color string, or `undefined` if formatting fails.
           */
          format: (coords: number[], options?: FormattingOptions) => string | undefined;
      }
    | { fromBridge?: undefined; format?: undefined }
);

/** Represents a converter for `<color-function>`s. */
export type ColorModelConverter = {
    /** The target color gamut identifier that the function should be clamped to (e.g., `"srgb"`, `"display-p3"`), or `null` for color spaces without a fixed gamut (e.g., `lab`, `lch`). */
    targetGamut?: string | null;

    /** Indicates if legacy (comma-separated) syntax is supported. */
    supportsLegacy?: boolean;

    /** The name of the alpha-channel variant of the color function, if it has one (e.g., `"rgba"` for `"rgb"`). */
    alphaVariant?: string;

    /** A mapping of component names to their definitions. */
    components: Record<string, ComponentDefinition>;

    /** The intermediate "bridge" color space used for conversion. Must be another `<color-function>` identifier (e.g., `"rgb"`, `"xyz"`). */
    bridge: string;

    /**
     * Converts coordinates from the native color function into the bridge color space.
     *
     * @param coords - The coordinates in the native color function's space.
     * @returns The coordinates converted to the bridge color space.
     */
    toBridge: (coords: number[]) => number[];

    /**
     * Converts coordinates from the bridge color space back into the native color function's coordinate system.
     *
     * @param coords - The coordinates in the bridge color space.
     * @returns The coordinates converted back to the native color function's space.
     */
    fromBridge: (coords: number[]) => number[];
};

/** Represents a converter for the color spaces used in `<color()>` function. */
export type ColorSpaceConverter = {
    /** The target color gamut for conversion. Defaults to null if the color space has no limits (e.g., `"xyz-d65"`). */
    targetGamut?: null;

    /** Names of components in this space. */
    components: string[];

    /**
     * Linearization function. Must be undefined if the matrix is linear.
     *
     * @param c - The component value to linearize.
     * @returns The linearized component value.
     */
    toLinear?: (c: number) => number;

    /**
     * Inverse linearization. Must be undefined if the matrix is linear.
     *
     * @param c - The linear component value to convert back.
     * @returns The non-linear component value.
     */
    fromLinear?: (c: number) => number;

    /** The intermediate "bridge" color space used for conversion. Must be another `<color-function>` identifier (e.g., `"rgb"`, `"xyz"`). */
    bridge: string;

    /** Matrix to convert to the bridge color space. */
    toBridgeMatrix: number[][];

    /** Matrix to convert from the bridge color space. */
    fromBridgeMatrix: number[][];
};

/** Defines the properties of a color component within a converter. */
export type ComponentDefinition = {
    /** Position of the component in the color array */
    index: number;

    /** The value type for the component, which can be a tuple of two numbers representing a range, or a string indicating a special type ("angle" or "percentage"). */
    value: number[] | "angle" | "percentage";

    /** Precision for rounding the component value */
    precision?: number;
};

/**
 * Represents a component export type for a given color model.
 *
 * @template M - The color model type.
 */
export type Component<M extends ColorModel> = keyof (typeof colorModels)[M]["components"] | "alpha";

/** Defines operations on a color within a specific `Model`, enabling method chaining. */
export type Interface<M extends ColorFunction> = {
    /**
     * Gets all component values as an object.
     *
     * @param fitMethod -  Method for fitting the color into the target gamut.
     * @returns An object mapping component names to their numeric values.
     * @throws If the color model does not have defined components.
     */
    get: (fit?: FitMethod) => { [key in Component<M>]: number };

    /**
     * Gets all component values as an array.
     *
     * @param fitMethod - Method for fitting the color into the target gamut.
     * @return An array of component values in the order defined by the color model, with alpha as the fourth element.
     * @throws If the color model does not have defined components.
     */
    getCoords: (fit?: FitMethod) => number[];

    /**
     * Sets new values for the color components and returns a new `Color` instance with the updated values.
     *
     * The `values` parameter can be:
     * - A partial object mapping component names (including "alpha") to numbers or updater functions.
     * - A function that receives the current components and returns a partial object with updated values.
     *
     * Each component value can be set directly or via a function that receives the previous value.
     * Values are clamped to their allowed ranges, and special handling is provided for `NaN`, `Infinity`, and `-Infinity`.
     *
     * @param values - Partial mapping of component names to new values or updater functions, or a function returning such a mapping.
     * @returns A new `Color` instance with the updated component values.
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
    set: (
        values:
            | Partial<{ [K in Component<M>]: number | ((prev: number) => number) }>
            | ((components: { [K in Component<M>]: number }) => Partial<{ [K in Component<M>]?: number }>)
    ) => Color<M>;

    /**
     * Sets component values using an array.
     *
     * @param newCoords - An array of new coordinate values (numbers or undefined) to set.
     * @returns The updated Color instance.
     * @throws If the color model does not have defined components.
     */
    setCoords: (coords: (number | undefined)[]) => Color<M>;

    /**
     * Mixes this color with another by a specified amount.
     *
     * @param other - The color to mix with. Can be a string, or Color instance.
     * @param options - Options for mixing the colors.
     * @return A new Color instance representing the mixed color.
     * @throws If the color model does not have defined components.
     */
    mix: (other: Color<M> | string, options?: MixOptions) => Color<M>;
};

/** Specifies the method used for interpolating hue values during color mixing. */
export type HueInterpolationMethod = "shorter" | "longer" | "increasing" | "decreasing";

/** Represents the set of valid easing function names. */
export type Easing = keyof typeof EASINGS;

/** Represents a gamut mapping method. */
export type FitFunction = (
    coords: number[],
    context?: { model?: ColorFunction; componentProps?: ComponentDefinition[]; targetGamut?: ColorSpace | null }
) => number[];

/** Describes the available methods for fitting the color into the target gamut. */
export type FitMethod = keyof typeof fitMethods | "none";

/** Options for formatting color output. */
export type FormattingOptions = {
    /** Use legacy syntax (e.g., `"rgb(255, 0, 0, 0.5)"`). */
    legacy?: boolean;

    /** Method for fitting the color into the target gamut. */
    fit?: FitMethod;

    /** Overrides the precision of the output color. */
    precision?: number;

    /** Output components with units (e.g., `"hsl(250deg 74% 54%)"`). */
    units?: boolean;
};

/** Options for generating a random Color instance. */
export type RandomOptions = {
    /** The color model to use (e.g., "rgb" or "hsl"). */
    model?: ColorModel;

    /** Optional limits for each channel, specified as a tuple of [min, max] values. */
    limits?: Record<string, [number, number]>;

    /** Optional bias functions for each channel, which transform the random value. */
    bias?: Record<string, (x: number) => number>;

    /** Optional base values for each channel. */
    base?: Record<string, number>;

    /** Optional deviation values for each channel, used to control randomness. */
    deviation?: Record<string, number>;
};

/** Options for mixing two colors. */
export type MixOptions = {
    /** Amount of the second color to mix in, between 0 and 1. */
    amount?: number;

    /** Method for interpolating hue values. */
    hue?: HueInterpolationMethod;

    /** Easing function to apply to the interpolation parameter. */
    easing?: Easing | ((t: number) => number);

    /** Gamma correction value to use during mixing. */
    gamma?: number;
};
