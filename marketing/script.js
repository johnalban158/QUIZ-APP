/* == Quiz App marketing page — interactions =============================
   Dependency-free. Handles:
   - reveal-on-scroll (IntersectionObserver)
   - animated stat counters
   - APK install dialog + LAN URL open/copy
   - copy-to-clipboard helpers
   ===================================================================== */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  /* ---------- Animated stat counters ---------- */
  var stats = document.querySelectorAll(".stat-num");
  function animateStats() {
    stats.forEach(function (el) {
      var target = parseInt(el.getAttribute("data-target"), 10) || 0;
      var done = el.getAttribute("data-done");
      if (done) return;
      el.setAttribute("data-done", "1");
      if (reducedMotion) {
        el.textContent = target;
        return;
      }
      var start = performance.now();
      var duration = 1100;
      function tick(now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  var statsWatch = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateStats();
          statsWatch.disconnect();
        }
      });
    },
    { threshold: 0.35 }
  );
  stats.forEach(function (el) {
    statsWatch.observe(el);
  });

  /* ---------- Install dialog ---------- */
  var modal = document.getElementById("install-modal");
  var lanInput = document.getElementById("lan-url");
  var bodyTag = document.body;

  function openInstall() {
    if (!modal) return;
    modal.hidden = false;
    bodyTag.classList.add("modal-open");
    try { lanInput && lanInput.focus(); } catch (e) {}
    document.addEventListener("keydown", escClose);
  }

  function closeInstall() {
    if (!modal) return;
    modal.hidden = true;
    bodyTag.classList.remove("modal-open");
    document.removeEventListener("keydown", escClose);
  }

  function escClose(e) {
    if (e.key === "Escape") closeInstall();
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-action]");
    if (!trigger) return;
    var action = trigger.getAttribute("data-action");

    if (action === "open-install") {
      e.preventDefault();
      openInstall();
    } else if (action === "close-install") {
      closeInstall();
    } else if (action === "open-lan") {
      if (lanInput && lanInput.value) window.open(lanInput.value, "_blank", "noopener");
    } else if (action === "copy-lan") {
      copyText(lanInput ? lanInput.value : "", trigger);
    }
  });

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeInstall();
    });
  }

  /* ---------- Copy to clipboard helpers ---------- */
  function copyText(text, button) {
    var label = button ? button.querySelector("[data-copy-label]") : null;
    var done = function () {
      if (label) {
        var old = label.textContent;
        label.textContent = "Copied!";
        setTimeout(function () { label.textContent = old; }, 1600);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) {}
      document.body.removeChild(ta);
      done();
    }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy"), btn);
    btn.classList.add("copied");
    setTimeout(function () { btn.classList.remove("copied"); }, 1600);
  });

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();