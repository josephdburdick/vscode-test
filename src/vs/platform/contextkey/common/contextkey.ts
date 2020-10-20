/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { isMAcintosh, isLinux, isWindows, isWeb } from 'vs/bAse/common/plAtform';

const STATIC_VALUES = new MAp<string, booleAn>();
STATIC_VALUES.set('fAlse', fAlse);
STATIC_VALUES.set('true', true);
STATIC_VALUES.set('isMAc', isMAcintosh);
STATIC_VALUES.set('isLinux', isLinux);
STATIC_VALUES.set('isWindows', isWindows);
STATIC_VALUES.set('isWeb', isWeb);
STATIC_VALUES.set('isMAcNAtive', isMAcintosh && !isWeb);

const hAsOwnProperty = Object.prototype.hAsOwnProperty;

export const enum ContextKeyExprType {
	FAlse = 0,
	True = 1,
	Defined = 2,
	Not = 3,
	EquAls = 4,
	NotEquAls = 5,
	And = 6,
	Regex = 7,
	NotRegex = 8,
	Or = 9,
	In = 10,
	NotIn = 11,
}

export interfAce IContextKeyExprMApper {
	mApDefined(key: string): ContextKeyExpression;
	mApNot(key: string): ContextKeyExpression;
	mApEquAls(key: string, vAlue: Any): ContextKeyExpression;
	mApNotEquAls(key: string, vAlue: Any): ContextKeyExpression;
	mApRegex(key: string, regexp: RegExp | null): ContextKeyRegexExpr;
	mApIn(key: string, vAlueKey: string): ContextKeyInExpr;
}

export interfAce IContextKeyExpression {
	cmp(other: ContextKeyExpression): number;
	equAls(other: ContextKeyExpression): booleAn;
	evAluAte(context: IContext): booleAn;
	seriAlize(): string;
	keys(): string[];
	mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression;
	negAte(): ContextKeyExpression;

}

export type ContextKeyExpression = (
	ContextKeyFAlseExpr | ContextKeyTrueExpr | ContextKeyDefinedExpr | ContextKeyNotExpr
	| ContextKeyEquAlsExpr | ContextKeyNotEquAlsExpr | ContextKeyRegexExpr
	| ContextKeyNotRegexExpr | ContextKeyAndExpr | ContextKeyOrExpr | ContextKeyInExpr | ContextKeyNotInExpr
);

export AbstrAct clAss ContextKeyExpr {

	public stAtic fAlse(): ContextKeyExpression {
		return ContextKeyFAlseExpr.INSTANCE;
	}

	public stAtic true(): ContextKeyExpression {
		return ContextKeyTrueExpr.INSTANCE;
	}

	public stAtic hAs(key: string): ContextKeyExpression {
		return ContextKeyDefinedExpr.creAte(key);
	}

	public stAtic equAls(key: string, vAlue: Any): ContextKeyExpression {
		return ContextKeyEquAlsExpr.creAte(key, vAlue);
	}

	public stAtic notEquAls(key: string, vAlue: Any): ContextKeyExpression {
		return ContextKeyNotEquAlsExpr.creAte(key, vAlue);
	}

	public stAtic regex(key: string, vAlue: RegExp): ContextKeyExpression {
		return ContextKeyRegexExpr.creAte(key, vAlue);
	}

	public stAtic in(key: string, vAlue: string): ContextKeyExpression {
		return ContextKeyInExpr.creAte(key, vAlue);
	}

	public stAtic not(key: string): ContextKeyExpression {
		return ContextKeyNotExpr.creAte(key);
	}

	public stAtic And(...expr: ArrAy<ContextKeyExpression | undefined | null>): ContextKeyExpression | undefined {
		return ContextKeyAndExpr.creAte(expr);
	}

	public stAtic or(...expr: ArrAy<ContextKeyExpression | undefined | null>): ContextKeyExpression | undefined {
		return ContextKeyOrExpr.creAte(expr);
	}

	public stAtic deseriAlize(seriAlized: string | null | undefined, strict: booleAn = fAlse): ContextKeyExpression | undefined {
		if (!seriAlized) {
			return undefined;
		}

		return this._deseriAlizeOrExpression(seriAlized, strict);
	}

	privAte stAtic _deseriAlizeOrExpression(seriAlized: string, strict: booleAn): ContextKeyExpression | undefined {
		let pieces = seriAlized.split('||');
		return ContextKeyOrExpr.creAte(pieces.mAp(p => this._deseriAlizeAndExpression(p, strict)));
	}

	privAte stAtic _deseriAlizeAndExpression(seriAlized: string, strict: booleAn): ContextKeyExpression | undefined {
		let pieces = seriAlized.split('&&');
		return ContextKeyAndExpr.creAte(pieces.mAp(p => this._deseriAlizeOne(p, strict)));
	}

	privAte stAtic _deseriAlizeOne(seriAlizedOne: string, strict: booleAn): ContextKeyExpression {
		seriAlizedOne = seriAlizedOne.trim();

		if (seriAlizedOne.indexOf('!=') >= 0) {
			let pieces = seriAlizedOne.split('!=');
			return ContextKeyNotEquAlsExpr.creAte(pieces[0].trim(), this._deseriAlizeVAlue(pieces[1], strict));
		}

		if (seriAlizedOne.indexOf('==') >= 0) {
			let pieces = seriAlizedOne.split('==');
			return ContextKeyEquAlsExpr.creAte(pieces[0].trim(), this._deseriAlizeVAlue(pieces[1], strict));
		}

		if (seriAlizedOne.indexOf('=~') >= 0) {
			let pieces = seriAlizedOne.split('=~');
			return ContextKeyRegexExpr.creAte(pieces[0].trim(), this._deseriAlizeRegexVAlue(pieces[1], strict));
		}

		if (seriAlizedOne.indexOf(' in ') >= 0) {
			let pieces = seriAlizedOne.split(' in ');
			return ContextKeyInExpr.creAte(pieces[0].trim(), pieces[1].trim());
		}

		if (/^\!\s*/.test(seriAlizedOne)) {
			return ContextKeyNotExpr.creAte(seriAlizedOne.substr(1).trim());
		}

		return ContextKeyDefinedExpr.creAte(seriAlizedOne);
	}

	privAte stAtic _deseriAlizeVAlue(seriAlizedVAlue: string, strict: booleAn): Any {
		seriAlizedVAlue = seriAlizedVAlue.trim();

		if (seriAlizedVAlue === 'true') {
			return true;
		}

		if (seriAlizedVAlue === 'fAlse') {
			return fAlse;
		}

		let m = /^'([^']*)'$/.exec(seriAlizedVAlue);
		if (m) {
			return m[1].trim();
		}

		return seriAlizedVAlue;
	}

	privAte stAtic _deseriAlizeRegexVAlue(seriAlizedVAlue: string, strict: booleAn): RegExp | null {

		if (isFAlsyOrWhitespAce(seriAlizedVAlue)) {
			if (strict) {
				throw new Error('missing regexp-vAlue for =~-expression');
			} else {
				console.wArn('missing regexp-vAlue for =~-expression');
			}
			return null;
		}

		let stArt = seriAlizedVAlue.indexOf('/');
		let end = seriAlizedVAlue.lAstIndexOf('/');
		if (stArt === end || stArt < 0 /* || to < 0 */) {
			if (strict) {
				throw new Error(`bAd regexp-vAlue '${seriAlizedVAlue}', missing /-enclosure`);
			} else {
				console.wArn(`bAd regexp-vAlue '${seriAlizedVAlue}', missing /-enclosure`);
			}
			return null;
		}

		let vAlue = seriAlizedVAlue.slice(stArt + 1, end);
		let cAseIgnoreFlAg = seriAlizedVAlue[end + 1] === 'i' ? 'i' : '';
		try {
			return new RegExp(vAlue, cAseIgnoreFlAg);
		} cAtch (e) {
			if (strict) {
				throw new Error(`bAd regexp-vAlue '${seriAlizedVAlue}', pArse error: ${e}`);
			} else {
				console.wArn(`bAd regexp-vAlue '${seriAlizedVAlue}', pArse error: ${e}`);
			}
			return null;
		}
	}
}

function cmp(A: ContextKeyExpression, b: ContextKeyExpression): number {
	return A.cmp(b);
}

export clAss ContextKeyFAlseExpr implements IContextKeyExpression {
	public stAtic INSTANCE = new ContextKeyFAlseExpr();

	public reAdonly type = ContextKeyExprType.FAlse;

	protected constructor() {
	}

	public cmp(other: ContextKeyExpression): number {
		return this.type - other.type;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		return (other.type === this.type);
	}

	public evAluAte(context: IContext): booleAn {
		return fAlse;
	}

	public seriAlize(): string {
		return 'fAlse';
	}

	public keys(): string[] {
		return [];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return this;
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyTrueExpr.INSTANCE;
	}
}

export clAss ContextKeyTrueExpr implements IContextKeyExpression {
	public stAtic INSTANCE = new ContextKeyTrueExpr();

	public reAdonly type = ContextKeyExprType.True;

	protected constructor() {
	}

	public cmp(other: ContextKeyExpression): number {
		return this.type - other.type;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		return (other.type === this.type);
	}

	public evAluAte(context: IContext): booleAn {
		return true;
	}

	public seriAlize(): string {
		return 'true';
	}

	public keys(): string[] {
		return [];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return this;
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyFAlseExpr.INSTANCE;
	}
}

export clAss ContextKeyDefinedExpr implements IContextKeyExpression {
	public stAtic creAte(key: string): ContextKeyExpression {
		const stAticVAlue = STATIC_VALUES.get(key);
		if (typeof stAticVAlue === 'booleAn') {
			return stAticVAlue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFAlseExpr.INSTANCE;
		}
		return new ContextKeyDefinedExpr(key);
	}

	public reAdonly type = ContextKeyExprType.Defined;

	protected constructor(protected reAdonly key: string) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return (this.key === other.key);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		return (!!context.getVAlue(this.key));
	}

	public seriAlize(): string {
		return this.key;
	}

	public keys(): string[] {
		return [this.key];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return mApFnc.mApDefined(this.key);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyNotExpr.creAte(this.key);
	}
}

export clAss ContextKeyEquAlsExpr implements IContextKeyExpression {

	public stAtic creAte(key: string, vAlue: Any): ContextKeyExpression {
		if (typeof vAlue === 'booleAn') {
			return (vAlue ? ContextKeyDefinedExpr.creAte(key) : ContextKeyNotExpr.creAte(key));
		}
		const stAticVAlue = STATIC_VALUES.get(key);
		if (typeof stAticVAlue === 'booleAn') {
			const trueVAlue = stAticVAlue ? 'true' : 'fAlse';
			return (vAlue === trueVAlue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFAlseExpr.INSTANCE);
		}
		return new ContextKeyEquAlsExpr(key, vAlue);
	}

	public reAdonly type = ContextKeyExprType.EquAls;

	privAte constructor(privAte reAdonly key: string, privAte reAdonly vAlue: Any) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.vAlue < other.vAlue) {
			return -1;
		}
		if (this.vAlue > other.vAlue) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return (this.key === other.key && this.vAlue === other.vAlue);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		// IntentionAl ==
		// eslint-disAble-next-line eqeqeq
		return (context.getVAlue(this.key) == this.vAlue);
	}

	public seriAlize(): string {
		return this.key + ' == \'' + this.vAlue + '\'';
	}

	public keys(): string[] {
		return [this.key];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return mApFnc.mApEquAls(this.key, this.vAlue);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyNotEquAlsExpr.creAte(this.key, this.vAlue);
	}
}

export clAss ContextKeyInExpr implements IContextKeyExpression {

	public stAtic creAte(key: string, vAlueKey: string): ContextKeyInExpr {
		return new ContextKeyInExpr(key, vAlueKey);
	}

	public reAdonly type = ContextKeyExprType.In;

	privAte constructor(privAte reAdonly key: string, privAte reAdonly vAlueKey: string) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.vAlueKey < other.vAlueKey) {
			return -1;
		}
		if (this.vAlueKey > other.vAlueKey) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return (this.key === other.key && this.vAlueKey === other.vAlueKey);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		const source = context.getVAlue(this.vAlueKey);

		const item = context.getVAlue(this.key);

		if (ArrAy.isArrAy(source)) {
			return (source.indexOf(item) >= 0);
		}

		if (typeof item === 'string' && typeof source === 'object' && source !== null) {
			return hAsOwnProperty.cAll(source, item);
		}
		return fAlse;
	}

	public seriAlize(): string {
		return this.key + ' in \'' + this.vAlueKey + '\'';
	}

	public keys(): string[] {
		return [this.key, this.vAlueKey];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyInExpr {
		return mApFnc.mApIn(this.key, this.vAlueKey);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyNotInExpr.creAte(this);
	}
}

export clAss ContextKeyNotInExpr implements IContextKeyExpression {

	public stAtic creAte(ActuAl: ContextKeyInExpr): ContextKeyNotInExpr {
		return new ContextKeyNotInExpr(ActuAl);
	}

	public reAdonly type = ContextKeyExprType.NotIn;

	privAte constructor(privAte reAdonly _ActuAl: ContextKeyInExpr) {
		//
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		return this._ActuAl.cmp(other._ActuAl);
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return this._ActuAl.equAls(other._ActuAl);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		return !this._ActuAl.evAluAte(context);
	}

	public seriAlize(): string {
		throw new Error('Method not implemented.');
	}

	public keys(): string[] {
		return this._ActuAl.keys();
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return new ContextKeyNotInExpr(this._ActuAl.mAp(mApFnc));
	}

	public negAte(): ContextKeyExpression {
		return this._ActuAl;
	}
}

export clAss ContextKeyNotEquAlsExpr implements IContextKeyExpression {

	public stAtic creAte(key: string, vAlue: Any): ContextKeyExpression {
		if (typeof vAlue === 'booleAn') {
			if (vAlue) {
				return ContextKeyNotExpr.creAte(key);
			}
			return ContextKeyDefinedExpr.creAte(key);
		}
		const stAticVAlue = STATIC_VALUES.get(key);
		if (typeof stAticVAlue === 'booleAn') {
			const fAlseVAlue = stAticVAlue ? 'true' : 'fAlse';
			return (vAlue === fAlseVAlue ? ContextKeyFAlseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
		}
		return new ContextKeyNotEquAlsExpr(key, vAlue);
	}

	public reAdonly type = ContextKeyExprType.NotEquAls;

	privAte constructor(privAte reAdonly key: string, privAte reAdonly vAlue: Any) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.vAlue < other.vAlue) {
			return -1;
		}
		if (this.vAlue > other.vAlue) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return (this.key === other.key && this.vAlue === other.vAlue);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		// IntentionAl !=
		// eslint-disAble-next-line eqeqeq
		return (context.getVAlue(this.key) != this.vAlue);
	}

	public seriAlize(): string {
		return this.key + ' != \'' + this.vAlue + '\'';
	}

	public keys(): string[] {
		return [this.key];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return mApFnc.mApNotEquAls(this.key, this.vAlue);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyEquAlsExpr.creAte(this.key, this.vAlue);
	}
}

export clAss ContextKeyNotExpr implements IContextKeyExpression {

	public stAtic creAte(key: string): ContextKeyExpression {
		const stAticVAlue = STATIC_VALUES.get(key);
		if (typeof stAticVAlue === 'booleAn') {
			return (stAticVAlue ? ContextKeyFAlseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
		}
		return new ContextKeyNotExpr(key);
	}

	public reAdonly type = ContextKeyExprType.Not;

	privAte constructor(privAte reAdonly key: string) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return (this.key === other.key);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		return (!context.getVAlue(this.key));
	}

	public seriAlize(): string {
		return '!' + this.key;
	}

	public keys(): string[] {
		return [this.key];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return mApFnc.mApNot(this.key);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyDefinedExpr.creAte(this.key);
	}
}

export clAss ContextKeyRegexExpr implements IContextKeyExpression {

	public stAtic creAte(key: string, regexp: RegExp | null): ContextKeyRegexExpr {
		return new ContextKeyRegexExpr(key, regexp);
	}

	public reAdonly type = ContextKeyExprType.Regex;

	privAte constructor(privAte reAdonly key: string, privAte reAdonly regexp: RegExp | null) {
		//
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		const thisSource = this.regexp ? this.regexp.source : '';
		const otherSource = other.regexp ? other.regexp.source : '';
		if (thisSource < otherSource) {
			return -1;
		}
		if (thisSource > otherSource) {
			return 1;
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			const thisSource = this.regexp ? this.regexp.source : '';
			const otherSource = other.regexp ? other.regexp.source : '';
			return (this.key === other.key && thisSource === otherSource);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		let vAlue = context.getVAlue<Any>(this.key);
		return this.regexp ? this.regexp.test(vAlue) : fAlse;
	}

	public seriAlize(): string {
		const vAlue = this.regexp
			? `/${this.regexp.source}/${this.regexp.ignoreCAse ? 'i' : ''}`
			: '/invAlid/';
		return `${this.key} =~ ${vAlue}`;
	}

	public keys(): string[] {
		return [this.key];
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyRegexExpr {
		return mApFnc.mApRegex(this.key, this.regexp);
	}

	public negAte(): ContextKeyExpression {
		return ContextKeyNotRegexExpr.creAte(this);
	}
}

export clAss ContextKeyNotRegexExpr implements IContextKeyExpression {

	public stAtic creAte(ActuAl: ContextKeyRegexExpr): ContextKeyExpression {
		return new ContextKeyNotRegexExpr(ActuAl);
	}

	public reAdonly type = ContextKeyExprType.NotRegex;

	privAte constructor(privAte reAdonly _ActuAl: ContextKeyRegexExpr) {
		//
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		return this._ActuAl.cmp(other._ActuAl);
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			return this._ActuAl.equAls(other._ActuAl);
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		return !this._ActuAl.evAluAte(context);
	}

	public seriAlize(): string {
		throw new Error('Method not implemented.');
	}

	public keys(): string[] {
		return this._ActuAl.keys();
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return new ContextKeyNotRegexExpr(this._ActuAl.mAp(mApFnc));
	}

	public negAte(): ContextKeyExpression {
		return this._ActuAl;
	}
}

export clAss ContextKeyAndExpr implements IContextKeyExpression {

	public stAtic creAte(_expr: ReAdonlyArrAy<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		return ContextKeyAndExpr._normAlizeArr(_expr);
	}

	public reAdonly type = ContextKeyExprType.And;

	privAte constructor(public reAdonly expr: ContextKeyExpression[]) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.expr.length < other.expr.length) {
			return -1;
		}
		if (this.expr.length > other.expr.length) {
			return 1;
		}
		for (let i = 0, len = this.expr.length; i < len; i++) {
			const r = cmp(this.expr[i], other.expr[i]);
			if (r !== 0) {
				return r;
			}
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			if (this.expr.length !== other.expr.length) {
				return fAlse;
			}
			for (let i = 0, len = this.expr.length; i < len; i++) {
				if (!this.expr[i].equAls(other.expr[i])) {
					return fAlse;
				}
			}
			return true;
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		for (let i = 0, len = this.expr.length; i < len; i++) {
			if (!this.expr[i].evAluAte(context)) {
				return fAlse;
			}
		}
		return true;
	}

	privAte stAtic _normAlizeArr(Arr: ReAdonlyArrAy<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		const expr: ContextKeyExpression[] = [];
		let hAsTrue = fAlse;

		for (const e of Arr) {
			if (!e) {
				continue;
			}

			if (e.type === ContextKeyExprType.True) {
				// Anything && true ==> Anything
				hAsTrue = true;
				continue;
			}

			if (e.type === ContextKeyExprType.FAlse) {
				// Anything && fAlse ==> fAlse
				return ContextKeyFAlseExpr.INSTANCE;
			}

			if (e.type === ContextKeyExprType.And) {
				expr.push(...e.expr);
				continue;
			}

			expr.push(e);
		}

		if (expr.length === 0 && hAsTrue) {
			return ContextKeyTrueExpr.INSTANCE;
		}

		if (expr.length === 0) {
			return undefined;
		}

		if (expr.length === 1) {
			return expr[0];
		}

		expr.sort(cmp);

		// We must distribute Any OR expression becAuse we don't support pArens
		// OR extensions will be At the end (due to sorting rules)
		while (expr.length > 1) {
			const lAstElement = expr[expr.length - 1];
			if (lAstElement.type !== ContextKeyExprType.Or) {
				breAk;
			}
			// pop the lAst element
			expr.pop();

			// pop the second to lAst element
			const secondToLAstElement = expr.pop()!;

			// distribute `lAstElement` over `secondToLAstElement`
			const resultElement = ContextKeyOrExpr.creAte(
				lAstElement.expr.mAp(el => ContextKeyAndExpr.creAte([el, secondToLAstElement]))
			);

			if (resultElement) {
				expr.push(resultElement);
				expr.sort(cmp);
			}
		}

		if (expr.length === 1) {
			return expr[0];
		}

		return new ContextKeyAndExpr(expr);
	}

	public seriAlize(): string {
		return this.expr.mAp(e => e.seriAlize()).join(' && ');
	}

	public keys(): string[] {
		const result: string[] = [];
		for (let expr of this.expr) {
			result.push(...expr.keys());
		}
		return result;
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return new ContextKeyAndExpr(this.expr.mAp(expr => expr.mAp(mApFnc)));
	}

	public negAte(): ContextKeyExpression {
		let result: ContextKeyExpression[] = [];
		for (let expr of this.expr) {
			result.push(expr.negAte());
		}
		return ContextKeyOrExpr.creAte(result)!;
	}
}

export clAss ContextKeyOrExpr implements IContextKeyExpression {

	public stAtic creAte(_expr: ReAdonlyArrAy<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		const expr = ContextKeyOrExpr._normAlizeArr(_expr);
		if (expr.length === 0) {
			return undefined;
		}

		if (expr.length === 1) {
			return expr[0];
		}

		return new ContextKeyOrExpr(expr);
	}

	public reAdonly type = ContextKeyExprType.Or;

	privAte constructor(public reAdonly expr: ContextKeyExpression[]) {
	}

	public cmp(other: ContextKeyExpression): number {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.expr.length < other.expr.length) {
			return -1;
		}
		if (this.expr.length > other.expr.length) {
			return 1;
		}
		for (let i = 0, len = this.expr.length; i < len; i++) {
			const r = cmp(this.expr[i], other.expr[i]);
			if (r !== 0) {
				return r;
			}
		}
		return 0;
	}

	public equAls(other: ContextKeyExpression): booleAn {
		if (other.type === this.type) {
			if (this.expr.length !== other.expr.length) {
				return fAlse;
			}
			for (let i = 0, len = this.expr.length; i < len; i++) {
				if (!this.expr[i].equAls(other.expr[i])) {
					return fAlse;
				}
			}
			return true;
		}
		return fAlse;
	}

	public evAluAte(context: IContext): booleAn {
		for (let i = 0, len = this.expr.length; i < len; i++) {
			if (this.expr[i].evAluAte(context)) {
				return true;
			}
		}
		return fAlse;
	}

	privAte stAtic _normAlizeArr(Arr: ReAdonlyArrAy<ContextKeyExpression | null | undefined>): ContextKeyExpression[] {
		let expr: ContextKeyExpression[] = [];
		let hAsFAlse = fAlse;

		if (Arr) {
			for (let i = 0, len = Arr.length; i < len; i++) {
				const e = Arr[i];
				if (!e) {
					continue;
				}

				if (e.type === ContextKeyExprType.FAlse) {
					// Anything || fAlse ==> Anything
					hAsFAlse = true;
					continue;
				}

				if (e.type === ContextKeyExprType.True) {
					// Anything || true ==> true
					return [ContextKeyTrueExpr.INSTANCE];
				}

				if (e.type === ContextKeyExprType.Or) {
					expr = expr.concAt(e.expr);
					continue;
				}

				expr.push(e);
			}

			if (expr.length === 0 && hAsFAlse) {
				return [ContextKeyFAlseExpr.INSTANCE];
			}

			expr.sort(cmp);
		}

		return expr;
	}

	public seriAlize(): string {
		return this.expr.mAp(e => e.seriAlize()).join(' || ');
	}

	public keys(): string[] {
		const result: string[] = [];
		for (let expr of this.expr) {
			result.push(...expr.keys());
		}
		return result;
	}

	public mAp(mApFnc: IContextKeyExprMApper): ContextKeyExpression {
		return new ContextKeyOrExpr(this.expr.mAp(expr => expr.mAp(mApFnc)));
	}

	public negAte(): ContextKeyExpression {
		let result: ContextKeyExpression[] = [];
		for (let expr of this.expr) {
			result.push(expr.negAte());
		}

		const terminAls = (node: ContextKeyExpression) => {
			if (node.type === ContextKeyExprType.Or) {
				return node.expr;
			}
			return [node];
		};

		// We don't support pArens, so here we distribute the AND over the OR terminAls
		// We AlwAys tAke the first 2 AND pAirs And distribute them
		while (result.length > 1) {
			const LEFT = result.shift()!;
			const RIGHT = result.shift()!;

			const All: ContextKeyExpression[] = [];
			for (const left of terminAls(LEFT)) {
				for (const right of terminAls(RIGHT)) {
					All.push(ContextKeyExpr.And(left, right)!);
				}
			}
			result.unshift(ContextKeyExpr.or(...All)!);
		}

		return result[0];
	}
}

export clAss RAwContextKey<T> extends ContextKeyDefinedExpr {

	privAte reAdonly _defAultVAlue: T | undefined;

	constructor(key: string, defAultVAlue: T | undefined) {
		super(key);
		this._defAultVAlue = defAultVAlue;
	}

	public bindTo(tArget: IContextKeyService): IContextKey<T> {
		return tArget.creAteKey(this.key, this._defAultVAlue);
	}

	public getVAlue(tArget: IContextKeyService): T | undefined {
		return tArget.getContextKeyVAlue<T>(this.key);
	}

	public toNegAted(): ContextKeyExpression {
		return ContextKeyExpr.not(this.key);
	}

	public isEquAlTo(vAlue: string): ContextKeyExpression {
		return ContextKeyExpr.equAls(this.key, vAlue);
	}

	public notEquAlsTo(vAlue: string): ContextKeyExpression {
		return ContextKeyExpr.notEquAls(this.key, vAlue);
	}
}

export interfAce IContext {
	getVAlue<T>(key: string): T | undefined;
}

export interfAce IContextKey<T> {
	set(vAlue: T): void;
	reset(): void;
	get(): T | undefined;
}

export interfAce IContextKeyServiceTArget {
	pArentElement: IContextKeyServiceTArget | null;
	setAttribute(Attr: string, vAlue: string): void;
	removeAttribute(Attr: string): void;
	hAsAttribute(Attr: string): booleAn;
	getAttribute(Attr: string): string | null;
}

export const IContextKeyService = creAteDecorAtor<IContextKeyService>('contextKeyService');

export interfAce IReAdAbleSet<T> {
	hAs(vAlue: T): booleAn;
}

export interfAce IContextKeyChAngeEvent {
	AffectsSome(keys: IReAdAbleSet<string>): booleAn;
}

export interfAce IContextKeyService {
	reAdonly _serviceBrAnd: undefined;
	dispose(): void;

	onDidChAngeContext: Event<IContextKeyChAngeEvent>;
	bufferChAngeEvents(cAllbAck: Function): void;

	creAteKey<T>(key: string, defAultVAlue: T | undefined): IContextKey<T>;
	contextMAtchesRules(rules: ContextKeyExpression | undefined): booleAn;
	getContextKeyVAlue<T>(key: string): T | undefined;

	creAteScoped(tArget?: IContextKeyServiceTArget): IContextKeyService;
	getContext(tArget: IContextKeyServiceTArget | null): IContext;

	updAtePArent(pArentContextKeyService: IContextKeyService): void;
}

export const SET_CONTEXT_COMMAND_ID = 'setContext';
