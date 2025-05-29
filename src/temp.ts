import Color from "./Color";

// FIXME: all regex should accept any number and should not have limits
// console.time("in");
// console.log(Color.in("oklch").setCoords([2, 2, 160]));
// console.timeEnd("in");
// console.time("from");
// console.log(Color.from("oklch(2, 2, 160)"));
// console.timeEnd("from");

// TODO: Implement the RGB gamut mapping method (W3C Color 4, Section 13.2)
console.log(Color.in("srgb").setCoords([1, 1, 1]).getCoords({ fit: "chroma-reduction" }));
console.log(Color.in("srgb").setCoords([1.1, 1, 1]).getCoords({ fit: "chroma-reduction" }));
console.log(Color.in("srgb").setCoords([1.2, 1, 1]).getCoords({ fit: "chroma-reduction" }));
console.log(Color.in("srgb").setCoords([1.3, 1, 1]).getCoords({ fit: "chroma-reduction" }));
console.log(Color.in("srgb").setCoords([1.4, 1, 1]).getCoords({ fit: "chroma-reduction" }));
console.log(Color.in("srgb").setCoords([1.5, 1, 1]).getCoords({ fit: "chroma-reduction" }));
