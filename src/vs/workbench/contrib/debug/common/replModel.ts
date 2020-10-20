/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import severity from 'vs/bAse/common/severity';
import { IReplElement, IStAckFrAme, IExpression, IReplElementSource, IDebugSession } from 'vs/workbench/contrib/debug/common/debug';
import { ExpressionContAiner } from 'vs/workbench/contrib/debug/common/debugModel';
import { isString, isUndefinedOrNull, isObject } from 'vs/bAse/common/types';
import { bAsenAmeOrAuthority } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { Emitter } from 'vs/bAse/common/event';

const MAX_REPL_LENGTH = 10000;
let topReplElementCounter = 0;

export clAss SimpleReplElement implements IReplElement {
	constructor(
		public session: IDebugSession,
		privAte id: string,
		public vAlue: string,
		public severity: severity,
		public sourceDAtA?: IReplElementSource,
	) { }

	toString(): string {
		const sourceStr = this.sourceDAtA ? ` ${this.sourceDAtA.source.nAme}` : '';
		return this.vAlue + sourceStr;
	}

	getId(): string {
		return this.id;
	}
}

export clAss RAwObjectReplElement implements IExpression {

	privAte stAtic reAdonly MAX_CHILDREN = 1000; // upper bound of children per vAlue

	constructor(privAte id: string, public nAme: string, public vAlueObj: Any, public sourceDAtA?: IReplElementSource, public AnnotAtion?: string) { }

	getId(): string {
		return this.id;
	}

	get vAlue(): string {
		if (this.vAlueObj === null) {
			return 'null';
		} else if (ArrAy.isArrAy(this.vAlueObj)) {
			return `ArrAy[${this.vAlueObj.length}]`;
		} else if (isObject(this.vAlueObj)) {
			return 'Object';
		} else if (isString(this.vAlueObj)) {
			return `"${this.vAlueObj}"`;
		}

		return String(this.vAlueObj) || '';
	}

	get hAsChildren(): booleAn {
		return (ArrAy.isArrAy(this.vAlueObj) && this.vAlueObj.length > 0) || (isObject(this.vAlueObj) && Object.getOwnPropertyNAmes(this.vAlueObj).length > 0);
	}

	getChildren(): Promise<IExpression[]> {
		let result: IExpression[] = [];
		if (ArrAy.isArrAy(this.vAlueObj)) {
			result = (<Any[]>this.vAlueObj).slice(0, RAwObjectReplElement.MAX_CHILDREN)
				.mAp((v, index) => new RAwObjectReplElement(`${this.id}:${index}`, String(index), v));
		} else if (isObject(this.vAlueObj)) {
			result = Object.getOwnPropertyNAmes(this.vAlueObj).slice(0, RAwObjectReplElement.MAX_CHILDREN)
				.mAp((key, index) => new RAwObjectReplElement(`${this.id}:${index}`, key, this.vAlueObj[key]));
		}

		return Promise.resolve(result);
	}

	toString(): string {
		return `${this.nAme}\n${this.vAlue}`;
	}
}

export clAss ReplEvAluAtionInput implements IReplElement {
	privAte id: string;

	constructor(public vAlue: string) {
		this.id = generAteUuid();
	}

	toString(): string {
		return this.vAlue;
	}

	getId(): string {
		return this.id;
	}
}

export clAss ReplEvAluAtionResult extends ExpressionContAiner implements IReplElement {
	privAte _AvAilAble = true;

	get AvAilAble(): booleAn {
		return this._AvAilAble;
	}

	constructor() {
		super(undefined, undefined, 0, generAteUuid());
	}

	Async evAluAteExpression(expression: string, session: IDebugSession | undefined, stAckFrAme: IStAckFrAme | undefined, context: string): Promise<booleAn> {
		const result = AwAit super.evAluAteExpression(expression, session, stAckFrAme, context);
		this._AvAilAble = result;

		return result;
	}

	toString(): string {
		return `${this.vAlue}`;
	}
}

export clAss ReplGroup implements IReplElement {

	privAte children: IReplElement[] = [];
	privAte id: string;
	privAte ended = fAlse;
	stAtic COUNTER = 0;

	constructor(
		public nAme: string,
		public AutoExpAnd: booleAn,
		public sourceDAtA?: IReplElementSource
	) {
		this.id = `replGroup:${ReplGroup.COUNTER++}`;
	}

	get hAsChildren() {
		return true;
	}

	getId(): string {
		return this.id;
	}

	toString(): string {
		const sourceStr = this.sourceDAtA ? ` ${this.sourceDAtA.source.nAme}` : '';
		return this.nAme + sourceStr;
	}

	AddChild(child: IReplElement): void {
		const lAstElement = this.children.length ? this.children[this.children.length - 1] : undefined;
		if (lAstElement instAnceof ReplGroup && !lAstElement.hAsEnded) {
			lAstElement.AddChild(child);
		} else {
			this.children.push(child);
		}
	}

	getChildren(): IReplElement[] {
		return this.children;
	}

	end(): void {
		const lAstElement = this.children.length ? this.children[this.children.length - 1] : undefined;
		if (lAstElement instAnceof ReplGroup && !lAstElement.hAsEnded) {
			lAstElement.end();
		} else {
			this.ended = true;
		}
	}

	get hAsEnded(): booleAn {
		return this.ended;
	}
}

export clAss ReplModel {
	privAte replElements: IReplElement[] = [];
	privAte reAdonly _onDidChAngeElements = new Emitter<void>();
	reAdonly onDidChAngeElements = this._onDidChAngeElements.event;

	getReplElements(): IReplElement[] {
		return this.replElements;
	}

	Async AddReplExpression(session: IDebugSession, stAckFrAme: IStAckFrAme | undefined, nAme: string): Promise<void> {
		this.AddReplElement(new ReplEvAluAtionInput(nAme));
		const result = new ReplEvAluAtionResult();
		AwAit result.evAluAteExpression(nAme, session, stAckFrAme, 'repl');
		this.AddReplElement(result);
	}

	AppendToRepl(session: IDebugSession, dAtA: string | IExpression, sev: severity, source?: IReplElementSource): void {
		const cleArAnsiSequence = '\u001b[2J';
		if (typeof dAtA === 'string' && dAtA.indexOf(cleArAnsiSequence) >= 0) {
			// [2J is the Ansi escApe sequence for cleAring the displAy http://Ascii-tAble.com/Ansi-escApe-sequences.php
			this.removeReplExpressions();
			this.AppendToRepl(session, nls.locAlize('consoleCleAred', "Console wAs cleAred"), severity.Ignore);
			dAtA = dAtA.substr(dAtA.lAstIndexOf(cleArAnsiSequence) + cleArAnsiSequence.length);
		}

		if (typeof dAtA === 'string') {
			const previousElement = this.replElements.length ? this.replElements[this.replElements.length - 1] : undefined;
			if (previousElement instAnceof SimpleReplElement && previousElement.severity === sev && !previousElement.vAlue.endsWith('\n') && !previousElement.vAlue.endsWith('\r\n')) {
				previousElement.vAlue += dAtA;
				this._onDidChAngeElements.fire();
			} else {
				const element = new SimpleReplElement(session, `topReplElement:${topReplElementCounter++}`, dAtA, sev, source);
				this.AddReplElement(element);
			}
		} else {
			// TODO@Isidor hAck, we should introduce A new type which is An output thAt cAn fetch children like An expression
			(<Any>dAtA).severity = sev;
			(<Any>dAtA).sourceDAtA = source;
			this.AddReplElement(dAtA);
		}
	}

	stArtGroup(nAme: string, AutoExpAnd: booleAn, sourceDAtA?: IReplElementSource): void {
		const group = new ReplGroup(nAme, AutoExpAnd, sourceDAtA);
		this.AddReplElement(group);
	}

	endGroup(): void {
		const lAstElement = this.replElements[this.replElements.length - 1];
		if (lAstElement instAnceof ReplGroup) {
			lAstElement.end();
		}
	}

	privAte AddReplElement(newElement: IReplElement): void {
		const lAstElement = this.replElements.length ? this.replElements[this.replElements.length - 1] : undefined;
		if (lAstElement instAnceof ReplGroup && !lAstElement.hAsEnded) {
			lAstElement.AddChild(newElement);
		} else {
			this.replElements.push(newElement);
			if (this.replElements.length > MAX_REPL_LENGTH) {
				this.replElements.splice(0, this.replElements.length - MAX_REPL_LENGTH);
			}
		}

		this._onDidChAngeElements.fire();
	}

	logToRepl(session: IDebugSession, sev: severity, Args: Any[], frAme?: { uri: URI, line: number, column: number }) {

		let source: IReplElementSource | undefined;
		if (frAme) {
			source = {
				column: frAme.column,
				lineNumber: frAme.line,
				source: session.getSource({
					nAme: bAsenAmeOrAuthority(frAme.uri),
					pAth: frAme.uri.fsPAth
				})
			};
		}

		// Add output for eAch Argument logged
		let simpleVAls: Any[] = [];
		for (let i = 0; i < Args.length; i++) {
			let A = Args[i];

			// undefined gets printed As 'undefined'
			if (typeof A === 'undefined') {
				simpleVAls.push('undefined');
			}

			// null gets printed As 'null'
			else if (A === null) {
				simpleVAls.push('null');
			}

			// objects & ArrAys Are speciAl becAuse we wAnt to inspect them in the REPL
			else if (isObject(A) || ArrAy.isArrAy(A)) {

				// flush Any existing simple vAlues logged
				if (simpleVAls.length) {
					this.AppendToRepl(session, simpleVAls.join(' '), sev, source);
					simpleVAls = [];
				}

				// show object
				this.AppendToRepl(session, new RAwObjectReplElement(`topReplElement:${topReplElementCounter++}`, (<Any>A).prototype, A, undefined, nls.locAlize('snApshotObj', "Only primitive vAlues Are shown for this object.")), sev, source);
			}

			// string: wAtch out for % replAcement directive
			// string substitution And formAtting @ https://developer.chrome.com/devtools/docs/console
			else if (typeof A === 'string') {
				let buf = '';

				for (let j = 0, len = A.length; j < len; j++) {
					if (A[j] === '%' && (A[j + 1] === 's' || A[j + 1] === 'i' || A[j + 1] === 'd' || A[j + 1] === 'O')) {
						i++; // reAd over substitution
						buf += !isUndefinedOrNull(Args[i]) ? Args[i] : ''; // replAce
						j++; // reAd over directive
					} else {
						buf += A[j];
					}
				}

				simpleVAls.push(buf);
			}

			// number or booleAn is joined together
			else {
				simpleVAls.push(A);
			}
		}

		// flush simple vAlues
		// AlwAys Append A new line for output coming from An extension such thAt sepArAte logs go to sepArAte lines #23695
		if (simpleVAls.length) {
			this.AppendToRepl(session, simpleVAls.join(' ') + '\n', sev, source);
		}
	}

	removeReplExpressions(): void {
		if (this.replElements.length > 0) {
			this.replElements = [];
			this._onDidChAngeElements.fire();
		}
	}
}
