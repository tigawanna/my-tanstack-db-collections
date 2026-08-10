import { ListMovies } from "./ListMovies";

export function ExperimentsPage() {
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="w-full flex flex-col">
        <h1>Experiments</h1>
        <p>This is the experiments page</p>
      </div>
      <ListMovies />
    </div>
  );
}
