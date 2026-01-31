import { useState } from "react";

const MatchDetailDownloadPage = () => {
  const [matchId, setMatchId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResults([]);
    const trimmed = matchId.trim();
    if (!trimmed) {
      setError("Enter at least one match ID.");
      return;
    }
    try {
      setLoading(true);
      const ids = Array.from(
        new Set(
          trimmed
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );
      const items = [];
      for (const id of ids) {
        const response = await fetch(`/api/pubg/matches/${encodeURIComponent(id)}`);
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };
        if (!response.ok) {
          items.push({ id, error: payload.error || "Failed to fetch match" });
          continue;
        }
        items.push({
          id,
          source: payload.source || "db",
          match: payload.match || null
        });
      }
      setResults(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="matchid-page">
      <section className="page-hero tool-hero">
        <h1>Match Details Downloader</h1>
        <p>Pull match details by ID. Stored on the server after first fetch.</p>
      </section>

      <section className="section">
        <div className="tool-panel">
          <form className="matchid-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
              placeholder="Enter match IDs (comma separated)"
            />
            <button type="submit" className="primary-button">
              Fetch Match
            </button>
          </form>
          {error && <div className="empty-state">{error}</div>}
          {loading && <div className="empty-state">Loading match details...</div>}
          {!loading && results.length > 0 && (
            <div className="matchid-list">
              {results.map((item) => (
                <div key={item.id} className="matchid-row matchid-custom">
                  <div className="matchid-main">
                    <strong>{item.match?.data?.id || item.id}</strong>
                    {item.error ? (
                      <span className="muted">Error: {item.error}</span>
                    ) : (
                      <>
                        <span className="muted">
                          Source: {item.source || "db"} •{" "}
                          {item.match?.data?.attributes?.mapName || "-"}
                        </span>
                        <span className="muted">
                          {item.source === "api"
                            ? "Thanks! Match stored on the server."
                            : "This match already existed on the server."}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default MatchDetailDownloadPage;
