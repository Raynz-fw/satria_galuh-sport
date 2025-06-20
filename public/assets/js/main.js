// assets/js/main.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize animations
  const animateElements = () => {
    document.querySelectorAll('.animate, .animate-up').forEach(el => {
      el.classList.add('animated');
    });
  };

  // Back to top button
  const backToTop = document.createElement('button');
  backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
  backToTop.className = 'btn btn-secondary back-to-top';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    backToTop.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize animations on load
  animateElements();
  
  // Re-run animations when elements come into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate, .animate-up').forEach(el => {
    observer.observe(el);
  });
});