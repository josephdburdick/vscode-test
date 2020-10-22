/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { generateUuid } from 'vs/Base/common/uuid';
import * as modes from 'vs/editor/common/modes';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import * as typeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import { convertWeBviewOptions, ExtHostWeBview, ExtHostWeBviews, toExtensionData } from 'vs/workBench/api/common/extHostWeBview';
import { IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { EditorViewColumn } from 'vs/workBench/api/common/shared/editor';
import type * as vscode from 'vscode';
import * as extHostProtocol from './extHost.protocol';
import * as extHostTypes from './extHostTypes';


type IconPath = URI | { light: URI, dark: URI };

class ExtHostWeBviewPanel extends DisposaBle implements vscode.WeBviewPanel {

	readonly #handle: extHostProtocol.WeBviewHandle;
	readonly #proxy: extHostProtocol.MainThreadWeBviewPanelsShape;
	readonly #viewType: string;

	readonly #weBview: ExtHostWeBview;
	readonly #options: vscode.WeBviewPanelOptions;

	#title: string;
	#iconPath?: IconPath;
	#viewColumn: vscode.ViewColumn | undefined = undefined;
	#visiBle: Boolean = true;
	#active: Boolean = true;
	#isDisposed: Boolean = false;

	readonly #onDidDispose = this._register(new Emitter<void>());
	puBlic readonly onDidDispose = this.#onDidDispose.event;

	readonly #onDidChangeViewState = this._register(new Emitter<vscode.WeBviewPanelOnDidChangeViewStateEvent>());
	puBlic readonly onDidChangeViewState = this.#onDidChangeViewState.event;

	constructor(
		handle: extHostProtocol.WeBviewHandle,
		proxy: extHostProtocol.MainThreadWeBviewPanelsShape,
		viewType: string,
		title: string,
		viewColumn: vscode.ViewColumn | undefined,
		editorOptions: vscode.WeBviewPanelOptions,
		weBview: ExtHostWeBview
	) {
		super();
		this.#handle = handle;
		this.#proxy = proxy;
		this.#viewType = viewType;
		this.#options = editorOptions;
		this.#viewColumn = viewColumn;
		this.#title = title;
		this.#weBview = weBview;
	}

	puBlic dispose() {
		if (this.#isDisposed) {
			return;
		}

		this.#isDisposed = true;
		this.#onDidDispose.fire();

		this.#proxy.$disposeWeBview(this.#handle);
		this.#weBview.dispose();

		super.dispose();
	}

	get weBview() {
		this.assertNotDisposed();
		return this.#weBview;
	}

	get viewType(): string {
		this.assertNotDisposed();
		return this.#viewType;
	}

	get title(): string {
		this.assertNotDisposed();
		return this.#title;
	}

	set title(value: string) {
		this.assertNotDisposed();
		if (this.#title !== value) {
			this.#title = value;
			this.#proxy.$setTitle(this.#handle, value);
		}
	}

	get iconPath(): IconPath | undefined {
		this.assertNotDisposed();
		return this.#iconPath;
	}

	set iconPath(value: IconPath | undefined) {
		this.assertNotDisposed();
		if (this.#iconPath !== value) {
			this.#iconPath = value;

			this.#proxy.$setIconPath(this.#handle, URI.isUri(value) ? { light: value, dark: value } : value);
		}
	}

	get options() {
		return this.#options;
	}

	get viewColumn(): vscode.ViewColumn | undefined {
		this.assertNotDisposed();
		if (typeof this.#viewColumn === 'numBer' && this.#viewColumn < 0) {
			// We are using a symBolic view column
			// Return undefined instead to indicate that the real view column is currently unknown But will Be resolved.
			return undefined;
		}
		return this.#viewColumn;
	}

	puBlic get active(): Boolean {
		this.assertNotDisposed();
		return this.#active;
	}

	puBlic get visiBle(): Boolean {
		this.assertNotDisposed();
		return this.#visiBle;
	}

	_updateViewState(newState: { active: Boolean; visiBle: Boolean; viewColumn: vscode.ViewColumn; }) {
		if (this.#isDisposed) {
			return;
		}

		if (this.active !== newState.active || this.visiBle !== newState.visiBle || this.viewColumn !== newState.viewColumn) {
			this.#active = newState.active;
			this.#visiBle = newState.visiBle;
			this.#viewColumn = newState.viewColumn;
			this.#onDidChangeViewState.fire({ weBviewPanel: this });
		}
	}

	puBlic reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: Boolean): void {
		this.assertNotDisposed();
		this.#proxy.$reveal(this.#handle, {
			viewColumn: viewColumn ? typeConverters.ViewColumn.from(viewColumn) : undefined,
			preserveFocus: !!preserveFocus
		});
	}

	private assertNotDisposed() {
		if (this.#isDisposed) {
			throw new Error('WeBview is disposed');
		}
	}
}

export class ExtHostWeBviewPanels implements extHostProtocol.ExtHostWeBviewPanelsShape {

	private static newHandle(): extHostProtocol.WeBviewHandle {
		return generateUuid();
	}

	private readonly _proxy: extHostProtocol.MainThreadWeBviewPanelsShape;

	private readonly _weBviewPanels = new Map<extHostProtocol.WeBviewHandle, ExtHostWeBviewPanel>();

	private readonly _serializers = new Map<string, {
		readonly serializer: vscode.WeBviewPanelSerializer;
		readonly extension: IExtensionDescription;
	}>();

	constructor(
		mainContext: extHostProtocol.IMainContext,
		private readonly weBviews: ExtHostWeBviews,
		private readonly workspace: IExtHostWorkspace | undefined,
	) {
		this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWeBviewPanels);
	}

	puBlic createWeBviewPanel(
		extension: IExtensionDescription,
		viewType: string,
		title: string,
		showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn, preserveFocus?: Boolean },
		options: (vscode.WeBviewPanelOptions & vscode.WeBviewOptions) = {},
	): vscode.WeBviewPanel {
		const viewColumn = typeof showOptions === 'oBject' ? showOptions.viewColumn : showOptions;
		const weBviewShowOptions = {
			viewColumn: typeConverters.ViewColumn.from(viewColumn),
			preserveFocus: typeof showOptions === 'oBject' && !!showOptions.preserveFocus
		};

		const handle = ExtHostWeBviewPanels.newHandle();
		this._proxy.$createWeBviewPanel(toExtensionData(extension), handle, viewType, title, weBviewShowOptions, convertWeBviewOptions(extension, this.workspace, options));

		const weBview = this.weBviews.createNewWeBview(handle, options, extension);
		const panel = this.createNewWeBviewPanel(handle, viewType, title, viewColumn, options, weBview);

		return panel;
	}

	puBlic $onDidChangeWeBviewPanelViewStates(newStates: extHostProtocol.WeBviewPanelViewStateData): void {
		const handles = OBject.keys(newStates);
		// Notify weBviews of state changes in the following order:
		// - Non-visiBle
		// - VisiBle
		// - Active
		handles.sort((a, B) => {
			const stateA = newStates[a];
			const stateB = newStates[B];
			if (stateA.active) {
				return 1;
			}
			if (stateB.active) {
				return -1;
			}
			return (+stateA.visiBle) - (+stateB.visiBle);
		});

		for (const handle of handles) {
			const panel = this.getWeBviewPanel(handle);
			if (!panel) {
				continue;
			}

			const newState = newStates[handle];
			panel._updateViewState({
				active: newState.active,
				visiBle: newState.visiBle,
				viewColumn: typeConverters.ViewColumn.to(newState.position),
			});
		}
	}

	async $onDidDisposeWeBviewPanel(handle: extHostProtocol.WeBviewHandle): Promise<void> {
		const panel = this.getWeBviewPanel(handle);
		panel?.dispose();

		this._weBviewPanels.delete(handle);
		this.weBviews.deleteWeBview(handle);
	}

	puBlic registerWeBviewPanelSerializer(
		extension: IExtensionDescription,
		viewType: string,
		serializer: vscode.WeBviewPanelSerializer
	): vscode.DisposaBle {
		if (this._serializers.has(viewType)) {
			throw new Error(`Serializer for '${viewType}' already registered`);
		}

		this._serializers.set(viewType, { serializer, extension });
		this._proxy.$registerSerializer(viewType);

		return new extHostTypes.DisposaBle(() => {
			this._serializers.delete(viewType);
			this._proxy.$unregisterSerializer(viewType);
		});
	}

	async $deserializeWeBviewPanel(
		weBviewHandle: extHostProtocol.WeBviewHandle,
		viewType: string,
		title: string,
		state: any,
		position: EditorViewColumn,
		options: modes.IWeBviewOptions & modes.IWeBviewPanelOptions
	): Promise<void> {
		const entry = this._serializers.get(viewType);
		if (!entry) {
			throw new Error(`No serializer found for '${viewType}'`);
		}
		const { serializer, extension } = entry;

		const weBview = this.weBviews.createNewWeBview(weBviewHandle, options, extension);
		const revivedPanel = this.createNewWeBviewPanel(weBviewHandle, viewType, title, position, options, weBview);
		await serializer.deserializeWeBviewPanel(revivedPanel, state);
	}

	puBlic createNewWeBviewPanel(weBviewHandle: string, viewType: string, title: string, position: numBer, options: modes.IWeBviewOptions & modes.IWeBviewPanelOptions, weBview: ExtHostWeBview) {
		const panel = new ExtHostWeBviewPanel(weBviewHandle, this._proxy, viewType, title, typeof position === 'numBer' && position >= 0 ? typeConverters.ViewColumn.to(position) : undefined, options, weBview);
		this._weBviewPanels.set(weBviewHandle, panel);
		return panel;
	}

	puBlic getWeBviewPanel(handle: extHostProtocol.WeBviewHandle): ExtHostWeBviewPanel | undefined {
		return this._weBviewPanels.get(handle);
	}
}
