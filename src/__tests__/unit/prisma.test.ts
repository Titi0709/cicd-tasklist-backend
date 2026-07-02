import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        $connect: vi.fn(),
        $disconnect: vi.fn(),
    })),
}));

describe("prisma client", () => {
    it("should instantiate PrismaClient", async () => {
        const prismaModule = await import("../../lib/prisma.js");
        expect(prismaModule.default).toBeDefined();
    });
});
