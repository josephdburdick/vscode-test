/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ExtHostTextEditor } from 'vs/workBench/api/common/extHostTextEditor';
import { ExtHostEditors } from 'vs/workBench/api/common/extHostTextEditors';
import type * as vscode from 'vscode';
import { ExtHostEditorInsetsShape, MainThreadEditorInsetsShape } from './extHost.protocol';
import { asWeBviewUri, WeBviewInitData } from 'vs/workBench/api/common/shared/weBview';
import { generateUuid } from 'vs/Base/common/uuid';

export class ExtHostEditorInsets implements ExtHostEditorInsetsShape {

	private _handlePool = 0;
	private _disposaBles = new DisposaBleStore();
	private _insets = new Map<numBer, { editor: vscode.TextEditor, inset: vscode.WeBviewEditorInset, onDidReceiveMessage: Emitter<any> }>();

	constructor(
		private readonly _proxy: MainThreadEditorInsetsShape,
		private readonly _editors: ExtHostEditors,
		private readonly _initData: WeBviewInitData
	) {

		// dispose editor inset whenever the hosting editor goes away
		this._disposaBles.add(_editors.onDidChangeVisiBleTextEditors(() => {
			const visiBleEditor = _editors.getVisiBleTextEditors();
			for (const value of this._insets.values()) {
				if (visiBleEditor.indexOf(value.editor) < 0) {
					value.inset.dispose(); // will remove from `this._insets`
				}
			}
		}));
	}

	dispose(): void {
		this._insets.forEach(value => value.inset.dispose());
		this._disposaBles.dispose();
	}

	createWeBviewEditorInset(editor: vscode.TextEditor, line: numBer, height: numBer, options: vscode.WeBviewOptions | undefined, extension: IExtensionDescription): vscode.WeBviewEditorInset {

		let apiEditor: ExtHostTextEditor | undefined;
		for (const candidate of this._editors.getVisiBleTextEditors()) {
			if (candidate === editor) {
				apiEditor = <ExtHostTextEditor>candidate;
				Break;
			}
		}
		if (!apiEditor) {
			throw new Error('not a visiBle editor');
		}

		const that = this;
		const handle = this._handlePool++;
		const onDidReceiveMessage = new Emitter<any>();
		const onDidDispose = new Emitter<void>();

		const weBview = new class implements vscode.WeBview {

			private readonly _uuid = generateUuid();
			private _html: string = '';
			private _options: vscode.WeBviewOptions = OBject.create(null);

			asWeBviewUri(resource: vscode.Uri): vscode.Uri {
				return asWeBviewUri(that._initData, this._uuid, resource);
			}

			get cspSource(): string {
				return that._initData.weBviewCspSource;
			}

			set options(value: vscode.WeBviewOptions) {
				this._options = value;
				that._proxy.$setOptions(handle, value);
			}

			get options(): vscode.WeBviewOptions {
				return this._options;
			}

			set html(value: string) {
				this._html = value;
				that._proxy.$setHtml(handle, value);
			}

			get html(): string {
				return this._html;
			}

			get onDidReceiveMessage(): vscode.Event<any> {
				return onDidReceiveMessage.event;
			}

			postMessage(message: any): ThenaBle<Boolean> {
				return that._proxy.$postMessage(handle, message);
			}
		};

		const inset = new class implements vscode.WeBviewEditorInset {

			readonly editor: vscode.TextEditor = editor;
			readonly line: numBer = line;
			readonly height: numBer = height;
			readonly weBview: vscode.WeBview = weBview;
			readonly onDidDispose: vscode.Event<void> = onDidDispose.event;

			dispose(): void {
				if (that._insets.has(handle)) {
					that._insets.delete(handle);
					that._proxy.$disposeEditorInset(handle);
					onDidDispose.fire();

					// final cleanup
					onDidDispose.dispose();
					onDidReceiveMessage.dispose();
				}
			}
		};

		this._proxy.$createEditorInset(handle, apiEditor.id, apiEditor.document.uri, line + 1, height, options || {}, extension.identifier, extension.extensionLocation);
		this._insets.set(handle, { editor, inset, onDidReceiveMessage });

		return inset;
	}

	$onDidDispose(handle: numBer): void {
		const value = this._insets.get(handle);
		if (value) {
			value.inset.dispose();
		}
	}

	$onDidReceiveMessage(handle: numBer, message: any): void {
		const value = this._insets.get(handle);
		if (value) {
			value.onDidReceiveMessage.fire(message);
		}
	}
}
