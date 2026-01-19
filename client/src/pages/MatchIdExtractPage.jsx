import { useState } from "react";

const MatchIdExtractPage = () => {
  const [playerName, setPlayerName] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMatches([]);
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError("Enter a player name.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `/api/pubg/player-matches?name=${encodeURIComponent(
          trimmed
        )}&includeMeta=true&onlyCustom=true`
      );
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch matches");
      }
      setMatches(payload.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="matchid-page">
      <section className="page-hero">
        <h1>Match ID Extractor</h1>
        <p>Look up a player and copy the match IDs you need.</p>
      </section>

      <section className="section">
        <form className="matchid-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Enter PUBG in-game name"
          />
          <button type="submit" className="cta-button">
            Fetch Matches
          </button>
        </form>
        {error && <div className="empty-state">{error}</div>}
        {loading && <div className="empty-state">Loading matches...</div>}
        {!loading && matches.length > 0 && (
          <div className="matchid-list">
            {matches.map((match) => (
              <div key={match.match_id || match} className="matchid-row matchid-custom">
                <div className="matchid-main">
                  <strong>{match.match_id || match}</strong>
                  {match.game_mode && (
                    <span className="muted">
                      {match.game_mode} • {match.map_name || "Unknown map"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleCopy(match.match_id || match)}
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default MatchIdExtractPage;
