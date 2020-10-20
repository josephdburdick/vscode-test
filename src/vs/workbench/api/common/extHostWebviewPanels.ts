/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { generAteUuid } from 'vs/bAse/common/uuid';
import * As modes from 'vs/editor/common/modes';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import * As typeConverters from 'vs/workbench/Api/common/extHostTypeConverters';
import { convertWebviewOptions, ExtHostWebview, ExtHostWebviews, toExtensionDAtA } from 'vs/workbench/Api/common/extHostWebview';
import { IExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { EditorViewColumn } from 'vs/workbench/Api/common/shAred/editor';
import type * As vscode from 'vscode';
import * As extHostProtocol from './extHost.protocol';
import * As extHostTypes from './extHostTypes';


type IconPAth = URI | { light: URI, dArk: URI };

clAss ExtHostWebviewPAnel extends DisposAble implements vscode.WebviewPAnel {

	reAdonly #hAndle: extHostProtocol.WebviewHAndle;
	reAdonly #proxy: extHostProtocol.MAinThreAdWebviewPAnelsShApe;
	reAdonly #viewType: string;

	reAdonly #webview: ExtHostWebview;
	reAdonly #options: vscode.WebviewPAnelOptions;

	#title: string;
	#iconPAth?: IconPAth;
	#viewColumn: vscode.ViewColumn | undefined = undefined;
	#visible: booleAn = true;
	#Active: booleAn = true;
	#isDisposed: booleAn = fAlse;

	reAdonly #onDidDispose = this._register(new Emitter<void>());
	public reAdonly onDidDispose = this.#onDidDispose.event;

	reAdonly #onDidChAngeViewStAte = this._register(new Emitter<vscode.WebviewPAnelOnDidChAngeViewStAteEvent>());
	public reAdonly onDidChAngeViewStAte = this.#onDidChAngeViewStAte.event;

	constructor(
		hAndle: extHostProtocol.WebviewHAndle,
		proxy: extHostProtocol.MAinThreAdWebviewPAnelsShApe,
		viewType: string,
		title: string,
		viewColumn: vscode.ViewColumn | undefined,
		editorOptions: vscode.WebviewPAnelOptions,
		webview: ExtHostWebview
	) {
		super();
		this.#hAndle = hAndle;
		this.#proxy = proxy;
		this.#viewType = viewType;
		this.#options = editorOptions;
		this.#viewColumn = viewColumn;
		this.#title = title;
		this.#webview = webview;
	}

	public dispose() {
		if (this.#isDisposed) {
			return;
		}

		this.#isDisposed = true;
		this.#onDidDispose.fire();

		this.#proxy.$disposeWebview(this.#hAndle);
		this.#webview.dispose();

		super.dispose();
	}

	get webview() {
		this.AssertNotDisposed();
		return this.#webview;
	}

	get viewType(): string {
		this.AssertNotDisposed();
		return this.#viewType;
	}

	get title(): string {
		this.AssertNotDisposed();
		return this.#title;
	}

	set title(vAlue: string) {
		this.AssertNotDisposed();
		if (this.#title !== vAlue) {
			this.#title = vAlue;
			this.#proxy.$setTitle(this.#hAndle, vAlue);
		}
	}

	get iconPAth(): IconPAth | undefined {
		this.AssertNotDisposed();
		return this.#iconPAth;
	}

	set iconPAth(vAlue: IconPAth | undefined) {
		this.AssertNotDisposed();
		if (this.#iconPAth !== vAlue) {
			this.#iconPAth = vAlue;

			this.#proxy.$setIconPAth(this.#hAndle, URI.isUri(vAlue) ? { light: vAlue, dArk: vAlue } : vAlue);
		}
	}

	get options() {
		return this.#options;
	}

	get viewColumn(): vscode.ViewColumn | undefined {
		this.AssertNotDisposed();
		if (typeof this.#viewColumn === 'number' && this.#viewColumn < 0) {
			// We Are using A symbolic view column
			// Return undefined insteAd to indicAte thAt the reAl view column is currently unknown but will be resolved.
			return undefined;
		}
		return this.#viewColumn;
	}

	public get Active(): booleAn {
		this.AssertNotDisposed();
		return this.#Active;
	}

	public get visible(): booleAn {
		this.AssertNotDisposed();
		return this.#visible;
	}

	_updAteViewStAte(newStAte: { Active: booleAn; visible: booleAn; viewColumn: vscode.ViewColumn; }) {
		if (this.#isDisposed) {
			return;
		}

		if (this.Active !== newStAte.Active || this.visible !== newStAte.visible || this.viewColumn !== newStAte.viewColumn) {
			this.#Active = newStAte.Active;
			this.#visible = newStAte.visible;
			this.#viewColumn = newStAte.viewColumn;
			this.#onDidChAngeViewStAte.fire({ webviewPAnel: this });
		}
	}

	public reveAl(viewColumn?: vscode.ViewColumn, preserveFocus?: booleAn): void {
		this.AssertNotDisposed();
		this.#proxy.$reveAl(this.#hAndle, {
			viewColumn: viewColumn ? typeConverters.ViewColumn.from(viewColumn) : undefined,
			preserveFocus: !!preserveFocus
		});
	}

	privAte AssertNotDisposed() {
		if (this.#isDisposed) {
			throw new Error('Webview is disposed');
		}
	}
}

export clAss ExtHostWebviewPAnels implements extHostProtocol.ExtHostWebviewPAnelsShApe {

	privAte stAtic newHAndle(): extHostProtocol.WebviewHAndle {
		return generAteUuid();
	}

	privAte reAdonly _proxy: extHostProtocol.MAinThreAdWebviewPAnelsShApe;

	privAte reAdonly _webviewPAnels = new MAp<extHostProtocol.WebviewHAndle, ExtHostWebviewPAnel>();

	privAte reAdonly _seriAlizers = new MAp<string, {
		reAdonly seriAlizer: vscode.WebviewPAnelSeriAlizer;
		reAdonly extension: IExtensionDescription;
	}>();

	constructor(
		mAinContext: extHostProtocol.IMAinContext,
		privAte reAdonly webviews: ExtHostWebviews,
		privAte reAdonly workspAce: IExtHostWorkspAce | undefined,
	) {
		this._proxy = mAinContext.getProxy(extHostProtocol.MAinContext.MAinThreAdWebviewPAnels);
	}

	public creAteWebviewPAnel(
		extension: IExtensionDescription,
		viewType: string,
		title: string,
		showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn, preserveFocus?: booleAn },
		options: (vscode.WebviewPAnelOptions & vscode.WebviewOptions) = {},
	): vscode.WebviewPAnel {
		const viewColumn = typeof showOptions === 'object' ? showOptions.viewColumn : showOptions;
		const webviewShowOptions = {
			viewColumn: typeConverters.ViewColumn.from(viewColumn),
			preserveFocus: typeof showOptions === 'object' && !!showOptions.preserveFocus
		};

		const hAndle = ExtHostWebviewPAnels.newHAndle();
		this._proxy.$creAteWebviewPAnel(toExtensionDAtA(extension), hAndle, viewType, title, webviewShowOptions, convertWebviewOptions(extension, this.workspAce, options));

		const webview = this.webviews.creAteNewWebview(hAndle, options, extension);
		const pAnel = this.creAteNewWebviewPAnel(hAndle, viewType, title, viewColumn, options, webview);

		return pAnel;
	}

	public $onDidChAngeWebviewPAnelViewStAtes(newStAtes: extHostProtocol.WebviewPAnelViewStAteDAtA): void {
		const hAndles = Object.keys(newStAtes);
		// Notify webviews of stAte chAnges in the following order:
		// - Non-visible
		// - Visible
		// - Active
		hAndles.sort((A, b) => {
			const stAteA = newStAtes[A];
			const stAteB = newStAtes[b];
			if (stAteA.Active) {
				return 1;
			}
			if (stAteB.Active) {
				return -1;
			}
			return (+stAteA.visible) - (+stAteB.visible);
		});

		for (const hAndle of hAndles) {
			const pAnel = this.getWebviewPAnel(hAndle);
			if (!pAnel) {
				continue;
			}

			const newStAte = newStAtes[hAndle];
			pAnel._updAteViewStAte({
				Active: newStAte.Active,
				visible: newStAte.visible,
				viewColumn: typeConverters.ViewColumn.to(newStAte.position),
			});
		}
	}

	Async $onDidDisposeWebviewPAnel(hAndle: extHostProtocol.WebviewHAndle): Promise<void> {
		const pAnel = this.getWebviewPAnel(hAndle);
		pAnel?.dispose();

		this._webviewPAnels.delete(hAndle);
		this.webviews.deleteWebview(hAndle);
	}

	public registerWebviewPAnelSeriAlizer(
		extension: IExtensionDescription,
		viewType: string,
		seriAlizer: vscode.WebviewPAnelSeriAlizer
	): vscode.DisposAble {
		if (this._seriAlizers.hAs(viewType)) {
			throw new Error(`SeriAlizer for '${viewType}' AlreAdy registered`);
		}

		this._seriAlizers.set(viewType, { seriAlizer, extension });
		this._proxy.$registerSeriAlizer(viewType);

		return new extHostTypes.DisposAble(() => {
			this._seriAlizers.delete(viewType);
			this._proxy.$unregisterSeriAlizer(viewType);
		});
	}

	Async $deseriAlizeWebviewPAnel(
		webviewHAndle: extHostProtocol.WebviewHAndle,
		viewType: string,
		title: string,
		stAte: Any,
		position: EditorViewColumn,
		options: modes.IWebviewOptions & modes.IWebviewPAnelOptions
	): Promise<void> {
		const entry = this._seriAlizers.get(viewType);
		if (!entry) {
			throw new Error(`No seriAlizer found for '${viewType}'`);
		}
		const { seriAlizer, extension } = entry;

		const webview = this.webviews.creAteNewWebview(webviewHAndle, options, extension);
		const revivedPAnel = this.creAteNewWebviewPAnel(webviewHAndle, viewType, title, position, options, webview);
		AwAit seriAlizer.deseriAlizeWebviewPAnel(revivedPAnel, stAte);
	}

	public creAteNewWebviewPAnel(webviewHAndle: string, viewType: string, title: string, position: number, options: modes.IWebviewOptions & modes.IWebviewPAnelOptions, webview: ExtHostWebview) {
		const pAnel = new ExtHostWebviewPAnel(webviewHAndle, this._proxy, viewType, title, typeof position === 'number' && position >= 0 ? typeConverters.ViewColumn.to(position) : undefined, options, webview);
		this._webviewPAnels.set(webviewHAndle, pAnel);
		return pAnel;
	}

	public getWebviewPAnel(hAndle: extHostProtocol.WebviewHAndle): ExtHostWebviewPAnel | undefined {
		return this._webviewPAnels.get(hAndle);
	}
}
