
require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 3000;

function validatePagination(query) {
  const page = query.page ?? "1";
  const requestedLimit = query.limit ?? "10";

  if (
    !/^[1-9]\d*$/.test(String(page)) ||
    !/^[1-9]\d*$/.test(String(requestedLimit))
  ) {
    return null;
  }

  return {
    page: Number(page),
    limit: Math.min(Number(requestedLimit), 50)
  };
}

function validateOrder(order) {
  return order === "asc" || order === "desc";
}

function validDate(value) {
  return !Number.isNaN(Date.parse(value)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
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
        error: "username or email already exists"
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const pagination = validatePagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        error: "page and limit must be positive integers"
      });
    }

    const { page, limit } = pagination;
    const sortBy = req.query.sortBy ?? "createdAt";
    const order = req.query.order ?? "desc";
    const allowedSortFields = ["createdAt", "username", "fullname"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of: createdAt, username, fullname"
      });
    }

    if (!validateOrder(order)) {
      return res.status(400).json({
        error: "order must be asc or desc"
      });
    }

    const where = {};

    if (req.query.isPrivate !== undefined) {
      if (!["true", "false"].includes(req.query.isPrivate)) {
        return res.status(400).json({
          error: "isPrivate must be true or false"
        });
      }

      where.isPrivate = req.query.isPrivate === "true";
    }

    if (req.query.search) {
      where.OR = [
        { username: { contains: req.query.search, mode: "insensitive" } },
        { fullname: { contains: req.query.search, mode: "insensitive" } }
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data,
      meta: paginationMeta(page, limit, total)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const data = {};

    for (const field of ["fullname", "bio", "isPrivate"]) {
      if (Object.hasOwn(req.body, field)) {
        data[field] = req.body[field];
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data
    });

    res.json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/posts", async (req, res) => {
  try {
    const { imageUrl, caption, location, userId } = req.body;

    if (!imageUrl || userId === undefined || userId === null) {
      return res.status(400).json({
        error: "imageUrl and userId are required"
      });
    }

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const post = await prisma.post.create({
      data: {
        imageUrl,
        caption,
        location,
        userId: parsedUserId
      }
    });

    res.status(201).json(post);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({ error: "User not found" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const pagination = validatePagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        error: "page and limit must be positive integers"
      });
    }

    const { page, limit } = pagination;
    const sortBy = req.query.sortBy ?? "createdAt";
    const order = req.query.order ?? "desc";
    const allowedSortFields = ["createdAt", "updatedAt"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of: createdAt, updatedAt"
      });
    }

    if (!validateOrder(order)) {
      return res.status(400).json({
        error: "order must be asc or desc"
      });
    }

    const where = {};

    if (req.query.location !== undefined) {
      where.location = {
        equals: req.query.location,
        mode: "insensitive"
      };
    }

    if (req.query.search) {
      where.caption = {
        contains: req.query.search,
        mode: "insensitive"
      };
    }

    if (req.query.from !== undefined || req.query.to !== undefined) {
      if (
        (req.query.from !== undefined && !validDate(req.query.from)) ||
        (req.query.to !== undefined && !validDate(req.query.to))
      ) {
        return res.status(400).json({
          error: "from and to must be valid dates"
        });
      }

      where.createdAt = {};

      if (req.query.from !== undefined) {
        where.createdAt.gte = new Date(`${req.query.from}T00:00:00.000Z`);
      }

      if (req.query.to !== undefined) {
        where.createdAt.lt = new Date(`${req.query.to}T00:00:00.000Z`);
      }
    }

    const [data, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      data,
      meta: paginationMeta(page, limit, total)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const data = {};

    for (const field of ["caption", "location"]) {
      if (Object.hasOwn(req.body, field)) {
        data[field] = req.body[field];
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data
    });

    res.json(post);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    await prisma.post.delete({ where: { id } });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
