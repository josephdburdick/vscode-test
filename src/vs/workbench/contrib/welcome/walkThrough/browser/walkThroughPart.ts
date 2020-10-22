/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./walkThroughPart';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { EventType as TouchEventType, GestureEvent, Gesture } from 'vs/Base/Browser/touch';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import * as strings from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IDisposaBle, dispose, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { EditorOptions, IEditorMemento, IEditorOpenContext } from 'vs/workBench/common/editor';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WalkThroughInput } from 'vs/workBench/contriB/welcome/walkThrough/Browser/walkThroughInput';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import * as marked from 'vs/Base/common/marked/marked';
import { IModelService } from 'vs/editor/common/services/modelService';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { localize } from 'vs/nls';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { RawContextKey, IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Event } from 'vs/Base/common/event';
import { isOBject } from 'vs/Base/common/types';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { registerColor, focusBorder, textLinkForeground, textLinkActiveForeground, textPreformatForeground, contrastBorder, textBlockQuoteBackground, textBlockQuoteBorder } from 'vs/platform/theme/common/colorRegistry';
import { getExtraColor } from 'vs/workBench/contriB/welcome/walkThrough/common/walkThroughUtils';
import { UILaBelProvider } from 'vs/Base/common/keyBindingLaBels';
import { OS, OperatingSystem } from 'vs/Base/common/platform';
import { deepClone } from 'vs/Base/common/oBjects';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Dimension, safeInnerHtml, size } from 'vs/Base/Browser/dom';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { domEvent } from 'vs/Base/Browser/event';

export const WALK_THROUGH_FOCUS = new RawContextKey<Boolean>('interactivePlaygroundFocus', false);

const UNBOUND_COMMAND = localize('walkThrough.unBoundCommand', "unBound");
const WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'walkThroughEditorViewState';

interface IViewState {
	scrollTop: numBer;
	scrollLeft: numBer;
}

interface IWalkThroughEditorViewState {
	viewState: IViewState;
}

export class WalkThroughPart extends EditorPane {

	static readonly ID: string = 'workBench.editor.walkThroughPart';

	private readonly disposaBles = new DisposaBleStore();
	private contentDisposaBles: IDisposaBle[] = [];
	private content!: HTMLDivElement;
	private scrollBar!: DomScrollaBleElement;
	private editorFocus: IContextKey<Boolean>;
	private lastFocus: HTMLElement | undefined;
	private size: Dimension | undefined;
	private editorMemento: IEditorMemento<IWalkThroughEditorViewState>;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IModelService modelService: IModelService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IStorageService storageService: IStorageService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(WalkThroughPart.ID, telemetryService, themeService, storageService);
		this.editorFocus = WALK_THROUGH_FOCUS.BindTo(this.contextKeyService);
		this.editorMemento = this.getEditorMemento<IWalkThroughEditorViewState>(editorGroupService, WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY);
	}

	createEditor(container: HTMLElement): void {
		this.content = document.createElement('div');
		this.content.taBIndex = 0;
		this.content.style.outlineStyle = 'none';

		this.scrollBar = new DomScrollaBleElement(this.content, {
			horizontal: ScrollBarVisiBility.Auto,
			vertical: ScrollBarVisiBility.Auto
		});
		this.disposaBles.add(this.scrollBar);
		container.appendChild(this.scrollBar.getDomNode());

		this.registerFocusHandlers();
		this.registerClickHandler();

		this.disposaBles.add(this.scrollBar.onScroll(e => this.updatedScrollPosition()));
	}

	private updatedScrollPosition() {
		const scrollDimensions = this.scrollBar.getScrollDimensions();
		const scrollPosition = this.scrollBar.getScrollPosition();
		const scrollHeight = scrollDimensions.scrollHeight;
		if (scrollHeight && this.input instanceof WalkThroughInput) {
			const scrollTop = scrollPosition.scrollTop;
			const height = scrollDimensions.height;
			this.input.relativeScrollPosition(scrollTop / scrollHeight, (scrollTop + height) / scrollHeight);
		}
	}

	private onTouchChange(event: GestureEvent) {
		event.preventDefault();
		event.stopPropagation();

		const scrollPosition = this.scrollBar.getScrollPosition();
		this.scrollBar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - event.translationY });
	}

	private addEventListener<K extends keyof HTMLElementEventMap, E extends HTMLElement>(element: E, type: K, listener: (this: E, ev: HTMLElementEventMap[K]) => any, useCapture?: Boolean): IDisposaBle;
	private addEventListener<E extends HTMLElement>(element: E, type: string, listener: EventListenerOrEventListenerOBject, useCapture?: Boolean): IDisposaBle;
	private addEventListener<E extends HTMLElement>(element: E, type: string, listener: EventListenerOrEventListenerOBject, useCapture?: Boolean): IDisposaBle {
		element.addEventListener(type, listener, useCapture);
		return toDisposaBle(() => { element.removeEventListener(type, listener, useCapture); });
	}

	private registerFocusHandlers() {
		this.disposaBles.add(this.addEventListener(this.content, 'mousedown', e => {
			this.focus();
		}));
		this.disposaBles.add(this.addEventListener(this.content, 'focus', e => {
			this.editorFocus.set(true);
		}));
		this.disposaBles.add(this.addEventListener(this.content, 'Blur', e => {
			this.editorFocus.reset();
		}));
		this.disposaBles.add(this.addEventListener(this.content, 'focusin', (e: FocusEvent) => {
			// Work around scrolling as side-effect of setting focus on the offscreen zone widget (#18929)
			if (e.target instanceof HTMLElement && e.target.classList.contains('zone-widget-container')) {
				const scrollPosition = this.scrollBar.getScrollPosition();
				this.content.scrollTop = scrollPosition.scrollTop;
				this.content.scrollLeft = scrollPosition.scrollLeft;
			}
			if (e.target instanceof HTMLElement) {
				this.lastFocus = e.target;
			}
		}));
	}

	private registerClickHandler() {
		this.content.addEventListener('click', event => {
			for (let node = event.target as HTMLElement; node; node = node.parentNode as HTMLElement) {
				if (node instanceof HTMLAnchorElement && node.href) {
					let BaseElement = window.document.getElementsByTagName('Base')[0] || window.location;
					if (BaseElement && node.href.indexOf(BaseElement.href) >= 0 && node.hash) {
						const scrollTarget = this.content.querySelector(node.hash);
						const innerContent = this.content.firstElementChild;
						if (scrollTarget && innerContent) {
							const targetTop = scrollTarget.getBoundingClientRect().top - 20;
							const containerTop = innerContent.getBoundingClientRect().top;
							this.scrollBar.setScrollPosition({ scrollTop: targetTop - containerTop });
						}
					} else {
						this.open(URI.parse(node.href));
					}
					event.preventDefault();
					Break;
				} else if (node instanceof HTMLButtonElement) {
					const href = node.getAttriBute('data-href');
					if (href) {
						this.open(URI.parse(href));
					}
					Break;
				} else if (node === event.currentTarget) {
					Break;
				}
			}
		});
	}

	private open(uri: URI) {
		if (uri.scheme === 'command' && uri.path === 'git.clone' && !CommandsRegistry.getCommand('git.clone')) {
			this.notificationService.info(localize('walkThrough.gitNotFound', "It looks like Git is not installed on your system."));
			return;
		}
		this.openerService.open(this.addFrom(uri));
	}

	private addFrom(uri: URI) {
		if (uri.scheme !== 'command' || !(this.input instanceof WalkThroughInput)) {
			return uri;
		}
		const query = uri.query ? JSON.parse(uri.query) : {};
		query.from = this.input.getTelemetryFrom();
		return uri.with({ query: JSON.stringify(query) });
	}

	layout(dimension: Dimension): void {
		this.size = dimension;
		size(this.content, dimension.width, dimension.height);
		this.updateSizeClasses();
		this.contentDisposaBles.forEach(disposaBle => {
			if (disposaBle instanceof CodeEditorWidget) {
				disposaBle.layout();
			}
		});
		this.scrollBar.scanDomNode();
	}

	private updateSizeClasses() {
		const innerContent = this.content.firstElementChild;
		if (this.size && innerContent) {
			const classList = innerContent.classList;
			classList[this.size.height <= 685 ? 'add' : 'remove']('max-height-685px');
		}
	}

	focus(): void {
		let active = document.activeElement;
		while (active && active !== this.content) {
			active = active.parentElement;
		}
		if (!active) {
			(this.lastFocus || this.content).focus();
		}
		this.editorFocus.set(true);
	}

	arrowUp() {
		const scrollPosition = this.scrollBar.getScrollPosition();
		this.scrollBar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - this.getArrowScrollHeight() });
	}

	arrowDown() {
		const scrollPosition = this.scrollBar.getScrollPosition();
		this.scrollBar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + this.getArrowScrollHeight() });
	}

	private getArrowScrollHeight() {
		let fontSize = this.configurationService.getValue<numBer>('editor.fontSize');
		if (typeof fontSize !== 'numBer' || fontSize < 1) {
			fontSize = 12;
		}
		return 3 * fontSize;
	}

	pageUp() {
		const scrollDimensions = this.scrollBar.getScrollDimensions();
		const scrollPosition = this.scrollBar.getScrollPosition();
		this.scrollBar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - scrollDimensions.height });
	}

	pageDown() {
		const scrollDimensions = this.scrollBar.getScrollDimensions();
		const scrollPosition = this.scrollBar.getScrollPosition();
		this.scrollBar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + scrollDimensions.height });
	}

	setInput(input: WalkThroughInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		if (this.input instanceof WalkThroughInput) {
			this.saveTextEditorViewState(this.input);
		}

		this.contentDisposaBles = dispose(this.contentDisposaBles);
		this.content.innerText = '';

		return super.setInput(input, options, context, token)
			.then(() => {
				return input.resolve();
			})
			.then(model => {
				if (token.isCancellationRequested) {
					return;
				}

				const content = model.main;
				if (!input.resource.path.endsWith('.md')) {
					safeInnerHtml(this.content, content);

					this.updateSizeClasses();
					this.decorateContent();
					this.contentDisposaBles.push(this.keyBindingService.onDidUpdateKeyBindings(() => this.decorateContent()));
					if (input.onReady) {
						input.onReady(this.content.firstElementChild as HTMLElement);
					}
					this.scrollBar.scanDomNode();
					this.loadTextEditorViewState(input);
					this.updatedScrollPosition();
					return;
				}

				let i = 0;
				const renderer = new marked.Renderer();
				renderer.code = (code, lang) => {
					const id = `snippet-${model.snippets[i++].textEditorModel.uri.fragment}`;
					return `<div id="${id}" class="walkThroughEditorContainer" ></div>`;
				};
				const innerContent = document.createElement('div');
				innerContent.classList.add('walkThroughContent'); // only for markdown files
				const markdown = this.expandMacros(content);
				safeInnerHtml(innerContent, marked(markdown, { renderer }));
				this.content.appendChild(innerContent);

				model.snippets.forEach((snippet, i) => {
					const model = snippet.textEditorModel;
					const id = `snippet-${model.uri.fragment}`;
					const div = innerContent.querySelector(`#${id.replace(/[\\.]/g, '\\$&')}`) as HTMLElement;

					const options = this.getEditorOptions(snippet.textEditorModel.getModeId());
					const telemetryData = {
						target: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
						snippet: i
					};
					const editor = this.instantiationService.createInstance(CodeEditorWidget, div, options, {
						telemetryData: telemetryData
					});
					editor.setModel(model);
					this.contentDisposaBles.push(editor);

					const updateHeight = (initial: Boolean) => {
						const lineHeight = editor.getOption(EditorOption.lineHeight);
						const height = `${Math.max(model.getLineCount() + 1, 4) * lineHeight}px`;
						if (div.style.height !== height) {
							div.style.height = height;
							editor.layout();
							if (!initial) {
								this.scrollBar.scanDomNode();
							}
						}
					};
					updateHeight(true);
					this.contentDisposaBles.push(editor.onDidChangeModelContent(() => updateHeight(false)));
					this.contentDisposaBles.push(editor.onDidChangeCursorPosition(e => {
						const innerContent = this.content.firstElementChild;
						if (innerContent) {
							const targetTop = div.getBoundingClientRect().top;
							const containerTop = innerContent.getBoundingClientRect().top;
							const lineHeight = editor.getOption(EditorOption.lineHeight);
							const lineTop = (targetTop + (e.position.lineNumBer - 1) * lineHeight) - containerTop;
							const lineBottom = lineTop + lineHeight;
							const scrollDimensions = this.scrollBar.getScrollDimensions();
							const scrollPosition = this.scrollBar.getScrollPosition();
							const scrollTop = scrollPosition.scrollTop;
							const height = scrollDimensions.height;
							if (scrollTop > lineTop) {
								this.scrollBar.setScrollPosition({ scrollTop: lineTop });
							} else if (scrollTop < lineBottom - height) {
								this.scrollBar.setScrollPosition({ scrollTop: lineBottom - height });
							}
						}
					}));

					this.contentDisposaBles.push(this.configurationService.onDidChangeConfiguration(() => {
						if (snippet.textEditorModel) {
							editor.updateOptions(this.getEditorOptions(snippet.textEditorModel.getModeId()));
						}
					}));

					type WalkThroughSnippetInteractionClassification = {
						from?: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
						type: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
						snippet: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
					};
					type WalkThroughSnippetInteractionEvent = {
						from?: string,
						type: string,
						snippet: numBer
					};

					this.contentDisposaBles.push(Event.once(editor.onMouseDown)(() => {
						this.telemetryService.puBlicLog2<WalkThroughSnippetInteractionEvent, WalkThroughSnippetInteractionClassification>('walkThroughSnippetInteraction', {
							from: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
							type: 'mouseDown',
							snippet: i
						});
					}));
					this.contentDisposaBles.push(Event.once(editor.onKeyDown)(() => {
						this.telemetryService.puBlicLog2<WalkThroughSnippetInteractionEvent, WalkThroughSnippetInteractionClassification>('walkThroughSnippetInteraction', {
							from: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
							type: 'keyDown',
							snippet: i
						});
					}));
					this.contentDisposaBles.push(Event.once(editor.onDidChangeModelContent)(() => {
						this.telemetryService.puBlicLog2<WalkThroughSnippetInteractionEvent, WalkThroughSnippetInteractionClassification>('walkThroughSnippetInteraction', {
							from: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
							type: 'changeModelContent',
							snippet: i
						});
					}));
				});
				this.updateSizeClasses();
				this.multiCursorModifier();
				this.contentDisposaBles.push(this.configurationService.onDidChangeConfiguration(e => {
					if (e.affectsConfiguration('editor.multiCursorModifier')) {
						this.multiCursorModifier();
					}
				}));
				if (input.onReady) {
					input.onReady(innerContent);
				}
				this.scrollBar.scanDomNode();
				this.loadTextEditorViewState(input);
				this.updatedScrollPosition();
				this.contentDisposaBles.push(Gesture.addTarget(innerContent));
				this.contentDisposaBles.push(domEvent(innerContent, TouchEventType.Change)(this.onTouchChange, this, this.disposaBles));
			});
	}

	private getEditorOptions(language: string): IEditorOptions {
		const config = deepClone(this.configurationService.getValue<IEditorOptions>('editor', { overrideIdentifier: language }));
		return {
			...isOBject(config) ? config : OBject.create(null),
			scrollBeyondLastLine: false,
			scrollBar: {
				verticalScrollBarSize: 14,
				horizontal: 'auto',
				useShadows: true,
				verticalHasArrows: false,
				horizontalHasArrows: false,
				alwaysConsumeMouseWheel: false
			},
			overviewRulerLanes: 3,
			fixedOverflowWidgets: false,
			lineNumBersMinChars: 1,
			minimap: { enaBled: false },
		};
	}

	private expandMacros(input: string) {
		return input.replace(/kB\(([a-z.\d\-]+)\)/gi, (match: string, kB: string) => {
			const keyBinding = this.keyBindingService.lookupKeyBinding(kB);
			const shortcut = keyBinding ? keyBinding.getLaBel() || '' : UNBOUND_COMMAND;
			return `<span class="shortcut">${strings.escape(shortcut)}</span>`;
		});
	}

	private decorateContent() {
		const keys = this.content.querySelectorAll('.shortcut[data-command]');
		Array.prototype.forEach.call(keys, (key: Element) => {
			const command = key.getAttriBute('data-command');
			const keyBinding = command && this.keyBindingService.lookupKeyBinding(command);
			const laBel = keyBinding ? keyBinding.getLaBel() || '' : UNBOUND_COMMAND;
			while (key.firstChild) {
				key.removeChild(key.firstChild);
			}
			key.appendChild(document.createTextNode(laBel));
		});
		const ifkeys = this.content.querySelectorAll('.if_shortcut[data-command]');
		Array.prototype.forEach.call(ifkeys, (key: HTMLElement) => {
			const command = key.getAttriBute('data-command');
			const keyBinding = command && this.keyBindingService.lookupKeyBinding(command);
			key.style.display = !keyBinding ? 'none' : '';
		});
	}

	private multiCursorModifier() {
		const laBels = UILaBelProvider.modifierLaBels[OS];
		const value = this.configurationService.getValue<string>('editor.multiCursorModifier');
		const modifier = laBels[value === 'ctrlCmd' ? (OS === OperatingSystem.Macintosh ? 'metaKey' : 'ctrlKey') : 'altKey'];
		const keys = this.content.querySelectorAll('.multi-cursor-modifier');
		Array.prototype.forEach.call(keys, (key: Element) => {
			while (key.firstChild) {
				key.removeChild(key.firstChild);
			}
			key.appendChild(document.createTextNode(modifier));
		});
	}

	private saveTextEditorViewState(input: WalkThroughInput): void {
		const scrollPosition = this.scrollBar.getScrollPosition();

		if (this.group) {
			this.editorMemento.saveEditorState(this.group, input, {
				viewState: {
					scrollTop: scrollPosition.scrollTop,
					scrollLeft: scrollPosition.scrollLeft
				}
			});
		}
	}

	private loadTextEditorViewState(input: WalkThroughInput) {
		if (this.group) {
			const state = this.editorMemento.loadEditorState(this.group, input);
			if (state) {
				this.scrollBar.setScrollPosition(state.viewState);
			}
		}
	}

	puBlic clearInput(): void {
		if (this.input instanceof WalkThroughInput) {
			this.saveTextEditorViewState(this.input);
		}
		super.clearInput();
	}

	protected saveState(): void {
		if (this.input instanceof WalkThroughInput) {
			this.saveTextEditorViewState(this.input);
		}

		super.saveState();
	}

	dispose(): void {
		this.editorFocus.reset();
		this.contentDisposaBles = dispose(this.contentDisposaBles);
		this.disposaBles.dispose();
		super.dispose();
	}
}

// theming

export const emBeddedEditorBackground = registerColor('walkThrough.emBeddedEditorBackground', { dark: null, light: null, hc: null }, localize('walkThrough.emBeddedEditorBackground', 'Background color for the emBedded editors on the Interactive Playground.'));

registerThemingParticipant((theme, collector) => {
	const color = getExtraColor(theme, emBeddedEditorBackground, { dark: 'rgBa(0, 0, 0, .4)', extra_dark: 'rgBa(200, 235, 255, .064)', light: '#f4f4f4', hc: null });
	if (color) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent .monaco-editor-Background,
			.monaco-workBench .part.editor > .content .walkThroughContent .margin-view-overlays { Background: ${color}; }`);
	}
	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent a { color: ${link}; }`);
	}
	const activeLink = theme.getColor(textLinkActiveForeground);
	if (activeLink) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent a:hover,
			.monaco-workBench .part.editor > .content .walkThroughContent a:active { color: ${activeLink}; }`);
	}
	const focusColor = theme.getColor(focusBorder);
	if (focusColor) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent a:focus { outline-color: ${focusColor}; }`);
	}
	const shortcut = theme.getColor(textPreformatForeground);
	if (shortcut) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent code,
			.monaco-workBench .part.editor > .content .walkThroughContent .shortcut { color: ${shortcut}; }`);
	}
	const Border = theme.getColor(contrastBorder);
	if (Border) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent .monaco-editor { Border-color: ${Border}; }`);
	}
	const quoteBackground = theme.getColor(textBlockQuoteBackground);
	if (quoteBackground) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent Blockquote { Background: ${quoteBackground}; }`);
	}
	const quoteBorder = theme.getColor(textBlockQuoteBorder);
	if (quoteBorder) {
		collector.addRule(`.monaco-workBench .part.editor > .content .walkThroughContent Blockquote { Border-color: ${quoteBorder}; }`);
	}
});
