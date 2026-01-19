import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTournaments } from "../api";
import useReveal from "../hooks/useReveal";

const TournamentsPage = () => {
  useReveal();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    registration: "",
    mode: "",
    sort: "start_date"
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchTournaments(filters);
        setTournaments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  const visible = useMemo(() => {
    if (!filters.search) {
      return tournaments;
    }
    const term = filters.search.toLowerCase();
    return tournaments.filter((item) => item.name.toLowerCase().includes(term));
  }, [tournaments, filters.search]);

  return (
    <main className="tournaments-page">
      <section className="page-hero reveal">
        <h1>All Tournaments</h1>
        <p>Filter by status, mode, and registration to find your next battle.</p>
      </section>

      <section className="filters reveal">
        <input
          type="search"
          placeholder="Search by tournament name"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="">Status: All</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filters.registration}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, registration: e.target.value }))
          }
        >
          <option value="">Registration: All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.mode}
          onChange={(e) => setFilters((prev) => ({ ...prev, mode: e.target.value }))}
        >
          <option value="">Mode: All</option>
          <option value="solo">Solo</option>
          <option value="duo">Duo</option>
          <option value="squad">Squad</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
        >
          <option value="start_date">Sort: Start Date</option>
          <option value="prize_pool">Sort: Prize Pool</option>
          <option value="registration_charge">Sort: Registration Charge</option>
        </select>
      </section>

      <section className="section reveal">
        <div className="card-grid">
          {loading && <SkeletonCards count={6} />}
          {!loading && visible.length === 0 && (
            <EmptyState message="No tournaments match these filters." />
          )}
          {!loading &&
            visible.map((tournament) => (
              <Link
                to={`/tournaments/${tournament.tournament_id}`}
                key={tournament.tournament_id}
                className="tournament-card full"
              >
                <div className="card-left">
                  <span className={`status-badge ${tournament.status}`}>
                    {tournament.status}
                  </span>
                  <h3>{tournament.name}</h3>
                  <p>{tournament.description}</p>
                </div>
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
              </Link>
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
