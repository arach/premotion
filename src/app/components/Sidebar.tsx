import React from "react";

interface Props {
  section: "sources" | "renders";
  onSection: (s: "sources" | "renders") => void;
  filter: string;
  onFilter: (f: string) => void;
  search: string;
  onSearch: (s: string) => void;
  apps: Record<string, number>;
  counts: {
    total: number;
    analyzed: number;
    transcribed: number;
    reel: number;
    orphans: number;
    curated: number;
    renders: number;
  };
}

export function Sidebar({ section, onSection, filter, onFilter, search, onSearch, apps, counts }: Props) {
  const btn = (value: string, label: string, count: number) => (
    <button
      className={`filter-btn ${filter === value ? "active" : ""}`}
      onClick={() => onFilter(value)}
    >
      {label}
      <span className="filter-count">{count}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <h1>PREMOTION</h1>
      <p className="sidebar-subtitle">Video Catalog</p>

      <div className="section-tabs">
        <button
          className={`section-tab ${section === "sources" ? "active" : ""}`}
          onClick={() => onSection("sources")}
        >
          Sources
          <span className="section-tab-count">{counts.total}</span>
        </button>
        <button
          className={`section-tab ${section === "renders" ? "active" : ""}`}
          onClick={() => onSection("renders")}
        >
          Output
          <span className="section-tab-count">{counts.renders}</span>
        </button>
      </div>

      <input
        type="text"
        className="search-box"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      {section === "sources" && (
        <>
          <div className="filter-group">
            <h3>Filter</h3>
            {btn("all", "All Sources", counts.total)}
            {btn("curated", "Best Snippets", counts.curated)}
            {btn("analyzed", "Analyzed", counts.analyzed)}
            {btn("needs-work", "Needs Work", counts.total - counts.analyzed)}
            {btn("transcribed", "Transcribed", counts.transcribed)}
            {btn("reel", "Reel Candidates", counts.reel)}
          </div>
          <div className="filter-group">
            <h3>By App</h3>
            {Object.entries(apps)
              .sort((a, b) => b[1] - a[1])
              .map(([app, count]) => (
                <React.Fragment key={app}>{btn(app, app, count)}</React.Fragment>
              ))}
          </div>
        </>
      )}
    </aside>
  );
}
