import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import gsap from "gsap";
import {
  fetchPlayers,
  fetchTeams,
  fetchTournament,
  fetchTournamentLive,
  fetchWinners
} from "../api";
import useReveal from "../hooks/useReveal";

const TournamentDetailPage = () => {
  useReveal();
  const heroRef = useRef(null);
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [winners, setWinners] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [resultTab, setResultTab] = useState("leaderboard");
  const [leaderboardSort, setLeaderboardSort] = useState({ key: null, dir: null });
  const [matchesSort, setMatchesSort] = useState({ key: null, dir: null });
  const [playerSort, setPlayerSort] = useState({ key: null, dir: null });
  const [teamStatsSort, setTeamStatsSort] = useState({ key: null, dir: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [
          tournamentData,
          winnersData,
          playersData,
          teamsData
        ] =
          await Promise.all([
            fetchTournament(id),
            fetchWinners(),
            fetchPlayers(),
            fetchTeams()
          ]);
        setTournament(tournamentData);
        setWinners(winnersData);
        setPlayers(playersData);
        setTeams(teamsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadLive = async () => {
      if (!tournament) {
        return;
      }
      if (
        !tournament.api_key_required ||
        (!tournament.pubg_tournament_id && !tournament.custom_match_mode)
      ) {
        setLiveData(null);
        setLiveLoading(false);
        return;
      }
      try {
        setLiveLoading(true);
        const data = await fetchTournamentLive(id);
        setLiveData(data);
      } catch (error) {
        setLiveData(null);
      } finally {
        setLiveLoading(false);
      }
    };
    loadLive();
  }, [id, tournament]);

  useEffect(() => {
    if (!heroRef.current) {
      return;
    }
    const title = heroRef.current.querySelector(".detail-title");
    const desc = heroRef.current.querySelector(".detail-desc");
    const meta = heroRef.current.querySelector(".detail-meta");
    if (!title || !desc || !meta) {
      return;
    }
    const timeline = gsap.timeline();
    timeline
      .fromTo(title, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
      .fromTo(desc, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.3")
      .fromTo(meta, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3");
  }, [tournament]);

  const result = useMemo(() => {
    return winners.find((winner) => winner.tournament_id === id);
  }, [winners, id]);

  const teamStatsSource = liveData?.teamStats || [];
  const playerStatsSource = liveData?.playerStats || [];
  const matchesSource = liveData?.matches || [];

  const playerMap = useMemo(() => {
    return new Map(players.map((player) => [player.player_id, player.player_name]));
  }, [players]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((team) => [team.team_id, team.team_name]));
  }, [teams]);

  const sortRows = (rows, sort) => {
    if (!sort.key || !sort.dir) {
      return rows;
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal === bVal) {
        return 0;
      }
      if (aVal === undefined || aVal === null) {
        return 1;
      }
      if (bVal === undefined || bVal === null) {
        return -1;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sort.dir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  };

  const handleSort = (setSortState, key) => {
    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, dir: "asc" };
      }
      if (prev.dir === "asc") {
        return { key, dir: "desc" };
      }
      if (prev.dir === "desc") {
        return { key: null, dir: null };
      }
      return { key, dir: "asc" };
    });
  };

  const normalizedTeamStats = useMemo(() => {
    return teamStatsSource.map((team, index) => ({
      ...team,
      rank: index + 1,
      place_points:
        team.place_points ??
        ((team.total_points ?? 0) - (team.total_kills ?? 0))
    }));
  }, [teamStatsSource]);

  const normalizedMatches = useMemo(() => {
    return matchesSource.map((match) => ({
      ...match,
      match_detail:
        match.match_detail ||
        `${match.game_mode || "Match"} • ${
          match.created_at ? new Date(match.created_at).toLocaleString() : "-"
        }`,
      winner_team_name: match.winner_team_name || match.winner_team_id || "-"
    }));
  }, [matchesSource]);

  const normalizedPlayerStats = useMemo(() => {
    return playerStatsSource.map((player, index) => {
      const matchesPlayed = player.matches_played ?? 0;
      const totalKills = player.total_kills ?? 0;
      const deaths =
        player.deaths ?? (matchesPlayed ? Math.max(1, matchesPlayed) : 0);
      const avgKills =
        player.avg_kills ?? (matchesPlayed ? totalKills / matchesPlayed : 0);
      const avgDeaths =
        player.avg_deaths ?? (matchesPlayed ? deaths / matchesPlayed : 0);
      return {
        ...player,
        rank: index + 1,
        assists: player.assists ?? 0,
        revives: player.revives ?? 0,
        deaths,
        avg_kills: Number(avgKills.toFixed(2)),
        avg_deaths: Number(avgDeaths.toFixed(2))
      };
    });
  }, [playerStatsSource]);

  const sortedTeamStats = useMemo(() => {
    return sortRows(normalizedTeamStats, leaderboardSort);
  }, [normalizedTeamStats, leaderboardSort]);

  const sortedTeamStatsTable = useMemo(() => {
    return sortRows(normalizedTeamStats, teamStatsSort);
  }, [normalizedTeamStats, teamStatsSort]);

  const sortedMatches = useMemo(() => {
    return sortRows(normalizedMatches, matchesSort);
  }, [normalizedMatches, matchesSort]);

  const sortedPlayerStats = useMemo(() => {
    return sortRows(normalizedPlayerStats, playerSort);
  }, [normalizedPlayerStats, playerSort]);

  if (loading) {
    return (
      <main className="detail-page">
        <div className="skeleton-hero" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="detail-page">
        <div className="empty-state">Tournament not found.</div>
      </main>
    );
  }

  return (
    <main className="detail-page">
      <section
        className="detail-hero"
        ref={heroRef}
        style={{ backgroundImage: `url(${tournament.banner_url})` }}
      >
        <div className="detail-overlay" />
        <div className="detail-content">
          <div className="detail-top">
            <span className={`status-badge ${tournament.status}`}>
              {tournament.status}
            </span>
            <span className={`api-pill ${liveData ? "connected" : "manual"}`}>
              {liveData ? "PUBG API Connected" : "Manual Data"}
            </span>
          </div>
          <h1 className="detail-title">{tournament.name}</h1>
          <p className="detail-desc">{tournament.description}</p>
          <div className="detail-meta">
            <MetaCard label="Start Date" value={tournament.start_date || "-"} />
            <MetaCard label="Prize Pool" value={`$${tournament.prize_pool}`} />
            <MetaCard label="Server" value={tournament.region || "-"} />
            <MetaCard label="Perspective" value={tournament.perspective || "TPP"} />
            <MetaCard label="Mode" value={tournament.mode} />
            <MetaCard label="Status" value={tournament.registration_status} />
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-card">
          <h3>Tournament Details</h3>
          <ul>
            <li>Dates: {tournament.start_date} - {tournament.end_date}</li>
            <li>Region: {tournament.region}</li>
            <li>Prize Pool: ${tournament.prize_pool}</li>
            <li>Registration Charge: ${tournament.registration_charge}</li>
            <li>Max Slots: {tournament.max_slots || "-"}</li>
            <li>API Provider: {tournament.api_provider}</li>
          </ul>
        </div>
        <div className="detail-card">
          <h3>Rules</h3>
          <p>{tournament.rules || "Rules will be announced soon."}</p>
          <p className="muted">Contact: {tournament.contact_discord}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="tab-group centered">
            {[
              { id: "overview", label: "Overview" },
              { id: "players", label: "Players" }
            ].map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === "players" && (
        <section className="section">
          <div className="section-header">
            <h2>Players in Tournament</h2>
          </div>
          {tournament.participants?.length ? (
            <div className="participant-groups two-column">
              {getGroupedPlayers(tournament.participants, teamMap, tournament.participants).map(
                ({ teamId, players, slotNumber }) => (
                  <div key={teamId} className="group-card">
                    <div className="group-header">
                      <div>
                        <strong>
                          {teamId === "Unassigned" ? "Unassigned" : teamMap.get(teamId) || teamId}
                        </strong>
                        {slotNumber ? (
                          <span className="muted">Slot #{slotNumber}</span>
                        ) : (
                          <span className="muted">No slot</span>
                        )}
                      </div>
                      <span className="muted">{players.length} players</span>
                    </div>
                    <ul className="participant-list">
                      {players.map((participant) => (
                        <li key={participant.participant_id}>
                          <span className="badge">player</span>
                          <span>{playerMap.get(participant.linked_player_id) || "-"}</span>
                          <span className="muted">{participant.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="empty-state">Player list hidden or empty.</div>
          )}
        </section>
      )}

      {activeTab === "overview" && (
        <>
          <section className="section">
            <div className="section-header">
              <h2>Results</h2>
            </div>
            <div className="stats-card">
              <div className="stats-card-header">
                <div>
                  <h3>
                    {resultTab === "leaderboard"
                      ? "Leaderboard"
                      : resultTab === "matches"
                      ? "Matches"
                      : resultTab === "playerStats"
                      ? "Player Stats"
                      : "Team Stats"}
                  </h3>
                  <span className="muted">
                    {liveData ? "PUBG API" : "Manual"} data
                  </span>
                </div>
                <div className="tab-group">
                  {[
                    { id: "leaderboard", label: "Leaderboard" },
                    { id: "matches", label: "Matches" },
                    { id: "playerStats", label: "Player Stats" },
                    { id: "teamStats", label: "Team Stats" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={resultTab === tab.id ? "active" : ""}
                      onClick={() => setResultTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-wrapper leaderboard-table">
                {resultTab === "leaderboard" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setLeaderboardSort, "rank")}>
                          Rank
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "team_name")}>
                          Team
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "matches_played")}>
                          Matches
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "place_points")}>
                          Place PTS
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "total_kills")}>
                          Kills
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "total_points")}>
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeamStats.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-cell">
                            Leaderboard data will populate from PUBG API.
                          </td>
                        </tr>
                      ) : (
                        sortedTeamStats.map((team, index) => (
                          <tr key={team.team_id || `${team.team_name}-${index}`}>
                            <td>{index + 1}</td>
                            <td>{team.team_name || "-"}</td>
                            <td>{team.matches_played ?? "-"}</td>
                            <td>{team.place_points ?? "-"}</td>
                            <td>{team.total_kills ?? "-"}</td>
                            <td>{team.total_points ?? "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {resultTab === "matches" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setMatchesSort, "match_detail")}>
                          Match Details
                        </th>
                        <th onClick={() => handleSort(setMatchesSort, "map_name")}>
                          Map
                        </th>
                        <th onClick={() => handleSort(setMatchesSort, "winner_team_name")}>
                          Champions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveLoading ? (
                        <tr>
                          <td colSpan="3" className="empty-cell">
                            Loading PUBG matches...
                          </td>
                        </tr>
                      ) : sortedMatches.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="empty-cell">
                            No matches available yet.
                          </td>
                        </tr>
                      ) : (
                        sortedMatches.map((match) => (
                          <tr key={match.match_id}>
                            <td>{match.match_detail}</td>
                            <td>{match.map_name || "-"}</td>
                            <td>{match.winner_team_name || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {resultTab === "playerStats" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setPlayerSort, "rank")}>
                          Rank
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "player_name")}>
                          Player
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "matches_played")}>
                          Matches
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "total_kills")}>
                          Kills
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "assists")}>
                          Assists
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "revives")}>
                          Revives
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "deaths")}>
                          Deaths
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "avg_kills")}>
                          Avg Kills
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "avg_deaths")}>
                          Avg Deaths
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "kd_ratio")}>
                          K/D Ratio
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "total_points")}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveLoading ? (
                        <tr>
                          <td colSpan="11" className="empty-cell">
                            Loading PUBG player stats...
                          </td>
                        </tr>
                      ) : sortedPlayerStats.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="empty-cell">
                            No player stats published for this tournament.
                          </td>
                        </tr>
                      ) : (
                        sortedPlayerStats.map((player, index) => (
                          <tr key={player.player_id || player.player_name}>
                            <td>{index + 1}</td>
                            <td>{player.player_name}</td>
                            <td>{player.matches_played ?? "-"}</td>
                            <td>{player.total_kills ?? "-"}</td>
                            <td>{player.assists ?? "-"}</td>
                            <td>{player.revives ?? "-"}</td>
                            <td>{player.deaths ?? "-"}</td>
                            <td>{player.avg_kills ?? "-"}</td>
                            <td>{player.avg_deaths ?? "-"}</td>
                            <td>{player.kd_ratio ?? "-"}</td>
                            <td>{player.total_points ?? "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {resultTab === "teamStats" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setTeamStatsSort, "rank")}>
                          Rank
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "team_name")}>
                          Team
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "matches_played")}>
                          Matches
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "wins")}>
                          Wins
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "total_kills")}>
                          Kills
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "avg_placement")}>
                          Avg Placement
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "win_rate")}>
                          Win Rate
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "total_points")}>
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveLoading ? (
                        <tr>
                          <td colSpan="8" className="empty-cell">
                            Loading PUBG team stats...
                          </td>
                        </tr>
                      ) : sortedTeamStatsTable.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="empty-cell">
                            No team stats published for this tournament.
                          </td>
                        </tr>
                      ) : (
                        sortedTeamStatsTable.map((team, index) => (
                          <tr key={team.team_id || `${team.team_name}-${index}`}>
                            <td>{index + 1}</td>
                            <td>{team.team_name || "-"}</td>
                            <td>{team.matches_played ?? "-"}</td>
                            <td>{team.wins ?? "-"}</td>
                            <td>{team.total_kills ?? "-"}</td>
                            <td>{team.avg_placement ?? "-"}</td>
                            <td>{team.win_rate ?? "-"}</td>
                            <td>{team.total_points ?? "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2>Winners Spotlight</h2>
            </div>
            {!result && <div className="empty-state">Winners not published yet.</div>}
            {result && (
              <div className="winner-grid">
                <div className="winner-card">
                  <h3>{result.tournament_name}</h3>
                  {result.by_points && (
                    <div className="podium">
                      <PodiumSpot place="2" name={result.by_points.second} />
                      <PodiumSpot place="1" name={result.by_points.first} highlight />
                      <PodiumSpot place="3" name={result.by_points.third} />
                    </div>
                  )}
                  {result.most_kills && (
                    <div className="kills-highlight">
                      <span className="badge">🔥 Most Kills</span>
                      <h4>{result.most_kills.winner}</h4>
                      <p>
                        {result.most_kills.kills} kills over {result.most_kills.matches_played}{" "}
                        matches
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};

const MetaCard = ({ label, value }) => (
  <div className="meta-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const PodiumSpot = ({ place, name, highlight }) => (
  <div className={`podium-spot ${highlight ? "highlight" : ""}`}>
    <span className="podium-rank">#{place}</span>
    <span className="podium-name">{name}</span>
  </div>
);

const getGroupedPlayers = (participants = [], teamMap, allParticipants = []) => {
  const players = participants.filter((participant) => participant.type === "player");
  const teamSlots = new Map(
    allParticipants
      .filter((participant) => participant.type === "team")
      .map((participant) => [participant.linked_team_id, participant.slot_number])
  );
  const groups = new Map();
  players.forEach((participant) => {
    const teamId = participant.notes?.startsWith("team:")
      ? participant.notes.replace("team:", "")
      : "Unassigned";
    if (!groups.has(teamId)) {
      groups.set(teamId, []);
    }
    groups.get(teamId).push(participant);
  });
  return Array.from(groups.entries())
    .map(([teamId, grouped]) => ({
      teamId,
      teamName: teamId === "Unassigned" ? "Unassigned" : teamMap?.get(teamId) || teamId,
      slotNumber: teamSlots.get(teamId) || null,
      players: grouped
    }))
    .sort((a, b) => {
      if (a.slotNumber === null && b.slotNumber === null) {
        return a.teamName.localeCompare(b.teamName);
      }
      if (a.slotNumber === null) {
        return 1;
      }
      if (b.slotNumber === null) {
        return -1;
      }
      return a.slotNumber - b.slotNumber;
    });
};

export default TournamentDetailPage;
