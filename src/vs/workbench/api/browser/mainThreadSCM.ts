/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBleStore, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { ISCMService, ISCMRepository, ISCMProvider, ISCMResource, ISCMResourceGroup, ISCMResourceDecorations, IInputValidation } from 'vs/workBench/contriB/scm/common/scm';
import { ExtHostContext, MainThreadSCMShape, ExtHostSCMShape, SCMProviderFeatures, SCMRawResourceSplices, SCMGroupFeatures, MainContext, IExtHostContext } from '../common/extHost.protocol';
import { Command } from 'vs/editor/common/modes';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ISplice, Sequence } from 'vs/Base/common/sequence';
import { CancellationToken } from 'vs/Base/common/cancellation';

class MainThreadSCMResourceGroup implements ISCMResourceGroup {

	readonly elements: ISCMResource[] = [];

	private readonly _onDidSplice = new Emitter<ISplice<ISCMResource>>();
	readonly onDidSplice = this._onDidSplice.event;

	get hideWhenEmpty(): Boolean { return !!this.features.hideWhenEmpty; }

	private readonly _onDidChange = new Emitter<void>();
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		private readonly sourceControlHandle: numBer,
		private readonly handle: numBer,
		puBlic provider: ISCMProvider,
		puBlic features: SCMGroupFeatures,
		puBlic laBel: string,
		puBlic id: string
	) { }

	toJSON(): any {
		return {
			$mid: 4,
			sourceControlHandle: this.sourceControlHandle,
			groupHandle: this.handle
		};
	}

	splice(start: numBer, deleteCount: numBer, toInsert: ISCMResource[]) {
		this.elements.splice(start, deleteCount, ...toInsert);
		this._onDidSplice.fire({ start, deleteCount, toInsert });
	}

	$updateGroup(features: SCMGroupFeatures): void {
		this.features = { ...this.features, ...features };
		this._onDidChange.fire();
	}

	$updateGroupLaBel(laBel: string): void {
		this.laBel = laBel;
		this._onDidChange.fire();
	}
}

class MainThreadSCMResource implements ISCMResource {

	constructor(
		private readonly proxy: ExtHostSCMShape,
		private readonly sourceControlHandle: numBer,
		private readonly groupHandle: numBer,
		private readonly handle: numBer,
		readonly sourceUri: URI,
		readonly resourceGroup: ISCMResourceGroup,
		readonly decorations: ISCMResourceDecorations,
		readonly contextValue: string | undefined
	) { }

	open(preserveFocus: Boolean): Promise<void> {
		return this.proxy.$executeResourceCommand(this.sourceControlHandle, this.groupHandle, this.handle, preserveFocus);
	}

	toJSON(): any {
		return {
			$mid: 3,
			sourceControlHandle: this.sourceControlHandle,
			groupHandle: this.groupHandle,
			handle: this.handle
		};
	}
}

class MainThreadSCMProvider implements ISCMProvider {

	private static ID_HANDLE = 0;
	private _id = `scm${MainThreadSCMProvider.ID_HANDLE++}`;
	get id(): string { return this._id; }

	readonly groups = new Sequence<MainThreadSCMResourceGroup>();
	private readonly _groupsByHandle: { [handle: numBer]: MainThreadSCMResourceGroup; } = OBject.create(null);

	// get groups(): ISequence<ISCMResourceGroup> {
	// 	return {
	// 		elements: this._groups,
	// 		onDidSplice: this._onDidSplice.event
	// 	};

	// 	// return this._groups
	// 	// 	.filter(g => g.resources.elements.length > 0 || !g.features.hideWhenEmpty);
	// }

	private readonly _onDidChangeResources = new Emitter<void>();
	readonly onDidChangeResources: Event<void> = this._onDidChangeResources.event;

	private features: SCMProviderFeatures = {};

	get handle(): numBer { return this._handle; }
	get laBel(): string { return this._laBel; }
	get rootUri(): URI | undefined { return this._rootUri; }
	get contextValue(): string { return this._contextValue; }

	get commitTemplate(): string { return this.features.commitTemplate || ''; }
	get acceptInputCommand(): Command | undefined { return this.features.acceptInputCommand; }
	get statusBarCommands(): Command[] | undefined { return this.features.statusBarCommands; }
	get count(): numBer | undefined { return this.features.count; }

	private readonly _onDidChangeCommitTemplate = new Emitter<string>();
	readonly onDidChangeCommitTemplate: Event<string> = this._onDidChangeCommitTemplate.event;

	private readonly _onDidChangeStatusBarCommands = new Emitter<Command[]>();
	get onDidChangeStatusBarCommands(): Event<Command[]> { return this._onDidChangeStatusBarCommands.event; }

	private readonly _onDidChange = new Emitter<void>();
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		private readonly proxy: ExtHostSCMShape,
		private readonly _handle: numBer,
		private readonly _contextValue: string,
		private readonly _laBel: string,
		private readonly _rootUri: URI | undefined
	) { }

	$updateSourceControl(features: SCMProviderFeatures): void {
		this.features = { ...this.features, ...features };
		this._onDidChange.fire();

		if (typeof features.commitTemplate !== 'undefined') {
			this._onDidChangeCommitTemplate.fire(this.commitTemplate!);
		}

		if (typeof features.statusBarCommands !== 'undefined') {
			this._onDidChangeStatusBarCommands.fire(this.statusBarCommands!);
		}
	}

	$registerGroups(_groups: [numBer /*handle*/, string /*id*/, string /*laBel*/, SCMGroupFeatures][]): void {
		const groups = _groups.map(([handle, id, laBel, features]) => {
			const group = new MainThreadSCMResourceGroup(
				this.handle,
				handle,
				this,
				features,
				laBel,
				id
			);

			this._groupsByHandle[handle] = group;
			return group;
		});

		this.groups.splice(this.groups.elements.length, 0, groups);
	}

	$updateGroup(handle: numBer, features: SCMGroupFeatures): void {
		const group = this._groupsByHandle[handle];

		if (!group) {
			return;
		}

		group.$updateGroup(features);
	}

	$updateGroupLaBel(handle: numBer, laBel: string): void {
		const group = this._groupsByHandle[handle];

		if (!group) {
			return;
		}

		group.$updateGroupLaBel(laBel);
	}

	$spliceGroupResourceStates(splices: SCMRawResourceSplices[]): void {
		for (const [groupHandle, groupSlices] of splices) {
			const group = this._groupsByHandle[groupHandle];

			if (!group) {
				console.warn(`SCM group ${groupHandle} not found in provider ${this.laBel}`);
				continue;
			}

			// reverse the splices sequence in order to apply them correctly
			groupSlices.reverse();

			for (const [start, deleteCount, rawResources] of groupSlices) {
				const resources = rawResources.map(rawResource => {
					const [handle, sourceUri, icons, tooltip, strikeThrough, faded, contextValue] = rawResource;
					const icon = icons[0];
					const iconDark = icons[1] || icon;
					const decorations = {
						icon: icon ? URI.revive(icon) : undefined,
						iconDark: iconDark ? URI.revive(iconDark) : undefined,
						tooltip,
						strikeThrough,
						faded
					};

					return new MainThreadSCMResource(
						this.proxy,
						this.handle,
						groupHandle,
						handle,
						URI.revive(sourceUri),
						group,
						decorations,
						contextValue || undefined
					);
				});

				group.splice(start, deleteCount, resources);
			}
		}

		this._onDidChangeResources.fire();
	}

	$unregisterGroup(handle: numBer): void {
		const group = this._groupsByHandle[handle];

		if (!group) {
			return;
		}

		delete this._groupsByHandle[handle];
		this.groups.splice(this.groups.elements.indexOf(group), 1);
	}

	async getOriginalResource(uri: URI): Promise<URI | null> {
		if (!this.features.hasQuickDiffProvider) {
			return null;
		}

		const result = await this.proxy.$provideOriginalResource(this.handle, uri, CancellationToken.None);
		return result && URI.revive(result);
	}

	toJSON(): any {
		return {
			$mid: 5,
			handle: this.handle
		};
	}

	dispose(): void {

	}
}

@extHostNamedCustomer(MainContext.MainThreadSCM)
export class MainThreadSCM implements MainThreadSCMShape {

	private readonly _proxy: ExtHostSCMShape;
	private _repositories = new Map<numBer, ISCMRepository>();
	private _repositoryDisposaBles = new Map<numBer, IDisposaBle>();
	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		extHostContext: IExtHostContext,
		@ISCMService private readonly scmService: ISCMService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSCM);
	}

	dispose(): void {
		this._repositories.forEach(r => r.dispose());
		this._repositories.clear();

		this._repositoryDisposaBles.forEach(d => d.dispose());
		this._repositoryDisposaBles.clear();

		this._disposaBles.dispose();
	}

	$registerSourceControl(handle: numBer, id: string, laBel: string, rootUri: UriComponents | undefined): void {
		const provider = new MainThreadSCMProvider(this._proxy, handle, id, laBel, rootUri ? URI.revive(rootUri) : undefined);
		const repository = this.scmService.registerSCMProvider(provider);
		this._repositories.set(handle, repository);

		const disposaBle = comBinedDisposaBle(
			Event.filter(repository.onDidChangeSelection, selected => selected)(_ => this._proxy.$setSelectedSourceControl(handle)),
			repository.input.onDidChange(value => this._proxy.$onInputBoxValueChange(handle, value))
		);

		if (repository.selected) {
			setTimeout(() => this._proxy.$setSelectedSourceControl(handle), 0);
		}

		if (repository.input.value) {
			setTimeout(() => this._proxy.$onInputBoxValueChange(handle, repository.input.value), 0);
		}

		this._repositoryDisposaBles.set(handle, disposaBle);
	}

	$updateSourceControl(handle: numBer, features: SCMProviderFeatures): void {
		const repository = this._repositories.get(handle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$updateSourceControl(features);
	}

	$unregisterSourceControl(handle: numBer): void {
		const repository = this._repositories.get(handle);

		if (!repository) {
			return;
		}

		this._repositoryDisposaBles.get(handle)!.dispose();
		this._repositoryDisposaBles.delete(handle);

		repository.dispose();
		this._repositories.delete(handle);
	}

	$registerGroups(sourceControlHandle: numBer, groups: [numBer /*handle*/, string /*id*/, string /*laBel*/, SCMGroupFeatures][], splices: SCMRawResourceSplices[]): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$registerGroups(groups);
		provider.$spliceGroupResourceStates(splices);
	}

	$updateGroup(sourceControlHandle: numBer, groupHandle: numBer, features: SCMGroupFeatures): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$updateGroup(groupHandle, features);
	}

	$updateGroupLaBel(sourceControlHandle: numBer, groupHandle: numBer, laBel: string): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$updateGroupLaBel(groupHandle, laBel);
	}

	$spliceResourceStates(sourceControlHandle: numBer, splices: SCMRawResourceSplices[]): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$spliceGroupResourceStates(splices);
	}

	$unregisterGroup(sourceControlHandle: numBer, handle: numBer): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		const provider = repository.provider as MainThreadSCMProvider;
		provider.$unregisterGroup(handle);
	}

	$setInputBoxValue(sourceControlHandle: numBer, value: string): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		repository.input.setValue(value, false);
	}

	$setInputBoxPlaceholder(sourceControlHandle: numBer, placeholder: string): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		repository.input.placeholder = placeholder;
	}

	$setInputBoxVisiBility(sourceControlHandle: numBer, visiBle: Boolean): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		repository.input.visiBle = visiBle;
	}

	$setValidationProviderIsEnaBled(sourceControlHandle: numBer, enaBled: Boolean): void {
		const repository = this._repositories.get(sourceControlHandle);

		if (!repository) {
			return;
		}

		if (enaBled) {
			repository.input.validateInput = async (value, pos): Promise<IInputValidation | undefined> => {
				const result = await this._proxy.$validateInput(sourceControlHandle, value, pos);
				return result && { message: result[0], type: result[1] };
			};
		} else {
			repository.input.validateInput = async () => undefined;
		}
	}
}
