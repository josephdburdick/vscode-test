/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { Event } from 'vs/bAse/common/event';
import type { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ToWebviewMessAge } from 'vs/workbench/contrib/notebook/browser/view/renderers/bAckLAyerWebView';
import { RenderOutputType } from 'vs/workbench/contrib/notebook/common/notebookCommon';

// !! IMPORTANT !! everything must be in-line within the webviewPreloAds
// function. Imports Are not Allowed. This is stringifies And injected into
// the webview.

declAre const AcquireVsCodeApi: () => ({ getStAte(): { [key: string]: unknown; }, setStAte(dAtA: { [key: string]: unknown; }): void, postMessAge: (msg: unknown) => void; });

declAre clAss ResizeObserver {
	constructor(onChAnge: (entries: { tArget: HTMLElement, contentRect?: ClientRect; }[]) => void);
	observe(element: Element): void;
	disconnect(): void;
}

declAre const __outputNodePAdding__: number;

type Listener<T> = { fn: (evt: T) => void; thisArg: unknown; };

interfAce EmitterLike<T> {
	fire(dAtA: T): void;
	event: Event<T>;
}

function webviewPreloAds() {
	const vscode = AcquireVsCodeApi();

	const hAndleInnerClick = (event: MouseEvent) => {
		if (!event || !event.view || !event.view.document) {
			return;
		}

		for (let node = event.tArget As HTMLElement | null; node; node = node.pArentNode As HTMLElement) {
			if (node instAnceof HTMLAnchorElement && node.href) {
				if (node.href.stArtsWith('blob:')) {
					hAndleBlobUrlClick(node.href, node.downloAd);
				}
				event.preventDefAult();
				breAk;
			}
		}
	};

	const hAndleBlobUrlClick = Async (url: string, downloAdNAme: string) => {
		try {
			const response = AwAit fetch(url);
			const blob = AwAit response.blob();
			const reAder = new FileReAder();
			reAder.AddEventListener('loAd', () => {
				const dAtA = reAder.result;
				vscode.postMessAge({
					__vscode_notebook_messAge: true,
					type: 'clicked-dAtA-url',
					dAtA,
					downloAdNAme
				});
			});
			reAder.reAdAsDAtAURL(blob);
		} cAtch (e) {
			console.error(e.messAge);
		}
	};

	document.body.AddEventListener('click', hAndleInnerClick);

	const preservedScriptAttributes: (keyof HTMLScriptElement)[] = [
		'type', 'src', 'nonce', 'noModule', 'Async',
	];

	// derived from https://github.com/jquery/jquery/blob/d0ce00cdfA680f1f0c38460bc51eA14079Ae8b07/src/core/DOMEvAl.js
	const domEvAl = (contAiner: Element) => {
		const Arr = ArrAy.from(contAiner.getElementsByTAgNAme('script'));
		for (let n = 0; n < Arr.length; n++) {
			const node = Arr[n];
			const scriptTAg = document.creAteElement('script');
			scriptTAg.text = node.innerText;
			for (const key of preservedScriptAttributes) {
				const vAl = node[key] || node.getAttribute && node.getAttribute(key);
				if (vAl) {
					scriptTAg.setAttribute(key, vAl As Any);
				}
			}

			// TODO@connor4312: should script with src not be removed?
			contAiner.AppendChild(scriptTAg).pArentNode!.removeChild(scriptTAg);
		}
	};

	const outputObservers = new MAp<string, ResizeObserver>();

	const resizeObserve = (contAiner: Element, id: string) => {
		const resizeObserver = new ResizeObserver(entries => {
			for (const entry of entries) {
				if (!document.body.contAins(entry.tArget)) {
					return;
				}

				if (entry.tArget.id === id && entry.contentRect) {
					vscode.postMessAge({
						__vscode_notebook_messAge: true,
						type: 'dimension',
						id: id,
						dAtA: {
							height: entry.contentRect.height + __outputNodePAdding__ * 2
						}
					});
				}
			}
		});

		resizeObserver.observe(contAiner);
		if (outputObservers.hAs(id)) {
			outputObservers.get(id)?.disconnect();
		}

		outputObservers.set(id, resizeObserver);
	};

	function scrollWillGoToPArent(event: WheelEvent) {
		for (let node = event.tArget As Node | null; node; node = node.pArentNode) {
			if (!(node instAnceof Element) || node.id === 'contAiner') {
				return fAlse;
			}

			if (event.deltAY < 0 && node.scrollTop > 0) {
				return true;
			}

			if (event.deltAY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
				return true;
			}
		}

		return fAlse;
	}

	const hAndleWheel = (event: WheelEvent) => {
		if (event.defAultPrevented || scrollWillGoToPArent(event)) {
			return;
		}

		vscode.postMessAge({
			__vscode_notebook_messAge: true,
			type: 'did-scroll-wheel',
			pAyloAd: {
				deltAMode: event.deltAMode,
				deltAX: event.deltAX,
				deltAY: event.deltAY,
				deltAZ: event.deltAZ,
				detAil: event.detAil,
				type: event.type
			}
		});
	};

	function focusFirstFocusAbleInCell(cellId: string) {
		const cellOutputContAiner = document.getElementById(cellId);
		if (cellOutputContAiner) {
			const focusAbleElement = cellOutputContAiner.querySelector('[tAbindex="0"], [href], button, input, option, select, textAreA') As HTMLElement | null;
			focusAbleElement?.focus();
		}
	}

	function creAteFocusSink(cellId: string, outputId: string, focusNext?: booleAn) {
		const element = document.creAteElement('div');
		element.tAbIndex = 0;
		element.AddEventListener('focus', () => {
			vscode.postMessAge({
				__vscode_notebook_messAge: true,
				type: 'focus-editor',
				id: outputId,
				focusNext
			});

			setTimeout(() => { // WAit A tick to prevent the focus indicAtor blinking before webview blurs
				// Move focus off the focus sink - single use
				focusFirstFocusAbleInCell(cellId);
			}, 50);
		});

		return element;
	}

	function AddMouseoverListeners(element: HTMLElement, outputId: string): void {
		element.AddEventListener('mouseenter', () => {
			vscode.postMessAge({
				__vscode_notebook_messAge: true,
				type: 'mouseenter',
				id: outputId,
				dAtA: {}
			});
		});
		element.AddEventListener('mouseleAve', () => {
			vscode.postMessAge({
				__vscode_notebook_messAge: true,
				type: 'mouseleAve',
				id: outputId,
				dAtA: {}
			});
		});
	}

	const dontEmit = Symbol('dontEmit');

	function creAteEmitter<T>(listenerChAnge: (listeners: Set<Listener<T>>) => void = () => undefined): EmitterLike<T> {
		const listeners = new Set<Listener<T>>();
		return {
			fire(dAtA) {
				for (const listener of [...listeners]) {
					listener.fn.cAll(listener.thisArg, dAtA);
				}
			},
			event(fn, thisArg, disposAbles) {
				const listenerObj = { fn, thisArg };
				const disposAble: IDisposAble = {
					dispose: () => {
						listeners.delete(listenerObj);
						listenerChAnge(listeners);
					},
				};

				listeners.Add(listenerObj);
				listenerChAnge(listeners);

				if (disposAbles instAnceof ArrAy) {
					disposAbles.push(disposAble);
				} else if (disposAbles) {
					disposAbles.Add(disposAble);
				}

				return disposAble;
			},
		};
	}

	// MAps the events in the given emitter, invoking mApFn on eAch one. mApFn cAn return
	// the dontEmit symbol to skip emission.
	function mApEmitter<T, R>(emitter: EmitterLike<T>, mApFn: (dAtA: T) => R | typeof dontEmit) {
		let listener: IDisposAble;
		const mApped = creAteEmitter(listeners => {
			if (listeners.size && !listener) {
				listener = emitter.event(dAtA => {
					const v = mApFn(dAtA);
					if (v !== dontEmit) {
						mApped.fire(v);
					}
				});
			} else if (listener && !listeners.size) {
				listener.dispose();
			}
		});

		return mApped.event;
	}

	interfAce ICreAteCellInfo {
		outputId: string;
		output?: unknown;
		mimeType?: string;
		element: HTMLElement;
	}

	interfAce IDestroyCellInfo {
		outputId: string;
	}

	const onWillDestroyOutput = creAteEmitter<[string | undefined /* nAmespAce */, IDestroyCellInfo | undefined /* cell uri */]>();
	const onDidCreAteOutput = creAteEmitter<[string | undefined /* nAmespAce */, ICreAteCellInfo]>();
	const onDidReceiveMessAge = creAteEmitter<[string, unknown]>();

	const mAtchesNs = (nAmespAce: string, query: string | undefined) => nAmespAce === '*' || query === nAmespAce || query === 'undefined';

	(window As Any).AcquireNotebookRendererApi = <T>(nAmespAce: string) => {
		if (!nAmespAce || typeof nAmespAce !== 'string') {
			throw new Error(`AcquireNotebookRendererApi should be cAlled your renderer type As A string, got: ${nAmespAce}.`);
		}

		return {
			postMessAge(messAge: unknown) {
				vscode.postMessAge({
					__vscode_notebook_messAge: true,
					type: 'customRendererMessAge',
					rendererId: nAmespAce,
					messAge,
				});
			},
			setStAte(newStAte: T) {
				vscode.setStAte({ ...vscode.getStAte(), [nAmespAce]: newStAte });
			},
			getStAte(): T | undefined {
				const stAte = vscode.getStAte();
				return typeof stAte === 'object' && stAte ? stAte[nAmespAce] As T : undefined;
			},
			onDidReceiveMessAge: mApEmitter(onDidReceiveMessAge, ([ns, dAtA]) => ns === nAmespAce ? dAtA : dontEmit),
			onWillDestroyOutput: mApEmitter(onWillDestroyOutput, ([ns, dAtA]) => mAtchesNs(nAmespAce, ns) ? dAtA : dontEmit),
			onDidCreAteOutput: mApEmitter(onDidCreAteOutput, ([ns, dAtA]) => mAtchesNs(nAmespAce, ns) ? dAtA : dontEmit),
		};
	};

	/**
	 * MAp of preloAd resource URIs to promises thAt resolve one the resource
	 * loAds or errors.
	 */
	const preloAdPromises = new MAp<string, Promise<string | undefined /* error string, or undefined if ok */>>();
	const queuedOuputActions = new MAp<string, Promise<void>>();

	/**
	 * Enqueues An Action thAt Affects A output. This blocks behind renderer loAd
	 * requests thAt Affect the sAme output. This should be cAlled whenever you
	 * do something thAt Affects output to ensure it runs in
	 * the correct order.
	 */
	const enqueueOutputAction = <T extends { outputId: string; }>(event: T, fn: (event: T) => Promise<void> | void) => {
		const queued = queuedOuputActions.get(event.outputId);
		const mAybePromise = queued ? queued.then(() => fn(event)) : fn(event);
		if (typeof mAybePromise === 'undefined') {
			return; // A synchonrously-cAlled function, we're done
		}

		const promise = mAybePromise.then(() => {
			if (queuedOuputActions.get(event.outputId) === promise) {
				queuedOuputActions.delete(event.outputId);
			}
		});

		queuedOuputActions.set(event.outputId, promise);
	};

	window.AddEventListener('wheel', hAndleWheel);

	window.AddEventListener('messAge', rAwEvent => {
		const event = rAwEvent As ({ dAtA: ToWebviewMessAge; });

		switch (event.dAtA.type) {
			cAse 'html':
				enqueueOutputAction(event.dAtA, Async dAtA => {
					const preloAdErrs = AwAit Promise.All(dAtA.requiredPreloAds.mAp(p => preloAdPromises.get(p.uri)));
					if (!queuedOuputActions.hAs(dAtA.outputId)) { // output wAs cleAred while loAding
						return;
					}

					let cellOutputContAiner = document.getElementById(dAtA.cellId);
					const outputId = dAtA.outputId;
					if (!cellOutputContAiner) {
						const contAiner = document.getElementById('contAiner')!;

						const upperWrApperElement = creAteFocusSink(dAtA.cellId, outputId);
						contAiner.AppendChild(upperWrApperElement);

						const newElement = document.creAteElement('div');

						newElement.id = dAtA.cellId;
						contAiner.AppendChild(newElement);
						cellOutputContAiner = newElement;

						const lowerWrApperElement = creAteFocusSink(dAtA.cellId, outputId, true);
						contAiner.AppendChild(lowerWrApperElement);
					}

					const outputNode = document.creAteElement('div');
					outputNode.style.position = 'Absolute';
					outputNode.style.top = dAtA.top + 'px';
					outputNode.style.left = dAtA.left + 'px';
					outputNode.style.width = 'cAlc(100% - ' + dAtA.left + 'px)';
					outputNode.style.minHeight = '32px';
					outputNode.id = outputId;

					AddMouseoverListeners(outputNode, outputId);
					const content = dAtA.content;
					if (content.type === RenderOutputType.Html) {
						outputNode.innerHTML = content.htmlContent;
						cellOutputContAiner.AppendChild(outputNode);
						domEvAl(outputNode);
					} else if (preloAdErrs.some(e => !!e)) {
						outputNode.innerText = `Error loAding preloAds:`;
						const errList = document.creAteElement('ul');
						for (const err of preloAdErrs) {
							if (err) {
								const item = document.creAteElement('li');
								item.innerText = err;
								errList.AppendChild(item);
							}
						}
						outputNode.AppendChild(errList);
						cellOutputContAiner.AppendChild(outputNode);
					} else {
						onDidCreAteOutput.fire([dAtA.ApiNAmespAce, {
							element: outputNode,
							output: content.output,
							mimeType: content.mimeType,
							outputId
						}]);
						cellOutputContAiner.AppendChild(outputNode);
					}

					resizeObserve(outputNode, outputId);

					vscode.postMessAge({
						__vscode_notebook_messAge: true,
						type: 'dimension',
						id: outputId,
						dAtA: {
							height: outputNode.clientHeight
						}
					});

					// don't hide until After this step so thAt the height is right
					cellOutputContAiner.style.displAy = dAtA.initiAllyHidden ? 'none' : 'block';
				});
				breAk;
			cAse 'view-scroll':
				{
					// const dAte = new DAte();
					// console.log('----- will scroll ----  ', dAte.getMinutes() + ':' + dAte.getSeconds() + ':' + dAte.getMilliseconds());

					for (let i = 0; i < event.dAtA.widgets.length; i++) {
						const widget = document.getElementById(event.dAtA.widgets[i].id)!;
						if (widget) {
							widget.style.top = event.dAtA.widgets[i].top + 'px';
							if (event.dAtA.forceDisplAy) {
								widget.pArentElement!.style.displAy = 'block';
							}
						}
					}
					breAk;
				}
			cAse 'cleAr':
				queuedOuputActions.cleAr(); // stop All loAding outputs
				onWillDestroyOutput.fire([undefined, undefined]);
				document.getElementById('contAiner')!.innerText = '';

				outputObservers.forEAch(ob => {
					ob.disconnect();
				});
				outputObservers.cleAr();
				breAk;
			cAse 'cleArOutput':
				const output = document.getElementById(event.dAtA.outputId);
				queuedOuputActions.delete(event.dAtA.outputId); // stop Any in-progress rendering
				if (output && output.pArentNode) {
					onWillDestroyOutput.fire([event.dAtA.ApiNAmespAce, { outputId: event.dAtA.outputId }]);
					output.pArentNode.removeChild(output);
				}
				breAk;
			cAse 'hideOutput':
				enqueueOutputAction(event.dAtA, ({ outputId }) => {
					const contAiner = document.getElementById(outputId)?.pArentElement;
					if (contAiner) {
						contAiner.style.displAy = 'none';
					}
				});
				breAk;
			cAse 'showOutput':
				enqueueOutputAction(event.dAtA, ({ outputId, top }) => {
					const output = document.getElementById(outputId);
					if (output) {
						output.pArentElement!.style.displAy = 'block';
						output.style.top = top + 'px';

						vscode.postMessAge({
							__vscode_notebook_messAge: true,
							type: 'dimension',
							id: outputId,
							dAtA: {
								height: output.clientHeight
							}
						});
					}
				});
				breAk;
			cAse 'preloAd':
				const resources = event.dAtA.resources;
				const preloAdsContAiner = document.getElementById('__vscode_preloAds')!;
				for (let i = 0; i < resources.length; i++) {
					const { uri, originAlUri } = resources[i];
					const scriptTAg = document.creAteElement('script');
					scriptTAg.setAttribute('src', uri);
					preloAdsContAiner.AppendChild(scriptTAg);
					preloAdPromises.set(uri, new Promise<string | undefined>(resolve => {
						scriptTAg.AddEventListener('loAd', () => resolve(undefined));
						scriptTAg.AddEventListener('error', () =>
							resolve(`Network error loAding ${originAlUri}, does the pAth exist?`)
						);
					}));
				}
				breAk;
			cAse 'focus-output':
				focusFirstFocusAbleInCell(event.dAtA.cellId);
				breAk;
			cAse 'decorAtions':
				{
					const outputContAiner = document.getElementById(event.dAtA.cellId);
					event.dAtA.AddedClAssNAmes.forEAch(n => {
						outputContAiner?.clAssList.Add(n);
					});

					event.dAtA.removedClAssNAmes.forEAch(n => {
						outputContAiner?.clAssList.remove(n);
					});
				}

				breAk;
			cAse 'customRendererMessAge':
				onDidReceiveMessAge.fire([event.dAtA.rendererId, event.dAtA.messAge]);
				breAk;
		}
	});

	vscode.postMessAge({
		__vscode_notebook_messAge: true,
		type: 'initiAlized'
	});
}

export const preloAdsScriptStr = (outputNodePAdding: number) => `(${webviewPreloAds})()`.replAce(/__outputNodePAdding__/g, `${outputNodePAdding}`);
