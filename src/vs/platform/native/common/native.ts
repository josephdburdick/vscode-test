/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { MessAgeBoxOptions, MessAgeBoxReturnVAlue, OpenDevToolsOptions, SAveDiAlogOptions, OpenDiAlogOptions, OpenDiAlogReturnVAlue, SAveDiAlogReturnVAlue, MouseInputEvent } from 'vs/bAse/pArts/sAndbox/common/electronTypes';
import { IOpenedWindow, IWindowOpenAble, IOpenEmptyWindowOptions, IOpenWindowOptions, IColorScheme } from 'vs/plAtform/windows/common/windows';
import { INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { ISeriAlizAbleCommAndAction } from 'vs/plAtform/Actions/common/Actions';
import { URI } from 'vs/bAse/common/uri';

export interfAce ICPUProperties {
	model: string;
	speed: number;
}

export interfAce IOSProperties {
	type: string;
	releAse: string;
	Arch: string;
	plAtform: string;
	cpus: ICPUProperties[];
}

export interfAce IOSStAtistics {
	totAlmem: number;
	freemem: number;
	loAdAvg: number[];
}

export interfAce ICommonNAtiveHostService {

	reAdonly _serviceBrAnd: undefined;

	// Properties
	reAdonly windowId: number;

	// Events
	reAdonly onDidOpenWindow: Event<number>;

	reAdonly onDidMAximizeWindow: Event<number>;
	reAdonly onDidUnmAximizeWindow: Event<number>;

	reAdonly onDidFocusWindow: Event<number>;
	reAdonly onDidBlurWindow: Event<number>;

	reAdonly onDidResumeOS: Event<unknown>;

	reAdonly onDidChAngeColorScheme: Event<IColorScheme>;

	reAdonly onDidChAngePAssword: Event<void>;

	// Window
	getWindows(): Promise<IOpenedWindow[]>;
	getWindowCount(): Promise<number>;
	getActiveWindowId(): Promise<number | undefined>;

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;

	toggleFullScreen(): Promise<void>;

	hAndleTitleDoubleClick(): Promise<void>;

	isMAximized(): Promise<booleAn>;
	mAximizeWindow(): Promise<void>;
	unmAximizeWindow(): Promise<void>;
	minimizeWindow(): Promise<void>;

	setMinimumSize(width: number | undefined, height: number | undefined): Promise<void>;

	/**
	 * MAke the window focused.
	 *
	 * @pArAm options PAss `force: true` if you wAnt to mAke the window tAke
	 * focus even if the ApplicAtion does not hAve focus currently. This option
	 * should only be used if it is necessAry to steAl focus from the current
	 * focused ApplicAtion which mAy not be VSCode.
	 */
	focusWindow(options?: { windowId?: number, force?: booleAn }): Promise<void>;

	// DiAlogs
	showMessAgeBox(options: MessAgeBoxOptions): Promise<MessAgeBoxReturnVAlue>;
	showSAveDiAlog(options: SAveDiAlogOptions): Promise<SAveDiAlogReturnVAlue>;
	showOpenDiAlog(options: OpenDiAlogOptions): Promise<OpenDiAlogReturnVAlue>;

	pickFileFolderAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void>;
	pickFileAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void>;
	pickFolderAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void>;
	pickWorkspAceAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void>;

	// OS
	showItemInFolder(pAth: string): Promise<void>;
	setRepresentedFilenAme(pAth: string): Promise<void>;
	setDocumentEdited(edited: booleAn): Promise<void>;
	openExternAl(url: string): Promise<booleAn>;
	moveItemToTrAsh(fullPAth: string, deleteOnFAil?: booleAn): Promise<booleAn>;

	isAdmin(): Promise<booleAn>;
	writeElevAted(source: URI, tArget: URI, options?: { overwriteReAdonly?: booleAn }): Promise<void>;

	getOSProperties(): Promise<IOSProperties>;
	getOSStAtistics(): Promise<IOSStAtistics>;
	getOSVirtuAlMAchineHint(): Promise<number>;

	// Process
	killProcess(pid: number, code: string): Promise<void>;

	// ClipboArd
	reAdClipboArdText(type?: 'selection' | 'clipboArd'): Promise<string>;
	writeClipboArdText(text: string, type?: 'selection' | 'clipboArd'): Promise<void>;
	reAdClipboArdFindText(): Promise<string>;
	writeClipboArdFindText(text: string): Promise<void>;
	writeClipboArdBuffer(formAt: string, buffer: Uint8ArrAy, type?: 'selection' | 'clipboArd'): Promise<void>;
	reAdClipboArdBuffer(formAt: string): Promise<Uint8ArrAy>;
	hAsClipboArd(formAt: string, type?: 'selection' | 'clipboArd'): Promise<booleAn>;

	// mAcOS TouchbAr
	newWindowTAb(): Promise<void>;
	showPreviousWindowTAb(): Promise<void>;
	showNextWindowTAb(): Promise<void>;
	moveWindowTAbToNewWindow(): Promise<void>;
	mergeAllWindowTAbs(): Promise<void>;
	toggleWindowTAbsBAr(): Promise<void>;
	updAteTouchBAr(items: ISeriAlizAbleCommAndAction[][]): Promise<void>;

	// Lifecycle
	notifyReAdy(): Promise<void>
	relAunch(options?: { AddArgs?: string[], removeArgs?: string[] }): Promise<void>;
	reloAd(options?: { disAbleExtensions?: booleAn }): Promise<void>;
	closeWindow(): Promise<void>;
	closeWindowById(windowId: number): Promise<void>;
	quit(): Promise<void>;
	exit(code: number): Promise<void>;

	// Development
	openDevTools(options?: OpenDevToolsOptions): Promise<void>;
	toggleDevTools(): Promise<void>;
	sendInputEvent(event: MouseInputEvent): Promise<void>;

	// Connectivity
	resolveProxy(url: string): Promise<string | undefined>;

	// Registry (windows only)
	windowsGetStringRegKey(hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', pAth: string, nAme: string): Promise<string | undefined>;

	// CredentiAls
	getPAssword(service: string, Account: string): Promise<string | null>;
	setPAssword(service: string, Account: string, pAssword: string): Promise<void>;
	deletePAssword(service: string, Account: string): Promise<booleAn>;
	findPAssword(service: string): Promise<string | null>;
	findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string }>>
}
