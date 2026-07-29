type ServerCategoryFilterProps = {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
};

export function ServerCategoryFilter({
  categories,
  value,
  onChange,
}: ServerCategoryFilterProps) {
  return (
    <nav className="server-category-filter" aria-label="Filter servers by category">
      <span>Server category</span>
      <div>
        <button
          type="button"
          className={value === "ALL" ? "active" : ""}
          aria-pressed={value === "ALL"}
          onClick={() => onChange("ALL")}
        >
          All servers
        </button>
        {categories.map((category) => (
          <button
            type="button"
            className={value === category ? "active" : ""}
            aria-pressed={value === category}
            onClick={() => onChange(category)}
            key={category}
          >
            {category}
          </button>
        ))}
      </div>
    </nav>
  );
}
