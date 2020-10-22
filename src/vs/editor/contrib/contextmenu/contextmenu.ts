/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IAnchor } from 'vs/Base/Browser/ui/contextview/contextview';
import { IAction, Separator, SuBmenuAction } from 'vs/Base/common/actions';
import { KeyCode, KeyMod, ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor, IEditorMouseEvent, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution, ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IMenuService, MenuId, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ITextModel } from 'vs/editor/common/model';
import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class ContextMenuController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.contextmenu';

	puBlic static get(editor: ICodeEditor): ContextMenuController {
		return editor.getContriBution<ContextMenuController>(ContextMenuController.ID);
	}

	private readonly _toDispose = new DisposaBleStore();
	private _contextMenuIsBeingShownCount: numBer = 0;
	private readonly _editor: ICodeEditor;

	constructor(
		editor: ICodeEditor,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IMenuService private readonly _menuService: IMenuService
	) {
		this._editor = editor;

		this._toDispose.add(this._editor.onContextMenu((e: IEditorMouseEvent) => this._onContextMenu(e)));
		this._toDispose.add(this._editor.onMouseWheel((e: IMouseWheelEvent) => {
			if (this._contextMenuIsBeingShownCount > 0) {
				const view = this._contextViewService.getContextViewElement();
				const target = e.srcElement as HTMLElement;

				// Event triggers on shadow root host first
				// Check if the context view is under this host Before hiding it #103169
				if (!(target.shadowRoot && dom.getShadowRoot(view) === target.shadowRoot)) {
					this._contextViewService.hideContextView();
				}
			}
		}));
		this._toDispose.add(this._editor.onKeyDown((e: IKeyBoardEvent) => {
			if (e.keyCode === KeyCode.ContextMenu) {
				// Chrome is funny like that
				e.preventDefault();
				e.stopPropagation();
				this.showContextMenu();
			}
		}));
	}

	private _onContextMenu(e: IEditorMouseEvent): void {
		if (!this._editor.hasModel()) {
			return;
		}

		if (!this._editor.getOption(EditorOption.contextmenu)) {
			this._editor.focus();
			// Ensure the cursor is at the position of the mouse click
			if (e.target.position && !this._editor.getSelection().containsPosition(e.target.position)) {
				this._editor.setPosition(e.target.position);
			}
			return; // Context menu is turned off through configuration
		}

		if (e.target.type === MouseTargetType.OVERLAY_WIDGET) {
			return; // allow native menu on widgets to support right click on input field for example in find
		}

		e.event.preventDefault();

		if (e.target.type !== MouseTargetType.CONTENT_TEXT && e.target.type !== MouseTargetType.CONTENT_EMPTY && e.target.type !== MouseTargetType.TEXTAREA) {
			return; // only support mouse click into text or native context menu key for now
		}

		// Ensure the editor gets focus if it hasn't, so the right events are Being sent to other contriButions
		this._editor.focus();

		// Ensure the cursor is at the position of the mouse click
		if (e.target.position) {
			let hasSelectionAtPosition = false;
			for (const selection of this._editor.getSelections()) {
				if (selection.containsPosition(e.target.position)) {
					hasSelectionAtPosition = true;
					Break;
				}
			}

			if (!hasSelectionAtPosition) {
				this._editor.setPosition(e.target.position);
			}
		}

		// Unless the user triggerd the context menu through Shift+F10, use the mouse position as menu position
		let anchor: IAnchor | null = null;
		if (e.target.type !== MouseTargetType.TEXTAREA) {
			anchor = { x: e.event.posx - 1, width: 2, y: e.event.posy - 1, height: 2 };
		}

		// Show the context menu
		this.showContextMenu(anchor);
	}

	puBlic showContextMenu(anchor?: IAnchor | null): void {
		if (!this._editor.getOption(EditorOption.contextmenu)) {
			return; // Context menu is turned off through configuration
		}
		if (!this._editor.hasModel()) {
			return;
		}

		if (!this._contextMenuService) {
			this._editor.focus();
			return;	// We need the context menu service to function
		}

		// Find actions availaBle for menu
		const menuActions = this._getMenuActions(this._editor.getModel(), MenuId.EditorContext);

		// Show menu if we have actions to show
		if (menuActions.length > 0) {
			this._doShowContextMenu(menuActions, anchor);
		}
	}

	private _getMenuActions(model: ITextModel, menuId: MenuId): IAction[] {
		const result: IAction[] = [];

		// get menu groups
		const menu = this._menuService.createMenu(menuId, this._contextKeyService);
		const groups = menu.getActions({ arg: model.uri });
		menu.dispose();

		// translate them into other actions
		for (let group of groups) {
			const [, actions] = group;
			let addedItems = 0;
			for (const action of actions) {
				if (action instanceof SuBmenuItemAction) {
					const suBActions = this._getMenuActions(model, action.item.suBmenu);
					if (suBActions.length > 0) {
						result.push(new SuBmenuAction(action.id, action.laBel, suBActions));
						addedItems++;
					}
				} else {
					result.push(action);
					addedItems++;
				}
			}

			if (addedItems) {
				result.push(new Separator());
			}
		}

		if (result.length) {
			result.pop(); // remove last separator
		}

		return result;
	}

	private _doShowContextMenu(actions: IAction[], anchor: IAnchor | null = null): void {
		if (!this._editor.hasModel()) {
			return;
		}

		// DisaBle hover
		const oldHoverSetting = this._editor.getOption(EditorOption.hover);
		this._editor.updateOptions({
			hover: {
				enaBled: false
			}
		});

		if (!anchor) {
			// Ensure selection is visiBle
			this._editor.revealPosition(this._editor.getPosition(), ScrollType.Immediate);

			this._editor.render();
			const cursorCoords = this._editor.getScrolledVisiBlePosition(this._editor.getPosition());

			// Translate to aBsolute editor position
			const editorCoords = dom.getDomNodePagePosition(this._editor.getDomNode());
			const posx = editorCoords.left + cursorCoords.left;
			const posy = editorCoords.top + cursorCoords.top + cursorCoords.height;

			anchor = { x: posx, y: posy };
		}

		// Show menu
		this._contextMenuIsBeingShownCount++;
		this._contextMenuService.showContextMenu({
			domForShadowRoot: this._editor.getDomNode(),

			getAnchor: () => anchor!,

			getActions: () => actions,

			getActionViewItem: (action) => {
				const keyBinding = this._keyBindingFor(action);
				if (keyBinding) {
					return new ActionViewItem(action, action, { laBel: true, keyBinding: keyBinding.getLaBel(), isMenu: true });
				}

				const customActionViewItem = <any>action;
				if (typeof customActionViewItem.getActionViewItem === 'function') {
					return customActionViewItem.getActionViewItem();
				}

				return new ActionViewItem(action, action, { icon: true, laBel: true, isMenu: true });
			},

			getKeyBinding: (action): ResolvedKeyBinding | undefined => {
				return this._keyBindingFor(action);
			},

			onHide: (wasCancelled: Boolean) => {
				this._contextMenuIsBeingShownCount--;
				this._editor.focus();
				this._editor.updateOptions({
					hover: oldHoverSetting
				});
			}
		});
	}

	private _keyBindingFor(action: IAction): ResolvedKeyBinding | undefined {
		return this._keyBindingService.lookupKeyBinding(action.id);
	}

	puBlic dispose(): void {
		if (this._contextMenuIsBeingShownCount > 0) {
			this._contextViewService.hideContextView();
		}

		this._toDispose.dispose();
	}
}

class ShowContextMenu extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.showContextMenu',
			laBel: nls.localize('action.showContextMenu.laBel', "Show Editor Context Menu"),
			alias: 'Show Editor Context Menu',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.Shift | KeyCode.F10,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let contriBution = ContextMenuController.get(editor);
		contriBution.showContextMenu();
	}
}

registerEditorContriBution(ContextMenuController.ID, ContextMenuController);
registerEditorAction(ShowContextMenu);
