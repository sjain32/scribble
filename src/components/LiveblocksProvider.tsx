// File: components/LiveblocksProvider.tsx

// Indicate that this component needs to run on the client
"use client";

import { ReactNode } from "react";
// Import the LiveblocksProvider and RoomProvider components from Liveblocks
import { LiveblocksProvider as LiveblocksProviderBase, RoomProvider, ClientSideSuspense } from "@liveblocks/react";

// Define the properties (props) that this component will accept
interface LiveblocksProviderProps {
  children: ReactNode; // Represents the child components that this provider will wrap
  roomId: string;      // The unique identifier for the Liveblocks room to connect to
}

/**
 * This component wraps the Liveblocks RoomProvider, configures authentication,
 * and provides the Liveblocks context to its children.
 * It also includes ClientSideSuspense for a better loading state experience.
 */
export function LiveblocksProvider({ children, roomId }: LiveblocksProviderProps) {

  // --- Retrieve the Public API Key ---
  // Access the environment variable prefixed with NEXT_PUBLIC_.
  // This key is embedded by Next.js during the build process and is safe
  // to use on the client-side.
  const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

  // --- Crucial Check: Ensure the Public API Key is available ---
  // If the key is not set, the application cannot connect to Liveblocks.
  if (!publicApiKey) {
    // Log a clear error message to the console for debugging.
    console.error("🔴 ERROR: NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is not set in .env.local");
    // You might want to throw an error or render a fallback UI here
    // For simplicity, we'll throw an error to make the issue obvious during development.
    throw new Error("NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is not configured");
  }

  return (
    <LiveblocksProviderBase
      publicApiKey={publicApiKey}
    >
      <RoomProvider id={roomId} initialPresence={{}}>
        <ClientSideSuspense fallback={<div>Loading whiteboard...</div>}>
          {() => children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProviderBase>
  );
}

// Optional: Add a default export if preferred
// export default LiveblocksProvider;