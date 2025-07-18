import Color from "./Color.js";
import { colorFunctionConverters } from "./converters.js";
import { ColorFunctionConverter } from "./types.js";
import { multiplyMatrices } from "./utils.js";

// FIXME: fix hwb
console.log(Color.from("hsl(170 80% 50%)").in("xyz").getCoords());
console.log(Color.from("hwb(170 10% 10%)").in("xyz").getCoords());
console.log(Color.from("rgb(26 230 196)").in("xyz").getCoords());

console.log(Color.in("xyz").setCoords([0.38684312817681793, 0.6079590069798572, 0.6192228532317918, 1]).to("hsl"));
console.log(Color.in("xyz").setCoords([0.38684312817681793, 0.6079590069798572, 0.6192228532317918, 1]).to("hwb"));
console.log(Color.in("xyz").setCoords([0.38684312817681793, 0.6079590069798572, 0.6192228532317918, 1]).to("rgb"));
