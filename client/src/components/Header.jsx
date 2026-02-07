import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";

const GAMES = [
  { id: "pubg", label: "PUBG", icon: "/logo/PUBG_PC_LOGO.png" },
  { id: "valorant", label: "VALORANT" },
  { id: "cs2", label: "CS2" },
  { id: "apex", label: "APEX" }
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!buttonRef.current) {
        return;
      }
      const menu = document.querySelector(".game-switcher__menu");
      if (
        buttonRef.current.contains(event.target) ||
        (menu && menu.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return;
    }
    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <header className="twire-header">
      <div className="twire-header__inner">
        <div className="twire-brand">
          <img
            className="twire-brand__icon"
            src="/logo/noBG_Logo.png"
            alt="ApexGrid logo"
          />
          <div className="twire-brand__text">
            <span className="twire-brand__name">APEXGRID</span>
            <span className="twire-brand__tagline">Tournament Hub</span>
          </div>
        </div>

        <>
          <button
            className="game-switcher__button"
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={onKeyDown}
            ref={buttonRef}
          >
            <img
              className="game-switcher__logo"
              src="/logo/PUBG_PC_LOGO.png"
              alt="PUBG"
            />
            <ChevronDown className="game-switcher__chevron" />
          </button>
          {isOpen && (
            <div
              className="game-switcher__menu"
              role="menu"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="game-switcher__item"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="game-switcher__item-icon">
                    {game.icon ? <img src={game.icon} alt="" /> : game.label[0]}
                  </span>
                  <span>{game.label}</span>
                </button>
              ))}
            </div>
          )}
        </>

        <div className="twire-search">
          <Search className="twire-icon" />
          <input placeholder="Search tournaments, teams..." />
        </div>

        <a className="twire-contact" href="/contact">
          Contact us
        </a>

        <button className="twire-lang" type="button" aria-label="Language">
          EN
        </button>
      </div>
    </header>
  );
};

export default Header;
