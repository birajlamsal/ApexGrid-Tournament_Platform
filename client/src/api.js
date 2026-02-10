const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
const apiFetch = (path, options) => fetch(apiUrl(path), options);

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
};

export const fetchFeaturedTournaments = () =>
  apiFetch("/api/featured-tournaments").then(handleResponse);

export const fetchTournaments = (params = {}) => {
  const search = new URLSearchParams(params);
  return apiFetch(`/api/tournaments?${search.toString()}`).then(handleResponse);
};

export const fetchTournament = (id) =>
  apiFetch(`/api/tournaments/${id}`).then(handleResponse);

export const fetchTournamentLive = (id, params = {}) => {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch(`/api/tournaments/${id}/live${suffix}`).then(handleResponse);
};

export const fetchScrims = (params = {}) => {
  const search = new URLSearchParams(params);
  return apiFetch(`/api/scrims?${search.toString()}`).then(handleResponse);
};

export const fetchScrim = (id) => apiFetch(`/api/scrims/${id}`).then(handleResponse);

export const fetchScrimLive = (id, params = {}) => {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch(`/api/scrims/${id}/live${suffix}`).then(handleResponse);
};

export const fetchMatches = () => apiFetch("/api/matches").then(handleResponse);

export const fetchTeamStats = () => apiFetch("/api/team-stats").then(handleResponse);

export const fetchPlayerStats = () =>
  apiFetch("/api/player-stats").then(handleResponse);

export const fetchWinners = () => apiFetch("/api/winners").then(handleResponse);

export const fetchAnnouncements = () =>
  apiFetch("/api/announcements").then(handleResponse);

export const fetchUpcomingMatches = () =>
  apiFetch("/api/upcoming-matches").then(handleResponse);

export const fetchPlayers = () => apiFetch("/api/players").then(handleResponse);

export const fetchTeams = () => apiFetch("/api/teams").then(handleResponse);

const withAuth = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

export const adminLogin = (payload) =>
  apiFetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminFetchTournaments = (token) =>
  apiFetch("/api/admin/tournaments", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateTournament = (token, payload) =>
  apiFetch("/api/admin/tournaments", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateTournament = (token, id, payload) =>
  apiFetch(`/api/admin/tournaments/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteTournament = (token, id) =>
  apiFetch(`/api/admin/tournaments/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchScrims = (token) =>
  apiFetch("/api/admin/scrims", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateScrim = (token, payload) =>
  apiFetch("/api/admin/scrims", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateScrim = (token, id, payload) =>
  apiFetch(`/api/admin/scrims/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteScrim = (token, id) =>
  apiFetch(`/api/admin/scrims/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchPlayers = (token) =>
  apiFetch("/api/admin/players", { headers: withAuth(token) }).then(handleResponse);

export const adminCreatePlayer = (token, payload) =>
  apiFetch("/api/admin/players", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdatePlayer = (token, id, payload) =>
  apiFetch(`/api/admin/players/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeletePlayer = (token, id) =>
  apiFetch(`/api/admin/players/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchTeams = (token) =>
  apiFetch("/api/admin/teams", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateTeam = (token, payload) =>
  apiFetch("/api/admin/teams", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateTeam = (token, id, payload) =>
  apiFetch(`/api/admin/teams/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteTeam = (token, id) =>
  apiFetch(`/api/admin/teams/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchParticipants = (token) =>
  apiFetch("/api/admin/participants", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateParticipant = (token, payload) =>
  apiFetch("/api/admin/participants", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateParticipant = (token, id, payload) =>
  apiFetch(`/api/admin/participants/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteParticipant = (token, id) =>
  apiFetch(`/api/admin/participants/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchAnnouncements = (token) =>
  apiFetch("/api/admin/announcements", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateAnnouncement = (token, payload) =>
  apiFetch("/api/admin/announcements", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateAnnouncement = (token, id, payload) =>
  apiFetch(`/api/admin/announcements/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteAnnouncement = (token, id) =>
  apiFetch(`/api/admin/announcements/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });
