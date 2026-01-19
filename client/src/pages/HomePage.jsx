import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Link } from "react-router-dom";
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
      { label: "On the Way", value: upcoming },
      { label: "Completed", value: completed },
      { label: "Registration Open", value: open }
    ];
  }, [tournaments]);

  return (
    <main className="home-page">
      <section className="hero" ref={heroRef}>
        <div className="hero-bg" />
        <div className="hero-content">
          <span className="hero-tag">PUBG PC Tournament Platform</span>
          <h1 className="hero-title">Dominate the Drop. Track Every Win.</h1>
          <p className="hero-subtitle">
            Community-first PUBG tournaments, verified stats, and animated leaderboards
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
          <h2>Featured Tournaments</h2>
          <Link to="/tournaments">View all</Link>
        </div>
        <div className="card-grid">
          {loading && <SkeletonCards count={3} />}
          {!loading && featured.length === 0 && (
            <EmptyState message="No featured tournaments yet." />
          )}
          {!loading &&
            featured.map((tournament) => (
              <Link
                to={`/tournaments/${tournament.tournament_id}`}
                key={tournament.tournament_id}
                className="tournament-card"
              >
                <div className="card-top">
                  <span className={`status-badge ${tournament.status}`}>
                    {tournament.status}
                  </span>
                  <h3>{tournament.name}</h3>
                  <p>{tournament.description}</p>
                </div>
                <div className="card-bottom">
                  <div>
                    <span>Prize Pool</span>
                    <strong>${tournament.prize_pool}</strong>
                  </div>
                  <div>
                    <span>Registration</span>
                    <strong>${tournament.registration_charge}</strong>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section className="section reveal split-section">
        <div>
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
        <div>
          <div className="section-header">
            <h2>Announcements</h2>
          </div>
          <div className="stacked-cards">
            {loading && <SkeletonCards count={2} />}
            {!loading && announcements.length === 0 && (
              <EmptyState message="No announcements yet." />
            )}
            {!loading &&
              announcements.map((note) => (
                <div key={note.announcement_id} className="announcement-card">
                  <h4>{note.title}</h4>
                  <p>{note.body}</p>
                  <span className="muted">{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              ))}
          </div>
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

const SkeletonTable = () => <div className="skeleton-table" />;

const EmptyState = ({ message }) => (
  <div className="empty-state">{message}</div>
);

export default HomePage;
