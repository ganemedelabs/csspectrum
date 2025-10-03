import { Color } from "../Color";
import { colorModels } from "../converters.js";
import { EASINGS, MATRICES } from "../math.js";
import { ColorModel, ColorModelConverter, ColorSpace, FitMethod } from "../types.js";
import {
    configure,
    extractBalancedExpression,
    fit,
    multiplyMatrices,
    registerColorBase,
    registerColorFunction,
    registerColorSpace,
    registerColorType,
    registerFitMethod,
    registerNamedColor,
    unregister,
    use,
} from "../utils.js";

describe("Color", () => {
    it("should define a Color instance in different ways", () => {
        expect(Color.from("red")).toBeInstanceOf(Color);
        expect(new Color("rgb", [233, 45, 92])).toBeInstanceOf(Color);
        expect(new Color("display-p3", [NaN, Infinity, -Infinity])).toBeInstanceOf(Color);
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

    it("should regognize color space name in deeply nested color() syntax", () => {
        const color = Color.from("color(from color(from red srgb 1 1 1) srgb-linear r g b)");
        expect(color.model).toBe("srgb-linear");
    });

    it("should return correct coords", () => {
        const cases: [string, number[]][] = [
            ["blanchedalmond", [255, 235, 205, 1]],
            ["#7a7239", [122, 114, 57, 1]],
            ["rgb(68% 16% 50% / 0.3)", [173, 41, 128, 0.3]],
            ["hsla(182, 43%, 33%, 0.8)", [182, 43, 33, 0.8]],
            ["hwb(228 6% 9% / 0.6)", [228, 6, 9, 0.6]],
            ["lab(52.23% 40.16% 59.99% / 0.5)", [52.23, 50.2, 74.9875, 0.5]],
            ["lch(62.23% 59.2% 126.2 / 0.5)", [62.23, 88.8, 126.2, 0.5]],
            ["oklab(42.1% 41% -25% / 0.5)", [0.421, 0.164, -0.1, 0.5]],
            ["oklch(72.32% 0.12% 247.99 / 0.5)", [0.7232, 0.00048, 247.99, 0.5]],
            ["color(srgb 0.7 0.2 0.5 / 0.3)", [0.7, 0.2, 0.5, 0.3]],
            ["color(srgb-linear 0.49 0.04 0.25 / 0.4)", [0.49, 0.04, 0.25, 0.4]],
            ["color(rec2020 0.6 0.3 0.4 / 0.5)", [0.6, 0.3, 0.4, 0.5]],
            ["color(prophoto-rgb 0.8 0.1 0.6 / 0.6)", [0.8, 0.1, 0.6, 0.6]],
            ["color(a98-rgb 0.5 0.4 0.7 / 0.7)", [0.5, 0.4, 0.7, 0.7]],
            ["color(xyz-d65 0.4 0.5 0.2 / 0.8)", [0.4, 0.5, 0.2, 0.8]],
            ["color(xyz-d50 0.3 0.6 0.1 / 0.9)", [0.3, 0.6, 0.1, 0.9]],
            ["color(xyz 0.2 0.7 0.3 / 0.2)", [0.2, 0.7, 0.3, 0.2]],
        ];

        cases.forEach(([input, expected]) => {
            expect(Color.from(input).getCoords({ fit: "clip", precision: undefined })).toEqual(expected);
        });
    });

    it("should convert HEX color to RGB", () => {
        expect(Color.from("#ff5733").toString()).toBe("rgb(255 87 51)");
    });

    it("should output with different options", () => {
        const hsl = Color.from("hsl(339 83 46 / 0.5)");
        const lch = Color.from("lch(83 122 270)");
        const oklab = Color.from("oklab(0.18751241 0.22143 -0.398685234)");
        const xyz = Color.from("color(xyz 1.4 0.3 -0.2)");

        expect(hsl.toString({ legacy: true })).toBe("hsla(339, 83, 46, 0.5)");
        expect(lch.toString({ units: true })).toBe("lch(83% 122 270deg)");
        expect(oklab.toString({ precision: 1 })).toBe("oklab(0.2 0.2 -0.4)");
        expect(xyz.toString({ fit: "none" })).toBe("color(xyz 1.4 0.3 -0.2)");
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
            const optionalAlpha = () => {
                return Math.random() < 0.5 ? " / alpha" : "";
            };

            const colorFns = [
                (inner: string) => `light-dark(${inner}, ${getNestedColor()})`,
                (inner: string) =>
                    `color-mix(in ${randomModel()}, ${inner} ${randomNum()}%, rebeccapurple ${randomNum()}%)`,
                (inner: string) => `contrast-color(${inner})`,
                (inner: string) => `rgb(from ${inner} r g b${optionalAlpha()})`,
                (inner: string) => `hsl(from ${inner} h s l${optionalAlpha()})`,
                (inner: string) => `hwb(from ${inner} h w b${optionalAlpha()})`,
                (inner: string) => `lab(from ${inner} l a b${optionalAlpha()})`,
                (inner: string) => `lch(from ${inner} l c h${optionalAlpha()})`,
                (inner: string) => `oklab(from ${inner} l a b${optionalAlpha()})`,
                (inner: string) => `oklch(from ${inner} l c h${optionalAlpha()})`,
                (inner: string) => `color(from ${inner} ${randomRgbSpace()} r g b${optionalAlpha()})`,
                (inner: string) => `color(from ${inner} ${randomXyzSpace()} x y z${optionalAlpha()})`,
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

    it("should return random Color instance based on different options", () => {
        const c1 = Color.random();
        expect(c1).toBeInstanceOf(Color);
        expect(typeof c1.model).toBe("string");
        expect(Array.isArray(c1.coords)).toBe(true);

        const c2 = Color.random({ model: "oklch" });
        expect(c2.model).toBe("oklch");
        expect(c2.coords.length).toBe(4);

        const c3 = Color.random({
            model: "oklch",
            limits: { l: [0.4, 0.6] },
        });
        expect(c3.coords[0]).toBeGreaterThanOrEqual(0.4);
        expect(c3.coords[0]).toBeLessThanOrEqual(0.6);

        const samplesBias = Array.from(
            { length: 100 },
            () =>
                Color.random({
                    model: "oklch",
                    bias: { l: EASINGS["ease-out"] },
                }).coords[0]
        );
        const avgBias = samplesBias.reduce((a, b) => a + b, 0) / samplesBias.length;
        expect(avgBias).toBeGreaterThan(0.5);

        const base = { l: 0.7, c: 0.2 };
        const deviation = { l: 0.05, c: 0.05 };
        const samplesDev = Array.from({ length: 50 }, () => Color.random({ model: "oklch", base, deviation }).coords);
        const avgL = samplesDev.reduce((a, b) => a + b[0], 0) / samplesDev.length;
        expect(avgL).toBeGreaterThan(0.6);
        expect(avgL).toBeLessThan(0.8);

        const c4 = Color.random({
            model: "lch",
            base: { h: 400 },
            deviation: { h: 10 },
        });
        expect(c4.coords[2]).toBeGreaterThanOrEqual(0);
        expect(c4.coords[2]).toBeLessThanOrEqual(360);

        expect(() =>
            Color.random({
                model: "rgb",
                base: { h: 120 },
            })
        ).toThrow();
    });

    it("should return true if a color is in gamut", () => {
        expect(Color.from("color(display-p3 1 0 0)").inGamut("srgb")).toBe(false);
        expect(Color.from("color(display-p3 1 0 0)").inGamut("xyz")).toBe(true);
    });

    it("should handle none and calc(NaN) components correctly", () => {
        const color = Color.from("hsl(none calc(NaN) 50%)");
        expect(color.toString()).toBe("hsl(0 0 50)");
        const adjusted = color.set({ h: 150, s: 100 });
        expect(adjusted.toString()).toBe("hsl(150 100 50)");
    });

    it("should handle calc(infinity) components correctly", () => {
        const color = Color.from("hsl(calc(infinity) calc(-infinity) 50%)");
        expect(color.toString()).toBe("hsl(0 0 50)");
        const adjusted = color.set({ h: 100, s: 100 });
        expect(adjusted.toString()).toBe("hsl(100 100 50)");
    });

    it("should return correct component values using get()", () => {
        const color = Color.from("rgb(0, 157, 255)");
        const rgb = color.get({ fit: "clip" });
        expect(rgb).toEqual({ r: 0, g: 157, b: 255, alpha: 1 });
    });

    it("should retrieve the correct array of components using getCoords()", () => {
        const color = Color.from("rgb(0, 157, 255)");
        expect(color.getCoords({ fit: "clip" })).toEqual([0, 157, 255, 1]);
    });

    it("should update multiple components with set()", () => {
        const color = Color.from("hsl(0, 100%, 50%)");
        const updated = color.set({
            h: (h) => h + 50,
            s: (s) => s - 20,
        });
        const [h, s] = updated.getCoords({ fit: "clip" });
        expect([h, s]).toStrictEqual([50, 80]);
    });

    it("should update multiple components with setCoords()", () => {
        const color = Color.from("hsl(200 100% 50%)");
        const updated = color.setCoords([undefined, 50, 80]);
        const coords = updated.getCoords({ fit: "clip" });
        expect(coords).toStrictEqual([200, 50, 80, 1]);
    });

    it("should mix two colors correctly using mix()", () => {
        const color1 = Color.from("red").in("hsl").mix("lime", { hue: "shorter" }).to("named-color");
        const color2 = Color.from("red").in("hsl").mix("lime", { hue: "longer" }).to("named-color");
        expect(color1).toBe("yellow");
        expect(color2).toBe("blue");
    });

    it("should clamp component values when getting components", () => {
        const rgbColor = Color.from("rgb(200, 100, 50)").set({ g: 400 });
        const [, g] = rgbColor.getCoords({ fit: "clip" });
        expect(g).toBe(255);
    });

    it("should throw an error for an invalid model", () => {
        expect(() => Color.from("rgb(255, 255, 255)").in("invalidModel")).toThrow();
    });

    it("should adjust opacity correctly", () => {
        const color = Color.from("rgb(120, 20, 170)");
        const adjusted = color.set({ alpha: 0.5 });
        expect(adjusted.toString()).toBe("rgb(120 20 170 / 0.5)");
    });

    it("should adjust saturation correctly", () => {
        const color = Color.from("hsl(120, 80%, 50%)");
        const adjusted = color.set({ s: 10 });
        expect(adjusted.toString({ units: true })).toBe("hsl(120deg 10% 50%)");
    });

    it("should adjust hue correctly", () => {
        const color = Color.from("hsl(30, 100%, 50%)");
        const adjusted = color.set({ h: (h) => h - 70 });
        expect(adjusted.toString({ units: true })).toBe("hsl(320deg 100% 50%)");
    });

    it("should adjust brightness correctly", () => {
        const color = Color.from("hsl(50, 100%, 30%)");
        const adjusted = color.set({ l: 50 });
        expect(adjusted.toString({ units: true })).toBe("hsl(50deg 100% 50%)");
    });

    it("should adjust contrast correctly", () => {
        const color = Color.from("rgb(30, 190, 250)");
        const amount = 2;
        const adjusted = color.set({
            r: (r) => (r - 128) * amount + 128,
            g: (g) => (g - 128) * amount + 128,
            b: (b) => (b - 128) * amount + 128,
        });
        expect(adjusted.toString()).toBe("rgb(0 252 255)");
    });

    it("should apply sepia filter", () => {
        const color = Color.from("rgb(255, 50, 70)");
        const amount = 1;

        const adjusted = color.set(({ r, g, b }) => ({
            r: r + (0.393 * r + 0.769 * g + 0.189 * b - r) * amount,
            g: g + (0.349 * r + 0.686 * g + 0.168 * b - g) * amount,
            b: b + (0.272 * r + 0.534 * g + 0.131 * b - b) * amount,
        }));

        expect(adjusted.toString()).toBe("rgb(152 135 105)");
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

        configure({
            systemColors: {
                LinkText: [
                    [0, 0, 255],
                    [50, 150, 250],
                ],
            },
        });

        expect(Color.from(systemColor).to("rgb")).toBe("rgb(50 150 250)");
    });

    it("parses color-mix() weights correctly", () => {
        const c1 = Color.from("color-mix(in hsl, hsl(0 100 50), hsl(120 100 50))");
        expect(c1.to("hsl")).toBe("hsl(60 100 50)");

        const c2 = Color.from("color-mix(in hsl, hsl(0 100 50) 50%, hsl(120 100 50))");
        expect(c2.to("hsl")).toBe("hsl(60 100 50)");

        const c3 = Color.from("color-mix(in hsl, hsl(0 100 50) 30%, hsl(120 100 50))");
        expect(c3.to("hsl")).toBe("hsl(84 100 50)");

        const c4 = Color.from("color-mix(in hsl, hsl(0 100 50), hsl(120 100 50) 50%)");
        expect(c4.to("hsl")).toBe("hsl(60 100 50)");

        const c5 = Color.from("color-mix(in hsl, hsl(0 100 50), hsl(120 100 50) 30%)");
        expect(c5.to("hsl")).toBe("hsl(36 100 50)");

        const c6 = Color.from("color-mix(in hsl, hsl(0 100 50) 70%, hsl(120 100 50) 30%)");
        expect(c6.to("hsl")).toBe("hsl(36 100 50)");

        const c7 = Color.from("color-mix(in hsl, hsl(0 100 50) 30%, hsl(120 100 50) 50%)");
        expect(c7.to("hsl")).toBe("hsl(75 100 50 / 0.8)");

        const c8 = Color.from("color-mix(in hsl, hsl(0 100 50) calc(30% + 20%), hsl(120 100 50))");
        expect(c8.to("hsl")).toBe("hsl(60 100 50)");

        const c9 = Color.from("color-mix(in hsl, hsl(0 100 50) 70%, hsl(120 100 50) calc(30% + 20%))");
        expect(c9.to("hsl")).toBe("hsl(36 100 50)");

        const c10 = Color.from("color-mix(in hsl, hsl(0 100 50) calc(10% + 20%), hsl(120 100 50) calc(30% + 20%))");
        expect(c10.to("hsl")).toBe("hsl(60 100 50)");

        const c11 = Color.from("color-mix(in hsl, hsl(0 100 50) 80%, hsl(120 100 50) 80%)");
        expect(c11.to("hsl")).toBe("hsl(60 100 50)");

        const c12 = Color.from("color-mix(in hsl, hsl(0 100 50) 20%, hsl(120 100 50) 80%)");
        expect(c12.to("hsl")).toBe("hsl(96 100 50)");

        const c13 = Color.from("color-mix(in hsl, hsl(0 100 50) 80%, hsl(120 100 50) 20%)");
        expect(c13.to("hsl")).toBe("hsl(24 100 50)");

        const c14 = Color.from("color-mix(in hsl, 20% hsl(0 100 50), 80% hsl(120 100 50))");
        expect(c14.to("hsl")).toBe("hsl(96 100 50)");

        const c15 = Color.from("color-mix(in hsl, 80% hsl(0 100 50), 20% hsl(120 100 50))");
        expect(c15.to("hsl")).toBe("hsl(24 100 50)");
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
            ["rgb(from #ff0000 calc(r * 0.5) calc(g + 50) calc(b + 75))", "rgb(127.5 50 75)"],
            ["hsl(from #00ff00 calc(h * 2) calc(s - 20) calc(l / 2))", "hsl(240 80 25)"],
            [
                "color(from #0000ff srgb calc(r * 2) calc(g + 0.1) calc(b - 0.1) / calc(alpha * 0.5))",
                "color(srgb 0 0.1 0.9 / 0.5)",
            ],
            ["oklch(from oklch(0.8 0.2 120deg) calc(l * 0.9) calc(c * 1.5) calc(h + 60))", "oklch(0.72 0.3 180)"],
            ["lab(from lab(50 20 30) calc(l + 10) calc(a * min(2, 3)) calc(b * max(0.5, 1)))", "lab(60 40 30)"],
        ];

        cases.forEach(([input, expected]) => {
            expect(Color.from(input).toString({ precision: 4 })).toBe(expected);
        });
    });

    it("should gamut map out-of-gamut sRGB coords consistently", () => {
        const coords = [1.2, -0.3, 0.5];
        const model = "srgb";
        const epsilon = 1e-5;

        const clipCoords = new Color(model, coords).getCoords({ fit: "clip" });
        const chromaCoords = new Color(model, coords).getCoords({ fit: "chroma-reduction" });
        const cssCoords = new Color(model, coords).getCoords({ fit: "css-gamut-map" });

        expect(clipCoords).toEqual([1, 0, 0.5, 1]);
        expect(chromaCoords.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);
        expect(cssCoords.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);

        expect(chromaCoords).not.toEqual(clipCoords);
        expect(cssCoords).not.toEqual(clipCoords);
    });

    it("should leave already in-gamut coords unchanged", () => {
        const fitMethods: FitMethod[] = ["clip", "chroma-reduction", "css-gamut-map"];
        const coords = [0.5, 0.5, 0.5];
        const model = "srgb";

        for (const fit of fitMethods) {
            const fitted = new Color(model, coords).getCoords({ fit });
            expect(fitted).toEqual([...coords, 1]);
        }
    });

    it("should gamut map extreme coords differently per method", () => {
        const fitMethods: FitMethod[] = ["clip", "chroma-reduction", "css-gamut-map"];
        const coords = [2, 2, -1];
        const model = "srgb";
        const epsilon = 1e-5;

        const results = fitMethods.map((fit) => new Color(model, coords).getCoords({ fit }));

        for (const res of results) {
            expect(res.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);
        }

        expect(new Set(results.map((r) => JSON.stringify(r))).size).toBeGreaterThan(1);
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
         * @see {@link https://colour.readthedocs.io/en/latest/_modules/colour/models/rgb/ictcp.html|Source code for colour.models.rgb.ictcp}
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

        const instance = new Color("ictcp" as ColorModel, [NaN, -Infinity, Infinity]);
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

        const instance = new Color("rec2100-linear" as ColorModel, [NaN, -Infinity, Infinity]);
        expect(instance.getCoords()).toEqual([0, 0, 1, 1]);

        const relative = "color(from color(rec2100-linear 0.7 0.3 0.1) rec2100-linear r g b)";
        expect(Color.isValid(relative, "rec2100-linear"));

        const outOfSrgb = Color.from("color(rec2100-linear 0 1 0)");
        expect(outOfSrgb.inGamut("srgb")).toBe(false);
        expect(outOfSrgb.inGamut("rec2100-linear")).toBe(true);
    });

    it("should register a new <color-base> syntax", () => {
        /**
         * @see {@link https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer|CIE 1931 colour-matching functions, 2 degree observer}
         */
        registerColorBase("wavelength", {
            isValid: (str: string) => str.slice(0, 11) === "wavelength(" && str[str.length - 1] === ")",
            bridge: "xyz-d65",
            toBridge: (coords: number[]) => coords,
            parse: (str: string) => {
                const cmf = [
                    [360, 0.0001299, 0.000003917, 0.0006061],
                    [361, 0.000145847, 0.000004393581, 0.0006808792],
                    [362, 0.0001638021, 0.000004929604, 0.0007651456],
                    [363, 0.0001840037, 0.000005532136, 0.0008600124],
                    [364, 0.0002066902, 0.000006208245, 0.0009665928],
                    [365, 0.0002321, 0.000006965, 0.001086],
                    [366, 0.000260728, 0.000007813219, 0.001220586],
                    [367, 0.000293075, 0.000008767336, 0.001372729],
                    [368, 0.000329388, 0.000009839844, 0.001543579],
                    [369, 0.000369914, 0.00001104323, 0.001734286],
                    [370, 0.0004149, 0.00001239, 0.001946],
                    [371, 0.0004641587, 0.00001388641, 0.002177777],
                    [372, 0.000518986, 0.00001555728, 0.002435809],
                    [373, 0.000581854, 0.00001744296, 0.002731953],
                    [374, 0.0006552347, 0.00001958375, 0.003078064],
                    [375, 0.0007416, 0.00002202, 0.003486],
                    [376, 0.0008450296, 0.00002483965, 0.003975227],
                    [377, 0.0009645268, 0.00002804126, 0.00454088],
                    [378, 0.001094949, 0.00003153104, 0.00515832],
                    [379, 0.001231154, 0.00003521521, 0.005802907],
                    [380, 0.001368, 0.000039, 0.006450001],
                    [381, 0.00150205, 0.0000428264, 0.007083216],
                    [382, 0.001642328, 0.0000469146, 0.007745488],
                    [383, 0.001802382, 0.0000515896, 0.008501152],
                    [384, 0.001995757, 0.0000571764, 0.009414544],
                    [385, 0.002236, 0.000064, 0.01054999],
                    [386, 0.002535385, 0.00007234421, 0.0119658],
                    [387, 0.002892603, 0.00008221224, 0.01365587],
                    [388, 0.003300829, 0.00009350816, 0.01558805],
                    [389, 0.003753236, 0.0001061361, 0.01773015],
                    [390, 0.004243, 0.00012, 0.02005001],
                    [391, 0.004762389, 0.000134984, 0.02251136],
                    [392, 0.005330048, 0.000151492, 0.02520288],
                    [393, 0.005978712, 0.000170208, 0.02827972],
                    [394, 0.006741117, 0.000191816, 0.03189704],
                    [395, 0.00765, 0.000217, 0.03621],
                    [396, 0.008751373, 0.0002469067, 0.04143771],
                    [397, 0.01002888, 0.00028124, 0.04750372],
                    [398, 0.0114217, 0.00031852, 0.05411988],
                    [399, 0.01286901, 0.0003572667, 0.06099803],
                    [400, 0.01431, 0.000396, 0.06785001],
                    [401, 0.01570443, 0.0004337147, 0.07448632],
                    [402, 0.01714744, 0.000473024, 0.08136156],
                    [403, 0.01878122, 0.000517876, 0.08915364],
                    [404, 0.02074801, 0.0005722187, 0.09854048],
                    [405, 0.02319, 0.00064, 0.1102],
                    [406, 0.02620736, 0.00072456, 0.1246133],
                    [407, 0.02978248, 0.0008255, 0.1417017],
                    [408, 0.03388092, 0.00094116, 0.1613035],
                    [409, 0.03846824, 0.00106988, 0.1832568],
                    [410, 0.04351, 0.00121, 0.2074],
                    [411, 0.0489956, 0.001362091, 0.2336921],
                    [412, 0.0550226, 0.001530752, 0.2626114],
                    [413, 0.0617188, 0.001720368, 0.2947746],
                    [414, 0.069212, 0.001935323, 0.3307985],
                    [415, 0.07763, 0.00218, 0.3713],
                    [416, 0.08695811, 0.0024548, 0.4162091],
                    [417, 0.09717672, 0.002764, 0.4654642],
                    [418, 0.1084063, 0.0031178, 0.5196948],
                    [419, 0.1207672, 0.0035264, 0.5795303],
                    [420, 0.13438, 0.004, 0.6456],
                    [421, 0.1493582, 0.00454624, 0.7184838],
                    [422, 0.1653957, 0.00515932, 0.7967133],
                    [423, 0.1819831, 0.00582928, 0.8778459],
                    [424, 0.198611, 0.00654616, 0.959439],
                    [425, 0.21477, 0.0073, 1.0390501],
                    [426, 0.2301868, 0.008086507, 1.1153673],
                    [427, 0.2448797, 0.00890872, 1.1884971],
                    [428, 0.2587773, 0.00976768, 1.2581233],
                    [429, 0.2718079, 0.01066443, 1.3239296],
                    [430, 0.2839, 0.0116, 1.3856],
                    [431, 0.2949438, 0.01257317, 1.4426352],
                    [432, 0.3048965, 0.01358272, 1.4948035],
                    [433, 0.3137873, 0.01462968, 1.5421903],
                    [434, 0.3216454, 0.01571509, 1.5848807],
                    [435, 0.3285, 0.01684, 1.62296],
                    [436, 0.3343513, 0.01800736, 1.6564048],
                    [437, 0.3392101, 0.01921448, 1.6852959],
                    [438, 0.3431213, 0.02045392, 1.7098745],
                    [439, 0.3461296, 0.02171824, 1.7303821],
                    [440, 0.34828, 0.023, 1.74706],
                    [441, 0.3495999, 0.02429461, 1.7600446],
                    [442, 0.3501474, 0.02561024, 1.7696233],
                    [443, 0.350013, 0.02695857, 1.7762637],
                    [444, 0.349287, 0.02835125, 1.7804334],
                    [445, 0.34806, 0.0298, 1.7826],
                    [446, 0.3463733, 0.03131083, 1.7829682],
                    [447, 0.3442624, 0.03288368, 1.7816998],
                    [448, 0.3418088, 0.03452112, 1.7791982],
                    [449, 0.3390941, 0.03622571, 1.7758671],
                    [450, 0.3362, 0.038, 1.77211],
                    [451, 0.3331977, 0.03984667, 1.7682589],
                    [452, 0.3300411, 0.041768, 1.764039],
                    [453, 0.3266357, 0.043766, 1.7589438],
                    [454, 0.3228868, 0.04584267, 1.7524663],
                    [455, 0.3187, 0.048, 1.7441],
                    [456, 0.3140251, 0.05024368, 1.7335595],
                    [457, 0.308884, 0.05257304, 1.7208581],
                    [458, 0.3032904, 0.05498056, 1.7059369],
                    [459, 0.2972579, 0.05745872, 1.6887372],
                    [460, 0.2908, 0.06, 1.6692],
                    [461, 0.2839701, 0.06260197, 1.6475287],
                    [462, 0.2767214, 0.06527752, 1.6234127],
                    [463, 0.2689178, 0.06804208, 1.5960223],
                    [464, 0.2604227, 0.07091109, 1.564528],
                    [465, 0.2511, 0.0739, 1.5281],
                    [466, 0.2408475, 0.077016, 1.4861114],
                    [467, 0.2298512, 0.0802664, 1.4395215],
                    [468, 0.2184072, 0.0836668, 1.3898799],
                    [469, 0.2068115, 0.0872328, 1.3387362],
                    [470, 0.19536, 0.09098, 1.28764],
                    [471, 0.1842136, 0.09491755, 1.2374223],
                    [472, 0.1733273, 0.09904584, 1.1878243],
                    [473, 0.1626881, 0.1033674, 1.1387611],
                    [474, 0.1522833, 0.1078846, 1.090148],
                    [475, 0.1421, 0.1126, 1.0419],
                    [476, 0.1321786, 0.117532, 0.9941976],
                    [477, 0.1225696, 0.1226744, 0.9473473],
                    [478, 0.1132752, 0.1279928, 0.9014531],
                    [479, 0.1042979, 0.1334528, 0.8566193],
                    [480, 0.09564, 0.13902, 0.8129501],
                    [481, 0.08729955, 0.1446764, 0.7705173],
                    [482, 0.07930804, 0.1504693, 0.7294448],
                    [483, 0.07171776, 0.1564619, 0.6899136],
                    [484, 0.06458099, 0.1627177, 0.6521049],
                    [485, 0.05795001, 0.1693, 0.6162],
                    [486, 0.05186211, 0.1762431, 0.5823286],
                    [487, 0.04628152, 0.1835581, 0.5504162],
                    [488, 0.04115088, 0.1912735, 0.5203376],
                    [489, 0.03641283, 0.199418, 0.4919673],
                    [490, 0.03201, 0.20802, 0.46518],
                    [491, 0.0279172, 0.2171199, 0.4399246],
                    [492, 0.0241444, 0.2267345, 0.4161836],
                    [493, 0.020687, 0.2368571, 0.3938822],
                    [494, 0.0175404, 0.2474812, 0.3729459],
                    [495, 0.0147, 0.2586, 0.3533],
                    [496, 0.01216179, 0.2701849, 0.3348578],
                    [497, 0.00991996, 0.2822939, 0.3175521],
                    [498, 0.00796724, 0.2950505, 0.3013375],
                    [499, 0.006296346, 0.308578, 0.2861686],
                    [500, 0.0049, 0.323, 0.272],
                    [501, 0.003777173, 0.3384021, 0.2588171],
                    [502, 0.00294532, 0.3546858, 0.2464838],
                    [503, 0.00242488, 0.3716986, 0.2347718],
                    [504, 0.002236293, 0.3892875, 0.2234533],
                    [505, 0.0024, 0.4073, 0.2123],
                    [506, 0.00292552, 0.4256299, 0.2011692],
                    [507, 0.00383656, 0.4443096, 0.1901196],
                    [508, 0.00517484, 0.4633944, 0.1792254],
                    [509, 0.00698208, 0.4829395, 0.1685608],
                    [510, 0.0093, 0.503, 0.1582],
                    [511, 0.01214949, 0.5235693, 0.1481383],
                    [512, 0.01553588, 0.544512, 0.1383758],
                    [513, 0.01947752, 0.56569, 0.1289942],
                    [514, 0.02399277, 0.5869653, 0.1200751],
                    [515, 0.0291, 0.6082, 0.1117],
                    [516, 0.03481485, 0.6293456, 0.1039048],
                    [517, 0.04112016, 0.6503068, 0.09666748],
                    [518, 0.04798504, 0.6708752, 0.08998272],
                    [519, 0.05537861, 0.6908424, 0.08384531],
                    [520, 0.06327, 0.71, 0.07824999],
                    [521, 0.07163501, 0.7281852, 0.07320899],
                    [522, 0.08046224, 0.7454636, 0.06867816],
                    [523, 0.08973996, 0.7619694, 0.06456784],
                    [524, 0.09945645, 0.7778368, 0.06078835],
                    [525, 0.1096, 0.7932, 0.05725001],
                    [526, 0.1201674, 0.8081104, 0.05390435],
                    [527, 0.1311145, 0.8224962, 0.05074664],
                    [528, 0.1423679, 0.8363068, 0.04775276],
                    [529, 0.1538542, 0.8494916, 0.04489859],
                    [530, 0.1655, 0.862, 0.04216],
                    [531, 0.1772571, 0.8738108, 0.03950728],
                    [532, 0.18914, 0.8849624, 0.03693564],
                    [533, 0.2011694, 0.8954936, 0.03445836],
                    [534, 0.2133658, 0.9054432, 0.03208872],
                    [535, 0.2257499, 0.9148501, 0.02984],
                    [536, 0.2383209, 0.9237348, 0.02771181],
                    [537, 0.2510668, 0.9320924, 0.02569444],
                    [538, 0.2639922, 0.9399226, 0.02378716],
                    [539, 0.2771017, 0.9472252, 0.02198925],
                    [540, 0.2904, 0.954, 0.0203],
                    [541, 0.3038912, 0.9602561, 0.01871805],
                    [542, 0.3175726, 0.9660074, 0.01724036],
                    [543, 0.3314384, 0.9712606, 0.01586364],
                    [544, 0.3454828, 0.9760225, 0.01458461],
                    [545, 0.3597, 0.9803, 0.0134],
                    [546, 0.3740839, 0.9840924, 0.01230723],
                    [547, 0.3886396, 0.9874182, 0.01130188],
                    [548, 0.4033784, 0.9903128, 0.01037792],
                    [549, 0.4183115, 0.9928116, 0.009529306],
                    [550, 0.4334499, 0.9949501, 0.008749999],
                    [551, 0.4487953, 0.9967108, 0.0080352],
                    [552, 0.464336, 0.9980983, 0.0073816],
                    [553, 0.480064, 0.999112, 0.0067854],
                    [554, 0.4959713, 0.9997482, 0.0062428],
                    [555, 0.5120501, 1.0, 0.005749999],
                    [556, 0.5282959, 0.9998567, 0.0053036],
                    [557, 0.5446916, 0.9993046, 0.0048998],
                    [558, 0.5612094, 0.9983255, 0.0045342],
                    [559, 0.5778215, 0.9968987, 0.0042024],
                    [560, 0.5945, 0.995, 0.0039],
                    [561, 0.6112209, 0.9926005, 0.0036232],
                    [562, 0.6279758, 0.9897426, 0.0033706],
                    [563, 0.6447602, 0.9864444, 0.0031414],
                    [564, 0.6615697, 0.9827241, 0.0029348],
                    [565, 0.6784, 0.9786, 0.002749999],
                    [566, 0.6952392, 0.9740837, 0.0025852],
                    [567, 0.7120586, 0.9691712, 0.0024386],
                    [568, 0.7288284, 0.9638568, 0.0023094],
                    [569, 0.7455188, 0.9581349, 0.0021968],
                    [570, 0.7621, 0.952, 0.0021],
                    [571, 0.7785432, 0.9454504, 0.002017733],
                    [572, 0.7948256, 0.9384992, 0.0019482],
                    [573, 0.8109264, 0.9311628, 0.0018898],
                    [574, 0.8268248, 0.9234576, 0.001840933],
                    [575, 0.8425, 0.9154, 0.0018],
                    [576, 0.8579325, 0.9070064, 0.001766267],
                    [577, 0.8730816, 0.8982772, 0.0017378],
                    [578, 0.8878944, 0.8892048, 0.0017112],
                    [579, 0.9023181, 0.8797816, 0.001683067],
                    [580, 0.9163, 0.87, 0.001650001],
                    [581, 0.9297995, 0.8598613, 0.001610133],
                    [582, 0.9427984, 0.849392, 0.0015644],
                    [583, 0.9552776, 0.838622, 0.0015136],
                    [584, 0.9672179, 0.8275813, 0.001458533],
                    [585, 0.9786, 0.8163, 0.0014],
                    [586, 0.9893856, 0.8047947, 0.001336667],
                    [587, 0.9995488, 0.793082, 0.00127],
                    [588, 1.0090892, 0.781192, 0.001205],
                    [589, 1.0180064, 0.7691547, 0.001146667],
                    [590, 1.0263, 0.757, 0.0011],
                    [591, 1.0339827, 0.7447541, 0.0010688],
                    [592, 1.040986, 0.7324224, 0.0010494],
                    [593, 1.047188, 0.7200036, 0.0010356],
                    [594, 1.0524667, 0.7074965, 0.0010212],
                    [595, 1.0567, 0.6949, 0.001],
                    [596, 1.0597944, 0.6822192, 0.00096864],
                    [597, 1.0617992, 0.6694716, 0.00092992],
                    [598, 1.0628068, 0.6566744, 0.00088688],
                    [599, 1.0629096, 0.6438448, 0.00084256],
                    [600, 1.0622, 0.631, 0.0008],
                    [601, 1.0607352, 0.6181555, 0.00076096],
                    [602, 1.0584436, 0.6053144, 0.00072368],
                    [603, 1.0552244, 0.5924756, 0.00068592],
                    [604, 1.0509768, 0.5796379, 0.00064544],
                    [605, 1.0456, 0.5668, 0.0006],
                    [606, 1.0390369, 0.5539611, 0.0005478667],
                    [607, 1.0313608, 0.5411372, 0.0004916],
                    [608, 1.0226662, 0.5283528, 0.0004354],
                    [609, 1.0130477, 0.5156323, 0.0003834667],
                    [610, 1.0026, 0.503, 0.00034],
                    [611, 0.9913675, 0.4904688, 0.0003072533],
                    [612, 0.9793314, 0.4780304, 0.00028316],
                    [613, 0.9664916, 0.4656776, 0.00026544],
                    [614, 0.9528479, 0.4534032, 0.0002518133],
                    [615, 0.9384, 0.4412, 0.00024],
                    [616, 0.923194, 0.42908, 0.0002295467],
                    [617, 0.907244, 0.417036, 0.00022064],
                    [618, 0.890502, 0.405032, 0.00021196],
                    [619, 0.87292, 0.393032, 0.0002021867],
                    [620, 0.8544499, 0.381, 0.00019],
                    [621, 0.835084, 0.3689184, 0.0001742133],
                    [622, 0.814946, 0.3568272, 0.00015564],
                    [623, 0.794186, 0.3447768, 0.00013596],
                    [624, 0.772954, 0.3328176, 0.0001168533],
                    [625, 0.7514, 0.321, 0.0001],
                    [626, 0.7295836, 0.3093381, 0.00008613333],
                    [627, 0.7075888, 0.2978504, 0.0000746],
                    [628, 0.6856022, 0.2865936, 0.000065],
                    [629, 0.6638104, 0.2756245, 0.00005693333],
                    [630, 0.6424, 0.265, 0.00004999999],
                    [631, 0.6215149, 0.2547632, 0.00004416],
                    [632, 0.6011138, 0.2448896, 0.00003948],
                    [633, 0.5811052, 0.2353344, 0.00003572],
                    [634, 0.5613977, 0.2260528, 0.00003264],
                    [635, 0.5419, 0.217, 0.00003],
                    [636, 0.5225995, 0.2081616, 0.00002765333],
                    [637, 0.5035464, 0.1995488, 0.00002556],
                    [638, 0.4847436, 0.1911552, 0.00002364],
                    [639, 0.4661939, 0.1829744, 0.00002181333],
                    [640, 0.4479, 0.175, 0.00002],
                    [641, 0.4298613, 0.1672235, 0.00001813333],
                    [642, 0.412098, 0.1596464, 0.0000162],
                    [643, 0.394644, 0.1522776, 0.0000142],
                    [644, 0.3775333, 0.1451259, 0.00001213333],
                    [645, 0.3608, 0.1382, 0.00001],
                    [646, 0.3444563, 0.1315003, 0.000007733333],
                    [647, 0.3285168, 0.1250248, 0.0000054],
                    [648, 0.3130192, 0.1187792, 0.0000032],
                    [649, 0.2980011, 0.1127691, 0.000001333333],
                    [650, 0.2835, 0.107, 0.0],
                    [651, 0.2695448, 0.1014762, 0.0],
                    [652, 0.2561184, 0.09618864, 0.0],
                    [653, 0.2431896, 0.09112296, 0.0],
                    [654, 0.2307272, 0.08626485, 0.0],
                    [655, 0.2187, 0.0816, 0.0],
                    [656, 0.2070971, 0.07712064, 0.0],
                    [657, 0.1959232, 0.07282552, 0.0],
                    [658, 0.1851708, 0.06871008, 0.0],
                    [659, 0.1748323, 0.06476976, 0.0],
                    [660, 0.1649, 0.061, 0.0],
                    [661, 0.1553667, 0.05739621, 0.0],
                    [662, 0.14623, 0.05395504, 0.0],
                    [663, 0.13749, 0.05067376, 0.0],
                    [664, 0.1291467, 0.04754965, 0.0],
                    [665, 0.1212, 0.04458, 0.0],
                    [666, 0.1136397, 0.04175872, 0.0],
                    [667, 0.106465, 0.03908496, 0.0],
                    [668, 0.09969044, 0.03656384, 0.0],
                    [669, 0.09333061, 0.03420048, 0.0],
                    [670, 0.0874, 0.032, 0.0],
                    [671, 0.08190096, 0.02996261, 0.0],
                    [672, 0.07680428, 0.02807664, 0.0],
                    [673, 0.07207712, 0.02632936, 0.0],
                    [674, 0.06768664, 0.02470805, 0.0],
                    [675, 0.0636, 0.0232, 0.0],
                    [676, 0.05980685, 0.02180077, 0.0],
                    [677, 0.05628216, 0.02050112, 0.0],
                    [678, 0.05297104, 0.01928108, 0.0],
                    [679, 0.04981861, 0.01812069, 0.0],
                    [680, 0.04677, 0.017, 0.0],
                    [681, 0.04378405, 0.01590379, 0.0],
                    [682, 0.04087536, 0.01483718, 0.0],
                    [683, 0.03807264, 0.01381068, 0.0],
                    [684, 0.03540461, 0.01283478, 0.0],
                    [685, 0.0329, 0.01192, 0.0],
                    [686, 0.03056419, 0.01106831, 0.0],
                    [687, 0.02838056, 0.01027339, 0.0],
                    [688, 0.02634484, 0.009533311, 0.0],
                    [689, 0.02445275, 0.008846157, 0.0],
                    [690, 0.0227, 0.00821, 0.0],
                    [691, 0.02108429, 0.007623781, 0.0],
                    [692, 0.01959988, 0.007085424, 0.0],
                    [693, 0.01823732, 0.006591476, 0.0],
                    [694, 0.01698717, 0.006138485, 0.0],
                    [695, 0.01584, 0.005723, 0.0],
                    [696, 0.01479064, 0.005343059, 0.0],
                    [697, 0.01383132, 0.004995796, 0.0],
                    [698, 0.01294868, 0.004676404, 0.0],
                    [699, 0.0121292, 0.004380075, 0.0],
                    [700, 0.01135916, 0.004102, 0.0],
                    [701, 0.01062935, 0.003838453, 0.0],
                    [702, 0.009938846, 0.003589099, 0.0],
                    [703, 0.009288422, 0.003354219, 0.0],
                    [704, 0.008678854, 0.003134093, 0.0],
                    [705, 0.008110916, 0.002929, 0.0],
                    [706, 0.007582388, 0.002738139, 0.0],
                    [707, 0.007088746, 0.002559876, 0.0],
                    [708, 0.006627313, 0.002393244, 0.0],
                    [709, 0.006195408, 0.002237275, 0.0],
                    [710, 0.005790346, 0.002091, 0.0],
                    [711, 0.005409826, 0.001953587, 0.0],
                    [712, 0.005052583, 0.00182458, 0.0],
                    [713, 0.004717512, 0.00170358, 0.0],
                    [714, 0.004403507, 0.001590187, 0.0],
                    [715, 0.004109457, 0.001484, 0.0],
                    [716, 0.003833913, 0.001384496, 0.0],
                    [717, 0.003575748, 0.001291268, 0.0],
                    [718, 0.003334342, 0.001204092, 0.0],
                    [719, 0.003109075, 0.001122744, 0.0],
                    [720, 0.002899327, 0.001047, 0.0],
                    [721, 0.002704348, 0.0009765896, 0.0],
                    [722, 0.00252302, 0.0009111088, 0.0],
                    [723, 0.002354168, 0.0008501332, 0.0],
                    [724, 0.002196616, 0.0007932384, 0.0],
                    [725, 0.00204919, 0.00074, 0.0],
                    [726, 0.00191096, 0.0006900827, 0.0],
                    [727, 0.001781438, 0.00064331, 0.0],
                    [728, 0.00166011, 0.000599496, 0.0],
                    [729, 0.001546459, 0.0005584547, 0.0],
                    [730, 0.001439971, 0.00052, 0.0],
                    [731, 0.001340042, 0.0004839136, 0.0],
                    [732, 0.001246275, 0.0004500528, 0.0],
                    [733, 0.001158471, 0.0004183452, 0.0],
                    [734, 0.00107643, 0.0003887184, 0.0],
                    [735, 0.0009999493, 0.0003611, 0.0],
                    [736, 0.0009287358, 0.0003353835, 0.0],
                    [737, 0.0008624332, 0.0003114404, 0.0],
                    [738, 0.0008007503, 0.0002891656, 0.0],
                    [739, 0.000743396, 0.0002684539, 0.0],
                    [740, 0.0006900786, 0.0002492, 0.0],
                    [741, 0.0006405156, 0.0002313019, 0.0],
                    [742, 0.0005945021, 0.0002146856, 0.0],
                    [743, 0.0005518646, 0.0001992884, 0.0],
                    [744, 0.000512429, 0.0001850475, 0.0],
                    [745, 0.0004760213, 0.0001719, 0.0],
                    [746, 0.0004424536, 0.0001597781, 0.0],
                    [747, 0.0004115117, 0.0001486044, 0.0],
                    [748, 0.0003829814, 0.0001383016, 0.0],
                    [749, 0.0003566491, 0.0001287925, 0.0],
                    [750, 0.0003323011, 0.00012, 0.0],
                    [751, 0.0003097586, 0.0001118595, 0.0],
                    [752, 0.0002888871, 0.0001043224, 0.0],
                    [753, 0.0002695394, 0.0000973356, 0.0],
                    [754, 0.0002515682, 0.00009084587, 0.0],
                    [755, 0.0002348261, 0.0000848, 0.0],
                    [756, 0.000219171, 0.00007914667, 0.0],
                    [757, 0.0002045258, 0.000073858, 0.0],
                    [758, 0.0001908405, 0.000068916, 0.0],
                    [759, 0.0001780654, 0.00006430267, 0.0],
                    [760, 0.0001661505, 0.00006, 0.0],
                    [761, 0.0001550236, 0.00005598187, 0.0],
                    [762, 0.0001446219, 0.0000522256, 0.0],
                    [763, 0.0001349098, 0.0000487184, 0.0],
                    [764, 0.000125852, 0.00004544747, 0.0],
                    [765, 0.000117413, 0.0000424, 0.0],
                    [766, 0.0001095515, 0.00003956104, 0.0],
                    [767, 0.0001022245, 0.00003691512, 0.0],
                    [768, 0.00009539445, 0.00003444868, 0.0],
                    [769, 0.0000890239, 0.00003214816, 0.0],
                    [770, 0.00008307527, 0.00003, 0.0],
                    [771, 0.00007751269, 0.00002799125, 0.0],
                    [772, 0.00007231304, 0.00002611356, 0.0],
                    [773, 0.00006745778, 0.00002436024, 0.0],
                    [774, 0.00006292844, 0.00002272461, 0.0],
                    [775, 0.00005870652, 0.0000212, 0.0],
                    [776, 0.00005477028, 0.00001977855, 0.0],
                    [777, 0.00005109918, 0.00001845285, 0.0],
                    [778, 0.00004767654, 0.00001721687, 0.0],
                    [779, 0.00004448567, 0.00001606459, 0.0],
                    [780, 0.00004150994, 0.00001499, 0.0],
                    [781, 0.00003873324, 0.00001398728, 0.0],
                    [782, 0.00003614203, 0.00001305155, 0.0],
                    [783, 0.00003372352, 0.00001217818, 0.0],
                    [784, 0.00003146487, 0.00001136254, 0.0],
                    [785, 0.00002935326, 0.0000106, 0.0],
                    [786, 0.00002737573, 0.000009885877, 0.0],
                    [787, 0.00002552433, 0.000009217304, 0.0],
                    [788, 0.00002379376, 0.000008592362, 0.0],
                    [789, 0.0000221787, 0.000008009133, 0.0],
                    [790, 0.00002067383, 0.0000074657, 0.0],
                    [791, 0.00001927226, 0.000006959567, 0.0],
                    [792, 0.0000179664, 0.000006487995, 0.0],
                    [793, 0.00001674991, 0.000006048699, 0.0],
                    [794, 0.00001561648, 0.000005639396, 0.0],
                    [795, 0.00001455977, 0.0000052578, 0.0],
                    [796, 0.00001357387, 0.000004901771, 0.0],
                    [797, 0.00001265436, 0.00000456972, 0.0],
                    [798, 0.00001179723, 0.000004260194, 0.0],
                    [799, 0.00001099844, 0.000003971739, 0.0],
                    [800, 0.00001025398, 0.0000037029, 0.0],
                    [801, 0.000009559646, 0.000003452163, 0.0],
                    [802, 0.000008912044, 0.000003218302, 0.0],
                    [803, 0.000008308358, 0.0000030003, 0.0],
                    [804, 0.000007745769, 0.000002797139, 0.0],
                    [805, 0.000007221456, 0.0000026078, 0.0],
                    [806, 0.000006732475, 0.00000243122, 0.0],
                    [807, 0.000006276423, 0.000002266531, 0.0],
                    [808, 0.000005851304, 0.000002113013, 0.0],
                    [809, 0.000005455118, 0.000001969943, 0.0],
                    [810, 0.000005085868, 0.0000018366, 0.0],
                    [811, 0.000004741466, 0.00000171223, 0.0],
                    [812, 0.000004420236, 0.000001596228, 0.0],
                    [813, 0.000004120783, 0.00000148809, 0.0],
                    [814, 0.000003841716, 0.000001387314, 0.0],
                    [815, 0.000003581652, 0.0000012934, 0.0],
                    [816, 0.000003339127, 0.00000120582, 0.0],
                    [817, 0.000003112949, 0.000001124143, 0.0],
                    [818, 0.000002902121, 0.000001048009, 0.0],
                    [819, 0.000002705645, 0.0000009770578, 0.0],
                    [820, 0.000002522525, 0.00000091093, 0.0],
                    [821, 0.000002351726, 0.0000008492513, 0.0],
                    [822, 0.000002192415, 0.0000007917212, 0.0],
                    [823, 0.000002043902, 0.0000007380904, 0.0],
                    [824, 0.000001905497, 0.0000006881098, 0.0],
                    [825, 0.000001776509, 0.00000064153, 0.0],
                    [826, 0.000001656215, 0.0000005980895, 0.0],
                    [827, 0.000001544022, 0.0000005575746, 0.0],
                    [828, 0.00000143944, 0.000000519808, 0.0],
                    [829, 0.000001341977, 0.0000004846123, 0.0],
                    [830, 0.000001251141, 0.00000045181, 0.0],
                ];

                const inner = str.slice(11, -1);
                const wavelength = parseFloat(inner);

                let index = 0;
                while (cmf[index + 1][0] < wavelength) {
                    index++;
                }

                const [lambda1, x1, y1, z1] = cmf[index];
                const [lambda2, x2, y2, z2] = cmf[index + 1];

                const fraction = (wavelength - lambda1) / (lambda2 - lambda1);

                const x = x1 + fraction * (x2 - x1);
                const y = y1 + fraction * (y2 - y1);
                const z = z1 + fraction * (z2 - z1);

                return [x, y, z];
            },
        });

        const wavelength = Color.from("wavelength(360)");
        expect(wavelength.getCoords()).toEqual([0.0001299, 0.000003917, 0.0006061, 1]);
        expect(() => wavelength.set({ x: 0 }).to("rgb")).not.toThrow();

        const relative = "color(from wavelength(360) xyz-d65 x y z)";
        expect(Color.isValid(relative, "xyz-d65"));
    });

    it("should register a new <color> syntax", () => {
        registerColorType("color-at", {
            isValid: (str: string) => str.slice(0, 9) === "color-at(" && str[str.length - 1] === ")",
            bridge: "rgb",
            toBridge: (coords: number[]) => coords,
            parse: (str: string) => {
                const timeToMinutes = (t: string) => {
                    const [h, m] = t.split(":").map(Number);
                    return h * 60 + m;
                };

                const extractTimeAndColor = (part: string) => {
                    const s = part.trim();

                    if (!s.startsWith("'")) {
                        throw new Error("Time must start with a single quote.");
                    }

                    let i = 1;
                    let timeStr = "";
                    while (i < s.length && s[i] !== "'") {
                        timeStr += s[i];
                        i++;
                    }

                    if (i >= s.length || s[i] !== "'") {
                        throw new Error("Unclosed time quote.");
                    }

                    i++;

                    while (i < s.length && /\s/.test(s[i])) {
                        i++;
                    }

                    const remaining = s.slice(i).trim();

                    let colorExpression = "";

                    if (remaining.startsWith("(") || /^[a-z]/i.test(remaining)) {
                        const { expression: expr, end: e } = extractBalancedExpression(remaining, 0);
                        if (expr) {
                            colorExpression = expr;
                            const rest = remaining.slice(e).trim();
                            if (rest.length > 0) {
                                throw new Error(`Unexpected extra tokens after color: '${rest}'.`);
                            }
                        } else {
                            const m = remaining.match(/^([^\s]+)(.*)$/);
                            if (!m) {
                                throw new Error("Invalid color expression.");
                            }
                            colorExpression = m[1];
                            const rest = m[2].trim();
                            if (rest.length > 0) {
                                throw new Error(`Unexpected extra tokens after color: '${rest}'.`);
                            }
                        }
                    } else {
                        const m = remaining.match(/^([^\s]+)(.*)$/);
                        if (!m) {
                            throw new Error("Invalid color expression.");
                        }
                        colorExpression = m[1];
                        const rest = m[2].trim();
                        if (rest.length > 0) {
                            throw new Error(`Unexpected extra tokens after color: '${rest}'.`);
                        }
                    }

                    return { minutes: timeToMinutes(timeStr), color: Color.from(colorExpression) };
                };

                const inner = str.slice(9, -1).trim();

                const parts: string[] = [];
                let i = 0;
                let current = "";

                while (i < inner.length) {
                    const char = inner[i];

                    if (char === ",") {
                        parts.push(current.trim());
                        current = "";
                        i++;
                        continue;
                    }

                    if (char === "(" || /[a-zA-Z]/.test(char)) {
                        const { expression: expr, end } = extractBalancedExpression(inner, i);
                        if (expr) {
                            current += expr;
                            i = end;
                            continue;
                        }
                    }

                    current += char;
                    i++;
                }

                parts.push(current.trim());

                if (parts.length === 0) {
                    throw new Error("color-at must have at least one time-color pair.");
                }

                const pairs = parts.map(extractTimeAndColor);

                pairs.sort((a, b) => a.minutes - b.minutes);

                let currentMinutes: number;
                try {
                    const now = new Date();
                    if (isNaN(now.getTime())) throw new Error("Invalid date");
                    currentMinutes = now.getHours() * 60 + now.getMinutes();
                } catch {
                    return pairs[0].color.in("rgb").getCoords();
                }

                for (let j = pairs.length - 1; j >= 0; j--) {
                    if (currentMinutes >= pairs[j].minutes) {
                        return pairs[j].color.in("rgb").getCoords();
                    }
                }

                return pairs[0].color.in("rgb").getCoords();
            },
        });

        const timed = "color-at('06:00' skyblue, '12:00' gold, '18:00' orangered, '22:00' midnightblue)";
        const value = Color.from(timed).to("named-color");
        expect(["skyblue", "gold", "orangered", "midnightblue"].includes(value)).toBe(true);

        const complex = `
            color-at(
                '06:00' rgb(135, 206, 235),
                '08:00' hsl(195 53% 79%),
                '10:00' hwb(203 53% 2%),
                '12:00' lab(51.98 -8.36 -32.83),
                '14:00' lch(58.36 64.78 270.78),
                '16:00' oklab(0.79 0.05 0.16),
                '18:00' oklch(0.69 0.19 32.32),
                '20:00' color(srgb 0.09 0.09 0.43),
                '22:00' color(display-p3 0.02 0.04 0.05)
            )
        `;
        expect(Color.isValid(complex, "color-at"));
    });

    it("should unregister <color> types from the system", () => {
        unregister("hwb", "prophoto-rgb", "lch");

        expect(() => Color.from("hwb(120deg 0% 0%)")).toThrow();
        expect(() => Color.from("red").in("prophoto-rgb").set({ b: 0 })).toThrow();
        expect(() => new Color("lch", [90, 100, 280])).toThrow();
    });

    it("register a new fit method", () => {
        const MATRIX_16 = [
            [0.401288, 0.650173, -0.051461],
            [-0.250268, 1.204414, 0.045854],
            [-0.002079, 0.048952, 0.953127],
        ];

        const invert3x3 = (m: number[][]) => {
            const a = m[0][0],
                b = m[0][1],
                c = m[0][2];
            const d = m[1][0],
                e = m[1][1],
                f = m[1][2];
            const g = m[2][0],
                h = m[2][1],
                i = m[2][2];

            const A = e * i - f * h;
            const B = c * h - b * i;
            const C = b * f - c * e;
            const D = f * g - d * i;
            const E = a * i - c * g;
            const F = c * d - a * f;
            const G = d * h - e * g;
            const H = b * g - a * h;
            const I = a * e - b * d;

            const det = a * A + b * D + c * G;
            if (Math.abs(det) < 1e-12) throw new Error("Singular matrix");

            const invDet = 1 / det;
            return [
                [A * invDet, B * invDet, C * invDet],
                [D * invDet, E * invDet, F * invDet],
                [G * invDet, H * invDet, I * invDet],
            ];
        };

        const MATRIX_INVERSE_16 = invert3x3(MATRIX_16);

        const sign = (x: number) => (x < 0 ? -1 : 1);

        const luminanceLevelAdaptationFactor = (L_A: number) => {
            const k = 1 / (5 * L_A + 1);
            const k4 = Math.pow(k, 4);
            return 0.2 * k4 * (5 * L_A) + 0.1 * Math.pow(1 - k4, 2) * Math.pow(5 * L_A, 1 / 3);
        };

        const chromaticInductionFactors = (n: number): [number, number] => {
            const N_bb = 0.725 * Math.pow(1 / n, 0.2);
            return [N_bb, N_bb];
        };

        const baseExponentialNonLinearity = (n: number) => 1.48 + Math.sqrt(n);

        const viewingConditionsDependentParameters = (Y_b: number, Y_w: number, L_A: number) => {
            const n = Y_b / Y_w;
            const F_L = luminanceLevelAdaptationFactor(L_A);
            const [N_bb, N_cb] = chromaticInductionFactors(n);
            const z = baseExponentialNonLinearity(n);
            return { n, F_L, N_bb, N_cb, z };
        };

        const degreeOfAdaptation = (F: number, L_A: number) => F * (1 - (1 / 3.6) * Math.exp((-L_A - 42) / 92));

        const postAdaptationNonLinearResponseCompressionForward = (RGB: number[], F_L: number) => {
            return RGB.map((comp) => {
                const tmp = Math.pow((F_L * comp) / 100.0, 0.42);
                return (400 * tmp) / (27.13 + tmp) + 0.1;
            });
        };

        const postAdaptationNonLinearResponseCompressionInverse = (RGBc: number[], F_L: number) => {
            return RGBc.map((comp) => {
                const v = comp - 0.1;
                const s = sign(v);
                const absV = Math.abs(v);
                if (absV <= 1e-12) return 0;
                const inner = (27.13 * absV) / (400 - absV);
                return s * (100 / F_L) * Math.pow(inner, 1 / 0.42);
            });
        };

        const opponentColourDimensionsForward = (RGB: number[]) => {
            const [R, G, B] = RGB;
            const a = R - (12 * G) / 11 + B / 11;
            const b = (R + G - 2 * B) / 9;
            return [a, b];
        };

        const hueAngle = (a: number, b: number) => {
            const rad = Math.atan2(b, a);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;
            return deg % 360;
        };

        const eccentricityFactor = (h: number) => 0.25 * (Math.cos(2 + (h * Math.PI) / 180) + 3.8);

        const achromaticResponseForward = (RGB_a: number[], N_bb: number) => {
            const [R, G, B] = RGB_a;
            return (2 * R + G + (1 / 20) * B - 0.305) * N_bb;
        };

        const achromaticResponseInverse = (A_w: number, J: number, c: number, z: number) => {
            return A_w * Math.pow(J / 100, 1 / (c * z));
        };

        const lightnessCorrelate = (A: number, A_w: number, c: number, z: number) => {
            return 100 * Math.pow(A / A_w, c * z);
        };

        const brightnessCorrelate = (c: number, J: number, A_w: number, F_L: number) => {
            return (4 / c) * Math.sqrt(J / 100) * (A_w + 4) * Math.pow(F_L, 0.25);
        };

        const temporaryMagnitudeQuantityForward = (
            N_c: number,
            N_cb: number,
            e_t: number,
            a: number,
            b: number,
            RGB_a: number[]
        ) => {
            const [Ra, Ga, Ba] = RGB_a;
            const denom = Ra + Ga + (21 * Ba) / 20;
            if (denom === 0) return 0;
            return ((50000 / 13) * N_c * N_cb * e_t * Math.sqrt(a * a + b * b)) / denom;
        };

        const temporaryMagnitudeQuantityInverse = (C: number, J: number, n: number) => {
            const base = Math.sqrt(J / 100) * Math.pow(1.64 - Math.pow(0.29, n), 0.73);
            if (base === 0) return 0;
            return Math.pow(C / base, 1 / 0.9);
        };

        const chromaCorrelate = (
            J: number,
            n: number,
            N_c: number,
            N_cb: number,
            e_t: number,
            a: number,
            b: number,
            RGB_a: number[]
        ) => {
            const t = temporaryMagnitudeQuantityForward(N_c, N_cb, e_t, a, b, RGB_a);
            return Math.pow(t, 0.9) * Math.sqrt(J / 100) * Math.pow(1.64 - Math.pow(0.29, n), 0.73);
        };

        const colourfulnessCorrelate = (C: number, F_L: number) => C * Math.pow(F_L, 0.25);

        const saturationCorrelate = (M: number, Q: number) => 100 * Math.sqrt(M / Q);

        const P = (N_c: number, N_cb: number, e_t: number, t: number, A: number, N_bb: number) => {
            const P1 = ((50000 / 13) * N_c * N_cb * e_t) / t;
            const P2 = A / N_bb + 0.305;
            const P3 = 21 / 20;
            return [P1, P2, P3] as [number, number, number];
        };

        const postAdaptationNonLinearResponseCompressionMatrix = (P_2: number, a: number, b: number) => {
            const R_a = (460 * P_2 + 451 * a + 288 * b) / 1403;
            const G_a = (460 * P_2 - 891 * a - 261 * b) / 1403;
            const B_a = (460 * P_2 - 220 * a - 6300 * b) / 1403;
            return [R_a, G_a, B_a];
        };

        const opponentColourDimensionsInverse = (Pn: [number, number, number], hDeg: number) => {
            const [P_1, , P_3] = Pn;
            const hr = (hDeg * Math.PI) / 180;
            const sin_hr = Math.sin(hr);
            const cos_hr = Math.cos(hr);
            const P_4 = P_1 / sin_hr;
            const P_5 = P_1 / cos_hr;
            const n = Pn[1] * (2 + P_3) * (460 / 1403);

            if (Math.abs(sin_hr) >= Math.abs(cos_hr)) {
                const b = n / (P_4 + (2 + P_3) * (220 / 1403) * (cos_hr / sin_hr) - 27 / 1403 + P_3 * (6300 / 1403));
                const a = b * (cos_hr / sin_hr);
                return [a, b];
            } else {
                const a = n / (P_5 + (2 + P_3) * (220 / 1403) - (27 / 1403 - P_3 * (6300 / 1403)) * (sin_hr / cos_hr));
                const b = a * (sin_hr / cos_hr);
                return [a, b];
            }
        };

        const XYZ_to_CAM16 = (
            XYZ: number[],
            XYZ_w: number[] = [95.05, 100.0, 108.88],
            L_A = 318.31,
            Y_b = 20.0,
            surround = { F: 1.0, c: 0.69, N_c: 1.0 },
            discountIlluminant = false,
            computeH = false
        ) => {
            const RGB_w = multiplyMatrices(MATRIX_16, XYZ_w);
            const D = discountIlluminant ? 1.0 : Math.max(0, Math.min(1, degreeOfAdaptation(surround.F, L_A)));
            const { n, F_L, N_bb, N_cb, z } = viewingConditionsDependentParameters(Y_b, XYZ_w[1], L_A);

            const D_RGB = [
                (D * XYZ_w[1]) / (RGB_w[0] || 1e-12) + 1 - D,
                (D * XYZ_w[1]) / (RGB_w[1] || 1e-12) + 1 - D,
                (D * XYZ_w[1]) / (RGB_w[2] || 1e-12) + 1 - D,
            ];

            const RGB_wc = [D_RGB[0] * RGB_w[0], D_RGB[1] * RGB_w[1], D_RGB[2] * RGB_w[2]];

            const RGB_aw = postAdaptationNonLinearResponseCompressionForward(RGB_wc, F_L);
            const A_w = achromaticResponseForward(RGB_aw, N_bb);

            const RGB = multiplyMatrices(MATRIX_16, XYZ);
            const RGB_c = [D_RGB[0] * RGB[0], D_RGB[1] * RGB[1], D_RGB[2] * RGB[2]];
            const RGB_a = postAdaptationNonLinearResponseCompressionForward(RGB_c, F_L);

            const [a, b] = opponentColourDimensionsForward(RGB_a);
            const h = hueAngle(a, b);

            const e_t = eccentricityFactor(h);
            const H = computeH ? NaN : NaN;

            const A = achromaticResponseForward(RGB_a, N_bb);
            const J = lightnessCorrelate(A, A_w, surround.c, z);
            const Q = brightnessCorrelate(surround.c, J, A_w, F_L);

            const C = chromaCorrelate(J, n, surround.N_c, N_cb, e_t, a, b, RGB_a);
            const M = colourfulnessCorrelate(C, F_L);
            const s = saturationCorrelate(M, Q);

            return {
                J,
                C,
                h,
                s,
                Q,
                M,
                H,
            };
        };

        const CAM16_to_XYZ = (
            specification: { J?: number; C?: number; M?: number; h: number },
            XYZ_w: number[] = [95.05, 100.0, 108.88],
            L_A = 318.31,
            Y_b = 20.0,
            surround = { F: 1.0, c: 0.69, N_c: 1.0 },
            discountIlluminant = false
        ) => {
            const J = specification.J ?? NaN;
            let C = specification.C ?? NaN;
            const M = specification.M ?? NaN;
            const h = specification.h;

            const RGB_w = multiplyMatrices(MATRIX_16, XYZ_w);
            const D = discountIlluminant ? 1.0 : Math.max(0, Math.min(1, degreeOfAdaptation(surround.F, L_A)));
            const { n, F_L, N_bb, N_cb, z } = viewingConditionsDependentParameters(Y_b, XYZ_w[1], L_A);

            const D_RGB = [
                (D * XYZ_w[1]) / (RGB_w[0] || 1e-12) + 1 - D,
                (D * XYZ_w[1]) / (RGB_w[1] || 1e-12) + 1 - D,
                (D * XYZ_w[1]) / (RGB_w[2] || 1e-12) + 1 - D,
            ];

            const RGB_wc = [D_RGB[0] * RGB_w[0], D_RGB[1] * RGB_w[1], D_RGB[2] * RGB_w[2]];
            const RGB_aw = postAdaptationNonLinearResponseCompressionForward(RGB_wc, F_L);
            const A_w = achromaticResponseForward(RGB_aw, N_bb);

            if (Number.isNaN(C) && !Number.isNaN(M)) {
                C = M / Math.pow(F_L, 0.25);
            }

            if (Number.isNaN(C)) {
                throw new Error('Either "C" or "M" must be provided in specification.');
            }

            const t = temporaryMagnitudeQuantityInverse(C, J, n);
            const e_t = eccentricityFactor(h);
            const A = achromaticResponseInverse(A_w, J, surround.c, z);
            const Pn = P(surround.N_c, N_cb, e_t, t, A, N_bb);
            const [, P_2] = Pn;

            let [a, b] = opponentColourDimensionsInverse(Pn, h);
            if (t === 0) {
                a = 0;
                b = 0;
            }

            const RGB_a = postAdaptationNonLinearResponseCompressionMatrix(P_2, a, b);
            const RGB_c = postAdaptationNonLinearResponseCompressionInverse(RGB_a, F_L);
            const RGB = [RGB_c[0] / D_RGB[0], RGB_c[1] / D_RGB[1], RGB_c[2] / D_RGB[2]];
            const XYZ = multiplyMatrices(MATRIX_INVERSE_16, RGB);
            return XYZ;
        };

        /**
         * @see {@link https://colour.readthedocs.io/en/develop/_modules/colour/appearance/cam16.html|Source code for colour.appearance.cam16}
         */
        registerFitMethod("cam16-ucs", (coords, model): number[] => {
            const { targetGamut } = colorModels[model] as ColorModelConverter;
            if (targetGamut === null) return coords;

            const color = new Color(model, coords);
            if (color.inGamut(targetGamut as ColorSpace, 1e-5)) return coords;

            const XYZ = color.in("xyz-d65").getCoords();
            const cam = XYZ_to_CAM16(XYZ);
            const c1 = 0.007,
                c2 = 0.0228;
            const Jp = ((1 + 100 * c1) * cam.J) / (1 + c1 * cam.J);
            const Mp = Math.log(1 + c2 * cam.M) / c2;
            const ap = Mp * Math.cos((cam.h * Math.PI) / 180);
            const bp = Mp * Math.sin((cam.h * Math.PI) / 180);

            const epsilon = 1e-5;
            let scale = 1.0;
            let clippedCoords: number[] = [];

            while (scale > 0) {
                const ap_s = ap * scale;
                const bp_s = bp * scale;

                const Mp_s = Math.sqrt(ap_s * ap_s + bp_s * bp_s);
                const h_s = (Math.atan2(bp_s, ap_s) * 180) / Math.PI;
                const M_s = (Math.exp(c2 * Mp_s) - 1) / c2;
                const J_s = Jp / (1 - c1 * Jp);

                const XYZ_s = CAM16_to_XYZ({ J: J_s, M: M_s, h: h_s });

                const candidateCoords = new Color("xyz-d65", XYZ_s).in(model).getCoords();
                const candidate = new Color(model, candidateCoords);
                if (candidate.inGamut(targetGamut as ColorSpace, epsilon)) {
                    clippedCoords = candidate.getCoords();
                    break;
                }

                scale -= 0.05;
            }

            if (!clippedCoords.length) {
                clippedCoords = fit(color.getCoords().slice(0, 3), model);
            }

            return clippedCoords;
        });

        const coords = [1.2, -0.3, 0.5];
        const model = "srgb";
        const epsilon = 1e-5;

        const cam16Coords = new Color(model, coords).getCoords({ fit: "cam16-ucs" as FitMethod });
        const chromaCoords = new Color(model, coords).getCoords({ fit: "chroma-reduction" });
        const cssCoords = new Color(model, coords).getCoords({ fit: "css-gamut-map" });

        expect(cam16Coords.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);
        expect(chromaCoords.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);
        expect(cssCoords.every((c) => c >= 0 - epsilon && c <= 1 + epsilon)).toBe(true);

        expect(chromaCoords).not.toEqual(cam16Coords);
        expect(cssCoords).not.toEqual(cam16Coords);

        const withinGamut = [0.5, 0.5, 0.5];
        const fitted = new Color(model, withinGamut).getCoords({ fit: "cam16-ucs" as FitMethod });
        expect(fitted).toEqual([...withinGamut, 1]);
    });
});

declare module "../Color.js" {
    interface Color<M extends ColorModel = ColorModel> {
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
            ColorClass.prototype.lighten = function <M extends ColorModel>(this: Color<M>, amount: number) {
                return this.in("hsl").set({
                    l: (l: number) => clamp(l + amount, 0, 100),
                });
            };
        };

        const darkenPlugin = (ColorClass: typeof Color) => {
            ColorClass.prototype.darken = function <M extends ColorModel>(this: Color<M>, amount: number) {
                return this.in("hsl").set({
                    l: (l: number) => clamp(l - amount, 0, 100),
                });
            };
        };

        use(lightenPlugin, darkenPlugin);

        const color = Color.from("hsl(50 50 50)");
        expect(color.lighten(10).toString()).toBe("hsl(50 50 60)");
        expect(color.darken(20).toString()).toBe("hsl(50 50 30)");
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
