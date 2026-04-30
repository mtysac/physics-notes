document.addEventListener('DOMContentLoaded', () => {
    /** @type {NodeListOf<HTMLElement>} */
    const sections = document.querySelectorAll('section');

    /** Updates the body class to reflect the section closest to the viewport centre. */
    function updateBackground() {
        /** @type {number} */
        const viewportCenter = window.innerHeight / 2;
        /** @type {HTMLElement|null} */
        let closest = null;
        /** @type {number} */
        let closestDistance = Infinity;

        sections.forEach(section => {
            /** @type {DOMRect} */
            const rect = section.getBoundingClientRect();
            /** @type {number} */
            const sectionCenter = rect.top + rect.height / 2;
            /** @type {number} */
            const distance = Math.abs(sectionCenter - viewportCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closest = section;
            }
        });

        if (closest) {
            document.body.className = 'section-' + closest.id;
        }
    }

    window.addEventListener('scroll', updateBackground);
    updateBackground();
});