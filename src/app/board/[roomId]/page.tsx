// File: app/board/[roomId]/page.tsx

import React from 'react'; // Standard import for React components
import { LiveblocksProvider } from "@/components/LiveblocksProvider";
import { Room } from "@/components/Room";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';
import prismadb from '@/lib/prisma';

// Define the TypeScript interface for the props that Next.js will pass to this page component.
interface BoardPageProps {
  params: {
    // The key here (`roomId`) must match the name of the dynamic segment folder (`[roomId]`).
    roomId: string;
  };
}

/**
 * BoardPage Component
 *
 * This component renders a specific collaborative whiteboard based on the URL.
 * It runs as a React Server Component by default.
 * It extracts the roomId from the URL and uses it to initialize the Liveblocks connection
 * via the LiveblocksProvider, which in turn renders the client-side Room component.
 */
const BoardPage = async ({ params }: BoardPageProps) => {
  const { roomId } = params;

  // Check authentication status
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    console.log(`[Server Component] User not authenticated. Redirecting to signin for roomId: ${roomId}`);
    redirect(`/api/auth/signin?callbackUrl=/board/${encodeURIComponent(roomId)}`);
  }

  console.log(`[Server Component] User authenticated: ${session.user.email}. Accessing board for roomId: ${roomId}`);

  // Fetch initial board data
  let initialBoardData: object | null = null;
  let fetchError: string | null = null;

  try {
    const whiteboardRecord = await prismadb.whiteboard.findUnique({
      where: { roomId: roomId },
      select: { boardData: true },
    });

    if (whiteboardRecord?.boardData) {
      initialBoardData = whiteboardRecord.boardData as object;
      console.log(`[Server Component] Found saved state for roomId: ${roomId}`);
    } else {
      console.log(`[Server Component] No saved state found for roomId: ${roomId}. Will start fresh.`);
      initialBoardData = null;
    }
  } catch (err) {
    console.error(`[Server Component] Error: Failed to fetch board state for roomId: ${roomId}`, err);
    fetchError = "Failed to load board data. Please try refreshing the page.";
  }

  if (fetchError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Board</h2>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
      </div>
    );
  }

  // --- Render the Liveblocks Provider and Room ---
  // Pass the extracted `roomId` to the LiveblocksProvider.
  // The LiveblocksProvider (a Client Component wrapper) will then handle
  // the connection and authentication for this specific room.
  // The actual whiteboard UI (`Room` component) is rendered *inside* the provider,
  // ensuring it only renders after the connection is ready (due to ClientSideSuspense
  // inside LiveblocksProvider) and has access to the Liveblocks context.
  return (
    <LiveblocksProvider roomId={roomId}>
      {/* The Room component contains the client-side logic and UI for the whiteboard */}
      <Room initialData={initialBoardData} />
    </LiveblocksProvider>
  );
};

// Export the component as the default export for this page route.
export default BoardPage;