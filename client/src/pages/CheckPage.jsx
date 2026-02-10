import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

const CheckPage = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/health"));
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Request failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Request failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isServerUp = Boolean(result?.status === "ok");
  const isConnected = result?.db?.enabled && result?.db?.connected;

  return (
    <main className="nf">
      <div className="nf__backdrop" aria-hidden="true" />
      <div className="nf__grain" aria-hidden="true" />
      <section className="nf__card" role="region" aria-label="Database status">
        <div className="nf__tiles" aria-label="Database status">
          <div className="nf__tile">{isConnected ? "OK" : "DB"}</div>
          <div className="nf__tile">{isConnected ? "OK" : "??"}</div>
          <div className="nf__tile">{isConnected ? "OK" : "!!"}</div>
        </div>
        <h1 className="nf__title">Database Connection Check</h1>
        {loading && <p className="nf__sub">Checking database status…</p>}
        {!loading && error && (
          <p className="nf__sub">Error: {error}</p>
        )}
        {!loading && !error && (
          <p className="nf__sub">
            {isServerUp
              ? "Backend server is running."
              : "Backend server is not responding."}
          </p>
        )}
        {!loading && !error && (
          <p className="nf__sub">
            {isConnected
              ? "Database is connected and responding."
              : "Database is not connected or not configured."}
          </p>
        )}
        <div className="nf__code">
          {result
            ? `Server: ${String(isServerUp)} • DB enabled: ${String(
                result.db?.enabled
              )} • DB connected: ${String(result.db?.connected)}`
            : "Server: false • DB enabled: false • DB connected: false"}
        </div>
        <div className="nf__btnWrap">
          <button type="button" className="nf__btn" onClick={loadStatus}>
            Recheck
          </button>
        </div>
      </section>
    </main>
  );
};

export default CheckPage;
