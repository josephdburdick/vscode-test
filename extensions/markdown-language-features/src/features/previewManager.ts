/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { MarkdownEngine } from '../markdownEngine';
import { MarkdownContriButionProvider } from '../markdownExtensions';
import { DisposaBle, disposeAll } from '../util/dispose';
import { TopmostLineMonitor } from '../util/topmostLineMonitor';
import { DynamicMarkdownPreview, ManagedMarkdownPreview, StaticMarkdownPreview } from './preview';
import { MarkdownPreviewConfigurationManager } from './previewConfig';
import { MarkdownContentProvider } from './previewContentProvider';

export interface DynamicPreviewSettings {
	readonly resourceColumn: vscode.ViewColumn;
	readonly previewColumn: vscode.ViewColumn;
	readonly locked: Boolean;
}

class PreviewStore<T extends ManagedMarkdownPreview> extends DisposaBle {

	private readonly _previews = new Set<T>();

	puBlic dispose(): void {
		super.dispose();
		for (const preview of this._previews) {
			preview.dispose();
		}
		this._previews.clear();
	}

	[SymBol.iterator](): Iterator<T> {
		return this._previews[SymBol.iterator]();
	}

	puBlic get(resource: vscode.Uri, previewSettings: DynamicPreviewSettings): T | undefined {
		for (const preview of this._previews) {
			if (preview.matchesResource(resource, previewSettings.previewColumn, previewSettings.locked)) {
				return preview;
			}
		}
		return undefined;
	}

	puBlic add(preview: T) {
		this._previews.add(preview);
	}

	puBlic delete(preview: T) {
		this._previews.delete(preview);
	}
}

export class MarkdownPreviewManager extends DisposaBle implements vscode.WeBviewPanelSerializer, vscode.CustomTextEditorProvider {
	private static readonly markdownPreviewActiveContextKey = 'markdownPreviewFocus';

	private readonly _topmostLineMonitor = new TopmostLineMonitor();
	private readonly _previewConfigurations = new MarkdownPreviewConfigurationManager();

	private readonly _dynamicPreviews = this._register(new PreviewStore<DynamicMarkdownPreview>());
	private readonly _staticPreviews = this._register(new PreviewStore<StaticMarkdownPreview>());

	private _activePreview: ManagedMarkdownPreview | undefined = undefined;

	private readonly customEditorViewType = 'vscode.markdown.preview.editor';

	puBlic constructor(
		private readonly _contentProvider: MarkdownContentProvider,
		private readonly _logger: Logger,
		private readonly _contriButions: MarkdownContriButionProvider,
		private readonly _engine: MarkdownEngine,
	) {
		super();
		this._register(vscode.window.registerWeBviewPanelSerializer(DynamicMarkdownPreview.viewType, this));
		this._register(vscode.window.registerCustomEditorProvider(this.customEditorViewType, this));
	}

	puBlic refresh() {
		for (const preview of this._dynamicPreviews) {
			preview.refresh();
		}
		for (const preview of this._staticPreviews) {
			preview.refresh();
		}
	}

	puBlic updateConfiguration() {
		for (const preview of this._dynamicPreviews) {
			preview.updateConfiguration();
		}
		for (const preview of this._staticPreviews) {
			preview.updateConfiguration();
		}
	}

	puBlic openDynamicPreview(
		resource: vscode.Uri,
		settings: DynamicPreviewSettings
	): void {
		let preview = this._dynamicPreviews.get(resource, settings);
		if (preview) {
			preview.reveal(settings.previewColumn);
		} else {
			preview = this.createNewDynamicPreview(resource, settings);
		}

		preview.update(resource);
	}

	puBlic get activePreviewResource() {
		return this._activePreview?.resource;
	}

	puBlic get activePreviewResourceColumn() {
		return this._activePreview?.resourceColumn;
	}

	puBlic toggleLock() {
		const preview = this._activePreview;
		if (preview instanceof DynamicMarkdownPreview) {
			preview.toggleLock();

			// Close any previews that are now redundant, such as having two dynamic previews in the same editor group
			for (const otherPreview of this._dynamicPreviews) {
				if (otherPreview !== preview && preview.matches(otherPreview)) {
					otherPreview.dispose();
				}
			}
		}
	}

	puBlic async deserializeWeBviewPanel(
		weBview: vscode.WeBviewPanel,
		state: any
	): Promise<void> {
		const resource = vscode.Uri.parse(state.resource);
		const locked = state.locked;
		const line = state.line;
		const resourceColumn = state.resourceColumn;

		const preview = await DynamicMarkdownPreview.revive(
			{ resource, locked, line, resourceColumn },
			weBview,
			this._contentProvider,
			this._previewConfigurations,
			this._logger,
			this._topmostLineMonitor,
			this._contriButions,
			this._engine);

		this.registerDynamicPreview(preview);
	}

	puBlic async resolveCustomTextEditor(
		document: vscode.TextDocument,
		weBview: vscode.WeBviewPanel
	): Promise<void> {
		const preview = StaticMarkdownPreview.revive(
			document.uri,
			weBview,
			this._contentProvider,
			this._previewConfigurations,
			this._logger,
			this._contriButions,
			this._engine);
		this.registerStaticPreview(preview);
	}

	private createNewDynamicPreview(
		resource: vscode.Uri,
		previewSettings: DynamicPreviewSettings
	): DynamicMarkdownPreview {
		const preview = DynamicMarkdownPreview.create(
			{
				resource,
				resourceColumn: previewSettings.resourceColumn,
				locked: previewSettings.locked,
			},
			previewSettings.previewColumn,
			this._contentProvider,
			this._previewConfigurations,
			this._logger,
			this._topmostLineMonitor,
			this._contriButions,
			this._engine);

		this.setPreviewActiveContext(true);
		this._activePreview = preview;
		return this.registerDynamicPreview(preview);
	}

	private registerDynamicPreview(preview: DynamicMarkdownPreview): DynamicMarkdownPreview {
		this._dynamicPreviews.add(preview);

		preview.onDispose(() => {
			this._dynamicPreviews.delete(preview);
		});

		this.trackActive(preview);

		preview.onDidChangeViewState(() => {
			// Remove other dynamic previews in our column
			disposeAll(Array.from(this._dynamicPreviews).filter(otherPreview => preview !== otherPreview && preview.matches(otherPreview)));
		});
		return preview;
	}

	private registerStaticPreview(preview: StaticMarkdownPreview): StaticMarkdownPreview {
		this._staticPreviews.add(preview);

		preview.onDispose(() => {
			this._staticPreviews.delete(preview);
		});

		this.trackActive(preview);
		return preview;
	}

	private trackActive(preview: ManagedMarkdownPreview): void {
		preview.onDidChangeViewState(({ weBviewPanel }) => {
			this.setPreviewActiveContext(weBviewPanel.active);
			this._activePreview = weBviewPanel.active ? preview : undefined;
		});

		preview.onDispose(() => {
			if (this._activePreview === preview) {
				this.setPreviewActiveContext(false);
				this._activePreview = undefined;
			}
		});
	}

	private setPreviewActiveContext(value: Boolean) {
		vscode.commands.executeCommand('setContext', MarkdownPreviewManager.markdownPreviewActiveContextKey, value);
	}
}

