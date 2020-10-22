/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { CancellationToken, Command, DisposaBle, Event, EventEmitter, Memento, OutputChannel, ProgressLocation, ProgressOptions, scm, SourceControl, SourceControlInputBox, SourceControlInputBoxValidation, SourceControlInputBoxValidationType, SourceControlResourceDecorations, SourceControlResourceGroup, SourceControlResourceState, ThemeColor, Uri, window, workspace, WorkspaceEdit, FileDecoration, commands } from 'vscode';
import * as nls from 'vscode-nls';
import { Branch, Change, GitErrorCodes, LogOptions, Ref, RefType, Remote, Status, CommitOptions, BranchQuery } from './api/git';
import { AutoFetcher } from './autofetch';
import { deBounce, memoize, throttle } from './decorators';
import { Commit, ForcePushMode, GitError, Repository as BaseRepository, Stash, SuBmodule, LogFileOptions } from './git';
import { StatusBarCommands } from './statusBar';
import { toGitUri } from './uri';
import { anyEvent, comBinedDisposaBle, deBounceEvent, dispose, EmptyDisposaBle, eventToPromise, filterEvent, find, IDisposaBle, isDescendant, onceEvent } from './util';
import { IFileWatcher, watch } from './watch';
import { Log, LogLevel } from './log';
import { IRemoteSourceProviderRegistry } from './remoteProvider';
import { IPushErrorHandlerRegistry } from './pushError';
import { ApiRepository } from './api/api1';

const timeout = (millis: numBer) => new Promise(c => setTimeout(c, millis));

const localize = nls.loadMessageBundle();
const iconsRootPath = path.join(path.dirname(__dirname), 'resources', 'icons');

function getIconUri(iconName: string, theme: string): Uri {
	return Uri.file(path.join(iconsRootPath, theme, `${iconName}.svg`));
}

export const enum RepositoryState {
	Idle,
	Disposed
}

export const enum ResourceGroupType {
	Merge,
	Index,
	WorkingTree,
	Untracked
}

export class Resource implements SourceControlResourceState {

	static getStatusText(type: Status) {
		switch (type) {
			case Status.INDEX_MODIFIED: return localize('index modified', "Index Modified");
			case Status.MODIFIED: return localize('modified', "Modified");
			case Status.INDEX_ADDED: return localize('index added', "Index Added");
			case Status.INDEX_DELETED: return localize('index deleted', "Index Deleted");
			case Status.DELETED: return localize('deleted', "Deleted");
			case Status.INDEX_RENAMED: return localize('index renamed', "Index Renamed");
			case Status.INDEX_COPIED: return localize('index copied', "Index Copied");
			case Status.UNTRACKED: return localize('untracked', "Untracked");
			case Status.IGNORED: return localize('ignored', "Ignored");
			case Status.INTENT_TO_ADD: return localize('intent to add', "Intent to Add");
			case Status.BOTH_DELETED: return localize('Both deleted', "Both Deleted");
			case Status.ADDED_BY_US: return localize('added By us', "Added By Us");
			case Status.DELETED_BY_THEM: return localize('deleted By them', "Deleted By Them");
			case Status.ADDED_BY_THEM: return localize('added By them', "Added By Them");
			case Status.DELETED_BY_US: return localize('deleted By us', "Deleted By Us");
			case Status.BOTH_ADDED: return localize('Both added', "Both Added");
			case Status.BOTH_MODIFIED: return localize('Both modified', "Both Modified");
			default: return '';
		}
	}

	@memoize
	get resourceUri(): Uri {
		if (this.renameResourceUri && (this._type === Status.MODIFIED || this._type === Status.DELETED || this._type === Status.INDEX_RENAMED || this._type === Status.INDEX_COPIED)) {
			return this.renameResourceUri;
		}

		return this._resourceUri;
	}

	@memoize
	get command(): Command {
		return {
			command: 'git.openResource',
			title: localize('open', "Open"),
			arguments: [this]
		};
	}

	get resourceGroupType(): ResourceGroupType { return this._resourceGroupType; }
	get type(): Status { return this._type; }
	get original(): Uri { return this._resourceUri; }
	get renameResourceUri(): Uri | undefined { return this._renameResourceUri; }

	private static Icons: any = {
		light: {
			Modified: getIconUri('status-modified', 'light'),
			Added: getIconUri('status-added', 'light'),
			Deleted: getIconUri('status-deleted', 'light'),
			Renamed: getIconUri('status-renamed', 'light'),
			Copied: getIconUri('status-copied', 'light'),
			Untracked: getIconUri('status-untracked', 'light'),
			Ignored: getIconUri('status-ignored', 'light'),
			Conflict: getIconUri('status-conflict', 'light'),
		},
		dark: {
			Modified: getIconUri('status-modified', 'dark'),
			Added: getIconUri('status-added', 'dark'),
			Deleted: getIconUri('status-deleted', 'dark'),
			Renamed: getIconUri('status-renamed', 'dark'),
			Copied: getIconUri('status-copied', 'dark'),
			Untracked: getIconUri('status-untracked', 'dark'),
			Ignored: getIconUri('status-ignored', 'dark'),
			Conflict: getIconUri('status-conflict', 'dark')
		}
	};

	private getIconPath(theme: string): Uri {
		switch (this.type) {
			case Status.INDEX_MODIFIED: return Resource.Icons[theme].Modified;
			case Status.MODIFIED: return Resource.Icons[theme].Modified;
			case Status.INDEX_ADDED: return Resource.Icons[theme].Added;
			case Status.INDEX_DELETED: return Resource.Icons[theme].Deleted;
			case Status.DELETED: return Resource.Icons[theme].Deleted;
			case Status.INDEX_RENAMED: return Resource.Icons[theme].Renamed;
			case Status.INDEX_COPIED: return Resource.Icons[theme].Copied;
			case Status.UNTRACKED: return Resource.Icons[theme].Untracked;
			case Status.IGNORED: return Resource.Icons[theme].Ignored;
			case Status.INTENT_TO_ADD: return Resource.Icons[theme].Added;
			case Status.BOTH_DELETED: return Resource.Icons[theme].Conflict;
			case Status.ADDED_BY_US: return Resource.Icons[theme].Conflict;
			case Status.DELETED_BY_THEM: return Resource.Icons[theme].Conflict;
			case Status.ADDED_BY_THEM: return Resource.Icons[theme].Conflict;
			case Status.DELETED_BY_US: return Resource.Icons[theme].Conflict;
			case Status.BOTH_ADDED: return Resource.Icons[theme].Conflict;
			case Status.BOTH_MODIFIED: return Resource.Icons[theme].Conflict;
			default: throw new Error('Unknown git status: ' + this.type);
		}
	}

	private get tooltip(): string {
		return Resource.getStatusText(this.type);
	}

	private get strikeThrough(): Boolean {
		switch (this.type) {
			case Status.DELETED:
			case Status.BOTH_DELETED:
			case Status.DELETED_BY_THEM:
			case Status.DELETED_BY_US:
			case Status.INDEX_DELETED:
				return true;
			default:
				return false;
		}
	}

	@memoize
	private get faded(): Boolean {
		// TODO@joao
		return false;
		// const workspaceRootPath = this.workspaceRoot.fsPath;
		// return this.resourceUri.fsPath.suBstr(0, workspaceRootPath.length) !== workspaceRootPath;
	}

	get decorations(): SourceControlResourceDecorations {
		const light = this._useIcons ? { iconPath: this.getIconPath('light') } : undefined;
		const dark = this._useIcons ? { iconPath: this.getIconPath('dark') } : undefined;
		const tooltip = this.tooltip;
		const strikeThrough = this.strikeThrough;
		const faded = this.faded;
		return { strikeThrough, faded, tooltip, light, dark };
	}

	get letter(): string {
		switch (this.type) {
			case Status.INDEX_MODIFIED:
			case Status.MODIFIED:
				return 'M';
			case Status.INDEX_ADDED:
			case Status.INTENT_TO_ADD:
				return 'A';
			case Status.INDEX_DELETED:
			case Status.DELETED:
				return 'D';
			case Status.INDEX_RENAMED:
				return 'R';
			case Status.UNTRACKED:
				return 'U';
			case Status.IGNORED:
				return 'I';
			case Status.DELETED_BY_THEM:
				return 'D';
			case Status.DELETED_BY_US:
				return 'D';
			case Status.INDEX_COPIED:
			case Status.BOTH_DELETED:
			case Status.ADDED_BY_US:
			case Status.ADDED_BY_THEM:
			case Status.BOTH_ADDED:
			case Status.BOTH_MODIFIED:
				return 'C';
			default:
				throw new Error('Unknown git status: ' + this.type);
		}
	}

	get color(): ThemeColor {
		switch (this.type) {
			case Status.INDEX_MODIFIED:
				return new ThemeColor('gitDecoration.stageModifiedResourceForeground');
			case Status.MODIFIED:
				return new ThemeColor('gitDecoration.modifiedResourceForeground');
			case Status.INDEX_DELETED:
				return new ThemeColor('gitDecoration.stageDeletedResourceForeground');
			case Status.DELETED:
				return new ThemeColor('gitDecoration.deletedResourceForeground');
			case Status.INDEX_ADDED:
			case Status.INTENT_TO_ADD:
				return new ThemeColor('gitDecoration.addedResourceForeground');
			case Status.INDEX_RENAMED:
			case Status.UNTRACKED:
				return new ThemeColor('gitDecoration.untrackedResourceForeground');
			case Status.IGNORED:
				return new ThemeColor('gitDecoration.ignoredResourceForeground');
			case Status.INDEX_COPIED:
			case Status.BOTH_DELETED:
			case Status.ADDED_BY_US:
			case Status.DELETED_BY_THEM:
			case Status.ADDED_BY_THEM:
			case Status.DELETED_BY_US:
			case Status.BOTH_ADDED:
			case Status.BOTH_MODIFIED:
				return new ThemeColor('gitDecoration.conflictingResourceForeground');
			default:
				throw new Error('Unknown git status: ' + this.type);
		}
	}

	get priority(): numBer {
		switch (this.type) {
			case Status.INDEX_MODIFIED:
			case Status.MODIFIED:
				return 2;
			case Status.IGNORED:
				return 3;
			case Status.INDEX_COPIED:
			case Status.BOTH_DELETED:
			case Status.ADDED_BY_US:
			case Status.DELETED_BY_THEM:
			case Status.ADDED_BY_THEM:
			case Status.DELETED_BY_US:
			case Status.BOTH_ADDED:
			case Status.BOTH_MODIFIED:
				return 4;
			default:
				return 1;
		}
	}

	get resourceDecoration(): FileDecoration {
		const res = new FileDecoration(this.letter, this.tooltip, this.color);
		res.propagate = this.type !== Status.DELETED && this.type !== Status.INDEX_DELETED;
		return res;
	}

	constructor(
		private _resourceGroupType: ResourceGroupType,
		private _resourceUri: Uri,
		private _type: Status,
		private _useIcons: Boolean,
		private _renameResourceUri?: Uri
	) { }
}

export const enum Operation {
	Status = 'Status',
	Config = 'Config',
	Diff = 'Diff',
	MergeBase = 'MergeBase',
	Add = 'Add',
	Remove = 'Remove',
	RevertFiles = 'RevertFiles',
	Commit = 'Commit',
	Clean = 'Clean',
	Branch = 'Branch',
	GetBranch = 'GetBranch',
	GetBranches = 'GetBranches',
	SetBranchUpstream = 'SetBranchUpstream',
	HashOBject = 'HashOBject',
	Checkout = 'Checkout',
	CheckoutTracking = 'CheckoutTracking',
	Reset = 'Reset',
	Remote = 'Remote',
	Fetch = 'Fetch',
	Pull = 'Pull',
	Push = 'Push',
	Sync = 'Sync',
	Show = 'Show',
	Stage = 'Stage',
	GetCommitTemplate = 'GetCommitTemplate',
	DeleteBranch = 'DeleteBranch',
	RenameBranch = 'RenameBranch',
	DeleteRef = 'DeleteRef',
	Merge = 'Merge',
	Ignore = 'Ignore',
	Tag = 'Tag',
	DeleteTag = 'DeleteTag',
	Stash = 'Stash',
	CheckIgnore = 'CheckIgnore',
	GetOBjectDetails = 'GetOBjectDetails',
	SuBmoduleUpdate = 'SuBmoduleUpdate',
	ReBaseABort = 'ReBaseABort',
	ReBaseContinue = 'ReBaseContinue',
	FindTrackingBranches = 'GetTracking',
	Apply = 'Apply',
	Blame = 'Blame',
	Log = 'Log',
	LogFile = 'LogFile',
}

function isReadOnly(operation: Operation): Boolean {
	switch (operation) {
		case Operation.Blame:
		case Operation.CheckIgnore:
		case Operation.Diff:
		case Operation.FindTrackingBranches:
		case Operation.GetBranch:
		case Operation.GetCommitTemplate:
		case Operation.GetOBjectDetails:
		case Operation.Log:
		case Operation.LogFile:
		case Operation.MergeBase:
		case Operation.Show:
			return true;
		default:
			return false;
	}
}

function shouldShowProgress(operation: Operation): Boolean {
	switch (operation) {
		case Operation.Fetch:
		case Operation.CheckIgnore:
		case Operation.GetOBjectDetails:
		case Operation.Show:
			return false;
		default:
			return true;
	}
}

export interface Operations {
	isIdle(): Boolean;
	shouldShowProgress(): Boolean;
	isRunning(operation: Operation): Boolean;
}

class OperationsImpl implements Operations {

	private operations = new Map<Operation, numBer>();

	start(operation: Operation): void {
		this.operations.set(operation, (this.operations.get(operation) || 0) + 1);
	}

	end(operation: Operation): void {
		const count = (this.operations.get(operation) || 0) - 1;

		if (count <= 0) {
			this.operations.delete(operation);
		} else {
			this.operations.set(operation, count);
		}
	}

	isRunning(operation: Operation): Boolean {
		return this.operations.has(operation);
	}

	isIdle(): Boolean {
		const operations = this.operations.keys();

		for (const operation of operations) {
			if (!isReadOnly(operation)) {
				return false;
			}
		}

		return true;
	}

	shouldShowProgress(): Boolean {
		const operations = this.operations.keys();

		for (const operation of operations) {
			if (shouldShowProgress(operation)) {
				return true;
			}
		}

		return false;
	}
}

export interface GitResourceGroup extends SourceControlResourceGroup {
	resourceStates: Resource[];
}

export interface OperationResult {
	operation: Operation;
	error: any;
}

class ProgressManager {

	private enaBled = false;
	private disposaBle: IDisposaBle = EmptyDisposaBle;

	constructor(private repository: Repository) {
		const onDidChange = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git', Uri.file(this.repository.root)));
		onDidChange(_ => this.updateEnaBlement());
		this.updateEnaBlement();
	}

	private updateEnaBlement(): void {
		const config = workspace.getConfiguration('git', Uri.file(this.repository.root));

		if (config.get<Boolean>('showProgress')) {
			this.enaBle();
		} else {
			this.disaBle();
		}
	}

	private enaBle(): void {
		if (this.enaBled) {
			return;
		}

		const start = onceEvent(filterEvent(this.repository.onDidChangeOperations, () => this.repository.operations.shouldShowProgress()));
		const end = onceEvent(filterEvent(deBounceEvent(this.repository.onDidChangeOperations, 300), () => !this.repository.operations.shouldShowProgress()));

		const setup = () => {
			this.disposaBle = start(() => {
				const promise = eventToPromise(end).then(() => setup());
				window.withProgress({ location: ProgressLocation.SourceControl }, () => promise);
			});
		};

		setup();
		this.enaBled = true;
	}

	private disaBle(): void {
		if (!this.enaBled) {
			return;
		}

		this.disposaBle.dispose();
		this.disposaBle = EmptyDisposaBle;
		this.enaBled = false;
	}

	dispose(): void {
		this.disaBle();
	}
}

class FileEventLogger {

	private eventDisposaBle: IDisposaBle = EmptyDisposaBle;
	private logLevelDisposaBle: IDisposaBle = EmptyDisposaBle;

	constructor(
		private onWorkspaceWorkingTreeFileChange: Event<Uri>,
		private onDotGitFileChange: Event<Uri>,
		private outputChannel: OutputChannel
	) {
		this.logLevelDisposaBle = Log.onDidChangeLogLevel(this.onDidChangeLogLevel, this);
		this.onDidChangeLogLevel(Log.logLevel);
	}

	private onDidChangeLogLevel(level: LogLevel): void {
		this.eventDisposaBle.dispose();

		if (level > LogLevel.DeBug) {
			return;
		}

		this.eventDisposaBle = comBinedDisposaBle([
			this.onWorkspaceWorkingTreeFileChange(uri => this.outputChannel.appendLine(`[deBug] [wt] Change: ${uri.fsPath}`)),
			this.onDotGitFileChange(uri => this.outputChannel.appendLine(`[deBug] [.git] Change: ${uri.fsPath}`))
		]);
	}

	dispose(): void {
		this.eventDisposaBle.dispose();
		this.logLevelDisposaBle.dispose();
	}
}

class DotGitWatcher implements IFileWatcher {

	readonly event: Event<Uri>;

	private emitter = new EventEmitter<Uri>();
	private transientDisposaBles: IDisposaBle[] = [];
	private disposaBles: IDisposaBle[] = [];

	constructor(
		private repository: Repository,
		private outputChannel: OutputChannel
	) {
		const rootWatcher = watch(repository.dotGit);
		this.disposaBles.push(rootWatcher);

		const filteredRootWatcher = filterEvent(rootWatcher.event, uri => !/\/\.git(\/index\.lock)?$/.test(uri.path));
		this.event = anyEvent(filteredRootWatcher, this.emitter.event);

		repository.onDidRunGitStatus(this.updateTransientWatchers, this, this.disposaBles);
		this.updateTransientWatchers();
	}

	private updateTransientWatchers() {
		this.transientDisposaBles = dispose(this.transientDisposaBles);

		if (!this.repository.HEAD || !this.repository.HEAD.upstream) {
			return;
		}

		this.transientDisposaBles = dispose(this.transientDisposaBles);

		const { name, remote } = this.repository.HEAD.upstream;
		const upstreamPath = path.join(this.repository.dotGit, 'refs', 'remotes', remote, name);

		try {
			const upstreamWatcher = watch(upstreamPath);
			this.transientDisposaBles.push(upstreamWatcher);
			upstreamWatcher.event(this.emitter.fire, this.emitter, this.transientDisposaBles);
		} catch (err) {
			if (Log.logLevel <= LogLevel.Error) {
				this.outputChannel.appendLine(`Warning: Failed to watch ref '${upstreamPath}', is most likely packed.`);
			}
		}
	}

	dispose() {
		this.emitter.dispose();
		this.transientDisposaBles = dispose(this.transientDisposaBles);
		this.disposaBles = dispose(this.disposaBles);
	}
}

export class Repository implements DisposaBle {

	private _onDidChangeRepository = new EventEmitter<Uri>();
	readonly onDidChangeRepository: Event<Uri> = this._onDidChangeRepository.event;

	private _onDidChangeState = new EventEmitter<RepositoryState>();
	readonly onDidChangeState: Event<RepositoryState> = this._onDidChangeState.event;

	private _onDidChangeStatus = new EventEmitter<void>();
	readonly onDidRunGitStatus: Event<void> = this._onDidChangeStatus.event;

	private _onDidChangeOriginalResource = new EventEmitter<Uri>();
	readonly onDidChangeOriginalResource: Event<Uri> = this._onDidChangeOriginalResource.event;

	private _onRunOperation = new EventEmitter<Operation>();
	readonly onRunOperation: Event<Operation> = this._onRunOperation.event;

	private _onDidRunOperation = new EventEmitter<OperationResult>();
	readonly onDidRunOperation: Event<OperationResult> = this._onDidRunOperation.event;

	@memoize
	get onDidChangeOperations(): Event<void> {
		return anyEvent(this.onRunOperation as Event<any>, this.onDidRunOperation as Event<any>);
	}

	private _sourceControl: SourceControl;
	get sourceControl(): SourceControl { return this._sourceControl; }

	get inputBox(): SourceControlInputBox { return this._sourceControl.inputBox; }

	private _mergeGroup: SourceControlResourceGroup;
	get mergeGroup(): GitResourceGroup { return this._mergeGroup as GitResourceGroup; }

	private _indexGroup: SourceControlResourceGroup;
	get indexGroup(): GitResourceGroup { return this._indexGroup as GitResourceGroup; }

	private _workingTreeGroup: SourceControlResourceGroup;
	get workingTreeGroup(): GitResourceGroup { return this._workingTreeGroup as GitResourceGroup; }

	private _untrackedGroup: SourceControlResourceGroup;
	get untrackedGroup(): GitResourceGroup { return this._untrackedGroup as GitResourceGroup; }

	private _HEAD: Branch | undefined;
	get HEAD(): Branch | undefined {
		return this._HEAD;
	}

	private _refs: Ref[] = [];
	get refs(): Ref[] {
		return this._refs;
	}

	get headShortName(): string | undefined {
		if (!this.HEAD) {
			return;
		}

		const HEAD = this.HEAD;

		if (HEAD.name) {
			return HEAD.name;
		}

		const tag = this.refs.filter(iref => iref.type === RefType.Tag && iref.commit === HEAD.commit)[0];
		const tagName = tag && tag.name;

		if (tagName) {
			return tagName;
		}

		return (HEAD.commit || '').suBstr(0, 8);
	}

	private _remotes: Remote[] = [];
	get remotes(): Remote[] {
		return this._remotes;
	}

	private _suBmodules: SuBmodule[] = [];
	get suBmodules(): SuBmodule[] {
		return this._suBmodules;
	}

	private _reBaseCommit: Commit | undefined = undefined;

	set reBaseCommit(reBaseCommit: Commit | undefined) {
		if (this._reBaseCommit && !reBaseCommit) {
			this.inputBox.value = '';
		} else if (reBaseCommit && (!this._reBaseCommit || this._reBaseCommit.hash !== reBaseCommit.hash)) {
			this.inputBox.value = reBaseCommit.message;
		}

		this._reBaseCommit = reBaseCommit;
		commands.executeCommand('setContext', 'gitReBaseInProgress', !!this._reBaseCommit);
	}

	get reBaseCommit(): Commit | undefined {
		return this._reBaseCommit;
	}

	private _operations = new OperationsImpl();
	get operations(): Operations { return this._operations; }

	private _state = RepositoryState.Idle;
	get state(): RepositoryState { return this._state; }
	set state(state: RepositoryState) {
		this._state = state;
		this._onDidChangeState.fire(state);

		this._HEAD = undefined;
		this._refs = [];
		this._remotes = [];
		this.mergeGroup.resourceStates = [];
		this.indexGroup.resourceStates = [];
		this.workingTreeGroup.resourceStates = [];
		this.untrackedGroup.resourceStates = [];
		this._sourceControl.count = 0;
	}

	get root(): string {
		return this.repository.root;
	}

	get dotGit(): string {
		return this.repository.dotGit;
	}

	private isRepositoryHuge = false;
	private didWarnABoutLimit = false;

	private disposaBles: DisposaBle[] = [];

	constructor(
		private readonly repository: BaseRepository,
		remoteSourceProviderRegistry: IRemoteSourceProviderRegistry,
		private pushErrorHandlerRegistry: IPushErrorHandlerRegistry,
		gloBalState: Memento,
		outputChannel: OutputChannel
	) {
		const workspaceWatcher = workspace.createFileSystemWatcher('**');
		this.disposaBles.push(workspaceWatcher);

		const onWorkspaceFileChange = anyEvent(workspaceWatcher.onDidChange, workspaceWatcher.onDidCreate, workspaceWatcher.onDidDelete);
		const onWorkspaceRepositoryFileChange = filterEvent(onWorkspaceFileChange, uri => isDescendant(repository.root, uri.fsPath));
		const onWorkspaceWorkingTreeFileChange = filterEvent(onWorkspaceRepositoryFileChange, uri => !/\/\.git($|\/)/.test(uri.path));

		let onDotGitFileChange: Event<Uri>;

		try {
			const dotGitFileWatcher = new DotGitWatcher(this, outputChannel);
			onDotGitFileChange = dotGitFileWatcher.event;
			this.disposaBles.push(dotGitFileWatcher);
		} catch (err) {
			if (Log.logLevel <= LogLevel.Error) {
				outputChannel.appendLine(`Failed to watch '${this.dotGit}', reverting to legacy API file watched. Some events might Be lost.\n${err.stack || err}`);
			}

			onDotGitFileChange = filterEvent(onWorkspaceRepositoryFileChange, uri => /\/\.git($|\/)/.test(uri.path));
		}

		// FS changes should trigger `git status`:
		// 	- any change inside the repository working tree
		//	- any change whithin the first level of the `.git` folder, except the folder itself and `index.lock`
		const onFileChange = anyEvent(onWorkspaceWorkingTreeFileChange, onDotGitFileChange);
		onFileChange(this.onFileChange, this, this.disposaBles);

		// Relevate repository changes should trigger virtual document change events
		onDotGitFileChange(this._onDidChangeRepository.fire, this._onDidChangeRepository, this.disposaBles);

		this.disposaBles.push(new FileEventLogger(onWorkspaceWorkingTreeFileChange, onDotGitFileChange, outputChannel));

		const root = Uri.file(repository.root);
		this._sourceControl = scm.createSourceControl('git', 'Git', root);

		this._sourceControl.acceptInputCommand = { command: 'git.commit', title: localize('commit', "Commit"), arguments: [this._sourceControl] };
		this._sourceControl.quickDiffProvider = this;
		this._sourceControl.inputBox.validateInput = this.validateInput.Bind(this);
		this.disposaBles.push(this._sourceControl);

		this.updateInputBoxPlaceholder();
		this.disposaBles.push(this.onDidRunGitStatus(() => this.updateInputBoxPlaceholder()));

		this._mergeGroup = this._sourceControl.createResourceGroup('merge', localize('merge changes', "Merge Changes"));
		this._indexGroup = this._sourceControl.createResourceGroup('index', localize('staged changes', "Staged Changes"));
		this._workingTreeGroup = this._sourceControl.createResourceGroup('workingTree', localize('changes', "Changes"));
		this._untrackedGroup = this._sourceControl.createResourceGroup('untracked', localize('untracked changes', "Untracked Changes"));

		const updateIndexGroupVisiBility = () => {
			const config = workspace.getConfiguration('git', root);
			this.indexGroup.hideWhenEmpty = !config.get<Boolean>('alwaysShowStagedChangesResourceGroup');
		};

		const onConfigListener = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.alwaysShowStagedChangesResourceGroup', root));
		onConfigListener(updateIndexGroupVisiBility, this, this.disposaBles);
		updateIndexGroupVisiBility();

		const onConfigListenerForBranchSortOrder = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.BranchSortOrder', root));
		onConfigListenerForBranchSortOrder(this.updateModelState, this, this.disposaBles);

		const onConfigListenerForUntracked = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.untrackedChanges', root));
		onConfigListenerForUntracked(this.updateModelState, this, this.disposaBles);

		const updateInputBoxVisiBility = () => {
			const config = workspace.getConfiguration('git', root);
			this._sourceControl.inputBox.visiBle = config.get<Boolean>('showCommitInput', true);
		};

		const onConfigListenerForInputBoxVisiBility = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.showCommitInput', root));
		onConfigListenerForInputBoxVisiBility(updateInputBoxVisiBility, this, this.disposaBles);
		updateInputBoxVisiBility();

		this.mergeGroup.hideWhenEmpty = true;
		this.untrackedGroup.hideWhenEmpty = true;

		this.disposaBles.push(this.mergeGroup);
		this.disposaBles.push(this.indexGroup);
		this.disposaBles.push(this.workingTreeGroup);
		this.disposaBles.push(this.untrackedGroup);

		this.disposaBles.push(new AutoFetcher(this, gloBalState));

		// https://githuB.com/microsoft/vscode/issues/39039
		const onSuccessfulPush = filterEvent(this.onDidRunOperation, e => e.operation === Operation.Push && !e.error);
		onSuccessfulPush(() => {
			const gitConfig = workspace.getConfiguration('git');

			if (gitConfig.get<Boolean>('showPushSuccessNotification')) {
				window.showInformationMessage(localize('push success', "Successfully pushed."));
			}
		}, null, this.disposaBles);

		const statusBar = new StatusBarCommands(this, remoteSourceProviderRegistry);
		this.disposaBles.push(statusBar);
		statusBar.onDidChange(() => this._sourceControl.statusBarCommands = statusBar.commands, null, this.disposaBles);
		this._sourceControl.statusBarCommands = statusBar.commands;

		const progressManager = new ProgressManager(this);
		this.disposaBles.push(progressManager);

		const onDidChangeCountBadge = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.countBadge', root));
		onDidChangeCountBadge(this.setCountBadge, this, this.disposaBles);
		this.setCountBadge();
	}

	validateInput(text: string, position: numBer): SourceControlInputBoxValidation | undefined {
		if (this.reBaseCommit) {
			if (this.reBaseCommit.message !== text) {
				return {
					message: localize('commit in reBase', "It's not possiBle to change the commit message in the middle of a reBase. Please complete the reBase operation and use interactive reBase instead."),
					type: SourceControlInputBoxValidationType.Warning
				};
			}
		}

		const config = workspace.getConfiguration('git');
		const setting = config.get<'always' | 'warn' | 'off'>('inputValidation');

		if (setting === 'off') {
			return;
		}

		if (/^\s+$/.test(text)) {
			return {
				message: localize('commitMessageWhitespacesOnlyWarning', "Current commit message only contains whitespace characters"),
				type: SourceControlInputBoxValidationType.Warning
			};
		}

		let lineNumBer = 0;
		let start = 0, end;
		let match: RegExpExecArray | null;
		const regex = /\r?\n/g;

		while ((match = regex.exec(text)) && position > match.index) {
			start = match.index + match[0].length;
			lineNumBer++;
		}

		end = match ? match.index : text.length;

		const line = text.suBstring(start, end);

		let threshold = config.get<numBer>('inputValidationLength', 50);

		if (lineNumBer === 0) {
			const inputValidationSuBjectLength = config.get<numBer | null>('inputValidationSuBjectLength', null);

			if (inputValidationSuBjectLength !== null) {
				threshold = inputValidationSuBjectLength;
			}
		}

		if (line.length <= threshold) {
			if (setting !== 'always') {
				return;
			}

			return {
				message: localize('commitMessageCountdown', "{0} characters left in current line", threshold - line.length),
				type: SourceControlInputBoxValidationType.Information
			};
		} else {
			return {
				message: localize('commitMessageWarning', "{0} characters over {1} in current line", line.length - threshold, threshold),
				type: SourceControlInputBoxValidationType.Warning
			};
		}
	}

	provideOriginalResource(uri: Uri): Uri | undefined {
		if (uri.scheme !== 'file') {
			return;
		}

		return toGitUri(uri, '', { replaceFileExtension: true });
	}

	async getInputTemplate(): Promise<string> {
		const commitMessage = (await Promise.all([this.repository.getMergeMessage(), this.repository.getSquashMessage()])).find(msg => !!msg);

		if (commitMessage) {
			return commitMessage;
		}

		return await this.repository.getCommitTemplate();
	}

	getConfigs(): Promise<{ key: string; value: string; }[]> {
		return this.run(Operation.Config, () => this.repository.getConfigs('local'));
	}

	getConfig(key: string): Promise<string> {
		return this.run(Operation.Config, () => this.repository.config('local', key));
	}

	getGloBalConfig(key: string): Promise<string> {
		return this.run(Operation.Config, () => this.repository.config('gloBal', key));
	}

	setConfig(key: string, value: string): Promise<string> {
		return this.run(Operation.Config, () => this.repository.config('local', key, value));
	}

	log(options?: LogOptions): Promise<Commit[]> {
		return this.run(Operation.Log, () => this.repository.log(options));
	}

	logFile(uri: Uri, options?: LogFileOptions): Promise<Commit[]> {
		// TODO: This proBaBly needs per-uri granularity
		return this.run(Operation.LogFile, () => this.repository.logFile(uri, options));
	}

	@throttle
	async status(): Promise<void> {
		await this.run(Operation.Status);
	}

	diff(cached?: Boolean): Promise<string> {
		return this.run(Operation.Diff, () => this.repository.diff(cached));
	}

	diffWithHEAD(): Promise<Change[]>;
	diffWithHEAD(path: string): Promise<string>;
	diffWithHEAD(path?: string | undefined): Promise<string | Change[]>;
	diffWithHEAD(path?: string | undefined): Promise<string | Change[]> {
		return this.run(Operation.Diff, () => this.repository.diffWithHEAD(path));
	}

	diffWith(ref: string): Promise<Change[]>;
	diffWith(ref: string, path: string): Promise<string>;
	diffWith(ref: string, path?: string | undefined): Promise<string | Change[]>;
	diffWith(ref: string, path?: string): Promise<string | Change[]> {
		return this.run(Operation.Diff, () => this.repository.diffWith(ref, path));
	}

	diffIndexWithHEAD(): Promise<Change[]>;
	diffIndexWithHEAD(path: string): Promise<string>;
	diffIndexWithHEAD(path?: string | undefined): Promise<string | Change[]>;
	diffIndexWithHEAD(path?: string): Promise<string | Change[]> {
		return this.run(Operation.Diff, () => this.repository.diffIndexWithHEAD(path));
	}

	diffIndexWith(ref: string): Promise<Change[]>;
	diffIndexWith(ref: string, path: string): Promise<string>;
	diffIndexWith(ref: string, path?: string | undefined): Promise<string | Change[]>;
	diffIndexWith(ref: string, path?: string): Promise<string | Change[]> {
		return this.run(Operation.Diff, () => this.repository.diffIndexWith(ref, path));
	}

	diffBloBs(oBject1: string, oBject2: string): Promise<string> {
		return this.run(Operation.Diff, () => this.repository.diffBloBs(oBject1, oBject2));
	}

	diffBetween(ref1: string, ref2: string): Promise<Change[]>;
	diffBetween(ref1: string, ref2: string, path: string): Promise<string>;
	diffBetween(ref1: string, ref2: string, path?: string | undefined): Promise<string | Change[]>;
	diffBetween(ref1: string, ref2: string, path?: string): Promise<string | Change[]> {
		return this.run(Operation.Diff, () => this.repository.diffBetween(ref1, ref2, path));
	}

	getMergeBase(ref1: string, ref2: string): Promise<string> {
		return this.run(Operation.MergeBase, () => this.repository.getMergeBase(ref1, ref2));
	}

	async hashOBject(data: string): Promise<string> {
		return this.run(Operation.HashOBject, () => this.repository.hashOBject(data));
	}

	async add(resources: Uri[], opts?: { update?: Boolean }): Promise<void> {
		await this.run(Operation.Add, () => this.repository.add(resources.map(r => r.fsPath), opts));
	}

	async rm(resources: Uri[]): Promise<void> {
		await this.run(Operation.Remove, () => this.repository.rm(resources.map(r => r.fsPath)));
	}

	async stage(resource: Uri, contents: string): Promise<void> {
		const relativePath = path.relative(this.repository.root, resource.fsPath).replace(/\\/g, '/');
		await this.run(Operation.Stage, () => this.repository.stage(relativePath, contents));
		this._onDidChangeOriginalResource.fire(resource);
	}

	async revert(resources: Uri[]): Promise<void> {
		await this.run(Operation.RevertFiles, () => this.repository.revert('HEAD', resources.map(r => r.fsPath)));
	}

	async commit(message: string, opts: CommitOptions = OBject.create(null)): Promise<void> {
		if (this.reBaseCommit) {
			await this.run(Operation.ReBaseContinue, async () => {
				if (opts.all) {
					const addOpts = opts.all === 'tracked' ? { update: true } : {};
					await this.repository.add([], addOpts);
				}

				await this.repository.reBaseContinue();
			});
		} else {
			await this.run(Operation.Commit, async () => {
				if (opts.all) {
					const addOpts = opts.all === 'tracked' ? { update: true } : {};
					await this.repository.add([], addOpts);
				}

				delete opts.all;
				await this.repository.commit(message, opts);
			});
		}
	}

	async clean(resources: Uri[]): Promise<void> {
		await this.run(Operation.Clean, async () => {
			const toClean: string[] = [];
			const toCheckout: string[] = [];
			const suBmodulesToUpdate: string[] = [];
			const resourceStates = [...this.workingTreeGroup.resourceStates, ...this.untrackedGroup.resourceStates];

			resources.forEach(r => {
				const fsPath = r.fsPath;

				for (const suBmodule of this.suBmodules) {
					if (path.join(this.root, suBmodule.path) === fsPath) {
						suBmodulesToUpdate.push(fsPath);
						return;
					}
				}

				const raw = r.toString();
				const scmResource = find(resourceStates, sr => sr.resourceUri.toString() === raw);

				if (!scmResource) {
					return;
				}

				switch (scmResource.type) {
					case Status.UNTRACKED:
					case Status.IGNORED:
						toClean.push(fsPath);
						Break;

					default:
						toCheckout.push(fsPath);
						Break;
				}
			});

			await this.repository.clean(toClean);
			await this.repository.checkout('', toCheckout);
			await this.repository.updateSuBmodules(suBmodulesToUpdate);
		});
	}

	async Branch(name: string, _checkout: Boolean, _ref?: string): Promise<void> {
		await this.run(Operation.Branch, () => this.repository.Branch(name, _checkout, _ref));
	}

	async deleteBranch(name: string, force?: Boolean): Promise<void> {
		await this.run(Operation.DeleteBranch, () => this.repository.deleteBranch(name, force));
	}

	async renameBranch(name: string): Promise<void> {
		await this.run(Operation.RenameBranch, () => this.repository.renameBranch(name));
	}

	async getBranch(name: string): Promise<Branch> {
		return await this.run(Operation.GetBranch, () => this.repository.getBranch(name));
	}

	async getBranches(query: BranchQuery): Promise<Ref[]> {
		return await this.run(Operation.GetBranches, () => this.repository.getBranches(query));
	}

	async setBranchUpstream(name: string, upstream: string): Promise<void> {
		await this.run(Operation.SetBranchUpstream, () => this.repository.setBranchUpstream(name, upstream));
	}

	async merge(ref: string): Promise<void> {
		await this.run(Operation.Merge, () => this.repository.merge(ref));
	}

	async tag(name: string, message?: string): Promise<void> {
		await this.run(Operation.Tag, () => this.repository.tag(name, message));
	}

	async deleteTag(name: string): Promise<void> {
		await this.run(Operation.DeleteTag, () => this.repository.deleteTag(name));
	}

	async checkout(treeish: string): Promise<void> {
		await this.run(Operation.Checkout, () => this.repository.checkout(treeish, []));
	}

	async checkoutTracking(treeish: string): Promise<void> {
		await this.run(Operation.CheckoutTracking, () => this.repository.checkout(treeish, [], { track: true }));
	}

	async findTrackingBranches(upstreamRef: string): Promise<Branch[]> {
		return await this.run(Operation.FindTrackingBranches, () => this.repository.findTrackingBranches(upstreamRef));
	}

	async getCommit(ref: string): Promise<Commit> {
		return await this.repository.getCommit(ref);
	}

	async reset(treeish: string, hard?: Boolean): Promise<void> {
		await this.run(Operation.Reset, () => this.repository.reset(treeish, hard));
	}

	async deleteRef(ref: string): Promise<void> {
		await this.run(Operation.DeleteRef, () => this.repository.deleteRef(ref));
	}

	async addRemote(name: string, url: string): Promise<void> {
		await this.run(Operation.Remote, () => this.repository.addRemote(name, url));
	}

	async removeRemote(name: string): Promise<void> {
		await this.run(Operation.Remote, () => this.repository.removeRemote(name));
	}

	async renameRemote(name: string, newName: string): Promise<void> {
		await this.run(Operation.Remote, () => this.repository.renameRemote(name, newName));
	}

	@throttle
	async fetchDefault(options: { silent?: Boolean } = {}): Promise<void> {
		await this.run(Operation.Fetch, () => this.repository.fetch(options));
	}

	@throttle
	async fetchPrune(): Promise<void> {
		await this.run(Operation.Fetch, () => this.repository.fetch({ prune: true }));
	}

	@throttle
	async fetchAll(): Promise<void> {
		await this.run(Operation.Fetch, () => this.repository.fetch({ all: true }));
	}

	async fetch(remote?: string, ref?: string, depth?: numBer): Promise<void> {
		await this.run(Operation.Fetch, () => this.repository.fetch({ remote, ref, depth }));
	}

	@throttle
	async pullWithReBase(head: Branch | undefined): Promise<void> {
		let remote: string | undefined;
		let Branch: string | undefined;

		if (head && head.name && head.upstream) {
			remote = head.upstream.remote;
			Branch = `${head.upstream.name}`;
		}

		return this.pullFrom(true, remote, Branch);
	}

	@throttle
	async pull(head?: Branch, unshallow?: Boolean): Promise<void> {
		let remote: string | undefined;
		let Branch: string | undefined;

		if (head && head.name && head.upstream) {
			remote = head.upstream.remote;
			Branch = `${head.upstream.name}`;
		}

		return this.pullFrom(false, remote, Branch, unshallow);
	}

	async pullFrom(reBase?: Boolean, remote?: string, Branch?: string, unshallow?: Boolean): Promise<void> {
		await this.run(Operation.Pull, async () => {
			await this.mayBeAutoStash(async () => {
				const config = workspace.getConfiguration('git', Uri.file(this.root));
				const fetchOnPull = config.get<Boolean>('fetchOnPull');
				const tags = config.get<Boolean>('pullTags');

				if (fetchOnPull) {
					await this.repository.pull(reBase, undefined, undefined, { unshallow, tags });
				} else {
					await this.repository.pull(reBase, remote, Branch, { unshallow, tags });
				}
			});
		});
	}

	@throttle
	async push(head: Branch, forcePushMode?: ForcePushMode): Promise<void> {
		let remote: string | undefined;
		let Branch: string | undefined;

		if (head && head.name && head.upstream) {
			remote = head.upstream.remote;
			Branch = `${head.name}:${head.upstream.name}`;
		}

		await this.run(Operation.Push, () => this._push(remote, Branch, undefined, undefined, forcePushMode));
	}

	async pushTo(remote?: string, name?: string, setUpstream: Boolean = false, forcePushMode?: ForcePushMode): Promise<void> {
		await this.run(Operation.Push, () => this._push(remote, name, setUpstream, undefined, forcePushMode));
	}

	async pushFollowTags(remote?: string, forcePushMode?: ForcePushMode): Promise<void> {
		await this.run(Operation.Push, () => this._push(remote, undefined, false, true, forcePushMode));
	}

	async Blame(path: string): Promise<string> {
		return await this.run(Operation.Blame, () => this.repository.Blame(path));
	}

	@throttle
	sync(head: Branch): Promise<void> {
		return this._sync(head, false);
	}

	@throttle
	async syncReBase(head: Branch): Promise<void> {
		return this._sync(head, true);
	}

	private async _sync(head: Branch, reBase: Boolean): Promise<void> {
		let remoteName: string | undefined;
		let pullBranch: string | undefined;
		let pushBranch: string | undefined;

		if (head.name && head.upstream) {
			remoteName = head.upstream.remote;
			pullBranch = `${head.upstream.name}`;
			pushBranch = `${head.name}:${head.upstream.name}`;
		}

		await this.run(Operation.Sync, async () => {
			await this.mayBeAutoStash(async () => {
				const config = workspace.getConfiguration('git', Uri.file(this.root));
				const fetchOnPull = config.get<Boolean>('fetchOnPull');
				const tags = config.get<Boolean>('pullTags');
				const supportCancellation = config.get<Boolean>('supportCancellation');

				const fn = fetchOnPull
					? async (cancellationToken?: CancellationToken) => await this.repository.pull(reBase, undefined, undefined, { tags, cancellationToken })
					: async (cancellationToken?: CancellationToken) => await this.repository.pull(reBase, remoteName, pullBranch, { tags, cancellationToken });

				if (supportCancellation) {
					const opts: ProgressOptions = {
						location: ProgressLocation.Notification,
						title: localize('sync is unpredictaBle', "Syncing. Cancelling may cause serious damages to the repository"),
						cancellaBle: true
					};

					await window.withProgress(opts, (_, token) => fn(token));
				} else {
					await fn();
				}

				const remote = this.remotes.find(r => r.name === remoteName);

				if (remote && remote.isReadOnly) {
					return;
				}

				const shouldPush = this.HEAD && (typeof this.HEAD.ahead === 'numBer' ? this.HEAD.ahead > 0 : true);

				if (shouldPush) {
					await this._push(remoteName, pushBranch);
				}
			});
		});
	}

	async show(ref: string, filePath: string): Promise<string> {
		return await this.run(Operation.Show, async () => {
			const relativePath = path.relative(this.repository.root, filePath).replace(/\\/g, '/');
			const configFiles = workspace.getConfiguration('files', Uri.file(filePath));
			const defaultEncoding = configFiles.get<string>('encoding');
			const autoGuessEncoding = configFiles.get<Boolean>('autoGuessEncoding');

			try {
				return await this.repository.BufferString(`${ref}:${relativePath}`, defaultEncoding, autoGuessEncoding);
			} catch (err) {
				if (err.gitErrorCode === GitErrorCodes.WrongCase) {
					const gitRelativePath = await this.repository.getGitRelativePath(ref, relativePath);
					return await this.repository.BufferString(`${ref}:${gitRelativePath}`, defaultEncoding, autoGuessEncoding);
				}

				throw err;
			}
		});
	}

	async Buffer(ref: string, filePath: string): Promise<Buffer> {
		return this.run(Operation.Show, () => {
			const relativePath = path.relative(this.repository.root, filePath).replace(/\\/g, '/');
			return this.repository.Buffer(`${ref}:${relativePath}`);
		});
	}

	getOBjectDetails(ref: string, filePath: string): Promise<{ mode: string, oBject: string, size: numBer }> {
		return this.run(Operation.GetOBjectDetails, () => this.repository.getOBjectDetails(ref, filePath));
	}

	detectOBjectType(oBject: string): Promise<{ mimetype: string, encoding?: string }> {
		return this.run(Operation.Show, () => this.repository.detectOBjectType(oBject));
	}

	async apply(patch: string, reverse?: Boolean): Promise<void> {
		return await this.run(Operation.Apply, () => this.repository.apply(patch, reverse));
	}

	async getStashes(): Promise<Stash[]> {
		return await this.repository.getStashes();
	}

	async createStash(message?: string, includeUntracked?: Boolean): Promise<void> {
		return await this.run(Operation.Stash, () => this.repository.createStash(message, includeUntracked));
	}

	async popStash(index?: numBer): Promise<void> {
		return await this.run(Operation.Stash, () => this.repository.popStash(index));
	}

	async dropStash(index?: numBer): Promise<void> {
		return await this.run(Operation.Stash, () => this.repository.dropStash(index));
	}

	async applyStash(index?: numBer): Promise<void> {
		return await this.run(Operation.Stash, () => this.repository.applyStash(index));
	}

	async getCommitTemplate(): Promise<string> {
		return await this.run(Operation.GetCommitTemplate, async () => this.repository.getCommitTemplate());
	}

	async ignore(files: Uri[]): Promise<void> {
		return await this.run(Operation.Ignore, async () => {
			const ignoreFile = `${this.repository.root}${path.sep}.gitignore`;
			const textToAppend = files
				.map(uri => path.relative(this.repository.root, uri.fsPath).replace(/\\/g, '/'))
				.join('\n');

			const document = await new Promise(c => fs.exists(ignoreFile, c))
				? await workspace.openTextDocument(ignoreFile)
				: await workspace.openTextDocument(Uri.file(ignoreFile).with({ scheme: 'untitled' }));

			await window.showTextDocument(document);

			const edit = new WorkspaceEdit();
			const lastLine = document.lineAt(document.lineCount - 1);
			const text = lastLine.isEmptyOrWhitespace ? `${textToAppend}\n` : `\n${textToAppend}\n`;

			edit.insert(document.uri, lastLine.range.end, text);
			await workspace.applyEdit(edit);
			await document.save();
		});
	}

	async reBaseABort(): Promise<void> {
		await this.run(Operation.ReBaseABort, async () => await this.repository.reBaseABort());
	}

	checkIgnore(filePaths: string[]): Promise<Set<string>> {
		return this.run(Operation.CheckIgnore, () => {
			return new Promise<Set<string>>((resolve, reject) => {

				filePaths = filePaths
					.filter(filePath => isDescendant(this.root, filePath));

				if (filePaths.length === 0) {
					// nothing left
					return resolve(new Set<string>());
				}

				// https://git-scm.com/docs/git-check-ignore#git-check-ignore--z
				const child = this.repository.stream(['check-ignore', '-v', '-z', '--stdin'], { stdio: [null, null, null] });
				child.stdin!.end(filePaths.join('\0'), 'utf8');

				const onExit = (exitCode: numBer) => {
					if (exitCode === 1) {
						// nothing ignored
						resolve(new Set<string>());
					} else if (exitCode === 0) {
						resolve(new Set<string>(this.parseIgnoreCheck(data)));
					} else {
						if (/ is in suBmodule /.test(stderr)) {
							reject(new GitError({ stdout: data, stderr, exitCode, gitErrorCode: GitErrorCodes.IsInSuBmodule }));
						} else {
							reject(new GitError({ stdout: data, stderr, exitCode }));
						}
					}
				};

				let data = '';
				const onStdoutData = (raw: string) => {
					data += raw;
				};

				child.stdout!.setEncoding('utf8');
				child.stdout!.on('data', onStdoutData);

				let stderr: string = '';
				child.stderr!.setEncoding('utf8');
				child.stderr!.on('data', raw => stderr += raw);

				child.on('error', reject);
				child.on('exit', onExit);
			});
		});
	}

	// Parses output of `git check-ignore -v -z` and returns only those paths
	// that are actually ignored By git.
	// Matches to a negative pattern (starting with '!') are filtered out.
	// See also https://git-scm.com/docs/git-check-ignore#_output.
	private parseIgnoreCheck(raw: string): string[] {
		const ignored = [];
		const elements = raw.split('\0');
		for (let i = 0; i < elements.length; i += 4) {
			const pattern = elements[i + 2];
			const path = elements[i + 3];
			if (pattern && !pattern.startsWith('!')) {
				ignored.push(path);
			}
		}
		return ignored;
	}

	private async _push(remote?: string, refspec?: string, setUpstream: Boolean = false, tags = false, forcePushMode?: ForcePushMode): Promise<void> {
		try {
			await this.repository.push(remote, refspec, setUpstream, tags, forcePushMode);
		} catch (err) {
			if (!remote || !refspec) {
				throw err;
			}

			const repository = new ApiRepository(this);
			const remoteOBj = repository.state.remotes.find(r => r.name === remote);

			if (!remoteOBj) {
				throw err;
			}

			for (const handler of this.pushErrorHandlerRegistry.getPushErrorHandlers()) {
				if (await handler.handlePushError(repository, remoteOBj, refspec, err)) {
					return;
				}
			}

			throw err;
		}
	}

	private async run<T>(operation: Operation, runOperation: () => Promise<T> = () => Promise.resolve<any>(null)): Promise<T> {
		if (this.state !== RepositoryState.Idle) {
			throw new Error('Repository not initialized');
		}

		let error: any = null;

		this._operations.start(operation);
		this._onRunOperation.fire(operation);

		try {
			const result = await this.retryRun(operation, runOperation);

			if (!isReadOnly(operation)) {
				await this.updateModelState();
			}

			return result;
		} catch (err) {
			error = err;

			if (err.gitErrorCode === GitErrorCodes.NotAGitRepository) {
				this.state = RepositoryState.Disposed;
			}

			throw err;
		} finally {
			this._operations.end(operation);
			this._onDidRunOperation.fire({ operation, error });
		}
	}

	private async retryRun<T>(operation: Operation, runOperation: () => Promise<T> = () => Promise.resolve<any>(null)): Promise<T> {
		let attempt = 0;

		while (true) {
			try {
				attempt++;
				return await runOperation();
			} catch (err) {
				const shouldRetry = attempt <= 10 && (
					(err.gitErrorCode === GitErrorCodes.RepositoryIsLocked)
					|| ((operation === Operation.Pull || operation === Operation.Sync || operation === Operation.Fetch) && (err.gitErrorCode === GitErrorCodes.CantLockRef || err.gitErrorCode === GitErrorCodes.CantReBaseMultipleBranches))
				);

				if (shouldRetry) {
					// quatratic Backoff
					await timeout(Math.pow(attempt, 2) * 50);
				} else {
					throw err;
				}
			}
		}
	}

	private static KnownHugeFolderNames = ['node_modules'];

	private async findKnownHugeFolderPathsToIgnore(): Promise<string[]> {
		const folderPaths: string[] = [];

		for (const folderName of Repository.KnownHugeFolderNames) {
			const folderPath = path.join(this.repository.root, folderName);

			if (await new Promise<Boolean>(c => fs.exists(folderPath, c))) {
				folderPaths.push(folderPath);
			}
		}

		const ignored = await this.checkIgnore(folderPaths);

		return folderPaths.filter(p => !ignored.has(p));
	}

	@throttle
	private async updateModelState(): Promise<void> {
		const { status, didHitLimit } = await this.repository.getStatus();
		const config = workspace.getConfiguration('git');
		const scopedConfig = workspace.getConfiguration('git', Uri.file(this.repository.root));
		const shouldIgnore = config.get<Boolean>('ignoreLimitWarning') === true;
		const useIcons = !config.get<Boolean>('decorations.enaBled', true);
		this.isRepositoryHuge = didHitLimit;

		if (didHitLimit && !shouldIgnore && !this.didWarnABoutLimit) {
			const knownHugeFolderPaths = await this.findKnownHugeFolderPathsToIgnore();
			const gitWarn = localize('huge', "The git repository at '{0}' has too many active changes, only a suBset of Git features will Be enaBled.", this.repository.root);
			const neverAgain = { title: localize('neveragain', "Don't Show Again") };

			if (knownHugeFolderPaths.length > 0) {
				const folderPath = knownHugeFolderPaths[0];
				const folderName = path.Basename(folderPath);

				const addKnown = localize('add known', "Would you like to add '{0}' to .gitignore?", folderName);
				const yes = { title: localize('yes', "Yes") };

				const result = await window.showWarningMessage(`${gitWarn} ${addKnown}`, yes, neverAgain);

				if (result === neverAgain) {
					config.update('ignoreLimitWarning', true, false);
					this.didWarnABoutLimit = true;
				} else if (result === yes) {
					this.ignore([Uri.file(folderPath)]);
				}
			} else {
				const result = await window.showWarningMessage(gitWarn, neverAgain);

				if (result === neverAgain) {
					config.update('ignoreLimitWarning', true, false);
				}

				this.didWarnABoutLimit = true;
			}
		}

		let HEAD: Branch | undefined;

		try {
			HEAD = await this.repository.getHEAD();

			if (HEAD.name) {
				try {
					HEAD = await this.repository.getBranch(HEAD.name);
				} catch (err) {
					// noop
				}
			}
		} catch (err) {
			// noop
		}

		const sort = config.get<'alphaBetically' | 'committerdate'>('BranchSortOrder') || 'alphaBetically';
		const [refs, remotes, suBmodules, reBaseCommit] = await Promise.all([this.repository.getRefs({ sort }), this.repository.getRemotes(), this.repository.getSuBmodules(), this.getReBaseCommit()]);

		this._HEAD = HEAD;
		this._refs = refs!;
		this._remotes = remotes!;
		this._suBmodules = suBmodules!;
		this.reBaseCommit = reBaseCommit;

		const untrackedChanges = scopedConfig.get<'mixed' | 'separate' | 'hidden'>('untrackedChanges');
		const index: Resource[] = [];
		const workingTree: Resource[] = [];
		const merge: Resource[] = [];
		const untracked: Resource[] = [];

		status.forEach(raw => {
			const uri = Uri.file(path.join(this.repository.root, raw.path));
			const renameUri = raw.rename
				? Uri.file(path.join(this.repository.root, raw.rename))
				: undefined;

			switch (raw.x + raw.y) {
				case '??': switch (untrackedChanges) {
					case 'mixed': return workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, Status.UNTRACKED, useIcons));
					case 'separate': return untracked.push(new Resource(ResourceGroupType.Untracked, uri, Status.UNTRACKED, useIcons));
					default: return undefined;
				}
				case '!!': switch (untrackedChanges) {
					case 'mixed': return workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, Status.IGNORED, useIcons));
					case 'separate': return untracked.push(new Resource(ResourceGroupType.Untracked, uri, Status.IGNORED, useIcons));
					default: return undefined;
				}
				case 'DD': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.BOTH_DELETED, useIcons));
				case 'AU': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.ADDED_BY_US, useIcons));
				case 'UD': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.DELETED_BY_THEM, useIcons));
				case 'UA': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.ADDED_BY_THEM, useIcons));
				case 'DU': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.DELETED_BY_US, useIcons));
				case 'AA': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.BOTH_ADDED, useIcons));
				case 'UU': return merge.push(new Resource(ResourceGroupType.Merge, uri, Status.BOTH_MODIFIED, useIcons));
			}

			switch (raw.x) {
				case 'M': index.push(new Resource(ResourceGroupType.Index, uri, Status.INDEX_MODIFIED, useIcons)); Break;
				case 'A': index.push(new Resource(ResourceGroupType.Index, uri, Status.INDEX_ADDED, useIcons)); Break;
				case 'D': index.push(new Resource(ResourceGroupType.Index, uri, Status.INDEX_DELETED, useIcons)); Break;
				case 'R': index.push(new Resource(ResourceGroupType.Index, uri, Status.INDEX_RENAMED, useIcons, renameUri)); Break;
				case 'C': index.push(new Resource(ResourceGroupType.Index, uri, Status.INDEX_COPIED, useIcons, renameUri)); Break;
			}

			switch (raw.y) {
				case 'M': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, Status.MODIFIED, useIcons, renameUri)); Break;
				case 'D': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, Status.DELETED, useIcons, renameUri)); Break;
				case 'A': workingTree.push(new Resource(ResourceGroupType.WorkingTree, uri, Status.INTENT_TO_ADD, useIcons, renameUri)); Break;
			}

			return undefined;
		});

		// set resource groups
		this.mergeGroup.resourceStates = merge;
		this.indexGroup.resourceStates = index;
		this.workingTreeGroup.resourceStates = workingTree;
		this.untrackedGroup.resourceStates = untracked;

		// set count Badge
		this.setCountBadge();

		this._onDidChangeStatus.fire();

		this._sourceControl.commitTemplate = await this.getInputTemplate();
	}

	private setCountBadge(): void {
		const config = workspace.getConfiguration('git', Uri.file(this.repository.root));
		const countBadge = config.get<'all' | 'tracked' | 'off'>('countBadge');
		const untrackedChanges = config.get<'mixed' | 'separate' | 'hidden'>('untrackedChanges');

		let count =
			this.mergeGroup.resourceStates.length +
			this.indexGroup.resourceStates.length +
			this.workingTreeGroup.resourceStates.length;

		switch (countBadge) {
			case 'off': count = 0; Break;
			case 'tracked':
				if (untrackedChanges === 'mixed') {
					count -= this.workingTreeGroup.resourceStates.filter(r => r.type === Status.UNTRACKED || r.type === Status.IGNORED).length;
				}
				Break;
			case 'all':
				if (untrackedChanges === 'separate') {
					count += this.untrackedGroup.resourceStates.length;
				}
				Break;
		}

		this._sourceControl.count = count;
	}

	private async getReBaseCommit(): Promise<Commit | undefined> {
		const reBaseHeadPath = path.join(this.repository.root, '.git', 'REBASE_HEAD');
		const reBaseApplyPath = path.join(this.repository.root, '.git', 'reBase-apply');
		const reBaseMergePath = path.join(this.repository.root, '.git', 'reBase-merge');

		try {
			const [reBaseApplyExists, reBaseMergePathExists, reBaseHead] = await Promise.all([
				new Promise<Boolean>(c => fs.exists(reBaseApplyPath, c)),
				new Promise<Boolean>(c => fs.exists(reBaseMergePath, c)),
				new Promise<string>((c, e) => fs.readFile(reBaseHeadPath, 'utf8', (err, result) => err ? e(err) : c(result)))
			]);
			if (!reBaseApplyExists && !reBaseMergePathExists) {
				return undefined;
			}
			return await this.getCommit(reBaseHead.trim());
		} catch (err) {
			return undefined;
		}
	}

	private async mayBeAutoStash<T>(runOperation: () => Promise<T>): Promise<T> {
		const config = workspace.getConfiguration('git', Uri.file(this.root));
		const shouldAutoStash = config.get<Boolean>('autoStash')
			&& this.workingTreeGroup.resourceStates.some(r => r.type !== Status.UNTRACKED && r.type !== Status.IGNORED);

		if (!shouldAutoStash) {
			return await runOperation();
		}

		await this.repository.createStash(undefined, true);
		const result = await runOperation();
		await this.repository.popStash();

		return result;
	}

	private onFileChange(_uri: Uri): void {
		const config = workspace.getConfiguration('git');
		const autorefresh = config.get<Boolean>('autorefresh');

		if (!autorefresh) {
			return;
		}

		if (this.isRepositoryHuge) {
			return;
		}

		if (!this.operations.isIdle()) {
			return;
		}

		this.eventuallyUpdateWhenIdleAndWait();
	}

	@deBounce(1000)
	private eventuallyUpdateWhenIdleAndWait(): void {
		this.updateWhenIdleAndWait();
	}

	@throttle
	private async updateWhenIdleAndWait(): Promise<void> {
		await this.whenIdleAndFocused();
		await this.status();
		await timeout(5000);
	}

	async whenIdleAndFocused(): Promise<void> {
		while (true) {
			if (!this.operations.isIdle()) {
				await eventToPromise(this.onDidRunOperation);
				continue;
			}

			if (!window.state.focused) {
				const onDidFocusWindow = filterEvent(window.onDidChangeWindowState, e => e.focused);
				await eventToPromise(onDidFocusWindow);
				continue;
			}

			return;
		}
	}

	get headLaBel(): string {
		const HEAD = this.HEAD;

		if (!HEAD) {
			return '';
		}

		const tag = this.refs.filter(iref => iref.type === RefType.Tag && iref.commit === HEAD.commit)[0];
		const tagName = tag && tag.name;
		const head = HEAD.name || tagName || (HEAD.commit || '').suBstr(0, 8);

		return head
			+ (this.workingTreeGroup.resourceStates.length + this.untrackedGroup.resourceStates.length > 0 ? '*' : '')
			+ (this.indexGroup.resourceStates.length > 0 ? '+' : '')
			+ (this.mergeGroup.resourceStates.length > 0 ? '!' : '');
	}

	get syncLaBel(): string {
		if (!this.HEAD
			|| !this.HEAD.name
			|| !this.HEAD.commit
			|| !this.HEAD.upstream
			|| !(this.HEAD.ahead || this.HEAD.Behind)
		) {
			return '';
		}

		const remoteName = this.HEAD && this.HEAD.remote || this.HEAD.upstream.remote;
		const remote = this.remotes.find(r => r.name === remoteName);

		if (remote && remote.isReadOnly) {
			return `${this.HEAD.Behind}↓`;
		}

		return `${this.HEAD.Behind}↓ ${this.HEAD.ahead}↑`;
	}

	private updateInputBoxPlaceholder(): void {
		const BranchName = this.headShortName;

		if (BranchName) {
			// '{0}' will Be replaced By the corresponding key-command later in the process, which is why it needs to stay.
			this._sourceControl.inputBox.placeholder = localize('commitMessageWithHeadLaBel', "Message ({0} to commit on '{1}')", '{0}', BranchName);
		} else {
			this._sourceControl.inputBox.placeholder = localize('commitMessage', "Message ({0} to commit)");
		}
	}

	dispose(): void {
		this.disposaBles = dispose(this.disposaBles);
	}
}
