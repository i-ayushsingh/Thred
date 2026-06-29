export interface WhiteboardElement {
    id: string;
    type: 'rectangle' | 'circle' | 'line' | 'text' | 'path';
    x: number;
    y: number;
    rotation?: number; // Optional rotation
    zIndex: number; // For layering
    color: string; // Stroke or fill color
    // Common for selection/manipulation
    isSelected?: boolean;
}

export interface RectangleElement extends WhiteboardElement {
    type: 'rectangle';
    width: number;
    height: number;
    fillColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
}

export interface CircleElement extends WhiteboardElement {
    type: 'circle';
    radius: number; // Or width/height for ellipse
    fillColor?: string;
    strokeWidth?: number;
}

export interface LineElement extends WhiteboardElement {
    type: 'line';
    x2: number;
    y2: number;
    strokeWidth?: number;
    hasArrow?: boolean;
}

export interface TextElement extends WhiteboardElement {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: string;
    textAlign?: 'left' | 'center' | 'right';
    width?: number; // For wrapping
    height?: number; // For wrapping
}

export interface PathElement extends WhiteboardElement {
    type: 'path';
    points: { x: number, y: number }[];
    strokeWidth?: number;
}


export type ToolType = 'select' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'pan';
