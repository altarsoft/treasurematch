// JS-мосты между ядром игры (GWT) и SDK порталов.
// Все функции безопасны на любом портале: если SDK текущего портала не подключён, вызов — no-op.
(function () {

	var portal = window.portal || 'generic';
	var startupAdShown = false;

	function withYsdk(fn) {
		if (window.ysdk) { fn(window.ysdk); return; }
		if (window.YaGames) {
			YaGames.init().then(function (ysdk) {
				window.ysdk = ysdk;
				fn(ysdk);
			}).catch(console.error);
		}
	}

	window.GetLang = function () {
		if (portal === 'yandex') {
			withYsdk(function (ysdk) {
				var i18n = ysdk.environment && ysdk.environment.i18n;
				window.lang = i18n && i18n.lang ? i18n.lang : '';
				window.tld = i18n ? i18n.tld : '';
			});
		} else if (!window.lang) {
			window.lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
		}
	};

	window.GameReady = function () {
		if (portal !== 'yandex') { return; }
		withYsdk(function (ysdk) {
			if (ysdk.features && ysdk.features.LoadingAPI) { ysdk.features.LoadingAPI.ready(); }
			if (!startupAdShown) {
				startupAdShown = true;
				setTimeout(function () { ysdk.adv.showFullscreenAdv({ callbacks: {} }); }, 1500);
			}
		});
	};

	window.GameStart = function () {
		if (portal !== 'yandex') { return; }
		withYsdk(function (ysdk) {
			if (ysdk.features && ysdk.features.GameplayAPI) { ysdk.features.GameplayAPI.start(); }
		});
	};

	window.GameStop = function () {
		if (portal !== 'yandex') { return; }
		withYsdk(function (ysdk) {
			if (ysdk.features && ysdk.features.GameplayAPI) { ysdk.features.GameplayAPI.stop(); }
		});
	};

	window.ShowAds = function () {
		if (portal === 'yandex') {
			withYsdk(function (ysdk) {
				ysdk.adv.showFullscreenAdv({ callbacks: {} });
			});
			return;
		}
		if (portal === 'vk' && window.vkBridge) {
			// Межстраничная реклама рекламной сети VK; между показами VK требует паузу — ошибки глотаем
			window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
				.catch(function (e) { console.log('VK interstitial failed:', e); });
		}
	};

	window.ShowAdsCG = function () {
		if (portal !== 'crazy' || !window.CrazyGames || !window.CrazyGames.SDK) { return; }
		window.CrazyGames.SDK.ad.requestAd('midgame', {
			adFinished: function () { console.log('End midgame ad'); },
			adError: function (error, errorData) { console.log('Error midgame ad', error, errorData); },
			adStarted: function () { console.log('Start midgame ad'); }
		});
	};

	window.ShowAdsGD = function () {
		if (typeof gdsdk !== 'undefined' && gdsdk.showAd) { gdsdk.showAd(); }
	};

	window.ShowAdsGM = function () {
		if (typeof sdk !== 'undefined' && sdk.showBanner) { sdk.showBanner(); }
	};

	window.ShowAdsGP = function () {
		if (portal !== 'gamepix' || typeof GamePix === 'undefined') { return; }
		GamePix.interstitialAd();
	};

	window.PokiInit = function () {
		if (portal !== 'poki' || typeof PokiSDK === 'undefined') { return; }
		PokiSDK.init().then(function () {
			console.log('Poki SDK successfully initialized');
			PokiSDK.gameLoadingFinished();
		}).catch(function () {
			console.log('Poki SDK init failed, load the game anyway');
			PokiSDK.gameLoadingFinished();
		});
	};

	window.PokiPlayStart = function () {
		if (portal !== 'poki' || typeof PokiSDK === 'undefined') { return; }
		PokiSDK.gameplayStart();
	};

	window.PokiPlayStop = function () {
		if (portal !== 'poki' || typeof PokiSDK === 'undefined') { return; }
		PokiSDK.gameplayStop();
	};

	window.PokiShowAds = function () {
		if (portal !== 'poki' || typeof PokiSDK === 'undefined') { return; }
		PokiSDK.commercialBreak(function () {
			// пауза музыки на время рекламы
		}).then(function () {
			console.log('Commercial break finished, proceeding to game');
		});
	};

	window.PokiShowRewarded = function () {
		if (portal !== 'poki' || typeof PokiSDK === 'undefined') { return; }
		PokiSDK.rewardedBreak(function () {
			// пауза музыки на время рекламы
		}).then(function (success) {
			console.log('Rewarded break finished, success: ' + success);
		});
	};

	window.ShowAdsRew = function () {
		if (portal === 'yandex') {
			withYsdk(function (ysdk) {
				ysdk.adv.showRewardedVideo({
					callbacks: {
						onOpen: function () { console.log('Video ad open.'); },
						onRewarded: function () { console.log('Rewarded!'); },
						onClose: function () { console.log('Video ad closed.'); },
						onError: function (e) { console.log('Error while open video ad:', e); }
					}
				});
			});
			return;
		}
		if (portal === 'vk' && window.vkBridge) {
			window.vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
				.then(function (r) { console.log('VK reward granted:', r); })
				.catch(function (e) { console.log('VK reward failed:', e); });
		}
	};

})();
