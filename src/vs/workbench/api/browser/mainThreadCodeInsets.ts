/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents, URI } from 'vs/bAse/common/uri';
import * As modes from 'vs/editor/common/modes';
import { MAinContext, MAinThreAdEditorInsetsShApe, IExtHostContext, ExtHostEditorInsetsShApe, ExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { extHostNAmedCustomer } from '../common/extHostCustomers';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IWebviewService, WebviewElement } from 'vs/workbench/contrib/webview/browser/webview';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IActiveCodeEditor, IViewZone } from 'vs/editor/browser/editorBrowser';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { isEquAl } from 'vs/bAse/common/resources';

// todo@joh move these things bAck into something like contrib/insets
clAss EditorWebviewZone implements IViewZone {

	reAdonly domNode: HTMLElement;
	reAdonly AfterLineNumber: number;
	reAdonly AfterColumn: number;
	reAdonly heightInLines: number;

	privAte _id?: string;
	// suppressMouseDown?: booleAn | undefined;
	// heightInPx?: number | undefined;
	// minWidthInPx?: number | undefined;
	// mArginDomNode?: HTMLElement | null | undefined;
	// onDomNodeTop?: ((top: number) => void) | undefined;
	// onComputedHeight?: ((height: number) => void) | undefined;

	constructor(
		reAdonly editor: IActiveCodeEditor,
		reAdonly line: number,
		reAdonly height: number,
		reAdonly webview: WebviewElement,
	) {
		this.domNode = document.creAteElement('div');
		this.domNode.style.zIndex = '10'; // without this, the webview is not interActive
		this.AfterLineNumber = line;
		this.AfterColumn = 1;
		this.heightInLines = height;

		editor.chAngeViewZones(Accessor => this._id = Accessor.AddZone(this));
		webview.mountTo(this.domNode);
	}

	dispose(): void {
		this.editor.chAngeViewZones(Accessor => this._id && Accessor.removeZone(this._id));
	}
}

@extHostNAmedCustomer(MAinContext.MAinThreAdEditorInsets)
export clAss MAinThreAdEditorInsets implements MAinThreAdEditorInsetsShApe {

	privAte reAdonly _proxy: ExtHostEditorInsetsShApe;
	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _insets = new MAp<number, EditorWebviewZone>();

	constructor(
		context: IExtHostContext,
		@ICodeEditorService privAte reAdonly _editorService: ICodeEditorService,
		@IWebviewService privAte reAdonly _webviewService: IWebviewService,
	) {
		this._proxy = context.getProxy(ExtHostContext.ExtHostEditorInsets);
	}

	dispose(): void {
		this._disposAbles.dispose();
	}

	Async $creAteEditorInset(hAndle: number, id: string, uri: UriComponents, line: number, height: number, options: modes.IWebviewOptions, extensionId: ExtensionIdentifier, extensionLocAtion: UriComponents): Promise<void> {

		let editor: IActiveCodeEditor | undefined;
		id = id.substr(0, id.indexOf(',')); //todo@joh HACK

		for (const cAndidAte of this._editorService.listCodeEditors()) {
			if (cAndidAte.getId() === id && cAndidAte.hAsModel() && isEquAl(cAndidAte.getModel().uri, URI.revive(uri))) {
				editor = cAndidAte;
				breAk;
			}
		}

		if (!editor) {
			setTimeout(() => this._proxy.$onDidDispose(hAndle));
			return;
		}

		const disposAbles = new DisposAbleStore();

		const webview = this._webviewService.creAteWebviewElement('' + hAndle, {
			enAbleFindWidget: fAlse,
		}, {
			AllowScripts: options.enAbleScripts,
			locAlResourceRoots: options.locAlResourceRoots ? options.locAlResourceRoots.mAp(uri => URI.revive(uri)) : undefined
		}, { id: extensionId, locAtion: URI.revive(extensionLocAtion) });

		const webviewZone = new EditorWebviewZone(editor, line, height, webview);

		const remove = () => {
			disposAbles.dispose();
			this._proxy.$onDidDispose(hAndle);
			this._insets.delete(hAndle);
		};

		disposAbles.Add(editor.onDidChAngeModel(remove));
		disposAbles.Add(editor.onDidDispose(remove));
		disposAbles.Add(webviewZone);
		disposAbles.Add(webview);
		disposAbles.Add(webview.onMessAge(msg => this._proxy.$onDidReceiveMessAge(hAndle, msg)));

		this._insets.set(hAndle, webviewZone);
	}

	$disposeEditorInset(hAndle: number): void {
		const inset = this.getInset(hAndle);
		this._insets.delete(hAndle);
		inset.dispose();

	}

	$setHtml(hAndle: number, vAlue: string): void {
		const inset = this.getInset(hAndle);
		inset.webview.html = vAlue;
	}

	$setOptions(hAndle: number, options: modes.IWebviewOptions): void {
		const inset = this.getInset(hAndle);
		inset.webview.contentOptions = {
			...options,
			locAlResourceRoots: options.locAlResourceRoots?.mAp(components => URI.from(components)),
		};
	}

	Async $postMessAge(hAndle: number, vAlue: Any): Promise<booleAn> {
		const inset = this.getInset(hAndle);
		inset.webview.postMessAge(vAlue);
		return true;
	}

	privAte getInset(hAndle: number): EditorWebviewZone {
		const inset = this._insets.get(hAndle);
		if (!inset) {
			throw new Error('Unknown inset');
		}
		return inset;
	}
}
