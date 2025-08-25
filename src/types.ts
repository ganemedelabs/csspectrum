import { Color } from "./Color.js";
import { systemColors } from "./config.js";
import { namedColors, colorTypes, colorFunctionConverters, colorBases, colorSpaceConverters } from "./converters.js";
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
export type ColorFunction = keyof typeof colorFunctionConverters;

/** Represents the available color spaces for `<color()>` function. */
export type ColorSpace = keyof typeof colorSpaceConverters;

/** Represents a <named-color> identifier. */
export type NamedColor = keyof typeof namedColors;

/** Represents a <system-color> identifier. */
export type SystemColor = keyof typeof systemColors;

/** Represents the color types that support conversion from XYZ. */
export type OutputType = {
    [K in keyof typeof colorTypes]: (typeof colorTypes)[K] extends {
        fromBridge?: (components: number[]) => number[];
    }
        ? K
        : never;
}[keyof typeof colorTypes];

/** Represents a converter for `<color>`s. */
export type ColorConverter = {
    /** Checks whether a given string is a valid representation of this color type. */
    isValid: (str: string) => boolean;

    /** The intermediate "bridge" color space used for conversion. Must be another `<color-function>` identifier (e.g., `"rgb"`, `"xyz"`). */
    bridge: string;

    /** Converts coordinates from the native color function into the bridge color space. */
    toBridge: (coords: number[]) => number[];

    /** Parses a string representation of the color into its numeric coordinates. */
    parse: (str: string) => number[];
} & (
    | {
          /** Converts coordinates from the bridge color space back into the native color function's coordinate system. */
          fromBridge: (coords: number[]) => number[];

          /** Formats numeric component values into a valid CSS color string. */
          format: (coords: number[], options?: FormattingOptions) => string | undefined;
      }
    | { fromBridge?: undefined; format?: undefined }
);

/** Represents a converter for `<color-function>`s. */
export type ColorFunctionConverter = {
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

    /** Converts coordinates from the native color function into the bridge color space. */
    toBridge: (coords: number[]) => number[];

    /** Converts coordinates from the bridge color space back into the native color function's coordinate system. */
    fromBridge: (coords: number[]) => number[];
};

/** Represents a converter for the color spaces used in `<color()>` function. */
export type ColorSpaceConverter = {
    /** The target color gamut for conversion. Defaults to null if the color space has no limits (e.g., `"xyz-d65"`). */
    targetGamut?: null;

    /** Names of components in this space. */
    components: string[];

    /** Linearization function. Must be undefined if the matrix is linear. */
    toLinear?: (c: number) => number;

    /** Inverse linearization. Must be undefined if the matrix is linear. */
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

    /** The value type for the component, which can be a tuple of two numbers representing a range, or a string indicating a special type ("hue" or "percentage"). */
    value: number[] | "hue" | "percentage";

    /** Precision for rounding the component value */
    precision?: number;
};

/**
 * Represents a component export type for a given color model.
 *
 * @template M - The color model type.
 */
export type Component<M extends keyof typeof colorFunctionConverters> =
    | keyof (typeof colorFunctionConverters)[M]["components"]
    | "alpha";

/** Defines operations on a color within a specific `Model`, enabling method chaining. */
export type Interface<M extends ColorFunction> = {
    /** Gets all component values as an object. */
    get: (
        /** Method for fitting the color into the target gamut. */
        fit?: FitMethod
    ) => { [key in Component<M>]: number };

    /** Gets all component values as an array. */
    getCoords: (
        /** Method for fitting the color into the target gamut. */
        fit?: FitMethod
    ) => number[];

    /** Sets component values using an object, supporting updater functions. */
    set: (
        /**
         * Defines how color components should be updated:
         *
         * - Can be a partial object where each key is a component (e.g., `r`, `g`, `b`, `h`, `s`, `alpha`), and values
         *   are either numbers (to set directly) or functions that receive the current value and return the new one.
         *
         * - Alternatively, can be a function that receives all current component values as an object,
         *   and returns a partial object of updated values.
         *
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
        values:
            | Partial<{ [K in Component<M>]: number | ((prev: number) => number) }>
            | ((components: { [K in Component<M>]: number }) => Partial<{ [K in Component<M>]?: number }>)
    ) => Color<M>;

    /** Sets component values using an array. */
    setCoords: (coords: (number | undefined)[]) => Color<M>;

    /** Mixes this color with another by a specified amount. */
    mix: (
        /** The color to mix with. Can be a string, or Color instance. */
        other: Color<M> | string,
        /**
         * Options for mixing the colors:
         * - `amount`: Amount of the second color to mix in, between 0 and 1.
         * - `hue`: Method for interpolating hue values.
         * - `easing`: Easing function to apply to the interpolation parameter.
         * - `gamma`: Gamma correction value to use during mixing.
         */
        options?: MixOptions
    ) => Color<M>;
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

    /** Output components with units (e.g., `"hsl(250deg 74% 54%)"`) */
    units?: boolean;
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

/** Options for evaluating the accessibility of an element, such as text or UI components. */
export type EvaluateAccessibilityOptions = {
    /** The element type: "text" (default) or "non-text" (e.g., UI components per WCAG 1.4.11). */
    type?: "text" | "non-text";

    /** WCAG level to test ("AA" (default) or "AAA"). Ignored for non-WCAG algorithms. */
    level?: "AA" | "AAA";

    /** Font size in points (pt) for text elements. Ignored for non-text. Default: 12. */
    fontSize?: number;

    /** Font weight (e.g., 400 for normal, 700 for bold, or CSS strings "normal", "bold"). Ignored for non-text. Default: 400. */
    fontWeight?: number;

    /**
     * The contrast algorithm to use: "wcag21" (default), "apca", or "oklab".
     * - `"wcag21"`: Follows WCAG 2.1 but has limitations (e.g., sRGB-based, poor hue handling).
     * - `"apca"`: Uses APCA-W3 (WCAG 3.0 draft), font-size/weight dependent. See https://git.myndex.com.
     * - `"oklab"`: Uses OKLab lightness difference for perceptual uniformity.
     *
     * @remarks
     * "wcag21" follows WCAG 2.1 guidelines but has limitations. Consider "apca" or "oklab" for better perceptual accuracy.
     */
    algorithm?: "wcag21" | "apca" | "oklab";
};
