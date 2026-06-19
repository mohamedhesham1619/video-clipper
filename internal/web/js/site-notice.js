(function () {
    var NOTICE_TEXT = 'VideoClipper online will be discontinued soon. Thank you for using the service.';

    function getContentEl() {
        return (
            document.querySelector('.video-clipper') ||
            document.querySelector('.page-header') ||
            document.querySelector('main')
        );
    }

    function init() {
        if (document.querySelector('.site-notice')) return;

        var header = document.querySelector('.main-header');
        if (!header) return;

        var notice = document.createElement('div');
        notice.className = 'site-notice';
        notice.setAttribute('role', 'status');
        notice.innerHTML = '<p><span class="notice-line1">VideoClipper online will be discontinued soon.</span><span class="notice-line2">Thank you for using the service.</span></p>';
        header.insertAdjacentElement('afterend', notice);

        var contentEl = getContentEl();
        // Capture the original padding-top before we ever touch it
        var origPt = contentEl ? (parseFloat(getComputedStyle(contentEl).paddingTop) || 0) : 0;

        function refresh() {
            // Use offsetHeight — reliable across mobile and desktop
            var headerH = header.offsetHeight;

            // Push the in-flow notice below the fixed header
            notice.style.marginTop = headerH + 'px';

            // The content element already has padding-top designed to clear the
            // fixed header (e.g. 6rem on .video-clipper). Now that the in-flow
            // notice is providing that offset, subtract headerH to avoid
            // double-spacing. Never go below 0.
            if (contentEl && origPt > 0) {
                contentEl.style.paddingTop = Math.max(0, origPt - headerH) + 'px';
            }
        }

        refresh();
        window.addEventListener('load', refresh, { once: true });

        var timer;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(refresh, 80);
        }, { passive: true });

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(refresh).observe(header);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
