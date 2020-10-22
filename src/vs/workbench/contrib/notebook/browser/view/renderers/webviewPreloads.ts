/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Event } from 'vs/Base/common/event';
import type { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ToWeBviewMessage } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/BackLayerWeBView';
import { RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

// !! IMPORTANT !! everything must Be in-line within the weBviewPreloads
// function. Imports are not allowed. This is stringifies and injected into
// the weBview.

declare const acquireVsCodeApi: () => ({ getState(): { [key: string]: unknown; }, setState(data: { [key: string]: unknown; }): void, postMessage: (msg: unknown) => void; });

declare class ResizeOBserver {
	constructor(onChange: (entries: { target: HTMLElement, contentRect?: ClientRect; }[]) => void);
	oBserve(element: Element): void;
	disconnect(): void;
}

declare const __outputNodePadding__: numBer;

type Listener<T> = { fn: (evt: T) => void; thisArg: unknown; };

interface EmitterLike<T> {
	fire(data: T): void;
	event: Event<T>;
}

function weBviewPreloads() {
	const vscode = acquireVsCodeApi();

	const handleInnerClick = (event: MouseEvent) => {
		if (!event || !event.view || !event.view.document) {
			return;
		}

		for (let node = event.target as HTMLElement | null; node; node = node.parentNode as HTMLElement) {
			if (node instanceof HTMLAnchorElement && node.href) {
				if (node.href.startsWith('BloB:')) {
					handleBloBUrlClick(node.href, node.download);
				}
				event.preventDefault();
				Break;
			}
		}
	};

	const handleBloBUrlClick = async (url: string, downloadName: string) => {
		try {
			const response = await fetch(url);
			const BloB = await response.BloB();
			const reader = new FileReader();
			reader.addEventListener('load', () => {
				const data = reader.result;
				vscode.postMessage({
					__vscode_noteBook_message: true,
					type: 'clicked-data-url',
					data,
					downloadName
				});
			});
			reader.readAsDataURL(BloB);
		} catch (e) {
			console.error(e.message);
		}
	};

	document.Body.addEventListener('click', handleInnerClick);

	const preservedScriptAttriButes: (keyof HTMLScriptElement)[] = [
		'type', 'src', 'nonce', 'noModule', 'async',
	];

	// derived from https://githuB.com/jquery/jquery/BloB/d0ce00cdfa680f1f0c38460Bc51ea14079ae8B07/src/core/DOMEval.js
	const domEval = (container: Element) => {
		const arr = Array.from(container.getElementsByTagName('script'));
		for (let n = 0; n < arr.length; n++) {
			const node = arr[n];
			const scriptTag = document.createElement('script');
			scriptTag.text = node.innerText;
			for (const key of preservedScriptAttriButes) {
				const val = node[key] || node.getAttriBute && node.getAttriBute(key);
				if (val) {
					scriptTag.setAttriBute(key, val as any);
				}
			}

			// TODO@connor4312: should script with src not Be removed?
			container.appendChild(scriptTag).parentNode!.removeChild(scriptTag);
		}
	};

	const outputOBservers = new Map<string, ResizeOBserver>();

	const resizeOBserve = (container: Element, id: string) => {
		const resizeOBserver = new ResizeOBserver(entries => {
			for (const entry of entries) {
				if (!document.Body.contains(entry.target)) {
					return;
				}

				if (entry.target.id === id && entry.contentRect) {
					vscode.postMessage({
						__vscode_noteBook_message: true,
						type: 'dimension',
						id: id,
						data: {
							height: entry.contentRect.height + __outputNodePadding__ * 2
						}
					});
				}
			}
		});

		resizeOBserver.oBserve(container);
		if (outputOBservers.has(id)) {
			outputOBservers.get(id)?.disconnect();
		}

		outputOBservers.set(id, resizeOBserver);
	};

	function scrollWillGoToParent(event: WheelEvent) {
		for (let node = event.target as Node | null; node; node = node.parentNode) {
			if (!(node instanceof Element) || node.id === 'container') {
				return false;
			}

			if (event.deltaY < 0 && node.scrollTop > 0) {
				return true;
			}

			if (event.deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
				return true;
			}
		}

		return false;
	}

	const handleWheel = (event: WheelEvent) => {
		if (event.defaultPrevented || scrollWillGoToParent(event)) {
			return;
		}

		vscode.postMessage({
			__vscode_noteBook_message: true,
			type: 'did-scroll-wheel',
			payload: {
				deltaMode: event.deltaMode,
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaZ: event.deltaZ,
				detail: event.detail,
				type: event.type
			}
		});
	};

	function focusFirstFocusaBleInCell(cellId: string) {
		const cellOutputContainer = document.getElementById(cellId);
		if (cellOutputContainer) {
			const focusaBleElement = cellOutputContainer.querySelector('[taBindex="0"], [href], Button, input, option, select, textarea') as HTMLElement | null;
			focusaBleElement?.focus();
		}
	}

	function createFocusSink(cellId: string, outputId: string, focusNext?: Boolean) {
		const element = document.createElement('div');
		element.taBIndex = 0;
		element.addEventListener('focus', () => {
			vscode.postMessage({
				__vscode_noteBook_message: true,
				type: 'focus-editor',
				id: outputId,
				focusNext
			});

			setTimeout(() => { // Wait a tick to prevent the focus indicator Blinking Before weBview Blurs
				// Move focus off the focus sink - single use
				focusFirstFocusaBleInCell(cellId);
			}, 50);
		});

		return element;
	}

	function addMouseoverListeners(element: HTMLElement, outputId: string): void {
		element.addEventListener('mouseenter', () => {
			vscode.postMessage({
				__vscode_noteBook_message: true,
				type: 'mouseenter',
				id: outputId,
				data: {}
			});
		});
		element.addEventListener('mouseleave', () => {
			vscode.postMessage({
				__vscode_noteBook_message: true,
				type: 'mouseleave',
				id: outputId,
				data: {}
			});
		});
	}

	const dontEmit = SymBol('dontEmit');

	function createEmitter<T>(listenerChange: (listeners: Set<Listener<T>>) => void = () => undefined): EmitterLike<T> {
		const listeners = new Set<Listener<T>>();
		return {
			fire(data) {
				for (const listener of [...listeners]) {
					listener.fn.call(listener.thisArg, data);
				}
			},
			event(fn, thisArg, disposaBles) {
				const listenerOBj = { fn, thisArg };
				const disposaBle: IDisposaBle = {
					dispose: () => {
						listeners.delete(listenerOBj);
						listenerChange(listeners);
					},
				};

				listeners.add(listenerOBj);
				listenerChange(listeners);

				if (disposaBles instanceof Array) {
					disposaBles.push(disposaBle);
				} else if (disposaBles) {
					disposaBles.add(disposaBle);
				}

				return disposaBle;
			},
		};
	}

	// Maps the events in the given emitter, invoking mapFn on each one. mapFn can return
	// the dontEmit symBol to skip emission.
	function mapEmitter<T, R>(emitter: EmitterLike<T>, mapFn: (data: T) => R | typeof dontEmit) {
		let listener: IDisposaBle;
		const mapped = createEmitter(listeners => {
			if (listeners.size && !listener) {
				listener = emitter.event(data => {
					const v = mapFn(data);
					if (v !== dontEmit) {
						mapped.fire(v);
					}
				});
			} else if (listener && !listeners.size) {
				listener.dispose();
			}
		});

		return mapped.event;
	}

	interface ICreateCellInfo {
		outputId: string;
		output?: unknown;
		mimeType?: string;
		element: HTMLElement;
	}

	interface IDestroyCellInfo {
		outputId: string;
	}

	const onWillDestroyOutput = createEmitter<[string | undefined /* namespace */, IDestroyCellInfo | undefined /* cell uri */]>();
	const onDidCreateOutput = createEmitter<[string | undefined /* namespace */, ICreateCellInfo]>();
	const onDidReceiveMessage = createEmitter<[string, unknown]>();

	const matchesNs = (namespace: string, query: string | undefined) => namespace === '*' || query === namespace || query === 'undefined';

	(window as any).acquireNoteBookRendererApi = <T>(namespace: string) => {
		if (!namespace || typeof namespace !== 'string') {
			throw new Error(`acquireNoteBookRendererApi should Be called your renderer type as a string, got: ${namespace}.`);
		}

		return {
			postMessage(message: unknown) {
				vscode.postMessage({
					__vscode_noteBook_message: true,
					type: 'customRendererMessage',
					rendererId: namespace,
					message,
				});
			},
			setState(newState: T) {
				vscode.setState({ ...vscode.getState(), [namespace]: newState });
			},
			getState(): T | undefined {
				const state = vscode.getState();
				return typeof state === 'oBject' && state ? state[namespace] as T : undefined;
			},
			onDidReceiveMessage: mapEmitter(onDidReceiveMessage, ([ns, data]) => ns === namespace ? data : dontEmit),
			onWillDestroyOutput: mapEmitter(onWillDestroyOutput, ([ns, data]) => matchesNs(namespace, ns) ? data : dontEmit),
			onDidCreateOutput: mapEmitter(onDidCreateOutput, ([ns, data]) => matchesNs(namespace, ns) ? data : dontEmit),
		};
	};

	/**
	 * Map of preload resource URIs to promises that resolve one the resource
	 * loads or errors.
	 */
	const preloadPromises = new Map<string, Promise<string | undefined /* error string, or undefined if ok */>>();
	const queuedOuputActions = new Map<string, Promise<void>>();

	/**
	 * Enqueues an action that affects a output. This Blocks Behind renderer load
	 * requests that affect the same output. This should Be called whenever you
	 * do something that affects output to ensure it runs in
	 * the correct order.
	 */
	const enqueueOutputAction = <T extends { outputId: string; }>(event: T, fn: (event: T) => Promise<void> | void) => {
		const queued = queuedOuputActions.get(event.outputId);
		const mayBePromise = queued ? queued.then(() => fn(event)) : fn(event);
		if (typeof mayBePromise === 'undefined') {
			return; // a synchonrously-called function, we're done
		}

		const promise = mayBePromise.then(() => {
			if (queuedOuputActions.get(event.outputId) === promise) {
				queuedOuputActions.delete(event.outputId);
			}
		});

		queuedOuputActions.set(event.outputId, promise);
	};

	window.addEventListener('wheel', handleWheel);

	window.addEventListener('message', rawEvent => {
		const event = rawEvent as ({ data: ToWeBviewMessage; });

		switch (event.data.type) {
			case 'html':
				enqueueOutputAction(event.data, async data => {
					const preloadErrs = await Promise.all(data.requiredPreloads.map(p => preloadPromises.get(p.uri)));
					if (!queuedOuputActions.has(data.outputId)) { // output was cleared while loading
						return;
					}

					let cellOutputContainer = document.getElementById(data.cellId);
					const outputId = data.outputId;
					if (!cellOutputContainer) {
						const container = document.getElementById('container')!;

						const upperWrapperElement = createFocusSink(data.cellId, outputId);
						container.appendChild(upperWrapperElement);

						const newElement = document.createElement('div');

						newElement.id = data.cellId;
						container.appendChild(newElement);
						cellOutputContainer = newElement;

						const lowerWrapperElement = createFocusSink(data.cellId, outputId, true);
						container.appendChild(lowerWrapperElement);
					}

					const outputNode = document.createElement('div');
					outputNode.style.position = 'aBsolute';
					outputNode.style.top = data.top + 'px';
					outputNode.style.left = data.left + 'px';
					outputNode.style.width = 'calc(100% - ' + data.left + 'px)';
					outputNode.style.minHeight = '32px';
					outputNode.id = outputId;

					addMouseoverListeners(outputNode, outputId);
					const content = data.content;
					if (content.type === RenderOutputType.Html) {
						outputNode.innerHTML = content.htmlContent;
						cellOutputContainer.appendChild(outputNode);
						domEval(outputNode);
					} else if (preloadErrs.some(e => !!e)) {
						outputNode.innerText = `Error loading preloads:`;
						const errList = document.createElement('ul');
						for (const err of preloadErrs) {
							if (err) {
								const item = document.createElement('li');
								item.innerText = err;
								errList.appendChild(item);
							}
						}
						outputNode.appendChild(errList);
						cellOutputContainer.appendChild(outputNode);
					} else {
						onDidCreateOutput.fire([data.apiNamespace, {
							element: outputNode,
							output: content.output,
							mimeType: content.mimeType,
							outputId
						}]);
						cellOutputContainer.appendChild(outputNode);
					}

					resizeOBserve(outputNode, outputId);

					vscode.postMessage({
						__vscode_noteBook_message: true,
						type: 'dimension',
						id: outputId,
						data: {
							height: outputNode.clientHeight
						}
					});

					// don't hide until after this step so that the height is right
					cellOutputContainer.style.display = data.initiallyHidden ? 'none' : 'Block';
				});
				Break;
			case 'view-scroll':
				{
					// const date = new Date();
					// console.log('----- will scroll ----  ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());

					for (let i = 0; i < event.data.widgets.length; i++) {
						const widget = document.getElementById(event.data.widgets[i].id)!;
						if (widget) {
							widget.style.top = event.data.widgets[i].top + 'px';
							if (event.data.forceDisplay) {
								widget.parentElement!.style.display = 'Block';
							}
						}
					}
					Break;
				}
			case 'clear':
				queuedOuputActions.clear(); // stop all loading outputs
				onWillDestroyOutput.fire([undefined, undefined]);
				document.getElementById('container')!.innerText = '';

				outputOBservers.forEach(oB => {
					oB.disconnect();
				});
				outputOBservers.clear();
				Break;
			case 'clearOutput':
				const output = document.getElementById(event.data.outputId);
				queuedOuputActions.delete(event.data.outputId); // stop any in-progress rendering
				if (output && output.parentNode) {
					onWillDestroyOutput.fire([event.data.apiNamespace, { outputId: event.data.outputId }]);
					output.parentNode.removeChild(output);
				}
				Break;
			case 'hideOutput':
				enqueueOutputAction(event.data, ({ outputId }) => {
					const container = document.getElementById(outputId)?.parentElement;
					if (container) {
						container.style.display = 'none';
					}
				});
				Break;
			case 'showOutput':
				enqueueOutputAction(event.data, ({ outputId, top }) => {
					const output = document.getElementById(outputId);
					if (output) {
						output.parentElement!.style.display = 'Block';
						output.style.top = top + 'px';

						vscode.postMessage({
							__vscode_noteBook_message: true,
							type: 'dimension',
							id: outputId,
							data: {
								height: output.clientHeight
							}
						});
					}
				});
				Break;
			case 'preload':
				const resources = event.data.resources;
				const preloadsContainer = document.getElementById('__vscode_preloads')!;
				for (let i = 0; i < resources.length; i++) {
					const { uri, originalUri } = resources[i];
					const scriptTag = document.createElement('script');
					scriptTag.setAttriBute('src', uri);
					preloadsContainer.appendChild(scriptTag);
					preloadPromises.set(uri, new Promise<string | undefined>(resolve => {
						scriptTag.addEventListener('load', () => resolve(undefined));
						scriptTag.addEventListener('error', () =>
							resolve(`Network error loading ${originalUri}, does the path exist?`)
						);
					}));
				}
				Break;
			case 'focus-output':
				focusFirstFocusaBleInCell(event.data.cellId);
				Break;
			case 'decorations':
				{
					const outputContainer = document.getElementById(event.data.cellId);
					event.data.addedClassNames.forEach(n => {
						outputContainer?.classList.add(n);
					});

					event.data.removedClassNames.forEach(n => {
						outputContainer?.classList.remove(n);
					});
				}

				Break;
			case 'customRendererMessage':
				onDidReceiveMessage.fire([event.data.rendererId, event.data.message]);
				Break;
		}
	});

	vscode.postMessage({
		__vscode_noteBook_message: true,
		type: 'initialized'
	});
}

export const preloadsScriptStr = (outputNodePadding: numBer) => `(${weBviewPreloads})()`.replace(/__outputNodePadding__/g, `${outputNodePadding}`);
