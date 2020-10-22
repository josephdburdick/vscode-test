/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents, URI } from 'vs/Base/common/uri';
import * as modes from 'vs/editor/common/modes';
import { MainContext, MainThreadEditorInsetsShape, IExtHostContext, ExtHostEditorInsetsShape, ExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { extHostNamedCustomer } from '../common/extHostCustomers';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IWeBviewService, WeBviewElement } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IActiveCodeEditor, IViewZone } from 'vs/editor/Browser/editorBrowser';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { isEqual } from 'vs/Base/common/resources';

// todo@joh move these things Back into something like contriB/insets
class EditorWeBviewZone implements IViewZone {

	readonly domNode: HTMLElement;
	readonly afterLineNumBer: numBer;
	readonly afterColumn: numBer;
	readonly heightInLines: numBer;

	private _id?: string;
	// suppressMouseDown?: Boolean | undefined;
	// heightInPx?: numBer | undefined;
	// minWidthInPx?: numBer | undefined;
	// marginDomNode?: HTMLElement | null | undefined;
	// onDomNodeTop?: ((top: numBer) => void) | undefined;
	// onComputedHeight?: ((height: numBer) => void) | undefined;

	constructor(
		readonly editor: IActiveCodeEditor,
		readonly line: numBer,
		readonly height: numBer,
		readonly weBview: WeBviewElement,
	) {
		this.domNode = document.createElement('div');
		this.domNode.style.zIndex = '10'; // without this, the weBview is not interactive
		this.afterLineNumBer = line;
		this.afterColumn = 1;
		this.heightInLines = height;

		editor.changeViewZones(accessor => this._id = accessor.addZone(this));
		weBview.mountTo(this.domNode);
	}

	dispose(): void {
		this.editor.changeViewZones(accessor => this._id && accessor.removeZone(this._id));
	}
}

@extHostNamedCustomer(MainContext.MainThreadEditorInsets)
export class MainThreadEditorInsets implements MainThreadEditorInsetsShape {

	private readonly _proxy: ExtHostEditorInsetsShape;
	private readonly _disposaBles = new DisposaBleStore();
	private readonly _insets = new Map<numBer, EditorWeBviewZone>();

	constructor(
		context: IExtHostContext,
		@ICodeEditorService private readonly _editorService: ICodeEditorService,
		@IWeBviewService private readonly _weBviewService: IWeBviewService,
	) {
		this._proxy = context.getProxy(ExtHostContext.ExtHostEditorInsets);
	}

	dispose(): void {
		this._disposaBles.dispose();
	}

	async $createEditorInset(handle: numBer, id: string, uri: UriComponents, line: numBer, height: numBer, options: modes.IWeBviewOptions, extensionId: ExtensionIdentifier, extensionLocation: UriComponents): Promise<void> {

		let editor: IActiveCodeEditor | undefined;
		id = id.suBstr(0, id.indexOf(',')); //todo@joh HACK

		for (const candidate of this._editorService.listCodeEditors()) {
			if (candidate.getId() === id && candidate.hasModel() && isEqual(candidate.getModel().uri, URI.revive(uri))) {
				editor = candidate;
				Break;
			}
		}

		if (!editor) {
			setTimeout(() => this._proxy.$onDidDispose(handle));
			return;
		}

		const disposaBles = new DisposaBleStore();

		const weBview = this._weBviewService.createWeBviewElement('' + handle, {
			enaBleFindWidget: false,
		}, {
			allowScripts: options.enaBleScripts,
			localResourceRoots: options.localResourceRoots ? options.localResourceRoots.map(uri => URI.revive(uri)) : undefined
		}, { id: extensionId, location: URI.revive(extensionLocation) });

		const weBviewZone = new EditorWeBviewZone(editor, line, height, weBview);

		const remove = () => {
			disposaBles.dispose();
			this._proxy.$onDidDispose(handle);
			this._insets.delete(handle);
		};

		disposaBles.add(editor.onDidChangeModel(remove));
		disposaBles.add(editor.onDidDispose(remove));
		disposaBles.add(weBviewZone);
		disposaBles.add(weBview);
		disposaBles.add(weBview.onMessage(msg => this._proxy.$onDidReceiveMessage(handle, msg)));

		this._insets.set(handle, weBviewZone);
	}

	$disposeEditorInset(handle: numBer): void {
		const inset = this.getInset(handle);
		this._insets.delete(handle);
		inset.dispose();

	}

	$setHtml(handle: numBer, value: string): void {
		const inset = this.getInset(handle);
		inset.weBview.html = value;
	}

	$setOptions(handle: numBer, options: modes.IWeBviewOptions): void {
		const inset = this.getInset(handle);
		inset.weBview.contentOptions = {
			...options,
			localResourceRoots: options.localResourceRoots?.map(components => URI.from(components)),
		};
	}

	async $postMessage(handle: numBer, value: any): Promise<Boolean> {
		const inset = this.getInset(handle);
		inset.weBview.postMessage(value);
		return true;
	}

	private getInset(handle: numBer): EditorWeBviewZone {
		const inset = this._insets.get(handle);
		if (!inset) {
			throw new Error('Unknown inset');
		}
		return inset;
	}
}
