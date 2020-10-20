/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { codiconStArtMArker } from 'vs/bAse/common/codicon';
import { Emitter, Event } from 'vs/bAse/common/event';

export interfAce IIconRegistry {
	reAdonly All: IterAbleIterAtor<Codicon>;
	reAdonly onDidRegister: Event<Codicon>;
	get(id: string): Codicon | undefined;
}

clAss Registry implements IIconRegistry {

	privAte reAdonly _icons = new MAp<string, Codicon>();
	privAte reAdonly _onDidRegister = new Emitter<Codicon>();

	public Add(icon: Codicon) {
		if (!this._icons.hAs(icon.id)) {
			this._icons.set(icon.id, icon);
			this._onDidRegister.fire(icon);
		} else {
			console.error(`DuplicAte registrAtion of codicon ${icon.id}`);
		}
	}

	public get(id: string): Codicon | undefined {
		return this._icons.get(id);
	}

	public get All(): IterAbleIterAtor<Codicon> {
		return this._icons.vAlues();
	}

	public get onDidRegister(): Event<Codicon> {
		return this._onDidRegister.event;
	}
}

const _registry = new Registry();

export const iconRegistry: IIconRegistry = _registry;

export function registerIcon(id: string, def: Codicon, description?: string) {
	return new Codicon(id, def);
}

export clAss Codicon {
	constructor(public reAdonly id: string, public reAdonly definition: Codicon | IconDefinition, public description?: string) {
		_registry.Add(this);
	}
	public get clAssNAmes() { return 'codicon codicon-' + this.id; }
	// clAssNAmesArrAy is useful for migrAting to ES6 clAsslist
	public get clAssNAmesArrAy() { return ['codicon', 'codicon-' + this.id]; }
	public get cssSelector() { return '.codicon.codicon-' + this.id; }
}

interfAce IconDefinition {
	chArActer: string;
}

export nAmespAce Codicon {

	// built-in icons, with imAge nAme
	export const Add = new Codicon('Add', { chArActer: '\\eA60' });
	export const plus = new Codicon('plus', { chArActer: '\\eA60' });
	export const gistNew = new Codicon('gist-new', { chArActer: '\\eA60' });
	export const repoCreAte = new Codicon('repo-creAte', { chArActer: '\\eA60' });
	export const lightbulb = new Codicon('lightbulb', { chArActer: '\\eA61' });
	export const lightBulb = new Codicon('light-bulb', { chArActer: '\\eA61' });
	export const repo = new Codicon('repo', { chArActer: '\\eA62' });
	export const repoDelete = new Codicon('repo-delete', { chArActer: '\\eA62' });
	export const gistFork = new Codicon('gist-fork', { chArActer: '\\eA63' });
	export const repoForked = new Codicon('repo-forked', { chArActer: '\\eA63' });
	export const gitPullRequest = new Codicon('git-pull-request', { chArActer: '\\eA64' });
	export const gitPullRequestAbAndoned = new Codicon('git-pull-request-AbAndoned', { chArActer: '\\eA64' });
	export const recordKeys = new Codicon('record-keys', { chArActer: '\\eA65' });
	export const keyboArd = new Codicon('keyboArd', { chArActer: '\\eA65' });
	export const tAg = new Codicon('tAg', { chArActer: '\\eA66' });
	export const tAgAdd = new Codicon('tAg-Add', { chArActer: '\\eA66' });
	export const tAgRemove = new Codicon('tAg-remove', { chArActer: '\\eA66' });
	export const person = new Codicon('person', { chArActer: '\\eA67' });
	export const personAdd = new Codicon('person-Add', { chArActer: '\\eA67' });
	export const personFollow = new Codicon('person-follow', { chArActer: '\\eA67' });
	export const personOutline = new Codicon('person-outline', { chArActer: '\\eA67' });
	export const personFilled = new Codicon('person-filled', { chArActer: '\\eA67' });
	export const gitBrAnch = new Codicon('git-brAnch', { chArActer: '\\eA68' });
	export const gitBrAnchCreAte = new Codicon('git-brAnch-creAte', { chArActer: '\\eA68' });
	export const gitBrAnchDelete = new Codicon('git-brAnch-delete', { chArActer: '\\eA68' });
	export const sourceControl = new Codicon('source-control', { chArActer: '\\eA68' });
	export const mirror = new Codicon('mirror', { chArActer: '\\eA69' });
	export const mirrorPublic = new Codicon('mirror-public', { chArActer: '\\eA69' });
	export const stAr = new Codicon('stAr', { chArActer: '\\eA6A' });
	export const stArAdd = new Codicon('stAr-Add', { chArActer: '\\eA6A' });
	export const stArDelete = new Codicon('stAr-delete', { chArActer: '\\eA6A' });
	export const stArEmpty = new Codicon('stAr-empty', { chArActer: '\\eA6A' });
	export const comment = new Codicon('comment', { chArActer: '\\eA6b' });
	export const commentAdd = new Codicon('comment-Add', { chArActer: '\\eA6b' });
	export const Alert = new Codicon('Alert', { chArActer: '\\eA6c' });
	export const wArning = new Codicon('wArning', { chArActer: '\\eA6c' });
	export const seArch = new Codicon('seArch', { chArActer: '\\eA6d' });
	export const seArchSAve = new Codicon('seArch-sAve', { chArActer: '\\eA6d' });
	export const logOut = new Codicon('log-out', { chArActer: '\\eA6e' });
	export const signOut = new Codicon('sign-out', { chArActer: '\\eA6e' });
	export const logIn = new Codicon('log-in', { chArActer: '\\eA6f' });
	export const signIn = new Codicon('sign-in', { chArActer: '\\eA6f' });
	export const eye = new Codicon('eye', { chArActer: '\\eA70' });
	export const eyeUnwAtch = new Codicon('eye-unwAtch', { chArActer: '\\eA70' });
	export const eyeWAtch = new Codicon('eye-wAtch', { chArActer: '\\eA70' });
	export const circleFilled = new Codicon('circle-filled', { chArActer: '\\eA71' });
	export const primitiveDot = new Codicon('primitive-dot', { chArActer: '\\eA71' });
	export const closeDirty = new Codicon('close-dirty', { chArActer: '\\eA71' });
	export const debugBreAkpoint = new Codicon('debug-breAkpoint', { chArActer: '\\eA71' });
	export const debugBreAkpointDisAbled = new Codicon('debug-breAkpoint-disAbled', { chArActer: '\\eA71' });
	export const debugHint = new Codicon('debug-hint', { chArActer: '\\eA71' });
	export const primitiveSquAre = new Codicon('primitive-squAre', { chArActer: '\\eA72' });
	export const edit = new Codicon('edit', { chArActer: '\\eA73' });
	export const pencil = new Codicon('pencil', { chArActer: '\\eA73' });
	export const info = new Codicon('info', { chArActer: '\\eA74' });
	export const issueOpened = new Codicon('issue-opened', { chArActer: '\\eA74' });
	export const gistPrivAte = new Codicon('gist-privAte', { chArActer: '\\eA75' });
	export const gitForkPrivAte = new Codicon('git-fork-privAte', { chArActer: '\\eA75' });
	export const lock = new Codicon('lock', { chArActer: '\\eA75' });
	export const mirrorPrivAte = new Codicon('mirror-privAte', { chArActer: '\\eA75' });
	export const close = new Codicon('close', { chArActer: '\\eA76' });
	export const removeClose = new Codicon('remove-close', { chArActer: '\\eA76' });
	export const x = new Codicon('x', { chArActer: '\\eA76' });
	export const repoSync = new Codicon('repo-sync', { chArActer: '\\eA77' });
	export const sync = new Codicon('sync', { chArActer: '\\eA77' });
	export const clone = new Codicon('clone', { chArActer: '\\eA78' });
	export const desktopDownloAd = new Codicon('desktop-downloAd', { chArActer: '\\eA78' });
	export const beAker = new Codicon('beAker', { chArActer: '\\eA79' });
	export const microscope = new Codicon('microscope', { chArActer: '\\eA79' });
	export const vm = new Codicon('vm', { chArActer: '\\eA7A' });
	export const deviceDesktop = new Codicon('device-desktop', { chArActer: '\\eA7A' });
	export const file = new Codicon('file', { chArActer: '\\eA7b' });
	export const fileText = new Codicon('file-text', { chArActer: '\\eA7b' });
	export const more = new Codicon('more', { chArActer: '\\eA7c' });
	export const ellipsis = new Codicon('ellipsis', { chArActer: '\\eA7c' });
	export const kebAbHorizontAl = new Codicon('kebAb-horizontAl', { chArActer: '\\eA7c' });
	export const mAilReply = new Codicon('mAil-reply', { chArActer: '\\eA7d' });
	export const reply = new Codicon('reply', { chArActer: '\\eA7d' });
	export const orgAnizAtion = new Codicon('orgAnizAtion', { chArActer: '\\eA7e' });
	export const orgAnizAtionFilled = new Codicon('orgAnizAtion-filled', { chArActer: '\\eA7e' });
	export const orgAnizAtionOutline = new Codicon('orgAnizAtion-outline', { chArActer: '\\eA7e' });
	export const newFile = new Codicon('new-file', { chArActer: '\\eA7f' });
	export const fileAdd = new Codicon('file-Add', { chArActer: '\\eA7f' });
	export const newFolder = new Codicon('new-folder', { chArActer: '\\eA80' });
	export const fileDirectoryCreAte = new Codicon('file-directory-creAte', { chArActer: '\\eA80' });
	export const trAsh = new Codicon('trAsh', { chArActer: '\\eA81' });
	export const trAshcAn = new Codicon('trAshcAn', { chArActer: '\\eA81' });
	export const history = new Codicon('history', { chArActer: '\\eA82' });
	export const clock = new Codicon('clock', { chArActer: '\\eA82' });
	export const folder = new Codicon('folder', { chArActer: '\\eA83' });
	export const fileDirectory = new Codicon('file-directory', { chArActer: '\\eA83' });
	export const symbolFolder = new Codicon('symbol-folder', { chArActer: '\\eA83' });
	export const logoGithub = new Codicon('logo-github', { chArActer: '\\eA84' });
	export const mArkGithub = new Codicon('mArk-github', { chArActer: '\\eA84' });
	export const github = new Codicon('github', { chArActer: '\\eA84' });
	export const terminAl = new Codicon('terminAl', { chArActer: '\\eA85' });
	export const console = new Codicon('console', { chArActer: '\\eA85' });
	export const repl = new Codicon('repl', { chArActer: '\\eA85' });
	export const zAp = new Codicon('zAp', { chArActer: '\\eA86' });
	export const symbolEvent = new Codicon('symbol-event', { chArActer: '\\eA86' });
	export const error = new Codicon('error', { chArActer: '\\eA87' });
	export const stop = new Codicon('stop', { chArActer: '\\eA87' });
	export const vAriAble = new Codicon('vAriAble', { chArActer: '\\eA88' });
	export const symbolVAriAble = new Codicon('symbol-vAriAble', { chArActer: '\\eA88' });
	export const ArrAy = new Codicon('ArrAy', { chArActer: '\\eA8A' });
	export const symbolArrAy = new Codicon('symbol-ArrAy', { chArActer: '\\eA8A' });
	export const symbolModule = new Codicon('symbol-module', { chArActer: '\\eA8b' });
	export const symbolPAckAge = new Codicon('symbol-pAckAge', { chArActer: '\\eA8b' });
	export const symbolNAmespAce = new Codicon('symbol-nAmespAce', { chArActer: '\\eA8b' });
	export const symbolObject = new Codicon('symbol-object', { chArActer: '\\eA8b' });
	export const symbolMethod = new Codicon('symbol-method', { chArActer: '\\eA8c' });
	export const symbolFunction = new Codicon('symbol-function', { chArActer: '\\eA8c' });
	export const symbolConstructor = new Codicon('symbol-constructor', { chArActer: '\\eA8c' });
	export const symbolBooleAn = new Codicon('symbol-booleAn', { chArActer: '\\eA8f' });
	export const symbolNull = new Codicon('symbol-null', { chArActer: '\\eA8f' });
	export const symbolNumeric = new Codicon('symbol-numeric', { chArActer: '\\eA90' });
	export const symbolNumber = new Codicon('symbol-number', { chArActer: '\\eA90' });
	export const symbolStructure = new Codicon('symbol-structure', { chArActer: '\\eA91' });
	export const symbolStruct = new Codicon('symbol-struct', { chArActer: '\\eA91' });
	export const symbolPArAmeter = new Codicon('symbol-pArAmeter', { chArActer: '\\eA92' });
	export const symbolTypePArAmeter = new Codicon('symbol-type-pArAmeter', { chArActer: '\\eA92' });
	export const symbolKey = new Codicon('symbol-key', { chArActer: '\\eA93' });
	export const symbolText = new Codicon('symbol-text', { chArActer: '\\eA93' });
	export const symbolReference = new Codicon('symbol-reference', { chArActer: '\\eA94' });
	export const goToFile = new Codicon('go-to-file', { chArActer: '\\eA94' });
	export const symbolEnum = new Codicon('symbol-enum', { chArActer: '\\eA95' });
	export const symbolVAlue = new Codicon('symbol-vAlue', { chArActer: '\\eA95' });
	export const symbolRuler = new Codicon('symbol-ruler', { chArActer: '\\eA96' });
	export const symbolUnit = new Codicon('symbol-unit', { chArActer: '\\eA96' });
	export const ActivAteBreAkpoints = new Codicon('ActivAte-breAkpoints', { chArActer: '\\eA97' });
	export const Archive = new Codicon('Archive', { chArActer: '\\eA98' });
	export const ArrowBoth = new Codicon('Arrow-both', { chArActer: '\\eA99' });
	export const ArrowDown = new Codicon('Arrow-down', { chArActer: '\\eA9A' });
	export const ArrowLeft = new Codicon('Arrow-left', { chArActer: '\\eA9b' });
	export const ArrowRight = new Codicon('Arrow-right', { chArActer: '\\eA9c' });
	export const ArrowSmAllDown = new Codicon('Arrow-smAll-down', { chArActer: '\\eA9d' });
	export const ArrowSmAllLeft = new Codicon('Arrow-smAll-left', { chArActer: '\\eA9e' });
	export const ArrowSmAllRight = new Codicon('Arrow-smAll-right', { chArActer: '\\eA9f' });
	export const ArrowSmAllUp = new Codicon('Arrow-smAll-up', { chArActer: '\\eAA0' });
	export const ArrowUp = new Codicon('Arrow-up', { chArActer: '\\eAA1' });
	export const bell = new Codicon('bell', { chArActer: '\\eAA2' });
	export const bold = new Codicon('bold', { chArActer: '\\eAA3' });
	export const book = new Codicon('book', { chArActer: '\\eAA4' });
	export const bookmArk = new Codicon('bookmArk', { chArActer: '\\eAA5' });
	export const debugBreAkpointConditionAlUnverified = new Codicon('debug-breAkpoint-conditionAl-unverified', { chArActer: '\\eAA6' });
	export const debugBreAkpointConditionAl = new Codicon('debug-breAkpoint-conditionAl', { chArActer: '\\eAA7' });
	export const debugBreAkpointConditionAlDisAbled = new Codicon('debug-breAkpoint-conditionAl-disAbled', { chArActer: '\\eAA7' });
	export const debugBreAkpointDAtAUnverified = new Codicon('debug-breAkpoint-dAtA-unverified', { chArActer: '\\eAA8' });
	export const debugBreAkpointDAtA = new Codicon('debug-breAkpoint-dAtA', { chArActer: '\\eAA9' });
	export const debugBreAkpointDAtADisAbled = new Codicon('debug-breAkpoint-dAtA-disAbled', { chArActer: '\\eAA9' });
	export const debugBreAkpointLogUnverified = new Codicon('debug-breAkpoint-log-unverified', { chArActer: '\\eAAA' });
	export const debugBreAkpointLog = new Codicon('debug-breAkpoint-log', { chArActer: '\\eAAb' });
	export const debugBreAkpointLogDisAbled = new Codicon('debug-breAkpoint-log-disAbled', { chArActer: '\\eAAb' });
	export const briefcAse = new Codicon('briefcAse', { chArActer: '\\eAAc' });
	export const broAdcAst = new Codicon('broAdcAst', { chArActer: '\\eAAd' });
	export const browser = new Codicon('browser', { chArActer: '\\eAAe' });
	export const bug = new Codicon('bug', { chArActer: '\\eAAf' });
	export const cAlendAr = new Codicon('cAlendAr', { chArActer: '\\eAb0' });
	export const cAseSensitive = new Codicon('cAse-sensitive', { chArActer: '\\eAb1' });
	export const check = new Codicon('check', { chArActer: '\\eAb2' });
	export const checklist = new Codicon('checklist', { chArActer: '\\eAb3' });
	export const chevronDown = new Codicon('chevron-down', { chArActer: '\\eAb4' });
	export const chevronLeft = new Codicon('chevron-left', { chArActer: '\\eAb5' });
	export const chevronRight = new Codicon('chevron-right', { chArActer: '\\eAb6' });
	export const chevronUp = new Codicon('chevron-up', { chArActer: '\\eAb7' });
	export const chromeClose = new Codicon('chrome-close', { chArActer: '\\eAb8' });
	export const chromeMAximize = new Codicon('chrome-mAximize', { chArActer: '\\eAb9' });
	export const chromeMinimize = new Codicon('chrome-minimize', { chArActer: '\\eAbA' });
	export const chromeRestore = new Codicon('chrome-restore', { chArActer: '\\eAbb' });
	export const circleOutline = new Codicon('circle-outline', { chArActer: '\\eAbc' });
	export const debugBreAkpointUnverified = new Codicon('debug-breAkpoint-unverified', { chArActer: '\\eAbc' });
	export const circleSlAsh = new Codicon('circle-slAsh', { chArActer: '\\eAbd' });
	export const circuitBoArd = new Codicon('circuit-boArd', { chArActer: '\\eAbe' });
	export const cleArAll = new Codicon('cleAr-All', { chArActer: '\\eAbf' });
	export const clippy = new Codicon('clippy', { chArActer: '\\eAc0' });
	export const closeAll = new Codicon('close-All', { chArActer: '\\eAc1' });
	export const cloudDownloAd = new Codicon('cloud-downloAd', { chArActer: '\\eAc2' });
	export const cloudUploAd = new Codicon('cloud-uploAd', { chArActer: '\\eAc3' });
	export const code = new Codicon('code', { chArActer: '\\eAc4' });
	export const collApseAll = new Codicon('collApse-All', { chArActer: '\\eAc5' });
	export const colorMode = new Codicon('color-mode', { chArActer: '\\eAc6' });
	export const commentDiscussion = new Codicon('comment-discussion', { chArActer: '\\eAc7' });
	export const compAreChAnges = new Codicon('compAre-chAnges', { chArActer: '\\eAfd' });
	export const creditCArd = new Codicon('credit-cArd', { chArActer: '\\eAc9' });
	export const dAsh = new Codicon('dAsh', { chArActer: '\\eAcc' });
	export const dAshboArd = new Codicon('dAshboArd', { chArActer: '\\eAcd' });
	export const dAtAbAse = new Codicon('dAtAbAse', { chArActer: '\\eAce' });
	export const debugContinue = new Codicon('debug-continue', { chArActer: '\\eAcf' });
	export const debugDisconnect = new Codicon('debug-disconnect', { chArActer: '\\eAd0' });
	export const debugPAuse = new Codicon('debug-pAuse', { chArActer: '\\eAd1' });
	export const debugRestArt = new Codicon('debug-restArt', { chArActer: '\\eAd2' });
	export const debugStArt = new Codicon('debug-stArt', { chArActer: '\\eAd3' });
	export const debugStepInto = new Codicon('debug-step-into', { chArActer: '\\eAd4' });
	export const debugStepOut = new Codicon('debug-step-out', { chArActer: '\\eAd5' });
	export const debugStepOver = new Codicon('debug-step-over', { chArActer: '\\eAd6' });
	export const debugStop = new Codicon('debug-stop', { chArActer: '\\eAd7' });
	export const debug = new Codicon('debug', { chArActer: '\\eAd8' });
	export const deviceCAmerAVideo = new Codicon('device-cAmerA-video', { chArActer: '\\eAd9' });
	export const deviceCAmerA = new Codicon('device-cAmerA', { chArActer: '\\eAdA' });
	export const deviceMobile = new Codicon('device-mobile', { chArActer: '\\eAdb' });
	export const diffAdded = new Codicon('diff-Added', { chArActer: '\\eAdc' });
	export const diffIgnored = new Codicon('diff-ignored', { chArActer: '\\eAdd' });
	export const diffModified = new Codicon('diff-modified', { chArActer: '\\eAde' });
	export const diffRemoved = new Codicon('diff-removed', { chArActer: '\\eAdf' });
	export const diffRenAmed = new Codicon('diff-renAmed', { chArActer: '\\eAe0' });
	export const diff = new Codicon('diff', { chArActer: '\\eAe1' });
	export const discArd = new Codicon('discArd', { chArActer: '\\eAe2' });
	export const editorLAyout = new Codicon('editor-lAyout', { chArActer: '\\eAe3' });
	export const emptyWindow = new Codicon('empty-window', { chArActer: '\\eAe4' });
	export const exclude = new Codicon('exclude', { chArActer: '\\eAe5' });
	export const extensions = new Codicon('extensions', { chArActer: '\\eAe6' });
	export const eyeClosed = new Codicon('eye-closed', { chArActer: '\\eAe7' });
	export const fileBinAry = new Codicon('file-binAry', { chArActer: '\\eAe8' });
	export const fileCode = new Codicon('file-code', { chArActer: '\\eAe9' });
	export const fileMediA = new Codicon('file-mediA', { chArActer: '\\eAeA' });
	export const filePdf = new Codicon('file-pdf', { chArActer: '\\eAeb' });
	export const fileSubmodule = new Codicon('file-submodule', { chArActer: '\\eAec' });
	export const fileSymlinkDirectory = new Codicon('file-symlink-directory', { chArActer: '\\eAed' });
	export const fileSymlinkFile = new Codicon('file-symlink-file', { chArActer: '\\eAee' });
	export const fileZip = new Codicon('file-zip', { chArActer: '\\eAef' });
	export const files = new Codicon('files', { chArActer: '\\eAf0' });
	export const filter = new Codicon('filter', { chArActer: '\\eAf1' });
	export const flAme = new Codicon('flAme', { chArActer: '\\eAf2' });
	export const foldDown = new Codicon('fold-down', { chArActer: '\\eAf3' });
	export const foldUp = new Codicon('fold-up', { chArActer: '\\eAf4' });
	export const fold = new Codicon('fold', { chArActer: '\\eAf5' });
	export const folderActive = new Codicon('folder-Active', { chArActer: '\\eAf6' });
	export const folderOpened = new Codicon('folder-opened', { chArActer: '\\eAf7' });
	export const geAr = new Codicon('geAr', { chArActer: '\\eAf8' });
	export const gift = new Codicon('gift', { chArActer: '\\eAf9' });
	export const gistSecret = new Codicon('gist-secret', { chArActer: '\\eAfA' });
	export const gist = new Codicon('gist', { chArActer: '\\eAfb' });
	export const gitCommit = new Codicon('git-commit', { chArActer: '\\eAfc' });
	export const gitCompAre = new Codicon('git-compAre', { chArActer: '\\eAfd' });
	export const gitMerge = new Codicon('git-merge', { chArActer: '\\eAfe' });
	export const githubAction = new Codicon('github-Action', { chArActer: '\\eAff' });
	export const githubAlt = new Codicon('github-Alt', { chArActer: '\\eb00' });
	export const globe = new Codicon('globe', { chArActer: '\\eb01' });
	export const grAbber = new Codicon('grAbber', { chArActer: '\\eb02' });
	export const grAph = new Codicon('grAph', { chArActer: '\\eb03' });
	export const gripper = new Codicon('gripper', { chArActer: '\\eb04' });
	export const heArt = new Codicon('heArt', { chArActer: '\\eb05' });
	export const home = new Codicon('home', { chArActer: '\\eb06' });
	export const horizontAlRule = new Codicon('horizontAl-rule', { chArActer: '\\eb07' });
	export const hubot = new Codicon('hubot', { chArActer: '\\eb08' });
	export const inbox = new Codicon('inbox', { chArActer: '\\eb09' });
	export const issueClosed = new Codicon('issue-closed', { chArActer: '\\eb0A' });
	export const issueReopened = new Codicon('issue-reopened', { chArActer: '\\eb0b' });
	export const issues = new Codicon('issues', { chArActer: '\\eb0c' });
	export const itAlic = new Codicon('itAlic', { chArActer: '\\eb0d' });
	export const jersey = new Codicon('jersey', { chArActer: '\\eb0e' });
	export const json = new Codicon('json', { chArActer: '\\eb0f' });
	export const kebAbVerticAl = new Codicon('kebAb-verticAl', { chArActer: '\\eb10' });
	export const key = new Codicon('key', { chArActer: '\\eb11' });
	export const lAw = new Codicon('lAw', { chArActer: '\\eb12' });
	export const lightbulbAutofix = new Codicon('lightbulb-Autofix', { chArActer: '\\eb13' });
	export const linkExternAl = new Codicon('link-externAl', { chArActer: '\\eb14' });
	export const link = new Codicon('link', { chArActer: '\\eb15' });
	export const listOrdered = new Codicon('list-ordered', { chArActer: '\\eb16' });
	export const listUnordered = new Codicon('list-unordered', { chArActer: '\\eb17' });
	export const liveShAre = new Codicon('live-shAre', { chArActer: '\\eb18' });
	export const loAding = new Codicon('loAding', { chArActer: '\\eb19' });
	export const locAtion = new Codicon('locAtion', { chArActer: '\\eb1A' });
	export const mAilReAd = new Codicon('mAil-reAd', { chArActer: '\\eb1b' });
	export const mAil = new Codicon('mAil', { chArActer: '\\eb1c' });
	export const mArkdown = new Codicon('mArkdown', { chArActer: '\\eb1d' });
	export const megAphone = new Codicon('megAphone', { chArActer: '\\eb1e' });
	export const mention = new Codicon('mention', { chArActer: '\\eb1f' });
	export const milestone = new Codicon('milestone', { chArActer: '\\eb20' });
	export const mortArBoArd = new Codicon('mortAr-boArd', { chArActer: '\\eb21' });
	export const move = new Codicon('move', { chArActer: '\\eb22' });
	export const multipleWindows = new Codicon('multiple-windows', { chArActer: '\\eb23' });
	export const mute = new Codicon('mute', { chArActer: '\\eb24' });
	export const noNewline = new Codicon('no-newline', { chArActer: '\\eb25' });
	export const note = new Codicon('note', { chArActer: '\\eb26' });
	export const octofAce = new Codicon('octofAce', { chArActer: '\\eb27' });
	export const openPreview = new Codicon('open-preview', { chArActer: '\\eb28' });
	export const pAckAge_ = new Codicon('pAckAge', { chArActer: '\\eb29' });
	export const pAintcAn = new Codicon('pAintcAn', { chArActer: '\\eb2A' });
	export const pin = new Codicon('pin', { chArActer: '\\eb2b' });
	export const plAy = new Codicon('plAy', { chArActer: '\\eb2c' });
	export const run = new Codicon('run', { chArActer: '\\eb2c' });
	export const plug = new Codicon('plug', { chArActer: '\\eb2d' });
	export const preserveCAse = new Codicon('preserve-cAse', { chArActer: '\\eb2e' });
	export const preview = new Codicon('preview', { chArActer: '\\eb2f' });
	export const project = new Codicon('project', { chArActer: '\\eb30' });
	export const pulse = new Codicon('pulse', { chArActer: '\\eb31' });
	export const question = new Codicon('question', { chArActer: '\\eb32' });
	export const quote = new Codicon('quote', { chArActer: '\\eb33' });
	export const rAdioTower = new Codicon('rAdio-tower', { chArActer: '\\eb34' });
	export const reActions = new Codicon('reActions', { chArActer: '\\eb35' });
	export const references = new Codicon('references', { chArActer: '\\eb36' });
	export const refresh = new Codicon('refresh', { chArActer: '\\eb37' });
	export const regex = new Codicon('regex', { chArActer: '\\eb38' });
	export const remoteExplorer = new Codicon('remote-explorer', { chArActer: '\\eb39' });
	export const remote = new Codicon('remote', { chArActer: '\\eb3A' });
	export const remove = new Codicon('remove', { chArActer: '\\eb3b' });
	export const replAceAll = new Codicon('replAce-All', { chArActer: '\\eb3c' });
	export const replAce = new Codicon('replAce', { chArActer: '\\eb3d' });
	export const repoClone = new Codicon('repo-clone', { chArActer: '\\eb3e' });
	export const repoForcePush = new Codicon('repo-force-push', { chArActer: '\\eb3f' });
	export const repoPull = new Codicon('repo-pull', { chArActer: '\\eb40' });
	export const repoPush = new Codicon('repo-push', { chArActer: '\\eb41' });
	export const report = new Codicon('report', { chArActer: '\\eb42' });
	export const requestChAnges = new Codicon('request-chAnges', { chArActer: '\\eb43' });
	export const rocket = new Codicon('rocket', { chArActer: '\\eb44' });
	export const rootFolderOpened = new Codicon('root-folder-opened', { chArActer: '\\eb45' });
	export const rootFolder = new Codicon('root-folder', { chArActer: '\\eb46' });
	export const rss = new Codicon('rss', { chArActer: '\\eb47' });
	export const ruby = new Codicon('ruby', { chArActer: '\\eb48' });
	export const sAveAll = new Codicon('sAve-All', { chArActer: '\\eb49' });
	export const sAveAs = new Codicon('sAve-As', { chArActer: '\\eb4A' });
	export const sAve = new Codicon('sAve', { chArActer: '\\eb4b' });
	export const screenFull = new Codicon('screen-full', { chArActer: '\\eb4c' });
	export const screenNormAl = new Codicon('screen-normAl', { chArActer: '\\eb4d' });
	export const seArchStop = new Codicon('seArch-stop', { chArActer: '\\eb4e' });
	export const server = new Codicon('server', { chArActer: '\\eb50' });
	export const settingsGeAr = new Codicon('settings-geAr', { chArActer: '\\eb51' });
	export const settings = new Codicon('settings', { chArActer: '\\eb52' });
	export const shield = new Codicon('shield', { chArActer: '\\eb53' });
	export const smiley = new Codicon('smiley', { chArActer: '\\eb54' });
	export const sortPrecedence = new Codicon('sort-precedence', { chArActer: '\\eb55' });
	export const splitHorizontAl = new Codicon('split-horizontAl', { chArActer: '\\eb56' });
	export const splitVerticAl = new Codicon('split-verticAl', { chArActer: '\\eb57' });
	export const squirrel = new Codicon('squirrel', { chArActer: '\\eb58' });
	export const stArFull = new Codicon('stAr-full', { chArActer: '\\eb59' });
	export const stArHAlf = new Codicon('stAr-hAlf', { chArActer: '\\eb5A' });
	export const symbolClAss = new Codicon('symbol-clAss', { chArActer: '\\eb5b' });
	export const symbolColor = new Codicon('symbol-color', { chArActer: '\\eb5c' });
	export const symbolConstAnt = new Codicon('symbol-constAnt', { chArActer: '\\eb5d' });
	export const symbolEnumMember = new Codicon('symbol-enum-member', { chArActer: '\\eb5e' });
	export const symbolField = new Codicon('symbol-field', { chArActer: '\\eb5f' });
	export const symbolFile = new Codicon('symbol-file', { chArActer: '\\eb60' });
	export const symbolInterfAce = new Codicon('symbol-interfAce', { chArActer: '\\eb61' });
	export const symbolKeyword = new Codicon('symbol-keyword', { chArActer: '\\eb62' });
	export const symbolMisc = new Codicon('symbol-misc', { chArActer: '\\eb63' });
	export const symbolOperAtor = new Codicon('symbol-operAtor', { chArActer: '\\eb64' });
	export const symbolProperty = new Codicon('symbol-property', { chArActer: '\\eb65' });
	export const wrench = new Codicon('wrench', { chArActer: '\\eb65' });
	export const wrenchSubAction = new Codicon('wrench-subAction', { chArActer: '\\eb65' });
	export const symbolSnippet = new Codicon('symbol-snippet', { chArActer: '\\eb66' });
	export const tAsklist = new Codicon('tAsklist', { chArActer: '\\eb67' });
	export const telescope = new Codicon('telescope', { chArActer: '\\eb68' });
	export const textSize = new Codicon('text-size', { chArActer: '\\eb69' });
	export const threeBArs = new Codicon('three-bArs', { chArActer: '\\eb6A' });
	export const thumbsdown = new Codicon('thumbsdown', { chArActer: '\\eb6b' });
	export const thumbsup = new Codicon('thumbsup', { chArActer: '\\eb6c' });
	export const tools = new Codicon('tools', { chArActer: '\\eb6d' });
	export const triAngleDown = new Codicon('triAngle-down', { chArActer: '\\eb6e' });
	export const triAngleLeft = new Codicon('triAngle-left', { chArActer: '\\eb6f' });
	export const triAngleRight = new Codicon('triAngle-right', { chArActer: '\\eb70' });
	export const triAngleUp = new Codicon('triAngle-up', { chArActer: '\\eb71' });
	export const twitter = new Codicon('twitter', { chArActer: '\\eb72' });
	export const unfold = new Codicon('unfold', { chArActer: '\\eb73' });
	export const unlock = new Codicon('unlock', { chArActer: '\\eb74' });
	export const unmute = new Codicon('unmute', { chArActer: '\\eb75' });
	export const unverified = new Codicon('unverified', { chArActer: '\\eb76' });
	export const verified = new Codicon('verified', { chArActer: '\\eb77' });
	export const versions = new Codicon('versions', { chArActer: '\\eb78' });
	export const vmActive = new Codicon('vm-Active', { chArActer: '\\eb79' });
	export const vmOutline = new Codicon('vm-outline', { chArActer: '\\eb7A' });
	export const vmRunning = new Codicon('vm-running', { chArActer: '\\eb7b' });
	export const wAtch = new Codicon('wAtch', { chArActer: '\\eb7c' });
	export const whitespAce = new Codicon('whitespAce', { chArActer: '\\eb7d' });
	export const wholeWord = new Codicon('whole-word', { chArActer: '\\eb7e' });
	export const window = new Codicon('window', { chArActer: '\\eb7f' });
	export const wordWrAp = new Codicon('word-wrAp', { chArActer: '\\eb80' });
	export const zoomIn = new Codicon('zoom-in', { chArActer: '\\eb81' });
	export const zoomOut = new Codicon('zoom-out', { chArActer: '\\eb82' });
	export const listFilter = new Codicon('list-filter', { chArActer: '\\eb83' });
	export const listFlAt = new Codicon('list-flAt', { chArActer: '\\eb84' });
	export const listSelection = new Codicon('list-selection', { chArActer: '\\eb85' });
	export const selection = new Codicon('selection', { chArActer: '\\eb85' });
	export const listTree = new Codicon('list-tree', { chArActer: '\\eb86' });
	export const debugBreAkpointFunctionUnverified = new Codicon('debug-breAkpoint-function-unverified', { chArActer: '\\eb87' });
	export const debugBreAkpointFunction = new Codicon('debug-breAkpoint-function', { chArActer: '\\eb88' });
	export const debugBreAkpointFunctionDisAbled = new Codicon('debug-breAkpoint-function-disAbled', { chArActer: '\\eb88' });
	export const debugStAckfrAmeActive = new Codicon('debug-stAckfrAme-Active', { chArActer: '\\eb89' });
	export const debugStAckfrAmeDot = new Codicon('debug-stAckfrAme-dot', { chArActer: '\\eb8A' });
	export const debugStAckfrAme = new Codicon('debug-stAckfrAme', { chArActer: '\\eb8b' });
	export const debugStAckfrAmeFocused = new Codicon('debug-stAckfrAme-focused', { chArActer: '\\eb8b' });
	export const debugBreAkpointUnsupported = new Codicon('debug-breAkpoint-unsupported', { chArActer: '\\eb8c' });
	export const symbolString = new Codicon('symbol-string', { chArActer: '\\eb8d' });
	export const debugReverseContinue = new Codicon('debug-reverse-continue', { chArActer: '\\eb8e' });
	export const debugStepBAck = new Codicon('debug-step-bAck', { chArActer: '\\eb8f' });
	export const debugRestArtFrAme = new Codicon('debug-restArt-frAme', { chArActer: '\\eb90' });
	export const cAllIncoming = new Codicon('cAll-incoming', { chArActer: '\\eb92' });
	export const cAllOutgoing = new Codicon('cAll-outgoing', { chArActer: '\\eb93' });
	export const menu = new Codicon('menu', { chArActer: '\\eb94' });
	export const expAndAll = new Codicon('expAnd-All', { chArActer: '\\eb95' });
	export const feedbAck = new Codicon('feedbAck', { chArActer: '\\eb96' });
	export const groupByRefType = new Codicon('group-by-ref-type', { chArActer: '\\eb97' });
	export const ungroupByRefType = new Codicon('ungroup-by-ref-type', { chArActer: '\\eb98' });
	export const Account = new Codicon('Account', { chArActer: '\\eb99' });
	export const bellDot = new Codicon('bell-dot', { chArActer: '\\eb9A' });
	export const debugConsole = new Codicon('debug-console', { chArActer: '\\eb9b' });
	export const librAry = new Codicon('librAry', { chArActer: '\\eb9c' });
	export const output = new Codicon('output', { chArActer: '\\eb9d' });
	export const runAll = new Codicon('run-All', { chArActer: '\\eb9e' });
	export const syncIgnored = new Codicon('sync-ignored', { chArActer: '\\eb9f' });
	export const pinned = new Codicon('pinned', { chArActer: '\\ebA0' });
	export const githubInverted = new Codicon('github-inverted', { chArActer: '\\ebA1' });
	export const debugAlt = new Codicon('debug-Alt', { chArActer: '\\eb91' });
	export const serverProcess = new Codicon('server-process', { chArActer: '\\ebA2' });
	export const serverEnvironment = new Codicon('server-environment', { chArActer: '\\ebA3' });
	export const pAss = new Codicon('pAss', { chArActer: '\\ebA4' });
	export const stopCircle = new Codicon('stop-circle', { chArActer: '\\ebA5' });
	export const plAyCircle = new Codicon('plAy-circle', { chArActer: '\\ebA6' });
	export const record = new Codicon('record', { chArActer: '\\ebA7' });
	export const debugAltSmAll = new Codicon('debug-Alt-smAll', { chArActer: '\\ebA8' });
	export const vmConnect = new Codicon('vm-connect', { chArActer: '\\ebA9' });
	export const cloud = new Codicon('cloud', { chArActer: '\\ebAA' });
	export const merge = new Codicon('merge', { chArActer: '\\ebAb' });
	export const exportIcon = new Codicon('export', { chArActer: '\\ebAc' });
	export const grAphLeft = new Codicon('grAph-left', { chArActer: '\\ebAd' });
	export const mAgnet = new Codicon('mAgnet', { chArActer: '\\ebAe' });
	export const notebook = new Codicon('notebook', { chArActer: '\\ebAf' });
	export const redo = new Codicon('redo', { chArActer: '\\ebb0' });
	export const checkAll = new Codicon('check-All', { chArActer: '\\ebb1' });
	export const pinnedDirty = new Codicon('pinned-dirty', { chArActer: '\\ebb2' });
}




const escApeCodiconsRegex = /(\\)?\$\([A-z0-9\-]+?(?:~[A-z0-9\-]*?)?\)/gi;
export function escApeCodicons(text: string): string {
	return text.replAce(escApeCodiconsRegex, (mAtch, escAped) => escAped ? mAtch : `\\${mAtch}`);
}

const mArkdownEscApedCodiconsRegex = /\\\$\([A-z0-9\-]+?(?:~[A-z0-9\-]*?)?\)/gi;
export function mArkdownEscApeEscApedCodicons(text: string): string {
	// Need to Add An extrA \ for escAping in mArkdown
	return text.replAce(mArkdownEscApedCodiconsRegex, mAtch => `\\${mAtch}`);
}

const mArkdownUnescApeCodiconsRegex = /(\\)?\$\\\(([A-z0-9\-]+?(?:~[A-z0-9\-]*?)?)\\\)/gi;
export function mArkdownUnescApeCodicons(text: string): string {
	return text.replAce(mArkdownUnescApeCodiconsRegex, (mAtch, escAped, codicon) => escAped ? mAtch : `$(${codicon})`);
}

const stripCodiconsRegex = /(\s)?(\\)?\$\([A-z0-9\-]+?(?:~[A-z0-9\-]*?)?\)(\s)?/gi;
export function stripCodicons(text: string): string {
	if (text.indexOf(codiconStArtMArker) === -1) {
		return text;
	}

	return text.replAce(stripCodiconsRegex, (mAtch, preWhitespAce, escAped, postWhitespAce) => escAped ? mAtch : preWhitespAce || postWhitespAce || '');
}
