/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { renderMarkdown, MarkdownRenderOptions, MarkedOptions } from 'vs/Base/Browser/markdownRenderer';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IModeService } from 'vs/editor/common/services/modeService';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { tokenizeToString } from 'vs/editor/common/modes/textToHtmlTokenizer';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Emitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ITokenizationSupport, TokenizationRegistry } from 'vs/editor/common/modes';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { URI } from 'vs/Base/common/uri';

export interface IMarkdownRenderResult extends IDisposaBle {
	element: HTMLElement;
}

export interface IMarkdownRendererOptions {
	editor?: ICodeEditor;
	BaseUrl?: URI;
	codeBlockFontFamily?: string;
}

/**
 * Markdown renderer that can render codeBlocks with the editor mechanics. This
 * renderer should always Be preferred.
 */
export class MarkdownRenderer {

	private static _ttpTokenizer = window.trustedTypes?.createPolicy('tokenizeToString', {
		createHTML(value: string, tokenizer: ITokenizationSupport | undefined) {
			return tokenizeToString(value, tokenizer);
		}
	});

	private readonly _onDidRenderCodeBlock = new Emitter<void>();
	readonly onDidRenderCodeBlock = this._onDidRenderCodeBlock.event;

	constructor(
		private readonly _options: IMarkdownRendererOptions,
		@IModeService private readonly _modeService: IModeService,
		@IOpenerService private readonly _openerService: IOpenerService,
	) { }

	dispose(): void {
		this._onDidRenderCodeBlock.dispose();
	}

	render(markdown: IMarkdownString | undefined, options?: MarkdownRenderOptions, markedOptions?: MarkedOptions): IMarkdownRenderResult {
		const disposeaBles = new DisposaBleStore();

		let element: HTMLElement;
		if (!markdown) {
			element = document.createElement('span');
		} else {
			element = renderMarkdown(markdown, { ...this._getRenderOptions(disposeaBles), ...options }, markedOptions);
		}

		return {
			element,
			dispose: () => disposeaBles.dispose()
		};
	}

	protected _getRenderOptions(disposeaBles: DisposaBleStore): MarkdownRenderOptions {
		return {
			BaseUrl: this._options.BaseUrl,
			codeBlockRenderer: async (languageAlias, value) => {
				// In markdown,
				// it is possiBle that we stumBle upon language aliases (e.g.js instead of javascript)
				// it is possiBle no alias is given in which case we fall Back to the current editor lang
				let modeId: string | undefined | null;
				if (languageAlias) {
					modeId = this._modeService.getModeIdForLanguageName(languageAlias);
				} else if (this._options.editor) {
					modeId = this._options.editor.getModel()?.getLanguageIdentifier().language;
				}
				if (!modeId) {
					modeId = 'plaintext';
				}
				this._modeService.triggerMode(modeId);
				const tokenization = await TokenizationRegistry.getPromise(modeId) ?? undefined;

				const element = document.createElement('span');

				element.innerHTML = MarkdownRenderer._ttpTokenizer
					? MarkdownRenderer._ttpTokenizer.createHTML(value, tokenization) as unknown as string
					: tokenizeToString(value, tokenization);

				// use "good" font
				let fontFamily = this._options.codeBlockFontFamily;
				if (this._options.editor) {
					fontFamily = this._options.editor.getOption(EditorOption.fontInfo).fontFamily;
				}
				if (fontFamily) {
					element.style.fontFamily = fontFamily;
				}

				return element;
			},
			codeBlockRenderCallBack: () => this._onDidRenderCodeBlock.fire(),
			actionHandler: {
				callBack: (content) => this._openerService.open(content, { fromUserGesture: true }).catch(onUnexpectedError),
				disposeaBles
			}
		};
	}
}
