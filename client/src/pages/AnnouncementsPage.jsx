import { useEffect, useState } from "react";
import { fetchAnnouncements } from "../api";
import useReveal from "../hooks/useReveal";

const AnnouncementsPage = () => {
  useReveal();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAnnouncements();
        setAnnouncements(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="announcements-page">
      <section className="page-hero reveal">
        <h1>News & Updates</h1>
        <p>Esports coverage, platform notes, and tournament updates.</p>
        <div className="chip-row">
          {["All", "Esports", "Patch", "Fantasy", "Announcements"].map((label) => (
            <span key={label} className="chip">
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="section reveal">
        <div className="card-grid news-grid">
          {loading && <div className="skeleton-table" />}
          {!loading && announcements.length === 0 && (
            <div className="empty-state">No announcements yet.</div>
          )}
          {!loading &&
            announcements.map((note) => (
              <div key={note.announcement_id} className="announcement-card news-card">
                <div className="news-card__header">
                  <span className="badge">{note.type}</span>
                  <span className="muted">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
                <div className="announcement-meta">
                  <span
                    className={`importance-line importance-${note.importance || "medium"}`}
                    title={`Importance: ${note.importance || "medium"}`}
                    aria-label={`Importance: ${note.importance || "medium"}`}
                  />
                  <span className="muted">Read more</span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
};

export default AnnouncementsPage;
