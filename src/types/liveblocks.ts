import { LiveObject, User } from "@liveblocks/client";

// types/liveblocks.ts (ensure it covers text)
export type CanvasObject = LiveObject<{
  type: 'path' | 'rect' | 'circle' | 'text' | 'string'; // Include 'text'
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

export interface Presence {
  cursor: {
    x: number;
    y: number;
  } | null;
  [key: string]: unknown;
}

export interface UserInfo {
  name?: string | null;
  picture?: string | null;
}

export type LiveblocksUser = User<Presence, UserInfo>;