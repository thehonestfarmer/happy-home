import { FilteredListingsBox } from "./FilteredListingsBox";

// TODO: add size media queries to this component so sidebar shows up here as a filter in desktop
export default async function Component() {
  return (
    <div className="md:grid-cols-[240px_1fr] gap-8 md:p-8 flex flex h-screen">
      <FilteredListingsBox />
    </div>
  );
}
