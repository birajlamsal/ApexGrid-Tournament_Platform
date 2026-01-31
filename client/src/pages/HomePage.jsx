import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import {
  fetchAnnouncements,
  fetchFeaturedTournaments,
  fetchTournaments,
  fetchUpcomingMatches
} from "../api";
import useReveal from "../hooks/useReveal";

const HomePage = () => {
  const heroRef = useRef(null);
  const countersRef = useRef([]);
  useReveal();

  const [tournaments, setTournaments] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
    align: "start"
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [tournamentsData, featuredData, announcementsData, upcomingData] =
          await Promise.all([
            fetchTournaments(),
            fetchFeaturedTournaments(),
            fetchAnnouncements(),
            fetchUpcomingMatches()
          ]);
        setTournaments(tournamentsData);
        setFeatured(featuredData);
        setAnnouncements(announcementsData);
        setUpcomingMatches(upcomingData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!heroRef.current) {
      return;
    }
    const timeline = gsap.timeline();
    timeline
      .fromTo(
        heroRef.current.querySelector(".hero-title"),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      )
      .fromTo(
        heroRef.current.querySelector(".hero-subtitle"),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
        "-=0.4"
      )
      .fromTo(
        heroRef.current.querySelector(".hero-actions"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.3"
      );
  }, []);

  useEffect(() => {
    if (!countersRef.current.length || !tournaments.length) {
      return;
    }
    countersRef.current.forEach((el) => {
      const target = Number(el.dataset.count || 0);
      gsap.fromTo(
        el,
        { textContent: 0 },
        {
          textContent: target,
          duration: 1.4,
          ease: "power1.out",
          snap: { textContent: 1 }
        }
      );
    });
  }, [tournaments]);

  const counters = useMemo(() => {
    const ongoing = tournaments.filter((item) => item.status === "ongoing").length;
    const upcoming = tournaments.filter((item) => item.status === "upcoming").length;
    const completed = tournaments.filter((item) => item.status === "completed").length;
    const open = tournaments.filter(
      (item) => item.registration_status === "open"
    ).length;
    return [
      { label: "Ongoing", value: ongoing },
      { label: "Upcoming", value: upcoming },
      { label: "Completed", value: completed },
      { label: "Open Slots", value: open }
    ];
  }, [tournaments]);

  const ongoingTournaments = useMemo(
    () => tournaments.filter((item) => item.status === "ongoing"),
    [tournaments]
  );

  const upcomingTournaments = useMemo(
    () => tournaments.filter((item) => item.status === "upcoming"),
    [tournaments]
  );

  const highlightTournament = useMemo(() => {
    return featured[0] || upcomingTournaments[0] || tournaments[0] || null;
  }, [featured, upcomingTournaments, tournaments]);

  const featuredRow = useMemo(() => {
    return [...ongoingTournaments, ...upcomingTournaments].slice(0, 8);
  }, [ongoingTournaments, upcomingTournaments]);

  const latestNews = useMemo(() => announcements.slice(0, 6), [announcements]);

  return (
    <main className="home-page">
      <section className="hero hub-hero" ref={heroRef}>
        <div className="hero-bg" />
        <div className="hero-content">
          <span className="hero-tag">PUBG PC Hub</span>
          <h1 className="hero-title">PUBG Hub</h1>
          <p className="hero-subtitle">
            Live tournament tracking, verified rosters, and match-ready insights
            built for competitive squads.
          </p>
          <div className="hero-actions">
            <Link to="/tournaments" className="primary-button">
              Explore Tournaments
            </Link>
            <Link to="/contact" className="ghost-button">
              Reach the Team
            </Link>
          </div>
        </div>
        <div className="hero-counters reveal">
          {counters.map((counter, index) => (
            <div className="counter-card" key={counter.label}>
              <span
                className="counter-value"
                ref={(el) => {
                  countersRef.current[index] = el;
                }}
                data-count={counter.value}
              >
                0
              </span>
              <span className="counter-label">{counter.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section reveal">
        <div className="section-header">
          <h2>Ongoing & Upcoming Tournaments</h2>
          <Link to="/tournaments">View all</Link>
        </div>
        {loading && (
          <div className="card-grid">
            <SkeletonCards count={4} />
          </div>
        )}
        {!loading && featuredRow.length === 0 && (
          <EmptyState message="No tournaments available right now." />
        )}
        {!loading && featuredRow.length > 0 && (
          <div className="embla scroll-row" ref={emblaRef}>
            <div className="embla__container">
              {featuredRow.map((tournament) => (
                <div className="embla__slide" key={tournament.tournament_id}>
                  <Link
                    to={`/tournaments/${tournament.tournament_id}`}
                    className="tournament-card"
                  >
                    <div className="card-top">
                      <div className="card-image" aria-hidden="true" />
                      <span className={`status-badge ${tournament.status}`}>
                        {tournament.status}
                      </span>
                      <h3>{tournament.name}</h3>
                      <p>{tournament.description || "Details coming soon."}</p>
                    </div>
                    <div className="card-bottom">
                      <div>
                        <span>Prize Pool</span>
                        <strong>${tournament.prize_pool}</strong>
                      </div>
                      <div>
                        <span>Region</span>
                        <strong>{tournament.region || "-"}</strong>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="section reveal highlight-grid">
        <div className="highlight-card">
          <div className="highlight-glow" />
          <div className="highlight-content">
            <span className="chip">Featured Spotlight</span>
            <h2>{highlightTournament?.name || "Featured Tournament"}</h2>
            <p>
              {highlightTournament?.description ||
                "Featured tournaments highlight the best squads, tightest schedules, and highest stakes."}
            </p>
            <div className="highlight-meta">
              <div>
                <span>Prize Pool</span>
                <strong>${highlightTournament?.prize_pool ?? "-"}</strong>
              </div>
              <div>
                <span>Dates</span>
                <strong>
                  {highlightTournament?.start_date || "-"} •{" "}
                  {highlightTournament?.end_date || "-"}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{highlightTournament?.status || "-"}</strong>
              </div>
            </div>
            <Link
              to={
                highlightTournament
                  ? `/tournaments/${highlightTournament.tournament_id}`
                  : "/tournaments"
              }
              className="primary-button"
            >
              View details
            </Link>
          </div>
        </div>

        <div className="highlight-aside">
          <div className="section-header">
            <h2>Upcoming Match Schedule</h2>
          </div>
          <div className="stacked-cards">
            {loading && <SkeletonCards count={2} />}
            {!loading && upcomingMatches.length === 0 && (
              <EmptyState message="No upcoming matches scheduled." />
            )}
            {!loading &&
              upcomingMatches.map((match) => (
                <div key={match.match_id} className="schedule-card">
                  <div>
                    <h4>{match.match_name}</h4>
                    <span className="muted">{match.tournament_name}</span>
                  </div>
                  <div>
                    <span>{new Date(match.match_time).toLocaleString()}</span>
                    <span className="badge">{match.lobby}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-header">
          <h2>Latest News</h2>
          <Link to="/announcements">View all</Link>
        </div>
        <div className="card-grid news-grid">
          {loading && <SkeletonCards count={3} />}
          {!loading && latestNews.length === 0 && (
            <EmptyState message="No announcements yet." />
          )}
          {!loading &&
            latestNews.map((note) => (
              <div className="announcement-card news-card" key={note.announcement_id}>
                <div className="news-card__header">
                  <span className="badge">{note.type}</span>
                  <span className="muted">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
                <Link to="/announcements" className="text-button">
                  Read update
                </Link>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
};

const SkeletonCards = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="skeleton-card" />
    ))}
  </>
);

const EmptyState = ({ message }) => (
  <div className="empty-state">{message}</div>
);

export default HomePage;
