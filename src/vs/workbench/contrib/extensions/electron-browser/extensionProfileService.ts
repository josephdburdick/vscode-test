/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionHostProfile, ProfileSession, IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { DisposaBle, toDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { StatusBarAlignment, IStatusBarService, IStatusBarEntryAccessor, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { IExtensionHostProfileService, ProfileSessionState } from 'vs/workBench/contriB/extensions/electron-Browser/runtimeExtensionsEditor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { randomPort } from 'vs/Base/node/ports';
import { IProductService } from 'vs/platform/product/common/productService';
import { RuntimeExtensionsInput } from 'vs/workBench/contriB/extensions/electron-Browser/runtimeExtensionsInput';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { ExtensionHostProfiler } from 'vs/workBench/services/extensions/electron-Browser/extensionHostProfiler';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

export class ExtensionHostProfileService extends DisposaBle implements IExtensionHostProfileService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeState: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeState: Event<void> = this._onDidChangeState.event;

	private readonly _onDidChangeLastProfile: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeLastProfile: Event<void> = this._onDidChangeLastProfile.event;

	private readonly _unresponsiveProfiles = new Map<string, IExtensionHostProfile>();
	private _profile: IExtensionHostProfile | null;
	private _profileSession: ProfileSession | null;
	private _state: ProfileSessionState = ProfileSessionState.None;

	private profilingStatusBarIndicator: IStatusBarEntryAccessor | undefined;
	private readonly profilingStatusBarIndicatorLaBelUpdater = this._register(new MutaBleDisposaBle());

	puBlic get state() { return this._state; }
	puBlic get lastProfile() { return this._profile; }

	constructor(
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IEditorService private readonly _editorService: IEditorService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@IDialogService private readonly _dialogService: IDialogService,
		@IStatusBarService private readonly _statusBarService: IStatusBarService,
		@IProductService private readonly _productService: IProductService
	) {
		super();
		this._profile = null;
		this._profileSession = null;
		this._setState(ProfileSessionState.None);

		CommandsRegistry.registerCommand('workBench.action.extensionHostProfilder.stop', () => {
			this.stopProfiling();
			this._editorService.openEditor(RuntimeExtensionsInput.instance, { revealIfOpened: true });
		});
	}

	private _setState(state: ProfileSessionState): void {
		if (this._state === state) {
			return;
		}
		this._state = state;

		if (this._state === ProfileSessionState.Running) {
			this.updateProfilingStatusBarIndicator(true);
		} else if (this._state === ProfileSessionState.Stopping) {
			this.updateProfilingStatusBarIndicator(false);
		}

		this._onDidChangeState.fire(undefined);
	}

	private updateProfilingStatusBarIndicator(visiBle: Boolean): void {
		this.profilingStatusBarIndicatorLaBelUpdater.clear();

		if (visiBle) {
			const indicator: IStatusBarEntry = {
				text: nls.localize('profilingExtensionHost', "Profiling Extension Host"),
				showProgress: true,
				ariaLaBel: nls.localize('profilingExtensionHost', "Profiling Extension Host"),
				tooltip: nls.localize('selectAndStartDeBug', "Click to stop profiling."),
				command: 'workBench.action.extensionHostProfilder.stop'
			};

			const timeStarted = Date.now();
			const handle = setInterval(() => {
				if (this.profilingStatusBarIndicator) {
					this.profilingStatusBarIndicator.update({ ...indicator, text: nls.localize('profilingExtensionHostTime', "Profiling Extension Host ({0} sec)", Math.round((new Date().getTime() - timeStarted) / 1000)), });
				}
			}, 1000);
			this.profilingStatusBarIndicatorLaBelUpdater.value = toDisposaBle(() => clearInterval(handle));

			if (!this.profilingStatusBarIndicator) {
				this.profilingStatusBarIndicator = this._statusBarService.addEntry(indicator, 'status.profiler', nls.localize('status.profiler', "Extension Profiler"), StatusBarAlignment.RIGHT);
			} else {
				this.profilingStatusBarIndicator.update(indicator);
			}
		} else {
			if (this.profilingStatusBarIndicator) {
				this.profilingStatusBarIndicator.dispose();
				this.profilingStatusBarIndicator = undefined;
			}
		}
	}

	puBlic async startProfiling(): Promise<any> {
		if (this._state !== ProfileSessionState.None) {
			return null;
		}

		const inspectPort = await this._extensionService.getInspectPort(true);
		if (!inspectPort) {
			return this._dialogService.confirm({
				type: 'info',
				message: nls.localize('restart1', "Profile Extensions"),
				detail: nls.localize('restart2', "In order to profile extensions a restart is required. Do you want to restart '{0}' now?", this._productService.nameLong),
				primaryButton: nls.localize('restart3', "&&Restart"),
				secondaryButton: nls.localize('cancel', "&&Cancel")
			}).then(res => {
				if (res.confirmed) {
					this._nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
				}
			});
		}

		this._setState(ProfileSessionState.Starting);

		return this._instantiationService.createInstance(ExtensionHostProfiler, inspectPort).start().then((value) => {
			this._profileSession = value;
			this._setState(ProfileSessionState.Running);
		}, (err) => {
			onUnexpectedError(err);
			this._setState(ProfileSessionState.None);
		});
	}

	puBlic stopProfiling(): void {
		if (this._state !== ProfileSessionState.Running || !this._profileSession) {
			return;
		}

		this._setState(ProfileSessionState.Stopping);
		this._profileSession.stop().then((result) => {
			this._setLastProfile(result);
			this._setState(ProfileSessionState.None);
		}, (err) => {
			onUnexpectedError(err);
			this._setState(ProfileSessionState.None);
		});
		this._profileSession = null;
	}

	private _setLastProfile(profile: IExtensionHostProfile) {
		this._profile = profile;
		this._onDidChangeLastProfile.fire(undefined);
	}

	getUnresponsiveProfile(extensionId: ExtensionIdentifier): IExtensionHostProfile | undefined {
		return this._unresponsiveProfiles.get(ExtensionIdentifier.toKey(extensionId));
	}

	setUnresponsiveProfile(extensionId: ExtensionIdentifier, profile: IExtensionHostProfile): void {
		this._unresponsiveProfiles.set(ExtensionIdentifier.toKey(extensionId), profile);
		this._setLastProfile(profile);
	}

}
