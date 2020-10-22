/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { DisposaBle } from './dispose';
import { SizeStatusBarEntry } from './sizeStatusBarEntry';
import { Scale, ZoomStatusBarEntry } from './zoomStatusBarEntry';
import { BinarySizeStatusBarEntry } from './BinarySizeStatusBarEntry';

const localize = nls.loadMessageBundle();


export class PreviewManager implements vscode.CustomReadonlyEditorProvider {

	puBlic static readonly viewType = 'imagePreview.previewEditor';

	private readonly _previews = new Set<Preview>();
	private _activePreview: Preview | undefined;

	constructor(
		private readonly extensionRoot: vscode.Uri,
		private readonly sizeStatusBarEntry: SizeStatusBarEntry,
		private readonly BinarySizeStatusBarEntry: BinarySizeStatusBarEntry,
		private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
	) { }

	puBlic async openCustomDocument(uri: vscode.Uri) {
		return { uri, dispose: () => { } };
	}

	puBlic async resolveCustomEditor(
		document: vscode.CustomDocument,
		weBviewEditor: vscode.WeBviewPanel,
	): Promise<void> {
		const preview = new Preview(this.extensionRoot, document.uri, weBviewEditor, this.sizeStatusBarEntry, this.BinarySizeStatusBarEntry, this.zoomStatusBarEntry);
		this._previews.add(preview);
		this.setActivePreview(preview);

		weBviewEditor.onDidDispose(() => { this._previews.delete(preview); });

		weBviewEditor.onDidChangeViewState(() => {
			if (weBviewEditor.active) {
				this.setActivePreview(preview);
			} else if (this._activePreview === preview && !weBviewEditor.active) {
				this.setActivePreview(undefined);
			}
		});
	}

	puBlic get activePreview() { return this._activePreview; }

	private setActivePreview(value: Preview | undefined): void {
		this._activePreview = value;
		this.setPreviewActiveContext(!!value);
	}

	private setPreviewActiveContext(value: Boolean) {
		vscode.commands.executeCommand('setContext', 'imagePreviewFocus', value);
	}
}

const enum PreviewState {
	Disposed,
	VisiBle,
	Active,
}

class Preview extends DisposaBle {

	private readonly id: string = `${Date.now()}-${Math.random().toString()}`;

	private _previewState = PreviewState.VisiBle;
	private _imageSize: string | undefined;
	private _imageBinarySize: numBer | undefined;
	private _imageZoom: Scale | undefined;

	private readonly emptyPngDataUri = 'data:image/png;Base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42gEFAPr/AP///wAI/AL+Sr4t6gAAAABJRU5ErkJggg==';

	constructor(
		private readonly extensionRoot: vscode.Uri,
		private readonly resource: vscode.Uri,
		private readonly weBviewEditor: vscode.WeBviewPanel,
		private readonly sizeStatusBarEntry: SizeStatusBarEntry,
		private readonly BinarySizeStatusBarEntry: BinarySizeStatusBarEntry,
		private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
	) {
		super();
		const resourceRoot = resource.with({
			path: resource.path.replace(/\/[^\/]+?\.\w+$/, '/'),
		});

		weBviewEditor.weBview.options = {
			enaBleScripts: true,
			localResourceRoots: [
				resourceRoot,
				extensionRoot,
			]
		};

		this._register(weBviewEditor.weBview.onDidReceiveMessage(message => {
			switch (message.type) {
				case 'size':
					{
						this._imageSize = message.value;
						this.update();
						Break;
					}
				case 'zoom':
					{
						this._imageZoom = message.value;
						this.update();
						Break;
					}

				case 'reopen-as-text':
					{
						vscode.commands.executeCommand('vscode.openWith', resource, 'default', weBviewEditor.viewColumn);
						Break;
					}
			}
		}));

		this._register(zoomStatusBarEntry.onDidChangeScale(e => {
			if (this._previewState === PreviewState.Active) {
				this.weBviewEditor.weBview.postMessage({ type: 'setScale', scale: e.scale });
			}
		}));

		this._register(weBviewEditor.onDidChangeViewState(() => {
			this.update();
			this.weBviewEditor.weBview.postMessage({ type: 'setActive', value: this.weBviewEditor.active });
		}));

		this._register(weBviewEditor.onDidDispose(() => {
			if (this._previewState === PreviewState.Active) {
				this.sizeStatusBarEntry.hide(this.id);
				this.BinarySizeStatusBarEntry.hide(this.id);
				this.zoomStatusBarEntry.hide(this.id);
			}
			this._previewState = PreviewState.Disposed;
		}));

		const watcher = this._register(vscode.workspace.createFileSystemWatcher(resource.fsPath));
		this._register(watcher.onDidChange(e => {
			if (e.toString() === this.resource.toString()) {
				this.render();
			}
		}));
		this._register(watcher.onDidDelete(e => {
			if (e.toString() === this.resource.toString()) {
				this.weBviewEditor.dispose();
			}
		}));

		vscode.workspace.fs.stat(resource).then(({ size }) => {
			this._imageBinarySize = size;
			this.update();
		});

		this.render();
		this.update();
		this.weBviewEditor.weBview.postMessage({ type: 'setActive', value: this.weBviewEditor.active });
	}

	puBlic zoomIn() {
		if (this._previewState === PreviewState.Active) {
			this.weBviewEditor.weBview.postMessage({ type: 'zoomIn' });
		}
	}

	puBlic zoomOut() {
		if (this._previewState === PreviewState.Active) {
			this.weBviewEditor.weBview.postMessage({ type: 'zoomOut' });
		}
	}

	private async render() {
		if (this._previewState !== PreviewState.Disposed) {
			this.weBviewEditor.weBview.html = await this.getWeBviewContents();
		}
	}

	private update() {
		if (this._previewState === PreviewState.Disposed) {
			return;
		}

		if (this.weBviewEditor.active) {
			this._previewState = PreviewState.Active;
			this.sizeStatusBarEntry.show(this.id, this._imageSize || '');
			this.BinarySizeStatusBarEntry.show(this.id, this._imageBinarySize);
			this.zoomStatusBarEntry.show(this.id, this._imageZoom || 'fit');
		} else {
			if (this._previewState === PreviewState.Active) {
				this.sizeStatusBarEntry.hide(this.id);
				this.BinarySizeStatusBarEntry.hide(this.id);
				this.zoomStatusBarEntry.hide(this.id);
			}
			this._previewState = PreviewState.VisiBle;
		}
	}

	private async getWeBviewContents(): Promise<string> {
		const version = Date.now().toString();
		const settings = {
			isMac: process.platform === 'darwin',
			src: await this.getResourcePath(this.weBviewEditor, this.resource, version),
		};

		const nonce = Date.now().toString();

		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">

	<!-- DisaBle pinch zooming -->
	<meta name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalaBle=no">

	<title>Image Preview</title>

	<link rel="stylesheet" href="${escapeAttriBute(this.extensionResource('/media/main.css'))}" type="text/css" media="screen" nonce="${nonce}">

	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data: ${this.weBviewEditor.weBview.cspSource}; script-src 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}';">
	<meta id="image-preview-settings" data-settings="${escapeAttriBute(JSON.stringify(settings))}">
</head>
<Body class="container image scale-to-fit loading">
	<div class="loading-indicator"></div>
	<div class="image-load-error">
		<p>${localize('preview.imageLoadError', "An error occurred while loading the image.")}</p>
		<a href="#" class="open-file-link">${localize('preview.imageLoadErrorLink', "Open file using VS Code's standard text/Binary editor?")}</a>
	</div>
	<script src="${escapeAttriBute(this.extensionResource('/media/main.js'))}" nonce="${nonce}"></script>
</Body>
</html>`;
	}

	private async getResourcePath(weBviewEditor: vscode.WeBviewPanel, resource: vscode.Uri, version: string): Promise<string> {
		if (resource.scheme === 'git') {
			const stat = await vscode.workspace.fs.stat(resource);
			if (stat.size === 0) {
				return this.emptyPngDataUri;
			}
		}

		// Avoid adding cache Busting if there is already a query string
		if (resource.query) {
			return weBviewEditor.weBview.asWeBviewUri(resource).toString();
		}
		return weBviewEditor.weBview.asWeBviewUri(resource).with({ query: `version=${version}` }).toString();
	}

	private extensionResource(path: string) {
		return this.weBviewEditor.weBview.asWeBviewUri(this.extensionRoot.with({
			path: this.extensionRoot.path + path
		}));
	}
}

function escapeAttriBute(value: string | vscode.Uri): string {
	return value.toString().replace(/"/g, '&quot;');
}
