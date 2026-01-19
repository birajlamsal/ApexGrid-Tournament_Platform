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
        <h1>Announcements</h1>
        <p>Official updates, notices, and tournament communications.</p>
      </section>

      <section className="section reveal">
        <div className="stacked-cards">
          {loading && <div className="skeleton-table" />}
          {!loading && announcements.length === 0 && (
            <div className="empty-state">No announcements yet.</div>
          )}
          {!loading &&
            announcements.map((note) => (
              <div key={note.announcement_id} className="announcement-card">
                <div>
                  <h3>{note.title}</h3>
                  <p>{note.body}</p>
                </div>
                <div className="announcement-meta">
                  <span className="badge">{note.type}</span>
                  <span
                    className={`importance-line importance-${note.importance || "medium"}`}
                    title={`Importance: ${note.importance || "medium"}`}
                    aria-label={`Importance: ${note.importance || "medium"}`}
                  />
                  <span className="muted">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
};

export default AnnouncementsPage;
