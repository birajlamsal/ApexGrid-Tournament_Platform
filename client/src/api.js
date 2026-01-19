const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
};

export const fetchFeaturedTournaments = () =>
  fetch("/api/featured-tournaments").then(handleResponse);

export const fetchTournaments = (params = {}) => {
  const search = new URLSearchParams(params);
  return fetch(`/api/tournaments?${search.toString()}`).then(handleResponse);
};

export const fetchTournament = (id) =>
  fetch(`/api/tournaments/${id}`).then(handleResponse);

export const fetchTournamentLive = (id, params = {}) => {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return fetch(`/api/tournaments/${id}/live${suffix}`).then(handleResponse);
};

export const fetchMatches = () => fetch("/api/matches").then(handleResponse);

export const fetchTeamStats = () => fetch("/api/team-stats").then(handleResponse);

export const fetchPlayerStats = () =>
  fetch("/api/player-stats").then(handleResponse);

export const fetchWinners = () => fetch("/api/winners").then(handleResponse);

export const fetchAnnouncements = () =>
  fetch("/api/announcements").then(handleResponse);

export const fetchUpcomingMatches = () =>
  fetch("/api/upcoming-matches").then(handleResponse);

export const fetchPlayers = () => fetch("/api/players").then(handleResponse);

export const fetchTeams = () => fetch("/api/teams").then(handleResponse);

const withAuth = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

export const adminLogin = (payload) =>
  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminFetchTournaments = (token) =>
  fetch("/api/admin/tournaments", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateTournament = (token, payload) =>
  fetch("/api/admin/tournaments", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateTournament = (token, id, payload) =>
  fetch(`/api/admin/tournaments/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteTournament = (token, id) =>
  fetch(`/api/admin/tournaments/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchPlayers = (token) =>
  fetch("/api/admin/players", { headers: withAuth(token) }).then(handleResponse);

export const adminCreatePlayer = (token, payload) =>
  fetch("/api/admin/players", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdatePlayer = (token, id, payload) =>
  fetch(`/api/admin/players/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeletePlayer = (token, id) =>
  fetch(`/api/admin/players/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchTeams = (token) =>
  fetch("/api/admin/teams", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateTeam = (token, payload) =>
  fetch("/api/admin/teams", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateTeam = (token, id, payload) =>
  fetch(`/api/admin/teams/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteTeam = (token, id) =>
  fetch(`/api/admin/teams/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchParticipants = (token) =>
  fetch("/api/admin/participants", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateParticipant = (token, payload) =>
  fetch("/api/admin/participants", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateParticipant = (token, id, payload) =>
  fetch(`/api/admin/participants/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteParticipant = (token, id) =>
  fetch(`/api/admin/participants/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });

export const adminFetchAnnouncements = (token) =>
  fetch("/api/admin/announcements", { headers: withAuth(token) }).then(handleResponse);

export const adminCreateAnnouncement = (token, payload) =>
  fetch("/api/admin/announcements", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminUpdateAnnouncement = (token, id, payload) =>
  fetch(`/api/admin/announcements/${id}`, {
    method: "PUT",
    headers: withAuth(token),
    body: JSON.stringify(payload)
  }).then(handleResponse);

export const adminDeleteAnnouncement = (token, id) =>
  fetch(`/api/admin/announcements/${id}`, {
    method: "DELETE",
    headers: withAuth(token)
  });
