import { Color } from "./Color";
import { ColorFunction } from "./types.js";

describe("Color", () => {
    it("should correctly identify all supported color functions", () => {
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
            ["hwb(from red h 50 b / w)", "hwb"],
            ["lab(from lch(51.51% 52.21 325.8) l a b)", "lab"],
            ["oklab(from oklch(100% 0 0) a calc(l * (a + b)) b / 0.5)", "oklab"],
        ];

        cases.forEach(([input, expected]) => {
            expect(Color.type(input)).toBe(expected);
        });
    });

    it("should return correct arrays of components", () => {
        const cases: [string, ColorFunction, number[]][] = [
            ["blanchedalmond", "rgb", [255, 235, 205, 1]],
            ["#7a7239", "rgb", [122, 114, 57, 1]],
            ["rgb(68% 16% 50% / 0.3)", "rgb", [173, 41, 128, 0.3]],
            ["hsla(182, 43%, 33%, 0.8)", "hsl", [182, 43, 33, 0.8]],
            ["hwb(228 6% 9% / 0.6)", "hwb", [228, 6, 9, 0.6]],
            ["lab(52.23% 40.16% 59.99% / 0.5)", "lab", [52.23, -24.6, 24.975, 0.5]],
            ["lch(62.23% 59.2% 126.2 / 0.5)", "lch", [62.23, 88.8, 126.2, 0.5]],
            ["oklab(42.1% 41% -25% / 0.5)", "oklab", [0.421, -0.072, -0.4, 0.5]],
            ["oklch(72.32% 0.12% 247.99 / 0.5)", "oklch", [0.7232, 0.00048, 247.99, 0.5]],
        ];

        cases.forEach(([input, space, expected]) => {
            expect(Color.from(input).in(space).getCoords("clip")).toEqual(expected);
        });
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
    });

    it("should convert HEX color to RGB", () => {
        expect(Color.from("#ff5733").to("rgb")).toBe("rgb(255 87 51)");
    });

    it("should convert named color to RGB", () => {
        expect(Color.from("red").to("rgb")).toBe("rgb(255 0 0)");
    });

    it("should convert LCH color to sRGB", () => {
        expect(Color.from("lch(79.7256 40.448 84.771)").to("srgb")).toBe("color(srgb 0.8741 0.76037 0.47644)");
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

    it("should return true if a color is cool", () => {
        const color = Color.from("rgb(0, 0, 255)");
        const { h } = color.in("hsl").get();
        expect(h > 60 && h < 300).toBe(true);
    });

    it("should return true if a color is warm", () => {
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

    it("should handle none components correctly", () => {
        const color = Color.from("hsl(none none 50%)");
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

    it("should retrieve the correct array of components using getArray()", () => {
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

    it("should update components with setArray()", () => {
        const hslInterface = new Color("hsl", [180, 50, 50]);
        expect(hslInterface.to("hsl")).toBe("hsl(180 50 50)");
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
        const adjusted = color.in("hsl").set({ s: 10 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(120deg 10% 50%)");
    });

    it("should adjust hue correctly", () => {
        const color = Color.from("hsl(30, 100%, 50%)");
        const adjusted = color.in("hsl").set({ h: (h) => h - 70 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(320deg 100% 50%)");
    });

    it("should adjust brightness correctly", () => {
        const color = Color.from("hsl(50, 100%, 30%)");
        const adjusted = color.in("hsl").set({ l: 50 });
        expect(adjusted.to("hsl", { units: true })).toBe("hsl(50deg 100% 50%)");
    });

    it("should adjust contrast correctly", () => {
        const color = Color.from("rgb(30, 190, 250)");
        const amount = 2;
        const adjusted = color.in("rgb").set({
            r: (r) => Math.round((r - 128) * amount + 128),
            g: (g) => Math.round((g - 128) * amount + 128),
            b: (b) => Math.round((b - 128) * amount + 128),
        });
        expect(adjusted.to("rgb")).toBe("rgb(0 252 255)");
    });

    it("should apply sepia filter", () => {
        const color = Color.from("rgb(255, 50, 70)");
        const amount = 1;

        const adjusted = color.in("rgb").set(({ r, g, b }) => ({
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
});

// describe("Color registration system", () => {
//     it("should register a named-color", () => {
//         Color.registerNamedColor("duskmint")
//     })
// })
