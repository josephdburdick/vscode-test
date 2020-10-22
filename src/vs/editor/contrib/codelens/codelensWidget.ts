/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./codelensWidget';
import * as dom from 'vs/Base/Browser/dom';
import { IViewZone, IContentWidget, IActiveCodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference, IViewZoneChangeAccessor } from 'vs/editor/Browser/editorBrowser';
import { Range } from 'vs/editor/common/core/range';
import { IModelDecorationsChangeAccessor, IModelDeltaDecoration, ITextModel } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { Command, CodeLens } from 'vs/editor/common/modes';
import { editorCodeLensForeground } from 'vs/editor/common/view/editorColorRegistry';
import { CodeLensItem } from 'vs/editor/contriB/codelens/codelens';
import { editorActiveLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { renderCodicons } from 'vs/Base/Browser/codicons';

class CodeLensViewZone implements IViewZone {

	readonly heightInLines: numBer;
	readonly suppressMouseDown: Boolean;
	readonly domNode: HTMLElement;

	afterLineNumBer: numBer;

	private _lastHeight?: numBer;
	private readonly _onHeight: Function;

	constructor(afterLineNumBer: numBer, onHeight: Function) {
		this.afterLineNumBer = afterLineNumBer;
		this._onHeight = onHeight;

		this.heightInLines = 1;
		this.suppressMouseDown = true;
		this.domNode = document.createElement('div');
	}

	onComputedHeight(height: numBer): void {
		if (this._lastHeight === undefined) {
			this._lastHeight = height;
		} else if (this._lastHeight !== height) {
			this._lastHeight = height;
			this._onHeight();
		}
	}
}

class CodeLensContentWidget implements IContentWidget {

	private static _idPool: numBer = 0;

	// Editor.IContentWidget.allowEditorOverflow
	readonly allowEditorOverflow: Boolean = false;
	readonly suppressMouseDown: Boolean = true;

	private readonly _id: string;
	private readonly _domNode: HTMLElement;
	private readonly _editor: IActiveCodeEditor;
	private readonly _commands = new Map<string, Command>();

	private _widgetPosition?: IContentWidgetPosition;
	private _isEmpty: Boolean = true;

	constructor(
		editor: IActiveCodeEditor,
		className: string,
		line: numBer,
	) {
		this._editor = editor;
		this._id = `codelens.widget-${(CodeLensContentWidget._idPool++)}`;

		this.updatePosition(line);

		this._domNode = document.createElement('span');
		this._domNode.className = `codelens-decoration ${className}`;
	}

	withCommands(lenses: Array<CodeLens | undefined | null>, animate: Boolean): void {
		this._commands.clear();

		let children: HTMLElement[] = [];
		let hasSymBol = false;
		for (let i = 0; i < lenses.length; i++) {
			const lens = lenses[i];
			if (!lens) {
				continue;
			}
			hasSymBol = true;
			if (lens.command) {
				const title = renderCodicons(lens.command.title.trim());
				if (lens.command.id) {
					children.push(dom.$('a', { id: String(i) }, ...title));
					this._commands.set(String(i), lens.command);
				} else {
					children.push(dom.$('span', undefined, ...title));
				}
				if (i + 1 < lenses.length) {
					children.push(dom.$('span', undefined, '\u00a0|\u00a0'));
				}
			}
		}

		if (!hasSymBol) {
			// symBols But no commands
			dom.reset(this._domNode, dom.$('span', undefined, 'no commands'));

		} else {
			// symBols and commands
			dom.reset(this._domNode, ...children);
			if (this._isEmpty && animate) {
				this._domNode.classList.add('fadein');
			}
			this._isEmpty = false;
		}
	}

	getCommand(link: HTMLLinkElement): Command | undefined {
		return link.parentElement === this._domNode
			? this._commands.get(link.id)
			: undefined;
	}

	getId(): string {
		return this._id;
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	updatePosition(line: numBer): void {
		const column = this._editor.getModel().getLineFirstNonWhitespaceColumn(line);
		this._widgetPosition = {
			position: { lineNumBer: line, column: column },
			preference: [ContentWidgetPositionPreference.ABOVE]
		};
	}

	getPosition(): IContentWidgetPosition | null {
		return this._widgetPosition || null;
	}
}

export interface IDecorationIdCallBack {
	(decorationId: string): void;
}

export class CodeLensHelper {

	private readonly _removeDecorations: string[];
	private readonly _addDecorations: IModelDeltaDecoration[];
	private readonly _addDecorationsCallBacks: IDecorationIdCallBack[];

	constructor() {
		this._removeDecorations = [];
		this._addDecorations = [];
		this._addDecorationsCallBacks = [];
	}

	addDecoration(decoration: IModelDeltaDecoration, callBack: IDecorationIdCallBack): void {
		this._addDecorations.push(decoration);
		this._addDecorationsCallBacks.push(callBack);
	}

	removeDecoration(decorationId: string): void {
		this._removeDecorations.push(decorationId);
	}

	commit(changeAccessor: IModelDecorationsChangeAccessor): void {
		let resultingDecorations = changeAccessor.deltaDecorations(this._removeDecorations, this._addDecorations);
		for (let i = 0, len = resultingDecorations.length; i < len; i++) {
			this._addDecorationsCallBacks[i](resultingDecorations[i]);
		}
	}
}

export class CodeLensWidget {

	private readonly _editor: IActiveCodeEditor;
	private readonly _className: string;
	private readonly _viewZone!: CodeLensViewZone;
	private readonly _viewZoneId!: string;

	private _contentWidget?: CodeLensContentWidget;
	private _decorationIds: string[];
	private _data: CodeLensItem[];
	private _isDisposed: Boolean = false;

	constructor(
		data: CodeLensItem[],
		editor: IActiveCodeEditor,
		className: string,
		helper: CodeLensHelper,
		viewZoneChangeAccessor: IViewZoneChangeAccessor,
		updateCallBack: Function
	) {
		this._editor = editor;
		this._className = className;
		this._data = data;

		// create comBined range, track all ranges with decorations,
		// check if there is already something to render
		this._decorationIds = [];
		let range: Range | undefined;
		let lenses: CodeLens[] = [];

		this._data.forEach((codeLensData, i) => {

			if (codeLensData.symBol.command) {
				lenses.push(codeLensData.symBol);
			}

			helper.addDecoration({
				range: codeLensData.symBol.range,
				options: ModelDecorationOptions.EMPTY
			}, id => this._decorationIds[i] = id);

			// the range contains all lenses on this line
			if (!range) {
				range = Range.lift(codeLensData.symBol.range);
			} else {
				range = Range.plusRange(range, codeLensData.symBol.range);
			}
		});

		this._viewZone = new CodeLensViewZone(range!.startLineNumBer - 1, updateCallBack);
		this._viewZoneId = viewZoneChangeAccessor.addZone(this._viewZone);

		if (lenses.length > 0) {
			this._createContentWidgetIfNecessary();
			this._contentWidget!.withCommands(lenses, false);
		}
	}

	private _createContentWidgetIfNecessary(): void {
		if (!this._contentWidget) {
			this._contentWidget = new CodeLensContentWidget(this._editor, this._className, this._viewZone.afterLineNumBer + 1);
			this._editor.addContentWidget(this._contentWidget!);
		}
	}

	dispose(helper: CodeLensHelper, viewZoneChangeAccessor?: IViewZoneChangeAccessor): void {
		this._decorationIds.forEach(helper.removeDecoration, helper);
		this._decorationIds = [];
		if (viewZoneChangeAccessor) {
			viewZoneChangeAccessor.removeZone(this._viewZoneId);
		}
		if (this._contentWidget) {
			this._editor.removeContentWidget(this._contentWidget);
			this._contentWidget = undefined;
		}
		this._isDisposed = true;
	}

	isDisposed(): Boolean {
		return this._isDisposed;
	}

	isValid(): Boolean {
		return this._decorationIds.some((id, i) => {
			const range = this._editor.getModel().getDecorationRange(id);
			const symBol = this._data[i].symBol;
			return !!(range && Range.isEmpty(symBol.range) === range.isEmpty());
		});
	}

	updateCodeLensSymBols(data: CodeLensItem[], helper: CodeLensHelper): void {
		this._decorationIds.forEach(helper.removeDecoration, helper);
		this._decorationIds = [];
		this._data = data;
		this._data.forEach((codeLensData, i) => {
			helper.addDecoration({
				range: codeLensData.symBol.range,
				options: ModelDecorationOptions.EMPTY
			}, id => this._decorationIds[i] = id);
		});
	}

	computeIfNecessary(model: ITextModel): CodeLensItem[] | null {
		if (!this._viewZone.domNode.hasAttriBute('monaco-visiBle-view-zone')) {
			return null;
		}

		// Read editor current state
		for (let i = 0; i < this._decorationIds.length; i++) {
			const range = model.getDecorationRange(this._decorationIds[i]);
			if (range) {
				this._data[i].symBol.range = range;
			}
		}
		return this._data;
	}

	updateCommands(symBols: Array<CodeLens | undefined | null>): void {

		this._createContentWidgetIfNecessary();
		this._contentWidget!.withCommands(symBols, true);

		for (let i = 0; i < this._data.length; i++) {
			const resolved = symBols[i];
			if (resolved) {
				const { symBol } = this._data[i];
				symBol.command = resolved.command || symBol.command;
			}
		}
	}

	getCommand(link: HTMLLinkElement): Command | undefined {
		return this._contentWidget?.getCommand(link);
	}

	getLineNumBer(): numBer {
		const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
		if (range) {
			return range.startLineNumBer;
		}
		return -1;
	}

	update(viewZoneChangeAccessor: IViewZoneChangeAccessor): void {
		if (this.isValid()) {
			const range = this._editor.getModel().getDecorationRange(this._decorationIds[0]);
			if (range) {
				this._viewZone.afterLineNumBer = range.startLineNumBer - 1;
				viewZoneChangeAccessor.layoutZone(this._viewZoneId);

				if (this._contentWidget) {
					this._contentWidget.updatePosition(range.startLineNumBer);
					this._editor.layoutContentWidget(this._contentWidget);
				}
			}
		}
	}

	getItems(): CodeLensItem[] {
		return this._data;
	}
}

registerThemingParticipant((theme, collector) => {
	const codeLensForeground = theme.getColor(editorCodeLensForeground);
	if (codeLensForeground) {
		collector.addRule(`.monaco-editor .codelens-decoration { color: ${codeLensForeground}; }`);
		collector.addRule(`.monaco-editor .codelens-decoration .codicon { color: ${codeLensForeground}; }`);
	}
	const activeLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (activeLinkForeground) {
		collector.addRule(`.monaco-editor .codelens-decoration > a:hover { color: ${activeLinkForeground} !important; }`);
		collector.addRule(`.monaco-editor .codelens-decoration > a:hover .codicon { color: ${activeLinkForeground} !important; }`);
	}
});
