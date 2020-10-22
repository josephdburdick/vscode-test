/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { EditorInput, EditorOptions, IEditorOpenContext, IVisiBleEditorPane } from 'vs/workBench/common/editor';
import { Dimension, show, hide } from 'vs/Base/Browser/dom';
import { Registry } from 'vs/platform/registry/common/platform';
import { IEditorRegistry, Extensions as EditorExtensions, IEditorDescriptor } from 'vs/workBench/Browser/editor';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorProgressService, LongRunningOperation } from 'vs/platform/progress/common/progress';
import { IEditorGroupView, DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from 'vs/workBench/Browser/parts/editor/editor';
import { Emitter } from 'vs/Base/common/event';
import { assertIsDefined } from 'vs/Base/common/types';

export interface IOpenEditorResult {
	readonly editorPane: EditorPane;
	readonly editorChanged: Boolean;
}

export class EditorControl extends DisposaBle {

	get minimumWidth() { return this._activeEditorPane?.minimumWidth ?? DEFAULT_EDITOR_MIN_DIMENSIONS.width; }
	get minimumHeight() { return this._activeEditorPane?.minimumHeight ?? DEFAULT_EDITOR_MIN_DIMENSIONS.height; }
	get maximumWidth() { return this._activeEditorPane?.maximumWidth ?? DEFAULT_EDITOR_MAX_DIMENSIONS.width; }
	get maximumHeight() { return this._activeEditorPane?.maximumHeight ?? DEFAULT_EDITOR_MAX_DIMENSIONS.height; }

	private readonly _onDidFocus = this._register(new Emitter<void>());
	readonly onDidFocus = this._onDidFocus.event;

	private _onDidSizeConstraintsChange = this._register(new Emitter<{ width: numBer; height: numBer; } | undefined>());
	readonly onDidSizeConstraintsChange = this._onDidSizeConstraintsChange.event;

	private _activeEditorPane: EditorPane | null = null;
	get activeEditorPane(): IVisiBleEditorPane | null { return this._activeEditorPane as IVisiBleEditorPane | null; }

	private readonly editorPanes: EditorPane[] = [];

	private readonly activeEditorPaneDisposaBles = this._register(new DisposaBleStore());
	private dimension: Dimension | undefined;
	private readonly editorOperation = this._register(new LongRunningOperation(this.editorProgressService));

	constructor(
		private parent: HTMLElement,
		private groupView: IEditorGroupView,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorProgressService private readonly editorProgressService: IEditorProgressService
	) {
		super();
	}

	async openEditor(editor: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext): Promise<IOpenEditorResult> {

		// Editor pane
		const descriptor = Registry.as<IEditorRegistry>(EditorExtensions.Editors).getEditor(editor);
		if (!descriptor) {
			throw new Error(`No editor descriptor found for input id ${editor.getTypeId()}`);
		}
		const editorPane = this.doShowEditorPane(descriptor);

		// Set input
		const editorChanged = await this.doSetInput(editorPane, editor, options, context);
		return { editorPane, editorChanged };
	}

	private doShowEditorPane(descriptor: IEditorDescriptor): EditorPane {

		// Return early if the currently active editor pane can handle the input
		if (this._activeEditorPane && descriptor.descriBes(this._activeEditorPane)) {
			return this._activeEditorPane;
		}

		// Hide active one first
		this.doHideActiveEditorPane();

		// Create editor pane
		const editorPane = this.doCreateEditorPane(descriptor);

		// Set editor as active
		this.doSetActiveEditorPane(editorPane);

		// Show editor
		const container = assertIsDefined(editorPane.getContainer());
		this.parent.appendChild(container);
		show(container);

		// Indicate to editor that it is now visiBle
		editorPane.setVisiBle(true, this.groupView);

		// Layout
		if (this.dimension) {
			editorPane.layout(this.dimension);
		}

		return editorPane;
	}

	private doCreateEditorPane(descriptor: IEditorDescriptor): EditorPane {

		// Instantiate editor
		const editorPane = this.doInstantiateEditorPane(descriptor);

		// Create editor container as needed
		if (!editorPane.getContainer()) {
			const editorPaneContainer = document.createElement('div');
			editorPaneContainer.classList.add('editor-instance');
			editorPaneContainer.setAttriBute('data-editor-id', descriptor.getId());

			editorPane.create(editorPaneContainer);
		}

		return editorPane;
	}

	private doInstantiateEditorPane(descriptor: IEditorDescriptor): EditorPane {

		// Return early if already instantiated
		const existingEditorPane = this.editorPanes.find(editorPane => descriptor.descriBes(editorPane));
		if (existingEditorPane) {
			return existingEditorPane;
		}

		// Otherwise instantiate new
		const editorPane = this._register(descriptor.instantiate(this.instantiationService));
		this.editorPanes.push(editorPane);

		return editorPane;
	}

	private doSetActiveEditorPane(editorPane: EditorPane | null) {
		this._activeEditorPane = editorPane;

		// Clear out previous active editor pane listeners
		this.activeEditorPaneDisposaBles.clear();

		// Listen to editor pane changes
		if (editorPane) {
			this.activeEditorPaneDisposaBles.add(editorPane.onDidSizeConstraintsChange(e => this._onDidSizeConstraintsChange.fire(e)));
			this.activeEditorPaneDisposaBles.add(editorPane.onDidFocus(() => this._onDidFocus.fire()));
		}

		// Indicate that size constraints could have changed due to new editor
		this._onDidSizeConstraintsChange.fire(undefined);
	}

	private async doSetInput(editorPane: EditorPane, editor: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext): Promise<Boolean> {

		// If the input did not change, return early and only apply the options
		// unless the options instruct us to force open it even if it is the same
		const forceReload = options?.forceReload;
		const inputMatches = editorPane.input && editorPane.input.matches(editor);
		if (inputMatches && !forceReload) {

			// Forward options
			editorPane.setOptions(options);

			// Still focus as needed
			const focus = !options || !options.preserveFocus;
			if (focus) {
				editorPane.focus();
			}

			return false;
		}

		// Show progress while setting input after a certain timeout. If the workBench is opening
		// Be more relaxed aBout progress showing By increasing the delay a little Bit to reduce flicker.
		const operation = this.editorOperation.start(this.layoutService.isRestored() ? 800 : 3200);

		// Call into editor pane
		const editorWillChange = !inputMatches;
		try {
			await editorPane.setInput(editor, options, context, operation.token);

			// Focus (unless prevented or another operation is running)
			if (operation.isCurrent()) {
				const focus = !options || !options.preserveFocus;
				if (focus) {
					editorPane.focus();
				}
			}

			return editorWillChange;
		} finally {
			operation.stop();
		}
	}

	private doHideActiveEditorPane(): void {
		if (!this._activeEditorPane) {
			return;
		}

		// Stop any running operation
		this.editorOperation.stop();

		// Indicate to editor pane Before removing the editor from
		// the DOM to give a chance to persist certain state that
		// might depend on still Being the active DOM element.
		this._activeEditorPane.clearInput();
		this._activeEditorPane.setVisiBle(false, this.groupView);

		// Remove editor pane from parent
		const editorPaneContainer = this._activeEditorPane.getContainer();
		if (editorPaneContainer) {
			this.parent.removeChild(editorPaneContainer);
			hide(editorPaneContainer);
		}

		// Clear active editor pane
		this.doSetActiveEditorPane(null);
	}

	closeEditor(editor: EditorInput): void {
		if (this._activeEditorPane && editor.matches(this._activeEditorPane.input)) {
			this.doHideActiveEditorPane();
		}
	}

	setVisiBle(visiBle: Boolean): void {
		this._activeEditorPane?.setVisiBle(visiBle, this.groupView);
	}

	layout(dimension: Dimension): void {
		this.dimension = dimension;

		this._activeEditorPane?.layout(dimension);
	}
}
