// File: components/Whiteboard.tsx

"use client";
import Cursor from './Cursor';
import { Toolbar } from '@/components/Toolbar';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { fabric } from 'fabric-with-erasing';
import { nanoid } from 'nanoid';
import { TPointerEvent } from 'fabric';
import {
    useRoom,
    useMyPresence,
    useOthers,
    useMutation,
    useStorage,
    useSelf,
} from "@liveblocks/react";
import { Presence, Storage, CanvasObject } from '@/types/liveblocks';
import { LiveList, LiveObject } from "@liveblocks/client";
import { UndoableAction } from '@/types/history';

export type FabricEventWithTarget = fabric.TEvent<TPointerEvent> & { target?: fabric.Object };

// Tool type includes shapes
export type Tool =
    | "pen"
    | "select"
    | "rectangle"
    | "circle"
    | "text"
    | "eraser";

type CanvasObjectSnapshot = {
    type: string;
    data: Record<string, unknown>;
};

// Define the structure for a single user's presence
export type Presence = {
    cursor: { x: number; y: number } | null; // Cursor position (null if not visible)
    selectedTool?: string; // Example: You might already be storing the selected tool
    // Add other presence data like name, color etc. if needed
    // name?: string;
    // color?: string;
};

// Type assumption for userInfo from authentication
type UserInfo = {
    name?: string;
    picture?: string; // Example
};

// Define your CanvasObject structure (as before)
export type CanvasObject = LiveObject<{
    type: 'path' | 'rect' | 'circle' | 'text' | string; // Include 'text'
    data: {
        id: string; // Unique identifier is crucial
        ownerConnectionId?: number;
        // Add properties specific to text if needed for stricter typing
        text?: string;
        fontSize?: number;
        // Allow other Fabric props
        [key: string]: any;
    };
}>;
// Define the overall storage structure
export type Storage = {
    objects: LiveList<CanvasObject>;
};
// Constants
const DEFAULT_PEN_COLOR = '#000000';
const DEFAULT_PEN_WIDTH = 5;
const DEFAULT_PEN_STROKE_UNIFORM = true;

const DEFAULT_ERASER_WIDTH = 50;

// Helper function to get properties to include when serializing Fabric objects
const getFabricObjectProperties = (obj: fabric.Object): string[] => {
    const baseProps = ['id', 'type', 'left', 'top', 'angle', 'scaleX', 'scaleY', 'originX', 'originY'];
    const specificProps = obj.type === 'i-text' ? ['text', 'fontSize', 'fontFamily', 'fill'] : 
                         obj.type === 'path' ? ['path', 'stroke', 'strokeWidth', 'strokeUniform'] :
                         ['width', 'height', 'radius', 'fill', 'stroke', 'strokeWidth', 'strokeUniform'];
    return [...baseProps, ...specificProps];
};

// Throttle function with proper typing
const throttle = <T extends (...args: unknown[]) => void>(func: T, limit: number) => {
    let lastFunc: NodeJS.Timeout | null;
    let lastRan: number;
    return function (this: unknown, ...args: Parameters<T>) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            if (lastFunc) clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
};

const THROTTLE_LIMIT_MS = 50;

interface WhiteboardProps {
    initialData?: object | null;
}

export const Whiteboard = ({ initialData }: WhiteboardProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const [activeTool, setActiveTool] = useState<Tool>("rectangle");
    const activeToolRef = useRef<Tool>(activeTool);
    const [isDrawingShape, setIsDrawingShape] = useState(false);
    const shapeOriginRef = useRef<{ x: number, y: number } | null>(null);
    const drawingShapeRef = useRef<fabric.Object | null>(null);

    // Liveblocks hooks
    const room = useRoom();
    const connectionState = room?.connection;
    const [myPresence, updateMyPresence] = useMyPresence<Presence>();
    const others = useOthers<Presence>();
    const self = useSelf();
    const canvasObjects = useStorage((root) => root.objects);

    // Initialize canvas with initial data if available
    useEffect(() => {
        if (initialData && fabricRef.current) {
            try {
                fabricRef.current.loadFromJSON(initialData, () => {
                    console.log('Canvas loaded with initial data');
                });
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        }
    }, [initialData]);

    // Existing Mutation (ensure it handles id and ownerConnectionId correctly)
    const addObjectToStorage = useMutation(
        (mutation, objectType: string, objectData: Record<string, any>) => {
            let objects = mutation.storage.get("objects");
            if (!objects) {
                objects = new LiveList<CanvasObject>([]);
                mutation.storage.set("objects", objects);
            }
            const dataWithDefaults = {
                ownerConnectionId: mutation.self.connectionId,
                ...objectData
            };
            const newCanvasObject = new LiveObject({ type: objectType, data: dataWithDefaults });
            (objects as LiveList<CanvasObject>).push(newCanvasObject as CanvasObject);
            // console.log(`Added ${objectType} (id: ${objectData.id}) to Liveblocks storage.`);
        },
        []
    );

    // --- Mutation for UPDATING Objects ---
    // This mutation updates properties within the 'data' field of a LiveObject in the 'objects' LiveList
    const updateObjectInStorage = useMutation(
        (
            mutation,
            objectId: string,
            updateData: Partial<CanvasObject['data']>
        ) => {
            const objects = mutation.storage.get("objects");
            if (!objects) {
                console.warn("Storage 'objects' list not found during update attempt.");
                return;
            }

            // Find the LiveObject in the LiveList whose data.id matches the objectId
            const objectIndex = (objects as LiveList<CanvasObject>).findIndex((obj) => {
                try {
                    const data = obj.get("data");
                    return data && data.get("id") === objectId;
                } catch (error) {
                    console.warn("Error accessing object data:", error);
                    return false;
                }
            });

            if (objectIndex === -1) {
                console.warn(`Object ID: ${objectId} not found in storage for update. Skipping update.`);
                return;
            }

            try {
                // Get the LiveObject to update
                const objectToUpdate = (objects as LiveList<CanvasObject>).get(objectIndex);
                if (!objectToUpdate) {
                    console.warn(`Object at index ${objectIndex} not found.`);
                    return;
                }

                // Get the nested data LiveObject
                const data = objectToUpdate.get("data");
                if (!data) {
                    console.warn(`Data not found for object ID: ${objectId}`);
                    return;
                }

                // Create a new data object with updated values
                const newData = { ...data.toObject() };
                Object.entries(updateData).forEach(([key, value]) => {
                    if (key !== 'id') {
                        newData[key] = value;
                    }
                });

                // Update the entire data object at once
                data.update(newData);
                console.log(` -> Update successful for object ID: ${objectId}`);
            } catch (error) {
                console.error("Error updating object:", error);
            }
        },
        []
    );


    // --- Mutation for DELETING Objects ---
    // This mutation removes an object from the 'objects' LiveList by its unique ID
    const deleteObjectFromStorage = useMutation(
        (mutation, objectId: string) => {
            const objects = mutation.storage.get("objects");
            if (!objects) {
                console.warn("Storage 'objects' list not found during delete attempt.");
                return;
            }

            // Find the index of the LiveObject whose nested 'data.id' matches the objectId
            const objectIndex = (objects as LiveList<CanvasObject>).findIndex((obj) => obj.get("data")?.get("id") === objectId);

            if (objectIndex !== -1) {
                // Delete the object at the found index
                (objects as LiveList<CanvasObject>).delete(objectIndex);
                console.log(`Deleted object ID: ${objectId} from storage.`);
            } else {
                console.warn(`Object ID: ${objectId} not found in storage for deletion.`);
            }
        },
        [] // Dependencies
    );


    // --- Throttled Update Function ---
    // Use useMemo to create a stable throttled function reference
    // This function calls the actual Liveblocks mutation
    const throttledUpdateObject = useMemo(
        () => throttle(
            (objectId: string, updateData: Partial<CanvasObject['data']>) => {
                // Only call the mutation if we have an object ID and data
                if (objectId && updateData) {
                    // console.log(`Throttled Update Call: ID=${objectId}`, updateData); // DEBUG
                    updateObjectInStorage(objectId, updateData);
                }
            },
            THROTTLE_LIMIT_MS // Use the defined throttle limit
        ),
        [updateObjectInStorage] // Dependency: Recreate if the base mutation function changes
    );
    // --- Throttled Presence Update Function ---
    // Memoize the throttled function to ensure it has a stable reference
    const throttledUpdateMyPresence = useMemo(() => {
        // Create a throttled version of the function that calls updateMyPresence
        return throttle(
            (presenceUpdate: Partial<Presence>) => {
                // console.log("Throttled Update Called:", presenceUpdate); // Debugging
                updateMyPresence(presenceUpdate);
            },
            THROTTLE_LIMIT_MS  // Use the defined throttle limit
        );
        // Dependency: updateMyPresence function reference
    }, [updateMyPresence]);

    // Effects (remain the same for now)
    useEffect(() => {
        if (connectionState === 'connected') {
            updateMyPresence({ cursor: null, selectedTool: activeTool });
        }
    }, [connectionState, updateMyPresence, activeTool]);
    // --- Effect to Configure Fabric.js based on Active Tool ---
    // (Needs updating later for 'select' tool logic)
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.isDrawingMode = false;
        // Configure canvas based on active tool
        switch (activeTool) {
            case 'pen':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = DEFAULT_PEN_COLOR;
                canvas.freeDrawingBrush.width = DEFAULT_PEN_WIDTH;
                canvas.freeDrawingBrush.strokeUniform = DEFAULT_PEN_STROKE_UNIFORM;
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                canvas.forEachObject(obj => obj.set({ evented: false, selectable: false }));
                break;

            case 'eraser':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                const eraserBrush = new fabric.PencilBrush(canvas);
                eraserBrush.width = DEFAULT_ERASER_WIDTH;
                eraserBrush.color = 'rgba(255, 252, 252, 0)';
                eraserBrush.globalCompositeOperation = 'destination-out';
                canvas.freeDrawingBrush = eraserBrush;
                canvas.defaultCursor = 'cell';
                canvas.hoverCursor = 'cell';
                canvas.forEachObject(obj => {
                    obj.set({
                        evented: false,
                        selectable: false,
                        erasable: true,
                        excludeFromExport: false,
                        strokeUniform: true
                    });
                });
                break;

            case 'select':
                canvas.isDrawingMode = false;
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.forEachObject(obj => {
                    obj.set({ 
                        evented: true, 
                        selectable: true,
                        erasable: false 
                    });
                });
                break;

            case 'rectangle':
            case 'circle':
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                canvas.forEachObject(obj => {
                    obj.set({ 
                        evented: false, 
                        selectable: false,
                        erasable: false 
                    });
                });
                break;

            case 'text':
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.defaultCursor = 'text';
                canvas.hoverCursor = 'text';
                canvas.forEachObject(obj => {
                    obj.set({ 
                        evented: obj.type === 'i-text',
                        selectable: obj.type === 'i-text',
                        erasable: false 
                    });
                });
                break;

            default:
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'default';
        }

        canvas.requestRenderAll();
    }, [activeTool]);

    // --- Effect to Update Fabric Canvas from Storage ---
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // Store the current canvas objects reference to work with a stable value
        const currentCanvasObjects = canvasObjects;

        // 1. Clear the canvas before rendering objects from storage
        canvas.clear();

        // 2. Check if canvasObjects exists and has items
        if (currentCanvasObjects && ((currentCanvasObjects as unknown) as LiveList<CanvasObject>).length > 0) {
            // 3. Prepare data for enlivenObjects
            // Get the plain JS objects from the LiveObjects
            const objectsToProcess = currentCanvasObjects.map((obj: CanvasObject) => {
                return {
                    type: obj.type,
                    data: obj.data
                };
            });

            // Extract just the data which contains the serialized Fabric props
            const dataToEnliven = objectsToProcess.map(p => p.data);

            // console.log(`Attempting to enliven ${dataToEnliven.length} objects...`);

            // 4. Use fabric.util.enlivenObjects to deserialize ALL objects
            fabric.util.enlivenObjects(
                dataToEnliven,
                (liveObjects: fabric.Object[]) => {
                    // Check if canvas is still mounted after async operation
                    if (!fabricRef.current) return;

                    // console.log(`Successfully enlivened ${liveObjects.length} objects.`);
                    canvas.discardActiveObject(); // Deselect any active object

                    // 5. Add each live object to the canvas, applying eraser effect if needed
                    liveObjects.forEach((obj, index) => {
                        // Get the original type from our processed objects
                        const originalType = objectsToProcess[index]?.type;

                        // Set interactivity based on the current tool for *this* client
                        const isSelectable = activeTool === 'select';
                        const isEvented = activeTool === 'select';

                        obj.set({
                            selectable: isSelectable,
                            evented: isEvented,
                        });

                        // --- Apply Eraser Effect ---
                        if (originalType === 'eraserPath') {
                            console.log(`Rendering object ID ${obj.get('id')} as Eraser Path.`);
                            obj.globalCompositeOperation = 'destination-out';
                        } else {
                            obj.globalCompositeOperation = 'source-over';
                        }

                        // Add the object to the canvas
                        canvas.add(obj);
                    });

                    // 6. Request Fabric.js to re-render the entire canvas
                    canvas.requestRenderAll();
                },
                '' // Namespace (optional)
            );
        } else {
            // If storage is empty, ensure canvas is clear and rendered
            canvas.requestRenderAll();
        }

        // Dependency: Re-run effect when the storage snapshot changes or activeTool changes
    }, [canvasObjects, activeTool]);


    // --- Memoized resize handler (required) ---\
    const handleResize = useCallback(() => {
        const fabricCanvas = fabricRef.current;
        const container = canvasContainerRef.current;
        if (fabricCanvas && container) {
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            fabricCanvas.setWidth(width);
            fabricCanvas.setHeight(height);
            fabricCanvas.renderAll();
        }
    }, []);
    // --- Continuous Transformation Event Handlers ---

    // --- Keyboard Event Handler for Deletion ---
   const handleDeleteKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === 'select') {
        const canvas = fabricRef.current;
        if (!canvas) return;
        
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const objectsToDelete = activeObject.type === 'activeSelection' 
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];

        objectsToDelete.forEach(obj => {
            const objectId = obj.get('id') as string;
            if (!objectId) return;
            canvas.remove(obj);
            deleteObjectFromStorage(objectId);
        });

        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }
}, [activeTool, deleteObjectFromStorage]);


    const handleObjectMoving = useCallback((options: FabricEventWithTarget) => {
        if (activeTool !== 'select' || !options.target) return; // Only act if Select tool is active
        const target = options.target;
        const objectId = target.get('id') as string | undefined;

        if (objectId) {
            // Extract only position data
            const updateData: Partial<CanvasObject['data']> = {
                left: target.left,
                top: target.top,
            };
            // Call the throttled update function
            throttledUpdateObject(objectId, updateData);
        }
    }, [activeTool, throttledUpdateObject]);

    const handleObjectScaling = useCallback((options: FabricEventWithTarget) => {
        if (activeTool !== 'select' || !options.target) return;
        const target = options.target;
        const objectId = target.get('id') as string | undefined;

        if (objectId) {
            // Extract scale, position (position might change slightly during scaling from corners)
            const updateData: Partial<CanvasObject['data']> = {
                left: target.left,
                top: target.top,
                scaleX: target.scaleX,
                scaleY: target.scaleY,
            };
            throttledUpdateObject(objectId, updateData);
        }
    }, [activeTool, throttledUpdateObject]);

    const handleObjectRotating = useCallback((options: FabricEventWithTarget) => {
        if (activeTool !== 'select' || !options.target) return;
        const target = options.target;
        const objectId = target.get('id') as string | undefined;

        if (objectId) {
            // Extract angle and potentially position (if rotation affects origin placement)
            const updateData: Partial<CanvasObject['data']> = {
                // Note: Fabric rotation might change left/top depending on originX/originY
                // For simplicity, sending position along with angle is safer.
                left: target.left,
                top: target.top,
                angle: target.angle,
            };
            throttledUpdateObject(objectId, updateData);
        }
    }, [activeTool, throttledUpdateObject]);
    // --- Event Handler: Object Modified ---
    // This handler will be called AFTER an object on the canvas is modified
    // (e.g., text edited and user clicks out, object moved/scaled/rotated)
    const handleObjectModified = useCallback((options: fabric.ModifiedEvent<TPointerEvent>) => {
        const modifiedObject = options.target;
        if (!modifiedObject) return;

        const objectId = modifiedObject.get('id') as string | undefined;
        // console.log(`Object Modified: Type='${modifiedObject.type}', ID='${objectId}'`);

        // Handle Text Content Modification (Separate Logic?)
        if (modifiedObject.type === 'i-text' && activeTool !== 'select') {
            // ... (Text content update logic needed - potentially calls updateObjectInStorage too) ...
            console.log(` -> Text content update logic needed here.`);
            // If this is the FIRST time text is saved, it might need addObjectToStorage
            // Need logic to differentiate initial save vs. subsequent updates for text.
            return;
        }

        // Handle Transformation via Select Tool
        if (activeTool === 'select' && objectId) {
            console.log(` -> Object Modified (Final State Catch for ID: ${objectId})`);
            const finalProperties: Partial<CanvasObject['data']> = {
                left: modifiedObject.left,
                top: modifiedObject.top,
                scaleX: modifiedObject.scaleX,
                scaleY: modifiedObject.scaleY,
                angle: modifiedObject.angle,
            };
            // Call the non-throttled update *once* at the end
            updateObjectInStorage(objectId, finalProperties);
        }
    }, [activeTool, updateObjectInStorage]);

    // --- Pointer Move Handler (MODIFIED) ---
    const handlePointerMove = useCallback((event: PointerEvent) => {
        event.preventDefault();

        const container = canvasContainerRef.current;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const x = Math.round(Math.max(0, Math.min(event.clientX - rect.left, rect.width)));
        const y = Math.round(Math.max(0, Math.min(event.clientY - rect.top, rect.height)));

        // --- Update Presence via Throttled Function ---
        // Call the memoized throttled function with the cursor payload.
        // The throttle utility will ensure updateMyPresence is called at most once per interval.
        throttledUpdateMyPresence({ cursor: { x, y } });

    }, [throttledUpdateMyPresence]); // Dependency is now the throttled function

    // --- Pointer Leave Handler (Unchanged) ---
    // This should NOT be throttled - we want immediate update on leave.
    const handlePointerLeave = useCallback(() => {
        updateMyPresence({ cursor: null });
    }, [updateMyPresence]);

    // --- Undo/Redo Handler Functions ---


    // --- Undo/Redo State ---
    // Initialize the undo stack as an empty array of UndoableAction
    const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
    // Initialize the redo stack as an empty array of UndoableAction
    const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);

    // Ref to store the state of an object(s) right before a modification starts
    const objectStateBeforeModifyRef = useRef<Record<string, Record<string, any>>>({});
    // Key: objectId, Value: Record<property, value>

    // --- Helper Function to add action to undo stack and clear redo stack ---
    const addActionToUndoStack = useCallback((action: UndoableAction) => {
        setUndoStack((prev) => [...prev, action]);
        setRedoStack([]); // Clear redo stack on new action
        // console.log(\"Action Added to Undo Stack:\", action, \"Redo Stack Cleared\");
    }, []); // Dependencies: setUndoStack, setRedoStack (usually stable)



    /**
       * Handles the Undo action.
       * Calls the Liveblocks room's history API to undo the last action.
       */
    const handleUndo = useCallback(() => {
        // Ensure the room object is available before calling history methods
        if (room) {
            console.log("Attempting to Undo...");
            room.history.undo(); // Call Liveblocks undo method
        } else {
            console.warn("Room object not available, cannot perform undo.");
        }
    }, [room]); // Dependency: the room object

    /**
     * Handles the Redo action.
     * Calls the Liveblocks room's history API to redo the last undone action.
     */
    const handleRedo = useCallback(() => {
        // Ensure the room object is available
        if (room) {
            console.log("Attempting to Redo...");
            room.history.redo(); // Call Liveblocks redo method
        } else {
            console.warn("Room object not available, cannot perform redo.");
        }
    }, [room]); // Dependency: the room object

    // --- Placeholder Handlers for Manual Undo/Redo ---
    const handleManualUndo = useCallback(() => {
        // TODO: Implement logic to pop from undoStack, perform inverse action, push to redoStack
        console.log("Manual Undo Clicked - Stack:", undoStack);
    }, [undoStack]); // Dependencies will evolve

    const handleManualRedo = useCallback(() => {
        // TODO: Implement logic to pop from redoStack, re-perform action, push to undoStack
        console.log("Manual Redo Clicked - Stack:", redoStack);
    }, [redoStack]); // Dependencies will evolve

    // --- Effects to Attach/Detach Listeners ---
    // (Pointer Move Listener Effect - relies on handlePointerMove)
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (container) {
            container.addEventListener('pointermove', handlePointerMove);
            return () => {
                container.removeEventListener('pointermove', handlePointerMove);
            };
        }
    }, [handlePointerMove]); // Correctly depends on the memoized handlePointerMove

    // (Pointer Leave Listener Effect - relies on handlePointerLeave)
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (container) {
            container.addEventListener("pointerleave", handlePointerLeave);
            return () => {
                container.removeEventListener("pointerleave", handlePointerLeave);
            };
        }
    }, [handlePointerLeave]); // Correctly depends on the memoized handlePointerLeave

    // --- Effect to Log Others Data (for verification) ---
    // This effect will run whenever the list of 'others' changes (users join/leave or update presence)
    useEffect(() => {
        // Log the number of other users and their data structure
        // This helps verify that we are receiving presence updates correctly
        console.log(`Others detected: ${others.length}`);
        // You can log the full structure, but it might be verbose if many users
        // others.forEach(user => {
        //     console.log(` -> User ${user.connectionId}: Presence=`, user.presence);
        // });
        // If you logged the cursor in updateMyPresence, you should see it here for other users
        const usersWithCursors = others.filter(user => user.presence?.cursor);
        if (usersWithCursors.length > 0) {
            console.log(`   Users with active cursors: ${usersWithCursors.length}`);
            // usersWithCursors.forEach(user => console.log(`     -> User ${user.connectionId} Cursor:`, user.presence?.cursor));
        }

    }, [others]); // Dependency array includes 'others'




    // Event Handlers (handleMouseDown, handleMouseMove remain the same)
    const handleMouseDown = useCallback((options: FabricEventWithTarget) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(options.e);
        if (!pointer) return;

        const target = options.target;
        const currentTool = activeToolRef.current;

        if (currentTool === 'eraser') {
            if (target) {
                const objectId = target.get('id') as string | undefined;
                if (objectId) {
                    target.set({
                        erasable: true,
                        excludeFromExport: false,
                        strokeUniform: true
                    });
                    canvas.requestRenderAll();
                }
            }
            return;
        }

        if (currentTool === 'rectangle' || currentTool === 'circle') {
            if (isDrawingShape) return;

            shapeOriginRef.current = { x: pointer.x, y: pointer.y };
            setIsDrawingShape(true);

            let shape: fabric.Object;
            if (currentTool === 'rectangle') {
                shape = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 1,
                    height: 1,
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: '#000000',
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    originX: 'left',
                    originY: 'top',
                    strokeUniform: true,
                    visible: true
                });
            } else {
                shape = new fabric.Circle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 1,
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: '#000000',
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    originX: 'center',
                    originY: 'center',
                    strokeUniform: true,
                    visible: true
                });
            }

            drawingShapeRef.current = shape;
            canvas.add(shape);
            canvas.requestRenderAll();
            return;
        }

        if (currentTool === 'text') {
            // Only return if we clicked on an existing text object
            if (target && target.type === 'i-text') return;

            const uniqueId = nanoid();
            const textObject = new fabric.IText('Type here...', {
                left: pointer.x,
                top: pointer.y,
                fontFamily: 'Arial',
                fontSize: 24,
                fill: '#000000',
                originX: 'left',
                originY: 'top',
                id: uniqueId,
                selectable: true,
                evented: true
            });

            canvas.add(textObject);
            canvas.setActiveObject(textObject);
            textObject.enterEditing();
            textObject.selectAll();

            const propertiesToInclude = ['id', 'type', 'text', 'left', 'top', 'fontSize', 'fontFamily', 'fill', 'angle', 'scaleX', 'scaleY', 'originX', 'originY'];
            const textData = textObject.toObject(propertiesToInclude);
            addObjectToStorage('text', textData);

            addActionToUndoStack({ type: 'ADD', payload: { objectId: uniqueId } });
            return;
        }
    }, [isDrawingShape, addObjectToStorage, addActionToUndoStack]);

    const handleMouseMove = useCallback((options: fabric.TEvent) => {
        if (!isDrawingShape || !shapeOriginRef.current || !drawingShapeRef.current) return;

        const canvas = fabricRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(options.e);
        if (!pointer) return;

        const { x: startX, y: startY } = shapeOriginRef.current;
        const { x: currentX, y: currentY } = pointer;
        const shape = drawingShapeRef.current;
        const currentTool = activeToolRef.current;

        if (currentTool === 'rectangle' && shape.type === 'rect') {
            shape.set({
                left: Math.min(startX, currentX),
                top: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY)
            });
        } else if (currentTool === 'circle' && shape.type === 'circle') {
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)) / 2;
            shape.set({
                left: startX + (currentX - startX) / 2,
                top: startY + (currentY - startY) / 2,
                radius: radius
            });
        }

        canvas.requestRenderAll();
    }, [isDrawingShape]);

    const handleMouseUp = useCallback((options: fabric.TEvent) => {
        const canvas = fabricRef.current;
        if (!canvas || !drawingShapeRef.current || !shapeOriginRef.current) {
            setIsDrawingShape(false);
            drawingShapeRef.current = null;
            shapeOriginRef.current = null;
            return;
        }

        const pointer = canvas.getPointer(options.e);
        const { x: startX, y: startY } = shapeOriginRef.current;
        const { x: currentX, y: currentY } = pointer;

        canvas.remove(drawingShapeRef.current);

        let finalShape: fabric.Object;
        const uniqueId = nanoid();
        const currentTool = activeToolRef.current;

        if (currentTool === 'rectangle') {
            finalShape = new fabric.Rect({
                left: Math.min(startX, currentX),
                top: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY),
                fill: 'rgba(0, 0, 0, 0)',
                stroke: 'black',
                strokeWidth: 2,
                originX: 'left',
                originY: 'top',
                selectable: false,
                evented: false,
                strokeUniform: true,
                visible: true,
                id: uniqueId
            });
        } else if (currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)) / 2;
            finalShape = new fabric.Circle({
                left: startX + (currentX - startX) / 2,
                top: startY + (currentY - startY) / 2,
                radius: radius,
                fill: 'rgba(0, 0, 0, 0)',
                stroke: 'black',
                strokeWidth: 2,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                strokeUniform: true,
                visible: true,
                id: uniqueId
            });
        }

        if (finalShape) {
            canvas.add(finalShape);
            canvas.requestRenderAll();

            const propertiesToInclude = ['id', 'type', 'left', 'top', 'width', 'height', 'radius', 'fill', 'stroke', 'strokeWidth', 'originX', 'originY', 'strokeUniform', 'angle', 'scaleX', 'scaleY'];
            const shapeData = finalShape.toObject(propertiesToInclude);
            addObjectToStorage(currentTool, shapeData);
            addActionToUndoStack({ type: 'ADD', payload: { objectId: uniqueId } });
        }

        setIsDrawingShape(false);
        drawingShapeRef.current = null;
        shapeOriginRef.current = null;
    }, [addObjectToStorage, addActionToUndoStack]);


    const handleInteractionStart = useCallback((target: fabric.Object) => {
        const objectId = target.get('id') as string | undefined;
        if (!objectId) return;

        // Store the *current* state of relevant properties BEFORE modification begins
        // Adjust properties based on what can be modified (position, size, angle, text content)
        const propsToCapture = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'width', 'height', 'text'];
        const stateBefore: Record<string, any> = {};
        propsToCapture.forEach(prop => {
            // Check if property exists on target before accessing
            if (target[prop as keyof fabric.Object] !== undefined) {
                stateBefore[prop] = target[prop as keyof fabric.Object];
            } else if (prop === 'text' && (target.type === 'i-text' || target.type === 'text')) {
                // Special handling for text property on IText/Text objects
                stateBefore[prop] = (target as fabric.IText).text;
            }
        });

        // Use objectId as key in the ref
        objectStateBeforeModifyRef.current[objectId] = stateBefore;
        console.log(`Captured state before modify for ID ${objectId}:`, stateBefore);

    }, []); // No dependencies needed for this capture logic typically


    // --- Effect for Fabric initialization and listeners (MODIFIED) ---
    useEffect(() => {
        const canvasElement = canvasRef.current;
        const containerElement = canvasContainerRef.current;

        if (canvasElement && containerElement && !fabricRef.current) {
            const canvas = new fabric.Canvas(canvasElement, {
                selection: false,
                preserveObjectStacking: true,
                isDrawingMode: true, // Enable drawing mode by default
            });

            // Set canvas size
            canvas.width = containerElement.offsetWidth;
            canvas.height = containerElement.offsetHeight;
            canvas.backgroundColor = '#FFFFFF';

            // Initialize the drawing brush
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = DEFAULT_PEN_COLOR;
            canvas.freeDrawingBrush.width = DEFAULT_PEN_WIDTH;
            canvas.freeDrawingBrush.strokeUniform = DEFAULT_PEN_STROKE_UNIFORM;

            fabricRef.current = canvas;
            console.log(`Fabric.js canvas initialized with drawing mode: ${canvas.isDrawingMode}`);

            // Remove any existing listeners
            canvas.off('path:created');

            // Add the path creation handler
            canvas.on('path:created', handlePathCreated);
            
            // Add other event listeners
            canvas.on('mouse:down', handleMouseDown);
            canvas.on('mouse:move', handleMouseMove);
            canvas.on('mouse:up', handleMouseUp);
            canvas.on('object:modified', handleObjectModified);
            canvas.on('object:moving', handleObjectMoving);
            canvas.on('object:scaling', handleObjectScaling);
            canvas.on('object:rotating', handleObjectRotating);

            // Add resize handler
            const throttledResize = throttle(handleResize, 100);
            window.addEventListener('resize', throttledResize);

            // Add keyboard event listener for delete action
            window.addEventListener('keydown', handleDeleteKeyDown);
            console.log("Added keydown listener for delete action.");

            // Initial render
            canvas.requestRenderAll();

            return () => {
                // Cleanup
                window.removeEventListener('resize', throttledResize);
                window.removeEventListener('keydown', handleDeleteKeyDown);
                canvas.off('path:created');
                canvas.off('mouse:down');
                canvas.off('mouse:move');
                canvas.off('mouse:up');
                canvas.off('object:modified');
                canvas.off('object:moving');
                canvas.off('object:scaling');
                canvas.off('object:rotating');
                canvas.dispose();
                fabricRef.current = null;
            };
        }
    }, []); // Empty dependency array since this should only run once

    // Update ref when activeTool changes
    useEffect(() => {
        activeToolRef.current = activeTool;
        console.log("Active tool updated:", activeTool);
    }, [activeTool]);

    // Single consolidated effect for tool changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        console.log("Configuring canvas for tool:", activeTool);

        // Reset canvas state
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.forEachObject(obj => {
            obj.set({ 
                evented: false, 
                selectable: false,
                erasable: false 
            });
        });

        // Configure canvas based on active tool
        switch (activeTool) {
            case 'pen':
                console.log("Setting pen tool");
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = DEFAULT_PEN_COLOR;
                canvas.freeDrawingBrush.width = DEFAULT_PEN_WIDTH;
                canvas.freeDrawingBrush.strokeUniform = DEFAULT_PEN_STROKE_UNIFORM;
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;

            case 'eraser':
                console.log("Setting eraser tool");
                canvas.isDrawingMode = true;
                const eraserBrush = new fabric.PencilBrush(canvas);
                eraserBrush.width = DEFAULT_ERASER_WIDTH;
                eraserBrush.color = 'rgba(0,0,0,0)';
                eraserBrush.globalCompositeOperation = 'destination-out';
                canvas.freeDrawingBrush = eraserBrush;
                canvas.defaultCursor = 'cell';
                canvas.hoverCursor = 'cell';
                canvas.forEachObject(obj => {
                    obj.set({
                        erasable: true,
                        excludeFromExport: false,
                        strokeUniform: true
                    });
                });
                break;

            case 'select':
                console.log("Setting select tool");
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.forEachObject(obj => {
                    obj.set({ 
                        evented: true, 
                        selectable: true
                    });
                });
                break;

            case 'rectangle':
            case 'circle':
                console.log(`Setting ${activeTool} tool`);
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;

            case 'text':
                console.log("Setting text tool");
                canvas.defaultCursor = 'text';
                canvas.hoverCursor = 'text';
                canvas.forEachObject(obj => {
                    if (obj.type === 'i-text') {
                        obj.set({ 
                            evented: true, 
                            selectable: true
                        });
                    }
                });
                break;

            default:
                console.log("Setting default tool");
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'default';
        }

        canvas.requestRenderAll();
    }, [activeTool]);

    // Modify the path creation handler
    const handlePathCreated = useCallback((options: fabric.TEvent & { path: fabric.Path }) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const path = options.path;
        if (!path) return;

        const isEraserPath = activeToolRef.current === 'eraser';
        const objectType = isEraserPath ? 'eraserPath' : 'path';

        const uniqueId = nanoid();
        path.set({
            id: uniqueId,
            stroke: isEraserPath ? 'rgba(255, 252, 252, 0)' : DEFAULT_PEN_COLOR,
            strokeWidth: isEraserPath ? DEFAULT_ERASER_WIDTH : DEFAULT_PEN_WIDTH,
            strokeUniform: true,
            fill: '',
            selectable: false,
            evented: false,
            globalCompositeOperation: isEraserPath ? 'destination-out' : 'source-over',
            erasable: !isEraserPath,
            excludeFromExport: false
        });

        // Ensure the path is added to the canvas
        canvas.add(path);
        canvas.requestRenderAll();

        // Serialize and store
        const propertiesToInclude = [
            'id', 'type', 'path', 'stroke', 'strokeWidth', 'strokeUniform',
            'left', 'top', 'angle', 'scaleX', 'scaleY', 'originX', 'originY',
            'globalCompositeOperation', 'erasable', 'excludeFromExport'
        ];
        const pathData = path.toObject(propertiesToInclude);
        addObjectToStorage(objectType, pathData);

        // Add to undo stack if not an eraser path
        if (!isEraserPath) {
            const undoAction: UndoableAction = {
                type: 'ADD',
                payload: { objectId: uniqueId }
            };
            addActionToUndoStack(undoAction);
        }
    }, [addObjectToStorage, addActionToUndoStack]);

    // --- Helper Function to Trigger Download from Data URL ---
    const triggerDownload = useCallback((dataUrl: string, filename: string) => {
        try {
            // Create a temporary anchor element
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            
            // Append to document, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`[Download] Triggered download for: ${filename}`);
        } catch (error) {
            console.error("[Download] Error triggering download:", error);
        }
    }, []); // No dependencies needed

    // --- Export Handlers ---
    const handleExportPng = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            console.error("[Export PNG] Canvas not initialized");
            return;
        }

        try {
            // Generate high-quality PNG data URL
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 2, // Higher resolution export
                enableRetinaScaling: true,
                withoutTransform: false, // Include transformations
                withoutShadow: false, // Include shadows
                withoutBackground: false // Include background
            });

            if (!dataURL) {
                console.error("[Export PNG] Failed to generate data URL");
                return;
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `whiteboard-${timestamp}.png`;
            
            // Trigger download
            triggerDownload(dataURL, filename);
            console.log("[Export PNG] Export successful");
        } catch (error) {
            console.error("[Export PNG] Error during export:", error);
        }
    }, [triggerDownload]);

    const handleExportSvg = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) {
            console.error("[Export SVG] Canvas not initialized");
            return;
        }

        let objectUrl: string | null = null;

        try {
            // Generate SVG data with proper configuration
            const svgData = canvas.toSVG({
                suppressPreamble: false, // Include XML declaration
                viewBox: {
                    x: 0,
                    y: 0,
                    width: canvas.width,
                    height: canvas.height
                },
                encoding: 'UTF-8',
                width: canvas.width,
                height: canvas.height,
                preserveAspectRatio: 'xMidYMid meet',
                enableRetinaScaling: true,
                includeDefaultValues: true,
                includeCustomProperties: true
            });

            if (!svgData) {
                console.error("[Export SVG] Failed to generate SVG data");
                return;
            }

            // Create a Blob from the SVG data with proper MIME type
            const blob = new Blob([svgData], { 
                type: 'image/svg+xml;charset=utf-8'
            });
            
            // Create an Object URL from the Blob
            objectUrl = URL.createObjectURL(blob);

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `whiteboard-${timestamp}.svg`;
            
            // Trigger download
            triggerDownload(objectUrl, filename);

            console.log("[Export SVG] Export successful");
        } catch (error) {
            console.error("[Export SVG] Error during export:", error);
        } finally {
            // Clean up the Object URL
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                console.log("[Export SVG] Object URL revoked");
            }
        }
    }, [triggerDownload]);

    // --- Conditional Rendering Based on Connection State (remains the same) ---
    // if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    //     return (<div className="w-full h-full flex items-center justify-center bg-neutral-100"><p className="text-muted-foreground animate-pulse">Connecting to whiteboard...</p></div>);
    // }
    // if (connectionState === 'failed' || connectionState === 'disconnected') {
    //     const message = connectionState === 'failed' ? "Failed to connect..." : "Connection lost...";
    //     return (<div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-red-600"><p className="font-semibold">Connection Error</p><p className="text-sm text-center mt-2">{message}</p></div>);
    // }

    // if (connectionState === 'connected') {
    //     const brushInfo = fabricRef.current?.freeDrawingBrush; const selectionStatus = fabricRef.current?.selection ? 'ON' : 'OFF';
    //     const objectCount = canvasObjects?.length ?? 0;
    //     // TODO: Eventually, pass setActiveTool to a Toolbar component rendered here or by the parent
    //     return (
    //         <main ref={canvasContainerRef} className="relative w-full h-full bg-neutral-100 touch-none">
    //             <canvas ref={canvasRef} id="canvas" className="w-full h-full" />
    //             <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded shadow text-xs z-10">
    //                 Tool: {activeTool} | Drawing: {fabricRef.current?.isDrawingMode ? 'ON' : 'OFF'} | Selection: {selectionStatus} | Objects: {objectCount}
    //             </div>
    //             {/* Toolbar would call setActiveTool('select') */}
    //             {/* TODO: Add rendering logic for other users' cursors here */}
    //              {/* Example placeholder where cursors might be rendered: */}
    //              {/* <Cursors presence={others} /> */}
    //         </main>
    //     );
    // }
    if (connectionState !== 'connected') { /* ... loading ... */ }

    return (
        <main
            ref={canvasContainerRef}
            className="relative w-full h-full bg-neutral-100 touch-none overflow-hidden"
        >
            <canvas ref={canvasRef} id="canvas" />
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Toolbar
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onExportPng={handleExportPng}
                    onExportSvg={handleExportSvg}
                />
            </div>


            {/* --- Render Cursors for Other Users (MODIFIED) --- */}
            {others.map(({ connectionId, presence, info }) => { // Destructure info
                // Only render if cursor data exists
                if (presence?.cursor) {
                    // Get name from user info (fallback to "Collaborator")
                    const userName = info?.name || "Collaborator";

                    return (
                        <Cursor
                            key={connectionId}
                            connectionId={connectionId}
                            x={presence.cursor.x}
                            y={presence.cursor.y}
                            name={userName} // Pass the name prop
                        // Pass color later if needed (e.g., from info or presence)
                        />
                    );
                }
                return null;
            })}

            {/* Other UI elements */}
        </main>
    );
    // ... Fallback ...
    // return (<div className="w-full h-full flex items-center justify-center bg-neutral-100"><p className="text-muted-foreground">Loading Whiteboard...</p></div>);
};