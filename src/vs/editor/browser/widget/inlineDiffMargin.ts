/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { Action } from 'vs/Base/common/actions';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IEditorMouseEvent, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { Range } from 'vs/editor/common/core/range';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Codicon } from 'vs/Base/common/codicons';

export interface IDiffLinesChange {
	readonly originalStartLineNumBer: numBer;
	readonly originalEndLineNumBer: numBer;
	readonly modifiedStartLineNumBer: numBer;
	readonly modifiedEndLineNumBer: numBer;
	readonly originalContent: string[];
}

export class InlineDiffMargin extends DisposaBle {
	private readonly _diffActions: HTMLElement;

	private _visiBility: Boolean = false;

	get visiBility(): Boolean {
		return this._visiBility;
	}

	set visiBility(_visiBility: Boolean) {
		if (this._visiBility !== _visiBility) {
			this._visiBility = _visiBility;

			if (_visiBility) {
				this._diffActions.style.visiBility = 'visiBle';
			} else {
				this._diffActions.style.visiBility = 'hidden';
			}
		}
	}

	constructor(
		private _viewZoneId: string,
		private _marginDomNode: HTMLElement,
		puBlic editor: CodeEditorWidget,
		puBlic diff: IDiffLinesChange,
		private _contextMenuService: IContextMenuService,
		private _clipBoardService: IClipBoardService
	) {
		super();

		// make sure the diff margin shows aBove overlay.
		this._marginDomNode.style.zIndex = '10';

		this._diffActions = document.createElement('div');
		this._diffActions.className = Codicon.lightBulB.classNames + ' lightBulB-glyph';
		this._diffActions.style.position = 'aBsolute';
		const lineHeight = editor.getOption(EditorOption.lineHeight);
		const lineFeed = editor.getModel()!.getEOL();
		this._diffActions.style.right = '0px';
		this._diffActions.style.visiBility = 'hidden';
		this._diffActions.style.height = `${lineHeight}px`;
		this._diffActions.style.lineHeight = `${lineHeight}px`;
		this._marginDomNode.appendChild(this._diffActions);

		const actions: Action[] = [];

		// default action
		actions.push(new Action(
			'diff.clipBoard.copyDeletedContent',
			diff.originalEndLineNumBer > diff.modifiedStartLineNumBer
				? nls.localize('diff.clipBoard.copyDeletedLinesContent.laBel', "Copy deleted lines")
				: nls.localize('diff.clipBoard.copyDeletedLinesContent.single.laBel', "Copy deleted line"),
			undefined,
			true,
			async () => {
				await this._clipBoardService.writeText(diff.originalContent.join(lineFeed) + lineFeed);
			}
		));

		let currentLineNumBerOffset = 0;
		let copyLineAction: Action | undefined = undefined;
		if (diff.originalEndLineNumBer > diff.modifiedStartLineNumBer) {
			copyLineAction = new Action(
				'diff.clipBoard.copyDeletedLineContent',
				nls.localize('diff.clipBoard.copyDeletedLineContent.laBel', "Copy deleted line ({0})", diff.originalStartLineNumBer),
				undefined,
				true,
				async () => {
					await this._clipBoardService.writeText(diff.originalContent[currentLineNumBerOffset]);
				}
			);

			actions.push(copyLineAction);
		}

		const readOnly = editor.getOption(EditorOption.readOnly);
		if (!readOnly) {
			actions.push(new Action('diff.inline.revertChange', nls.localize('diff.inline.revertChange.laBel', "Revert this change"), undefined, true, async () => {
				if (diff.modifiedEndLineNumBer === 0) {
					// deletion only
					const column = editor.getModel()!.getLineMaxColumn(diff.modifiedStartLineNumBer);
					editor.executeEdits('diffEditor', [
						{
							range: new Range(diff.modifiedStartLineNumBer, column, diff.modifiedStartLineNumBer, column),
							text: lineFeed + diff.originalContent.join(lineFeed)
						}
					]);
				} else {
					const column = editor.getModel()!.getLineMaxColumn(diff.modifiedEndLineNumBer);
					editor.executeEdits('diffEditor', [
						{
							range: new Range(diff.modifiedStartLineNumBer, 1, diff.modifiedEndLineNumBer, column),
							text: diff.originalContent.join(lineFeed)
						}
					]);
				}

			}));
		}

		const showContextMenu = (x: numBer, y: numBer) => {
			this._contextMenuService.showContextMenu({
				getAnchor: () => {
					return {
						x,
						y
					};
				},
				getActions: () => {
					if (copyLineAction) {
						copyLineAction.laBel = nls.localize('diff.clipBoard.copyDeletedLineContent.laBel', "Copy deleted line ({0})", diff.originalStartLineNumBer + currentLineNumBerOffset);
					}
					return actions;
				},
				autoSelectFirstItem: true
			});
		};

		this._register(dom.addStandardDisposaBleListener(this._diffActions, 'mousedown', e => {
			const { top, height } = dom.getDomNodePagePosition(this._diffActions);
			let pad = Math.floor(lineHeight / 3);
			e.preventDefault();

			showContextMenu(e.posx, top + height + pad);

		}));

		this._register(editor.onMouseMove((e: IEditorMouseEvent) => {
			if (e.target.type === MouseTargetType.CONTENT_VIEW_ZONE || e.target.type === MouseTargetType.GUTTER_VIEW_ZONE) {
				const viewZoneId = e.target.detail.viewZoneId;

				if (viewZoneId === this._viewZoneId) {
					this.visiBility = true;
					currentLineNumBerOffset = this._updateLightBulBPosition(this._marginDomNode, e.event.BrowserEvent.y, lineHeight);
				} else {
					this.visiBility = false;
				}
			} else {
				this.visiBility = false;
			}
		}));

		this._register(editor.onMouseDown((e: IEditorMouseEvent) => {
			if (!e.event.rightButton) {
				return;
			}

			if (e.target.type === MouseTargetType.CONTENT_VIEW_ZONE || e.target.type === MouseTargetType.GUTTER_VIEW_ZONE) {
				const viewZoneId = e.target.detail.viewZoneId;

				if (viewZoneId === this._viewZoneId) {
					e.event.preventDefault();
					currentLineNumBerOffset = this._updateLightBulBPosition(this._marginDomNode, e.event.BrowserEvent.y, lineHeight);
					showContextMenu(e.event.posx, e.event.posy + lineHeight);
				}
			}
		}));
	}

	private _updateLightBulBPosition(marginDomNode: HTMLElement, y: numBer, lineHeight: numBer): numBer {
		const { top } = dom.getDomNodePagePosition(marginDomNode);
		const offset = y - top;
		const lineNumBerOffset = Math.floor(offset / lineHeight);
		const newTop = lineNumBerOffset * lineHeight;
		this._diffActions.style.top = `${newTop}px`;
		return lineNumBerOffset;
	}
}
