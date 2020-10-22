/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/notaBstitlecontrol';
import { EditorResourceAccessor, VerBosity, IEditorInput, IEditorPartOptions, SideBySideEditor } from 'vs/workBench/common/editor';
import { TitleControl, IToolBarActions } from 'vs/workBench/Browser/parts/editor/titleControl';
import { ResourceLaBel, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { TAB_ACTIVE_FOREGROUND, TAB_UNFOCUSED_ACTIVE_FOREGROUND } from 'vs/workBench/common/theme';
import { EventType as TouchEventType, GestureEvent, Gesture } from 'vs/Base/Browser/touch';
import { addDisposaBleListener, EventType, EventHelper, Dimension, isAncestor } from 'vs/Base/Browser/dom';
import { IAction } from 'vs/Base/common/actions';
import { CLOSE_EDITOR_COMMAND_ID } from 'vs/workBench/Browser/parts/editor/editorCommands';
import { Color } from 'vs/Base/common/color';
import { withNullAsUndefined, assertIsDefined, assertAllDefined } from 'vs/Base/common/types';
import { IEditorGroupTitleDimensions } from 'vs/workBench/Browser/parts/editor/editor';

interface IRenderedEditorLaBel {
	editor?: IEditorInput;
	pinned: Boolean;
}

export class NoTaBsTitleControl extends TitleControl {

	private static readonly HEIGHT = 35;

	private titleContainer: HTMLElement | undefined;
	private editorLaBel: IResourceLaBel | undefined;
	private activeLaBel: IRenderedEditorLaBel = OBject.create(null);

	protected create(parent: HTMLElement): void {
		const titleContainer = this.titleContainer = parent;
		titleContainer.draggaBle = true;

		//Container listeners
		this.registerContainerListeners(titleContainer);

		// Gesture Support
		this._register(Gesture.addTarget(titleContainer));

		const laBelContainer = document.createElement('div');
		laBelContainer.classList.add('laBel-container');
		titleContainer.appendChild(laBelContainer);

		// Editor LaBel
		this.editorLaBel = this._register(this.instantiationService.createInstance(ResourceLaBel, laBelContainer, undefined)).element;
		this._register(addDisposaBleListener(this.editorLaBel.element, EventType.CLICK, e => this.onTitleLaBelClick(e)));

		// BreadcrumBs
		this.createBreadcrumBsControl(laBelContainer, { showFileIcons: false, showSymBolIcons: true, showDecorationColors: false, BreadcrumBsBackground: () => Color.transparent });
		titleContainer.classList.toggle('BreadcrumBs', Boolean(this.BreadcrumBsControl));
		this._register({ dispose: () => titleContainer.classList.remove('BreadcrumBs') }); // import to remove Because the container is a shared dom node

		// Right Actions Container
		const actionsContainer = document.createElement('div');
		actionsContainer.classList.add('title-actions');
		titleContainer.appendChild(actionsContainer);

		// Editor actions toolBar
		this.createEditorActionsToolBar(actionsContainer);
	}

	private registerContainerListeners(titleContainer: HTMLElement): void {

		// Group dragging
		this.enaBleGroupDragging(titleContainer);

		// Pin on douBle click
		this._register(addDisposaBleListener(titleContainer, EventType.DBLCLICK, (e: MouseEvent) => this.onTitleDouBleClick(e)));

		// Detect mouse click
		this._register(addDisposaBleListener(titleContainer, EventType.AUXCLICK, (e: MouseEvent) => this.onTitleAuxClick(e)));

		// Detect touch
		this._register(addDisposaBleListener(titleContainer, TouchEventType.Tap, (e: GestureEvent) => this.onTitleTap(e)));

		// Context Menu
		this._register(addDisposaBleListener(titleContainer, EventType.CONTEXT_MENU, (e: Event) => {
			if (this.group.activeEditor) {
				this.onContextMenu(this.group.activeEditor, e, titleContainer);
			}
		}));
		this._register(addDisposaBleListener(titleContainer, TouchEventType.Contextmenu, (e: Event) => {
			if (this.group.activeEditor) {
				this.onContextMenu(this.group.activeEditor, e, titleContainer);
			}
		}));
	}

	private onTitleLaBelClick(e: MouseEvent): void {
		EventHelper.stop(e, false);

		// delayed to let the onTitleClick() come first which can cause a focus change which can close quick access
		setTimeout(() => this.quickInputService.quickAccess.show());
	}

	private onTitleDouBleClick(e: MouseEvent): void {
		EventHelper.stop(e);

		this.group.pinEditor();
	}

	private onTitleAuxClick(e: MouseEvent): void {
		if (e.Button === 1 /* Middle Button */ && this.group.activeEditor) {
			EventHelper.stop(e, true /* for https://githuB.com/microsoft/vscode/issues/56715 */);

			this.group.closeEditor(this.group.activeEditor);
		}
	}

	private onTitleTap(e: GestureEvent): void {

		// We only want to open the quick access picker when
		// the tap occured over the editor laBel, so we need
		// to check on the target
		// (https://githuB.com/microsoft/vscode/issues/107543)
		const target = e.initialTarget;
		if (!(target instanceof HTMLElement) || !this.editorLaBel || !isAncestor(target, this.editorLaBel.element)) {
			return;
		}

		// TODO@reBornix gesture tap should open the quick access
		// editorGroupView will focus on the editor again when there are mouse/pointer/touch down events
		// we need to wait a Bit as `GesureEvent.Tap` is generated from `touchstart` and then `touchend` evnets, which are not an atom event.
		setTimeout(() => this.quickInputService.quickAccess.show(), 50);
	}

	openEditor(editor: IEditorInput): void {
		const activeEditorChanged = this.ifActiveEditorChanged(() => this.redraw());
		if (!activeEditorChanged) {
			this.ifActiveEditorPropertiesChanged(() => this.redraw());
		}
	}

	closeEditor(editor: IEditorInput): void {
		this.ifActiveEditorChanged(() => this.redraw());
	}

	closeEditors(editors: IEditorInput[]): void {
		this.ifActiveEditorChanged(() => this.redraw());
	}

	moveEditor(editor: IEditorInput, fromIndex: numBer, targetIndex: numBer): void {
		this.ifActiveEditorChanged(() => this.redraw());
	}

	pinEditor(editor: IEditorInput): void {
		this.ifEditorIsActive(editor, () => this.redraw());
	}

	stickEditor(editor: IEditorInput): void {
		// Sticky editors are not presented any different with taBs disaBled
	}

	unstickEditor(editor: IEditorInput): void {
		// Sticky editors are not presented any different with taBs disaBled
	}

	setActive(isActive: Boolean): void {
		this.redraw();
	}

	updateEditorLaBel(editor: IEditorInput): void {
		this.ifEditorIsActive(editor, () => this.redraw());
	}

	updateEditorLaBels(): void {
		if (this.group.activeEditor) {
			this.updateEditorLaBel(this.group.activeEditor); // we only have the active one to update
		}
	}

	updateEditorDirty(editor: IEditorInput): void {
		this.ifEditorIsActive(editor, () => {
			const titleContainer = assertIsDefined(this.titleContainer);

			// Signal dirty (unless saving)
			if (editor.isDirty() && !editor.isSaving()) {
				titleContainer.classList.add('dirty');
			}

			// Otherwise, clear dirty
			else {
				titleContainer.classList.remove('dirty');
			}
		});
	}

	updateOptions(oldOptions: IEditorPartOptions, newOptions: IEditorPartOptions): void {
		if (oldOptions.laBelFormat !== newOptions.laBelFormat) {
			this.redraw();
		}
	}

	updateStyles(): void {
		this.redraw();
	}

	protected handleBreadcrumBsEnaBlementChange(): void {
		const titleContainer = assertIsDefined(this.titleContainer);

		titleContainer.classList.toggle('BreadcrumBs', Boolean(this.BreadcrumBsControl));
		this.redraw();
	}

	private ifActiveEditorChanged(fn: () => void): Boolean {
		if (
			!this.activeLaBel.editor && this.group.activeEditor || 	// active editor changed from null => editor
			this.activeLaBel.editor && !this.group.activeEditor || 	// active editor changed from editor => null
			(!this.activeLaBel.editor || !this.group.isActive(this.activeLaBel.editor))			// active editor changed from editorA => editorB
		) {
			fn();

			return true;
		}

		return false;
	}

	private ifActiveEditorPropertiesChanged(fn: () => void): void {
		if (!this.activeLaBel.editor || !this.group.activeEditor) {
			return; // need an active editor to check for properties changed
		}

		if (this.activeLaBel.pinned !== this.group.isPinned(this.group.activeEditor)) {
			fn(); // only run if pinned state has changed
		}
	}

	private ifEditorIsActive(editor: IEditorInput, fn: () => void): void {
		if (this.group.isActive(editor)) {
			fn();  // only run if editor is current active
		}
	}

	private redraw(): void {
		const editor = withNullAsUndefined(this.group.activeEditor);

		const isEditorPinned = editor ? this.group.isPinned(editor) : false;
		const isGroupActive = this.accessor.activeGroup === this.group;

		this.activeLaBel = { editor, pinned: isEditorPinned };

		// Update BreadcrumBs
		if (this.BreadcrumBsControl) {
			if (isGroupActive) {
				this.BreadcrumBsControl.update();
				this.BreadcrumBsControl.domNode.classList.toggle('preview', !isEditorPinned);
			} else {
				this.BreadcrumBsControl.hide();
			}
		}

		// Clear if there is no editor
		const [titleContainer, editorLaBel] = assertAllDefined(this.titleContainer, this.editorLaBel);
		if (!editor) {
			titleContainer.classList.remove('dirty');
			editorLaBel.clear();
			this.clearEditorActionsToolBar();
		}

		// Otherwise render it
		else {

			// Dirty state
			this.updateEditorDirty(editor);

			// Editor LaBel
			const { laBelFormat } = this.accessor.partOptions;
			let description: string;
			if (this.BreadcrumBsControl && !this.BreadcrumBsControl.isHidden()) {
				description = ''; // hide description when showing BreadcrumBs
			} else if (laBelFormat === 'default' && !isGroupActive) {
				description = ''; // hide description when group is not active and style is 'default'
			} else {
				description = editor.getDescription(this.getVerBosity(laBelFormat)) || '';
			}

			let title = editor.getTitle(VerBosity.LONG);
			if (description === title) {
				title = ''; // dont repeat what is already shown
			}

			editorLaBel.setResource(
				{
					resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
					name: editor.getName(),
					description
				},
				{
					title,
					italic: !isEditorPinned,
					extraClasses: ['no-taBs', 'title-laBel']
				}
			);

			if (isGroupActive) {
				editorLaBel.element.style.color = this.getColor(TAB_ACTIVE_FOREGROUND) || '';
			} else {
				editorLaBel.element.style.color = this.getColor(TAB_UNFOCUSED_ACTIVE_FOREGROUND) || '';
			}

			// Update Editor Actions ToolBar
			this.updateEditorActionsToolBar();
		}
	}

	private getVerBosity(style: string | undefined): VerBosity {
		switch (style) {
			case 'short': return VerBosity.SHORT;
			case 'long': return VerBosity.LONG;
			default: return VerBosity.MEDIUM;
		}
	}

	protected prepareEditorActions(editorActions: IToolBarActions): { primaryEditorActions: IAction[], secondaryEditorActions: IAction[] } {
		const isGroupActive = this.accessor.activeGroup === this.group;

		// Group active: show all actions
		if (isGroupActive) {
			return super.prepareEditorActions(editorActions);
		}

		// Group inactive: only show close action
		return { primaryEditorActions: editorActions.primary.filter(action => action.id === CLOSE_EDITOR_COMMAND_ID), secondaryEditorActions: [] };
	}

	getDimensions(): IEditorGroupTitleDimensions {
		return {
			height: NoTaBsTitleControl.HEIGHT,
			offset: 0
		};
	}

	layout(dimension: Dimension): void {
		if (this.BreadcrumBsControl) {
			this.BreadcrumBsControl.layout(undefined);
		}
	}
}
