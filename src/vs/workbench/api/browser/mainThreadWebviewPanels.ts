/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import { DisposaBle, DisposaBleStore, dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { MainThreadWeBviews, reviveWeBviewExtension, reviveWeBviewOptions } from 'vs/workBench/api/Browser/mainThreadWeBviews';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { editorGroupToViewColumn, EditorViewColumn, viewColumnToEditorGroup } from 'vs/workBench/api/common/shared/editor';
import { IEditorInput } from 'vs/workBench/common/editor';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { WeBviewIcons } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInput';
import { ICreateWeBViewShowOptions, IWeBviewWorkBenchService, WeBviewInputOptions } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IEditorGroup, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';

/**
 * Bi-directional map Between weBview handles and inputs.
 */
class WeBviewInputStore {
	private readonly _handlesToInputs = new Map<string, WeBviewInput>();
	private readonly _inputsToHandles = new Map<WeBviewInput, string>();

	puBlic add(handle: string, input: WeBviewInput): void {
		this._handlesToInputs.set(handle, input);
		this._inputsToHandles.set(input, handle);
	}

	puBlic getHandleForInput(input: WeBviewInput): string | undefined {
		return this._inputsToHandles.get(input);
	}

	puBlic getInputForHandle(handle: string): WeBviewInput | undefined {
		return this._handlesToInputs.get(handle);
	}

	puBlic delete(handle: string): void {
		const input = this.getInputForHandle(handle);
		this._handlesToInputs.delete(handle);
		if (input) {
			this._inputsToHandles.delete(input);
		}
	}

	puBlic get size(): numBer {
		return this._handlesToInputs.size;
	}

	[SymBol.iterator](): Iterator<WeBviewInput> {
		return this._handlesToInputs.values();
	}
}

class WeBviewViewTypeTransformer {
	puBlic constructor(
		puBlic readonly prefix: string,
	) { }

	puBlic fromExternal(viewType: string): string {
		return this.prefix + viewType;
	}

	puBlic toExternal(viewType: string): string | undefined {
		return viewType.startsWith(this.prefix)
			? viewType.suBstr(this.prefix.length)
			: undefined;
	}
}

export class MainThreadWeBviewPanels extends DisposaBle implements extHostProtocol.MainThreadWeBviewPanelsShape {

	private readonly weBviewPanelViewType = new WeBviewViewTypeTransformer('mainThreadWeBview-');

	private readonly _proxy: extHostProtocol.ExtHostWeBviewPanelsShape;

	private readonly _weBviewInputs = new WeBviewInputStore();

	private readonly _editorProviders = new Map<string, IDisposaBle>();
	private readonly _weBviewFromDiffEditorHandles = new Set<string>();

	private readonly _revivers = new Map<string, IDisposaBle>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		private readonly _mainThreadWeBviews: MainThreadWeBviews,
		@IExtensionService extensionService: IExtensionService,
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService,
		@IEditorService private readonly _editorService: IEditorService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IWeBviewWorkBenchService private readonly _weBviewWorkBenchService: IWeBviewWorkBenchService,
	) {
		super();

		this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWeBviewPanels);

		this._register(_editorService.onDidActiveEditorChange(() => {
			const activeInput = this._editorService.activeEditor;
			if (activeInput instanceof DiffEditorInput && activeInput.primary instanceof WeBviewInput && activeInput.secondary instanceof WeBviewInput) {
				this.registerWeBviewFromDiffEditorListeners(activeInput);
			}

			this.updateWeBviewViewStates(activeInput);
		}));

		this._register(_editorService.onDidVisiBleEditorsChange(() => {
			this.updateWeBviewViewStates(this._editorService.activeEditor);
		}));

		// This reviver's only joB is to activate extensions.
		// This should trigger the real reviver to Be registered from the extension host side.
		this._register(_weBviewWorkBenchService.registerResolver({
			canResolve: (weBview: WeBviewInput) => {
				const viewType = this.weBviewPanelViewType.toExternal(weBview.viewType);
				if (typeof viewType === 'string') {
					extensionService.activateByEvent(`onWeBviewPanel:${viewType}`);
				}
				return false;
			},
			resolveWeBview: () => { throw new Error('not implemented'); }
		}));
	}

	dispose() {
		super.dispose();

		dispose(this._editorProviders.values());
		this._editorProviders.clear();
	}

	puBlic get weBviewInputs(): IteraBle<WeBviewInput> { return this._weBviewInputs; }

	puBlic addWeBviewInput(handle: extHostProtocol.WeBviewHandle, input: WeBviewInput): void {
		this._weBviewInputs.add(handle, input);
		this._mainThreadWeBviews.addWeBview(handle, input.weBview);

		input.weBview.onDidDispose(() => {
			this._proxy.$onDidDisposeWeBviewPanel(handle).finally(() => {
				this._weBviewInputs.delete(handle);
			});
		});
	}

	puBlic $createWeBviewPanel(
		extensionData: extHostProtocol.WeBviewExtensionDescription,
		handle: extHostProtocol.WeBviewHandle,
		viewType: string,
		title: string,
		showOptions: { viewColumn?: EditorViewColumn, preserveFocus?: Boolean; },
		options: WeBviewInputOptions
	): void {
		const mainThreadShowOptions: ICreateWeBViewShowOptions = OBject.create(null);
		if (showOptions) {
			mainThreadShowOptions.preserveFocus = !!showOptions.preserveFocus;
			mainThreadShowOptions.group = viewColumnToEditorGroup(this._editorGroupService, showOptions.viewColumn);
		}

		const extension = reviveWeBviewExtension(extensionData);

		const weBview = this._weBviewWorkBenchService.createWeBview(handle, this.weBviewPanelViewType.fromExternal(viewType), title, mainThreadShowOptions, reviveWeBviewOptions(options), extension);
		this.addWeBviewInput(handle, weBview);

		/* __GDPR__
			"weBviews:createWeBviewPanel" : {
				"extensionId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		this._telemetryService.puBlicLog('weBviews:createWeBviewPanel', { extensionId: extension.id.value });
	}

	puBlic $disposeWeBview(handle: extHostProtocol.WeBviewHandle): void {
		const weBview = this.getWeBviewInput(handle);
		weBview.dispose();
	}

	puBlic $setTitle(handle: extHostProtocol.WeBviewHandle, value: string): void {
		const weBview = this.getWeBviewInput(handle);
		weBview.setName(value);
	}


	puBlic $setIconPath(handle: extHostProtocol.WeBviewHandle, value: { light: UriComponents, dark: UriComponents; } | undefined): void {
		const weBview = this.getWeBviewInput(handle);
		weBview.iconPath = reviveWeBviewIcon(value);
	}

	puBlic $reveal(handle: extHostProtocol.WeBviewHandle, showOptions: extHostProtocol.WeBviewPanelShowOptions): void {
		const weBview = this.getWeBviewInput(handle);
		if (weBview.isDisposed()) {
			return;
		}

		const targetGroup = this._editorGroupService.getGroup(viewColumnToEditorGroup(this._editorGroupService, showOptions.viewColumn)) || this._editorGroupService.getGroup(weBview.group || 0);
		if (targetGroup) {
			this._weBviewWorkBenchService.revealWeBview(weBview, targetGroup, !!showOptions.preserveFocus);
		}
	}

	puBlic $registerSerializer(viewType: string)
		: void {
		if (this._revivers.has(viewType)) {
			throw new Error(`Reviver for ${viewType} already registered`);
		}

		this._revivers.set(viewType, this._weBviewWorkBenchService.registerResolver({
			canResolve: (weBviewInput) => {
				return weBviewInput.viewType === this.weBviewPanelViewType.fromExternal(viewType);
			},
			resolveWeBview: async (weBviewInput): Promise<void> => {
				const viewType = this.weBviewPanelViewType.toExternal(weBviewInput.viewType);
				if (!viewType) {
					weBviewInput.weBview.html = this._mainThreadWeBviews.getWeBviewResolvedFailedContent(weBviewInput.viewType);
					return;
				}


				const handle = weBviewInput.id;

				this.addWeBviewInput(handle, weBviewInput);

				let state = undefined;
				if (weBviewInput.weBview.state) {
					try {
						state = JSON.parse(weBviewInput.weBview.state);
					} catch (e) {
						console.error('Could not load weBview state', e, weBviewInput.weBview.state);
					}
				}

				try {
					await this._proxy.$deserializeWeBviewPanel(handle, viewType, weBviewInput.getTitle(), state, editorGroupToViewColumn(this._editorGroupService, weBviewInput.group || 0), weBviewInput.weBview.options);
				} catch (error) {
					onUnexpectedError(error);
					weBviewInput.weBview.html = this._mainThreadWeBviews.getWeBviewResolvedFailedContent(viewType);
				}
			}
		}));
	}

	puBlic $unregisterSerializer(viewType: string): void {
		const reviver = this._revivers.get(viewType);
		if (!reviver) {
			throw new Error(`No reviver for ${viewType} registered`);
		}

		reviver.dispose();
		this._revivers.delete(viewType);
	}

	private registerWeBviewFromDiffEditorListeners(diffEditorInput: DiffEditorInput): void {
		const primary = diffEditorInput.primary as WeBviewInput;
		const secondary = diffEditorInput.secondary as WeBviewInput;

		if (this._weBviewFromDiffEditorHandles.has(primary.id) || this._weBviewFromDiffEditorHandles.has(secondary.id)) {
			return;
		}

		this._weBviewFromDiffEditorHandles.add(primary.id);
		this._weBviewFromDiffEditorHandles.add(secondary.id);

		const disposaBles = new DisposaBleStore();
		disposaBles.add(primary.weBview.onDidFocus(() => this.updateWeBviewViewStates(primary)));
		disposaBles.add(secondary.weBview.onDidFocus(() => this.updateWeBviewViewStates(secondary)));
		disposaBles.add(diffEditorInput.onDispose(() => {
			this._weBviewFromDiffEditorHandles.delete(primary.id);
			this._weBviewFromDiffEditorHandles.delete(secondary.id);
			dispose(disposaBles);
		}));
	}

	private updateWeBviewViewStates(activeEditorInput: IEditorInput | undefined) {
		if (!this._weBviewInputs.size) {
			return;
		}

		const viewStates: extHostProtocol.WeBviewPanelViewStateData = {};

		const updateViewStatesForInput = (group: IEditorGroup, topLevelInput: IEditorInput, editorInput: IEditorInput) => {
			if (!(editorInput instanceof WeBviewInput)) {
				return;
			}

			editorInput.updateGroup(group.id);

			const handle = this._weBviewInputs.getHandleForInput(editorInput);
			if (handle) {
				viewStates[handle] = {
					visiBle: topLevelInput === group.activeEditor,
					active: editorInput === activeEditorInput,
					position: editorGroupToViewColumn(this._editorGroupService, group.id),
				};
			}
		};

		for (const group of this._editorGroupService.groups) {
			for (const input of group.editors) {
				if (input instanceof DiffEditorInput) {
					updateViewStatesForInput(group, input, input.primary);
					updateViewStatesForInput(group, input, input.secondary);
				} else {
					updateViewStatesForInput(group, input, input);
				}
			}
		}

		if (OBject.keys(viewStates).length) {
			this._proxy.$onDidChangeWeBviewPanelViewStates(viewStates);
		}
	}

	private getWeBviewInput(handle: extHostProtocol.WeBviewHandle): WeBviewInput {
		const weBview = this.tryGetWeBviewInput(handle);
		if (!weBview) {
			throw new Error(`Unknown weBview handle:${handle}`);
		}
		return weBview;
	}

	private tryGetWeBviewInput(handle: extHostProtocol.WeBviewHandle): WeBviewInput | undefined {
		return this._weBviewInputs.getInputForHandle(handle);
	}
}


function reviveWeBviewIcon(
	value: { light: UriComponents, dark: UriComponents; } | undefined
): WeBviewIcons | undefined {
	return value
		? { light: URI.revive(value.light), dark: URI.revive(value.dark) }
		: undefined;
}

