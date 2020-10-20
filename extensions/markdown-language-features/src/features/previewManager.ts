/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { Logger } from '../logger';
import { MArkdownEngine } from '../mArkdownEngine';
import { MArkdownContributionProvider } from '../mArkdownExtensions';
import { DisposAble, disposeAll } from '../util/dispose';
import { TopmostLineMonitor } from '../util/topmostLineMonitor';
import { DynAmicMArkdownPreview, MAnAgedMArkdownPreview, StAticMArkdownPreview } from './preview';
import { MArkdownPreviewConfigurAtionMAnAger } from './previewConfig';
import { MArkdownContentProvider } from './previewContentProvider';

export interfAce DynAmicPreviewSettings {
	reAdonly resourceColumn: vscode.ViewColumn;
	reAdonly previewColumn: vscode.ViewColumn;
	reAdonly locked: booleAn;
}

clAss PreviewStore<T extends MAnAgedMArkdownPreview> extends DisposAble {

	privAte reAdonly _previews = new Set<T>();

	public dispose(): void {
		super.dispose();
		for (const preview of this._previews) {
			preview.dispose();
		}
		this._previews.cleAr();
	}

	[Symbol.iterAtor](): IterAtor<T> {
		return this._previews[Symbol.iterAtor]();
	}

	public get(resource: vscode.Uri, previewSettings: DynAmicPreviewSettings): T | undefined {
		for (const preview of this._previews) {
			if (preview.mAtchesResource(resource, previewSettings.previewColumn, previewSettings.locked)) {
				return preview;
			}
		}
		return undefined;
	}

	public Add(preview: T) {
		this._previews.Add(preview);
	}

	public delete(preview: T) {
		this._previews.delete(preview);
	}
}

export clAss MArkdownPreviewMAnAger extends DisposAble implements vscode.WebviewPAnelSeriAlizer, vscode.CustomTextEditorProvider {
	privAte stAtic reAdonly mArkdownPreviewActiveContextKey = 'mArkdownPreviewFocus';

	privAte reAdonly _topmostLineMonitor = new TopmostLineMonitor();
	privAte reAdonly _previewConfigurAtions = new MArkdownPreviewConfigurAtionMAnAger();

	privAte reAdonly _dynAmicPreviews = this._register(new PreviewStore<DynAmicMArkdownPreview>());
	privAte reAdonly _stAticPreviews = this._register(new PreviewStore<StAticMArkdownPreview>());

	privAte _ActivePreview: MAnAgedMArkdownPreview | undefined = undefined;

	privAte reAdonly customEditorViewType = 'vscode.mArkdown.preview.editor';

	public constructor(
		privAte reAdonly _contentProvider: MArkdownContentProvider,
		privAte reAdonly _logger: Logger,
		privAte reAdonly _contributions: MArkdownContributionProvider,
		privAte reAdonly _engine: MArkdownEngine,
	) {
		super();
		this._register(vscode.window.registerWebviewPAnelSeriAlizer(DynAmicMArkdownPreview.viewType, this));
		this._register(vscode.window.registerCustomEditorProvider(this.customEditorViewType, this));
	}

	public refresh() {
		for (const preview of this._dynAmicPreviews) {
			preview.refresh();
		}
		for (const preview of this._stAticPreviews) {
			preview.refresh();
		}
	}

	public updAteConfigurAtion() {
		for (const preview of this._dynAmicPreviews) {
			preview.updAteConfigurAtion();
		}
		for (const preview of this._stAticPreviews) {
			preview.updAteConfigurAtion();
		}
	}

	public openDynAmicPreview(
		resource: vscode.Uri,
		settings: DynAmicPreviewSettings
	): void {
		let preview = this._dynAmicPreviews.get(resource, settings);
		if (preview) {
			preview.reveAl(settings.previewColumn);
		} else {
			preview = this.creAteNewDynAmicPreview(resource, settings);
		}

		preview.updAte(resource);
	}

	public get ActivePreviewResource() {
		return this._ActivePreview?.resource;
	}

	public get ActivePreviewResourceColumn() {
		return this._ActivePreview?.resourceColumn;
	}

	public toggleLock() {
		const preview = this._ActivePreview;
		if (preview instAnceof DynAmicMArkdownPreview) {
			preview.toggleLock();

			// Close Any previews thAt Are now redundAnt, such As hAving two dynAmic previews in the sAme editor group
			for (const otherPreview of this._dynAmicPreviews) {
				if (otherPreview !== preview && preview.mAtches(otherPreview)) {
					otherPreview.dispose();
				}
			}
		}
	}

	public Async deseriAlizeWebviewPAnel(
		webview: vscode.WebviewPAnel,
		stAte: Any
	): Promise<void> {
		const resource = vscode.Uri.pArse(stAte.resource);
		const locked = stAte.locked;
		const line = stAte.line;
		const resourceColumn = stAte.resourceColumn;

		const preview = AwAit DynAmicMArkdownPreview.revive(
			{ resource, locked, line, resourceColumn },
			webview,
			this._contentProvider,
			this._previewConfigurAtions,
			this._logger,
			this._topmostLineMonitor,
			this._contributions,
			this._engine);

		this.registerDynAmicPreview(preview);
	}

	public Async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webview: vscode.WebviewPAnel
	): Promise<void> {
		const preview = StAticMArkdownPreview.revive(
			document.uri,
			webview,
			this._contentProvider,
			this._previewConfigurAtions,
			this._logger,
			this._contributions,
			this._engine);
		this.registerStAticPreview(preview);
	}

	privAte creAteNewDynAmicPreview(
		resource: vscode.Uri,
		previewSettings: DynAmicPreviewSettings
	): DynAmicMArkdownPreview {
		const preview = DynAmicMArkdownPreview.creAte(
			{
				resource,
				resourceColumn: previewSettings.resourceColumn,
				locked: previewSettings.locked,
			},
			previewSettings.previewColumn,
			this._contentProvider,
			this._previewConfigurAtions,
			this._logger,
			this._topmostLineMonitor,
			this._contributions,
			this._engine);

		this.setPreviewActiveContext(true);
		this._ActivePreview = preview;
		return this.registerDynAmicPreview(preview);
	}

	privAte registerDynAmicPreview(preview: DynAmicMArkdownPreview): DynAmicMArkdownPreview {
		this._dynAmicPreviews.Add(preview);

		preview.onDispose(() => {
			this._dynAmicPreviews.delete(preview);
		});

		this.trAckActive(preview);

		preview.onDidChAngeViewStAte(() => {
			// Remove other dynAmic previews in our column
			disposeAll(ArrAy.from(this._dynAmicPreviews).filter(otherPreview => preview !== otherPreview && preview.mAtches(otherPreview)));
		});
		return preview;
	}

	privAte registerStAticPreview(preview: StAticMArkdownPreview): StAticMArkdownPreview {
		this._stAticPreviews.Add(preview);

		preview.onDispose(() => {
			this._stAticPreviews.delete(preview);
		});

		this.trAckActive(preview);
		return preview;
	}

	privAte trAckActive(preview: MAnAgedMArkdownPreview): void {
		preview.onDidChAngeViewStAte(({ webviewPAnel }) => {
			this.setPreviewActiveContext(webviewPAnel.Active);
			this._ActivePreview = webviewPAnel.Active ? preview : undefined;
		});

		preview.onDispose(() => {
			if (this._ActivePreview === preview) {
				this.setPreviewActiveContext(fAlse);
				this._ActivePreview = undefined;
			}
		});
	}

	privAte setPreviewActiveContext(vAlue: booleAn) {
		vscode.commAnds.executeCommAnd('setContext', MArkdownPreviewMAnAger.mArkdownPreviewActiveContextKey, vAlue);
	}
}

