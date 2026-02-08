import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import {
  fetchPlayers,
  fetchTeams,
  fetchTournament,
  fetchTournamentLive,
  fetchWinners
} from "../api";
import useReveal from "../hooks/useReveal";

const mapImageByName = {
  Erangel: "/images/maps/Erangel.png",
  Miramar: "/images/maps/Miramar.png",
  Taego: "/images/maps/Taego.png",
  Rondo: "/images/maps/Rondo.png"
};

const TournamentDetailPage = () => {
  useReveal();
  const heroRef = useRef(null);
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabOptions = useMemo(
    () => ["overview", "leaderboards", "matches", "teams", "players"],
    []
  );
  const initialTab = tabOptions.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "overview";
  const [tournament, setTournament] = useState(null);
  const [winners, setWinners] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [resultTab, setResultTab] = useState("leaderboard");
  const [openMatchId, setOpenMatchId] = useState(null);
  const [leaderboardSort, setLeaderboardSort] = useState({
    key: "slot_number",
    dir: "asc"
  });
  const [matchesSort, setMatchesSort] = useState({ key: null, dir: null });
  const [playerSort, setPlayerSort] = useState({
    key: "total_points",
    dir: "desc"
  });
  const [teamStatsSort, setTeamStatsSort] = useState({
    key: "slot_number",
    dir: "asc"
  });
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
    const tab = searchParams.get("tab");
    if (tabOptions.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, tabOptions, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const loadLive = async () => {
      if (!tournament) {
        return;
      }
      if (!tournament.pubg_tournament_id && !tournament.custom_match_mode) {
        setLiveData(null);
        setLiveLoading(false);
        return;
      }
      try {
        setLiveLoading(true);
        const data = await fetchTournamentLive(id, {
          fresh: tournament.custom_match_mode ? "true" : "false"
        });
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
    if (activeTab === "leaderboards") {
      setResultTab("leaderboard");
    } else if (activeTab === "matches") {
      setResultTab("matches");
    } else if (activeTab === "teams") {
      setResultTab("teamStats");
    } else if (activeTab === "players") {
      setResultTab("playerStats");
    }
  }, [activeTab]);

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

  const teamIdNameMap = useMemo(() => {
    const map = new Map();
    const participants = tournament?.participants || [];
    participants
      .filter((participant) => participant.type === "team")
      .forEach((participant) => {
        if (!participant.linked_team_id) {
          return;
        }
        const name =
          teamMap.get(participant.linked_team_id) || participant.linked_team_id || "-";
        map.set(participant.linked_team_id, name);
      });
    return map;
  }, [tournament, teamMap]);

  const slotNameMap = useMemo(() => {
    const map = new Map();
    const participants = tournament?.participants || [];
    participants
      .filter((participant) => participant.type === "team")
      .forEach((participant, index) => {
        const slotKey = participant.slot_number
          ? String(participant.slot_number)
          : String(index + 1);
        const name =
          teamMap.get(participant.linked_team_id) || participant.linked_team_id || "-";
        map.set(slotKey, name);
      });
    return map;
  }, [tournament, teamMap]);

  const manualPointWinners = useMemo(() => {
    if (!result?.by_points) {
      return null;
    }
    const names = [
      result.by_points.first,
      result.by_points.second,
      result.by_points.third
    ].filter(Boolean);
    if (!names.length) {
      return null;
    }
    return names.map((name, index) => ({
      place: index + 1,
      name,
      points: "-",
      kills: "-"
    }));
  }, [result]);

  const sortRows = (rows, sort) => {
    if (!sort.key || !sort.dir) {
      return rows;
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);
      if (aVal === bVal) {
        return 0;
      }
      if (aVal === undefined || aVal === null) {
        return 1;
      }
      if (bVal === undefined || bVal === null) {
        return -1;
      }
      if (bothNumeric) {
        return sort.dir === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sort.dir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  };

  const sortIcon = (sortState, key) => {
    if (sortState.key !== key) {
      return "↕";
    }
    return sortState.dir === "asc" ? "▲" : "▼";
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

  const teamSlotMap = useMemo(() => {
    const map = new Map();
    const participants = tournament?.participants || [];
    const teamsOnly = participants.filter((participant) => participant.type === "team");
    const sorted = [...teamsOnly].sort((a, b) => {
      if (a.slot_number && b.slot_number) {
        return a.slot_number - b.slot_number;
      }
      if (a.slot_number) {
        return -1;
      }
      if (b.slot_number) {
        return 1;
      }
      return String(a.linked_team_id || "").localeCompare(String(b.linked_team_id || ""));
    });
    sorted.forEach((participant, index) => {
      map.set(participant.linked_team_id, index + 1);
    });
    return map;
  }, [tournament]);

  const normalizedTeamStats = useMemo(() => {
    return teamStatsSource.map((team, index) => ({
      ...team,
      slot_number: Number.isFinite(Number(team.team_id))
        ? Number(team.team_id)
        : teamSlotMap.get(String(team.team_id)) || index + 1,
      team_name: (() => {
        const genericName =
          typeof team.team_name === "string" &&
          /^team\s+\d+$/i.test(team.team_name.trim());
        return (
          (genericName ? null : team.team_name) ||
          teamIdNameMap.get(team.team_id) ||
          slotNameMap.get(String(team.team_id)) ||
          `Team ${team.team_id}`
        );
      })(),
      rank: index + 1,
      place_points:
        team.place_points ??
        ((team.total_points ?? 0) - (team.total_kills ?? 0))
    }));
  }, [teamStatsSource, slotNameMap, teamSlotMap, teamIdNameMap]);

  const computedPointWinners = useMemo(() => {
    if (!tournament || tournament.status !== "completed") {
      return null;
    }
    if (!normalizedTeamStats.length) {
      return null;
    }
    const sorted = [...normalizedTeamStats].sort((a, b) => {
      const aPoints = Number(a.total_points || 0);
      const bPoints = Number(b.total_points || 0);
      if (aPoints === bPoints) {
        return Number(b.total_kills || 0) - Number(a.total_kills || 0);
      }
      return bPoints - aPoints;
    });
    return sorted.slice(0, 3).map((team, index) => ({
      place: index + 1,
      name: team.team_name || "-",
      points: team?.total_points ?? "-",
      kills: team?.total_kills ?? "-"
    }));
  }, [normalizedTeamStats, tournament]);

  const winnerList = computedPointWinners || manualPointWinners;

  const normalizedMatches = useMemo(() => {
    return matchesSource.map((match) => ({
      ...match,
      match_detail:
        match.match_detail ||
        `${match.game_mode || "Match"} • ${
          match.created_at ? new Date(match.created_at).toLocaleString() : "-"
        }`,
      winner_team_name:
        slotNameMap.get(String(match.winner_team_id)) ||
        match.winner_team_name ||
        match.winner_team_id ||
        "-"
    }));
  }, [matchesSource, slotNameMap]);

  const normalizedPlayerStats = useMemo(() => {
    return playerStatsSource.map((player, index) => {
      const matchesPlayed = player.matches_played ?? 0;
      const totalKills = player.total_kills ?? 0;
      const deaths = Number.isFinite(player.deaths) ? player.deaths : null;
      const avgKills =
        player.avg_kills ?? (matchesPlayed ? totalKills / matchesPlayed : 0);
      const avgDeaths =
        player.avg_deaths ??
        (matchesPlayed && deaths !== null ? deaths / matchesPlayed : null);
      return {
        ...player,
        rank: index + 1,
        assists: player.assists ?? 0,
        revives: player.revives ?? 0,
        deaths,
        avg_kills: Number(avgKills.toFixed(2)),
        avg_deaths: avgDeaths === null ? null : Number(avgDeaths.toFixed(2))
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
    return [...normalizedMatches].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  }, [normalizedMatches]);

  const sortedPlayerStats = useMemo(() => {
    return sortRows(normalizedPlayerStats, playerSort);
  }, [normalizedPlayerStats, playerSort]);

  const teamCount = useMemo(() => {
    const participantTeams =
      tournament?.participants?.filter((participant) => participant.type === "team") || [];
    return normalizedTeamStats.length || participantTeams.length || 0;
  }, [tournament, normalizedTeamStats]);

  const playerCount = useMemo(() => {
    const participantPlayers =
      tournament?.participants?.filter((participant) => participant.type === "player") || [];
    return normalizedPlayerStats.length || participantPlayers.length || 0;
  }, [tournament, normalizedPlayerStats]);

  const matchCount = normalizedMatches.length;

  const teamParticipants = useMemo(() => {
    return tournament?.participants?.filter((participant) => participant.type === "team") || [];
  }, [tournament]);

  const tierLabel = useMemo(() => {
    const tier = String(tournament?.tier || "").toUpperCase();
    if (tier) {
      return `${tier} Tier`;
    }
    const prize = Number(tournament?.prize_pool || 0);
    if (prize >= 1000) {
      return "S Tier";
    }
    if (prize >= 500) {
      return "A Tier";
    }
    if (prize >= 200) {
      return "B Tier";
    }
    return "C Tier";
  }, [tournament]);

  const resultTitle =
    resultTab === "leaderboard"
      ? "Leaderboards"
      : resultTab === "matches"
      ? "Matches"
      : resultTab === "playerStats"
      ? "Player Stats"
      : "Team Stats";

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
        style={
          tournament.banner_url
            ? { backgroundImage: `url(${tournament.banner_url})` }
            : undefined
        }
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
          <div className="detail-hero-grid">
            <div className="detail-hero-info">
              <h1 className="detail-title">{tournament.name}</h1>
              <p className="detail-desc">
                {tournament.description || "Match-ready competition with verified stats."}
              </p>
              <div className="detail-tags">
                <span className="chip">{tierLabel}</span>
                <span className="chip">{tournament.region || "Global"}</span>
                <span className="chip">{tournament.mode || "Squad"}</span>
                <span className="chip">{tournament.perspective || "TPP"}</span>
              </div>
              <div className="detail-meta">
                <MetaCard label="Dates" value={`${tournament.start_date || "-"} • ${tournament.end_date || "-"}`} />
                <MetaCard label="Prize Pool" value={`$${tournament.prize_pool}`} />
                <MetaCard label="Registration" value={tournament.registration_status} />
                <MetaCard label="Server" value={tournament.region || "-"} />
              </div>
            </div>
            <div className="detail-hero-stats">
              <StatTile label="Teams" value={teamCount || "-"} />
              <StatTile label="Matches" value={matchCount || "-"} />
              <StatTile label="Players" value={playerCount || "-"} />
              <StatTile label="Status" value={tournament.status} />
            </div>
          </div>
        </div>
      </section>

      <section className="section tab-section sticky-tabs">
        <div className="tab-group centered">
          {[
            { id: "overview", label: "Overview" },
            { id: "leaderboards", label: "Leaderboards" },
            { id: "matches", label: "Matches" },
            { id: "teams", label: "Teams" },
            { id: "players", label: "Players" }
          ].map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "overview" && (
        <>
          <section className="detail-grid">
            <div className="detail-card">
              <h3>Tournament Details</h3>
              <ul>
                <li>End Date: {tournament.end_date || "-"}</li>
                <li>Registration Charge: ${tournament.registration_charge}</li>
                <li>Max Slots: {tournament.max_slots || "-"}</li>
                <li>API Provider: {tournament.api_provider}</li>
              </ul>
            </div>
            <div className="detail-card">
              <h3>Rules</h3>
              {tournament.rules ? (
                <ul className="rules-list">
                  {extractRules(tournament.rules).map((rule, index) => {
                    const parsed = parseRuleLink(rule);
                    return (
                      <li key={`${rule}-${index}`}>
                        {parsed.url ? (
                          <a href={parsed.url} target="_blank" rel="noreferrer">
                            {parsed.text}
                          </a>
                        ) : (
                          parsed.text
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Rules will be announced soon.</p>
              )}
              <p className="muted">Contact: {tournament.contact_discord}</p>
            </div>
          </section>

          {tournament.status === "completed" && (
            <section className="section">
              <div className="section-header">
                <h2>Winners Spotlight</h2>
              </div>
              {!result && !winnerList && (
                <div className="empty-state">Winners not published yet.</div>
              )}
              {winnerList && (
                <div className="winner-spotlight">
                  <div className="winner-spotlight__header">
                    <span className="winner-spotlight__kicker">Final standings</span>
                    <h3>{result?.tournament_name || tournament?.name || "Tournament"}</h3>
                  </div>
                  <div className="winner-spotlight__rows">
                    {winnerList.map((winner) => (
                      <div
                        key={`${winner.place}-${winner.name}`}
                        className={`winner-row winner-row--${winner.place}`}
                      >
                        <div className="winner-row__place">
                          <span className="place-number">{winner.place}</span>
                          <span className="place-label">Place</span>
                        </div>
                        <div className="winner-row__title">
                          <strong>{winner.name}</strong>
                        </div>
                        <div className="winner-row__stats">
                          <div>
                            <span>Points</span>
                            <strong>{winner.points}</strong>
                          </div>
                          <div>
                            <span>Kills</span>
                            <strong>{winner.kills}</strong>
                          </div>
                        </div>
                        <div className="winner-row__accent" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                  {result?.most_kills && (
                    <div className="kills-highlight">
                      <span className="badge">🔥 Most Kills</span>
                      <h4>{result.most_kills.winner}</h4>
                      <p>
                        {result.most_kills.kills} kills over{" "}
                        {result.most_kills.matches_played} matches
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

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
                      <div className="group-title">
                        <strong className="team-name">
                          {teamId === "Unassigned" ? "Unassigned" : teamMap.get(teamId) || teamId}
                        </strong>
                      </div>
                      {slotNumber ? (
                        <span className="muted team-slot">Slot #{slotNumber}</span>
                      ) : (
                        <span className="muted team-slot">No slot</span>
                      )}
                      <span className="muted">{players.length} players</span>
                    </div>
                    <ul className="participant-list">
                      {players.map((participant) => (
                        <li key={participant.participant_id}>
                          <span className="badge">player</span>
                          <span>{playerMap.get(participant.linked_player_id) || "-"}</span>
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

      {activeTab === "teams" && (
        <section className="section">
          <div className="section-header">
            <h2>Teams in Tournament</h2>
          </div>
          {teamParticipants.length ? (
            <div className="team-grid">
              {teamParticipants.map((participant, index) => (
                <div key={participant.participant_id} className="team-card">
                  <div className="team-card__header">
                    <span className="badge">Team</span>
                    <span className="muted">
                      Slot {participant.slot_number || index + 1}
                    </span>
                  </div>
                  <h3>
                    {teamMap.get(participant.linked_team_id) ||
                      participant.linked_team_id ||
                      `Team ${index + 1}`}
                  </h3>
                  <div className="team-card__meta">
                    <span>Status: {participant.status || "-"}</span>
                    <span>Payment: {participant.payment_status || "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Team list hidden or empty.</div>
          )}
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2>{activeTab === "overview" ? "Results" : resultTitle}</h2>
        </div>
        <div
          className="stats-card"
          data-mode={activeTab === "overview" ? "overview" : "single"}
        >
          <div className="stats-card-header">
            <div>
              <h3>{resultTitle}</h3>
              <span className="muted">{liveData ? "PUBG API" : "Manual"} data</span>
            </div>
            {activeTab === "overview" && (
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
            )}
          </div>
          <div className="table-wrapper leaderboard-table">
                {resultTab === "leaderboard" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setLeaderboardSort, "slot_number")}>
                          Slot Number{" "}
                          <span className="sort-icon">
                            {sortIcon(leaderboardSort, "slot_number")}
                          </span>
                        </th>
                        <th>Team</th>
                        <th>Matches</th>
                        <th onClick={() => handleSort(setLeaderboardSort, "place_points")}>
                          Place PTS{" "}
                          <span className="sort-icon">
                            {sortIcon(leaderboardSort, "place_points")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "total_kills")}>
                          Kills{" "}
                          <span className="sort-icon">
                            {sortIcon(leaderboardSort, "total_kills")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setLeaderboardSort, "total_points")}>
                          Total Points{" "}
                          <span className="sort-icon">
                            {sortIcon(leaderboardSort, "total_points")}
                          </span>
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
                            <td>{team.slot_number || index + 1}</td>
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
                  <div className="match-results">
                    {liveLoading ? (
                      <div className="empty-cell">Loading PUBG matches...</div>
                    ) : sortedMatches.length === 0 ? (
                      <div className="empty-cell">No matches available yet.</div>
                    ) : (
                      sortedMatches.map((match, index) => (
                        <div className="result-match-card" key={match.match_id}>
                          <div className="match-row">
                            <button
                              type="button"
                              className="match-toggle"
                              aria-expanded={openMatchId === match.match_id}
                              aria-controls={`match-details-${match.match_id}`}
                              onClick={() =>
                                setOpenMatchId((current) =>
                                  current === match.match_id ? null : match.match_id
                                )
                              }
                            >
                              <span className="match-toggle-icon">›</span>
                            </button>
                            <h4>Match {index + 1}</h4>
                            <div className="match-center">
                              <span className="match-winner">
                                {match.winner_team_name || "-"}
                              </span>
                            </div>
                            <div className="match-right">
                              <div
                                className="map-box"
                                aria-hidden="true"
                                style={
                                  mapImageByName[match.map_name]
                                    ? { backgroundImage: `url(${mapImageByName[match.map_name]})` }
                                    : undefined
                                }
                              >
                                <span className="map-name">{match.map_name || "-"}</span>
                              </div>
                            </div>
                          </div>
                          <div
                            id={`match-details-${match.match_id}`}
                            className="match-dropdown-content"
                            data-open={openMatchId === match.match_id}
                          >
                            <div>
                              <span>Match ID</span>
                              <strong>{match.match_id}</strong>
                            </div>
                            <div>
                              <span>Map</span>
                              <strong>{match.map_name || "-"}</strong>
                            </div>
                            <div>
                              <span>Mode</span>
                              <strong>{match.game_mode || "-"}</strong>
                            </div>
                            <div>
                              <span>Created</span>
                              <strong>
                                {match.created_at
                                  ? new Date(match.created_at).toLocaleString()
                                  : "-"}
                              </strong>
                            </div>
                            <div>
                              <span>Winner</span>
                              <strong>{match.winner_team_name || "-"}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {resultTab === "playerStats" && (
                  <table className="stats-table leaderboard">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Matches</th>
                        <th onClick={() => handleSort(setPlayerSort, "total_kills")}>
                          Kills{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "total_kills")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "assists")}>
                          Assists{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "assists")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "revives")}>
                          Revives{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "revives")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "deaths")}>
                          Deaths{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "deaths")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "avg_kills")}>
                          Avg Kills{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "avg_kills")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "avg_deaths")}>
                          Avg Deaths{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "avg_deaths")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "kd_ratio")}>
                          K/D Ratio{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "kd_ratio")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setPlayerSort, "total_points")}>
                          Total{" "}
                          <span className="sort-icon">
                            {sortIcon(playerSort, "total_points")}
                          </span>
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
                            <td>{player.deaths ?? "Cannot determine"}</td>
                            <td>{player.avg_kills ?? "-"}</td>
                            <td>{player.avg_deaths ?? "Cannot determine"}</td>
                            <td>{player.kd_ratio ?? "-"}</td>
                            <td>{player.total_points ?? "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {resultTab === "teamStats" && (
                  <table className="stats-table leaderboard team-stats-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort(setTeamStatsSort, "slot_number")}>
                          Slot Number{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "slot_number")}
                          </span>
                        </th>
                        <th>Team</th>
                        <th>Matches</th>
                        <th onClick={() => handleSort(setTeamStatsSort, "wins")}>
                          Wins{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "wins")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "total_kills")}>
                          Kills{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "total_kills")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "avg_placement")}>
                          Avg Placement{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "avg_placement")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "win_rate")}>
                          Win Rate{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "win_rate")}
                          </span>
                        </th>
                        <th onClick={() => handleSort(setTeamStatsSort, "total_points")}>
                          Total Points{" "}
                          <span className="sort-icon">
                            {sortIcon(teamStatsSort, "total_points")}
                          </span>
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
                            <td>{team.slot_number || index + 1}</td>
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
    </main>
  );
};

const MetaCard = ({ label, value }) => (
  <div className="meta-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const StatTile = ({ label, value }) => (
  <div className="stat-tile">
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

const extractRules = (value) => {
  if (!value) {
    return [];
  }
  const raw = String(value);
  const parts = raw
    .split(/\r?\n|;+/)
    .map((item) => item.replace(/^[\-\*\u2022]\s*/, "").trim())
    .filter(Boolean);
  return parts.length ? parts : [raw.trim()];
};

const parseRuleLink = (text) => {
  const urlMatch = text.match(/https?:\/\/\S+/);
  if (!urlMatch) {
    return { text, url: null };
  }
  const url = urlMatch[0];
  const label = text.replace(url, "").trim() || url;
  return { text: label, url };
};

const getGroupedPlayers = (participants = [], teamMap, allParticipants = []) => {
  const players = participants.filter((participant) => participant.type === "player");
  const teamParticipants = allParticipants.filter(
    (participant) => participant.type === "team"
  );
  const slotToTeamId = new Map();
  const teamSlots = new Map();
  teamParticipants.forEach((participant) => {
    if (participant.slot_number) {
      slotToTeamId.set(String(participant.slot_number), participant.linked_team_id || null);
    }
    if (participant.linked_team_id) {
      teamSlots.set(participant.linked_team_id, participant.slot_number || null);
    }
  });

  const groups = new Map();
  players.forEach((participant) => {
    const raw = participant.notes?.startsWith("team:")
      ? participant.notes.replace("team:", "")
      : "Unassigned";
    const resolvedTeamId = slotToTeamId.get(raw) || raw;
    if (!groups.has(resolvedTeamId)) {
      groups.set(resolvedTeamId, []);
    }
    groups.get(resolvedTeamId).push(participant);
  });

  return Array.from(groups.entries())
    .map(([teamId, grouped]) => ({
      teamId,
      teamName:
        teamId === "Unassigned" ? "Unassigned" : teamMap?.get(teamId) || teamId,
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
