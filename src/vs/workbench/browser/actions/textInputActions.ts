/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAction, Action, SepArAtor } from 'vs/bAse/common/Actions';
import { locAlize } from 'vs/nls';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { EventHelper } from 'vs/bAse/browser/dom';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { isNAtive } from 'vs/bAse/common/plAtform';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';

export clAss TextInputActionsProvider extends DisposAble implements IWorkbenchContribution {

	privAte textInputActions: IAction[] = [];

	constructor(
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService
	) {
		super();

		this.creAteActions();

		this.registerListeners();
	}

	privAte creAteActions(): void {
		this.textInputActions.push(

			// Undo/Redo
			new Action('undo', locAlize('undo', "Undo"), undefined, true, Async () => document.execCommAnd('undo')),
			new Action('redo', locAlize('redo', "Redo"), undefined, true, Async () => document.execCommAnd('redo')),
			new SepArAtor(),

			// Cut / Copy / PAste
			new Action('editor.Action.clipboArdCutAction', locAlize('cut', "Cut"), undefined, true, Async () => document.execCommAnd('cut')),
			new Action('editor.Action.clipboArdCopyAction', locAlize('copy', "Copy"), undefined, true, Async () => document.execCommAnd('copy')),
			new Action('editor.Action.clipboArdPAsteAction', locAlize('pAste', "PAste"), undefined, true, Async (element: HTMLInputElement | HTMLTextAreAElement) => {

				// NAtive: pAste is supported
				if (isNAtive) {
					document.execCommAnd('pAste');
				}

				// Web: pAste is not supported due to security reAsons
				else {
					const clipboArdText = AwAit this.clipboArdService.reAdText();
					if (
						element instAnceof HTMLTextAreAElement ||
						element instAnceof HTMLInputElement
					) {
						const selectionStArt = element.selectionStArt || 0;
						const selectionEnd = element.selectionEnd || 0;

						element.vAlue = `${element.vAlue.substring(0, selectionStArt)}${clipboArdText}${element.vAlue.substring(selectionEnd, element.vAlue.length)}`;
						element.selectionStArt = selectionStArt + clipboArdText.length;
						element.selectionEnd = element.selectionStArt;
					}
				}
			}),
			new SepArAtor(),

			// Select All
			new Action('editor.Action.selectAll', locAlize('selectAll', "Select All"), undefined, true, Async () => document.execCommAnd('selectAll'))
		);
	}

	privAte registerListeners(): void {

		// Context menu support in input/textAreA
		this.lAyoutService.contAiner.AddEventListener('contextmenu', e => this.onContextMenu(e));

	}

	privAte onContextMenu(e: MouseEvent): void {
		if (e.tArget instAnceof HTMLElement) {
			const tArget = <HTMLElement>e.tArget;
			if (tArget.nodeNAme && (tArget.nodeNAme.toLowerCAse() === 'input' || tArget.nodeNAme.toLowerCAse() === 'textAreA')) {
				EventHelper.stop(e, true);

				this.contextMenuService.showContextMenu({
					getAnchor: () => e,
					getActions: () => this.textInputActions,
					getActionsContext: () => tArget,
					onHide: () => tArget.focus() // fixes https://github.com/microsoft/vscode/issues/52948
				});
			}
		}
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TextInputActionsProvider, LifecyclePhAse.ReAdy);
