declare module 'fabric-with-erasing' {
    import { fabric } from 'fabric';
    export { fabric };
    export class EraserBrush extends fabric.BaseBrush {
        constructor(canvas: fabric.Canvas);
    }
} 