import Color from "./Color.js";

console.log(Color.from("red").to("rgb"));
console.log(Color.in("rgb").setCoords([0, 100, 50]).to("rgb", { legacy: true }));
