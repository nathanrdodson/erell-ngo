(function () {
  var nav    = document.getElementById('site-nav');
  var toggle = document.getElementById('nav-toggle');
  var drawer = document.getElementById('nav-drawer');
  var icon   = document.getElementById('nav-icon');

  if (!nav || !toggle || !drawer || !icon) return;

  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  toggle.addEventListener('click', function () {
    var open = drawer.classList.toggle('open');
    icon.className = open ? 'iconoir-xmark' : 'iconoir-menu';
  });

  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      drawer.classList.remove('open');
      icon.className = 'iconoir-menu';
    });
  });
}());
