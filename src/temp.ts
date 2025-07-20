import { Color } from "./Color.js";

const color = Color.from(`
    color-mix(
        in oklch longer hue,
        color(
            from hsl(240deg none calc(-infinity) / 0.5)
            display-p3
            r calc(g + b) 100 / alpha
        ) 50%,
        rebeccapurple 20%
    )
`);
console.log(color.to("hwb"));
