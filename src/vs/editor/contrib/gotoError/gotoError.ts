/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { RawContextKey, IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IMarker } from 'vs/platform/markers/common/markers';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { registerEditorAction, registerEditorContriBution, ServicesAccessor, IActionOptions, EditorAction, EditorCommand, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { MarkerNavigationWidget } from './gotoErrorWidget';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { MenuId } from 'vs/platform/actions/common/actions';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IMarkerNavigationService, MarkerList } from 'vs/editor/contriB/gotoError/markerNavigationService';

export class MarkerController implements IEditorContriBution {

	static readonly ID = 'editor.contriB.markerController';

	static get(editor: ICodeEditor): MarkerController {
		return editor.getContriBution<MarkerController>(MarkerController.ID);
	}

	private readonly _editor: ICodeEditor;

	private readonly _widgetVisiBle: IContextKey<Boolean>;
	private readonly _sessionDispoaBles = new DisposaBleStore();

	private _model?: MarkerList;
	private _widget?: MarkerNavigationWidget;

	constructor(
		editor: ICodeEditor,
		@IMarkerNavigationService private readonly _markerNavigationService: IMarkerNavigationService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@ICodeEditorService private readonly _editorService: ICodeEditorService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		this._editor = editor;
		this._widgetVisiBle = CONTEXT_MARKERS_NAVIGATION_VISIBLE.BindTo(this._contextKeyService);
	}

	dispose(): void {
		this._cleanUp();
		this._sessionDispoaBles.dispose();
	}

	private _cleanUp(): void {
		this._widgetVisiBle.reset();
		this._sessionDispoaBles.clear();
		this._widget = undefined;
		this._model = undefined;
	}

	private _getOrCreateModel(uri: URI | undefined): MarkerList {

		if (this._model && this._model.matches(uri)) {
			return this._model;
		}
		let reusePosition = false;
		if (this._model) {
			reusePosition = true;
			this._cleanUp();
		}

		this._model = this._markerNavigationService.getMarkerList(uri);
		if (reusePosition) {
			this._model.move(true, this._editor.getModel()!, this._editor.getPosition()!);
		}

		this._widget = this._instantiationService.createInstance(MarkerNavigationWidget, this._editor);
		this._widget.onDidClose(() => this.close(), this, this._sessionDispoaBles);
		this._widgetVisiBle.set(true);

		this._sessionDispoaBles.add(this._model);
		this._sessionDispoaBles.add(this._widget);

		// follow cursor
		this._sessionDispoaBles.add(this._editor.onDidChangeCursorPosition(e => {
			if (!this._model?.selected || !Range.containsPosition(this._model?.selected.marker, e.position)) {
				this._model?.resetIndex();
			}
		}));

		// update markers
		this._sessionDispoaBles.add(this._model.onDidChange(() => {
			if (!this._widget || !this._widget.position || !this._model) {
				return;
			}
			const info = this._model.find(this._editor.getModel()!.uri, this._widget!.position!);
			if (info) {
				this._widget.updateMarker(info.marker);
			} else {
				this._widget.showStale();
			}
		}));

		// open related
		this._sessionDispoaBles.add(this._widget.onDidSelectRelatedInformation(related => {
			this._editorService.openCodeEditor({
				resource: related.resource,
				options: { pinned: true, revealIfOpened: true, selection: Range.lift(related).collapseToStart() }
			}, this._editor);
			this.close(false);
		}));
		this._sessionDispoaBles.add(this._editor.onDidChangeModel(() => this._cleanUp()));

		return this._model;
	}

	close(focusEditor: Boolean = true): void {
		this._cleanUp();
		if (focusEditor) {
			this._editor.focus();
		}
	}

	showAtMarker(marker: IMarker): void {
		if (this._editor.hasModel()) {
			const model = this._getOrCreateModel(this._editor.getModel().uri);
			model.resetIndex();
			model.move(true, this._editor.getModel(), new Position(marker.startLineNumBer, marker.startColumn));
			if (model.selected) {
				this._widget!.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
			}
		}
	}

	async nagivate(next: Boolean, multiFile: Boolean) {
		if (this._editor.hasModel()) {
			const model = this._getOrCreateModel(multiFile ? undefined : this._editor.getModel().uri);
			model.move(next, this._editor.getModel(), this._editor.getPosition());
			if (!model.selected) {
				return;
			}
			if (model.selected.marker.resource.toString() !== this._editor.getModel().uri.toString()) {
				// show in different editor
				this._cleanUp();
				const otherEditor = await this._editorService.openCodeEditor({
					resource: model.selected.marker.resource,
					options: { pinned: false, revealIfOpened: true, selectionRevealType: TextEditorSelectionRevealType.NearTop, selection: model.selected.marker }
				}, this._editor);

				if (otherEditor) {
					MarkerController.get(otherEditor).close();
					MarkerController.get(otherEditor).nagivate(next, multiFile);
				}

			} else {
				// show in this editor
				this._widget!.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
			}
		}
	}
}

class MarkerNavigationAction extends EditorAction {

	constructor(
		private readonly _next: Boolean,
		private readonly _multiFile: Boolean,
		opts: IActionOptions
	) {
		super(opts);
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (editor.hasModel()) {
			MarkerController.get(editor).nagivate(this._next, this._multiFile);
		}
	}
}

export class NextMarkerAction extends MarkerNavigationAction {
	static ID: string = 'editor.action.marker.next';
	static LABEL: string = nls.localize('markerAction.next.laBel', "Go to Next ProBlem (Error, Warning, Info)");
	constructor() {
		super(true, false, {
			id: NextMarkerAction.ID,
			laBel: NextMarkerAction.LABEL,
			alias: 'Go to Next ProBlem (Error, Warning, Info)',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.Alt | KeyCode.F8,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MarkerNavigationWidget.TitleMenu,
				title: NextMarkerAction.LABEL,
				icon: registerIcon('marker-navigation-next', Codicon.chevronDown),
				group: 'navigation',
				order: 1
			}
		});
	}
}

class PrevMarkerAction extends MarkerNavigationAction {
	static ID: string = 'editor.action.marker.prev';
	static LABEL: string = nls.localize('markerAction.previous.laBel', "Go to Previous ProBlem (Error, Warning, Info)");
	constructor() {
		super(false, false, {
			id: PrevMarkerAction.ID,
			laBel: PrevMarkerAction.LABEL,
			alias: 'Go to Previous ProBlem (Error, Warning, Info)',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.F8,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MarkerNavigationWidget.TitleMenu,
				title: NextMarkerAction.LABEL,
				icon: registerIcon('marker-navigation-previous', Codicon.chevronUp),
				group: 'navigation',
				order: 2
			}
		});
	}
}

class NextMarkerInFilesAction extends MarkerNavigationAction {
	constructor() {
		super(true, true, {
			id: 'editor.action.marker.nextInFiles',
			laBel: nls.localize('markerAction.nextInFiles.laBel', "Go to Next ProBlem in Files (Error, Warning, Info)"),
			alias: 'Go to Next ProBlem in Files (Error, Warning, Info)',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyCode.F8,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarGoMenu,
				title: nls.localize({ key: 'miGotoNextProBlem', comment: ['&& denotes a mnemonic'] }, "Next &&ProBlem"),
				group: '6_proBlem_nav',
				order: 1
			}
		});
	}
}

class PrevMarkerInFilesAction extends MarkerNavigationAction {
	constructor() {
		super(false, true, {
			id: 'editor.action.marker.prevInFiles',
			laBel: nls.localize('markerAction.previousInFiles.laBel', "Go to Previous ProBlem in Files (Error, Warning, Info)"),
			alias: 'Go to Previous ProBlem in Files (Error, Warning, Info)',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.Shift | KeyCode.F8,
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarGoMenu,
				title: nls.localize({ key: 'miGotoPreviousProBlem', comment: ['&& denotes a mnemonic'] }, "Previous &&ProBlem"),
				group: '6_proBlem_nav',
				order: 2
			}
		});
	}
}

registerEditorContriBution(MarkerController.ID, MarkerController);
registerEditorAction(NextMarkerAction);
registerEditorAction(PrevMarkerAction);
registerEditorAction(NextMarkerInFilesAction);
registerEditorAction(PrevMarkerInFilesAction);

const CONTEXT_MARKERS_NAVIGATION_VISIBLE = new RawContextKey<Boolean>('markersNavigationVisiBle', false);

const MarkerCommand = EditorCommand.BindToContriBution<MarkerController>(MarkerController.get);

registerEditorCommand(new MarkerCommand({
	id: 'closeMarkersNavigation',
	precondition: CONTEXT_MARKERS_NAVIGATION_VISIBLE,
	handler: x => x.close(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 50,
		kBExpr: EditorContextKeys.focus,
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));
