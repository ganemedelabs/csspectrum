import Color from "./Color";
import { _formatConverters, _namedColors, _spaceConverters, _converters } from "./converters";
import { EASINGS } from "./utils";

/* eslint-disable no-unused-vars */

/**
 * Represents a color in the XYZA color space with an optional alpha channel.
 * Format: [X, Y, Z, A?]
 */
export type XYZA = [number, number, number, number?];

/**
 * Represents a color in the RGBA color space with an optional alpha channel.
 * Format: [red, green, blue, alpha?]
 */
export type RGBA = [number, number, number, number?];

/**
 * Options for creating a Color instance.
 */
export interface ColorOptions {
    /** The original color string value that was used to create the color. */
    originalString: string;
}

/**
 * The supported color format names, derived from the keys of the `_formatConverters` object.
 * For example, valid values might include "hex", "rgb", "hsl", etc.
 */
export type Format = keyof typeof _formatConverters;

/**
 * The supported color space names, derived from the keys of the `_spaceConverters` object.
 * Examples include "srgb", "display-p3", "rec2020", etc.
 */
export type Space = keyof typeof _spaceConverters;

/**
 * Represents a named color identifier, derived from the keys of the `__namedColors` object.
 * Examples include "red", "darkslategrey", "mediumvioletred", etc.
 */
export type Name = keyof typeof _namedColors;

/**
 * Represents a color model, which can be either a `Space` or a `Format` that has a converter with components.
 * Filters `Format` to only include those with `ConverterWithComponents`.
 */
export type Model = {
    [K in Format | Space]: (typeof _converters)[K] extends ConverterWithComponents ? K : never;
}[Format | Space];

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
 * Converter for color formats with components (e.g., RGB, HSL).
 */
export interface ConverterWithComponents {
    /** Regular expression to match the color string format. */
    pattern: RegExp;

    targetGamut: string | null;

    /** Component definitions for this format (e.g., 'r', 'g', 'b'). */
    components: Record<string, ComponentDefinition>;

    /** Converts a color string to an array of component values. */
    toComponents: (colorString: string) => number[];

    /** Converts an array of component values to a color string. */
    fromComponents: (colorArray: number[], options?: FormattingOptions) => string;

    /** Converts component values to XYZA color space. */
    toXYZA: (colorArray: number[]) => XYZA;

    /** Converts XYZA color space to component values. */
    fromXYZA: (xyza: XYZA) => number[];
}

/**
 * Converter for color formats without components (e.g., named colors or simple formats).
 */
export interface ConverterWithoutComponents {
    /** Regular expression to match the color string format. */
    pattern: RegExp;

    /** Converts a color string directly to XYZA color space. */
    toXYZA: (colorString: string) => XYZA;

    /** Converts XYZA color space directly to a color string. */
    fromXYZA: (xyza: XYZA) => string;
}

/**
 * Union export type for all possible color _converters.
 */
export type ColorConverter = ConverterWithComponents | ConverterWithoutComponents;

/**
 * Maps each `Format` to its corresponding converter.
 * Keys are specific format strings (e.g., 'rgb', 'hsl'), values are _converters.
 */
export interface Converters {
    [key: string]: ColorConverter;
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
export type Component<M extends Model> = (typeof _converters)[M] extends ConverterWithComponents
    ? ComponentNames<(typeof _converters)[M]>
    : never;

/**
 * Defines operations on a color within a specific `Model`, enabling method chaining.
 */
export interface Interface<M extends Model> {
    /** Gets the value of a specific component. */
    get: (component: Component<M>, options?: GetOptions) => number;

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
    /** Use modern syntax (e.g., `rgb(255 0 0)` vs `rgb(255, 0, 0)`). */
    modern?: boolean;
}

export interface ToOptions extends FormattingOptions {
    fit?: FitMethod;
}

/**
 * Options for generating the next color, extending formatting options.
 */
export interface ToNextColorOptions extends FormattingOptions {
    /** Color formats or spaces to exclude from the sequence. */
    exclude?: (Format | Space)[];
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

/**
 * Options for generating a color scale.
 */
export interface ScaleOptions {
    /** Number of colors to include in the scale (including endpoints). */
    steps?: number;

    /** The color model to interpolate in (e.g. `"lab"`, `"rgb"`, `"hsl"`, etc.). */
    model?: Model;

    /** Easing function to apply to the interpolation parameter. */
    easing?: Easing | ((t: number) => number);

    /** Method used for hue interpolation. */
    hue?: HueInterpolationMethod;
}

export interface InGamutOptions {
    epsilon?: number;
}

export interface GetOptions {
    fit?: FitMethod;
}

export interface LightnessRangeOptions {
    epsilon?: number;
}

export type HarmonyType = "complementary" | "split-complementary" | "triadic" | "tetradic" | "analogous";

export type MixOptions = {
    /** Amount of the second color to mix in, between 0 and 1. */
    amount?: number;

    /** Method for interpolating hue values. */
    hue?: HueInterpolationMethod;

    /** Easing function to apply to the interpolation parameter. */
    easing?: Easing | ((t: number) => number);
};

export interface EvaluateAccessibilityOptions {
    /** WCAG level to test ("AA" or "AAA"). Defaults to "AA". */
    level?: "AA" | "AAA";

    /** Whether the text is large (≥18pt regular or ≥14pt bold). */
    isLargeText?: boolean;
}

export type Pattern = keyof typeof Color.patterns;

export type VisionDeficiencyType = "protanopia" | "deuteranopia" | "tritanopia";

export type ClusterOptions = { k: number };
