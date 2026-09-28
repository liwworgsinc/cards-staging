/* Staging only: Showtime Store product photos can be uploaded or linked.
   The existing product image_urls[0], preview, and save pipeline remain authoritative. */
(function () {
  'use strict';
  if (window.__LIW_SHOWTIME_PRODUCT_IMAGES__) return;
  window.__LIW_SHOWTIME_PRODUCT_IMAGES__ = true;

  var list = document.getElementById('product-list');
  if (!list) return;

  function isShowtime() {
    return String(document.querySelector('[name="card_experience"]')?.value || '').toLowerCase() === 'music';
  }

  function validImageUrl(value) {
    try {
      var url = new URL(String(value || '').trim());
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function say(row, message, error) {
    var status = row?.querySelector('[data-showtime-image-status]');
    if (status) {
      status.textContent = message || '';
      status.classList.toggle('is-error', !!error);
    }
  }

  function updatePreview(row) {
    var field = row.querySelector('[data-product-field="image_url"]');
    var preview = row.querySelector('[data-showtime-product-preview]');
    if (!field || !preview) return;
    var raw = field.value.trim();
    var url = validImageUrl(raw);
    var image = preview.querySelector('img');
    var empty = preview.querySelector('span');
    var remove = row.querySelector('[data-showtime-remove-image]');
    if (remove) remove.disabled = !raw;
    if (!url) {
      image.hidden = true;
      image.removeAttribute('src');
      empty.hidden = false;
      empty.textContent = raw ? 'Use a full http(s) image URL' : 'No photo yet';
      return;
    }
    image.onload = function () {
      if (image.src === url) {
        image.hidden = false;
        empty.hidden = true;
      }
    };
    image.onerror = function () {
      if (image.src === url) {
        image.hidden = true;
        empty.hidden = false;
        empty.textContent = 'Image could not be loaded';
      }
    };
    empty.hidden = true;
    image.hidden = false;
    if (image.src !== url) image.src = url;
  }

  function enhanceRow(row) {
    if (row.querySelector('[data-showtime-product-image]')) return;
    var field = row.querySelector('[data-product-field="image_url"]');
    var fields = field?.closest('.form-row');
    if (!field || !fields) return;
    var media = document.createElement('div');
    media.className = 'liw-showtime-product-image';
    media.dataset.showtimeProductImage = 'true';
    media.innerHTML =
      '<div class="liw-showtime-image-preview" data-showtime-product-preview><img alt="Product photo preview" hidden><span>No photo yet</span></div>' +
      '<div class="liw-showtime-image-content"><strong>Product photo</strong>' +
      '<p>Upload a PNG, JPG, or WebP (up to 5 MB), or paste an image URL below.</p>' +
      '<div class="liw-showtime-image-actions">' +
      '<label class="btn btn-light btn-sm">Upload image<input type="file" hidden accept="image/png,image/jpeg,image/webp" data-showtime-image-file aria-label="Upload product image"></label>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-showtime-remove-image>Remove photo</button>' +
      '</div><small data-showtime-image-status role="status" aria-live="polite"></small></div>';
    fields.parentNode.insertBefore(media, fields);
    field.setAttribute('aria-label', 'Product image URL');
    field.placeholder = 'Or paste image URL (https://...)';
    updatePreview(row);
  }

  function syncRows() {
    var active = isShowtime();
    list.querySelectorAll('[data-product-index]').forEach(function (row) {
      if (active) enhanceRow(row);
      else row.querySelector('[data-showtime-product-image]')?.remove();
    });
  }

  async function upload(input) {
    var row = input.closest('[data-product-index]');
    if (!row) return;
    var file = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (!isShowtime()) return;
    if (typeof hasEntitlement === 'function' && !hasEntitlement('product_showcase')) {
      say(row, 'Product Showcase is not enabled on this plan.', true);
      return;
    }
    if (typeof canEditCurrentCard !== 'undefined' && !canEditCurrentCard) {
      say(row, 'This card is view-only.', true);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      say(row, 'Choose a JPG, PNG, or WebP image.', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      say(row, 'Image must be 5 MB or smaller.', true);
      return;
    }
    var index = Number(row.dataset.productIndex);
    var product = typeof products !== 'undefined' && Array.isArray(products) ? products[index] : null;
    if (!product) return;
    input.disabled = true;
    say(row, 'Uploading photo…');
    try {
      var auth = await supabaseClient.auth.getUser();
      if (auth.error) throw auth.error;
      var owner = auth.data?.user;
      if (!owner?.id) throw new Error('Sign in again to upload a product photo.');
      var safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-90) || 'image';
      var path = owner.id + '/showtime-products/' + (typeof currentId !== 'undefined' && currentId ? currentId : 'draft') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 9) + '-' + safeName;
      var storage = supabaseClient.storage.from('profile-images');
      var result = await storage.upload(path, file, { cacheControl: '3600', upsert: false });
      if (result.error) throw result.error;
      var publicUrl = storage.getPublicUrl(path)?.data?.publicUrl;
      if (!validImageUrl(publicUrl)) throw new Error('The uploaded photo did not return a usable URL.');
      var liveIndex = products.indexOf(product);
      if (liveIndex < 0) throw new Error('The product was removed during upload. Add it again to attach a photo.');
      product.image_urls = [publicUrl];
      var liveRow = list.querySelector('[data-product-index="' + liveIndex + '"]');
      var urlField = liveRow?.querySelector('[data-product-field="image_url"]');
      if (urlField) {
        urlField.value = publicUrl;
        urlField.dispatchEvent(new Event('input', { bubbles: true }));
        updatePreview(liveRow);
      } else {
        if (typeof render === 'function') render();
        if (typeof scheduleSave === 'function') scheduleSave();
      }
      say(liveRow, 'Photo uploaded · saving card…');
      if (typeof flushSave === 'function') await flushSave({ silent: true });
      say(liveRow, 'Photo uploaded and saved.');
      if (typeof toast === 'function') toast('Product photo added');
    } catch (error) {
      var currentRow = typeof products !== 'undefined' && Array.isArray(products)
        ? list.querySelector('[data-product-index="' + products.indexOf(product) + '"]') : null;
      say(currentRow || row, error?.message || 'Unable to upload the product photo.', true);
      if (typeof toast === 'function') toast(error?.message || 'Product photo upload failed');
    } finally {
      input.disabled = false;
    }
  }

  list.addEventListener('change', function (event) {
    if (event.target.matches('[data-showtime-image-file]')) upload(event.target);
  });
  list.addEventListener('input', function (event) {
    if (event.target.matches('[data-product-field="image_url"]')) {
      var row = event.target.closest('[data-product-index]');
      if (row) {
        updatePreview(row);
        say(row, '');
      }
    }
  });
  list.addEventListener('click', function (event) {
    var button = event.target.closest('[data-showtime-remove-image]');
    if (!button) return;
    var row = button.closest('[data-product-index]');
    var field = row?.querySelector('[data-product-field="image_url"]');
    if (!field) return;
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    updatePreview(row);
    say(row, 'Photo removed · changes autosave.');
  });

  new MutationObserver(syncRows).observe(list, { childList: true });
  document.addEventListener('liw:artist-settings-rendered', syncRows);
  document.querySelector('[name="card_experience"]')?.addEventListener('change', syncRows);
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-card-experience]')) setTimeout(syncRows, 60);
  }, true);
  syncRows();
})();