// File: actions/boardActions.ts

// Directive to mark this module's exports as Server Actions.
// These functions can then be imported into Client and Server Components.
'use server';

import { revalidatePath } from 'next/cache'; // Optional: To trigger re-fetching data on the client
import prismadb from '@/lib/prisma'; // Import the singleton Prisma Client instance
import { Prisma } from '@prisma/client'; // Import Prisma types if needed for input validation

/**
 * Server Action to save or update the state of a whiteboard.
 * Uses Prisma's upsert operation to create or update the board record based on roomId.
 *
 * @param roomId - The unique identifier for the whiteboard room.
 * @param boardData - The serialized state of the whiteboard (e.g., Fabric.js canvas JSON). Should be a JSON-serializable value.
 * @returns An object indicating success or failure, potentially with the saved data or an error message.
 */
export async function saveBoardState(roomId: string, boardData: any): Promise<{ success: boolean; error?: string; whiteboard?: any }> {

    // Basic validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
        return { success: false, error: 'Invalid Room ID provided.' };
    }
    // Note: More robust validation for boardData might be needed depending on requirements.
    // Ensure boardData is actually JSON-serializable before sending to Prisma.

    try {
        console.log(`Server Action: Attempting to save state for roomId: ${roomId}`);

        // Use Prisma's 'upsert' operation:
        // - If a Whiteboard record with the given 'roomId' exists, it updates it.
        // - If it doesn't exist, it creates a new one.
        const savedWhiteboard = await prismadb.whiteboard.upsert({
            // Specify the unique identifier to find the record.
            where: {
                roomId: roomId,
            },
            // Data to update if the record exists.
            // We only update the boardData field and let Prisma handle 'updatedAt'.
            update: {
                boardData: boardData as Prisma.JsonValue, // Cast 'any' to Prisma.JsonValue for type safety
            },
            // Data to create if the record does not exist.
            // We set both roomId and the initial boardData.
            create: {
                roomId: roomId,
                boardData: boardData as Prisma.JsonValue, // Cast 'any' to Prisma.JsonValue
                // 'id', 'createdAt', 'updatedAt' are handled by Prisma defaults/directives.
            },
        });

        console.log(`Server Action: Successfully saved state for roomId: ${roomId}`);

        // Optional: Revalidate the board page path if you need immediate data refresh
        // for Server Components reading this data directly after the mutation.
        // This clears the cache for the specified path pattern.
        // revalidatePath(`/board/${roomId}`);

        // Return a success response, optionally including the saved data.
        return { success: true, whiteboard: savedWhiteboard };

    } catch (error) {
        // Log the error for server-side debugging.
        console.error(`Server Action Error: Failed to save board state for roomId: ${roomId}`, error);

        // Return a generic error message to the client for security.
        // Avoid leaking specific database error details.
        return { success: false, error: 'Failed to save whiteboard state.' };
    }
}

// You can add other board-related Server Actions in this file later (e.g., loadBoardState).