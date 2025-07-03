import Color from "./Color";

// FIXME: chroma-reduction, css-gamut-map and minmax throw errors

// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get("no-fit"));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get("round-only"));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get("chroma-reduction"));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get("css-gamut-map"));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").in("rgb").get("minmax"));

// console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "no-fit" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "round-only" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "chroma-reduction" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "css-gamut-map" }));
// console.log(Color.from("rgb(275.9824 0.234 0.23528)").to("rgb", { fit: "minmax" }));

// FIXME: the calc(30%) should be treated as 30%
console.log(Color.from("rgb(255 calc(30%) 20%)").to("rgb", { fit: "no-fit" }));
