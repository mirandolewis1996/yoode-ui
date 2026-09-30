/* ==========================================================================
   YD SEO — shared behaviour for every yd-seo-* section
   --------------------------------------------------------------------------
   One file for the whole pack. Every initialiser is idempotent and marks the
   elements it has claimed, so it is safe for this script to be included by
   several sections and to run again when the Theme Editor injects or reloads
   a section (shopify:section:load).
   ========================================================================== */
(function () {
  'use strict';

  var DONE = 'ydSeoReady';           // dataset flag, set on claimed elements

  function claim(el) {
    if (!el || el.dataset[DONE]) return false;
    el.dataset[DONE] = '1';
    return true;
  }

  /* ------------------------------------------------------------------------
     Sport slider — arrows step through the sports in DOM order and wrap both
     ways; clicking a chip jumps to it. A sport with no panel of its own falls
     back to the shared "coming soon" panel, so adding a sport later only means
     adding one more block with its images.
     --------------------------------------------------------------------- */
  function initSlider(root) {
    if (!claim(root)) return;

    var chips  = Array.prototype.slice.call(root.querySelectorAll('.yd-seo-sport'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.yd-seo-panel'));
    var empty  = root.querySelector('.yd-seo-panel-empty');
    var prev   = root.querySelector('.yd-seo-nav-prev');
    var next   = root.querySelector('.yd-seo-nav-next');
    if (!chips.length) return;

    var index = 0;
    chips.forEach(function (chip, n) {
      if (chip.classList.contains('is-active')) index = n;
    });

    function show(i) {
      index = (i + chips.length) % chips.length;
      var sport = chips[index].dataset.sport;

      /* clear the entry animation everywhere first, so the class never
         accumulates and every switch animates from a clean slate */
      chips.forEach(function (chip, n) {
        var on = n === index;
        chip.classList.toggle('is-active', on);
        chip.classList.remove('is-entering');
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      var match = panels.filter(function (panel) {
        return panel.dataset.sport === sport;
      })[0] || empty;

      panels.forEach(function (panel) {
        panel.hidden = panel !== match;
        panel.classList.remove('is-entering');
      });

      if (match && match === empty) {
        var label = empty.querySelector('.yd-seo-empty-sport');
        if (label) label.textContent = chips[index].dataset.sportLabel || sport;
      }

      void root.offsetWidth;          /* one reflow, then start the animations */
      if (match) match.classList.add('is-entering');
      chips[index].classList.add('is-entering');
    }

    chips.forEach(function (chip, n) {
      chip.addEventListener('click', function () { show(n); });
    });
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });

    /* left/right arrow keys move between chips once one has focus */
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (chips.indexOf(document.activeElement) === -1) return;
      e.preventDefault();
      show(index + (e.key === 'ArrowRight' ? 1 : -1));
      chips[index].focus();
    });

    show(index);
  }

  /* ------------------------------------------------------------------------
     Steps — the highlight walks the rows while the section is on screen, and
     follows the pointer instead whenever someone hovers the list.
     --------------------------------------------------------------------- */
  function initSteps(root) {
    if (!claim(root)) return;

    var steps = Array.prototype.slice.call(root.querySelectorAll('.yd-seo-step'));
    var list  = root.querySelector('.yd-seo-step-list');
    if (steps.length < 2) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var speed = parseInt(root.dataset.stepSpeed, 10) || 3200;
    var index = 0;
    var timer = null;

    steps.forEach(function (step, n) {
      if (step.classList.contains('is-active')) index = n;
    });

    function select(i) {
      index = (i + steps.length) % steps.length;
      steps.forEach(function (step, n) {
        step.classList.toggle('is-active', n === index);
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      if (still || timer) return;
      timer = setInterval(function () { select(index + 1); }, speed);
    }

    steps.forEach(function (step, n) {
      step.addEventListener('mouseenter', function () { stop(); select(n); });
    });
    if (list) list.addEventListener('mouseleave', play);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { play(); } else { stop(); }
        });
      }, { threshold: 0.3 }).observe(root);
    } else {
      play();
    }

    select(index);
  }

  /* ------------------------------------------------------------------------
     FAQ accordion — one answer open at a time. The height animation is pure
     CSS (grid 0fr -> 1fr); this only flips a class and keeps aria-expanded in
     step, so every answer stays in the DOM and readable with JS off.
     --------------------------------------------------------------------- */
  function initFaq(root) {
    if (!claim(root)) return;

    var items = Array.prototype.slice.call(root.querySelectorAll('.yd-seo-faq-item'));

    function setOpen(item, open) {
      item.classList.toggle('is-open', open);
      var btn = item.querySelector('.yd-seo-faq-btn');
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    items.forEach(function (item) {
      var btn = item.querySelector('.yd-seo-faq-btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var willOpen = !item.classList.contains('is-open');
        items.forEach(function (other) { setOpen(other, false); });
        setOpen(item, willOpen);      /* clicking the open one closes it */
      });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll reveal — any .yd-seo-reveal fades up once, the first time it is
     seen. Shared by most sections.
     --------------------------------------------------------------------- */
  var observer = null;

  function initReveal(scope) {
    var items = Array.prototype.slice.call(
      (scope || document).querySelectorAll('.yd-seo-reveal')
    ).filter(function (el) { return claim(el); });

    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
    }

    items.forEach(function (el) { observer.observe(el); });
  }

  /* --------------------------------------------------------------------- */
  function initAll(scope) {
    var root = scope || document;
    Array.prototype.forEach.call(root.querySelectorAll('.yd-seo-sports'), initSlider);
    Array.prototype.forEach.call(root.querySelectorAll('.yd-seo-steps'), initSteps);
    Array.prototype.forEach.call(root.querySelectorAll('.yd-seo-faq-list'), initFaq);
    initReveal(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  /* Theme Editor: a section can be added or re-rendered without a reload */
  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
})();

// new changes 15-09-2026
   (function () {
    if (window.ydEnquiryModalReady) return;
    window.ydEnquiryModalReady = true;

    var SUBMITTED_KEY = 'ydEnquirySubmitted';

    function getModal() {
      return document.getElementById('yd-enquiry-modal');
    }

    function showModal(dialog) {
      if (dialog.open) return;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    function closeModal(dialog) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    // Opened from a trigger: fresh form, stale success/error messages hidden.
    function openFromTrigger(dialog, trigger) {
      var fields = dialog.querySelector('[data-yd-enquiry-fields]');
      var status = dialog.querySelectorAll('[data-yd-enquiry-status]');
      var source = dialog.querySelector('[data-yd-enquiry-source]');
      var page = dialog.querySelector('[data-yd-enquiry-page]');
      for (var i = 0; i < status.length; i++) status[i].hidden = true;
      if (fields) fields.hidden = false;
      if (source) {
        if (!source.hasAttribute('data-default')) source.setAttribute('data-default', source.value);
        source.value = trigger.getAttribute('data-yd-enquiry-source') || source.getAttribute('data-default');
      }
      if (page) page.value = window.location.pathname;
      showModal(dialog);
    }

    function storage(action) {
      try {
        if (action === 'set') window.sessionStorage.setItem(SUBMITTED_KEY, '1');
        if (action === 'get') return window.sessionStorage.getItem(SUBMITTED_KEY) === '1';
        if (action === 'clear') window.sessionStorage.removeItem(SUBMITTED_KEY);
      } catch (e) {
        return false;
      }
      return false;
    }

    // After Shopify reloads the page, reopen only if this popup was the form submitted,
    // so another contact form on the same page does not open it.
    function reopenAfterSubmit() {
      if (!storage('get')) return;
      storage('clear');
      var dialog = getModal();
      if (!dialog) return;
      var status = dialog.querySelector('[data-yd-enquiry-status]');
      if (!status) return;
      if (status.getAttribute('data-yd-enquiry-status') === 'success') {
        var fields = dialog.querySelector('[data-yd-enquiry-fields]');
        if (fields) fields.hidden = true;
      }
      showModal(dialog);
    }

    // Delegated, so triggers in any section work, including ones re-rendered by the theme editor.
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var trigger = target.closest('[data-yd-enquiry-open]');
      if (trigger) {
        var dialog = getModal();
        if (!dialog) return;
        event.preventDefault();
        openFromTrigger(dialog, trigger);
        return;
      }

      var closer = target.closest('[data-yd-enquiry-close]');
      if (closer) {
        closeModal(closer.closest('.yd-enquiry-modal'));
        return;
      }

      // A click on the dialog element itself (not its content) is a backdrop click.
      if (target.classList.contains('yd-enquiry-modal')) {
        closeModal(target);
      }
    });

    // Let the browser post the form normally (Shopify's spam protection relies on it);
    // just remember that this popup was the one submitted.
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!(form instanceof Element) || form.id !== 'yd-enquiry-form') return;
      storage('set');
      var button = form.querySelector('button[type="submit"]');
      if (button) button.setAttribute('aria-busy', 'true');
    });

    // Back/forward cache can restore the page with the button still marked busy.
    window.addEventListener('pageshow', function () {
      var button = document.querySelector('#yd-enquiry-form button[type="submit"]');
      if (button) button.removeAttribute('aria-busy');
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reopenAfterSubmit);
    } else {
      reopenAfterSubmit();
    }
  })();
// end