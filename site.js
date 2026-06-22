// shared: mobile nav toggle
document.addEventListener('click', function(e){
  var t = e.target.closest('.nav-toggle');
  if(t){
    var panel = document.querySelector('.mobile-menu');
    if(panel) panel.classList.toggle('open');
  }
  if(e.target.classList && e.target.classList.contains('mobile-menu')){
    e.target.classList.remove('open');
  }
});
