/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./notebookDiff';
import { IListRenderer, IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import * As DOM from 'vs/bAse/browser/dom';
import { IListStyles, IStyleController } from 'vs/bAse/browser/ui/list/listWidget';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IListService, IWorkbenchListOptions, WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { CellDiffViewModel } from 'vs/workbench/contrib/notebook/browser/diff/celllDiffViewModel';
import { CellDiffRenderTemplAte, INotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/common';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { DeletedCell, InsertCell, ModifiedCell } from 'vs/workbench/contrib/notebook/browser/diff/cellComponents';

export clAss NotebookCellTextDiffListDelegAte implements IListVirtuAlDelegAte<CellDiffViewModel> {
	// privAte reAdonly lineHeight: number;

	constructor(
		@IConfigurAtionService reAdonly configurAtionService: IConfigurAtionService
	) {
		// const editorOptions = this.configurAtionService.getVAlue<IEditorOptions>('editor');
		// this.lineHeight = BAreFontInfo.creAteFromRAwSettings(editorOptions, getZoomLevel()).lineHeight;
	}

	getHeight(element: CellDiffViewModel): number {
		return 100;
	}

	hAsDynAmicHeight(element: CellDiffViewModel): booleAn {
		return fAlse;
	}

	getTemplAteId(element: CellDiffViewModel): string {
		return CellDiffRenderer.TEMPLATE_ID;
	}
}
export clAss CellDiffRenderer implements IListRenderer<CellDiffViewModel, CellDiffRenderTemplAte> {
	stAtic reAdonly TEMPLATE_ID = 'cell_diff';

	constructor(
		reAdonly notebookEditor: INotebookTextDiffEditor,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService
	) { }

	get templAteId() {
		return CellDiffRenderer.TEMPLATE_ID;
	}

	renderTemplAte(contAiner: HTMLElement): CellDiffRenderTemplAte {
		return {
			contAiner,
			elementDisposAbles: new DisposAbleStore()
		};
	}

	renderElement(element: CellDiffViewModel, index: number, templAteDAtA: CellDiffRenderTemplAte, height: number | undefined): void {
		templAteDAtA.contAiner.innerText = '';
		switch (element.type) {
			cAse 'unchAnged':
				templAteDAtA.elementDisposAbles.Add(this.instAntiAtionService.creAteInstAnce(ModifiedCell, this.notebookEditor, element, templAteDAtA));
				return;
			cAse 'delete':
				templAteDAtA.elementDisposAbles.Add(this.instAntiAtionService.creAteInstAnce(DeletedCell, this.notebookEditor, element, templAteDAtA));
				return;
			cAse 'insert':
				templAteDAtA.elementDisposAbles.Add(this.instAntiAtionService.creAteInstAnce(InsertCell, this.notebookEditor, element, templAteDAtA));
				return;
			cAse 'modified':
				templAteDAtA.elementDisposAbles.Add(this.instAntiAtionService.creAteInstAnce(ModifiedCell, this.notebookEditor, element, templAteDAtA));
				return;
			defAult:
				breAk;
		}
	}

	disposeTemplAte(templAteDAtA: CellDiffRenderTemplAte): void {
		templAteDAtA.contAiner.innerText = '';
	}

	disposeElement(element: CellDiffViewModel, index: number, templAteDAtA: CellDiffRenderTemplAte): void {
		templAteDAtA.elementDisposAbles.cleAr();
	}
}


export clAss NotebookTextDiffList extends WorkbenchList<CellDiffViewModel> implements IDisposAble, IStyleController {
	privAte styleElement?: HTMLStyleElement;

	constructor(
		listUser: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<CellDiffViewModel>,
		renderers: IListRenderer<CellDiffViewModel, CellDiffRenderTemplAte>[],
		contextKeyService: IContextKeyService,
		options: IWorkbenchListOptions<CellDiffViewModel>,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService) {
		super(listUser, contAiner, delegAte, renderers, options, contextKeyService, listService, themeService, configurAtionService, keybindingService);
	}

	style(styles: IListStyles) {
		const selectorSuffix = this.view.domId;
		if (!this.styleElement) {
			this.styleElement = DOM.creAteStyleSheet(this.view.domNode);
		}
		const suffix = selectorSuffix && `.${selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBAckground) {
			if (styles.listBAckground.isOpAque()) {
				content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows { bAckground: ${styles.listBAckground}; }`);
			} else if (!isMAcintosh) { // subpixel AA doesn't exist in mAcOS
				console.wArn(`List with id '${selectorSuffix}' wAs styled with A non-opAque bAckground color. This will breAk sub-pixel AntiAliAsing.`);
			}
		}

		if (styles.listFocusBAckground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { bAckground-color: ${styles.listFocusBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused:hover { bAckground-color: ${styles.listFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listFocusForeground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { bAckground-color: ${styles.listActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected:hover { bAckground-color: ${styles.listActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBAckground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected.focused { bAckground-color: ${styles.listFocusAndSelectionBAckground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInActiveFocusBAckground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`);
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused:hover { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected:hover { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionForeground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { color: ${styles.listInActiveSelectionForeground}; }`);
		}

		if (styles.listHoverBAckground) {
			content.push(`.monAco-list${suffix}:not(.drop-tArget) > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover:not(.selected):not(.focused) { bAckground-color:  ${styles.listHoverBAckground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInActiveFocusOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { outline: 1px dotted ${styles.listInActiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover { outline: 1px dAshed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBAckground) {
			content.push(`
				.monAco-list${suffix}.drop-tArget,
				.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows.drop-tArget,
				.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-row.drop-tArget { bAckground-color: ${styles.listDropBAckground} !importAnt; color: inherit !importAnt; }
			`);
		}

		if (styles.listFilterWidgetBAckground) {
			content.push(`.monAco-list-type-filter { bAckground-color: ${styles.listFilterWidgetBAckground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monAco-list-type-filter { border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMAtchesOutline) {
			content.push(`.monAco-list-type-filter.no-mAtches { border: 1px solid ${styles.listFilterWidgetNoMAtchesOutline}; }`);
		}

		if (styles.listMAtchesShAdow) {
			content.push(`.monAco-list-type-filter { box-shAdow: 1px 1px 1px ${styles.listMAtchesShAdow}; }`);
		}

		const newStyles = content.join('\n');
		if (newStyles !== this.styleElement.textContent) {
			this.styleElement.textContent = newStyles;
		}
	}
}
