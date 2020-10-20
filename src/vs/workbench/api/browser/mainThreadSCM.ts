/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IDisposAble, DisposAbleStore, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { ISCMService, ISCMRepository, ISCMProvider, ISCMResource, ISCMResourceGroup, ISCMResourceDecorAtions, IInputVAlidAtion } from 'vs/workbench/contrib/scm/common/scm';
import { ExtHostContext, MAinThreAdSCMShApe, ExtHostSCMShApe, SCMProviderFeAtures, SCMRAwResourceSplices, SCMGroupFeAtures, MAinContext, IExtHostContext } from '../common/extHost.protocol';
import { CommAnd } from 'vs/editor/common/modes';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ISplice, Sequence } from 'vs/bAse/common/sequence';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

clAss MAinThreAdSCMResourceGroup implements ISCMResourceGroup {

	reAdonly elements: ISCMResource[] = [];

	privAte reAdonly _onDidSplice = new Emitter<ISplice<ISCMResource>>();
	reAdonly onDidSplice = this._onDidSplice.event;

	get hideWhenEmpty(): booleAn { return !!this.feAtures.hideWhenEmpty; }

	privAte reAdonly _onDidChAnge = new Emitter<void>();
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	constructor(
		privAte reAdonly sourceControlHAndle: number,
		privAte reAdonly hAndle: number,
		public provider: ISCMProvider,
		public feAtures: SCMGroupFeAtures,
		public lAbel: string,
		public id: string
	) { }

	toJSON(): Any {
		return {
			$mid: 4,
			sourceControlHAndle: this.sourceControlHAndle,
			groupHAndle: this.hAndle
		};
	}

	splice(stArt: number, deleteCount: number, toInsert: ISCMResource[]) {
		this.elements.splice(stArt, deleteCount, ...toInsert);
		this._onDidSplice.fire({ stArt, deleteCount, toInsert });
	}

	$updAteGroup(feAtures: SCMGroupFeAtures): void {
		this.feAtures = { ...this.feAtures, ...feAtures };
		this._onDidChAnge.fire();
	}

	$updAteGroupLAbel(lAbel: string): void {
		this.lAbel = lAbel;
		this._onDidChAnge.fire();
	}
}

clAss MAinThreAdSCMResource implements ISCMResource {

	constructor(
		privAte reAdonly proxy: ExtHostSCMShApe,
		privAte reAdonly sourceControlHAndle: number,
		privAte reAdonly groupHAndle: number,
		privAte reAdonly hAndle: number,
		reAdonly sourceUri: URI,
		reAdonly resourceGroup: ISCMResourceGroup,
		reAdonly decorAtions: ISCMResourceDecorAtions,
		reAdonly contextVAlue: string | undefined
	) { }

	open(preserveFocus: booleAn): Promise<void> {
		return this.proxy.$executeResourceCommAnd(this.sourceControlHAndle, this.groupHAndle, this.hAndle, preserveFocus);
	}

	toJSON(): Any {
		return {
			$mid: 3,
			sourceControlHAndle: this.sourceControlHAndle,
			groupHAndle: this.groupHAndle,
			hAndle: this.hAndle
		};
	}
}

clAss MAinThreAdSCMProvider implements ISCMProvider {

	privAte stAtic ID_HANDLE = 0;
	privAte _id = `scm${MAinThreAdSCMProvider.ID_HANDLE++}`;
	get id(): string { return this._id; }

	reAdonly groups = new Sequence<MAinThreAdSCMResourceGroup>();
	privAte reAdonly _groupsByHAndle: { [hAndle: number]: MAinThreAdSCMResourceGroup; } = Object.creAte(null);

	// get groups(): ISequence<ISCMResourceGroup> {
	// 	return {
	// 		elements: this._groups,
	// 		onDidSplice: this._onDidSplice.event
	// 	};

	// 	// return this._groups
	// 	// 	.filter(g => g.resources.elements.length > 0 || !g.feAtures.hideWhenEmpty);
	// }

	privAte reAdonly _onDidChAngeResources = new Emitter<void>();
	reAdonly onDidChAngeResources: Event<void> = this._onDidChAngeResources.event;

	privAte feAtures: SCMProviderFeAtures = {};

	get hAndle(): number { return this._hAndle; }
	get lAbel(): string { return this._lAbel; }
	get rootUri(): URI | undefined { return this._rootUri; }
	get contextVAlue(): string { return this._contextVAlue; }

	get commitTemplAte(): string { return this.feAtures.commitTemplAte || ''; }
	get AcceptInputCommAnd(): CommAnd | undefined { return this.feAtures.AcceptInputCommAnd; }
	get stAtusBArCommAnds(): CommAnd[] | undefined { return this.feAtures.stAtusBArCommAnds; }
	get count(): number | undefined { return this.feAtures.count; }

	privAte reAdonly _onDidChAngeCommitTemplAte = new Emitter<string>();
	reAdonly onDidChAngeCommitTemplAte: Event<string> = this._onDidChAngeCommitTemplAte.event;

	privAte reAdonly _onDidChAngeStAtusBArCommAnds = new Emitter<CommAnd[]>();
	get onDidChAngeStAtusBArCommAnds(): Event<CommAnd[]> { return this._onDidChAngeStAtusBArCommAnds.event; }

	privAte reAdonly _onDidChAnge = new Emitter<void>();
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	constructor(
		privAte reAdonly proxy: ExtHostSCMShApe,
		privAte reAdonly _hAndle: number,
		privAte reAdonly _contextVAlue: string,
		privAte reAdonly _lAbel: string,
		privAte reAdonly _rootUri: URI | undefined
	) { }

	$updAteSourceControl(feAtures: SCMProviderFeAtures): void {
		this.feAtures = { ...this.feAtures, ...feAtures };
		this._onDidChAnge.fire();

		if (typeof feAtures.commitTemplAte !== 'undefined') {
			this._onDidChAngeCommitTemplAte.fire(this.commitTemplAte!);
		}

		if (typeof feAtures.stAtusBArCommAnds !== 'undefined') {
			this._onDidChAngeStAtusBArCommAnds.fire(this.stAtusBArCommAnds!);
		}
	}

	$registerGroups(_groups: [number /*hAndle*/, string /*id*/, string /*lAbel*/, SCMGroupFeAtures][]): void {
		const groups = _groups.mAp(([hAndle, id, lAbel, feAtures]) => {
			const group = new MAinThreAdSCMResourceGroup(
				this.hAndle,
				hAndle,
				this,
				feAtures,
				lAbel,
				id
			);

			this._groupsByHAndle[hAndle] = group;
			return group;
		});

		this.groups.splice(this.groups.elements.length, 0, groups);
	}

	$updAteGroup(hAndle: number, feAtures: SCMGroupFeAtures): void {
		const group = this._groupsByHAndle[hAndle];

		if (!group) {
			return;
		}

		group.$updAteGroup(feAtures);
	}

	$updAteGroupLAbel(hAndle: number, lAbel: string): void {
		const group = this._groupsByHAndle[hAndle];

		if (!group) {
			return;
		}

		group.$updAteGroupLAbel(lAbel);
	}

	$spliceGroupResourceStAtes(splices: SCMRAwResourceSplices[]): void {
		for (const [groupHAndle, groupSlices] of splices) {
			const group = this._groupsByHAndle[groupHAndle];

			if (!group) {
				console.wArn(`SCM group ${groupHAndle} not found in provider ${this.lAbel}`);
				continue;
			}

			// reverse the splices sequence in order to Apply them correctly
			groupSlices.reverse();

			for (const [stArt, deleteCount, rAwResources] of groupSlices) {
				const resources = rAwResources.mAp(rAwResource => {
					const [hAndle, sourceUri, icons, tooltip, strikeThrough, fAded, contextVAlue] = rAwResource;
					const icon = icons[0];
					const iconDArk = icons[1] || icon;
					const decorAtions = {
						icon: icon ? URI.revive(icon) : undefined,
						iconDArk: iconDArk ? URI.revive(iconDArk) : undefined,
						tooltip,
						strikeThrough,
						fAded
					};

					return new MAinThreAdSCMResource(
						this.proxy,
						this.hAndle,
						groupHAndle,
						hAndle,
						URI.revive(sourceUri),
						group,
						decorAtions,
						contextVAlue || undefined
					);
				});

				group.splice(stArt, deleteCount, resources);
			}
		}

		this._onDidChAngeResources.fire();
	}

	$unregisterGroup(hAndle: number): void {
		const group = this._groupsByHAndle[hAndle];

		if (!group) {
			return;
		}

		delete this._groupsByHAndle[hAndle];
		this.groups.splice(this.groups.elements.indexOf(group), 1);
	}

	Async getOriginAlResource(uri: URI): Promise<URI | null> {
		if (!this.feAtures.hAsQuickDiffProvider) {
			return null;
		}

		const result = AwAit this.proxy.$provideOriginAlResource(this.hAndle, uri, CAncellAtionToken.None);
		return result && URI.revive(result);
	}

	toJSON(): Any {
		return {
			$mid: 5,
			hAndle: this.hAndle
		};
	}

	dispose(): void {

	}
}

@extHostNAmedCustomer(MAinContext.MAinThreAdSCM)
export clAss MAinThreAdSCM implements MAinThreAdSCMShApe {

	privAte reAdonly _proxy: ExtHostSCMShApe;
	privAte _repositories = new MAp<number, ISCMRepository>();
	privAte _repositoryDisposAbles = new MAp<number, IDisposAble>();
	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		extHostContext: IExtHostContext,
		@ISCMService privAte reAdonly scmService: ISCMService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSCM);
	}

	dispose(): void {
		this._repositories.forEAch(r => r.dispose());
		this._repositories.cleAr();

		this._repositoryDisposAbles.forEAch(d => d.dispose());
		this._repositoryDisposAbles.cleAr();

		this._disposAbles.dispose();
	}

	$registerSourceControl(hAndle: number, id: string, lAbel: string, rootUri: UriComponents | undefined): void {
		const provider = new MAinThreAdSCMProvider(this._proxy, hAndle, id, lAbel, rootUri ? URI.revive(rootUri) : undefined);
		const repository = this.scmService.registerSCMProvider(provider);
		this._repositories.set(hAndle, repository);

		const disposAble = combinedDisposAble(
			Event.filter(repository.onDidChAngeSelection, selected => selected)(_ => this._proxy.$setSelectedSourceControl(hAndle)),
			repository.input.onDidChAnge(vAlue => this._proxy.$onInputBoxVAlueChAnge(hAndle, vAlue))
		);

		if (repository.selected) {
			setTimeout(() => this._proxy.$setSelectedSourceControl(hAndle), 0);
		}

		if (repository.input.vAlue) {
			setTimeout(() => this._proxy.$onInputBoxVAlueChAnge(hAndle, repository.input.vAlue), 0);
		}

		this._repositoryDisposAbles.set(hAndle, disposAble);
	}

	$updAteSourceControl(hAndle: number, feAtures: SCMProviderFeAtures): void {
		const repository = this._repositories.get(hAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$updAteSourceControl(feAtures);
	}

	$unregisterSourceControl(hAndle: number): void {
		const repository = this._repositories.get(hAndle);

		if (!repository) {
			return;
		}

		this._repositoryDisposAbles.get(hAndle)!.dispose();
		this._repositoryDisposAbles.delete(hAndle);

		repository.dispose();
		this._repositories.delete(hAndle);
	}

	$registerGroups(sourceControlHAndle: number, groups: [number /*hAndle*/, string /*id*/, string /*lAbel*/, SCMGroupFeAtures][], splices: SCMRAwResourceSplices[]): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$registerGroups(groups);
		provider.$spliceGroupResourceStAtes(splices);
	}

	$updAteGroup(sourceControlHAndle: number, groupHAndle: number, feAtures: SCMGroupFeAtures): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$updAteGroup(groupHAndle, feAtures);
	}

	$updAteGroupLAbel(sourceControlHAndle: number, groupHAndle: number, lAbel: string): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$updAteGroupLAbel(groupHAndle, lAbel);
	}

	$spliceResourceStAtes(sourceControlHAndle: number, splices: SCMRAwResourceSplices[]): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$spliceGroupResourceStAtes(splices);
	}

	$unregisterGroup(sourceControlHAndle: number, hAndle: number): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		const provider = repository.provider As MAinThreAdSCMProvider;
		provider.$unregisterGroup(hAndle);
	}

	$setInputBoxVAlue(sourceControlHAndle: number, vAlue: string): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		repository.input.setVAlue(vAlue, fAlse);
	}

	$setInputBoxPlAceholder(sourceControlHAndle: number, plAceholder: string): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		repository.input.plAceholder = plAceholder;
	}

	$setInputBoxVisibility(sourceControlHAndle: number, visible: booleAn): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		repository.input.visible = visible;
	}

	$setVAlidAtionProviderIsEnAbled(sourceControlHAndle: number, enAbled: booleAn): void {
		const repository = this._repositories.get(sourceControlHAndle);

		if (!repository) {
			return;
		}

		if (enAbled) {
			repository.input.vAlidAteInput = Async (vAlue, pos): Promise<IInputVAlidAtion | undefined> => {
				const result = AwAit this._proxy.$vAlidAteInput(sourceControlHAndle, vAlue, pos);
				return result && { messAge: result[0], type: result[1] };
			};
		} else {
			repository.input.vAlidAteInput = Async () => undefined;
		}
	}
}
