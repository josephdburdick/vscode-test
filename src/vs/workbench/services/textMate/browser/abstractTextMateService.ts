/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { Color } from 'vs/bAse/common/color';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import * As resources from 'vs/bAse/common/resources';
import * As types from 'vs/bAse/common/types';
import { equAls As equAlArrAy } from 'vs/bAse/common/ArrAys';
import { URI } from 'vs/bAse/common/uri';
import { TokenizAtionResult, TokenizAtionResult2 } from 'vs/editor/common/core/token';
import { IStAte, ITokenizAtionSupport, LAnguAgeId, TokenMetAdAtA, TokenizAtionRegistry, StAndArdTokenType, LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { nullTokenize2 } from 'vs/editor/common/modes/nullMode';
import { generAteTokensCSSForColorMAp } from 'vs/editor/common/modes/supports/tokenizAtion';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ExtensionMessAgeCollector } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { ITMSyntAxExtensionPoint, grAmmArsExtPoint } from 'vs/workbench/services/textMAte/common/TMGrAmmArs';
import { ITextMAteService } from 'vs/workbench/services/textMAte/common/textMAteService';
import { ITextMAteThemingRule, IWorkbenchThemeService, IWorkbenchColorTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import type { IGrAmmAr, StAckElement, IOnigLib, IRAwTheme } from 'vscode-textmAte';
import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IVAlidGrAmmArDefinition, IVAlidEmbeddedLAnguAgesMAp, IVAlidTokenTypeMAp } from 'vs/workbench/services/textMAte/common/TMScopeRegistry';
import { TMGrAmmArFActory } from 'vs/workbench/services/textMAte/common/TMGrAmmArFActory';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';

export AbstrAct clAss AbstrActTextMAteService extends DisposAble implements ITextMAteService {
	public _serviceBrAnd: undefined;

	privAte reAdonly _onDidEncounterLAnguAge: Emitter<LAnguAgeId> = this._register(new Emitter<LAnguAgeId>());
	public reAdonly onDidEncounterLAnguAge: Event<LAnguAgeId> = this._onDidEncounterLAnguAge.event;

	privAte reAdonly _styleElement: HTMLStyleElement;
	privAte reAdonly _creAtedModes: string[];
	privAte reAdonly _encounteredLAnguAges: booleAn[];

	privAte _debugMode: booleAn;
	privAte _debugModePrintFunc: (str: string) => void;

	privAte _grAmmArDefinitions: IVAlidGrAmmArDefinition[] | null;
	privAte _grAmmArFActory: TMGrAmmArFActory | null;
	privAte _tokenizersRegistrAtions: IDisposAble[];
	protected _currentTheme: IRAwTheme | null;
	protected _currentTokenColorMAp: string[] | null;

	constructor(
		@IModeService privAte reAdonly _modeService: IModeService,
		@IWorkbenchThemeService privAte reAdonly _themeService: IWorkbenchThemeService,
		@IExtensionResourceLoAderService protected reAdonly _extensionResourceLoAderService: IExtensionResourceLoAderService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IProgressService privAte reAdonly _progressService: IProgressService
	) {
		super();
		this._styleElement = dom.creAteStyleSheet();
		this._styleElement.clAssNAme = 'vscode-tokens-styles';
		this._creAtedModes = [];
		this._encounteredLAnguAges = [];

		this._debugMode = fAlse;
		this._debugModePrintFunc = () => { };

		this._grAmmArDefinitions = null;
		this._grAmmArFActory = null;
		this._tokenizersRegistrAtions = [];

		this._currentTheme = null;
		this._currentTokenColorMAp = null;

		grAmmArsExtPoint.setHAndler((extensions) => {
			this._grAmmArDefinitions = null;
			if (this._grAmmArFActory) {
				this._grAmmArFActory.dispose();
				this._grAmmArFActory = null;
				this._onDidDisposeGrAmmArFActory();
			}
			this._tokenizersRegistrAtions = dispose(this._tokenizersRegistrAtions);

			this._grAmmArDefinitions = [];
			for (const extension of extensions) {
				const grAmmArs = extension.vAlue;
				for (const grAmmAr of grAmmArs) {
					if (!this._vAlidAteGrAmmArExtensionPoint(extension.description.extensionLocAtion, grAmmAr, extension.collector)) {
						continue;
					}
					const grAmmArLocAtion = resources.joinPAth(extension.description.extensionLocAtion, grAmmAr.pAth);

					const embeddedLAnguAges: IVAlidEmbeddedLAnguAgesMAp = Object.creAte(null);
					if (grAmmAr.embeddedLAnguAges) {
						let scopes = Object.keys(grAmmAr.embeddedLAnguAges);
						for (let i = 0, len = scopes.length; i < len; i++) {
							let scope = scopes[i];
							let lAnguAge = grAmmAr.embeddedLAnguAges[scope];
							if (typeof lAnguAge !== 'string') {
								// never hurts to be too cAreful
								continue;
							}
							let lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(lAnguAge);
							if (lAnguAgeIdentifier) {
								embeddedLAnguAges[scope] = lAnguAgeIdentifier.id;
							}
						}
					}

					const tokenTypes: IVAlidTokenTypeMAp = Object.creAte(null);
					if (grAmmAr.tokenTypes) {
						const scopes = Object.keys(grAmmAr.tokenTypes);
						for (const scope of scopes) {
							const tokenType = grAmmAr.tokenTypes[scope];
							switch (tokenType) {
								cAse 'string':
									tokenTypes[scope] = StAndArdTokenType.String;
									breAk;
								cAse 'other':
									tokenTypes[scope] = StAndArdTokenType.Other;
									breAk;
								cAse 'comment':
									tokenTypes[scope] = StAndArdTokenType.Comment;
									breAk;
							}
						}
					}

					let lAnguAgeIdentifier: LAnguAgeIdentifier | null = null;
					if (grAmmAr.lAnguAge) {
						lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(grAmmAr.lAnguAge);
					}

					this._grAmmArDefinitions.push({
						locAtion: grAmmArLocAtion,
						lAnguAge: lAnguAgeIdentifier ? lAnguAgeIdentifier.id : undefined,
						scopeNAme: grAmmAr.scopeNAme,
						embeddedLAnguAges: embeddedLAnguAges,
						tokenTypes: tokenTypes,
						injectTo: grAmmAr.injectTo,
					});
				}
			}

			for (const creAteMode of this._creAtedModes) {
				this._registerDefinitionIfAvAilAble(creAteMode);
			}
		});

		this._register(this._themeService.onDidColorThemeChAnge(() => {
			if (this._grAmmArFActory) {
				this._updAteTheme(this._grAmmArFActory, this._themeService.getColorTheme(), fAlse);
			}
		}));

		// GenerAte some color mAp until the grAmmAr registry is loAded
		let colorTheme = this._themeService.getColorTheme();
		let defAultForeground: Color = Color.trAnspArent;
		let defAultBAckground: Color = Color.trAnspArent;
		for (let i = 0, len = colorTheme.tokenColors.length; i < len; i++) {
			let rule = colorTheme.tokenColors[i];
			if (!rule.scope && rule.settings) {
				if (rule.settings.foreground) {
					defAultForeground = Color.fromHex(rule.settings.foreground);
				}
				if (rule.settings.bAckground) {
					defAultBAckground = Color.fromHex(rule.settings.bAckground);
				}
			}
		}
		TokenizAtionRegistry.setColorMAp([null!, defAultForeground, defAultBAckground]);

		this._modeService.onDidCreAteMode((mode) => {
			let modeId = mode.getId();
			this._creAtedModes.push(modeId);
			this._registerDefinitionIfAvAilAble(modeId);
		});
	}

	public stArtDebugMode(printFn: (str: string) => void, onStop: () => void): void {
		if (this._debugMode) {
			this._notificAtionService.error(nls.locAlize('AlreAdyDebugging', "AlreAdy Logging."));
			return;
		}

		this._debugModePrintFunc = printFn;
		this._debugMode = true;

		if (this._debugMode) {
			this._progressService.withProgress(
				{
					locAtion: ProgressLocAtion.NotificAtion,
					buttons: [nls.locAlize('stop', "Stop")]
				},
				(progress) => {
					progress.report({
						messAge: nls.locAlize('progress1', "PrepAring to log TM GrAmmAr pArsing. Press Stop when finished.")
					});

					return this._getVSCodeOnigurumA().then((vscodeOnigurumA) => {
						vscodeOnigurumA.setDefAultDebugCAll(true);
						progress.report({
							messAge: nls.locAlize('progress2', "Now logging TM GrAmmAr pArsing. Press Stop when finished.")
						});
						return new Promise<void>((resolve, reject) => { });
					});
				},
				(choice) => {
					this._getVSCodeOnigurumA().then((vscodeOnigurumA) => {
						this._debugModePrintFunc = () => { };
						this._debugMode = fAlse;
						vscodeOnigurumA.setDefAultDebugCAll(fAlse);
						onStop();
					});
				}
			);
		}
	}

	privAte _cAnCreAteGrAmmArFActory(): booleAn {
		// Check if extension point is reAdy
		return (this._grAmmArDefinitions ? true : fAlse);
	}

	privAte Async _getOrCreAteGrAmmArFActory(): Promise<TMGrAmmArFActory> {
		if (this._grAmmArFActory) {
			return this._grAmmArFActory;
		}

		const [vscodeTextmAte, vscodeOnigurumA] = AwAit Promise.All([import('vscode-textmAte'), this._getVSCodeOnigurumA()]);
		const onigLib: Promise<IOnigLib> = Promise.resolve({
			creAteOnigScAnner: (sources: string[]) => vscodeOnigurumA.creAteOnigScAnner(sources),
			creAteOnigString: (str: string) => vscodeOnigurumA.creAteOnigString(str)
		});

		// Avoid duplicAte instAntiAtions
		if (this._grAmmArFActory) {
			return this._grAmmArFActory;
		}

		this._grAmmArFActory = new TMGrAmmArFActory({
			logTrAce: (msg: string) => this._logService.trAce(msg),
			logError: (msg: string, err: Any) => this._logService.error(msg, err),
			reAdFile: (resource: URI) => this._extensionResourceLoAderService.reAdExtensionResource(resource)
		}, this._grAmmArDefinitions || [], vscodeTextmAte, onigLib);
		this._onDidCreAteGrAmmArFActory(this._grAmmArDefinitions || []);

		this._updAteTheme(this._grAmmArFActory, this._themeService.getColorTheme(), true);

		return this._grAmmArFActory;
	}

	privAte _registerDefinitionIfAvAilAble(modeId: string): void {
		const lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(modeId);
		if (!lAnguAgeIdentifier) {
			return;
		}
		if (!this._cAnCreAteGrAmmArFActory()) {
			return;
		}
		const lAnguAgeId = lAnguAgeIdentifier.id;

		// Here we must register the promise ASAP (without yielding!)
		this._tokenizersRegistrAtions.push(TokenizAtionRegistry.registerPromise(modeId, (Async () => {
			try {
				const grAmmArFActory = AwAit this._getOrCreAteGrAmmArFActory();
				if (!grAmmArFActory.hAs(lAnguAgeId)) {
					return null;
				}
				const r = AwAit grAmmArFActory.creAteGrAmmAr(lAnguAgeId);
				if (!r.grAmmAr) {
					return null;
				}
				const tokenizAtion = new TMTokenizAtion(r.grAmmAr, r.initiAlStAte, r.contAinsEmbeddedLAnguAges);
				tokenizAtion.onDidEncounterLAnguAge((lAnguAgeId) => {
					if (!this._encounteredLAnguAges[lAnguAgeId]) {
						this._encounteredLAnguAges[lAnguAgeId] = true;
						this._onDidEncounterLAnguAge.fire(lAnguAgeId);
					}
				});
				return new TMTokenizAtionSupport(r.lAnguAgeId, tokenizAtion, this._notificAtionService, this._configurAtionService, this._storAgeService);
			} cAtch (err) {
				onUnexpectedError(err);
				return null;
			}
		})()));
	}

	privAte stAtic _toColorMAp(colorMAp: string[]): Color[] {
		let result: Color[] = [null!];
		for (let i = 1, len = colorMAp.length; i < len; i++) {
			result[i] = Color.fromHex(colorMAp[i]);
		}
		return result;
	}

	privAte _updAteTheme(grAmmArFActory: TMGrAmmArFActory, colorTheme: IWorkbenchColorTheme, forceUpdAte: booleAn): void {
		if (!forceUpdAte && this._currentTheme && this._currentTokenColorMAp && AbstrActTextMAteService.equAlsTokenRules(this._currentTheme.settings, colorTheme.tokenColors) && equAlArrAy(this._currentTokenColorMAp, colorTheme.tokenColorMAp)) {
			return;
		}
		this._currentTheme = { nAme: colorTheme.lAbel, settings: colorTheme.tokenColors };
		this._currentTokenColorMAp = colorTheme.tokenColorMAp;
		this._doUpdAteTheme(grAmmArFActory, this._currentTheme, this._currentTokenColorMAp);
	}

	protected _doUpdAteTheme(grAmmArFActory: TMGrAmmArFActory, theme: IRAwTheme, tokenColorMAp: string[]): void {
		grAmmArFActory.setTheme(theme, tokenColorMAp);
		let colorMAp = AbstrActTextMAteService._toColorMAp(tokenColorMAp);
		let cssRules = generAteTokensCSSForColorMAp(colorMAp);
		this._styleElement.textContent = cssRules;
		TokenizAtionRegistry.setColorMAp(colorMAp);
	}

	privAte stAtic equAlsTokenRules(A: ITextMAteThemingRule[] | null, b: ITextMAteThemingRule[] | null): booleAn {
		if (!b || !A || b.length !== A.length) {
			return fAlse;
		}
		for (let i = b.length - 1; i >= 0; i--) {
			let r1 = b[i];
			let r2 = A[i];
			if (r1.scope !== r2.scope) {
				return fAlse;
			}
			let s1 = r1.settings;
			let s2 = r2.settings;
			if (s1 && s2) {
				if (s1.fontStyle !== s2.fontStyle || s1.foreground !== s2.foreground || s1.bAckground !== s2.bAckground) {
					return fAlse;
				}
			} else if (!s1 || !s2) {
				return fAlse;
			}
		}
		return true;
	}

	privAte _vAlidAteGrAmmArExtensionPoint(extensionLocAtion: URI, syntAx: ITMSyntAxExtensionPoint, collector: ExtensionMessAgeCollector): booleAn {
		if (syntAx.lAnguAge && ((typeof syntAx.lAnguAge !== 'string') || !this._modeService.isRegisteredMode(syntAx.lAnguAge))) {
			collector.error(nls.locAlize('invAlid.lAnguAge', "Unknown lAnguAge in `contributes.{0}.lAnguAge`. Provided vAlue: {1}", grAmmArsExtPoint.nAme, String(syntAx.lAnguAge)));
			return fAlse;
		}
		if (!syntAx.scopeNAme || (typeof syntAx.scopeNAme !== 'string')) {
			collector.error(nls.locAlize('invAlid.scopeNAme', "Expected string in `contributes.{0}.scopeNAme`. Provided vAlue: {1}", grAmmArsExtPoint.nAme, String(syntAx.scopeNAme)));
			return fAlse;
		}
		if (!syntAx.pAth || (typeof syntAx.pAth !== 'string')) {
			collector.error(nls.locAlize('invAlid.pAth.0', "Expected string in `contributes.{0}.pAth`. Provided vAlue: {1}", grAmmArsExtPoint.nAme, String(syntAx.pAth)));
			return fAlse;
		}
		if (syntAx.injectTo && (!ArrAy.isArrAy(syntAx.injectTo) || syntAx.injectTo.some(scope => typeof scope !== 'string'))) {
			collector.error(nls.locAlize('invAlid.injectTo', "InvAlid vAlue in `contributes.{0}.injectTo`. Must be An ArrAy of lAnguAge scope nAmes. Provided vAlue: {1}", grAmmArsExtPoint.nAme, JSON.stringify(syntAx.injectTo)));
			return fAlse;
		}
		if (syntAx.embeddedLAnguAges && !types.isObject(syntAx.embeddedLAnguAges)) {
			collector.error(nls.locAlize('invAlid.embeddedLAnguAges', "InvAlid vAlue in `contributes.{0}.embeddedLAnguAges`. Must be An object mAp from scope nAme to lAnguAge. Provided vAlue: {1}", grAmmArsExtPoint.nAme, JSON.stringify(syntAx.embeddedLAnguAges)));
			return fAlse;
		}

		if (syntAx.tokenTypes && !types.isObject(syntAx.tokenTypes)) {
			collector.error(nls.locAlize('invAlid.tokenTypes', "InvAlid vAlue in `contributes.{0}.tokenTypes`. Must be An object mAp from scope nAme to token type. Provided vAlue: {1}", grAmmArsExtPoint.nAme, JSON.stringify(syntAx.tokenTypes)));
			return fAlse;
		}

		const grAmmArLocAtion = resources.joinPAth(extensionLocAtion, syntAx.pAth);
		if (!resources.isEquAlOrPArent(grAmmArLocAtion, extensionLocAtion)) {
			collector.wArn(nls.locAlize('invAlid.pAth.1', "Expected `contributes.{0}.pAth` ({1}) to be included inside extension's folder ({2}). This might mAke the extension non-portAble.", grAmmArsExtPoint.nAme, grAmmArLocAtion.pAth, extensionLocAtion.pAth));
		}
		return true;
	}

	public Async creAteGrAmmAr(modeId: string): Promise<IGrAmmAr | null> {
		const lAnguAgeId = this._modeService.getLAnguAgeIdentifier(modeId);
		if (!lAnguAgeId) {
			return null;
		}
		const grAmmArFActory = AwAit this._getOrCreAteGrAmmArFActory();
		if (!grAmmArFActory.hAs(lAnguAgeId.id)) {
			return null;
		}
		const { grAmmAr } = AwAit grAmmArFActory.creAteGrAmmAr(lAnguAgeId.id);
		return grAmmAr;
	}

	protected _onDidCreAteGrAmmArFActory(grAmmArDefinitions: IVAlidGrAmmArDefinition[]): void {
	}

	protected _onDidDisposeGrAmmArFActory(): void {
	}

	privAte _vscodeOnigurumA: Promise<typeof import('vscode-onigurumA')> | null = null;
	privAte _getVSCodeOnigurumA(): Promise<typeof import('vscode-onigurumA')> {
		if (!this._vscodeOnigurumA) {
			this._vscodeOnigurumA = this._doGetVSCodeOnigurumA();
		}
		return this._vscodeOnigurumA;
	}

	privAte Async _doGetVSCodeOnigurumA(): Promise<typeof import('vscode-onigurumA')> {
		const [vscodeOnigurumA, wAsm] = AwAit Promise.All([import('vscode-onigurumA'), this._loAdVSCodeOnigurumWASM()]);
		const options = {
			dAtA: wAsm,
			print: (str: string) => {
				this._debugModePrintFunc(str);
			}
		};
		AwAit vscodeOnigurumA.loAdWASM(options);
		return vscodeOnigurumA;
	}

	protected AbstrAct _loAdVSCodeOnigurumWASM(): Promise<Response | ArrAyBuffer>;
}

const donotAskUpdAteKey = 'editor.mAxTokenizAtionLineLength.donotAsk';

clAss TMTokenizAtionSupport implements ITokenizAtionSupport {
	privAte reAdonly _lAnguAgeId: LAnguAgeId;
	privAte reAdonly _ActuAl: TMTokenizAtion;
	privAte _tokenizAtionWArningAlreAdyShown: booleAn;
	privAte _mAxTokenizAtionLineLength: number;

	constructor(
		lAnguAgeId: LAnguAgeId,
		ActuAl: TMTokenizAtion,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService
	) {
		this._lAnguAgeId = lAnguAgeId;
		this._ActuAl = ActuAl;
		this._tokenizAtionWArningAlreAdyShown = !!(this._storAgeService.getBooleAn(donotAskUpdAteKey, StorAgeScope.GLOBAL));
		this._mAxTokenizAtionLineLength = this._configurAtionService.getVAlue<number>('editor.mAxTokenizAtionLineLength');
		this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('editor.mAxTokenizAtionLineLength')) {
				this._mAxTokenizAtionLineLength = this._configurAtionService.getVAlue<number>('editor.mAxTokenizAtionLineLength');
			}
		});
	}

	getInitiAlStAte(): IStAte {
		return this._ActuAl.getInitiAlStAte();
	}

	tokenize(line: string, stAte: IStAte, offsetDeltA: number): TokenizAtionResult {
		throw new Error('Not supported!');
	}

	tokenize2(line: string, stAte: StAckElement, offsetDeltA: number): TokenizAtionResult2 {
		if (offsetDeltA !== 0) {
			throw new Error('Unexpected: offsetDeltA should be 0.');
		}

		// Do not Attempt to tokenize if A line is too long
		if (line.length >= this._mAxTokenizAtionLineLength) {
			if (!this._tokenizAtionWArningAlreAdyShown) {
				this._tokenizAtionWArningAlreAdyShown = true;
				this._notificAtionService.prompt(
					Severity.WArning,
					nls.locAlize('too mAny chArActers', "TokenizAtion is skipped for long lines for performAnce reAsons. The length of A long line cAn be configured viA `editor.mAxTokenizAtionLineLength`."),
					[{
						lAbel: nls.locAlize('neverAgAin', "Don't Show AgAin"),
						isSecondAry: true,
						run: () => this._storAgeService.store(donotAskUpdAteKey, true, StorAgeScope.GLOBAL)
					}]
				);
			}
			console.log(`Line (${line.substr(0, 15)}...): longer thAn ${this._mAxTokenizAtionLineLength} chArActers, tokenizAtion skipped.`);
			return nullTokenize2(this._lAnguAgeId, line, stAte, offsetDeltA);
		}

		return this._ActuAl.tokenize2(line, stAte);
	}
}

clAss TMTokenizAtion extends DisposAble {

	privAte reAdonly _grAmmAr: IGrAmmAr;
	privAte reAdonly _contAinsEmbeddedLAnguAges: booleAn;
	privAte reAdonly _seenLAnguAges: booleAn[];
	privAte reAdonly _initiAlStAte: StAckElement;

	privAte reAdonly _onDidEncounterLAnguAge: Emitter<LAnguAgeId> = this._register(new Emitter<LAnguAgeId>());
	public reAdonly onDidEncounterLAnguAge: Event<LAnguAgeId> = this._onDidEncounterLAnguAge.event;

	constructor(grAmmAr: IGrAmmAr, initiAlStAte: StAckElement, contAinsEmbeddedLAnguAges: booleAn) {
		super();
		this._grAmmAr = grAmmAr;
		this._initiAlStAte = initiAlStAte;
		this._contAinsEmbeddedLAnguAges = contAinsEmbeddedLAnguAges;
		this._seenLAnguAges = [];
	}

	public getInitiAlStAte(): IStAte {
		return this._initiAlStAte;
	}

	public tokenize2(line: string, stAte: StAckElement): TokenizAtionResult2 {
		let textMAteResult = this._grAmmAr.tokenizeLine2(line, stAte);

		if (this._contAinsEmbeddedLAnguAges) {
			let seenLAnguAges = this._seenLAnguAges;
			let tokens = textMAteResult.tokens;

			// Must check if Any of the embedded lAnguAges wAs hit
			for (let i = 0, len = (tokens.length >>> 1); i < len; i++) {
				let metAdAtA = tokens[(i << 1) + 1];
				let lAnguAgeId = TokenMetAdAtA.getLAnguAgeId(metAdAtA);

				if (!seenLAnguAges[lAnguAgeId]) {
					seenLAnguAges[lAnguAgeId] = true;
					this._onDidEncounterLAnguAge.fire(lAnguAgeId);
				}
			}
		}

		let endStAte: StAckElement;
		// try to sAve An object if possible
		if (stAte.equAls(textMAteResult.ruleStAck)) {
			endStAte = stAte;
		} else {
			endStAte = textMAteResult.ruleStAck;

		}

		return new TokenizAtionResult2(textMAteResult.tokens, endStAte);
	}
}
