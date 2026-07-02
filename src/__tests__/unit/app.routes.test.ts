import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import request from "supertest";

const mockGetAllTasks = vi.fn();
const mockGetTaskById = vi.fn();
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock("../../controllers/task.controller.js", () => ({
    getAllTasks: mockGetAllTasks,
    getTaskById: mockGetTaskById,
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
}));

const { default: app } = await import("../../app.js");

describe("App routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("mounts GET /api/tasks to the task controller", async () => {
        mockGetAllTasks.mockImplementation((_req: Request, res: Response) => {
            res.status(200).json([]);
        });

        const response = await request(app).get("/api/tasks");

        expect(response.status).toBe(200);
        expect(mockGetAllTasks).toHaveBeenCalledTimes(1);
    });

    it("mounts POST /api/tasks to the task controller", async () => {
        mockCreateTask.mockImplementation((_req: Request, res: Response) => {
            res.status(201).json({ id: 1, title: "created" });
        });

        const response = await request(app).post("/api/tasks").send({ title: "created" });

        expect(response.status).toBe(201);
        expect(mockCreateTask).toHaveBeenCalledTimes(1);
    });
});
