# CSSpectrum Color Class

![npm](https://img.shields.io/npm/v/csspectrum)
![npm](https://img.shields.io/npm/dw/csspectrum)
![License](https://img.shields.io/npm/l/csspectrum)

A TypeScript class for working with CSS color formats, providing conversion, manipulation, and analysis tools for various color models and spaces.

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Examples](#-examples)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

- **Supported Formats**: hex, rgb, hsl, hwb, lab, lch, oklab, oklch, named colors, and more.
- **Color Spaces**: srgb, srgb-linear, display-p3, rec2020, a98-rgb, prophoto-rgb, xyz, xyz-d50, xyz-d65.
- **Advanced Features**: Supports mixed colors (e.g., `color-mix`) and relative colors (e.g., `color(from ...)`).
- **Conversions**: Convert between any supported formats and spaces.
- **Analysis**: Calculate luminance, contrast ratio, and check accessibility (AA/AAA standards).
- **Color Properties**: Determine if a color is dark, light, cool, or warm.
- **Manipulation**: Adjust components, mix colors, apply filters (grayscale, brightness, contrast, etc.).
- **Extensibility**: Register new named colors, format converters, and color spaces.
- **Utility**: Generate random colors, check gamut boundaries.

## 🔧 Installation

Install the package via npm:

```bash
npm install csspectrum
```

## 🚀 Usage

### Basic Usage

Create a `Color` instance from a color string:

```typescript
import { Color } from "csspectrum";

const color = Color.from("#ff5733");
console.log(color.to("rgb")); // Outputs: rgb(255, 87, 51)
```

### Converting Between Formats

Convert colors to different formats:

```typescript
const hexColor = Color.from("rgb(255, 87, 51)");
console.log(hexColor.to("hex")); // Outputs: #FF5733

const lchColor = Color.from("lch(79.7256 40.448 84.771)");
console.log(lchColor.to("srgb")); // Outputs: color(srgb 0.84171 0.76338 0.53501)
```

### Manipulating Colors

Manipulate color components in a specific model:

```typescript
const hslColor = Color.from("hsl(0, 100%, 50%)");
const adjusted = hslColor.in("hsl").set({ h: 120, l: (l) => (l += 10) });
console.log(adjusted.to("hsl")); // Outputs: hsl(120, 100%, 60%)
```

Apply filters:

```typescript
const grayscaled = Color.from("rgb(100, 150, 200)");
console.log(grayscaled.grayscale(1).to("rgb")); // Outputs: rgb(150, 150, 150)

const brightened = Color.from("rgb(32, 76, 120)");
console.log(brightened.brightness(0.5).to("rgb")); // Outputs: rgb(39, 75, 111)
```

### Accessibility Checks

Evaluate contrast and accessibility:

```typescript
const white = Color.from("#ffffff");
console.log(white.getContrastRatio("#000000")); // Outputs: ~21
console.log(white.isAccessibleWith("#000000", "AA")); // Outputs: true
```

## 💡 Examples

### Converting Colors

```typescript
const color = Color.from("hsl(9, 100%, 60%)");
console.log(color.to("rgb")); // rgb(255, 87, 51)
console.log(color.to("hex")); // #ff5733
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
const mixed = red.in("hsl").mixWith("hsl(120, 100%, 50%)");
console.log(mixed.to("hsl")); // ~hsl(60, 100%, 50%)
```

### Applying Filters

```typescript
const firstInstance = Color.from("rgb(100, 150, 200)");
console.log(firstInstance.invert(1).to("rgb")); // Outputs: rgb(155, 105, 55)

const secondInstance = Color.from("rgb(100, 150, 200)");
console.log(secondInstance.sepia(1).to("rgb")); // Outputs: rgb(192, 171, 133)
```

### New Named Color Registration

```typescript
Color.registerNamedColor("Test Color", [10, 20, 30]);
const newColor = Color.from("rgb(10, 20, 30)");
console.log(newColor.to("named")); // Outputs: testcolor
```

### New Format Registration

```typescript
const dummyConverter = {
    pattern: /.*/,
    model: "rgb", // The model that it's based on
    toXYZA: () => [0, 0, 0, 1] as [number, number, number, number],
    fromXYZA: () => "dummy output",
};

Color.registerFormat("dummy", dummyConverter);
const newColor = Color.from("anything");
console.log(newColor.to("dummy")); // Outputs: dummy output
```

### New Space Registration

```typescript
const dummySpace = {
    toLinear: (c: number) => c,
    fromLinear: (c: number) => c,
    components: ["x", "y", "z"],
    toXYZMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
    fromXYZMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
};

Color.registerSpace("dummySpace", dummySpace);
const newColor = Color.from("color(xyz 1 0 0)");
console.log(newColor.to("dummySpace")); // Outputs: color(dummySpace 1 0 0)
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganemedelabs@gmail.com](mailto:ganemedelabs@gmail.com).
