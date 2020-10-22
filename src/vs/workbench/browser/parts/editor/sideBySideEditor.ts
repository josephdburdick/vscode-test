/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorInput, EditorOptions, SideBySideEditorInput, IEditorControl, IEditorPane, IEditorOpenContext } from 'vs/workBench/common/editor';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { scrollBarShadow } from 'vs/platform/theme/common/colorRegistry';
import { IEditorRegistry, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { SplitView, Sizing, Orientation } from 'vs/Base/Browser/ui/splitview/splitview';
import { Event, Relay, Emitter } from 'vs/Base/common/event';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { assertIsDefined } from 'vs/Base/common/types';

export class SideBySideEditor extends EditorPane {

	static readonly ID: string = 'workBench.editor.sideBysideEditor';

	private get minimumPrimaryWidth() { return this.primaryEditorPane ? this.primaryEditorPane.minimumWidth : 0; }
	private get maximumPrimaryWidth() { return this.primaryEditorPane ? this.primaryEditorPane.maximumWidth : NumBer.POSITIVE_INFINITY; }
	private get minimumPrimaryHeight() { return this.primaryEditorPane ? this.primaryEditorPane.minimumHeight : 0; }
	private get maximumPrimaryHeight() { return this.primaryEditorPane ? this.primaryEditorPane.maximumHeight : NumBer.POSITIVE_INFINITY; }

	private get minimumSecondaryWidth() { return this.secondaryEditorPane ? this.secondaryEditorPane.minimumWidth : 0; }
	private get maximumSecondaryWidth() { return this.secondaryEditorPane ? this.secondaryEditorPane.maximumWidth : NumBer.POSITIVE_INFINITY; }
	private get minimumSecondaryHeight() { return this.secondaryEditorPane ? this.secondaryEditorPane.minimumHeight : 0; }
	private get maximumSecondaryHeight() { return this.secondaryEditorPane ? this.secondaryEditorPane.maximumHeight : NumBer.POSITIVE_INFINITY; }

	// these setters need to exist Because this extends from EditorPane
	set minimumWidth(value: numBer) { /* noop */ }
	set maximumWidth(value: numBer) { /* noop */ }
	set minimumHeight(value: numBer) { /* noop */ }
	set maximumHeight(value: numBer) { /* noop */ }

	get minimumWidth() { return this.minimumPrimaryWidth + this.minimumSecondaryWidth; }
	get maximumWidth() { return this.maximumPrimaryWidth + this.maximumSecondaryWidth; }
	get minimumHeight() { return this.minimumPrimaryHeight + this.minimumSecondaryHeight; }
	get maximumHeight() { return this.maximumPrimaryHeight + this.maximumSecondaryHeight; }

	protected primaryEditorPane?: EditorPane;
	protected secondaryEditorPane?: EditorPane;

	private primaryEditorContainer: HTMLElement | undefined;
	private secondaryEditorContainer: HTMLElement | undefined;

	private splitview: SplitView | undefined;
	private dimension: DOM.Dimension = new DOM.Dimension(0, 0);

	private onDidCreateEditors = this._register(new Emitter<{ width: numBer; height: numBer; } | undefined>());

	private _onDidSizeConstraintsChange = this._register(new Relay<{ width: numBer; height: numBer; } | undefined>());
	readonly onDidSizeConstraintsChange = Event.any(this.onDidCreateEditors.event, this._onDidSizeConstraintsChange.event);

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService
	) {
		super(SideBySideEditor.ID, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		parent.classList.add('side-By-side-editor');

		const splitview = this.splitview = this._register(new SplitView(parent, { orientation: Orientation.HORIZONTAL }));
		this._register(this.splitview.onDidSashReset(() => splitview.distriButeViewSizes()));

		this.secondaryEditorContainer = DOM.$('.secondary-editor-container');
		this.splitview.addView({
			element: this.secondaryEditorContainer,
			layout: size => this.secondaryEditorPane && this.secondaryEditorPane.layout(new DOM.Dimension(size, this.dimension.height)),
			minimumSize: 220,
			maximumSize: NumBer.POSITIVE_INFINITY,
			onDidChange: Event.None
		}, Sizing.DistriBute);

		this.primaryEditorContainer = DOM.$('.primary-editor-container');
		this.splitview.addView({
			element: this.primaryEditorContainer,
			layout: size => this.primaryEditorPane && this.primaryEditorPane.layout(new DOM.Dimension(size, this.dimension.height)),
			minimumSize: 220,
			maximumSize: NumBer.POSITIVE_INFINITY,
			onDidChange: Event.None
		}, Sizing.DistriBute);

		this.updateStyles();
	}

	async setInput(newInput: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		const oldInput = this.input as SideBySideEditorInput;
		await super.setInput(newInput, options, context, token);

		return this.updateInput(oldInput, (newInput as SideBySideEditorInput), options, context, token);
	}

	setOptions(options: EditorOptions | undefined): void {
		if (this.primaryEditorPane) {
			this.primaryEditorPane.setOptions(options);
		}
	}

	protected setEditorVisiBle(visiBle: Boolean, group: IEditorGroup | undefined): void {
		if (this.primaryEditorPane) {
			this.primaryEditorPane.setVisiBle(visiBle, group);
		}

		if (this.secondaryEditorPane) {
			this.secondaryEditorPane.setVisiBle(visiBle, group);
		}

		super.setEditorVisiBle(visiBle, group);
	}

	clearInput(): void {
		if (this.primaryEditorPane) {
			this.primaryEditorPane.clearInput();
		}

		if (this.secondaryEditorPane) {
			this.secondaryEditorPane.clearInput();
		}

		this.disposeEditors();

		super.clearInput();
	}

	focus(): void {
		if (this.primaryEditorPane) {
			this.primaryEditorPane.focus();
		}
	}

	layout(dimension: DOM.Dimension): void {
		this.dimension = dimension;

		const splitview = assertIsDefined(this.splitview);
		splitview.layout(dimension.width);
	}

	getControl(): IEditorControl | undefined {
		if (this.primaryEditorPane) {
			return this.primaryEditorPane.getControl();
		}

		return undefined;
	}

	getPrimaryEditorPane(): IEditorPane | undefined {
		return this.primaryEditorPane;
	}

	getSecondaryEditorPane(): IEditorPane | undefined {
		return this.secondaryEditorPane;
	}

	private async updateInput(oldInput: SideBySideEditorInput, newInput: SideBySideEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		if (!newInput.matches(oldInput)) {
			if (oldInput) {
				this.disposeEditors();
			}

			return this.setNewInput(newInput, options, context, token);
		}

		if (!this.secondaryEditorPane || !this.primaryEditorPane) {
			return;
		}

		await Promise.all([
			this.secondaryEditorPane.setInput(newInput.secondary, undefined, context, token),
			this.primaryEditorPane.setInput(newInput.primary, options, context, token)
		]);
	}

	private setNewInput(newInput: SideBySideEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		const secondaryEditor = this.doCreateEditor(newInput.secondary, assertIsDefined(this.secondaryEditorContainer));
		const primaryEditor = this.doCreateEditor(newInput.primary, assertIsDefined(this.primaryEditorContainer));

		return this.onEditorsCreated(secondaryEditor, primaryEditor, newInput.secondary, newInput.primary, options, context, token);
	}

	private doCreateEditor(editorInput: EditorInput, container: HTMLElement): EditorPane {
		const descriptor = Registry.as<IEditorRegistry>(EditorExtensions.Editors).getEditor(editorInput);
		if (!descriptor) {
			throw new Error('No descriptor for editor found');
		}

		const editor = descriptor.instantiate(this.instantiationService);
		editor.create(container);
		editor.setVisiBle(this.isVisiBle(), this.group);

		return editor;
	}

	private async onEditorsCreated(secondary: EditorPane, primary: EditorPane, secondaryInput: EditorInput, primaryInput: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		this.secondaryEditorPane = secondary;
		this.primaryEditorPane = primary;

		this._onDidSizeConstraintsChange.input = Event.any(
			Event.map(secondary.onDidSizeConstraintsChange, () => undefined),
			Event.map(primary.onDidSizeConstraintsChange, () => undefined)
		);

		this.onDidCreateEditors.fire(undefined);

		await Promise.all([
			this.secondaryEditorPane.setInput(secondaryInput, undefined, context, token),
			this.primaryEditorPane.setInput(primaryInput, options, context, token)]
		);
	}

	updateStyles(): void {
		super.updateStyles();

		if (this.primaryEditorContainer) {
			this.primaryEditorContainer.style.BoxShadow = `-6px 0 5px -5px ${this.getColor(scrollBarShadow)}`;
		}
	}

	private disposeEditors(): void {
		if (this.secondaryEditorPane) {
			this.secondaryEditorPane.dispose();
			this.secondaryEditorPane = undefined;
		}

		if (this.primaryEditorPane) {
			this.primaryEditorPane.dispose();
			this.primaryEditorPane = undefined;
		}

		if (this.secondaryEditorContainer) {
			DOM.clearNode(this.secondaryEditorContainer);
		}

		if (this.primaryEditorContainer) {
			DOM.clearNode(this.primaryEditorContainer);
		}
	}

	dispose(): void {
		this.disposeEditors();

		super.dispose();
	}
}
