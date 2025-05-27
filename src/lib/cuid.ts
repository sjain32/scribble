import { createId as createCuid } from '@paralleldrive/cuid2';

export class Cuid {
    private static readonly MAX_RETRIES = 3;

    /**
     * Generates a unique ID using cuid2.
     * Includes a retry mechanism in case of collisions.
     * 
     * @returns A unique string ID
     * @throws Error if unable to generate a unique ID after retries
     */
    static createId(): string {
        let attempts = 0;
        let id: string;

        while (attempts < this.MAX_RETRIES) {
            try {
                id = createCuid();
                return id;
            } catch {
                attempts++;
                if (attempts === this.MAX_RETRIES) {
                    throw new Error(`Failed to generate unique ID after ${this.MAX_RETRIES} attempts`);
                }
                // Add a small delay before retrying
                new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        throw new Error('Failed to generate unique ID');
    }
} 