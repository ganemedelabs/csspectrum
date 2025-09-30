# Saturon

![npm](https://img.shields.io/npm/v/saturon)
![npm](https://img.shields.io/npm/dw/saturon)
![License](https://img.shields.io/npm/l/saturon)

A runtime-extensible JavaScript library for parsing, converting, and manipulating colors with full CSS spec support.

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Examples](#-examples)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

- **Full CSS Color 4/5 Parsing**
- Infinite nested color functions (e.g. `color-mix(...)` inside `light-dark(...)`)
- Converts between all modern color spaces (OKLab, Display-P3, Rec.2020, etc.)
- High-precision color math for serious colorimetry
- Advanced contrast & accessibility calculations (WCAG 2.1, APCA, OKLab)
- Powerful plugin system for custom color spaces and functions
- Supports complex color syntaxes like `color(from hsl(240 none calc(-infinity) / 0.5) display-p3 r calc(g + b) 100 / alpha)`

## 🔧 Installation

```bash
npm install saturon
```

## 🚀 Usage

```js
import { Color } from "saturon";

// Parse any CSS color string
const color = Color.from("hsl(200 80% 40%)");

// Convert to another format
console.log(color.to("oklch")); // → "oklch(62.43% 0.18 236.79)"

// Access values in another color space
const lab = color.in("lab").get();
console.log(lab); // → { l: 52.3, a: -20.9, b: -45.1, alpha: 1 }

// Modify components
color.in("hsl").set({ l: (l) => l * 1.2 });
console.log(color.to("hsl", { units: true })); // → "hsl(200deg 80% 48%)"
```

## 💡 Examples

### Converting Colors

```js
const color = Color.from("hsl(337 100% 60%)");
console.log(color.to("rgb")); // → rgb(255 51 129)
console.log(color.to("hex-color")); // → #ff3381ff
```

### Manipulating Components

```js
const color = Color.from("hwb(255 7% 1%)");
const hwb = color.in("hwb").set({ h: 100, b: (b) => b * 20 });
console.log(hwb.to("hwb")); // → hwb(100 7% 20%)
```

### Mixing Colors

```js
const red = Color.from("hsl(0, 100%, 50%)");
const mixed = red.in("hsl").mix("hsl(120, 100%, 50%)");
console.log(mixed.to("hsl")); // → hsl(60, 100%, 50%)
```

### New Named Color Registration

```js
registerNamedColor("sunsetblush", [255, 94, 77]);
const rgb = Color.from("rgb(255, 94, 77)");
console.log(rgb.to("named-color")); // → sunsetblush
```

### New Color Function Registration

```js
const converter = {
    components: {
        i: { index: 0, value: [0, 1] },
        ct: { index: 1, value: [-1, 1] },
        cp: { index: 2, value: [-1, 1] },
    },
    bridge: "rgb",
    toBridge: (ictcp: number[]) => [/* r, g, b */],
    fromBridge: (rgb: number[]) => [/* i, ct, cp */],
};

registerColorFunction("ictcp", converter);
const ictcp = Color.from("ictcp(0.2 0.2 -0.1)");
console.log(ictcp.to("rgb")); // → rgb(6.09 6.58 90.88)
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganemedelabs@gmail.com](mailto:ganemedelabs@gmail.com).
