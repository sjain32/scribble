import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prismadb from '@/lib/prisma';
import { CreateBoardButton } from '@/components/CreateBoardButton';
import { BoardListItem } from '@/components/BoardListItem';
import type { Session } from 'next-auth';

interface Board {
    id: string;
    roomId: string;
    name: string;
    updatedAt: Date;
}

/**
 * Server Component for the user dashboard page.
 * Fetches and displays the user's whiteboards.
 * Requires the user to be authenticated.
 */
export default async function DashboardPage() {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user) {
        redirect('/signin');
    }

    const boards = await prismadb.whiteboard.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            updatedAt: 'desc'
        },
        select: {
            id: true,
            roomId: true,
            name: true,
            updatedAt: true
        }
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Whiteboards</h1>
                <CreateBoardButton />
            </div>

            {boards.length === 0 ? (
                <div className="text-center py-12">
                    <h2 className="text-xl text-gray-600">No whiteboards yet</h2>
                    <p className="text-gray-500 mt-2">Create your first whiteboard to get started!</p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {boards.map((board: Board) => (
                        <BoardListItem
                            key={board.id}
                            id={board.id}
                            roomId={board.roomId}
                            name={board.name}
                            updatedAt={board.updatedAt}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
} 