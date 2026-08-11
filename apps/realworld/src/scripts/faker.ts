import { faker } from "@faker-js/faker";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

async function generateFakeMovieData(length: number, path: string) {
  const fakeMovieData = Array.from({ length }, () => ({
    id: faker.string.uuid({ version: 7 }),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    rating: faker.number.int(5),
    releaseDate: faker.date.past(),
  }));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(fakeMovieData, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const count = args[0] ? parseInt(args[0]) : 100;
  const path = args[1] ? args[1] : "public/fake-data/movies.json";
  await generateFakeMovieData(count, path);
  console.log("Fake movie data generated successfully");
}

main().catch((error) => {
  console.error("Error generating fake movie data", error);
});
