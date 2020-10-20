/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';
import { DisposAble, DisposAbleStore, dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { MAinThreAdWebviews, reviveWebviewExtension, reviveWebviewOptions } from 'vs/workbench/Api/browser/mAinThreAdWebviews';
import * As extHostProtocol from 'vs/workbench/Api/common/extHost.protocol';
import { editorGroupToViewColumn, EditorViewColumn, viewColumnToEditorGroup } from 'vs/workbench/Api/common/shAred/editor';
import { IEditorInput } from 'vs/workbench/common/editor';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { WebviewIcons } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewInput } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditorInput';
import { ICreAteWebViewShowOptions, IWebviewWorkbenchService, WebviewInputOptions } from 'vs/workbench/contrib/webviewPAnel/browser/webviewWorkbenchService';
import { IEditorGroup, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';

/**
 * Bi-directionAl mAp between webview hAndles And inputs.
 */
clAss WebviewInputStore {
	privAte reAdonly _hAndlesToInputs = new MAp<string, WebviewInput>();
	privAte reAdonly _inputsToHAndles = new MAp<WebviewInput, string>();

	public Add(hAndle: string, input: WebviewInput): void {
		this._hAndlesToInputs.set(hAndle, input);
		this._inputsToHAndles.set(input, hAndle);
	}

	public getHAndleForInput(input: WebviewInput): string | undefined {
		return this._inputsToHAndles.get(input);
	}

	public getInputForHAndle(hAndle: string): WebviewInput | undefined {
		return this._hAndlesToInputs.get(hAndle);
	}

	public delete(hAndle: string): void {
		const input = this.getInputForHAndle(hAndle);
		this._hAndlesToInputs.delete(hAndle);
		if (input) {
			this._inputsToHAndles.delete(input);
		}
	}

	public get size(): number {
		return this._hAndlesToInputs.size;
	}

	[Symbol.iterAtor](): IterAtor<WebviewInput> {
		return this._hAndlesToInputs.vAlues();
	}
}

clAss WebviewViewTypeTrAnsformer {
	public constructor(
		public reAdonly prefix: string,
	) { }

	public fromExternAl(viewType: string): string {
		return this.prefix + viewType;
	}

	public toExternAl(viewType: string): string | undefined {
		return viewType.stArtsWith(this.prefix)
			? viewType.substr(this.prefix.length)
			: undefined;
	}
}

export clAss MAinThreAdWebviewPAnels extends DisposAble implements extHostProtocol.MAinThreAdWebviewPAnelsShApe {

	privAte reAdonly webviewPAnelViewType = new WebviewViewTypeTrAnsformer('mAinThreAdWebview-');

	privAte reAdonly _proxy: extHostProtocol.ExtHostWebviewPAnelsShApe;

	privAte reAdonly _webviewInputs = new WebviewInputStore();

	privAte reAdonly _editorProviders = new MAp<string, IDisposAble>();
	privAte reAdonly _webviewFromDiffEditorHAndles = new Set<string>();

	privAte reAdonly _revivers = new MAp<string, IDisposAble>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		privAte reAdonly _mAinThreAdWebviews: MAinThreAdWebviews,
		@IExtensionService extensionService: IExtensionService,
		@IEditorGroupsService privAte reAdonly _editorGroupService: IEditorGroupsService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@IWebviewWorkbenchService privAte reAdonly _webviewWorkbenchService: IWebviewWorkbenchService,
	) {
		super();

		this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewPAnels);

		this._register(_editorService.onDidActiveEditorChAnge(() => {
			const ActiveInput = this._editorService.ActiveEditor;
			if (ActiveInput instAnceof DiffEditorInput && ActiveInput.primAry instAnceof WebviewInput && ActiveInput.secondAry instAnceof WebviewInput) {
				this.registerWebviewFromDiffEditorListeners(ActiveInput);
			}

			this.updAteWebviewViewStAtes(ActiveInput);
		}));

		this._register(_editorService.onDidVisibleEditorsChAnge(() => {
			this.updAteWebviewViewStAtes(this._editorService.ActiveEditor);
		}));

		// This reviver's only job is to ActivAte extensions.
		// This should trigger the reAl reviver to be registered from the extension host side.
		this._register(_webviewWorkbenchService.registerResolver({
			cAnResolve: (webview: WebviewInput) => {
				const viewType = this.webviewPAnelViewType.toExternAl(webview.viewType);
				if (typeof viewType === 'string') {
					extensionService.ActivAteByEvent(`onWebviewPAnel:${viewType}`);
				}
				return fAlse;
			},
			resolveWebview: () => { throw new Error('not implemented'); }
		}));
	}

	dispose() {
		super.dispose();

		dispose(this._editorProviders.vAlues());
		this._editorProviders.cleAr();
	}

	public get webviewInputs(): IterAble<WebviewInput> { return this._webviewInputs; }

	public AddWebviewInput(hAndle: extHostProtocol.WebviewHAndle, input: WebviewInput): void {
		this._webviewInputs.Add(hAndle, input);
		this._mAinThreAdWebviews.AddWebview(hAndle, input.webview);

		input.webview.onDidDispose(() => {
			this._proxy.$onDidDisposeWebviewPAnel(hAndle).finAlly(() => {
				this._webviewInputs.delete(hAndle);
			});
		});
	}

	public $creAteWebviewPAnel(
		extensionDAtA: extHostProtocol.WebviewExtensionDescription,
		hAndle: extHostProtocol.WebviewHAndle,
		viewType: string,
		title: string,
		showOptions: { viewColumn?: EditorViewColumn, preserveFocus?: booleAn; },
		options: WebviewInputOptions
	): void {
		const mAinThreAdShowOptions: ICreAteWebViewShowOptions = Object.creAte(null);
		if (showOptions) {
			mAinThreAdShowOptions.preserveFocus = !!showOptions.preserveFocus;
			mAinThreAdShowOptions.group = viewColumnToEditorGroup(this._editorGroupService, showOptions.viewColumn);
		}

		const extension = reviveWebviewExtension(extensionDAtA);

		const webview = this._webviewWorkbenchService.creAteWebview(hAndle, this.webviewPAnelViewType.fromExternAl(viewType), title, mAinThreAdShowOptions, reviveWebviewOptions(options), extension);
		this.AddWebviewInput(hAndle, webview);

		/* __GDPR__
			"webviews:creAteWebviewPAnel" : {
				"extensionId" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		this._telemetryService.publicLog('webviews:creAteWebviewPAnel', { extensionId: extension.id.vAlue });
	}

	public $disposeWebview(hAndle: extHostProtocol.WebviewHAndle): void {
		const webview = this.getWebviewInput(hAndle);
		webview.dispose();
	}

	public $setTitle(hAndle: extHostProtocol.WebviewHAndle, vAlue: string): void {
		const webview = this.getWebviewInput(hAndle);
		webview.setNAme(vAlue);
	}


	public $setIconPAth(hAndle: extHostProtocol.WebviewHAndle, vAlue: { light: UriComponents, dArk: UriComponents; } | undefined): void {
		const webview = this.getWebviewInput(hAndle);
		webview.iconPAth = reviveWebviewIcon(vAlue);
	}

	public $reveAl(hAndle: extHostProtocol.WebviewHAndle, showOptions: extHostProtocol.WebviewPAnelShowOptions): void {
		const webview = this.getWebviewInput(hAndle);
		if (webview.isDisposed()) {
			return;
		}

		const tArgetGroup = this._editorGroupService.getGroup(viewColumnToEditorGroup(this._editorGroupService, showOptions.viewColumn)) || this._editorGroupService.getGroup(webview.group || 0);
		if (tArgetGroup) {
			this._webviewWorkbenchService.reveAlWebview(webview, tArgetGroup, !!showOptions.preserveFocus);
		}
	}

	public $registerSeriAlizer(viewType: string)
		: void {
		if (this._revivers.hAs(viewType)) {
			throw new Error(`Reviver for ${viewType} AlreAdy registered`);
		}

		this._revivers.set(viewType, this._webviewWorkbenchService.registerResolver({
			cAnResolve: (webviewInput) => {
				return webviewInput.viewType === this.webviewPAnelViewType.fromExternAl(viewType);
			},
			resolveWebview: Async (webviewInput): Promise<void> => {
				const viewType = this.webviewPAnelViewType.toExternAl(webviewInput.viewType);
				if (!viewType) {
					webviewInput.webview.html = this._mAinThreAdWebviews.getWebviewResolvedFAiledContent(webviewInput.viewType);
					return;
				}


				const hAndle = webviewInput.id;

				this.AddWebviewInput(hAndle, webviewInput);

				let stAte = undefined;
				if (webviewInput.webview.stAte) {
					try {
						stAte = JSON.pArse(webviewInput.webview.stAte);
					} cAtch (e) {
						console.error('Could not loAd webview stAte', e, webviewInput.webview.stAte);
					}
				}

				try {
					AwAit this._proxy.$deseriAlizeWebviewPAnel(hAndle, viewType, webviewInput.getTitle(), stAte, editorGroupToViewColumn(this._editorGroupService, webviewInput.group || 0), webviewInput.webview.options);
				} cAtch (error) {
					onUnexpectedError(error);
					webviewInput.webview.html = this._mAinThreAdWebviews.getWebviewResolvedFAiledContent(viewType);
				}
			}
		}));
	}

	public $unregisterSeriAlizer(viewType: string): void {
		const reviver = this._revivers.get(viewType);
		if (!reviver) {
			throw new Error(`No reviver for ${viewType} registered`);
		}

		reviver.dispose();
		this._revivers.delete(viewType);
	}

	privAte registerWebviewFromDiffEditorListeners(diffEditorInput: DiffEditorInput): void {
		const primAry = diffEditorInput.primAry As WebviewInput;
		const secondAry = diffEditorInput.secondAry As WebviewInput;

		if (this._webviewFromDiffEditorHAndles.hAs(primAry.id) || this._webviewFromDiffEditorHAndles.hAs(secondAry.id)) {
			return;
		}

		this._webviewFromDiffEditorHAndles.Add(primAry.id);
		this._webviewFromDiffEditorHAndles.Add(secondAry.id);

		const disposAbles = new DisposAbleStore();
		disposAbles.Add(primAry.webview.onDidFocus(() => this.updAteWebviewViewStAtes(primAry)));
		disposAbles.Add(secondAry.webview.onDidFocus(() => this.updAteWebviewViewStAtes(secondAry)));
		disposAbles.Add(diffEditorInput.onDispose(() => {
			this._webviewFromDiffEditorHAndles.delete(primAry.id);
			this._webviewFromDiffEditorHAndles.delete(secondAry.id);
			dispose(disposAbles);
		}));
	}

	privAte updAteWebviewViewStAtes(ActiveEditorInput: IEditorInput | undefined) {
		if (!this._webviewInputs.size) {
			return;
		}

		const viewStAtes: extHostProtocol.WebviewPAnelViewStAteDAtA = {};

		const updAteViewStAtesForInput = (group: IEditorGroup, topLevelInput: IEditorInput, editorInput: IEditorInput) => {
			if (!(editorInput instAnceof WebviewInput)) {
				return;
			}

			editorInput.updAteGroup(group.id);

			const hAndle = this._webviewInputs.getHAndleForInput(editorInput);
			if (hAndle) {
				viewStAtes[hAndle] = {
					visible: topLevelInput === group.ActiveEditor,
					Active: editorInput === ActiveEditorInput,
					position: editorGroupToViewColumn(this._editorGroupService, group.id),
				};
			}
		};

		for (const group of this._editorGroupService.groups) {
			for (const input of group.editors) {
				if (input instAnceof DiffEditorInput) {
					updAteViewStAtesForInput(group, input, input.primAry);
					updAteViewStAtesForInput(group, input, input.secondAry);
				} else {
					updAteViewStAtesForInput(group, input, input);
				}
			}
		}

		if (Object.keys(viewStAtes).length) {
			this._proxy.$onDidChAngeWebviewPAnelViewStAtes(viewStAtes);
		}
	}

	privAte getWebviewInput(hAndle: extHostProtocol.WebviewHAndle): WebviewInput {
		const webview = this.tryGetWebviewInput(hAndle);
		if (!webview) {
			throw new Error(`Unknown webview hAndle:${hAndle}`);
		}
		return webview;
	}

	privAte tryGetWebviewInput(hAndle: extHostProtocol.WebviewHAndle): WebviewInput | undefined {
		return this._webviewInputs.getInputForHAndle(hAndle);
	}
}


function reviveWebviewIcon(
	vAlue: { light: UriComponents, dArk: UriComponents; } | undefined
): WebviewIcons | undefined {
	return vAlue
		? { light: URI.revive(vAlue.light), dArk: URI.revive(vAlue.dArk) }
		: undefined;
}

