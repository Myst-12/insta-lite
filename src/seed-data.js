const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const users = [
  {
    username: "riya_travels",
    email: "riya@example.com",
    fullname: "Riya Sharma",
    bio: "Travel and photography",
    isPrivate: false
  },
  {
    username: "arjun_codes",
    email: "arjun@example.com",
    fullname: "Arjun Mehta",
    bio: "CS student and developer",
    isPrivate: false
  },
  {
    username: "sara_clicks",
    email: "sara@example.com",
    fullname: "Sara Khan",
    bio: "Capturing everyday moments",
    isPrivate: true
  },
  {
    username: "dev_fitness",
    email: "dev@example.com",
    fullname: "Dev Patel",
    bio: "Fitness and healthy living",
    isPrivate: false
  },
  {
    username: "neha_reads",
    email: "neha@example.com",
    fullname: "Neha Verma",
    bio: "Books, coffee and sunsets",
    isPrivate: false
  }
];

const posts = [
  {
    imageUrl: "https://example.com/insta01.jpg",
    caption: "Mountain adventures",
    location: "Manali",
    username: "riya_travels"
  },
  {
    imageUrl: "https://example.com/insta02.jpg",
    caption: "Beautiful sunset",
    location: "Goa",
    username: "riya_travels"
  },
  {
    imageUrl: "https://example.com/insta03.jpg",
    caption: "Late-night coding",
    location: "Pune",
    username: "arjun_codes"
  },
  {
    imageUrl: "https://example.com/insta04.jpg",
    caption: "Finally fixed that bug",
    location: "Pune",
    username: "arjun_codes"
  },
  {
    imageUrl: "https://example.com/insta05.jpg",
    caption: "Little moments, big memories",
    location: "Mumbai",
    username: "sara_clicks"
  },
  {
    imageUrl: "https://example.com/insta06.jpg",
    caption: "City lights",
    location: "Delhi",
    username: "sara_clicks"
  },
  {
    imageUrl: "https://example.com/insta07.jpg",
    caption: "One more workout done",
    location: "Delhi",
    username: "dev_fitness"
  },
  {
    imageUrl: "https://example.com/insta08.jpg",
    caption: "Progress over perfection",
    location: "Gurgaon",
    username: "dev_fitness"
  },
  {
    imageUrl: "https://example.com/insta09.jpg",
    caption: "Currently reading",
    location: "Pune",
    username: "neha_reads"
  },
  {
    imageUrl: "https://example.com/insta10.jpg",
    caption: "Coffee and a good book",
    location: "Mumbai",
    username: "neha_reads"
  }
];

async function main() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: users });

  const createdUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true
    }
  });

  const userMap = new Map(
    createdUsers.map(user => [user.username, user.id])
  );

  await prisma.post.createMany({
    data: posts.map(({ username, ...post }) => ({
      ...post,
      userId: userMap.get(username)
    }))
  });

  console.log(`Seeded ${users.length} users and ${posts.length} posts`);
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