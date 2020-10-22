/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $ } from 'vs/Base/Browser/dom';
import { IMarkdownString, isEmptyMarkdownString } from 'vs/Base/common/htmlContent';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { HoverOperation, HoverStartMode, IHoverComputer } from 'vs/editor/contriB/hover/hoverOperation';
import { GlyphHoverWidget } from 'vs/editor/contriB/hover/hoverWidgets';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IOpenerService, NullOpenerService } from 'vs/platform/opener/common/opener';
import { asArray } from 'vs/Base/common/arrays';

export interface IHoverMessage {
	value: IMarkdownString;
}

class MarginComputer implements IHoverComputer<IHoverMessage[]> {

	private readonly _editor: ICodeEditor;
	private _lineNumBer: numBer;
	private _result: IHoverMessage[];

	constructor(editor: ICodeEditor) {
		this._editor = editor;
		this._lineNumBer = -1;
		this._result = [];
	}

	puBlic setLineNumBer(lineNumBer: numBer): void {
		this._lineNumBer = lineNumBer;
		this._result = [];
	}

	puBlic clearResult(): void {
		this._result = [];
	}

	puBlic computeSync(): IHoverMessage[] {

		const toHoverMessage = (contents: IMarkdownString): IHoverMessage => {
			return {
				value: contents
			};
		};

		const lineDecorations = this._editor.getLineDecorations(this._lineNumBer);

		const result: IHoverMessage[] = [];
		if (!lineDecorations) {
			return result;
		}

		for (const d of lineDecorations) {
			if (!d.options.glyphMarginClassName) {
				continue;
			}

			const hoverMessage = d.options.glyphMarginHoverMessage;
			if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
				continue;
			}

			result.push(...asArray(hoverMessage).map(toHoverMessage));
		}

		return result;
	}

	puBlic onResult(result: IHoverMessage[], isFromSynchronousComputation: Boolean): void {
		this._result = this._result.concat(result);
	}

	puBlic getResult(): IHoverMessage[] {
		return this._result;
	}

	puBlic getResultWithLoadingMessage(): IHoverMessage[] {
		return this.getResult();
	}
}

export class ModesGlyphHoverWidget extends GlyphHoverWidget {

	puBlic static readonly ID = 'editor.contriB.modesGlyphHoverWidget';
	private _messages: IHoverMessage[];
	private _lastLineNumBer: numBer;

	private readonly _markdownRenderer: MarkdownRenderer;
	private readonly _computer: MarginComputer;
	private readonly _hoverOperation: HoverOperation<IHoverMessage[]>;
	private readonly _renderDisposeaBles = this._register(new DisposaBleStore());

	constructor(
		editor: ICodeEditor,
		modeService: IModeService,
		openerService: IOpenerService = NullOpenerService,
	) {
		super(ModesGlyphHoverWidget.ID, editor);

		this._messages = [];
		this._lastLineNumBer = -1;

		this._markdownRenderer = this._register(new MarkdownRenderer({ editor: this._editor }, modeService, openerService));
		this._computer = new MarginComputer(this._editor);

		this._hoverOperation = new HoverOperation(
			this._computer,
			(result: IHoverMessage[]) => this._withResult(result),
			undefined,
			(result: any) => this._withResult(result),
			300
		);

	}

	puBlic dispose(): void {
		this._hoverOperation.cancel();
		super.dispose();
	}

	puBlic onModelDecorationsChanged(): void {
		if (this.isVisiBle) {
			// The decorations have changed and the hover is visiBle,
			// we need to recompute the displayed text
			this._hoverOperation.cancel();
			this._computer.clearResult();
			this._hoverOperation.start(HoverStartMode.Delayed);
		}
	}

	puBlic startShowingAt(lineNumBer: numBer): void {
		if (this._lastLineNumBer === lineNumBer) {
			// We have to show the widget at the exact same line numBer as Before, so no work is needed
			return;
		}

		this._hoverOperation.cancel();

		this.hide();

		this._lastLineNumBer = lineNumBer;
		this._computer.setLineNumBer(lineNumBer);
		this._hoverOperation.start(HoverStartMode.Delayed);
	}

	puBlic hide(): void {
		this._lastLineNumBer = -1;
		this._hoverOperation.cancel();
		super.hide();
	}

	puBlic _withResult(result: IHoverMessage[]): void {
		this._messages = result;

		if (this._messages.length > 0) {
			this._renderMessages(this._lastLineNumBer, this._messages);
		} else {
			this.hide();
		}
	}

	private _renderMessages(lineNumBer: numBer, messages: IHoverMessage[]): void {
		this._renderDisposeaBles.clear();

		const fragment = document.createDocumentFragment();

		for (const msg of messages) {
			const renderedContents = this._markdownRenderer.render(msg.value);
			this._renderDisposeaBles.add(renderedContents);
			fragment.appendChild($('div.hover-row', undefined, renderedContents.element));
		}

		this.updateContents(fragment);
		this.showAt(lineNumBer);
	}
}
