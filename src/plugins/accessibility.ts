import { Color } from "../Color.js";
import { ColorModel } from "../types.js";

declare module "../Color.js" {
    /* eslint-disable no-unused-vars */
    interface Color<M extends ColorModel = ColorModel> {
        /**
         * Evaluates the accessibility of the current color against another color using WCAG 2.x or alternative contrast guidelines.
         *
         * @param other - The other color to evaluate against (as a Color instance or string).
         * @param options - Optional settings to customize the evaluation.
         * @returns An object with accessibility status, contrast, required contrast, and helpful info.
         * @throws If the algorithm, level, or font parameters are invalid.
         */
        accessibility(other: Color<ColorModel> | string, options?: AccessibilityOptions): AccessibilityResult;
    }
    /* eslint-enable no-unused-vars */
}

/** Options for evaluating the accessibility of an element, such as text or UI components. */
export type AccessibilityOptions = {
    /** The element type: "text" (default) or "non-text" (e.g., UI components per WCAG 1.4.11). */
    type?: "text" | "non-text";

    /** WCAG level to test ("AA" (default) or "AAA"). Ignored for non-WCAG algorithms. */
    level?: "AA" | "AAA";

    /** Font size in points (pt) for text elements. Ignored for non-text. Default: 12. */
    fontSize?: number;

    /** Font weight (e.g., 400 for normal, 700 for bold, or CSS strings "normal", "bold"). Ignored for non-text. Default: 400. */
    fontWeight?: number;

    /**
     * The contrast algorithm to use: "wcag21" (default), or "apca".
     * - `"wcag21"`: Follows WCAG 2.1 but has limitations (e.g., sRGB-based, poor hue handling).
     * - `"apca"`: Uses APCA-W3 (WCAG 3.0 draft), font-size/weight dependent. See https://git.myndex.com.
     *
     * @remarks
     * "wcag21" follows WCAG 2.1 guidelines but has limitations. Consider "apca" for better perceptual accuracy.
     */
    algorithm?: "wcag21" | "apca";
};

/** Represents the result of an accessibility check, typically for color contrast. */
export type AccessibilityResult = {
    /** Indicates if the accessibility check passed. */
    passes: boolean;

    /** The measured contrast ratio between colors. */
    contrast: number;

    /** The minimum required contrast ratio for compliance. */
    requiredContrast: number;

    /** The WCAG success criterion relevant to the check. */
    wcagSuccessCriterion: string;

    /** A human-readable message describing the result. */
    message: string;

    /** The WCAG compliance level ("AA" or "AAA"), if applicable. */
    level?: "AA" | "AAA";

    /** The font size used in the check, if relevant. */
    fontSize?: number;

    /** The font weight used in the check, if relevant. */
    fontWeight?: number;

    /** The color of the text being checked. */
    textColor?: Color<ColorModel>;

    /** The color being compared against (e.g., background). */
    otherColor?: Color<ColorModel>;

    /** The impact level or description of the result, if available. */
    impact?: string;

    /** The algorithm used for contrast calculation ("wcag21", or "apca"). */
    algorithm?: "wcag21" | "apca";
};

/**
 * Adds an `accessibility` method to the provided `ColorClass` prototype.
 *
 * @param ColorClass - The color class to extend with accessibility evaluation.
 *
 * @example
 * ```typescript
 * import { use } from "saturon/utils";
 * import { accessibilityPlugin } from "saturon/plugins/accessibility";
 *
 * use(accessibilityPlugin);
 *
 * const color = Color.from("#000");
 * const result = color.accessibility("#fff", { type: "text", level: "AA", fontSize: 16, fontWeight: 400 });
 * console.log(result.passes); // true
 * ```
 */
export function accessibilityPlugin(ColorClass: typeof Color) {
    ColorClass.prototype.accessibility = function (other, options = {}) {
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
        } else {
            throw new Error("Unsupported contrast algorithm: must be 'wcag21', or 'apca'.");
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
            textColor: this,
            otherColor,
            wcagSuccessCriterion,
            impact,
            algorithm,
            message,
        };
    };
}
