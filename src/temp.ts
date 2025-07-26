import { Color } from "./Color.js";

const expected = Color.from("hsl(240, 50%, 50%)").in("lch").mix("#bf4040ff").to("rgb");
const fromColorMix = Color.from("color-mix(in lch, hsl(240, 50%, 50%), #bf4040ff)").to("rgb");
const fromRelative = Color.from("hsl(from color-mix(in lch, hsl(240, 50%, 50%), #bf4040ff) h s l)").to("rgb");

console.log({ expected, fromColorMix, fromRelative });
