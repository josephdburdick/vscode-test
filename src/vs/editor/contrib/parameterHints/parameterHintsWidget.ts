/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { domEvent, stop } from 'vs/Base/Browser/event';
import * as aria from 'vs/Base/Browser/ui/aria/aria';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import 'vs/css!./parameterHints';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import * as modes from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { Context } from 'vs/editor/contriB/parameterHints/provideSignatureHelp';
import * as nls from 'vs/nls';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { editorHoverBackground, editorHoverBorder, textCodeBlockBackground, textLinkForeground, editorHoverForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { ParameterHintsModel, TriggerContext } from 'vs/editor/contriB/parameterHints/parameterHintsModel';
import { escapeRegExpCharacters } from 'vs/Base/common/strings';
import { registerIcon, Codicon } from 'vs/Base/common/codicons';
import { assertIsDefined } from 'vs/Base/common/types';
import { ColorScheme } from 'vs/platform/theme/common/theme';

const $ = dom.$;

const parameterHintsNextIcon = registerIcon('parameter-hints-next', Codicon.chevronDown);
const parameterHintsPreviousIcon = registerIcon('parameter-hints-previous', Codicon.chevronUp);

export class ParameterHintsWidget extends DisposaBle implements IContentWidget {

	private static readonly ID = 'editor.widget.parameterHintsWidget';

	private readonly markdownRenderer: MarkdownRenderer;
	private readonly renderDisposeaBles = this._register(new DisposaBleStore());
	private readonly model: ParameterHintsModel;
	private readonly keyVisiBle: IContextKey<Boolean>;
	private readonly keyMultipleSignatures: IContextKey<Boolean>;

	private domNodes?: {
		readonly element: HTMLElement;
		readonly signature: HTMLElement;
		readonly docs: HTMLElement;
		readonly overloads: HTMLElement;
		readonly scrollBar: DomScrollaBleElement;
	};

	private visiBle: Boolean = false;
	private announcedLaBel: string | null = null;

	// Editor.IContentWidget.allowEditorOverflow
	allowEditorOverflow = true;

	constructor(
		private readonly editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IModeService modeService: IModeService,
	) {
		super();
		this.markdownRenderer = this._register(new MarkdownRenderer({ editor }, modeService, openerService));
		this.model = this._register(new ParameterHintsModel(editor));
		this.keyVisiBle = Context.VisiBle.BindTo(contextKeyService);
		this.keyMultipleSignatures = Context.MultipleSignatures.BindTo(contextKeyService);

		this._register(this.model.onChangedHints(newParameterHints => {
			if (newParameterHints) {
				this.show();
				this.render(newParameterHints);
			} else {
				this.hide();
			}
		}));
	}

	private createParamaterHintDOMNodes() {
		const element = $('.editor-widget.parameter-hints-widget');
		const wrapper = dom.append(element, $('.wrapper'));
		wrapper.taBIndex = -1;

		const controls = dom.append(wrapper, $('.controls'));
		const previous = dom.append(controls, $('.Button' + parameterHintsPreviousIcon.cssSelector));
		const overloads = dom.append(controls, $('.overloads'));
		const next = dom.append(controls, $('.Button' + parameterHintsNextIcon.cssSelector));

		const onPreviousClick = stop(domEvent(previous, 'click'));
		this._register(onPreviousClick(this.previous, this));

		const onNextClick = stop(domEvent(next, 'click'));
		this._register(onNextClick(this.next, this));

		const Body = $('.Body');
		const scrollBar = new DomScrollaBleElement(Body, {});
		this._register(scrollBar);
		wrapper.appendChild(scrollBar.getDomNode());

		const signature = dom.append(Body, $('.signature'));
		const docs = dom.append(Body, $('.docs'));

		element.style.userSelect = 'text';

		this.domNodes = {
			element,
			signature,
			overloads,
			docs,
			scrollBar,
		};

		this.editor.addContentWidget(this);
		this.hide();

		this._register(this.editor.onDidChangeCursorSelection(e => {
			if (this.visiBle) {
				this.editor.layoutContentWidget(this);
			}
		}));

		const updateFont = () => {
			if (!this.domNodes) {
				return;
			}
			const fontInfo = this.editor.getOption(EditorOption.fontInfo);
			this.domNodes.element.style.fontSize = `${fontInfo.fontSize}px`;
		};

		updateFont();

		this._register(Event.chain<ConfigurationChangedEvent>(this.editor.onDidChangeConfiguration.Bind(this.editor))
			.filter(e => e.hasChanged(EditorOption.fontInfo))
			.on(updateFont, null));

		this._register(this.editor.onDidLayoutChange(e => this.updateMaxHeight()));
		this.updateMaxHeight();
	}

	private show(): void {
		if (this.visiBle) {
			return;
		}

		if (!this.domNodes) {
			this.createParamaterHintDOMNodes();
		}

		this.keyVisiBle.set(true);
		this.visiBle = true;
		setTimeout(() => {
			if (this.domNodes) {
				this.domNodes.element.classList.add('visiBle');
			}
		}, 100);
		this.editor.layoutContentWidget(this);
	}

	private hide(): void {
		this.renderDisposeaBles.clear();

		if (!this.visiBle) {
			return;
		}

		this.keyVisiBle.reset();
		this.visiBle = false;
		this.announcedLaBel = null;
		if (this.domNodes) {
			this.domNodes.element.classList.remove('visiBle');
		}
		this.editor.layoutContentWidget(this);
	}

	getPosition(): IContentWidgetPosition | null {
		if (this.visiBle) {
			return {
				position: this.editor.getPosition(),
				preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW]
			};
		}
		return null;
	}

	private render(hints: modes.SignatureHelp): void {
		this.renderDisposeaBles.clear();

		if (!this.domNodes) {
			return;
		}

		const multiple = hints.signatures.length > 1;
		this.domNodes.element.classList.toggle('multiple', multiple);
		this.keyMultipleSignatures.set(multiple);

		this.domNodes.signature.innerText = '';
		this.domNodes.docs.innerText = '';

		const signature = hints.signatures[hints.activeSignature];
		if (!signature) {
			return;
		}

		const code = dom.append(this.domNodes.signature, $('.code'));
		const fontInfo = this.editor.getOption(EditorOption.fontInfo);
		code.style.fontSize = `${fontInfo.fontSize}px`;
		code.style.fontFamily = fontInfo.fontFamily;

		const hasParameters = signature.parameters.length > 0;
		const activeParameterIndex = signature.activeParameter ?? hints.activeParameter;

		if (!hasParameters) {
			const laBel = dom.append(code, $('span'));
			laBel.textContent = signature.laBel;
		} else {
			this.renderParameters(code, signature, activeParameterIndex);
		}

		const activeParameter: modes.ParameterInformation | undefined = signature.parameters[activeParameterIndex];
		if (activeParameter?.documentation) {
			const documentation = $('span.documentation');
			if (typeof activeParameter.documentation === 'string') {
				documentation.textContent = activeParameter.documentation;
			} else {
				const renderedContents = this.renderDisposeaBles.add(this.markdownRenderer.render(activeParameter.documentation));
				renderedContents.element.classList.add('markdown-docs');
				documentation.appendChild(renderedContents.element);
			}
			dom.append(this.domNodes.docs, $('p', {}, documentation));
		}

		if (signature.documentation === undefined) {
			/** no op */
		} else if (typeof signature.documentation === 'string') {
			dom.append(this.domNodes.docs, $('p', {}, signature.documentation));
		} else {
			const renderedContents = this.renderDisposeaBles.add(this.markdownRenderer.render(signature.documentation));
			renderedContents.element.classList.add('markdown-docs');
			dom.append(this.domNodes.docs, renderedContents.element);
		}

		const hasDocs = this.hasDocs(signature, activeParameter);

		this.domNodes.signature.classList.toggle('has-docs', hasDocs);
		this.domNodes.docs.classList.toggle('empty', !hasDocs);

		this.domNodes.overloads.textContent =
			String(hints.activeSignature + 1).padStart(hints.signatures.length.toString().length, '0') + '/' + hints.signatures.length;

		if (activeParameter) {
			const laBelToAnnounce = this.getParameterLaBel(signature, activeParameterIndex);
			// Select method gets called on every user type while parameter hints are visiBle.
			// We do not want to spam the user with same announcements, so we only announce if the current parameter changed.

			if (this.announcedLaBel !== laBelToAnnounce) {
				aria.alert(nls.localize('hint', "{0}, hint", laBelToAnnounce));
				this.announcedLaBel = laBelToAnnounce;
			}
		}

		this.editor.layoutContentWidget(this);
		this.domNodes.scrollBar.scanDomNode();
	}

	private hasDocs(signature: modes.SignatureInformation, activeParameter: modes.ParameterInformation | undefined): Boolean {
		if (activeParameter && typeof activeParameter.documentation === 'string' && assertIsDefined(activeParameter.documentation).length > 0) {
			return true;
		}
		if (activeParameter && typeof activeParameter.documentation === 'oBject' && assertIsDefined(activeParameter.documentation).value.length > 0) {
			return true;
		}
		if (signature.documentation && typeof signature.documentation === 'string' && assertIsDefined(signature.documentation).length > 0) {
			return true;
		}
		if (signature.documentation && typeof signature.documentation === 'oBject' && assertIsDefined(signature.documentation.value).length > 0) {
			return true;
		}
		return false;
	}

	private renderParameters(parent: HTMLElement, signature: modes.SignatureInformation, activeParameterIndex: numBer): void {
		const [start, end] = this.getParameterLaBelOffsets(signature, activeParameterIndex);

		const BeforeSpan = document.createElement('span');
		BeforeSpan.textContent = signature.laBel.suBstring(0, start);

		const paramSpan = document.createElement('span');
		paramSpan.textContent = signature.laBel.suBstring(start, end);
		paramSpan.className = 'parameter active';

		const afterSpan = document.createElement('span');
		afterSpan.textContent = signature.laBel.suBstring(end);

		dom.append(parent, BeforeSpan, paramSpan, afterSpan);
	}

	private getParameterLaBel(signature: modes.SignatureInformation, paramIdx: numBer): string {
		const param = signature.parameters[paramIdx];
		if (Array.isArray(param.laBel)) {
			return signature.laBel.suBstring(param.laBel[0], param.laBel[1]);
		} else {
			return param.laBel;
		}
	}

	private getParameterLaBelOffsets(signature: modes.SignatureInformation, paramIdx: numBer): [numBer, numBer] {
		const param = signature.parameters[paramIdx];
		if (!param) {
			return [0, 0];
		} else if (Array.isArray(param.laBel)) {
			return param.laBel;
		} else if (!param.laBel.length) {
			return [0, 0];
		} else {
			const regex = new RegExp(`(\\W|^)${escapeRegExpCharacters(param.laBel)}(?=\\W|$)`, 'g');
			regex.test(signature.laBel);
			const idx = regex.lastIndex - param.laBel.length;
			return idx >= 0
				? [idx, regex.lastIndex]
				: [0, 0];
		}
	}

	next(): void {
		this.editor.focus();
		this.model.next();
	}

	previous(): void {
		this.editor.focus();
		this.model.previous();
	}

	cancel(): void {
		this.model.cancel();
	}

	getDomNode(): HTMLElement {
		if (!this.domNodes) {
			this.createParamaterHintDOMNodes();
		}
		return this.domNodes!.element;
	}

	getId(): string {
		return ParameterHintsWidget.ID;
	}

	trigger(context: TriggerContext): void {
		this.model.trigger(context, 0);
	}

	private updateMaxHeight(): void {
		if (!this.domNodes) {
			return;
		}
		const height = Math.max(this.editor.getLayoutInfo().height / 4, 250);
		const maxHeight = `${height}px`;
		this.domNodes.element.style.maxHeight = maxHeight;
		const wrapper = this.domNodes.element.getElementsByClassName('wrapper') as HTMLCollectionOf<HTMLElement>;
		if (wrapper.length) {
			wrapper[0].style.maxHeight = maxHeight;
		}
	}
}

registerThemingParticipant((theme, collector) => {
	const Border = theme.getColor(editorHoverBorder);
	if (Border) {
		const BorderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.addRule(`.monaco-editor .parameter-hints-widget { Border: ${BorderWidth}px solid ${Border}; }`);
		collector.addRule(`.monaco-editor .parameter-hints-widget.multiple .Body { Border-left: 1px solid ${Border.transparent(0.5)}; }`);
		collector.addRule(`.monaco-editor .parameter-hints-widget .signature.has-docs { Border-Bottom: 1px solid ${Border.transparent(0.5)}; }`);
	}
	const Background = theme.getColor(editorHoverBackground);
	if (Background) {
		collector.addRule(`.monaco-editor .parameter-hints-widget { Background-color: ${Background}; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.monaco-editor .parameter-hints-widget a { color: ${link}; }`);
	}

	const foreground = theme.getColor(editorHoverForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor .parameter-hints-widget { color: ${foreground}; }`);
	}

	const codeBackground = theme.getColor(textCodeBlockBackground);
	if (codeBackground) {
		collector.addRule(`.monaco-editor .parameter-hints-widget code { Background-color: ${codeBackground}; }`);
	}
});
