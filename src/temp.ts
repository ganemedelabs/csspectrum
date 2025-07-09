import Color from "./Color.js";

console.log(Color.from("hsla(182, 43%, 33%, 0.8)").in("hsl").getCoords("minmax"));
