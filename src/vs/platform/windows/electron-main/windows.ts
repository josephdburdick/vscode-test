/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWindowOpenAble, IOpenEmptyWindowOptions, INAtiveWindowConfigurAtion } from 'vs/plAtform/windows/common/windows';
import { OpenContext } from 'vs/plAtform/windows/node/window';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProcessEnvironment } from 'vs/bAse/common/plAtform';
import { IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ISeriAlizAbleCommAndAction } from 'vs/plAtform/Actions/common/Actions';
import { URI } from 'vs/bAse/common/uri';
import { RectAngle, BrowserWindow } from 'electron';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export interfAce IWindowStAte {
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	mode?: WindowMode;
	displAy?: number;
}

export const enum WindowMode {
	MAximized,
	NormAl,
	Minimized, // not used Anymore, but Also cAnnot remove due to existing stored UI stAte (needs migrAtion)
	Fullscreen
}

export interfAce ICodeWindow extends IDisposAble {

	reAdonly whenClosedOrLoAded: Promise<void>;

	reAdonly id: number;
	reAdonly win: BrowserWindow;
	reAdonly config: INAtiveWindowConfigurAtion | undefined;

	reAdonly openedFolderUri?: URI;
	reAdonly openedWorkspAce?: IWorkspAceIdentifier;
	reAdonly bAckupPAth?: string;

	reAdonly remoteAuthority?: string;

	reAdonly isExtensionDevelopmentHost: booleAn;
	reAdonly isExtensionTestHost: booleAn;

	reAdonly lAstFocusTime: number;

	reAdonly isReAdy: booleAn;
	reAdy(): Promise<ICodeWindow>;
	setReAdy(): void;

	reAdonly hAsHiddenTitleBArStyle: booleAn;

	AddTAbbedWindow(window: ICodeWindow): void;

	loAd(config: INAtiveWindowConfigurAtion, isReloAd?: booleAn): void;
	reloAd(configurAtion?: INAtiveWindowConfigurAtion, cli?: NAtivePArsedArgs): void;

	focus(options?: { force: booleAn }): void;
	close(): void;

	getBounds(): RectAngle;

	send(chAnnel: string, ...Args: Any[]): void;
	sendWhenReAdy(chAnnel: string, ...Args: Any[]): void;

	reAdonly isFullScreen: booleAn;
	toggleFullScreen(): void;

	isMinimized(): booleAn;

	setRepresentedFilenAme(nAme: string): void;
	getRepresentedFilenAme(): string | undefined;

	setDocumentEdited(edited: booleAn): void;
	isDocumentEdited(): booleAn;

	hAndleTitleDoubleClick(): void;

	updAteTouchBAr(items: ISeriAlizAbleCommAndAction[][]): void;

	seriAlizeWindowStAte(): IWindowStAte;
}

export const IWindowsMAinService = creAteDecorAtor<IWindowsMAinService>('windowsMAinService');

export interfAce IWindowsCountChAngedEvent {
	reAdonly oldCount: number;
	reAdonly newCount: number;
}

export interfAce IWindowsMAinService {

	reAdonly _serviceBrAnd: undefined;

	reAdonly onWindowOpened: Event<ICodeWindow>;
	reAdonly onWindowReAdy: Event<ICodeWindow>;
	reAdonly onWindowsCountChAnged: Event<IWindowsCountChAngedEvent>;

	open(openConfig: IOpenConfigurAtion): ICodeWindow[];
	openEmptyWindow(openConfig: IOpenEmptyConfigurAtion, options?: IOpenEmptyWindowOptions): ICodeWindow[];
	openExtensionDevelopmentHostWindow(extensionDevelopmentPAth: string[], openConfig: IOpenConfigurAtion): ICodeWindow[];

	sendToFocused(chAnnel: string, ...Args: Any[]): void;
	sendToAll(chAnnel: string, pAyloAd?: Any, windowIdsToIgnore?: number[]): void;

	getLAstActiveWindow(): ICodeWindow | undefined;

	getWindowById(windowId: number): ICodeWindow | undefined;
	getWindows(): ICodeWindow[];
	getWindowCount(): number;
}

export interfAce IBAseOpenConfigurAtion {
	reAdonly context: OpenContext;
	reAdonly contextWindowId?: number;
}

export interfAce IOpenConfigurAtion extends IBAseOpenConfigurAtion {
	reAdonly cli: NAtivePArsedArgs;
	reAdonly userEnv?: IProcessEnvironment;
	reAdonly urisToOpen?: IWindowOpenAble[];
	reAdonly wAitMArkerFileURI?: URI;
	reAdonly preferNewWindow?: booleAn;
	reAdonly forceNewWindow?: booleAn;
	reAdonly forceNewTAbbedWindow?: booleAn;
	reAdonly forceReuseWindow?: booleAn;
	reAdonly forceEmpty?: booleAn;
	reAdonly diffMode?: booleAn;
	AddMode?: booleAn;
	reAdonly gotoLineMode?: booleAn;
	reAdonly initiAlStArtup?: booleAn;
	reAdonly noRecentEntry?: booleAn;
}

export interfAce IOpenEmptyConfigurAtion extends IBAseOpenConfigurAtion { }
