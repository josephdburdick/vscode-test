/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { isMacintosh, isLinux, isWindows, isWeB } from 'vs/Base/common/platform';

const STATIC_VALUES = new Map<string, Boolean>();
STATIC_VALUES.set('false', false);
STATIC_VALUES.set('true', true);
STATIC_VALUES.set('isMac', isMacintosh);
STATIC_VALUES.set('isLinux', isLinux);
STATIC_VALUES.set('isWindows', isWindows);
STATIC_VALUES.set('isWeB', isWeB);
STATIC_VALUES.set('isMacNative', isMacintosh && !isWeB);

const hasOwnProperty = OBject.prototype.hasOwnProperty;

export const enum ContextKeyExprType {
	False = 0,
	True = 1,
	Defined = 2,
	Not = 3,
	Equals = 4,
	NotEquals = 5,
	And = 6,
	Regex = 7,
	NotRegex = 8,
	Or = 9,
	In = 10,
	NotIn = 11,
}

export interface IContextKeyExprMapper {
	mapDefined(key: string): ContextKeyExpression;
	mapNot(key: string): ContextKeyExpression;
	mapEquals(key: string, value: any): ContextKeyExpression;
	mapNotEquals(key: string, value: any): ContextKeyExpression;
	mapRegex(key: string, regexp: RegExp | null): ContextKeyRegexExpr;
	mapIn(key: string, valueKey: string): ContextKeyInExpr;
}

export interface IContextKeyExpression {
	cmp(other: ContextKeyExpression): numBer;
	equals(other: ContextKeyExpression): Boolean;
	evaluate(context: IContext): Boolean;
	serialize(): string;
	keys(): string[];
	map(mapFnc: IContextKeyExprMapper): ContextKeyExpression;
	negate(): ContextKeyExpression;

}

export type ContextKeyExpression = (
	ContextKeyFalseExpr | ContextKeyTrueExpr | ContextKeyDefinedExpr | ContextKeyNotExpr
	| ContextKeyEqualsExpr | ContextKeyNotEqualsExpr | ContextKeyRegexExpr
	| ContextKeyNotRegexExpr | ContextKeyAndExpr | ContextKeyOrExpr | ContextKeyInExpr | ContextKeyNotInExpr
);

export aBstract class ContextKeyExpr {

	puBlic static false(): ContextKeyExpression {
		return ContextKeyFalseExpr.INSTANCE;
	}

	puBlic static true(): ContextKeyExpression {
		return ContextKeyTrueExpr.INSTANCE;
	}

	puBlic static has(key: string): ContextKeyExpression {
		return ContextKeyDefinedExpr.create(key);
	}

	puBlic static equals(key: string, value: any): ContextKeyExpression {
		return ContextKeyEqualsExpr.create(key, value);
	}

	puBlic static notEquals(key: string, value: any): ContextKeyExpression {
		return ContextKeyNotEqualsExpr.create(key, value);
	}

	puBlic static regex(key: string, value: RegExp): ContextKeyExpression {
		return ContextKeyRegexExpr.create(key, value);
	}

	puBlic static in(key: string, value: string): ContextKeyExpression {
		return ContextKeyInExpr.create(key, value);
	}

	puBlic static not(key: string): ContextKeyExpression {
		return ContextKeyNotExpr.create(key);
	}

	puBlic static and(...expr: Array<ContextKeyExpression | undefined | null>): ContextKeyExpression | undefined {
		return ContextKeyAndExpr.create(expr);
	}

	puBlic static or(...expr: Array<ContextKeyExpression | undefined | null>): ContextKeyExpression | undefined {
		return ContextKeyOrExpr.create(expr);
	}

	puBlic static deserialize(serialized: string | null | undefined, strict: Boolean = false): ContextKeyExpression | undefined {
		if (!serialized) {
			return undefined;
		}

		return this._deserializeOrExpression(serialized, strict);
	}

	private static _deserializeOrExpression(serialized: string, strict: Boolean): ContextKeyExpression | undefined {
		let pieces = serialized.split('||');
		return ContextKeyOrExpr.create(pieces.map(p => this._deserializeAndExpression(p, strict)));
	}

	private static _deserializeAndExpression(serialized: string, strict: Boolean): ContextKeyExpression | undefined {
		let pieces = serialized.split('&&');
		return ContextKeyAndExpr.create(pieces.map(p => this._deserializeOne(p, strict)));
	}

	private static _deserializeOne(serializedOne: string, strict: Boolean): ContextKeyExpression {
		serializedOne = serializedOne.trim();

		if (serializedOne.indexOf('!=') >= 0) {
			let pieces = serializedOne.split('!=');
			return ContextKeyNotEqualsExpr.create(pieces[0].trim(), this._deserializeValue(pieces[1], strict));
		}

		if (serializedOne.indexOf('==') >= 0) {
			let pieces = serializedOne.split('==');
			return ContextKeyEqualsExpr.create(pieces[0].trim(), this._deserializeValue(pieces[1], strict));
		}

		if (serializedOne.indexOf('=~') >= 0) {
			let pieces = serializedOne.split('=~');
			return ContextKeyRegexExpr.create(pieces[0].trim(), this._deserializeRegexValue(pieces[1], strict));
		}

		if (serializedOne.indexOf(' in ') >= 0) {
			let pieces = serializedOne.split(' in ');
			return ContextKeyInExpr.create(pieces[0].trim(), pieces[1].trim());
		}

		if (/^\!\s*/.test(serializedOne)) {
			return ContextKeyNotExpr.create(serializedOne.suBstr(1).trim());
		}

		return ContextKeyDefinedExpr.create(serializedOne);
	}

	private static _deserializeValue(serializedValue: string, strict: Boolean): any {
		serializedValue = serializedValue.trim();

		if (serializedValue === 'true') {
			return true;
		}

		if (serializedValue === 'false') {
			return false;
		}

		let m = /^'([^']*)'$/.exec(serializedValue);
		if (m) {
			return m[1].trim();
		}

		return serializedValue;
	}

	private static _deserializeRegexValue(serializedValue: string, strict: Boolean): RegExp | null {

		if (isFalsyOrWhitespace(serializedValue)) {
			if (strict) {
				throw new Error('missing regexp-value for =~-expression');
			} else {
				console.warn('missing regexp-value for =~-expression');
			}
			return null;
		}

		let start = serializedValue.indexOf('/');
		let end = serializedValue.lastIndexOf('/');
		if (start === end || start < 0 /* || to < 0 */) {
			if (strict) {
				throw new Error(`Bad regexp-value '${serializedValue}', missing /-enclosure`);
			} else {
				console.warn(`Bad regexp-value '${serializedValue}', missing /-enclosure`);
			}
			return null;
		}

		let value = serializedValue.slice(start + 1, end);
		let caseIgnoreFlag = serializedValue[end + 1] === 'i' ? 'i' : '';
		try {
			return new RegExp(value, caseIgnoreFlag);
		} catch (e) {
			if (strict) {
				throw new Error(`Bad regexp-value '${serializedValue}', parse error: ${e}`);
			} else {
				console.warn(`Bad regexp-value '${serializedValue}', parse error: ${e}`);
			}
			return null;
		}
	}
}

function cmp(a: ContextKeyExpression, B: ContextKeyExpression): numBer {
	return a.cmp(B);
}

export class ContextKeyFalseExpr implements IContextKeyExpression {
	puBlic static INSTANCE = new ContextKeyFalseExpr();

	puBlic readonly type = ContextKeyExprType.False;

	protected constructor() {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		return this.type - other.type;
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		return (other.type === this.type);
	}

	puBlic evaluate(context: IContext): Boolean {
		return false;
	}

	puBlic serialize(): string {
		return 'false';
	}

	puBlic keys(): string[] {
		return [];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return this;
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyTrueExpr.INSTANCE;
	}
}

export class ContextKeyTrueExpr implements IContextKeyExpression {
	puBlic static INSTANCE = new ContextKeyTrueExpr();

	puBlic readonly type = ContextKeyExprType.True;

	protected constructor() {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		return this.type - other.type;
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		return (other.type === this.type);
	}

	puBlic evaluate(context: IContext): Boolean {
		return true;
	}

	puBlic serialize(): string {
		return 'true';
	}

	puBlic keys(): string[] {
		return [];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return this;
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyFalseExpr.INSTANCE;
	}
}

export class ContextKeyDefinedExpr implements IContextKeyExpression {
	puBlic static create(key: string): ContextKeyExpression {
		const staticValue = STATIC_VALUES.get(key);
		if (typeof staticValue === 'Boolean') {
			return staticValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
		}
		return new ContextKeyDefinedExpr(key);
	}

	puBlic readonly type = ContextKeyExprType.Defined;

	protected constructor(protected readonly key: string) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
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

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return (this.key === other.key);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		return (!!context.getValue(this.key));
	}

	puBlic serialize(): string {
		return this.key;
	}

	puBlic keys(): string[] {
		return [this.key];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return mapFnc.mapDefined(this.key);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyNotExpr.create(this.key);
	}
}

export class ContextKeyEqualsExpr implements IContextKeyExpression {

	puBlic static create(key: string, value: any): ContextKeyExpression {
		if (typeof value === 'Boolean') {
			return (value ? ContextKeyDefinedExpr.create(key) : ContextKeyNotExpr.create(key));
		}
		const staticValue = STATIC_VALUES.get(key);
		if (typeof staticValue === 'Boolean') {
			const trueValue = staticValue ? 'true' : 'false';
			return (value === trueValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE);
		}
		return new ContextKeyEqualsExpr(key, value);
	}

	puBlic readonly type = ContextKeyExprType.Equals;

	private constructor(private readonly key: string, private readonly value: any) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.value < other.value) {
			return -1;
		}
		if (this.value > other.value) {
			return 1;
		}
		return 0;
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return (this.key === other.key && this.value === other.value);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		// Intentional ==
		// eslint-disaBle-next-line eqeqeq
		return (context.getValue(this.key) == this.value);
	}

	puBlic serialize(): string {
		return this.key + ' == \'' + this.value + '\'';
	}

	puBlic keys(): string[] {
		return [this.key];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return mapFnc.mapEquals(this.key, this.value);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyNotEqualsExpr.create(this.key, this.value);
	}
}

export class ContextKeyInExpr implements IContextKeyExpression {

	puBlic static create(key: string, valueKey: string): ContextKeyInExpr {
		return new ContextKeyInExpr(key, valueKey);
	}

	puBlic readonly type = ContextKeyExprType.In;

	private constructor(private readonly key: string, private readonly valueKey: string) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.valueKey < other.valueKey) {
			return -1;
		}
		if (this.valueKey > other.valueKey) {
			return 1;
		}
		return 0;
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return (this.key === other.key && this.valueKey === other.valueKey);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		const source = context.getValue(this.valueKey);

		const item = context.getValue(this.key);

		if (Array.isArray(source)) {
			return (source.indexOf(item) >= 0);
		}

		if (typeof item === 'string' && typeof source === 'oBject' && source !== null) {
			return hasOwnProperty.call(source, item);
		}
		return false;
	}

	puBlic serialize(): string {
		return this.key + ' in \'' + this.valueKey + '\'';
	}

	puBlic keys(): string[] {
		return [this.key, this.valueKey];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyInExpr {
		return mapFnc.mapIn(this.key, this.valueKey);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyNotInExpr.create(this);
	}
}

export class ContextKeyNotInExpr implements IContextKeyExpression {

	puBlic static create(actual: ContextKeyInExpr): ContextKeyNotInExpr {
		return new ContextKeyNotInExpr(actual);
	}

	puBlic readonly type = ContextKeyExprType.NotIn;

	private constructor(private readonly _actual: ContextKeyInExpr) {
		//
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		return this._actual.cmp(other._actual);
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return this._actual.equals(other._actual);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		return !this._actual.evaluate(context);
	}

	puBlic serialize(): string {
		throw new Error('Method not implemented.');
	}

	puBlic keys(): string[] {
		return this._actual.keys();
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return new ContextKeyNotInExpr(this._actual.map(mapFnc));
	}

	puBlic negate(): ContextKeyExpression {
		return this._actual;
	}
}

export class ContextKeyNotEqualsExpr implements IContextKeyExpression {

	puBlic static create(key: string, value: any): ContextKeyExpression {
		if (typeof value === 'Boolean') {
			if (value) {
				return ContextKeyNotExpr.create(key);
			}
			return ContextKeyDefinedExpr.create(key);
		}
		const staticValue = STATIC_VALUES.get(key);
		if (typeof staticValue === 'Boolean') {
			const falseValue = staticValue ? 'true' : 'false';
			return (value === falseValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
		}
		return new ContextKeyNotEqualsExpr(key, value);
	}

	puBlic readonly type = ContextKeyExprType.NotEquals;

	private constructor(private readonly key: string, private readonly value: any) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		if (this.key < other.key) {
			return -1;
		}
		if (this.key > other.key) {
			return 1;
		}
		if (this.value < other.value) {
			return -1;
		}
		if (this.value > other.value) {
			return 1;
		}
		return 0;
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return (this.key === other.key && this.value === other.value);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		// Intentional !=
		// eslint-disaBle-next-line eqeqeq
		return (context.getValue(this.key) != this.value);
	}

	puBlic serialize(): string {
		return this.key + ' != \'' + this.value + '\'';
	}

	puBlic keys(): string[] {
		return [this.key];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return mapFnc.mapNotEquals(this.key, this.value);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyEqualsExpr.create(this.key, this.value);
	}
}

export class ContextKeyNotExpr implements IContextKeyExpression {

	puBlic static create(key: string): ContextKeyExpression {
		const staticValue = STATIC_VALUES.get(key);
		if (typeof staticValue === 'Boolean') {
			return (staticValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE);
		}
		return new ContextKeyNotExpr(key);
	}

	puBlic readonly type = ContextKeyExprType.Not;

	private constructor(private readonly key: string) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
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

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return (this.key === other.key);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		return (!context.getValue(this.key));
	}

	puBlic serialize(): string {
		return '!' + this.key;
	}

	puBlic keys(): string[] {
		return [this.key];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return mapFnc.mapNot(this.key);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyDefinedExpr.create(this.key);
	}
}

export class ContextKeyRegexExpr implements IContextKeyExpression {

	puBlic static create(key: string, regexp: RegExp | null): ContextKeyRegexExpr {
		return new ContextKeyRegexExpr(key, regexp);
	}

	puBlic readonly type = ContextKeyExprType.Regex;

	private constructor(private readonly key: string, private readonly regexp: RegExp | null) {
		//
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
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

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			const thisSource = this.regexp ? this.regexp.source : '';
			const otherSource = other.regexp ? other.regexp.source : '';
			return (this.key === other.key && thisSource === otherSource);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		let value = context.getValue<any>(this.key);
		return this.regexp ? this.regexp.test(value) : false;
	}

	puBlic serialize(): string {
		const value = this.regexp
			? `/${this.regexp.source}/${this.regexp.ignoreCase ? 'i' : ''}`
			: '/invalid/';
		return `${this.key} =~ ${value}`;
	}

	puBlic keys(): string[] {
		return [this.key];
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyRegexExpr {
		return mapFnc.mapRegex(this.key, this.regexp);
	}

	puBlic negate(): ContextKeyExpression {
		return ContextKeyNotRegexExpr.create(this);
	}
}

export class ContextKeyNotRegexExpr implements IContextKeyExpression {

	puBlic static create(actual: ContextKeyRegexExpr): ContextKeyExpression {
		return new ContextKeyNotRegexExpr(actual);
	}

	puBlic readonly type = ContextKeyExprType.NotRegex;

	private constructor(private readonly _actual: ContextKeyRegexExpr) {
		//
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
		if (other.type !== this.type) {
			return this.type - other.type;
		}
		return this._actual.cmp(other._actual);
	}

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			return this._actual.equals(other._actual);
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		return !this._actual.evaluate(context);
	}

	puBlic serialize(): string {
		throw new Error('Method not implemented.');
	}

	puBlic keys(): string[] {
		return this._actual.keys();
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return new ContextKeyNotRegexExpr(this._actual.map(mapFnc));
	}

	puBlic negate(): ContextKeyExpression {
		return this._actual;
	}
}

export class ContextKeyAndExpr implements IContextKeyExpression {

	puBlic static create(_expr: ReadonlyArray<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		return ContextKeyAndExpr._normalizeArr(_expr);
	}

	puBlic readonly type = ContextKeyExprType.And;

	private constructor(puBlic readonly expr: ContextKeyExpression[]) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
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

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			if (this.expr.length !== other.expr.length) {
				return false;
			}
			for (let i = 0, len = this.expr.length; i < len; i++) {
				if (!this.expr[i].equals(other.expr[i])) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		for (let i = 0, len = this.expr.length; i < len; i++) {
			if (!this.expr[i].evaluate(context)) {
				return false;
			}
		}
		return true;
	}

	private static _normalizeArr(arr: ReadonlyArray<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		const expr: ContextKeyExpression[] = [];
		let hasTrue = false;

		for (const e of arr) {
			if (!e) {
				continue;
			}

			if (e.type === ContextKeyExprType.True) {
				// anything && true ==> anything
				hasTrue = true;
				continue;
			}

			if (e.type === ContextKeyExprType.False) {
				// anything && false ==> false
				return ContextKeyFalseExpr.INSTANCE;
			}

			if (e.type === ContextKeyExprType.And) {
				expr.push(...e.expr);
				continue;
			}

			expr.push(e);
		}

		if (expr.length === 0 && hasTrue) {
			return ContextKeyTrueExpr.INSTANCE;
		}

		if (expr.length === 0) {
			return undefined;
		}

		if (expr.length === 1) {
			return expr[0];
		}

		expr.sort(cmp);

		// We must distriBute any OR expression Because we don't support parens
		// OR extensions will Be at the end (due to sorting rules)
		while (expr.length > 1) {
			const lastElement = expr[expr.length - 1];
			if (lastElement.type !== ContextKeyExprType.Or) {
				Break;
			}
			// pop the last element
			expr.pop();

			// pop the second to last element
			const secondToLastElement = expr.pop()!;

			// distriBute `lastElement` over `secondToLastElement`
			const resultElement = ContextKeyOrExpr.create(
				lastElement.expr.map(el => ContextKeyAndExpr.create([el, secondToLastElement]))
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

	puBlic serialize(): string {
		return this.expr.map(e => e.serialize()).join(' && ');
	}

	puBlic keys(): string[] {
		const result: string[] = [];
		for (let expr of this.expr) {
			result.push(...expr.keys());
		}
		return result;
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return new ContextKeyAndExpr(this.expr.map(expr => expr.map(mapFnc)));
	}

	puBlic negate(): ContextKeyExpression {
		let result: ContextKeyExpression[] = [];
		for (let expr of this.expr) {
			result.push(expr.negate());
		}
		return ContextKeyOrExpr.create(result)!;
	}
}

export class ContextKeyOrExpr implements IContextKeyExpression {

	puBlic static create(_expr: ReadonlyArray<ContextKeyExpression | null | undefined>): ContextKeyExpression | undefined {
		const expr = ContextKeyOrExpr._normalizeArr(_expr);
		if (expr.length === 0) {
			return undefined;
		}

		if (expr.length === 1) {
			return expr[0];
		}

		return new ContextKeyOrExpr(expr);
	}

	puBlic readonly type = ContextKeyExprType.Or;

	private constructor(puBlic readonly expr: ContextKeyExpression[]) {
	}

	puBlic cmp(other: ContextKeyExpression): numBer {
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

	puBlic equals(other: ContextKeyExpression): Boolean {
		if (other.type === this.type) {
			if (this.expr.length !== other.expr.length) {
				return false;
			}
			for (let i = 0, len = this.expr.length; i < len; i++) {
				if (!this.expr[i].equals(other.expr[i])) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	puBlic evaluate(context: IContext): Boolean {
		for (let i = 0, len = this.expr.length; i < len; i++) {
			if (this.expr[i].evaluate(context)) {
				return true;
			}
		}
		return false;
	}

	private static _normalizeArr(arr: ReadonlyArray<ContextKeyExpression | null | undefined>): ContextKeyExpression[] {
		let expr: ContextKeyExpression[] = [];
		let hasFalse = false;

		if (arr) {
			for (let i = 0, len = arr.length; i < len; i++) {
				const e = arr[i];
				if (!e) {
					continue;
				}

				if (e.type === ContextKeyExprType.False) {
					// anything || false ==> anything
					hasFalse = true;
					continue;
				}

				if (e.type === ContextKeyExprType.True) {
					// anything || true ==> true
					return [ContextKeyTrueExpr.INSTANCE];
				}

				if (e.type === ContextKeyExprType.Or) {
					expr = expr.concat(e.expr);
					continue;
				}

				expr.push(e);
			}

			if (expr.length === 0 && hasFalse) {
				return [ContextKeyFalseExpr.INSTANCE];
			}

			expr.sort(cmp);
		}

		return expr;
	}

	puBlic serialize(): string {
		return this.expr.map(e => e.serialize()).join(' || ');
	}

	puBlic keys(): string[] {
		const result: string[] = [];
		for (let expr of this.expr) {
			result.push(...expr.keys());
		}
		return result;
	}

	puBlic map(mapFnc: IContextKeyExprMapper): ContextKeyExpression {
		return new ContextKeyOrExpr(this.expr.map(expr => expr.map(mapFnc)));
	}

	puBlic negate(): ContextKeyExpression {
		let result: ContextKeyExpression[] = [];
		for (let expr of this.expr) {
			result.push(expr.negate());
		}

		const terminals = (node: ContextKeyExpression) => {
			if (node.type === ContextKeyExprType.Or) {
				return node.expr;
			}
			return [node];
		};

		// We don't support parens, so here we distriBute the AND over the OR terminals
		// We always take the first 2 AND pairs and distriBute them
		while (result.length > 1) {
			const LEFT = result.shift()!;
			const RIGHT = result.shift()!;

			const all: ContextKeyExpression[] = [];
			for (const left of terminals(LEFT)) {
				for (const right of terminals(RIGHT)) {
					all.push(ContextKeyExpr.and(left, right)!);
				}
			}
			result.unshift(ContextKeyExpr.or(...all)!);
		}

		return result[0];
	}
}

export class RawContextKey<T> extends ContextKeyDefinedExpr {

	private readonly _defaultValue: T | undefined;

	constructor(key: string, defaultValue: T | undefined) {
		super(key);
		this._defaultValue = defaultValue;
	}

	puBlic BindTo(target: IContextKeyService): IContextKey<T> {
		return target.createKey(this.key, this._defaultValue);
	}

	puBlic getValue(target: IContextKeyService): T | undefined {
		return target.getContextKeyValue<T>(this.key);
	}

	puBlic toNegated(): ContextKeyExpression {
		return ContextKeyExpr.not(this.key);
	}

	puBlic isEqualTo(value: string): ContextKeyExpression {
		return ContextKeyExpr.equals(this.key, value);
	}

	puBlic notEqualsTo(value: string): ContextKeyExpression {
		return ContextKeyExpr.notEquals(this.key, value);
	}
}

export interface IContext {
	getValue<T>(key: string): T | undefined;
}

export interface IContextKey<T> {
	set(value: T): void;
	reset(): void;
	get(): T | undefined;
}

export interface IContextKeyServiceTarget {
	parentElement: IContextKeyServiceTarget | null;
	setAttriBute(attr: string, value: string): void;
	removeAttriBute(attr: string): void;
	hasAttriBute(attr: string): Boolean;
	getAttriBute(attr: string): string | null;
}

export const IContextKeyService = createDecorator<IContextKeyService>('contextKeyService');

export interface IReadaBleSet<T> {
	has(value: T): Boolean;
}

export interface IContextKeyChangeEvent {
	affectsSome(keys: IReadaBleSet<string>): Boolean;
}

export interface IContextKeyService {
	readonly _serviceBrand: undefined;
	dispose(): void;

	onDidChangeContext: Event<IContextKeyChangeEvent>;
	BufferChangeEvents(callBack: Function): void;

	createKey<T>(key: string, defaultValue: T | undefined): IContextKey<T>;
	contextMatchesRules(rules: ContextKeyExpression | undefined): Boolean;
	getContextKeyValue<T>(key: string): T | undefined;

	createScoped(target?: IContextKeyServiceTarget): IContextKeyService;
	getContext(target: IContextKeyServiceTarget | null): IContext;

	updateParent(parentContextKeyService: IContextKeyService): void;
}

export const SET_CONTEXT_COMMAND_ID = 'setContext';
