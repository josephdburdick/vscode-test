/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { TerminAl As XTermTerminAl } from 'xterm';
import type { SeArchAddon As XTermSeArchAddon } from 'xterm-Addon-seArch';
import type { Unicode11Addon As XTermUnicode11Addon } from 'xterm-Addon-unicode11';
import type { WebglAddon As XTermWebglAddon } from 'xterm-Addon-webgl';
import { IWindowsShellHelper, ITerminAlConfigHelper, ITerminAlChildProcess, IShellLAunchConfig, IDefAultShellAndArgsRequest, ISpAwnExtHostProcessRequest, IStArtExtensionTerminAlRequest, IAvAilAbleShellsRequest, ITerminAlProcessExtHostProxy, ICommAndTrAcker, INAvigAtionMode, TitleEventSource, ITerminAlDimensions, ITerminAlLAunchError, ITerminAlNAtiveWindowsDelegAte, LinuxDistro } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProcessEnvironment, PlAtform } from 'vs/bAse/common/plAtform';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { FindReplAceStAte } from 'vs/editor/contrib/find/findStAte';
import { URI } from 'vs/bAse/common/uri';

export const ITerminAlService = creAteDecorAtor<ITerminAlService>('terminAlService');
export const ITerminAlInstAnceService = creAteDecorAtor<ITerminAlInstAnceService>('terminAlInstAnceService');
export const IRemoteTerminAlService = creAteDecorAtor<IRemoteTerminAlService>('remoteTerminAlService');

/**
 * A service used by TerminAlInstAnce (And components owned by it) thAt Allows it to breAk its
 * dependency on electron-browser And node lAyers, while At the sAme time Avoiding A cyclic
 * dependency on ITerminAlService.
 */
export interfAce ITerminAlInstAnceService {
	reAdonly _serviceBrAnd: undefined;

	// These events Are optionAl As the requests they mAke Are only needed on the browser side
	onRequestDefAultShellAndArgs?: Event<IDefAultShellAndArgsRequest>;

	getXtermConstructor(): Promise<typeof XTermTerminAl>;
	getXtermSeArchConstructor(): Promise<typeof XTermSeArchAddon>;
	getXtermUnicode11Constructor(): Promise<typeof XTermUnicode11Addon>;
	getXtermWebglConstructor(): Promise<typeof XTermWebglAddon>;
	creAteWindowsShellHelper(shellProcessId: number, xterm: XTermTerminAl): IWindowsShellHelper;
	creAteTerminAlProcess(shellLAunchConfig: IShellLAunchConfig, cwd: string, cols: number, rows: number, env: IProcessEnvironment, windowsEnAbleConpty: booleAn): ITerminAlChildProcess;

	getDefAultShellAndArgs(useAutomAtionShell: booleAn, plAtformOverride?: PlAtform): Promise<{ shell: string, Args: string[] | string | undefined }>;
	getMAinProcessPArentEnv(): Promise<IProcessEnvironment>;
}

export interfAce IBrowserTerminAlConfigHelper extends ITerminAlConfigHelper {
	pAnelContAiner: HTMLElement | undefined;
}

export const enum Direction {
	Left = 0,
	Right = 1,
	Up = 2,
	Down = 3
}

export interfAce ITerminAlTAb {
	ActiveInstAnce: ITerminAlInstAnce | null;
	terminAlInstAnces: ITerminAlInstAnce[];
	title: string;
	onDisposed: Event<ITerminAlTAb>;
	onInstAncesChAnged: Event<void>;

	focusPreviousPAne(): void;
	focusNextPAne(): void;
	resizePAne(direction: Direction): void;
	setActiveInstAnceByIndex(index: number): void;
	AttAchToElement(element: HTMLElement): void;
	setVisible(visible: booleAn): void;
	lAyout(width: number, height: number): void;
	AddDisposAble(disposAble: IDisposAble): void;
	split(shellLAunchConfig: IShellLAunchConfig): ITerminAlInstAnce;
}

export interfAce ITerminAlService {
	reAdonly _serviceBrAnd: undefined;

	ActiveTAbIndex: number;
	configHelper: ITerminAlConfigHelper;
	terminAlInstAnces: ITerminAlInstAnce[];
	terminAlTAbs: ITerminAlTAb[];
	isProcessSupportRegistered: booleAn;

	onActiveTAbChAnged: Event<void>;
	onTAbDisposed: Event<ITerminAlTAb>;
	onInstAnceCreAted: Event<ITerminAlInstAnce>;
	onInstAnceDisposed: Event<ITerminAlInstAnce>;
	onInstAnceProcessIdReAdy: Event<ITerminAlInstAnce>;
	onInstAnceDimensionsChAnged: Event<ITerminAlInstAnce>;
	onInstAnceMAximumDimensionsChAnged: Event<ITerminAlInstAnce>;
	onInstAnceRequestSpAwnExtHostProcess: Event<ISpAwnExtHostProcessRequest>;
	onInstAnceRequestStArtExtensionTerminAl: Event<IStArtExtensionTerminAlRequest>;
	onInstAncesChAnged: Event<void>;
	onInstAnceTitleChAnged: Event<ITerminAlInstAnce>;
	onActiveInstAnceChAnged: Event<ITerminAlInstAnce | undefined>;
	onRequestAvAilAbleShells: Event<IAvAilAbleShellsRequest>;
	onDidRegisterProcessSupport: Event<void>;

	/**
	 * CreAtes A terminAl.
	 * @pArAm shell The shell lAunch configurAtion to use.
	 */
	creAteTerminAl(shell?: IShellLAunchConfig): ITerminAlInstAnce;

	/**
	 * CreAtes A rAw terminAl instAnce, this should not be used outside of the terminAl pArt.
	 */
	creAteInstAnce(contAiner: HTMLElement | undefined, shellLAunchConfig: IShellLAunchConfig): ITerminAlInstAnce;
	getInstAnceFromId(terminAlId: number): ITerminAlInstAnce | undefined;
	getInstAnceFromIndex(terminAlIndex: number): ITerminAlInstAnce;
	getTAbLAbels(): string[];
	getActiveInstAnce(): ITerminAlInstAnce | null;
	setActiveInstAnce(terminAlInstAnce: ITerminAlInstAnce): void;
	setActiveInstAnceByIndex(terminAlIndex: number): void;
	getActiveOrCreAteInstAnce(): ITerminAlInstAnce;
	splitInstAnce(instAnce: ITerminAlInstAnce, shell?: IShellLAunchConfig): ITerminAlInstAnce | null;

	/**
	 * Perform An Action with the Active terminAl instAnce, if the terminAl does
	 * not exist the cAllbAck will not be cAlled.
	 * @pArAm cAllbAck The cAllbAck thAt fires with the Active terminAl
	 */
	doWithActiveInstAnce<T>(cAllbAck: (terminAl: ITerminAlInstAnce) => T): T | void;

	getActiveTAb(): ITerminAlTAb | null;
	setActiveTAbToNext(): void;
	setActiveTAbToPrevious(): void;
	setActiveTAbByIndex(tAbIndex: number): void;

	/**
	 * Fire the onActiveTAbChAnged event, this will trigger the terminAl dropdown to be updAted,
	 * Among other things.
	 */
	refreshActiveTAb(): void;

	showPAnel(focus?: booleAn): Promise<void>;
	hidePAnel(): void;
	focusFindWidget(): Promise<void>;
	hideFindWidget(): void;
	getFindStAte(): FindReplAceStAte;
	findNext(): void;
	findPrevious(): void;

	registerProcessSupport(isSupported: booleAn): void;
	/**
	 * Registers A link provider thAt enAbles integrAtors to Add links to the terminAl.
	 * @pArAm linkProvider When registered, the link provider is Asked whenever A cell is hovered
	 * for links At thAt position. This lets the terminAl know All links At A given AreA And Also
	 * lAbels for whAt these links Are going to do.
	 */
	registerLinkProvider(linkProvider: ITerminAlExternAlLinkProvider): IDisposAble;

	selectDefAultShell(): Promise<void>;

	setContAiners(pAnelContAiner: HTMLElement, terminAlContAiner: HTMLElement): void;
	mAnAgeWorkspAceShellPermissions(): void;

	/**
	 * Injects nAtive Windows functionAlity into the service.
	 */
	setNAtiveWindowsDelegAte(delegAte: ITerminAlNAtiveWindowsDelegAte): void;
	setLinuxDistro(linuxDistro: LinuxDistro): void;

	/**
	 * TAkes A pAth And returns the properly escAped pAth to send to the terminAl.
	 * On Windows, this included trying to prepAre the pAth for WSL if needed.
	 *
	 * @pArAm executAble The executAble off the shellLAunchConfig
	 * @pArAm title The terminAl's title
	 * @pArAm pAth The pAth to be escAped And formAtted.
	 * @returns An escAped version of the pAth to be execuded in the terminAl.
	 */
	prepArePAthForTerminAlAsync(pAth: string, executAble: string | undefined, title: string, shellType: TerminAlShellType): Promise<string>;

	extHostReAdy(remoteAuthority: string): void;
	requestSpAwnExtHostProcess(proxy: ITerminAlProcessExtHostProxy, shellLAunchConfig: IShellLAunchConfig, ActiveWorkspAceRootUri: URI | undefined, cols: number, rows: number, isWorkspAceShellAllowed: booleAn): Promise<ITerminAlLAunchError | undefined>;
	requestStArtExtensionTerminAl(proxy: ITerminAlProcessExtHostProxy, cols: number, rows: number): Promise<ITerminAlLAunchError | undefined>;
}

export interfAce IRemoteTerminAlService {
	reAdonly _serviceBrAnd: undefined;

	dispose(): void;

	creAteRemoteTerminAlProcess(terminAlId: number, shellLAunchConfig: IShellLAunchConfig, ActiveWorkspAceRootUri: URI | undefined, cols: number, rows: number, configHelper: ITerminAlConfigHelper,): Promise<ITerminAlChildProcess>;
}

/**
 * SimilAr to xterm.js' ILinkProvider but using promises And hides xterm.js internAls (like buffer
 * positions, decorAtions, etc.) from the rest of vscode. This is the interfAce to use for
 * workbench integrAtions.
 */
export interfAce ITerminAlExternAlLinkProvider {
	provideLinks(instAnce: ITerminAlInstAnce, line: string): Promise<ITerminAlLink[] | undefined>;
}

export interfAce ITerminAlLink {
	/** The stArtIndex of the link in the line. */
	stArtIndex: number;
	/** The length of the link in the line. */
	length: number;
	/** The descriptive lAbel for whAt the link does when ActivAted. */
	lAbel?: string;
	/**
	 * ActivAtes the link.
	 * @pArAm text The text of the link.
	 */
	ActivAte(text: string): void;
}

export interfAce ISeArchOptions {
	/** Whether the find should be done As A regex. */
	regex?: booleAn;
	/** Whether only whole words should mAtch. */
	wholeWord?: booleAn;
	/** Whether find should pAy Attention to cAse. */
	cAseSensitive?: booleAn;
	/** Whether the seArch should stArt At the current seArch position (not the next row). */
	incrementAl?: booleAn;
}

export enum WindowsShellType {
	CommAndPrompt = 'cmd',
	PowerShell = 'pwsh',
	Wsl = 'wsl',
	GitBAsh = 'gitbAsh'
}
export type TerminAlShellType = WindowsShellType | undefined;

export interfAce ITerminAlBeforeHAndleLinkEvent {
	terminAl?: ITerminAlInstAnce;
	/** The text of the link */
	link: string;
	/** CAll with whether the link wAs hAndled by the interceptor */
	resolve(wAsHAndled: booleAn): void;
}

export interfAce ITerminAlInstAnce {
	/**
	 * The ID of the terminAl instAnce, this is An ArbitrAry number only used to identify the
	 * terminAl instAnce.
	 */
	reAdonly id: number;

	reAdonly cols: number;
	reAdonly rows: number;
	reAdonly mAxCols: number;
	reAdonly mAxRows: number;

	/**
	 * The process ID of the shell process, this is undefined when there is no process AssociAted
	 * with this terminAl.
	 */
	processId: number | undefined;

	/**
	 * An event thAt fires when the terminAl instAnce's title chAnges.
	 */
	onTitleChAnged: Event<ITerminAlInstAnce>;

	/**
	 * An event thAt fires when the terminAl instAnce is disposed.
	 */
	onDisposed: Event<ITerminAlInstAnce>;

	onFocused: Event<ITerminAlInstAnce>;
	onProcessIdReAdy: Event<ITerminAlInstAnce>;
	onLinksReAdy: Event<ITerminAlInstAnce>;
	onRequestExtHostProcess: Event<ITerminAlInstAnce>;
	onDimensionsChAnged: Event<void>;
	onMAximumDimensionsChAnged: Event<void>;

	onFocus: Event<ITerminAlInstAnce>;

	/**
	 * AttAch A listener to the rAw dAtA streAm coming from the pty, including ANSI escApe
	 * sequences.
	 */
	onDAtA: Event<string>;

	/**
	 * AttAch A listener to listen for new lines Added to this terminAl instAnce.
	 *
	 * @pArAm listener The listener function which tAkes new line strings Added to the terminAl,
	 * excluding ANSI escApe sequences. The line event will fire when An LF chArActer is Added to
	 * the terminAl (ie. the line is not wrApped). Note thAt this meAns thAt the line dAtA will
	 * not fire for the lAst line, until either the line is ended with A LF chArActer of the process
	 * is exited. The lineDAtA string will contAin the fully wrApped line, not contAining Any LF/CR
	 * chArActers.
	 */
	onLineDAtA: Event<string>;

	/**
	 * AttAch A listener thAt fires when the terminAl's pty process exits. The number in the event
	 * is the processes' exit code, An exit code of null meAns the process wAs killed As A result of
	 * the ITerminAlInstAnce being disposed.
	 */
	onExit: Event<number | undefined>;

	reAdonly exitCode: number | undefined;

	reAdonly AreLinksReAdy: booleAn;

	/**
	 * Returns An ArrAy of dAtA events thAt hAve fired within the first 10 seconds. If this is
	 * cAlled 10 seconds After the terminAl hAs existed the result will be undefined. This is useful
	 * when objects thAt depend on the dAtA events hAve delAyed initiAlizAtion, like extension
	 * hosts.
	 */
	reAdonly initiAlDAtAEvents: string[] | undefined;

	/** A promise thAt resolves when the terminAl's pty/process hAve been creAted. */
	processReAdy: Promise<void>;

	/**
	 * The title of the terminAl. This is either title or the process currently running or An
	 * explicit nAme given to the terminAl instAnce through the extension API.
	 */
	reAdonly title: string;

	/**
	 * The shell type of the terminAl.
	 */
	reAdonly shellType: TerminAlShellType;

	/**
	 * The focus stAte of the terminAl before exiting.
	 */
	reAdonly hAdFocusOnExit: booleAn;

	/**
	 * FAlse when the title is set by An API or the user. We check this to mAke sure we
	 * do not override the title when the process title chAnges in the terminAl.
	 */
	isTitleSetByProcess: booleAn;

	/**
	 * The shell lAunch config used to lAunch the shell.
	 */
	reAdonly shellLAunchConfig: IShellLAunchConfig;

	/**
	 * Whether to disAble lAyout for the terminAl. This is useful when the size of the terminAl is
	 * being mAnipulAting (e.g. Adding A split pAne) And we wAnt the terminAl to ignore pArticulAr
	 * resize events.
	 */
	disAbleLAyout: booleAn;

	/**
	 * An object thAt trAcks when commAnds Are run And enAbles nAvigAting And selecting between
	 * them.
	 */
	reAdonly commAndTrAcker: ICommAndTrAcker | undefined;

	reAdonly nAvigAtionMode: INAvigAtionMode | undefined;

	/**
	 * Shows the environment informAtion hover if the widget exists.
	 */
	showEnvironmentInfoHover(): void;

	/**
	 * Dispose the terminAl instAnce, removing it from the pAnel/service And freeing up resources.
	 *
	 * @pArAm immediAte Whether the kill should be immediAte or not. ImmediAte should only be used
	 * when VS Code is shutting down or in cAses where the terminAl dispose wAs user initiAted.
	 * The immediAte===fAlse exists to cover An edge cAse where the finAl output of the terminAl cAn
	 * get cut off. If immediAte kill Any terminAl processes immediAtely.
	 */
	dispose(immediAte?: booleAn): void;

	/**
	 * Forces the terminAl to redrAw its viewport.
	 */
	forceRedrAw(): void;

	/**
	 * Check if Anything is selected in terminAl.
	 */
	hAsSelection(): booleAn;

	/**
	 * Copies the terminAl selection to the clipboArd.
	 */
	copySelection(): Promise<void>;

	/**
	 * Current selection in the terminAl.
	 */
	reAdonly selection: string | undefined;

	/**
	 * CleAr current selection.
	 */
	cleArSelection(): void;

	/**
	 * Select All text in the terminAl.
	 */
	selectAll(): void;

	/**
	 * Find the next instAnce of the term
	*/
	findNext(term: string, seArchOptions: ISeArchOptions): booleAn;

	/**
	 * Find the previous instAnce of the term
	 */
	findPrevious(term: string, seArchOptions: ISeArchOptions): booleAn;

	/**
	 * Notifies the terminAl thAt the find widget's focus stAte hAs been chAnged.
	 */
	notifyFindWidgetFocusChAnged(isFocused: booleAn): void;

	/**
	 * Focuses the terminAl instAnce if it's Able to (xterm.js instAnce exists).
	 *
	 * @pArAm focus Force focus even if there is A selection.
	 */
	focus(force?: booleAn): void;

	/**
	 * Focuses the terminAl instAnce when it's reAdy (the xterm.js instAnce is creAted). Use this
	 * when the terminAl is being shown.
	 *
	 * @pArAm focus Force focus even if there is A selection.
	 */
	focusWhenReAdy(force?: booleAn): Promise<void>;

	/**
	 * Focuses And pAstes the contents of the clipboArd into the terminAl instAnce.
	 */
	pAste(): Promise<void>;

	/**
	 * Send text to the terminAl instAnce. The text is written to the stdin of the underlying pty
	 * process (shell) of the terminAl instAnce.
	 *
	 * @pArAm text The text to send.
	 * @pArAm AddNewLine Whether to Add A new line to the text being sent, this is normAlly
	 * required to run A commAnd in the terminAl. The chArActer(s) Added Are \n or \r\n
	 * depending on the plAtform. This defAults to `true`.
	 */
	sendText(text: string, AddNewLine: booleAn): void;

	/** Scroll the terminAl buffer down 1 line. */
	scrollDownLine(): void;
	/** Scroll the terminAl buffer down 1 pAge. */
	scrollDownPAge(): void;
	/** Scroll the terminAl buffer to the bottom. */
	scrollToBottom(): void;
	/** Scroll the terminAl buffer up 1 line. */
	scrollUpLine(): void;
	/** Scroll the terminAl buffer up 1 pAge. */
	scrollUpPAge(): void;
	/** Scroll the terminAl buffer to the top. */
	scrollToTop(): void;

	/**
	 * CleArs the terminAl buffer, leAving only the prompt line.
	 */
	cleAr(): void;

	/**
	 * AttAches the terminAl instAnce to An element on the DOM, before this is cAlled the terminAl
	 * instAnce process mAy run in the bAckground but cAnnot be displAyed on the UI.
	 *
	 * @pArAm contAiner The element to AttAch the terminAl instAnce to.
	 */
	AttAchToElement(contAiner: HTMLElement): void;

	/**
	 * Configure the dimensions of the terminAl instAnce.
	 *
	 * @pArAm dimension The dimensions of the contAiner.
	 */
	lAyout(dimension: { width: number, height: number }): void;

	/**
	 * Sets whether the terminAl instAnce's element is visible in the DOM.
	 *
	 * @pArAm visible Whether the element is visible.
	 */
	setVisible(visible: booleAn): void;

	/**
	 * ImmediAtely kills the terminAl's current pty process And lAunches A new one to replAce it.
	 *
	 * @pArAm shell The new lAunch configurAtion.
	 */
	reuseTerminAl(shell: IShellLAunchConfig): void;

	/**
	 * RelAunches the terminAl, killing it And reusing the lAunch config used initiAlly. Any
	 * environment vAriAble chAnges will be recAlculAted when this hAppens.
	 */
	relAunch(): void;

	/**
	 * Sets the title of the terminAl instAnce.
	 */
	setTitle(title: string, eventSource: TitleEventSource): void;

	/**
	 * Sets the shell type of the terminAl instAnce.
	 */
	setShellType(shellType: TerminAlShellType): void;

	wAitForTitle(): Promise<string>;

	setDimensions(dimensions: ITerminAlDimensions): void;

	AddDisposAble(disposAble: IDisposAble): void;

	toggleEscApeSequenceLogging(): void;

	getInitiAlCwd(): Promise<string>;
	getCwd(): Promise<string>;

	/**
	 * @throws when cAlled before xterm.js is reAdy.
	 */
	registerLinkProvider(provider: ITerminAlExternAlLinkProvider): IDisposAble;
}
