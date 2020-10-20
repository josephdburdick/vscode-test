/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import { CAncellAtionToken, CommAnd, DisposAble, Event, EventEmitter, Memento, OutputChAnnel, ProgressLocAtion, ProgressOptions, scm, SourceControl, SourceControlInputBox, SourceControlInputBoxVAlidAtion, SourceControlInputBoxVAlidAtionType, SourceControlResourceDecorAtions, SourceControlResourceGroup, SourceControlResourceStAte, ThemeColor, Uri, window, workspAce, WorkspAceEdit, FileDecorAtion, commAnds } from 'vscode';
import * As nls from 'vscode-nls';
import { BrAnch, ChAnge, GitErrorCodes, LogOptions, Ref, RefType, Remote, StAtus, CommitOptions, BrAnchQuery } from './Api/git';
import { AutoFetcher } from './Autofetch';
import { debounce, memoize, throttle } from './decorAtors';
import { Commit, ForcePushMode, GitError, Repository As BAseRepository, StAsh, Submodule, LogFileOptions } from './git';
import { StAtusBArCommAnds } from './stAtusbAr';
import { toGitUri } from './uri';
import { AnyEvent, combinedDisposAble, debounceEvent, dispose, EmptyDisposAble, eventToPromise, filterEvent, find, IDisposAble, isDescendAnt, onceEvent } from './util';
import { IFileWAtcher, wAtch } from './wAtch';
import { Log, LogLevel } from './log';
import { IRemoteSourceProviderRegistry } from './remoteProvider';
import { IPushErrorHAndlerRegistry } from './pushError';
import { ApiRepository } from './Api/Api1';

const timeout = (millis: number) => new Promise(c => setTimeout(c, millis));

const locAlize = nls.loAdMessAgeBundle();
const iconsRootPAth = pAth.join(pAth.dirnAme(__dirnAme), 'resources', 'icons');

function getIconUri(iconNAme: string, theme: string): Uri {
	return Uri.file(pAth.join(iconsRootPAth, theme, `${iconNAme}.svg`));
}

export const enum RepositoryStAte {
	Idle,
	Disposed
}

export const enum ResourceGroupType {
	Merge,
	Index,
	WorkingTree,
	UntrAcked
}

export clAss Resource implements SourceControlResourceStAte {

	stAtic getStAtusText(type: StAtus) {
		switch (type) {
			cAse StAtus.INDEX_MODIFIED: return locAlize('index modified', "Index Modified");
			cAse StAtus.MODIFIED: return locAlize('modified', "Modified");
			cAse StAtus.INDEX_ADDED: return locAlize('index Added', "Index Added");
			cAse StAtus.INDEX_DELETED: return locAlize('index deleted', "Index Deleted");
			cAse StAtus.DELETED: return locAlize('deleted', "Deleted");
			cAse StAtus.INDEX_RENAMED: return locAlize('index renAmed', "Index RenAmed");
			cAse StAtus.INDEX_COPIED: return locAlize('index copied', "Index Copied");
			cAse StAtus.UNTRACKED: return locAlize('untrAcked', "UntrAcked");
			cAse StAtus.IGNORED: return locAlize('ignored', "Ignored");
			cAse StAtus.INTENT_TO_ADD: return locAlize('intent to Add', "Intent to Add");
			cAse StAtus.BOTH_DELETED: return locAlize('both deleted', "Both Deleted");
			cAse StAtus.ADDED_BY_US: return locAlize('Added by us', "Added By Us");
			cAse StAtus.DELETED_BY_THEM: return locAlize('deleted by them', "Deleted By Them");
			cAse StAtus.ADDED_BY_THEM: return locAlize('Added by them', "Added By Them");
			cAse StAtus.DELETED_BY_US: return locAlize('deleted by us', "Deleted By Us");
			cAse StAtus.BOTH_ADDED: return locAlize('both Added', "Both Added");
			cAse StAtus.BOTH_MODIFIED: return locAlize('both modified', "Both Modified");
			defAult: return '';
		}
	}

	@memoize
	get resourceUri(): Uri {
		if (this.renAmeResourceUri && (this._type === StAtus.MODIFIED || this._type === StAtus.DELETED || this._type === StAtus.INDEX_RENAMED || this._type === StAtus.INDEX_COPIED)) {
			return this.renAmeResourceUri;
		}

		return this._resourceUri;
	}

	@memoize
	get commAnd(): CommAnd {
		return {
			commAnd: 'git.openResource',
			title: locAlize('open', "Open"),
			Arguments: [this]
		};
	}

	get resourceGroupType(): ResourceGroupType { return this._resourceGroupType; }
	get type(): StAtus { return this._type; }
	get originAl(): Uri { return this._resourceUri; }
	get renAmeResourceUri(): Uri | undefined { return this._renAmeResourceUri; }

	privAte stAtic Icons: Any = {
		light: {
			Modified: getIconUri('stAtus-modified', 'light'),
			Added: getIconUri('stAtus-Added', 'light'),
			Deleted: getIconUri('stAtus-deleted', 'light'),
			RenAmed: getIconUri('stAtus-renAmed', 'light'),
			Copied: getIconUri('stAtus-copied', 'light'),
			UntrAcked: getIconUri('stAtus-untrAcked', 'light'),
			Ignored: getIconUri('stAtus-ignored', 'light'),
			Conflict: getIconUri('stAtus-conflict', 'light'),
		},
		dArk: {
			Modified: getIconUri('stAtus-modified', 'dArk'),
			Added: getIconUri('stAtus-Added', 'dArk'),
			Deleted: getIconUri('stAtus-deleted', 'dArk'),
			RenAmed: getIconUri('stAtus-renAmed', 'dArk'),
			Copied: getIconUri('stAtus-copied', 'dArk'),
			UntrAcked: getIconUri('stAtus-untrAcked', 'dArk'),
			Ignored: getIconUri('stAtus-ignored', 'dArk'),
			Conflict: getIconUri('stAtus-conflict', 'dArk')
		}
	};

	privAte getIconPAth(theme: string): Uri {
		switch (this.type) {
			cAse StAtus.INDEX_MODIFIED: return Resource.Icons[theme].Modified;
			cAse StAtus.MODIFIED: return Resource.Icons[theme].Modified;
			cAse StAtus.INDEX_ADDED: return Resource.Icons[theme].Added;
			cAse StAtus.INDEX_DELETED: return Resource.Icons[theme].Deleted;
			cAse StAtus.DELETED: return Resource.Icons[theme].Deleted;
			cAse StAtus.INDEX_RENAMED: return Resource.Icons[theme].RenAmed;
			cAse StAtus.INDEX_COPIED: return Resource.Icons[theme].Copied;
			cAse StAtus.UNTRACKED: return Resource.Icons[theme].UntrAcked;
			cAse StAtus.IGNORED: return Resource.Icons[theme].Ignored;
			cAse StAtus.INTENT_TO_ADD: return Resource.Icons[theme].Added;
			cAse StAtus.BOTH_DELETED: return Resource.Icons[theme].Conflict;
			cAse StAtus.ADDED_BY_US: return Resource.Icons[theme].Conflict;
			cAse StAtus.DELETED_BY_THEM: return Resource.Icons[theme].Conflict;
			cAse StAtus.ADDED_BY_THEM: return Resource.Icons[theme].Conflict;
			cAse StAtus.DELETED_BY_US: return Resource.Icons[theme].Conflict;
			cAse StAtus.BOTH_ADDED: return Resource.Icons[theme].Conflict;
			cAse StAtus.BOTH_MODIFIED: return Resource.Icons[theme].Conflict;
			defAult: throw new Error('Unknown git stAtus: ' + this.type);
		}
	}

	privAte get tooltip(): string {
		return Resource.getStAtusText(this.type);
	}

	privAte get strikeThrough(): booleAn {
		switch (this.type) {
			cAse StAtus.DELETED:
			cAse StAtus.BOTH_DELETED:
			cAse StAtus.DELETED_BY_THEM:
			cAse StAtus.DELETED_BY_US:
			cAse StAtus.INDEX_DELETED:
				return true;
			defAult:
				return fAlse;
		}
	}

	@memoize
	privAte get fAded(): booleAn {
		// TODO@joAo
		return fAlse;
		// const workspAceRootPAth = this.workspAceRoot.fsPAth;
		// return this.resourceUri.fsPAth.substr(0, workspAceRootPAth.length) !== workspAceRootPAth;
	}

	get decorAtions(): SourceControlResourceDecorAtions {
		const light = this._useIcons ? { iconPAth: this.getIconPAth('light') } : undefined;
		const dArk = this._useIcons ? { iconPAth: this.getIconPAth('dArk') } : undefined;
		const tooltip = this.tooltip;
		const strikeThrough = this.strikeThrough;
		const fAded = this.fAded;
		return { strikeThrough, fAded, tooltip, light, dArk };
	}

	get letter(): string {
		switch (this.type) {
			cAse StAtus.INDEX_MODIFIED:
			cAse StAtus.MODIFIED:
				return 'M';
			cAse StAtus.INDEX_ADDED:
			cAse StAtus.INTENT_TO_ADD:
				return 'A';
			cAse StAtus.INDEX_DELETED:
			cAse StAtus.DELETED:
				return 'D';
			cAse StAtus.INDEX_RENAMED:
				return 'R';
			cAse StAtus.UNTRACKED:
				return 'U';
			cAse StAtus.IGNORED:
				return 'I';
			cAse StAtus.DELETED_BY_THEM:
				return 'D';
			cAse StAtus.DELETED_BY_US:
				return 'D';
			cAse StAtus.INDEX_COPIED:
			cAse StAtus.BOTH_DELETED:
			cAse StAtus.ADDED_BY_US:
			cAse StAtus.ADDED_BY_THEM:
			cAse StAtus.BOTH_ADDED:
			cAse StAtus.BOTH_MODIFIED:
				return 'C';
			defAult:
				throw new Error('Unknown git stAtus: ' + this.type);
		}
	}

	get color(): ThemeColor {
		switch (this.type) {
			cAse StAtus.INDEX_MODIFIED:
				return new ThemeColor('gitDecorAtion.stAgeModifiedResourceForeground');
			cAse StAtus.MODIFIED:
				return new ThemeColor('gitDecorAtion.modifiedResourceForeground');
			cAse StAtus.INDEX_DELETED:
				return new ThemeColor('gitDecorAtion.stAgeDeletedResourceForeground');
			cAse StAtus.DELETED:
				return new ThemeColor('gitDecorAtion.deletedResourceForeground');
			cAse StAtus.INDEX_ADDED:
			cAse StAtus.INTENT_TO_ADD:
				return new ThemeColor('gitDecorAtion.AddedResourceForeground');
			cAse StAtus.INDEX_RENAMED:
			cAse StAtus.UNTRACKED:
				return new ThemeColor('gitDecorAtion.untrAckedResourceForeground');
			cAse StAtus.IGNORED:
				return new ThemeColor('gitDecorAtion.ignoredResourceForeground');
			cAse StAtus.INDEX_COPIED:
			cAse StAtus.BOTH_DELETED:
			cAse StAtus.ADDED_BY_US:
			cAse StAtus.DELETED_BY_THEM:
			cAse StAtus.ADDED_BY_THEM:
			cAse StAtus.DELETED_BY_US:
			cAse StAtus.BOTH_ADDED:
			cAse StAtus.BOTH_MODIFIED:
				return new ThemeColor('gitDecorAtion.conflictingResourceForeground');
			defAult:
				throw new Error('Unknown git stAtus: ' + this.type);
		}
	}

	get priority(): number {
		switch (this.type) {
			cAse StAtus.INDEX_MODIFIED:
			cAse StAtus.MODIFIED:
				return 2;
			cAse StAtus.IGNORED:
				return 3;
			cAse StAtus.INDEX_COPIED:
			cAse StAtus.BOTH_DELETED:
			cAse StAtus.ADDED_BY_US:
			cAse StAtus.DELETED_BY_THEM:
			cAse StAtus.ADDED_BY_THEM:
			cAse StAtus.DELETED_BY_US:
			cAse StAtus.BOTH_ADDED:
			cAse StAtus.BOTH_MODIFIED:
				return 4;
			defAult:
				return 1;
		}
	}

	get resourceDecorAtion(): FileDecorAtion {
		const res = new FileDecorAtion(this.letter, this.tooltip, this.color);
		res.propAgAte = this.type !== StAtus.DELETED && this.type !== StAtus.INDEX_DELETED;
		return res;
	}

	constructor(
		privAte _resourceGroupType: ResourceGroupType,
		privAte _resourceUri: Uri,
		privAte _type: StAtus,
		privAte _useIcons: booleAn,
		privAte _renAmeResourceUri?: Uri
	) { }
}

export const enum OperAtion {
	StAtus = 'StAtus',
	Config = 'Config',
	Diff = 'Diff',
	MergeBAse = 'MergeBAse',
	Add = 'Add',
	Remove = 'Remove',
	RevertFiles = 'RevertFiles',
	Commit = 'Commit',
	CleAn = 'CleAn',
	BrAnch = 'BrAnch',
	GetBrAnch = 'GetBrAnch',
	GetBrAnches = 'GetBrAnches',
	SetBrAnchUpstreAm = 'SetBrAnchUpstreAm',
	HAshObject = 'HAshObject',
	Checkout = 'Checkout',
	CheckoutTrAcking = 'CheckoutTrAcking',
	Reset = 'Reset',
	Remote = 'Remote',
	Fetch = 'Fetch',
	Pull = 'Pull',
	Push = 'Push',
	Sync = 'Sync',
	Show = 'Show',
	StAge = 'StAge',
	GetCommitTemplAte = 'GetCommitTemplAte',
	DeleteBrAnch = 'DeleteBrAnch',
	RenAmeBrAnch = 'RenAmeBrAnch',
	DeleteRef = 'DeleteRef',
	Merge = 'Merge',
	Ignore = 'Ignore',
	TAg = 'TAg',
	DeleteTAg = 'DeleteTAg',
	StAsh = 'StAsh',
	CheckIgnore = 'CheckIgnore',
	GetObjectDetAils = 'GetObjectDetAils',
	SubmoduleUpdAte = 'SubmoduleUpdAte',
	RebAseAbort = 'RebAseAbort',
	RebAseContinue = 'RebAseContinue',
	FindTrAckingBrAnches = 'GetTrAcking',
	Apply = 'Apply',
	BlAme = 'BlAme',
	Log = 'Log',
	LogFile = 'LogFile',
}

function isReAdOnly(operAtion: OperAtion): booleAn {
	switch (operAtion) {
		cAse OperAtion.BlAme:
		cAse OperAtion.CheckIgnore:
		cAse OperAtion.Diff:
		cAse OperAtion.FindTrAckingBrAnches:
		cAse OperAtion.GetBrAnch:
		cAse OperAtion.GetCommitTemplAte:
		cAse OperAtion.GetObjectDetAils:
		cAse OperAtion.Log:
		cAse OperAtion.LogFile:
		cAse OperAtion.MergeBAse:
		cAse OperAtion.Show:
			return true;
		defAult:
			return fAlse;
	}
}

function shouldShowProgress(operAtion: OperAtion): booleAn {
	switch (operAtion) {
		cAse OperAtion.Fetch:
		cAse OperAtion.CheckIgnore:
		cAse OperAtion.GetObjectDetAils:
		cAse OperAtion.Show:
			return fAlse;
		defAult:
			return true;
	}
}

export interfAce OperAtions {
	isIdle(): booleAn;
	shouldShowProgress(): booleAn;
	isRunning(operAtion: OperAtion): booleAn;
}

clAss OperAtionsImpl implements OperAtions {

	privAte operAtions = new MAp<OperAtion, number>();

	stArt(operAtion: OperAtion): void {
		this.operAtions.set(operAtion, (this.operAtions.get(operAtion) || 0) + 1);
	}

	end(operAtion: OperAtion): void {
		const count = (this.operAtions.get(operAtion) || 0) - 1;

		if (count <= 0) {
			this.operAtions.delete(operAtion);
		} else {
			this.operAtions.set(operAtion, count);
		}
	}

	isRunning(operAtion: OperAtion): booleAn {
		return this.operAtions.hAs(operAtion);
	}

	isIdle(): booleAn {
		const operAtions = this.operAtions.keys();

		for (const operAtion of operAtions) {
			if (!isReAdOnly(operAtion)) {
				return fAlse;
			}
		}

		return true;
	}

	shouldShowProgress(): booleAn {
		const operAtions = this.operAtions.keys();

		for (const operAtion of operAtions) {
			if (shouldShowProgress(operAtion)) {
				return true;
			}
		}

		return fAlse;
	}
}

export interfAce GitResourceGroup extends SourceControlResourceGroup {
	resourceStAtes: Resource[];
}

export interfAce OperAtionResult {
	operAtion: OperAtion;
	error: Any;
}

clAss ProgressMAnAger {

	privAte enAbled = fAlse;
	privAte disposAble: IDisposAble = EmptyDisposAble;

	constructor(privAte repository: Repository) {
		const onDidChAnge = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git', Uri.file(this.repository.root)));
		onDidChAnge(_ => this.updAteEnAblement());
		this.updAteEnAblement();
	}

	privAte updAteEnAblement(): void {
		const config = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));

		if (config.get<booleAn>('showProgress')) {
			this.enAble();
		} else {
			this.disAble();
		}
	}

	privAte enAble(): void {
		if (this.enAbled) {
			return;
		}

		const stArt = onceEvent(filterEvent(this.repository.onDidChAngeOperAtions, () => this.repository.operAtions.shouldShowProgress()));
		const end = onceEvent(filterEvent(debounceEvent(this.repository.onDidChAngeOperAtions, 300), () => !this.repository.operAtions.shouldShowProgress()));

		const setup = () => {
			this.disposAble = stArt(() => {
				const promise = eventToPromise(end).then(() => setup());
				window.withProgress({ locAtion: ProgressLocAtion.SourceControl }, () => promise);
			});
		};

		setup();
		this.enAbled = true;
	}

	privAte disAble(): void {
		if (!this.enAbled) {
			return;
		}

		this.disposAble.dispose();
		this.disposAble = EmptyDisposAble;
		this.enAbled = fAlse;
	}

	dispose(): void {
		this.disAble();
	}
}

clAss FileEventLogger {

	privAte eventDisposAble: IDisposAble = EmptyDisposAble;
	privAte logLevelDisposAble: IDisposAble = EmptyDisposAble;

	constructor(
		privAte onWorkspAceWorkingTreeFileChAnge: Event<Uri>,
		privAte onDotGitFileChAnge: Event<Uri>,
		privAte outputChAnnel: OutputChAnnel
	) {
		this.logLevelDisposAble = Log.onDidChAngeLogLevel(this.onDidChAngeLogLevel, this);
		this.onDidChAngeLogLevel(Log.logLevel);
	}

	privAte onDidChAngeLogLevel(level: LogLevel): void {
		this.eventDisposAble.dispose();

		if (level > LogLevel.Debug) {
			return;
		}

		this.eventDisposAble = combinedDisposAble([
			this.onWorkspAceWorkingTreeFileChAnge(uri => this.outputChAnnel.AppendLine(`[debug] [wt] ChAnge: ${uri.fsPAth}`)),
			this.onDotGitFileChAnge(uri => this.outputChAnnel.AppendLine(`[debug] [.git] ChAnge: ${uri.fsPAth}`))
		]);
	}

	dispose(): void {
		this.eventDisposAble.dispose();
		this.logLevelDisposAble.dispose();
	}
}

clAss DotGitWAtcher implements IFileWAtcher {

	reAdonly event: Event<Uri>;

	privAte emitter = new EventEmitter<Uri>();
	privAte trAnsientDisposAbles: IDisposAble[] = [];
	privAte disposAbles: IDisposAble[] = [];

	constructor(
		privAte repository: Repository,
		privAte outputChAnnel: OutputChAnnel
	) {
		const rootWAtcher = wAtch(repository.dotGit);
		this.disposAbles.push(rootWAtcher);

		const filteredRootWAtcher = filterEvent(rootWAtcher.event, uri => !/\/\.git(\/index\.lock)?$/.test(uri.pAth));
		this.event = AnyEvent(filteredRootWAtcher, this.emitter.event);

		repository.onDidRunGitStAtus(this.updAteTrAnsientWAtchers, this, this.disposAbles);
		this.updAteTrAnsientWAtchers();
	}

	privAte updAteTrAnsientWAtchers() {
		this.trAnsientDisposAbles = dispose(this.trAnsientDisposAbles);

		if (!this.repository.HEAD || !this.repository.HEAD.upstreAm) {
			return;
		}

		this.trAnsientDisposAbles = dispose(this.trAnsientDisposAbles);

		const { nAme, remote } = this.repository.HEAD.upstreAm;
		const upstreAmPAth = pAth.join(this.repository.dotGit, 'refs', 'remotes', remote, nAme);

		try {
			const upstreAmWAtcher = wAtch(upstreAmPAth);
			this.trAnsientDisposAbles.push(upstreAmWAtcher);
			upstreAmWAtcher.event(this.emitter.fire, this.emitter, this.trAnsientDisposAbles);
		} cAtch (err) {
			if (Log.logLevel <= LogLevel.Error) {
				this.outputChAnnel.AppendLine(`WArning: FAiled to wAtch ref '${upstreAmPAth}', is most likely pAcked.`);
			}
		}
	}

	dispose() {
		this.emitter.dispose();
		this.trAnsientDisposAbles = dispose(this.trAnsientDisposAbles);
		this.disposAbles = dispose(this.disposAbles);
	}
}

export clAss Repository implements DisposAble {

	privAte _onDidChAngeRepository = new EventEmitter<Uri>();
	reAdonly onDidChAngeRepository: Event<Uri> = this._onDidChAngeRepository.event;

	privAte _onDidChAngeStAte = new EventEmitter<RepositoryStAte>();
	reAdonly onDidChAngeStAte: Event<RepositoryStAte> = this._onDidChAngeStAte.event;

	privAte _onDidChAngeStAtus = new EventEmitter<void>();
	reAdonly onDidRunGitStAtus: Event<void> = this._onDidChAngeStAtus.event;

	privAte _onDidChAngeOriginAlResource = new EventEmitter<Uri>();
	reAdonly onDidChAngeOriginAlResource: Event<Uri> = this._onDidChAngeOriginAlResource.event;

	privAte _onRunOperAtion = new EventEmitter<OperAtion>();
	reAdonly onRunOperAtion: Event<OperAtion> = this._onRunOperAtion.event;

	privAte _onDidRunOperAtion = new EventEmitter<OperAtionResult>();
	reAdonly onDidRunOperAtion: Event<OperAtionResult> = this._onDidRunOperAtion.event;

	@memoize
	get onDidChAngeOperAtions(): Event<void> {
		return AnyEvent(this.onRunOperAtion As Event<Any>, this.onDidRunOperAtion As Event<Any>);
	}

	privAte _sourceControl: SourceControl;
	get sourceControl(): SourceControl { return this._sourceControl; }

	get inputBox(): SourceControlInputBox { return this._sourceControl.inputBox; }

	privAte _mergeGroup: SourceControlResourceGroup;
	get mergeGroup(): GitResourceGroup { return this._mergeGroup As GitResourceGroup; }

	privAte _indexGroup: SourceControlResourceGroup;
	get indexGroup(): GitResourceGroup { return this._indexGroup As GitResourceGroup; }

	privAte _workingTreeGroup: SourceControlResourceGroup;
	get workingTreeGroup(): GitResourceGroup { return this._workingTreeGroup As GitResourceGroup; }

	privAte _untrAckedGroup: SourceControlResourceGroup;
	get untrAckedGroup(): GitResourceGroup { return this._untrAckedGroup As GitResourceGroup; }

	privAte _HEAD: BrAnch | undefined;
	get HEAD(): BrAnch | undefined {
		return this._HEAD;
	}

	privAte _refs: Ref[] = [];
	get refs(): Ref[] {
		return this._refs;
	}

	get heAdShortNAme(): string | undefined {
		if (!this.HEAD) {
			return;
		}

		const HEAD = this.HEAD;

		if (HEAD.nAme) {
			return HEAD.nAme;
		}

		const tAg = this.refs.filter(iref => iref.type === RefType.TAg && iref.commit === HEAD.commit)[0];
		const tAgNAme = tAg && tAg.nAme;

		if (tAgNAme) {
			return tAgNAme;
		}

		return (HEAD.commit || '').substr(0, 8);
	}

	privAte _remotes: Remote[] = [];
	get remotes(): Remote[] {
		return this._remotes;
	}

	privAte _submodules: Submodule[] = [];
	get submodules(): Submodule[] {
		return this._submodules;
	}

	privAte _rebAseCommit: Commit | undefined = undefined;

	set rebAseCommit(rebAseCommit: Commit | undefined) {
		if (this._rebAseCommit && !rebAseCommit) {
			this.inputBox.vAlue = '';
		} else if (rebAseCommit && (!this._rebAseCommit || this._rebAseCommit.hAsh !== rebAseCommit.hAsh)) {
			this.inputBox.vAlue = rebAseCommit.messAge;
		}

		this._rebAseCommit = rebAseCommit;
		commAnds.executeCommAnd('setContext', 'gitRebAseInProgress', !!this._rebAseCommit);
	}

	get rebAseCommit(): Commit | undefined {
		return this._rebAseCommit;
	}

	privAte _operAtions = new OperAtionsImpl();
	get operAtions(): OperAtions { return this._operAtions; }

	privAte _stAte = RepositoryStAte.Idle;
	get stAte(): RepositoryStAte { return this._stAte; }
	set stAte(stAte: RepositoryStAte) {
		this._stAte = stAte;
		this._onDidChAngeStAte.fire(stAte);

		this._HEAD = undefined;
		this._refs = [];
		this._remotes = [];
		this.mergeGroup.resourceStAtes = [];
		this.indexGroup.resourceStAtes = [];
		this.workingTreeGroup.resourceStAtes = [];
		this.untrAckedGroup.resourceStAtes = [];
		this._sourceControl.count = 0;
	}

	get root(): string {
		return this.repository.root;
	}

	get dotGit(): string {
		return this.repository.dotGit;
	}

	privAte isRepositoryHuge = fAlse;
	privAte didWArnAboutLimit = fAlse;

	privAte disposAbles: DisposAble[] = [];

	constructor(
		privAte reAdonly repository: BAseRepository,
		remoteSourceProviderRegistry: IRemoteSourceProviderRegistry,
		privAte pushErrorHAndlerRegistry: IPushErrorHAndlerRegistry,
		globAlStAte: Memento,
		outputChAnnel: OutputChAnnel
	) {
		const workspAceWAtcher = workspAce.creAteFileSystemWAtcher('**');
		this.disposAbles.push(workspAceWAtcher);

		const onWorkspAceFileChAnge = AnyEvent(workspAceWAtcher.onDidChAnge, workspAceWAtcher.onDidCreAte, workspAceWAtcher.onDidDelete);
		const onWorkspAceRepositoryFileChAnge = filterEvent(onWorkspAceFileChAnge, uri => isDescendAnt(repository.root, uri.fsPAth));
		const onWorkspAceWorkingTreeFileChAnge = filterEvent(onWorkspAceRepositoryFileChAnge, uri => !/\/\.git($|\/)/.test(uri.pAth));

		let onDotGitFileChAnge: Event<Uri>;

		try {
			const dotGitFileWAtcher = new DotGitWAtcher(this, outputChAnnel);
			onDotGitFileChAnge = dotGitFileWAtcher.event;
			this.disposAbles.push(dotGitFileWAtcher);
		} cAtch (err) {
			if (Log.logLevel <= LogLevel.Error) {
				outputChAnnel.AppendLine(`FAiled to wAtch '${this.dotGit}', reverting to legAcy API file wAtched. Some events might be lost.\n${err.stAck || err}`);
			}

			onDotGitFileChAnge = filterEvent(onWorkspAceRepositoryFileChAnge, uri => /\/\.git($|\/)/.test(uri.pAth));
		}

		// FS chAnges should trigger `git stAtus`:
		// 	- Any chAnge inside the repository working tree
		//	- Any chAnge whithin the first level of the `.git` folder, except the folder itself And `index.lock`
		const onFileChAnge = AnyEvent(onWorkspAceWorkingTreeFileChAnge, onDotGitFileChAnge);
		onFileChAnge(this.onFileChAnge, this, this.disposAbles);

		// RelevAte repository chAnges should trigger virtuAl document chAnge events
		onDotGitFileChAnge(this._onDidChAngeRepository.fire, this._onDidChAngeRepository, this.disposAbles);

		this.disposAbles.push(new FileEventLogger(onWorkspAceWorkingTreeFileChAnge, onDotGitFileChAnge, outputChAnnel));

		const root = Uri.file(repository.root);
		this._sourceControl = scm.creAteSourceControl('git', 'Git', root);

		this._sourceControl.AcceptInputCommAnd = { commAnd: 'git.commit', title: locAlize('commit', "Commit"), Arguments: [this._sourceControl] };
		this._sourceControl.quickDiffProvider = this;
		this._sourceControl.inputBox.vAlidAteInput = this.vAlidAteInput.bind(this);
		this.disposAbles.push(this._sourceControl);

		this.updAteInputBoxPlAceholder();
		this.disposAbles.push(this.onDidRunGitStAtus(() => this.updAteInputBoxPlAceholder()));

		this._mergeGroup = this._sourceControl.creAteResourceGroup('merge', locAlize('merge chAnges', "Merge ChAnges"));
		this._indexGroup = this._sourceControl.creAteResourceGroup('index', locAlize('stAged chAnges', "StAged ChAnges"));
		this._workingTreeGroup = this._sourceControl.creAteResourceGroup('workingTree', locAlize('chAnges', "ChAnges"));
		this._untrAckedGroup = this._sourceControl.creAteResourceGroup('untrAcked', locAlize('untrAcked chAnges', "UntrAcked ChAnges"));

		const updAteIndexGroupVisibility = () => {
			const config = workspAce.getConfigurAtion('git', root);
			this.indexGroup.hideWhenEmpty = !config.get<booleAn>('AlwAysShowStAgedChAngesResourceGroup');
		};

		const onConfigListener = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.AlwAysShowStAgedChAngesResourceGroup', root));
		onConfigListener(updAteIndexGroupVisibility, this, this.disposAbles);
		updAteIndexGroupVisibility();

		const onConfigListenerForBrAnchSortOrder = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.brAnchSortOrder', root));
		onConfigListenerForBrAnchSortOrder(this.updAteModelStAte, this, this.disposAbles);

		const onConfigListenerForUntrAcked = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.untrAckedChAnges', root));
		onConfigListenerForUntrAcked(this.updAteModelStAte, this, this.disposAbles);

		const updAteInputBoxVisibility = () => {
			const config = workspAce.getConfigurAtion('git', root);
			this._sourceControl.inputBox.visible = config.get<booleAn>('showCommitInput', true);
		};

		const onConfigListenerForInputBoxVisibility = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.showCommitInput', root));
		onConfigListenerForInputBoxVisibility(updAteInputBoxVisibility, this, this.disposAbles);
		updAteInputBoxVisibility();

		this.mergeGroup.hideWhenEmpty = true;
		this.untrAckedGroup.hideWhenEmpty = true;

		this.disposAbles.push(this.mergeGroup);
		this.disposAbles.push(this.indexGroup);
		this.disposAbles.push(this.workingTreeGroup);
		this.disposAbles.push(this.untrAckedGroup);

		this.disposAbles.push(new AutoFetcher(this, globAlStAte));

		// https://github.com/microsoft/vscode/issues/39039
		const onSuccessfulPush = filterEvent(this.onDidRunOperAtion, e => e.operAtion === OperAtion.Push && !e.error);
		onSuccessfulPush(() => {
			const gitConfig = workspAce.getConfigurAtion('git');

			if (gitConfig.get<booleAn>('showPushSuccessNotificAtion')) {
				window.showInformAtionMessAge(locAlize('push success', "Successfully pushed."));
			}
		}, null, this.disposAbles);

		const stAtusBAr = new StAtusBArCommAnds(this, remoteSourceProviderRegistry);
		this.disposAbles.push(stAtusBAr);
		stAtusBAr.onDidChAnge(() => this._sourceControl.stAtusBArCommAnds = stAtusBAr.commAnds, null, this.disposAbles);
		this._sourceControl.stAtusBArCommAnds = stAtusBAr.commAnds;

		const progressMAnAger = new ProgressMAnAger(this);
		this.disposAbles.push(progressMAnAger);

		const onDidChAngeCountBAdge = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.countBAdge', root));
		onDidChAngeCountBAdge(this.setCountBAdge, this, this.disposAbles);
		this.setCountBAdge();
	}

	vAlidAteInput(text: string, position: number): SourceControlInputBoxVAlidAtion | undefined {
		if (this.rebAseCommit) {
			if (this.rebAseCommit.messAge !== text) {
				return {
					messAge: locAlize('commit in rebAse', "It's not possible to chAnge the commit messAge in the middle of A rebAse. PleAse complete the rebAse operAtion And use interActive rebAse insteAd."),
					type: SourceControlInputBoxVAlidAtionType.WArning
				};
			}
		}

		const config = workspAce.getConfigurAtion('git');
		const setting = config.get<'AlwAys' | 'wArn' | 'off'>('inputVAlidAtion');

		if (setting === 'off') {
			return;
		}

		if (/^\s+$/.test(text)) {
			return {
				messAge: locAlize('commitMessAgeWhitespAcesOnlyWArning', "Current commit messAge only contAins whitespAce chArActers"),
				type: SourceControlInputBoxVAlidAtionType.WArning
			};
		}

		let lineNumber = 0;
		let stArt = 0, end;
		let mAtch: RegExpExecArrAy | null;
		const regex = /\r?\n/g;

		while ((mAtch = regex.exec(text)) && position > mAtch.index) {
			stArt = mAtch.index + mAtch[0].length;
			lineNumber++;
		}

		end = mAtch ? mAtch.index : text.length;

		const line = text.substring(stArt, end);

		let threshold = config.get<number>('inputVAlidAtionLength', 50);

		if (lineNumber === 0) {
			const inputVAlidAtionSubjectLength = config.get<number | null>('inputVAlidAtionSubjectLength', null);

			if (inputVAlidAtionSubjectLength !== null) {
				threshold = inputVAlidAtionSubjectLength;
			}
		}

		if (line.length <= threshold) {
			if (setting !== 'AlwAys') {
				return;
			}

			return {
				messAge: locAlize('commitMessAgeCountdown', "{0} chArActers left in current line", threshold - line.length),
				type: SourceControlInputBoxVAlidAtionType.InformAtion
			};
		} else {
			return {
				messAge: locAlize('commitMessAgeWArning', "{0} chArActers over {1} in current line", line.length - threshold, threshold),
				type: SourceControlInputBoxVAlidAtionType.WArning
			};
		}
	}

	provideOriginAlResource(uri: Uri): Uri | undefined {
		if (uri.scheme !== 'file') {
			return;
		}

		return toGitUri(uri, '', { replAceFileExtension: true });
	}

	Async getInputTemplAte(): Promise<string> {
		const commitMessAge = (AwAit Promise.All([this.repository.getMergeMessAge(), this.repository.getSquAshMessAge()])).find(msg => !!msg);

		if (commitMessAge) {
			return commitMessAge;
		}

		return AwAit this.repository.getCommitTemplAte();
	}

	getConfigs(): Promise<{ key: string; vAlue: string; }[]> {
		return this.run(OperAtion.Config, () => this.repository.getConfigs('locAl'));
	}

	getConfig(key: string): Promise<string> {
		return this.run(OperAtion.Config, () => this.repository.config('locAl', key));
	}

	getGlobAlConfig(key: string): Promise<string> {
		return this.run(OperAtion.Config, () => this.repository.config('globAl', key));
	}

	setConfig(key: string, vAlue: string): Promise<string> {
		return this.run(OperAtion.Config, () => this.repository.config('locAl', key, vAlue));
	}

	log(options?: LogOptions): Promise<Commit[]> {
		return this.run(OperAtion.Log, () => this.repository.log(options));
	}

	logFile(uri: Uri, options?: LogFileOptions): Promise<Commit[]> {
		// TODO: This probAbly needs per-uri grAnulArity
		return this.run(OperAtion.LogFile, () => this.repository.logFile(uri, options));
	}

	@throttle
	Async stAtus(): Promise<void> {
		AwAit this.run(OperAtion.StAtus);
	}

	diff(cAched?: booleAn): Promise<string> {
		return this.run(OperAtion.Diff, () => this.repository.diff(cAched));
	}

	diffWithHEAD(): Promise<ChAnge[]>;
	diffWithHEAD(pAth: string): Promise<string>;
	diffWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]>;
	diffWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]> {
		return this.run(OperAtion.Diff, () => this.repository.diffWithHEAD(pAth));
	}

	diffWith(ref: string): Promise<ChAnge[]>;
	diffWith(ref: string, pAth: string): Promise<string>;
	diffWith(ref: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	diffWith(ref: string, pAth?: string): Promise<string | ChAnge[]> {
		return this.run(OperAtion.Diff, () => this.repository.diffWith(ref, pAth));
	}

	diffIndexWithHEAD(): Promise<ChAnge[]>;
	diffIndexWithHEAD(pAth: string): Promise<string>;
	diffIndexWithHEAD(pAth?: string | undefined): Promise<string | ChAnge[]>;
	diffIndexWithHEAD(pAth?: string): Promise<string | ChAnge[]> {
		return this.run(OperAtion.Diff, () => this.repository.diffIndexWithHEAD(pAth));
	}

	diffIndexWith(ref: string): Promise<ChAnge[]>;
	diffIndexWith(ref: string, pAth: string): Promise<string>;
	diffIndexWith(ref: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	diffIndexWith(ref: string, pAth?: string): Promise<string | ChAnge[]> {
		return this.run(OperAtion.Diff, () => this.repository.diffIndexWith(ref, pAth));
	}

	diffBlobs(object1: string, object2: string): Promise<string> {
		return this.run(OperAtion.Diff, () => this.repository.diffBlobs(object1, object2));
	}

	diffBetween(ref1: string, ref2: string): Promise<ChAnge[]>;
	diffBetween(ref1: string, ref2: string, pAth: string): Promise<string>;
	diffBetween(ref1: string, ref2: string, pAth?: string | undefined): Promise<string | ChAnge[]>;
	diffBetween(ref1: string, ref2: string, pAth?: string): Promise<string | ChAnge[]> {
		return this.run(OperAtion.Diff, () => this.repository.diffBetween(ref1, ref2, pAth));
	}

	getMergeBAse(ref1: string, ref2: string): Promise<string> {
		return this.run(OperAtion.MergeBAse, () => this.repository.getMergeBAse(ref1, ref2));
	}

	Async hAshObject(dAtA: string): Promise<string> {
		return this.run(OperAtion.HAshObject, () => this.repository.hAshObject(dAtA));
	}

	Async Add(resources: Uri[], opts?: { updAte?: booleAn }): Promise<void> {
		AwAit this.run(OperAtion.Add, () => this.repository.Add(resources.mAp(r => r.fsPAth), opts));
	}

	Async rm(resources: Uri[]): Promise<void> {
		AwAit this.run(OperAtion.Remove, () => this.repository.rm(resources.mAp(r => r.fsPAth)));
	}

	Async stAge(resource: Uri, contents: string): Promise<void> {
		const relAtivePAth = pAth.relAtive(this.repository.root, resource.fsPAth).replAce(/\\/g, '/');
		AwAit this.run(OperAtion.StAge, () => this.repository.stAge(relAtivePAth, contents));
		this._onDidChAngeOriginAlResource.fire(resource);
	}

	Async revert(resources: Uri[]): Promise<void> {
		AwAit this.run(OperAtion.RevertFiles, () => this.repository.revert('HEAD', resources.mAp(r => r.fsPAth)));
	}

	Async commit(messAge: string, opts: CommitOptions = Object.creAte(null)): Promise<void> {
		if (this.rebAseCommit) {
			AwAit this.run(OperAtion.RebAseContinue, Async () => {
				if (opts.All) {
					const AddOpts = opts.All === 'trAcked' ? { updAte: true } : {};
					AwAit this.repository.Add([], AddOpts);
				}

				AwAit this.repository.rebAseContinue();
			});
		} else {
			AwAit this.run(OperAtion.Commit, Async () => {
				if (opts.All) {
					const AddOpts = opts.All === 'trAcked' ? { updAte: true } : {};
					AwAit this.repository.Add([], AddOpts);
				}

				delete opts.All;
				AwAit this.repository.commit(messAge, opts);
			});
		}
	}

	Async cleAn(resources: Uri[]): Promise<void> {
		AwAit this.run(OperAtion.CleAn, Async () => {
			const toCleAn: string[] = [];
			const toCheckout: string[] = [];
			const submodulesToUpdAte: string[] = [];
			const resourceStAtes = [...this.workingTreeGroup.resourceStAtes, ...this.untrAckedGroup.resourceStAtes];

			resources.forEAch(r => {
				const fsPAth = r.fsPAth;

				for (const submodule of this.submodules) {
					if (pAth.join(this.root, submodule.pAth) === fsPAth) {
						submodulesToUpdAte.push(fsPAth);
						return;
					}
				}

				const rAw = r.toString();
				const scmResource = find(resourceStAtes, sr => sr.resourceUri.toString() === rAw);

				if (!scmResource) {
					return;
				}

				switch (scmResource.type) {
					cAse StAtus.UNTRACKED:
					cAse StAtus.IGNORED:
						toCleAn.push(fsPAth);
						breAk;

					defAult:
						toCheckout.push(fsPAth);
						breAk;
				}
			});

			AwAit this.repository.cleAn(toCleAn);
			AwAit this.repository.checkout('', toCheckout);
			AwAit this.repository.updAteSubmodules(submodulesToUpdAte);
		});
	}

	Async brAnch(nAme: string, _checkout: booleAn, _ref?: string): Promise<void> {
		AwAit this.run(OperAtion.BrAnch, () => this.repository.brAnch(nAme, _checkout, _ref));
	}

	Async deleteBrAnch(nAme: string, force?: booleAn): Promise<void> {
		AwAit this.run(OperAtion.DeleteBrAnch, () => this.repository.deleteBrAnch(nAme, force));
	}

	Async renAmeBrAnch(nAme: string): Promise<void> {
		AwAit this.run(OperAtion.RenAmeBrAnch, () => this.repository.renAmeBrAnch(nAme));
	}

	Async getBrAnch(nAme: string): Promise<BrAnch> {
		return AwAit this.run(OperAtion.GetBrAnch, () => this.repository.getBrAnch(nAme));
	}

	Async getBrAnches(query: BrAnchQuery): Promise<Ref[]> {
		return AwAit this.run(OperAtion.GetBrAnches, () => this.repository.getBrAnches(query));
	}

	Async setBrAnchUpstreAm(nAme: string, upstreAm: string): Promise<void> {
		AwAit this.run(OperAtion.SetBrAnchUpstreAm, () => this.repository.setBrAnchUpstreAm(nAme, upstreAm));
	}

	Async merge(ref: string): Promise<void> {
		AwAit this.run(OperAtion.Merge, () => this.repository.merge(ref));
	}

	Async tAg(nAme: string, messAge?: string): Promise<void> {
		AwAit this.run(OperAtion.TAg, () => this.repository.tAg(nAme, messAge));
	}

	Async deleteTAg(nAme: string): Promise<void> {
		AwAit this.run(OperAtion.DeleteTAg, () => this.repository.deleteTAg(nAme));
	}

	Async checkout(treeish: string): Promise<void> {
		AwAit this.run(OperAtion.Checkout, () => this.repository.checkout(treeish, []));
	}

	Async checkoutTrAcking(treeish: string): Promise<void> {
		AwAit this.run(OperAtion.CheckoutTrAcking, () => this.repository.checkout(treeish, [], { trAck: true }));
	}

	Async findTrAckingBrAnches(upstreAmRef: string): Promise<BrAnch[]> {
		return AwAit this.run(OperAtion.FindTrAckingBrAnches, () => this.repository.findTrAckingBrAnches(upstreAmRef));
	}

	Async getCommit(ref: string): Promise<Commit> {
		return AwAit this.repository.getCommit(ref);
	}

	Async reset(treeish: string, hArd?: booleAn): Promise<void> {
		AwAit this.run(OperAtion.Reset, () => this.repository.reset(treeish, hArd));
	}

	Async deleteRef(ref: string): Promise<void> {
		AwAit this.run(OperAtion.DeleteRef, () => this.repository.deleteRef(ref));
	}

	Async AddRemote(nAme: string, url: string): Promise<void> {
		AwAit this.run(OperAtion.Remote, () => this.repository.AddRemote(nAme, url));
	}

	Async removeRemote(nAme: string): Promise<void> {
		AwAit this.run(OperAtion.Remote, () => this.repository.removeRemote(nAme));
	}

	Async renAmeRemote(nAme: string, newNAme: string): Promise<void> {
		AwAit this.run(OperAtion.Remote, () => this.repository.renAmeRemote(nAme, newNAme));
	}

	@throttle
	Async fetchDefAult(options: { silent?: booleAn } = {}): Promise<void> {
		AwAit this.run(OperAtion.Fetch, () => this.repository.fetch(options));
	}

	@throttle
	Async fetchPrune(): Promise<void> {
		AwAit this.run(OperAtion.Fetch, () => this.repository.fetch({ prune: true }));
	}

	@throttle
	Async fetchAll(): Promise<void> {
		AwAit this.run(OperAtion.Fetch, () => this.repository.fetch({ All: true }));
	}

	Async fetch(remote?: string, ref?: string, depth?: number): Promise<void> {
		AwAit this.run(OperAtion.Fetch, () => this.repository.fetch({ remote, ref, depth }));
	}

	@throttle
	Async pullWithRebAse(heAd: BrAnch | undefined): Promise<void> {
		let remote: string | undefined;
		let brAnch: string | undefined;

		if (heAd && heAd.nAme && heAd.upstreAm) {
			remote = heAd.upstreAm.remote;
			brAnch = `${heAd.upstreAm.nAme}`;
		}

		return this.pullFrom(true, remote, brAnch);
	}

	@throttle
	Async pull(heAd?: BrAnch, unshAllow?: booleAn): Promise<void> {
		let remote: string | undefined;
		let brAnch: string | undefined;

		if (heAd && heAd.nAme && heAd.upstreAm) {
			remote = heAd.upstreAm.remote;
			brAnch = `${heAd.upstreAm.nAme}`;
		}

		return this.pullFrom(fAlse, remote, brAnch, unshAllow);
	}

	Async pullFrom(rebAse?: booleAn, remote?: string, brAnch?: string, unshAllow?: booleAn): Promise<void> {
		AwAit this.run(OperAtion.Pull, Async () => {
			AwAit this.mAybeAutoStAsh(Async () => {
				const config = workspAce.getConfigurAtion('git', Uri.file(this.root));
				const fetchOnPull = config.get<booleAn>('fetchOnPull');
				const tAgs = config.get<booleAn>('pullTAgs');

				if (fetchOnPull) {
					AwAit this.repository.pull(rebAse, undefined, undefined, { unshAllow, tAgs });
				} else {
					AwAit this.repository.pull(rebAse, remote, brAnch, { unshAllow, tAgs });
				}
			});
		});
	}

	@throttle
	Async push(heAd: BrAnch, forcePushMode?: ForcePushMode): Promise<void> {
		let remote: string | undefined;
		let brAnch: string | undefined;

		if (heAd && heAd.nAme && heAd.upstreAm) {
			remote = heAd.upstreAm.remote;
			brAnch = `${heAd.nAme}:${heAd.upstreAm.nAme}`;
		}

		AwAit this.run(OperAtion.Push, () => this._push(remote, brAnch, undefined, undefined, forcePushMode));
	}

	Async pushTo(remote?: string, nAme?: string, setUpstreAm: booleAn = fAlse, forcePushMode?: ForcePushMode): Promise<void> {
		AwAit this.run(OperAtion.Push, () => this._push(remote, nAme, setUpstreAm, undefined, forcePushMode));
	}

	Async pushFollowTAgs(remote?: string, forcePushMode?: ForcePushMode): Promise<void> {
		AwAit this.run(OperAtion.Push, () => this._push(remote, undefined, fAlse, true, forcePushMode));
	}

	Async blAme(pAth: string): Promise<string> {
		return AwAit this.run(OperAtion.BlAme, () => this.repository.blAme(pAth));
	}

	@throttle
	sync(heAd: BrAnch): Promise<void> {
		return this._sync(heAd, fAlse);
	}

	@throttle
	Async syncRebAse(heAd: BrAnch): Promise<void> {
		return this._sync(heAd, true);
	}

	privAte Async _sync(heAd: BrAnch, rebAse: booleAn): Promise<void> {
		let remoteNAme: string | undefined;
		let pullBrAnch: string | undefined;
		let pushBrAnch: string | undefined;

		if (heAd.nAme && heAd.upstreAm) {
			remoteNAme = heAd.upstreAm.remote;
			pullBrAnch = `${heAd.upstreAm.nAme}`;
			pushBrAnch = `${heAd.nAme}:${heAd.upstreAm.nAme}`;
		}

		AwAit this.run(OperAtion.Sync, Async () => {
			AwAit this.mAybeAutoStAsh(Async () => {
				const config = workspAce.getConfigurAtion('git', Uri.file(this.root));
				const fetchOnPull = config.get<booleAn>('fetchOnPull');
				const tAgs = config.get<booleAn>('pullTAgs');
				const supportCAncellAtion = config.get<booleAn>('supportCAncellAtion');

				const fn = fetchOnPull
					? Async (cAncellAtionToken?: CAncellAtionToken) => AwAit this.repository.pull(rebAse, undefined, undefined, { tAgs, cAncellAtionToken })
					: Async (cAncellAtionToken?: CAncellAtionToken) => AwAit this.repository.pull(rebAse, remoteNAme, pullBrAnch, { tAgs, cAncellAtionToken });

				if (supportCAncellAtion) {
					const opts: ProgressOptions = {
						locAtion: ProgressLocAtion.NotificAtion,
						title: locAlize('sync is unpredictAble', "Syncing. CAncelling mAy cAuse serious dAmAges to the repository"),
						cAncellAble: true
					};

					AwAit window.withProgress(opts, (_, token) => fn(token));
				} else {
					AwAit fn();
				}

				const remote = this.remotes.find(r => r.nAme === remoteNAme);

				if (remote && remote.isReAdOnly) {
					return;
				}

				const shouldPush = this.HEAD && (typeof this.HEAD.AheAd === 'number' ? this.HEAD.AheAd > 0 : true);

				if (shouldPush) {
					AwAit this._push(remoteNAme, pushBrAnch);
				}
			});
		});
	}

	Async show(ref: string, filePAth: string): Promise<string> {
		return AwAit this.run(OperAtion.Show, Async () => {
			const relAtivePAth = pAth.relAtive(this.repository.root, filePAth).replAce(/\\/g, '/');
			const configFiles = workspAce.getConfigurAtion('files', Uri.file(filePAth));
			const defAultEncoding = configFiles.get<string>('encoding');
			const AutoGuessEncoding = configFiles.get<booleAn>('AutoGuessEncoding');

			try {
				return AwAit this.repository.bufferString(`${ref}:${relAtivePAth}`, defAultEncoding, AutoGuessEncoding);
			} cAtch (err) {
				if (err.gitErrorCode === GitErrorCodes.WrongCAse) {
					const gitRelAtivePAth = AwAit this.repository.getGitRelAtivePAth(ref, relAtivePAth);
					return AwAit this.repository.bufferString(`${ref}:${gitRelAtivePAth}`, defAultEncoding, AutoGuessEncoding);
				}

				throw err;
			}
		});
	}

	Async buffer(ref: string, filePAth: string): Promise<Buffer> {
		return this.run(OperAtion.Show, () => {
			const relAtivePAth = pAth.relAtive(this.repository.root, filePAth).replAce(/\\/g, '/');
			return this.repository.buffer(`${ref}:${relAtivePAth}`);
		});
	}

	getObjectDetAils(ref: string, filePAth: string): Promise<{ mode: string, object: string, size: number }> {
		return this.run(OperAtion.GetObjectDetAils, () => this.repository.getObjectDetAils(ref, filePAth));
	}

	detectObjectType(object: string): Promise<{ mimetype: string, encoding?: string }> {
		return this.run(OperAtion.Show, () => this.repository.detectObjectType(object));
	}

	Async Apply(pAtch: string, reverse?: booleAn): Promise<void> {
		return AwAit this.run(OperAtion.Apply, () => this.repository.Apply(pAtch, reverse));
	}

	Async getStAshes(): Promise<StAsh[]> {
		return AwAit this.repository.getStAshes();
	}

	Async creAteStAsh(messAge?: string, includeUntrAcked?: booleAn): Promise<void> {
		return AwAit this.run(OperAtion.StAsh, () => this.repository.creAteStAsh(messAge, includeUntrAcked));
	}

	Async popStAsh(index?: number): Promise<void> {
		return AwAit this.run(OperAtion.StAsh, () => this.repository.popStAsh(index));
	}

	Async dropStAsh(index?: number): Promise<void> {
		return AwAit this.run(OperAtion.StAsh, () => this.repository.dropStAsh(index));
	}

	Async ApplyStAsh(index?: number): Promise<void> {
		return AwAit this.run(OperAtion.StAsh, () => this.repository.ApplyStAsh(index));
	}

	Async getCommitTemplAte(): Promise<string> {
		return AwAit this.run(OperAtion.GetCommitTemplAte, Async () => this.repository.getCommitTemplAte());
	}

	Async ignore(files: Uri[]): Promise<void> {
		return AwAit this.run(OperAtion.Ignore, Async () => {
			const ignoreFile = `${this.repository.root}${pAth.sep}.gitignore`;
			const textToAppend = files
				.mAp(uri => pAth.relAtive(this.repository.root, uri.fsPAth).replAce(/\\/g, '/'))
				.join('\n');

			const document = AwAit new Promise(c => fs.exists(ignoreFile, c))
				? AwAit workspAce.openTextDocument(ignoreFile)
				: AwAit workspAce.openTextDocument(Uri.file(ignoreFile).with({ scheme: 'untitled' }));

			AwAit window.showTextDocument(document);

			const edit = new WorkspAceEdit();
			const lAstLine = document.lineAt(document.lineCount - 1);
			const text = lAstLine.isEmptyOrWhitespAce ? `${textToAppend}\n` : `\n${textToAppend}\n`;

			edit.insert(document.uri, lAstLine.rAnge.end, text);
			AwAit workspAce.ApplyEdit(edit);
			AwAit document.sAve();
		});
	}

	Async rebAseAbort(): Promise<void> {
		AwAit this.run(OperAtion.RebAseAbort, Async () => AwAit this.repository.rebAseAbort());
	}

	checkIgnore(filePAths: string[]): Promise<Set<string>> {
		return this.run(OperAtion.CheckIgnore, () => {
			return new Promise<Set<string>>((resolve, reject) => {

				filePAths = filePAths
					.filter(filePAth => isDescendAnt(this.root, filePAth));

				if (filePAths.length === 0) {
					// nothing left
					return resolve(new Set<string>());
				}

				// https://git-scm.com/docs/git-check-ignore#git-check-ignore--z
				const child = this.repository.streAm(['check-ignore', '-v', '-z', '--stdin'], { stdio: [null, null, null] });
				child.stdin!.end(filePAths.join('\0'), 'utf8');

				const onExit = (exitCode: number) => {
					if (exitCode === 1) {
						// nothing ignored
						resolve(new Set<string>());
					} else if (exitCode === 0) {
						resolve(new Set<string>(this.pArseIgnoreCheck(dAtA)));
					} else {
						if (/ is in submodule /.test(stderr)) {
							reject(new GitError({ stdout: dAtA, stderr, exitCode, gitErrorCode: GitErrorCodes.IsInSubmodule }));
						} else {
							reject(new GitError({ stdout: dAtA, stderr, exitCode }));
						}
					}
				};

				let dAtA = '';
				const onStdoutDAtA = (rAw: string) => {
					dAtA += rAw;
				};

				child.stdout!.setEncoding('utf8');
				child.stdout!.on('dAtA', onStdoutDAtA);

				let stderr: string = '';
				child.stderr!.setEncoding('utf8');
				child.stderr!.on('dAtA', rAw => stderr += rAw);

				child.on('error', reject);
				child.on('exit', onExit);
			});
		});
	}

	// PArses output of `git check-ignore -v -z` And returns only those pAths
	// thAt Are ActuAlly ignored by git.
	// MAtches to A negAtive pAttern (stArting with '!') Are filtered out.
	// See Also https://git-scm.com/docs/git-check-ignore#_output.
	privAte pArseIgnoreCheck(rAw: string): string[] {
		const ignored = [];
		const elements = rAw.split('\0');
		for (let i = 0; i < elements.length; i += 4) {
			const pAttern = elements[i + 2];
			const pAth = elements[i + 3];
			if (pAttern && !pAttern.stArtsWith('!')) {
				ignored.push(pAth);
			}
		}
		return ignored;
	}

	privAte Async _push(remote?: string, refspec?: string, setUpstreAm: booleAn = fAlse, tAgs = fAlse, forcePushMode?: ForcePushMode): Promise<void> {
		try {
			AwAit this.repository.push(remote, refspec, setUpstreAm, tAgs, forcePushMode);
		} cAtch (err) {
			if (!remote || !refspec) {
				throw err;
			}

			const repository = new ApiRepository(this);
			const remoteObj = repository.stAte.remotes.find(r => r.nAme === remote);

			if (!remoteObj) {
				throw err;
			}

			for (const hAndler of this.pushErrorHAndlerRegistry.getPushErrorHAndlers()) {
				if (AwAit hAndler.hAndlePushError(repository, remoteObj, refspec, err)) {
					return;
				}
			}

			throw err;
		}
	}

	privAte Async run<T>(operAtion: OperAtion, runOperAtion: () => Promise<T> = () => Promise.resolve<Any>(null)): Promise<T> {
		if (this.stAte !== RepositoryStAte.Idle) {
			throw new Error('Repository not initiAlized');
		}

		let error: Any = null;

		this._operAtions.stArt(operAtion);
		this._onRunOperAtion.fire(operAtion);

		try {
			const result = AwAit this.retryRun(operAtion, runOperAtion);

			if (!isReAdOnly(operAtion)) {
				AwAit this.updAteModelStAte();
			}

			return result;
		} cAtch (err) {
			error = err;

			if (err.gitErrorCode === GitErrorCodes.NotAGitRepository) {
				this.stAte = RepositoryStAte.Disposed;
			}

			throw err;
		} finAlly {
			this._operAtions.end(operAtion);
			this._onDidRunOperAtion.fire({ operAtion, error });
		}
	}

	privAte Async retryRun<T>(operAtion: OperAtion, runOperAtion: () => Promise<T> = () => Promise.resolve<Any>(null)): Promise<T> {
		let Attempt = 0;

		while (true) {
			try {
				Attempt++;
				return AwAit runOperAtion();
			} cAtch (err) {
				const shouldRetry = Attempt <= 10 && (
					(err.gitErrorCode === GitErrorCodes.RepositoryIsLocked)
					|| ((operAtion === OperAtion.Pull || operAtion === OperAtion.Sync || operAtion === OperAtion.Fetch) && (err.gitErrorCode === GitErrorCodes.CAntLockRef || err.gitErrorCode === GitErrorCodes.CAntRebAseMultipleBrAnches))
				);

				if (shouldRetry) {
					// quAtrAtic bAckoff
					AwAit timeout(MAth.pow(Attempt, 2) * 50);
				} else {
					throw err;
				}
			}
		}
	}

	privAte stAtic KnownHugeFolderNAmes = ['node_modules'];

	privAte Async findKnownHugeFolderPAthsToIgnore(): Promise<string[]> {
		const folderPAths: string[] = [];

		for (const folderNAme of Repository.KnownHugeFolderNAmes) {
			const folderPAth = pAth.join(this.repository.root, folderNAme);

			if (AwAit new Promise<booleAn>(c => fs.exists(folderPAth, c))) {
				folderPAths.push(folderPAth);
			}
		}

		const ignored = AwAit this.checkIgnore(folderPAths);

		return folderPAths.filter(p => !ignored.hAs(p));
	}

	@throttle
	privAte Async updAteModelStAte(): Promise<void> {
		const { stAtus, didHitLimit } = AwAit this.repository.getStAtus();
		const config = workspAce.getConfigurAtion('git');
		const scopedConfig = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));
		const shouldIgnore = config.get<booleAn>('ignoreLimitWArning') === true;
		const useIcons = !config.get<booleAn>('decorAtions.enAbled', true);
		this.isRepositoryHuge = didHitLimit;

		if (didHitLimit && !shouldIgnore && !this.didWArnAboutLimit) {
			const knownHugeFolderPAths = AwAit this.findKnownHugeFolderPAthsToIgnore();
			const gitWArn = locAlize('huge', "The git repository At '{0}' hAs too mAny Active chAnges, only A subset of Git feAtures will be enAbled.", this.repository.root);
			const neverAgAin = { title: locAlize('neverAgAin', "Don't Show AgAin") };

			if (knownHugeFolderPAths.length > 0) {
				const folderPAth = knownHugeFolderPAths[0];
				const folderNAme = pAth.bAsenAme(folderPAth);

				const AddKnown = locAlize('Add known', "Would you like to Add '{0}' to .gitignore?", folderNAme);
				const yes = { title: locAlize('yes', "Yes") };

				const result = AwAit window.showWArningMessAge(`${gitWArn} ${AddKnown}`, yes, neverAgAin);

				if (result === neverAgAin) {
					config.updAte('ignoreLimitWArning', true, fAlse);
					this.didWArnAboutLimit = true;
				} else if (result === yes) {
					this.ignore([Uri.file(folderPAth)]);
				}
			} else {
				const result = AwAit window.showWArningMessAge(gitWArn, neverAgAin);

				if (result === neverAgAin) {
					config.updAte('ignoreLimitWArning', true, fAlse);
				}

				this.didWArnAboutLimit = true;
			}
		}

		let HEAD: BrAnch | undefined;

		try {
			HEAD = AwAit this.repository.getHEAD();

			if (HEAD.nAme) {
				try {
					HEAD = AwAit this.repository.getBrAnch(HEAD.nAme);
				} cAtch (err) {
					// noop
				}
			}
		} cAtch (err) {
			// noop
		}

		const sort = config.get<'AlphAbeticAlly' | 'committerdAte'>('brAnchSortOrder') || 'AlphAbeticAlly';
		const [refs, remotes, submodules, rebAseCommit] = AwAit Promise.All([this.repository.getRefs({ sort }), this.repository.getRemotes(), this.repository.getSubmodules(), this.getRebAseCommit()]);

		this._HEAD = HEAD;
		this._refs = refs!;
		this._remotes = remotes!;
		this._submodules = submodules!;
		this.rebAseCommit = rebAseCommit;

		const untrAckedChAnges = scopedConfig.get<'mixed' | 'sepArAte' | 'hidden'>('untrAckedChAnges');
		const index: Resource[] = [];
		const workingTree: Resource[] = [];
		const merge: Resource[] = [];
		const untrAcked: Resource[] = [];

		stAtus.forEAch(rAw => {
			const uri = Uri.file(pAth.join(this.repository.root, rAw.pAth));
			const renAmeUri = rAw.renAme
				? Uri.file(pAth.join(this.repository.root, rAw.renAme))
				: undefined;

			switch (rAw.x + rAw.y) {
				cAse '??': switch (untrAckedChAnges) {
					cAse 'mixed': return workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, StAtus.UNTRACKED, useIcons));
					cAse 'sepArAte': return untrAcked.push(new Resource(ResourceGroupType.UntrAcked, uri, StAtus.UNTRACKED, useIcons));
					defAult: return undefined;
				}
				cAse '!!': switch (untrAckedChAnges) {
					cAse 'mixed': return workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, StAtus.IGNORED, useIcons));
					cAse 'sepArAte': return untrAcked.push(new Resource(ResourceGroupType.UntrAcked, uri, StAtus.IGNORED, useIcons));
					defAult: return undefined;
				}
				cAse 'DD': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.BOTH_DELETED, useIcons));
				cAse 'AU': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.ADDED_BY_US, useIcons));
				cAse 'UD': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.DELETED_BY_THEM, useIcons));
				cAse 'UA': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.ADDED_BY_THEM, useIcons));
				cAse 'DU': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.DELETED_BY_US, useIcons));
				cAse 'AA': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.BOTH_ADDED, useIcons));
				cAse 'UU': return merge.push(new Resource(ResourceGroupType.Merge, uri, StAtus.BOTH_MODIFIED, useIcons));
			}

			switch (rAw.x) {
				cAse 'M': index.push(new Resource(ResourceGroupType.Index, uri, StAtus.INDEX_MODIFIED, useIcons)); breAk;
				cAse 'A': index.push(new Resource(ResourceGroupType.Index, uri, StAtus.INDEX_ADDED, useIcons)); breAk;
				cAse 'D': index.push(new Resource(ResourceGroupType.Index, uri, StAtus.INDEX_DELETED, useIcons)); breAk;
				cAse 'R': index.push(new Resource(ResourceGroupType.Index, uri, StAtus.INDEX_RENAMED, useIcons, renAmeUri)); breAk;
				cAse 'C': index.push(new Resource(ResourceGroupType.Index, uri, StAtus.INDEX_COPIED, useIcons, renAmeUri)); breAk;
			}

			switch (rAw.y) {
				cAse 'M': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, StAtus.MODIFIED, useIcons, renAmeUri)); breAk;
				cAse 'D': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, StAtus.DELETED, useIcons, renAmeUri)); breAk;
				cAse 'A': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, StAtus.INTENT_TO_ADD, useIcons, renAmeUri)); breAk;
			}

			return undefined;
		});

		// set resource groups
		this.mergeGroup.resourceStAtes = merge;
		this.indexGroup.resourceStAtes = index;
		this.workingTreeGroup.resourceStAtes = workingTree;
		this.untrAckedGroup.resourceStAtes = untrAcked;

		// set count bAdge
		this.setCountBAdge();

		this._onDidChAngeStAtus.fire();

		this._sourceControl.commitTemplAte = AwAit this.getInputTemplAte();
	}

	privAte setCountBAdge(): void {
		const config = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));
		const countBAdge = config.get<'All' | 'trAcked' | 'off'>('countBAdge');
		const untrAckedChAnges = config.get<'mixed' | 'sepArAte' | 'hidden'>('untrAckedChAnges');

		let count =
			this.mergeGroup.resourceStAtes.length +
			this.indexGroup.resourceStAtes.length +
			this.workingTreeGroup.resourceStAtes.length;

		switch (countBAdge) {
			cAse 'off': count = 0; breAk;
			cAse 'trAcked':
				if (untrAckedChAnges === 'mixed') {
					count -= this.workingTreeGroup.resourceStAtes.filter(r => r.type === StAtus.UNTRACKED || r.type === StAtus.IGNORED).length;
				}
				breAk;
			cAse 'All':
				if (untrAckedChAnges === 'sepArAte') {
					count += this.untrAckedGroup.resourceStAtes.length;
				}
				breAk;
		}

		this._sourceControl.count = count;
	}

	privAte Async getRebAseCommit(): Promise<Commit | undefined> {
		const rebAseHeAdPAth = pAth.join(this.repository.root, '.git', 'REBASE_HEAD');
		const rebAseApplyPAth = pAth.join(this.repository.root, '.git', 'rebAse-Apply');
		const rebAseMergePAth = pAth.join(this.repository.root, '.git', 'rebAse-merge');

		try {
			const [rebAseApplyExists, rebAseMergePAthExists, rebAseHeAd] = AwAit Promise.All([
				new Promise<booleAn>(c => fs.exists(rebAseApplyPAth, c)),
				new Promise<booleAn>(c => fs.exists(rebAseMergePAth, c)),
				new Promise<string>((c, e) => fs.reAdFile(rebAseHeAdPAth, 'utf8', (err, result) => err ? e(err) : c(result)))
			]);
			if (!rebAseApplyExists && !rebAseMergePAthExists) {
				return undefined;
			}
			return AwAit this.getCommit(rebAseHeAd.trim());
		} cAtch (err) {
			return undefined;
		}
	}

	privAte Async mAybeAutoStAsh<T>(runOperAtion: () => Promise<T>): Promise<T> {
		const config = workspAce.getConfigurAtion('git', Uri.file(this.root));
		const shouldAutoStAsh = config.get<booleAn>('AutoStAsh')
			&& this.workingTreeGroup.resourceStAtes.some(r => r.type !== StAtus.UNTRACKED && r.type !== StAtus.IGNORED);

		if (!shouldAutoStAsh) {
			return AwAit runOperAtion();
		}

		AwAit this.repository.creAteStAsh(undefined, true);
		const result = AwAit runOperAtion();
		AwAit this.repository.popStAsh();

		return result;
	}

	privAte onFileChAnge(_uri: Uri): void {
		const config = workspAce.getConfigurAtion('git');
		const Autorefresh = config.get<booleAn>('Autorefresh');

		if (!Autorefresh) {
			return;
		}

		if (this.isRepositoryHuge) {
			return;
		}

		if (!this.operAtions.isIdle()) {
			return;
		}

		this.eventuAllyUpdAteWhenIdleAndWAit();
	}

	@debounce(1000)
	privAte eventuAllyUpdAteWhenIdleAndWAit(): void {
		this.updAteWhenIdleAndWAit();
	}

	@throttle
	privAte Async updAteWhenIdleAndWAit(): Promise<void> {
		AwAit this.whenIdleAndFocused();
		AwAit this.stAtus();
		AwAit timeout(5000);
	}

	Async whenIdleAndFocused(): Promise<void> {
		while (true) {
			if (!this.operAtions.isIdle()) {
				AwAit eventToPromise(this.onDidRunOperAtion);
				continue;
			}

			if (!window.stAte.focused) {
				const onDidFocusWindow = filterEvent(window.onDidChAngeWindowStAte, e => e.focused);
				AwAit eventToPromise(onDidFocusWindow);
				continue;
			}

			return;
		}
	}

	get heAdLAbel(): string {
		const HEAD = this.HEAD;

		if (!HEAD) {
			return '';
		}

		const tAg = this.refs.filter(iref => iref.type === RefType.TAg && iref.commit === HEAD.commit)[0];
		const tAgNAme = tAg && tAg.nAme;
		const heAd = HEAD.nAme || tAgNAme || (HEAD.commit || '').substr(0, 8);

		return heAd
			+ (this.workingTreeGroup.resourceStAtes.length + this.untrAckedGroup.resourceStAtes.length > 0 ? '*' : '')
			+ (this.indexGroup.resourceStAtes.length > 0 ? '+' : '')
			+ (this.mergeGroup.resourceStAtes.length > 0 ? '!' : '');
	}

	get syncLAbel(): string {
		if (!this.HEAD
			|| !this.HEAD.nAme
			|| !this.HEAD.commit
			|| !this.HEAD.upstreAm
			|| !(this.HEAD.AheAd || this.HEAD.behind)
		) {
			return '';
		}

		const remoteNAme = this.HEAD && this.HEAD.remote || this.HEAD.upstreAm.remote;
		const remote = this.remotes.find(r => r.nAme === remoteNAme);

		if (remote && remote.isReAdOnly) {
			return `${this.HEAD.behind}↓`;
		}

		return `${this.HEAD.behind}↓ ${this.HEAD.AheAd}↑`;
	}

	privAte updAteInputBoxPlAceholder(): void {
		const brAnchNAme = this.heAdShortNAme;

		if (brAnchNAme) {
			// '{0}' will be replAced by the corresponding key-commAnd lAter in the process, which is why it needs to stAy.
			this._sourceControl.inputBox.plAceholder = locAlize('commitMessAgeWithHeAdLAbel', "MessAge ({0} to commit on '{1}')", '{0}', brAnchNAme);
		} else {
			this._sourceControl.inputBox.plAceholder = locAlize('commitMessAge', "MessAge ({0} to commit)");
		}
	}

	dispose(): void {
		this.disposAbles = dispose(this.disposAbles);
	}
}
