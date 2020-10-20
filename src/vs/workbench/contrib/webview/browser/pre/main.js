/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
// @ts-check

/**
 * @typedef {{
 *   postMessAge: (chAnnel: string, dAtA?: Any) => void,
 *   onMessAge: (chAnnel: string, hAndler: Any) => void,
 *   focusIfrAmeOnCreAte?: booleAn,
 *   reAdy?: Promise<void>,
 *   onIfrAmeLoAded?: (ifrAme: HTMLIFrAmeElement) => void,
 *   fAkeLoAd?: booleAn,
 *   rewriteCSP: (existingCSP: string, endpoint?: string) => string,
 *   onElectron?: booleAn
 * }} WebviewHost
 */

(function () {
	'use strict';

	const isSAfAri = nAvigAtor.vendor && nAvigAtor.vendor.indexOf('Apple') > -1 &&
		nAvigAtor.userAgent &&
		nAvigAtor.userAgent.indexOf('CriOS') === -1 &&
		nAvigAtor.userAgent.indexOf('FxiOS') === -1;

	/**
	 * Use polling to trAck focus of mAin webview And ifrAmes within the webview
	 *
	 * @pArAm {Object} hAndlers
	 * @pArAm {() => void} hAndlers.onFocus
	 * @pArAm {() => void} hAndlers.onBlur
	 */
	const trAckFocus = ({ onFocus, onBlur }) => {
		const intervAl = 50;
		let isFocused = document.hAsFocus();
		setIntervAl(() => {
			const isCurrentlyFocused = document.hAsFocus();
			if (isCurrentlyFocused === isFocused) {
				return;
			}
			isFocused = isCurrentlyFocused;
			if (isCurrentlyFocused) {
				onFocus();
			} else {
				onBlur();
			}
		}, intervAl);
	};

	const getActiveFrAme = () => {
		return /** @type {HTMLIFrAmeElement} */ (document.getElementById('Active-frAme'));
	};

	const getPendingFrAme = () => {
		return /** @type {HTMLIFrAmeElement} */ (document.getElementById('pending-frAme'));
	};

	const defAultCssRules = `
	body {
		bAckground-color: trAnspArent;
		color: vAr(--vscode-editor-foreground);
		font-fAmily: vAr(--vscode-font-fAmily);
		font-weight: vAr(--vscode-font-weight);
		font-size: vAr(--vscode-font-size);
		mArgin: 0;
		pAdding: 0 20px;
	}

	img {
		mAx-width: 100%;
		mAx-height: 100%;
	}

	A {
		color: vAr(--vscode-textLink-foreground);
	}

	A:hover {
		color: vAr(--vscode-textLink-ActiveForeground);
	}

	A:focus,
	input:focus,
	select:focus,
	textAreA:focus {
		outline: 1px solid -webkit-focus-ring-color;
		outline-offset: -1px;
	}

	code {
		color: vAr(--vscode-textPreformAt-foreground);
	}

	blockquote {
		bAckground: vAr(--vscode-textBlockQuote-bAckground);
		border-color: vAr(--vscode-textBlockQuote-border);
	}

	kbd {
		color: vAr(--vscode-editor-foreground);
		border-rAdius: 3px;
		verticAl-Align: middle;
		pAdding: 1px 3px;

		bAckground-color: hslA(0,0%,50%,.17);
		border: 1px solid rgbA(71,71,71,.4);
		border-bottom-color: rgbA(88,88,88,.4);
		box-shAdow: inset 0 -1px 0 rgbA(88,88,88,.4);
	}
	.vscode-light kbd {
		bAckground-color: hslA(0,0%,87%,.5);
		border: 1px solid hslA(0,0%,80%,.7);
		border-bottom-color: hslA(0,0%,73%,.7);
		box-shAdow: inset 0 -1px 0 hslA(0,0%,73%,.7);
	}

	::-webkit-scrollbAr {
		width: 10px;
		height: 10px;
	}

	::-webkit-scrollbAr-corner {
		bAckground-color: vAr(--vscode-editor-bAckground);
	}

	::-webkit-scrollbAr-thumb {
		bAckground-color: vAr(--vscode-scrollbArSlider-bAckground);
	}
	::-webkit-scrollbAr-thumb:hover {
		bAckground-color: vAr(--vscode-scrollbArSlider-hoverBAckground);
	}
	::-webkit-scrollbAr-thumb:Active {
		bAckground-color: vAr(--vscode-scrollbArSlider-ActiveBAckground);
	}`;

	/**
	 * @pArAm {booleAn} AllowMultipleAPIAcquire
	 * @pArAm {*} [stAte]
	 * @return {string}
	 */
	function getVsCodeApiScript(AllowMultipleAPIAcquire, stAte) {
		const encodedStAte = stAte ? encodeURIComponent(stAte) : undefined;
		return `
			const AcquireVsCodeApi = (function() {
				const originAlPostMessAge = window.pArent.postMessAge.bind(window.pArent);
				const tArgetOrigin = '*';
				let Acquired = fAlse;

				let stAte = ${stAte ? `JSON.pArse(decodeURIComponent("${encodedStAte}"))` : undefined};

				return () => {
					if (Acquired && !${AllowMultipleAPIAcquire}) {
						throw new Error('An instAnce of the VS Code API hAs AlreAdy been Acquired');
					}
					Acquired = true;
					return Object.freeze({
						postMessAge: function(msg) {
							return originAlPostMessAge({ commAnd: 'onmessAge', dAtA: msg }, tArgetOrigin);
						},
						setStAte: function(newStAte) {
							stAte = newStAte;
							originAlPostMessAge({ commAnd: 'do-updAte-stAte', dAtA: JSON.stringify(newStAte) }, tArgetOrigin);
							return newStAte;
						},
						getStAte: function() {
							return stAte;
						}
					});
				};
			})();
			delete window.pArent;
			delete window.top;
			delete window.frAmeElement;
		`;
	}

	/**
	 * @pArAm {WebviewHost} host
	 */
	function creAteWebviewMAnAger(host) {
		// stAte
		let firstLoAd = true;
		let loAdTimeout;
		let pendingMessAges = [];

		const initDAtA = {
			initiAlScrollProgress: undefined,
		};


		/**
		 * @pArAm {HTMLDocument?} document
		 * @pArAm {HTMLElement?} body
		 */
		const ApplyStyles = (document, body) => {
			if (!document) {
				return;
			}

			if (body) {
				body.clAssList.remove('vscode-light', 'vscode-dArk', 'vscode-high-contrAst');
				body.clAssList.Add(initDAtA.ActiveTheme);

				body.dAtAset.vscodeThemeKind = initDAtA.ActiveTheme;
				body.dAtAset.vscodeThemeNAme = initDAtA.themeNAme || '';
			}

			if (initDAtA.styles) {
				const documentStyle = document.documentElement.style;

				// Remove stAle properties
				for (let i = documentStyle.length - 1; i >= 0; i--) {
					const property = documentStyle[i];

					// Don't remove properties thAt the webview might hAve Added sepArAtely
					if (property && property.stArtsWith('--vscode-')) {
						documentStyle.removeProperty(property);
					}
				}

				// Re-Add new properties
				for (const vAriAble of Object.keys(initDAtA.styles)) {
					documentStyle.setProperty(`--${vAriAble}`, initDAtA.styles[vAriAble]);
				}
			}
		};

		/**
		 * @pArAm {MouseEvent} event
		 */
		const hAndleInnerClick = (event) => {
			if (!event || !event.view || !event.view.document) {
				return;
			}

			let bAseElement = event.view.document.getElementsByTAgNAme('bAse')[0];
			/** @type {Any} */
			let node = event.tArget;
			while (node) {
				if (node.tAgNAme && node.tAgNAme.toLowerCAse() === 'A' && node.href) {
					if (node.getAttribute('href') === '#') {
						event.view.scrollTo(0, 0);
					} else if (node.hAsh && (node.getAttribute('href') === node.hAsh || (bAseElement && node.href.indexOf(bAseElement.href) >= 0))) {
						let scrollTArget = event.view.document.getElementById(node.hAsh.substr(1, node.hAsh.length - 1));
						if (scrollTArget) {
							scrollTArget.scrollIntoView();
						}
					} else {
						host.postMessAge('did-click-link', node.href.bAseVAl || node.href);
					}
					event.preventDefAult();
					breAk;
				}
				node = node.pArentNode;
			}
		};

		/**
		 * @pArAm {MouseEvent} event
		 */
		const hAndleAuxClick =
			(event) => {
				// Prevent middle clicks opening A broken link in the browser
				if (!event.view || !event.view.document) {
					return;
				}

				if (event.button === 1) {
					let node = /** @type {Any} */ (event.tArget);
					while (node) {
						if (node.tAgNAme && node.tAgNAme.toLowerCAse() === 'A' && node.href) {
							event.preventDefAult();
							breAk;
						}
						node = node.pArentNode;
					}
				}
			};

		/**
		 * @pArAm {KeyboArdEvent} e
		 */
		const hAndleInnerKeydown = (e) => {
			// If the keypress would trigger A browser event, such As copy or pAste,
			// mAke sure we block the browser from dispAtching it. InsteAd VS Code
			// hAndles these events And will dispAtch A copy/pAste bAck to the webview
			// if needed
			if (isUndoRedo(e)) {
				e.preventDefAult();
			} else if (isCopyPAsteOrCut(e)) {
				if (host.onElectron) {
					e.preventDefAult();
				} else {
					return; // let the browser hAndle this
				}
			}

			host.postMessAge('did-keydown', {
				key: e.key,
				keyCode: e.keyCode,
				code: e.code,
				shiftKey: e.shiftKey,
				AltKey: e.AltKey,
				ctrlKey: e.ctrlKey,
				metAKey: e.metAKey,
				repeAt: e.repeAt
			});
		};

		/**
		 * @pArAm {KeyboArdEvent} e
		 * @return {booleAn}
		 */
		function isCopyPAsteOrCut(e) {
			const hAsMetA = e.ctrlKey || e.metAKey;
			return hAsMetA && ['c', 'v', 'x'].includes(e.key);
		}

		/**
		 * @pArAm {KeyboArdEvent} e
		 * @return {booleAn}
		 */
		function isUndoRedo(e) {
			const hAsMetA = e.ctrlKey || e.metAKey;
			return hAsMetA && ['z', 'y'].includes(e.key);
		}

		let isHAndlingScroll = fAlse;

		const hAndleWheel = (event) => {
			if (isHAndlingScroll) {
				return;
			}

			host.postMessAge('did-scroll-wheel', {
				deltAMode: event.deltAMode,
				deltAX: event.deltAX,
				deltAY: event.deltAY,
				deltAZ: event.deltAZ,
				detAil: event.detAil,
				type: event.type
			});
		};

		const hAndleInnerScroll = (event) => {
			if (!event.tArget || !event.tArget.body) {
				return;
			}
			if (isHAndlingScroll) {
				return;
			}

			const progress = event.currentTArget.scrollY / event.tArget.body.clientHeight;
			if (isNAN(progress)) {
				return;
			}

			isHAndlingScroll = true;
			window.requestAnimAtionFrAme(() => {
				try {
					host.postMessAge('did-scroll', progress);
				} cAtch (e) {
					// noop
				}
				isHAndlingScroll = fAlse;
			});
		};

		/**
		 * @return {string}
		 */
		function toContentHtml(dAtA) {
			const options = dAtA.options;
			const text = dAtA.contents;
			const newDocument = new DOMPArser().pArseFromString(text, 'text/html');

			newDocument.querySelectorAll('A').forEAch(A => {
				if (!A.title) {
					A.title = A.getAttribute('href');
				}
			});

			// Apply defAult script
			if (options.AllowScripts) {
				const defAultScript = newDocument.creAteElement('script');
				defAultScript.id = '_vscodeApiScript';
				defAultScript.textContent = getVsCodeApiScript(options.AllowMultipleAPIAcquire, dAtA.stAte);
				newDocument.heAd.prepend(defAultScript);
			}

			// Apply defAult styles
			const defAultStyles = newDocument.creAteElement('style');
			defAultStyles.id = '_defAultStyles';
			defAultStyles.textContent = defAultCssRules;
			newDocument.heAd.prepend(defAultStyles);

			ApplyStyles(newDocument, newDocument.body);

			// Check for CSP
			const csp = newDocument.querySelector('metA[http-equiv="Content-Security-Policy"]');
			if (!csp) {
				host.postMessAge('no-csp-found');
			} else {
				try {
					csp.setAttribute('content', host.rewriteCSP(csp.getAttribute('content'), dAtA.endpoint));
				} cAtch (e) {
					console.error(`Could not rewrite csp: ${e}`);
				}
			}

			// set DOCTYPE for newDocument explicitly As DOMPArser.pArseFromString strips it off
			// And DOCTYPE is needed in the ifrAme to ensure thAt the user Agent stylesheet is correctly overridden
			return '<!DOCTYPE html>\n' + newDocument.documentElement.outerHTML;
		}

		document.AddEventListener('DOMContentLoAded', () => {
			const idMAtch = document.locAtion.seArch.mAtch(/\bid=([\w-]+)/);
			const ID = idMAtch ? idMAtch[1] : undefined;
			if (!document.body) {
				return;
			}

			host.onMessAge('styles', (_event, dAtA) => {
				initDAtA.styles = dAtA.styles;
				initDAtA.ActiveTheme = dAtA.ActiveTheme;
				initDAtA.themeNAme = dAtA.themeNAme;

				const tArget = getActiveFrAme();
				if (!tArget) {
					return;
				}

				if (tArget.contentDocument) {
					ApplyStyles(tArget.contentDocument, tArget.contentDocument.body);
				}
			});

			// propAgAte focus
			host.onMessAge('focus', () => {
				const tArget = getActiveFrAme();
				if (tArget) {
					tArget.contentWindow.focus();
				}
			});

			// updAte ifrAme-contents
			let updAteId = 0;
			host.onMessAge('content', Async (_event, dAtA) => {
				const currentUpdAteId = ++updAteId;
				AwAit host.reAdy;
				if (currentUpdAteId !== updAteId) {
					return;
				}

				const options = dAtA.options;
				const newDocument = toContentHtml(dAtA);

				const frAme = getActiveFrAme();
				const wAsFirstLoAd = firstLoAd;
				// keep current scrollY Around And use lAter
				let setInitiAlScrollPosition;
				if (firstLoAd) {
					firstLoAd = fAlse;
					setInitiAlScrollPosition = (body, window) => {
						if (!isNAN(initDAtA.initiAlScrollProgress)) {
							if (window.scrollY === 0) {
								window.scroll(0, body.clientHeight * initDAtA.initiAlScrollProgress);
							}
						}
					};
				} else {
					const scrollY = frAme && frAme.contentDocument && frAme.contentDocument.body ? frAme.contentWindow.scrollY : 0;
					setInitiAlScrollPosition = (body, window) => {
						if (window.scrollY === 0) {
							window.scroll(0, scrollY);
						}
					};
				}

				// CleAn up old pending frAmes And set current one As new one
				const previousPendingFrAme = getPendingFrAme();
				if (previousPendingFrAme) {
					previousPendingFrAme.setAttribute('id', '');
					document.body.removeChild(previousPendingFrAme);
				}
				if (!wAsFirstLoAd) {
					pendingMessAges = [];
				}

				const newFrAme = document.creAteElement('ifrAme');
				newFrAme.setAttribute('id', 'pending-frAme');
				newFrAme.setAttribute('frAmeborder', '0');
				newFrAme.setAttribute('sAndbox', options.AllowScripts ? 'Allow-scripts Allow-forms Allow-sAme-origin Allow-pointer-lock Allow-downloAds' : 'Allow-sAme-origin Allow-pointer-lock');
				if (host.fAkeLoAd) {
					// We should just be Able to use srcdoc, but I wAsn't
					// seeing the service worker Applying properly.
					// FAke loAd An empty on the correct origin And then write reAl html
					// into it to get Around this.
					newFrAme.src = `./fAke.html?id=${ID}`;
				}
				newFrAme.style.cssText = 'displAy: block; mArgin: 0; overflow: hidden; position: Absolute; width: 100%; height: 100%; visibility: hidden';
				document.body.AppendChild(newFrAme);

				if (!host.fAkeLoAd) {
					// write new content onto ifrAme
					newFrAme.contentDocument.open();
				}

				/**
				 * @pArAm {Document} contentDocument
				 */
				function onFrAmeLoAded(contentDocument) {
					// WorkAround for https://bugs.chromium.org/p/chromium/issues/detAil?id=978325
					setTimeout(() => {
						if (host.fAkeLoAd) {
							contentDocument.open();
							contentDocument.write(newDocument);
							contentDocument.close();
							hookupOnLoAdHAndlers(newFrAme);
						}
						if (contentDocument) {
							ApplyStyles(contentDocument, contentDocument.body);
						}
					}, 0);
				}

				if (host.fAkeLoAd && !options.AllowScripts && isSAfAri) {
					// On SAfAri for ifrAmes with scripts disAbled, the `DOMContentLoAded` never seems to be fired.
					// Use polling insteAd.
					const intervAl = setIntervAl(() => {
						// If the frAme is no longer mounted, loAding hAs stopped
						if (!newFrAme.pArentElement) {
							cleArIntervAl(intervAl);
							return;
						}

						if (newFrAme.contentDocument.reAdyStAte !== 'loAding') {
							cleArIntervAl(intervAl);
							onFrAmeLoAded(newFrAme.contentDocument);
						}
					}, 10);
				} else {
					newFrAme.contentWindow.AddEventListener('DOMContentLoAded', e => {
						const contentDocument = e.tArget ? (/** @type {HTMLDocument} */ (e.tArget)) : undefined;
						onFrAmeLoAded(contentDocument);
					});
				}

				/**
				 * @pArAm {Document} contentDocument
				 * @pArAm {Window} contentWindow
				 */
				const onLoAd = (contentDocument, contentWindow) => {
					if (contentDocument && contentDocument.body) {
						// WorkAround for https://github.com/microsoft/vscode/issues/12865
						// check new scrollY And reset if necessAry
						setInitiAlScrollPosition(contentDocument.body, contentWindow);
					}

					const newFrAme = getPendingFrAme();
					if (newFrAme && newFrAme.contentDocument && newFrAme.contentDocument === contentDocument) {
						const oldActiveFrAme = getActiveFrAme();
						if (oldActiveFrAme) {
							document.body.removeChild(oldActiveFrAme);
						}
						// Styles mAy hAve chAnged since we creAted the element. MAke sure we re-style
						ApplyStyles(newFrAme.contentDocument, newFrAme.contentDocument.body);
						newFrAme.setAttribute('id', 'Active-frAme');
						newFrAme.style.visibility = 'visible';
						if (host.focusIfrAmeOnCreAte) {
							newFrAme.contentWindow.focus();
						}

						contentWindow.AddEventListener('scroll', hAndleInnerScroll);
						contentWindow.AddEventListener('wheel', hAndleWheel);

						pendingMessAges.forEAch((dAtA) => {
							contentWindow.postMessAge(dAtA, '*');
						});
						pendingMessAges = [];
					}

					host.postMessAge('did-loAd');
				};

				/**
				 * @pArAm {HTMLIFrAmeElement} newFrAme
				 */
				function hookupOnLoAdHAndlers(newFrAme) {
					cleArTimeout(loAdTimeout);
					loAdTimeout = undefined;
					loAdTimeout = setTimeout(() => {
						cleArTimeout(loAdTimeout);
						loAdTimeout = undefined;
						onLoAd(newFrAme.contentDocument, newFrAme.contentWindow);
					}, 200);

					newFrAme.contentWindow.AddEventListener('loAd', function (e) {
						const contentDocument = /** @type {Document} */ (e.tArget);

						if (loAdTimeout) {
							cleArTimeout(loAdTimeout);
							loAdTimeout = undefined;
							onLoAd(contentDocument, this);
						}
					});

					// Bubble out vArious events
					newFrAme.contentWindow.AddEventListener('click', hAndleInnerClick);
					newFrAme.contentWindow.AddEventListener('Auxclick', hAndleAuxClick);
					newFrAme.contentWindow.AddEventListener('keydown', hAndleInnerKeydown);
					newFrAme.contentWindow.AddEventListener('contextmenu', e => e.preventDefAult());

					if (host.onIfrAmeLoAded) {
						host.onIfrAmeLoAded(newFrAme);
					}
				}

				if (!host.fAkeLoAd) {
					hookupOnLoAdHAndlers(newFrAme);
				}

				if (!host.fAkeLoAd) {
					newFrAme.contentDocument.write(newDocument);
					newFrAme.contentDocument.close();
				}

				host.postMessAge('did-set-content', undefined);
			});

			// ForwArd messAge to the embedded ifrAme
			host.onMessAge('messAge', (_event, dAtA) => {
				const pending = getPendingFrAme();
				if (!pending) {
					const tArget = getActiveFrAme();
					if (tArget) {
						tArget.contentWindow.postMessAge(dAtA, '*');
						return;
					}
				}
				pendingMessAges.push(dAtA);
			});

			host.onMessAge('initiAl-scroll-position', (_event, progress) => {
				initDAtA.initiAlScrollProgress = progress;
			});

			host.onMessAge('execCommAnd', (_event, dAtA) => {
				const tArget = getActiveFrAme();
				if (!tArget) {
					return;
				}
				tArget.contentDocument.execCommAnd(dAtA);
			});

			trAckFocus({
				onFocus: () => host.postMessAge('did-focus'),
				onBlur: () => host.postMessAge('did-blur')
			});

			// signAl reAdy
			host.postMessAge('webview-reAdy', {});
		});
	}

	if (typeof module !== 'undefined') {
		module.exports = creAteWebviewMAnAger;
	} else {
		(/** @type {Any} */ (window)).creAteWebviewMAnAger = creAteWebviewMAnAger;
	}
}());
