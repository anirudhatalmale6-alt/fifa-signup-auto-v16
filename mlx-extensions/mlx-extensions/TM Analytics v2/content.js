(function(){

function DOMtoString(document_root) {
	var html = '',
		node = document_root.firstChild;
	while (node) {
		switch (node.nodeType) {
		case Node.ELEMENT_NODE:
			html += node.outerHTML;
			break;
		case Node.TEXT_NODE:
			html += node.nodeValue;
			break;
		case Node.CDATA_SECTION_NODE:
			html += '<![CDATA[' + node.nodeValue + ']]>';
			break;
		case Node.COMMENT_NODE:
			html += '<!--' + node.nodeValue + '-->';
			break;
		case Node.DOCUMENT_TYPE_NODE:
			html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
			break;
		}
		node = node.nextSibling;
	}
	return html;
}

var pre_name = '', pre_date = '', pre_venue = '', pre_frame;

if(location.href.match(/(ticketmaster|livenation)\.(com|ca)/) && document.querySelector('*[data-bdd="header-event-name"]')) {
	if(document.querySelector('*[data-bdd="header-event-name"]')) {
		pre_name = document.querySelector('*[data-bdd="header-event-name"]').innerText;
	}
	if(document.querySelector('*[data-bdd="header-venue-city-state"]')) {
		pre_venue = document.querySelector('*[data-bdd="header-venue-city-state"]').innerText;
	}
	if(document.querySelector('*[data-bdd="header-date-time"]')) {
		pre_date = document.querySelector('*[data-bdd="header-date-time"]').innerText;
	}

	try {
		chrome.runtime.sendMessage({
			action: "open",
			href: location.href,
			dom: DOMtoString(document),
			pre_name: pre_name,
			pre_date: pre_date,
			pre_venue: pre_venue,
			qq: 'queue'
		});
	} catch(e) {};
} else if(location.href.match(/(ticketmaster|livenation)\.(com|ca)/) && !document.querySelector('.captcha') && document.title.indexOf('Pardon Our Interruption') == -1) {
	try {
		var kakako = DOMtoString(document);
		if(!kakako.match(/<title>Pardon Our Interruption<\/title>/) && kakako.match(/queue-it\.net/)) {
			waitForElm('*[data-bdd="header-event-name"]').then(function(el) {
				chrome.runtime.sendMessage({
					action: "open",
					href: location.href,
					dom: DOMtoString(document)
				});
			});
		}
	} catch(e) {};
}

var default_title = document.title;
if(default_title.match(/^1 \| /)) default_title = default_title.replace(/^1 \| (.*)$/, '$1');
if(default_title.match(/^3 \| /)) default_title = default_title.replace(/^3 \| (.*)$/, '$1');

if((
	!location.href.match(/^https?:\/\/(www\.ticketmaster|ticketmaster|concerts.livenation|www\.livenation|livenation)\.(com|ca)\/checkout\/order\/complete/) &&
	!location.href.match(/^https?:\/\/(www\.ticketmaster|ticketmaster|concerts.livenation|www\.livenation|livenation)\.(com|ca)\/resale\/checkout\/order\/complete/)
	) && 
	(
		location.href.match(/^https?:\/\/(www\.ticketmaster|ticketmaster|concerts.livenation|www\.livenation|livenation)\.(com|ca)\/checkout\/order/) || 
		location.href.match(/^https?:\/\/(www\.ticketmaster|ticketmaster|concerts.livenation|www\.livenation|livenation)\.(com|ca)\/resale\/checkout\/order/) ||
		location.href.match(/^https?:\/\/(www\.checkout|checkout)\.(ticketmaster|livenation)\.(com|ca)/) 
	)
) { //if checkout page
	var int = setInterval(function() {
		var titi = '';
		if(document.querySelector('#timer-indicator')) titi = document.querySelector('#timer-indicator').innerText;
		else if(document.querySelector('*[data-tid="timer"] span')) titi = document.querySelector('*[data-tid="timer"] span').innerText;
		
		if(int && (titi == '' || titi == '00:00')) clearInterval(int);

		if(titi.length > 0) {
			document.title = titi + ' | ' + default_title;
		}
	}, 5000);
}

if(location.href.match(/^https?:\/\/shop\.axs\.com/)) { //if axs queue page
	var int = setInterval(function() {
		var nunu_queue;

		if(document.querySelector('#MainPart_lbQueueNumber')) {
			nunu_queue = parseInt(document.querySelector('#MainPart_lbQueueNumber').innerText.replace(/[^0-9]+/g,''));

			if(!isNaN(nunu_queue) && nunu_queue > 0) {
				document.title = nunu_queue.toString() + ' | ' + default_title;
			}
		}
	}, 2000);
}

if(location.href.match(/^https?:\/\/(www\.queue|queue)\.(ticketmaster|livenation)\.(com|ca)/)) { //if queue page
	var int = setInterval(function() {
		//if(int && (!document.querySelector('#MainPart_lbQueueNumber') || !document.querySelector('#MainPart_lbUsersInQueueCount'))) clearInterval(int);

		var nunu_queue, nunu_left;
		if(document.querySelector('#MainPart_lbQueueNumber')) {
			nunu_queue = parseInt(document.querySelector('#MainPart_lbQueueNumber').innerText.replace(/[^0-9]+/g,''));

			if(!isNaN(nunu_queue) && nunu_queue > 0) {
				document.title = nunu_queue + ' | ' + default_title;
			}
		}

		//send start queue
		var matches = DOMtoString(document).match(/eventId: '([^']+?)',/);
		if(matches && matches.length > 1 && matches[1].length > 0 && document.querySelector('#MainPart_lbQueueNumber')) {
			if(!isNaN(nunu_queue) && nunu_queue > 0) {
				try {
					chrome.runtime.sendMessage({
						action: "queue_start",
						number: nunu_queue,
						id: matches[1].trim()
					});

					clearInterval(int);
				} catch(e) {};
			}
		}
	}, 2000);
}

function waitForElm(selector) {
	return new Promise(resolve => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(mutations => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		setTimeout(function() {
			observer.disconnect();
		}, 120000);
	});
}

})();