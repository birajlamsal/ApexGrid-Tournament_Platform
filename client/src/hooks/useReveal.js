import { useEffect } from "react";

const useReveal = (selector = ".reveal") => {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) {
      return undefined;
    }
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    elements.forEach((element) => {
      observer.observe(element);
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.classList.add("is-visible");
      }
    });

    return () => observer.disconnect();
  }, [selector]);
};

export default useReveal;
