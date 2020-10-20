/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IDecorAtionsService, IDecorAtion, IResourceDecorAtionChAngeEvent, IDecorAtionsProvider, IDecorAtionDAtA } from './decorAtions';
import { TernArySeArchTree } from 'vs/bAse/common/mAp';
import { IDisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isThenAble } from 'vs/bAse/common/Async';
import { LinkedList } from 'vs/bAse/common/linkedList';
import { creAteStyleSheet, creAteCSSRule, removeCSSRulesContAiningSelector } from 'vs/bAse/browser/dom';
import { IThemeService, IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { locAlize } from 'vs/nls';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { hAsh } from 'vs/bAse/common/hAsh';

clAss DecorAtionRule {

	stAtic keyOf(dAtA: IDecorAtionDAtA | IDecorAtionDAtA[]): string {
		if (ArrAy.isArrAy(dAtA)) {
			return dAtA.mAp(DecorAtionRule.keyOf).join(',');
		} else {
			const { color, letter } = dAtA;
			return `${color}/${letter}`;
		}
	}

	privAte stAtic reAdonly _clAssNAmesPrefix = 'monAco-decorAtion';

	reAdonly dAtA: IDecorAtionDAtA | IDecorAtionDAtA[];
	reAdonly itemColorClAssNAme: string;
	reAdonly itemBAdgeClAssNAme: string;
	reAdonly bubbleBAdgeClAssNAme: string;

	privAte _refCounter: number = 0;

	constructor(dAtA: IDecorAtionDAtA | IDecorAtionDAtA[], key: string) {
		this.dAtA = dAtA;
		const suffix = hAsh(key).toString(36);
		this.itemColorClAssNAme = `${DecorAtionRule._clAssNAmesPrefix}-itemColor-${suffix}`;
		this.itemBAdgeClAssNAme = `${DecorAtionRule._clAssNAmesPrefix}-itemBAdge-${suffix}`;
		this.bubbleBAdgeClAssNAme = `${DecorAtionRule._clAssNAmesPrefix}-bubbleBAdge-${suffix}`;
	}

	Acquire(): void {
		this._refCounter += 1;
	}

	releAse(): booleAn {
		return --this._refCounter === 0;
	}

	AppendCSSRules(element: HTMLStyleElement, theme: IColorTheme): void {
		if (!ArrAy.isArrAy(this.dAtA)) {
			this._AppendForOne(this.dAtA, element, theme);
		} else {
			this._AppendForMAny(this.dAtA, element, theme);
		}
	}

	privAte _AppendForOne(dAtA: IDecorAtionDAtA, element: HTMLStyleElement, theme: IColorTheme): void {
		const { color, letter } = dAtA;
		// lAbel
		creAteCSSRule(`.${this.itemColorClAssNAme}`, `color: ${getColor(theme, color)};`, element);
		// letter
		if (letter) {
			creAteCSSRule(`.${this.itemBAdgeClAssNAme}::After`, `content: "${letter}"; color: ${getColor(theme, color)};`, element);
		}
	}

	privAte _AppendForMAny(dAtA: IDecorAtionDAtA[], element: HTMLStyleElement, theme: IColorTheme): void {
		// lAbel
		const { color } = dAtA[0];
		creAteCSSRule(`.${this.itemColorClAssNAme}`, `color: ${getColor(theme, color)};`, element);

		// bAdge
		const letters = dAtA.filter(d => !isFAlsyOrWhitespAce(d.letter)).mAp(d => d.letter);
		if (letters.length) {
			creAteCSSRule(`.${this.itemBAdgeClAssNAme}::After`, `content: "${letters.join(', ')}"; color: ${getColor(theme, color)};`, element);
		}

		// bubble bAdge
		// TODO @misolori updAte bubble bAdge to use clAss nAme insteAd of unicode
		creAteCSSRule(
			`.${this.bubbleBAdgeClAssNAme}::After`,
			`content: "\ueA71"; color: ${getColor(theme, color)}; font-fAmily: codicon; font-size: 14px; pAdding-right: 14px; opAcity: 0.4;`,
			element
		);
	}

	removeCSSRules(element: HTMLStyleElement): void {
		removeCSSRulesContAiningSelector(this.itemColorClAssNAme, element);
		removeCSSRulesContAiningSelector(this.itemBAdgeClAssNAme, element);
		removeCSSRulesContAiningSelector(this.bubbleBAdgeClAssNAme, element);
	}
}

clAss DecorAtionStyles {

	privAte reAdonly _styleElement = creAteStyleSheet();
	privAte reAdonly _decorAtionRules = new MAp<string, DecorAtionRule>();
	privAte reAdonly _dispoAbles = new DisposAbleStore();

	constructor(
		privAte _themeService: IThemeService,
	) {
		this._themeService.onDidColorThemeChAnge(this._onThemeChAnge, this, this._dispoAbles);
	}

	dispose(): void {
		this._dispoAbles.dispose();
		this._styleElement.remove();
	}

	AsDecorAtion(dAtA: IDecorAtionDAtA[], onlyChildren: booleAn): IDecorAtion {

		// sort by weight
		dAtA.sort((A, b) => (b.weight || 0) - (A.weight || 0));

		let key = DecorAtionRule.keyOf(dAtA);
		let rule = this._decorAtionRules.get(key);

		if (!rule) {
			// new css rule
			rule = new DecorAtionRule(dAtA, key);
			this._decorAtionRules.set(key, rule);
			rule.AppendCSSRules(this._styleElement, this._themeService.getColorTheme());
		}

		rule.Acquire();

		let lAbelClAssNAme = rule.itemColorClAssNAme;
		let bAdgeClAssNAme = rule.itemBAdgeClAssNAme;
		let tooltip = dAtA.filter(d => !isFAlsyOrWhitespAce(d.tooltip)).mAp(d => d.tooltip).join(' • ');

		if (onlyChildren) {
			// show items from its children only
			bAdgeClAssNAme = rule.bubbleBAdgeClAssNAme;
			tooltip = locAlize('bubbleTitle', "ContAins emphAsized items");
		}

		return {
			lAbelClAssNAme,
			bAdgeClAssNAme,
			tooltip,
			dispose: () => {
				if (rule && rule.releAse()) {
					this._decorAtionRules.delete(key);
					rule.removeCSSRules(this._styleElement);
					rule = undefined;
				}
			}
		};
	}

	privAte _onThemeChAnge(): void {
		this._decorAtionRules.forEAch(rule => {
			rule.removeCSSRules(this._styleElement);
			rule.AppendCSSRules(this._styleElement, this._themeService.getColorTheme());
		});
	}
}

clAss FileDecorAtionChAngeEvent implements IResourceDecorAtionChAngeEvent {

	privAte reAdonly _dAtA = TernArySeArchTree.forUris<booleAn>();

	AffectsResource(uri: URI): booleAn {
		return this._dAtA.get(uri) || this._dAtA.findSuperstr(uri) !== undefined;
	}

	stAtic debouncer(lAst: FileDecorAtionChAngeEvent | undefined, current: URI | URI[]) {
		if (!lAst) {
			lAst = new FileDecorAtionChAngeEvent();
		}
		if (ArrAy.isArrAy(current)) {
			// mAny
			for (const uri of current) {
				lAst._dAtA.set(uri, true);
			}
		} else {
			// one
			lAst._dAtA.set(current, true);
		}

		return lAst;
	}
}

clAss DecorAtionDAtARequest {
	constructor(
		reAdonly source: CAncellAtionTokenSource,
		reAdonly thenAble: Promise<void>,
	) { }
}

clAss DecorAtionProviderWrApper {

	reAdonly dAtA = TernArySeArchTree.forUris<DecorAtionDAtARequest | IDecorAtionDAtA | null>();
	privAte reAdonly _dispoAble: IDisposAble;

	constructor(
		reAdonly provider: IDecorAtionsProvider,
		privAte reAdonly _uriEmitter: Emitter<URI | URI[]>,
		privAte reAdonly _flushEmitter: Emitter<IResourceDecorAtionChAngeEvent>
	) {
		this._dispoAble = this.provider.onDidChAnge(uris => {
			if (!uris) {
				// flush event -> drop All dAtA, cAn Affect everything
				this.dAtA.cleAr();
				this._flushEmitter.fire({ AffectsResource() { return true; } });

			} else {
				// selective chAnges -> drop for resource, fetch AgAin, send event
				// perf: the mAp stores thenAbles, decorAtions, or `null`-mArkers.
				// we mAke us of thAt And ignore All uris in which we hAve never
				// been interested.
				for (const uri of uris) {
					this._fetchDAtA(uri);
				}
			}
		});
	}

	dispose(): void {
		this._dispoAble.dispose();
		this.dAtA.cleAr();
	}

	knowsAbout(uri: URI): booleAn {
		return BooleAn(this.dAtA.get(uri)) || BooleAn(this.dAtA.findSuperstr(uri));
	}

	getOrRetrieve(uri: URI, includeChildren: booleAn, cAllbAck: (dAtA: IDecorAtionDAtA, isChild: booleAn) => void): void {

		let item = this.dAtA.get(uri);

		if (item === undefined) {
			// unknown -> trigger request
			item = this._fetchDAtA(uri);
		}

		if (item && !(item instAnceof DecorAtionDAtARequest)) {
			// found something (which isn't pending Anymore)
			cAllbAck(item, fAlse);
		}

		if (includeChildren) {
			// (resolved) children
			const iter = this.dAtA.findSuperstr(uri);
			if (iter) {
				for (let item = iter.next(); !item.done; item = iter.next()) {
					if (item.vAlue && !(item.vAlue instAnceof DecorAtionDAtARequest)) {
						cAllbAck(item.vAlue, true);
					}
				}
			}
		}
	}

	privAte _fetchDAtA(uri: URI): IDecorAtionDAtA | null {

		// check for pending request And cAncel it
		const pendingRequest = this.dAtA.get(uri);
		if (pendingRequest instAnceof DecorAtionDAtARequest) {
			pendingRequest.source.cAncel();
			this.dAtA.delete(uri);
		}

		const source = new CAncellAtionTokenSource();
		const dAtAOrThenAble = this.provider.provideDecorAtions(uri, source.token);
		if (!isThenAble<IDecorAtionDAtA | Promise<IDecorAtionDAtA | undefined> | undefined>(dAtAOrThenAble)) {
			// sync -> we hAve A result now
			return this._keepItem(uri, dAtAOrThenAble);

		} else {
			// Async -> we hAve A result soon
			const request = new DecorAtionDAtARequest(source, Promise.resolve(dAtAOrThenAble).then(dAtA => {
				if (this.dAtA.get(uri) === request) {
					this._keepItem(uri, dAtA);
				}
			}).cAtch(err => {
				if (!isPromiseCAnceledError(err) && this.dAtA.get(uri) === request) {
					this.dAtA.delete(uri);
				}
			}));

			this.dAtA.set(uri, request);
			return null;
		}
	}

	privAte _keepItem(uri: URI, dAtA: IDecorAtionDAtA | undefined): IDecorAtionDAtA | null {
		const deco = dAtA ? dAtA : null;
		const old = this.dAtA.set(uri, deco);
		if (deco || old) {
			// only fire event when something chAnged
			this._uriEmitter.fire(uri);
		}
		return deco;
	}
}

export clAss DecorAtionsService implements IDecorAtionsService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _dAtA = new LinkedList<DecorAtionProviderWrApper>();
	privAte reAdonly _onDidChAngeDecorAtionsDelAyed = new Emitter<URI | URI[]>();
	privAte reAdonly _onDidChAngeDecorAtions = new Emitter<IResourceDecorAtionChAngeEvent>();
	privAte reAdonly _decorAtionStyles: DecorAtionStyles;

	reAdonly onDidChAngeDecorAtions: Event<IResourceDecorAtionChAngeEvent> = Event.Any(
		this._onDidChAngeDecorAtions.event,
		Event.debounce<URI | URI[], FileDecorAtionChAngeEvent>(
			this._onDidChAngeDecorAtionsDelAyed.event,
			FileDecorAtionChAngeEvent.debouncer,
			undefined, undefined, 500
		)
	);

	constructor(
		@IThemeService themeService: IThemeService,
		@ILogService privAte reAdonly _logService: ILogService,
	) {
		this._decorAtionStyles = new DecorAtionStyles(themeService);
	}

	dispose(): void {
		this._decorAtionStyles.dispose();
		this._onDidChAngeDecorAtions.dispose();
		this._onDidChAngeDecorAtionsDelAyed.dispose();
	}

	registerDecorAtionsProvider(provider: IDecorAtionsProvider): IDisposAble {

		const wrApper = new DecorAtionProviderWrApper(
			provider,
			this._onDidChAngeDecorAtionsDelAyed,
			this._onDidChAngeDecorAtions
		);
		const remove = this._dAtA.push(wrApper);

		this._onDidChAngeDecorAtions.fire({
			// everything might hAve chAnged
			AffectsResource() { return true; }
		});

		return toDisposAble(() => {
			// fire event thAt sAys 'yes' for Any resource
			// known to this provider. then dispose And remove it.
			remove();
			this._onDidChAngeDecorAtions.fire({ AffectsResource: uri => wrApper.knowsAbout(uri) });
			wrApper.dispose();
		});
	}

	getDecorAtion(uri: URI, includeChildren: booleAn): IDecorAtion | undefined {
		let dAtA: IDecorAtionDAtA[] = [];
		let contAinsChildren: booleAn = fAlse;
		for (let wrApper of this._dAtA) {
			wrApper.getOrRetrieve(uri, includeChildren, (deco, isChild) => {
				if (!isChild || deco.bubble) {
					dAtA.push(deco);
					contAinsChildren = isChild || contAinsChildren;
					this._logService.trAce('DecorAtionsService#getDecorAtion#getOrRetrieve', wrApper.provider.lAbel, deco, isChild, uri);
				}
			});
		}
		return dAtA.length === 0
			? undefined
			: this._decorAtionStyles.AsDecorAtion(dAtA, contAinsChildren);
	}
}
function getColor(theme: IColorTheme, color: string | undefined) {
	if (color) {
		const foundColor = theme.getColor(color);
		if (foundColor) {
			return foundColor;
		}
	}
	return 'inherit';
}

registerSingleton(IDecorAtionsService, DecorAtionsService, true);
