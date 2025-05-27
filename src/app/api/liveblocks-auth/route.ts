import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function GET() {
  console.log("[Liveblocks Auth] Received GET request");
  const session = await getServerSession(authOptions) as Session | null;
  
  console.log("[Liveblocks Auth] Session data:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    userName: session?.user?.name,
    userEmail: session?.user?.email
  });

  if (!session?.user?.id) {
    console.log("[Liveblocks Auth] User not authenticated. Session:", session);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const userInfo = {
    name: session.user.name ?? "Anonymous",
    picture: session.user.image ?? undefined,
  };

  try {
    console.log("[Liveblocks Auth] Preparing Liveblocks session for user:", userId);
    const session = liveblocks.prepareSession(userId, { userInfo });
    const { status, body } = await session.authorize();

    if (status !== 200) {
      console.error(`[Liveblocks Auth] Authorization failed:`, status, body);
      return new NextResponse(body, { status });
    }

    console.log(`[Liveblocks Auth] User ${userId} authorized successfully.`);
    return new NextResponse(body, { status });

  } catch (error) {
    console.error("[Liveblocks Auth] Error during Liveblocks authorization:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("[Liveblocks Auth] Received request");

  const session = await getServerSession(authOptions) as Session | null;

  if (!session?.user?.id) {
    console.log("[Liveblocks Auth] User not authenticated. Session:", session);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const userInfo = {
    name: session.user.name ?? "Anonymous",
    picture: session.user.image ?? undefined,
  };

  let roomId: string | null = null;
  try {
    const { room } = await request.json();
    if (typeof room === 'string') {
      roomId = room;
    } else {
      throw new Error("Invalid 'room' format in request body");
    }
    console.log(`[Liveblocks Auth] Requesting access for Room ID: ${roomId}`);
  } catch (error) {
    console.error("[Liveblocks Auth] Error parsing request body:", error);
    return new NextResponse("Invalid request body", { status: 400 });
  }

  if (!roomId) {
    return new NextResponse("Missing 'room' in request body", { status: 400 });
  }

  try {
    const session = liveblocks.prepareSession(userId, { userInfo });
    session.allow(roomId, session.FULL_ACCESS);
    const { status, body } = await session.authorize();

    if (status !== 200) {
      console.error(`[Liveblocks Auth] Authorization failed:`, status, body);
      return new NextResponse(body, { status });
    }

    console.log(`[Liveblocks Auth] User ${userId} authorized for room ${roomId}.`);
    return new NextResponse(body, { status });

  } catch (error) {
    console.error("[Liveblocks Auth] Error during Liveblocks authorization:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 