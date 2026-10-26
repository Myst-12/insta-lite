
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const { users, posts } = require("./seed-data");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = await prisma.user.createManyAndReturn({
    data: users.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt)
    }))
  });

  const userIds = createdUsers.map(user => user.id);

  const createdPosts = await prisma.post.createManyAndReturn({
    data: posts.map((post, index) => ({
      ...post,
      createdAt: new Date(post.createdAt),
      userId: userIds[index % userIds.length]
    }))
  });

  console.log(
    `🌱 Seeded ${createdUsers.length} users and ${createdPosts.length} posts`
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
