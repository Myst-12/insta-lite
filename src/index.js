require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK" });
});

app.post("/users", async (req, res) => {
    try {
        const { username, email, fullname, bio } = req.body;

        if (!username || !email || !fullname) {
            return res.status(400).json({
                error: "username, email and fullname are required"
            });
        }

        const user = await prisma.user.create({
            data: { username, email, fullname, bio }
        });

        res.status(201).json(user);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                error: "username or email already taken"
            });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/users", async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const { fullname, bio, isPrivate } = req.body;
        const data = {};

        if (fullname !== undefined) data.fullname = fullname;
        if (bio !== undefined) data.bio = bio;
        if (isPrivate !== undefined) data.isPrivate = isPrivate;

        const user = await prisma.user.update({
            where: { id },
            data
        });

        res.status(200).json(user);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "User not found" });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "User not found" });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.status(204).end();
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "User not found" });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/posts", async (req, res) => {
    try {
        const { imageUrl, caption, location, userId } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                error: "imageUrl is required"
            });
        }

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                error: "A valid userId is required"
            });
        }

        const post = await prisma.post.create({
            data: { imageUrl, caption, location, userId }
        });

        res.status(201).json(post);
    } catch (error) {
        if (error.code === "P2003") {
            return res.status(400).json({ error: "Invalid userId" });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/posts", async (req, res) => {
    try {
        const posts = await prisma.post.findMany();
        res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/posts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        const post = await prisma.post.findUnique({
            where: { id }
        });

        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/posts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        const { caption, location } = req.body;
        const data = {};

        if (caption !== undefined) data.caption = caption;
        if (location !== undefined) data.location = location;

        const post = await prisma.post.update({
            where: { id },
            data
        });

        res.status(200).json(post);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Post not found" });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/posts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        await prisma.post.delete({
            where: { id }
        });

        res.status(204).end();
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Post not found" });
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const server = app.listen(3000, () => {
    console.log("Server started on port 3000");
});

async function shutdown() {
    server.close();
    await prisma.$disconnect();
    await pool.end();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
