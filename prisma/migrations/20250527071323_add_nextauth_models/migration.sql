-- CreateTable
CREATE TABLE "Whiteboard" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "boardData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Whiteboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Whiteboard_roomId_key" ON "Whiteboard"("roomId");
