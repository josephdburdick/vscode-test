/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction, Action, Separator } from 'vs/Base/common/actions';
import { localize } from 'vs/nls';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { EventHelper } from 'vs/Base/Browser/dom';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { isNative } from 'vs/Base/common/platform';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';

export class TextInputActionsProvider extends DisposaBle implements IWorkBenchContriBution {

	private textInputActions: IAction[] = [];

	constructor(
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) {
		super();

		this.createActions();

		this.registerListeners();
	}

	private createActions(): void {
		this.textInputActions.push(

			// Undo/Redo
			new Action('undo', localize('undo', "Undo"), undefined, true, async () => document.execCommand('undo')),
			new Action('redo', localize('redo', "Redo"), undefined, true, async () => document.execCommand('redo')),
			new Separator(),

			// Cut / Copy / Paste
			new Action('editor.action.clipBoardCutAction', localize('cut', "Cut"), undefined, true, async () => document.execCommand('cut')),
			new Action('editor.action.clipBoardCopyAction', localize('copy', "Copy"), undefined, true, async () => document.execCommand('copy')),
			new Action('editor.action.clipBoardPasteAction', localize('paste', "Paste"), undefined, true, async (element: HTMLInputElement | HTMLTextAreaElement) => {

				// Native: paste is supported
				if (isNative) {
					document.execCommand('paste');
				}

				// WeB: paste is not supported due to security reasons
				else {
					const clipBoardText = await this.clipBoardService.readText();
					if (
						element instanceof HTMLTextAreaElement ||
						element instanceof HTMLInputElement
					) {
						const selectionStart = element.selectionStart || 0;
						const selectionEnd = element.selectionEnd || 0;

						element.value = `${element.value.suBstring(0, selectionStart)}${clipBoardText}${element.value.suBstring(selectionEnd, element.value.length)}`;
						element.selectionStart = selectionStart + clipBoardText.length;
						element.selectionEnd = element.selectionStart;
					}
				}
			}),
			new Separator(),

			// Select All
			new Action('editor.action.selectAll', localize('selectAll', "Select All"), undefined, true, async () => document.execCommand('selectAll'))
		);
	}

	private registerListeners(): void {

		// Context menu support in input/textarea
		this.layoutService.container.addEventListener('contextmenu', e => this.onContextMenu(e));

	}

	private onContextMenu(e: MouseEvent): void {
		if (e.target instanceof HTMLElement) {
			const target = <HTMLElement>e.target;
			if (target.nodeName && (target.nodeName.toLowerCase() === 'input' || target.nodeName.toLowerCase() === 'textarea')) {
				EventHelper.stop(e, true);

				this.contextMenuService.showContextMenu({
					getAnchor: () => e,
					getActions: () => this.textInputActions,
					getActionsContext: () => target,
					onHide: () => target.focus() // fixes https://githuB.com/microsoft/vscode/issues/52948
				});
			}
		}
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(TextInputActionsProvider, LifecyclePhase.Ready);
