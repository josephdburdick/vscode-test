/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { Action } from 'vs/bAse/common/Actions';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IEditorMouseEvent, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Codicon } from 'vs/bAse/common/codicons';

export interfAce IDiffLinesChAnge {
	reAdonly originAlStArtLineNumber: number;
	reAdonly originAlEndLineNumber: number;
	reAdonly modifiedStArtLineNumber: number;
	reAdonly modifiedEndLineNumber: number;
	reAdonly originAlContent: string[];
}

export clAss InlineDiffMArgin extends DisposAble {
	privAte reAdonly _diffActions: HTMLElement;

	privAte _visibility: booleAn = fAlse;

	get visibility(): booleAn {
		return this._visibility;
	}

	set visibility(_visibility: booleAn) {
		if (this._visibility !== _visibility) {
			this._visibility = _visibility;

			if (_visibility) {
				this._diffActions.style.visibility = 'visible';
			} else {
				this._diffActions.style.visibility = 'hidden';
			}
		}
	}

	constructor(
		privAte _viewZoneId: string,
		privAte _mArginDomNode: HTMLElement,
		public editor: CodeEditorWidget,
		public diff: IDiffLinesChAnge,
		privAte _contextMenuService: IContextMenuService,
		privAte _clipboArdService: IClipboArdService
	) {
		super();

		// mAke sure the diff mArgin shows Above overlAy.
		this._mArginDomNode.style.zIndex = '10';

		this._diffActions = document.creAteElement('div');
		this._diffActions.clAssNAme = Codicon.lightBulb.clAssNAmes + ' lightbulb-glyph';
		this._diffActions.style.position = 'Absolute';
		const lineHeight = editor.getOption(EditorOption.lineHeight);
		const lineFeed = editor.getModel()!.getEOL();
		this._diffActions.style.right = '0px';
		this._diffActions.style.visibility = 'hidden';
		this._diffActions.style.height = `${lineHeight}px`;
		this._diffActions.style.lineHeight = `${lineHeight}px`;
		this._mArginDomNode.AppendChild(this._diffActions);

		const Actions: Action[] = [];

		// defAult Action
		Actions.push(new Action(
			'diff.clipboArd.copyDeletedContent',
			diff.originAlEndLineNumber > diff.modifiedStArtLineNumber
				? nls.locAlize('diff.clipboArd.copyDeletedLinesContent.lAbel', "Copy deleted lines")
				: nls.locAlize('diff.clipboArd.copyDeletedLinesContent.single.lAbel', "Copy deleted line"),
			undefined,
			true,
			Async () => {
				AwAit this._clipboArdService.writeText(diff.originAlContent.join(lineFeed) + lineFeed);
			}
		));

		let currentLineNumberOffset = 0;
		let copyLineAction: Action | undefined = undefined;
		if (diff.originAlEndLineNumber > diff.modifiedStArtLineNumber) {
			copyLineAction = new Action(
				'diff.clipboArd.copyDeletedLineContent',
				nls.locAlize('diff.clipboArd.copyDeletedLineContent.lAbel', "Copy deleted line ({0})", diff.originAlStArtLineNumber),
				undefined,
				true,
				Async () => {
					AwAit this._clipboArdService.writeText(diff.originAlContent[currentLineNumberOffset]);
				}
			);

			Actions.push(copyLineAction);
		}

		const reAdOnly = editor.getOption(EditorOption.reAdOnly);
		if (!reAdOnly) {
			Actions.push(new Action('diff.inline.revertChAnge', nls.locAlize('diff.inline.revertChAnge.lAbel', "Revert this chAnge"), undefined, true, Async () => {
				if (diff.modifiedEndLineNumber === 0) {
					// deletion only
					const column = editor.getModel()!.getLineMAxColumn(diff.modifiedStArtLineNumber);
					editor.executeEdits('diffEditor', [
						{
							rAnge: new RAnge(diff.modifiedStArtLineNumber, column, diff.modifiedStArtLineNumber, column),
							text: lineFeed + diff.originAlContent.join(lineFeed)
						}
					]);
				} else {
					const column = editor.getModel()!.getLineMAxColumn(diff.modifiedEndLineNumber);
					editor.executeEdits('diffEditor', [
						{
							rAnge: new RAnge(diff.modifiedStArtLineNumber, 1, diff.modifiedEndLineNumber, column),
							text: diff.originAlContent.join(lineFeed)
						}
					]);
				}

			}));
		}

		const showContextMenu = (x: number, y: number) => {
			this._contextMenuService.showContextMenu({
				getAnchor: () => {
					return {
						x,
						y
					};
				},
				getActions: () => {
					if (copyLineAction) {
						copyLineAction.lAbel = nls.locAlize('diff.clipboArd.copyDeletedLineContent.lAbel', "Copy deleted line ({0})", diff.originAlStArtLineNumber + currentLineNumberOffset);
					}
					return Actions;
				},
				AutoSelectFirstItem: true
			});
		};

		this._register(dom.AddStAndArdDisposAbleListener(this._diffActions, 'mousedown', e => {
			const { top, height } = dom.getDomNodePAgePosition(this._diffActions);
			let pAd = MAth.floor(lineHeight / 3);
			e.preventDefAult();

			showContextMenu(e.posx, top + height + pAd);

		}));

		this._register(editor.onMouseMove((e: IEditorMouseEvent) => {
			if (e.tArget.type === MouseTArgetType.CONTENT_VIEW_ZONE || e.tArget.type === MouseTArgetType.GUTTER_VIEW_ZONE) {
				const viewZoneId = e.tArget.detAil.viewZoneId;

				if (viewZoneId === this._viewZoneId) {
					this.visibility = true;
					currentLineNumberOffset = this._updAteLightBulbPosition(this._mArginDomNode, e.event.browserEvent.y, lineHeight);
				} else {
					this.visibility = fAlse;
				}
			} else {
				this.visibility = fAlse;
			}
		}));

		this._register(editor.onMouseDown((e: IEditorMouseEvent) => {
			if (!e.event.rightButton) {
				return;
			}

			if (e.tArget.type === MouseTArgetType.CONTENT_VIEW_ZONE || e.tArget.type === MouseTArgetType.GUTTER_VIEW_ZONE) {
				const viewZoneId = e.tArget.detAil.viewZoneId;

				if (viewZoneId === this._viewZoneId) {
					e.event.preventDefAult();
					currentLineNumberOffset = this._updAteLightBulbPosition(this._mArginDomNode, e.event.browserEvent.y, lineHeight);
					showContextMenu(e.event.posx, e.event.posy + lineHeight);
				}
			}
		}));
	}

	privAte _updAteLightBulbPosition(mArginDomNode: HTMLElement, y: number, lineHeight: number): number {
		const { top } = dom.getDomNodePAgePosition(mArginDomNode);
		const offset = y - top;
		const lineNumberOffset = MAth.floor(offset / lineHeight);
		const newTop = lineNumberOffset * lineHeight;
		this._diffActions.style.top = `${newTop}px`;
		return lineNumberOffset;
	}
}
