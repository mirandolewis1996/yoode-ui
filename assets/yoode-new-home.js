/* Yoode new home — hero slider: fade between slides, card navigation, autoplay progress */
if (!customElements.get('yoode-new-home-slider')) {
  class YoodeNewHomeSlider extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('.yn-hero__slide')];
      this.cards = [...this.querySelectorAll('.yn-hero__card')];
      this.navList = this.querySelector('.yn-hero__nav-list');
      this.delay = Number(this.dataset.speed) || 6000;
      this.autoplay = this.dataset.autoplay === 'true' && this.slides.length > 1;
      this.index = 0;
      this.elapsed = 0;
      this.paused = false;
      if (this.classList.contains('yn-hero--full')) {
        this.syncBackground();
      }
      if (this.slides.length < 2) return;

      this.cards.forEach((card) => {
        card.addEventListener('click', () => this.goTo(Number(card.dataset.index)));
      });

      // Pause while hovering / focusing the slider
      this.addEventListener('mouseenter', () => (this.paused = true));
      this.addEventListener('mouseleave', () => (this.paused = false));
      this.addEventListener('focusin', () => (this.paused = true));
      this.addEventListener('focusout', () => (this.paused = false));

      this.bindSwipe();

      // Theme editor: show the selected block and hold it there
      this.onBlockSelect = (event) => {
        const index = this.slides.indexOf(event.target);
        if (index < 0) return;
        this.goTo(index);
        this.editorHold = true;
      };
      this.onBlockDeselect = (event) => {
        if (this.slides.includes(event.target)) this.editorHold = false;
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('shopify:block:deselect', this.onBlockDeselect);

      if (this.autoplay) this.startTimer();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.frame);
      clearTimeout(this.prevTimer);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    syncBackground() {
      const background = this.slides[this.index]?.style.getPropertyValue('--yn-slide-bg');
      if (background) this.style.setProperty('--yn-slide-bg', background);
    }

    goTo(index) {
      const total = this.slides.length;
      const next = (index + total) % total;
      this.elapsed = 0;
      if (next === this.index) return;

      // Keep the outgoing slide solid underneath until the new one has faded in
      const prev = this.index;
      this.index = next;
      if (this.classList.contains('yn-hero--full')) this.syncBackground();
      clearTimeout(this.prevTimer);
      this.prevTimer = setTimeout(() => this.slides[prev].classList.remove('is-prev'), this.fadeDuration());

      this.slides.forEach((slide, i) => {
        const active = i === this.index;
        slide.classList.toggle('is-prev', i === prev);
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', !active);
        slide.inert = !active;
      });

      this.cards.forEach((card, i) => {
        const active = i === this.index;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-selected', active);
        card.style.setProperty('--yn-progress', 0);
      });

      this.scrollCardIntoView();
    }

    fadeDuration() {
      const value = parseFloat(getComputedStyle(this).getPropertyValue('--yn-duration-fade'));
      return (Number.isNaN(value) ? 0.9 : value) * 1000 + 100;
    }

    // Keep the active card visible when the card row scrolls (tablet/mobile)
    scrollCardIntoView() {
      const item = this.cards[this.index]?.parentElement;
      if (!item || this.navList.scrollWidth <= this.navList.clientWidth) return;
      const offset = item.getBoundingClientRect().left - this.navList.getBoundingClientRect().left;
      const padding = parseFloat(getComputedStyle(this.navList).paddingLeft) || 0;
      this.navList.scrollTo({ left: this.navList.scrollLeft + offset - padding, behavior: 'smooth' });
    }

    startTimer() {
      let last = performance.now();
      const tick = (now) => {
        const delta = now - last;
        last = now;
        if (!this.paused && !this.editorHold && !document.hidden) {
          this.elapsed += delta;
          this.cards[this.index]?.style.setProperty('--yn-progress', Math.min(this.elapsed / this.delay, 1).toFixed(3));
          if (this.elapsed >= this.delay) this.goTo(this.index + 1);
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }

    bindSwipe() {
      const area = this.querySelector('.yn-hero__slides');
      let startX = 0;
      let startY = 0;
      area.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      }, { passive: true });
      area.addEventListener('touchend', (event) => {
        const dx = event.changedTouches[0].clientX - startX;
        const dy = event.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.goTo(this.index + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }
  }

  customElements.define('yoode-new-home-slider', YoodeNewHomeSlider);
}

/* Yoode new home — fade-up on scroll for children marked [data-yn-reveal] */
if (!customElements.get('yoode-new-home-reveal')) {
  class YoodeNewHomeReveal extends HTMLElement {
    connectedCallback() {
      const items = this.querySelectorAll('[data-yn-reveal]');
      // Scroll animations are switched off: show every card straight away
      if (true) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -10% 0px' }
      );
      items.forEach((item) => this.observer.observe(item));
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }
  }

  customElements.define('yoode-new-home-reveal', YoodeNewHomeReveal);
}

/* Yoode new home — service pillars: open a card on hover, click, keyboard focus or editor block select */
if (!customElements.get('yoode-new-home-service-pillars')) {
  class YoodeNewHomeServicePillars extends HTMLElement {
    connectedCallback() {
      this.cards = [...this.querySelectorAll('.yn-service-pillars__card')];

      this.onActivate = (event) => {
        const card = event.target.closest('.yn-service-pillars__card');
        if (card && this.cards.includes(card)) this.activate(card);
      };
      this.onKeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.yn-service-pillars__card');
        if (!card || !this.cards.includes(card)) return;
        event.preventDefault();
        this.activate(card);
      };
      this.onBlockSelect = (event) => {
        if (this.cards.includes(event.target)) this.activate(event.target);
      };

      // mouseover bubbles (mouseenter does not), so one listener covers every card
      this.addEventListener('mouseover', this.onActivate);
      this.addEventListener('click', this.onActivate);
      this.addEventListener('focusin', this.onActivate);
      this.addEventListener('keydown', this.onKeydown);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
    }

    disconnectedCallback() {
      if (!this.onActivate) return;
      this.removeEventListener('mouseover', this.onActivate);
      this.removeEventListener('click', this.onActivate);
      this.removeEventListener('focusin', this.onActivate);
      this.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
    }

    activate(activeCard) {
      if (activeCard.classList.contains('is-active')) return;
      this.cards.forEach((card) => {
        const active = card === activeCard;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-expanded', active);
      });
    }
  }

  customElements.define('yoode-new-home-service-pillars', YoodeNewHomeServicePillars);
}

/* Yoode new home — featured collection: size dropdowns, wishlist toggle, quick add to cart */
if (!customElements.get('yoode-new-home-featured-collection')) {
  class YoodeNewHomeFeaturedCollection extends HTMLElement {
    connectedCallback() {
      this.status = this.querySelector('[data-yn-status]');

      this.onClick = (event) => this.handleClick(event);
      this.onDocumentClick = (event) => {
        if (!this.contains(event.target)) this.closeDropdowns();
      };
      this.onKeydown = (event) => {
        if (event.key !== 'Escape') return;
        const open = this.querySelector('[data-yn-dropdown-toggle][aria-expanded="true"]');
        if (!open) return;
        this.closeDropdowns();
        open.focus();
      };

      this.addEventListener('click', this.onClick);
      this.addEventListener('keydown', this.onKeydown);
      document.addEventListener('click', this.onDocumentClick);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('click', this.onDocumentClick);
      clearTimeout(this.statusTimer);
    }

    handleClick(event) {
      const toggle = event.target.closest('[data-yn-dropdown-toggle]');
      if (toggle) return this.toggleDropdown(toggle);

      const option = event.target.closest('[data-yn-size]');
      if (option) return this.selectSize(option);

      const wishlist = event.target.closest('[data-yn-wishlist]');
      if (wishlist) {
        wishlist.setAttribute('aria-pressed', wishlist.getAttribute('aria-pressed') !== 'true');
        return;
      }

      const quickAdd = event.target.closest('[data-yn-quick-add]');
      if (quickAdd) return this.quickAdd(quickAdd);

      // Any other click inside the section closes open dropdowns
      this.closeDropdowns();
    }

    toggleDropdown(toggle, forceOpen = false) {
      const list = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!list) return;
      const open = forceOpen || toggle.getAttribute('aria-expanded') !== 'true';
      this.closeDropdowns(toggle);
      toggle.setAttribute('aria-expanded', open);
      list.hidden = !open;
      if (open) (list.querySelector('[aria-selected="true"]') || list.querySelector('[data-yn-size]:not(:disabled)'))?.focus();
    }

    closeDropdowns(except) {
      this.querySelectorAll('[data-yn-dropdown-toggle][aria-expanded="true"]').forEach((toggle) => {
        if (toggle === except) return;
        toggle.setAttribute('aria-expanded', 'false');
        const list = document.getElementById(toggle.getAttribute('aria-controls'));
        if (list) list.hidden = true;
      });
    }

    selectSize(option) {
      const dropdown = option.closest('[data-yn-dropdown]');
      const card = option.closest('[data-yn-card]');
      dropdown.querySelectorAll('[data-yn-size]').forEach((item) => item.setAttribute('aria-selected', item === option));

      const label = dropdown.querySelector('[data-yn-size-label]');
      if (label) label.textContent = option.dataset.ynSize;

      if (card && option.dataset.variantId) {
        card.dataset.variantId = option.dataset.variantId;
        delete card.dataset.needsSize;
      }

      const toggle = dropdown.querySelector('[data-yn-dropdown-toggle]');
      this.closeDropdowns();
      toggle?.focus();
    }

    async quickAdd(button) {
      const card = button.closest('[data-yn-card]');
      if (!card || !card.dataset.variantId) return;

      // Products with several sizes: ask for a size first
      if (card.hasAttribute('data-needs-size')) {
        const toggle = card.querySelector('[data-yn-dropdown-toggle]');
        if (toggle) {
          this.toggleDropdown(toggle, true);
          this.setStatus(button.dataset.chooseLabel);
          return;
        }
      }

      const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
      const body = { items: [{ id: Number(card.dataset.variantId), quantity: 1 }] };
      if (cart && typeof cart.getSectionsToRender === 'function') {
        body.sections = cart.getSectionsToRender().map((section) => section.id);
        body.sections_url = window.location.pathname;
      }

      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      this.setStatus('');

      try {
        const root = (window.routes && window.routes.cart_add_url) || '/cart/add';
        const response = await fetch(`${root}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message);

        // Dawn pub/sub (assets/pubsub.js + constants.js) keeps other cart UI in sync
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'yoode-new-home-featured-collection',
            productVariantId: body.items[0].id,
            cartData: data
          });
        }

        if (cart && typeof cart.renderContents === 'function' && data.sections) {
          cart.classList.remove('is-empty');
          cart.renderContents(data);
        } else {
          window.location.href = (window.routes && window.routes.cart_url) || '/cart';
          return;
        }

        button.classList.add('is-added');
        setTimeout(() => button.classList.remove('is-added'), 1500);
      } catch (error) {
        this.setStatus(error.message || this.dataset.errorLabel);
      } finally {
        button.classList.remove('is-loading');
        button.removeAttribute('aria-busy');
      }
    }

    setStatus(message) {
      if (!this.status) return;
      clearTimeout(this.statusTimer);
      this.status.textContent = message || '';
      if (message) this.statusTimer = setTimeout(() => (this.status.textContent = ''), 4000);
    }
  }

  customElements.define('yoode-new-home-featured-collection', YoodeNewHomeFeaturedCollection);
}

/* Yoode new home — experience centers: link location cards, map pins and connecting lines */
if (!customElements.get('yoode-new-home-experience-centers')) {
  class YoodeNewHomeExperienceCenters extends HTMLElement {
    connectedCallback() {
      this.items = [...this.querySelectorAll('[data-yn-experience-item]')];
      this.pins = [...this.querySelectorAll('[data-yn-experience-pin]')];
      this.lines = [...this.querySelectorAll('[data-yn-experience-line]')];
      this.activeId = null;
      this.canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

      const targets = [
        ...this.items.map((el) => [el, el.dataset.ynExperienceItem]),
        ...this.pins.map((el) => [el, el.dataset.ynExperiencePin]),
      ];

      targets.forEach(([el, id]) => {
        // Mouse: follow the pointer like the original hover interaction
        el.addEventListener('pointerenter', (event) => {
          if (event.pointerType === 'mouse') this.activate(id);
        });
        el.addEventListener('pointerleave', (event) => {
          if (event.pointerType === 'mouse') this.deactivate(id);
        });
        // Touch / pen: tap toggles the location
        el.addEventListener('click', () => {
          if (this.canHover.matches) return;
          if (this.activeId === id) this.deactivate(id);
          else this.activate(id);
        });
        // Keyboard only (a tap also focuses, but is handled by the click above)
        el.addEventListener('focusin', (event) => {
          if (!this.isKeyboardFocus(event.target)) return;
          this.focusId = id;
          this.activate(id);
        });
        el.addEventListener('focusout', (event) => {
          if (this.focusId !== id || el.contains(event.relatedTarget)) return;
          this.focusId = null;
          this.deactivate(id);
        });
      });

      this.toggle(null);

      // Theme editor: highlight the selected location block
      this.onBlockSelect = (event) => {
        const item = this.items.find((el) => el === event.target || el.contains(event.target));
        if (item) this.activate(item.dataset.ynExperienceItem);
      };
      this.onBlockDeselect = (event) => {
        const item = this.items.find((el) => el === event.target || el.contains(event.target));
        if (item) this.deactivate(item.dataset.ynExperienceItem);
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    disconnectedCallback() {
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    isKeyboardFocus(target) {
      try {
        return target.matches(':focus-visible');
      } catch (error) {
        return true;
      }
    }

    activate(id) {
      this.activeId = id;
      this.toggle(id);
    }

    deactivate(id) {
      if (this.activeId !== id) return;
      this.activeId = null;
      this.toggle(null);
    }

    toggle(id) {
      this.items.forEach((el) => el.classList.toggle('is-active', el.dataset.ynExperienceItem === id));
      this.pins.forEach((el) => {
        const active = el.dataset.ynExperiencePin === id;
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-pressed', active);
      });
      this.lines.forEach((el) => el.classList.toggle('is-active', el.dataset.ynExperienceLine === id));
    }
  }

  customElements.define('yoode-new-home-experience-centers', YoodeNewHomeExperienceCenters);
}

/* Yoode new home — FAQ accordion: smooth open/close for native <details>, optional single-open */
if (!customElements.get('yoode-new-home-faq')) {
  class YoodeNewHomeFaq extends HTMLElement {
    connectedCallback() {
      this.items = [...this.querySelectorAll('details')];
      this.singleOpen = this.hasAttribute('data-single-open');
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

      this.onClick = (event) => {
        const summary = event.target.closest('summary');
        if (!summary || !this.contains(summary)) return;
        const item = summary.parentElement;
        if (!this.items.includes(item)) return;
        event.preventDefault();
        this.toggle(item, !this.isOpen(item));
      };
      this.addEventListener('click', this.onClick);

      // Keep the target state in sync when the browser opens an item itself (e.g. find-in-page)
      this.onToggle = (event) => {
        const item = event.target;
        if (this.items.includes(item) && !item.ynAnimation) item.ynTarget = item.open;
      };
      this.addEventListener('toggle', this.onToggle, true);

      // Theme editor: open the selected question
      this.onBlockSelect = (event) => {
        if (this.items.includes(event.target)) this.toggle(event.target, true, false);
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.removeEventListener('toggle', this.onToggle, true);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      this.items?.forEach((item) => item.ynAnimation?.cancel());
    }

    // Target state, so clicks during an animation reverse it correctly
    isOpen(item) {
      return item.ynTarget ?? item.open;
    }

    toggle(item, open, animate = true) {
      if (open && this.singleOpen) {
        this.items.forEach((other) => {
          if (other !== item && this.isOpen(other)) this.toggle(other, false, animate);
        });
      }

      item.ynTarget = open;
      const content = item.querySelector('.yn-faq__content');
      if (!content || !animate || this.reduceMotion.matches || typeof content.animate !== 'function') {
        item.ynAnimation?.cancel();
        item.open = open;
        return;
      }

      const start = item.open ? content.offsetHeight : 0;
      item.ynAnimation?.cancel();
      item.open = true;
      const end = open ? content.scrollHeight : 0;
      const duration = parseFloat(getComputedStyle(this).getPropertyValue('--yn-duration')) * 1000 || 600;

      item.ynAnimation = content.animate(
        [
          { height: `${start}px`, opacity: start ? 1 : 0 },
          { height: `${end}px`, opacity: open ? 1 : 0 }
        ],
        { duration: duration / 2, easing: 'ease-in-out' }
      );
      item.ynAnimation.onfinish = () => {
        item.ynAnimation = null;
        item.open = open;
      };
      item.ynAnimation.oncancel = () => {
        item.ynAnimation = null;
      };
    }
  }

  customElements.define('yoode-new-home-faq', YoodeNewHomeFaq);
}


/* Yoode new home — header: transparent → solid on scroll, hide on scroll down,
   full-screen menu panel (focus trap, Esc, scroll lock, accordions), live cart count */
if (!customElements.get('yoode-new-home-header')) {
  class YoodeNewHomeHeader extends HTMLElement {
    connectedCallback() {
      this.bar = this.querySelector('.yn-header__bar');
      this.drawer = this.querySelector('[data-yn-header-drawer]');
      this.toggleButton = this.querySelector('[data-yn-header-toggle]');
      this.cartLink = this.querySelector('[data-yn-header-cart]');
      this.cartCount = this.querySelector('[data-yn-header-cart-count]');
      this.cartSink = this.querySelector('[data-yn-header-cart-sink]');
      this.sticky = this.hasAttribute('data-sticky');
      this.hideOnScroll = this.hasAttribute('data-hide-on-scroll');
      this.threshold = Number(this.dataset.threshold) || 50;
      this.lastY = window.scrollY;
      this.isOpen = false;

      // Scroll state (rAF-throttled)
      this.onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
          this.ticking = false;
          this.updateScroll();
        });
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });

      // Keep the spacer (solid sticky header) equal to the bar height
      this.measure = () => {
        if (!this.classList.contains('is-scrolled')) {
          this.style.setProperty('--yn-header-height', `${this.bar.offsetHeight}px`);
        }
      };
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.measure);
        this.resizeObserver.observe(this.bar);
      }
      this.measure();
      this.updateScroll();

      // Reveal when keyboard focus lands in a hidden header
      this.onFocusIn = () => this.classList.remove('is-hidden');
      this.bar.addEventListener('focusin', this.onFocusIn);

      // Menu panel
      this.onToggleClick = () => (this.isOpen ? this.close() : this.open());
      this.toggleButton?.addEventListener('click', this.onToggleClick);

      this.onDrawerClick = (event) => {
        if (event.target.closest('[data-yn-header-close]')) {
          this.close();
          return;
        }
        const accordion = event.target.closest('[data-yn-header-accordion]');
        if (accordion) {
          this.toggleAccordion(accordion);
          return;
        }
        // Close after following an in-page link (e.g. #anchor)
        const link = event.target.closest('a[href]');
        if (link && link.hash && link.pathname === window.location.pathname) this.close();
      };
      this.drawer?.addEventListener('click', this.onDrawerClick);

      this.onKeyDown = (event) => {
        if (!this.isOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        } else if (event.key === 'Tab') {
          this.trapFocus(event);
        }
      };
      document.addEventListener('keydown', this.onKeyDown);

      // Cart: open the theme's cart drawer when it exists, keep the count live
      this.onCartClick = (event) => {
        const cartDrawer = document.querySelector('cart-drawer');
        if (!this.cartLink.hasAttribute('data-cart-drawer') || !cartDrawer || typeof cartDrawer.open !== 'function') return;
        event.preventDefault();
        cartDrawer.open(this.cartLink);
      };
      this.cartLink?.addEventListener('click', this.onCartClick);

      if (this.cartSink && 'MutationObserver' in window) {
        this.sinkObserver = new MutationObserver(() => this.readSinkCount());
        this.sinkObserver.observe(this.cartSink, { childList: true, subtree: true, characterData: true });
      }
      if (this.cartCount && typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        this.unsubscribeCart = subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.fetchCount());
      }
      // Back/forward cache can show a stale count
      this.onPageShow = (event) => {
        if (event.persisted) this.fetchCount();
      };
      window.addEventListener('pageshow', this.onPageShow);

      // Theme editor: open the panel while one of its blocks is selected
      this.onBlockSelect = (event) => {
        if (this.drawer?.contains(event.target)) this.open(false);
      };
      this.onBlockDeselect = (event) => {
        if (this.drawer?.contains(event.target)) this.close(false);
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('pageshow', this.onPageShow);
      document.removeEventListener('keydown', this.onKeyDown);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
      this.resizeObserver?.disconnect();
      this.sinkObserver?.disconnect();
      if (this.unsubscribeCart) this.unsubscribeCart();
      this.fetchController?.abort();
      if (this.isOpen) this.unlockScroll();
    }

    updateScroll() {
      const y = Math.max(window.scrollY, 0);
      this.classList.toggle('is-scrolled', this.sticky && y > this.threshold);

      if (this.hideOnScroll && !this.isOpen) {
        const delta = y - this.lastY;
        const pastHeader = y > this.bar.offsetHeight + this.threshold;
        if (delta > 4 && pastHeader && !this.bar.contains(document.activeElement)) {
          this.classList.add('is-hidden');
        } else if (delta < -4 || !pastHeader) {
          this.classList.remove('is-hidden');
        }
      }
      this.lastY = y;
      if (y <= this.threshold) this.measure();
    }

    open(moveFocus = true) {
      if (this.isOpen || !this.drawer) return;
      this.isOpen = true;
      this.drawer.inert = false;
      this.drawer.classList.add('is-open');
      this.classList.add('is-menu-open');
      this.classList.remove('is-hidden');
      this.toggleButton?.setAttribute('aria-expanded', 'true');
      this.lockScroll();
      if (moveFocus) {
        const target = this.drawer.querySelector('[data-yn-header-close]') || this.drawer;
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
    }

    close(returnFocus = true) {
      if (!this.isOpen || !this.drawer) return;
      this.isOpen = false;
      this.drawer.classList.remove('is-open');
      this.drawer.inert = true;
      this.classList.remove('is-menu-open');
      this.toggleButton?.setAttribute('aria-expanded', 'false');
      this.unlockScroll();
      if (returnFocus) this.toggleButton?.focus({ preventScroll: true });
    }

    lockScroll() {
      this.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    unlockScroll() {
      document.body.style.overflow = this.previousOverflow || '';
    }

    trapFocus(event) {
      const focusable = [
        ...this.drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !this.drawer.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !this.drawer.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    // One submenu open at a time (as in the source theme)
    toggleAccordion(button) {
      const expand = button.getAttribute('aria-expanded') !== 'true';
      this.drawer.querySelectorAll('[data-yn-header-accordion]').forEach((other) => {
        const isTarget = other === button;
        const state = isTarget && expand;
        other.setAttribute('aria-expanded', String(state));
        other.closest('.yn-header__menu-item')?.classList.toggle('is-open', state);
      });
    }

    readSinkCount() {
      const text = this.cartSink.querySelector('.cart-count-bubble [aria-hidden="true"]')?.textContent.trim();
      if (text) {
        this.renderCount(text === '99+' ? 100 : Number(text));
      } else {
        this.fetchCount();
      }
    }

    fetchCount() {
      if (!this.cartCount) return;
      this.fetchController?.abort();
      this.fetchController = new AbortController();
      const url = `${this.cartLink.dataset.cartUrl || '/cart'}.js`;
      fetch(url, { headers: { Accept: 'application/json' }, signal: this.fetchController.signal })
        .then((response) => response.json())
        .then((cart) => this.renderCount(cart.item_count))
        .catch(() => {});
    }

    renderCount(count) {
      if (!this.cartCount || Number.isNaN(count)) return;
      this.cartCount.textContent = count < 100 ? String(count) : '99+';
      if (this.cartCount.hasAttribute('data-hide-empty')) this.cartCount.hidden = count === 0;
      const label = this.cartLink.dataset.label || '';
      this.cartLink.setAttribute('aria-label', `${label} (${count})`);
    }
  }

  customElements.define('yoode-new-home-header', YoodeNewHomeHeader);
}

/* Yoode new home — banner slider: background colour + outline word swap,
   image/highlight cross-fade, card dock with autoplay progress, swipe, editor support */
if (!customElements.get('yoode-new-home-banner-slider')) {
  class YoodeNewHomeBannerSlider extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('.yn-banner__slide')];
      this.contents = [...this.querySelectorAll('.yn-banner__content')];
      this.items = [...this.querySelectorAll('.yn-banner__dock-item')];
      this.dock = this.querySelector('.yn-banner__dock');
      this.outline = this.querySelector('.yn-banner__outline');
      this.total = this.contents.length;
      this.delay = Number(this.dataset.speed) || 6000;
      this.autoplay = this.dataset.autoplay === 'true' && this.total > 1;
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.index = 0;
      this.elapsed = 0;
      this.editorHold = false;
      if (this.total < 2) return;

      this.onDockClick = (event) => {
        const item = event.target.closest('.yn-banner__dock-item');
        if (item && this.contains(item)) this.goTo(Number(item.dataset.index));
      };

      // Arrow keys move between cards (tab pattern)
      this.onDockKey = (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        this.goTo(this.index + (event.key === 'ArrowRight' ? 1 : -1));
        this.items[this.index]?.focus();
      };

      // Swipe anywhere except the (scrollable) card dock
      this.onTouchStart = (event) => {
        this.touch = event.target.closest('.yn-banner__dock')
          ? null
          : { x: event.touches[0].clientX, y: event.touches[0].clientY };
      };
      this.onTouchEnd = (event) => {
        if (!this.touch) return;
        const dx = event.changedTouches[0].clientX - this.touch.x;
        const dy = event.changedTouches[0].clientY - this.touch.y;
        this.touch = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.goTo(this.index + (dx < 0 ? 1 : -1));
      };

      // Theme editor: jump to the selected block and hold it there
      this.onBlockSelect = (event) => {
        const index = this.blockIndex(event);
        if (index < 0) return;
        this.editorHold = true;
        this.goTo(index);
        this.setProgress(0);
      };
      this.onBlockDeselect = (event) => {
        if (this.blockIndex(event) < 0) return;
        this.editorHold = false;
        this.elapsed = 0;
      };

      this.dock?.addEventListener('click', this.onDockClick);
      this.dock?.addEventListener('keydown', this.onDockKey);
      this.addEventListener('touchstart', this.onTouchStart, { passive: true });
      this.addEventListener('touchend', this.onTouchEnd, { passive: true });
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('shopify:block:deselect', this.onBlockDeselect);

      if (this.autoplay) this.startTimer();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.frame);
      clearTimeout(this.outlineTimer);
      this.dock?.removeEventListener('click', this.onDockClick);
      this.dock?.removeEventListener('keydown', this.onDockKey);
      this.removeEventListener('touchstart', this.onTouchStart);
      this.removeEventListener('touchend', this.onTouchEnd);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.onBlockDeselect);
    }

    blockIndex(event) {
      if (event.detail?.sectionId !== this.dataset.sectionId) return -1;
      return this.contents.findIndex((content) => content.dataset.blockId === event.detail.blockId);
    }

    goTo(index) {
      const next = (index + this.total) % this.total;
      if (next === this.index) return;
      this.index = next;
      this.elapsed = 0;

      this.slides.forEach((slide, i) => {
        const active = i === next;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });

      this.contents.forEach((content, i) => {
        const active = i === next;
        content.classList.toggle('is-active', active);
        content.setAttribute('aria-hidden', String(!active));
        content.inert = !active;
      });

      this.items.forEach((item, i) => {
        const active = i === next;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        item.style.setProperty('--yn-banner-progress', 0);
      });

      const content = this.contents[next];
      this.style.setProperty('--yn-banner-bg', content.dataset.bg);
      this.swapOutline(content.dataset.outline || '');
      this.scrollItemIntoView();
    }

    // Fade the outline word out, swap the text, fade back in
    swapOutline(text) {
      if (!this.outline) return;
      clearTimeout(this.outlineTimer);
      if (this.outline.textContent.trim() === text || this.motion.matches) {
        this.outline.textContent = text;
        this.outline.classList.remove('is-hidden');
        return;
      }
      this.outline.classList.add('is-hidden');
      this.outlineTimer = setTimeout(() => {
        this.outline.textContent = text;
        this.outline.classList.remove('is-hidden');
      }, 300);
    }

    // Keep the active card visible when the dock scrolls (tablet/mobile)
    scrollItemIntoView() {
      const item = this.items[this.index];
      if (!item || !this.dock || this.dock.scrollWidth <= this.dock.clientWidth) return;
      const dockRect = this.dock.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const left = this.dock.scrollLeft + (itemRect.left - dockRect.left) - (dockRect.width - itemRect.width) / 2;
      this.dock.scrollTo({ left, behavior: this.motion.matches ? 'auto' : 'smooth' });
    }

    setProgress(value) {
      this.items[this.index]?.style.setProperty('--yn-banner-progress', value);
    }

    // rAF clock: pauses while the tab is hidden or a block is selected in the editor
    startTimer() {
      let last = performance.now();
      const tick = (now) => {
        const delta = Math.min(now - last, 100);
        last = now;
        if (!this.editorHold && !document.hidden) {
          this.elapsed += delta;
          this.setProgress(Math.min(this.elapsed / this.delay, 1).toFixed(4));
          if (this.elapsed >= this.delay) this.goTo(this.index + 1);
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }
  }

  customElements.define('yoode-new-home-banner-slider', YoodeNewHomeBannerSlider);
}

if (!customElements.get('yoode-home-timeline')) {
  customElements.define('yoode-home-timeline', class extends HTMLElement {
    connectedCallback() {
      this.progress = this.querySelector('.yn-src-pr-progress-bar-fill');
      this.schedule = () => {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          const rect = this.getBoundingClientRect();
          const distance = Math.max(1, rect.height - innerHeight / 2);
          const value = Math.max(0, Math.min(1, (innerHeight / 2 - rect.top) / distance));
          if (this.progress) this.progress.style.transform = `scaleX(${value})`;
        });
      };
      window.addEventListener('scroll', this.schedule, { passive: true });
      window.addEventListener('resize', this.schedule, { passive: true });
      this.schedule();
    }
    disconnectedCallback() {
      window.removeEventListener('scroll', this.schedule);
      window.removeEventListener('resize', this.schedule);
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  });
}
