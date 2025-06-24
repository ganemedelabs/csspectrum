import Color from "./Color";
import {
    namedColors,
    spaceConverters,
    colorTypes,
    ColorFunction,
    ColorFunctionConverter,
    colorFunctionConverters,
} from "./converters";
import { EASINGS } from "./utils";

/* eslint-disable no-unused-vars */

/**
 * Represents a color in the XYZ color space with an optional alpha channel.
 * Format: [X, Y, Z, A?]
 */
export type XYZ = [number, number, number, number?];

/**
 * The supported color space names, derived from the keys of the `spaceConverters` object.
 * Examples include "srgb", "display-p3", "rec2020", etc.
 */
export type Space = keyof typeof spaceConverters;

/**
 * Represents a named color identifier, derived from the keys of the `_namedColors` object.
 * Examples include "red", "darkslategrey", "mediumvioletred", etc.
 */
export type Name = keyof typeof namedColors;

export type Format = {
    [K in keyof typeof colorTypes]: (typeof colorTypes)[K] extends {
        fromXYZ: (xyz: XYZ, options?: FormattingOptions) => string | undefined;
    }
        ? K
        : never;
}[keyof typeof colorTypes];
/**
 * Defines the properties of a color component within a converter.
 */
export type ComponentDefinition = {
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
};

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
export type Component<M extends ColorFunction> = (typeof colorFunctionConverters)[M] extends ColorFunctionConverter
    ? ComponentNames<(typeof colorFunctionConverters)[M]>
    : never;

/**
 * Defines operations on a color within a specific `Model`, enabling method chaining.
 */
export interface Interface<M extends ColorFunction> {
    /** Gets all component values as an object. */
    get: (options?: GetOptions) => { [key in Component<M>]: number };

    /** Gets all component values as an array. */
    getCoords: (options?: GetOptions) => number[];

    /** Sets component values using an object, supporting updater functions. */
    set: (
        values:
            | Partial<{ [K in Component<M>]: number | ((prev: number) => number) }>
            | ((components: { [K in Component<M>]: number }) => Partial<{ [K in Component<M>]?: number }>)
    ) => Color & Interface<M>;

    /** Sets component values using an array. */
    setCoords: (array: number[]) => Color & Interface<M>;

    /** Mixes this color with another by a specified amount. */
    mix: (other: Color | string, options?: MixOptions) => Color & Interface<M>;
}

/**
 * Extracts only the `set` methods from a type, used for specific constraints.
 */
export type InterfaceWithSetOnly<T> = {
    [K in keyof T as K extends `set${string}` ? K : never]: T[K];
};

/**
 * Options for formatting color output.
 */
export interface FormattingOptions {
    /** Use legacy syntax (e.g., `rgb(255, 0, 0, 0.5)`). */
    legacy?: boolean;
}

export interface ToOptions extends FormattingOptions {
    fit?: FitMethod;
}

/**
 * Defines a color space’s transformation properties.
 */
export type SpaceMatrixMap = {
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

    whitePoint: "D65" | "D50";
};

/**
 * Maps space identifiers to their matrix definitions.
 */
export type Spaces = Record<string, SpaceMatrixMap>;

/**
 * Specifies the method used for interpolating hue values during color mixing.
 */
export type HueInterpolationMethod = "shorter" | "longer" | "increasing" | "decreasing";

export type Easing = keyof typeof EASINGS;

export type FitMethod = "minmax" | "chroma-reduction" | "css-gamut-map";

export interface InGamutOptions {
    epsilon?: number;
}

export interface GetOptions {
    fit?: FitMethod;
}

export type MixOptions = {
    /** Amount of the second color to mix in, between 0 and 1. */
    amount?: number;

    /** Method for interpolating hue values. */
    hue?: HueInterpolationMethod;

    /** Easing function to apply to the interpolation parameter. */
    easing?: Easing | ((t: number) => number);

    gamma?: number;
};

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

export type VisionDeficiencyType = "protanopia" | "deuteranopia" | "tritanopia";
