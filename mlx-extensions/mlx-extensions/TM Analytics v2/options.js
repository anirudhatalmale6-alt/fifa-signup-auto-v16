// Saves options to chrome.storage
function save_options() {
	var spreadsheetId = document.getElementById("spreadsheetId").value;
	var data_sheet = document.getElementById("data_sheet").value;
	var purchase_sheet = document.getElementById("purchase_sheet").value;
	var profile_name = document.getElementById("profile_name").value;

	if(spreadsheetId) spreadsheetId = spreadsheetId.trim();
	if(data_sheet) data_sheet = data_sheet.trim();
	if(purchase_sheet) purchase_sheet = purchase_sheet.trim();
	if(profile_name) profile_name = profile_name.trim();

	chrome.storage.local.set({
		tma_spreadsheetId: spreadsheetId,
		tma_data_sheet: data_sheet,
		tma_purchase_sheet: purchase_sheet,
		tma_profile_name: profile_name
	}, function() {
		if(chrome.runtime.lastError) {
			document.getElementById("status").textContent = 'Error: ' + chrome.runtime.lastError;
			document.getElementById("status").className = 'alert error';
		} else {
			document.getElementById("status").textContent = 'Options saved.';
			document.getElementById("status").className = 'alert success';
		}
	});
}

// Restores from chrome.storage
function restore_options() {
	chrome.storage.local.get(['tma_spreadsheetId', 'tma_data_sheet', 'tma_purchase_sheet', 'tma_profile_name'], function(result) {
		if(typeof result.tma_spreadsheetId != "undefined") document.getElementById("spreadsheetId").value = result.tma_spreadsheetId;
		if(typeof result.tma_data_sheet != "undefined") document.getElementById("data_sheet").value = result.tma_data_sheet;
		if(typeof result.tma_purchase_sheet != "undefined") document.getElementById("purchase_sheet").value = result.tma_purchase_sheet;
		if(typeof result.tma_profile_name != "undefined") document.getElementById("profile_name").value = result.tma_profile_name;
	});
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
	save_options);