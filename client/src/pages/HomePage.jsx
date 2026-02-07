import { useEffect, useMemo, useState } from "react";
import { fetchAnnouncements, fetchTournaments } from "../api";

const HomePage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await fetchAnnouncements();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    loadAnnouncements();
  }, []);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const data = await fetchTournaments();
        setTournaments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setTournamentsLoading(false);
      }
    };
    loadTournaments();
  }, []);

  const { ongoing, upcoming, past, featured } = useMemo(() => {
    const normalized = tournaments.slice();
    const byStart = (a, b) =>
      new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
    const ongoingList = normalized.filter((t) => t.status === "ongoing");
    const upcomingList = normalized.filter((t) => t.status === "upcoming");
    const pastList = normalized.filter((t) => t.status === "completed");
    const featuredTournament = normalized.find((t) => t.featured) || upcomingList[0];

    return {
      ongoing: ongoingList.sort(byStart),
      upcoming: upcomingList.sort(byStart)[0] || null,
      past: pastList.sort(byStart),
      featured: featuredTournament || null
    };
  }, [tournaments]);

  return (
    <div className="twire-page">
      <div className="twire-container">
        <div className="twire-layout">
          <div className="twire-content">
            <main className="twire-main">
              <div>
                <SectionTitle title="Ongoing tournaments" />

                <div className="twire-panel">
                  {tournamentsLoading && (
                    <div className="twire-muted">Loading tournaments...</div>
                  )}
                  {!tournamentsLoading && ongoing.length === 0 && (
                    <div className="twire-muted">No ongoing tournaments.</div>
                  )}
                  {!tournamentsLoading &&
                    ongoing.map((t, idx) => (
                      <TournamentRow
                        key={t.tournament_id || t.name}
                        t={t}
                        isLast={idx === ongoing.length - 1}
                      />
                    ))}
                </div>
              </div>

              <div className="twire-title-row">
                <SectionTitle title="Upcoming tournament" />
              </div>

              {tournamentsLoading && (
                <div className="twire-muted">Loading tournaments...</div>
              )}
              {!tournamentsLoading && upcoming ? (
                <div className="twire-panel">
                  <TournamentRow t={upcoming} isLast />
                </div>
              ) : null}
              {!tournamentsLoading && !upcoming && (
                <div className="twire-empty">No upcoming tournaments.</div>
              )}

              <div className="twire-title-row">
                <SectionTitle title="Past tournaments" />
                <button className="twire-link">View more</button>
              </div>

              <div className="twire-panel">
                {tournamentsLoading && (
                  <div className="twire-muted">Loading tournaments...</div>
                )}
                {!tournamentsLoading && past.length === 0 && (
                  <div className="twire-muted">No past tournaments.</div>
                )}
                {!tournamentsLoading &&
                  past.map((t, idx) => (
                    <TournamentRow
                      key={`${t.tournament_id || t.name}-${idx}`}
                      t={t}
                      isLast={idx === past.length - 1}
                    />
                  ))}
              </div>
            </main>

            <aside className="twire-aside">
              <div className="twire-panel twire-panel--pad">
                <div className="twire-panel-head">
                  <h3>Notices & announcements</h3>
                </div>

                <div className="twire-stack">
                  {announcementsLoading && (
                    <div className="twire-muted">Loading announcements...</div>
                  )}
                  {!announcementsLoading && announcements.length === 0 && (
                    <div className="twire-muted">No announcements yet.</div>
                  )}
                  {!announcementsLoading &&
                    announcements.slice(0, 6).map((n) => (
                      <NewsCard key={n.announcement_id || n.title} n={n} />
                    ))}
                </div>
              </div>

            </aside>

          </div>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title }) => {
  return (
    <div className="twire-title">
      <span className="twire-title__dot" />
      <h2>{title}</h2>
    </div>
  );
};

const StatusPill = ({ status }) => {
  const base = "twire-pill";
  if (status === "live") {
    return <span className={`${base} is-live`}>Live</span>;
  }
  if (status === "ongoing") {
    return <span className={`${base} is-ongoing`}>Ongoing</span>;
  }
  if (status === "completed") {
    return <span className={`${base} is-completed`}>Completed</span>;
  }
  return <span className={`${base} is-upcoming`}>Upcoming</span>;
};

const TournamentRow = ({ t, isLast }) => {
  const status = String(t.status || "").toLowerCase();
  const displayMode = String(t.mode || "").toUpperCase();
  const displayRegion = t.region || "Global";
  const displayPrize =
    typeof t.prize_pool === "number" || typeof t.prize_pool === "string"
      ? `$${t.prize_pool}`
      : t.prize || "-";

  return (
    <div className={`twire-row ${isLast ? "" : "twire-row--line"}`}>
      <div className="twire-row__logo">
        <div className="twire-row__logo-mark" />
      </div>

      <div className="twire-row__info">
        <div className="twire-row__title">
          <div className="twire-row__name">{t.name}</div>
          <StatusPill status={status} />
        </div>
        <div className="twire-row__meta">
          <span>{displayRegion}</span>
          <span className="twire-row__dot" />
          <span>PC</span>
          <span className="twire-row__dot" />
          <span>{displayMode}</span>
          <span className="twire-row__dot" />
          <span>{displayPrize}</span>
        </div>
      </div>

      <div className="twire-row__actions">
        <span className="twire-row__hint">
          {status === "live" ? "Now" : "Details"}
        </span>
        <button className="twire-cta">Details</button>
      </div>
    </div>
  );
};

const NewsCard = ({ n }) => {
  const createdAt = n?.created_at
    ? new Date(n.created_at).toLocaleDateString()
    : "";
  const tag = n?.type || "Notice";
  const title = n?.title || "Announcement";
  const body = n?.body || "";

  return (
    <div className="twire-news">
      <div className="twire-news__thumb" />
      <div className="twire-news__body">
        <div className="twire-news__title">{title}</div>
        {body && <div className="twire-news__desc">{body}</div>}
        <div className="twire-news__meta">
          <span className="twire-tag">{tag}</span>
          <span>•</span>
          <span>{createdAt || "Just now"}</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
