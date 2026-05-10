(function($){
  function updateDays($grid){
    var page=parseInt($grid.attr('data-page')||'0',10); var isMobile=window.matchMedia('(max-width:540px)').matches;
    if(!isMobile){$grid.find('.cmap-day').attr('data-visible','1').show();return;}
    $grid.find('.cmap-day').attr('data-visible','0').hide().eq(page).attr('data-visible','1').show();
  }
  function replaceCalendarFromHtml(html, url){
    var $html=$('<div>').append($.parseHTML(html, document, true));
    var $new=$html.find('.cmap-calendar-card').first();
    if($new.length){ $('.cmap-calendar-card').first().replaceWith($new); if(url){ history.pushState(null,'',url); } return true; }
    var $newInner=$html.find('.cmap-fc').first();
    if($newInner.length){ $('.cmap-fc').first().replaceWith($newInner); if(url){ history.pushState(null,'',url); } return true; }
    return false;
  }
  function loadCalendar(url){
    var $card=$('.cmap-calendar-card'); if(!$card.length) return false;
    $card.addClass('is-loading');
    $.get(url).done(function(html){ replaceCalendarFromHtml(html,url); }).always(function(){ $('.cmap-calendar-card').removeClass('is-loading'); });
    return true;
  }
  function openModal(id){ var $m=$('#'+id); if($m.length){ $m.addClass('is-open').attr('aria-hidden','false'); $('body').addClass('cmap-modal-open'); } }
  function closeModal(){ $('.cmap-edit-modal').removeClass('is-open').attr('aria-hidden','true'); $('body').removeClass('cmap-modal-open'); }
  $(function(){
    $('.cmap-date-grid').each(function(){updateDays($(this));});
    $(document).on('click','.cmap-next,.cmap-prev',function(){if($(this).closest('.cmap-day-tools-v23').length)return;var $grid=$(this).closest('form,.cmap-front').find('.cmap-date-grid').first();var page=parseInt($grid.attr('data-page')||'0',10);var max=$grid.find('.cmap-day').length-1;page += $(this).hasClass('cmap-next')?1:-1;if(page<0)page=0;if(page>max)page=max;$grid.attr('data-page',page);updateDays($grid);});
    $(window).on('resize',function(){$('.cmap-date-grid').each(function(){updateDays($(this));});});
    $(document).on('mouseenter click','.cmap-popup-row',function(){var detail=$(this).attr('data-detail')||'';var img=$(this).attr('data-img')||''; if(!detail && !img) return; $('#cmap-modal .cmap-modal-img').html(img); $('#cmap-modal .cmap-modal-text').html(detail); $('#cmap-modal').css('display','flex');});
    $(document).on('click','.cmap-modal-close,#cmap-modal',function(e){ if(e.target!==this && !$(e.target).hasClass('cmap-modal-close')) return; $('#cmap-modal').hide(); });
    $(document).on('change','[data-cmap-filter]',function(){var cls=$(this).data('cmap-filter'); $('.'+cls).toggle(this.checked);});

    $(document).on('click','.cmap-calendar-card .cmap-navbtn,.cmap-calendar-card .cmap-view-tabs a,.cmap-calendar-card .cmap-today',function(e){
      if(!$('.cmap-calendar-card').length) return;
      e.preventDefault(); loadCalendar(this.href);
    });
    $(document).on('submit','.cmap-calendar-card .cmap-fc-form',function(e){
      e.preventDefault();
      var url=(this.getAttribute('action') || window.location.href).split('?')[0] + '?' + $(this).serialize();
      loadCalendar(url);
    });
    $(document).on('change','.cmap-calendar-card .cmap-source input',function(){
      $(this).closest('.cmap-source').toggleClass('is-active', this.checked);
      $(this).closest('form').trigger('submit');
    });
    $(document).on('click','.cmap-calendar-card [data-cmap-all]',function(){ var form=$(this).closest('form'); form.find('.cmap-source input').prop('checked',true).trigger('change'); });
    $(document).on('change','.cmap-calendar-card input[type=date]',function(){ $(this).closest('form').trigger('submit'); });

    $(document).on('submit','.cmap-edit-form,.cmap-delete-bottom,.cmap-hover-actions form',function(e){
      if($(this).closest('.cmap-bookings-admin').length) return;
      if(!window.CMAP_AJAX) return;
      e.preventDefault();
      var form=this;
      if($(form).hasClass('cmap-delete-bottom') || $(form).closest('.cmap-hover-actions').length){ if(!confirm('Deze afspraak volledig verwijderen?')) return; }
      var data=$(form).serialize()+'&action=cmap_admin_save&ajax_nonce='+encodeURIComponent(CMAP_AJAX.nonce);
      $.post(CMAP_AJAX.ajax_url,data).always(function(){
        closeModal();
        if($('.cmap-calendar-card').length){ loadCalendar(window.location.href); }
        else { window.location.replace(window.location.href); }
      });
    });
    $(document).on('click','[data-cmap-open]',function(e){ e.preventDefault(); e.stopPropagation(); openModal($(this).data('cmap-open')); });
    $(document).on('click','[data-cmap-close]',function(e){ e.preventDefault(); closeModal(); });
    $(document).on('keydown',function(e){ if(e.key==='Escape') closeModal(); });
    $(document).on('change','.cmap-source input',function(){ $(this).closest('.cmap-source').toggleClass('is-active', this.checked); });
    $(document).on('click','[data-cmap-all]',function(){ if($(this).closest('.cmap-bookings-admin').length) return; var form=$(this).closest('form'); form.find('.cmap-source input').prop('checked',true).trigger('change'); });
    window.addEventListener('popstate',function(){ if($('.cmap-calendar-card').length) loadCalendar(window.location.href); });
  });
})(jQuery);

/* CM Agenda v3.5 AJAX + floating hover fixes */
(function($){
  function replaceBookingsFromHtml(html, url){
    var $html=$('<div>').append($.parseHTML(html, document, true));
    var $new=$html.find('.cmap-bookings-admin').first();
    if($new.length){ $('.cmap-bookings-admin').first().replaceWith($new); if(url){ history.pushState(null,'',url); } return true; }
    return false;
  }
  function loadBookings(url){
    var $card=$('.cmap-bookings-admin').first(); if(!$card.length) return false;
    $card.addClass('is-loading');
    $.get(url).done(function(html){ replaceBookingsFromHtml(html,url); }).always(function(){ $('.cmap-bookings-admin').removeClass('is-loading'); });
    return true;
  }
  function currentBookingsUrl(form){
    var base=(form.getAttribute('action') || window.location.href).split('?')[0];
    return base + '?' + $(form).serialize();
  }
  function positionHoverCard($wrap){
    var $card=$wrap.find('.cmap-hover-card').first(); if(!$card.length) return;
    var r=$wrap[0].getBoundingClientRect();
    var w=205, h=Math.min(210, $card.outerHeight() || 160);
    var left=r.left + 16;
    var top=r.bottom - 2;
    if(left + w + 12 > window.innerWidth) left=Math.max(12, window.innerWidth - w - 12);
    if(top + h + 12 > window.innerHeight) top=Math.max(12, r.top - h - 8);
    $card.addClass('is-floating').css({left:left+'px',top:top+'px'});
  }
  $(document).on('submit','.cmap-bookings-filter',function(e){
    if(!$('.cmap-bookings-admin').length) return;
    e.preventDefault(); loadBookings(currentBookingsUrl(this));
  });
  $(document).on('change','.cmap-bookings-admin .cmap-source input',function(){
    $(this).closest('.cmap-source').toggleClass('is-active', this.checked);
    $(this).closest('form').trigger('submit');
  });
  $(document).on('click','.cmap-bookings-admin [data-cmap-all]',function(e){
    e.preventDefault();
    var form=$(this).closest('form'); form.find('.cmap-source input').prop('checked',true); form.trigger('submit');
  });
  $(document).on('mouseenter','.cmap-cal-event-wrap',function(){ positionHoverCard($(this)); });
  $(document).on('mouseleave','.cmap-cal-event-wrap',function(){ $(this).find('.cmap-hover-card').removeClass('is-floating').removeAttr('style'); });
  $(document).on('scroll resize',function(){ $('.cmap-hover-card.is-floating').removeClass('is-floating').removeAttr('style'); });
  $(document).on('submit','.cmap-bookings-admin .cmap-edit-form,.cmap-bookings-admin .cmap-delete-bottom',function(e){
    if(!window.CMAP_AJAX) return;
    e.preventDefault();
    var form=this;
    if($(form).hasClass('cmap-delete-bottom')){ if(!confirm('Deze afspraak volledig verwijderen?')) return; }
    var data=$(form).serialize()+'&action=cmap_admin_save&ajax_nonce='+encodeURIComponent(CMAP_AJAX.nonce);
    $.post(CMAP_AJAX.ajax_url,data).always(function(){
      $('.cmap-edit-modal').removeClass('is-open').attr('aria-hidden','true'); $('body').removeClass('cmap-modal-open');
      loadBookings(window.location.href);
    });
  });
})(jQuery);

/* CM Agenda v3.6 robust body-level hover card */
(function($){
  function removeFloating(){ $('.cmap-floating-hover').remove(); }
  function showFloating($wrap){
    removeFloating();
    var $src=$wrap.find('.cmap-hover-card').first(); if(!$src.length) return;
    var $card=$src.clone(true,false).addClass('cmap-floating-hover').removeClass('is-floating').appendTo('body');
    var r=$wrap[0].getBoundingClientRect();
    var w=205;
    var h=Math.min(220,$card.outerHeight() || 150);
    var left=r.left + 14;
    var top=r.bottom - 2;
    if(left + w + 12 > window.innerWidth) left=Math.max(12, window.innerWidth - w - 12);
    if(top + h + 12 > window.innerHeight) top=Math.max(12, r.top - h - 8);
    $card.css({left:left+'px',top:top+'px'});
  }
  $(document).on('mouseenter','.cmap-cal-event-wrap',function(){ showFloating($(this)); });
  $(document).on('mouseleave','.cmap-cal-event-wrap',function(){ setTimeout(function(){ if(!$('.cmap-floating-hover:hover').length) removeFloating(); },120); });
  $(document).on('mouseleave','.cmap-floating-hover',function(){ removeFloating(); });
  $(document).on('scroll resize',removeFloating);
})(jQuery);

/* CM Agenda v3.7 targeted hover restore: body overlay above events */
(function($){
  var hideTimer=null;
  function removeFloating(){ $('.cmap-floating-hover').remove(); }
  function showFloatingFrom($wrap){
    if(hideTimer){ clearTimeout(hideTimer); hideTimer=null; }
    removeFloating();
    var $src=$wrap.find('.cmap-hover-card').first();
    if(!$src.length) return;
    var $card=$src.clone(false,false).addClass('cmap-floating-hover').appendTo('body');
    var rect=($wrap.find('.cmap-cal-event')[0] || $wrap[0]).getBoundingClientRect();
    var w=205;
    var h=Math.min(220,$card.outerHeight() || 150);
    var left=rect.left + 18;
    var top=rect.bottom - 2;
    if(left + w + 12 > window.innerWidth) left=Math.max(12, window.innerWidth - w - 12);
    if(top + h + 12 > window.innerHeight) top=Math.max(12, rect.top - h - 8);
    $card.css({left:left+'px',top:top+'px'});
  }
  $(document).off('mouseenter.cmapv7 mouseleave.cmapv7', '.cmap-cal-event-wrap');
  $(document).on('mouseenter.cmapv7', '.cmap-cal-event-wrap,.cmap-cal-event', function(){ showFloatingFrom($(this).closest('.cmap-cal-event-wrap')); });
  $(document).on('mouseleave.cmapv7', '.cmap-cal-event-wrap', function(){ hideTimer=setTimeout(removeFloating,80); });
  $(document).on('click.cmapv7 scroll.cmapv7 resize.cmapv7', removeFloating);
})(jQuery);

/* CM Agenda v3.8 focused hover fix: body-level card, no layout changes */
(function($){
  var hoverTimer = null;
  function removeCmapHover(){ $('.cmap-floating-hover').remove(); }
  function showCmapHover(el){
    var $wrap = $(el).closest('.cmap-cal-event-wrap');
    if(!$wrap.length) return;
    var $src = $wrap.find('.cmap-hover-card').first();
    if(!$src.length) return;
    if(hoverTimer){ clearTimeout(hoverTimer); hoverTimer = null; }
    removeCmapHover();
    var $card = $('<div class="cmap-hover-card cmap-floating-hover"></div>').html($src.html()).appendTo(document.body);
    var anchor = $wrap.find('.cmap-cal-event').get(0) || $wrap.get(0);
    var r = anchor.getBoundingClientRect();
    var w = Math.min(220, Math.max(190, $card.outerWidth() || 205));
    var h = Math.min(220, $card.outerHeight() || 150);
    var left = r.left + 14;
    var top = r.bottom - 4;
    if(left + w + 12 > window.innerWidth) left = Math.max(12, window.innerWidth - w - 12);
    if(top + h + 12 > window.innerHeight) top = Math.max(12, r.top - h - 8);
    $card.css({left:left+'px', top:top+'px'});
  }
  $(document).off('mouseenter.cmapHoverFix mouseleave.cmapHoverFix', '.cmap-cal-event-wrap,.cmap-cal-event');
  $(document).on('mouseenter.cmapHoverFix', '.cmap-cal-event-wrap,.cmap-cal-event', function(){ showCmapHover(this); });
  $(document).on('mouseleave.cmapHoverFix', '.cmap-cal-event-wrap', function(e){
    hoverTimer = setTimeout(function(){ if(!$('.cmap-floating-hover:hover').length) removeCmapHover(); }, 140);
  });
  $(document).on('mouseenter.cmapHoverFix', '.cmap-floating-hover', function(){ if(hoverTimer){ clearTimeout(hoverTimer); hoverTimer=null; } });
  $(document).on('mouseleave.cmapHoverFix', '.cmap-floating-hover', removeCmapHover);
  $(window).on('scroll.cmapHoverFix resize.cmapHoverFix', removeCmapHover);
})(jQuery);

/* CM Agenda v3.2 admin agenda workspace modals */
(function($){
  function openModal(id){ $('#'+id).addClass('is-open'); $('body').addClass('cmap-modal-active'); }
  function closeModal(){ $('.cmap-modal').removeClass('is-open'); $('body').removeClass('cmap-modal-active'); }
  $(document).on('click','.js-cmap-open',function(e){ e.preventDefault(); openModal($(this).data('target')); });
  $(document).on('click','.js-cmap-close',function(e){ e.preventDefault(); closeModal(); });
  $(document).on('click','.cmap-modal',function(e){ if(e.target===this) closeModal(); });
  $(document).on('keyup',function(e){ if(e.key==='Escape') closeModal(); });
})(jQuery);

// --- CM admin refresh v3.3 ---
(function(){
  function openModal(id){
    var modal=document.getElementById(id);
    if(modal){ modal.classList.add('open'); modal.classList.add('is-open'); }
  }
  function closeModal(el){
    var modal=el.closest('.cmap-modal');
    if(modal){ modal.classList.remove('open'); modal.classList.remove('is-open'); }
  }
  function slugify(text){
    return (text||'').toString().toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g,'')
      .replace(/\s+/g,'-')
      .replace(/-+/g,'-');
  }
  function reopenStoredModal(){
    var id=sessionStorage.getItem('cmapReopenModal');
    if(id){
      sessionStorage.removeItem('cmapReopenModal');
      setTimeout(function(){ openModal(id); }, 150);
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    reopenStoredModal();


    document.querySelectorAll('.cmap-modal').forEach(function(modal){
      modal.addEventListener('click', function(e){
        if(e.target === modal){
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    });
    document.querySelectorAll('.js-cmap-open').forEach(function(btn){
      btn.addEventListener('click', function(){ openModal(btn.dataset.target); });
    });
    document.querySelectorAll('.js-cmap-close').forEach(function(btn){
      btn.addEventListener('click', function(){ closeModal(btn); });
    });
    document.querySelectorAll('.cmap-modal-tab').forEach(function(btn){
      btn.addEventListener('click', function(){
        var current=btn.closest('.cmap-modal');
        if(current){ current.classList.remove('open'); current.classList.remove('is-open'); }
        openModal(btn.dataset.target);
      });
    });

    document.querySelectorAll('.cmap-shortcode-copy').forEach(function(btn){
      btn.addEventListener('click', async function(){
        try{
          await navigator.clipboard.writeText(btn.dataset.shortcode || '');
          btn.classList.add('is-copied');
          setTimeout(function(){ btn.classList.remove('is-copied'); }, 1800);
        }catch(e){}
      });
    });

    document.querySelectorAll('.js-cmap-title-sync').forEach(function(input){
      input.addEventListener('input', function(){
        var wrap=input.closest('form');
        if(!wrap) return;
        var slug=wrap.querySelector('.js-cmap-slug-sync');
        var typeMirror=wrap.querySelector('.js-cmap-type-mirror');
        if(slug && (!slug.value || slug.dataset.userEdited !== '1')) slug.value=slugify(input.value);
        if(typeMirror) typeMirror.value=input.value || 'Nieuwe agenda';
      });
    });
    document.querySelectorAll('.js-cmap-slug-sync').forEach(function(input){
      input.addEventListener('input', function(){ input.dataset.userEdited='1'; });
    });

    document.querySelectorAll('.cmap-toggle-line input[type="checkbox"][name="active"]').forEach(function(check){
      var sync=function(){
        var preview=check.closest('.cmap-toggle-line').querySelector('.cmap-status-preview');
        if(preview){
          preview.textContent=check.checked ? 'Actief / frontend zichtbaar' : 'Inactief';
          preview.classList.toggle('is-on', check.checked);
          preview.classList.toggle('is-off', !check.checked);
        }
      };
      check.addEventListener('change', sync); sync();
    });

    document.querySelectorAll('.js-cmap-add-break').forEach(function(btn){
      btn.addEventListener('click', function(){
        var day=btn.dataset.day;
        var container=document.getElementById('cmap-breaks-'+day);
        if(!container) return;
        var row=document.createElement('div');
        row.className='cmap-break-row';
        row.innerHTML='<span class="cmap-break-label">Onderbreking</span><input type="time" name="day_break_start['+day+'][]"><span class="cmap-break-between">tot</span><input type="time" name="day_break_end['+day+'][]"><button type="button" class="cmap-break-remove js-cmap-remove-break">×</button>';
        container.appendChild(row);
      });
    });
    document.addEventListener('click', function(e){
      var btn=e.target.closest('.js-cmap-remove-break');
      if(btn){
        var row=btn.closest('.cmap-break-row');
        if(row) row.remove();
      }
    });

    document.querySelectorAll('.cmap-closed-day input').forEach(function(input){
      var sync=function(){ input.closest('.cmap-closed-day').classList.toggle('is-available', input.checked); };
      input.addEventListener('change', sync); sync();
    });

    document.querySelectorAll('.js-cmap-modal-form').forEach(function(form){
      form.addEventListener('submit', function(){
        var modalId=form.dataset.modalId;
        if(modalId && form.dataset.reopen === '1') sessionStorage.setItem('cmapReopenModal', modalId);
        var feedback=form.querySelector('.cmap-modal-feedback');
        var btn=form.querySelector('button[type="submit"]');
        if(feedback) feedback.textContent='Opslaan...';
        if(btn){ btn.dataset.originalText=btn.textContent; btn.textContent='Opslaan...'; }
      });
    });
  });
})();


/* CM compact refinement v3.3.2 */
(function(){
  document.addEventListener('click', function(e){
    var day=e.target.closest('.cmap-closed-day');
    if(day && !e.target.matches('input')){
      var input=day.querySelector('input[type="checkbox"]');
      if(input && e.target !== input){
        setTimeout(function(){ day.classList.toggle('is-available', input.checked); }, 0);
      }
    }
  });
})();


/* CM exact compact fix v3.3.3 */
(function(){
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setClosed(el,on){var input=qs('input[type="checkbox"]',el); if(!input)return; input.checked=!!on; el.classList.toggle('is-available',!!on)}
  function isClosed(el){var input=qs('input[type="checkbox"]',el); return !!(input&&input.checked)}
  var lastClosed=null;
  function selectRange(toEl){var all=qsa('.cmap-closed-day'); var a=all.indexOf(lastClosed), b=all.indexOf(toEl); if(a<0||b<0){setClosed(toEl,true);return} if(a>b){var t=a;a=b;b=t} for(var i=a;i<=b;i++) setClosed(all[i],true)}
  function closePopovers(){qsa('.cmap-closed-popover,.cmap-break-popover').forEach(function(p){p.remove()})}
  function showClosedPopover(el){closePopovers(); var r=el.getBoundingClientRect(); var pop=document.createElement('div'); pop.className='cmap-closed-popover'; pop.innerHTML='<label><input type="checkbox" class="cmap-closed-main"> Beschikbare dag</label><label><input type="checkbox"> Herhaal beschikbaarheid ieder jaar</label><hr><div class="cmap-closed-popover-actions"><button type="button" class="cmap-btn cmap-btn-small cmap-save-pop">Opslaan</button></div>'; document.body.appendChild(pop); pop.style.left=Math.max(10,Math.min(window.innerWidth-380,r.left-25))+'px'; pop.style.top=(r.bottom+10)+'px'; var c=qs('.cmap-closed-main',pop); c.checked=isClosed(el); c.addEventListener('change',function(){setClosed(el,c.checked)}); qs('.cmap-save-pop',pop).addEventListener('click',function(){var form=el.closest('form'); if(form){ var mid=form.getAttribute('data-modal-id'); if(mid) sessionStorage.setItem('cmapReopenModal', mid); if(form.requestSubmit){form.requestSubmit()}else{form.submit()} } else {closePopovers()}})}
  document.addEventListener('click',function(e){var day=e.target.closest('.cmap-closed-day'); if(day){e.preventDefault(); e.stopPropagation(); var on=!isClosed(day); if((e.metaKey||e.ctrlKey)&&lastClosed){selectRange(day)} else {setClosed(day,on)} lastClosed=day; showClosedPopover(day); return} if(!e.target.closest('.cmap-closed-popover')&&!e.target.closest('.cmap-break-popover')) closePopovers()},true);
  document.addEventListener('mouseover',function(e){var day=e.target.closest('.cmap-closed-day'); if(day&&(e.metaKey||e.ctrlKey)){setClosed(day,true); lastClosed=day}},true);
  /* old generic add-break handler disabled; v18 handler below is specific and stable */
})();

/* --- CM targeted fix v18: AJAX modal save + planning break popover --- */
(function(){
  function qs(sel,root){return (root||document).querySelector(sel)}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function openModal(id){var m=document.getElementById(id); if(m){m.classList.add('open');m.classList.add('is-open')}}
  function closePopovers(){qsa('.cmap-closed-popover,.cmap-break-popover').forEach(function(p){p.remove()})}
  document.addEventListener('submit',function(e){
    var form=e.target.closest('.js-cmap-modal-form');
    if(form) return; // v19 handles modal saves to avoid duplicate ajax/submits
    if(!form || !window.CMAP_AJAX || !CMAP_AJAX.ajax_url) return;
    e.preventDefault();
    var modalId=form.getAttribute('data-modal-id');
    var fd=new FormData(form);
    fd.append('action','cmap_admin_save');
    fd.append('ajax_nonce',CMAP_AJAX.nonce || '');
    var fb=qs('.cmap-modal-feedback',form);
    var btn=qs('button[type="submit"]',form);
    var old=btn ? btn.textContent : '';
    if(fb) fb.textContent='Opslaan...';
    if(btn) btn.textContent='Opslaan...';
    fetch(CMAP_AJAX.ajax_url,{method:'POST',credentials:'same-origin',body:fd})
      .then(function(r){return r.json()})
      .then(function(json){
        if(json && json.success){ if(fb) fb.textContent='Opgeslagen.'; if(modalId) openModal(modalId); }
        else { if(fb) fb.textContent='Niet opgeslagen. Herlaad en probeer opnieuw.'; }
      })
      .catch(function(){ if(fb) fb.textContent='Niet opgeslagen. Herlaad en probeer opnieuw.'; })
      .finally(function(){ if(btn) btn.textContent=old || 'Opslaan'; });
  },true);

  document.addEventListener('click',function(e){
    var btn=e.target.closest('.cmap-plan-v18 .js-cmap-add-break');
    if(!btn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    closePopovers();
    var day=btn.getAttribute('data-day');
    var r=btn.getBoundingClientRect();
    var pop=document.createElement('div');
    pop.className='cmap-break-popover';
    pop.innerHTML='<div class="cmap-break-popover-row"><span>Van</span><input type="time" class="cmbr-start"><span>Tot</span><input type="time" class="cmbr-end"></div><div class="cmap-break-popover-actions"><button type="button" class="cmap-btn cmap-btn-small cmbr-ok">OK</button><button type="button" class="cmap-btn cmap-btn-small cmap-btn-close cmbr-close">Sluiten</button></div>';
    document.body.appendChild(pop);
    pop.style.left=Math.max(10,Math.min(window.innerWidth-285,r.left))+'px';
    pop.style.top=(r.bottom+8)+'px';
    qs('.cmbr-close',pop).addEventListener('click',closePopovers);
    qs('.cmbr-ok',pop).addEventListener('click',function(){
      var s=qs('.cmbr-start',pop).value, en=qs('.cmbr-end',pop).value;
      if(!s||!en) return;
      var box=document.getElementById('cmap-breaks-'+day); if(!box) return;
      var row=document.createElement('div'); row.className='cmap-break-row';
      row.innerHTML='<span class="cmap-break-label">ONDERBREKING</span><span class="cmap-break-between">Van</span><input type="time" name="day_break_start['+day+'][]" value="'+s+'"><span class="cmap-break-between">tot</span><input type="time" name="day_break_end['+day+'][]" value="'+en+'"><button type="button" class="cmap-break-remove js-cmap-remove-break">×</button>';
      box.appendChild(row); closePopovers();
    });
  },true);
})();

/* --- CM final save/layout behavior v19 --- */
(function(){
  function qs(sel,root){return (root||document).querySelector(sel)}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function closeFloating(){qsa('.cmap-closed-popover,.cmap-break-popover').forEach(function(p){p.remove()})}
  function ajaxSaveForm(form, done){
    if(!form || !window.CMAP_AJAX || !CMAP_AJAX.ajax_url){ if(done) done(false); return; }
    var fd=new FormData(form);
    fd.append('action','cmap_admin_save');
    fd.append('ajax_nonce',CMAP_AJAX.nonce || '');
    var fb=qs('.cmap-modal-feedback',form);
    if(fb) fb.textContent='Opslaan...';
    fetch(CMAP_AJAX.ajax_url,{method:'POST',credentials:'same-origin',body:fd})
      .then(function(r){return r.json()})
      .then(function(json){
        var ok=!!(json && json.success);
        if(fb) fb.textContent=ok ? 'Opgeslagen.' : 'Niet opgeslagen.';
        if(done) done(ok,json);
      })
      .catch(function(){ if(fb) fb.textContent='Niet opgeslagen.'; if(done) done(false); });
  }

  /* Opslaan in het kleine vrije-dagen popupje: ajax, popover dicht, grote popup blijft open */
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.cmap-closed-popover .cmap-save-pop');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var modal=document.querySelector('.cmap-modal.open .js-cmap-modal-form, .cmap-modal.is-open .js-cmap-modal-form');
    var pop=btn.closest('.cmap-closed-popover');
    if(btn.dataset.saving==='1') return;
    btn.dataset.saving='1';
    btn.textContent='Opslaan...';
    ajaxSaveForm(modal,function(ok){
      btn.dataset.saving='0';
      btn.textContent='Opslaan';
      if(ok){ closeFloating(); }
      else if(pop){ pop.classList.add('is-error'); }
    });
  },true);

  /* Extra beveiliging: modal formulieren mogen niet naar hoofdpagina navigeren */
  document.addEventListener('submit',function(e){
    var form=e.target.closest('.cmap-modal .js-cmap-modal-form');
    if(!form) return;
    e.preventDefault();
    e.stopPropagation();
    var btn=qs('button[type="submit"]',form);
    var old=btn?btn.textContent:'';
    if(btn) btn.textContent='Opslaan...';
    ajaxSaveForm(form,function(){ if(btn) btn.textContent=old || 'Opslaan'; });
  },true);
})();

/* CM v20 robust save for closed days: explicit payload, stays in modal */
(function(){
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function qs(sel,root){return (root||document).querySelector(sel);}
  function saveClosedForm(form, button){
    if(!form || !window.CMAP_AJAX || !CMAP_AJAX.ajax_url) return;
    var fd=new FormData();
    fd.append('action','cmap_admin_save');
    fd.append('ajax_nonce',CMAP_AJAX.nonce || '');
    fd.append('cmap_action','save_closed_dates');
    ['calendar_id','year','reason'].forEach(function(name){
      var el=qs('[name="'+name+'"]',form);
      if(el) fd.append(name,el.value || '');
    });
    qsa('.cmap-closed-day input[type="checkbox"]:checked',form).forEach(function(input){
      fd.append('closed_dates[]',input.value);
    });
    var fb=qs('.cmap-modal-feedback',form);
    var old=button ? button.textContent : '';
    if(button) button.textContent='Opslaan...';
    if(fb) fb.textContent='Opslaan...';
    fetch(CMAP_AJAX.ajax_url,{method:'POST',credentials:'same-origin',body:fd})
      .then(function(r){return r.json();})
      .then(function(json){
        if(json && json.success){
          if(fb) fb.textContent=(json.data && json.data.message) ? json.data.message : 'Opgeslagen.';
          document.querySelectorAll('.cmap-closed-popover').forEach(function(p){p.remove();});
        } else {
          if(fb) fb.textContent='Niet opgeslagen.';
        }
      })
      .catch(function(){ if(fb) fb.textContent='Niet opgeslagen.'; })
      .finally(function(){ if(button) button.textContent=old || 'Opslaan'; });
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.cmap-closed-popover .cmap-save-pop');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var form=document.querySelector('.cmap-modal.is-open .js-cmap-modal-form, .cmap-modal.open .js-cmap-modal-form');
    saveClosedForm(form,btn);
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target.closest('#cmap-closed-agenda .js-cmap-modal-form');
    if(!form) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    saveClosedForm(form,qs('button[type="submit"]',form));
  },true);
})();

/* CM booking front compact pager v3.4.3 */
(function($){
  function visibleCount($grid){
    var w=$(window).width() || $grid.innerWidth() || $grid.parent().innerWidth() || 320;
    if(w<=640) return 1;
    if(w<=980) return 2;
    return 3;
  }
  function updateBookingPager($grid){
    var total=$grid.find('.cmap-day').length;
    var per=visibleCount($grid);
    var page=parseInt($grid.attr('data-page')||'0',10);
    var maxPage=Math.max(0, Math.ceil(total/per)-1);
    if(page<0) page=0;
    if(page>maxPage) page=maxPage;
    $grid.attr('data-page',page).attr('data-per-page',per).css('--cmap-days-per-page',per);
    var start=page*per, end=start+per;
    $grid.find('.cmap-day').each(function(i){
      var show=i>=start && i<end;
      $(this).attr('data-visible', show?'1':'0').toggle(show);
    });
    var $tools=$grid.closest('form,.cmap-front').find('.cmap-day-tools-v23').first();
    $tools.find('.cmap-prev').prop('disabled', page<=0).css('opacity', page<=0 ? .45 : 1);
    $tools.find('.cmap-next').prop('disabled', page>=maxPage).css('opacity', page>=maxPage ? .45 : 1);
  }
  $(function(){
    $('.cmap-date-grid-v23').each(function(){ updateBookingPager($(this)); });
  });
  $(window).on('resize',function(){ $('.cmap-date-grid-v23').each(function(){ updateBookingPager($(this)); }); });
  $(document).on('click','.cmap-day-tools-v23 .cmap-prev,.cmap-day-tools-v23 .cmap-next,.cmap-day-footer-nav-v23 .cmap-prev,.cmap-day-footer-nav-v23 .cmap-next',function(e){
    e.preventDefault();
    var $grid=$(this).closest('form,.cmap-front').find('.cmap-date-grid-v23').first();
    var page=parseInt($grid.attr('data-page')||'0',10);
    page += $(this).hasClass('cmap-next') ? 1 : -1;
    $grid.attr('data-page',page);
    updateBookingPager($grid);
  });
  $(document).on('click keydown','.cmap-date-grid-v23 .cmap-slot',function(e){
    if(e.type==='keydown' && e.key!=='Enter' && e.key!==' ') return;
    var $slot=$(this);
    if($slot.hasClass('is-full')) return;
    var $input=$slot.find('input[type=radio]');
    if(!$input.length || $input.prop('disabled')) return;
    $input.prop('checked',true).trigger('change');
  });
  $(document).on('change','.cmap-date-grid-v23 input[type=radio][name=slot_id]',function(){
    var $form=$(this).closest('form');
    $form.find('.cmap-slot').removeClass('is-selected');
    $(this).closest('.cmap-slot').addClass('is-selected');
    $form.addClass('cmap-book-step-details');
    if($form.is('[data-use-model="1"]')){
      var $btn=$form.find('.cmap-book-details .cmap-btn-wide').first();
      $btn.text('Opslaan...').prop('disabled',true);
      $form.trigger('submit');
    }
  });
  $(document).on('click','.cmap-book-back',function(e){
    e.preventDefault();
    var $form=$(this).closest('form');
    $form.removeClass('cmap-book-step-details');
    $form.find('input[type=radio][name=slot_id]').prop('checked',false);
    $form.find('.cmap-slot').removeClass('is-selected');
  });
})(jQuery);

// v26 form fields admin
(function(){
  function q(form,name){ return form ? form.querySelector('[name="'+name+'"]') : null; }
  function fillFieldEditor(row){
    var form=document.getElementById('cmap-field-editor');
    if(!form || !row) return;
    var map={id:'id',calendar:'calendar_id',key:'field_key',label:'label',type:'type',width:'width',placeholder:'placeholder',titlePosition:'title_position',sort:'sort_order',options:'options'};
    if(q(form,'id')) q(form,'id').value=row.dataset.id||'';
    if(q(form,'calendar_id')) q(form,'calendar_id').value=row.dataset.calendar||'';
    if(q(form,'field_key')) q(form,'field_key').value=row.dataset.key||'';
    if(q(form,'label')) q(form,'label').value=row.dataset.label||'';
    if(q(form,'type')) q(form,'type').value=row.dataset.type||'text';
    if(q(form,'width')) q(form,'width').value=row.dataset.width||'2';
    if(q(form,'placeholder')) q(form,'placeholder').value=row.dataset.placeholder||'';
    if(q(form,'title_position')) q(form,'title_position').value=row.dataset.titlePosition||'above';
    if(q(form,'sort_order')) q(form,'sort_order').value=row.dataset.sort||'100';
    if(q(form,'options')) q(form,'options').value=row.dataset.options||'';
    if(q(form,'required')) q(form,'required').checked=row.dataset.required==='1';
    if(q(form,'active')) q(form,'active').checked=row.dataset.active!=='0';
    form.scrollIntoView({behavior:'smooth',block:'start'});
  }
  var presets={
    voornaam:{label:'Voornaam',type:'text',width:'2',placeholder:'Voornaam',sort:'10',required:true},
    familienaam:{label:'Familienaam',type:'text',width:'2',placeholder:'Familienaam',sort:'20',required:true},
    naam:{label:'Naam',type:'text',width:'2',placeholder:'Naam',sort:'10',required:true},
    email:{label:'E-mail',type:'email',width:'2',placeholder:'E-mail',sort:'30',required:true},
    telefoon:{label:'Telefoon',type:'tel',width:'2',placeholder:'Telefoon',sort:'40',required:false},
    gsm:{label:'GSM',type:'tel',width:'2',placeholder:'GSM',sort:'40',required:false},
    geboortedatum:{label:'Geboortedatum',type:'date',width:'2',placeholder:'',sort:'25',required:false},
    leeftijd:{label:'Leeftijd',type:'number',width:'2',placeholder:'Leeftijd',sort:'26',required:false},
    straat:{label:'Straat',type:'text',width:'2',placeholder:'Straat',sort:'32',required:false},
    nr:{label:'Nr.',type:'text',width:'3',placeholder:'Nr.',sort:'35',required:false},
    postcode:{label:'Postcode',type:'text',width:'3',placeholder:'Postcode',sort:'36',required:false},
    gemeente:{label:'Gemeente',type:'text',width:'3',placeholder:'Gemeente',sort:'37',required:false},
    opmerkingen:{label:'Opmerkingen',type:'textarea',width:'1',placeholder:'Opmerkingen',sort:'90',required:false},
    hoe_terecht:{label:'Hoe bij ons terecht gekomen',type:'text',width:'1',placeholder:'',sort:'80',required:false},
    foto:{label:'Foto',type:'file',width:'1',placeholder:'',sort:'5',required:false}
  };
  document.addEventListener('click',function(e){
    var edit=e.target.closest('.js-cmap-field-edit');
    if(edit){ e.preventDefault(); fillFieldEditor(edit.closest('.cmap-field-row')); return; }
    var row=e.target.closest('.cmap-field-row');
    if(row && !e.target.matches('input,button,select,textarea,a')) fillFieldEditor(row);
    var newBtn=e.target.closest('.js-cmap-field-clear');
    if(newBtn){
      var form=document.getElementById('cmap-field-editor'); if(!form) return;
      form.reset(); if(q(form,'id')) q(form,'id').value=''; if(q(form,'active')) q(form,'active').checked=true;
    }
    var calBtn=e.target.closest('.js-cmap-new-for-calendar');
    if(calBtn){
      var form=document.getElementById('cmap-field-editor'); if(!form) return;
      form.reset(); if(q(form,'id')) q(form,'id').value=''; if(q(form,'calendar_id')) q(form,'calendar_id').value=calBtn.dataset.calendar||''; if(q(form,'active')) q(form,'active').checked=true;
      form.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
  document.addEventListener('dblclick',function(e){
    var row=e.target.closest('.cmap-field-row');
    if(row) fillFieldEditor(row);
  });
  document.addEventListener('change',function(e){
    if(!e.target.classList.contains('js-cmap-field-preset')) return;
    var key=e.target.value, p=presets[key], form=document.getElementById('cmap-field-editor');
    if(!p || !form) return;
    if(q(form,'id')) q(form,'id').value='';
    if(q(form,'field_key')) q(form,'field_key').value=key;
    if(q(form,'label')) q(form,'label').value=p.label;
    if(q(form,'type')) q(form,'type').value=p.type;
    if(q(form,'width')) q(form,'width').value=p.width;
    if(q(form,'placeholder')) q(form,'placeholder').value=p.placeholder;
    if(q(form,'sort_order')) q(form,'sort_order').value=p.sort;
    if(q(form,'required')) q(form,'required').checked=!!p.required;
    if(q(form,'active')) q(form,'active').checked=true;
  });
})();
