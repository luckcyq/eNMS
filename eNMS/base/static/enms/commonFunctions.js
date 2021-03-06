/*
global
alertify: false
fields: false
propertyTypes: false
table: false
tableActions: false
*/

let selects = [];

/**
 * Update link to the docs.
 * @param {url} url - URL pointing to the right page of the docs.
 */
function doc(url) { // eslint-disable-line no-unused-vars
  $('#doc-link').attr('href', url);
}

/**
 * Show modal.
 * @param {name} name - Modal name.
 */
function showModal(name) { // eslint-disable-line no-unused-vars
  $(`#${name}`).modal('show');
}

/**
 * Reset form and show modal.
 * @param {name} name - Modal name.
 */
function resetShowModal(name) { // eslint-disable-line no-unused-vars
  $(`#${name}-form`).trigger('reset');
  $(`#${name}`).modal('show');
}

/**
 * Convert to Bootstrap Select.
 * @param {ids} ids - Ids.
 */
function convertSelect(...ids) { // eslint-disable-line no-unused-vars
  ids.forEach((id) => {
    selects.push(id);
    $(id).selectpicker({
      liveSearch: true,
      actionsBox: true,
    });
  });
}

/**
 * Returns partial function.
 * @param {function} func - any function
 * @return {function}
 */
function partial(func, ...args) { // eslint-disable-line no-unused-vars
  return function() {
    return func.apply(this, args);
  };
}

/**
 * Capitalize.
 * @param {string} string - Word.
 * @return {capitalizedString}
 */
function capitalize(string) { // eslint-disable-line no-unused-vars
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Process results.
 * @param {callback} callback - Callback function.
 * @param {results} results - Results.
 */
function processResults(callback, results) {
  if (!results) {
    alertify.notify('HTTP Error 403 – Forbidden', 'error', 5);
  } else if (results.error) {
    alertify.notify(results.error, 'error', 5);
  } else {
    callback(results);
  }
}

/**
 * jQuery Ajax Call.
 * @param {url} url - Url.
 * @param {callback} callback - Function to process results.
 */
function call(url, callback) { // eslint-disable-line no-unused-vars
  $.ajax({
    type: 'POST',
    url: url,
    success: function(results) {
      processResults(callback, results);
    },
  });
}

/**
 * jQuery Ajax Form Call.
 * @param {url} url - Url.
 * @param {form} form - Form.
 * @param {callback} callback - Function to process results.
 */
function fCall(url, form, callback) { // eslint-disable-line no-unused-vars
  if ($(form).parsley().validate()) {
    $.ajax({
      type: 'POST',
      url: url,
      data: $(form).serialize(),
      success: function(results) {
        processResults(callback, results);
      },
    });
  }
}

/**
 * Delete object.
 * @param {type} type - Node or link.
 * @param {id} id - Id of the object to delete.
 */
function confirmDeletion(type, id) { // eslint-disable-line no-unused-vars
  $('#confirm-delete-button').attr(
    'onclick',
    `deleteInstance('${type}', ${id})`
  );
  $('#confirm-delete').modal('show');
}

/**
 * Delete object.
 * @param {type} type - Node or link.
 * @param {id} id - Id of the object to delete.
 */
function deleteInstance(type, id) { // eslint-disable-line no-unused-vars
  call(`/delete/${type}/${id}`, function(result) {
    $('#confirm-delete').modal('hide');
    table.row($(`#${id}`)).remove().draw(false);
    alertify.notify(
      `${capitalize(type)} '${result.name}' deleted.`, 'error', 5
    );
  });
}

/**
 * Display type modal for creation.
 * @param {type} type - Type.
 */
function showCreateModal(type) { // eslint-disable-line no-unused-vars
  $(`#edit-${type}-form`).trigger('reset');
  $(`#${type}-id`).val('');
  selects.forEach((id) => $(id).selectpicker('render'));
  $(`#title-${type}`).text(`Create a New ${type}`);
  $(`#edit-${type}`).modal('show');
}

/**
 * Display instance modal for editing.
 * @param {type} type - Type.
 * @param {instance} instance - Object instance.
 * @param {dup} dup - Edit versus duplicate.
 */
function processInstance(type, instance, dup) {
  const mode = dup ? 'Duplicate' : 'Edit';
  $(`#title-${type}`).text(`${mode} ${type} '${instance.name}'`);
  if (dup) instance.id = instance.name = '';
  for (const [property, value] of Object.entries(instance)) {
    const propertyType = propertyTypes[property] || 'str';
    if (propertyType.includes('bool') || property.includes('regex')) {
      $(`#${type}-${property}`).prop('checked', value);
    } else if (propertyType.includes('dict')) {
      $(`#${type}-${property}`).val(value ? JSON.stringify(value): '{}');
    } else if (propertyType.includes('list')) {
      $(`#${type}-${property}`).selectpicker('deselectAll');
      $(`#${type}-${property}`).selectpicker(
        'val',
        propertyType === 'object-list' ? value.map((p) => p.id) : value
      );
      $(`#${type}-${property}`).selectpicker('render');
    } else if (propertyType == 'object') {
      $(`#${type}-${property}`).val(value.id);
    } else {
      $(`#${type}-${property}`).val(value);
    }
  }
  $(`#edit-${type}`).modal('show');
}

/**
 * Display instance modal for editing.
 * @param {type} type - Type.
 * @param {id} id - Instance ID.
 * @param {dup} dup - Edit versus duplicate.
 */
function showTypeModal(type, id, dup) { // eslint-disable-line no-unused-vars
  call(`/get/${type}/${id}`, function(instance) {
    processInstance(type, instance, dup);
  });
}

/**
 * Save instance.
 * @param {type} type - Type.
 * @param {instance} instance - Object instance.
 * @param {hideModal} hideModal - Hide edit modal after saving.
 * @return {mode}
 */
function saveInstance(type, instance, hideModal=true) {
  const title = $(`#title-${type}`).text().startsWith('Edit');
  const mode = title ? 'edit' : 'create';
  const message = `${type} '${instance.name}'
  ${mode == 'edit' ? 'edited' : 'created'}.`;
  alertify.notify(message, 'success', 5);
  if (hideModal) {
    $(`#edit-${type}`).modal('hide');
  }
  return mode;
}

/**
 * Create or edit instance.
 * @param {type} type - Type.
 */
function processData(type) { // eslint-disable-line no-unused-vars
  fCall(`/update/${type}`, `#edit-${type}-form`, function(instance) {
    const mode = saveInstance(type, instance);
    addInstance(mode, type, instance);
  });
}

/**
 * Add instance to datatable or edit line.
 * @param {mode} mode - Create or edit.
 * @param {type} type - Type.
 * @param {instance} instance - Properties of the instance.
 */
function addInstance(mode, type, instance) {
  let values = [];
  for (let i = 0; i < fields.length; i++) {
    values.push(`${instance[fields[i]]}`);
  }
  tableActions(values, instance);
  if (mode == 'edit') {
    table.row($(`#${instance.id}`)).data(values);
  } else {
    const rowNode = table.row.add(values).draw(false).node();
    $(rowNode).attr('id', `${instance.id}`);
  }
}
