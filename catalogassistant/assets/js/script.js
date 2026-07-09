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
      html: '<p>I’ve reviewed your catalogue and found <strong>3 critical errors</strong> that will block your Amazon export.</p>'
    },
    {
      heading: 'Error analysis',
      html: '<ul>' +
        '<li><code>MFN SKU base</code> — mandatory variation number missing <em>(Own value is empty)</em></li>' +
        '<li><code>FBA SKU base</code> — mandatory variation number missing <em>(Own value is empty)</em></li>' +
        '<li><code>item_dimensions.length.unit</code> / <code>item_dimensions.width.unit</code> — no unit mapped <em>(Export as is empty)</em></li>' +
        '</ul>' +
        '<p>Root cause: the SKU base fields have no value maintained, and the dimension unit fields have never been mapped to an Amazon identifier.</p>'
    },
    {
      heading: 'Step 1 — Fill in the missing SKU values',
      html: '<ul>' +
        '<li>Open the <strong>MFN SKU base</strong> row and enter the variation number in the <strong>Own value</strong> source’s Value field.</li>' +
        '<li>Do the same on the <strong>FBA SKU base</strong> row — Amazon requires a variation number on both fulfilment channels.</li>' +
        '</ul>'
    },
    {
      heading: 'Step 2 — Map the missing dimension units',
      html: '<p>Amazon rejects numerical dimensions if no unit is supplied.</p>' +
        '<ul>' +
        '<li>Open the <strong>item_dimensions</strong> panel.</li>' +
        '<li>On <strong>Item Length Unit</strong> and <strong>Item Width Unit</strong>, set <strong>Export as</strong> to the Amazon identifier for your internal unit (e.g. "centimeters").</li>' +
        '</ul>' +
        '<p class="proto-ai-note">Note: Amazon Germany typically enforces "centimeters" for most categories.</p>'
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
        '<button type="button" class="proto-ai-action-btn" id="proto-guide-start-btn">Show me a Step by Step guide</button>' +
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

  function handleGuideStartClick(button) {
    button.disabled = true;
    guideWidgetEl.hidden = false;
    renderGuideStepper();
    showStep(0);
  }

  if (aiResponse) {
    aiResponse.addEventListener('click', function (e) {
      var guideStartBtn = e.target.closest('#proto-guide-start-btn');
      if (guideStartBtn) {
        handleGuideStartClick(guideStartBtn);
        return;
      }
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
    closeStepper();
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

  // --- Guide me step by step ---------------------------------------------

  function findMappingRow(labelText) {
    var labels = document.querySelectorAll('.mapping-label');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === labelText) {
        return labels[i].closest('.mapping-row');
      }
    }
    return null;
  }

  function findSourceCardField(row, sourceTitle) {
    if (!row) return null;
    var cards = row.querySelectorAll('mat-card.source-card');
    for (var i = 0; i < cards.length; i++) {
      var titleEl = cards[i].querySelector('.source-value');
      if (titleEl && titleEl.textContent.trim() === sourceTitle) {
        return cards[i].querySelector('mat-form-field');
      }
    }
    return null;
  }

  function findFieldByLabel(row, labelText) {
    if (!row) return null;
    var fields = row.querySelectorAll('mat-form-field');
    for (var i = 0; i < fields.length; i++) {
      var labelEl = fields[i].querySelector('mat-label');
      if (labelEl && labelEl.textContent.trim() === labelText) {
        return fields[i];
      }
    }
    return null;
  }

  function findPanelByTitle(titleText) {
    var titles = document.querySelectorAll('mat-panel-title');
    for (var i = 0; i < titles.length; i++) {
      if (titles[i].textContent.trim() === titleText) {
        return titles[i].closest('mat-expansion-panel');
      }
    }
    return null;
  }

  function setPanelExpanded(panel, expanded) {
    if (!panel) return;
    var header = panel.querySelector('mat-expansion-panel-header');
    panel.classList.toggle('mat-expanded', expanded);
    if (expanded) {
      panel.setAttribute('expanded', '');
    } else {
      panel.removeAttribute('expanded');
    }
    if (header) {
      header.classList.toggle('mat-expanded', expanded);
      header.setAttribute('aria-expanded', String(expanded));
    }
  }

  document.querySelectorAll('mat-expansion-panel-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var panel = header.closest('mat-expansion-panel');
      if (!panel) return;
      setPanelExpanded(panel, !panel.classList.contains('mat-expanded'));
    });
  });

  var itemDimensionsPanel = findPanelByTitle('item_dimensions');
  if (itemDimensionsPanel) setPanelExpanded(itemDimensionsPanel, false);

  var guideWidgetEl = document.createElement('div');
  guideWidgetEl.className = 'proto-guide-widget';
  guideWidgetEl.hidden = true;
  document.body.appendChild(guideWidgetEl);

  var GUIDE_STEPS = [
    {
      rowLabel: 'MFN SKU base*',
      sourceTitle: 'Own value',
      text: 'Enter the mandatory variation number here.'
    },
    {
      rowLabel: 'FBA SKU base*',
      sourceTitle: 'Own value',
      text: 'Do the same on the FBA side — Amazon needs a variation number on both channels.'
    },
    {
      rowLabels: [
        'Item Length Unit (item_dimensions.length.unit)',
        'Item Width Unit (item_dimensions.width.unit)'
      ],
      fieldLabel: 'Export as',
      panelTitle: 'item_dimensions',
      text: 'Map the unit Amazon expects (e.g. centimeters). The same fix applies to the Item Width Unit row below.'
    }
  ];

  var guideStepIndex = 0;
  var guideHighlightedEls = [];
  var guideCalloutEls = [];
  var guideTimers = [];

  function clearGuideTimers() {
    guideTimers.forEach(function (id) { clearTimeout(id); });
    guideTimers = [];
  }

  function clearGuideHighlights() {
    guideHighlightedEls.forEach(function (el) { el.classList.remove('proto-guide-highlight'); });
    guideHighlightedEls = [];
    guideCalloutEls.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    guideCalloutEls = [];
  }

  function buildCallout(text, extraCount) {
    var el = document.createElement('div');
    el.className = 'proto-guide-callout';
    el.innerHTML = '<p style="margin:0">' + text +
      (extraCount ? ' <em>(+' + extraCount + ' more below)</em>' : '') + '</p>';
    return el;
  }

  function updateStepperUi(index) {
    var labelEl = guideWidgetEl.querySelector('#proto-guide-stepper-label');
    if (!labelEl) return;
    var isLastStep = index === GUIDE_STEPS.length - 1;
    labelEl.textContent = (index + 1) + ' of ' + GUIDE_STEPS.length + ' errors to fix';
    guideWidgetEl.querySelector('#proto-guide-prev-btn').disabled = index === 0;
    var nextBtn = guideWidgetEl.querySelector('#proto-guide-next-btn');
    nextBtn.textContent = isLastStep ? 'Done' : '›';
    nextBtn.classList.toggle('proto-guide-stepper-done', isLastStep);
    // "Done" already closes the walkthrough, so the separate × would be a
    // redundant second close action right next to it — hide it on this step.
    guideWidgetEl.querySelector('#proto-guide-stepper-close').hidden = isLastStep;
  }

  function showStep(index) {
    clearGuideTimers();
    clearGuideHighlights();
    guideStepIndex = index;

    var step = GUIDE_STEPS[index];
    var rowLabels = step.rowLabels || [step.rowLabel];
    var rows = rowLabels.map(findMappingRow).filter(Boolean);
    if (!rows.length) { updateStepperUi(index); return; }

    var panel = step.panelTitle ? findPanelByTitle(step.panelTitle) : rows[0].closest('mat-expansion-panel');
    var alreadyExpanded = !panel || panel.classList.contains('mat-expanded');
    if (panel && !alreadyExpanded) setPanelExpanded(panel, true);

    var applyHighlights = function () {
      rows.forEach(function (row, i) {
        var field = step.sourceTitle
          ? findSourceCardField(row, step.sourceTitle)
          : findFieldByLabel(row, step.fieldLabel);
        var target = field || row;
        target.classList.add('proto-guide-highlight');
        guideHighlightedEls.push(target);
        if (i === 0) {
          var callout = buildCallout(step.text, rows.length - 1);
          row.insertAdjacentElement('afterend', callout);
          guideCalloutEls.push(callout);
        }
      });
      if (guideHighlightedEls[0]) {
        guideHighlightedEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      updateStepperUi(index);
    };

    if (panel && !alreadyExpanded) {
      guideTimers.push(setTimeout(applyHighlights, 280));
    } else {
      applyHighlights();
    }
  }

  function renderGuideStepper() {
    guideWidgetEl.innerHTML =
      '<button type="button" class="proto-guide-stepper-nav" id="proto-guide-prev-btn" aria-label="Previous">&lsaquo;</button>' +
      '<span class="proto-guide-stepper-label" id="proto-guide-stepper-label"></span>' +
      '<button type="button" class="proto-guide-stepper-nav" id="proto-guide-next-btn" aria-label="Next">&rsaquo;</button>' +
      '<button type="button" class="proto-guide-stepper-close" id="proto-guide-stepper-close" aria-label="Close guide">&times;</button>';
    guideWidgetEl.querySelector('#proto-guide-prev-btn').addEventListener('click', function () {
      if (guideStepIndex > 0) showStep(guideStepIndex - 1);
    });
    guideWidgetEl.querySelector('#proto-guide-next-btn').addEventListener('click', function () {
      if (guideStepIndex < GUIDE_STEPS.length - 1) showStep(guideStepIndex + 1);
      else closeStepper();
    });
    guideWidgetEl.querySelector('#proto-guide-stepper-close').addEventListener('click', closeStepper);
  }

  function closeStepper() {
    clearGuideTimers();
    clearGuideHighlights();
    guideWidgetEl.hidden = true;
    guideWidgetEl.innerHTML = '';
  }

  // -------------------------------------------------------------------------

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
