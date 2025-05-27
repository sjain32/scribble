/*
  Warnings:

  - Added the required column `userId` to the `Whiteboard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Whiteboard" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Whiteboard_userId_idx" ON "Whiteboard"("userId");

-- AddForeignKey
ALTER TABLE "Whiteboard" ADD CONSTRAINT "Whiteboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
