import type {
    ComponentDefinition,
    ConverterWithComponents,
    HueInterpolationMethod,
    SpaceMatrixMap,
    XYZA,
} from "./types.js";

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
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => t * (2 - t),
    easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => --t * t * t + 1,
    easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
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
 * Creates a color space converter for a given color space.
 *
 * @returns A converter with components object.
 * @throws {Error} When invalid color string is provided to toComponents.
 */
export function createSpaceConverter<T extends string, C extends readonly string[]>(
    name: T,
    space: SpaceMatrixMap & { components: C; whitePoint?: "D50" | "D65" }
) {
    const isD50 = space.whitePoint === "D50";
    const toXYZMatrix = isD50 ? multiplyMatrices(D50_to_D65, space.toXYZMatrix) : space.toXYZMatrix;
    const fromXYZMatrix = isD50 ? multiplyMatrices(space.fromXYZMatrix, D65_to_D50) : space.fromXYZMatrix;

    const pattern = new RegExp(
        `^color\\(\\s*${name}\\s+(none|[\\d.]+%?)\\s+(none|[\\d.]+%?)\\s+(none|[\\d.]+%?)(?:\\s*\\/\\s*(none|[\\d.]+%?))?\\s*\\)$`,
        "i"
    );

    return {
        pattern,

        targetGamut: name,

        components: Object.fromEntries(
            space.components.map((comp, index) => [comp, { index, min: 0, max: 1, precision: 5 }])
        ) as { [K in C[number]]: ComponentDefinition }, // eslint-disable-line no-unused-vars

        toComponents: (colorString: string): number[] => {
            const match = colorString.match(pattern);
            if (!match) {
                throw new Error(`Invalid ${name} color: ${colorString}`);
            }
            const parseComponent = (s: string): number => {
                if (s === "none") return 0;
                if (s.endsWith("%")) return parseFloat(s.slice(0, -1)) / 100;
                return parseFloat(s);
            };
            const parseAlpha = (s: string | undefined): number => {
                if (s == null) return 1;
                if (s === "none") return 0;
                if (s.endsWith("%")) return parseFloat(s) / 100;
                return parseFloat(s);
            };
            const components = [1, 2, 3].map((i) => parseComponent(match[i]));
            const alpha = parseAlpha(match[4]);
            return [...components, alpha];
        },

        fromComponents: (colorArray: (number | undefined)[]): string => {
            const [comp1, comp2, comp3, alpha = 1] = colorArray;
            const compStr = [comp1, comp2, comp3].join(" ");
            const alphaStr = alpha !== 1 ? ` / ${alpha}` : "";
            return `color(${name} ${compStr}${alphaStr})`;
        },

        toXYZA: (colorArray: number[]): XYZA => {
            const [r, g, b, a = 1] = colorArray;
            const linear = [space.toLinear(r), space.toLinear(g), space.toLinear(b)];
            const [X, Y, Z] = multiplyMatrices(toXYZMatrix, linear);
            return [X, Y, Z, a];
        },

        fromXYZA: (xyza: XYZA): number[] => {
            const [X, Y, Z, a = 1] = xyza;
            const [lr, lg, lb] = multiplyMatrices(fromXYZMatrix, [X, Y, Z]);
            const r = space.fromLinear ? space.fromLinear(lr) : lr;
            const g = space.fromLinear ? space.fromLinear(lg) : lg;
            const b = space.fromLinear ? space.fromLinear(lb) : lb;
            return [r, g, b, a];
        },
    } satisfies ConverterWithComponents;
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
