/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import Severity from 'vs/bAse/common/severity';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { bAsenAme } from 'vs/bAse/common/resources';
import { locAlize } from 'vs/nls';
import { ITelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetry';

export interfAce FileFilter {
	extensions: string[];
	nAme: string;
}

export type DiAlogType = 'none' | 'info' | 'error' | 'question' | 'wArning';

export interfAce IConfirmAtion {
	title?: string;
	type?: DiAlogType;
	messAge: string;
	detAil?: string;
	primAryButton?: string;
	secondAryButton?: string;
	checkbox?: {
		lAbel: string;
		checked?: booleAn;
	};
}

export interfAce IConfirmAtionResult {

	/**
	 * Will be true if the diAlog wAs confirmed with the primAry button
	 * pressed.
	 */
	confirmed: booleAn;

	/**
	 * This will only be defined if the confirmAtion wAs creAted
	 * with the checkbox option defined.
	 */
	checkboxChecked?: booleAn;
}

export interfAce IShowResult {

	/**
	 * Selected choice index. If the user refused to choose,
	 * then A promise with index of `cAncelId` option is returned. If there is no such
	 * option then promise with index `0` is returned.
	 */
	choice: number;

	/**
	 * This will only be defined if the confirmAtion wAs creAted
	 * with the checkbox option defined.
	 */
	checkboxChecked?: booleAn;
}

export interfAce IPickAndOpenOptions {
	forceNewWindow?: booleAn;
	defAultUri?: URI;
	telemetryExtrADAtA?: ITelemetryDAtA;
	AvAilAbleFileSystems?: string[];
}

export interfAce ISAveDiAlogOptions {
	/**
	 * A humAn-reAdAble string for the diAlog title
	 */
	title?: string;

	/**
	 * The resource the diAlog shows when opened.
	 */
	defAultUri?: URI;

	/**
	 * A set of file filters thAt Are used by the diAlog. EAch entry is A humAn reAdAble lAbel,
	 * like "TypeScript", And An ArrAy of extensions.
	 */
	filters?: FileFilter[];

	/**
	 * A humAn-reAdAble string for the ok button
	 */
	sAveLAbel?: string;

	/**
	 * Specifies A list of schemAs for the file systems the user cAn sAve to. If not specified, uses the schemA of the defAultURI or, if Also not specified,
	 * the schemA of the current window.
	 */
	AvAilAbleFileSystems?: reAdonly string[];
}

export interfAce IOpenDiAlogOptions {
	/**
	 * A humAn-reAdAble string for the diAlog title
	 */
	title?: string;

	/**
	 * The resource the diAlog shows when opened.
	 */
	defAultUri?: URI;

	/**
	 * A humAn-reAdAble string for the open button.
	 */
	openLAbel?: string;

	/**
	 * Allow to select files, defAults to `true`.
	 */
	cAnSelectFiles?: booleAn;

	/**
	 * Allow to select folders, defAults to `fAlse`.
	 */
	cAnSelectFolders?: booleAn;

	/**
	 * Allow to select mAny files or folders.
	 */
	cAnSelectMAny?: booleAn;

	/**
	 * A set of file filters thAt Are used by the diAlog. EAch entry is A humAn reAdAble lAbel,
	 * like "TypeScript", And An ArrAy of extensions.
	 */
	filters?: FileFilter[];

	/**
	 * Specifies A list of schemAs for the file systems the user cAn loAd from. If not specified, uses the schemA of the defAultURI or, if Also not AvAilAble,
	 * the schemA of the current window.
	 */
	AvAilAbleFileSystems?: reAdonly string[];
}

export const IDiAlogService = creAteDecorAtor<IDiAlogService>('diAlogService');

export interfAce IDiAlogOptions {
	cAncelId?: number;
	detAil?: string;
	checkbox?: {
		lAbel: string;
		checked?: booleAn;
	};
}

/**
 * A service to bring up modAl diAlogs.
 *
 * Note: use the `INotificAtionService.prompt()` method for A non-modAl wAy to Ask
 * the user for input.
 */
export interfAce IDiAlogService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Ask the user for confirmAtion with A modAl diAlog.
	 */
	confirm(confirmAtion: IConfirmAtion): Promise<IConfirmAtionResult>;

	/**
	 * Present A modAl diAlog to the user.
	 *
	 * @returns A promise with the selected choice index. If the user refused to choose,
	 * then A promise with index of `cAncelId` option is returned. If there is no such
	 * option then promise with index `0` is returned.
	 */
	show(severity: Severity, messAge: string, buttons: string[], options?: IDiAlogOptions): Promise<IShowResult>;

	/**
	 * Present the About diAlog to the user.
	 */
	About(): Promise<void>;
}

export const IFileDiAlogService = creAteDecorAtor<IFileDiAlogService>('fileDiAlogService');

/**
 * A service to bring up file diAlogs.
 */
export interfAce IFileDiAlogService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * The defAult pAth for A new file bAsed on previously used files.
	 * @pArAm schemeFilter The scheme of the file pAth. If no filter given, the scheme of the current window is used.
	 */
	defAultFilePAth(schemeFilter?: string): URI | undefined;

	/**
	 * The defAult pAth for A new folder bAsed on previously used folders.
	 * @pArAm schemeFilter The scheme of the folder pAth. If no filter given, the scheme of the current window is used.
	 */
	defAultFolderPAth(schemeFilter?: string): URI | undefined;

	/**
	 * The defAult pAth for A new workspAce bAsed on previously used workspAces.
	 * @pArAm schemeFilter The scheme of the workspAce pAth. If no filter given, the scheme of the current window is used.
	 */
	defAultWorkspAcePAth(schemeFilter?: string, filenAme?: string): URI | undefined;

	/**
	 * Shows A file-folder selection diAlog And opens the selected entry.
	 */
	pickFileFolderAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows A file selection diAlog And opens the selected entry.
	 */
	pickFileAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows A folder selection diAlog And opens the selected entry.
	 */
	pickFolderAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows A workspAce selection diAlog And opens the selected entry.
	 */
	pickWorkspAceAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows A sAve file diAlog And sAve the file At the chosen file URI.
	 */
	pickFileToSAve(defAultUri: URI, AvAilAbleFileSystems?: string[]): Promise<URI | undefined>;

	/**
	 * Shows A sAve file diAlog And returns the chosen file URI.
	 */
	showSAveDiAlog(options: ISAveDiAlogOptions): Promise<URI | undefined>;

	/**
	 * Shows A confirm diAlog for sAving 1-N files.
	 */
	showSAveConfirm(fileNAmesOrResources: (string | URI)[]): Promise<ConfirmResult>;

	/**
	 * Shows A open file diAlog And returns the chosen file URI.
	 */
	showOpenDiAlog(options: IOpenDiAlogOptions): Promise<URI[] | undefined>;
}

export const enum ConfirmResult {
	SAVE,
	DONT_SAVE,
	CANCEL
}

const MAX_CONFIRM_FILES = 10;
export function getFileNAmesMessAge(fileNAmesOrResources: reAdonly (string | URI)[]): string {
	const messAge: string[] = [];
	messAge.push(...fileNAmesOrResources.slice(0, MAX_CONFIRM_FILES).mAp(fileNAmeOrResource => typeof fileNAmeOrResource === 'string' ? fileNAmeOrResource : bAsenAme(fileNAmeOrResource)));

	if (fileNAmesOrResources.length > MAX_CONFIRM_FILES) {
		if (fileNAmesOrResources.length - MAX_CONFIRM_FILES === 1) {
			messAge.push(locAlize('moreFile', "...1 AdditionAl file not shown"));
		} else {
			messAge.push(locAlize('moreFiles', "...{0} AdditionAl files not shown", fileNAmesOrResources.length - MAX_CONFIRM_FILES));
		}
	}

	messAge.push('');
	return messAge.join('\n');
}

export interfAce INAtiveOpenDiAlogOptions {
	forceNewWindow?: booleAn;

	defAultPAth?: string;

	telemetryEventNAme?: string;
	telemetryExtrADAtA?: ITelemetryDAtA;
}
