import { FilteredListingsBox } from "./FilteredListingsBox";

export default async function Component() {
  return (
    <div className="md:grid-cols-[240px_1fr] gap-8 p-4 md:p-8">
      <FilteredListingsBox />
    </div>
  );
}
