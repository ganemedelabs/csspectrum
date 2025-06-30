import Color from "./Color";

// FIXME: chroma-reduction, css-gamut-map and minmax are not working properly
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get({ fit: "no-fit" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get({ fit: "round-only" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get({ fit: "chroma-reduction" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get({ fit: "css-gamut-map" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get({ fit: "minmax" }));

console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "no-fit" }));
console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "round-only" }));
console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "chroma-reduction" }));
console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "css-gamut-map" }));
console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "minmax" }));
