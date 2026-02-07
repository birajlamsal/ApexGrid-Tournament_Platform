import { useEffect } from "react";
import { badgeClass, badgeText, games } from "../data/games";

const LandPage = () => {
  useEffect(() => {
    document.body.classList.add("land-body");
    const themeGlow = document.getElementById("themeGlow");
    if (!themeGlow) {
      return;
    }

    let hoverTimeout = null;

    const setTheme = (glow, accent) => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      hoverTimeout = setTimeout(() => {
        themeGlow.style.background = `linear-gradient(120deg, ${glow} 0%, transparent 55%), linear-gradient(300deg, ${glow} 0%, transparent 60%)`;
        themeGlow.style.opacity = "1";
        document.documentElement.style.setProperty("--accent", accent);
      }, 120);
    };

    const clearTheme = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      themeGlow.style.opacity = "0";
    };

    const cards = Array.from(document.querySelectorAll("[data-accent]"));
    const handlers = cards.map((card) => {
      const onEnter = () => setTheme(card.dataset.glow, card.dataset.accent);
      const onLeave = () => clearTheme();
      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
      return { card, onEnter, onLeave };
    });

    return () => {
      document.body.classList.remove("land-body");
      handlers.forEach(({ card, onEnter, onLeave }) => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  const handleClick = (event, isActive) => {
    if (!isActive) {
      event.preventDefault();
    }
  };

  return (
    <div className="land-page">
      <div
        id="themeGlow"
        className="land-page__glow"
        aria-hidden="true"
      />
      <main className="land-page__content">
        <div className="land-page__intro">
          <h1>Choose your game</h1>
          <p>
            Select a game to manage tournaments. Live games open; others show
            progress.
          </p>
        </div>

        <section className="land-grid">
          {games.map((game) => {
            const isActive = game.status === "live";
            return (
              <a
                key={game.id}
                href={isActive ? game.href : "#"}
                data-accent={game.theme.accent}
                data-glow={game.theme.glow}
                data-active={isActive ? "1" : "0"}
                className={`land-card-image ${isActive ? "is-active" : "is-disabled"}`}
                onClick={(event) => handleClick(event, isActive)}
              >
                <span className={`land-badge land-badge--banner ${badgeClass(game.status)}`}>
                  {badgeText(game.status)}
                </span>
                <img
                  className="land-card__logo-full"
                  src={game.logo}
                  alt={`${game.name} logo`}
                  loading="lazy"
                />
                <div className="land-card__footer">
                  <span>{game.name}</span>
                </div>
              </a>
            );
          })}
        </section>

        <div className="land-page__cta">
          <button type="button" className="land-cta-button btn-142">
            <span>More games coming soon</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default LandPage;
