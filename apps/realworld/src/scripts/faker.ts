import { faker } from "@faker-js/faker";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

async function generateFakeMovieData(length: number, path: string) {
  const fakeMovieData = Array.from({ length }, () => ({
    adult: false,
    backdrop_path: null,
    genre_ids: [faker.number.int({ min: 12, max: 99 })],
    id: faker.number.int({ min: 1, max: 1_000_000 }),
    title: faker.lorem.words({ min: 2, max: 5 }),
    original_language: "en",
    original_title: faker.lorem.words({ min: 2, max: 5 }),
    overview: faker.lorem.paragraph(),
    popularity: faker.number.float({ min: 1, max: 200, fractionDigits: 4 }),
    poster_path: null,
    release_date: faker.date.past().toISOString().slice(0, 10),
    softcore: false,
    video: false,
    vote_average: faker.number.float({ min: 1, max: 10, fractionDigits: 3 }),
    vote_count: faker.number.int({ min: 0, max: 20_000 }),
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
