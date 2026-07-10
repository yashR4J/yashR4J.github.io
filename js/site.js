/* Site behaviors — vanilla, dependency-free, no globals. See SPEC Section G. */
(function () {
  "use strict";

  var doc = document.documentElement;
  // G2: mark JS as available as the very first statement (gates .reveal CSS).
  doc.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slice = function (nodes) { return Array.prototype.slice.call(nodes); };

  /* -------------------- G4: theme toggle -------------------- */
  var themeToggle = document.getElementById("theme-toggle");
  function syncThemeToggle(theme) {
    if (!themeToggle) return;
    var dark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
    themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  syncThemeToggle(doc.getAttribute("data-theme"));
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
      doc.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeToggle(next);
    });
  }

  /* -------------------- G3: sticky nav + mobile menu -------------------- */
  var nav = document.getElementById("site-nav");
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");

  // Scrolled shadow (rAF-throttled, passive).
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function openMenu() {
    if (!nav) return;
    nav.classList.add("is-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
    }
  }
  function closeMenu(returnFocus) {
    if (!nav || !nav.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      if (returnFocus) navToggle.focus();
    }
  }
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) closeMenu(false); else openMenu();
    });
  }
  if (navMenu) {
    navMenu.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".site-nav__link")) closeMenu(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) closeMenu(true);
  });
  document.addEventListener("click", function (e) {
    if (nav && nav.classList.contains("is-open") && !nav.contains(e.target)) closeMenu(false);
  });
  var wide = window.matchMedia("(min-width: 768px)");
  function onWide() { if (wide.matches) closeMenu(false); }
  if (wide.addEventListener) wide.addEventListener("change", onWide);
  else if (wide.addListener) wide.addListener(onWide);

  /* -------------------- G1: scroll-spy -------------------- */
  var navLinks = slice(document.querySelectorAll(".site-nav__link"));
  var linkById = {};
  navLinks.forEach(function (link) {
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) === "#") linkById[href.slice(1)] = link;
  });
  function setActive(id) {
    var link = linkById[id];
    if (!link) return; // sections without a nav link keep the last active state
    navLinks.forEach(function (l) {
      l.classList.remove("is-active");
      l.removeAttribute("aria-current");
    });
    link.classList.add("is-active");
    link.setAttribute("aria-current", "true");
  }
  var sections = slice(document.querySelectorAll("#main section[id]"));
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }
  if (window.location.hash) setActive(window.location.hash.slice(1));

  /* -------------------- G2: scroll entrance reveals -------------------- */
  var reveals = slice(document.querySelectorAll(".reveal"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* -------------------- G5: education expand/collapse -------------------- */
  slice(document.querySelectorAll(".education__toggle")).forEach(function (btn) {
    var region = document.getElementById(btn.getAttribute("aria-controls"));
    if (!region) return;
    btn.addEventListener("click", function () {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        btn.setAttribute("aria-expanded", "false");
        region.classList.remove("is-open");
        if (reduceMotion) {
          region.hidden = true;
        } else {
          var done = function (e) {
            if (e.propertyName !== "grid-template-rows") return;
            region.removeEventListener("transitionend", done);
            if (btn.getAttribute("aria-expanded") === "false") region.hidden = true;
          };
          region.addEventListener("transitionend", done);
        }
      } else {
        region.hidden = false;
        void region.offsetHeight; // force reflow so the grid-rows transition runs
        btn.setAttribute("aria-expanded", "true");
        region.classList.add("is-open");
      }
    });
  });

  /* -------------------- G7: print link -------------------- */
  var printLink = document.getElementById("print-link");
  if (printLink) {
    printLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.print();
    });
  }
})();
