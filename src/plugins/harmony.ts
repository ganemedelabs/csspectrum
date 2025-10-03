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
        oklch: number[];
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

/** Options for generating harmonious colors. */
export type HarmonyOptions = {
    /** The harmony scheme to use (e.g., complementary, analogous). */
    scheme?: HarmonyScheme;

    /** Number of harmonious colors to generate. Defaults to 5. */
    count?: number;

    /** Desired tone for the color harmony (e.g., pastel, dark). */
    tone?: HarmonyTone;

    /** The color space to constrain the output colors (e.g., srgb (default), display-p3). */
    gamut?: ColorSpace;

    /** Amount of randomness to introduce ("low", "medium" (default), "high"). */
    jitter?: "low" | "medium" | "high";

    /** Number of samples to consider during generation. Defaults to 16. */
    samples?: number;

    /** Whether to include the base color as-is in the final palette. Defaults to false. */
    includeBase?: boolean;
};

export const tones = [
    "vibrant",
    "dark",
    "bright",
    "pastel",
    "muted",
    "nocturne",
    "candy",
    "earth",
    "neon",
    "serene",
    "bold",
] as const;

export const schemes = ["complementary", "split", "triad", "analogous", "tetradic", "rectangle"] as const;

/** Represents the available color harmony schemes. */
export type HarmonyScheme = (typeof schemes)[number];

/** Represents the available color tones for the harmony plugin. */
export type HarmonyTone = (typeof tones)[number];

/**
 * Adds `harmony` method to the provided `ColorClass` prototype.
 *
 * @param ColorClass - The color class to extend with palette generation.
 *
 * @example
 * ```typescript:disable-run
 * import { use } from "saturon/utils";
 * import { harmonyPlugin } from "saturon/plugins/harmony";
 *
 * use(harmonyPlugin);
 *
 * const palette = Color.from("#3498db").harmony({ scheme: "triad", tone: "vibrant", count: 4, includeBaseColor: true });
 * palette
 *   .map((c) => c.in("rgb").getCoords({ fit: "clip", precision: undefined }))
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

    const findMaxChroma = (h: number, L: number, gamut: string = "srgb", rng: () => number) => {
        if (L < 0.01 || L > 0.99) return 0;
        let lo = 0;
        let hi = 0.4 + rng() * 0.4;
        let test: Color<"oklch">;

        for (let i = 0; i < 16; i++) {
            test = new ColorClass("oklch", [L, hi, h, 1]);
            if (!test.inGamut(gamut)) break;
            lo = hi;
            hi *= 1.8;
            if (hi > 3.0) break;
        }

        for (let i = 0; i < 32; i++) {
            const mid = (lo + hi) / 2;
            test = new ColorClass("oklch", [L, mid, h, 1]);
            if (test.inGamut(gamut)) lo = mid;
            else hi = mid;
        }

        const jitter = (rng() - 0.5) * 1e-5 * 50;
        return Math.max(0, lo + jitter);
    };

    const shrinkChromaToGamut = (L: number, Cinit: number, h: number, gamut: string) => {
        let test = new ColorClass("oklch", [L, Cinit, h, 1]);
        if (test.inGamut(gamut)) return Cinit;
        let lo = 0,
            hi = Cinit;
        for (let i = 0; i < 32; i++) {
            const mid = (lo + hi) / 2;
            test = new ColorClass("oklch", [L, mid, h, 1]);
            if (test.inGamut(gamut)) lo = mid;
            else hi = mid;
        }
        return lo;
    };

    const generateAnchors = (
        scheme: HarmonyScheme | undefined,
        baseHue: number,
        count: number,
        rng: () => number,
        jitterDeg: number
    ) => {
        const baseAnchors: number[] = [];
        const jitter = (deg: number): number => (rng() * 2 - 1) * deg;

        switch (scheme) {
            case "complementary":
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 180));
                break;
            case "split":
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 150));
                baseAnchors.push(mod360(baseHue + 210));
                break;
            case "triad":
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 120));
                baseAnchors.push(mod360(baseHue + 240));
                break;
            case "analogous":
                baseAnchors.push(mod360(baseHue - 30));
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 30));
                break;
            case "tetradic":
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 90));
                baseAnchors.push(mod360(baseHue + 180));
                baseAnchors.push(mod360(baseHue + 270));
                break;
            case "rectangle":
                baseAnchors.push(mod360(baseHue));
                baseAnchors.push(mod360(baseHue + 60));
                baseAnchors.push(mod360(baseHue + 180));
                baseAnchors.push(mod360(baseHue + 240));
                break;
            default:
                baseAnchors.push(mod360(baseHue));
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

    const roleTemplate = (role: string, tone: HarmonyTone | undefined) => {
        const tones = {
            default: {
                primary: { L: 0.55, range: 0.15, skew: 1.0, Cmul: 1.0 },
                tint: { L: 0.85, range: 0.1, skew: 1.2, Cmul: 0.5 },
                shade: { L: 0.3, range: 0.1, skew: 1.2, Cmul: 0.65 },
                accent: { L: 0.6, range: 0.14, skew: 1.0, Cmul: 1.1 },
                neutral: { L: 0.92, range: 0.05, skew: 1.0, Cmul: 0.08 },
            },
            vibrant: {
                primary: { L: 0.5, range: 0.14, skew: 0.8, Cmul: 1.3 },
                tint: { L: 0.8, range: 0.08, skew: 1.0, Cmul: 0.7 },
                shade: { L: 0.25, range: 0.1, skew: 0.9, Cmul: 0.85 },
                accent: { L: 0.55, range: 0.16, skew: 0.8, Cmul: 1.6 },
                neutral: { L: 0.96, range: 0.04, skew: 1.0, Cmul: 0.06 },
            },
            dark: {
                primary: { L: 0.3, range: 0.1, skew: 0.7, Cmul: 1.0 },
                tint: { L: 0.5, range: 0.08, skew: 0.8, Cmul: 0.5 },
                shade: { L: 0.15, range: 0.1, skew: 0.7, Cmul: 0.7 },
                accent: { L: 0.35, range: 0.12, skew: 0.7, Cmul: 1.2 },
                neutral: { L: 0.75, range: 0.05, skew: 1.0, Cmul: 0.1 },
            },
            bright: {
                primary: { L: 0.65, range: 0.12, skew: 1.2, Cmul: 1.2 },
                tint: { L: 0.9, range: 0.06, skew: 1.3, Cmul: 0.6 },
                shade: { L: 0.5, range: 0.1, skew: 1.1, Cmul: 0.8 },
                accent: { L: 0.7, range: 0.12, skew: 1.2, Cmul: 1.5 },
                neutral: { L: 0.98, range: 0.03, skew: 1.0, Cmul: 0.05 },
            },
            pastel: {
                primary: { L: 0.8, range: 0.1, skew: 1.4, Cmul: 0.5 },
                tint: { L: 0.94, range: 0.04, skew: 1.4, Cmul: 0.2 },
                shade: { L: 0.6, range: 0.08, skew: 1.4, Cmul: 0.35 },
                accent: { L: 0.82, range: 0.1, skew: 1.4, Cmul: 0.7 },
                neutral: { L: 0.98, range: 0.03, skew: 1.0, Cmul: 0.04 },
            },
            muted: {
                primary: { L: 0.5, range: 0.14, skew: 1.3, Cmul: 0.6 },
                tint: { L: 0.75, range: 0.1, skew: 1.3, Cmul: 0.3 },
                shade: { L: 0.35, range: 0.1, skew: 1.3, Cmul: 0.45 },
                accent: { L: 0.55, range: 0.14, skew: 1.3, Cmul: 0.75 },
                neutral: { L: 0.9, range: 0.06, skew: 1.0, Cmul: 0.07 },
            },
            nocturne: {
                primary: { L: 0.35, range: 0.12, skew: 0.9, Cmul: 1.0 },
                tint: { L: 0.5, range: 0.08, skew: 1.0, Cmul: 0.55 },
                shade: { L: 0.1, range: 0.06, skew: 0.9, Cmul: 0.7 },
                accent: { L: 0.38, range: 0.12, skew: 0.9, Cmul: 1.2 },
                neutral: { L: 0.05, range: 0.03, skew: 1.0, Cmul: 0.04 },
            },
            candy: {
                primary: { L: 0.65, range: 0.12, skew: 1.0, Cmul: 1.5 },
                tint: { L: 0.75, range: 0.08, skew: 1.0, Cmul: 1.3 },
                shade: { L: 0.5, range: 0.1, skew: 1.0, Cmul: 1.3 },
                accent: { L: 0.7, range: 0.1, skew: 1.0, Cmul: 1.8 },
                neutral: { L: 0.8, range: 0.04, skew: 1.0, Cmul: 0.2 },
            },
            earth: {
                primary: { L: 0.45, range: 0.16, skew: 1.1, Cmul: 0.7 },
                tint: { L: 0.7, range: 0.12, skew: 1.2, Cmul: 0.4 },
                shade: { L: 0.25, range: 0.12, skew: 1.1, Cmul: 0.55 },
                accent: { L: 0.55, range: 0.16, skew: 1.1, Cmul: 0.9 },
                neutral: { L: 0.88, range: 0.07, skew: 1.0, Cmul: 0.1 },
            },
            neon: {
                primary: { L: 0.6, range: 0.1, skew: 0.7, Cmul: 1.8 },
                tint: { L: 0.9, range: 0.06, skew: 0.8, Cmul: 1.2 },
                shade: { L: 0.4, range: 0.08, skew: 0.7, Cmul: 1.5 },
                accent: { L: 0.65, range: 0.1, skew: 0.7, Cmul: 2.0 },
                neutral: { L: 0.98, range: 0.02, skew: 1.0, Cmul: 0.05 },
            },
            serene: {
                primary: { L: 0.7, range: 0.08, skew: 1.5, Cmul: 0.5 },
                tint: { L: 0.88, range: 0.05, skew: 1.5, Cmul: 0.25 },
                shade: { L: 0.5, range: 0.06, skew: 1.5, Cmul: 0.4 },
                accent: { L: 0.72, range: 0.08, skew: 1.5, Cmul: 0.7 },
                neutral: { L: 0.96, range: 0.03, skew: 1.0, Cmul: 0.15 },
            },
            bold: {
                primary: { L: 0.45, range: 0.18, skew: 0.6, Cmul: 1.5 },
                tint: { L: 0.75, range: 0.12, skew: 0.7, Cmul: 1.0 },
                shade: { L: 0.2, range: 0.14, skew: 0.6, Cmul: 1.2 },
                accent: { L: 0.5, range: 0.18, skew: 0.6, Cmul: 1.8 },
                neutral: { L: 0.95, range: 0.05, skew: 1.0, Cmul: 0.1 },
            },
        };
        const set = tones[tone as HarmonyTone] || tones.default;
        return set[role as keyof typeof set] || set.primary;
    };

    type Swatch = {
        color: Color<"oklch">;
        okLCH: number[];
        role: string;
    };

    const scorePalette = (swatches: Swatch[]) => {
        const n = swatches.length;
        const totalPairs = (n * (n - 1)) / 2;
        const minContrast = 4.5;

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

        const computeCH = (col1: Color<"oklch">, col2: Color<"oklch">) => {
            const lab1 = col1.in("lab").getCoords();
            const L1 = lab1[0];
            const a1 = lab1[1];
            const b1 = lab1[2];
            const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
            const h1 = ((Math.atan2(b1, a1) * 180) / Math.PI + 360) % 360;

            const lab2 = col2.in("lab").getCoords();
            const L2 = lab2[0];
            const a2 = lab2[1];
            const b2 = lab2[2];
            const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
            const h2 = ((Math.atan2(b2, a2) * 180) / Math.PI + 360) % 360;

            const deltaL = Math.abs(L1 - L2);
            const lSum = L1 + L2;

            const deltaH = angleDiff(h1, h2);
            const deltaHAb = 2 * Math.sqrt(C1 * C2) * Math.sin((deltaH * Math.PI) / 360);
            const deltaCAb = Math.abs(C1 - C2);

            const DeltaC = Math.sqrt(deltaHAb ** 2 + (deltaCAb / 1.46) ** 2);

            const HC = 0.04 + 0.53 * Math.tanh(0.8 - 0.045 * DeltaC);

            const HLsum = 0.28 + 0.54 * Math.tanh(-3.88 + 0.029 * lSum);
            const HDeltaL = 0.14 + 0.15 * Math.tanh(-2 + 0.2 * deltaL);
            const HL = HLsum + HDeltaL;

            const computeHSY = (L: number, C: number, h: number) => {
                const EC = 0.5 + 0.5 * Math.tanh(-2 + 0.5 * C);
                const HS =
                    -0.08 -
                    0.14 * Math.sin(((h + 50) * Math.PI) / 180) -
                    0.07 * Math.sin(((2 * h + 90) * Math.PI) / 180);
                const x = (90 - h) / 10;
                const EY = ((0.22 * L - 12.8) / 10) * Math.exp(x - Math.exp(x));
                return EC * (HS + EY);
            };

            const HSY1 = computeHSY(L1, C1, h1);
            const HSY2 = computeHSY(L2, C2, h2);
            const HH = HSY1 + HSY2;

            const ch = HC + HL + HH;
            return ch;
        };

        let harmonySum = 0;
        let pairCount = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                harmonySum += computeCH(swatches[i].color, swatches[j].color);
                pairCount++;
            }
        }
        const harmony = pairCount > 0 ? harmonySum / pairCount : 0;

        const normalizedHarmony = clamp((harmony + 1.3) / 3, 0, 1);

        const minDeltaE = 25;

        const sepPenalty = minSep < minDeltaE ? -5.0 * (1 - minSep / minDeltaE) : 0;

        const score =
            contrastCoverage * 4.0 +
            clamp(avgSep / 20, 0, 1) * 3.0 +
            chromaBalance * 1.5 +
            balance * 1.2 +
            highContrastPair * 1.0 +
            normalizedHarmony * 1.5 +
            (contrastSum / (totalPairs || 1)) * 0.015 +
            sepPenalty;

        return {
            score,
            contrastCoverage,
            avgSep,
            chromaBalance,
            balance,
            highContrastPair,
            harmony: normalizedHarmony,
            minSep,
        };
    };

    ColorClass.prototype.harmony = function (options = {}) {
        const {
            scheme,
            count = 5,
            tone,
            gamut = "srgb",
            jitter = "medium",
            samples = 16,
            includeBase = false,
        } = options;

        if (count < 2) {
            throw new Error("Harmony generation requires at least 2 colors.");
        }

        if (samples <= 0 || samples > 256) {
            throw new Error("Samples must be between 1 and 256.");
        }

        if (["low", "medium", "high"].includes(jitter) === false) {
            throw new Error("jitter must be 'low', 'medium' or 'high'.");
        }

        if (typeof scheme === "string" && schemes.includes(scheme) === false) {
            throw new Error(`Unknown scheme: '${scheme}'. Valid schemes are: ${schemes.join(", ")}.`);
        }

        if (typeof tone === "string" && tones.includes(tone) === false) {
            throw new Error(`Unknown tone: '${tone}'. Valid tones are: ${tones.join(", ")}.`);
        }

        if (gamut in colorSpaces === false) {
            throw new Error(`Unknown gamut: '${gamut}'. Valid gamuts are: ${Object.keys(colorSpaces).join(", ")}.`);
        }

        const seed = Date.now().toString();
        const rng = mulberry32(xfnv1a(seed));
        const jitterDeg = { low: 4, medium: 8, high: 14 }[jitter];

        const [baseL, baseC, baseH] = this.in("oklch").getCoords();
        const baseColor = new ColorClass("oklch", [baseL, baseC, baseH]);

        const cusp = findMaxChroma(baseH, baseL, gamut, rng);
        const workingC = Math.min(baseC, Number.isFinite(cusp) ? cusp * 0.8 : 0.5);

        const anchors = generateAnchors(scheme, workingC < 0.03 ? rng() * 360 : baseH, count, rng, jitterDeg);

        if (workingC >= 0.03 && !anchors.some((h) => angleDiff(h, baseH) < 8)) {
            anchors.unshift(baseH);
            anchors.pop();
        }

        const roles = roleOrderForCount(count);

        const generateCandidate = (): Swatch[] => {
            const MIN_DELTAE = 25;
            const MIN_CONTRAST = 4.5;

            const swatches: Swatch[] = [];
            let roleIdx = 0;

            for (let i = 0; i < count; i++) {
                const h = anchors[i % anchors.length];
                const role = roles[roleIdx % roles.length];
                roleIdx++;

                const tmpl = roleTemplate(role, tone);

                let L = sampleAround(rng, tmpl.L, tmpl.range, tmpl.skew);
                let C = tmpl.Cmul * (baseC || 0.2);
                C = shrinkChromaToGamut(L, C, h, gamut);

                let candidate = new ColorClass("oklch", [L, C, h]);
                let attempts = 0;

                while (attempts < 20) {
                    let valid = true;

                    for (const other of swatches) {
                        const dE = candidate.deltaEOK(other.color);
                        if (dE < MIN_DELTAE) {
                            valid = false;
                            break;
                        }
                    }

                    if (valid && swatches.length > 0) {
                        const hasContrast = swatches.some(
                            (other) => candidate.contrast(other.color, "wcag21") >= MIN_CONTRAST
                        );
                        if (!hasContrast) valid = false;
                    }

                    if (valid) break;

                    L = clamp(L + (rng() - 0.5) * tmpl.range, 0.01, 0.99);
                    C = clamp(C * (0.9 + rng() * 0.2), 0.005, 2.0);
                    candidate = new ColorClass("oklch", [L, C, h]);

                    attempts++;
                }

                swatches.push({ color: candidate, okLCH: [L, C, h], role });
            }

            return swatches;
        };

        let best: Swatch[] | null = null;
        let bestMeta: ScorePaletteResult | null = null;
        for (let k = 0; k < samples; k++) {
            const candidate = generateCandidate();
            const s = scorePalette(candidate);
            if (!best || s.score > (bestMeta?.score ?? -Infinity)) {
                best = candidate;
                bestMeta = s;
            }
        }

        const palette = best?.slice(0, count) ?? [];

        if (includeBase && palette.length > 0) {
            let minDeltaE = Infinity;
            let closestIdx = 0;
            for (let i = 0; i < palette.length; i++) {
                const dE = baseColor.deltaEOK(palette[i].color);
                if (dE < minDeltaE) {
                    minDeltaE = dE;
                    closestIdx = i;
                }
            }
            palette[closestIdx] = {
                color: baseColor,
                okLCH: [baseL, baseC, baseH],
                role: palette[closestIdx].role,
            };
        }

        const resultArray = palette.map((p) => p.color) as HarmonyResult;
        const finalMeta = resultArray.map((c, i) => {
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

        return resultArray;
    };
}
