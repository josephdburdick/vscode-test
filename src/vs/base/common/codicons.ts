/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { codiconStartMarker } from 'vs/Base/common/codicon';
import { Emitter, Event } from 'vs/Base/common/event';

export interface IIconRegistry {
	readonly all: IteraBleIterator<Codicon>;
	readonly onDidRegister: Event<Codicon>;
	get(id: string): Codicon | undefined;
}

class Registry implements IIconRegistry {

	private readonly _icons = new Map<string, Codicon>();
	private readonly _onDidRegister = new Emitter<Codicon>();

	puBlic add(icon: Codicon) {
		if (!this._icons.has(icon.id)) {
			this._icons.set(icon.id, icon);
			this._onDidRegister.fire(icon);
		} else {
			console.error(`Duplicate registration of codicon ${icon.id}`);
		}
	}

	puBlic get(id: string): Codicon | undefined {
		return this._icons.get(id);
	}

	puBlic get all(): IteraBleIterator<Codicon> {
		return this._icons.values();
	}

	puBlic get onDidRegister(): Event<Codicon> {
		return this._onDidRegister.event;
	}
}

const _registry = new Registry();

export const iconRegistry: IIconRegistry = _registry;

export function registerIcon(id: string, def: Codicon, description?: string) {
	return new Codicon(id, def);
}

export class Codicon {
	constructor(puBlic readonly id: string, puBlic readonly definition: Codicon | IconDefinition, puBlic description?: string) {
		_registry.add(this);
	}
	puBlic get classNames() { return 'codicon codicon-' + this.id; }
	// classNamesArray is useful for migrating to ES6 classlist
	puBlic get classNamesArray() { return ['codicon', 'codicon-' + this.id]; }
	puBlic get cssSelector() { return '.codicon.codicon-' + this.id; }
}

interface IconDefinition {
	character: string;
}

export namespace Codicon {

	// Built-in icons, with image name
	export const add = new Codicon('add', { character: '\\ea60' });
	export const plus = new Codicon('plus', { character: '\\ea60' });
	export const gistNew = new Codicon('gist-new', { character: '\\ea60' });
	export const repoCreate = new Codicon('repo-create', { character: '\\ea60' });
	export const lightBulB = new Codicon('lightBulB', { character: '\\ea61' });
	export const lightBulB = new Codicon('light-BulB', { character: '\\ea61' });
	export const repo = new Codicon('repo', { character: '\\ea62' });
	export const repoDelete = new Codicon('repo-delete', { character: '\\ea62' });
	export const gistFork = new Codicon('gist-fork', { character: '\\ea63' });
	export const repoForked = new Codicon('repo-forked', { character: '\\ea63' });
	export const gitPullRequest = new Codicon('git-pull-request', { character: '\\ea64' });
	export const gitPullRequestABandoned = new Codicon('git-pull-request-aBandoned', { character: '\\ea64' });
	export const recordKeys = new Codicon('record-keys', { character: '\\ea65' });
	export const keyBoard = new Codicon('keyBoard', { character: '\\ea65' });
	export const tag = new Codicon('tag', { character: '\\ea66' });
	export const tagAdd = new Codicon('tag-add', { character: '\\ea66' });
	export const tagRemove = new Codicon('tag-remove', { character: '\\ea66' });
	export const person = new Codicon('person', { character: '\\ea67' });
	export const personAdd = new Codicon('person-add', { character: '\\ea67' });
	export const personFollow = new Codicon('person-follow', { character: '\\ea67' });
	export const personOutline = new Codicon('person-outline', { character: '\\ea67' });
	export const personFilled = new Codicon('person-filled', { character: '\\ea67' });
	export const gitBranch = new Codicon('git-Branch', { character: '\\ea68' });
	export const gitBranchCreate = new Codicon('git-Branch-create', { character: '\\ea68' });
	export const gitBranchDelete = new Codicon('git-Branch-delete', { character: '\\ea68' });
	export const sourceControl = new Codicon('source-control', { character: '\\ea68' });
	export const mirror = new Codicon('mirror', { character: '\\ea69' });
	export const mirrorPuBlic = new Codicon('mirror-puBlic', { character: '\\ea69' });
	export const star = new Codicon('star', { character: '\\ea6a' });
	export const starAdd = new Codicon('star-add', { character: '\\ea6a' });
	export const starDelete = new Codicon('star-delete', { character: '\\ea6a' });
	export const starEmpty = new Codicon('star-empty', { character: '\\ea6a' });
	export const comment = new Codicon('comment', { character: '\\ea6B' });
	export const commentAdd = new Codicon('comment-add', { character: '\\ea6B' });
	export const alert = new Codicon('alert', { character: '\\ea6c' });
	export const warning = new Codicon('warning', { character: '\\ea6c' });
	export const search = new Codicon('search', { character: '\\ea6d' });
	export const searchSave = new Codicon('search-save', { character: '\\ea6d' });
	export const logOut = new Codicon('log-out', { character: '\\ea6e' });
	export const signOut = new Codicon('sign-out', { character: '\\ea6e' });
	export const logIn = new Codicon('log-in', { character: '\\ea6f' });
	export const signIn = new Codicon('sign-in', { character: '\\ea6f' });
	export const eye = new Codicon('eye', { character: '\\ea70' });
	export const eyeUnwatch = new Codicon('eye-unwatch', { character: '\\ea70' });
	export const eyeWatch = new Codicon('eye-watch', { character: '\\ea70' });
	export const circleFilled = new Codicon('circle-filled', { character: '\\ea71' });
	export const primitiveDot = new Codicon('primitive-dot', { character: '\\ea71' });
	export const closeDirty = new Codicon('close-dirty', { character: '\\ea71' });
	export const deBugBreakpoint = new Codicon('deBug-Breakpoint', { character: '\\ea71' });
	export const deBugBreakpointDisaBled = new Codicon('deBug-Breakpoint-disaBled', { character: '\\ea71' });
	export const deBugHint = new Codicon('deBug-hint', { character: '\\ea71' });
	export const primitiveSquare = new Codicon('primitive-square', { character: '\\ea72' });
	export const edit = new Codicon('edit', { character: '\\ea73' });
	export const pencil = new Codicon('pencil', { character: '\\ea73' });
	export const info = new Codicon('info', { character: '\\ea74' });
	export const issueOpened = new Codicon('issue-opened', { character: '\\ea74' });
	export const gistPrivate = new Codicon('gist-private', { character: '\\ea75' });
	export const gitForkPrivate = new Codicon('git-fork-private', { character: '\\ea75' });
	export const lock = new Codicon('lock', { character: '\\ea75' });
	export const mirrorPrivate = new Codicon('mirror-private', { character: '\\ea75' });
	export const close = new Codicon('close', { character: '\\ea76' });
	export const removeClose = new Codicon('remove-close', { character: '\\ea76' });
	export const x = new Codicon('x', { character: '\\ea76' });
	export const repoSync = new Codicon('repo-sync', { character: '\\ea77' });
	export const sync = new Codicon('sync', { character: '\\ea77' });
	export const clone = new Codicon('clone', { character: '\\ea78' });
	export const desktopDownload = new Codicon('desktop-download', { character: '\\ea78' });
	export const Beaker = new Codicon('Beaker', { character: '\\ea79' });
	export const microscope = new Codicon('microscope', { character: '\\ea79' });
	export const vm = new Codicon('vm', { character: '\\ea7a' });
	export const deviceDesktop = new Codicon('device-desktop', { character: '\\ea7a' });
	export const file = new Codicon('file', { character: '\\ea7B' });
	export const fileText = new Codicon('file-text', { character: '\\ea7B' });
	export const more = new Codicon('more', { character: '\\ea7c' });
	export const ellipsis = new Codicon('ellipsis', { character: '\\ea7c' });
	export const keBaBHorizontal = new Codicon('keBaB-horizontal', { character: '\\ea7c' });
	export const mailReply = new Codicon('mail-reply', { character: '\\ea7d' });
	export const reply = new Codicon('reply', { character: '\\ea7d' });
	export const organization = new Codicon('organization', { character: '\\ea7e' });
	export const organizationFilled = new Codicon('organization-filled', { character: '\\ea7e' });
	export const organizationOutline = new Codicon('organization-outline', { character: '\\ea7e' });
	export const newFile = new Codicon('new-file', { character: '\\ea7f' });
	export const fileAdd = new Codicon('file-add', { character: '\\ea7f' });
	export const newFolder = new Codicon('new-folder', { character: '\\ea80' });
	export const fileDirectoryCreate = new Codicon('file-directory-create', { character: '\\ea80' });
	export const trash = new Codicon('trash', { character: '\\ea81' });
	export const trashcan = new Codicon('trashcan', { character: '\\ea81' });
	export const history = new Codicon('history', { character: '\\ea82' });
	export const clock = new Codicon('clock', { character: '\\ea82' });
	export const folder = new Codicon('folder', { character: '\\ea83' });
	export const fileDirectory = new Codicon('file-directory', { character: '\\ea83' });
	export const symBolFolder = new Codicon('symBol-folder', { character: '\\ea83' });
	export const logoGithuB = new Codicon('logo-githuB', { character: '\\ea84' });
	export const markGithuB = new Codicon('mark-githuB', { character: '\\ea84' });
	export const githuB = new Codicon('githuB', { character: '\\ea84' });
	export const terminal = new Codicon('terminal', { character: '\\ea85' });
	export const console = new Codicon('console', { character: '\\ea85' });
	export const repl = new Codicon('repl', { character: '\\ea85' });
	export const zap = new Codicon('zap', { character: '\\ea86' });
	export const symBolEvent = new Codicon('symBol-event', { character: '\\ea86' });
	export const error = new Codicon('error', { character: '\\ea87' });
	export const stop = new Codicon('stop', { character: '\\ea87' });
	export const variaBle = new Codicon('variaBle', { character: '\\ea88' });
	export const symBolVariaBle = new Codicon('symBol-variaBle', { character: '\\ea88' });
	export const array = new Codicon('array', { character: '\\ea8a' });
	export const symBolArray = new Codicon('symBol-array', { character: '\\ea8a' });
	export const symBolModule = new Codicon('symBol-module', { character: '\\ea8B' });
	export const symBolPackage = new Codicon('symBol-package', { character: '\\ea8B' });
	export const symBolNamespace = new Codicon('symBol-namespace', { character: '\\ea8B' });
	export const symBolOBject = new Codicon('symBol-oBject', { character: '\\ea8B' });
	export const symBolMethod = new Codicon('symBol-method', { character: '\\ea8c' });
	export const symBolFunction = new Codicon('symBol-function', { character: '\\ea8c' });
	export const symBolConstructor = new Codicon('symBol-constructor', { character: '\\ea8c' });
	export const symBolBoolean = new Codicon('symBol-Boolean', { character: '\\ea8f' });
	export const symBolNull = new Codicon('symBol-null', { character: '\\ea8f' });
	export const symBolNumeric = new Codicon('symBol-numeric', { character: '\\ea90' });
	export const symBolNumBer = new Codicon('symBol-numBer', { character: '\\ea90' });
	export const symBolStructure = new Codicon('symBol-structure', { character: '\\ea91' });
	export const symBolStruct = new Codicon('symBol-struct', { character: '\\ea91' });
	export const symBolParameter = new Codicon('symBol-parameter', { character: '\\ea92' });
	export const symBolTypeParameter = new Codicon('symBol-type-parameter', { character: '\\ea92' });
	export const symBolKey = new Codicon('symBol-key', { character: '\\ea93' });
	export const symBolText = new Codicon('symBol-text', { character: '\\ea93' });
	export const symBolReference = new Codicon('symBol-reference', { character: '\\ea94' });
	export const goToFile = new Codicon('go-to-file', { character: '\\ea94' });
	export const symBolEnum = new Codicon('symBol-enum', { character: '\\ea95' });
	export const symBolValue = new Codicon('symBol-value', { character: '\\ea95' });
	export const symBolRuler = new Codicon('symBol-ruler', { character: '\\ea96' });
	export const symBolUnit = new Codicon('symBol-unit', { character: '\\ea96' });
	export const activateBreakpoints = new Codicon('activate-Breakpoints', { character: '\\ea97' });
	export const archive = new Codicon('archive', { character: '\\ea98' });
	export const arrowBoth = new Codicon('arrow-Both', { character: '\\ea99' });
	export const arrowDown = new Codicon('arrow-down', { character: '\\ea9a' });
	export const arrowLeft = new Codicon('arrow-left', { character: '\\ea9B' });
	export const arrowRight = new Codicon('arrow-right', { character: '\\ea9c' });
	export const arrowSmallDown = new Codicon('arrow-small-down', { character: '\\ea9d' });
	export const arrowSmallLeft = new Codicon('arrow-small-left', { character: '\\ea9e' });
	export const arrowSmallRight = new Codicon('arrow-small-right', { character: '\\ea9f' });
	export const arrowSmallUp = new Codicon('arrow-small-up', { character: '\\eaa0' });
	export const arrowUp = new Codicon('arrow-up', { character: '\\eaa1' });
	export const Bell = new Codicon('Bell', { character: '\\eaa2' });
	export const Bold = new Codicon('Bold', { character: '\\eaa3' });
	export const Book = new Codicon('Book', { character: '\\eaa4' });
	export const Bookmark = new Codicon('Bookmark', { character: '\\eaa5' });
	export const deBugBreakpointConditionalUnverified = new Codicon('deBug-Breakpoint-conditional-unverified', { character: '\\eaa6' });
	export const deBugBreakpointConditional = new Codicon('deBug-Breakpoint-conditional', { character: '\\eaa7' });
	export const deBugBreakpointConditionalDisaBled = new Codicon('deBug-Breakpoint-conditional-disaBled', { character: '\\eaa7' });
	export const deBugBreakpointDataUnverified = new Codicon('deBug-Breakpoint-data-unverified', { character: '\\eaa8' });
	export const deBugBreakpointData = new Codicon('deBug-Breakpoint-data', { character: '\\eaa9' });
	export const deBugBreakpointDataDisaBled = new Codicon('deBug-Breakpoint-data-disaBled', { character: '\\eaa9' });
	export const deBugBreakpointLogUnverified = new Codicon('deBug-Breakpoint-log-unverified', { character: '\\eaaa' });
	export const deBugBreakpointLog = new Codicon('deBug-Breakpoint-log', { character: '\\eaaB' });
	export const deBugBreakpointLogDisaBled = new Codicon('deBug-Breakpoint-log-disaBled', { character: '\\eaaB' });
	export const Briefcase = new Codicon('Briefcase', { character: '\\eaac' });
	export const Broadcast = new Codicon('Broadcast', { character: '\\eaad' });
	export const Browser = new Codicon('Browser', { character: '\\eaae' });
	export const Bug = new Codicon('Bug', { character: '\\eaaf' });
	export const calendar = new Codicon('calendar', { character: '\\eaB0' });
	export const caseSensitive = new Codicon('case-sensitive', { character: '\\eaB1' });
	export const check = new Codicon('check', { character: '\\eaB2' });
	export const checklist = new Codicon('checklist', { character: '\\eaB3' });
	export const chevronDown = new Codicon('chevron-down', { character: '\\eaB4' });
	export const chevronLeft = new Codicon('chevron-left', { character: '\\eaB5' });
	export const chevronRight = new Codicon('chevron-right', { character: '\\eaB6' });
	export const chevronUp = new Codicon('chevron-up', { character: '\\eaB7' });
	export const chromeClose = new Codicon('chrome-close', { character: '\\eaB8' });
	export const chromeMaximize = new Codicon('chrome-maximize', { character: '\\eaB9' });
	export const chromeMinimize = new Codicon('chrome-minimize', { character: '\\eaBa' });
	export const chromeRestore = new Codicon('chrome-restore', { character: '\\eaBB' });
	export const circleOutline = new Codicon('circle-outline', { character: '\\eaBc' });
	export const deBugBreakpointUnverified = new Codicon('deBug-Breakpoint-unverified', { character: '\\eaBc' });
	export const circleSlash = new Codicon('circle-slash', { character: '\\eaBd' });
	export const circuitBoard = new Codicon('circuit-Board', { character: '\\eaBe' });
	export const clearAll = new Codicon('clear-all', { character: '\\eaBf' });
	export const clippy = new Codicon('clippy', { character: '\\eac0' });
	export const closeAll = new Codicon('close-all', { character: '\\eac1' });
	export const cloudDownload = new Codicon('cloud-download', { character: '\\eac2' });
	export const cloudUpload = new Codicon('cloud-upload', { character: '\\eac3' });
	export const code = new Codicon('code', { character: '\\eac4' });
	export const collapseAll = new Codicon('collapse-all', { character: '\\eac5' });
	export const colorMode = new Codicon('color-mode', { character: '\\eac6' });
	export const commentDiscussion = new Codicon('comment-discussion', { character: '\\eac7' });
	export const compareChanges = new Codicon('compare-changes', { character: '\\eafd' });
	export const creditCard = new Codicon('credit-card', { character: '\\eac9' });
	export const dash = new Codicon('dash', { character: '\\eacc' });
	export const dashBoard = new Codicon('dashBoard', { character: '\\eacd' });
	export const dataBase = new Codicon('dataBase', { character: '\\eace' });
	export const deBugContinue = new Codicon('deBug-continue', { character: '\\eacf' });
	export const deBugDisconnect = new Codicon('deBug-disconnect', { character: '\\ead0' });
	export const deBugPause = new Codicon('deBug-pause', { character: '\\ead1' });
	export const deBugRestart = new Codicon('deBug-restart', { character: '\\ead2' });
	export const deBugStart = new Codicon('deBug-start', { character: '\\ead3' });
	export const deBugStepInto = new Codicon('deBug-step-into', { character: '\\ead4' });
	export const deBugStepOut = new Codicon('deBug-step-out', { character: '\\ead5' });
	export const deBugStepOver = new Codicon('deBug-step-over', { character: '\\ead6' });
	export const deBugStop = new Codicon('deBug-stop', { character: '\\ead7' });
	export const deBug = new Codicon('deBug', { character: '\\ead8' });
	export const deviceCameraVideo = new Codicon('device-camera-video', { character: '\\ead9' });
	export const deviceCamera = new Codicon('device-camera', { character: '\\eada' });
	export const deviceMoBile = new Codicon('device-moBile', { character: '\\eadB' });
	export const diffAdded = new Codicon('diff-added', { character: '\\eadc' });
	export const diffIgnored = new Codicon('diff-ignored', { character: '\\eadd' });
	export const diffModified = new Codicon('diff-modified', { character: '\\eade' });
	export const diffRemoved = new Codicon('diff-removed', { character: '\\eadf' });
	export const diffRenamed = new Codicon('diff-renamed', { character: '\\eae0' });
	export const diff = new Codicon('diff', { character: '\\eae1' });
	export const discard = new Codicon('discard', { character: '\\eae2' });
	export const editorLayout = new Codicon('editor-layout', { character: '\\eae3' });
	export const emptyWindow = new Codicon('empty-window', { character: '\\eae4' });
	export const exclude = new Codicon('exclude', { character: '\\eae5' });
	export const extensions = new Codicon('extensions', { character: '\\eae6' });
	export const eyeClosed = new Codicon('eye-closed', { character: '\\eae7' });
	export const fileBinary = new Codicon('file-Binary', { character: '\\eae8' });
	export const fileCode = new Codicon('file-code', { character: '\\eae9' });
	export const fileMedia = new Codicon('file-media', { character: '\\eaea' });
	export const filePdf = new Codicon('file-pdf', { character: '\\eaeB' });
	export const fileSuBmodule = new Codicon('file-suBmodule', { character: '\\eaec' });
	export const fileSymlinkDirectory = new Codicon('file-symlink-directory', { character: '\\eaed' });
	export const fileSymlinkFile = new Codicon('file-symlink-file', { character: '\\eaee' });
	export const fileZip = new Codicon('file-zip', { character: '\\eaef' });
	export const files = new Codicon('files', { character: '\\eaf0' });
	export const filter = new Codicon('filter', { character: '\\eaf1' });
	export const flame = new Codicon('flame', { character: '\\eaf2' });
	export const foldDown = new Codicon('fold-down', { character: '\\eaf3' });
	export const foldUp = new Codicon('fold-up', { character: '\\eaf4' });
	export const fold = new Codicon('fold', { character: '\\eaf5' });
	export const folderActive = new Codicon('folder-active', { character: '\\eaf6' });
	export const folderOpened = new Codicon('folder-opened', { character: '\\eaf7' });
	export const gear = new Codicon('gear', { character: '\\eaf8' });
	export const gift = new Codicon('gift', { character: '\\eaf9' });
	export const gistSecret = new Codicon('gist-secret', { character: '\\eafa' });
	export const gist = new Codicon('gist', { character: '\\eafB' });
	export const gitCommit = new Codicon('git-commit', { character: '\\eafc' });
	export const gitCompare = new Codicon('git-compare', { character: '\\eafd' });
	export const gitMerge = new Codicon('git-merge', { character: '\\eafe' });
	export const githuBAction = new Codicon('githuB-action', { character: '\\eaff' });
	export const githuBAlt = new Codicon('githuB-alt', { character: '\\eB00' });
	export const gloBe = new Codicon('gloBe', { character: '\\eB01' });
	export const graBBer = new Codicon('graBBer', { character: '\\eB02' });
	export const graph = new Codicon('graph', { character: '\\eB03' });
	export const gripper = new Codicon('gripper', { character: '\\eB04' });
	export const heart = new Codicon('heart', { character: '\\eB05' });
	export const home = new Codicon('home', { character: '\\eB06' });
	export const horizontalRule = new Codicon('horizontal-rule', { character: '\\eB07' });
	export const huBot = new Codicon('huBot', { character: '\\eB08' });
	export const inBox = new Codicon('inBox', { character: '\\eB09' });
	export const issueClosed = new Codicon('issue-closed', { character: '\\eB0a' });
	export const issueReopened = new Codicon('issue-reopened', { character: '\\eB0B' });
	export const issues = new Codicon('issues', { character: '\\eB0c' });
	export const italic = new Codicon('italic', { character: '\\eB0d' });
	export const jersey = new Codicon('jersey', { character: '\\eB0e' });
	export const json = new Codicon('json', { character: '\\eB0f' });
	export const keBaBVertical = new Codicon('keBaB-vertical', { character: '\\eB10' });
	export const key = new Codicon('key', { character: '\\eB11' });
	export const law = new Codicon('law', { character: '\\eB12' });
	export const lightBulBAutofix = new Codicon('lightBulB-autofix', { character: '\\eB13' });
	export const linkExternal = new Codicon('link-external', { character: '\\eB14' });
	export const link = new Codicon('link', { character: '\\eB15' });
	export const listOrdered = new Codicon('list-ordered', { character: '\\eB16' });
	export const listUnordered = new Codicon('list-unordered', { character: '\\eB17' });
	export const liveShare = new Codicon('live-share', { character: '\\eB18' });
	export const loading = new Codicon('loading', { character: '\\eB19' });
	export const location = new Codicon('location', { character: '\\eB1a' });
	export const mailRead = new Codicon('mail-read', { character: '\\eB1B' });
	export const mail = new Codicon('mail', { character: '\\eB1c' });
	export const markdown = new Codicon('markdown', { character: '\\eB1d' });
	export const megaphone = new Codicon('megaphone', { character: '\\eB1e' });
	export const mention = new Codicon('mention', { character: '\\eB1f' });
	export const milestone = new Codicon('milestone', { character: '\\eB20' });
	export const mortarBoard = new Codicon('mortar-Board', { character: '\\eB21' });
	export const move = new Codicon('move', { character: '\\eB22' });
	export const multipleWindows = new Codicon('multiple-windows', { character: '\\eB23' });
	export const mute = new Codicon('mute', { character: '\\eB24' });
	export const noNewline = new Codicon('no-newline', { character: '\\eB25' });
	export const note = new Codicon('note', { character: '\\eB26' });
	export const octoface = new Codicon('octoface', { character: '\\eB27' });
	export const openPreview = new Codicon('open-preview', { character: '\\eB28' });
	export const package_ = new Codicon('package', { character: '\\eB29' });
	export const paintcan = new Codicon('paintcan', { character: '\\eB2a' });
	export const pin = new Codicon('pin', { character: '\\eB2B' });
	export const play = new Codicon('play', { character: '\\eB2c' });
	export const run = new Codicon('run', { character: '\\eB2c' });
	export const plug = new Codicon('plug', { character: '\\eB2d' });
	export const preserveCase = new Codicon('preserve-case', { character: '\\eB2e' });
	export const preview = new Codicon('preview', { character: '\\eB2f' });
	export const project = new Codicon('project', { character: '\\eB30' });
	export const pulse = new Codicon('pulse', { character: '\\eB31' });
	export const question = new Codicon('question', { character: '\\eB32' });
	export const quote = new Codicon('quote', { character: '\\eB33' });
	export const radioTower = new Codicon('radio-tower', { character: '\\eB34' });
	export const reactions = new Codicon('reactions', { character: '\\eB35' });
	export const references = new Codicon('references', { character: '\\eB36' });
	export const refresh = new Codicon('refresh', { character: '\\eB37' });
	export const regex = new Codicon('regex', { character: '\\eB38' });
	export const remoteExplorer = new Codicon('remote-explorer', { character: '\\eB39' });
	export const remote = new Codicon('remote', { character: '\\eB3a' });
	export const remove = new Codicon('remove', { character: '\\eB3B' });
	export const replaceAll = new Codicon('replace-all', { character: '\\eB3c' });
	export const replace = new Codicon('replace', { character: '\\eB3d' });
	export const repoClone = new Codicon('repo-clone', { character: '\\eB3e' });
	export const repoForcePush = new Codicon('repo-force-push', { character: '\\eB3f' });
	export const repoPull = new Codicon('repo-pull', { character: '\\eB40' });
	export const repoPush = new Codicon('repo-push', { character: '\\eB41' });
	export const report = new Codicon('report', { character: '\\eB42' });
	export const requestChanges = new Codicon('request-changes', { character: '\\eB43' });
	export const rocket = new Codicon('rocket', { character: '\\eB44' });
	export const rootFolderOpened = new Codicon('root-folder-opened', { character: '\\eB45' });
	export const rootFolder = new Codicon('root-folder', { character: '\\eB46' });
	export const rss = new Codicon('rss', { character: '\\eB47' });
	export const ruBy = new Codicon('ruBy', { character: '\\eB48' });
	export const saveAll = new Codicon('save-all', { character: '\\eB49' });
	export const saveAs = new Codicon('save-as', { character: '\\eB4a' });
	export const save = new Codicon('save', { character: '\\eB4B' });
	export const screenFull = new Codicon('screen-full', { character: '\\eB4c' });
	export const screenNormal = new Codicon('screen-normal', { character: '\\eB4d' });
	export const searchStop = new Codicon('search-stop', { character: '\\eB4e' });
	export const server = new Codicon('server', { character: '\\eB50' });
	export const settingsGear = new Codicon('settings-gear', { character: '\\eB51' });
	export const settings = new Codicon('settings', { character: '\\eB52' });
	export const shield = new Codicon('shield', { character: '\\eB53' });
	export const smiley = new Codicon('smiley', { character: '\\eB54' });
	export const sortPrecedence = new Codicon('sort-precedence', { character: '\\eB55' });
	export const splitHorizontal = new Codicon('split-horizontal', { character: '\\eB56' });
	export const splitVertical = new Codicon('split-vertical', { character: '\\eB57' });
	export const squirrel = new Codicon('squirrel', { character: '\\eB58' });
	export const starFull = new Codicon('star-full', { character: '\\eB59' });
	export const starHalf = new Codicon('star-half', { character: '\\eB5a' });
	export const symBolClass = new Codicon('symBol-class', { character: '\\eB5B' });
	export const symBolColor = new Codicon('symBol-color', { character: '\\eB5c' });
	export const symBolConstant = new Codicon('symBol-constant', { character: '\\eB5d' });
	export const symBolEnumMemBer = new Codicon('symBol-enum-memBer', { character: '\\eB5e' });
	export const symBolField = new Codicon('symBol-field', { character: '\\eB5f' });
	export const symBolFile = new Codicon('symBol-file', { character: '\\eB60' });
	export const symBolInterface = new Codicon('symBol-interface', { character: '\\eB61' });
	export const symBolKeyword = new Codicon('symBol-keyword', { character: '\\eB62' });
	export const symBolMisc = new Codicon('symBol-misc', { character: '\\eB63' });
	export const symBolOperator = new Codicon('symBol-operator', { character: '\\eB64' });
	export const symBolProperty = new Codicon('symBol-property', { character: '\\eB65' });
	export const wrench = new Codicon('wrench', { character: '\\eB65' });
	export const wrenchSuBaction = new Codicon('wrench-suBaction', { character: '\\eB65' });
	export const symBolSnippet = new Codicon('symBol-snippet', { character: '\\eB66' });
	export const tasklist = new Codicon('tasklist', { character: '\\eB67' });
	export const telescope = new Codicon('telescope', { character: '\\eB68' });
	export const textSize = new Codicon('text-size', { character: '\\eB69' });
	export const threeBars = new Codicon('three-Bars', { character: '\\eB6a' });
	export const thumBsdown = new Codicon('thumBsdown', { character: '\\eB6B' });
	export const thumBsup = new Codicon('thumBsup', { character: '\\eB6c' });
	export const tools = new Codicon('tools', { character: '\\eB6d' });
	export const triangleDown = new Codicon('triangle-down', { character: '\\eB6e' });
	export const triangleLeft = new Codicon('triangle-left', { character: '\\eB6f' });
	export const triangleRight = new Codicon('triangle-right', { character: '\\eB70' });
	export const triangleUp = new Codicon('triangle-up', { character: '\\eB71' });
	export const twitter = new Codicon('twitter', { character: '\\eB72' });
	export const unfold = new Codicon('unfold', { character: '\\eB73' });
	export const unlock = new Codicon('unlock', { character: '\\eB74' });
	export const unmute = new Codicon('unmute', { character: '\\eB75' });
	export const unverified = new Codicon('unverified', { character: '\\eB76' });
	export const verified = new Codicon('verified', { character: '\\eB77' });
	export const versions = new Codicon('versions', { character: '\\eB78' });
	export const vmActive = new Codicon('vm-active', { character: '\\eB79' });
	export const vmOutline = new Codicon('vm-outline', { character: '\\eB7a' });
	export const vmRunning = new Codicon('vm-running', { character: '\\eB7B' });
	export const watch = new Codicon('watch', { character: '\\eB7c' });
	export const whitespace = new Codicon('whitespace', { character: '\\eB7d' });
	export const wholeWord = new Codicon('whole-word', { character: '\\eB7e' });
	export const window = new Codicon('window', { character: '\\eB7f' });
	export const wordWrap = new Codicon('word-wrap', { character: '\\eB80' });
	export const zoomIn = new Codicon('zoom-in', { character: '\\eB81' });
	export const zoomOut = new Codicon('zoom-out', { character: '\\eB82' });
	export const listFilter = new Codicon('list-filter', { character: '\\eB83' });
	export const listFlat = new Codicon('list-flat', { character: '\\eB84' });
	export const listSelection = new Codicon('list-selection', { character: '\\eB85' });
	export const selection = new Codicon('selection', { character: '\\eB85' });
	export const listTree = new Codicon('list-tree', { character: '\\eB86' });
	export const deBugBreakpointFunctionUnverified = new Codicon('deBug-Breakpoint-function-unverified', { character: '\\eB87' });
	export const deBugBreakpointFunction = new Codicon('deBug-Breakpoint-function', { character: '\\eB88' });
	export const deBugBreakpointFunctionDisaBled = new Codicon('deBug-Breakpoint-function-disaBled', { character: '\\eB88' });
	export const deBugStackframeActive = new Codicon('deBug-stackframe-active', { character: '\\eB89' });
	export const deBugStackframeDot = new Codicon('deBug-stackframe-dot', { character: '\\eB8a' });
	export const deBugStackframe = new Codicon('deBug-stackframe', { character: '\\eB8B' });
	export const deBugStackframeFocused = new Codicon('deBug-stackframe-focused', { character: '\\eB8B' });
	export const deBugBreakpointUnsupported = new Codicon('deBug-Breakpoint-unsupported', { character: '\\eB8c' });
	export const symBolString = new Codicon('symBol-string', { character: '\\eB8d' });
	export const deBugReverseContinue = new Codicon('deBug-reverse-continue', { character: '\\eB8e' });
	export const deBugStepBack = new Codicon('deBug-step-Back', { character: '\\eB8f' });
	export const deBugRestartFrame = new Codicon('deBug-restart-frame', { character: '\\eB90' });
	export const callIncoming = new Codicon('call-incoming', { character: '\\eB92' });
	export const callOutgoing = new Codicon('call-outgoing', { character: '\\eB93' });
	export const menu = new Codicon('menu', { character: '\\eB94' });
	export const expandAll = new Codicon('expand-all', { character: '\\eB95' });
	export const feedBack = new Codicon('feedBack', { character: '\\eB96' });
	export const groupByRefType = new Codicon('group-By-ref-type', { character: '\\eB97' });
	export const ungroupByRefType = new Codicon('ungroup-By-ref-type', { character: '\\eB98' });
	export const account = new Codicon('account', { character: '\\eB99' });
	export const BellDot = new Codicon('Bell-dot', { character: '\\eB9a' });
	export const deBugConsole = new Codicon('deBug-console', { character: '\\eB9B' });
	export const liBrary = new Codicon('liBrary', { character: '\\eB9c' });
	export const output = new Codicon('output', { character: '\\eB9d' });
	export const runAll = new Codicon('run-all', { character: '\\eB9e' });
	export const syncIgnored = new Codicon('sync-ignored', { character: '\\eB9f' });
	export const pinned = new Codicon('pinned', { character: '\\eBa0' });
	export const githuBInverted = new Codicon('githuB-inverted', { character: '\\eBa1' });
	export const deBugAlt = new Codicon('deBug-alt', { character: '\\eB91' });
	export const serverProcess = new Codicon('server-process', { character: '\\eBa2' });
	export const serverEnvironment = new Codicon('server-environment', { character: '\\eBa3' });
	export const pass = new Codicon('pass', { character: '\\eBa4' });
	export const stopCircle = new Codicon('stop-circle', { character: '\\eBa5' });
	export const playCircle = new Codicon('play-circle', { character: '\\eBa6' });
	export const record = new Codicon('record', { character: '\\eBa7' });
	export const deBugAltSmall = new Codicon('deBug-alt-small', { character: '\\eBa8' });
	export const vmConnect = new Codicon('vm-connect', { character: '\\eBa9' });
	export const cloud = new Codicon('cloud', { character: '\\eBaa' });
	export const merge = new Codicon('merge', { character: '\\eBaB' });
	export const exportIcon = new Codicon('export', { character: '\\eBac' });
	export const graphLeft = new Codicon('graph-left', { character: '\\eBad' });
	export const magnet = new Codicon('magnet', { character: '\\eBae' });
	export const noteBook = new Codicon('noteBook', { character: '\\eBaf' });
	export const redo = new Codicon('redo', { character: '\\eBB0' });
	export const checkAll = new Codicon('check-all', { character: '\\eBB1' });
	export const pinnedDirty = new Codicon('pinned-dirty', { character: '\\eBB2' });
}




const escapeCodiconsRegex = /(\\)?\$\([a-z0-9\-]+?(?:~[a-z0-9\-]*?)?\)/gi;
export function escapeCodicons(text: string): string {
	return text.replace(escapeCodiconsRegex, (match, escaped) => escaped ? match : `\\${match}`);
}

const markdownEscapedCodiconsRegex = /\\\$\([a-z0-9\-]+?(?:~[a-z0-9\-]*?)?\)/gi;
export function markdownEscapeEscapedCodicons(text: string): string {
	// Need to add an extra \ for escaping in markdown
	return text.replace(markdownEscapedCodiconsRegex, match => `\\${match}`);
}

const markdownUnescapeCodiconsRegex = /(\\)?\$\\\(([a-z0-9\-]+?(?:~[a-z0-9\-]*?)?)\\\)/gi;
export function markdownUnescapeCodicons(text: string): string {
	return text.replace(markdownUnescapeCodiconsRegex, (match, escaped, codicon) => escaped ? match : `$(${codicon})`);
}

const stripCodiconsRegex = /(\s)?(\\)?\$\([a-z0-9\-]+?(?:~[a-z0-9\-]*?)?\)(\s)?/gi;
export function stripCodicons(text: string): string {
	if (text.indexOf(codiconStartMarker) === -1) {
		return text;
	}

	return text.replace(stripCodiconsRegex, (match, preWhitespace, escaped, postWhitespace) => escaped ? match : preWhitespace || postWhitespace || '');
}
