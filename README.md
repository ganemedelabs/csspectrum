# Saturon

![npm](https://img.shields.io/npm/v/saturon)
![npm](https://img.shields.io/npm/dw/saturon)
![License](https://img.shields.io/npm/l/saturon)

A fast, tiny, extensible color library fully aligned with W3C Color Level 4/5 specs — built for developers and color scientists alike.

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

```typescript
import { Color } from "saturon";

// Parse any CSS color string
const color = Color.from("hsl(200 80% 40% / 0.5)");

// Convert to another format
console.log(color.to("oklch")); // → "oklch(62.43% 0.18 236.79 / 0.5)"

// Access values in another color space
const lab = color.in("lab").get();
console.log(lab); // → { l: 52.3, a: -20.9, b: -45.1, alpha: 0.5 }

// Modify components
color.in("hsl").set({ l: (l) => l * 1.2 });
console.log(color.to("hsl")); // → "hsl(200 80% 48% / 0.5)"
```

## 💡 Examples

### Converting Colors

```typescript
const color = Color.from("hsl(9, 100%, 60%)");
console.log(color.to("rgb")); // rgb(255, 87, 51)
console.log(color.to("hex-color")); // #ff5733
```

### Manipulating Components

```typescript
const color = Color.from("hwb(255 7% 1%)");
const hwb = color.in("hwb").set({ h: 100, b: (b) => (b *= 20) });
console.log(hwb.to("hwb")); // hwb(100 7% 20%)
```

### Mixing Colors

```typescript
const red = Color.from("hsl(0, 100%, 50%)");
const mixed = red.in("hsl").mix("hsl(120, 100%, 50%)", { hue: "shorter" });
console.log(mixed.to("hsl")); // hsl(60, 100%, 50%)
```

### New Named Color Registration

```typescript
Color.registerNamedColor("duskmint", [51, 178, 127]);
const rgb = Color.from("rgb(51, 178, 127)");
console.log(rgb.to("named-color")); // duskmint
```

### New Color Function Registration

```typescript
const converter = {
    components: {
        h: { index: 0, value: "hue" },
        s: { index: 1, value: "percentage" },
        v: { index: 2, value: "percentage" },
    },
    bridge: "hsl",
    toBridge: (hsv: number[]) => [h, s, l],
    fromBridge: (hsl: number[]) => [h, s, v],
};

Color.registerFormat("hsv", converter);
const rgb = Color.from("rgb(234, 32, 101)");
console.log(rgb.to("hsv")); // hsv(340 86.3 91.8)
```

### New Color Space Registration

```typescript
const converter = {
    components: ["r", "g", "b"],
    bridge: "rec2020",
    toBridgeMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
    fromBridgeMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
};

Color.registerSpace("rec2100-pq", converter);
const rec2020 = Color.from("color(rec2020 1 0 0)");
console.log(rec2020.to("rec2100-pq")); // color(rec2100-pq 1 0 0)
```

### New Color Type Registration

```typescript
const converter = {
    isValid: (str: string) => str.startsWith("color-at("),
    bridge: "rgb",
    toBridge: (str: string) => [r, g, b, alpha],
};

Color.registerSpace("color-at", converter);
const timed = Color.from(`color-at(
    '06:00' skyblue,
    '12:00' gold,
    '18:00' orangered,
    '22:00' midnightblue
)`);
console.log(timed.to("rgb")); // rgb(0 191 255)
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganemedelabs@gmail.com](mailto:ganemedelabs@gmail.com).
