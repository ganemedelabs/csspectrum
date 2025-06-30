import Color from "./Color";
import type { ColorType } from "./types";

describe("Color", () => {
    it("should correctly identify all supported color formats", () => {
        expect(Color.type("#ff5733")).toBe("hex");
        expect(Color.type("rgb(255, 87, 51)")).toBe("rgb");
        expect(Color.type("hsl(9, 100%, 60%)")).toBe("hsl");
        expect(Color.type("red")).toBe("named");
        expect(Color.type("hwb(9 10% 20%)")).toBe("hwb");
        expect(Color.type("lab(53.23288% 80.10933 67.22006)")).toBe("lab");
        expect(Color.type("lch(50% 80% 30)")).toBe("lch");
        expect(Color.type("oklab(59% 0.1 0.1 / 0.5)")).toBe("oklab");
        expect(Color.type("oklch(60% 0.15 50)")).toBe("oklch");
    });

    it("should correctly identify all supported color spaces", () => {
        expect(Color.type("color(srgb 0.88 0.75 0.49)")).toBe("srgb");
        expect(Color.type("color(srgb-linear 0.5 0.3 0.2)")).toBe("srgb-linear");
        expect(Color.type("color(display-p3 0.5 0.34 0.2)")).toBe("display-p3");
        expect(Color.type("color(rec2020 0.5 0.34 0.2)")).toBe("rec2020");
        expect(Color.type("color(a98-rgb 0.5 0.34 0.2)")).toBe("a98-rgb");
        expect(Color.type("color(prophoto-rgb 0.5 0.34 0.2)")).toBe("prophoto-rgb");
        expect(Color.type("color(xyz-d65 0.37 0.4 0.42)")).toBe("xyz-d65");
        expect(Color.type("color(xyz-d50 0.37 0.4 0.32)")).toBe("xyz-d50");
        expect(Color.type("color(xyz 0.37 0.4 0.42)")).toBe("xyz");
    });

    it("should correctly identify mixed colors", () => {
        expect(Color.type("color-mix(in hsl, hsl(200 50 80), coral 80%)")).toBe("hsl");
        expect(Color.type("color-mix(in lch longer hue, hsl(200deg 50% 80%), coral)")).toBe("lch");
        expect(Color.type("color-mix(in srgb, plum, #f00)")).toBe("srgb");
        expect(Color.type("color-mix(in lab, plum 60%, #f00 50%)")).toBe("lab");
    });

    it("should correctly identify relative colors", () => {
        expect(Color.type("color(from red a98-rgb r g b)")).toBe("a98-rgb");
        expect(Color.type("color(from red xyz-d50 x y z / alpha)")).toBe("xyz-d50");
        expect(Color.type("hsl(from red calc(h + s) s l)")).toBe("hsl");
        expect(Color.type("hwb(from red h 50 b / w)")).toBe("hwb");
        expect(Color.type("lab(from lch(51.51% 52.21 325.8) l a b)")).toBe("lab");
        expect(Color.type("oklab(from oklch(100% 0 0) a calc(l * (a + b)) b / 0.5)")).toBe("oklab");
    });

    it("should return correct arrays of components", () => {
        const fit = "minmax";
        expect(Color.from("blanchedalmond").in("rgb").getCoords(fit)).toEqual([255, 235, 205, 1]);
        expect(Color.from("#7a7239").in("rgb").getCoords(fit)).toEqual([122, 114, 57, 1]);
        expect(Color.from("rgba(68%, 16%, 50%, 0.3)").in("rgb").getCoords(fit)).toEqual([173, 41, 128, 0.3]);
        expect(Color.from("hsla(182, 43%, 33%, 0.8)").in("hsl").getCoords(fit)).toEqual([182, 43, 33, 0.8]);
        expect(Color.from("hwb(228 6% 9% / 0.6)").in("hwb").getCoords(fit)).toEqual([228, 6, 9, 0.6]);
        expect(Color.from("lab(52.23% 40.16% 59.99% / 0.5)").in("lab").getCoords(fit)).toEqual([
            52.23, 50.2, 74.9875, 0.5,
        ]);
        expect(Color.from("lch(62.23% 59.2% 126.2 / 0.5)").in("lch").getCoords(fit)).toEqual([62.23, 88.8, 126.2, 0.5]);
        expect(Color.from("oklab(42.1% 41% -25% / 0.5)").in("oklab").getCoords(fit)).toEqual([0.421, 0.164, -0.1, 0.5]);
        expect(Color.from("oklch(72.32% 0.12% 247.99 / 0.5)").in("oklch").getCoords(fit)).toEqual([
            0.7232, 0.00048, 247.99, 0.5,
        ]);
    });

    it("should convert HEX to RGB", () => {
        expect(Color.from("#ff5733").to("rgb")).toBe("rgb(255, 87, 51)");
    });

    it("should convert named color to RGB", () => {
        expect(Color.from("red").to("rgb")).toBe("rgb(255, 0, 0)");
    });

    it("should convert LCH color to sRGB", () => {
        expect(Color.from("lch(79.7256 40.448 84.771)").to("srgb")).toBe("color(srgb 0.92605 0.75038 0.39305)");
    });

    it("should calculate luminance correctly", () => {
        expect(Color.from("rgb(255, 255, 255)").luminance()).toBeCloseTo(1);
        expect(Color.from("rgb(0, 0, 0)").luminance()).toBeCloseTo(0);
    });

    it("should calculate contrast ratio correctly", () => {
        expect(Color.from("#ffffff").contrastRatio("#000000")).toBeCloseTo(21);
    });

    it("should determine if a color pair is accessible", () => {
        expect(Color.from("#ffffff").evaluateAccessibility("#000000", { level: "AA" }).isAccessible).toBe(true);
        expect(Color.from("#ffffff").evaluateAccessibility("#cccccc", { level: "AAA" }).isAccessible).toBe(false);
        expect(Color.from("#ffffff").evaluateAccessibility("#000000", { level: "AA", fontSize: 20 }).isAccessible).toBe(
            true
        );
        expect(
            Color.from("#ffffff").evaluateAccessibility("#cccccc", { level: "AAA", fontSize: 20 }).isAccessible
        ).toBe(false);
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
        const randomColor = Color.random("named");
        expect(Color.type(randomColor)).toBe("named");
    });

    it("should return true if a color is in gamut", () => {
        expect(Color.from("color(display-p3 1 0 0)").inGamut("srgb")).toBe(false);
        expect(Color.from("color(display-p3 1 0 0)").inGamut("xyz")).toBe(true);
    });

    it("should handle none components correctly", () => {
        const color = Color.from("hsl(none none 50%)");
        expect(color.to("hsl")).toBe("hsl(0, 0%, 50%)");
        color.in("hsl").set({ h: 150, s: 100 });
        expect(color.to("hsl")).toBe("hsl(150, 100%, 50%)");
    });

    it("should handle calc(infinity) components correctly", () => {
        const color = Color.from("hsl(calc(infinity) calc(-infinity) 50%)");
        expect(color.to("hsl")).toBe("hsl(360, 0%, 50%)");
        color.in("hsl").set({ h: 100, s: 100 });
        expect(color.to("hsl")).toBe("hsl(100, 100%, 50%)");
    });

    it("should define a color from components", () => {
        const fromObject = Color.in("hsl").set({ h: 260, s: 100, l: 50 }).to("hsl");
        const fromArray = Color.in("hsl").setCoords([260, 100, 50]).to("hsl");
        expect(fromObject).toBe("hsl(260, 100%, 50%)");
        expect(fromArray).toEqual(fromObject);
    });

    it("should return correct component values using get()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        const fit = "minmax";
        const rgb = rgbInterface.get(fit);
        expect(rgb).toEqual({ r: 0, g: 157, b: 255, alpha: 1 });
    });

    it("should retrieve the correct array of components using getArray()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        expect(rgbInterface.getCoords("minmax")).toEqual([0, 157, 255, 1]);
    });

    it("should update multiple components with set()", () => {
        const hslColor = Color.from("hsl(0, 100%, 50%)");
        const updated = hslColor.in("hsl").set({
            h: (h) => h + 50,
            s: (s) => s - 20,
        });
        const [h, s] = updated.getCoords();
        expect([h, s]).toStrictEqual([50, 80]);
    });

    it("should update components with setArray()", () => {
        const hslInterface = Color.in("hsl").setCoords([180, 50, 50]);
        expect(hslInterface.to("hsl")).toBe("hsl(180, 50%, 50%)");
    });

    it("should mix two colors correctly using mix()", () => {
        const color1 = Color.from("red").in("hsl").mix("lime", { hue: "shorter" }).to("named");
        const color2 = Color.from("red").in("hsl").mix("lime", { hue: "longer" }).to("named");
        expect(color1).toBe("yellow");
        expect(color2).toBe("blue");
    });

    it("should clamp component values when getting components", () => {
        const rgbColor = Color.from("rgb(200, 100, 50)").in("rgb").set({ g: 400 });
        const [, g] = rgbColor.getCoords("minmax");
        expect(g).toBe(255);
    });

    it("should throw an error for an invalid model", () => {
        expect(() => Color.from("rgb(255, 255, 255)").in("invalidModel")).toThrow();
    });

    it("should adjust opacity correctly", () => {
        const color = Color.from("rgb(120, 20, 170)");
        const adjusted = color.in("rgb").set({ alpha: 0.5 });
        expect(adjusted.to("rgb")).toBe("rgba(120, 20, 170, 0.5)");
    });

    it("should adjust saturation correctly", () => {
        const color = Color.from("hsl(120, 80%, 50%)");
        const adjusted = color.in("hsl").set({ s: 10 });
        expect(adjusted.to("hsl")).toBe("hsl(120, 10%, 50%)");
    });

    it("should adjust hue correctly", () => {
        const color = Color.from("hsl(30, 100%, 50%)");
        const adjusted = color.in("hsl").set({ h: (h) => h - 70 });
        expect(adjusted.to("hsl")).toBe("hsl(320, 100%, 50%)");
    });

    it("should adjust brightness correctly", () => {
        const color = Color.from("hsl(50, 100%, 30%)");
        const adjusted = color.in("hsl").set({ l: 50 });
        expect(adjusted.to("hsl")).toBe("hsl(50, 100%, 50%)");
    });

    it("should adjust contrast correctly", () => {
        const color = Color.from("rgb(30, 190, 250)");
        const amount = 2;
        const adjusted = color.in("rgb").set({
            r: (r) => Math.round((r - 128) * amount + 128),
            g: (g) => Math.round((g - 128) * amount + 128),
            b: (b) => Math.round((b - 128) * amount + 128),
        });
        expect(adjusted.to("rgb")).toBe("rgb(0, 252, 255)");
    });

    it("should apply sepia filter", () => {
        const color = Color.from("rgb(255, 50, 70)");
        const amount = 1;

        const adjusted = color.in("rgb").set(({ r, g, b }) => ({
            r: r + (0.393 * r + 0.769 * g + 0.189 * b - r) * amount,
            g: g + (0.349 * r + 0.686 * g + 0.168 * b - g) * amount,
            b: b + (0.272 * r + 0.534 * g + 0.131 * b - b) * amount,
        }));

        expect(adjusted.to("rgb")).toBe("rgb(152, 135, 105)");
    });
});

describe("Color patterns", () => {
    const testCases: { name: ColorType; valid: string[]; invalid: string[] }[] = [
        {
            name: "hex-color",
            valid: ["#f09", "#ff0099", "#f09a", "#ff0099cc"],
            invalid: ["#ff", "#ff000", "#ggg"],
        },
        {
            name: "rgb",
            valid: [
                "rgb(255, 87, 51)",
                "rgb(255 0 51)",
                "rgba(255, 87, 51, 0.5)",
                "rgb(0 87 51 / 80%)",
                "rgb(0, 0, 0)",
            ],
            invalid: ["rgb(256 87 51 0.1)", "rgb(255, 87)", "rgb(255, 87, 51, 1, 2)"],
        },
        {
            name: "hsl",
            valid: ["hsl(9, 200%, 60%)", "hsl(976452 100% 600%)", "hsl(-9 100% 0 / 0.5)", "hsla(9, 100%, 60%, 50%)"],
            invalid: ["hsl(9, 200deg, 60%)", "hsl(361, 100%, 600rad)"],
        },
        {
            name: "hwb",
            valid: ["hwb(12 50% 0%)", "hwb(194 0 0 / 0.5)", "hwb(194 0% 0% / 0.5)"],
            invalid: ["hwb(12, 50%, 0%)", "hwb(12, 50%, 200%)", "hwb(12, 150%, 0%)"],
        },
        {
            name: "lab",
            valid: ["lab(50% 0 59.5)", "lab(50% 40 59.5 / 0.5)"],
            invalid: ["lab(50%, 40, 59.5)", "lab(50, 40)", "lab(150%, 59.5)"],
        },
        {
            name: "lch",
            valid: ["lch(52.2% 72.2 0)", "lch(52.2% 72.2 50 / 0.5)"],
            invalid: ["lch(52.2%, 72.2, 50)", "lch(52.2, 72.2%)", "lch(52.2%, -72.2)"],
        },
        {
            name: "oklab",
            valid: ["oklab(59% 0 0.1)", "oklab(59% 0.1 0.1 / 0.5)"],
            invalid: ["oklab(59%, 0.1, 0.1)", "oklab(59, 0.1)", "oklab(59% 0.1)"],
        },
        {
            name: "oklch",
            valid: ["oklch(60% 0 50)", "oklch(60% 0.15 50 / 0.5)"],
            invalid: ["oklch(60%, 0.15, 50)", "oklch(60, 0.15%)", "oklch(60% 0.15)"],
        },
        {
            name: "named-color",
            valid: ["rebeccapurple", "aliceblue", "red", "DarkSlateGray"],
            invalid: ["notacolor", "reddish"],
        },
        {
            name: "srgb",
            valid: ["color(srgb -0.8816 0.7545 0.4988)", "color(srgb 0 0 0)", "color(srgb 0.5 0.4 0.3)"],
            invalid: ["srgb(-0.1 0.5 0.3)", "color(srgb 0.5 0.4)", "color(srgb 0.5 0.4 0.3 0)"],
        },
        {
            name: "srgb-linear",
            valid: ["color(srgb-linear -0.5 0.3 0.2)", "color(srgb-linear 0 0 0)", "color(srgb-linear 0.7 0.8 0.9)"],
            invalid: ["srgb-linear(-0.1 0.3 0.2)", "color(srgb-linear 0.5 0.3)", "color(srgb-linear 0.5 0.3 0.2 0)"],
        },
        {
            name: "display-p3",
            valid: ["color(display-p3 -0.9 0.34 0.2)", "color(display-p3 0 0 0)", "color(display-p3 0.5 0.4 0.3)"],
            invalid: ["display-p3(-0.1 0.4 0.3)", "color(display-p3 0.5 0.4)", "color(display-p3 0.5 0.4 0.3 0)"],
        },
        {
            name: "rec2020",
            valid: ["color(rec2020 -0.9 0.34 0.2)", "color(rec2020 0 0 0)", "color(rec2020 0.5 0.4 0.3)"],
            invalid: ["rec2020(-0.1 0.4 0.3)", "color(rec2020 0.5 0.4)", "color(rec2020 0.5 0.4 0.3 0)"],
        },
        {
            name: "a98-rgb",
            valid: ["color(a98-rgb -0.9 0.34 0.2)", "color(a98-rgb 0 0 0)", "color(a98-rgb 0.5 0.4 0.3)"],
            invalid: ["a98-rgb(-0.1 0.4 0.3)", "color(a98-rgb 0.5 0.4)", "color(a98-rgb 0.5 0.4 0.3 0)"],
        },
        {
            name: "prophoto-rgb",
            valid: [
                "color(prophoto-rgb -0.9 0.34 0.2)",
                "color(prophoto-rgb 0 0 0)",
                "color(prophoto-rgb 0.5 0.4 0.3)",
            ],
            invalid: ["prophoto-rgb(-0.1 0.4 0.3)", "color(prophoto-rgb 0.5 0.4)", "color(prophoto-rgb 0.5 0.4 0.3 0)"],
        },
        {
            name: "xyz-d65",
            valid: ["color(xyz-d65 -0.37 0.4 0.42)", "color(xyz-d65 0 0 0)", "color(xyz-d65 0.5 0.4 0.3)"],
            invalid: ["xyz-d65(-0.1 0.4 0.3)", "color(xyz-d65 0.5 0.4)", "color(xyz-d65 0.5 0.4 0.3 0)"],
        },
        {
            name: "xyz-d50",
            valid: ["color(xyz-d50 -0.37 0.4 0.32)", "color(xyz-d50 0 0 0)", "color(xyz-d50 -0.5 0.4 0.3)"],
            invalid: ["xyz-d50(0.1 0.4 0.3)", "color(xyz-d50 0.5 0.4)", "color(xyz-d50 0.5 0.4 0.3 0)"],
        },
        {
            name: "xyz",
            valid: ["color(xyz -0.3 0.3 0.3)", "color(xyz 0 0 0)", "color(xyz 0.5 -0.4 0.3)"],
            invalid: ["xyz(0.1 0.5 0.3)", "color(xyz 0.5 0.4)", "color(xyz 0.5 0.4 0.3 0)"],
        },
        {
            name: "color-mix",
            valid: ["color-mix(in srgb, red 50%, blue)", "color-mix(in srgb, rgb(255,0,0) 50%, rgb(0,0,255))"],
            invalid: ["color-mix(in srgb, red, notacolor)", "color-mix(in, red 50%, blue)"],
        },
    ];

    testCases.forEach(({ name, valid, invalid }) => {
        describe(`${name} pattern`, () => {
            valid.forEach((color) => {
                it(`should match valid ${name} color: "${color}"`, () => {
                    expect(Color.type(color)).toBe(name);
                });
            });
            invalid.forEach((color) => {
                it(`should NOT match invalid ${name} color: "${color}"`, () => {
                    expect(Color.type(color)).toBe(undefined);
                });
            });
        });
    });
});
