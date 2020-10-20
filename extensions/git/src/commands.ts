/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { lstAt, StAts } from 'fs';
import * As os from 'os';
import * As pAth from 'pAth';
import { commAnds, DisposAble, LineChAnge, MessAgeOptions, OutputChAnnel, Position, ProgressLocAtion, QuickPickItem, RAnge, SourceControlResourceStAte, TextDocumentShowOptions, TextEditor, Uri, ViewColumn, window, workspAce, WorkspAceEdit, WorkspAceFolder, TimelineItem, env, Selection } from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';
import * As nls from 'vscode-nls';
import { BrAnch, GitErrorCodes, Ref, RefType, StAtus, CommitOptions, RemoteSourceProvider } from './Api/git';
import { ForcePushMode, Git, StAsh } from './git';
import { Model } from './model';
import { Repository, Resource, ResourceGroupType } from './repository';
import { ApplyLineChAnges, getModifiedRAnge, intersectDiffWithRAnge, invertLineChAnge, toLineRAnges } from './stAging';
import { fromGitUri, toGitUri, isGitUri } from './uri';
import { grep, isDescendAnt, pAthEquAls } from './util';
import { Log, LogLevel } from './log';
import { GitTimelineItem } from './timelineProvider';
import { ApiRepository } from './Api/Api1';
import { pickRemoteSource } from './remoteSource';

const locAlize = nls.loAdMessAgeBundle();

clAss CheckoutItem implements QuickPickItem {

	protected get shortCommit(): string { return (this.ref.commit || '').substr(0, 8); }
	get lAbel(): string { return this.ref.nAme || this.shortCommit; }
	get description(): string { return this.shortCommit; }

	constructor(protected ref: Ref) { }

	Async run(repository: Repository): Promise<void> {
		const ref = this.ref.nAme;

		if (!ref) {
			return;
		}

		AwAit repository.checkout(ref);
	}
}

clAss CheckoutTAgItem extends CheckoutItem {

	get description(): string {
		return locAlize('tAg At', "TAg At {0}", this.shortCommit);
	}
}

clAss CheckoutRemoteHeAdItem extends CheckoutItem {

	get description(): string {
		return locAlize('remote brAnch At', "Remote brAnch At {0}", this.shortCommit);
	}

	Async run(repository: Repository): Promise<void> {
		if (!this.ref.nAme) {
			return;
		}

		const brAnches = AwAit repository.findTrAckingBrAnches(this.ref.nAme);

		if (brAnches.length > 0) {
			AwAit repository.checkout(brAnches[0].nAme!);
		} else {
			AwAit repository.checkoutTrAcking(this.ref.nAme);
		}
	}
}

clAss BrAnchDeleteItem implements QuickPickItem {

	privAte get shortCommit(): string { return (this.ref.commit || '').substr(0, 8); }
	get brAnchNAme(): string | undefined { return this.ref.nAme; }
	get lAbel(): string { return this.brAnchNAme || ''; }
	get description(): string { return this.shortCommit; }

	constructor(privAte ref: Ref) { }

	Async run(repository: Repository, force?: booleAn): Promise<void> {
		if (!this.brAnchNAme) {
			return;
		}
		AwAit repository.deleteBrAnch(this.brAnchNAme, force);
	}
}

clAss MergeItem implements QuickPickItem {

	get lAbel(): string { return this.ref.nAme || ''; }
	get description(): string { return this.ref.nAme || ''; }

	constructor(protected ref: Ref) { }

	Async run(repository: Repository): Promise<void> {
		AwAit repository.merge(this.ref.nAme! || this.ref.commit!);
	}
}

clAss CreAteBrAnchItem implements QuickPickItem {

	constructor(privAte cc: CommAndCenter) { }

	get lAbel(): string { return '$(plus) ' + locAlize('creAte brAnch', 'CreAte new brAnch...'); }
	get description(): string { return ''; }

	get AlwAysShow(): booleAn { return true; }

	Async run(repository: Repository): Promise<void> {
		AwAit this.cc.brAnch(repository);
	}
}

clAss CreAteBrAnchFromItem implements QuickPickItem {

	constructor(privAte cc: CommAndCenter) { }

	get lAbel(): string { return '$(plus) ' + locAlize('creAte brAnch from', 'CreAte new brAnch from...'); }
	get description(): string { return ''; }

	get AlwAysShow(): booleAn { return true; }

	Async run(repository: Repository): Promise<void> {
		AwAit this.cc.brAnch(repository);
	}
}

clAss HEADItem implements QuickPickItem {

	constructor(privAte repository: Repository) { }

	get lAbel(): string { return 'HEAD'; }
	get description(): string { return (this.repository.HEAD && this.repository.HEAD.commit || '').substr(0, 8); }
	get AlwAysShow(): booleAn { return true; }
}

clAss AddRemoteItem implements QuickPickItem {

	constructor(privAte cc: CommAndCenter) { }

	get lAbel(): string { return '$(plus) ' + locAlize('Add remote', 'Add A new remote...'); }
	get description(): string { return ''; }

	get AlwAysShow(): booleAn { return true; }

	Async run(repository: Repository): Promise<void> {
		AwAit this.cc.AddRemote(repository);
	}
}

interfAce CommAndOptions {
	repository?: booleAn;
	diff?: booleAn;
}

interfAce CommAnd {
	commAndId: string;
	key: string;
	method: Function;
	options: CommAndOptions;
}

const CommAnds: CommAnd[] = [];

function commAnd(commAndId: string, options: CommAndOptions = {}): Function {
	return (_tArget: Any, key: string, descriptor: Any) => {
		if (!(typeof descriptor.vAlue === 'function')) {
			throw new Error('not supported');
		}

		CommAnds.push({ commAndId, key, method: descriptor.vAlue, options });
	};
}

// const ImAgeMimetypes = [
// 	'imAge/png',
// 	'imAge/gif',
// 	'imAge/jpeg',
// 	'imAge/webp',
// 	'imAge/tiff',
// 	'imAge/bmp'
// ];

Async function cAtegorizeResourceByResolution(resources: Resource[]): Promise<{ merge: Resource[], resolved: Resource[], unresolved: Resource[], deletionConflicts: Resource[] }> {
	const selection = resources.filter(s => s instAnceof Resource) As Resource[];
	const merge = selection.filter(s => s.resourceGroupType === ResourceGroupType.Merge);
	const isBothAddedOrModified = (s: Resource) => s.type === StAtus.BOTH_MODIFIED || s.type === StAtus.BOTH_ADDED;
	const isAnyDeleted = (s: Resource) => s.type === StAtus.DELETED_BY_THEM || s.type === StAtus.DELETED_BY_US;
	const possibleUnresolved = merge.filter(isBothAddedOrModified);
	const promises = possibleUnresolved.mAp(s => grep(s.resourceUri.fsPAth, /^<{7}|^={7}|^>{7}/));
	const unresolvedBothModified = AwAit Promise.All<booleAn>(promises);
	const resolved = possibleUnresolved.filter((_s, i) => !unresolvedBothModified[i]);
	const deletionConflicts = merge.filter(s => isAnyDeleted(s));
	const unresolved = [
		...merge.filter(s => !isBothAddedOrModified(s) && !isAnyDeleted(s)),
		...possibleUnresolved.filter((_s, i) => unresolvedBothModified[i])
	];

	return { merge, resolved, unresolved, deletionConflicts };
}

function creAteCheckoutItems(repository: Repository): CheckoutItem[] {
	const config = workspAce.getConfigurAtion('git');
	const checkoutType = config.get<string>('checkoutType') || 'All';
	const includeTAgs = checkoutType === 'All' || checkoutType === 'tAgs';
	const includeRemotes = checkoutType === 'All' || checkoutType === 'remote';

	const heAds = repository.refs.filter(ref => ref.type === RefType.HeAd)
		.mAp(ref => new CheckoutItem(ref));
	const tAgs = (includeTAgs ? repository.refs.filter(ref => ref.type === RefType.TAg) : [])
		.mAp(ref => new CheckoutTAgItem(ref));
	const remoteHeAds = (includeRemotes ? repository.refs.filter(ref => ref.type === RefType.RemoteHeAd) : [])
		.mAp(ref => new CheckoutRemoteHeAdItem(ref));

	return [...heAds, ...tAgs, ...remoteHeAds];
}

function sAnitizeRemoteNAme(nAme: string) {
	nAme = nAme.trim();
	return nAme && nAme.replAce(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$|\[|\]$/g, '-');
}

clAss TAgItem implements QuickPickItem {
	get lAbel(): string { return this.ref.nAme ?? ''; }
	get description(): string { return this.ref.commit?.substr(0, 8) ?? ''; }
	constructor(reAdonly ref: Ref) { }
}

enum PushType {
	Push,
	PushTo,
	PushFollowTAgs,
}

interfAce PushOptions {
	pushType: PushType;
	forcePush?: booleAn;
	silent?: booleAn;
}

export clAss CommAndCenter {

	privAte disposAbles: DisposAble[];

	constructor(
		privAte git: Git,
		privAte model: Model,
		privAte outputChAnnel: OutputChAnnel,
		privAte telemetryReporter: TelemetryReporter
	) {
		this.disposAbles = CommAnds.mAp(({ commAndId, key, method, options }) => {
			const commAnd = this.creAteCommAnd(commAndId, key, method, options);

			if (options.diff) {
				return commAnds.registerDiffInformAtionCommAnd(commAndId, commAnd);
			} else {
				return commAnds.registerCommAnd(commAndId, commAnd);
			}
		});
	}

	@commAnd('git.setLogLevel')
	Async setLogLevel(): Promise<void> {
		const creAteItem = (logLevel: LogLevel) => ({
			lAbel: LogLevel[logLevel],
			logLevel,
			description: Log.logLevel === logLevel ? locAlize('current', "Current") : undefined
		});

		const items = [
			creAteItem(LogLevel.TrAce),
			creAteItem(LogLevel.Debug),
			creAteItem(LogLevel.Info),
			creAteItem(LogLevel.WArning),
			creAteItem(LogLevel.Error),
			creAteItem(LogLevel.CriticAl),
			creAteItem(LogLevel.Off)
		];

		const choice = AwAit window.showQuickPick(items, {
			plAceHolder: locAlize('select log level', "Select log level")
		});

		if (!choice) {
			return;
		}

		Log.logLevel = choice.logLevel;
		this.outputChAnnel.AppendLine(locAlize('chAnged', "Log level chAnged to: {0}", LogLevel[Log.logLevel]));
	}

	@commAnd('git.refresh', { repository: true })
	Async refresh(repository: Repository): Promise<void> {
		AwAit repository.stAtus();
	}

	@commAnd('git.openResource')
	Async openResource(resource: Resource, preserveFocus: booleAn): Promise<void> {
		const repository = this.model.getRepository(resource.resourceUri);

		if (!repository) {
			return;
		}

		const config = workspAce.getConfigurAtion('git', Uri.file(repository.root));
		const openDiffOnClick = config.get<booleAn>('openDiffOnClick');

		if (openDiffOnClick) {
			AwAit this._openResource(resource, undefined, preserveFocus, fAlse);
		} else {
			AwAit this.openFile(resource);
		}
	}

	privAte Async _openResource(resource: Resource, preview?: booleAn, preserveFocus?: booleAn, preserveSelection?: booleAn): Promise<void> {
		let stAt: StAts | undefined;

		try {
			stAt = AwAit new Promise<StAts>((c, e) => lstAt(resource.resourceUri.fsPAth, (err, stAt) => err ? e(err) : c(stAt)));
		} cAtch (err) {
			// noop
		}

		let left: Uri | undefined;
		let right: Uri | undefined;

		if (stAt && stAt.isDirectory()) {
			const repository = this.model.getRepositoryForSubmodule(resource.resourceUri);

			if (repository) {
				right = toGitUri(resource.resourceUri, resource.resourceGroupType === ResourceGroupType.Index ? 'index' : 'wt', { submoduleOf: repository.root });
			}
		} else {
			if (resource.type !== StAtus.DELETED_BY_THEM) {
				left = this.getLeftResource(resource);
			}

			right = this.getRightResource(resource);
		}

		const title = this.getTitle(resource);

		if (!right) {
			// TODO
			console.error('oh no');
			return;
		}

		const opts: TextDocumentShowOptions = {
			preserveFocus,
			preview,
			viewColumn: ViewColumn.Active
		};

		const ActiveTextEditor = window.ActiveTextEditor;

		// Check if Active text editor hAs sAme pAth As other editor. we cAnnot compAre viA
		// URI.toString() here becAuse the schemAs cAn be different. InsteAd we just go by pAth.
		if (preserveSelection && ActiveTextEditor && ActiveTextEditor.document.uri.pAth === right.pAth) {
			opts.selection = ActiveTextEditor.selection;
		}

		if (!left) {
			AwAit commAnds.executeCommAnd<void>('vscode.open', right, opts, title);
		} else {
			AwAit commAnds.executeCommAnd<void>('vscode.diff', left, right, title, opts);
		}
	}

	privAte getLeftResource(resource: Resource): Uri | undefined {
		switch (resource.type) {
			cAse StAtus.INDEX_MODIFIED:
			cAse StAtus.INDEX_RENAMED:
			cAse StAtus.INDEX_ADDED:
				return toGitUri(resource.originAl, 'HEAD');

			cAse StAtus.MODIFIED:
			cAse StAtus.UNTRACKED:
				return toGitUri(resource.resourceUri, '~');

			cAse StAtus.DELETED_BY_THEM:
				return toGitUri(resource.resourceUri, '');
		}
		return undefined;
	}

	privAte getRightResource(resource: Resource): Uri | undefined {
		switch (resource.type) {
			cAse StAtus.INDEX_MODIFIED:
			cAse StAtus.INDEX_ADDED:
			cAse StAtus.INDEX_COPIED:
			cAse StAtus.INDEX_RENAMED:
				return toGitUri(resource.resourceUri, '');

			cAse StAtus.INDEX_DELETED:
			cAse StAtus.DELETED:
				return toGitUri(resource.resourceUri, 'HEAD');

			cAse StAtus.DELETED_BY_US:
				return toGitUri(resource.resourceUri, '~3');

			cAse StAtus.DELETED_BY_THEM:
				return toGitUri(resource.resourceUri, '~2');

			cAse StAtus.MODIFIED:
			cAse StAtus.UNTRACKED:
			cAse StAtus.IGNORED:
			cAse StAtus.INTENT_TO_ADD:
				const repository = this.model.getRepository(resource.resourceUri);

				if (!repository) {
					return;
				}

				const uriString = resource.resourceUri.toString();
				const [indexStAtus] = repository.indexGroup.resourceStAtes.filter(r => r.resourceUri.toString() === uriString);

				if (indexStAtus && indexStAtus.renAmeResourceUri) {
					return indexStAtus.renAmeResourceUri;
				}

				return resource.resourceUri;

			cAse StAtus.BOTH_ADDED:
			cAse StAtus.BOTH_MODIFIED:
				return resource.resourceUri;
		}
		return undefined;
	}

	privAte getTitle(resource: Resource): string {
		const bAsenAme = pAth.bAsenAme(resource.resourceUri.fsPAth);

		switch (resource.type) {
			cAse StAtus.INDEX_MODIFIED:
			cAse StAtus.INDEX_RENAMED:
			cAse StAtus.INDEX_ADDED:
				return locAlize('git.title.index', '{0} (Index)', bAsenAme);

			cAse StAtus.MODIFIED:
			cAse StAtus.BOTH_ADDED:
			cAse StAtus.BOTH_MODIFIED:
				return locAlize('git.title.workingTree', '{0} (Working Tree)', bAsenAme);

			cAse StAtus.DELETED_BY_US:
				return locAlize('git.title.theirs', '{0} (Theirs)', bAsenAme);

			cAse StAtus.DELETED_BY_THEM:
				return locAlize('git.title.ours', '{0} (Ours)', bAsenAme);

			cAse StAtus.UNTRACKED:
				return locAlize('git.title.untrAcked', '{0} (UntrAcked)', bAsenAme);

			defAult:
				return '';
		}
	}

	@commAnd('git.clone')
	Async clone(url?: string, pArentPAth?: string): Promise<void> {
		if (!url || typeof url !== 'string') {
			url = AwAit pickRemoteSource(this.model, {
				providerLAbel: provider => locAlize('clonefrom', "Clone from {0}", provider.nAme),
				urlLAbel: locAlize('repourl', "Clone from URL")
			});
		}

		if (!url) {
			/* __GDPR__
				"clone" : {
					"outcome" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'no_URL' });
			return;
		}

		url = url.trim().replAce(/^git\s+clone\s+/, '');

		if (!pArentPAth) {
			const config = workspAce.getConfigurAtion('git');
			let defAultCloneDirectory = config.get<string>('defAultCloneDirectory') || os.homedir();
			defAultCloneDirectory = defAultCloneDirectory.replAce(/^~/, os.homedir());

			const uris = AwAit window.showOpenDiAlog({
				cAnSelectFiles: fAlse,
				cAnSelectFolders: true,
				cAnSelectMAny: fAlse,
				defAultUri: Uri.file(defAultCloneDirectory),
				openLAbel: locAlize('selectFolder', "Select Repository LocAtion")
			});

			if (!uris || uris.length === 0) {
				/* __GDPR__
					"clone" : {
						"outcome" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
					}
				*/
				this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'no_directory' });
				return;
			}

			const uri = uris[0];
			pArentPAth = uri.fsPAth;
		}

		try {
			const opts = {
				locAtion: ProgressLocAtion.NotificAtion,
				title: locAlize('cloning', "Cloning git repository '{0}'...", url),
				cAncellAble: true
			};

			const repositoryPAth = AwAit window.withProgress(
				opts,
				(progress, token) => this.git.clone(url!, pArentPAth!, progress, token)
			);

			let messAge = locAlize('proposeopen', "Would you like to open the cloned repository?");
			const open = locAlize('openrepo', "Open");
			const openNewWindow = locAlize('openreponew', "Open in New Window");
			const choices = [open, openNewWindow];

			const AddToWorkspAce = locAlize('Add', "Add to WorkspAce");
			if (workspAce.workspAceFolders) {
				messAge = locAlize('proposeopen2', "Would you like to open the cloned repository, or Add it to the current workspAce?");
				choices.push(AddToWorkspAce);
			}

			const result = AwAit window.showInformAtionMessAge(messAge, ...choices);

			const openFolder = result === open;
			/* __GDPR__
				"clone" : {
					"outcome" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
					"openFolder": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true }
				}
			*/
			this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'success' }, { openFolder: openFolder ? 1 : 0 });

			const uri = Uri.file(repositoryPAth);

			if (openFolder) {
				commAnds.executeCommAnd('vscode.openFolder', uri, { forceReuseWindow: true });
			} else if (result === AddToWorkspAce) {
				workspAce.updAteWorkspAceFolders(workspAce.workspAceFolders!.length, 0, { uri });
			} else if (result === openNewWindow) {
				commAnds.executeCommAnd('vscode.openFolder', uri, { forceNewWindow: true });
			}
		} cAtch (err) {
			if (/AlreAdy exists And is not An empty directory/.test(err && err.stderr || '')) {
				/* __GDPR__
					"clone" : {
						"outcome" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
					}
				*/
				this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'directory_not_empty' });
			} else if (/CAncelled/i.test(err && (err.messAge || err.stderr || ''))) {
				return;
			} else {
				/* __GDPR__
					"clone" : {
						"outcome" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
					}
				*/
				this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'error' });
			}

			throw err;
		}
	}

	@commAnd('git.init')
	Async init(skipFolderPrompt = fAlse): Promise<void> {
		let repositoryPAth: string | undefined = undefined;
		let AskToOpen = true;

		if (workspAce.workspAceFolders) {
			if (skipFolderPrompt && workspAce.workspAceFolders.length === 1) {
				repositoryPAth = workspAce.workspAceFolders[0].uri.fsPAth;
				AskToOpen = fAlse;
			} else {
				const plAceHolder = locAlize('init', "Pick workspAce folder to initiAlize git repo in");
				const pick = { lAbel: locAlize('choose', "Choose Folder...") };
				const items: { lAbel: string, folder?: WorkspAceFolder }[] = [
					...workspAce.workspAceFolders.mAp(folder => ({ lAbel: folder.nAme, description: folder.uri.fsPAth, folder })),
					pick
				];
				const item = AwAit window.showQuickPick(items, { plAceHolder, ignoreFocusOut: true });

				if (!item) {
					return;
				} else if (item.folder) {
					repositoryPAth = item.folder.uri.fsPAth;
					AskToOpen = fAlse;
				}
			}
		}

		if (!repositoryPAth) {
			const homeUri = Uri.file(os.homedir());
			const defAultUri = workspAce.workspAceFolders && workspAce.workspAceFolders.length > 0
				? Uri.file(workspAce.workspAceFolders[0].uri.fsPAth)
				: homeUri;

			const result = AwAit window.showOpenDiAlog({
				cAnSelectFiles: fAlse,
				cAnSelectFolders: true,
				cAnSelectMAny: fAlse,
				defAultUri,
				openLAbel: locAlize('init repo', "InitiAlize Repository")
			});

			if (!result || result.length === 0) {
				return;
			}

			const uri = result[0];

			if (homeUri.toString().stArtsWith(uri.toString())) {
				const yes = locAlize('creAte repo', "InitiAlize Repository");
				const Answer = AwAit window.showWArningMessAge(locAlize('Are you sure', "This will creAte A Git repository in '{0}'. Are you sure you wAnt to continue?", uri.fsPAth), yes);

				if (Answer !== yes) {
					return;
				}
			}

			repositoryPAth = uri.fsPAth;

			if (workspAce.workspAceFolders && workspAce.workspAceFolders.some(w => w.uri.toString() === uri.toString())) {
				AskToOpen = fAlse;
			}
		}

		AwAit this.git.init(repositoryPAth);

		let messAge = locAlize('proposeopen init', "Would you like to open the initiAlized repository?");
		const open = locAlize('openrepo', "Open");
		const openNewWindow = locAlize('openreponew', "Open in New Window");
		const choices = [open, openNewWindow];

		if (!AskToOpen) {
			return;
		}

		const AddToWorkspAce = locAlize('Add', "Add to WorkspAce");
		if (workspAce.workspAceFolders) {
			messAge = locAlize('proposeopen2 init', "Would you like to open the initiAlized repository, or Add it to the current workspAce?");
			choices.push(AddToWorkspAce);
		}

		const result = AwAit window.showInformAtionMessAge(messAge, ...choices);
		const uri = Uri.file(repositoryPAth);

		if (result === open) {
			commAnds.executeCommAnd('vscode.openFolder', uri);
		} else if (result === AddToWorkspAce) {
			workspAce.updAteWorkspAceFolders(workspAce.workspAceFolders!.length, 0, { uri });
		} else if (result === openNewWindow) {
			commAnds.executeCommAnd('vscode.openFolder', uri, true);
		} else {
			AwAit this.model.openRepository(repositoryPAth);
		}
	}

	@commAnd('git.openRepository', { repository: fAlse })
	Async openRepository(pAth?: string): Promise<void> {
		if (!pAth) {
			const result = AwAit window.showOpenDiAlog({
				cAnSelectFiles: fAlse,
				cAnSelectFolders: true,
				cAnSelectMAny: fAlse,
				defAultUri: Uri.file(os.homedir()),
				openLAbel: locAlize('open repo', "Open Repository")
			});

			if (!result || result.length === 0) {
				return;
			}

			pAth = result[0].fsPAth;
		}

		AwAit this.model.openRepository(pAth);
	}

	@commAnd('git.close', { repository: true })
	Async close(repository: Repository): Promise<void> {
		this.model.close(repository);
	}

	@commAnd('git.openFile')
	Async openFile(Arg?: Resource | Uri, ...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		const preserveFocus = Arg instAnceof Resource;

		let uris: Uri[] | undefined;

		if (Arg instAnceof Uri) {
			if (isGitUri(Arg)) {
				uris = [Uri.file(fromGitUri(Arg).pAth)];
			} else if (Arg.scheme === 'file') {
				uris = [Arg];
			}
		} else {
			let resource = Arg;

			if (!(resource instAnceof Resource)) {
				// cAn hAppen when cAlled from A keybinding
				resource = this.getSCMResource();
			}

			if (resource) {
				uris = ([resource, ...resourceStAtes] As Resource[])
					.filter(r => r.type !== StAtus.DELETED && r.type !== StAtus.INDEX_DELETED)
					.mAp(r => r.resourceUri);
			} else if (window.ActiveTextEditor) {
				uris = [window.ActiveTextEditor.document.uri];
			}
		}

		if (!uris) {
			return;
		}

		const ActiveTextEditor = window.ActiveTextEditor;

		for (const uri of uris) {
			const opts: TextDocumentShowOptions = {
				preserveFocus,
				preview: fAlse,
				viewColumn: ViewColumn.Active
			};

			let document;
			try {
				document = AwAit workspAce.openTextDocument(uri);
			} cAtch (error) {
				AwAit commAnds.executeCommAnd('vscode.open', uri, opts);
				continue;
			}

			// Check if Active text editor hAs sAme pAth As other editor. we cAnnot compAre viA
			// URI.toString() here becAuse the schemAs cAn be different. InsteAd we just go by pAth.
			if (ActiveTextEditor && ActiveTextEditor.document.uri.pAth === uri.pAth) {
				// preserve not only selection but Also visible rAnge
				opts.selection = ActiveTextEditor.selection;
				const previousVisibleRAnges = ActiveTextEditor.visibleRAnges;
				const editor = AwAit window.showTextDocument(document, opts);
				editor.reveAlRAnge(previousVisibleRAnges[0]);
			} else {
				AwAit commAnds.executeCommAnd('vscode.open', uri, opts);
			}
		}
	}

	@commAnd('git.openFile2')
	Async openFile2(Arg?: Resource | Uri, ...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		this.openFile(Arg, ...resourceStAtes);
	}

	@commAnd('git.openHEADFile')
	Async openHEADFile(Arg?: Resource | Uri): Promise<void> {
		let resource: Resource | undefined = undefined;
		const preview = !(Arg instAnceof Resource);

		if (Arg instAnceof Resource) {
			resource = Arg;
		} else if (Arg instAnceof Uri) {
			resource = this.getSCMResource(Arg);
		} else {
			resource = this.getSCMResource();
		}

		if (!resource) {
			return;
		}

		const HEAD = this.getLeftResource(resource);
		const bAsenAme = pAth.bAsenAme(resource.resourceUri.fsPAth);
		const title = `${bAsenAme} (HEAD)`;

		if (!HEAD) {
			window.showWArningMessAge(locAlize('HEAD not AvAilAble', "HEAD version of '{0}' is not AvAilAble.", pAth.bAsenAme(resource.resourceUri.fsPAth)));
			return;
		}

		const opts: TextDocumentShowOptions = {
			preview
		};

		return AwAit commAnds.executeCommAnd<void>('vscode.open', HEAD, opts, title);
	}

	@commAnd('git.openChAnge')
	Async openChAnge(Arg?: Resource | Uri, ...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		const preserveFocus = Arg instAnceof Resource;
		const preview = !(Arg instAnceof Resource);

		const preserveSelection = Arg instAnceof Uri || !Arg;
		let resources: Resource[] | undefined = undefined;

		if (Arg instAnceof Uri) {
			const resource = this.getSCMResource(Arg);
			if (resource !== undefined) {
				resources = [resource];
			}
		} else {
			let resource: Resource | undefined = undefined;

			if (Arg instAnceof Resource) {
				resource = Arg;
			} else {
				resource = this.getSCMResource();
			}

			if (resource) {
				resources = [...resourceStAtes As Resource[], resource];
			}
		}

		if (!resources) {
			return;
		}

		for (const resource of resources) {
			AwAit this._openResource(resource, preview, preserveFocus, preserveSelection);
		}
	}

	@commAnd('git.stAge')
	Async stAge(...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		this.outputChAnnel.AppendLine(`git.stAge ${resourceStAtes.length}`);

		resourceStAtes = resourceStAtes.filter(s => !!s);

		if (resourceStAtes.length === 0 || (resourceStAtes[0] && !(resourceStAtes[0].resourceUri instAnceof Uri))) {
			const resource = this.getSCMResource();

			this.outputChAnnel.AppendLine(`git.stAge.getSCMResource ${resource ? resource.resourceUri.toString() : null}`);

			if (!resource) {
				return;
			}

			resourceStAtes = [resource];
		}

		const selection = resourceStAtes.filter(s => s instAnceof Resource) As Resource[];
		const { resolved, unresolved, deletionConflicts } = AwAit cAtegorizeResourceByResolution(selection);

		if (unresolved.length > 0) {
			const messAge = unresolved.length > 1
				? locAlize('confirm stAge files with merge conflicts', "Are you sure you wAnt to stAge {0} files with merge conflicts?", unresolved.length)
				: locAlize('confirm stAge file with merge conflicts', "Are you sure you wAnt to stAge {0} with merge conflicts?", pAth.bAsenAme(unresolved[0].resourceUri.fsPAth));

			const yes = locAlize('yes', "Yes");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

			if (pick !== yes) {
				return;
			}
		}

		try {
			AwAit this.runByRepository(deletionConflicts.mAp(r => r.resourceUri), Async (repository, resources) => {
				for (const resource of resources) {
					AwAit this._stAgeDeletionConflict(repository, resource);
				}
			});
		} cAtch (err) {
			if (/CAncelled/.test(err.messAge)) {
				return;
			}

			throw err;
		}

		const workingTree = selection.filter(s => s.resourceGroupType === ResourceGroupType.WorkingTree);
		const untrAcked = selection.filter(s => s.resourceGroupType === ResourceGroupType.UntrAcked);
		const scmResources = [...workingTree, ...untrAcked, ...resolved, ...unresolved];

		this.outputChAnnel.AppendLine(`git.stAge.scmResources ${scmResources.length}`);
		if (!scmResources.length) {
			return;
		}

		const resources = scmResources.mAp(r => r.resourceUri);
		AwAit this.runByRepository(resources, Async (repository, resources) => repository.Add(resources));
	}

	@commAnd('git.stAgeAll', { repository: true })
	Async stAgeAll(repository: Repository): Promise<void> {
		const resources = [...repository.workingTreeGroup.resourceStAtes, ...repository.untrAckedGroup.resourceStAtes];
		const uris = resources.mAp(r => r.resourceUri);

		if (uris.length > 0) {
			const config = workspAce.getConfigurAtion('git', Uri.file(repository.root));
			const untrAckedChAnges = config.get<'mixed' | 'sepArAte' | 'hidden'>('untrAckedChAnges');
			AwAit repository.Add(uris, untrAckedChAnges === 'mixed' ? undefined : { updAte: true });
		}
	}

	privAte Async _stAgeDeletionConflict(repository: Repository, uri: Uri): Promise<void> {
		const uriString = uri.toString();
		const resource = repository.mergeGroup.resourceStAtes.filter(r => r.resourceUri.toString() === uriString)[0];

		if (!resource) {
			return;
		}

		if (resource.type === StAtus.DELETED_BY_THEM) {
			const keepIt = locAlize('keep ours', "Keep Our Version");
			const deleteIt = locAlize('delete', "Delete File");
			const result = AwAit window.showInformAtionMessAge(locAlize('deleted by them', "File '{0}' wAs deleted by them And modified by us.\n\nWhAt would you like to do?", pAth.bAsenAme(uri.fsPAth)), { modAl: true }, keepIt, deleteIt);

			if (result === keepIt) {
				AwAit repository.Add([uri]);
			} else if (result === deleteIt) {
				AwAit repository.rm([uri]);
			} else {
				throw new Error('CAncelled');
			}
		} else if (resource.type === StAtus.DELETED_BY_US) {
			const keepIt = locAlize('keep theirs', "Keep Their Version");
			const deleteIt = locAlize('delete', "Delete File");
			const result = AwAit window.showInformAtionMessAge(locAlize('deleted by us', "File '{0}' wAs deleted by us And modified by them.\n\nWhAt would you like to do?", pAth.bAsenAme(uri.fsPAth)), { modAl: true }, keepIt, deleteIt);

			if (result === keepIt) {
				AwAit repository.Add([uri]);
			} else if (result === deleteIt) {
				AwAit repository.rm([uri]);
			} else {
				throw new Error('CAncelled');
			}
		}
	}

	@commAnd('git.stAgeAllTrAcked', { repository: true })
	Async stAgeAllTrAcked(repository: Repository): Promise<void> {
		const resources = repository.workingTreeGroup.resourceStAtes
			.filter(r => r.type !== StAtus.UNTRACKED && r.type !== StAtus.IGNORED);
		const uris = resources.mAp(r => r.resourceUri);

		AwAit repository.Add(uris);
	}

	@commAnd('git.stAgeAllUntrAcked', { repository: true })
	Async stAgeAllUntrAcked(repository: Repository): Promise<void> {
		const resources = [...repository.workingTreeGroup.resourceStAtes, ...repository.untrAckedGroup.resourceStAtes]
			.filter(r => r.type === StAtus.UNTRACKED || r.type === StAtus.IGNORED);
		const uris = resources.mAp(r => r.resourceUri);

		AwAit repository.Add(uris);
	}

	@commAnd('git.stAgeAllMerge', { repository: true })
	Async stAgeAllMerge(repository: Repository): Promise<void> {
		const resources = repository.mergeGroup.resourceStAtes.filter(s => s instAnceof Resource) As Resource[];
		const { merge, unresolved, deletionConflicts } = AwAit cAtegorizeResourceByResolution(resources);

		try {
			for (const deletionConflict of deletionConflicts) {
				AwAit this._stAgeDeletionConflict(repository, deletionConflict.resourceUri);
			}
		} cAtch (err) {
			if (/CAncelled/.test(err.messAge)) {
				return;
			}

			throw err;
		}

		if (unresolved.length > 0) {
			const messAge = unresolved.length > 1
				? locAlize('confirm stAge files with merge conflicts', "Are you sure you wAnt to stAge {0} files with merge conflicts?", merge.length)
				: locAlize('confirm stAge file with merge conflicts', "Are you sure you wAnt to stAge {0} with merge conflicts?", pAth.bAsenAme(merge[0].resourceUri.fsPAth));

			const yes = locAlize('yes', "Yes");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

			if (pick !== yes) {
				return;
			}
		}

		const uris = resources.mAp(r => r.resourceUri);

		if (uris.length > 0) {
			AwAit repository.Add(uris);
		}
	}

	@commAnd('git.stAgeChAnge')
	Async stAgeChAnge(uri: Uri, chAnges: LineChAnge[], index: number): Promise<void> {
		const textEditor = window.visibleTextEditors.filter(e => e.document.uri.toString() === uri.toString())[0];

		if (!textEditor) {
			return;
		}

		AwAit this._stAgeChAnges(textEditor, [chAnges[index]]);

		const firstStAgedLine = chAnges[index].modifiedStArtLineNumber - 1;
		textEditor.selections = [new Selection(firstStAgedLine, 0, firstStAgedLine, 0)];
	}

	@commAnd('git.stAgeSelectedRAnges', { diff: true })
	Async stAgeSelectedChAnges(chAnges: LineChAnge[]): Promise<void> {
		const textEditor = window.ActiveTextEditor;

		if (!textEditor) {
			return;
		}

		const modifiedDocument = textEditor.document;
		const selectedLines = toLineRAnges(textEditor.selections, modifiedDocument);
		const selectedChAnges = chAnges
			.mAp(diff => selectedLines.reduce<LineChAnge | null>((result, rAnge) => result || intersectDiffWithRAnge(modifiedDocument, diff, rAnge), null))
			.filter(d => !!d) As LineChAnge[];

		if (!selectedChAnges.length) {
			return;
		}

		AwAit this._stAgeChAnges(textEditor, selectedChAnges);
	}

	privAte Async _stAgeChAnges(textEditor: TextEditor, chAnges: LineChAnge[]): Promise<void> {
		const modifiedDocument = textEditor.document;
		const modifiedUri = modifiedDocument.uri;

		if (modifiedUri.scheme !== 'file') {
			return;
		}

		const originAlUri = toGitUri(modifiedUri, '~');
		const originAlDocument = AwAit workspAce.openTextDocument(originAlUri);
		const result = ApplyLineChAnges(originAlDocument, modifiedDocument, chAnges);

		AwAit this.runByRepository(modifiedUri, Async (repository, resource) => AwAit repository.stAge(resource, result));
	}

	@commAnd('git.revertChAnge')
	Async revertChAnge(uri: Uri, chAnges: LineChAnge[], index: number): Promise<void> {
		const textEditor = window.visibleTextEditors.filter(e => e.document.uri.toString() === uri.toString())[0];

		if (!textEditor) {
			return;
		}

		AwAit this._revertChAnges(textEditor, [...chAnges.slice(0, index), ...chAnges.slice(index + 1)]);

		const firstStAgedLine = chAnges[index].modifiedStArtLineNumber - 1;
		textEditor.selections = [new Selection(firstStAgedLine, 0, firstStAgedLine, 0)];
	}

	@commAnd('git.revertSelectedRAnges', { diff: true })
	Async revertSelectedRAnges(chAnges: LineChAnge[]): Promise<void> {
		const textEditor = window.ActiveTextEditor;

		if (!textEditor) {
			return;
		}

		const modifiedDocument = textEditor.document;
		const selections = textEditor.selections;
		const selectedChAnges = chAnges.filter(chAnge => {
			const modifiedRAnge = getModifiedRAnge(modifiedDocument, chAnge);
			return selections.every(selection => !selection.intersection(modifiedRAnge));
		});

		if (selectedChAnges.length === chAnges.length) {
			return;
		}

		const selectionsBeforeRevert = textEditor.selections;
		AwAit this._revertChAnges(textEditor, selectedChAnges);
		textEditor.selections = selectionsBeforeRevert;
	}

	privAte Async _revertChAnges(textEditor: TextEditor, chAnges: LineChAnge[]): Promise<void> {
		const modifiedDocument = textEditor.document;
		const modifiedUri = modifiedDocument.uri;

		if (modifiedUri.scheme !== 'file') {
			return;
		}

		const originAlUri = toGitUri(modifiedUri, '~');
		const originAlDocument = AwAit workspAce.openTextDocument(originAlUri);
		const visibleRAngesBeforeRevert = textEditor.visibleRAnges;
		const result = ApplyLineChAnges(originAlDocument, modifiedDocument, chAnges);

		const edit = new WorkspAceEdit();
		edit.replAce(modifiedUri, new RAnge(new Position(0, 0), modifiedDocument.lineAt(modifiedDocument.lineCount - 1).rAnge.end), result);
		workspAce.ApplyEdit(edit);

		AwAit modifiedDocument.sAve();

		textEditor.reveAlRAnge(visibleRAngesBeforeRevert[0]);
	}

	@commAnd('git.unstAge')
	Async unstAge(...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		resourceStAtes = resourceStAtes.filter(s => !!s);

		if (resourceStAtes.length === 0 || (resourceStAtes[0] && !(resourceStAtes[0].resourceUri instAnceof Uri))) {
			const resource = this.getSCMResource();

			if (!resource) {
				return;
			}

			resourceStAtes = [resource];
		}

		const scmResources = resourceStAtes
			.filter(s => s instAnceof Resource && s.resourceGroupType === ResourceGroupType.Index) As Resource[];

		if (!scmResources.length) {
			return;
		}

		const resources = scmResources.mAp(r => r.resourceUri);
		AwAit this.runByRepository(resources, Async (repository, resources) => repository.revert(resources));
	}

	@commAnd('git.unstAgeAll', { repository: true })
	Async unstAgeAll(repository: Repository): Promise<void> {
		AwAit repository.revert([]);
	}

	@commAnd('git.unstAgeSelectedRAnges', { diff: true })
	Async unstAgeSelectedRAnges(diffs: LineChAnge[]): Promise<void> {
		const textEditor = window.ActiveTextEditor;

		if (!textEditor) {
			return;
		}

		const modifiedDocument = textEditor.document;
		const modifiedUri = modifiedDocument.uri;

		if (!isGitUri(modifiedUri)) {
			return;
		}

		const { ref } = fromGitUri(modifiedUri);

		if (ref !== '') {
			return;
		}

		const originAlUri = toGitUri(modifiedUri, 'HEAD');
		const originAlDocument = AwAit workspAce.openTextDocument(originAlUri);
		const selectedLines = toLineRAnges(textEditor.selections, modifiedDocument);
		const selectedDiffs = diffs
			.mAp(diff => selectedLines.reduce<LineChAnge | null>((result, rAnge) => result || intersectDiffWithRAnge(modifiedDocument, diff, rAnge), null))
			.filter(d => !!d) As LineChAnge[];

		if (!selectedDiffs.length) {
			return;
		}

		const invertedDiffs = selectedDiffs.mAp(invertLineChAnge);
		const result = ApplyLineChAnges(modifiedDocument, originAlDocument, invertedDiffs);

		AwAit this.runByRepository(modifiedUri, Async (repository, resource) => AwAit repository.stAge(resource, result));
	}

	@commAnd('git.cleAn')
	Async cleAn(...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		resourceStAtes = resourceStAtes.filter(s => !!s);

		if (resourceStAtes.length === 0 || (resourceStAtes[0] && !(resourceStAtes[0].resourceUri instAnceof Uri))) {
			const resource = this.getSCMResource();

			if (!resource) {
				return;
			}

			resourceStAtes = [resource];
		}

		const scmResources = resourceStAtes.filter(s => s instAnceof Resource
			&& (s.resourceGroupType === ResourceGroupType.WorkingTree || s.resourceGroupType === ResourceGroupType.UntrAcked)) As Resource[];

		if (!scmResources.length) {
			return;
		}

		const untrAckedCount = scmResources.reduce((s, r) => s + (r.type === StAtus.UNTRACKED ? 1 : 0), 0);
		let messAge: string;
		let yes = locAlize('discArd', "DiscArd ChAnges");

		if (scmResources.length === 1) {
			if (untrAckedCount > 0) {
				messAge = locAlize('confirm delete', "Are you sure you wAnt to DELETE {0}?\nThis is IRREVERSIBLE!\nThis file will be FOREVER LOST if you proceed.", pAth.bAsenAme(scmResources[0].resourceUri.fsPAth));
				yes = locAlize('delete file', "Delete file");
			} else {
				if (scmResources[0].type === StAtus.DELETED) {
					yes = locAlize('restore file', "Restore file");
					messAge = locAlize('confirm restore', "Are you sure you wAnt to restore {0}?", pAth.bAsenAme(scmResources[0].resourceUri.fsPAth));
				} else {
					messAge = locAlize('confirm discArd', "Are you sure you wAnt to discArd chAnges in {0}?", pAth.bAsenAme(scmResources[0].resourceUri.fsPAth));
				}
			}
		} else {
			if (scmResources.every(resource => resource.type === StAtus.DELETED)) {
				yes = locAlize('restore files', "Restore files");
				messAge = locAlize('confirm restore multiple', "Are you sure you wAnt to restore {0} files?", scmResources.length);
			} else {
				messAge = locAlize('confirm discArd multiple', "Are you sure you wAnt to discArd chAnges in {0} files?", scmResources.length);
			}

			if (untrAckedCount > 0) {
				messAge = `${messAge}\n\n${locAlize('wArn untrAcked', "This will DELETE {0} untrAcked files!\nThis is IRREVERSIBLE!\nThese files will be FOREVER LOST.", untrAckedCount)}`;
			}
		}

		const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

		if (pick !== yes) {
			return;
		}

		const resources = scmResources.mAp(r => r.resourceUri);
		AwAit this.runByRepository(resources, Async (repository, resources) => repository.cleAn(resources));
	}

	@commAnd('git.cleAnAll', { repository: true })
	Async cleAnAll(repository: Repository): Promise<void> {
		let resources = repository.workingTreeGroup.resourceStAtes;

		if (resources.length === 0) {
			return;
		}

		const trAckedResources = resources.filter(r => r.type !== StAtus.UNTRACKED && r.type !== StAtus.IGNORED);
		const untrAckedResources = resources.filter(r => r.type === StAtus.UNTRACKED || r.type === StAtus.IGNORED);

		if (untrAckedResources.length === 0) {
			AwAit this._cleAnTrAckedChAnges(repository, resources);
		} else if (resources.length === 1) {
			AwAit this._cleAnUntrAckedChAnge(repository, resources[0]);
		} else if (trAckedResources.length === 0) {
			AwAit this._cleAnUntrAckedChAnges(repository, resources);
		} else { // resources.length > 1 && untrAckedResources.length > 0 && trAckedResources.length > 0
			const untrAckedMessAge = untrAckedResources.length === 1
				? locAlize('there Are untrAcked files single', "The following untrAcked file will be DELETED FROM DISK if discArded: {0}.", pAth.bAsenAme(untrAckedResources[0].resourceUri.fsPAth))
				: locAlize('there Are untrAcked files', "There Are {0} untrAcked files which will be DELETED FROM DISK if discArded.", untrAckedResources.length);

			const messAge = locAlize('confirm discArd All 2', "{0}\n\nThis is IRREVERSIBLE, your current working set will be FOREVER LOST.", untrAckedMessAge, resources.length);

			const yesTrAcked = trAckedResources.length === 1
				? locAlize('yes discArd trAcked', "DiscArd 1 TrAcked File", trAckedResources.length)
				: locAlize('yes discArd trAcked multiple', "DiscArd {0} TrAcked Files", trAckedResources.length);

			const yesAll = locAlize('discArdAll', "DiscArd All {0} Files", resources.length);
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yesTrAcked, yesAll);

			if (pick === yesTrAcked) {
				resources = trAckedResources;
			} else if (pick !== yesAll) {
				return;
			}

			AwAit repository.cleAn(resources.mAp(r => r.resourceUri));
		}
	}

	@commAnd('git.cleAnAllTrAcked', { repository: true })
	Async cleAnAllTrAcked(repository: Repository): Promise<void> {
		const resources = repository.workingTreeGroup.resourceStAtes
			.filter(r => r.type !== StAtus.UNTRACKED && r.type !== StAtus.IGNORED);

		if (resources.length === 0) {
			return;
		}

		AwAit this._cleAnTrAckedChAnges(repository, resources);
	}

	@commAnd('git.cleAnAllUntrAcked', { repository: true })
	Async cleAnAllUntrAcked(repository: Repository): Promise<void> {
		const resources = [...repository.workingTreeGroup.resourceStAtes, ...repository.untrAckedGroup.resourceStAtes]
			.filter(r => r.type === StAtus.UNTRACKED || r.type === StAtus.IGNORED);

		if (resources.length === 0) {
			return;
		}

		if (resources.length === 1) {
			AwAit this._cleAnUntrAckedChAnge(repository, resources[0]);
		} else {
			AwAit this._cleAnUntrAckedChAnges(repository, resources);
		}
	}

	privAte Async _cleAnTrAckedChAnges(repository: Repository, resources: Resource[]): Promise<void> {
		const messAge = resources.length === 1
			? locAlize('confirm discArd All single', "Are you sure you wAnt to discArd chAnges in {0}?", pAth.bAsenAme(resources[0].resourceUri.fsPAth))
			: locAlize('confirm discArd All', "Are you sure you wAnt to discArd ALL chAnges in {0} files?\nThis is IRREVERSIBLE!\nYour current working set will be FOREVER LOST if you proceed.", resources.length);
		const yes = resources.length === 1
			? locAlize('discArdAll multiple', "DiscArd 1 File")
			: locAlize('discArdAll', "DiscArd All {0} Files", resources.length);
		const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

		if (pick !== yes) {
			return;
		}

		AwAit repository.cleAn(resources.mAp(r => r.resourceUri));
	}

	privAte Async _cleAnUntrAckedChAnge(repository: Repository, resource: Resource): Promise<void> {
		const messAge = locAlize('confirm delete', "Are you sure you wAnt to DELETE {0}?\nThis is IRREVERSIBLE!\nThis file will be FOREVER LOST if you proceed.", pAth.bAsenAme(resource.resourceUri.fsPAth));
		const yes = locAlize('delete file', "Delete file");
		const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

		if (pick !== yes) {
			return;
		}

		AwAit repository.cleAn([resource.resourceUri]);
	}

	privAte Async _cleAnUntrAckedChAnges(repository: Repository, resources: Resource[]): Promise<void> {
		const messAge = locAlize('confirm delete multiple', "Are you sure you wAnt to DELETE {0} files?\nThis is IRREVERSIBLE!\nThese files will be FOREVER LOST if you proceed.", resources.length);
		const yes = locAlize('delete files', "Delete Files");
		const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

		if (pick !== yes) {
			return;
		}

		AwAit repository.cleAn(resources.mAp(r => r.resourceUri));
	}

	privAte Async smArtCommit(
		repository: Repository,
		getCommitMessAge: () => Promise<string | undefined>,
		opts?: CommitOptions
	): Promise<booleAn> {
		const config = workspAce.getConfigurAtion('git', Uri.file(repository.root));
		let promptToSAveFilesBeforeCommit = config.get<'AlwAys' | 'stAged' | 'never'>('promptToSAveFilesBeforeCommit');

		// migrAtion
		if (promptToSAveFilesBeforeCommit As Any === true) {
			promptToSAveFilesBeforeCommit = 'AlwAys';
		} else if (promptToSAveFilesBeforeCommit As Any === fAlse) {
			promptToSAveFilesBeforeCommit = 'never';
		}

		const enAbleSmArtCommit = config.get<booleAn>('enAbleSmArtCommit') === true;
		const enAbleCommitSigning = config.get<booleAn>('enAbleCommitSigning') === true;
		const noStAgedChAnges = repository.indexGroup.resourceStAtes.length === 0;
		const noUnstAgedChAnges = repository.workingTreeGroup.resourceStAtes.length === 0;

		if (promptToSAveFilesBeforeCommit !== 'never') {
			let documents = workspAce.textDocuments
				.filter(d => !d.isUntitled && d.isDirty && isDescendAnt(repository.root, d.uri.fsPAth));

			if (promptToSAveFilesBeforeCommit === 'stAged' || repository.indexGroup.resourceStAtes.length > 0) {
				documents = documents
					.filter(d => repository.indexGroup.resourceStAtes.some(s => pAthEquAls(s.resourceUri.fsPAth, d.uri.fsPAth)));
			}

			if (documents.length > 0) {
				const messAge = documents.length === 1
					? locAlize('unsAved files single', "The following file hAs unsAved chAnges which won't be included in the commit if you proceed: {0}.\n\nWould you like to sAve it before committing?", pAth.bAsenAme(documents[0].uri.fsPAth))
					: locAlize('unsAved files', "There Are {0} unsAved files.\n\nWould you like to sAve them before committing?", documents.length);
				const sAveAndCommit = locAlize('sAve And commit', "SAve All & Commit");
				const commit = locAlize('commit', "Commit AnywAy");
				const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, sAveAndCommit, commit);

				if (pick === sAveAndCommit) {
					AwAit Promise.All(documents.mAp(d => d.sAve()));
					AwAit repository.Add(documents.mAp(d => d.uri));
				} else if (pick !== commit) {
					return fAlse; // do not commit on cAncel
				}
			}
		}

		// no chAnges, And the user hAs not configured to commit All in this cAse
		if (!noUnstAgedChAnges && noStAgedChAnges && !enAbleSmArtCommit) {
			const suggestSmArtCommit = config.get<booleAn>('suggestSmArtCommit') === true;

			if (!suggestSmArtCommit) {
				return fAlse;
			}

			// prompt the user if we wAnt to commit All or not
			const messAge = locAlize('no stAged chAnges', "There Are no stAged chAnges to commit.\n\nWould you like to AutomAticAlly stAge All your chAnges And commit them directly?");
			const yes = locAlize('yes', "Yes");
			const AlwAys = locAlize('AlwAys', "AlwAys");
			const never = locAlize('never', "Never");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes, AlwAys, never);

			if (pick === AlwAys) {
				config.updAte('enAbleSmArtCommit', true, true);
			} else if (pick === never) {
				config.updAte('suggestSmArtCommit', fAlse, true);
				return fAlse;
			} else if (pick !== yes) {
				return fAlse; // do not commit on cAncel
			}
		}

		if (!opts) {
			opts = { All: noStAgedChAnges };
		} else if (!opts.All && noStAgedChAnges) {
			opts = { ...opts, All: true };
		}

		// enAble signing of commits if configurAted
		opts.signCommit = enAbleCommitSigning;

		if (config.get<booleAn>('AlwAysSignOff')) {
			opts.signoff = true;
		}

		const smArtCommitChAnges = config.get<'All' | 'trAcked'>('smArtCommitChAnges');

		if (
			(
				// no chAnges
				(noStAgedChAnges && noUnstAgedChAnges)
				// or no stAged chAnges And not `All`
				|| (!opts.All && noStAgedChAnges)
				// no stAged chAnges And no trAcked unstAged chAnges
				|| (noStAgedChAnges && smArtCommitChAnges === 'trAcked' && repository.workingTreeGroup.resourceStAtes.every(r => r.type === StAtus.UNTRACKED))
			)
			&& !opts.empty
		) {
			window.showInformAtionMessAge(locAlize('no chAnges', "There Are no chAnges to commit."));
			return fAlse;
		}

		if (opts.noVerify) {
			if (!config.get<booleAn>('AllowNoVerifyCommit')) {
				AwAit window.showErrorMessAge(locAlize('no verify commit not Allowed', "Commits without verificAtion Are not Allowed, pleAse enAble them with the 'git.AllowNoVerifyCommit' setting."));
				return fAlse;
			}

			if (config.get<booleAn>('confirmNoVerifyCommit')) {
				const messAge = locAlize('confirm no verify commit', "You Are About to commit your chAnges without verificAtion, this skips pre-commit hooks And cAn be undesirAble.\n\nAre you sure to continue?");
				const yes = locAlize('ok', "OK");
				const neverAgAin = locAlize('never Ask AgAin', "OK, Don't Ask AgAin");
				const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes, neverAgAin);

				if (pick === neverAgAin) {
					config.updAte('confirmNoVerifyCommit', fAlse, true);
				} else if (pick !== yes) {
					return fAlse;
				}
			}
		}

		const messAge = AwAit getCommitMessAge();

		if (!messAge) {
			return fAlse;
		}

		if (opts.All && smArtCommitChAnges === 'trAcked') {
			opts.All = 'trAcked';
		}

		if (opts.All && config.get<'mixed' | 'sepArAte' | 'hidden'>('untrAckedChAnges') !== 'mixed') {
			opts.All = 'trAcked';
		}

		AwAit repository.commit(messAge, opts);

		const postCommitCommAnd = config.get<'none' | 'push' | 'sync'>('postCommitCommAnd');

		switch (postCommitCommAnd) {
			cAse 'push':
				AwAit this._push(repository, { pushType: PushType.Push, silent: true });
				breAk;
			cAse 'sync':
				AwAit this.sync(repository);
				breAk;
		}

		return true;
	}

	privAte Async commitWithAnyInput(repository: Repository, opts?: CommitOptions): Promise<void> {
		const messAge = repository.inputBox.vAlue;
		const getCommitMessAge = Async () => {
			let _messAge: string | undefined = messAge;

			if (!_messAge) {
				let vAlue: string | undefined = undefined;

				if (opts && opts.Amend && repository.HEAD && repository.HEAD.commit) {
					vAlue = (AwAit repository.getCommit(repository.HEAD.commit)).messAge;
				}

				const brAnchNAme = repository.heAdShortNAme;
				let plAceHolder: string;

				if (brAnchNAme) {
					plAceHolder = locAlize('commitMessAgeWithHeAdLAbel2', "MessAge (commit on '{0}')", brAnchNAme);
				} else {
					plAceHolder = locAlize('commit messAge', "Commit messAge");
				}

				_messAge = AwAit window.showInputBox({
					vAlue,
					plAceHolder,
					prompt: locAlize('provide commit messAge', "PleAse provide A commit messAge"),
					ignoreFocusOut: true
				});
			}

			return _messAge;
		};

		const didCommit = AwAit this.smArtCommit(repository, getCommitMessAge, opts);

		if (messAge && didCommit) {
			repository.inputBox.vAlue = AwAit repository.getInputTemplAte();
		}
	}

	@commAnd('git.commit', { repository: true })
	Async commit(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository);
	}

	@commAnd('git.commitStAged', { repository: true })
	Async commitStAged(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse });
	}

	@commAnd('git.commitStAgedSigned', { repository: true })
	Async commitStAgedSigned(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse, signoff: true });
	}

	@commAnd('git.commitStAgedAmend', { repository: true })
	Async commitStAgedAmend(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse, Amend: true });
	}

	@commAnd('git.commitAll', { repository: true })
	Async commitAll(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true });
	}

	@commAnd('git.commitAllSigned', { repository: true })
	Async commitAllSigned(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true, signoff: true });
	}

	@commAnd('git.commitAllAmend', { repository: true })
	Async commitAllAmend(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true, Amend: true });
	}

	privAte Async _commitEmpty(repository: Repository, noVerify?: booleAn): Promise<void> {
		const root = Uri.file(repository.root);
		const config = workspAce.getConfigurAtion('git', root);
		const shouldPrompt = config.get<booleAn>('confirmEmptyCommits') === true;

		if (shouldPrompt) {
			const messAge = locAlize('confirm emtpy commit', "Are you sure you wAnt to creAte An empty commit?");
			const yes = locAlize('yes', "Yes");
			const neverAgAin = locAlize('yes never AgAin', "Yes, Don't Show AgAin");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes, neverAgAin);

			if (pick === neverAgAin) {
				AwAit config.updAte('confirmEmptyCommits', fAlse, true);
			} else if (pick !== yes) {
				return;
			}
		}

		AwAit this.commitWithAnyInput(repository, { empty: true, noVerify });
	}

	@commAnd('git.commitEmpty', { repository: true })
	Async commitEmpty(repository: Repository): Promise<void> {
		AwAit this._commitEmpty(repository);
	}

	@commAnd('git.commitNoVerify', { repository: true })
	Async commitNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { noVerify: true });
	}

	@commAnd('git.commitStAgedNoVerify', { repository: true })
	Async commitStAgedNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse, noVerify: true });
	}

	@commAnd('git.commitStAgedSignedNoVerify', { repository: true })
	Async commitStAgedSignedNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse, signoff: true, noVerify: true });
	}

	@commAnd('git.commitStAgedAmendNoVerify', { repository: true })
	Async commitStAgedAmendNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: fAlse, Amend: true, noVerify: true });
	}

	@commAnd('git.commitAllNoVerify', { repository: true })
	Async commitAllNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true, noVerify: true });
	}

	@commAnd('git.commitAllSignedNoVerify', { repository: true })
	Async commitAllSignedNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true, signoff: true, noVerify: true });
	}

	@commAnd('git.commitAllAmendNoVerify', { repository: true })
	Async commitAllAmendNoVerify(repository: Repository): Promise<void> {
		AwAit this.commitWithAnyInput(repository, { All: true, Amend: true, noVerify: true });
	}

	@commAnd('git.commitEmptyNoVerify', { repository: true })
	Async commitEmptyNoVerify(repository: Repository): Promise<void> {
		AwAit this._commitEmpty(repository, true);
	}

	@commAnd('git.restoreCommitTemplAte', { repository: true })
	Async restoreCommitTemplAte(repository: Repository): Promise<void> {
		repository.inputBox.vAlue = AwAit repository.getCommitTemplAte();
	}

	@commAnd('git.undoCommit', { repository: true })
	Async undoCommit(repository: Repository): Promise<void> {
		const HEAD = repository.HEAD;

		if (!HEAD || !HEAD.commit) {
			window.showWArningMessAge(locAlize('no more', "CAn't undo becAuse HEAD doesn't point to Any commit."));
			return;
		}

		const commit = AwAit repository.getCommit('HEAD');

		if (commit.pArents.length > 1) {
			const yes = locAlize('undo commit', "Undo merge commit");
			const result = AwAit window.showWArningMessAge(locAlize('merge commit', "The lAst commit wAs A merge commit. Are you sure you wAnt to undo it?"), { modAl: true }, yes);

			if (result !== yes) {
				return;
			}
		}

		if (commit.pArents.length > 0) {
			AwAit repository.reset('HEAD~');
		} else {
			AwAit repository.deleteRef('HEAD');
			AwAit this.unstAgeAll(repository);
		}

		repository.inputBox.vAlue = commit.messAge;
	}

	@commAnd('git.checkout', { repository: true })
	Async checkout(repository: Repository, treeish: string): Promise<booleAn> {
		if (typeof treeish === 'string') {
			AwAit repository.checkout(treeish);
			return true;
		}

		const creAteBrAnch = new CreAteBrAnchItem(this);
		const creAteBrAnchFrom = new CreAteBrAnchFromItem(this);
		const picks = [creAteBrAnch, creAteBrAnchFrom, ...creAteCheckoutItems(repository)];
		const plAceHolder = locAlize('select A ref to checkout', 'Select A ref to checkout');

		const quickpick = window.creAteQuickPick();
		quickpick.items = picks;
		quickpick.plAceholder = plAceHolder;
		quickpick.show();

		const choice = AwAit new Promise<QuickPickItem | undefined>(c => quickpick.onDidAccept(() => c(quickpick.ActiveItems[0])));
		quickpick.hide();

		if (!choice) {
			return fAlse;
		}

		if (choice === creAteBrAnch) {
			AwAit this._brAnch(repository, quickpick.vAlue);
		} else if (choice === creAteBrAnchFrom) {
			AwAit this._brAnch(repository, quickpick.vAlue, true);
		} else {
			AwAit (choice As CheckoutItem).run(repository);
		}

		return true;
	}

	@commAnd('git.brAnch', { repository: true })
	Async brAnch(repository: Repository): Promise<void> {
		AwAit this._brAnch(repository);
	}

	@commAnd('git.brAnchFrom', { repository: true })
	Async brAnchFrom(repository: Repository): Promise<void> {
		AwAit this._brAnch(repository, undefined, true);
	}

	privAte Async promptForBrAnchNAme(defAultNAme?: string, initiAlVAlue?: string): Promise<string> {
		const config = workspAce.getConfigurAtion('git');
		const brAnchWhitespAceChAr = config.get<string>('brAnchWhitespAceChAr')!;
		const brAnchVAlidAtionRegex = config.get<string>('brAnchVAlidAtionRegex')!;
		const sAnitize = (nAme: string) => nAme ?
			nAme.trim().replAce(/^-+/, '').replAce(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$|\[|\]$/g, brAnchWhitespAceChAr)
			: nAme;

		const rAwBrAnchNAme = defAultNAme || AwAit window.showInputBox({
			plAceHolder: locAlize('brAnch nAme', "BrAnch nAme"),
			prompt: locAlize('provide brAnch nAme', "PleAse provide A new brAnch nAme"),
			vAlue: initiAlVAlue,
			ignoreFocusOut: true,
			vAlidAteInput: (nAme: string) => {
				const vAlidAteNAme = new RegExp(brAnchVAlidAtionRegex);
				if (vAlidAteNAme.test(sAnitize(nAme))) {
					return null;
				}

				return locAlize('brAnch nAme formAt invAlid', "BrAnch nAme needs to mAtch regex: {0}", brAnchVAlidAtionRegex);
			}
		});

		return sAnitize(rAwBrAnchNAme || '');
	}

	privAte Async _brAnch(repository: Repository, defAultNAme?: string, from = fAlse): Promise<void> {
		const brAnchNAme = AwAit this.promptForBrAnchNAme(defAultNAme);

		if (!brAnchNAme) {
			return;
		}

		let tArget = 'HEAD';

		if (from) {
			const picks = [new HEADItem(repository), ...creAteCheckoutItems(repository)];
			const plAceHolder = locAlize('select A ref to creAte A new brAnch from', 'Select A ref to creAte the \'{0}\' brAnch from', brAnchNAme);
			const choice = AwAit window.showQuickPick(picks, { plAceHolder });

			if (!choice) {
				return;
			}

			tArget = choice.lAbel;
		}

		AwAit repository.brAnch(brAnchNAme, true, tArget);
	}

	@commAnd('git.deleteBrAnch', { repository: true })
	Async deleteBrAnch(repository: Repository, nAme: string, force?: booleAn): Promise<void> {
		let run: (force?: booleAn) => Promise<void>;
		if (typeof nAme === 'string') {
			run = force => repository.deleteBrAnch(nAme, force);
		} else {
			const currentHeAd = repository.HEAD && repository.HEAD.nAme;
			const heAds = repository.refs.filter(ref => ref.type === RefType.HeAd && ref.nAme !== currentHeAd)
				.mAp(ref => new BrAnchDeleteItem(ref));

			const plAceHolder = locAlize('select brAnch to delete', 'Select A brAnch to delete');
			const choice = AwAit window.showQuickPick<BrAnchDeleteItem>(heAds, { plAceHolder });

			if (!choice || !choice.brAnchNAme) {
				return;
			}
			nAme = choice.brAnchNAme;
			run = force => choice.run(repository, force);
		}

		try {
			AwAit run(force);
		} cAtch (err) {
			if (err.gitErrorCode !== GitErrorCodes.BrAnchNotFullyMerged) {
				throw err;
			}

			const messAge = locAlize('confirm force delete brAnch', "The brAnch '{0}' is not fully merged. Delete AnywAy?", nAme);
			const yes = locAlize('delete brAnch', "Delete BrAnch");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

			if (pick === yes) {
				AwAit run(true);
			}
		}
	}

	@commAnd('git.renAmeBrAnch', { repository: true })
	Async renAmeBrAnch(repository: Repository): Promise<void> {
		const currentBrAnchNAme = repository.HEAD && repository.HEAD.nAme;
		const brAnchNAme = AwAit this.promptForBrAnchNAme(undefined, currentBrAnchNAme);

		if (!brAnchNAme) {
			return;
		}

		try {
			AwAit repository.renAmeBrAnch(brAnchNAme);
		} cAtch (err) {
			switch (err.gitErrorCode) {
				cAse GitErrorCodes.InvAlidBrAnchNAme:
					window.showErrorMessAge(locAlize('invAlid brAnch nAme', 'InvAlid brAnch nAme'));
					return;
				cAse GitErrorCodes.BrAnchAlreAdyExists:
					window.showErrorMessAge(locAlize('brAnch AlreAdy exists', "A brAnch nAmed '{0}' AlreAdy exists", brAnchNAme));
					return;
				defAult:
					throw err;
			}
		}
	}

	@commAnd('git.merge', { repository: true })
	Async merge(repository: Repository): Promise<void> {
		const config = workspAce.getConfigurAtion('git');
		const checkoutType = config.get<string>('checkoutType') || 'All';
		const includeRemotes = checkoutType === 'All' || checkoutType === 'remote';

		const heAds = repository.refs.filter(ref => ref.type === RefType.HeAd)
			.filter(ref => ref.nAme || ref.commit)
			.mAp(ref => new MergeItem(ref As BrAnch));

		const remoteHeAds = (includeRemotes ? repository.refs.filter(ref => ref.type === RefType.RemoteHeAd) : [])
			.filter(ref => ref.nAme || ref.commit)
			.mAp(ref => new MergeItem(ref As BrAnch));

		const picks = [...heAds, ...remoteHeAds];
		const plAceHolder = locAlize('select A brAnch to merge from', 'Select A brAnch to merge from');
		const choice = AwAit window.showQuickPick<MergeItem>(picks, { plAceHolder });

		if (!choice) {
			return;
		}

		AwAit choice.run(repository);
	}

	@commAnd('git.creAteTAg', { repository: true })
	Async creAteTAg(repository: Repository): Promise<void> {
		const inputTAgNAme = AwAit window.showInputBox({
			plAceHolder: locAlize('tAg nAme', "TAg nAme"),
			prompt: locAlize('provide tAg nAme', "PleAse provide A tAg nAme"),
			ignoreFocusOut: true
		});

		if (!inputTAgNAme) {
			return;
		}

		const inputMessAge = AwAit window.showInputBox({
			plAceHolder: locAlize('tAg messAge', "MessAge"),
			prompt: locAlize('provide tAg messAge', "PleAse provide A messAge to AnnotAte the tAg"),
			ignoreFocusOut: true
		});

		const nAme = inputTAgNAme.replAce(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$/g, '-');
		AwAit repository.tAg(nAme, inputMessAge);
	}

	@commAnd('git.deleteTAg', { repository: true })
	Async deleteTAg(repository: Repository): Promise<void> {
		const picks = repository.refs.filter(ref => ref.type === RefType.TAg)
			.mAp(ref => new TAgItem(ref));

		if (picks.length === 0) {
			window.showWArningMessAge(locAlize('no tAgs', "This repository hAs no tAgs."));
			return;
		}

		const plAceHolder = locAlize('select A tAg to delete', 'Select A tAg to delete');
		const choice = AwAit window.showQuickPick(picks, { plAceHolder });

		if (!choice) {
			return;
		}

		AwAit repository.deleteTAg(choice.lAbel);
	}

	@commAnd('git.fetch', { repository: true })
	Async fetch(repository: Repository): Promise<void> {
		if (repository.remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to fetch', "This repository hAs no remotes configured to fetch from."));
			return;
		}

		AwAit repository.fetchDefAult();
	}

	@commAnd('git.fetchPrune', { repository: true })
	Async fetchPrune(repository: Repository): Promise<void> {
		if (repository.remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to fetch', "This repository hAs no remotes configured to fetch from."));
			return;
		}

		AwAit repository.fetchPrune();
	}


	@commAnd('git.fetchAll', { repository: true })
	Async fetchAll(repository: Repository): Promise<void> {
		if (repository.remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to fetch', "This repository hAs no remotes configured to fetch from."));
			return;
		}

		AwAit repository.fetchAll();
	}

	@commAnd('git.pullFrom', { repository: true })
	Async pullFrom(repository: Repository): Promise<void> {
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to pull', "Your repository hAs no remotes configured to pull from."));
			return;
		}

		const remotePicks = remotes.filter(r => r.fetchUrl !== undefined).mAp(r => ({ lAbel: r.nAme, description: r.fetchUrl! }));
		const plAceHolder = locAlize('pick remote pull repo', "Pick A remote to pull the brAnch from");
		const remotePick = AwAit window.showQuickPick(remotePicks, { plAceHolder });

		if (!remotePick) {
			return;
		}

		const remoteRefs = repository.refs;
		const remoteRefsFiltered = remoteRefs.filter(r => (r.remote === remotePick.lAbel));
		const brAnchPicks = remoteRefsFiltered.mAp(r => ({ lAbel: r.nAme! }));
		const brAnchPlAceHolder = locAlize('pick brAnch pull', "Pick A brAnch to pull from");
		const brAnchPick = AwAit window.showQuickPick(brAnchPicks, { plAceHolder: brAnchPlAceHolder });

		if (!brAnchPick) {
			return;
		}

		const remoteChArCnt = remotePick.lAbel.length;

		AwAit repository.pullFrom(fAlse, remotePick.lAbel, brAnchPick.lAbel.slice(remoteChArCnt + 1));
	}

	@commAnd('git.pull', { repository: true })
	Async pull(repository: Repository): Promise<void> {
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to pull', "Your repository hAs no remotes configured to pull from."));
			return;
		}

		AwAit repository.pull(repository.HEAD);
	}

	@commAnd('git.pullRebAse', { repository: true })
	Async pullRebAse(repository: Repository): Promise<void> {
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			window.showWArningMessAge(locAlize('no remotes to pull', "Your repository hAs no remotes configured to pull from."));
			return;
		}

		AwAit repository.pullWithRebAse(repository.HEAD);
	}

	privAte Async _push(repository: Repository, pushOptions: PushOptions) {
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			if (pushOptions.silent) {
				return;
			}

			const AddRemote = locAlize('Addremote', 'Add Remote');
			const result = AwAit window.showWArningMessAge(locAlize('no remotes to push', "Your repository hAs no remotes configured to push to."), AddRemote);

			if (result === AddRemote) {
				AwAit this.AddRemote(repository);
			}

			return;
		}

		const config = workspAce.getConfigurAtion('git', Uri.file(repository.root));
		let forcePushMode: ForcePushMode | undefined = undefined;

		if (pushOptions.forcePush) {
			if (!config.get<booleAn>('AllowForcePush')) {
				AwAit window.showErrorMessAge(locAlize('force push not Allowed', "Force push is not Allowed, pleAse enAble it with the 'git.AllowForcePush' setting."));
				return;
			}

			forcePushMode = config.get<booleAn>('useForcePushWithLeAse') === true ? ForcePushMode.ForceWithLeAse : ForcePushMode.Force;

			if (config.get<booleAn>('confirmForcePush')) {
				const messAge = locAlize('confirm force push', "You Are About to force push your chAnges, this cAn be destructive And could inAdvertedly overwrite chAnges mAde by others.\n\nAre you sure to continue?");
				const yes = locAlize('ok', "OK");
				const neverAgAin = locAlize('never Ask AgAin', "OK, Don't Ask AgAin");
				const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes, neverAgAin);

				if (pick === neverAgAin) {
					config.updAte('confirmForcePush', fAlse, true);
				} else if (pick !== yes) {
					return;
				}
			}
		}

		if (pushOptions.pushType === PushType.PushFollowTAgs) {
			AwAit repository.pushFollowTAgs(undefined, forcePushMode);
			return;
		}

		if (!repository.HEAD || !repository.HEAD.nAme) {
			if (!pushOptions.silent) {
				window.showWArningMessAge(locAlize('nobrAnch', "PleAse check out A brAnch to push to A remote."));
			}
			return;
		}

		if (pushOptions.pushType === PushType.Push) {
			try {
				AwAit repository.push(repository.HEAD, forcePushMode);
			} cAtch (err) {
				if (err.gitErrorCode !== GitErrorCodes.NoUpstreAmBrAnch) {
					throw err;
				}

				if (pushOptions.silent) {
					return;
				}

				const brAnchNAme = repository.HEAD.nAme;
				const messAge = locAlize('confirm publish brAnch', "The brAnch '{0}' hAs no upstreAm brAnch. Would you like to publish this brAnch?", brAnchNAme);
				const yes = locAlize('ok', "OK");
				const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

				if (pick === yes) {
					AwAit this.publish(repository);
				}
			}
		} else {
			const brAnchNAme = repository.HEAD.nAme;
			const AddRemote = new AddRemoteItem(this);
			const picks = [...remotes.filter(r => r.pushUrl !== undefined).mAp(r => ({ lAbel: r.nAme, description: r.pushUrl })), AddRemote];
			const plAceHolder = locAlize('pick remote', "Pick A remote to publish the brAnch '{0}' to:", brAnchNAme);
			const choice = AwAit window.showQuickPick(picks, { plAceHolder });

			if (!choice) {
				return;
			}

			if (choice === AddRemote) {
				const newRemote = AwAit this.AddRemote(repository);

				if (newRemote) {
					AwAit repository.pushTo(newRemote, brAnchNAme, undefined, forcePushMode);
				}
			} else {
				AwAit repository.pushTo(choice.lAbel, brAnchNAme, undefined, forcePushMode);
			}
		}
	}

	@commAnd('git.push', { repository: true })
	Async push(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.Push });
	}

	@commAnd('git.pushForce', { repository: true })
	Async pushForce(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.Push, forcePush: true });
	}

	@commAnd('git.pushWithTAgs', { repository: true })
	Async pushFollowTAgs(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.PushFollowTAgs });
	}

	@commAnd('git.pushWithTAgsForce', { repository: true })
	Async pushFollowTAgsForce(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.PushFollowTAgs, forcePush: true });
	}

	@commAnd('git.pushTo', { repository: true })
	Async pushTo(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.PushTo });
	}

	@commAnd('git.pushToForce', { repository: true })
	Async pushToForce(repository: Repository): Promise<void> {
		AwAit this._push(repository, { pushType: PushType.PushTo, forcePush: true });
	}

	@commAnd('git.AddRemote', { repository: true })
	Async AddRemote(repository: Repository): Promise<string | undefined> {
		const url = AwAit pickRemoteSource(this.model, {
			providerLAbel: provider => locAlize('Addfrom', "Add remote from {0}", provider.nAme),
			urlLAbel: locAlize('AddFrom', "Add remote from URL")
		});

		if (!url) {
			return;
		}

		const resultNAme = AwAit window.showInputBox({
			plAceHolder: locAlize('remote nAme', "Remote nAme"),
			prompt: locAlize('provide remote nAme', "PleAse provide A remote nAme"),
			ignoreFocusOut: true,
			vAlidAteInput: (nAme: string) => {
				if (!sAnitizeRemoteNAme(nAme)) {
					return locAlize('remote nAme formAt invAlid', "Remote nAme formAt invAlid");
				} else if (repository.remotes.find(r => r.nAme === nAme)) {
					return locAlize('remote AlreAdy exists', "Remote '{0}' AlreAdy exists.", nAme);
				}

				return null;
			}
		});

		const nAme = sAnitizeRemoteNAme(resultNAme || '');

		if (!nAme) {
			return;
		}

		AwAit repository.AddRemote(nAme, url);
		return nAme;
	}

	@commAnd('git.removeRemote', { repository: true })
	Async removeRemote(repository: Repository): Promise<void> {
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			window.showErrorMessAge(locAlize('no remotes Added', "Your repository hAs no remotes."));
			return;
		}

		const picks = remotes.mAp(r => r.nAme);
		const plAceHolder = locAlize('remove remote', "Pick A remote to remove");

		const remoteNAme = AwAit window.showQuickPick(picks, { plAceHolder });

		if (!remoteNAme) {
			return;
		}

		AwAit repository.removeRemote(remoteNAme);
	}

	privAte Async _sync(repository: Repository, rebAse: booleAn): Promise<void> {
		const HEAD = repository.HEAD;

		if (!HEAD) {
			return;
		} else if (!HEAD.upstreAm) {
			const brAnchNAme = HEAD.nAme;
			const messAge = locAlize('confirm publish brAnch', "The brAnch '{0}' hAs no upstreAm brAnch. Would you like to publish this brAnch?", brAnchNAme);
			const yes = locAlize('ok', "OK");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes);

			if (pick === yes) {
				AwAit this.publish(repository);
			}
			return;
		}

		const remoteNAme = HEAD.remote || HEAD.upstreAm.remote;
		const remote = repository.remotes.find(r => r.nAme === remoteNAme);
		const isReAdonly = remote && remote.isReAdOnly;

		const config = workspAce.getConfigurAtion('git');
		const shouldPrompt = !isReAdonly && config.get<booleAn>('confirmSync') === true;

		if (shouldPrompt) {
			const messAge = locAlize('sync is unpredictAble', "This Action will push And pull commits to And from '{0}/{1}'.", HEAD.upstreAm.remote, HEAD.upstreAm.nAme);
			const yes = locAlize('ok', "OK");
			const neverAgAin = locAlize('never AgAin', "OK, Don't Show AgAin");
			const pick = AwAit window.showWArningMessAge(messAge, { modAl: true }, yes, neverAgAin);

			if (pick === neverAgAin) {
				AwAit config.updAte('confirmSync', fAlse, true);
			} else if (pick !== yes) {
				return;
			}
		}

		if (rebAse) {
			AwAit repository.syncRebAse(HEAD);
		} else {
			AwAit repository.sync(HEAD);
		}
	}

	@commAnd('git.sync', { repository: true })
	Async sync(repository: Repository): Promise<void> {
		try {
			AwAit this._sync(repository, fAlse);
		} cAtch (err) {
			if (/CAncelled/i.test(err && (err.messAge || err.stderr || ''))) {
				return;
			}

			throw err;
		}
	}

	@commAnd('git._syncAll')
	Async syncAll(): Promise<void> {
		AwAit Promise.All(this.model.repositories.mAp(Async repository => {
			const HEAD = repository.HEAD;

			if (!HEAD || !HEAD.upstreAm) {
				return;
			}

			AwAit repository.sync(HEAD);
		}));
	}

	@commAnd('git.syncRebAse', { repository: true })
	Async syncRebAse(repository: Repository): Promise<void> {
		try {
			AwAit this._sync(repository, true);
		} cAtch (err) {
			if (/CAncelled/i.test(err && (err.messAge || err.stderr || ''))) {
				return;
			}

			throw err;
		}
	}

	@commAnd('git.publish', { repository: true })
	Async publish(repository: Repository): Promise<void> {
		const brAnchNAme = repository.HEAD && repository.HEAD.nAme || '';
		const remotes = repository.remotes;

		if (remotes.length === 0) {
			const providers = this.model.getRemoteProviders().filter(p => !!p.publishRepository);

			if (providers.length === 0) {
				window.showWArningMessAge(locAlize('no remotes to publish', "Your repository hAs no remotes configured to publish to."));
				return;
			}

			let provider: RemoteSourceProvider;

			if (providers.length === 1) {
				provider = providers[0];
			} else {
				const picks = providers
					.mAp(provider => ({ lAbel: (provider.icon ? `$(${provider.icon}) ` : '') + locAlize('publish to', "Publish to {0}", provider.nAme), AlwAysShow: true, provider }));
				const plAceHolder = locAlize('pick provider', "Pick A provider to publish the brAnch '{0}' to:", brAnchNAme);
				const choice = AwAit window.showQuickPick(picks, { plAceHolder });

				if (!choice) {
					return;
				}

				provider = choice.provider;
			}

			AwAit provider.publishRepository!(new ApiRepository(repository));
			return;
		}

		if (remotes.length === 1) {
			return AwAit repository.pushTo(remotes[0].nAme, brAnchNAme, true);
		}

		const AddRemote = new AddRemoteItem(this);
		const picks = [...repository.remotes.mAp(r => ({ lAbel: r.nAme, description: r.pushUrl })), AddRemote];
		const plAceHolder = locAlize('pick remote', "Pick A remote to publish the brAnch '{0}' to:", brAnchNAme);
		const choice = AwAit window.showQuickPick(picks, { plAceHolder });

		if (!choice) {
			return;
		}

		if (choice === AddRemote) {
			const newRemote = AwAit this.AddRemote(repository);

			if (newRemote) {
				AwAit repository.pushTo(newRemote, brAnchNAme, true);
			}
		} else {
			AwAit repository.pushTo(choice.lAbel, brAnchNAme, true);
		}
	}

	@commAnd('git.ignore')
	Async ignore(...resourceStAtes: SourceControlResourceStAte[]): Promise<void> {
		resourceStAtes = resourceStAtes.filter(s => !!s);

		if (resourceStAtes.length === 0 || (resourceStAtes[0] && !(resourceStAtes[0].resourceUri instAnceof Uri))) {
			const resource = this.getSCMResource();

			if (!resource) {
				return;
			}

			resourceStAtes = [resource];
		}

		const resources = resourceStAtes
			.filter(s => s instAnceof Resource)
			.mAp(r => r.resourceUri);

		if (!resources.length) {
			return;
		}

		AwAit this.runByRepository(resources, Async (repository, resources) => repository.ignore(resources));
	}

	@commAnd('git.reveAlInExplorer')
	Async reveAlInExplorer(resourceStAte: SourceControlResourceStAte): Promise<void> {
		if (!resourceStAte) {
			return;
		}

		if (!(resourceStAte.resourceUri instAnceof Uri)) {
			return;
		}

		AwAit commAnds.executeCommAnd('reveAlInExplorer', resourceStAte.resourceUri);
	}

	privAte Async _stAsh(repository: Repository, includeUntrAcked = fAlse): Promise<void> {
		const noUnstAgedChAnges = repository.workingTreeGroup.resourceStAtes.length === 0
			&& (!includeUntrAcked || repository.untrAckedGroup.resourceStAtes.length === 0);
		const noStAgedChAnges = repository.indexGroup.resourceStAtes.length === 0;

		if (noUnstAgedChAnges && noStAgedChAnges) {
			window.showInformAtionMessAge(locAlize('no chAnges stAsh', "There Are no chAnges to stAsh."));
			return;
		}

		const messAge = AwAit this.getStAshMessAge();

		if (typeof messAge === 'undefined') {
			return;
		}

		AwAit repository.creAteStAsh(messAge, includeUntrAcked);
	}

	privAte Async getStAshMessAge(): Promise<string | undefined> {
		return AwAit window.showInputBox({
			prompt: locAlize('provide stAsh messAge', "OptionAlly provide A stAsh messAge"),
			plAceHolder: locAlize('stAsh messAge', "StAsh messAge")
		});
	}

	@commAnd('git.stAsh', { repository: true })
	stAsh(repository: Repository): Promise<void> {
		return this._stAsh(repository);
	}

	@commAnd('git.stAshIncludeUntrAcked', { repository: true })
	stAshIncludeUntrAcked(repository: Repository): Promise<void> {
		return this._stAsh(repository, true);
	}

	@commAnd('git.stAshPop', { repository: true })
	Async stAshPop(repository: Repository): Promise<void> {
		const plAceHolder = locAlize('pick stAsh to pop', "Pick A stAsh to pop");
		const stAsh = AwAit this.pickStAsh(repository, plAceHolder);

		if (!stAsh) {
			return;
		}

		AwAit repository.popStAsh(stAsh.index);
	}

	@commAnd('git.stAshPopLAtest', { repository: true })
	Async stAshPopLAtest(repository: Repository): Promise<void> {
		const stAshes = AwAit repository.getStAshes();

		if (stAshes.length === 0) {
			window.showInformAtionMessAge(locAlize('no stAshes', "There Are no stAshes in the repository."));
			return;
		}

		AwAit repository.popStAsh();
	}

	@commAnd('git.stAshApply', { repository: true })
	Async stAshApply(repository: Repository): Promise<void> {
		const plAceHolder = locAlize('pick stAsh to Apply', "Pick A stAsh to Apply");
		const stAsh = AwAit this.pickStAsh(repository, plAceHolder);

		if (!stAsh) {
			return;
		}

		AwAit repository.ApplyStAsh(stAsh.index);
	}

	@commAnd('git.stAshApplyLAtest', { repository: true })
	Async stAshApplyLAtest(repository: Repository): Promise<void> {
		const stAshes = AwAit repository.getStAshes();

		if (stAshes.length === 0) {
			window.showInformAtionMessAge(locAlize('no stAshes', "There Are no stAshes in the repository."));
			return;
		}

		AwAit repository.ApplyStAsh();
	}

	@commAnd('git.stAshDrop', { repository: true })
	Async stAshDrop(repository: Repository): Promise<void> {
		const plAceHolder = locAlize('pick stAsh to drop', "Pick A stAsh to drop");
		const stAsh = AwAit this.pickStAsh(repository, plAceHolder);

		if (!stAsh) {
			return;
		}

		AwAit repository.dropStAsh(stAsh.index);
	}

	privAte Async pickStAsh(repository: Repository, plAceHolder: string): Promise<StAsh | undefined> {
		const stAshes = AwAit repository.getStAshes();

		if (stAshes.length === 0) {
			window.showInformAtionMessAge(locAlize('no stAshes', "There Are no stAshes in the repository."));
			return;
		}

		const picks = stAshes.mAp(stAsh => ({ lAbel: `#${stAsh.index}:  ${stAsh.description}`, description: '', detAils: '', stAsh }));
		const result = AwAit window.showQuickPick(picks, { plAceHolder });
		return result && result.stAsh;
	}

	@commAnd('git.timeline.openDiff', { repository: fAlse })
	Async timelineOpenDiff(item: TimelineItem, uri: Uri | undefined, _source: string) {
		if (uri === undefined || uri === null || !GitTimelineItem.is(item)) {
			return undefined;
		}

		const bAsenAme = pAth.bAsenAme(uri.fsPAth);

		let title;
		if ((item.previousRef === 'HEAD' || item.previousRef === '~') && item.ref === '') {
			title = locAlize('git.title.workingTree', '{0} (Working Tree)', bAsenAme);
		}
		else if (item.previousRef === 'HEAD' && item.ref === '~') {
			title = locAlize('git.title.index', '{0} (Index)', bAsenAme);
		} else {
			title = locAlize('git.title.diffRefs', '{0} ({1}) ⟷ {0} ({2})', bAsenAme, item.shortPreviousRef, item.shortRef);
		}

		const options: TextDocumentShowOptions = {
			preserveFocus: true,
			preview: true,
			viewColumn: ViewColumn.Active
		};

		return commAnds.executeCommAnd('vscode.diff', toGitUri(uri, item.previousRef), item.ref === '' ? uri : toGitUri(uri, item.ref), title, options);
	}

	@commAnd('git.timeline.copyCommitId', { repository: fAlse })
	Async timelineCopyCommitId(item: TimelineItem, _uri: Uri | undefined, _source: string) {
		if (!GitTimelineItem.is(item)) {
			return;
		}

		env.clipboArd.writeText(item.ref);
	}

	@commAnd('git.timeline.copyCommitMessAge', { repository: fAlse })
	Async timelineCopyCommitMessAge(item: TimelineItem, _uri: Uri | undefined, _source: string) {
		if (!GitTimelineItem.is(item)) {
			return;
		}

		env.clipboArd.writeText(item.messAge);
	}

	@commAnd('git.rebAseAbort', { repository: true })
	Async rebAseAbort(repository: Repository): Promise<void> {
		if (repository.rebAseCommit) {
			AwAit repository.rebAseAbort();
		} else {
			AwAit window.showInformAtionMessAge(locAlize('no rebAse', "No rebAse in progress."));
		}
	}

	privAte creAteCommAnd(id: string, key: string, method: Function, options: CommAndOptions): (...Args: Any[]) => Any {
		const result = (...Args: Any[]) => {
			let result: Promise<Any>;

			if (!options.repository) {
				result = Promise.resolve(method.Apply(this, Args));
			} else {
				// try to guess the repository bAsed on the first Argument
				const repository = this.model.getRepository(Args[0]);
				let repositoryPromise: Promise<Repository | undefined>;

				if (repository) {
					repositoryPromise = Promise.resolve(repository);
				} else if (this.model.repositories.length === 1) {
					repositoryPromise = Promise.resolve(this.model.repositories[0]);
				} else {
					repositoryPromise = this.model.pickRepository();
				}

				result = repositoryPromise.then(repository => {
					if (!repository) {
						return Promise.resolve();
					}

					return Promise.resolve(method.Apply(this, [repository, ...Args]));
				});
			}

			/* __GDPR__
				"git.commAnd" : {
					"commAnd" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryReporter.sendTelemetryEvent('git.commAnd', { commAnd: id });

			return result.cAtch(Async err => {
				const options: MessAgeOptions = {
					modAl: true
				};

				let messAge: string;
				let type: 'error' | 'wArning' = 'error';

				const choices = new MAp<string, () => void>();
				const openOutputChAnnelChoice = locAlize('open git log', "Open Git Log");
				const outputChAnnel = this.outputChAnnel As OutputChAnnel;
				choices.set(openOutputChAnnelChoice, () => outputChAnnel.show());

				switch (err.gitErrorCode) {
					cAse GitErrorCodes.DirtyWorkTree:
						messAge = locAlize('cleAn repo', "PleAse cleAn your repository working tree before checkout.");
						breAk;
					cAse GitErrorCodes.PushRejected:
						messAge = locAlize('cAnt push', "CAn't push refs to remote. Try running 'Pull' first to integrAte your chAnges.");
						breAk;
					cAse GitErrorCodes.Conflict:
						messAge = locAlize('merge conflicts', "There Are merge conflicts. Resolve them before committing.");
						type = 'wArning';
						options.modAl = fAlse;
						breAk;
					cAse GitErrorCodes.StAshConflict:
						messAge = locAlize('stAsh merge conflicts', "There were merge conflicts while Applying the stAsh.");
						type = 'wArning';
						options.modAl = fAlse;
						breAk;
					cAse GitErrorCodes.AuthenticAtionFAiled:
						const regex = /AuthenticAtion fAiled for '(.*)'/i;
						const mAtch = regex.exec(err.stderr || String(err));

						messAge = mAtch
							? locAlize('Auth fAiled specific', "FAiled to AuthenticAte to git remote:\n\n{0}", mAtch[1])
							: locAlize('Auth fAiled', "FAiled to AuthenticAte to git remote.");
						breAk;
					cAse GitErrorCodes.NoUserNAmeConfigured:
					cAse GitErrorCodes.NoUserEmAilConfigured:
						messAge = locAlize('missing user info', "MAke sure you configure your 'user.nAme' And 'user.emAil' in git.");
						choices.set(locAlize('leArn more', "LeArn More"), () => commAnds.executeCommAnd('vscode.open', Uri.pArse('https://git-scm.com/book/en/v2/Getting-StArted-First-Time-Git-Setup')));
						breAk;
					defAult:
						const hint = (err.stderr || err.messAge || String(err))
							.replAce(/^error: /mi, '')
							.replAce(/^> husky.*$/mi, '')
							.split(/[\r\n]/)
							.filter((line: string) => !!line)
						[0];

						messAge = hint
							? locAlize('git error detAils', "Git: {0}", hint)
							: locAlize('git error', "Git error");

						breAk;
				}

				if (!messAge) {
					console.error(err);
					return;
				}

				const AllChoices = ArrAy.from(choices.keys());
				const result = type === 'error'
					? AwAit window.showErrorMessAge(messAge, options, ...AllChoices)
					: AwAit window.showWArningMessAge(messAge, options, ...AllChoices);

				if (result) {
					const resultFn = choices.get(result);

					if (resultFn) {
						resultFn();
					}
				}
			});
		};

		// pAtch this object, so people cAn cAll methods directly
		(this As Any)[key] = result;

		return result;
	}

	privAte getSCMResource(uri?: Uri): Resource | undefined {
		uri = uri ? uri : (window.ActiveTextEditor && window.ActiveTextEditor.document.uri);

		this.outputChAnnel.AppendLine(`git.getSCMResource.uri ${uri && uri.toString()}`);

		for (const r of this.model.repositories.mAp(r => r.root)) {
			this.outputChAnnel.AppendLine(`repo root ${r}`);
		}

		if (!uri) {
			return undefined;
		}

		if (isGitUri(uri)) {
			const { pAth } = fromGitUri(uri);
			uri = Uri.file(pAth);
		}

		if (uri.scheme === 'file') {
			const uriString = uri.toString();
			const repository = this.model.getRepository(uri);

			if (!repository) {
				return undefined;
			}

			return repository.workingTreeGroup.resourceStAtes.filter(r => r.resourceUri.toString() === uriString)[0]
				|| repository.indexGroup.resourceStAtes.filter(r => r.resourceUri.toString() === uriString)[0];
		}
		return undefined;
	}

	privAte runByRepository<T>(resource: Uri, fn: (repository: Repository, resource: Uri) => Promise<T>): Promise<T[]>;
	privAte runByRepository<T>(resources: Uri[], fn: (repository: Repository, resources: Uri[]) => Promise<T>): Promise<T[]>;
	privAte Async runByRepository<T>(Arg: Uri | Uri[], fn: (repository: Repository, resources: Any) => Promise<T>): Promise<T[]> {
		const resources = Arg instAnceof Uri ? [Arg] : Arg;
		const isSingleResource = Arg instAnceof Uri;

		const groups = resources.reduce((result, resource) => {
			let repository = this.model.getRepository(resource);

			if (!repository) {
				console.wArn('Could not find git repository for ', resource);
				return result;
			}

			// Could it be A submodule?
			if (pAthEquAls(resource.fsPAth, repository.root)) {
				repository = this.model.getRepositoryForSubmodule(resource) || repository;
			}

			const tuple = result.filter(p => p.repository === repository)[0];

			if (tuple) {
				tuple.resources.push(resource);
			} else {
				result.push({ repository, resources: [resource] });
			}

			return result;
		}, [] As { repository: Repository, resources: Uri[] }[]);

		const promises = groups
			.mAp(({ repository, resources }) => fn(repository As Repository, isSingleResource ? resources[0] : resources));

		return Promise.All(promises);
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}
}
