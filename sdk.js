// JS-мосты между ядром игры (GWT) и SDK порталов.
// Все функции безопасны на любом портале: если SDK текущего портала не подключён, вызов — no-op.
(function () {

	var portal = window.portal || 'generic';
	var startupAdShown = false;


	// Требования сертификации: сейвы только через ytgame.game.loadData/saveData (localStorage
	// для прогресса игрока запрещён), язык EN по умолчанию (выбор игрока хранится в сейве),
	// пауза/резюм только через onPause/onResume, звук глушится по isAudioEnabled/onAudioEnabledChange,
	// firstFrameReady() до gameReady().
	var ytOK = (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV);
	var ytSaveReady = false;        // loadData завершён — saveData можно звать только после него
	var ytSaveDirty = false;
	var ytSaveTimer = null;
	var ytUnblocked = false;        // window.lang выставлен, игра может выходить с экрана загрузки
	var ytGameReadyDone = false;    // gameReady вызван (ядром или страховкой)
	var ytPaused = false;
	var ytPendingRafs = [];         // колбэки rAF, пришедшие во время паузы (первый — цепочка игрового цикла GWT)
	var ytAudioOff = false;
	var ytCtxs = [];                // захваченные WebAudio-контексты

	function withYsdk(fn) {
		if (window.ysdk) { fn(window.ysdk); return; }
		if (window.YaGames) {
			YaGames.init().then(function (ysdk) {
				window.ysdk = ysdk;
				fn(ysdk);
			}).catch(console.error);
		}
	}




	// Требования сертификации: сейвы только через ytgame.game.loadData/saveData (localStorage
	// для прогресса игрока запрещён), язык EN по умолчанию (выбор игрока хранится в сейве),
	// пауза/резюм только через onPause/onResume, звук глушится по isAudioEnabled/onAudioEnabledChange,
	// firstFrameReady() до gameReady().
	var ytOK = (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV);
	var ytSaveReady = false;        // loadData завершён — saveData можно звать только после него
	var ytSaveDirty = false;
	var ytSaveTimer = null;
	var ytUnblocked = false;        // window.lang выставлен, игра может выходить с экрана загрузки
	var ytGameReadyDone = false;    // gameReady вызван (ядром или страховкой)
	var ytPaused = false;
	var ytPendingRafs = [];         // колбэки rAF, пришедшие во время паузы (первый — цепочка игрового цикла GWT)
	var ytAudioOff = false;
	var ytCtxs = [];                // захваченные WebAudio-контексты

	function withYsdk(fn) {
		if (window.ysdk) { fn(window.ysdk); return; }
		if (window.YaGames) {
			YaGames.init().then(function (ysdk) {
				window.ysdk = ysdk;
				fn(ysdk);
			}).catch(console.error);
		}
	}



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
		if (portal === 'youtube') { return; } // window.lang выставлен при инициализации YT-моста (после загрузки сейва)
		if (portal === 'youtube') { return; } // window.lang выставлен при инициализации YT-моста (после загрузки сейва)
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
		if (portal === 'youtube') {
			// firstFrameReady() уже вызван при инициализации моста; здесь игра интерактивна —
			// экран загрузки убран, YouTube снимет свой спиннер
			ytGameReadyDone = true;
			if (ytOK) {
				try { ytgame.game.gameReady(); } catch (e) { console.log('YT gameReady failed:', e); }
			}
			return;
		}

		if (portal === 'youtube') {
			// firstFrameReady() уже вызван при инициализации моста; здесь игра интерактивна —
			// экран загрузки убран, YouTube снимет свой спиннер
			ytGameReadyDone = true;
			if (ytOK) {
				try { ytgame.game.gameReady(); } catch (e) { console.log('YT gameReady failed:', e); }
			}
			return;
		}

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
		if (portal === 'youtube') {
			// Реклама только через YouTube SDK (чужие сети запрещены сертификацией).
			// Ядро зовёт ShowAds после конца игры — естественный переход, это соответствует требованиям
			if (ytOK) {
				try {
					ytgame.ads.requestInterstitialAd()
						.then(function () { console.log('YT interstitial done'); })
						.catch(function (e) { console.log('YT interstitial failed:', e); });
				} catch (e) { console.log('YT interstitial error:', e); }
			}
			return;
		}

		if (portal === 'youtube') {
			// Реклама только через YouTube SDK (чужие сети запрещены сертификацией).
			// Ядро зовёт ShowAds после конца игры — естественный переход, это соответствует требованиям
			if (ytOK) {
				try {
					ytgame.ads.requestInterstitialAd()
						.then(function () { console.log('YT interstitial done'); })
						.catch(function (e) { console.log('YT interstitial failed:', e); });
				} catch (e) { console.log('YT interstitial error:', e); }
			}
			return;
		}

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

		if (portal === 'youtube') {
			// Rewarded только через YouTube SDK; rewardId — константа без пользовательских данных
			if (ytOK) {
				try {
					ytgame.ads.requestRewardedAd('reward-1')
						.then(function (earned) { console.log('YT rewarded earned:', earned); })
						.catch(function (e) { console.log('YT rewarded failed:', e); });
				} catch (e) { console.log('YT rewarded error:', e); }
			}
			return;
		}

		if (portal === 'youtube') {
			// Rewarded только через YouTube SDK; rewardId — константа без пользовательских данных
			if (ytOK) {
				try {
					ytgame.ads.requestRewardedAd('reward-1')
						.then(function (earned) { console.log('YT rewarded earned:', earned); })
						.catch(function (e) { console.log('YT rewarded failed:', e); });
				} catch (e) { console.log('YT rewarded error:', e); }
			}
			return;
		}
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



	if (portal === 'youtube') {

		// Сейвы libGDX GWT лежат в localStorage как "<имя>:<ключ>" (например lines98:lang).
		// Свои ключи накапливаем по факту: что игра прочитала или записала в этой сессии плюс
		// что вернул loadData. Так в снапшот не попадают ключи чужих игр (на github.io origin общий).
		var ytOwnKeys = {};

		function ytOwn(k) { ytOwnKeys[k] = true; }

		function ytSnapshot() {
			var obj = {}, k;
			for (k in ytOwnKeys) {
				try {
					var v = localStorage.getItem(k);
					if (v !== null) { obj[k] = v; }
				} catch (e) {}
			}
			return JSON.stringify(obj);
		}

		function ytRestore(str) {
			if (!str) { return; }
			var obj;
			try { obj = JSON.parse(str); } catch (e) { console.log('YT save parse failed:', e); return; }
			for (var k in obj) {
				if (obj[k] !== null && obj[k] !== undefined) {
					try { localStorage.setItem(k, obj[k]); ytOwn(k); } catch (e) {}
				}
			}
		}

		function ytFlushNow() {
			if (!ytOK || !ytSaveReady) { return; }
			ytSaveDirty = false;
			try {
				ytgame.game.saveData(ytSnapshot())
					.catch(function (e) { console.log('YT saveData failed:', e); });
			} catch (e) { console.log('YT saveData error:', e); }
		}

		function ytQueueSave() {
			if (!ytOK) { return; }
			ytSaveDirty = true;
			if (ytSaveTimer) { clearTimeout(ytSaveTimer); }
			ytSaveTimer = setTimeout(ytFlushNow, 800);
		}

		function ytUnblock() {
			if (ytUnblocked) { return; }
			ytUnblocked = true;
			// Язык для YouTube — английский по умолчанию (требование площадки);
			// сохранённый выбор игрока ядро возьмёт из восстановленных настроек сейва
			if (!window.lang) { window.lang = 'en'; }
			// Страховка для ядер без GameReady (sudoku, mahjong): через 2с после снятия
			// экрана загрузки зовём gameReady сами — YouTube требует его обязательно
			if (ytOK) {
				setTimeout(function () {
					if (!ytGameReadyDone) {
						try { ytgame.game.gameReady(); console.log('YT gameReady: fallback'); } catch (e) {}
					}
				}, 2000);
			}
		}

		function ytApplyMute() {
			// HTML5 <audio>-элементы (GWT-звук в старых сборках)
			var els = document.getElementsByTagName('audio'), i;
			for (i = 0; i < els.length; i++) {
				els[i].muted = ytAudioOff;
				if (ytAudioOff && els[i].pause) { try { els[i].pause(); } catch (e) {} }
			}
			// WebAudio-контексты (GWT-звук в новых сборках)
			for (i = 0; i < ytCtxs.length; i++) {
				try { if (ytAudioOff) { ytCtxs[i].suspend(); } else { ytCtxs[i].resume(); } } catch (e) {}
			}
		}

		// Перехват localStorage: записи игры помечаются своими и уходят в облачный сейв (с дебаунсом),
		// чтения — помечаются своими, чтобы снапшот был полным. Только на youtube-портале.
		var origGetItem = Storage.prototype.getItem;
		var origSetItem = Storage.prototype.setItem;
		var origRemoveItem = Storage.prototype.removeItem;
		Storage.prototype.getItem = function (k) {
			var v = origGetItem.call(this, k);
			if (v !== null && typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); }
			return v;
		};
		Storage.prototype.setItem = function (k, v) {
			origSetItem.call(this, k, v);
			if (typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); ytQueueSave(); }
		};
		Storage.prototype.removeItem = function (k) {
			origRemoveItem.call(this, k);
			if (typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); ytQueueSave(); }
		};

		// Пауза/резюм — единственный источник событий SDK (Page Visibility API запрещён сертификацией).
		// Замораживаем rAF-цепочку игрового цикла GWT: на onPause колбэки копятся в очередь,
		// на onResume — цепочка запускается заново с первого отложенного колбэка.
		var origRaf = window.requestAnimationFrame;
		window.requestAnimationFrame = function (cb) {
			if (ytPaused) { ytPendingRafs.push(cb); return 0; }
			return origRaf.call(window, function (t) { if (!ytPaused) { cb(t); } else { ytPendingRafs.push(cb); } });
		};

		// Перехват создания WebAudio/HTML5-audio: новое аудио глушится сразу, пока YouTube в муте
		var RealAC = window.AudioContext || window.webkitAudioContext;
		if (typeof RealAC === 'function') {
			var WrappedAC = function () {
				var ctx = new RealAC();
				ytCtxs.push(ctx);
				if (ytAudioOff) { try { ctx.suspend(); } catch (e) {} }
				return ctx;
			};
			WrappedAC.prototype = RealAC.prototype;
			window.AudioContext = WrappedAC;
			if (window.webkitAudioContext) { window.webkitAudioContext = WrappedAC; }
		}
		var origAudioPlay = HTMLAudioElement.prototype.play;
		HTMLAudioElement.prototype.play = function () {
			if (ytAudioOff) { return Promise.resolve(); }
			return origAudioPlay.apply(this, arguments);
		};

		if (!ytOK) {
			// dev-режим (?portal=youtube вне Playables): мосты no-op, играем как generic
			ytUnblock();
		} else {

			// firstFrameReady — раньше gameReady, обязательный порядок
			try { ytgame.game.firstFrameReady(); } catch (e) {}

			// Облачный сейв: восстанавливаем localStorage ДО того, как ядро прочитает настройки
			// (окно.lang остаётся пустым до завершения — ядро ждёт на экране загрузки).
			// loadData до saveData — тоже требование сертификации.
			ytgame.game.loadData()
				.then(function (data) {
					if (!ytUnblocked) { ytRestore(data); }
					else { console.log('YT save restore skipped: game already booted'); }
					ytSaveReady = true;
					ytUnblock();
				})
				.catch(function (e) {
					console.log('YT loadData failed:', e);
					ytSaveReady = true;
					ytUnblock();
				});
			// страховка: не держим экран загрузки дольше ~1.9с (ядро само сдаётся через 2с)
			setTimeout(ytUnblock, 1900);

			// Звук: стартовое состояние и последующие переключения мута в настройках YouTube
			ytAudioOff = !ytgame.system.isAudioEnabled();
			ytApplyMute();
			ytgame.system.onAudioEnabledChange(function (on) {
				ytAudioOff = !on;
				ytApplyMute();
			});

			// Пауза: короткое окно на сохранение перед возможной выгрузкой
			ytgame.system.onPause(function () {
				ytPaused = true;
				if (ytSaveTimer) { clearTimeout(ytSaveTimer); ytSaveTimer = null; }
				ytFlushNow();
				ytApplyMute();
			});

			ytgame.system.onResume(function () {
				ytPaused = false;
				ytApplyMute();
				// перезапускаем ВСЕ отложенные колбэки (цепочка игрового цикла + чужие rAF-запросы)
				var pending = ytPendingRafs;
				ytPendingRafs = [];
				for (var i = 0; i < pending.length; i++) {
					try { origRaf.call(window, pending[i]); } catch (e) {}
				}
			});
		}

		// Мини-дебаг для сертификации на реальной платформе: состояние моста в консоли
		window.__ytDebug = function () {
			return { portal: portal, ytOK: ytOK, saveReady: ytSaveReady, paused: ytPaused, audioOff: ytAudioOff, ctxs: ytCtxs.length, lang: window.lang };
		};
	}



	if (portal === 'youtube') {

		// Сейвы libGDX GWT лежат в localStorage как "<имя>:<ключ>" (например lines98:lang).
		// Свои ключи накапливаем по факту: что игра прочитала или записала в этой сессии плюс
		// что вернул loadData. Так в снапшот не попадают ключи чужих игр (на github.io origin общий).
		var ytOwnKeys = {};

		function ytOwn(k) { ytOwnKeys[k] = true; }

		function ytSnapshot() {
			var obj = {}, k;
			for (k in ytOwnKeys) {
				try {
					var v = localStorage.getItem(k);
					if (v !== null) { obj[k] = v; }
				} catch (e) {}
			}
			return JSON.stringify(obj);
		}

		function ytRestore(str) {
			if (!str) { return; }
			var obj;
			try { obj = JSON.parse(str); } catch (e) { console.log('YT save parse failed:', e); return; }
			for (var k in obj) {
				if (obj[k] !== null && obj[k] !== undefined) {
					try { localStorage.setItem(k, obj[k]); ytOwn(k); } catch (e) {}
				}
			}
		}

		function ytFlushNow() {
			if (!ytOK || !ytSaveReady) { return; }
			ytSaveDirty = false;
			try {
				ytgame.game.saveData(ytSnapshot())
					.catch(function (e) { console.log('YT saveData failed:', e); });
			} catch (e) { console.log('YT saveData error:', e); }
		}

		function ytQueueSave() {
			if (!ytOK) { return; }
			ytSaveDirty = true;
			if (ytSaveTimer) { clearTimeout(ytSaveTimer); }
			ytSaveTimer = setTimeout(ytFlushNow, 800);
		}

		function ytUnblock() {
			if (ytUnblocked) { return; }
			ytUnblocked = true;
			// Язык для YouTube — английский по умолчанию (требование площадки);
			// сохранённый выбор игрока ядро возьмёт из восстановленных настроек сейва
			if (!window.lang) { window.lang = 'en'; }
			// Страховка для ядер без GameReady (sudoku, mahjong): через 2с после снятия
			// экрана загрузки зовём gameReady сами — YouTube требует его обязательно
			if (ytOK) {
				setTimeout(function () {
					if (!ytGameReadyDone) {
						try { ytgame.game.gameReady(); console.log('YT gameReady: fallback'); } catch (e) {}
					}
				}, 2000);
			}
		}

		function ytApplyMute() {
			// HTML5 <audio>-элементы (GWT-звук в старых сборках)
			var els = document.getElementsByTagName('audio'), i;
			for (i = 0; i < els.length; i++) {
				els[i].muted = ytAudioOff;
				if (ytAudioOff && els[i].pause) { try { els[i].pause(); } catch (e) {} }
			}
			// WebAudio-контексты (GWT-звук в новых сборках)
			for (i = 0; i < ytCtxs.length; i++) {
				try { if (ytAudioOff) { ytCtxs[i].suspend(); } else { ytCtxs[i].resume(); } } catch (e) {}
			}
		}

		// Перехват localStorage: записи игры помечаются своими и уходят в облачный сейв (с дебаунсом),
		// чтения — помечаются своими, чтобы снапшот был полным. Только на youtube-портале.
		var origGetItem = Storage.prototype.getItem;
		var origSetItem = Storage.prototype.setItem;
		var origRemoveItem = Storage.prototype.removeItem;
		Storage.prototype.getItem = function (k) {
			var v = origGetItem.call(this, k);
			if (v !== null && typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); }
			return v;
		};
		Storage.prototype.setItem = function (k, v) {
			origSetItem.call(this, k, v);
			if (typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); ytQueueSave(); }
		};
		Storage.prototype.removeItem = function (k) {
			origRemoveItem.call(this, k);
			if (typeof k === 'string' && k.indexOf(':') !== -1) { ytOwn(k); ytQueueSave(); }
		};

		// Пауза/резюм — единственный источник событий SDK (Page Visibility API запрещён сертификацией).
		// Замораживаем rAF-цепочку игрового цикла GWT: на onPause колбэки копятся в очередь,
		// на onResume — цепочка запускается заново с первого отложенного колбэка.
		var origRaf = window.requestAnimationFrame;
		window.requestAnimationFrame = function (cb) {
			if (ytPaused) { ytPendingRafs.push(cb); return 0; }
			return origRaf.call(window, function (t) { if (!ytPaused) { cb(t); } else { ytPendingRafs.push(cb); } });
		};

		// Перехват создания WebAudio/HTML5-audio: новое аудио глушится сразу, пока YouTube в муте
		var RealAC = window.AudioContext || window.webkitAudioContext;
		if (typeof RealAC === 'function') {
			var WrappedAC = function () {
				var ctx = new RealAC();
				ytCtxs.push(ctx);
				if (ytAudioOff) { try { ctx.suspend(); } catch (e) {} }
				return ctx;
			};
			WrappedAC.prototype = RealAC.prototype;
			window.AudioContext = WrappedAC;
			if (window.webkitAudioContext) { window.webkitAudioContext = WrappedAC; }
		}
		var origAudioPlay = HTMLAudioElement.prototype.play;
		HTMLAudioElement.prototype.play = function () {
			if (ytAudioOff) { return Promise.resolve(); }
			return origAudioPlay.apply(this, arguments);
		};

		if (!ytOK) {
			// dev-режим (?portal=youtube вне Playables): мосты no-op, играем как generic
			ytUnblock();
		} else {

			// firstFrameReady — раньше gameReady, обязательный порядок
			try { ytgame.game.firstFrameReady(); } catch (e) {}

			// Облачный сейв: восстанавливаем localStorage ДО того, как ядро прочитает настройки
			// (окно.lang остаётся пустым до завершения — ядро ждёт на экране загрузки).
			// loadData до saveData — тоже требование сертификации.
			ytgame.game.loadData()
				.then(function (data) {
					if (!ytUnblocked) { ytRestore(data); }
					else { console.log('YT save restore skipped: game already booted'); }
					ytSaveReady = true;
					ytUnblock();
				})
				.catch(function (e) {
					console.log('YT loadData failed:', e);
					ytSaveReady = true;
					ytUnblock();
				});
			// страховка: не держим экран загрузки дольше ~1.9с (ядро само сдаётся через 2с)
			setTimeout(ytUnblock, 1900);

			// Звук: стартовое состояние и последующие переключения мута в настройках YouTube
			ytAudioOff = !ytgame.system.isAudioEnabled();
			ytApplyMute();
			ytgame.system.onAudioEnabledChange(function (on) {
				ytAudioOff = !on;
				ytApplyMute();
			});

			// Пауза: короткое окно на сохранение перед возможной выгрузкой
			ytgame.system.onPause(function () {
				ytPaused = true;
				if (ytSaveTimer) { clearTimeout(ytSaveTimer); ytSaveTimer = null; }
				ytFlushNow();
				ytApplyMute();
			});

			ytgame.system.onResume(function () {
				ytPaused = false;
				ytApplyMute();
				// перезапускаем ВСЕ отложенные колбэки (цепочка игрового цикла + чужие rAF-запросы)
				var pending = ytPendingRafs;
				ytPendingRafs = [];
				for (var i = 0; i < pending.length; i++) {
					try { origRaf.call(window, pending[i]); } catch (e) {}
				}
			});
		}

		// Мини-дебаг для сертификации на реальной платформе: состояние моста в консоли
		window.__ytDebug = function () {
			return { portal: portal, ytOK: ytOK, saveReady: ytSaveReady, paused: ytPaused, audioOff: ytAudioOff, ctxs: ytCtxs.length, lang: window.lang };
		};
	}

})();
