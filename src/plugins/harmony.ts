import { Color } from "../Color.js";
import { colorSpaces } from "../converters.js";
import { ColorModel, ColorSpace } from "../types.js";

declare module "../Color.js" {
    // eslint-disable-next-line no-unused-vars
    interface Color<M extends ColorModel = ColorModel> {
        /**
         * Generates a set of harmonious colors based on the specified options.
         *
         * @param options - Configuration options for generating harmonious colors.
         * @returns An array of harmonious colors based on the provided options.
         */
        harmony(options?: HarmonyOptions): HarmonyResult; // eslint-disable-line no-unused-vars
    }
}

/** Represents the result of a color harmony calculation. */
export type HarmonyResult = Color<"oklch">[] & {
    /** An array of metadata objects for each color. */
    meta: {
        /** The role or purpose of the color in the palette. */
        role: string;

        /** The contrast ratio against a reference color. */
        contrastAgainst: number;

        /** The best achievable contrast ratio for the color. */
        bestContrast: number;

        /** The OKLCH color values as a tuple `[L, C, H]`. */
        oklch: [number, number, number];
    }[];

    /** The overall score of the palette, or `null` if not available. */
    score: ScorePaletteResult | null;
};

/** Represents the result of scoring a color palette based on various metrics. */
export type ScorePaletteResult = {
    /** The overall score assigned to the palette. */
    score: number;

    /** The percentage of color pairs meeting contrast requirements. */
    contrastCoverage: number;

    /** The average perceptual separation between colors in the palette. */
    avgSep: number;

    /** The balance of chroma (color intensity) across the palette. */
    chromaBalance: number;

    /** The overall balance of color properties in the palette. */
    balance: number;

    /** The number of color pairs with high contrast. */
    highContrastPair: number;

    /** The harmony score indicating how well the colors work together. */
    harmony: number;

    /** The minimum perceptual separation between any two colors in the palette. */
    minSep: number;
};

/** options for generating harmonious colors. */
export type HarmonyOptions = {
    /** The harmony scheme to use (e.g., complementary, analogous). */
    scheme?: HarmonyScheme;

    /** Number of harmonious colors to generate. */
    count?: number;

    /** Desired tone or emotional context for the color harmony. */
    tone?: HarmonyTone;

    /** Display context, such as "light", "dark", or "auto". */
    context?: "light" | "dark" | "auto";

    /** The color space to constrain the output colors (e.g., display-p3, rec2020). */
    gamut?: ColorSpace;

    /** Minimum contrast ratio between generated colors. */
    minContrast?: number;

    /** Amount of randomness to introduce ("low", "medium", "high"). */
    jitter?: "low" | "medium" | "high";

    /** Number of samples to consider during generation. */
    samples?: number;

    /** Bias the harmony towards "warm", "cool", or "none". */
    hueBias?: "warm" | "cool" | "none";
};

/** Represents the available color harmony schemes. */
export type HarmonyScheme =
    | "complementary"
    | "split"
    | "triad"
    | "analogous"
    | "tetradic"
    | "rectangle"
    | "shades"
    | "tints"
    | "tones";

/** Represents the available color tones for the harmony plugin. */
export type HarmonyTone =
    | "default"
    | "vibrant"
    | "pastel"
    | "muted"
    | "nocturne"
    | "candy"
    | "earth"
    | "neon"
    | "serene"
    | "bold";

/**
 * Adds `harmony` method to the provided `ColorClass` prototype.
 *
 * @param ColorClass - The color class to extend with palette generation.
 *
 * @example
 * ```typescript
 * import { use } from "saturon/utils";
 * import { harmonyPlugin } from "saturon/plugins/harmony";
 *
 * use(harmonyPlugin);
 *
 * const palette = Color.from("#3498db").harmony({ scheme: "triad", tone: "vibrant", count: 4 });
 * palette
 *   .map((c) => c.in("rgb").getCoords("clip"))
 *   .forEach((c) => {
 *       const [r, g, b] = c;
 *       console.log(`\x1b[48;2;${r};${g};${b}m   \x1b[0m rgb(${r} ${g} ${b})`);
 *   });
 * ```
 */
export function harmonyPlugin(ColorClass: typeof Color) {
    const xfnv1a = (str: string) => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    const mulberry32 = (a: number) => {
        return () => {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const mod360 = (v: number) => {
        v = v % 360;
        if (v < 0) v += 360;
        return v;
    };

    const angleDiff = (a: number, b: number) => {
        let d = Math.abs(a - b) % 360;
        if (d > 180) d = 360 - d;
        return d;
    };

    const sampleSkew = (rng: () => number, skew: number) => {
        if (skew === 1) return rng();
        if (skew > 1) return 1 - Math.pow(1 - rng(), skew);
        else return Math.pow(rng(), skew);
    };

    const sampleAround = (rng: () => number, center: number, halfRange: number, skew: number = 1) => {
        const u = sampleSkew(rng, skew) * 2 - 1;
        return clamp(center + u * halfRange, 0, 1);
    };

    const findMaxChroma = (
        h: number,
        L: number,
        gamut: string = "srgb",
        Ctor: typeof ColorClass,
        rng: () => number
    ) => {
        if (L < 0.01 || L > 0.99) return 0;
        let lo = 0;
        let hi = 0.4 + rng() * 0.4;
        let test: Color<"oklch">;

        for (let i = 0; i < 16; i++) {
            test = new Ctor("oklch", [L, hi, h, 1]);
            if (!test.inGamut(gamut)) break;
            lo = hi;
            hi *= 1.8;
            if (hi > 3.0) break;
        }

        for (let i = 0; i < 32; i++) {
            const mid = (lo + hi) / 2;
            test = new Ctor("oklch", [L, mid, h, 1]);
            if (test.inGamut(gamut)) lo = mid;
            else hi = mid;
        }

        const jitter = (rng() - 0.5) * 1e-5 * 50;
        return Math.max(0, lo + jitter);
    };

    const shrinkChromaToGamut = (L: number, Cinit: number, h: number, gamut: string, Ctor: typeof ColorClass) => {
        let test = new Ctor("oklch", [L, Cinit, h, 1]);
        if (test.inGamut(gamut)) return { C: Cinit, adjusted: false };
        let lo = 0,
            hi = Cinit;
        for (let i = 0; i < 32; i++) {
            const mid = (lo + hi) / 2;
            test = new Ctor("oklch", [L, mid, h, 1]);
            if (test.inGamut(gamut)) lo = mid;
            else hi = mid;
        }
        return { C: lo, adjusted: true };
    };

    const generateAnchors = (
        scheme: HarmonyScheme | undefined,
        baseHue: number,
        count: number,
        rng: () => number,
        jitterDeg: number,
        hueBias: "warm" | "cool" | "none"
    ) => {
        const baseAnchors: number[] = [];
        const jitter = (deg: number): number => (rng() * 2 - 1) * deg;

        const biasShift = (h: number): number => {
            if (hueBias === "warm") {
                if (h > 90 && h < 270) h = lerp(h, rng() < 0.5 ? 90 : 270, 0.3);
            } else if (hueBias === "cool") {
                if (h < 90 || h > 270) h = lerp(h, 180, 0.3);
            }
            return mod360(h);
        };

        switch (scheme) {
            case "complementary":
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 180)));
                break;
            case "split":
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 150)));
                baseAnchors.push(biasShift(mod360(baseHue + 210)));
                break;
            case "triad":
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 120)));
                baseAnchors.push(biasShift(mod360(baseHue + 240)));
                break;
            case "analogous":
                baseAnchors.push(biasShift(mod360(baseHue - 30)));
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 30)));
                break;
            case "tetradic":
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 90)));
                baseAnchors.push(biasShift(mod360(baseHue + 180)));
                baseAnchors.push(biasShift(mod360(baseHue + 270)));
                break;
            case "rectangle":
                baseAnchors.push(biasShift(mod360(baseHue)));
                baseAnchors.push(biasShift(mod360(baseHue + 60)));
                baseAnchors.push(biasShift(mod360(baseHue + 180)));
                baseAnchors.push(biasShift(mod360(baseHue + 240)));
                break;
            default:
                baseAnchors.push(biasShift(mod360(baseHue)));
        }

        const colors: number[] = [];
        const perAnchor = Math.ceil(count / baseAnchors.length);
        const bandSize = Math.max(4, jitter(jitterDeg));

        for (const anchor of baseAnchors) {
            for (let i = 0; i < perAnchor && colors.length < count; i++) {
                const offset = (rng() - 0.5) * bandSize;
                const hue = mod360(anchor + offset);
                colors.push(hue);
            }
        }

        return colors;
    };

    const roleOrderForCount = (count: number) => {
        const allRoles = ["primary", "accent", "neutral", "tint", "shade"];
        const roles = allRoles.slice(0, Math.min(count, 5));

        const shuffled = [...roles].sort(() => Math.random() - 0.5);

        const roleCounts: Record<string, number> = {
            primary: 1,
            accent: 0,
            tint: 0,
            shade: 0,
            neutral: count >= 3 ? 1 : 0,
        };

        let remaining = count - (count >= 3 ? 2 : 1);

        const others = roles.filter((r) => r !== "primary" && r !== "neutral");
        let i = 0;
        while (remaining > 0) {
            roleCounts[others[i % others.length]]++;
            remaining--;
            i++;
        }

        const result: string[] = [];
        for (const role of shuffled) {
            result.push(...Array(roleCounts[role]).fill(role));
        }

        return result;
    };

    const roleTemplate = (
        role: string,
        tone: HarmonyTone = "default",
        context: string = "auto",
        scheme: HarmonyScheme | undefined
    ) => {
        const tones = {
            default: {
                primary: { L: 0.55, range: 0.15, skew: 1.0, Cmul: 1.0 },
                tint: { L: 0.85, range: 0.1, skew: 1.2, Cmul: 0.5 },
                shade: { L: 0.3, range: 0.1, skew: 1.2, Cmul: 0.65 },
                accent: { L: 0.6, range: 0.14, skew: 1.0, Cmul: 1.1 },
                neutral: { L: context === "dark" ? 0.15 : 0.92, range: 0.05, skew: 1.0, Cmul: 0.08 },
            },
            vibrant: {
                primary: { L: 0.5, range: 0.14, skew: 0.8, Cmul: 1.3 },
                tint: { L: 0.8, range: 0.08, skew: 1.0, Cmul: 0.7 },
                shade: { L: 0.25, range: 0.1, skew: 0.9, Cmul: 0.85 },
                accent: { L: 0.55, range: 0.16, skew: 0.8, Cmul: 1.6 },
                neutral: { L: context === "dark" ? 0.1 : 0.96, range: 0.04, skew: 1.0, Cmul: 0.06 },
            },
            pastel: {
                primary: { L: 0.8, range: 0.1, skew: 1.4, Cmul: 0.5 },
                tint: { L: 0.94, range: 0.04, skew: 1.4, Cmul: 0.2 },
                shade: { L: 0.65, range: 0.08, skew: 1.4, Cmul: 0.35 },
                accent: { L: 0.82, range: 0.1, skew: 1.4, Cmul: 0.7 },
                neutral: { L: context === "dark" ? 0.25 : 0.98, range: 0.03, skew: 1.0, Cmul: 0.04 },
            },
            muted: {
                primary: { L: 0.5, range: 0.14, skew: 1.3, Cmul: 0.6 },
                tint: { L: 0.75, range: 0.1, skew: 1.3, Cmul: 0.3 },
                shade: { L: 0.35, range: 0.1, skew: 1.3, Cmul: 0.45 },
                accent: { L: 0.55, range: 0.14, skew: 1.3, Cmul: 0.75 },
                neutral: { L: context === "dark" ? 0.18 : 0.9, range: 0.06, skew: 1.0, Cmul: 0.07 },
            },
            nocturne: {
                primary: { L: 0.35, range: 0.12, skew: 0.9, Cmul: 1.0 },
                tint: { L: 0.5, range: 0.08, skew: 1.0, Cmul: 0.55 },
                shade: { L: 0.1, range: 0.06, skew: 0.9, Cmul: 0.7 },
                accent: { L: 0.38, range: 0.12, skew: 0.9, Cmul: 1.2 },
                neutral: { L: 0.05, range: 0.03, skew: 1.0, Cmul: 0.04 },
            },
            candy: {
                primary: { L: 0.65, range: 0.12, skew: 1.0, Cmul: 1.4 },
                tint: { L: 0.82, range: 0.08, skew: 1.0, Cmul: 1.0 },
                shade: { L: 0.35, range: 0.1, skew: 1.0, Cmul: 1.0 },
                accent: { L: 0.75, range: 0.1, skew: 1.0, Cmul: 1.7 },
                neutral: { L: context === "dark" ? 0.2 : 0.95, range: 0.04, skew: 1.0, Cmul: 0.04 },
            },
            earth: {
                primary: { L: 0.45, range: 0.16, skew: 1.1, Cmul: 0.7 },
                tint: { L: 0.7, range: 0.12, skew: 1.2, Cmul: 0.4 },
                shade: { L: 0.25, range: 0.12, skew: 1.1, Cmul: 0.55 },
                accent: { L: 0.5, range: 0.16, skew: 1.1, Cmul: 0.9 },
                neutral: { L: context === "dark" ? 0.12 : 0.88, range: 0.07, skew: 1.0, Cmul: 0.1 },
            },
            neon: {
                primary: { L: 0.6, range: 0.1, skew: 0.7, Cmul: 1.8 },
                tint: { L: 0.9, range: 0.06, skew: 0.8, Cmul: 1.2 },
                shade: { L: 0.4, range: 0.08, skew: 0.7, Cmul: 1.5 },
                accent: { L: 0.65, range: 0.1, skew: 0.7, Cmul: 2.0 },
                neutral: { L: context === "dark" ? 0.08 : 0.98, range: 0.02, skew: 1.0, Cmul: 0.05 },
            },
            serene: {
                primary: { L: 0.7, range: 0.08, skew: 1.5, Cmul: 0.4 },
                tint: { L: 0.88, range: 0.05, skew: 1.5, Cmul: 0.15 },
                shade: { L: 0.5, range: 0.06, skew: 1.5, Cmul: 0.3 },
                accent: { L: 0.72, range: 0.08, skew: 1.5, Cmul: 0.6 },
                neutral: { L: context === "dark" ? 0.22 : 0.96, range: 0.03, skew: 1.0, Cmul: 0.03 },
            },
            bold: {
                primary: { L: 0.45, range: 0.18, skew: 0.6, Cmul: 1.5 },
                tint: { L: 0.75, range: 0.12, skew: 0.7, Cmul: 1.0 },
                shade: { L: 0.2, range: 0.14, skew: 0.6, Cmul: 1.2 },
                accent: { L: 0.5, range: 0.18, skew: 0.6, Cmul: 1.8 },
                neutral: { L: context === "dark" ? 0.05 : 0.95, range: 0.05, skew: 1.0, Cmul: 0.1 },
            },
        };
        const set = tones[tone] || tones.default;
        let tmpl = set[role as keyof typeof set] || set.primary;
        if (scheme === "shades") tmpl = { ...tmpl, L: tmpl.L * 0.7, range: tmpl.range * 1.5, Cmul: tmpl.Cmul * 0.8 };
        if (scheme === "tints") tmpl = { ...tmpl, L: tmpl.L * 1.2, range: tmpl.range * 1.2, Cmul: tmpl.Cmul * 0.6 };
        if (scheme === "tones") tmpl = { ...tmpl, Cmul: tmpl.Cmul * 0.5, range: tmpl.range * 1.3 };
        return tmpl;
    };

    type Swatch = {
        color: Color<"oklch">;
        okLCH: [number, number, number];
        role: string;
    };

    const scorePalette = (swatches: Swatch[], minContrast: number = 4.5) => {
        const n = swatches.length;
        const totalPairs = (n * (n - 1)) / 2;

        let contrastPairs = 0;
        let contrastSum = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const r = swatches[i].color.contrast(swatches[j].color, "wcag21");
                contrastSum += r;
                if (r >= minContrast) contrastPairs++;
            }
        }
        const contrastCoverage = totalPairs > 0 ? contrastPairs / totalPairs : 0;

        let sepSum = 0;
        let minSep = Infinity;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dE = swatches[i].color.deltaEOK(swatches[j].color);
                sepSum += dE;
                if (dE < minSep) minSep = dE;
            }
        }
        const avgSep = totalPairs > 0 ? sepSum / totalPairs : 0;

        const Cs = swatches.map((s) => s.okLCH[1]);
        const cLow = Math.min(...Cs);
        const cHigh = Math.max(...Cs);
        const chromaBalance = clamp((cHigh - cLow) / 0.5, 0, 1);

        const meanC = Cs.reduce((a, b) => a + b, 0) / n;
        const varC = Cs.reduce((a, b) => a + (b - meanC) ** 2, 0) / n;
        const stdC = Math.sqrt(varC);
        const balance = clamp(1 - stdC / 0.2, 0, 1);

        let highContrastPair = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (swatches[i].color.contrast(swatches[j].color, "wcag21") >= 7) {
                    highContrastPair = 1;
                    break;
                }
            }
            if (highContrastPair) break;
        }

        const hues = swatches.map((s) => s.okLCH[2]).filter((h) => !isNaN(h));
        let harmony = 0;
        if (hues.length > 1) {
            const hueDiffs = [];
            for (let i = 0; i < hues.length; i++) {
                for (let j = i + 1; j < hues.length; j++) {
                    hueDiffs.push(angleDiff(hues[i], hues[j]));
                }
            }
            const meanDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length;
            const varDiff = hueDiffs.reduce((a, b) => a + (b - meanDiff) ** 2, 0) / hueDiffs.length;
            harmony = clamp(1 - Math.sqrt(varDiff) / 60, 0, 1);
        }

        const minDeltaE = 25;

        const sepPenalty = minSep < minDeltaE ? -5.0 * (1 - minSep / minDeltaE) : 0;

        const score =
            contrastCoverage * 4.0 +
            clamp(avgSep / 20, 0, 1) * 3.0 +
            chromaBalance * 1.5 +
            balance * 1.2 +
            highContrastPair * 1.0 +
            harmony * 1.5 +
            (contrastSum / (totalPairs || 1)) * 0.015 +
            sepPenalty;

        return {
            score,
            contrastCoverage,
            avgSep,
            chromaBalance,
            balance,
            highContrastPair,
            harmony,
            minSep,
        };
    };

    const nudgeSwatch = (
        swatch: Swatch,
        others: Swatch[],
        gamut: string,
        Ctor: typeof ColorClass,
        rng: () => number
    ): Swatch => {
        let [L, C, h] = swatch.okLCH;
        let attempts = 0;
        const maxAttempts = 10;
        let color = swatch.color;
        const minDeltaE = 25;

        while (attempts < maxAttempts) {
            let minDE = Infinity;
            for (const other of others) {
                if (other === swatch) continue;
                const dE = color.deltaEOK(other.color);
                if (dE < minDE) minDE = dE;
            }
            if (minDE >= minDeltaE) break;

            const nudgeL = (rng() - 0.5) * 0.1;
            const nudgeC = (rng() - 0.5) * 0.05;
            const nudgeH = (rng() - 0.5) * 15;
            L = clamp(L + nudgeL, 0.01, 0.99);
            C = clamp(C + nudgeC, 0.005, 2.0);
            h = mod360(h + nudgeH);

            const shrinkRes = shrinkChromaToGamut(L, C, h, gamut, Ctor);
            C = shrinkRes.C;
            color = new Ctor("oklch", [L, C, h]);
            attempts++;
        }

        return { color, okLCH: [L, C, h], role: swatch.role };
    };

    ColorClass.prototype.harmony = function (options = {}) {
        const {
            scheme = undefined,
            count = 5,
            tone = "default",
            context = "auto",
            gamut = "srgb",
            minContrast = 4.5,
            jitter = "medium",
            samples = 16,
            hueBias = "none",
        } = options;

        const toneLimits = {
            default: { minL: 0.15, maxL: 0.95, minC: 0.0, maxC: 0.2 },
            vibrant: { minL: 0.1, maxL: 0.95, minC: 0.1, maxC: 0.3 },
            pastel: { minL: 0.7, maxL: 1.0, minC: 0.02, maxC: 0.1 },
            muted: { minL: 0.3, maxL: 0.8, minC: 0.03, maxC: 0.15 },
            nocturne: { minL: 0.0, maxL: 0.4, minC: 0.05, maxC: 0.25 },
            candy: { minL: 0.3, maxL: 0.9, minC: 0.1, maxC: 0.35 },
            earth: { minL: 0.2, maxL: 0.7, minC: 0.05, maxC: 0.18 },
            neon: { minL: 0.4, maxL: 0.9, minC: 0.2, maxC: 0.4 },
            serene: { minL: 0.6, maxL: 0.95, minC: 0.01, maxC: 0.08 },
            bold: { minL: 0.1, maxL: 0.8, minC: 0.15, maxC: 0.35 },
        };

        if (count < 2) {
            throw new Error("Harmony generation requires at least 2 colors.");
        }

        if (minContrast < 1 || minContrast > 21) {
            throw new Error("minContrast must be between 1 and 21.");
        }

        if (samples <= 0 || samples > 256) {
            throw new Error("Samples must be between 1 and 256.");
        }

        if (["auto", "light", "dark"].includes(context) === false) {
            throw new Error(`Context must be 'auto', 'light' or 'dark'.`);
        }

        if (["low", "medium", "high"].includes(jitter) === false) {
            throw new Error("jitter must be 'low', 'medium' or 'high'.");
        }

        if (["none", "warm", "cool"].includes(hueBias) === false) {
            throw new Error("hueBias must be 'none', 'warm' or 'cool'.");
        }

        if (tone in toneLimits === false) {
            throw new Error(`Unknown tone: '${tone}'. Valid tones are: ${Object.keys(toneLimits).join(", ")}`);
        }

        if (gamut in colorSpaces === false) {
            throw new Error(`Unknown gamut: '${gamut}'. Valid gamuts are: ${Object.keys(colorSpaces).join(", ")}`);
        }

        const seed = Date.now().toString();
        const rng = mulberry32(xfnv1a(seed));
        const jitterDeg = { low: 4, medium: 8, high: 14 }[jitter];

        const [baseL, baseC, baseH, baseA] = this.in("oklch").getCoords();

        const cusp = findMaxChroma(baseH, baseL, gamut, ColorClass, rng);
        const workingC = Math.min(baseC, Number.isFinite(cusp) ? cusp * 0.8 : 0.5);

        const anchors = generateAnchors(scheme, workingC < 0.03 ? rng() * 360 : baseH, count, rng, jitterDeg, hueBias);

        if (workingC >= 0.03 && !anchors.some((h) => angleDiff(h, baseH) < 8)) {
            anchors.unshift(baseH);
            anchors.pop();
        }

        const roles = roleOrderForCount(count);

        const generateCandidate = () => {
            const swatches: Swatch[] = [];
            const anchorSlots = Array(anchors.length).fill(0);
            let slotsLeft = count;
            for (let i = 0; i < anchors.length && slotsLeft > 0; i++) {
                anchorSlots[i] = 1;
                slotsLeft--;
            }
            let idx = 0;
            while (slotsLeft > 0) {
                anchorSlots[idx % anchors.length]++;
                idx++;
                slotsLeft--;
            }

            let roleIdx = 0;
            for (let a = 0; a < anchors.length; a++) {
                const h = anchors[a];
                const slots = anchorSlots[a];
                let anchorBaseC = baseC;
                if (angleDiff(h, baseH) > 15) {
                    anchorBaseC = clamp(baseC * lerp(0.6, 1.3, rng()) + rng() * 0.08, 0.01, 2.5);
                }

                for (let s = 0; s < slots; s++) {
                    const role = roles[roleIdx % roles.length];
                    roleIdx++;
                    const tmpl = roleTemplate(role, "default", context, scheme);

                    const L = sampleAround(rng, tmpl.L, tmpl.range, tmpl.skew);
                    const localCusp = findMaxChroma(h, L, gamut, ColorClass, rng);
                    const cNoise = 1 + (rng() - 0.5) * 0.22;
                    let targetC = anchorBaseC * tmpl.Cmul * cNoise;
                    targetC = Math.min(targetC, localCusp > 0.000001 ? localCusp * lerp(0.7, 0.98, rng()) : 0.06);

                    if (role === "primary" || role === "accent") targetC = Math.max(targetC, 0.08);
                    if (role === "neutral" && targetC < 0.01) targetC = 0.01;

                    const Lcouple = 1 - Math.abs(0.5 - L) * 0.95;
                    targetC *= lerp(0.8, 1.1, Lcouple);

                    const shrinkRes = shrinkChromaToGamut(L, targetC, h, gamut, ColorClass);
                    const Cfinal = shrinkRes.C;

                    const color = new ColorClass("oklch", [L, Cfinal, h, baseA || 1]);

                    swatches.push({ color, okLCH: [L, Cfinal, h], role });
                }
            }

            while (swatches.length > count) swatches.pop();

            for (let i = 0; i < swatches.length; i++) {
                swatches[i] = nudgeSwatch(swatches[i], swatches, gamut, ColorClass, rng);
            }

            return swatches;
        };

        let best: Swatch[] | null = null;
        let bestMeta: ScorePaletteResult | null = null;
        for (let k = 0; k < samples; k++) {
            const candidate = generateCandidate();
            const s = scorePalette(candidate, minContrast);
            if (!best || s.score > (bestMeta?.score ?? -Infinity)) {
                best = candidate;
                bestMeta = s;
            }
        }

        const palette = best?.slice(0, count) ?? [];
        let maxPairContrast = 0;
        for (let i = 0; i < palette.length; i++) {
            for (let j = i + 1; j < palette.length; j++) {
                maxPairContrast = Math.max(maxPairContrast, palette[i].color.contrast(palette[j].color, "wcag21"));
            }
        }
        if (maxPairContrast < minContrast) {
            const neutralIdx = palette.findIndex((p) => p.role === "neutral");
            if (neutralIdx >= 0) {
                const neutral = palette[neutralIdx];
                const baseOk = neutral.okLCH.slice();
                const allL = palette.map((p) => p.okLCH[0]);
                const meanL = allL.reduce((a, b) => a + b, 0) / allL.length;
                const targetL = meanL > 0.5 ? clamp(meanL - 0.35, 0.03, 0.97) : clamp(meanL + 0.35, 0.03, 0.97);
                const newCRes = shrinkChromaToGamut(targetL, Math.max(baseOk[1], 0.01), baseOk[2], gamut, ColorClass);
                palette[neutralIdx] = {
                    color: new ColorClass("oklch", [targetL, newCRes.C, baseOk[2], baseA || 1]),
                    okLCH: [targetL, newCRes.C, baseOk[2]],
                    role: neutral.role,
                };
            } else {
                let minL = Infinity,
                    maxL = -Infinity,
                    minIdx = -1,
                    maxIdx = -1;
                for (let i = 0; i < palette.length; i++) {
                    const L = palette[i].okLCH[0];
                    if (L < minL) {
                        minL = L;
                        minIdx = i;
                    }
                    if (L > maxL) {
                        maxL = L;
                        maxIdx = i;
                    }
                }
                if (minIdx >= 0 && maxIdx >= 0) {
                    const low = palette[minIdx];
                    const high = palette[maxIdx];
                    const newLowL = clamp(low.okLCH[0] - 0.22, 0.01, 0.99);
                    const newHighL = clamp(high.okLCH[0] + 0.22, 0.01, 0.99);
                    const lowCRes = shrinkChromaToGamut(
                        newLowL,
                        Math.max(low.okLCH[1], 0.01),
                        low.okLCH[2],
                        gamut,
                        ColorClass
                    );
                    const highCRes = shrinkChromaToGamut(
                        newHighL,
                        Math.max(high.okLCH[1], 0.01),
                        high.okLCH[2],
                        gamut,
                        ColorClass
                    );
                    palette[minIdx] = {
                        color: new ColorClass("oklch", [newLowL, lowCRes.C, low.okLCH[2], baseA || 1]),
                        okLCH: [newLowL, lowCRes.C, low.okLCH[2]],
                        role: low.role,
                    };
                    palette[maxIdx] = {
                        color: new ColorClass("oklch", [newHighL, highCRes.C, high.okLCH[2], baseA || 1]),
                        okLCH: [newHighL, highCRes.C, high.okLCH[2]],
                        role: high.role,
                    };
                }
            }
        }

        for (let i = 0; i < palette.length; i++) {
            palette[i] = nudgeSwatch(palette[i], palette, gamut, ColorClass, rng);
        }

        const resultArray = palette.map((p) => p.color) as HarmonyResult;
        let finalMeta = resultArray.map((c, i) => {
            let bestIdx = -1;
            let bestContrast = -Infinity;
            for (let j = 0; j < resultArray.length; j++) {
                if (i === j) continue;
                const r = c.contrast(resultArray[j], "wcag21");
                if (r > bestContrast) {
                    bestContrast = r;
                    bestIdx = j;
                }
            }
            return {
                role: palette[i].role,
                contrastAgainst: bestIdx,
                bestContrast,
                oklch: palette[i].okLCH,
            };
        });

        resultArray.meta = finalMeta;
        resultArray.score = bestMeta;

        if (tone !== "default") {
            const limits = toneLimits[tone];
            if (limits) {
                let toneMinL = limits.minL;
                let toneMaxL = limits.maxL;
                const toneMinC = limits.minC;
                const toneMaxC = limits.maxC;
                const isDark = context === "dark" || (context === "auto" && baseL < 0.5);
                if (isDark) {
                    toneMinL = clamp(1 - limits.maxL, 0, 1);
                    toneMaxL = clamp(1 - limits.minL, 0, 1);
                }

                let currentMinL = Infinity,
                    currentMaxL = -Infinity;
                let currentMinC = Infinity,
                    currentMaxC = -Infinity;
                for (const p of palette) {
                    const [L, C] = p.okLCH;
                    if (L < currentMinL) currentMinL = L;
                    if (L > currentMaxL) currentMaxL = L;
                    if (C < currentMinC) currentMinC = C;
                    if (C > currentMaxC) currentMaxC = C;
                }
                if (currentMaxL - currentMinL < 0.01) currentMaxL = currentMinL + 0.01;
                if (currentMaxC - currentMinC < 0.01) currentMaxC = currentMinC + 0.01;

                for (let i = 0; i < palette.length; i++) {
                    const [L, C, h] = palette[i].okLCH;
                    const tL = (L - currentMinL) / (currentMaxL - currentMinL);
                    const newL = clamp(lerp(toneMinL, toneMaxL, tL), 0.01, 0.99);
                    const tC = (C - currentMinC) / (currentMaxC - currentMinC);
                    const newC = clamp(lerp(toneMinC, toneMaxC, tC), 0.005, 2.0);
                    const shrinkRes = shrinkChromaToGamut(newL, newC, h, gamut, ColorClass);
                    const finalC = shrinkRes.C;
                    const newColor = new ColorClass("oklch", [newL, finalC, h, baseA || 1]);
                    resultArray[i] = newColor;
                    finalMeta[i].oklch = [newL, finalC, h];
                    palette[i].color = newColor;
                    palette[i].okLCH = [newL, finalC, h];
                }

                for (let i = 0; i < palette.length; i++) {
                    palette[i] = nudgeSwatch(palette[i], palette, gamut, ColorClass, rng);
                    resultArray[i] = palette[i].color;
                    finalMeta[i].oklch = palette[i].okLCH;
                }

                finalMeta = resultArray.map((c, i) => {
                    let bestIdx = -1;
                    let bestContrast = -Infinity;
                    for (let j = 0; j < resultArray.length; j++) {
                        if (i === j) continue;
                        const r = c.contrast(resultArray[j], "wcag21");
                        if (r > bestContrast) {
                            bestContrast = r;
                            bestIdx = j;
                        }
                    }
                    return {
                        role: palette[i].role,
                        contrastAgainst: bestIdx,
                        bestContrast,
                        oklch: palette[i].okLCH,
                    };
                });
                resultArray.meta = finalMeta;
                resultArray.score = scorePalette(palette, minContrast);
            }
        }

        return resultArray;
    };
}
