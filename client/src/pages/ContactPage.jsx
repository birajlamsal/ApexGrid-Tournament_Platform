import { useEffect, useRef } from "react";
import gsap from "gsap";
import useReveal from "../hooks/useReveal";

const CONTACT_EMAIL = "birajlamsal04@gmail.com";
const DISCORD_INVITE = "https://discord.gg/SNUaRtxsXz";

const ContactPage = () => {
  useReveal();
  const heroRef = useRef(null);
  const formRef = useRef(null);
  const cardRefs = useRef([]);

  const setCardRef = (el) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  useEffect(() => {
    if (!heroRef.current) {
      return;
    }
    const timeline = gsap.timeline();
    timeline
      .fromTo(
        heroRef.current.querySelector(".contact-kicker"),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      )
      .fromTo(
        heroRef.current.querySelector(".contact-title"),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
        "-=0.2"
      )
      .fromTo(
        heroRef.current.querySelector(".contact-subtitle"),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.35"
      );
  }, []);

  useEffect(() => {
    if (!formRef.current) {
      return;
    }
    gsap.fromTo(
      formRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.2 }
    );
  }, []);

  useEffect(() => {
    if (!cardRefs.current.length) {
      return;
    }
    gsap.fromTo(
      cardRefs.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: "power3.out", delay: 0.3 }
    );
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const subjectInput = formData.get("subject")?.toString().trim();
    const message = formData.get("message")?.toString().trim();

    const subject = encodeURIComponent(subjectInput || "PUBG Tournament Inquiry");
    const body = encodeURIComponent(
      `Name: ${name || "-"}\nEmail: ${email || "-"}\n\n${message || ""}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="contact-page">
      <section className="contact-hero" ref={heroRef}>
        <div className="contact-orb orb-one" />
        <div className="contact-orb orb-two" />
        <div className="contact-gridlines" />
        <div className="contact-hero-content">
          <div className="contact-hero-text">
            <span className="contact-kicker">Contact Us</span>
            <h1 className="contact-title">Build the next PUBG showdown with us.</h1>
            <p className="contact-subtitle">
              Share your tournament plans, sponsorship ideas, or community needs. We will help
              shape the brackets, verify rosters, and keep the action visible.
            </p>
            <div className="contact-highlight-grid">
              <div className="contact-highlight-card" ref={setCardRef}>
                <h3>Fast responses</h3>
                <p>We aim to reply within 24 hours for scheduling and partner requests.</p>
              </div>
              <div className="contact-highlight-card" ref={setCardRef}>
                <h3>Verified rosters</h3>
                <p>Every entry is checked before we publish team standings and stats.</p>
              </div>
              <div className="contact-highlight-card" ref={setCardRef}>
                <h3>API-ready workflows</h3>
                <p>Bring a PUBG API key and we will wire up live stats for your event.</p>
              </div>
            </div>
          </div>

          <div className="contact-form-panel reveal" ref={formRef}>
            <h2>Send a message</h2>
            <p className="muted">
              This form opens your email client and sends directly to{" "}
              <strong>{CONTACT_EMAIL}</strong>.
            </p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label>
                  Name
                  <input type="text" name="name" placeholder="Enter your name" />
                </label>
                <label>
                  Email
                  <input type="email" name="email" placeholder="you@email.com" required />
                </label>
              </div>
              <label>
                Subject
                <input type="text" name="subject" placeholder="Tournament partnership" />
              </label>
              <label>
                Message
                <textarea name="message" rows="6" placeholder="Tell us about your tournament..." />
              </label>
              <button type="submit" className="cta-button contact-submit">
                Send Message
              </button>
            </form>
            <div className="contact-links">
              <a href={`mailto:${CONTACT_EMAIL}`} className="ghost-link">
                Email directly
              </a>
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="ghost-link">
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section reveal contact-section">
        <div className="contact-support">
          <div className="support-card">
            <h3>Discord command center</h3>
            <p>Get real-time answers, roster help, and announcement approvals.</p>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="cta-button">
              Join the server
            </a>
          </div>
          <div className="support-card glow">
            <h3>Direct email</h3>
            <p>For sponsorships and production requests, email us any time.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="cta-button">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="support-card">
            <h3>Operations notes</h3>
            <p>Include your region, tournament ID, and preferred schedule window.</p>
            <span className="badge">Fast track</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
