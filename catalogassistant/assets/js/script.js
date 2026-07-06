(function () {
  'use strict';

  function closeAllDropdowns(except) {
    document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
      if (menu === except) return;
      menu.classList.remove('show');
      var toggle = menu.parentElement.querySelector('.dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle="dropdown"]');
    if (toggle) {
      e.preventDefault();
      var parent = toggle.closest('.dropdown, .nav-item');
      var menu = parent ? parent.querySelector('.dropdown-menu') : null;
      if (!menu) return;
      var isOpen = menu.classList.contains('show');
      closeAllDropdowns(isOpen ? null : menu);
      menu.classList.toggle('show', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
      return;
    }
    if (!e.target.closest('.dropdown-menu')) {
      closeAllDropdowns(null);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllDropdowns(null);
  });

  var AI_PANEL_WIDTH = 416;
  var aiAnalyseBtn = document.getElementById('proto-ai-analyse-btn');
  var aiDrawer = document.getElementById('proto-ai-drawer');
  var aiDrawerContent = document.getElementById('proto-app-drawer-content');
  var aiCloseBtn = document.getElementById('proto-ai-close-btn');
  var aiSuggested = document.getElementById('proto-ai-suggested');
  var aiResponse = document.getElementById('proto-ai-response');
  var aiTimers = [];

  var AI_STATUS_MESSAGES = [
    'Analysing your errors...',
    'Analysing your catalogue...',
    'Creating recommendations to fix issues...'
  ];

  var AI_RESPONSE_SECTIONS = [
    {
      html: '<p>I’ve reviewed your catalogue and found <strong>3 critical errors</strong> across 2 SKUs, all missing required attributes.</p>'
    },
    {
      heading: 'Error analysis (SKU: 2560_mfn_05 & 4040_mfn)',
      html: '<ul>' +
        '<li><code>model_number</code> — required but not supplied <em>(Mandatory)</em></li>' +
        '<li><code>included_components</code> — required but not supplied <em>(Mandatory)</em></li>' +
        '<li><code>item_length_width</code> (L × W) — required but not supplied <em>(Mandatory)</em></li>' +
        '</ul>' +
        '<p>Root cause: your mapping for the <strong>HARDWARE_HANDLE</strong> category is missing links to these three fields, or the items don’t have this data maintained in their product properties.</p>'
    },
    {
      heading: 'Step 1 — Verify product data',
      html: '<ul>' +
        '<li>Go to <strong>Item » Edit Item</strong> and search for SKUs <code>2560_mfn_05</code> and <code>4040_mfn</code>.</li>' +
        '<li>Check if a <strong>Model Number</strong> and <strong>Dimensions</strong> (Length/Width) are maintained in the Properties or Technical Data tabs.</li>' +
        '<li>Ensure there is a property for <strong>Included Components</strong> (e.g. "1 Handle, 2 Screws").</li>' +
        '</ul>'
    },
    {
      heading: 'Step 2 — Update the mapping',
      html: '<p>Link the following Amazon target attributes to your PlentyOne properties:</p>' +
        '<ul>' +
        '<li><strong>Model Number:</strong> <code>model_number.value</code> → Item Property &gt; Model Number</li>' +
        '<li><strong>Included Components:</strong> <code>included_components.value</code> → Item Property &gt; Included Components</li>' +
        '<li><strong>Dimensions:</strong> <code>item_length_width.length.value</code> → your Length property, <code>item_length_width.width.value</code> → your Width property</li>' +
        '</ul>'
    },
    {
      heading: 'Step 3 — Configure mandatory units',
      html: '<p>Amazon will reject numerical dimensions if the unit is missing.</p>' +
        '<ul>' +
        '<li>Find <code>item_length_width.length.unit</code> and <code>item_length_width.width.unit</code>.</li>' +
        '<li>Click <strong>Mappings</strong> and map your internal unit (e.g. "cm") to the Amazon identifier: <strong>centimeters</strong>.</li>' +
        '</ul>' +
        '<p class="proto-ai-note">Note: Amazon Germany typically enforces "centimeters" for Hardware.</p>'
    }
  ];

  var AI_STATUS_DELAY = 900;
  var AI_SECTION_DELAY = 900;

  function clearAiTimers() {
    aiTimers.forEach(function (id) { clearTimeout(id); });
    aiTimers = [];
  }

  function renderAiResponse() {
    if (!aiResponse) return;

    clearAiTimers();
    aiResponse.innerHTML = '';
    aiResponse.hidden = false;
    if (aiSuggested) aiSuggested.hidden = true;

    var statusEl = document.createElement('p');
    statusEl.className = 'proto-ai-status';
    aiResponse.appendChild(statusEl);

    AI_STATUS_MESSAGES.forEach(function (message, i) {
      aiTimers.push(setTimeout(function () {
        statusEl.textContent = message;
      }, i * AI_STATUS_DELAY));
    });

    var afterStatusDelay = AI_STATUS_MESSAGES.length * AI_STATUS_DELAY;

    AI_RESPONSE_SECTIONS.forEach(function (section, i) {
      aiTimers.push(setTimeout(function () {
        if (i === 0 && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
        var sectionEl = document.createElement('div');
        sectionEl.className = 'proto-ai-section';
        sectionEl.innerHTML = (section.heading ? '<h4>' + section.heading + '</h4>' : '') + section.html;
        aiResponse.appendChild(sectionEl);
      }, afterStatusDelay + i * AI_SECTION_DELAY));
    });

    var afterSectionsDelay = afterStatusDelay + AI_RESPONSE_SECTIONS.length * AI_SECTION_DELAY;

    aiTimers.push(setTimeout(function () {
      var actionsEl = document.createElement('div');
      actionsEl.className = 'proto-ai-section proto-ai-actions';
      actionsEl.innerHTML =
        '<button type="button" class="proto-ai-action-btn" id="proto-ai-verify-btn">Verify the recommended changes I made</button>' +
        '<button type="button" class="proto-ai-action-btn" id="proto-ai-validate-guide-btn">Give me a guide how to validate with real data</button>';
      aiResponse.appendChild(actionsEl);
    }, afterSectionsDelay));
  }

  function appendAiSection(heading, html) {
    if (!aiResponse) return null;
    var sectionEl = document.createElement('div');
    sectionEl.className = 'proto-ai-section';
    sectionEl.innerHTML = (heading ? '<h4>' + heading + '</h4>' : '') + html;
    aiResponse.appendChild(sectionEl);
    return sectionEl;
  }

  function handleVerifyClick(button) {
    button.disabled = true;
    var statusEl = document.createElement('p');
    statusEl.className = 'proto-ai-status';
    statusEl.textContent = 'Verifying your mapping changes....';
    aiResponse.appendChild(statusEl);

    aiTimers.push(setTimeout(function () {
      if (statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
      appendAiSection(null, '<p>✓ All changes <strong class="proto-ai-success">look good</strong>. You can save the catalogue.</p>');
    }, 1200));
  }

  function handleValidateGuideClick(button) {
    button.disabled = true;
    appendAiSection(
      'How to validate the export?',
      '<ul>' +
        '<li>Set the catalog to <strong>Test mode</strong> in the settings.</li>' +
        '<li>Trigger the export manually.</li>' +
        '<li>Go to the Export Status and download the new Processing CSV.</li>' +
        '<li>If the status for these SKUs is now <strong>SUCCESS</strong>, turn off Test Mode to go live.</li>' +
        '</ul>'
    );
  }

  if (aiResponse) {
    aiResponse.addEventListener('click', function (e) {
      var verifyBtn = e.target.closest('#proto-ai-verify-btn');
      if (verifyBtn) {
        handleVerifyClick(verifyBtn);
        return;
      }
      var guideBtn = e.target.closest('#proto-ai-validate-guide-btn');
      if (guideBtn) {
        handleValidateGuideClick(guideBtn);
        return;
      }
    });
  }

  function resetAiResponse() {
    clearAiTimers();
    if (aiResponse) {
      aiResponse.hidden = true;
      aiResponse.innerHTML = '';
    }
    if (aiSuggested) aiSuggested.hidden = false;
  }

  function openAiPanel() {
    if (!aiDrawer) return;
    aiDrawer.classList.add('mat-drawer-opened');
    aiDrawer.style.width = AI_PANEL_WIDTH + 'px';
    if (aiDrawerContent) aiDrawerContent.style.marginRight = AI_PANEL_WIDTH + 'px';
    renderAiResponse();
  }

  function closeAiPanel() {
    if (!aiDrawer) return;
    aiDrawer.classList.remove('mat-drawer-opened');
    aiDrawer.style.width = '0px';
    if (aiDrawerContent) aiDrawerContent.style.marginRight = '0px';
    resetAiResponse();
  }

  if (aiAnalyseBtn) aiAnalyseBtn.addEventListener('click', openAiPanel);
  if (aiCloseBtn) aiCloseBtn.addEventListener('click', closeAiPanel);

  var navToggler = document.querySelector('.navbar-toggler');
  var navCollapse = document.querySelector('.navbar-collapse');
  if (navToggler && navCollapse) {
    navToggler.addEventListener('click', function () {
      navCollapse.classList.toggle('collapse');
    });
  }

  function nodeLevel(node) {
    return parseInt(node.getAttribute('aria-level') || '0', 10);
  }

  document.querySelectorAll('.terra-side-nav-node-toggle button').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'true');
    btn.addEventListener('click', function () {
      var node = btn.closest('mat-tree-node');
      if (!node) return;
      var level = nodeLevel(node);
      var expanded = btn.getAttribute('aria-expanded') !== 'false';
      var icon = btn.querySelector('mat-icon');

      var sibling = node.nextElementSibling;
      while (sibling) {
        if (sibling.tagName && sibling.tagName.toLowerCase() === 'mat-tree-node') {
          if (nodeLevel(sibling) <= level) break;
          sibling.style.display = expanded ? 'none' : '';
        }
        sibling = sibling.nextElementSibling;
      }

      btn.setAttribute('aria-expanded', String(!expanded));
      if (icon) icon.textContent = expanded ? 'chevron_right' : 'expand_more';
    });
  });
})();
