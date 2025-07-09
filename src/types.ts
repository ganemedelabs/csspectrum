import Color from "./Color.js";
import { namedColors, colorTypes, colorFunctionConverters, colorBases, colorSpaceConverters } from "./converters.js";
import { EASINGS } from "./utils.js";

/* eslint-disable no-unused-vars */

/** Represents a color in the XYZ color space with an alpha channel. */
export type XYZ = [number, number, number, number];

/** Represents the available `<color>s`. */
export type ColorType = keyof typeof colorTypes;

/** Represents the available `<color-base>s`. */
export type ColorBase = keyof typeof colorBases;

/** Represents the available `<color-function>s`. */
export type ColorFunction = keyof typeof colorFunctionConverters;

/** Represents the available color spaces for `<color()>` function. */
export type ColorSpace = keyof typeof colorSpaceConverters;

/** Represents a <named-color> identifier. */
export type NamedColor = keyof typeof namedColors;

/** Represents the color types that support conversion from XYZ. */
export type OutputType = {
    [K in keyof typeof colorTypes]: (typeof colorTypes)[K] extends {
        fromXYZ?: (xyz: XYZ, options?: FormattingOptions) => string | undefined;
    }
        ? K
        : never;
}[keyof typeof colorTypes];

/** Represents a converter for `<color>`s. */
export interface ColorConverter {
    /** Checks if the provided string is a valid color representation for this converter. */
    isValid: (str: string) => boolean;

    /** Converts a valid color string to its corresponding XYZ color space representation. */
    toXYZ: (str: string) => XYZ;

    /** Converts an XYZ color value back to a string representation, with optional formatting options. */
    fromXYZ?: (xyz: XYZ, options?: FormattingOptions) => string | undefined;
}

/** Represents a converter for `<color-function>`s. */
export interface ColorFunctionConverter {
    /** The target color gamut for the conversion, or `null` if not applicable. */
    targetGamut: string | null;

    /** Indicates whether legacy format (comma-separated) is supported. */
    supportsLegacy: boolean;

    /** A mapping of component names to their definitions. */
    components: Record<string, ComponentDefinition>;

    /** Converts an array of color components to the XYZ color space. */
    toXYZ: (components: number[]) => number[];

    /** Converts a color from the XYZ color space to the target color space. */
    fromXYZ: (xyz: number[], options?: FormattingOptions) => number[];
}

/** Represents a converter for the color spaces used in `<color()>` function. */
export interface ColorSpaceConverter {
    /** The target color gamut for conversion. If not specified, defaults to null. */
    targetGamut?: null;

    /** Names of components in this space. */
    components: string[];

    /** Linearization function. */
    toLinear: (c: number) => number;

    /** Inverse linearization. */
    fromLinear: (c: number) => number;

    /** Matrix to convert to XYZ. */
    toXYZMatrix: number[][];

    /** Matrix to convert from XYZ. */
    fromXYZMatrix: number[][];

    /** The reference white point for this color space, either "D65" or "D50". */
    whitePoint: "D65" | "D50";
}

/** Defines the properties of a color component within a converter. */
export interface ComponentDefinition {
    /** Position of the component in the color array */
    index: number;

    /** Minimum allowed value */
    min: number;

    /** Maximum allowed value */
    max: number;

    /** Whether the value loops (e.g., hue in HSL) */
    loop?: boolean;

    /** Precision for rounding the component value */
    precision?: number;
}

/**
 * Extracts the component names from a converter's component definitions,
 * adding the "alpha" channel as a possible component.
 *
 * @template T - A export type which may include a `components` property.
 */
export type ComponentNames<T> = T extends {
    components: Record<infer N, ComponentDefinition>;
}
    ? N | "alpha"
    : never;

/**
 * Represents a component export type for a given color model.
 *
 * @template M - The color model type.
 */
export type Component<M extends keyof typeof colorFunctionConverters> = ComponentNames<
    (typeof colorFunctionConverters)[M]
>;

/** Defines operations on a color within a specific `Model`, enabling method chaining. */
export interface Interface<M extends ColorFunction> {
    /** Gets all component values as an object. */
    get: (
        /**
         * Method for fitting the color into the target gamut.
         * - `"no-fit"`: Returns the original coordinates without modification.
         * - `"round-only"`: Rounds the coordinates according to the component precision withput gamut mapping.
         * - `"minmax"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
         * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
         * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
         */
        fit?: FitMethod
    ) => { [key in Component<M>]: number };

    /** Gets all component values as an array. */
    getCoords: (
        /**
         * Method for fitting the color into the target gamut.
         * - `"no-fit"`: Returns the original coordinates without modification.
         * - `"round-only"`: Rounds the coordinates according to the component precision withput gamut mapping.
         * - `"minmax"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
         * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
         * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
         */
        fit?: FitMethod
    ) => number[];

    /** Sets component values using an object, supporting updater functions. */
    set: (
        /**
         * Defines how color components should be updated.
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
    ) => Color & Interface<M>;

    /** Sets component values using an array. */
    setCoords: (coords: (number | undefined)[]) => Color & Interface<M>;

    /** Mixes this color with another by a specified amount. */
    mix: (
        /** The color to mix with. Can be a string, or Color instance. */
        other: Color | string,
        /**
         * Options for mixing the colors.
         * - `amount`: Amount of the second color to mix in, between 0 and 1.
         * - `hue`: Method for interpolating hue values.
         * - `easing`: Easing function to apply to the interpolation parameter.
         * - `gamma`: Gamma correction value to use during mixing.
         */
        options?: MixOptions
    ) => Color & Interface<M>;
}

/** Extracts only the `set` methods from a type, used for specific constraints. */
export type InterfaceWithSetOnly<T> = {
    [K in keyof T as K extends `set${string}` ? K : never]: T[K];
};

/** Specifies the method used for interpolating hue values during color mixing. */
export type HueInterpolationMethod = "shorter" | "longer" | "increasing" | "decreasing";

/** Represents the set of valid easing function names. */
export type Easing = keyof typeof EASINGS;

/**
 * Describes the available methods for fitting the color into the target gamut.
 * - `"no-fit"`: Returns the original coordinates without modification.
 * - `"round-only"`: Rounds the coordinates according to the component precision withput gamut mapping.
 * - `"minmax"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
 * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
 * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
 */
export type FitMethod = "minmax" | "chroma-reduction" | "css-gamut-map" | "no-fit" | "round-only";

/** Options for formatting color output. */
export interface FormattingOptions {
    /** Use legacy syntax (e.g., `rgb(255, 0, 0, 0.5)`). */
    legacy?: boolean;

    /**
     * Method for fitting the color into the target gamut.
     * - `"no-fit"`: Returns the original coordinates without modification.
     * - `"round-only"`: Rounds the coordinates according to the component precision withput gamut mapping.
     * - `"minmax"`: Simple clipping to gamut boundaries (W3C Color 4, Section 13.1.1).
     * - `"chroma-reduction"`: Chroma reduction with local clipping in OKLCh (W3C Color 4, Section 13.1.5).
     * - `"css-gamut-map"`: CSS Gamut Mapping algorithm for RGB destinations (W3C Color 4, Section 13.2).
     */
    fit?: FitMethod;

    /** Overrides the precision of the output color. */
    precision?: number;
}

/** Options for mixing two colors. */
export interface MixOptions {
    /** Amount of the second color to mix in, between 0 and 1. */
    amount?: number;

    /** Method for interpolating hue values. */
    hue?: HueInterpolationMethod;

    /** Easing function to apply to the interpolation parameter. */
    easing?: Easing | ((t: number) => number);

    /** Gamma correction value to use during mixing. */
    gamma?: number;
}

/** Options for evaluating the accessibility of an element, such as text or UI components. */
export interface EvaluateAccessibilityOptions {
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
     * - "wcag21": Follows WCAG 2.1 but has limitations (e.g., sRGB-based, poor hue handling).
     * - "apca": Uses APCA-W3 (WCAG 3.0 draft), font-size/weight dependent. See https://git.myndex.com.
     * - "oklab": Uses OKLab lightness difference for perceptual uniformity.
     *
     * @remarks
     * "wcag21" follows WCAG 2.1 guidelines but has limitations. Consider "apca" or "oklab" for better perceptual accuracy.
     */
    algorithm?: "wcag21" | "apca" | "oklab";
}
