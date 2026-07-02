import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

async function createTaskRecord(title: string, description?: string) {
	return testPrisma.task.create({
		data: {
			title,
			description,
		},
	});
}

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("GET /api/tasks", () => {
		it("should return an empty list when no tasks exist", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all existing tasks", async () => {
			await createTaskRecord("First task", "First description");
			await createTaskRecord("Second task");

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body.some((task: { title: string }) => task.title === "First task")).toBe(true);
			expect(res.body.some((task: { title: string }) => task.title === "Second task")).toBe(true);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a task by id", async () => {
			const task = await createTaskRecord("Task by id", "desc");

			const res = await request(app).get(`/api/tasks/${task.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(task.id);
			expect(res.body.title).toBe("Task by id");
		});

		it("should return 404 for a missing task", async () => {
			const res = await request(app).get("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});

		it("should return 400 for an invalid id", async () => {
			const res = await request(app).get("/api/tasks/not-a-number");

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Invalid task ID" });
		});
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should return 400 when title is missing", async () => {
			const res = await request(app).post("/api/tasks").send({ title: "   " });

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Title is required and must be a non-empty string" });
			expect(await testPrisma.task.count()).toBe(0);
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update an existing task", async () => {
			const task = await createTaskRecord("Old title", "Old description");

			const res = await request(app).put(`/api/tasks/${task.id}`).send({
				title: "Updated title",
				completed: true,
			});

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Updated title");
			expect(res.body.completed).toBe(true);
		});

		it("should return 404 when updating a missing task", async () => {
			const res = await request(app).put("/api/tasks/999999").send({ completed: true });

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete an existing task", async () => {
			const task = await createTaskRecord("Task to delete");

			const res = await request(app).delete(`/api/tasks/${task.id}`);
			const remaining = await testPrisma.task.findMany();

			expect(res.status).toBe(204);
			expect(remaining).toHaveLength(0);
		});

		it("should return 404 when deleting a missing task", async () => {
			const res = await request(app).delete("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});
});
