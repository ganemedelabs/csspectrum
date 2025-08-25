import { Color } from "./Color";
import { MATRICES } from "./math.js";
import { ColorFunction } from "./types.js";
import {
    configure,
    multiplyMatrices,
    registerColorFunction,
    registerColorSpace,
    registerNamedColor,
    unregister,
    use,
} from "./utils.js";

describe("Color", () => {
    it("should define a Color instance in different ways", () => {
        expect(Color.from("red")).toBeInstanceOf(Color);
        expect(new Color("rgb", [233, 45, 92])).toBeInstanceOf(Color);
        expect(new Color("display-p3", [NaN, Infinity, -Infinity])).toBeInstanceOf(Color);
        expect(new Color("oklab", { l: 59, a: 0.1, b: 0.1 })).toBeInstanceOf(Color);
    });

    it("should correctly identify all supported color syntaxes", () => {
        const cases = [
            ["#ff5733", "hex-color"],
            ["rgb(255, 87, 51)", "rgb"],
            ["hsl(9, 100%, 60%)", "hsl"],
            ["hwb(9 10% 20%)", "hwb"],
            ["lab(53.23288% 80.10933 67.22006)", "lab"],
            ["lch(50% 80% 30)", "lch"],
            ["oklab(59% 0.1 0.1 / 0.5)", "oklab"],
            ["oklch(60% 0.15 50)", "oklch"],
            ["color(srgb 0.88 0.75 0.49)", "srgb"],
            ["color(srgb-linear 0.5 0.3 0.2)", "srgb-linear"],
            ["color(display-p3 0.5 0.34 0.2)", "display-p3"],
            ["color(rec2020 0.5 0.34 0.2)", "rec2020"],
            ["color(a98-rgb 0.5 0.34 0.2)", "a98-rgb"],
            ["color(prophoto-rgb 0.5 0.34 0.2)", "prophoto-rgb"],
            ["color(xyz-d65 0.37 0.4 0.42)", "xyz-d65"],
            ["color(xyz-d50 0.37 0.4 0.32)", "xyz-d50"],
            ["color(xyz 0.37 0.4 0.42)", "xyz"],
            ["red", "named-color"],
            ["color-mix(in hsl, red, blue)", "color-mix"],
            ["transparent", "transparent"],
            ["currentColor", "currentColor"],
            ["ButtonText", "system-color"],
            ["contrast-color(lime)", "contrast-color"],
            ["device-cmyk(0.1 0.2 0.3 0.4)", "device-cmyk"],
            ["light-dark(green, yellow)", "light-dark"],
        ];

        cases.forEach(([input, expected]) => {
            expect(Color.type(input)).toBe(expected);
        });
    });

    it("should correctly identify relative colors", () => {
        const cases = [
            ["color(from red a98-rgb r g b)", "a98-rgb"],
            ["color(from red xyz-d50 x y z / alpha)", "xyz-d50"],
            ["hsl(from red calc(h + s) s l)", "hsl"],
            ["hwb(from red h 50 b / alpha)", "hwb"],
            ["lab(from lch(51.51% 52.21 325.8) l a b)", "lab"],
            ["oklab(from oklch(100% calc(NaN) none) a calc(l * (a + b)) b / calc(alpha))", "oklab"],
        ];

        cases.forEach(([input, expected]) => {
            expect(Color.type(input)).toBe(expected);
        });
    });

    it("should return correct coords", () => {
        const cases: [string, ColorFunction, number[]][] = [
            ["blanchedalmond", "rgb", [255, 235, 205, 1]],
            ["#7a7239", "rgb", [122, 114, 57, 1]],
            ["rgb(68% 16% 50% / 0.3)", "rgb", [173, 41, 128, 0.3]],
            ["hsla(182, 43%, 33%, 0.8)", "hsl", [182, 43, 33, 0.8]],
            ["hwb(228 6% 9% / 0.6)", "hwb", [228, 6, 9, 0.6]],
            ["lab(52.23% 40.16% 59.99% / 0.5)", "lab", [52.23, 50.2, 74.9875, 0.5]],
            ["lch(62.23% 59.2% 126.2 / 0.5)", "lch", [62.23, 88.8, 126.2, 0.5]],
            ["oklab(42.1% 41% -25% / 0.5)", "oklab", [0.421, 0.164, -0.1, 0.5]],
            ["oklch(72.32% 0.12% 247.99 / 0.5)", "oklch", [0.7232, 0.00048, 247.99, 0.5]],
            ["color(srgb 0.7 0.2 0.5 / 0.3)", "srgb", [0.7, 0.2, 0.5, 0.3]],
            ["color(srgb-linear 0.49 0.04 0.25 / 0.4)", "srgb-linear", [0.49, 0.04, 0.25, 0.4]],
            ["color(rec2020 0.6 0.3 0.4 / 0.5)", "rec2020", [0.6, 0.3, 0.4, 0.5]],
            ["color(prophoto-rgb 0.8 0.1 0.6 / 0.6)", "prophoto-rgb", [0.8, 0.1, 0.6, 0.6]],
            ["color(a98-rgb 0.5 0.4 0.7 / 0.7)", "a98-rgb", [0.5, 0.4, 0.7, 0.7]],
            ["color(xyz-d65 0.4 0.5 0.2 / 0.8)", "xyz-d65", [0.4, 0.5, 0.2, 0.8]],
            ["color(xyz-d50 0.3 0.6 0.1 / 0.9)", "xyz-d50", [0.3, 0.6, 0.1, 0.9]],
            ["color(xyz 0.2 0.7 0.3 / 0.2)", "xyz", [0.2, 0.7, 0.3, 0.2]],
        ];

        cases.forEach(([input, space, expected]) => {
            expect(Color.from(input).in(space).getCoords("clip")).toEqual(expected);
        });
    });

    it("should convert HEX color to RGB", () => {
        expect(Color.from("#ff5733").to("rgb")).toBe("rgb(255 87 51)");
    });

    it("should convert LCH color to sRGB", () => {
        expect(Color.from("lch(79.7256 40.448 84.771)").to("srgb")).toBe("color(srgb 0.8741 0.76037 0.47644)");
    });

    it("should output with different options", () => {
        const hsl = Color.from("hsl(339 83 46 / 0.5)");
        const lch = Color.from("lch(83 122 270)");
        const oklab = Color.from("oklab(0.18751241 0.22143 -0.398685234)");
        const xyz = Color.from("color(xyz 1.4 0.3 -0.2)");

        expect(hsl.to("hsl", { legacy: true })).toBe("hsla(339, 83, 46, 0.5)");
        expect(lch.to("lch", { units: true })).toBe("lch(83% 122 270deg)");
        expect(oklab.to("oklab", { precision: 1 })).toBe("oklab(0.2 0.2 -0.4)");
        expect(xyz.to("xyz", { fit: "none" })).toBe("color(xyz 1.4 0.3 -0.2)");
    });

    it("should parse deeply nested colors", () => {
        const color = Color.from(`
            color-mix(
                in oklch longer hue,
                color(
                    from hsl(240deg none calc(-infinity) / 0.5)
                    display-p3
                    r calc(g + b) 100 / alpha
                ),
                rebeccapurple 20%
            )
        `);
        expect(color.to("hwb")).toBeDefined();

        const getNestedColor = (deepness: number = 1): string => {
            const randomNum = (): number => Math.floor(Math.random() * 100);
            const randomRgbSpace = (): string =>
                ["srgb", "srgb-linear", "display-p3", "rec2020", "a98-rgb", "prophoto-rgb"][
                    Math.floor(Math.random() * 6)
                ];
            const randomXyzSpace = (): string => ["xyz-d65", "xyz-d50", "xyz"][Math.floor(Math.random() * 3)];
            const randomModel = (): string =>
                ["rgb", "hsl", "hwb", "lab", "lch", "oklab", "oklch"][Math.floor(Math.random() * 7)];

            const colorFns = [
                (inner: string) => `light-dark(${inner}, ${getNestedColor()})`,
                (inner: string) =>
                    `color-mix(in ${randomModel()}, ${inner} ${randomNum()}%, rebeccapurple ${randomNum()}%)`,
                (inner: string) => `contrast-color(${inner})`,
                (inner: string) => `rgb(from ${inner} r g b)`,
                (inner: string) => `hsl(from ${inner} h s l)`,
                (inner: string) => `hwb(from ${inner} h w b)`,
                (inner: string) => `lab(from ${inner} l a b)`,
                (inner: string) => `lch(from ${inner} l c h)`,
                (inner: string) => `oklab(from ${inner} l a b)`,
                (inner: string) => `oklch(from ${inner} l c h)`,
                (inner: string) => `color(from ${inner} ${randomRgbSpace()} r g b / alpha)`,
                (inner: string) => `color(from ${inner} ${randomXyzSpace()} x y z / alpha)`,
            ];

            if (deepness <= 0) {
                return `hsl(120deg ${randomNum()}% ${randomNum()}%)`;
            }

            const randomFn = colorFns[Math.floor(Math.random() * colorFns.length)];
            const inner = getNestedColor(deepness - 1);
            return randomFn(inner);
        };

        for (let depth = 1; depth <= 100; depth++) {
            const color = Color.from(getNestedColor(depth));
            expect(color).toBeInstanceOf(Color);
        }
    });

    it("should calculate luminance correctly", () => {
        expect(Color.from("rgb(255, 255, 255)").luminance()).toBeCloseTo(1);
        expect(Color.from("rgb(0, 0, 0)").luminance()).toBeCloseTo(0);
    });

    it("should calculate contrast ratio correctly", () => {
        expect(Color.from("#ffffff").contrast("#000000")).toBeCloseTo(21);
    });

    it("should determine if a color pair is accessible", () => {
        expect(Color.from("#ffffff").accessibility("#000000", { level: "AA" }).passes).toBe(true);
        expect(Color.from("#ffffff").accessibility("#cccccc", { level: "AAA" }).passes).toBe(false);
        expect(Color.from("#ffffff").accessibility("#000000", { level: "AA", fontSize: 20 }).passes).toBe(true);
        expect(Color.from("#ffffff").accessibility("#cccccc", { level: "AAA", fontSize: 20 }).passes).toBe(false);
    });

    it("should determine if a color is dark", () => {
        expect(Color.from("rgb(0, 0, 0)").luminance() < 0.5).toBe(true);
        expect(Color.from("rgb(255, 255, 255)").luminance() < 0.5).toBe(false);
    });

    it("should determine if a color is light", () => {
        expect(Color.from("rgb(255, 255, 255)").luminance() >= 0.5).toBe(true);
        expect(Color.from("rgb(0, 0, 0)").luminance() >= 0.5).toBe(false);
    });

    it("should determine if a color is cool", () => {
        const color = Color.from("rgb(0, 0, 255)");
        const { h } = color.in("hsl").get();
        expect(h > 60 && h < 300).toBe(true);
    });

    it("should determine if a color is warm", () => {
        const color = Color.from("rgb(255, 0, 0)");
        const { h } = color.in("hsl").get();
        expect(h <= 60 || h >= 300).toBe(true);
    });

    it("should check color equality correctly", () => {
        expect(Color.from("#ff5733").equals("rgb(255, 87, 51)")).toBe(true);
    });

    it("should return a random color", () => {
        const randomColor = Color.random("named-color");
        expect(Color.type(randomColor)).toBe("named-color");
    });

    it("should return true if a color is in gamut", () => {
        expect(Color.from("color(display-p3 1 0 0)").inGamut("srgb")).toBe(false);
        expect(Color.from("color(display-p3 1 0 0)").inGamut("xyz")).toBe(true);
    });

    it("should handle none and calc(NaN) components correctly", () => {
        const color = Color.from("hsl(none calc(NaN) 50%)");
        expect(color.to("hsl")).toBe("hsl(0 0 50)");
        const adjusted = color.in("hsl").set({ h: 150, s: 100 });
        expect(adjusted.to("hsl")).toBe("hsl(150 100 50)");
    });

    it("should handle calc(infinity) components correctly", () => {
        const color = Color.from("hsl(calc(infinity) calc(-infinity) 50%)");
        expect(color.to("hsl")).toBe("hsl(0 0 50)");
        const adjusted = color.in("hsl").set({ h: 100, s: 100 });
        expect(adjusted.to("hsl")).toBe("hsl(100 100 50)");
    });

    it("should define a color from components", () => {
        const fromObject = new Color("hsl", { h: 260, s: 100, l: 50 }).to("hsl");
        const fromArray = new Color("hsl", [260, 100, 50]).to("hsl");
        expect(fromObject).toBe("hsl(260 100 50)");
        expect(fromArray).toEqual(fromObject);
    });

    it("should return correct component values using get()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        const fit = "clip";
        const rgb = rgbInterface.get(fit);
        expect(rgb).toEqual({ r: 0, g: 157, b: 255, alpha: 1 });
    });

    it("should retrieve the correct array of components using getCoords()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        expect(rgbInterface.getCoords("clip")).toEqual([0, 157, 255, 1]);
    });

    it("should update multiple components with set()", () => {
        const hslColor = Color.from("hsl(0, 100%, 50%)");
        const updated = hslColor.in("hsl").set({
            h: (h) => h + 50,
            s: (s) => s - 20,
        });
        const [h, s] = updated.getCoords("clip");
        expect([h, s]).toStrictEqual([50, 80]);
    });

    it("should update multiple components with setCoords()", () => {
        const hslColor = Color.from("hsl(200 100% 50%)");
        const updated = hslColor.in("hsl").setCoords([undefined, 50, 80]);
        const coords = updated.getCoords("clip");
        expect(coords).toStrictEqual([200, 50, 80, 1]);
    });

    it("should mix two colors correctly using mix()", () => {
        const color1 = Color.from("red").in("hsl").mix("lime", { hue: "shorter" }).to("named-color");
        const color2 = Color.from("red").in("hsl").mix("lime", { hue: "longer" }).to("named-color");
        expect(color1).toBe("yellow");
        expect(color2).toBe("blue");
    });

    it("should clamp component values when getting components", () => {
        const rgbColor = Color.from("rgb(200, 100, 50)").in("rgb").set({ g: 400 });
        const [, g] = rgbColor.getCoords("clip");
        expect(g).toBe(255);
    });

    it("should throw an error for an invalid model", () => {
        expect(() => Color.from("rgb(255, 255, 255)").in("invalidModel")).toThrow();
    });

    it("should adjust opacity correctly", () => {
        const color = Color.from("rgb(120, 20, 170)");
        const adjusted = color.in("rgb").set({ alpha: 0.5 });
        expect(adjusted.to("rgb")).toBe("rgb(120 20 170 / 0.5)");
    });

    it("should adjust saturation correctly", () => {
        const color = Color.from("hsl(120, 80%, 50%)");
        const adjusted = color.set({ s: 10 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(120deg 10% 50%)");
    });

    it("should adjust hue correctly", () => {
        const color = Color.from("hsl(30, 100%, 50%)");
        const adjusted = color.set({ h: (h) => h - 70 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(320deg 100% 50%)");
    });

    it("should adjust brightness correctly", () => {
        const color = Color.from("hsl(50, 100%, 30%)");
        const adjusted = color.set({ l: 50 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(50deg 100% 50%)");
    });

    it("should adjust contrast correctly", () => {
        const color = Color.from("rgb(30, 190, 250)");
        const amount = 2;
        const adjusted = color.set({
            r: (r) => (r - 128) * amount + 128,
            g: (g) => (g - 128) * amount + 128,
            b: (b) => (b - 128) * amount + 128,
        });
        expect(adjusted.to("rgb")).toBe("rgb(0 252 255)");
    });

    it("should apply sepia filter", () => {
        const color = Color.from("rgb(255, 50, 70)");
        const amount = 1;

        const adjusted = color.set(({ r, g, b }) => ({
            r: r + (0.393 * r + 0.769 * g + 0.189 * b - r) * amount,
            g: g + (0.349 * r + 0.686 * g + 0.168 * b - g) * amount,
            b: b + (0.272 * r + 0.534 * g + 0.131 * b - b) * amount,
        }));

        expect(adjusted.to("rgb")).toBe("rgb(152 135 105)");
    });

    it("should return the same color-mix in different syntaxes", () => {
        const expected = Color.from("hsl(240, 50%, 50%)").in("lch").mix("#bf4040ff").to("rgb");

        const fromColorMix = Color.from("color-mix(in lch, hsl(240, 50%, 50%), #bf4040ff)").to("rgb");
        const fromRelative = Color.from("hsl(from color-mix(in lch, hsl(240, 50%, 50%), #bf4040ff) h s l)").to("rgb");

        expect(fromColorMix).toEqual(expected);
        expect(fromRelative).toEqual(expected);
    });

    it("should change config correctly", () => {
        const lightDark = "light-dark(red, blue)";
        const systemColor = "LinkText";

        expect(Color.from(lightDark).to("named-color")).toBe("red");
        expect(Color.from(systemColor).to("rgb")).toBe("rgb(0 0 255)");

        configure({ theme: "dark" });

        expect(Color.from(lightDark).to("named-color")).toBe("blue");
        expect(Color.from(systemColor).to("rgb")).toBe("rgb(0 128 255)");

        configure({ systemColor: { key: "LinkText", dark: [50, 150, 250] } });

        expect(Color.from(systemColor).to("rgb")).toBe("rgb(50 150 250)");
    });

    it("should parse calc() expressions correctly", () => {
        const cases = [
            ["rgb(calc(50% + 10%) calc(20% * 3) calc(100% - 30%))", "rgb(153 153 178.5)"],
            ["hsl(calc(360deg / 2) calc(100% - 20%) calc((50% + 10%) * 2))", "hsl(180 80 100)"],
            ["hwb(calc(240deg - 30deg) calc(10% + 5%) calc(20% * 2))", "hwb(210 15 40)"],
            ["lab(calc(100% - 20%) calc(50% + 10%) calc(30% * 2))", "lab(80 75 75)"],
            ["lch(calc(100% - 20%) calc(50% + 10%) calc(180deg + 90deg))", "lch(80 90 270)"],
            ["oklab(calc(100% - 20%) calc(50% + 10%) calc(30% * -2))", "oklab(0.8 0.24 -0.24)"],
            ["oklch(calc(100% - 20%) calc(50% + 10%) calc(180deg + 90deg))", "oklch(0.8 0.24 270)"],
            [
                "color(srgb calc(50% + 10%) calc(20% * 3) calc(100% - 30%) / calc(1 - 0.3))",
                "color(srgb 0.6 0.6 0.7 / 0.7)",
            ],
            ["rgb(calc(min(80%, 90%) * 255) calc(max(10%, 20%) * 255) calc(round(50.6%) * 255))", "rgb(255 255 255)"],
            ["hsl(calc(sin(0.5 * pi) * 360deg) calc(sqrt(0.25) * 100%) calc(abs(-50%) * 100%))", "hsl(0 50 100)"],
            ["hwb(calc(180deg + cos(0) * 90deg) calc(min(30%, 40%) * 2) calc(max(10%, 5%) * 4))", "hwb(270 60 40)"],
            ["lab(calc(100% * exp(0)) calc(pow(2, 3) * 10) calc(floor(25.7% * 300)))", "lab(100 80 125)"],
            ["lch(calc(ceil(79.3%)) calc(hypot(30, 40)) calc(atan2(1, 1) * 180deg / pi))", "lch(80 50 45)"],
            [
                "color(srgb calc(pow(0.5, 2)) calc(log(100) / log(10) * 0.3) calc(round(0.756)) / calc(sign(0.8)))",
                "color(srgb 0.25 0.6 1)",
            ],
            ["rgb(from #ff0000 calc(r * 0.5) calc(g + 20%) calc(b + 30%))", "rgb(127.5 51 76.5)"],
            ["hsl(from #00ff00 calc(h * 2) calc(s - 20%) calc(l / 2))", "hsl(240 80 25)"],
            [
                "color(from #0000ff srgb calc(r * 2) calc(g + 0.1) calc(b - 0.1) / calc(alpha * 0.5))",
                "color(srgb 0 0.1 0.9 / 0.5)",
            ],
            ["oklch(from oklch(0.8 0.2 120deg) calc(l * 0.9) calc(c * 1.5) calc(h + 60deg))", "oklch(0.72 0.3 180)"],
            ["lab(from lab(50 20 30) calc(l + 10%) calc(a * min(2, 3)) calc(b * max(0.5, 1)))", "lab(60 40 30)"],
        ];

        cases.forEach(([input, expected]) => {
            const type = Color.type(input) as string;
            expect(Color.from(input).to(type, { precision: 4 })).toBe(expected);
        });
    });
});

describe("Color registration system", () => {
    it("should register a <named-color>", () => {
        registerNamedColor("Dusk Mint", [123, 167, 151]);

        expect(Color.from("rgb(123 167 151)").to("named-color")).toBe("duskmint");
        expect(Color.from("duskmint").equals("#7ba797")).toBe(true);
    });

    it("should register a <color-function>", () => {
        /**
         * @see {@link https://colour.readthedocs.io/en/latest/_modules/colour/models/rgb/ictcp.html#XYZ_to_ICtCp|Source code for colour.models.rgb.ictcp}
         */
        registerColorFunction("ictcp", {
            bridge: "rec2020",
            targetGamut: "rec2020",
            components: {
                i: { index: 0, value: [0, 1], precision: 5 },
                ct: { index: 1, value: [-1, 1], precision: 5 },
                cp: { index: 2, value: [-1, 1], precision: 5 },
            },
            toBridge: (ictcp: number[]) => {
                const m1 = 0.1593017578125;
                const m2 = 78.84375;
                const c1 = 0.8359375;
                const c2 = 18.8515625;
                const c3 = 18.6875;
                const MATRIX_ICTCP_TO_LMS_P = [
                    [1.0, 0.008609037, 0.111029625],
                    [1.0, -0.008609037, -0.111029625],
                    [1.0, 0.5600313357, -0.320627175],
                ];
                const MATRIX_LMS_TO_BT2020 = [
                    [3.4366066943, -2.5064521187, 0.0698454243],
                    [-0.7913295556, 1.9836004518, -0.1922708962],
                    [-0.0259498997, -0.0989137147, 1.1248636144],
                ];
                const pq_eotf = (E: number) => {
                    if (E <= 0) return 0;
                    const E_pow = Math.pow(E, 1 / m2);
                    const numerator = Math.max(E_pow - c1, 0);
                    const denominator = c2 - c3 * E_pow;
                    return Math.pow(numerator / denominator, 1 / m1);
                };
                const fromLinear = (c: number) => {
                    const α = 1.09929682680944;
                    const β = 0.018053968510807;
                    const sign = c < 0 ? -1 : 1;
                    const abs = Math.abs(c);
                    if (abs > β) {
                        return sign * (α * Math.pow(abs, 0.45) - (α - 1));
                    }
                    return sign * (4.5 * abs);
                };
                const lms_p = multiplyMatrices(MATRIX_ICTCP_TO_LMS_P, ictcp);
                const lms = lms_p.map(pq_eotf);
                const linear = multiplyMatrices(MATRIX_LMS_TO_BT2020, lms);
                return linear.map(fromLinear);
            },
            fromBridge: (rec2020: number[]) => {
                const toLinear = (c: number) => {
                    const α = 1.09929682680944;
                    const β = 0.018053968510807;
                    const sign = c < 0 ? -1 : 1;
                    const abs = Math.abs(c);
                    if (abs < β * 4.5) {
                        return sign * (abs / 4.5);
                    }
                    return sign * Math.pow((abs + α - 1) / α, 1 / 0.45);
                };
                const linear = rec2020.map(toLinear);
                const m1 = 0.1593017578125;
                const m2 = 78.84375;
                const c1 = 0.8359375;
                const c2 = 18.8515625;
                const c3 = 18.6875;
                const MATRIX_BT2020_TO_LMS = [
                    [0.412109375, 0.5239257812, 0.0639648438],
                    [0.1667480469, 0.7204589844, 0.1127929688],
                    [0.0241699219, 0.0754394531, 0.900390625],
                ];
                const MATRIX_LMS_P_TO_ICTCP = [
                    [0.5, 0.5, 0.0],
                    [1.6137695312, -3.3234863281, 1.7097167969],
                    [4.3781738281, -4.2456054688, -0.1325683594],
                ];
                const pq_eotf_inverse = (N: number) => {
                    if (N <= 0) return 0;
                    const N_pow_m1 = Math.pow(N, m1);
                    return Math.pow((c1 + c2 * N_pow_m1) / (1 + c3 * N_pow_m1), m2);
                };
                const lms = multiplyMatrices(MATRIX_BT2020_TO_LMS, linear);
                const lms_p = lms.map(pq_eotf_inverse);
                return multiplyMatrices(MATRIX_LMS_P_TO_ICTCP, lms_p);
            },
        });

        const ictcp = Color.from("ictcp(none calc(-infinity) 100%)");
        expect(ictcp.getCoords()).toEqual([0, -1, 1, 1]);
        expect(() => ictcp.set({ cp: 0 }).to("rgb")).not.toThrow();

        const instance = new Color("ictcp" as ColorFunction, [NaN, -Infinity, Infinity]);
        expect(instance.getCoords()).toEqual([0, -1, 1, 1]);

        const relative = "ictcp(from ictcp(0.5 0.3 -0.2) i ct cp)";
        expect(Color.isValid(relative, "ictcp"));

        const outOfSrgb = Color.from("ictcp(0.8 -0.4 -0.1)");
        expect(outOfSrgb.inGamut("srgb")).toBe(false);
        expect(outOfSrgb.inGamut("rec2020")).toBe(true);
    });

    it("should register a color space for <color()> function", () => {
        registerColorSpace("rec2100-linear", {
            components: ["r", "g", "b"],
            bridge: "xyz-d65",
            toBridgeMatrix: MATRICES.REC2020_to_XYZD65,
            fromBridgeMatrix: MATRICES.XYZD65_to_REC2020,
        });

        const rec2100 = Color.from("color(rec2100-linear none calc(-infinity) 100%)");
        expect(rec2100.getCoords()).toEqual([0, 0, 1, 1]);
        expect(() => rec2100.set({ r: 0 }).to("xyz-d65")).not.toThrow();

        const instance = new Color("rec2100-linear" as ColorFunction, [NaN, -Infinity, Infinity]);
        expect(instance.getCoords()).toEqual([0, 0, 1, 1]);

        const relative = "color(from color(rec2100-linear 0.7 0.3 0.1) rec2100-linear r g b)";
        expect(Color.isValid(relative, "rec2100-linear"));

        const outOfSrgb = Color.from("color(rec2100-linear 0 1 0)");
        expect(outOfSrgb.inGamut("srgb")).toBe(false);
        expect(outOfSrgb.inGamut("rec2100-linear")).toBe(true);
    });

    it("should unregister <color> types from the system", () => {
        unregister("hwb", "prophoto-rgb", "lch");

        expect(() => Color.from("hwb(120deg 0% 0%)")).toThrow();
        expect(() => Color.from("red").in("prophoto-rgb").set({ b: 0 })).toThrow();
        expect(() => new Color("lch", [90, 100, 280])).toThrow();
    });
});

declare module "./Color.js" {
    interface Color<M extends ColorFunction> {
        /**
         * Lightens the color by the given amount.
         * @param amount - The amount to lighten the color by.
         * @returns A new `Color` instance with increased brightness.
         */
        lighten(amount: number): Color<M>; // eslint-disable-line no-unused-vars
        /**
         * Darkens the color by the given amount.
         * @param amount - The amount to darken the color by.
         * @returns A new `Color` instance with decreased brightness.
         */
        darken(amount: number): Color<M>; // eslint-disable-line no-unused-vars
    }
}

describe("use()", () => {
    it("should register methods to the class", () => {
        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

        const lightenPlugin = (ColorClass: typeof Color) => {
            ColorClass.prototype.lighten = function <M extends ColorFunction>(this: Color<M>, amount: number) {
                return this.in("hsl").set({
                    l: (l: number) => clamp(l + amount, 0, 100),
                });
            };
        };

        const darkenPlugin = (ColorClass: typeof Color) => {
            ColorClass.prototype.darken = function <M extends ColorFunction>(this: Color<M>, amount: number) {
                return this.in("hsl").set({
                    l: (l: number) => clamp(l - amount, 0, 100),
                });
            };
        };

        use(lightenPlugin, darkenPlugin);

        const color = Color.from("hsl(50 50 50)");
        expect(color.lighten(10).to("hsl")).toBe("hsl(50 50 60)");
        expect(color.darken(20).to("hsl")).toBe("hsl(50 50 30)");
    });

    it("should throw if called with no arguments", () => {
        expect(() => use()).toThrow();
    });

    it("should throw if a non-function plugin is passed", () => {
        expect(() => use("notAFunction" as unknown as () => void)).toThrow();
    });

    it("should warn and skip duplicate plugins", () => {
        const plugin = jest.fn();
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        use(plugin);
        use(plugin);

        expect(warnSpy).toHaveBeenCalledWith("Plugin at index 0 has already been registered. Skipping.");
        warnSpy.mockRestore();
    });

    it("should log an error if a plugin throws", () => {
        const error = new Error("plugin fail");
        const badPlugin = () => {
            throw error;
        };

        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        use(badPlugin);

        expect(errorSpy).toHaveBeenCalledWith("Error while running plugin at index 0:", error);
        errorSpy.mockRestore();
    });

    it("should allow multiple plugins in a single call", () => {
        const pluginA = jest.fn();
        const pluginB = jest.fn();

        use(pluginA, pluginB);

        expect(pluginA).toHaveBeenCalledWith(Color);
        expect(pluginB).toHaveBeenCalledWith(Color);
    });
});
