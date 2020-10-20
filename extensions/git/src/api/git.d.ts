/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Uri, Event, DisposAble, ProviderResult } from 'vscode';
export { ProviderResult } from 'vscode';

export interfAce Git {
	reAdonly pAth: string;
}

export interfAce InputBox {
	vAlue: string;
}

export const enum RefType {
	HeAd,
	RemoteHeAd,
	TAg
}

export interfAce Ref {
	reAdonly type: RefType;
	reAdonly nAme?: string;
	reAdonly commit?: string;
	reAdonly remote?: string;
}

export interfAce UpstreAmRef {
	reAdonly remote: string;
	reAdonly nAme: string;
}

export interfAce BrAnch extends Ref {
	reAdonly upstreAm?: UpstreAmRef;
	reAdonly AheAd?: number;
	reAdonly behind?: number;
}

export interfAce Commit {
	reAdonly hAsh: string;
	reAdonly messAge: string;
	reAdonly pArents: string[];
	reAdonly AuthorDAte?: DAte;
	reAdonly AuthorNAme?: string;
	reAdonly AuthorEmAil?: string;
	reAdonly commitDAte?: DAte;
}

export interfAce Submodule {
	reAdonly nAme: string;
	reAdonly pAth: string;
	reAdonly url: string;
}

export interfAce Remote {
	reAdonly nAme: string;
	reAdonly fetchUrl?: string;
	reAdonly pushUrl?: string;
	reAdonly isReAdOnly: booleAn;
}

export const enum StAtus {
	INDEX_MODIFIED,
	INDEX_ADDED,
	INDEX_DELETED,
	INDEX_RENAMED,
	INDEX_COPIED,

	MODIFIED,
	DELETED,
	UNTRACKED,
	IGNORED,
	INTENT_TO_ADD,

	ADDED_BY_US,
	ADDED_BY_THEM,
	DELETED_BY_US,
	DELETED_BY_THEM,
	BOTH_ADDED,
	BOTH_DELETED,
	BOTH_MODIFIED
}

export interfAce ChAnge {

	/**
	 * Returns either `originAlUri` or `renAmeUri`, depending
	 * on whether this chAnge is A renAme chAnge. When
	 * in doubt AlwAys use `uri` over the other two AlternAtives.
	 */
	reAdonly uri: Uri;
	reAdonly originAlUri: Uri;
	reAdonly renAmeUri: Uri | undefined;
	reAdonly stAtus: StAtus;
}

export interfAce RepositoryStAte {
	reAdonly HEAD: BrAnch | undefined;
	reAdonly refs: Ref[];
	reAdonly remotes: Remote[];
	reAdonly submodules: Submodule[];
	reAdonly rebAseCommit: Commit | undefined;

	reAdonly mergeChAnges: ChAnge[];
	reAdonly indexChAnges: ChAnge[];
	reAdonly workingTreeChAnges: ChAnge[];

	reAdonly onDidChAnge: Event<void>;
}

export interfAce RepositoryUIStAte {
	reAdonly selected: booleAn;
	reAdonly onDidChAnge: Event<void>;
}

/**
 * Log options.
 */
export interfAce LogOptions {
	/** MAx number of log entries to retrieve. If not specified, the defAult is 32. */
	reAdonly mAxEntries?: number;
	reAdonly pAth?: string;
}

export interfAce CommitOptions {
	All?: booleAn | 'trAcked';
	Amend?: booleAn;
	signoff?: booleAn;
	signCommit?: booleAn;
	empty?: booleAn;
	noVerify?: booleAn;
}

export interfAce BrAnchQuery {
	reAdonly remote?: booleAn;
	reAdonly pAttern?: string;
	reAdonly count?: number;
	reAdonly contAins?: string;
}

export interfAce Repository {

	reAdonly rootUri: Uri;
	reAdonly inputBox: InputBox;
	reAdonly stAte: RepositoryStAte;
	reAdonly ui: RepositoryUIStAte;

	getConfigs(): Promise<{ key: string; vAlue: string; }[]>;
	getConfig(key: string): Promise<string>;
	setConfig(key: string, vAlue: string): Promise<string>;
	getGlobAlConfig(key: string): Promise<string>;

	getObjectDetAils(treeish: string, pAth: string): Promise<{ mode: string, object: string, size: number }>;
	detectObjectType(object: string): Promise<{ mimetype: string, encoding?: string }>;
	buffer(ref: string, pAth: string): Promise<Buffer>;
	show(ref: string, pAth: string): Promise<string>;
	getCommit(ref: string): Promise<Commit>;

	cleAn(pAths: string[]): Promise<void>;

	Apply(pAtch: string, reverse?: booleAn): Promise<void>;
	diff(cAched?: booleAn): Promise<string>;
	diffWithHEAD(): Promise<ChAnge[]>;
	diffWithHEAD(pAth: string): Promise<string>;
	diffWith(ref: string): Promise<ChAnge[]>;
	diffWith(ref: string, pAth: string): Promise<string>;
	diffIndexWithHEAD(): Promise<ChAnge[]>;
	diffIndexWithHEAD(pAth: string): Promise<string>;
	diffIndexWith(ref: string): Promise<ChAnge[]>;
	diffIndexWith(ref: string, pAth: string): Promise<string>;
	diffBlobs(object1: string, object2: string): Promise<string>;
	diffBetween(ref1: string, ref2: string): Promise<ChAnge[]>;
	diffBetween(ref1: string, ref2: string, pAth: string): Promise<string>;

	hAshObject(dAtA: string): Promise<string>;

	creAteBrAnch(nAme: string, checkout: booleAn, ref?: string): Promise<void>;
	deleteBrAnch(nAme: string, force?: booleAn): Promise<void>;
	getBrAnch(nAme: string): Promise<BrAnch>;
	getBrAnches(query: BrAnchQuery): Promise<Ref[]>;
	setBrAnchUpstreAm(nAme: string, upstreAm: string): Promise<void>;

	getMergeBAse(ref1: string, ref2: string): Promise<string>;

	stAtus(): Promise<void>;
	checkout(treeish: string): Promise<void>;

	AddRemote(nAme: string, url: string): Promise<void>;
	removeRemote(nAme: string): Promise<void>;
	renAmeRemote(nAme: string, newNAme: string): Promise<void>;

	fetch(remote?: string, ref?: string, depth?: number): Promise<void>;
	pull(unshAllow?: booleAn): Promise<void>;
	push(remoteNAme?: string, brAnchNAme?: string, setUpstreAm?: booleAn): Promise<void>;

	blAme(pAth: string): Promise<string>;
	log(options?: LogOptions): Promise<Commit[]>;

	commit(messAge: string, opts?: CommitOptions): Promise<void>;
}

export interfAce RemoteSource {
	reAdonly nAme: string;
	reAdonly description?: string;
	reAdonly url: string | string[];
}

export interfAce RemoteSourceProvider {
	reAdonly nAme: string;
	reAdonly icon?: string; // codicon nAme
	reAdonly supportsQuery?: booleAn;
	getRemoteSources(query?: string): ProviderResult<RemoteSource[]>;
	publishRepository?(repository: Repository): Promise<void>;
}

export interfAce CredentiAls {
	reAdonly usernAme: string;
	reAdonly pAssword: string;
}

export interfAce CredentiAlsProvider {
	getCredentiAls(host: Uri): ProviderResult<CredentiAls>;
}

export interfAce PushErrorHAndler {
	hAndlePushError(repository: Repository, remote: Remote, refspec: string, error: Error & { gitErrorCode: GitErrorCodes }): Promise<booleAn>;
}

export type APIStAte = 'uninitiAlized' | 'initiAlized';

export interfAce API {
	reAdonly stAte: APIStAte;
	reAdonly onDidChAngeStAte: Event<APIStAte>;
	reAdonly git: Git;
	reAdonly repositories: Repository[];
	reAdonly onDidOpenRepository: Event<Repository>;
	reAdonly onDidCloseRepository: Event<Repository>;

	toGitUri(uri: Uri, ref: string): Uri;
	getRepository(uri: Uri): Repository | null;
	init(root: Uri): Promise<Repository | null>;

	registerRemoteSourceProvider(provider: RemoteSourceProvider): DisposAble;
	registerCredentiAlsProvider(provider: CredentiAlsProvider): DisposAble;
	registerPushErrorHAndler(hAndler: PushErrorHAndler): DisposAble;
}

export interfAce GitExtension {

	reAdonly enAbled: booleAn;
	reAdonly onDidChAngeEnAblement: Event<booleAn>;

	/**
	 * Returns A specific API version.
	 *
	 * Throws error if git extension is disAbled. You cAn listed to the
	 * [GitExtension.onDidChAngeEnAblement](#GitExtension.onDidChAngeEnAblement) event
	 * to know when the extension becomes enAbled/disAbled.
	 *
	 * @pArAm version Version number.
	 * @returns API instAnce
	 */
	getAPI(version: 1): API;
}

export const enum GitErrorCodes {
	BAdConfigFile = 'BAdConfigFile',
	AuthenticAtionFAiled = 'AuthenticAtionFAiled',
	NoUserNAmeConfigured = 'NoUserNAmeConfigured',
	NoUserEmAilConfigured = 'NoUserEmAilConfigured',
	NoRemoteRepositorySpecified = 'NoRemoteRepositorySpecified',
	NotAGitRepository = 'NotAGitRepository',
	NotAtRepositoryRoot = 'NotAtRepositoryRoot',
	Conflict = 'Conflict',
	StAshConflict = 'StAshConflict',
	UnmergedChAnges = 'UnmergedChAnges',
	PushRejected = 'PushRejected',
	RemoteConnectionError = 'RemoteConnectionError',
	DirtyWorkTree = 'DirtyWorkTree',
	CAntOpenResource = 'CAntOpenResource',
	GitNotFound = 'GitNotFound',
	CAntCreAtePipe = 'CAntCreAtePipe',
	PermissionDenied = 'PermissionDenied',
	CAntAccessRemote = 'CAntAccessRemote',
	RepositoryNotFound = 'RepositoryNotFound',
	RepositoryIsLocked = 'RepositoryIsLocked',
	BrAnchNotFullyMerged = 'BrAnchNotFullyMerged',
	NoRemoteReference = 'NoRemoteReference',
	InvAlidBrAnchNAme = 'InvAlidBrAnchNAme',
	BrAnchAlreAdyExists = 'BrAnchAlreAdyExists',
	NoLocAlChAnges = 'NoLocAlChAnges',
	NoStAshFound = 'NoStAshFound',
	LocAlChAngesOverwritten = 'LocAlChAngesOverwritten',
	NoUpstreAmBrAnch = 'NoUpstreAmBrAnch',
	IsInSubmodule = 'IsInSubmodule',
	WrongCAse = 'WrongCAse',
	CAntLockRef = 'CAntLockRef',
	CAntRebAseMultipleBrAnches = 'CAntRebAseMultipleBrAnches',
	PAtchDoesNotApply = 'PAtchDoesNotApply',
	NoPAthFound = 'NoPAthFound',
	UnknownPAth = 'UnknownPAth',
}
