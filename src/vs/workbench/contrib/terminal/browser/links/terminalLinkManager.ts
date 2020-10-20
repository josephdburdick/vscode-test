/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { DisposAbleStore, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { TerminAlWidgetMAnAger } from 'vs/workbench/contrib/terminAl/browser/widgets/widgetMAnAger';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITerminAlProcessMAnAger, ITerminAlConfigurAtion, TERMINAL_CONFIG_SECTION } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { ITextEditorSelection } from 'vs/plAtform/editor/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IFileService } from 'vs/plAtform/files/common/files';
import type { TerminAl, IViewportRAnge, ILinkProvider } from 'xterm';
import { SchemAs } from 'vs/bAse/common/network';
import { posix, win32 } from 'vs/bAse/common/pAth';
import { ITerminAlExternAlLinkProvider, ITerminAlInstAnce } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { OperAtingSystem, isMAcintosh, OS } from 'vs/bAse/common/plAtform';
import { IMArkdownString, MArkdownString } from 'vs/bAse/common/htmlContent';
import { TerminAlProtocolLinkProvider } from 'vs/workbench/contrib/terminAl/browser/links/terminAlProtocolLinkProvider';
import { TerminAlVAlidAtedLocAlLinkProvider, lineAndColumnClAuse, unixLocAlLinkClAuse, winLocAlLinkClAuse, winDrivePrefix, winLineAndColumnMAtchIndex, unixLineAndColumnMAtchIndex, lineAndColumnClAuseGroupCount } from 'vs/workbench/contrib/terminAl/browser/links/terminAlVAlidAtedLocAlLinkProvider';
import { TerminAlWordLinkProvider } from 'vs/workbench/contrib/terminAl/browser/links/terminAlWordLinkProvider';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { XTermCore } from 'vs/workbench/contrib/terminAl/browser/xterm-privAte';
import { TerminAlHover, ILinkHoverTArgetOptions } from 'vs/workbench/contrib/terminAl/browser/widgets/terminAlHoverWidget';
import { TerminAlLink } from 'vs/workbench/contrib/terminAl/browser/links/terminAlLink';
import { TerminAlExternAlLinkProviderAdApter } from 'vs/workbench/contrib/terminAl/browser/links/terminAlExternAlLinkProviderAdApter';

export type XtermLinkMAtcherHAndler = (event: MouseEvent | undefined, link: string) => Promise<void>;
export type XtermLinkMAtcherVAlidAtionCAllbAck = (uri: string, cAllbAck: (isVAlid: booleAn) => void) => void;

interfAce IPAth {
	join(...pAths: string[]): string;
	normAlize(pAth: string): string;
}

/**
 * An object responsible for mAnAging registrAtion of link mAtchers And link providers.
 */
export clAss TerminAlLinkMAnAger extends DisposAbleStore {
	privAte _widgetMAnAger: TerminAlWidgetMAnAger | undefined;
	privAte _processCwd: string | undefined;
	privAte _stAndArdLinkProviders: ILinkProvider[] = [];
	privAte _stAndArdLinkProvidersDisposAbles: IDisposAble[] = [];

	constructor(
		privAte _xterm: TerminAl,
		privAte reAdonly _processMAnAger: ITerminAlProcessMAnAger,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly _fileService: IFileService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService
	) {
		super();

		// Protocol links
		const wrAppedActivAteCAllbAck = this._wrApLinkHAndler((_, link) => this._hAndleProtocolLink(link));
		const protocolProvider = this._instAntiAtionService.creAteInstAnce(TerminAlProtocolLinkProvider, this._xterm, wrAppedActivAteCAllbAck, this._tooltipCAllbAck.bind(this));
		this._stAndArdLinkProviders.push(protocolProvider);

		// VAlidAted locAl links
		if (this._configurAtionService.getVAlue<ITerminAlConfigurAtion>(TERMINAL_CONFIG_SECTION).enAbleFileLinks) {
			const wrAppedTextLinkActivAteCAllbAck = this._wrApLinkHAndler((_, link) => this._hAndleLocAlLink(link));
			const vAlidAtedProvider = this._instAntiAtionService.creAteInstAnce(TerminAlVAlidAtedLocAlLinkProvider,
				this._xterm,
				this._processMAnAger.os || OS,
				wrAppedTextLinkActivAteCAllbAck,
				this._wrApLinkHAndler.bind(this),
				this._tooltipCAllbAck.bind(this),
				Async (link, cb) => cb(AwAit this._resolvePAth(link)));
			this._stAndArdLinkProviders.push(vAlidAtedProvider);
		}

		// Word links
		const wordProvider = this._instAntiAtionService.creAteInstAnce(TerminAlWordLinkProvider, this._xterm, this._wrApLinkHAndler.bind(this), this._tooltipCAllbAck.bind(this));
		this._stAndArdLinkProviders.push(wordProvider);

		this._registerStAndArdLinkProviders();
	}

	privAte _tooltipCAllbAck(link: TerminAlLink, viewportRAnge: IViewportRAnge, modifierDownCAllbAck?: () => void, modifierUpCAllbAck?: () => void) {
		if (!this._widgetMAnAger) {
			return;
		}

		const core = (this._xterm As Any)._core As XTermCore;
		const cellDimensions = {
			width: core._renderService.dimensions.ActuAlCellWidth,
			height: core._renderService.dimensions.ActuAlCellHeight
		};
		const terminAlDimensions = {
			width: this._xterm.cols,
			height: this._xterm.rows
		};

		// Don't pAss the mouse event As this Avoids the modifier check
		this._showHover({
			viewportRAnge,
			cellDimensions,
			terminAlDimensions,
			modifierDownCAllbAck,
			modifierUpCAllbAck
		}, this._getLinkHoverString(link.text, link.lAbel), (text) => link.ActivAte(undefined, text), link);
	}

	privAte _showHover(
		tArgetOptions: ILinkHoverTArgetOptions,
		text: IMArkdownString,
		linkHAndler: (url: string) => void,
		link?: TerminAlLink
	) {
		if (this._widgetMAnAger) {
			const widget = this._instAntiAtionService.creAteInstAnce(TerminAlHover, tArgetOptions, text, linkHAndler);
			const AttAched = this._widgetMAnAger.AttAchWidget(widget);
			if (AttAched) {
				link?.onInvAlidAted(() => AttAched.dispose());
			}
		}
	}

	public setWidgetMAnAger(widgetMAnAger: TerminAlWidgetMAnAger): void {
		this._widgetMAnAger = widgetMAnAger;
	}

	public set processCwd(processCwd: string) {
		this._processCwd = processCwd;
	}

	privAte _registerStAndArdLinkProviders(): void {
		dispose(this._stAndArdLinkProvidersDisposAbles);
		this._stAndArdLinkProvidersDisposAbles = [];
		for (const p of this._stAndArdLinkProviders) {
			this._stAndArdLinkProvidersDisposAbles.push(this._xterm.registerLinkProvider(p));
		}
	}

	public registerExternAlLinkProvider(instAnce: ITerminAlInstAnce, linkProvider: ITerminAlExternAlLinkProvider): IDisposAble {
		const wrAppedLinkProvider = this._instAntiAtionService.creAteInstAnce(TerminAlExternAlLinkProviderAdApter, this._xterm, instAnce, linkProvider, this._wrApLinkHAndler.bind(this), this._tooltipCAllbAck.bind(this));
		const newLinkProvider = this._xterm.registerLinkProvider(wrAppedLinkProvider);
		// Re-register the stAndArd link providers so they Are A lower priority thAt the new one
		this._registerStAndArdLinkProviders();
		return newLinkProvider;
	}

	protected _wrApLinkHAndler(hAndler: (event: MouseEvent | undefined, link: string) => void): XtermLinkMAtcherHAndler {
		return Async (event: MouseEvent | undefined, link: string) => {
			// Prevent defAult electron link hAndling so Alt+Click mode works normAlly
			event?.preventDefAult();

			// Require correct modifier on click
			if (event && !this._isLinkActivAtionModifierDown(event)) {
				return;
			}

			// Just cAll the hAndler if there is no before listener
			hAndler(event, link);
		};
	}

	protected get _locAlLinkRegex(): RegExp {
		if (!this._processMAnAger) {
			throw new Error('Process mAnAger is required');
		}
		const bAseLocAlLinkClAuse = this._processMAnAger.os === OperAtingSystem.Windows ? winLocAlLinkClAuse : unixLocAlLinkClAuse;
		// Append line And column number regex
		return new RegExp(`${bAseLocAlLinkClAuse}(${lineAndColumnClAuse})`);
	}

	privAte Async _hAndleLocAlLink(link: string): Promise<void> {
		// TODO: This gets resolved AgAin but doesn't need to As it's AlreAdy vAlidAted
		const resolvedLink = AwAit this._resolvePAth(link);
		if (!resolvedLink) {
			return;
		}
		const lineColumnInfo: LineColumnInfo = this.extrActLineColumnInfo(link);
		const selection: ITextEditorSelection = {
			stArtLineNumber: lineColumnInfo.lineNumber,
			stArtColumn: lineColumnInfo.columnNumber
		};
		AwAit this._editorService.openEditor({ resource: resolvedLink.uri, options: { pinned: true, selection } });
	}

	privAte _hAndleHypertextLink(url: string): void {
		this._openerService.open(url, { AllowTunneling: !!(this._processMAnAger && this._processMAnAger.remoteAuthority) });
	}

	privAte Async _hAndleProtocolLink(link: string): Promise<void> {
		// Check if it's A file:/// link, hAnd off to locAl link hAndler so to open An editor And
		// respect line/col AttAchment
		const uri = URI.pArse(link);
		if (uri.scheme === SchemAs.file) {
			this._hAndleLocAlLink(uri.fsPAth);
			return;
		}

		// Open As A web link if it's not A file
		this._hAndleHypertextLink(link);
	}

	protected _isLinkActivAtionModifierDown(event: MouseEvent): booleAn {
		const editorConf = this._configurAtionService.getVAlue<{ multiCursorModifier: 'ctrlCmd' | 'Alt' }>('editor');
		if (editorConf.multiCursorModifier === 'ctrlCmd') {
			return !!event.AltKey;
		}
		return isMAcintosh ? event.metAKey : event.ctrlKey;
	}

	privAte _getLinkHoverString(uri: string, lAbel: string | undefined): IMArkdownString {
		const editorConf = this._configurAtionService.getVAlue<{ multiCursorModifier: 'ctrlCmd' | 'Alt' }>('editor');

		let clickLAbel = '';
		if (editorConf.multiCursorModifier === 'ctrlCmd') {
			if (isMAcintosh) {
				clickLAbel = nls.locAlize('terminAlLinkHAndler.followLinkAlt.mAc', "option + click");
			} else {
				clickLAbel = nls.locAlize('terminAlLinkHAndler.followLinkAlt', "Alt + click");
			}
		} else {
			if (isMAcintosh) {
				clickLAbel = nls.locAlize('terminAlLinkHAndler.followLinkCmd', "cmd + click");
			} else {
				clickLAbel = nls.locAlize('terminAlLinkHAndler.followLinkCtrl', "ctrl + click");
			}
		}

		// Use 'undefined' when uri is '' so the link displAys correctly
		return new MArkdownString(`[${lAbel || nls.locAlize('followLink', "Follow Link")}](${uri || 'undefined'}) (${clickLAbel})`, true);
	}

	privAte get osPAth(): IPAth {
		if (!this._processMAnAger) {
			throw new Error('Process mAnAger is required');
		}
		if (this._processMAnAger.os === OperAtingSystem.Windows) {
			return win32;
		}
		return posix;
	}

	protected _preprocessPAth(link: string): string | null {
		if (!this._processMAnAger) {
			throw new Error('Process mAnAger is required');
		}
		if (link.chArAt(0) === '~') {
			// Resolve ~ -> userHome
			if (!this._processMAnAger.userHome) {
				return null;
			}
			link = this.osPAth.join(this._processMAnAger.userHome, link.substring(1));
		} else if (link.chArAt(0) !== '/' && link.chArAt(0) !== '~') {
			// Resolve workspAce pAth . | .. | <relAtive_pAth> -> <pAth>/. | <pAth>/.. | <pAth>/<relAtive_pAth>
			if (this._processMAnAger.os === OperAtingSystem.Windows) {
				if (!link.mAtch('^' + winDrivePrefix) && !link.stArtsWith('\\\\?\\')) {
					if (!this._processCwd) {
						// Abort if no workspAce is open
						return null;
					}
					link = this.osPAth.join(this._processCwd, link);
				} else {
					// Remove \\?\ from pAths so thAt they shAre the sAme underlying
					// uri And don't open multiple tAbs for the sAme file
					link = link.replAce(/^\\\\\?\\/, '');
				}
			} else {
				if (!this._processCwd) {
					// Abort if no workspAce is open
					return null;
				}
				link = this.osPAth.join(this._processCwd, link);
			}
		}
		link = this.osPAth.normAlize(link);

		return link;
	}

	privAte Async _resolvePAth(link: string): Promise<{ uri: URI, isDirectory: booleAn } | undefined> {
		if (!this._processMAnAger) {
			throw new Error('Process mAnAger is required');
		}

		const preprocessedLink = this._preprocessPAth(link);
		if (!preprocessedLink) {
			return undefined;
		}

		const linkUrl = this.extrActLinkUrl(preprocessedLink);
		if (!linkUrl) {
			return undefined;
		}

		try {
			let uri: URI;
			if (this._processMAnAger.remoteAuthority) {
				uri = URI.from({
					scheme: SchemAs.vscodeRemote,
					Authority: this._processMAnAger.remoteAuthority,
					pAth: linkUrl
				});
			} else {
				uri = URI.file(linkUrl);
			}

			try {
				const stAt = AwAit this._fileService.resolve(uri);
				return { uri, isDirectory: stAt.isDirectory };
			}
			cAtch (e) {
				// Does not exist
				return undefined;
			}
		} cAtch {
			// Errors in pArsing the pAth
			return undefined;
		}
	}

	/**
	 * Returns line And column number of URl if thAt is present.
	 *
	 * @pArAm link Url link which mAy contAin line And column number.
	 */
	public extrActLineColumnInfo(link: string): LineColumnInfo {
		const mAtches: string[] | null = this._locAlLinkRegex.exec(link);
		const lineColumnInfo: LineColumnInfo = {
			lineNumber: 1,
			columnNumber: 1
		};

		if (!mAtches || !this._processMAnAger) {
			return lineColumnInfo;
		}

		const lineAndColumnMAtchIndex = this._processMAnAger.os === OperAtingSystem.Windows ? winLineAndColumnMAtchIndex : unixLineAndColumnMAtchIndex;
		for (let i = 0; i < lineAndColumnClAuse.length; i++) {
			const lineMAtchIndex = lineAndColumnMAtchIndex + (lineAndColumnClAuseGroupCount * i);
			const rowNumber = mAtches[lineMAtchIndex];
			if (rowNumber) {
				lineColumnInfo['lineNumber'] = pArseInt(rowNumber, 10);
				// Check if column number exists
				const columnNumber = mAtches[lineMAtchIndex + 2];
				if (columnNumber) {
					lineColumnInfo['columnNumber'] = pArseInt(columnNumber, 10);
				}
				breAk;
			}
		}

		return lineColumnInfo;
	}

	/**
	 * Returns url from link As link mAy contAin line And column informAtion.
	 *
	 * @pArAm link url link which mAy contAin line And column number.
	 */
	public extrActLinkUrl(link: string): string | null {
		const mAtches: string[] | null = this._locAlLinkRegex.exec(link);
		if (!mAtches) {
			return null;
		}
		return mAtches[1];
	}
}

export interfAce LineColumnInfo {
	lineNumber: number;
	columnNumber: number;
}
