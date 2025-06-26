import Color from "./Color.js";
import { colorFunctionConverters } from "./converters.js";
import type { ColorFunction, ColorSpace, ComponentDefinition, FitMethod, HueInterpolationMethod } from "./types.js";

export const D50_to_D65 = [
    [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
    [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
    [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];

export const D65_to_D50 = [
    [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
    [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
    [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

export const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
export const D65 = [0.3127 / 0.329, 1.0, (1.0 - 0.3127 - 0.329) / 0.329];

export const EASINGS = {
    linear: (t: number) => t,
    "ease-in": (t: number) => t * t,
    "ease-out": (t: number) => t * (2 - t),
    "ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    "ease-in-cubic": (t: number) => t * t * t,
    "ease-out-cubic": (t: number) => --t * t * t + 1,
    "ease-in-out-cubic": (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * Multiplies two matrices or vectors and returns the resulting product.
 *
 * @param A - The first matrix or vector. If it's a 1D array, it is treated as a row vector.
 * @param B - The second matrix or vector. If it's a 1D array, it is treated as a column vector.
 *
 * @returns The product of the two inputs:
 * - If both `A` and `B` are 1D arrays (vectors), the result is a scalar (number).
 * - If `A` is a 1D array and `B` is a 2D array, the result is a 1D array (vector).
 * - If `A` is a 2D array and `B` is a 1D array, the result is a 1D array (vector).
 * - If both `A` and `B` are 2D arrays (matrices), the result is a 2D array (matrix).
 *
 * @throws {Error} If the dimensions of `A` and `B` are incompatible for multiplication.
 *
 */
export function multiplyMatrices<A extends number[] | number[][], B extends number[] | number[][]>(
    A: A,
    B: B
): A extends number[] ? (B extends number[] ? number : number[]) : B extends number[] ? number[] : number[][] {
    const m = Array.isArray(A[0]) ? A.length : 1;
    const A_matrix: number[][] = Array.isArray(A[0]) ? (A as number[][]) : [A as number[]];
    const B_matrix: number[][] = Array.isArray(B[0]) ? (B as number[][]) : (B as number[]).map((x) => [x]);
    const p = B_matrix[0].length;
    const B_cols = B_matrix[0].map((_, i) => B_matrix.map((x) => x[i]));
    const product = A_matrix.map((row) => B_cols.map((col) => row.reduce((a, c, i) => a + c * (col[i] || 0), 0)));

    if (m === 1) return product[0] as A extends number[] ? (B extends number[] ? number : number[]) : never;
    if (p === 1)
        return product.map((x) => x[0]) as A extends number[] ? (B extends number[] ? number : number[]) : never;
    return product as A extends number[]
        ? B extends number[]
            ? number
            : number[]
        : B extends number[]
          ? number[]
          : number[][];
}

/**
 * Returns the signed shortest delta from a → b in [–180,+180].
 */
export function deltaHue(a: number, b: number): number {
    let d = (((b - a) % 360) + 360) % 360;
    if (d > 180) d -= 360;
    return d;
}

/**
 * Returns the “longer” path (i.e. the other direction) from a → b.
 */
export function deltaHueLong(a: number, b: number): number {
    const short = deltaHue(a, b);
    return short >= 0 ? short - 360 : short + 360;
}

export function interpolateComponents(
    from: number[],
    to: number[],
    components: Record<string, ComponentDefinition>,
    t: number,
    hue: HueInterpolationMethod = "shorter"
): number[] {
    return from.map((start, index) => {
        const compEntry = Object.entries(components).find(([, def]) => def.index === index);
        if (!compEntry) return start;

        const [key] = compEntry;

        if (key === "h") {
            const currentHue = start;
            const targetHue = to[index];
            let mixedHue: number;

            switch (hue) {
                case "shorter":
                    mixedHue = currentHue + t * deltaHue(currentHue, targetHue);
                    break;
                case "longer":
                    mixedHue = currentHue + t * deltaHueLong(currentHue, targetHue);
                    break;
                case "increasing":
                    mixedHue = currentHue * (1 - t) + (targetHue < currentHue ? targetHue + 360 : targetHue) * t;
                    break;
                case "decreasing":
                    mixedHue = currentHue * (1 - t) + (targetHue > currentHue ? targetHue - 360 : targetHue) * t;
                    break;
                default:
                    throw new Error("Invalid hue interpolation method");
            }

            return ((mixedHue % 360) + 360) % 360;
        }

        return start + (to[index] - start) * t;
    });
}

export function SRGB_to_LRGB(v: number) {
    if (v <= 0.04045) return v / 12.92;
    return Math.pow((v + 0.055) / 1.055, 2.4);
}

export function LRGB_to_SRGB(v: number) {
    if (v <= 0.0031308) return 12.92 * v;
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function lightnessRange(hue: number, gamut: ColorSpace, options: { epsilon?: number } = {}) {
    const C = 0.05;
    const epsilon = options.epsilon || 1e-5;

    const isInGamut = (L: number) => {
        const color = Color.in("oklch").setCoords([L, C, hue]);
        return color.inGamut(gamut, { epsilon });
    };

    const searchMinL = () => {
        let low = 0,
            high = 1;
        while (high - low > epsilon) {
            const mid = (low + high) / 2;
            if (isInGamut(mid)) high = mid;
            else low = mid;
        }
        return high;
    };

    const searchMaxL = () => {
        let low = 0,
            high = 1;
        while (high - low > epsilon) {
            const mid = (low + high) / 2;
            if (isInGamut(mid)) low = mid;
            else high = mid;
        }
        return low;
    };

    const L_min = searchMinL();
    const L_max = searchMaxL();

    return [L_min, L_max];
}

export function fit(coords: number[], model: ColorFunction, method: FitMethod = "minmax") {
    const roundCoords = (coords: number[]) => {
        return coords.map((value, i) => {
            const precision = componentProps[i]?.precision ?? 5;
            return Number(value.toFixed(precision));
        });
    };

    const { targetGamut, components } = colorFunctionConverters[model];

    const componentProps: ComponentDefinition[] = [];
    for (const [, props] of Object.entries(components)) {
        componentProps[props.index] = props;
    }

    switch (method) {
        case "minmax": {
            const clipped = coords.map((value, i) => {
                const props = componentProps[i];
                if (!props) {
                    throw new Error(`Missing component properties for index ${i}.`);
                }
                if (props.loop) {
                    const range = props.max - props.min;
                    return props.min + ((((value - props.min) % range) + range) % range);
                } else {
                    return Math.min(props.max, Math.max(props.min, value));
                }
            });
            return roundCoords(clipped);
        }

        case "chroma-reduction": {
            const color = Color.in(model).setCoords(coords);
            if (targetGamut === null || color.inGamut(targetGamut as ColorSpace, { epsilon: 1e-5 })) {
                return roundCoords(coords);
            }

            const [L, , H, alpha] = color.in("oklch").getCoords();
            const [L_min, L_max] = lightnessRange(H, targetGamut as ColorSpace);
            const L_adjusted = Math.min(L_max, Math.max(L_min, L));

            let C_low = 0;
            let C_high = 1.0;
            const epsilon = 1e-6;
            let clipped: number[] = [];

            while (C_high - C_low > epsilon) {
                const C_mid = (C_low + C_high) / 2;
                const candidate_color = Color.in("oklch").setCoords([L_adjusted, C_mid, H, alpha]);

                if (candidate_color.inGamut(targetGamut as ColorSpace, { epsilon: 1e-5 })) {
                    C_low = C_mid;
                } else {
                    const clipped_coords = fit(candidate_color.getCoords(), model, "minmax");
                    const clipped_color = Color.in(model).setCoords(clipped_coords);
                    const deltaE = candidate_color.deltaEOK(clipped_color);
                    if (deltaE < 2) {
                        clipped = clipped_coords;
                        return roundCoords(clipped);
                    } else {
                        C_high = C_mid;
                    }
                }
            }

            const finalColor = Color.in("oklch").setCoords([L_adjusted, C_low, H, alpha]);
            clipped = finalColor.in(model).getCoords();
            return roundCoords(clipped);
        }

        case "css-gamut-map": {
            if (targetGamut === null) {
                return roundCoords(coords);
            }

            const color = Color.in(model).setCoords(coords);

            const [L, C, H, alpha] = color.in("oklch").getCoords();

            if (L >= 1.0) {
                const white = Color.in("oklab").setCoords([1, 0, 0, alpha]);
                return roundCoords(white.in(model).getCoords());
            }

            if (L <= 0.0) {
                const black = Color.in("oklab").setCoords([0, 0, 0, alpha]);
                return roundCoords(black.in(model).getCoords());
            }

            if (color.inGamut(targetGamut as ColorSpace, { epsilon: 1e-5 })) {
                return roundCoords(coords);
            }

            const JND = 0.02;
            const epsilon = 0.0001;

            const current = Color.in("oklch").setCoords([L, C, H, alpha]);
            let clipped: number[] = fit(current.getCoords(), model, "minmax");

            const initialClippedColor = Color.in(model).setCoords(clipped);
            const E = current.deltaEOK(initialClippedColor);

            if (E < JND) {
                return roundCoords(clipped);
            }

            let min = 0;
            let max = C;
            let min_inGamut = true;

            while (max - min > epsilon) {
                const chroma = (min + max) / 2;
                const candidate = Color.in("oklch").setCoords([L, chroma, H, alpha]);

                if (min_inGamut && candidate.inGamut(targetGamut as ColorSpace, { epsilon: 1e-5 })) {
                    min = chroma;
                } else {
                    const clippedCoords = fit(candidate.getCoords(), model, "minmax");
                    clipped = clippedCoords;
                    const clippedColor = Color.in(model).setCoords(clippedCoords);
                    const deltaE = candidate.deltaEOK(clippedColor);

                    if (deltaE < JND) {
                        if (JND - deltaE < epsilon) {
                            return roundCoords(clipped);
                        } else {
                            min_inGamut = false;
                            min = chroma;
                        }
                    } else {
                        max = chroma;
                    }
                }
            }

            return roundCoords(clipped);
        }

        default:
            throw new Error(`Invalid gamut clipping method: must be 'minmax', 'chroma-reduction', or 'css-gamut-map'.`);
    }
}
