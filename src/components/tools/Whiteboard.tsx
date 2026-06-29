import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { WhiteboardElement, RectangleElement, CircleElement, LineElement, TextElement, PathElement, ToolType } from './whiteboard-types';
import { v4 as uuidv4 } from 'uuid';
import { ToolWindow } from '../../electron'; // Import ToolWindow interface
import { useT } from '../../i18n/context';
import { useConfirm } from '../ConfirmDialog';
// Helper function to draw elements on canvas
const drawElement = (ctx: CanvasRenderingContext2D, element: WhiteboardElement, zoom: number) => {
    ctx.save();

    ctx.translate(element.x, element.y);
    ctx.rotate(element.rotation || 0);

    // Scale line width and dash pattern by inverse zoom to keep them visually consistent
    const effectiveStrokeWidth = ((element as any).strokeWidth || 2) / zoom;
    ctx.lineWidth = effectiveStrokeWidth;
    ctx.strokeStyle = element.color || '#F4A460';
    ctx.fillStyle = element.color || '#F4A460';

    // Set line dash for selected elements
    if (element.isSelected) {
        ctx.setLineDash([5 / zoom, 5 / zoom]); // Scale dash pattern
        ctx.strokeStyle = '#22D3EE'; // Highlight color for selected elements
    } else {
        ctx.setLineDash([]);
    }

    switch (element.type) {
        case 'rectangle': {
            const rect = element as RectangleElement;
            ctx.beginPath();
            if (rect.cornerRadius) {
                // Simplified rounded rectangle
                ctx.moveTo(rect.cornerRadius, 0);
                ctx.lineTo(rect.width - rect.cornerRadius, 0);
                ctx.quadraticCurveTo(rect.width, 0, rect.width, rect.cornerRadius);
                ctx.lineTo(rect.width, rect.height - rect.cornerRadius);
                ctx.quadraticCurveTo(rect.width, rect.height, rect.width - rect.cornerRadius, rect.height);
                ctx.lineTo(rect.cornerRadius, rect.height);
                ctx.quadraticCurveTo(0, rect.height, 0, rect.height - rect.cornerRadius);
                ctx.lineTo(0, rect.cornerRadius);
                ctx.quadraticCurveTo(0, 0, rect.cornerRadius, 0);
            } else {
                ctx.rect(0, 0, rect.width, rect.height);
            }
            if (rect.fillColor && rect.fillColor !== 'transparent') {
                ctx.fillStyle = rect.fillColor;
                ctx.fill();
            }
            ctx.stroke();
            break;
        }
        case 'circle': {
            const circle = element as CircleElement;
            ctx.beginPath();
            // x, y, radius, startAngle, endAngle - arc is relative to (0,0) after translate
            ctx.arc(circle.radius, circle.radius, circle.radius, 0, Math.PI * 2);
            if (circle.fillColor && circle.fillColor !== 'transparent') {
                ctx.fillStyle = circle.fillColor;
                ctx.fill();
            }
            ctx.stroke();
            break;
        }
        case 'line': {
            const line = element as LineElement;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
            if (line.hasArrow) {
                // Draw arrowhead
                const headlen = 10 / zoom; // Scale arrowhead size
                const angle = Math.atan2(line.y2, line.x2);
                ctx.lineTo(line.x2 - headlen * Math.cos(angle - Math.PI / 6), line.y2 - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(line.x2, line.y2);
                ctx.lineTo(line.x2 - headlen * Math.cos(angle + Math.PI / 6), line.y2 - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            }
            break;
        }
        case 'text': {
            const textEl = element as TextElement;
            ctx.font = `${(textEl.fontSize || 16) / zoom}px ${textEl.fontFamily || 'Arial'}`; // Scale font size
            ctx.fillStyle = textEl.color || '#F4A460';
            ctx.textAlign = textEl.textAlign || 'left';
            ctx.textBaseline = 'top'; // Align text to top-left of element bounds
            // Need to handle width for wrapping if textEl.width is set
            ctx.fillText(textEl.text, 0, 0);
            break;
        }
        case 'path': {
            const path = element as PathElement;
            if (path.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(path.points[0].x, path.points[0].y);
                for (let i = 1; i < path.points.length; i++) {
                    ctx.lineTo(path.points[i].x, path.points[i].y);
                }
                ctx.stroke();
            }
            break;
        }
    }

    // Draw selection bounding box with constant thickness in screen space
    if (element.isSelected) {
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2 / zoom; // Constant thickness in world coordinates means it scales with zoom

        let bboxX = 0, bboxY = 0, bboxWidth = 0, bboxHeight = 0;

        switch (element.type) {
            case 'rectangle':
                bboxWidth = (element as RectangleElement).width;
                bboxHeight = (element as RectangleElement).height;
                break;
            case 'circle':
                // For drawing, x,y are center. Bbox needs top-left
                bboxX = -((element as CircleElement).radius);
                bboxY = -((element as CircleElement).radius);
                bboxWidth = (element as CircleElement).radius * 2;
                bboxHeight = (element as CircleElement).radius * 2;
                break;
            case 'text':
                bboxWidth = (element as TextElement).width || 100; // Use actual width/height from element
                bboxHeight = (element as TextElement).height || 50;
                break;
            case 'path': {
                const path = element as PathElement;
                if (path.points.length > 0) {
                    let minX = path.points[0].x, maxX = path.points[0].x;
                    let minY = path.points[0].y, maxY = path.points[0].y;
                    path.points.forEach(p => {
                        minX = Math.min(minX, p.x);
                        maxX = Math.max(maxX, p.x);
                        minY = Math.min(minY, p.y);
                        maxY = Math.max(maxY, p.y);
                    });
                    bboxX = minX;
                    bboxY = minY;
                    bboxWidth = maxX - minX;
                    bboxHeight = maxY - minY;
                }
                break;
            }
            case 'line': {
                const line = element as LineElement;
                bboxX = Math.min(0, line.x2);
                bboxY = Math.min(0, line.y2);
                bboxWidth = Math.abs(line.x2);
                bboxHeight = Math.abs(line.y2);
                break;
            }
        }
        ctx.strokeRect(bboxX, bboxY, bboxWidth, bboxHeight);
    }

    ctx.restore();
};

// Collision detection helper
const isPointInElement = (
    clientX: number,
    clientY: number,
    element: WhiteboardElement,
    zoom: number,
    panX: number,
    panY: number,
    canvasRect: DOMRect
): boolean => {
    // Transform client coordinates to canvas world coordinates
    const worldX = (clientX - canvasRect.left - panX) / zoom;
    const worldY = (clientY - canvasRect.top - panY) / zoom;

    // Check collision in element's local coordinate system
    let localMouseX = worldX - element.x;
    let localMouseY = worldY - element.y;

    switch (element.type) {
        case 'rectangle': {
            const rect = element as RectangleElement;
            return localMouseX >= 0 && localMouseX <= rect.width &&
                localMouseY >= 0 && localMouseY <= rect.height;
        }
        case 'circle': {
            const circle = element as CircleElement;
            // Circle's (x,y) is center, localMouseX/Y should be relative to center for distance calc
            localMouseX -= circle.radius;
            localMouseY -= circle.radius;
            const distance = Math.sqrt(
                Math.pow(localMouseX, 2) + Math.pow(localMouseY, 2)
            );
            return distance <= circle.radius;
        }
        case 'text': {
            const el = element as TextElement;
            const width = el.width || 100;
            const height = el.height || 50;
            return localMouseX >= 0 && localMouseX <= width &&
                localMouseY >= 0 && localMouseY <= height;
        }
        case 'line': {
            const line = element as LineElement;
            // Approximate hit test for line
            const threshold = 5 / zoom; // Adjust threshold by zoom
            const dist = pointLineDistance(localMouseX, localMouseY, 0, 0, line.x2, line.y2);
            return dist < threshold;
        }
        case 'path': {
            const path = element as PathElement;
            if (path.points.length === 0) return false;
            // Approximate hit test for path - check points along the path
            const threshold = 5 / zoom; // Adjust threshold by zoom
            for (let i = 0; i < path.points.length - 1; i++) {
                const p1 = path.points[i];
                const p2 = path.points[i + 1];
                const dist = pointLineDistance(localMouseX, localMouseY, p1.x, p1.y, p2.x, p2.y);
                if (dist < threshold) return true;
            }
            return false;
        }
        default: return false;
    }
};

// Helper for point-line distance
const pointLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const lineLengthSq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (lineLengthSq === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2)); // Point
    const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSq;
    const clampedT = Math.max(0, Math.min(1, t));
    const projectionX = x1 + clampedT * (x2 - x1);
    const projectionY = y1 + clampedT * (y2 - y1);
    return Math.sqrt(Math.pow(px - projectionX, 2) + Math.pow(py - projectionY, 2));
};

// Inline editor component
const EditingOverlay: React.FC<{
    element: TextElement;
    zoom: number;
    pan: { x: number; y: number };
    canvasRect: DOMRect;
    onUpdate: (id: string, newText: string) => void;
    onClose: () => void;
}> = ({ element, zoom, pan, canvasRect, onUpdate, onClose }) => {
    const [value, setValue] = useState(element.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, []);

    const handleBlur = useCallback(() => {
        onUpdate(element.id, value);
        onClose();
    }, [element.id, value, onUpdate, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && element.type === 'text' && !e.shiftKey) { // Single line text editor closes on Enter
            e.preventDefault();
            handleBlur();
        } else if (e.key === 'Escape') {
            onClose(); // Discard changes on escape
        }
    }, [handleBlur, element.type, onClose]);

    // Calculate position and size based on canvas transform
    const style: React.CSSProperties = {
        position: 'absolute',
        left: canvasRect.left + (element.x * zoom + pan.x),
        top: canvasRect.top + (element.y * zoom + pan.y),
        width: (element.width || 100) * zoom,
        height: (element.height || 30) * zoom,
        fontSize: (element.fontSize || 16) * zoom,
        fontFamily: (element as TextElement).fontFamily || 'Arial',
        color: element.color,
        backgroundColor: 'transparent',
        border: '1px solid #22D3EE',
        padding: 0,
        resize: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 301};

    return createPortal(
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={style}
            className="outline-none" // Tailwind class to remove focus outline
        />,
        document.body
    );
};


const WhiteboardInner: React.FC<{
    onClose: () => void;
    setWhiteboardPosition: (pos: { x: number, y: number } | null) => void;
    setWhiteboardSize: (size: { width: number, height: number } | null) => void;
    minimizeToolWindow: (id: string) => void;
    setToolWindowMaximized: (id: string, maximized: boolean) => void;
    tw: ToolWindow;
}> = ({
    onClose,
    setWhiteboardPosition,
    setWhiteboardSize,
    minimizeToolWindow,
    setToolWindowMaximized,
    tw}) => {
        const [isWindowDragging, setIsWindowDragging] = useState(false);
        const [isWindowResizing, setIsWindowResizing] = useState(false);
        const t = useT();
        const { confirm } = useConfirm();
        const [history, setHistory] = useState<{ past: WhiteboardElement[][], present: WhiteboardElement[], future: WhiteboardElement[][] }>({
            past: [],
            present: [],
            future: []
        });
        const elements = history.present;
        const [activeTool, setActiveTool] = useState<ToolType>('select');
        const [zoom, setZoom] = useState(1);
        const [pan, setPan] = useState({ x: 0, y: 0 });
        const [editingElementId, setEditingElementId] = useState<string | null>(null);
        const [selectedId, setSelectedId] = useState<string | null>(null);

        const {  whiteboardContent, addVaultItem, vaultItems, setWhiteboardContent  } = useStore(useShallow(state => ({ whiteboardContent: state.whiteboardContent, addVaultItem: state.addVaultItem, vaultItems: state.vaultItems, setWhiteboardContent: state.setWhiteboardContent })));
        const [currentId, setCurrentId] = useState<string | null>(null);
        const [currentTitle, setCurrentTitle] = useState<string>('');
        const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
        const [saveTitleInput, setSaveTitleInput] = useState<string>('');

        useEffect(() => {
            if (whiteboardContent) {
                setHistory({ past: [], present: whiteboardContent.elements || [], future: [] });
                setZoom(whiteboardContent.zoom || 1);
                setPan(whiteboardContent.pan || { x: 0, y: 0 });
                setCurrentId(whiteboardContent.id || null);
                setCurrentTitle(whiteboardContent.title || '');
                setSaveTitleInput(whiteboardContent.title || '');
            }
        }, [whiteboardContent]);

        const performSave = useCallback(async (title: string) => {
            const now = new Date().toISOString();
            const targetId = currentId || uuidv4();
            const existingItem = (vaultItems as any[]).find(item => item.id === targetId);
            const createdAt = existingItem?.createdAt || now;

            const vaultItem = {
                id: targetId,
                kind: 'whiteboard' as const,
                category: 'Whiteboard',
                title: title.trim() || t('tools.whiteboard.untitled'),
                desc: `${elements.length} elements`,
                elements,
                zoom,
                pan,
                createdAt,
                updatedAt: now
            };

            try {
                await addVaultItem(vaultItem);
                setCurrentId(targetId);
                setCurrentTitle(vaultItem.title);
                undefined;
            } catch (err) {
                console.error('Failed to save whiteboard:', err);
                undefined;
            }
        }, [currentId, elements, zoom, pan, vaultItems, addVaultItem]);

        const handleSaveClick = useCallback(() => {
            if (currentId) {
                void performSave(currentTitle);
            } else {
                setSaveTitleInput('Untitled Whiteboard');
                setShowSaveModal(true);
            }
        }, [currentId, currentTitle, performSave]);

        const handleNewCanvas = useCallback(async () => {
            if (elements.length > 0) {
                const ok = await confirm({
                    title: t('tools.whiteboard.newCanvasConfirm') || 'Start New Canvas?',
                    message: 'This will clear all current elements. Make sure to save first if you want to keep your work.',
                    confirmLabel: 'New Canvas',
                    cancelLabel: 'Cancel',
                    variant: 'warning'});
                if (!ok) return;
            }
            setHistory({ past: [], present: [], future: [] });
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setCurrentId(null);
            setCurrentTitle('');
            setWhiteboardContent(null);
            undefined;
        }, [elements.length, setWhiteboardContent]);

        const [previewShape, setPreviewShape] = useState<{ el: WhiteboardElement; dims: { w: number; h: number } | null } | null>(null);

        const updateElements = useCallback((updater: (prev: WhiteboardElement[]) => WhiteboardElement[]) => {
            setHistory(h => {
                const next = updater(h.present);
                return {
                    past: [...h.past, h.present].slice(-50),
                    present: next,
                    future: []
                };
            });
        }, []);

        const undo = useCallback(() => {
            setHistory(h => {
                if (h.past.length === 0) return h;
                const previous = h.past[h.past.length - 1];
                const newPast = h.past.slice(0, -1);
                return {
                    past: newPast,
                    present: previous,
                    future: [h.present, ...h.future]
                };
            });
        }, []);

        const redo = useCallback(() => {
            setHistory(h => {
                if (h.future.length === 0) return h;
                const next = h.future[0];
                const newFuture = h.future.slice(1);
                return {
                    past: [...h.past, h.present],
                    present: next,
                    future: newFuture
                };
            });
        }, []);

        const isDrawing = useRef(false);
        const startPoint = useRef({ x: 0, y: 0 });
        const isPanning = useRef(false);
        const panStart = useRef({ x: 0, y: 0 });
        const currentPath = useRef<{ x: number, y: number }[]>([]);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const windowDragOffset = useRef({ x: 0, y: 0 });
        const lastWindowBeforeMaximized = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

        const initialWindowPos = { x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 };
        const initialWindowSize = { width: 800, height: 600 };
        const currentWindowPos = tw.maximized ? { x: 0, y: 0 } : initialWindowPos;
        const currentWindowSize = tw.maximized ? { width: window.innerWidth, height: window.innerHeight } : initialWindowSize;
        const isMinimized = tw.minimized;

        const TOOLS: { id: ToolType; icon: string; label: string }[] = [
            { id: 'select', icon: 'pan_tool', label: 'Select' },
            { id: 'pen', icon: 'draw', label: 'Pen' },
            { id: 'eraser', icon: 'ink_eraser', label: 'Eraser' },
            { id: 'rectangle', icon: 'crop_square', label: 'Rectangle' },
            { id: 'circle', icon: 'circle', label: 'Circle' },
            { id: 'line', icon: 'show_chart', label: 'Line' },
            { id: 'text', icon: 'text_fields', label: 'Text' },
            { id: 'pan', icon: 'pan_tool', label: 'Pan' }];

        const getCanvasPoint = (clientX: number, clientY: number) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return { x: 0, y: 0 };
            return {
                x: (clientX - rect.left - pan.x) / zoom,
                y: (clientY - rect.top - pan.y) / zoom};
        };

        const renderCanvas = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            ctx.clearRect(0, 0, rect.width, rect.height);

            // Grid
            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1 / zoom;
            const gridSize = 40;
            const viewLeft = -pan.x / zoom;
            const viewTop = -pan.y / zoom;
            const viewRight = viewLeft + rect.width / zoom;
            const viewBottom = viewTop + rect.height / zoom;
            const startX = Math.floor(viewLeft / gridSize) * gridSize;
            const startY = Math.floor(viewTop / gridSize) * gridSize;
            ctx.beginPath();
            for (let x = startX; x <= viewRight; x += gridSize) {
                ctx.moveTo(x, viewTop);
                ctx.lineTo(x, viewBottom);
            }
            for (let y = startY; y <= viewBottom; y += gridSize) {
                ctx.moveTo(viewLeft, y);
                ctx.lineTo(viewRight, y);
            }
            ctx.stroke();
            ctx.restore();

            // Elements
            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);
            const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
            for (const el of sorted) {
                drawElement(ctx, el, zoom);
            }
            ctx.restore();

            // Preview shape while drawing
            if (previewShape) {
                ctx.save();
                ctx.translate(pan.x, pan.y);
                ctx.scale(zoom, zoom);
                ctx.setLineDash([6 / zoom, 4 / zoom]);
                ctx.lineWidth = 1.5 / zoom;
                ctx.strokeStyle = '#22D3EE';
                drawElement(ctx, previewShape.el, zoom);
                ctx.restore();

                // Dimension label
                if (previewShape.dims) {
                    const { w, h } = previewShape.dims;
                    const label = `${Math.round(w)} × ${Math.round(h)}`;
                    ctx.save();
                    ctx.font = '12px monospace';
                    ctx.fillStyle = '#22D3EE';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    const labelX = previewShape.el.x + w / 2;
                    const labelY = previewShape.el.y - 10 / zoom;
                    const screenX = labelX * zoom + pan.x;
                    const screenY = labelY * zoom + pan.y;
                    ctx.restore();
                    ctx.save();
                    ctx.font = '12px monospace';
                    ctx.fillStyle = '#22D3EE';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(label, screenX, screenY);
                    ctx.restore();
                }
            }
        }, [elements, zoom, pan, previewShape]);

        useEffect(() => {
            renderCanvas();
        }, [renderCanvas]);

        useEffect(() => {
            const handleResize = () => renderCanvas();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, [renderCanvas]);

        // Keyboard shortcuts
        useEffect(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (selectedId && editingElementId === null) {
                        e.preventDefault();
                        updateElements(prev => prev.filter(el => el.id !== selectedId));
                        setSelectedId(null);
                    }
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redo();
                    else undo();
                }
                if (e.key === 'Escape') {
                    setEditingElementId(null);
                    setSelectedId(null);
                }
                if (e.key === 'Equal' && e.ctrlKey) {
                    e.preventDefault();
                    setZoom(z => Math.min(5, z + 0.1));
                }
                if (e.key === 'Minus' && e.ctrlKey) {
                    e.preventDefault();
                    setZoom(z => Math.max(0.1, z - 0.1));
                }
                if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                    e.preventDefault();
                    handleSaveClick();
                }
            };
            window.addEventListener('keydown', handleKey);
            return () => window.removeEventListener('keydown', handleKey);
        }, [selectedId, editingElementId, undo, redo, handleSaveClick]);

        // Window drag/resize
        const handleWindowMouseDown = useCallback((e: React.MouseEvent) => {
            if (isMinimized || tw.maximized) return;
            if ((e.target as HTMLElement).closest('.drag-handle')) {
                setIsWindowDragging(true);
                windowDragOffset.current = {
                    x: e.clientX - currentWindowPos.x,
                    y: e.clientY - currentWindowPos.y};
            }
        }, [currentWindowPos, isMinimized, tw.maximized]);

        const handleWindowResizeMouseDown = useCallback((e: React.MouseEvent) => {
            if (isMinimized || tw.maximized) return;
            e.preventDefault();
            e.stopPropagation();
            setIsWindowResizing(true);
        }, [isMinimized, tw.maximized]);

        useEffect(() => {
            const handleMove = (e: MouseEvent) => {
                if (isWindowDragging) {
                    let newX = e.clientX - windowDragOffset.current.x;
                    let newY = e.clientY - windowDragOffset.current.y;
                    newX = Math.max(0, Math.min(newX, window.innerWidth - currentWindowSize.width));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - 40));
                    setWhiteboardPosition({ x: newX, y: newY });
                } else if (isWindowResizing) {
                    const newWidth = Math.max(300, e.clientX - currentWindowPos.x);
                    const newHeight = Math.max(200, e.clientY - currentWindowPos.y);
                    setWhiteboardSize({ width: newWidth, height: newHeight });
                }
            };
            const handleUp = () => {
                setIsWindowDragging(false);
                setIsWindowResizing(false);
            };
            if (isWindowDragging || isWindowResizing) {
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
            }
            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
            };
        }, [isWindowDragging, isWindowResizing, currentWindowPos, currentWindowSize, setWhiteboardPosition, setWhiteboardSize]);

        const handleMinimizeClick = useCallback(() => {
            if (!isMinimized) {
                lastWindowBeforeMaximized.current = { x: currentWindowPos.x, y: currentWindowPos.y, width: currentWindowSize.width, height: currentWindowSize.height };
            }
            minimizeToolWindow('whiteboard');
        }, [minimizeToolWindow, isMinimized, currentWindowPos, currentWindowSize]);

        const handleMaximizeClick = useCallback(() => {
            if (tw.maximized) {
                if (lastWindowBeforeMaximized.current) {
                    setWhiteboardPosition({ x: lastWindowBeforeMaximized.current.x, y: lastWindowBeforeMaximized.current.y });
                    setWhiteboardSize({ width: lastWindowBeforeMaximized.current.width, height: lastWindowBeforeMaximized.current.height });
                }
                setToolWindowMaximized('whiteboard', false);
            } else {
                lastWindowBeforeMaximized.current = { x: currentWindowPos.x, y: currentWindowPos.y, width: currentWindowSize.width, height: currentWindowSize.height };
                setWhiteboardPosition({ x: 0, y: 0 });
                setWhiteboardSize({ width: window.innerWidth, height: window.innerHeight });
                setToolWindowMaximized('whiteboard', true);
            }
            if (isMinimized) minimizeToolWindow('whiteboard');
        }, [tw.maximized, isMinimized, currentWindowPos, currentWindowSize, setWhiteboardPosition, setWhiteboardSize, minimizeToolWindow, setToolWindowMaximized]);

        // Canvas mouse handlers
        const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
            if (activeTool === 'pan') {
                isPanning.current = true;
                panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                return;
            }

            const pt = getCanvasPoint(e.clientX, e.clientY);

            if (activeTool === 'select') {
                const reversed = [...elements].reverse();
                const hit = reversed.find(el => isPointInElement(e.clientX, e.clientY, el, zoom, pan.x, pan.y, canvasRef.current!.getBoundingClientRect()));
                if (hit) {
                    setSelectedId(hit.id);
                    isDrawing.current = false;
                    return;
                }
                setSelectedId(null);
                return;
            }

            if (activeTool === 'eraser') {
                isDrawing.current = true;
                const reversed = [...elements].reverse();
                const hit = reversed.find(el => isPointInElement(e.clientX, e.clientY, el, zoom, pan.x, pan.y, canvasRef.current!.getBoundingClientRect()));
                if (hit) {
                    updateElements(prev => prev.filter(el => el.id !== hit.id));
                    setSelectedId(null);
                }
                return;
            }

            isDrawing.current = true;
            startPoint.current = { x: pt.x, y: pt.y };

            if (activeTool === 'pen') {
                currentPath.current = [{ x: pt.x, y: pt.y }];
            }
        }, [activeTool, elements, zoom, pan]);

        const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
            if (isPanning.current) {
                setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
                return;
            }

            // Eraser drag: delete elements under cursor while holding
            if (activeTool === 'eraser' && isDrawing.current) {
                const reversed = [...elements].reverse();
                const hit = reversed.find(el => isPointInElement(e.clientX, e.clientY, el, zoom, pan.x, pan.y, canvasRef.current!.getBoundingClientRect()));
                if (hit) {
                    updateElements(prev => prev.filter(el => el.id !== hit.id));
                    renderCanvas();
                }
                return;
            }

            if (!isDrawing.current) return;

            const pt = getCanvasPoint(e.clientX, e.clientY);

            if (activeTool === 'pen') {
                currentPath.current = [...currentPath.current, { x: pt.x, y: pt.y }];
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                renderCanvas();
                ctx.save();
                ctx.translate(pan.x, pan.y);
                ctx.scale(zoom, zoom);
                ctx.strokeStyle = '#F4A460';
                ctx.lineWidth = 2 / zoom;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(currentPath.current[0].x, currentPath.current[0].y);
                for (let i = 1; i < currentPath.current.length; i++) {
                    ctx.lineTo(currentPath.current[i].x, currentPath.current[i].y);
                }
                ctx.stroke();
                ctx.restore();
                return;
            }

            // Live preview for shape tools
            const start = startPoint.current;
            const w = pt.x - start.x;
            const h = pt.y - start.y;
            const absW = Math.abs(w);
            const absH = Math.abs(h);
            const maxZ = 9999;

            let previewEl: WhiteboardElement | null = null;
            let dims: { w: number; h: number } | null = { w: absW, h: absH };

            if (activeTool === 'rectangle') {
                const elX = w < 0 ? pt.x : start.x;
                const elY = h < 0 ? pt.y : start.y;
                previewEl = { id: 'preview', type: 'rectangle', x: elX, y: elY, zIndex: maxZ, color: '#22D3EE', width: absW, height: absH, fillColor: 'transparent', strokeWidth: 1.5 } as RectangleElement;
            } else if (activeTool === 'circle') {
                const r = Math.max(absW, absH) / 2;
                const cx = start.x + w / 2;
                const cy = start.y + h / 2;
                previewEl = { id: 'preview', type: 'circle', x: cx, y: cy, zIndex: maxZ, color: '#22D3EE', radius: r, fillColor: 'transparent', strokeWidth: 1.5 } as CircleElement;
                dims = { w: r * 2, h: r * 2 };
            } else if (activeTool === 'line') {
                previewEl = { id: 'preview', type: 'line', x: start.x, y: start.y, zIndex: maxZ, color: '#22D3EE', x2: pt.x, y2: pt.y } as LineElement;
            }

            if (previewEl) {
                setPreviewShape({ el: previewEl, dims: (activeTool === 'line' && absW < 3 && absH < 3) ? null : dims });
                renderCanvas();
            }
        }, [activeTool, zoom, pan, renderCanvas]);

        const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
            if (isPanning.current) {
                isPanning.current = false;
                return;
            }
            if (!isDrawing.current) return;
            isDrawing.current = false;
            setPreviewShape(null);
            if (activeTool === 'eraser') return;

            const pt = getCanvasPoint(e.clientX, e.clientY);
            const start = startPoint.current;
            const maxZ = elements.length > 0 ? Math.max(...elements.map(el => el.zIndex)) : 0;

            if (activeTool === 'pen') {
                if (currentPath.current.length < 2) return;
                const pathEl: PathElement = {
                    id: uuidv4(), type: 'path', x: 0, y: 0,
                    zIndex: maxZ + 1, color: '#F4A460',
                    points: currentPath.current, strokeWidth: 2};
                updateElements(prev => [...prev, pathEl]);
                currentPath.current = [];
                return;
            }

            const w = pt.x - start.x;
            const h = pt.y - start.y;

            if (Math.abs(w) < 3 && Math.abs(h) < 3) {
                if (activeTool === 'text') {
                    const textEl: TextElement = {
                        id: uuidv4(), type: 'text', x: start.x, y: start.y,
                        zIndex: maxZ + 1, color: '#F4A460',
                        text: 'Text', fontSize: 16, fontFamily: 'Arial',
                        width: 100, height: 30};
                    updateElements(prev => [...prev, textEl]);
                    setSelectedId(textEl.id);
                    setEditingElementId(textEl.id);
                }
                return;
            }

            const elX = w < 0 ? start.x + w : start.x;
            const elY = h < 0 ? start.y + h : start.y;
            const absW = Math.abs(w);
            const absH = Math.abs(h);

            switch (activeTool) {
                case 'rectangle': {
                    const rect: RectangleElement = {
                        id: uuidv4(), type: 'rectangle', x: elX, y: elY,
                        zIndex: maxZ + 1, color: '#F4A460',
                        width: absW, height: absH, fillColor: 'transparent'};
                    updateElements(prev => [...prev, rect]);
                    break;
                }
                case 'circle': {
                    const r = Math.max(absW, absH) / 2;
                    const cx = w < 0 ? start.x + w / 2 : start.x + w / 2;
                    const cy = h < 0 ? start.y + h / 2 : start.y + h / 2;
                    const circ: CircleElement = {
                        id: uuidv4(), type: 'circle', x: cx, y: cy,
                        zIndex: maxZ + 1, color: '#F4A460',
                        radius: r, fillColor: 'transparent'};
                    updateElements(prev => [...prev, circ]);
                    break;
                }
                case 'line': {
                    const line: LineElement = {
                        id: uuidv4(), type: 'line', x: start.x, y: start.y,
                        zIndex: maxZ + 1, color: '#F4A460',
                        x2: pt.x, y2: pt.y, hasArrow: false};
                    updateElements(prev => [...prev, line]);
                    break;
                }
            }
        }, [activeTool, zoom, pan, elements]);

        const handleTextUpdate = useCallback((id: string, newText: string) => {
            updateElements(prev => prev.map(el => {
                if (el.id !== id) return el;
                if (el.type === 'text') return { ...el, text: newText } as TextElement;
                return el;
            }));
        }, []);

        const handleWheel = useCallback((e: React.WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                setZoom(z => Math.max(0.1, Math.min(5, z + delta)));
            } else {
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        }, []);

        const container = document.getElementById('main-view-container') || document.body;
        const editingElement = editingElementId ? elements.find(el => el.id === editingElementId) as TextElement | undefined : undefined;
        const canvasRect = canvasRef.current?.getBoundingClientRect();

        return createPortal(
            <div
                ref={containerRef}
                className="fixed z-[300] flex flex-col overflow-hidden bg-blue-500/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] animate-pop-center"
                style={{ left: currentWindowPos.x, top: currentWindowPos.y, width: currentWindowSize.width, height: currentWindowSize.height }}
                onMouseDown={handleWindowMouseDown}
            >
                <div className="drag-handle flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-move select-none shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#F4A460]">draw</span>
                        <span className="text-[13px] font-bold text-white/90">
                            {t('tools.whiteboard.title')}{currentTitle ? ` — ${currentTitle}` : ''}
                        </span>
                        {currentId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSaveTitleInput(currentTitle);
                                    setShowSaveModal(true);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white hover:bg-white/10 transition-all cursor-pointer no-drag"
                                title={t('tools.whiteboard.renameTitle')}
                            >
                                <span className="material-symbols-outlined text-[13px]">edit</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1 no-drag">
                        <button onClick={handleMinimizeClick} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.minimize')}>
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <button onClick={handleMaximizeClick} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.maximize')}>
                            <span className="material-symbols-outlined text-[18px]">{tw.maximized ? 'fullscreen_exit' : 'fullscreen'}</span>
                        </button>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.closeTitle')}>
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-white/5 bg-white/5 shrink-0 overflow-x-auto no-drag">
                    {TOOLS.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTool === tool.id
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            title={tool.label}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tool.icon}</span>
                        </button>
                    ))}
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={undo} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.undo')}>
                        <span className="material-symbols-outlined text-[15px]">undo</span>
                    </button>
                    <button onClick={redo} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.redo')}>
                        <span className="material-symbols-outlined text-[15px]">redo</span>
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={handleNewCanvas} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.newCanvas')}>
                        <span className="material-symbols-outlined text-[15px]">add_box</span>
                    </button>
                    <button onClick={handleSaveClick} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={t('tools.whiteboard.saveToVaultTitle')}>
                        <span className="material-symbols-outlined text-[15px]">save</span>
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <span className="text-[11px] text-white/30 font-mono">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative overflow-hidden no-drag">
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 w-full h-full ${activeTool === 'text' ? 'cursor-text' :
                                activeTool === 'eraser' ? 'cursor-cell' :
                                    activeTool === 'pan' ? 'cursor-grab' :
                                        'cursor-crosshair'
                            }`}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={() => { if (isDrawing.current) { isDrawing.current = false; setPreviewShape(null); renderCanvas(); } }}
                        onWheel={handleWheel}
                    />
                </div>

                {/* Text editing overlay */}
                {editingElement && canvasRect && (
                    <EditingOverlay
                        element={editingElement}
                        zoom={zoom}
                        pan={pan}
                        canvasRect={canvasRect}
                        onUpdate={handleTextUpdate}
                        onClose={() => setEditingElementId(null)}
                    />
                )}

                {showSaveModal && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={e => e.stopPropagation()}>
                        <div className="w-[360px] bg-[#161618]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-5" onMouseDown={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[13px] font-bold text-white/90">{t('tools.whiteboard.saveModalTitle')}</span>
                                <button onClick={() => setShowSaveModal(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 cursor-pointer">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>

                            <p className="text-[11px] text-white/45 mb-4 leading-relaxed">
                                {t('tools.whiteboard.saveModalDesc')}
                            </p>

                            <input
                                type="text"
                                value={saveTitleInput}
                                onChange={e => setSaveTitleInput(e.target.value)}
                                placeholder={t('tools.whiteboard.placeholder')}
                                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-[12px] outline-none focus:border-white/20 mb-4"
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && saveTitleInput.trim()) {
                                        e.preventDefault();
                                        void performSave(saveTitleInput);
                                        setShowSaveModal(false);
                                    }
                                }}
                            />

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={() => {
                                        if (saveTitleInput.trim()) {
                                            void performSave(saveTitleInput);
                                            setShowSaveModal(false);
                                        }
                                    }}
                                    disabled={!saveTitleInput.trim()}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${saveTitleInput.trim() ? 'bg-[#F4A460] text-black hover:opacity-90' : 'bg-white/5 text-white/20 cursor-not-allowed'
                                        }`}
                                >
                                    {t('tools.whiteboard.saveToVault')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!isMinimized && !tw.maximized && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 group" onMouseDown={handleWindowResizeMouseDown}>
                        <div className="w-1.5 h-1.5 border-r border-b border-white/20 group-hover:border-white/50 transition-colors" />
                    </div>
                )}
            </div>,
            container
        );
    };

const Whiteboard: React.FC = () => {
    const {  
        toolWindows,
        closeToolWindow,
        setWhiteboardPosition,
        setWhiteboardSize,
        minimizeToolWindow,
        setToolWindowMaximized 
     } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, closeToolWindow: state.closeToolWindow, setWhiteboardPosition: state.setWhiteboardPosition, setWhiteboardSize: state.setWhiteboardSize, minimizeToolWindow: state.minimizeToolWindow, setToolWindowMaximized: state.setToolWindowMaximized })));

    const tw = toolWindows.find(w => w.id === 'whiteboard');
    if (!tw) return null;

    return <WhiteboardInner
        onClose={() => closeToolWindow('whiteboard')}
        setWhiteboardPosition={setWhiteboardPosition}
        setWhiteboardSize={setWhiteboardSize}
        minimizeToolWindow={minimizeToolWindow}
        setToolWindowMaximized={setToolWindowMaximized}
        tw={tw}
    />;
};

export default Whiteboard;
