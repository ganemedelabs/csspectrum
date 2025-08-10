import { multiplyMatrices } from "./utils.js";

export const MATRICES = {
    D50_to_D65: [
        [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
        [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
        [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
    ],
    D65_to_d50: [
        [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
        [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
        [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
    ],
    SRGB_to_XYZD65: [
        [506752 / 1228815, 87881 / 245763, 12673 / 70218],
        [87098 / 409605, 175762 / 245763, 12673 / 175545],
        [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
    ],
    XYZD65_to_SRGB: [
        [12831 / 3959, -329 / 214, -1974 / 3959],
        [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
        [705 / 12673, -2585 / 12673, 705 / 667],
    ],
    P3_to_XYZD65: [
        [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
        [35783 / 156275, 247089 / 357200, 198249 / 2500400],
        [0 / 1, 32229 / 714400, 5220557 / 5000800],
    ],
    XYZD65_to_P3: [
        [446124 / 178915, -333277 / 357830, -72051 / 178915],
        [-14852 / 17905, 63121 / 35810, 423 / 17905],
        [11844 / 330415, -50337 / 660830, 316169 / 330415],
    ],
    REC2020_to_XYZD65: [
        [63426534 / 99577255, 20160776 / 139408157, 47086771 / 278816314],
        [26158966 / 99577255, 472592308 / 697040785, 8267143 / 139408157],
        [0 / 1, 19567812 / 697040785, 295819943 / 278816314],
    ],
    XYZD65_to_REC2020: [
        [30757411 / 17917100, -6372589 / 17917100, -4539589 / 17917100],
        [-19765991 / 29648200, 47925759 / 29648200, 467509 / 29648200],
        [792561 / 44930125, -1921689 / 44930125, 42328811 / 44930125],
    ],
    A98_to_XYZD65: [
        [573536 / 994567, 263643 / 1420810, 187206 / 994567],
        [591459 / 1989134, 6239551 / 9945670, 374412 / 4972835],
        [53769 / 1989134, 351524 / 4972835, 4929758 / 4972835],
    ],
    ProPhoto_to_XYZD50: [
        [0.7977666449006423, 0.13518129740053308, 0.0313477341283922],
        [0.2880748288194013, 0.711835234241873, 0.00008993693872564],
        [0.0, 0.0, 0.8251046025104602],
    ],
    XYZD50_to_ProPhoto: [
        [1.3457868816471583, -0.25557208737979464, -0.05110186497554526],
        [-0.5446307051249019, 1.5082477428451468, 0.02052744743642139],
        [0.0, 0.0, 1.2119675456389452],
    ],
    XYZD65_to_A98: [
        [1829569 / 896150, -506331 / 896150, -308931 / 896150],
        [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
        [16779 / 1248040, -147721 / 1248040, 1266979 / 1248040],
    ],
    LMS_to_XYZD65: [
        [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
        [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
        [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
    ],
    XYZD65_to_LMS: [
        [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
        [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
        [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
    ],
    LMS_to_OKLAB: [
        [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
        [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
        [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
    ],
    OKLAB_to_LMS: [
        [1.0, 0.3963377773761749, 0.2158037573099136],
        [1.0, -0.1055613458156586, -0.0638541728258133],
        [1.0, -0.0894841775298119, -1.2914855480194092],
    ],
};

export const EASINGS = {
    linear: (t: number) => t,
    "ease-in": (t: number) => t * t,
    "ease-out": (t: number) => t * (2 - t),
    "ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    "ease-in-cubic": (t: number) => t * t * t,
    "ease-out-cubic": (t: number) => --t * t * t + 1,
    "ease-in-out-cubic": (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export function RGB_to_XYZD65(rgb: number[]) {
    const rgbNorm = rgb.map((v) => v / 255);

    const lin_sRGB = (RGB: number[]) =>
        RGB.map((val) => {
            const sign = val < 0 ? -1 : 1;
            const abs = Math.abs(val);
            if (abs <= 0.04045) {
                return val / 12.92;
            }
            return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
        });

    const linearRGB = lin_sRGB(rgbNorm);

    const { SRGB_to_XYZD65 } = MATRICES;

    return multiplyMatrices(SRGB_to_XYZD65, linearRGB);
}

export function XYZD65_to_RGB(xyz: number[]) {
    const { XYZD65_to_SRGB } = MATRICES;

    const linRGB = multiplyMatrices(XYZD65_to_SRGB, xyz);

    const gam_sRGB = (RGB: number[]) =>
        RGB.map((val) => {
            const sign = val < 0 ? -1 : 1;
            const abs = Math.abs(val);
            if (abs > 0.0031308) {
                return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
            }
            return 12.92 * val;
        });

    const gammaRGB = gam_sRGB(linRGB);

    return gammaRGB.map((v) => v * 255);
}

export function HSL_to_RGB(hsl: number[]) {
    const [h] = hsl;
    let [, s, l] = hsl;
    s /= 100;
    l /= 100;

    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };

    return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function RGB_to_HSL(rgb: number[]) {
    const [R, G, B] = rgb.map((c) => c / 255);
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    let [H, S] = [0, 0];
    const L = (min + max) / 2;
    const d = max - min;

    if (d !== 0) {
        S = L === 0 || L === 1 ? 0 : (max - L) / Math.min(L, 1 - L);

        switch (max) {
            case R:
                H = (G - B) / d + (G < B ? 6 : 0);
                break;
            case G:
                H = (B - R) / d + 2;
                break;
            case B:
                H = (R - G) / d + 4;
        }

        H = H * 60;
    }

    let h = H;
    let s = S * 100;
    const l = L * 100;

    if (s < 0) {
        h += 180;
        s = Math.abs(s);
    }
    if (h >= 360) h -= 360;
    if (l === 0) s = 0;
    if (S === 0 || l === 0) h = 0;
    return [h, s, l];
}

export function HWB_to_RGB(hwb: number[]) {
    const [h] = hwb;
    let [, w, b] = hwb;
    w /= 100;
    b /= 100;
    if (w + b >= 1) {
        const gray = w / (w + b);
        return [gray, gray, gray];
    }
    const rgb = HSL_to_RGB([h, 100, 50]).map((c) => c / 255);
    for (let i = 0; i < 3; i++) {
        rgb[i] *= 1 - w - b;
        rgb[i] += w;
    }
    return rgb.map((c) => c * 255);
}

export function RGB_to_HWB(rgb: number[]) {
    const rgbToHue = (red: number, green: number, blue: number) => {
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        let hue = NaN;
        const d = max - min;

        if (d !== 0) {
            switch (max) {
                case red:
                    hue = (green - blue) / d + (green < blue ? 6 : 0);
                    break;
                case green:
                    hue = (blue - red) / d + 2;
                    break;
                case blue:
                    hue = (red - green) / d + 4;
            }
            hue *= 60;
            if (hue >= 360) hue -= 360;
        }

        return hue;
    };

    const [sR, sG, sB] = rgb.map((c) => c / 255);
    const hue = rgbToHue(sR, sG, sB);
    const white = Math.min(sR, sG, sB);
    const black = 1 - Math.max(sR, sG, sB);

    return [hue, white * 100, black * 100];
}

export function LAB_to_XYZD50(lab: number[]) {
    const [L, a, b] = lab;
    const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
    const κ = 24389 / 27;
    const ε = 216 / 24389;
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    const xyz = [
        Math.pow(fx, 3) > ε ? Math.pow(fx, 3) : (116 * fx - 16) / κ,
        L > κ * ε ? Math.pow(fy, 3) : L / κ,
        Math.pow(fz, 3) > ε ? Math.pow(fz, 3) : (116 * fz - 16) / κ,
    ];
    return xyz.map((value, i) => value * D50[i]);
}

export function XYZD50_to_LAB(xyz: number[]) {
    const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
    const ε = 216 / 24389;
    const κ = 24389 / 27;
    const xyz_d50 = xyz.map((value, i) => value / D50[i]);
    const [fx, fy, fz] = xyz_d50.map((value) => (value > ε ? Math.cbrt(value) : (κ * value + 16) / 116));
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function LCH_to_LAB(lch: number[]) {
    const [L, C, H] = lch;
    const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
    return [L, a, b];
}

export function LAB_to_LCH(lab: number[]) {
    const [L, a, b] = lab;
    const C = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    const H = (Math.atan2(b, a) * 180) / Math.PI;
    return [L, C, H < 0 ? H + 360 : H];
}

export function OKLAB_to_XYZD65(oklab: number[]) {
    const { LMS_to_XYZD65, OKLAB_to_LMS } = MATRICES;
    const LMSnl = multiplyMatrices(OKLAB_to_LMS, oklab);
    return multiplyMatrices(
        LMS_to_XYZD65,
        LMSnl.map((c) => c ** 3)
    );
}

export function XYZD65_to_OKLAB(xyz: number[]) {
    const { XYZD65_to_LMS, LMS_to_OKLAB } = MATRICES;
    const LMS = multiplyMatrices(XYZD65_to_LMS, xyz);
    return multiplyMatrices(
        LMS_to_OKLAB,
        LMS.map((c) => Math.cbrt(c))
    );
}

export function OKLCH_to_OKLAB(oklch: number[]) {
    const [L, C, H] = oklch;
    const [, a, b] = [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
    return [L, a, b];
}

export function OKLAB_to_OKLCH(oklab: number[]) {
    const [L, a, b] = oklab;
    const H = (Math.atan2(b, a) * 180) / Math.PI;
    const C = Math.sqrt(a ** 2 + b ** 2);
    return [L, C, H < 0 ? H + 360 : H];
}
