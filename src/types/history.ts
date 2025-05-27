// File: components/Whiteboard.tsx (or potentially types/history.ts)

// Represents a snapshot of a canvas object's state (type and data)
// Used when capturing the state before deletion or modification
type CanvasObjectSnapshot = {
    type: string; // e.g., 'rect', 'path', 'text', 'eraserPath'
    // Plain JavaScript object containing the serialized Fabric properties
    // including 'id', position, dimensions, content, styling, etc.
    data: Record<string, any>;
};

// Define the structure for each undoable action record
// Using a discriminated union based on the 'type' property
export type UndoableAction =
    // Action representing the addition of an object
    | {
          type: 'ADD';
          payload: {
              // To undo an ADD, we need to DELETE the object by its ID
              objectId: string;
          };
      }
    // Action representing the deletion of an object
    | {
          type: 'DELETE';
          payload: {
              // To undo a DELETE, we need to ADD the object back using its previous state
              previousObjectState: CanvasObjectSnapshot;
          };
      }
    // Action representing the modification of an object's properties
    | {
          type: 'MODIFY';
          payload: {
              // To undo a MODIFY, we need the object's ID and the state *before* modification
              objectId: string;
              stateBefore: Record<string, any>; // Properties that changed, before the change
          };
      };
 // Add other action types here if needed later (e.g., 'LAYER_ORDER')