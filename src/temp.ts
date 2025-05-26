import Color from "./Color";

console.time("in");
console.log(Color.in("oklch").setCoords([2, 2, 160]).getCoords({ gamutClipMethod: "oklch" }));
console.timeEnd("in");

console.time("from");
console.log(Color.from("oklch(2, 2, 160)").to("oklch"));
console.timeEnd("from");

// (() => {
//     const color = Color.in("oklch").setCoords([0.95, 0.00006103515625, 250.87895093829468]);
//     const supportedSpaces = Color.getSupportedSpaces();
//     supportedSpaces.forEach((space) => {
//         const convertedColor = color.in(space);
//         console.log(`${space}:`, convertedColor.getCoords());
//     });
// })();
