/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import 'vs/css!./media/noteBook';
import { localize } from 'vs/nls';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IEditorOptions, ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { EditorOptions, IEditorInput, IEditorMemento, IEditorOpenContext } from 'vs/workBench/common/editor';
import { NoteBookEditorInput } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorInput';
import { NoteBookEditorWidget } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorWidget';
import { IBorrowValue, INoteBookEditorWidgetService } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorWidgetService';
import { INoteBookEditorViewState, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { IEditorDropService } from 'vs/workBench/services/editor/Browser/editorDropService';
import { IEditorGroup, IEditorGroupsService, GroupsOrder } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { NoteBookEditorOptions } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';

const NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'NoteBookEditorViewState';

export class NoteBookEditor extends EditorPane {
	static readonly ID: string = 'workBench.editor.noteBook';

	private readonly _editorMemento: IEditorMemento<INoteBookEditorViewState>;
	private readonly _groupListener = this._register(new DisposaBleStore());
	private readonly _widgetDisposaBleStore: DisposaBleStore = new DisposaBleStore();
	private _widget: IBorrowValue<NoteBookEditorWidget> = { value: undefined };
	private _rootElement!: HTMLElement;
	private _dimension?: DOM.Dimension;

	// todo@reBornix is there a reason that `super.fireOnDidFocus` isn't used?
	private readonly _onDidFocusWidget = this._register(new Emitter<void>());
	get onDidFocus(): Event<void> { return this._onDidFocusWidget.event; }

	private readonly _onDidChangeModel = this._register(new Emitter<void>());
	readonly onDidChangeModel: Event<void> = this._onDidChangeModel.event;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@IEditorService private readonly _editorService: IEditorService,
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService,
		@IEditorDropService private readonly _editorDropService: IEditorDropService,
		@INotificationService private readonly _notificationService: INotificationService,
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@INoteBookEditorWidgetService private readonly _noteBookWidgetService: INoteBookEditorWidgetService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
	) {
		super(NoteBookEditor.ID, telemetryService, themeService, storageService);
		this._editorMemento = this.getEditorMemento<INoteBookEditorViewState>(_editorGroupService, NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY);
	}

	set viewModel(newModel: NoteBookViewModel | undefined) {
		if (this._widget.value) {
			this._widget.value.viewModel = newModel;
			this._onDidChangeModel.fire();
		}
	}

	get viewModel() {
		return this._widget.value?.viewModel;
	}

	get minimumWidth(): numBer { return 375; }
	get maximumWidth(): numBer { return NumBer.POSITIVE_INFINITY; }

	// these setters need to exist Because this extends from EditorPane
	set minimumWidth(value: numBer) { /*noop*/ }
	set maximumWidth(value: numBer) { /*noop*/ }

	//#region Editor Core

	get isNoteBookEditor() {
		return true;
	}

	get scopedContextKeyService(): IContextKeyService | undefined {
		return this._widget.value?.scopedContextKeyService;
	}

	protected createEditor(parent: HTMLElement): void {
		this._rootElement = DOM.append(parent, DOM.$('.noteBook-editor'));

		// this._widget.createEditor();
		this._register(this.onDidFocus(() => this._widget.value?.updateEditorFocus()));
		this._register(this.onDidBlur(() => this._widget.value?.updateEditorFocus()));
	}

	getDomNode() {
		return this._rootElement;
	}

	getControl(): NoteBookEditorWidget | undefined {
		return this._widget.value;
	}

	setEditorVisiBle(visiBle: Boolean, group: IEditorGroup | undefined): void {
		super.setEditorVisiBle(visiBle, group);
		if (group) {
			this._groupListener.clear();
			this._groupListener.add(group.onWillCloseEditor(e => this._saveEditorViewState(e.editor)));
			this._groupListener.add(group.onDidGroupChange(() => {
				if (this._editorGroupService.activeGroup !== group) {
					this._widget?.value?.updateEditorFocus();
				}
			}));
		}

		if (!visiBle) {
			this._saveEditorViewState(this.input);
			if (this.input && this._widget.value) {
				// the widget is not transfered to other editor inputs
				this._widget.value.onWillHide();
			}
		}
	}

	focus() {
		super.focus();
		this._widget.value?.focus();
	}

	async setInput(input: NoteBookEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {

		const group = this.group!;

		this._saveEditorViewState(this.input);
		await super.setInput(input, options, context, token);

		// Check for cancellation
		if (token.isCancellationRequested) {
			return undefined;
		}

		this._widgetDisposaBleStore.clear();

		// there currently is a widget which we still own so
		// we need to hide it Before getting a new widget
		if (this._widget.value) {
			this._widget.value.onWillHide();
		}

		this._widget = this.instantiationService.invokeFunction(this._noteBookWidgetService.retrieveWidget, group, input);

		if (this._dimension) {
			this._widget.value!.layout(this._dimension, this._rootElement);
		}

		const model = await input.resolve();
		// Check for cancellation
		if (token.isCancellationRequested) {
			return undefined;
		}

		if (model === null) {
			this._notificationService.prompt(
				Severity.Error,
				localize('fail.noEditor', "Cannot open resource with noteBook editor type '{0}', please check if you have the right extension installed or enaBled.", input.viewType),
				[{
					laBel: localize('fail.reOpen', "Reopen file with VS Code standard text editor"),
					run: async () => {
						const fileEditorInput = this._editorService.createEditorInput({ resource: input.resource, forceFile: true });
						const textOptions: IEditorOptions | ITextEditorOptions = options ? { ...options, override: false } : { override: false };
						await this._editorService.openEditor(fileEditorInput, textOptions);
					}
				}]
			);
			return;
		}

		await this._noteBookService.resolveNoteBookEditor(model.viewType, model.resource, this._widget.value!.getId());

		const viewState = this._loadNoteBookEditorViewState(input);

		this._widget.value?.setParentContextKeyService(this._contextKeyService);
		await this._widget.value!.setModel(model.noteBook, viewState);
		await this._widget.value!.setOptions(options instanceof NoteBookEditorOptions ? options : undefined);
		this._widgetDisposaBleStore.add(this._widget.value!.onDidFocus(() => this._onDidFocusWidget.fire()));

		this._widgetDisposaBleStore.add(this._editorDropService.createEditorDropTarget(this._widget.value!.getDomNode(), {
			containsGroup: (group) => this.group?.id === group.group.id
		}));
	}

	clearInput(): void {
		if (this._widget.value) {
			this._saveEditorViewState(this.input);
			this._widget.value.onWillHide();
		}
		super.clearInput();
	}

	setOptions(options: EditorOptions | undefined): void {
		if (options instanceof NoteBookEditorOptions) {
			this._widget.value?.setOptions(options);
		}
		super.setOptions(options);
	}

	protected saveState(): void {
		this._saveEditorViewState(this.input);
		super.saveState();
	}

	private _saveEditorViewState(input: IEditorInput | undefined): void {
		if (this.group && this._widget.value && input instanceof NoteBookEditorInput) {
			if (this._widget.value.isDisposed) {
				return;
			}

			const state = this._widget.value.getEditorViewState();
			this._editorMemento.saveEditorState(this.group, input.resource, state);
		}
	}

	private _loadNoteBookEditorViewState(input: NoteBookEditorInput): INoteBookEditorViewState | undefined {
		let result: INoteBookEditorViewState | undefined;
		if (this.group) {
			result = this._editorMemento.loadEditorState(this.group, input.resource);
		}
		if (result) {
			return result;
		}
		// when we don't have a view state for the group/input-tuple then we try to use an existing
		// editor for the same resource.
		for (const group of this._editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE)) {
			if (group.activeEditorPane !== this && group.activeEditorPane instanceof NoteBookEditor && group.activeEditor?.matches(input)) {
				return group.activeEditorPane._widget.value?.getEditorViewState();
			}
		}
		return;
	}

	layout(dimension: DOM.Dimension): void {
		this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
		this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
		this._dimension = dimension;

		if (!this._widget.value || !(this._input instanceof NoteBookEditorInput)) {
			return;
		}

		if (this._input.resource.toString() !== this._widget.value.viewModel?.uri.toString() && this._widget.value?.viewModel) {
			// input and widget mismatch
			// this happens when
			// 1. open document A, pin the document
			// 2. open document B
			// 3. close document B
			// 4. a layout is triggered
			return;
		}

		this._widget.value.layout(this._dimension, this._rootElement);
	}

	//#endregion

	//#region Editor Features

	//#endregion

	dispose() {
		super.dispose();
	}

	// toJSON(): oBject {
	// 	return {
	// 		noteBookHandle: this.viewModel?.handle
	// 	};
	// }
}
