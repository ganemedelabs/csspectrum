import Color from "./Color";

describe("Color", () => {
    it("should pass this test", () => {
        expect(true).toBe(true);
    });

    it("should correctly identify all supported color formats", () => {
        expect(Color.from("#ff5733").type()).toBe("hex");
        expect(Color.from("rgb(255, 87, 51)").type()).toBe("rgb");
        expect(Color.from("hsl(9, 100%, 60%)").type()).toBe("hsl");
        expect(Color.from("red").type()).toBe("named");
        expect(Color.from("hwb(9 10% 20%)").type()).toBe("hwb");
        expect(Color.from("lab(53.23288% 80.10933 67.22006)").type()).toBe("lab");
        expect(Color.from("lch(50% 80% 30)").type()).toBe("lch");
        expect(Color.from("oklab(59% 0.1 0.1 / 0.5)").type()).toBe("oklab");
        expect(Color.from("oklch(60% 0.15 50)").type()).toBe("oklch");
    });

    it("should correctly identify all supported color spaces", () => {
        expect(Color.from("color(srgb 0.88 0.75 0.49)").type()).toBe("srgb");
        expect(Color.from("color(srgb-linear 0.5 0.3 0.2)").type()).toBe("srgb-linear");
        expect(Color.from("color(display-p3 0.5 0.34 0.2)").type()).toBe("display-p3");
        expect(Color.from("color(rec2020 0.5 0.34 0.2)").type()).toBe("rec2020");
        expect(Color.from("color(a98-rgb 0.5 0.34 0.2)").type()).toBe("a98-rgb");
        expect(Color.from("color(prophoto-rgb 0.5 0.34 0.2)").type()).toBe("prophoto-rgb");
        expect(Color.from("color(xyz-d65 0.37 0.4 0.42)").type()).toBe("xyz-d65");
        expect(Color.from("color(xyz-d50 0.37 0.4 0.32)").type()).toBe("xyz-d50");
        expect(Color.from("color(xyz 0.37 0.4 0.42)").type()).toBe("xyz");
    });

    it("should correctly identify mixed colors", () => {
        expect(Color.from("color-mix(in hsl, hsl(200 50 80), coral 80%)").type()).toBe("hsl");
        expect(Color.from("color-mix(in lch longer hue, hsl(200deg 50% 80%), coral)").type()).toBe("lch");
        expect(Color.from("color-mix(in srgb, plum, #f00)").type()).toBe("srgb");
        expect(Color.from("color-mix(in lab, plum 60%, #f00 50%)").type()).toBe("lab");
    });

    it("should correctly identify relative colors", () => {
        expect(Color.from("color(from red a98-rgb r g b)").type()).toBe("a98-rgb");
        expect(Color.from("color(from red xyz-d50 x y z / alpha)").type()).toBe("xyz-d50");
        expect(Color.from("hsl(from red calc(h + s) s l)").type()).toBe("hsl");
        expect(Color.from("hwb(from red h 50 b / w)").type()).toBe("hwb");
        expect(Color.from("lab(from lch(51.51% 52.21 325.8) l a b)").type()).toBe("lab");
        expect(Color.from("oklab(from oklch(100% 0 0) a calc(l * (a + b)) b / 0.5)").type()).toBe("oklab");
    });

    it("should return correct arrays of components", () => {
        const gamutClipMethod = "minmax";
        expect(Color.from("blanchedalmond").in("rgb").getCoords({ gamutClipMethod })).toEqual([255, 235, 205, 1]);
        expect(Color.from("#7a7239").in("rgb").getCoords({ gamutClipMethod })).toEqual([122, 114, 57, 1]);
        expect(Color.from("rgba(68%, 16%, 50%, 0.3)").in("rgb").getCoords({ gamutClipMethod })).toEqual([
            173, 41, 128, 0.3,
        ]);
        expect(Color.from("hsla(182, 43%, 33%, 0.8)").in("hsl").getCoords({ gamutClipMethod })).toEqual([
            182, 43, 33, 0.8,
        ]);
        expect(Color.from("hwb(228 6% 9% / 0.6)").in("hwb").getCoords({ gamutClipMethod })).toEqual([228, 6, 9, 0.6]);
        expect(Color.from("lab(52.23% 40.16% 59.99% / 0.5)").in("lab").getCoords({ gamutClipMethod })).toEqual([
            52.23, 50.2, 74.9875, 0.5,
        ]);
        expect(Color.from("lch(62.23% 59.2% 126.2 / 0.5)").in("lch").getCoords({ gamutClipMethod })).toEqual([
            62.23, 88.8, 126.2, 0.5,
        ]);
        expect(Color.from("oklab(42.1% 41% -25% / 0.5)").in("oklab").getCoords({ gamutClipMethod })).toEqual([
            0.421, 0.164, -0.1, 0.5,
        ]);
        expect(Color.from("oklch(72.32% 0.12% 247.99 / 0.5)").in("oklch").getCoords({ gamutClipMethod })).toEqual([
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
        expect(Color.from("#ffffff").evaluateAccessibility("#000000", "AA").isAccessible).toBe(true);
        expect(Color.from("#ffffff").evaluateAccessibility("#cccccc", "AAA").isAccessible).toBe(false);
        expect(Color.from("#ffffff").evaluateAccessibility("#000000", "AA", true).isAccessible).toBe(true);
        expect(Color.from("#ffffff").evaluateAccessibility("#cccccc", "AAA", true).isAccessible).toBe(false);
    });

    it("should determine if a color is dark", () => {
        expect(Color.from("rgb(0, 0, 0)").isDark()).toBe(true);
        expect(Color.from("rgb(255, 255, 255)").isDark()).toBe(false);
    });

    it("should determine if a color is light", () => {
        expect(Color.from("rgb(255, 255, 255)").isLight()).toBe(true);
        expect(Color.from("rgb(0, 0, 0)").isLight()).toBe(false);
    });

    it("should return true if a color is cool", () => {
        expect(Color.from("rgb(0, 0, 255)").isCool()).toBe(true);
    });

    it("should return true if a color is warm", () => {
        expect(Color.from("rgb(255, 0, 0)").isWarm()).toBe(true);
    });

    it("should check color equality correctly", () => {
        expect(Color.from("#ff5733").equals("rgb(255, 87, 51)")).toBe(true);
    });

    it("should return a random color", () => {
        const randomColor = Color.random("named");
        expect(Color.from(randomColor).type()).toBe("named");
    });

    it("should return true if a color is in gamut", () => {
        expect(Color.from("color(display-p3 1 0 0)").isInGamut("srgb")).toBe(false);
        expect(Color.from("color(display-p3 1 0 0)").isInGamut("xyz")).toBe(true);
    });

    it("should handle none components correctly", () => {
        const color = Color.from("hsl(none none 50%)");
        expect(color.to("hsl")).toBe("hsl(0, 0%, 50%)");
        color.in("hsl").set({ h: 200, s: 100 });
        expect(color.to("hsl")).toBe("hsl(200, 100%, 50%)");
    });
});

describe("Color patterns", () => {
    const testCases: { name: keyof typeof Color.patterns; valid: string[]; invalid: string[] }[] = [
        {
            name: "hex",
            valid: ["#f09", "#ff0099", "#f09a", "#ff0099cc"],
            invalid: ["#ff", "#ff000", "#ggg"],
        },
        {
            name: "rgb",
            valid: [
                "rgb(255, 87, 51)",
                "rgb(255 none 51)",
                "rgba(255, 87, 51, 0.5)",
                "rgb(none 87 51 / 80%)",
                "rgb(0, 0, 0)",
            ],
            invalid: ["rgb(256, 87, 51)", "rgb(255, 87)", "rgb(255, 87, 51, 1, 2)"],
        },
        {
            name: "hsl",
            valid: ["hsl(9, 100%, 60%)", "hsl(976452 100% 60%)", "hsl(-9 100% none / 0.5)", "hsla(9, 100%, 60%, 50%)"],
            invalid: ["hsl(9, 200%, 60%)", "hsl(361, 100%, 600%)"],
        },
        {
            name: "hwb",
            valid: ["hwb(12 50% 0%)", "hwb(194 none none / 0.5)", "hwb(194 0% 0% / 0.5)"],
            invalid: ["hwb(12, 50%, 0%)", "hwb(12, 50%, 200%)", "hwb(12, 150%, 0%)"],
        },
        {
            name: "lab",
            valid: ["lab(50% none 59.5)", "lab(50% 40 59.5 / 0.5)"],
            invalid: ["lab(50%, 40, 59.5)", "lab(50, 40)", "lab(150%, 59.5)"],
        },
        {
            name: "lch",
            valid: ["lch(52.2% 72.2 none)", "lch(52.2% 72.2 50 / 0.5)"],
            invalid: ["lch(52.2%, 72.2, 50)", "lch(52.2, 72.2%)", "lch(52.2%, -72.2)"],
        },
        {
            name: "oklab",
            valid: ["oklab(59% none 0.1)", "oklab(59% 0.1 0.1 / 0.5)"],
            invalid: ["oklab(59%, 0.1, 0.1)", "oklab(59, 0.1)", "oklab(59% 0.1)"],
        },
        {
            name: "oklch",
            valid: ["oklch(60% none 50)", "oklch(60% 0.15 50 / 0.5)"],
            invalid: ["oklch(60%, 0.15, 50)", "oklch(60, 0.15%)", "oklch(60% 0.15)"],
        },
        {
            name: "named",
            valid: ["rebeccapurple", "aliceblue", "red", "DarkSlateGray"],
            invalid: ["notacolor", "reddish"],
        },
        {
            name: "srgb",
            valid: ["color(srgb 0.8816 0.7545 0.4988)", "color(srgb 0 none 0)", "color(srgb 0.5 0.4 0.3)"],
            invalid: ["color(srgb -0.1 0.5 0.3)", "color(srgb 0.5 0.4)", "color(srgb 0.5 0.4 0.3 0)"],
        },
        {
            name: "srgb-linear",
            valid: ["color(srgb-linear 0.5 0.3 0.2)", "color(srgb-linear 0 none 0)", "color(srgb-linear 0.7 0.8 0.9)"],
            invalid: [
                "color(srgb-linear -0.1 0.3 0.2)",
                "color(srgb-linear 0.5 0.3)",
                "color(srgb-linear 0.5 0.3 0.2 0)",
            ],
        },
        {
            name: "display-p3",
            valid: ["color(display-p3 0.9 0.34 0.2)", "color(display-p3 0 none 0)", "color(display-p3 0.5 0.4 0.3)"],
            invalid: ["color(display-p3 -0.1 0.4 0.3)", "color(display-p3 0.5 0.4)", "color(display-p3 0.5 0.4 0.3 0)"],
        },
        {
            name: "rec2020",
            valid: ["color(rec2020 0.9 0.34 0.2)", "color(rec2020 0 none 0)", "color(rec2020 0.5 0.4 0.3)"],
            invalid: ["color(rec2020 -0.1 0.4 0.3)", "color(rec2020 0.5 0.4)", "color(rec2020 0.5 0.4 0.3 0)"],
        },
        {
            name: "a98-rgb",
            valid: ["color(a98-rgb 0.9 0.34 0.2)", "color(a98-rgb 0 none 0)", "color(a98-rgb 0.5 0.4 0.3)"],
            invalid: ["color(a98-rgb -0.1 0.4 0.3)", "color(a98-rgb 0.5 0.4)", "color(a98-rgb 0.5 0.4 0.3 0)"],
        },
        {
            name: "prophoto-rgb",
            valid: [
                "color(prophoto-rgb 0.9 0.34 0.2)",
                "color(prophoto-rgb 0 none 0)",
                "color(prophoto-rgb 0.5 0.4 0.3)",
            ],
            invalid: [
                "color(prophoto-rgb -0.1 0.4 0.3)",
                "color(prophoto-rgb 0.5 0.4)",
                "color(prophoto-rgb 0.5 0.4 0.3 0)",
            ],
        },
        {
            name: "xyz-d65",
            valid: ["color(xyz-d65 0.37 0.4 0.42)", "color(xyz-d65 0 none 0)", "color(xyz-d65 0.5 0.4 0.3)"],
            invalid: ["color(xyz-d65 -0.1 0.4 0.3)", "color(xyz-d65 0.5 0.4)", "color(xyz-d65 0.5 0.4 0.3 0)"],
        },
        {
            name: "xyz-d50",
            valid: ["color(xyz-d50 0.37 0.4 0.32)", "color(xyz-d50 0 none 0)", "color(xyz-d50 0.5 0.4 0.3)"],
            invalid: ["color(xyz-d50 -0.1 0.4 0.3)", "color(xyz-d50 0.5 0.4)", "color(xyz-d50 0.5 0.4 0.3 0)"],
        },
        {
            name: "xyz",
            valid: ["color(xyz 0.3 0.3 0.3)", "color(xyz 0 none 0)", "color(xyz 0.5 0.4 0.3)"],
            invalid: ["color(xyz -0.1 0.5 0.3)", "color(xyz 0.5 0.4)", "color(xyz 0.5 0.4 0.3 0)"],
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
                    expect(color).toMatch(Color.patterns[name]);
                });
            });
            invalid.forEach((color) => {
                it(`should NOT match invalid ${name} color: "${color}"`, () => {
                    expect(color).not.toMatch(Color.patterns[name]);
                });
            });
        });
    });
});

describe("Color manipulation methods", () => {
    it("should define a color from components", () => {
        const fromObject = Color.in("hsl").set({ h: 260, s: 100, l: 50 }).to("hsl");
        const fromArray = Color.in("hsl").setCoords([260, 100, 50]).to("hsl");
        expect(fromObject).toBe("hsl(260, 100%, 50%)");
        expect(fromArray).toEqual(fromObject);
    });

    it("should return correct component values using get()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        const gamutClipMethod = "minmax";
        expect(rgbInterface.get("r", { gamutClipMethod })).toBe(0);
        expect(rgbInterface.get("g", { gamutClipMethod })).toBe(157);
        expect(rgbInterface.get("b", { gamutClipMethod })).toBe(255);
        expect(rgbInterface.get("alpha", { gamutClipMethod })).toBe(1);
    });

    it("should retrieve the correct array of components using getArray()", () => {
        const rgbColor = Color.from("rgb(0, 157, 255)");
        const rgbInterface = rgbColor.in("rgb");
        expect(rgbInterface.getCoords({ gamutClipMethod: "minmax" })).toEqual([0, 157, 255, 1]);
    });

    it("should update multiple components with set()", () => {
        const hslColor = Color.from("hsl(0, 100%, 50%)");
        const updated = hslColor.in("hsl").set({
            h: (h) => h + 50,
            s: (s) => s - 20,
        });
        const [h, s] = updated.getCoords();
        expect(h).toBe(50);
        expect(s).toBe(80);
    });

    it("should update components with setArray()", () => {
        const hslInterface = Color.in("hsl").setCoords([180, 50, 50]);
        expect(hslInterface.to("hsl")).toBe("hsl(180, 50%, 50%)");
    });

    it("should mix two colors correctly using mix()", () => {
        const color1 = Color.from("red").in("hsl").mix("lime", 0.5, "shorter").to("named");
        const color2 = Color.from("red").in("hsl").mix("lime", 0.5, "longer").to("named");
        expect(color1).toBe("yellow");
        expect(color2).toBe("blue");
    });

    it("should clamp component values when getting components", () => {
        const rgbColor = Color.from("rgb(200, 100, 50)").in("rgb").set({ g: 400 });
        const [, g] = rgbColor.getCoords({ gamutClipMethod: "minmax" });
        expect(g).toBe(255);
    });

    it("should throw an error for an invalid model", () => {
        expect(() => Color.from("rgb(255, 255, 255)").in("invalidModel")).toThrow();
    });

    it("should apply grayscale filter correctly", () => {
        expect(Color.from("hsl(0, 100%, 50%)").grayscale(0).to("hsl")).toBe("hsl(0, 100%, 50%)");
        expect(Color.from("hsl(0, 100%, 50%)").grayscale(1).to("hsl")).toBe("hsl(0, 0%, 50%)");
    });

    it("should adjust brightness correctly", () => {
        expect(Color.from("hsl(11, 100%, 50%)").brightness(0.5).to("hsl")).toBe("hsl(11, 100%, 25%)");
        expect(Color.from("hsl(11, 100%, 50%)").brightness(1).to("hsl")).toBe("hsl(11, 100%, 50%)");
        expect(Color.from("hsl(11, 100%, 50%)").brightness(1.5).to("hsl")).toBe("hsl(11, 100%, 75%)");
    });

    it("should adjust contrast correctly", () => {
        expect(Color.from("rgb(255, 0, 0)").contrast(0).to("rgb")).toBe("rgb(128, 128, 128)");
        expect(Color.from("rgb(255, 0, 0)").contrast(1).to("rgb")).toBe("rgb(255, 0, 0)");
        expect(Color.from("rgb(100, 150, 200)").contrast(0).to("rgb")).toBe("rgb(128, 128, 128)");
    });

    it("should invert a color correctly", () => {
        expect(Color.from("rgb(0, 100, 200)").invert(0).to("rgb")).toBe("rgb(0, 100, 200)");
        expect(Color.from("rgb(0, 100, 200)").invert(1).to("rgb")).toBe("rgb(255, 155, 55)");
        expect(Color.from("rgb(0, 100, 200)").invert(0.5).to("rgb")).toBe("rgb(128, 128, 128)");
    });

    it("should apply opacity correctly", () => {
        expect(Color.from("rgb(255, 87, 51)").opacity(0.5).to("rgb")).toBe("rgba(255, 87, 51, 0.5)");
    });

    it("should adjust saturation correctly", () => {
        expect(Color.from("hsl(0, 50%, 50%)").saturate(0).to("hsl")).toBe("hsl(0, 0%, 50%)");
        expect(Color.from("hsl(0, 50%, 50%)").saturate(1).to("hsl")).toBe("hsl(0, 50%, 50%)");
        expect(Color.from("hsl(0, 50%, 50%)").saturate(1.5).to("hsl")).toBe("hsl(0, 75%, 50%)");
    });

    it("should apply sepia filter correctly", () => {
        expect(Color.from("rgb(100, 150, 200)").sepia(0).to("rgb")).toBe("rgb(100, 150, 200)");
        expect(Color.from("rgb(100, 150, 200)").sepia(1).to("rgb")).toBe("rgb(192, 171, 134)");
        expect(Color.from("rgb(100, 150, 200)").sepia(0.5).to("rgb")).toBe("rgb(146, 161, 167)");
    });
});

describe("Color registration methods", () => {
    describe("registerNamedColor", () => {
        it("should register a new named color successfully", () => {
            Color.registerNamedColor("Test Color", [10, 20, 30]);
            expect(Color.from("rgb(10, 20, 30)").to("named")).toBe("testcolor");
        });

        it("should throw an error when trying to register an already registered named color", () => {
            Color.registerNamedColor("Duplicate", [100, 100, 100]);
            expect(() => {
                Color.registerNamedColor("duplicate", [100, 100, 100]);
            }).toThrow(`Color name "duplicate" is already registered.`);
        });
    });

    describe("registerFormat", () => {
        const dummyConverter = {
            pattern: /.*/,
            model: "rgb",
            toXYZA: () => [0, 0, 0, 1] as [number, number, number, number],
            fromXYZA: () => "dummy output",
        };

        it("should register a new format converter and use it for conversion", () => {
            Color.registerFormat("dummy", dummyConverter);
            const output = Color.from("anything").to("dummy");
            expect(output).toBe("dummy output");
        });
    });

    describe("registerSpace", () => {
        const dummySpace = {
            toLinear: (c: number) => c,
            fromLinear: (c: number) => c,
            components: ["x", "y", "z"],
            toXYZMatrix: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
            ],
            fromXYZMatrix: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
            ],
        };

        it("should register a new color space", () => {
            Color.registerSpace("dummySpace", dummySpace);
            expect(Color.from("color(xyz 1 0 0)").to("dummySpace")).toBe("color(dummySpace 1 0 0)");
        });
    });
});
