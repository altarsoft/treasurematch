// Определяет портал и подключает только его SDK — чужие SDK не загружаются.
// Портал можно задать вручную для локальной отладки: ?portal=yandex|poki|crazy|gamepix|vkplay|generic
(function () {

	function getQueryParam(name) {
		var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
		return m ? decodeURIComponent(m[1]) : null;
	}

	var host = location.hostname.toLowerCase();
	var portal = (getQueryParam('portal') || '').toLowerCase();

	if (!portal) {
		if (/(^|\.)yandex\.(ru|net|com|by|kz|uz)$/.test(host) || /(^|\.)ya\.ru$/.test(host)) { portal = 'yandex'; }
		else if (/(^|\.)poki(-internal)?\.(com|io)$/.test(host)) { portal = 'poki'; }
		else if (/(^|\.)crazygames\.(com|co\.uk)$/.test(host)) { portal = 'crazy'; }
		else if (/(^|\.)gamepix\.com$/.test(host)) { portal = 'gamepix'; }
		else if (/(^|\.)vk-apps\.com$/.test(host) || getQueryParam('vk_app_id')) { portal = 'vk'; }
		else if (getQueryParam('sign') && getQueryParam('appid')) { portal = 'vkplay'; }
		else { portal = 'generic'; }
	}

	window.portal = portal;
	window.lang = window.lang || '';

	// Для VK Play и VK Mini Apps язык по умолчанию — русский
	if (portal === 'vkplay' || portal === 'vk') { window.lang = 'ru'; }

	function addSdk(src, onload) {
		var s = document.createElement('script');
		s.src = src;
		if (onload) { s.onload = onload; }
		document.head.appendChild(s);
	}

	if (portal === 'yandex') {
		addSdk('https://yandex.ru/games/sdk/v2', function () {
			YaGames.init().then(function (ysdk) {
				window.ysdk = ysdk;
				var i18n = ysdk.environment && ysdk.environment.i18n;
				window.lang = i18n && i18n.lang ? i18n.lang : '';
				window.tld = i18n ? i18n.tld : '';
				console.log('Yandex SDK initialized, lang: ' + window.lang);
			}).catch(console.error);
		});
	} else if (portal === 'poki') {
		// Poki SDK подключается статическим тегом в index-poki.html (требование площадки)
	} else if (portal === 'crazy') {
		addSdk('https://sdk.crazygames.com/crazygames-sdk-v3.js', function () {
			if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.init) {
				window.CrazyGames.SDK.init().catch(console.error);
			}
		});
	} else if (portal === 'gamepix') {
		addSdk('https://integration.gamepix.com/sdk/v3/gamepix.sdk.js');
	} else if (portal === 'vk') {
		// VK Mini Apps: реклама через VK Bridge (VKWebAppShowNativeAds), VKWebAppInit обязателен
		addSdk('vk-bridge.js', function () {
			if (window.vkBridge && window.vkBridge.send) {
				window.vkBridge.send('VKWebAppInit').catch(function (e) {
					console.log('VKWebAppInit failed (outside VK client):', e);
				});
			}
		});
	}
	// vkplay и generic: внешний SDK не нужен (VK Play общается по postMessage, рекламы у него нет)

})();
