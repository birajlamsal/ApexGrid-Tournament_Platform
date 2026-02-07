import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTournaments } from "../api";
import useReveal from "../hooks/useReveal";

const TournamentsPage = () => {
  useReveal();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    registration: "",
    mode: "",
    region: "",
    tier: "",
    sort: "start_date"
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchTournaments({
          search: filters.search,
          status: filters.status,
          registration: filters.registration,
          mode: filters.mode,
          sort: filters.sort
        });
        setTournaments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.search, filters.status, filters.registration, filters.mode, filters.sort]);

  const getTierCode = (tournament) => {
    const tier = String(tournament.tier || "").toUpperCase();
    if (tier) {
      return tier;
    }
    const prize = Number(tournament.prize_pool || 0);
    if (prize >= 1000) {
      return "S";
    }
    if (prize >= 500) {
      return "A";
    }
    if (prize >= 200) {
      return "B";
    }
    return "C";
  };

  const getTierLabel = (tournament) => `${getTierCode(tournament)} Tier`;

  const visible = useMemo(() => {
    return tournaments.filter((item) => {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (filters.registration && item.registration_status !== filters.registration) {
        return false;
      }
      if (filters.mode && item.mode !== filters.mode) {
        return false;
      }
      if (filters.region && item.region !== filters.region) {
        return false;
      }
      if (filters.tier) {
        if (getTierCode(item) !== filters.tier) {
          return false;
        }
      }
      return true;
    });
  }, [
    tournaments,
    filters.search,
    filters.status,
    filters.registration,
    filters.mode,
    filters.region,
    filters.tier
  ]);

  const regions = useMemo(() => {
    return Array.from(
      new Set(tournaments.map((item) => item.region).filter(Boolean))
    );
  }, [tournaments]);

  return (
    <main className="tournaments-page">
      <section className="page-hero reveal">
        <h1>All Tournaments</h1>
        <p>Filter by status, region, and tier to find the next drop.</p>
      </section>

      <section className="filters reveal">
        <div className="filters-header">
          <div>
            <h2>Filter tournaments</h2>
            <p className="muted">Search, sort, and prioritize your next event.</p>
          </div>
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
          >
            Filters
          </button>
        </div>
        <div className={`filters-grid ${showFilters ? "open" : ""}`}>
          <label className="filter-field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Search by tournament name"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </label>
          <label className="filter-field">
            <span>Region</span>
            <select
              value={filters.region}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, region: e.target.value }))
              }
            >
              <option value="">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Tier</span>
            <select
              value={filters.tier}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, tier: e.target.value }))
              }
            >
              <option value="">All tiers</option>
              <option value="S">S Tier</option>
              <option value="A">A Tier</option>
              <option value="B">B Tier</option>
              <option value="C">C Tier</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Registration</span>
            <select
              value={filters.registration}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, registration: e.target.value }))
              }
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Mode</span>
            <select
              value={filters.mode}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, mode: e.target.value }))
              }
            >
              <option value="">All modes</option>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Sort</span>
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sort: e.target.value }))
              }
            >
              <option value="start_date">Start date</option>
              <option value="prize_pool">Prize pool</option>
              <option value="registration_charge">Popularity</option>
            </select>
          </label>
          <div className="filter-chips">
            {[
              { id: "", label: "All" },
              { id: "ongoing", label: "Ongoing" },
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Finished" }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={`chip ${filters.status === chip.id ? "active" : ""}`}
                onClick={() => setFilters((prev) => ({ ...prev, status: chip.id }))}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section reveal">
        <div className="card-grid">
          {loading && <SkeletonCards count={6} />}
          {!loading && visible.length === 0 && (
            <EmptyState message="No tournaments match these filters." />
          )}
          {!loading &&
            visible.map((tournament) => (
              <div key={tournament.tournament_id} className="tournament-card full">
                <div className="card-body">
                  <span className={`status-badge ${tournament.status}`}>
                    {tournament.status}
                  </span>
                  <h3>{tournament.name}</h3>
                  <p>{tournament.description || "Details coming soon."}</p>
                  <div className="card-meta">
                    <div>
                      <span>Prize Pool</span>
                      <strong>${tournament.prize_pool}</strong>
                    </div>
                    <div>
                      <span>Charge</span>
                      <strong>${tournament.registration_charge}</strong>
                    </div>
                    <div>
                      <span>Mode</span>
                      <strong>{tournament.mode}</strong>
                    </div>
                    <div>
                      <span>Dates</span>
                      <strong>
                        {tournament.start_date} - {tournament.end_date}
                      </strong>
                    </div>
                  </div>
                  <div className="card-tags">
                    <span className="chip">{tournament.region || "Global"}</span>
                    <span className="chip">{getTierLabel(tournament)}</span>
                  </div>
                </div>
                <div className="card-actions card-actions--footer">
                  <Link
                    to={`/tournaments/${tournament.tournament_id}`}
                    className="ghost-button"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/tournaments/${tournament.tournament_id}?tab=leaderboards`}
                    className="primary-button"
                  >
                    Leaderboards
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
};

const SkeletonCards = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-card" />
    ))}
  </>
);

const EmptyState = ({ message }) => (
  <div className="empty-state">{message}</div>
);

export default TournamentsPage;
