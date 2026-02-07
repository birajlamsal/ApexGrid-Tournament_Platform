export const games = [
  {
    id: "pubg",
    name: "PUBG PC",
    href: "/pubg",
    status: "live",
    logo: "/logos/pubg.png",
    theme: {
      accent: "#F2A900",
      glow: "rgba(242,169,0,0.35)"
    }
  },
  {
    id: "valorant",
    name: "Valorant",
    href: "/valorant",
    status: "soon",
    logo: "/logos/valorant.png",
    theme: { accent: "#FF4655", glow: "rgba(255,70,85,0.35)" }
  },
  {
    id: "cs2",
    name: "CS2",
    href: "/cs2",
    status: "dev",
    logo: "/logos/cs2.png",
    theme: { accent: "#FF6A00", glow: "rgba(255,106,0,0.35)" }
  },
  {
    id: "cs2faceit",
    name: "CS2 Faceit",
    href: "/cs2-faceit",
    status: "soon",
    logo: "/logos/faceit.png",
    theme: { accent: "#FF5500", glow: "rgba(255,85,0,0.35)" }
  },
  {
    id: "fortnite",
    name: "Fortnite",
    href: "/fortnite",
    status: "soon",
    logo: "/logos/fortnite.png",
    theme: { accent: "#00B3FF", glow: "rgba(0,179,255,0.35)" }
  }
  ,
  {
    id: "dota2",
    name: "Dota 2",
    href: "/dota2",
    status: "soon",
    logo: "/logos/dota2.png",
    theme: { accent: "#E74C3C", glow: "rgba(231,76,60,0.35)" }
  }
];

export const badgeText = (status) => {
  if (status === "live") return "LIVE";
  if (status === "soon") return "COMING SOON";
  if (status === "dev") return "IN DEVELOPMENT";
  return "FIXING";
};

export const badgeClass = (status) => {
  if (status === "live") return "badge-live";
  if (status === "soon") return "badge-soon";
  if (status === "dev") return "badge-dev";
  return "badge-fixing";
};
