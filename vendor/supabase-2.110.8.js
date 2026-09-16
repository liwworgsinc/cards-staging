/* LIW Cards staging compatibility loader.
   Growth Center originally referenced the production vendored Supabase bundle.
   Staging uses the same Supabase v2 browser build as the working admin pages. */
(function loadSupabaseForStaging(){
  if (window.supabase) return;
  document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>');
})();
