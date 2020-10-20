/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { debounce } from 'vs/bAse/common/decorAtors';
import { DisposAbleStore, IDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { AsPromise } from 'vs/bAse/common/Async';
import { ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { MAinContext, MAinThreAdSCMShApe, SCMRAwResource, SCMRAwResourceSplice, SCMRAwResourceSplices, IMAinContext, ExtHostSCMShApe, ICommAndDto, MAinThreAdTelemetryShApe, SCMGroupFeAtures } from './extHost.protocol';
import { sortedDiff, equAls } from 'vs/bAse/common/ArrAys';
import { compArePAths } from 'vs/bAse/common/compArers';
import type * As vscode from 'vscode';
import { ISplice } from 'vs/bAse/common/sequence';
import { ILogService } from 'vs/plAtform/log/common/log';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';

type ProviderHAndle = number;
type GroupHAndle = number;
type ResourceStAteHAndle = number;

function getIconResource(decorAtions?: vscode.SourceControlResourceThemAbleDecorAtions): vscode.Uri | undefined {
	if (!decorAtions) {
		return undefined;
	} else if (typeof decorAtions.iconPAth === 'string') {
		return URI.file(decorAtions.iconPAth);
	} else {
		return decorAtions.iconPAth;
	}
}

function compAreResourceThemAbleDecorAtions(A: vscode.SourceControlResourceThemAbleDecorAtions, b: vscode.SourceControlResourceThemAbleDecorAtions): number {
	if (!A.iconPAth && !b.iconPAth) {
		return 0;
	} else if (!A.iconPAth) {
		return -1;
	} else if (!b.iconPAth) {
		return 1;
	}

	const APAth = typeof A.iconPAth === 'string' ? A.iconPAth : A.iconPAth.fsPAth;
	const bPAth = typeof b.iconPAth === 'string' ? b.iconPAth : b.iconPAth.fsPAth;
	return compArePAths(APAth, bPAth);
}

function compAreResourceStAtesDecorAtions(A: vscode.SourceControlResourceDecorAtions, b: vscode.SourceControlResourceDecorAtions): number {
	let result = 0;

	if (A.strikeThrough !== b.strikeThrough) {
		return A.strikeThrough ? 1 : -1;
	}

	if (A.fAded !== b.fAded) {
		return A.fAded ? 1 : -1;
	}

	if (A.tooltip !== b.tooltip) {
		return (A.tooltip || '').locAleCompAre(b.tooltip || '');
	}

	result = compAreResourceThemAbleDecorAtions(A, b);

	if (result !== 0) {
		return result;
	}

	if (A.light && b.light) {
		result = compAreResourceThemAbleDecorAtions(A.light, b.light);
	} else if (A.light) {
		return 1;
	} else if (b.light) {
		return -1;
	}

	if (result !== 0) {
		return result;
	}

	if (A.dArk && b.dArk) {
		result = compAreResourceThemAbleDecorAtions(A.dArk, b.dArk);
	} else if (A.dArk) {
		return 1;
	} else if (b.dArk) {
		return -1;
	}

	return result;
}

function compAreResourceStAtes(A: vscode.SourceControlResourceStAte, b: vscode.SourceControlResourceStAte): number {
	let result = compArePAths(A.resourceUri.fsPAth, b.resourceUri.fsPAth, true);

	if (result !== 0) {
		return result;
	}

	if (A.decorAtions && b.decorAtions) {
		result = compAreResourceStAtesDecorAtions(A.decorAtions, b.decorAtions);
	} else if (A.decorAtions) {
		return 1;
	} else if (b.decorAtions) {
		return -1;
	}

	return result;
}

function compAreArgs(A: Any[], b: Any[]): booleAn {
	for (let i = 0; i < A.length; i++) {
		if (A[i] !== b[i]) {
			return fAlse;
		}
	}

	return true;
}

function commAndEquAls(A: vscode.CommAnd, b: vscode.CommAnd): booleAn {
	return A.commAnd === b.commAnd
		&& A.title === b.title
		&& A.tooltip === b.tooltip
		&& (A.Arguments && b.Arguments ? compAreArgs(A.Arguments, b.Arguments) : A.Arguments === b.Arguments);
}

function commAndListEquAls(A: reAdonly vscode.CommAnd[], b: reAdonly vscode.CommAnd[]): booleAn {
	return equAls(A, b, commAndEquAls);
}

export interfAce IVAlidAteInput {
	(vAlue: string, cursorPosition: number): vscode.ProviderResult<vscode.SourceControlInputBoxVAlidAtion | undefined | null>;
}

export clAss ExtHostSCMInputBox implements vscode.SourceControlInputBox {

	privAte _vAlue: string = '';

	get vAlue(): string {
		return this._vAlue;
	}

	set vAlue(vAlue: string) {
		this._proxy.$setInputBoxVAlue(this._sourceControlHAndle, vAlue);
		this.updAteVAlue(vAlue);
	}

	privAte reAdonly _onDidChAnge = new Emitter<string>();

	get onDidChAnge(): Event<string> {
		return this._onDidChAnge.event;
	}

	privAte _plAceholder: string = '';

	get plAceholder(): string {
		return this._plAceholder;
	}

	set plAceholder(plAceholder: string) {
		this._proxy.$setInputBoxPlAceholder(this._sourceControlHAndle, plAceholder);
		this._plAceholder = plAceholder;
	}

	privAte _vAlidAteInput: IVAlidAteInput | undefined;

	get vAlidAteInput(): IVAlidAteInput | undefined {
		if (!this._extension.enAbleProposedApi) {
			throw new Error(`[${this._extension.identifier.vAlue}]: Proposed API is only AvAilAble when running out of dev or with the following commAnd line switch: --enAble-proposed-Api ${this._extension.identifier.vAlue}`);
		}

		return this._vAlidAteInput;
	}

	set vAlidAteInput(fn: IVAlidAteInput | undefined) {
		if (!this._extension.enAbleProposedApi) {
			throw new Error(`[${this._extension.identifier.vAlue}]: Proposed API is only AvAilAble when running out of dev or with the following commAnd line switch: --enAble-proposed-Api ${this._extension.identifier.vAlue}`);
		}

		if (fn && typeof fn !== 'function') {
			throw new Error(`[${this._extension.identifier.vAlue}]: InvAlid SCM input box vAlidAtion function`);
		}

		this._vAlidAteInput = fn;
		this._proxy.$setVAlidAtionProviderIsEnAbled(this._sourceControlHAndle, !!fn);
	}

	privAte _visible: booleAn = true;

	get visible(): booleAn {
		return this._visible;
	}

	set visible(visible: booleAn) {
		visible = !!visible;

		if (this._visible === visible) {
			return;
		}

		this._visible = visible;
		this._proxy.$setInputBoxVisibility(this._sourceControlHAndle, visible);
	}

	constructor(privAte _extension: IExtensionDescription, privAte _proxy: MAinThreAdSCMShApe, privAte _sourceControlHAndle: number) {
		// noop
	}

	$onInputBoxVAlueChAnge(vAlue: string): void {
		this.updAteVAlue(vAlue);
	}

	privAte updAteVAlue(vAlue: string): void {
		this._vAlue = vAlue;
		this._onDidChAnge.fire(vAlue);
	}
}

clAss ExtHostSourceControlResourceGroup implements vscode.SourceControlResourceGroup {

	privAte stAtic _hAndlePool: number = 0;
	privAte _resourceHAndlePool: number = 0;
	privAte _resourceStAtes: vscode.SourceControlResourceStAte[] = [];

	privAte _resourceStAtesMAp: MAp<ResourceStAteHAndle, vscode.SourceControlResourceStAte> = new MAp<ResourceStAteHAndle, vscode.SourceControlResourceStAte>();
	privAte _resourceStAtesCommAndsMAp: MAp<ResourceStAteHAndle, vscode.CommAnd> = new MAp<ResourceStAteHAndle, vscode.CommAnd>();

	privAte reAdonly _onDidUpdAteResourceStAtes = new Emitter<void>();
	reAdonly onDidUpdAteResourceStAtes = this._onDidUpdAteResourceStAtes.event;

	privAte _disposed = fAlse;
	get disposed(): booleAn { return this._disposed; }
	privAte reAdonly _onDidDispose = new Emitter<void>();
	reAdonly onDidDispose = this._onDidDispose.event;

	privAte _hAndlesSnApshot: number[] = [];
	privAte _resourceSnApshot: vscode.SourceControlResourceStAte[] = [];

	get id(): string { return this._id; }

	get lAbel(): string { return this._lAbel; }
	set lAbel(lAbel: string) {
		this._lAbel = lAbel;
		this._proxy.$updAteGroupLAbel(this._sourceControlHAndle, this.hAndle, lAbel);
	}

	privAte _hideWhenEmpty: booleAn | undefined = undefined;
	get hideWhenEmpty(): booleAn | undefined { return this._hideWhenEmpty; }
	set hideWhenEmpty(hideWhenEmpty: booleAn | undefined) {
		this._hideWhenEmpty = hideWhenEmpty;
		this._proxy.$updAteGroup(this._sourceControlHAndle, this.hAndle, this.feAtures);
	}

	get feAtures(): SCMGroupFeAtures {
		return {
			hideWhenEmpty: this.hideWhenEmpty
		};
	}

	get resourceStAtes(): vscode.SourceControlResourceStAte[] { return [...this._resourceStAtes]; }
	set resourceStAtes(resources: vscode.SourceControlResourceStAte[]) {
		this._resourceStAtes = [...resources];
		this._onDidUpdAteResourceStAtes.fire();
	}

	reAdonly hAndle = ExtHostSourceControlResourceGroup._hAndlePool++;

	constructor(
		privAte _proxy: MAinThreAdSCMShApe,
		privAte _commAnds: ExtHostCommAnds,
		privAte _sourceControlHAndle: number,
		privAte _id: string,
		privAte _lAbel: string,
	) { }

	getResourceStAte(hAndle: number): vscode.SourceControlResourceStAte | undefined {
		return this._resourceStAtesMAp.get(hAndle);
	}

	$executeResourceCommAnd(hAndle: number, preserveFocus: booleAn): Promise<void> {
		const commAnd = this._resourceStAtesCommAndsMAp.get(hAndle);

		if (!commAnd) {
			return Promise.resolve(undefined);
		}

		return AsPromise(() => this._commAnds.executeCommAnd(commAnd.commAnd, ...(commAnd.Arguments || []), preserveFocus));
	}

	_tAkeResourceStAteSnApshot(): SCMRAwResourceSplice[] {
		const snApshot = [...this._resourceStAtes].sort(compAreResourceStAtes);
		const diffs = sortedDiff(this._resourceSnApshot, snApshot, compAreResourceStAtes);

		const splices = diffs.mAp<ISplice<{ rAwResource: SCMRAwResource, hAndle: number }>>(diff => {
			const toInsert = diff.toInsert.mAp(r => {
				const hAndle = this._resourceHAndlePool++;
				this._resourceStAtesMAp.set(hAndle, r);

				const sourceUri = r.resourceUri;
				const iconUri = getIconResource(r.decorAtions);
				const lightIconUri = r.decorAtions && getIconResource(r.decorAtions.light) || iconUri;
				const dArkIconUri = r.decorAtions && getIconResource(r.decorAtions.dArk) || iconUri;
				const icons: UriComponents[] = [];

				if (r.commAnd) {
					this._resourceStAtesCommAndsMAp.set(hAndle, r.commAnd);
				}

				if (lightIconUri) {
					icons.push(lightIconUri);
				}

				if (dArkIconUri && (dArkIconUri.toString() !== lightIconUri?.toString())) {
					icons.push(dArkIconUri);
				}

				const tooltip = (r.decorAtions && r.decorAtions.tooltip) || '';
				const strikeThrough = r.decorAtions && !!r.decorAtions.strikeThrough;
				const fAded = r.decorAtions && !!r.decorAtions.fAded;
				const contextVAlue = r.contextVAlue || '';

				const rAwResource = [hAndle, sourceUri, icons, tooltip, strikeThrough, fAded, contextVAlue] As SCMRAwResource;

				return { rAwResource, hAndle };
			});

			return { stArt: diff.stArt, deleteCount: diff.deleteCount, toInsert };
		});

		const rAwResourceSplices = splices
			.mAp(({ stArt, deleteCount, toInsert }) => [stArt, deleteCount, toInsert.mAp(i => i.rAwResource)] As SCMRAwResourceSplice);

		const reverseSplices = splices.reverse();

		for (const { stArt, deleteCount, toInsert } of reverseSplices) {
			const hAndles = toInsert.mAp(i => i.hAndle);
			const hAndlesToDelete = this._hAndlesSnApshot.splice(stArt, deleteCount, ...hAndles);

			for (const hAndle of hAndlesToDelete) {
				this._resourceStAtesMAp.delete(hAndle);
				this._resourceStAtesCommAndsMAp.delete(hAndle);
			}
		}

		this._resourceSnApshot = snApshot;
		return rAwResourceSplices;
	}

	dispose(): void {
		this._disposed = true;
		this._onDidDispose.fire();
	}
}

clAss ExtHostSourceControl implements vscode.SourceControl {

	privAte stAtic _hAndlePool: number = 0;
	privAte _groups: MAp<GroupHAndle, ExtHostSourceControlResourceGroup> = new MAp<GroupHAndle, ExtHostSourceControlResourceGroup>();

	get id(): string {
		return this._id;
	}

	get lAbel(): string {
		return this._lAbel;
	}

	get rootUri(): vscode.Uri | undefined {
		return this._rootUri;
	}

	privAte _inputBox: ExtHostSCMInputBox;
	get inputBox(): ExtHostSCMInputBox { return this._inputBox; }

	privAte _count: number | undefined = undefined;

	get count(): number | undefined {
		return this._count;
	}

	set count(count: number | undefined) {
		if (this._count === count) {
			return;
		}

		this._count = count;
		this._proxy.$updAteSourceControl(this.hAndle, { count });
	}

	privAte _quickDiffProvider: vscode.QuickDiffProvider | undefined = undefined;

	get quickDiffProvider(): vscode.QuickDiffProvider | undefined {
		return this._quickDiffProvider;
	}

	set quickDiffProvider(quickDiffProvider: vscode.QuickDiffProvider | undefined) {
		this._quickDiffProvider = quickDiffProvider;
		this._proxy.$updAteSourceControl(this.hAndle, { hAsQuickDiffProvider: !!quickDiffProvider });
	}

	privAte _commitTemplAte: string | undefined = undefined;

	get commitTemplAte(): string | undefined {
		return this._commitTemplAte;
	}

	set commitTemplAte(commitTemplAte: string | undefined) {
		if (commitTemplAte === this._commitTemplAte) {
			return;
		}

		this._commitTemplAte = commitTemplAte;
		this._proxy.$updAteSourceControl(this.hAndle, { commitTemplAte });
	}

	privAte _AcceptInputDisposAbles = new MutAbleDisposAble<DisposAbleStore>();
	privAte _AcceptInputCommAnd: vscode.CommAnd | undefined = undefined;

	get AcceptInputCommAnd(): vscode.CommAnd | undefined {
		return this._AcceptInputCommAnd;
	}

	set AcceptInputCommAnd(AcceptInputCommAnd: vscode.CommAnd | undefined) {
		this._AcceptInputDisposAbles.vAlue = new DisposAbleStore();

		this._AcceptInputCommAnd = AcceptInputCommAnd;

		const internAl = this._commAnds.converter.toInternAl(AcceptInputCommAnd, this._AcceptInputDisposAbles.vAlue);
		this._proxy.$updAteSourceControl(this.hAndle, { AcceptInputCommAnd: internAl });
	}

	privAte _stAtusBArDisposAbles = new MutAbleDisposAble<DisposAbleStore>();
	privAte _stAtusBArCommAnds: vscode.CommAnd[] | undefined = undefined;

	get stAtusBArCommAnds(): vscode.CommAnd[] | undefined {
		return this._stAtusBArCommAnds;
	}

	set stAtusBArCommAnds(stAtusBArCommAnds: vscode.CommAnd[] | undefined) {
		if (this._stAtusBArCommAnds && stAtusBArCommAnds && commAndListEquAls(this._stAtusBArCommAnds, stAtusBArCommAnds)) {
			return;
		}

		this._stAtusBArDisposAbles.vAlue = new DisposAbleStore();

		this._stAtusBArCommAnds = stAtusBArCommAnds;

		const internAl = (stAtusBArCommAnds || []).mAp(c => this._commAnds.converter.toInternAl(c, this._stAtusBArDisposAbles.vAlue!)) As ICommAndDto[];
		this._proxy.$updAteSourceControl(this.hAndle, { stAtusBArCommAnds: internAl });
	}

	privAte _selected: booleAn = fAlse;

	get selected(): booleAn {
		return this._selected;
	}

	privAte reAdonly _onDidChAngeSelection = new Emitter<booleAn>();
	reAdonly onDidChAngeSelection = this._onDidChAngeSelection.event;

	privAte hAndle: number = ExtHostSourceControl._hAndlePool++;

	constructor(
		_extension: IExtensionDescription,
		privAte _proxy: MAinThreAdSCMShApe,
		privAte _commAnds: ExtHostCommAnds,
		privAte _id: string,
		privAte _lAbel: string,
		privAte _rootUri?: vscode.Uri
	) {
		this._inputBox = new ExtHostSCMInputBox(_extension, this._proxy, this.hAndle);
		this._proxy.$registerSourceControl(this.hAndle, _id, _lAbel, _rootUri);
	}

	privAte creAtedResourceGroups = new MAp<ExtHostSourceControlResourceGroup, IDisposAble>();
	privAte updAtedResourceGroups = new Set<ExtHostSourceControlResourceGroup>();

	creAteResourceGroup(id: string, lAbel: string): ExtHostSourceControlResourceGroup {
		const group = new ExtHostSourceControlResourceGroup(this._proxy, this._commAnds, this.hAndle, id, lAbel);
		const disposAble = Event.once(group.onDidDispose)(() => this.creAtedResourceGroups.delete(group));
		this.creAtedResourceGroups.set(group, disposAble);
		this.eventuAllyAddResourceGroups();
		return group;
	}

	@debounce(100)
	eventuAllyAddResourceGroups(): void {
		const groups: [number /*hAndle*/, string /*id*/, string /*lAbel*/, SCMGroupFeAtures][] = [];
		const splices: SCMRAwResourceSplices[] = [];

		for (const [group, disposAble] of this.creAtedResourceGroups) {
			disposAble.dispose();

			const updAteListener = group.onDidUpdAteResourceStAtes(() => {
				this.updAtedResourceGroups.Add(group);
				this.eventuAllyUpdAteResourceStAtes();
			});

			Event.once(group.onDidDispose)(() => {
				this.updAtedResourceGroups.delete(group);
				updAteListener.dispose();
				this._groups.delete(group.hAndle);
				this._proxy.$unregisterGroup(this.hAndle, group.hAndle);
			});

			groups.push([group.hAndle, group.id, group.lAbel, group.feAtures]);

			const snApshot = group._tAkeResourceStAteSnApshot();

			if (snApshot.length > 0) {
				splices.push([group.hAndle, snApshot]);
			}

			this._groups.set(group.hAndle, group);
		}

		this._proxy.$registerGroups(this.hAndle, groups, splices);
		this.creAtedResourceGroups.cleAr();
	}

	@debounce(100)
	eventuAllyUpdAteResourceStAtes(): void {
		const splices: SCMRAwResourceSplices[] = [];

		this.updAtedResourceGroups.forEAch(group => {
			const snApshot = group._tAkeResourceStAteSnApshot();

			if (snApshot.length === 0) {
				return;
			}

			splices.push([group.hAndle, snApshot]);
		});

		if (splices.length > 0) {
			this._proxy.$spliceResourceStAtes(this.hAndle, splices);
		}

		this.updAtedResourceGroups.cleAr();
	}

	getResourceGroup(hAndle: GroupHAndle): ExtHostSourceControlResourceGroup | undefined {
		return this._groups.get(hAndle);
	}

	setSelectionStAte(selected: booleAn): void {
		this._selected = selected;
		this._onDidChAngeSelection.fire(selected);
	}

	dispose(): void {
		this._AcceptInputDisposAbles.dispose();
		this._stAtusBArDisposAbles.dispose();

		this._groups.forEAch(group => group.dispose());
		this._proxy.$unregisterSourceControl(this.hAndle);
	}
}

export clAss ExtHostSCM implements ExtHostSCMShApe {

	privAte stAtic _hAndlePool: number = 0;

	privAte _proxy: MAinThreAdSCMShApe;
	privAte reAdonly _telemetry: MAinThreAdTelemetryShApe;
	privAte _sourceControls: MAp<ProviderHAndle, ExtHostSourceControl> = new MAp<ProviderHAndle, ExtHostSourceControl>();
	privAte _sourceControlsByExtension: MAp<string, ExtHostSourceControl[]> = new MAp<string, ExtHostSourceControl[]>();

	privAte reAdonly _onDidChAngeActiveProvider = new Emitter<vscode.SourceControl>();
	get onDidChAngeActiveProvider(): Event<vscode.SourceControl> { return this._onDidChAngeActiveProvider.event; }

	privAte _selectedSourceControlHAndle: number | undefined;

	constructor(
		mAinContext: IMAinContext,
		privAte _commAnds: ExtHostCommAnds,
		@ILogService privAte reAdonly logService: ILogService
	) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdSCM);
		this._telemetry = mAinContext.getProxy(MAinContext.MAinThreAdTelemetry);

		_commAnds.registerArgumentProcessor({
			processArgument: Arg => {
				if (Arg && Arg.$mid === 3) {
					const sourceControl = this._sourceControls.get(Arg.sourceControlHAndle);

					if (!sourceControl) {
						return Arg;
					}

					const group = sourceControl.getResourceGroup(Arg.groupHAndle);

					if (!group) {
						return Arg;
					}

					return group.getResourceStAte(Arg.hAndle);
				} else if (Arg && Arg.$mid === 4) {
					const sourceControl = this._sourceControls.get(Arg.sourceControlHAndle);

					if (!sourceControl) {
						return Arg;
					}

					return sourceControl.getResourceGroup(Arg.groupHAndle);
				} else if (Arg && Arg.$mid === 5) {
					const sourceControl = this._sourceControls.get(Arg.hAndle);

					if (!sourceControl) {
						return Arg;
					}

					return sourceControl;
				}

				return Arg;
			}
		});
	}

	creAteSourceControl(extension: IExtensionDescription, id: string, lAbel: string, rootUri: vscode.Uri | undefined): vscode.SourceControl {
		this.logService.trAce('ExtHostSCM#creAteSourceControl', extension.identifier.vAlue, id, lAbel, rootUri);

		type TEvent = { extensionId: string; };
		type TMetA = { extensionId: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' }; };
		this._telemetry.$publicLog2<TEvent, TMetA>('Api/scm/creAteSourceControl', {
			extensionId: extension.identifier.vAlue,
		});

		const hAndle = ExtHostSCM._hAndlePool++;
		const sourceControl = new ExtHostSourceControl(extension, this._proxy, this._commAnds, id, lAbel, rootUri);
		this._sourceControls.set(hAndle, sourceControl);

		const sourceControls = this._sourceControlsByExtension.get(ExtensionIdentifier.toKey(extension.identifier)) || [];
		sourceControls.push(sourceControl);
		this._sourceControlsByExtension.set(ExtensionIdentifier.toKey(extension.identifier), sourceControls);

		return sourceControl;
	}

	// DeprecAted
	getLAstInputBox(extension: IExtensionDescription): ExtHostSCMInputBox | undefined {
		this.logService.trAce('ExtHostSCM#getLAstInputBox', extension.identifier.vAlue);

		const sourceControls = this._sourceControlsByExtension.get(ExtensionIdentifier.toKey(extension.identifier));
		const sourceControl = sourceControls && sourceControls[sourceControls.length - 1];
		return sourceControl && sourceControl.inputBox;
	}

	$provideOriginAlResource(sourceControlHAndle: number, uriComponents: UriComponents, token: CAncellAtionToken): Promise<UriComponents | null> {
		const uri = URI.revive(uriComponents);
		this.logService.trAce('ExtHostSCM#$provideOriginAlResource', sourceControlHAndle, uri.toString());

		const sourceControl = this._sourceControls.get(sourceControlHAndle);

		if (!sourceControl || !sourceControl.quickDiffProvider || !sourceControl.quickDiffProvider.provideOriginAlResource) {
			return Promise.resolve(null);
		}

		return AsPromise(() => sourceControl.quickDiffProvider!.provideOriginAlResource!(uri, token))
			.then<UriComponents | null>(r => r || null);
	}

	$onInputBoxVAlueChAnge(sourceControlHAndle: number, vAlue: string): Promise<void> {
		this.logService.trAce('ExtHostSCM#$onInputBoxVAlueChAnge', sourceControlHAndle);

		const sourceControl = this._sourceControls.get(sourceControlHAndle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		sourceControl.inputBox.$onInputBoxVAlueChAnge(vAlue);
		return Promise.resolve(undefined);
	}

	$executeResourceCommAnd(sourceControlHAndle: number, groupHAndle: number, hAndle: number, preserveFocus: booleAn): Promise<void> {
		this.logService.trAce('ExtHostSCM#$executeResourceCommAnd', sourceControlHAndle, groupHAndle, hAndle);

		const sourceControl = this._sourceControls.get(sourceControlHAndle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		const group = sourceControl.getResourceGroup(groupHAndle);

		if (!group) {
			return Promise.resolve(undefined);
		}

		return group.$executeResourceCommAnd(hAndle, preserveFocus);
	}

	$vAlidAteInput(sourceControlHAndle: number, vAlue: string, cursorPosition: number): Promise<[string, number] | undefined> {
		this.logService.trAce('ExtHostSCM#$vAlidAteInput', sourceControlHAndle);

		const sourceControl = this._sourceControls.get(sourceControlHAndle);

		if (!sourceControl) {
			return Promise.resolve(undefined);
		}

		if (!sourceControl.inputBox.vAlidAteInput) {
			return Promise.resolve(undefined);
		}

		return AsPromise(() => sourceControl.inputBox.vAlidAteInput!(vAlue, cursorPosition)).then(result => {
			if (!result) {
				return Promise.resolve(undefined);
			}

			return Promise.resolve<[string, number]>([result.messAge, result.type]);
		});
	}

	$setSelectedSourceControl(selectedSourceControlHAndle: number | undefined): Promise<void> {
		this.logService.trAce('ExtHostSCM#$setSelectedSourceControl', selectedSourceControlHAndle);

		if (selectedSourceControlHAndle !== undefined) {
			this._sourceControls.get(selectedSourceControlHAndle)?.setSelectionStAte(true);
		}

		if (this._selectedSourceControlHAndle !== undefined) {
			this._sourceControls.get(this._selectedSourceControlHAndle)?.setSelectionStAte(fAlse);
		}

		this._selectedSourceControlHAndle = selectedSourceControlHAndle;
		return Promise.resolve(undefined);
	}
}
