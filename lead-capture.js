/* ═══════════════════════════════════════════════════════════
   LEAD CAPTURE — Popup Modal + Slider Lateral (coordinated)
   Elevate Dynamics 365
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ══════════════════════════════
  // SUPABASE CONFIG
  // ══════════════════════════════
  var SUPABASE_URL = 'https://sknreauewmriiuulejxh.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbnJlYXVld21yaWl1dWxlanhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODIwOTgsImV4cCI6MjA4OTc1ODA5OH0.0b8ve6XOYO80AxkW0x8_Uo6ItWnFLVYYJkYUQUfuELw';

  // ══════════════════════════════
  // SHARED STATE
  // ══════════════════════════════
  window.mcLeadCaptured = !!sessionStorage.getItem('mc_lead_captured');

  function markLeadCaptured() {
    window.mcLeadCaptured = true;
    sessionStorage.setItem('mc_lead_captured', 'true');
  }

  // ══════════════════════════════
  // SHARED: submitLead()
  // ══════════════════════════════
  function submitLead(data) {
    var params = new URLSearchParams(window.location.search);
    var payload = {
      nombre: data.nombre,
      email: data.email,
      pais: data.pais || null,
      telefono: data.telefono || null,
      source: data.source,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null
    };

    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 10000);

    return fetch(SUPABASE_URL + '/rest/v1/leads_masterclass', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function(response) {
      clearTimeout(timeout);
      if (response.ok) return { success: true };
      return response.text().then(function(errorText) {
        if (response.status === 409 || errorText.indexOf('duplicate') !== -1 || errorText.indexOf('unique') !== -1) {
          return { success: false, error: 'duplicate' };
        }
        return { success: false, error: 'network' };
      });
    }).catch(function(err) {
      clearTimeout(timeout);
      console.error('[Lead Capture] Network error:', err.message);
      return { success: false, error: 'network' };
    });
  }

  // ══════════════════════════════
  // SHARED: trackConversion()
  // Fires Google Ads conversion + GA4 lead event + Meta Pixel
  // ══════════════════════════════

  // Reemplaza AW-XXXXXXXXX/YYYYYYYYYY con tu Conversion ID / Conversion Label
  var GADS_CONVERSION_ID = 'AW-XXXXXXXXX/YYYYYYYYYY';

  function trackConversion(source) {
    if (typeof gtag !== 'undefined') {
      // Google Ads conversion (primary signal)
      gtag('event', 'conversion', {
        send_to: GADS_CONVERSION_ID,
        event_callback: function() { /* conversion sent */ }
      });
      // GA4 lead event (secondary signal)
      gtag('event', 'generate_lead', {
        event_category: 'conversion',
        event_label: source,
        value: 1
      });
    }
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Lead', {
        content_name: 'masterclass_gratuita',
        content_category: source
      });
    }
  }

  // Safe redirect: waits for gtag beacon, falls back after timeout
  function safeRedirect(url, delay) {
    setTimeout(function() {
      var redirected = false;
      function doRedirect() {
        if (redirected) return;
        redirected = true;
        window.location.href = url;
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', {
          send_to: GADS_CONVERSION_ID,
          transport_type: 'beacon',
          event_callback: doRedirect
        });
        // Fallback: redirect after 1s even if gtag callback doesn't fire
        setTimeout(doRedirect, 1000);
      } else {
        doRedirect();
      }
    }, delay);
  }


  // ══════════════════════════════
  // POPUP MODAL
  // ══════════════════════════════
  var mcOverlay   = document.getElementById('mc-overlay');
  var mcModal     = mcOverlay.querySelector('.mc-modal');
  var mcCloseBtn  = document.getElementById('mc-close');
  var mcForm      = document.getElementById('mc-form');
  var mcSubmitBtn = document.getElementById('mc-submit');
  var mcFormView  = document.getElementById('mc-form-view');
  var mcSuccessV  = document.getElementById('mc-success-view');
  var mcSuccessCloseBtn = document.getElementById('mc-success-close');

  var mcFocusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var mcPreviousFocus = null;
  var mcInSuccessState = false;
  var MC_REDIRECT_URL = '/m1-introduccion-d36-free?welcome=true&converted=1';

  function mcOpen() {
    if (window.mcLeadCaptured) {
      mcPreviousFocus = document.activeElement;
      mcInSuccessState = true;
      mcFormView.style.display = 'none';
      mcSuccessV.classList.add('mc-visible');
      mcOverlay.classList.add('mc-active');
      document.body.style.overflow = 'hidden';
      return;
    }
    mcPreviousFocus = document.activeElement;
    mcOverlay.classList.add('mc-active');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
      var first = mcModal.querySelector('input, select, button');
      if (first) first.focus();
    }, 100);
  }

  function mcClose() {
    if (mcInSuccessState) {
      window.location.href = MC_REDIRECT_URL;
      return;
    }
    mcOverlay.classList.remove('mc-active');
    document.body.style.overflow = '';
    if (mcPreviousFocus) mcPreviousFocus.focus();
    setTimeout(mcResetForm, 300);
  }

  function mcResetForm() {
    mcForm.reset();
    mcFormView.style.display = '';
    mcSuccessV.classList.remove('mc-visible');
    mcSubmitBtn.classList.remove('mc-loading');
    mcSubmitBtn.disabled = false;
    mcClearErrors();
  }

  function mcClearErrors() {
    var msgs = mcForm.querySelectorAll('.mc-error-msg');
    for (var i = 0; i < msgs.length; i++) msgs[i].classList.remove('mc-visible');
    var inputs = mcForm.querySelectorAll('.mc-input-error');
    for (var j = 0; j < inputs.length; j++) inputs[j].classList.remove('mc-input-error');
  }

  // Triggers
  document.addEventListener('click', function(e) {
    if (e.target.closest('.trigger-masterclass-popup')) {
      e.preventDefault();
      mcOpen();
    }
  });

  mcCloseBtn.addEventListener('click', mcClose);
  mcSuccessCloseBtn.addEventListener('click', mcClose);
  mcOverlay.addEventListener('click', function(e) { if (e.target === mcOverlay) mcClose(); });

  document.addEventListener('keydown', function(e) {
    if (!mcOverlay.classList.contains('mc-active')) return;
    if (e.key === 'Escape') { mcClose(); return; }
    if (e.key === 'Tab') {
      var focusable = mcModal.querySelectorAll(mcFocusableSelector);
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
  });

  // Phone prefix mapping
  var paisPrefijos = {
    'ES': '+34', 'MX': '+52', 'CO': '+57', 'AR': '+54', 'CL': '+56',
    'PE': '+51', 'EC': '+593', 'UY': '+598', 'PA': '+507', 'CR': '+506',
    'DO': '+1', 'OTHER': '+00'
  };
  var mcPhonePrefixEl = document.getElementById('mc-phone-prefix');

  // Blur validation
  var mcHasAttempted = false;
  var mcNameEl    = document.getElementById('mc-name');
  var mcEmailEl   = document.getElementById('mc-email');
  var mcCountryEl = document.getElementById('mc-country');
  var mcTermsEl   = document.getElementById('mc-terms');

  function mcValidateField(el, errorId, test) {
    if (!mcHasAttempted) return true;
    var ok = test(el);
    if (!ok) { mcShowError(el, errorId); } else { mcClearFieldError(el, errorId); }
    return ok;
  }

  mcNameEl.addEventListener('blur', function() {
    mcValidateField(mcNameEl, 'mc-name-error', function(el) { return el.value.trim().length > 0; });
  });
  mcEmailEl.addEventListener('blur', function() {
    mcValidateField(mcEmailEl, 'mc-email-error', function(el) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value); });
  });
  mcCountryEl.addEventListener('change', function() {
    mcValidateField(mcCountryEl, 'mc-country-error', function(el) { return !!el.value; });
    var prefix = paisPrefijos[mcCountryEl.value] || '+00';
    mcPhonePrefixEl.textContent = prefix;
    var phoneInput = document.getElementById('mc-phone');
    phoneInput.placeholder = mcCountryEl.value === 'OTHER' ? 'Incluye tu prefijo' : '600 000 000';
  });
  mcTermsEl.addEventListener('change', function() {
    if (!mcHasAttempted) return;
    if (mcTermsEl.checked) { document.getElementById('mc-terms-error').classList.remove('mc-visible'); }
    else { document.getElementById('mc-terms-error').classList.add('mc-visible'); }
  });

  // Submit
  mcForm.addEventListener('submit', function(e) {
    e.preventDefault();
    mcHasAttempted = true;
    mcClearErrors();

    var valid = true;
    if (!mcNameEl.value.trim()) { mcShowError(mcNameEl, 'mc-name-error'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mcEmailEl.value)) { mcShowError(mcEmailEl, 'mc-email-error'); valid = false; }
    if (!mcCountryEl.value) { mcShowError(mcCountryEl, 'mc-country-error'); valid = false; }
    if (!mcTermsEl.checked) { document.getElementById('mc-terms-error').classList.add('mc-visible'); valid = false; }
    if (!valid) return;

    mcSubmitBtn.classList.add('mc-loading');
    mcSubmitBtn.disabled = true;

    var mcPhoneNum = document.getElementById('mc-phone').value.trim();
    var mcPhoneFull = mcPhoneNum ? (mcPhonePrefixEl.textContent + ' ' + mcPhoneNum) : null;

    submitLead({
      nombre: mcNameEl.value.trim(),
      email: mcEmailEl.value.trim(),
      pais: mcCountryEl.value,
      telefono: mcPhoneFull,
      source: 'popup-modal'
    }).then(function(result) {
      if (result.success) {
        trackConversion('popup-modal');
        mcShowSuccess();
        safeRedirect(MC_REDIRECT_URL, 3000);
      } else if (result.error === 'duplicate') {
        markLeadCaptured();
        mcInSuccessState = true;
        mcFormView.style.display = 'none';
        mcSuccessV.classList.add('mc-visible');
        mcSuccessV.querySelector('.mc-success-title').textContent = 'Ya estás registrado';
        mcSuccessV.querySelector('.mc-success-msg').textContent = 'Revisa tu email para los detalles de acceso.';
        safeRedirect(MC_REDIRECT_URL, 3000);
      } else {
        mcSubmitBtn.classList.remove('mc-loading');
        mcSubmitBtn.disabled = false;
        var errEl = document.getElementById('mc-name-error');
        errEl.textContent = 'Error de conexión. Inténtalo de nuevo.';
        errEl.classList.add('mc-visible');
      }
    });
  });

  function mcShowError(input, errorId) {
    input.classList.add('mc-input-error');
    document.getElementById(errorId).classList.add('mc-visible');
  }
  function mcClearFieldError(input, errorId) {
    input.classList.remove('mc-input-error');
    document.getElementById(errorId).classList.remove('mc-visible');
  }
  function mcShowSuccess() {
    markLeadCaptured();
    mcInSuccessState = true;
    mcFormView.style.display = 'none';
    mcSuccessV.classList.add('mc-visible');
    mcSuccessCloseBtn.focus();
  }


  // ══════════════════════════════
  // SLIDER LATERAL
  // ══════════════════════════════
  var slOverlay  = document.getElementById('sl-overlay');
  var slPanel    = document.getElementById('sl-panel');
  var slCloseBtn = document.getElementById('sl-close');
  var slForm     = document.getElementById('sl-form');
  var slSubmitBtn= document.getElementById('sl-submit');
  var slFormView = document.getElementById('sl-form-view');
  var slSuccessV = document.getElementById('sl-success');
  var slNameEl   = document.getElementById('sl-name');
  var slEmailEl  = document.getElementById('sl-email');
  var slTermsEl  = document.getElementById('sl-terms-check');

  var slIsOpen = false;
  var slTriggered = false;
  var slIsMobile = window.innerWidth <= 600;

  function slShouldBlock() {
    if (mcOverlay.classList.contains('mc-active')) return true;
    if (window.mcLeadCaptured) return true;
    if (sessionStorage.getItem('mc_slider_dismissed')) return true;
    return false;
  }

  function slOpen() {
    if (slIsOpen || slTriggered || slShouldBlock()) return;
    slTriggered = true;
    slIsOpen = true;
    slOverlay.classList.add('active');
    slOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function slClose() {
    slIsOpen = false;
    slOverlay.classList.remove('active');
    slOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    sessionStorage.setItem('mc_slider_dismissed', 'true');
  }

  slCloseBtn.addEventListener('click', slClose);
  slOverlay.addEventListener('click', function(e) { if (e.target === slOverlay) slClose(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && slIsOpen) slClose(); });

  // TRIGGER 1: Exit intent (desktop only)
  if (!slIsMobile) {
    document.addEventListener('mouseout', function(e) {
      if (e.clientY <= 0 && e.relatedTarget === null) slOpen();
    });
  }

  // TRIGGER 2: Time on page (90 seconds)
  setTimeout(function() { slOpen(); }, 90000);

  // TRIGGER 3: Deep scroll (95% — casi al final)
  var slScrollThreshold = 0.95;
  var slScrollTriggered = false;
  window.addEventListener('scroll', function() {
    if (slScrollTriggered) return;
    var pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    if (pct >= slScrollThreshold) { slScrollTriggered = true; slOpen(); }
  }, { passive: true });

  // FORM
  slForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var msgs = slForm.querySelectorAll('.sl-error-msg');
    for (var i = 0; i < msgs.length; i++) msgs[i].classList.remove('sl-visible');
    var inputs = slForm.querySelectorAll('.sl-input-error');
    for (var j = 0; j < inputs.length; j++) inputs[j].classList.remove('sl-input-error');

    var valid = true;
    if (!slNameEl.value.trim()) {
      slNameEl.classList.add('sl-input-error');
      document.getElementById('sl-name-error').classList.add('sl-visible');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(slEmailEl.value)) {
      slEmailEl.classList.add('sl-input-error');
      document.getElementById('sl-email-error').classList.add('sl-visible');
      valid = false;
    }
    if (!valid) return;

    slSubmitBtn.classList.add('sl-loading');
    slSubmitBtn.disabled = true;

    submitLead({
      nombre: slNameEl.value.trim(),
      email: slEmailEl.value.trim(),
      pais: null,
      telefono: null,
      source: 'slider-exit-intent'
    }).then(function(result) {
      if (result.success) {
        trackConversion('slider-exit-intent');
        slShowSuccess();
      } else if (result.error === 'duplicate') {
        markLeadCaptured();
        slFormView.style.display = 'none';
        slSuccessV.classList.add('sl-visible');
        slSuccessV.querySelector('.sl-success-title').textContent = 'Ya estás registrado';
        slSuccessV.querySelector('.sl-success-text').textContent = 'Revisa tu email para los detalles de acceso.';
        safeRedirect(SL_REDIRECT_URL, 3000);
      } else {
        slSubmitBtn.classList.remove('sl-loading');
        slSubmitBtn.disabled = false;
        var errEl = document.getElementById('sl-name-error');
        errEl.textContent = 'Error de conexión. Inténtalo de nuevo.';
        errEl.classList.add('sl-visible');
      }
    });
  });

  var SL_REDIRECT_URL = '/m1-introduccion-d36-free?welcome=true&converted=1';

  function slShowSuccess() {
    markLeadCaptured();
    slFormView.style.display = 'none';
    slSuccessV.classList.add('sl-visible');
    setTimeout(function() { window.location.href = SL_REDIRECT_URL; }, 3000);
  }

})();
