'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { renameBoard, deleteBoard } from '@/actions/boardActions';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BoardListItemProps {
    id: string;
    roomId: string;
    name: string;
    updatedAt: Date;
}

export const BoardListItem = ({ id, roomId, name, updatedAt }: BoardListItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(name);
    const [isRenamePending, startRenameTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Select text for easy replacement
        }
    }, [isEditing]);

    const enableEditing = () => {
        setIsEditing(true);
        setEditedName(name); // Reset editedName to original name when starting edit
    };

    const disableEditing = () => {
        setIsEditing(false);
        setEditedName(name); // Reset on cancel
    };

    const handleRenameSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault(); // Prevent default form submission if used in a form
        const trimmedName = editedName.trim();

        if (!trimmedName || trimmedName === name) {
            disableEditing(); // Cancel if name is empty or unchanged
            return;
        }
        if (trimmedName.length > 60) {
            toast.error("Board name cannot exceed 60 characters.");
            return;
        }

        startRenameTransition(async () => {
            toast.loading(`Renaming to "${trimmedName}"...`);
            try {
                const result = await renameBoard(id, trimmedName);
                if (result.success) {
                    toast.success(`Board renamed to "${trimmedName}"`);
                    setIsEditing(false);
                    // Name update will appear due to revalidatePath in action
                } else {
                    toast.error(result.error || 'Failed to rename board.');
                }
            } catch (error) {
                toast.error('An unexpected error occurred during renaming.');
                console.error("Rename error:", error);
            }
        });
    };

    // Handler for pressing Enter key in input
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleRenameSubmit();
        } else if (event.key === 'Escape') {
            disableEditing();
        }
    };

    const handleDeleteBoard = () => {
        startDeleteTransition(async () => {
            toast.loading(`Deleting board "${name}"...`);
            try {
                const result = await deleteBoard(id);
                if (result.success) {
                    toast.success(`Board "${name}" deleted.`);
                } else {
                    toast.error(result.error || 'Failed to delete board.');
                    console.error("Delete board failed:", result.error);
                }
            } catch (error) {
                toast.error('An unexpected error occurred during deletion.');
                console.error("Delete error:", error);
            }
        });
    };

    return (
        <li className="border border-gray-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-3 sm:gap-y-0 hover:bg-gray-50 transition-colors">
            {/* Board Info / Edit Input */}
            <div className="flex-grow flex items-center gap-x-2">
                {isEditing ? (
                    // Using form for better accessibility and potential Enter key submission
                    <form onSubmit={handleRenameSubmit} className="flex items-center gap-x-2 w-full sm:w-auto">
                        <Input
                            ref={inputRef}
                            value={editedName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isRenamePending}
                            className="h-8 flex-grow"
                            maxLength={60}
                        />
                        <Button type="submit" size="icon" variant="ghost" disabled={isRenamePending} aria-label="Save name">
                            {isRenamePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={disableEditing} disabled={isRenamePending} aria-label="Cancel edit">
                            <X className="h-4 w-4 text-red-600" />
                        </Button>
                    </form>
                ) : (
                    // Display Mode
                    <div className='w-full sm:w-auto'>
                        <span className="font-medium text-gray-800 break-all">{name}</span>
                        <p className="text-sm text-muted-foreground mt-1">
                            Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
                        </p>
                    </div>
                )}
            </div>

            {/* Action Buttons (only when not editing) */}
            {!isEditing && (
                <div className="flex items-center gap-x-2 shrink-0 ml-auto sm:ml-4">
                    <Button onClick={enableEditing} size="icon" variant="ghost" aria-label="Edit board name" disabled={isDeletePending}>
                        <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Delete board"
                                disabled={isDeletePending || isRenamePending}
                            >
                                {isDeletePending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    board <span className='font-semibold'>"{name}"</span> and all its contents.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteBoard}
                                    disabled={isDeletePending}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {isDeletePending ? "Deleting..." : "Yes, delete board"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Link href={`/board/${roomId}`} passHref>
                        <Button variant="outline" size="sm" disabled={isDeletePending}>Open Board</Button>
                    </Link>
                </div>
            )}
        </li>
    );
}; 