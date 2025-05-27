'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusCircle, Loader2 } from 'lucide-react';
import { createBoard } from '@/actions/boardActions';
import { Button } from '@/components/ui/button';

/**
 * A client component button that calls the createBoard Server Action
 * and redirects the user to the new board upon success.
 */
export const CreateBoardButton = () => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleCreateBoard = () => {
        startTransition(async () => {
            try {
                const result = await createBoard();

                if (result.success && result.board?.roomId) {
                    toast.success('New board created!');
                    
                    // Set redirecting state
                    setIsRedirecting(true);
                    
                    try {
                        // Attempt to navigate to the new board
                        console.log(`Redirecting to /board/${result.board.roomId}`);
                        router.push(`/board/${result.board.roomId}`);
                    } catch (navigationError) {
                        console.error('Navigation failed:', navigationError);
                        toast.error('Failed to navigate to the new board. Please try clicking the link below.');
                        
                        // Provide a fallback link
                        const boardUrl = `/board/${result.board.roomId}`;
                        toast.info(
                            <div>
                                <p>Click here to open your new board:</p>
                                <a 
                                    href={boardUrl}
                                    className="text-blue-500 hover:text-blue-700 underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.push(boardUrl);
                                    }}
                                >
                                    Open New Board
                                </a>
                            </div>
                        );
                    } finally {
                        setIsRedirecting(false);
                    }
                } else {
                    toast.error(result.error || 'Failed to create board.');
                    console.error("Create board failed:", result.error);
                }
            } catch (error) {
                console.error("Error calling createBoard Server Action:", error);
                toast.error('An unexpected error occurred. Please try again.');
                setIsRedirecting(false);
            }
        });
    };

    return (
        <Button
            onClick={handleCreateBoard}
            disabled={isPending || isRedirecting}
            size="lg"
            className="relative"
        >
            {(isPending || isRedirecting) ? (
                <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {isRedirecting ? 'Redirecting...' : 'Creating...'}
                </>
            ) : (
                <>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create New Whiteboard
                </>
            )}
        </Button>
    );
}; 