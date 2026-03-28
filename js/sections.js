document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
 
    function updateBackground() {
        const viewportCenter = window.innerHeight / 2;
        let closest = null;
        let closestDistance = Infinity;
 
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + rect.height / 2;
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