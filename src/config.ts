import { Config } from "./types.js";

export const systemColors = {
    Canvas: [
        [255, 255, 255],
        [30, 30, 30],
    ],
    CanvasText: [
        [0, 0, 0],
        [255, 255, 255],
    ],
    LinkText: [
        [0, 0, 255],
        [0, 128, 255],
    ],
    VisitedText: [
        [128, 0, 128],
        [128, 0, 128],
    ],
    ButtonFace: [
        [240, 240, 240],
        [60, 60, 60],
    ],
    ButtonText: [
        [0, 0, 0],
        [255, 255, 255],
    ],
    Field: [
        [255, 255, 255],
        [45, 45, 45],
    ],
    FieldText: [
        [0, 0, 0],
        [255, 255, 255],
    ],
    Highlight: [
        [0, 120, 215],
        [80, 80, 80],
    ],
    HighlightText: [
        [255, 255, 255],
        [0, 0, 0],
    ],
    GrayText: [
        [128, 128, 128],
        [169, 169, 169],
    ],
    ActiveText: [
        [0, 0, 255],
        [0, 128, 255],
    ],
    ActiveCaption: [
        [0, 120, 215],
        [30, 30, 30],
    ],
    CaptionText: [
        [255, 255, 255],
        [255, 255, 255],
    ],
    InfoBackground: [
        [255, 255, 225],
        [50, 50, 50],
    ],
    InfoText: [
        [0, 0, 0],
        [255, 255, 255],
    ],
};

export const config: Config = {
    theme: "light",
    systemColors,
};
