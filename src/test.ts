import Color from "./Color";

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

Color.registerSpace("dummySpace", dummySpace);
const newColor = Color.from("color(xyz 1 0 0)");
console.log(newColor.to("dummySpace")); // Outputs: color(dummySpace 1 0 0)
