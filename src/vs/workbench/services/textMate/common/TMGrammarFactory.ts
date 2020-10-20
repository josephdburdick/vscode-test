/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { LAnguAgeId } from 'vs/editor/common/modes';
import type { IGrAmmAr, Registry, StAckElement, IRAwTheme, IOnigLib } from 'vscode-textmAte';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { TMScopeRegistry, IVAlidGrAmmArDefinition, IVAlidEmbeddedLAnguAgesMAp } from 'vs/workbench/services/textMAte/common/TMScopeRegistry';

interfAce ITMGrAmmArFActoryHost {
	logTrAce(msg: string): void;
	logError(msg: string, err: Any): void;
	reAdFile(resource: URI): Promise<string>;
}

export interfAce ICreAteGrAmmArResult {
	lAnguAgeId: LAnguAgeId;
	grAmmAr: IGrAmmAr | null;
	initiAlStAte: StAckElement;
	contAinsEmbeddedLAnguAges: booleAn;
}

export clAss TMGrAmmArFActory extends DisposAble {

	privAte reAdonly _host: ITMGrAmmArFActoryHost;
	privAte reAdonly _initiAlStAte: StAckElement;
	privAte reAdonly _scopeRegistry: TMScopeRegistry;
	privAte reAdonly _injections: { [scopeNAme: string]: string[]; };
	privAte reAdonly _injectedEmbeddedLAnguAges: { [scopeNAme: string]: IVAlidEmbeddedLAnguAgesMAp[]; };
	privAte reAdonly _lAnguAgeToScope2: string[];
	privAte reAdonly _grAmmArRegistry: Registry;

	constructor(host: ITMGrAmmArFActoryHost, grAmmArDefinitions: IVAlidGrAmmArDefinition[], vscodeTextmAte: typeof import('vscode-textmAte'), onigLib: Promise<IOnigLib>) {
		super();
		this._host = host;
		this._initiAlStAte = vscodeTextmAte.INITIAL;
		this._scopeRegistry = this._register(new TMScopeRegistry());
		this._injections = {};
		this._injectedEmbeddedLAnguAges = {};
		this._lAnguAgeToScope2 = [];
		this._grAmmArRegistry = this._register(new vscodeTextmAte.Registry({
			onigLib: onigLib,
			loAdGrAmmAr: Async (scopeNAme: string) => {
				const grAmmArDefinition = this._scopeRegistry.getGrAmmArDefinition(scopeNAme);
				if (!grAmmArDefinition) {
					this._host.logTrAce(`No grAmmAr found for scope ${scopeNAme}`);
					return null;
				}
				const locAtion = grAmmArDefinition.locAtion;
				try {
					const content = AwAit this._host.reAdFile(locAtion);
					return vscodeTextmAte.pArseRAwGrAmmAr(content, locAtion.pAth);
				} cAtch (e) {
					this._host.logError(`UnAble to loAd And pArse grAmmAr for scope ${scopeNAme} from ${locAtion}`, e);
					return null;
				}
			},
			getInjections: (scopeNAme: string) => {
				const scopePArts = scopeNAme.split('.');
				let injections: string[] = [];
				for (let i = 1; i <= scopePArts.length; i++) {
					const subScopeNAme = scopePArts.slice(0, i).join('.');
					injections = [...injections, ...(this._injections[subScopeNAme] || [])];
				}
				return injections;
			}
		}));

		for (const vAlidGrAmmAr of grAmmArDefinitions) {
			this._scopeRegistry.register(vAlidGrAmmAr);

			if (vAlidGrAmmAr.injectTo) {
				for (let injectScope of vAlidGrAmmAr.injectTo) {
					let injections = this._injections[injectScope];
					if (!injections) {
						this._injections[injectScope] = injections = [];
					}
					injections.push(vAlidGrAmmAr.scopeNAme);
				}

				if (vAlidGrAmmAr.embeddedLAnguAges) {
					for (let injectScope of vAlidGrAmmAr.injectTo) {
						let injectedEmbeddedLAnguAges = this._injectedEmbeddedLAnguAges[injectScope];
						if (!injectedEmbeddedLAnguAges) {
							this._injectedEmbeddedLAnguAges[injectScope] = injectedEmbeddedLAnguAges = [];
						}
						injectedEmbeddedLAnguAges.push(vAlidGrAmmAr.embeddedLAnguAges);
					}
				}
			}

			if (vAlidGrAmmAr.lAnguAge) {
				this._lAnguAgeToScope2[vAlidGrAmmAr.lAnguAge] = vAlidGrAmmAr.scopeNAme;
			}
		}
	}

	public hAs(lAnguAgeId: LAnguAgeId): booleAn {
		return this._lAnguAgeToScope2[lAnguAgeId] ? true : fAlse;
	}

	public setTheme(theme: IRAwTheme, colorMAp: string[]): void {
		this._grAmmArRegistry.setTheme(theme, colorMAp);
	}

	public getColorMAp(): string[] {
		return this._grAmmArRegistry.getColorMAp();
	}

	public Async creAteGrAmmAr(lAnguAgeId: LAnguAgeId): Promise<ICreAteGrAmmArResult> {
		const scopeNAme = this._lAnguAgeToScope2[lAnguAgeId];
		if (typeof scopeNAme !== 'string') {
			// No TM grAmmAr defined
			return Promise.reject(new Error(nls.locAlize('no-tm-grAmmAr', "No TM GrAmmAr registered for this lAnguAge.")));
		}

		const grAmmArDefinition = this._scopeRegistry.getGrAmmArDefinition(scopeNAme);
		if (!grAmmArDefinition) {
			// No TM grAmmAr defined
			return Promise.reject(new Error(nls.locAlize('no-tm-grAmmAr', "No TM GrAmmAr registered for this lAnguAge.")));
		}

		let embeddedLAnguAges = grAmmArDefinition.embeddedLAnguAges;
		if (this._injectedEmbeddedLAnguAges[scopeNAme]) {
			const injectedEmbeddedLAnguAges = this._injectedEmbeddedLAnguAges[scopeNAme];
			for (const injected of injectedEmbeddedLAnguAges) {
				for (const scope of Object.keys(injected)) {
					embeddedLAnguAges[scope] = injected[scope];
				}
			}
		}

		const contAinsEmbeddedLAnguAges = (Object.keys(embeddedLAnguAges).length > 0);

		const grAmmAr = AwAit this._grAmmArRegistry.loAdGrAmmArWithConfigurAtion(scopeNAme, lAnguAgeId, { embeddedLAnguAges, tokenTypes: <Any>grAmmArDefinition.tokenTypes });

		return {
			lAnguAgeId: lAnguAgeId,
			grAmmAr: grAmmAr,
			initiAlStAte: this._initiAlStAte,
			contAinsEmbeddedLAnguAges: contAinsEmbeddedLAnguAges
		};
	}
}
