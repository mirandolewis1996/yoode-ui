    (function () {
        var tabs = document.querySelectorAll('.yd-cg-specs__tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var parent = this.closest('.yd-cg-specs');
                parent.querySelectorAll('.yd-cg-specs__tab').forEach(function (t) { t.classList.remove('yd-cg-specs__tab--active'); });
                parent.querySelectorAll('.yd-cg-specs__panel').forEach(function (p) { p.classList.remove('yd-cg-specs__panel--active'); });
                this.classList.add('yd-cg-specs__tab--active');
                var panel = parent.querySelector('[data-yd-panel="' + this.getAttribute('data-yd-tab') + '"]');
                if (panel) panel.classList.add('yd-cg-specs__panel--active');
            });
        });
    })();