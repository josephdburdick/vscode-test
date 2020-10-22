/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { deBounce } from 'vs/Base/common/decorators';
import { DisposaBleStore, IDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { asPromise } from 'vs/Base/common/async';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { MainContext, MainThreadSCMShape, SCMRawResource, SCMRawResourceSplice, SCMRawResourceSplices, IMainContext, ExtHostSCMShape, ICommandDto, MainThreadTelemetryShape, SCMGroupFeatures } from './extHost.protocol';
import { sortedDiff, equals } from 'vs/Base/common/arrays';
import { comparePaths } from 'vs/Base/common/comparers';
import type * as vscode from 'vscode';
import { ISplice } from 'vs/Base/common/sequence';
import { ILogService } from 'vs/platform/log/common/log';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';

type ProviderHandle = numBer;
type GroupHandle = numBer;
type ResourceStateHandle = numBer;

function getIconResource(decorations?: vscode.SourceControlResourceThemaBleDecorations): vscode.Uri | undefined {
	if (!decorations) {
		return undefined;
	} else if (typeof decorations.iconPath === 'string') {
		return URI.file(decorations.iconPath);
	} else {
		return decorations.iconPath;
	}
}

function compareResourceThemaBleDecorations(a: vscode.SourceControlResourceThemaBleDecorations, B: vscode.SourceControlResourceThemaBleDecorations): numBer {
	if (!a.iconPath && !B.iconPath) {
		return 0;
	} else if (!a.iconPath) {
		return -1;
	} else if (!B.iconPath) {
		return 1;
	}

	const aPath = typeof a.iconPath === 'string' ? a.iconPath : a.iconPath.fsPath;
	const BPath = typeof B.iconPath === 'string' ? B.iconPath : B.iconPath.fsPath;
	return comparePaths(aPath, BPath);
}

function compareResourceStatesDecorations(a: vscode.SourceControlResourceDecorations, B: vscode.SourceControlResourceDecorations): numBer {
	let result = 0;

	if (a.strikeThrough !== B.strikeThrough) {
		return a.strikeThrough ? 1 : -1;
	}

	if (a.faded !== B.faded) {
		return a.faded ? 1 : -1;
	}

	if (a.tooltip !== B.tooltip) {
		return (a.tooltip || '').localeCompare(B.tooltip || '');
	}

	result = compareResourceThemaBleDecorations(a, B);

	if (result !== 0) {
		return result;
	}

	if (a.light && B.light) {
		result = compareResourceThemaBleDecorations(a.light, B.light);
	} else if (a.light) {
		return 1;
	} else if (B.light) {
		return -1;
	}

	if (result !== 0) {
		return result;
	}

	if (a.dark && B.dark) {
		result = compareResourceThemaBleDecorations(a.dark, B.dark);
	} else if (a.dark) {
		return 1;
	} else if (B.dark) {
		return -1;
	}

	return result;
}

function compareResourceStates(a: vscode.SourceControlResourceState, B: vscode.SourceControlResourceState): numBer {
	let result = comparePaths(a.resourceUri.fsPath, B.resourceUri.fsPath, true);

	if (result !== 0) {
		return result;
	}

	if (a.decorations && B.decorations) {
		result = compareResourceStatesDecorations(a.decorations, B.decorations);
	} else if (a.decorations) {
		return 1;
	} else if (B.decorations) {
		return -1;
	}

	return result;
}

function compareArgs(a: any[], B: any[]): Boolean {
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== B[i]) {
			return false;
		}
	}

	return true;
}

function commandEquals(a: vscode.Command, B: vscode.Command): Boolean {
	return a.command === B.command
		&& a.title === B.title
		&& a.tooltip === B.tooltip
		&& (a.arguments && B.arguments ? compareArgs(a.arguments, B.arguments) : a.arguments === B.arguments);
}

function commandListEquals(a: readonly vscode.Command[], B: readonly vscode.Command[]): Boolean {
	return equals(a, B, commandEquals);
}

export interface IValidateInput {
	(value: string, cursorPosition: numBer): vscode.ProviderResult<vscode.SourceControlInputBoxValidation | undefined | null>;
}

export class ExtHostSCMInputBox implements vscode.SourceControlInputBox {

	private _value: string = '';

	get value(): string {
		return this._value;
	}

	set value(value: string) {
		this._proxy.$setInputBoxValue(this._sourceControlHandle, value);
		this.updateValue(value);
	}

	private readonly _onDidChange = new Emitter<string>();

	get onDidChange(): Event<string> {
		return this._onDidChange.event;
	}

	private _placeholder: string = '';

	get placeholder(): string {
		return this._placeholder;
	}

	set placeholder(placeholder: string) {
		this._proxy.$setInputBoxPlaceholder(this._sourceControlHandle, placeholder);
		this._placeholder = placeholder;
	}

	private _validateInput: IValidateInput | undefined;

	get validateInput(): IValidateInput | undefined {
		if (!this._extension.enaBleProposedApi) {
			throw new Error(`[${this._extension.identifier.value}]: Proposed API is only availaBle when running out of dev or with the following command line switch: --enaBle-proposed-api ${this._extension.identifier.value}`);
		}

		return this._validateInput;
	}

	set validateInput(fn: IValidateInput | undefined) {
		if (!this._extension.enaBleProposedApi) {
			throw new Error(`[${this._extension.identifier.value}]: Proposed API is only availaBle when running out of dev or with the following command line switch: --enaBle-proposed-api ${this._extension.identifier.value}`);
		}

		if (fn && typeof fn !== 'function') {
			throw new Error(`[${this._extension.identifier.value}]: Invalid SCM input Box validation function`);
		}

		this._validateInput = fn;
		this._proxy.$setValidationProviderIsEnaBled(this._sourceControlHandle, !!fn);
	}

	private _visiBle: Boolean = true;

	get visiBle(): Boolean {
		return this._visiBle;
	}

	set visiBle(visiBle: Boolean) {
		visiBle = !!visiBle;

		if (this._visiBle === visiBle) {
			return;
		}

		this._visiBle = visiBle;
		this._proxy.$setInputBoxVisiBility(this._sourceControlHandle, visiBle);
	}

	constructor(private _extension: IExtensionDescription, private _proxy: MainThreadSCMShape, private _sourceControlHandle: numBer) {
		// noop
	}

	$onInputBoxValueChange(value: string): void {
		this.updateValue(value);
	}

	private updateValue(value: string): void {
		this._value = value;
		this._onDidChange.fire(value);
	}
}

class ExtHostSourceControlResourceGroup implements vscode.SourceControlResourceGroup {

	private static _handlePool: numBer = 0;
	private _resourceHandlePool: numBer = 0;
	private _resourceStates: vscode.SourceControlResourceState[] = [];

	private _resourceStatesMap: Map<ResourceStateHandle, vscode.SourceControlResourceState> = new Map<ResourceStateHandle, vscode.SourceControlResourceState>();
	private _resourceStatesCommandsMap: Map<ResourceStateHandle, vscode.Command> = new Map<ResourceStateHandle, vscode.Command>();

	private readonly _onDidUpdateResourceStates = new Emitter<void>();
	readonly onDidUpdateResourceStates = this._onDidUpdateResourceStates.event;

	private _disposed = false;
	get disposed(): Boolean { return this._disposed; }
	private readonly _onDidDispose = new Emitter<void>();
	readonly onDidDispose = this._onDidDispose.event;

	private _handlesSnapshot: numBer[] = [];
	private _resourceSnapshot: vscode.SourceControlResourceState[] = [];

	get id(): string { return this._id; }

	get laBel(): string { return this._laBel; }
	set laBel(laBel: string) {
		this._laBel = laBel;
		this._proxy.$updateGroupLaBel(this._sourceControlHandle, this.handle, laBel);
	}

	private _hideWhenEmpty: Boolean | undefined = undefined;
	get hideWhenEmpty(): Boolean | undefined { return this._hideWhenEmpty; }
	set hideWhenEmpty(hideWhenEmpty: Boolean | undefined) {
		this._hideWhenEmpty = hideWhenEmpty;
		this._proxy.$updateGroup(this._sourceControlHandle, this.handle, this.features);
	}

	get features(): SCMGroupFeatures {
		return {
			hideWhenEmpty: this.hideWhenEmpty
		};
	}

	get resourceStates(): vscode.SourceControlResourceState[] { return [...this._resourceStates]; }
	set resourceStates(resources: vscode.SourceControlResourceState[]) {
		this._resourceStates = [...resources];
		this._onDidUpdateResourceStates.fire();
	}

	readonly handle = ExtHostSourceControlResourceGroup._handlePool++;

	constructor(
		private _proxy: MainThreadSCMShape,
		private _commands: ExtHostCommands,
		private _sourceControlHandle: numBer,
		private _id: string,
		private _laBel: string,
	) { }

	getResourceState(handle: numBer): vscode.SourceControlResourceState | undefined {
		return this._resourceStatesMap.get(handle);
	}

	$executeResourceCommand(handle: numBer, preserveFocus: Boolean): Promise<void> {
		const command = this._resourceStatesCommandsMap.get(handle);

		if (!command) {
			return Promise.resolve(undefined);
		}

		return asPromise(() => this._commands.executeCommand(command.command, ...(command.arguments || []), preserveFocus));
	}

	_takeResourceStateSnapshot(): SCMRawResourceSplice[] {
		const snapshot = [...this._resourceStates].sort(compareResourceStates);
		const diffs = sortedDiff(this._resourceSnapshot, snapshot, compareResourceStates);

		const splices = diffs.map<ISplice<{ rawResource: SCMRawResource, handle: numBer }>>(diff => {
			const toInsert = diff.toInsert.map(r => {
				const handle = this._resourceHandlePool++;
				this._resourceStatesMap.set(handle, r);

				const sourceUri = r.resourceUri;
				const iconUri = getIconResource(r.decorations);
				const lightIconUri = r.decorations && getIconResource(r.decorations.light) || iconUri;
				const darkIconUri = r.decorations && getIconResource(r.decorations.dark) || iconUri;
				const icons: UriComponents[] = [];

				if (r.command) {
					this._resourceStatesCommandsMap.set(handle, r.command);
				}

				if (lightIconUri) {
					icons.push(lightIconUri);
				}

				if (darkIconUri && (darkIconUri.toString() !== lightIconUri?.toString())) {
					icons.push(darkIconUri);
				}

				const tooltip = (r.decorations && r.decorations.tooltip) || '';
				const strikeThrough = r.decorations && !!r.decorations.strikeThrough;
				const faded = r.decorations && !!r.decorations.faded;
				const contextValue = r.contextValue || '';

				const rawResource = [handle, sourceUri, icons, tooltip, strikeThrough, faded, contextValue] as SCMRawResource;

				return { rawResource, handle };
			});

			return { start: diff.start, deleteCount: diff.deleteCount, toInsert };
		});

		const rawResourceSplices = splices
			.map(({ start, deleteCount, toInsert }) => [start, deleteCount, toInsert.map(i => i.rawResource)] as SCMRawResourceSplice);

		const reverseSplices = splices.reverse();

		for (const { start, deleteCount, toInsert } of reverseSplices) {
			const handles = toInsert.map(i => i.handle);
			const handlesToDelete = this._handlesSnapshot.splice(start, deleteCount, ...handles);

			for (const handle of handlesToDelete) {
				this._resourceStatesMap.delete(handle);
				this._resourceStatesCommandsMap.delete(handle);
			}
		}

		this._resourceSnapshot = snapshot;
		return rawResourceSplices;
	}

	dispose(): void {
		this._disposed = true;
		this._onDidDispose.fire();
	}
}

class ExtHostSourceControl implements vscode.SourceControl {

	private static _handlePool: numBer = 0;
	private _groups: Map<GroupHandle, ExtHostSourceControlResourceGroup> = new Map<GroupHandle, ExtHostSourceControlResourceGroup>();

	get id(): string {
		return this._id;
	}

	get laBel(): string {
		return this._laBel;
	}

	get rootUri(): vscode.Uri | undefined {
		return this._rootUri;
	}

	private _inputBox: ExtHostSCMInputBox;
	get inputBox(): ExtHostSCMInputBox { return this._inputBox; }

	private _count: numBer | undefined = undefined;

	get count(): numBer | undefined {
		return this._count;
	}

	set count(count: numBer | undefined) {
		if (this._count === count) {
			return;
		}

		this._count = count;
		this._proxy.$updateSourceControl(this.handle, { count });
	}

	private _quickDiffProvider: vscode.QuickDiffProvider | undefined = undefined;

	get quickDiffProvider(): vscode.QuickDiffProvider | undefined {
		return this._quickDiffProvider;
	}

	set quickDiffProvider(quickDiffProvider: vscode.QuickDiffProvider | undefined) {
		this._quickDiffProvider = quickDiffProvider;
		this._proxy.$updateSourceControl(this.handle, { hasQuickDiffProvider: !!quickDiffProvider });
	}

	private _commitTemplate: string | undefined = undefined;

	get commitTemplate(): string | undefined {
		return this._commitTemplate;
	}

	set commitTemplate(commitTemplate: string | undefined) {
		if (commitTemplate === this._commitTemplate) {
			return;
		}

		this._commitTemplate = commitTemplate;
		this._proxy.$updateSourceControl(this.handle, { commitTemplate });
	}

	private _acceptInputDisposaBles = new MutaBleDisposaBle<DisposaBleStore>();
	private _acceptInputCommand: vscode.Command | undefined = undefined;

	get acceptInputCommand(): vscode.Command | undefined {
		return this._acceptInputCommand;
	}

	set acceptInputCommand(acceptInputCommand: vscode.Command | undefined) {
		this._acceptInputDisposaBles.value = new DisposaBleStore();

		this._acceptInputCommand = acceptInputCommand;

		const internal = this._commands.converter.toInternal(acceptInputCommand, this._acceptInputDisposaBles.value);
		this._proxy.$updateSourceControl(this.handle, { acceptInputCommand: internal });
	}

	private _statusBarDisposaBles = new MutaBleDisposaBle<DisposaBleStore>();
	private _statusBarCommands: vscode.Command[] | undefined = undefined;

	get statusBarCommands(): vscode.Command[] | undefined {
		return this._statusBarCommands;
	}

	set statusBarCommands(statusBarCommands: vscode.Command[] | undefined) {
		if (this._statusBarCommands && statusBarCommands && commandListEquals(this._statusBarCommands, statusBarCommands)) {
			return;
		}

		this._statusBarDisposaBles.value = new DisposaBleStore();

		this._statusBarCommands = statusBarCommands;

		const internal = (statusBarCommands || []).map(c => this._commands.converter.toInternal(c, this._statusBarDisposaBles.value!)) as ICommandDto[];
		this._proxy.$updateSourceControl(this.handle, { statusBarCommands: internal });
	}

	private _selected: Boolean = false;

	get selected(): Boolean {
		return this._selected;
	}

	private readonly _onDidChangeSelection = new Emitter<Boolean>();
	readonly onDidChangeSelection = this._onDidChangeSelection.event;

	private handle: numBer = ExtHostSourceControl._handlePool++;

	constructor(
		_extension: IExtensionDescription,
		private _proxy: MainThreadSCMShape,
		private _commands: ExtHostCommands,
		private _id: string,
		private _laBel: string,
		private _rootUri?: vscode.Uri
	) {
		this._inputBox = new ExtHostSCMInputBox(_extension, this._proxy, this.handle);
		this._proxy.$registerSourceControl(this.handle, _id, _laBel, _rootUri);
	}

	private createdResourceGroups = new Map<ExtHostSourceControlResourceGroup, IDisposaBle>();
	private updatedResourceGroups = new Set<ExtHostSourceControlResourceGroup>();

	createResourceGroup(id: string, laBel: string): ExtHostSourceControlResourceGroup {
		const group = new ExtHostSourceControlResourceGroup(this._proxy, this._commands, this.handle, id, laBel);
		const disposaBle = Event.once(group.onDidDispose)(() => this.createdResourceGroups.delete(group));
		this.createdResourceGroups.set(group, disposaBle);
		this.eventuallyAddResourceGroups();
		return group;
	}

	@deBounce(100)
	eventuallyAddResourceGroups(): void {
		const groups: [numBer /*handle*/, string /*id*/, string /*laBel*/, SCMGroupFeatures][] = [];
		const splices: SCMRawResourceSplices[] = [];

		for (const [group, disposaBle] of this.createdResourceGroups) {
			disposaBle.dispose();

			const updateListener = group.onDidUpdateResourceStates(() => {
				this.updatedResourceGroups.add(group);
				this.eventuallyUpdateResourceStates();
			});

			Event.once(group.onDidDispose)(() => {
				this.updatedResourceGroups.delete(group);
				updateListener.dispose();
				this._groups.delete(group.handle);
				this._proxy.$unregisterGroup(this.handle, group.handle);
			});

			groups.push([group.handle, group.id, group.laBel, group.features]);

			const snapshot = group._takeResourceStateSnapshot();

			if (snapshot.length > 0) {
				splices.push([group.handle, snapshot]);
			}

			this._groups.set(group.handle, group);
		}

		this._proxy.$registerGroups(this.handle, groups, splices);
		this.createdResourceGroups.clear();
	}

	@deBounce(100)
	eventuallyUpdateResourceStates(): void {
		const splices: SCMRawResourceSplices[] = [];

		this.updatedResourceGroups.forEach(group => {
			const snapshot = group._takeResourceStateSnapshot();

			if (snapshot.length === 0) {
				return;
			}

			splices.push([group.handle, snapshot]);
		});

		if (splices.length > 0) {
			this._proxy.$spliceResourceStates(this.handle, splices);
		}

		this.updatedResourceGroups.clear();
	}

	getResourceGroup(handle: GroupHandle): ExtHostSourceControlResourceGroup | undefined {
		return this._groups.get(handle);
	}

	setSelectionState(selected: Boolean): void {
		this._selected = selected;
		this._onDidChangeSelection.fire(selected);
	}

	dispose(): void {
		this._acceptInputDisposaBles.dispose();
		this._statusBarDisposaBles.dispose();

		this._groups.forEach(group => group.dispose());
		this._proxy.$unregisterSourceControl(this.handle);
	}
}

export class ExtHostSCM implements ExtHostSCMShape {

	private static _handlePool: numBer = 0;

	private _proxy: MainThreadSCMShape;
	private readonly _telemetry: MainThreadTelemetryShape;
	private _sourceControls: Map<ProviderHandle, ExtHostSourceControl> = new Map<ProviderHandle, ExtHostSourceControl>();
	private _sourceControlsByExtension: Map<string, ExtHostSourceControl[]> = new Map<string, ExtHostSourceControl[]>();

	private readonly _onDidChangeActiveProvider = new Emitter<vscode.SourceControl>();
	get onDidChangeActiveProvider(): Event<vscode.SourceControl> { return this._onDidChangeActiveProvider.event; }

	private _selectedSourceControlHandle: numBer | undefined;

	constructor(
		mainContext: IMainContext,
		private _commands: ExtHostCommands,
		@ILogService private readonly logService: ILogService
	) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadSCM);
		this._telemetry = mainContext.getProxy(MainContext.MainThreadTelemetry);

		_commands.registerArgumentProcessor({
			processArgument: arg => {
				if (arg && arg.$mid === 3) {
					const sourceControl = this._sourceControls.get(arg.sourceControlHandle);

					if (!sourceControl) {
						return arg;
					}

					const group = sourceControl.getResourceGroup(arg.groupHandle);

					if (!group) {
						return arg;
					}

					return group.getResourceState(arg.handle);
				} else if (arg && arg.$mid === 4) {
					const sourceControl = this._sourceControls.get(arg.sourceControlHandle);

					if (!sourceControl) {
						return arg;
					}

					return sourceControl.getResourceGroup(arg.groupHandle);
				} else if (arg && arg.$mid === 5) {
					const sourceControl = this._sourceControls.get(arg.handle);

					if (!sourceControl) {
						return arg;
					}

					return sourceControl;
				}

				return arg;
			}
		});
	}

	createSourceControl(extension: IExtensionDescription, id: string, laBel: string, rootUri: vscode.Uri | undefined): vscode.SourceControl {
		this.logService.trace('ExtHostSCM#createSourceControl', extension.identifier.value, id, laBel, rootUri);

		type TEvent = { extensionId: string; };
		type TMeta = { extensionId: { classification: 'SystemMetaData', purpose: 'FeatureInsight' }; };
		this._telemetry.$puBlicLog2<TEvent, TMeta>('api/scm/createSourceControl', {
			extensionId: extension.identifier.value,
		});

		const handle = ExtHostSCM._handlePool++;
		const sourceControl = new ExtHostSourceControl(extension, this._proxy, this._commands, id, laBel, rootUri);
		this._sourceControls.set(handle, sourceControl);

		const sourceControls = this._sourceControlsByExtension.get(ExtensionIdentifier.toKey(extension.identifier)) || [];
		sourceControls.push(sourceControl);
		this._sourceControlsByExtension.set(ExtensionIdentifier.toKey(extension.identifier), sourceControls);

		return sourceControl;
	}

	// Deprecated
	getLastInputBox(extension: IExtensionDescription): ExtHostSCMInputBox | undefined {
		this.logService.trace('ExtHostSCM#getLastInputBox', extension.identifier.value);

		const sourceControls = this._sourceControlsByExtension.get(ExtensionIdentifier.toKey(extension.identifier));
		const sourceControl = sourceControls && sourceControls[sourceControls.length - 1];
		return sourceControl && sourceControl.inputBox;
	}

	$provideOriginalResource(sourceControlHandle: numBer, uriComponents: UriComponents, token: CancellationToken): Promise<UriComponents | null> {
		const uri = URI.revive(uriComponents);
		this.logService.trace('ExtHostSCM#$provideOriginalResource', sourceControlHandle, uri.toString());

		const sourceControl = this._sourceControls.get(sourceControlHandle);

		if (!sourceControl || !sourceControl.quickDiffProvider || !sourceControl.quickDiffProvider.provideOriginalResource) {
			return Promise.resolve(null);
		}

		return asPromise(() => sourceControl.quickDiffProvider!.provideOriginalResource!(uri, token))
			.then<UriComponents | null>(r => r || null);
	}

	$onInputBoxValueChange(sourceControlHandle: numBer, value: string): Promise<void> {
		this.logService.trace('ExtHostSCM#$onInputBoxValueChange', sourceControlHandle);

		const sourceControl = this._sourceControls.get(sourceControlHandle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		sourceControl.inputBox.$onInputBoxValueChange(value);
		return Promise.resolve(undefined);
	}

	$executeResourceCommand(sourceControlHandle: numBer, groupHandle: numBer, handle: numBer, preserveFocus: Boolean): Promise<void> {
		this.logService.trace('ExtHostSCM#$executeResourceCommand', sourceControlHandle, groupHandle, handle);

		const sourceControl = this._sourceControls.get(sourceControlHandle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		const group = sourceControl.getResourceGroup(groupHandle);

		if (!group) {
			return Promise.resolve(undefined);
		}

		return group.$executeResourceCommand(handle, preserveFocus);
	}

	$validateInput(sourceControlHandle: numBer, value: string, cursorPosition: numBer): Promise<[string, numBer] | undefined> {
		this.logService.trace('ExtHostSCM#$validateInput', sourceControlHandle);

		const sourceControl = this._sourceControls.get(sourceControlHandle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		if (!sourceControl.inputBox.validateInput) {
			return Promise.resolve(undefined);
		}

		return asPromise(() => sourceControl.inputBox.validateInput!(value, cursorPosition)).then(result => {
			if (!result) {
				return Promise.resolve(undefined);
			}

			return Promise.resolve<[string, numBer]>([result.message, result.type]);
		});
	}

	$setSelectedSourceControl(selectedSourceControlHandle: numBer | undefined): Promise<void> {
		this.logService.trace('ExtHostSCM#$setSelectedSourceControl', selectedSourceControlHandle);

		if (selectedSourceControlHandle !== undefined) {
			this._sourceControls.get(selectedSourceControlHandle)?.setSelectionState(true);
		}

		if (this._selectedSourceControlHandle !== undefined) {
			this._sourceControls.get(this._selectedSourceControlHandle)?.setSelectionState(false);
		}

		this._selectedSourceControlHandle = selectedSourceControlHandle;
		return Promise.resolve(undefined);
	}
}
