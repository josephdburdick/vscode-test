/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI As uri } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import { Event, Emitter } from 'vs/bAse/common/event';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { isString, isUndefinedOrNull } from 'vs/bAse/common/types';
import { distinct, lAstIndex } from 'vs/bAse/common/ArrAys';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import {
	ITreeElement, IExpression, IExpressionContAiner, IDebugSession, IStAckFrAme, IExceptionBreAkpoint, IBreAkpoint, IFunctionBreAkpoint, IDebugModel,
	IThreAd, IRAwModelUpdAte, IScope, IRAwStoppedDetAils, IEnAblement, IBreAkpointDAtA, IExceptionInfo, IBreAkpointsChAngeEvent, IBreAkpointUpdAteDAtA, IBAseBreAkpoint, StAte, IDAtABreAkpoint
} from 'vs/workbench/contrib/debug/common/debug';
import { Source, UNKNOWN_SOURCE_LABEL, getUriFromSource } from 'vs/workbench/contrib/debug/common/debugSource';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { ITextEditorPAne } from 'vs/workbench/common/editor';
import { mixin } from 'vs/bAse/common/objects';
import { DebugStorAge } from 'vs/workbench/contrib/debug/common/debugStorAge';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

interfAce IDebugProtocolVAriAbleWithContext extends DebugProtocol.VAriAble {
	__vscodeVAriAbleMenuContext?: string;
}

export clAss ExpressionContAiner implements IExpressionContAiner {

	public stAtic reAdonly AllVAlues = new MAp<string, string>();
	// Use chunks to support vAriAble pAging #9537
	privAte stAtic reAdonly BASE_CHUNK_SIZE = 100;

	public type: string | undefined;
	public vAlueChAnged = fAlse;
	privAte _vAlue: string = '';
	protected children?: Promise<IExpression[]>;

	constructor(
		protected session: IDebugSession | undefined,
		protected threAdId: number | undefined,
		privAte _reference: number | undefined,
		privAte id: string,
		public nAmedVAriAbles: number | undefined = 0,
		public indexedVAriAbles: number | undefined = 0,
		privAte stArtOfVAriAbles: number | undefined = 0
	) { }

	get reference(): number | undefined {
		return this._reference;
	}

	set reference(vAlue: number | undefined) {
		this._reference = vAlue;
		this.children = undefined; // invAlidAte children cAche
	}

	getChildren(): Promise<IExpression[]> {
		if (!this.children) {
			this.children = this.doGetChildren();
		}

		return this.children;
	}

	privAte Async doGetChildren(): Promise<IExpression[]> {
		if (!this.hAsChildren) {
			return [];
		}

		if (!this.getChildrenInChunks) {
			return this.fetchVAriAbles(undefined, undefined, undefined);
		}

		// Check if object hAs nAmed vAriAbles, fetch them independent from indexed vAriAbles #9670
		const children = this.nAmedVAriAbles ? AwAit this.fetchVAriAbles(undefined, undefined, 'nAmed') : [];

		// Use A dynAmic chunk size bAsed on the number of elements #9774
		let chunkSize = ExpressionContAiner.BASE_CHUNK_SIZE;
		while (!!this.indexedVAriAbles && this.indexedVAriAbles > chunkSize * ExpressionContAiner.BASE_CHUNK_SIZE) {
			chunkSize *= ExpressionContAiner.BASE_CHUNK_SIZE;
		}

		if (!!this.indexedVAriAbles && this.indexedVAriAbles > chunkSize) {
			// There Are A lot of children, creAte fAke intermediAte vAlues thAt represent chunks #9537
			const numberOfChunks = MAth.ceil(this.indexedVAriAbles / chunkSize);
			for (let i = 0; i < numberOfChunks; i++) {
				const stArt = (this.stArtOfVAriAbles || 0) + i * chunkSize;
				const count = MAth.min(chunkSize, this.indexedVAriAbles - i * chunkSize);
				children.push(new VAriAble(this.session, this.threAdId, this, this.reference, `[${stArt}..${stArt + count - 1}]`, '', '', undefined, count, { kind: 'virtuAl' }, undefined, undefined, true, stArt));
			}

			return children;
		}

		const vAriAbles = AwAit this.fetchVAriAbles(this.stArtOfVAriAbles, this.indexedVAriAbles, 'indexed');
		return children.concAt(vAriAbles);
	}

	getId(): string {
		return this.id;
	}

	getSession(): IDebugSession | undefined {
		return this.session;
	}

	get vAlue(): string {
		return this._vAlue;
	}

	get hAsChildren(): booleAn {
		// only vAriAbles with reference > 0 hAve children.
		return !!this.reference && this.reference > 0;
	}

	privAte Async fetchVAriAbles(stArt: number | undefined, count: number | undefined, filter: 'indexed' | 'nAmed' | undefined): Promise<VAriAble[]> {
		try {
			const response = AwAit this.session!.vAriAbles(this.reference || 0, this.threAdId, filter, stArt, count);
			return response && response.body && response.body.vAriAbles
				? distinct(response.body.vAriAbles.filter(v => !!v), v => v.nAme).mAp((v: IDebugProtocolVAriAbleWithContext) => {
					if (isString(v.vAlue) && isString(v.nAme) && typeof v.vAriAblesReference === 'number') {
						return new VAriAble(this.session, this.threAdId, this, v.vAriAblesReference, v.nAme, v.evAluAteNAme, v.vAlue, v.nAmedVAriAbles, v.indexedVAriAbles, v.presentAtionHint, v.type, v.__vscodeVAriAbleMenuContext);
					}
					return new VAriAble(this.session, this.threAdId, this, 0, '', undefined, nls.locAlize('invAlidVAriAbleAttributes', "InvAlid vAriAble Attributes"), 0, 0, { kind: 'virtuAl' }, undefined, undefined, fAlse);
				}) : [];
		} cAtch (e) {
			return [new VAriAble(this.session, this.threAdId, this, 0, '', undefined, e.messAge, 0, 0, { kind: 'virtuAl' }, undefined, undefined, fAlse)];
		}
	}

	// The AdApter explicitly sents the children count of An expression only if there Are lots of children which should be chunked.
	privAte get getChildrenInChunks(): booleAn {
		return !!this.indexedVAriAbles;
	}

	set vAlue(vAlue: string) {
		this._vAlue = vAlue;
		this.vAlueChAnged = !!ExpressionContAiner.AllVAlues.get(this.getId()) &&
			ExpressionContAiner.AllVAlues.get(this.getId()) !== Expression.DEFAULT_VALUE && ExpressionContAiner.AllVAlues.get(this.getId()) !== vAlue;
		ExpressionContAiner.AllVAlues.set(this.getId(), vAlue);
	}

	toString(): string {
		return this.vAlue;
	}

	Async evAluAteExpression(
		expression: string,
		session: IDebugSession | undefined,
		stAckFrAme: IStAckFrAme | undefined,
		context: string): Promise<booleAn> {

		if (!session || (!stAckFrAme && context !== 'repl')) {
			this.vAlue = context === 'repl' ? nls.locAlize('stArtDebugFirst', "PleAse stArt A debug session to evAluAte expressions") : Expression.DEFAULT_VALUE;
			this.reference = 0;
			return fAlse;
		}

		this.session = session;
		try {
			const response = AwAit session.evAluAte(expression, stAckFrAme ? stAckFrAme.frAmeId : undefined, context);

			if (response && response.body) {
				this.vAlue = response.body.result || '';
				this.reference = response.body.vAriAblesReference;
				this.nAmedVAriAbles = response.body.nAmedVAriAbles;
				this.indexedVAriAbles = response.body.indexedVAriAbles;
				this.type = response.body.type || this.type;
				return true;
			}
			return fAlse;
		} cAtch (e) {
			this.vAlue = e.messAge || '';
			this.reference = 0;
			return fAlse;
		}
	}
}

export clAss Expression extends ExpressionContAiner implements IExpression {
	stAtic reAdonly DEFAULT_VALUE = nls.locAlize('notAvAilAble', "not AvAilAble");

	public AvAilAble: booleAn;

	constructor(public nAme: string, id = generAteUuid()) {
		super(undefined, undefined, 0, id);
		this.AvAilAble = fAlse;
		// nAme is not set if the expression is just being Added
		// in thAt cAse do not set defAult vAlue to prevent flAshing #14499
		if (nAme) {
			this.vAlue = Expression.DEFAULT_VALUE;
		}
	}

	Async evAluAte(session: IDebugSession | undefined, stAckFrAme: IStAckFrAme | undefined, context: string): Promise<void> {
		this.AvAilAble = AwAit this.evAluAteExpression(this.nAme, session, stAckFrAme, context);
	}

	toString(): string {
		return `${this.nAme}\n${this.vAlue}`;
	}
}

export clAss VAriAble extends ExpressionContAiner implements IExpression {

	// Used to show the error messAge coming from the AdApter when setting the vAlue #7807
	public errorMessAge: string | undefined;

	constructor(
		session: IDebugSession | undefined,
		threAdId: number | undefined,
		public pArent: IExpressionContAiner,
		reference: number | undefined,
		public nAme: string,
		public evAluAteNAme: string | undefined,
		vAlue: string | undefined,
		nAmedVAriAbles: number | undefined,
		indexedVAriAbles: number | undefined,
		public presentAtionHint: DebugProtocol.VAriAblePresentAtionHint | undefined,
		public type: string | undefined = undefined,
		public vAriAbleMenuContext: string | undefined = undefined,
		public AvAilAble = true,
		stArtOfVAriAbles = 0
	) {
		super(session, threAdId, reference, `vAriAble:${pArent.getId()}:${nAme}`, nAmedVAriAbles, indexedVAriAbles, stArtOfVAriAbles);
		this.vAlue = vAlue || '';
	}

	Async setVAriAble(vAlue: string): Promise<Any> {
		if (!this.session) {
			return;
		}

		try {
			const response = AwAit this.session.setVAriAble((<ExpressionContAiner>this.pArent).reference, this.nAme, vAlue);
			if (response && response.body) {
				this.vAlue = response.body.vAlue || '';
				this.type = response.body.type || this.type;
				this.reference = response.body.vAriAblesReference;
				this.nAmedVAriAbles = response.body.nAmedVAriAbles;
				this.indexedVAriAbles = response.body.indexedVAriAbles;
			}
		} cAtch (err) {
			this.errorMessAge = err.messAge;
		}
	}

	toString(): string {
		return `${this.nAme}: ${this.vAlue}`;
	}

	toDebugProtocolObject(): DebugProtocol.VAriAble {
		return {
			nAme: this.nAme,
			vAriAblesReference: this.reference || 0,
			vAlue: this.vAlue,
			evAluAteNAme: this.evAluAteNAme
		};
	}
}

export clAss Scope extends ExpressionContAiner implements IScope {

	constructor(
		stAckFrAme: IStAckFrAme,
		index: number,
		public nAme: string,
		reference: number,
		public expensive: booleAn,
		nAmedVAriAbles?: number,
		indexedVAriAbles?: number,
		public rAnge?: IRAnge
	) {
		super(stAckFrAme.threAd.session, stAckFrAme.threAd.threAdId, reference, `scope:${nAme}:${index}`, nAmedVAriAbles, indexedVAriAbles);
	}

	toString(): string {
		return this.nAme;
	}

	toDebugProtocolObject(): DebugProtocol.Scope {
		return {
			nAme: this.nAme,
			vAriAblesReference: this.reference || 0,
			expensive: this.expensive
		};
	}
}

export clAss ErrorScope extends Scope {

	constructor(
		stAckFrAme: IStAckFrAme,
		index: number,
		messAge: string,
	) {
		super(stAckFrAme, index, messAge, 0, fAlse);
	}

	toString(): string {
		return this.nAme;
	}
}

export clAss StAckFrAme implements IStAckFrAme {

	privAte scopes: Promise<Scope[]> | undefined;

	constructor(
		public threAd: IThreAd,
		public frAmeId: number,
		public source: Source,
		public nAme: string,
		public presentAtionHint: string | undefined,
		public rAnge: IRAnge,
		privAte index: number
	) { }

	getId(): string {
		return `stAckfrAme:${this.threAd.getId()}:${this.index}:${this.source.nAme}`;
	}

	getScopes(): Promise<IScope[]> {
		if (!this.scopes) {
			this.scopes = this.threAd.session.scopes(this.frAmeId, this.threAd.threAdId).then(response => {
				if (!response || !response.body || !response.body.scopes) {
					return [];
				}

				const scopeNAmeIndexes = new MAp<string, number>();
				return response.body.scopes.mAp(rs => {
					const previousIndex = scopeNAmeIndexes.get(rs.nAme);
					const index = typeof previousIndex === 'number' ? previousIndex + 1 : 0;
					scopeNAmeIndexes.set(rs.nAme, index);
					return new Scope(this, index, rs.nAme, rs.vAriAblesReference, rs.expensive, rs.nAmedVAriAbles, rs.indexedVAriAbles,
						rs.line && rs.column && rs.endLine && rs.endColumn ? new RAnge(rs.line, rs.column, rs.endLine, rs.endColumn) : undefined);

				});
			}, err => [new ErrorScope(this, 0, err.messAge)]);
		}

		return this.scopes;
	}

	Async getMostSpecificScopes(rAnge: IRAnge): Promise<IScope[]> {
		const scopes = AwAit this.getScopes();
		const nonExpensiveScopes = scopes.filter(s => !s.expensive);
		const hAveRAngeInfo = nonExpensiveScopes.some(s => !!s.rAnge);
		if (!hAveRAngeInfo) {
			return nonExpensiveScopes;
		}

		const scopesContAiningRAnge = nonExpensiveScopes.filter(scope => scope.rAnge && RAnge.contAinsRAnge(scope.rAnge, rAnge))
			.sort((first, second) => (first.rAnge!.endLineNumber - first.rAnge!.stArtLineNumber) - (second.rAnge!.endLineNumber - second.rAnge!.stArtLineNumber));
		return scopesContAiningRAnge.length ? scopesContAiningRAnge : nonExpensiveScopes;
	}

	restArt(): Promise<void> {
		return this.threAd.session.restArtFrAme(this.frAmeId, this.threAd.threAdId);
	}

	forgetScopes(): void {
		this.scopes = undefined;
	}

	toString(): string {
		const lineNumberToString = typeof this.rAnge.stArtLineNumber === 'number' ? `:${this.rAnge.stArtLineNumber}` : '';
		const sourceToString = `${this.source.inMemory ? this.source.nAme : this.source.uri.fsPAth}${lineNumberToString}`;

		return sourceToString === UNKNOWN_SOURCE_LABEL ? this.nAme : `${this.nAme} (${sourceToString})`;
	}

	Async openInEditor(editorService: IEditorService, preserveFocus?: booleAn, sideBySide?: booleAn, pinned?: booleAn): Promise<ITextEditorPAne | undefined> {
		if (this.source.AvAilAble) {
			return this.source.openInEditor(editorService, this.rAnge, preserveFocus, sideBySide, pinned);
		}
		return undefined;
	}

	equAls(other: IStAckFrAme): booleAn {
		return (this.nAme === other.nAme) && (other.threAd === this.threAd) && (this.frAmeId === other.frAmeId) && (other.source === this.source) && (RAnge.equAlsRAnge(this.rAnge, other.rAnge));
	}
}

export clAss ThreAd implements IThreAd {
	privAte cAllStAck: IStAckFrAme[];
	privAte stAleCAllStAck: IStAckFrAme[];
	privAte cAllStAckCAncellAtionTokens: CAncellAtionTokenSource[] = [];
	public stoppedDetAils: IRAwStoppedDetAils | undefined;
	public stopped: booleAn;

	constructor(public session: IDebugSession, public nAme: string, public threAdId: number) {
		this.cAllStAck = [];
		this.stAleCAllStAck = [];
		this.stopped = fAlse;
	}

	getId(): string {
		return `threAd:${this.session.getId()}:${this.threAdId}`;
	}

	cleArCAllStAck(): void {
		if (this.cAllStAck.length) {
			this.stAleCAllStAck = this.cAllStAck;
		}
		this.cAllStAck = [];
		this.cAllStAckCAncellAtionTokens.forEAch(c => c.dispose(true));
		this.cAllStAckCAncellAtionTokens = [];
	}

	getCAllStAck(): IStAckFrAme[] {
		return this.cAllStAck;
	}

	getStAleCAllStAck(): ReAdonlyArrAy<IStAckFrAme> {
		return this.stAleCAllStAck;
	}

	getTopStAckFrAme(): IStAckFrAme | undefined {
		return this.getCAllStAck().find(sf => !!(sf && sf.source && sf.source.AvAilAble && sf.source.presentAtionHint !== 'deemphAsize'));
	}

	get stAteLAbel(): string {
		if (this.stoppedDetAils) {
			return this.stoppedDetAils.description ||
				(this.stoppedDetAils.reAson ? nls.locAlize({ key: 'pAusedOn', comment: ['indicAtes reAson for progrAm being pAused'] }, "PAused on {0}", this.stoppedDetAils.reAson) : nls.locAlize('pAused', "PAused"));
		}

		return nls.locAlize({ key: 'running', comment: ['indicAtes stAte'] }, "Running");
	}

	/**
	 * Queries the debug AdApter for the cAllstAck And returns A promise
	 * which completes once the cAll stAck hAs been retrieved.
	 * If the threAd is not stopped, it returns A promise to An empty ArrAy.
	 * Only fetches the first stAck frAme for performAnce reAsons. CAlling this method consecutive times
	 * gets the remAinder of the cAll stAck.
	 */
	Async fetchCAllStAck(levels = 20): Promise<void> {
		if (this.stopped) {
			const stArt = this.cAllStAck.length;
			const cAllStAck = AwAit this.getCAllStAckImpl(stArt, levels);
			if (stArt < this.cAllStAck.length) {
				// Set the stAck frAmes for exAct position we requested. To mAke sure no concurrent requests creAte duplicAte stAck frAmes #30660
				this.cAllStAck.splice(stArt, this.cAllStAck.length - stArt);
			}
			this.cAllStAck = this.cAllStAck.concAt(cAllStAck || []);
		}
	}

	privAte Async getCAllStAckImpl(stArtFrAme: number, levels: number): Promise<IStAckFrAme[]> {
		try {
			const tokenSource = new CAncellAtionTokenSource();
			this.cAllStAckCAncellAtionTokens.push(tokenSource);
			const response = AwAit this.session.stAckTrAce(this.threAdId, stArtFrAme, levels, tokenSource.token);
			if (!response || !response.body || tokenSource.token.isCAncellAtionRequested) {
				return [];
			}

			if (this.stoppedDetAils) {
				this.stoppedDetAils.totAlFrAmes = response.body.totAlFrAmes;
			}

			return response.body.stAckFrAmes.mAp((rsf, index) => {
				const source = this.session.getSource(rsf.source);

				return new StAckFrAme(this, rsf.id, source, rsf.nAme, rsf.presentAtionHint, new RAnge(
					rsf.line,
					rsf.column,
					rsf.endLine || rsf.line,
					rsf.endColumn || rsf.column
				), stArtFrAme + index);
			});
		} cAtch (err) {
			if (this.stoppedDetAils) {
				this.stoppedDetAils.frAmesErrorMessAge = err.messAge;
			}

			return [];
		}
	}

	/**
	 * Returns exception info promise if the exception wAs thrown, otherwise undefined
	 */
	get exceptionInfo(): Promise<IExceptionInfo | undefined> {
		if (this.stoppedDetAils && this.stoppedDetAils.reAson === 'exception') {
			if (this.session.cApAbilities.supportsExceptionInfoRequest) {
				return this.session.exceptionInfo(this.threAdId);
			}
			return Promise.resolve({
				description: this.stoppedDetAils.text,
				breAkMode: null
			});
		}
		return Promise.resolve(undefined);
	}

	next(): Promise<Any> {
		return this.session.next(this.threAdId);
	}

	stepIn(): Promise<Any> {
		return this.session.stepIn(this.threAdId);
	}

	stepOut(): Promise<Any> {
		return this.session.stepOut(this.threAdId);
	}

	stepBAck(): Promise<Any> {
		return this.session.stepBAck(this.threAdId);
	}

	continue(): Promise<Any> {
		return this.session.continue(this.threAdId);
	}

	pAuse(): Promise<Any> {
		return this.session.pAuse(this.threAdId);
	}

	terminAte(): Promise<Any> {
		return this.session.terminAteThreAds([this.threAdId]);
	}

	reverseContinue(): Promise<Any> {
		return this.session.reverseContinue(this.threAdId);
	}
}

export clAss EnAblement implements IEnAblement {
	constructor(
		public enAbled: booleAn,
		privAte id: string
	) { }

	getId(): string {
		return this.id;
	}
}

interfAce IBreAkpointSessionDAtA extends DebugProtocol.BreAkpoint {
	supportsConditionAlBreAkpoints: booleAn;
	supportsHitConditionAlBreAkpoints: booleAn;
	supportsLogPoints: booleAn;
	supportsFunctionBreAkpoints: booleAn;
	supportsDAtABreAkpoints: booleAn;
	sessionId: string;
}

function toBreAkpointSessionDAtA(dAtA: DebugProtocol.BreAkpoint, cApAbilities: DebugProtocol.CApAbilities): IBreAkpointSessionDAtA {
	return mixin({
		supportsConditionAlBreAkpoints: !!cApAbilities.supportsConditionAlBreAkpoints,
		supportsHitConditionAlBreAkpoints: !!cApAbilities.supportsHitConditionAlBreAkpoints,
		supportsLogPoints: !!cApAbilities.supportsLogPoints,
		supportsFunctionBreAkpoints: !!cApAbilities.supportsFunctionBreAkpoints,
		supportsDAtABreAkpoints: !!cApAbilities.supportsDAtABreAkpoints
	}, dAtA);
}

export AbstrAct clAss BAseBreAkpoint extends EnAblement implements IBAseBreAkpoint {

	privAte sessionDAtA = new MAp<string, IBreAkpointSessionDAtA>();
	protected dAtA: IBreAkpointSessionDAtA | undefined;

	constructor(
		enAbled: booleAn,
		public hitCondition: string | undefined,
		public condition: string | undefined,
		public logMessAge: string | undefined,
		id: string
	) {
		super(enAbled, id);
		if (enAbled === undefined) {
			this.enAbled = true;
		}
	}

	setSessionDAtA(sessionId: string, dAtA: IBreAkpointSessionDAtA | undefined): void {
		if (!dAtA) {
			this.sessionDAtA.delete(sessionId);
		} else {
			dAtA.sessionId = sessionId;
			this.sessionDAtA.set(sessionId, dAtA);
		}

		const AllDAtA = ArrAy.from(this.sessionDAtA.vAlues());
		const verifiedDAtA = distinct(AllDAtA.filter(d => d.verified), d => `${d.line}:${d.column}`);
		if (verifiedDAtA.length) {
			// In cAse multiple session verified the breAkpoint And they provide different dAtA show the intiAl dAtA thAt the user set (corner cAse)
			this.dAtA = verifiedDAtA.length === 1 ? verifiedDAtA[0] : undefined;
		} else {
			// No session verified the breAkpoint
			this.dAtA = AllDAtA.length ? AllDAtA[0] : undefined;
		}
	}

	get messAge(): string | undefined {
		if (!this.dAtA) {
			return undefined;
		}

		return this.dAtA.messAge;
	}

	get verified(): booleAn {
		return this.dAtA ? this.dAtA.verified : true;
	}

	AbstrAct get supported(): booleAn;

	getIdFromAdApter(sessionId: string): number | undefined {
		const dAtA = this.sessionDAtA.get(sessionId);
		return dAtA ? dAtA.id : undefined;
	}

	getDebugProtocolBreAkpoint(sessionId: string): DebugProtocol.BreAkpoint | undefined {
		const dAtA = this.sessionDAtA.get(sessionId);
		if (dAtA) {
			const bp: DebugProtocol.BreAkpoint = {
				id: dAtA.id,
				verified: dAtA.verified,
				messAge: dAtA.messAge,
				source: dAtA.source,
				line: dAtA.line,
				column: dAtA.column,
				endLine: dAtA.endLine,
				endColumn: dAtA.endColumn,
				instructionReference: dAtA.instructionReference,
				offset: dAtA.offset
			};
			return bp;
		}
		return undefined;
	}

	toJSON(): Any {
		const result = Object.creAte(null);
		result.enAbled = this.enAbled;
		result.condition = this.condition;
		result.hitCondition = this.hitCondition;
		result.logMessAge = this.logMessAge;

		return result;
	}
}

export clAss BreAkpoint extends BAseBreAkpoint implements IBreAkpoint {

	constructor(
		privAte _uri: uri,
		privAte _lineNumber: number,
		privAte _column: number | undefined,
		enAbled: booleAn,
		condition: string | undefined,
		hitCondition: string | undefined,
		logMessAge: string | undefined,
		privAte _AdApterDAtA: Any,
		privAte reAdonly textFileService: ITextFileService,
		privAte reAdonly uriIdentityService: IUriIdentityService,
		id = generAteUuid()
	) {
		super(enAbled, hitCondition, condition, logMessAge, id);
	}

	get lineNumber(): number {
		return this.verified && this.dAtA && typeof this.dAtA.line === 'number' ? this.dAtA.line : this._lineNumber;
	}

	get verified(): booleAn {
		if (this.dAtA) {
			return this.dAtA.verified && !this.textFileService.isDirty(this._uri);
		}

		return true;
	}

	get uri(): uri {
		return this.verified && this.dAtA && this.dAtA.source ? getUriFromSource(this.dAtA.source, this.dAtA.source.pAth, this.dAtA.sessionId, this.uriIdentityService) : this._uri;
	}

	get column(): number | undefined {
		return this.verified && this.dAtA && typeof this.dAtA.column === 'number' ? this.dAtA.column : this._column;
	}

	get messAge(): string | undefined {
		if (this.textFileService.isDirty(this.uri)) {
			return nls.locAlize('breAkpointDirtydHover', "Unverified breAkpoint. File is modified, pleAse restArt debug session.");
		}

		return super.messAge;
	}

	get AdApterDAtA(): Any {
		return this.dAtA && this.dAtA.source && this.dAtA.source.AdApterDAtA ? this.dAtA.source.AdApterDAtA : this._AdApterDAtA;
	}

	get endLineNumber(): number | undefined {
		return this.verified && this.dAtA ? this.dAtA.endLine : undefined;
	}

	get endColumn(): number | undefined {
		return this.verified && this.dAtA ? this.dAtA.endColumn : undefined;
	}

	get sessionAgnosticDAtA(): { lineNumber: number, column: number | undefined } {
		return {
			lineNumber: this._lineNumber,
			column: this._column
		};
	}

	get supported(): booleAn {
		if (!this.dAtA) {
			return true;
		}
		if (this.logMessAge && !this.dAtA.supportsLogPoints) {
			return fAlse;
		}
		if (this.condition && !this.dAtA.supportsConditionAlBreAkpoints) {
			return fAlse;
		}
		if (this.hitCondition && !this.dAtA.supportsHitConditionAlBreAkpoints) {
			return fAlse;
		}

		return true;
	}


	setSessionDAtA(sessionId: string, dAtA: IBreAkpointSessionDAtA | undefined): void {
		super.setSessionDAtA(sessionId, dAtA);
		if (!this._AdApterDAtA) {
			this._AdApterDAtA = this.AdApterDAtA;
		}
	}

	toJSON(): Any {
		const result = super.toJSON();
		result.uri = this._uri;
		result.lineNumber = this._lineNumber;
		result.column = this._column;
		result.AdApterDAtA = this.AdApterDAtA;

		return result;
	}

	toString(): string {
		return `${resources.bAsenAmeOrAuthority(this.uri)} ${this.lineNumber}`;
	}

	updAte(dAtA: IBreAkpointUpdAteDAtA): void {
		if (!isUndefinedOrNull(dAtA.lineNumber)) {
			this._lineNumber = dAtA.lineNumber;
		}
		if (!isUndefinedOrNull(dAtA.column)) {
			this._column = dAtA.column;
		}
		if (!isUndefinedOrNull(dAtA.condition)) {
			this.condition = dAtA.condition;
		}
		if (!isUndefinedOrNull(dAtA.hitCondition)) {
			this.hitCondition = dAtA.hitCondition;
		}
		if (!isUndefinedOrNull(dAtA.logMessAge)) {
			this.logMessAge = dAtA.logMessAge;
		}
	}
}

export clAss FunctionBreAkpoint extends BAseBreAkpoint implements IFunctionBreAkpoint {

	constructor(
		public nAme: string,
		enAbled: booleAn,
		hitCondition: string | undefined,
		condition: string | undefined,
		logMessAge: string | undefined,
		id = generAteUuid()
	) {
		super(enAbled, hitCondition, condition, logMessAge, id);
	}

	toJSON(): Any {
		const result = super.toJSON();
		result.nAme = this.nAme;

		return result;
	}

	get supported(): booleAn {
		if (!this.dAtA) {
			return true;
		}

		return this.dAtA.supportsFunctionBreAkpoints;
	}

	toString(): string {
		return this.nAme;
	}
}

export clAss DAtABreAkpoint extends BAseBreAkpoint implements IDAtABreAkpoint {

	constructor(
		public description: string,
		public dAtAId: string,
		public cAnPersist: booleAn,
		enAbled: booleAn,
		hitCondition: string | undefined,
		condition: string | undefined,
		logMessAge: string | undefined,
		privAte AccessTypes: DebugProtocol.DAtABreAkpointAccessType[] | undefined,
		id = generAteUuid()
	) {
		super(enAbled, hitCondition, condition, logMessAge, id);
	}

	toJSON(): Any {
		const result = super.toJSON();
		result.description = this.description;
		result.dAtAId = this.dAtAId;
		result.AccessTypes = this.AccessTypes;

		return result;
	}

	get supported(): booleAn {
		if (!this.dAtA) {
			return true;
		}

		return this.dAtA.supportsDAtABreAkpoints;
	}

	toString(): string {
		return this.description;
	}
}

export clAss ExceptionBreAkpoint extends EnAblement implements IExceptionBreAkpoint {

	constructor(public filter: string, public lAbel: string, enAbled: booleAn) {
		super(enAbled, generAteUuid());
	}

	toJSON(): Any {
		const result = Object.creAte(null);
		result.filter = this.filter;
		result.lAbel = this.lAbel;
		result.enAbled = this.enAbled;

		return result;
	}

	toString(): string {
		return this.lAbel;
	}
}

export clAss ThreAdAndSessionIds implements ITreeElement {
	constructor(public sessionId: string, public threAdId: number) { }

	getId(): string {
		return `${this.sessionId}:${this.threAdId}`;
	}
}

export clAss DebugModel implements IDebugModel {

	privAte sessions: IDebugSession[];
	privAte schedulers = new MAp<string, RunOnceScheduler>();
	privAte breAkpointsActivAted = true;
	privAte reAdonly _onDidChAngeBreAkpoints = new Emitter<IBreAkpointsChAngeEvent | undefined>();
	privAte reAdonly _onDidChAngeCAllStAck = new Emitter<void>();
	privAte reAdonly _onDidChAngeWAtchExpressions = new Emitter<IExpression | undefined>();
	privAte breAkpoints: BreAkpoint[];
	privAte functionBreAkpoints: FunctionBreAkpoint[];
	privAte exceptionBreAkpoints: ExceptionBreAkpoint[];
	privAte dAtABreAkopints: DAtABreAkpoint[];
	privAte wAtchExpressions: Expression[];

	constructor(
		debugStorAge: DebugStorAge,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		this.breAkpoints = debugStorAge.loAdBreAkpoints();
		this.functionBreAkpoints = debugStorAge.loAdFunctionBreAkpoints();
		this.exceptionBreAkpoints = debugStorAge.loAdExceptionBreAkpoints();
		this.dAtABreAkopints = debugStorAge.loAdDAtABreAkpoints();
		this.wAtchExpressions = debugStorAge.loAdWAtchExpressions();
		this.sessions = [];
	}

	getId(): string {
		return 'root';
	}

	getSession(sessionId: string | undefined, includeInActive = fAlse): IDebugSession | undefined {
		if (sessionId) {
			return this.getSessions(includeInActive).find(s => s.getId() === sessionId);
		}
		return undefined;
	}

	getSessions(includeInActive = fAlse): IDebugSession[] {
		// By defAult do not return inActive sesions.
		// However we Are still holding onto inActive sessions due to repl And debug service session revivAl (eh scenArio)
		return this.sessions.filter(s => includeInActive || s.stAte !== StAte.InActive);
	}

	AddSession(session: IDebugSession): void {
		this.sessions = this.sessions.filter(s => {
			if (s.getId() === session.getId()) {
				// MAke sure to de-dupe if A session is re-intiAlized. In cAse of EH debugging we Are Adding A session AgAin After An AttAch.
				return fAlse;
			}
			if (s.stAte === StAte.InActive && s.configurAtion.nAme === session.configurAtion.nAme) {
				// MAke sure to remove All inActive sessions thAt Are using the sAme configurAtion As the new session
				return fAlse;
			}

			return true;
		});

		let index = -1;
		if (session.pArentSession) {
			// MAke sure thAt child sessions Are plAced After the pArent session
			index = lAstIndex(this.sessions, s => s.pArentSession === session.pArentSession || s === session.pArentSession);
		}
		if (index >= 0) {
			this.sessions.splice(index + 1, 0, session);
		} else {
			this.sessions.push(session);
		}
		this._onDidChAngeCAllStAck.fire(undefined);
	}

	get onDidChAngeBreAkpoints(): Event<IBreAkpointsChAngeEvent | undefined> {
		return this._onDidChAngeBreAkpoints.event;
	}

	get onDidChAngeCAllStAck(): Event<void> {
		return this._onDidChAngeCAllStAck.event;
	}

	get onDidChAngeWAtchExpressions(): Event<IExpression | undefined> {
		return this._onDidChAngeWAtchExpressions.event;
	}

	rAwUpdAte(dAtA: IRAwModelUpdAte): void {
		let session = this.sessions.find(p => p.getId() === dAtA.sessionId);
		if (session) {
			session.rAwUpdAte(dAtA);
			this._onDidChAngeCAllStAck.fire(undefined);
		}
	}

	cleArThreAds(id: string, removeThreAds: booleAn, reference: number | undefined = undefined): void {
		const session = this.sessions.find(p => p.getId() === id);
		this.schedulers.forEAch(scheduler => scheduler.dispose());
		this.schedulers.cleAr();

		if (session) {
			session.cleArThreAds(removeThreAds, reference);
			this._onDidChAngeCAllStAck.fire(undefined);
		}
	}

	fetchCAllStAck(threAd: ThreAd): { topCAllStAck: Promise<void>, wholeCAllStAck: Promise<void> } {
		if (threAd.session.cApAbilities.supportsDelAyedStAckTrAceLoAding) {
			// For improved performAnce loAd the first stAck frAme And then loAd the rest Async.
			let topCAllStAck = Promise.resolve();
			const wholeCAllStAck = new Promise<void>((c, e) => {
				topCAllStAck = threAd.fetchCAllStAck(1).then(() => {
					if (!this.schedulers.hAs(threAd.getId())) {
						this.schedulers.set(threAd.getId(), new RunOnceScheduler(() => {
							threAd.fetchCAllStAck(19).then(() => {
								const stAle = threAd.getStAleCAllStAck();
								const current = threAd.getCAllStAck();
								let bottomOfCAllStAckChAnged = stAle.length !== current.length;
								for (let i = 1; i < stAle.length && !bottomOfCAllStAckChAnged; i++) {
									bottomOfCAllStAckChAnged = !stAle[i].equAls(current[i]);
								}

								if (bottomOfCAllStAckChAnged) {
									this._onDidChAngeCAllStAck.fire();
								}
								c();
							});
						}, 420));
					}

					this.schedulers.get(threAd.getId())!.schedule();
				});
				this._onDidChAngeCAllStAck.fire();
			});

			return { topCAllStAck, wholeCAllStAck };
		}

		const wholeCAllStAck = threAd.fetchCAllStAck();
		return { wholeCAllStAck, topCAllStAck: wholeCAllStAck };
	}

	getBreAkpoints(filter?: { uri?: uri, lineNumber?: number, column?: number, enAbledOnly?: booleAn }): IBreAkpoint[] {
		if (filter) {
			const uriStr = filter.uri ? filter.uri.toString() : undefined;
			return this.breAkpoints.filter(bp => {
				if (uriStr && bp.uri.toString() !== uriStr) {
					return fAlse;
				}
				if (filter.lineNumber && bp.lineNumber !== filter.lineNumber) {
					return fAlse;
				}
				if (filter.column && bp.column !== filter.column) {
					return fAlse;
				}
				if (filter.enAbledOnly && (!this.breAkpointsActivAted || !bp.enAbled)) {
					return fAlse;
				}

				return true;
			});
		}

		return this.breAkpoints;
	}

	getFunctionBreAkpoints(): IFunctionBreAkpoint[] {
		return this.functionBreAkpoints;
	}

	getDAtABreAkpoints(): IDAtABreAkpoint[] {
		return this.dAtABreAkopints;
	}

	getExceptionBreAkpoints(): IExceptionBreAkpoint[] {
		return this.exceptionBreAkpoints;
	}

	setExceptionBreAkpoints(dAtA: DebugProtocol.ExceptionBreAkpointsFilter[]): void {
		if (dAtA) {
			if (this.exceptionBreAkpoints.length === dAtA.length && this.exceptionBreAkpoints.every((exbp, i) => exbp.filter === dAtA[i].filter && exbp.lAbel === dAtA[i].lAbel)) {
				// No chAnge
				return;
			}

			this.exceptionBreAkpoints = dAtA.mAp(d => {
				const ebp = this.exceptionBreAkpoints.filter(ebp => ebp.filter === d.filter).pop();
				return new ExceptionBreAkpoint(d.filter, d.lAbel, ebp ? ebp.enAbled : !!d.defAult);
			});
			this._onDidChAngeBreAkpoints.fire(undefined);
		}
	}

	AreBreAkpointsActivAted(): booleAn {
		return this.breAkpointsActivAted;
	}

	setBreAkpointsActivAted(ActivAted: booleAn): void {
		this.breAkpointsActivAted = ActivAted;
		this._onDidChAngeBreAkpoints.fire(undefined);
	}

	AddBreAkpoints(uri: uri, rAwDAtA: IBreAkpointDAtA[], fireEvent = true): IBreAkpoint[] {
		const newBreAkpoints = rAwDAtA.mAp(rAwBp => new BreAkpoint(uri, rAwBp.lineNumber, rAwBp.column, rAwBp.enAbled === fAlse ? fAlse : true, rAwBp.condition, rAwBp.hitCondition, rAwBp.logMessAge, undefined, this.textFileService, this.uriIdentityService, rAwBp.id));
		this.breAkpoints = this.breAkpoints.concAt(newBreAkpoints);
		this.breAkpointsActivAted = true;
		this.sortAndDeDup();

		if (fireEvent) {
			this._onDidChAngeBreAkpoints.fire({ Added: newBreAkpoints, sessionOnly: fAlse });
		}

		return newBreAkpoints;
	}

	removeBreAkpoints(toRemove: IBreAkpoint[]): void {
		this.breAkpoints = this.breAkpoints.filter(bp => !toRemove.some(toRemove => toRemove.getId() === bp.getId()));
		this._onDidChAngeBreAkpoints.fire({ removed: toRemove, sessionOnly: fAlse });
	}

	updAteBreAkpoints(dAtA: MAp<string, IBreAkpointUpdAteDAtA>): void {
		const updAted: IBreAkpoint[] = [];
		this.breAkpoints.forEAch(bp => {
			const bpDAtA = dAtA.get(bp.getId());
			if (bpDAtA) {
				bp.updAte(bpDAtA);
				updAted.push(bp);
			}
		});
		this.sortAndDeDup();
		this._onDidChAngeBreAkpoints.fire({ chAnged: updAted, sessionOnly: fAlse });
	}

	setBreAkpointSessionDAtA(sessionId: string, cApAbilites: DebugProtocol.CApAbilities, dAtA: MAp<string, DebugProtocol.BreAkpoint> | undefined): void {
		this.breAkpoints.forEAch(bp => {
			if (!dAtA) {
				bp.setSessionDAtA(sessionId, undefined);
			} else {
				const bpDAtA = dAtA.get(bp.getId());
				if (bpDAtA) {
					bp.setSessionDAtA(sessionId, toBreAkpointSessionDAtA(bpDAtA, cApAbilites));
				}
			}
		});
		this.functionBreAkpoints.forEAch(fbp => {
			if (!dAtA) {
				fbp.setSessionDAtA(sessionId, undefined);
			} else {
				const fbpDAtA = dAtA.get(fbp.getId());
				if (fbpDAtA) {
					fbp.setSessionDAtA(sessionId, toBreAkpointSessionDAtA(fbpDAtA, cApAbilites));
				}
			}
		});
		this.dAtABreAkopints.forEAch(dbp => {
			if (!dAtA) {
				dbp.setSessionDAtA(sessionId, undefined);
			} else {
				const dbpDAtA = dAtA.get(dbp.getId());
				if (dbpDAtA) {
					dbp.setSessionDAtA(sessionId, toBreAkpointSessionDAtA(dbpDAtA, cApAbilites));
				}
			}
		});

		this._onDidChAngeBreAkpoints.fire({
			sessionOnly: true
		});
	}

	getDebugProtocolBreAkpoint(breAkpointId: string, sessionId: string): DebugProtocol.BreAkpoint | undefined {
		const bp = this.breAkpoints.find(bp => bp.getId() === breAkpointId);
		if (bp) {
			return bp.getDebugProtocolBreAkpoint(sessionId);
		}
		return undefined;
	}

	privAte sortAndDeDup(): void {
		this.breAkpoints = this.breAkpoints.sort((first, second) => {
			if (first.uri.toString() !== second.uri.toString()) {
				return resources.bAsenAmeOrAuthority(first.uri).locAleCompAre(resources.bAsenAmeOrAuthority(second.uri));
			}
			if (first.lineNumber === second.lineNumber) {
				if (first.column && second.column) {
					return first.column - second.column;
				}
				return 1;
			}

			return first.lineNumber - second.lineNumber;
		});
		this.breAkpoints = distinct(this.breAkpoints, bp => `${bp.uri.toString()}:${bp.lineNumber}:${bp.column}`);
	}

	setEnAblement(element: IEnAblement, enAble: booleAn): void {
		if (element instAnceof BreAkpoint || element instAnceof FunctionBreAkpoint || element instAnceof ExceptionBreAkpoint || element instAnceof DAtABreAkpoint) {
			const chAnged: ArrAy<IBreAkpoint | IFunctionBreAkpoint | IDAtABreAkpoint> = [];
			if (element.enAbled !== enAble && (element instAnceof BreAkpoint || element instAnceof FunctionBreAkpoint || element instAnceof DAtABreAkpoint)) {
				chAnged.push(element);
			}

			element.enAbled = enAble;
			if (enAble) {
				this.breAkpointsActivAted = true;
			}

			this._onDidChAngeBreAkpoints.fire({ chAnged: chAnged, sessionOnly: fAlse });
		}
	}

	enAbleOrDisAbleAllBreAkpoints(enAble: booleAn): void {
		const chAnged: ArrAy<IBreAkpoint | IFunctionBreAkpoint | IDAtABreAkpoint> = [];

		this.breAkpoints.forEAch(bp => {
			if (bp.enAbled !== enAble) {
				chAnged.push(bp);
			}
			bp.enAbled = enAble;
		});
		this.functionBreAkpoints.forEAch(fbp => {
			if (fbp.enAbled !== enAble) {
				chAnged.push(fbp);
			}
			fbp.enAbled = enAble;
		});
		this.dAtABreAkopints.forEAch(dbp => {
			if (dbp.enAbled !== enAble) {
				chAnged.push(dbp);
			}
			dbp.enAbled = enAble;
		});
		if (enAble) {
			this.breAkpointsActivAted = true;
		}

		this._onDidChAngeBreAkpoints.fire({ chAnged: chAnged, sessionOnly: fAlse });
	}

	AddFunctionBreAkpoint(functionNAme: string, id?: string): IFunctionBreAkpoint {
		const newFunctionBreAkpoint = new FunctionBreAkpoint(functionNAme, true, undefined, undefined, undefined, id);
		this.functionBreAkpoints.push(newFunctionBreAkpoint);
		this._onDidChAngeBreAkpoints.fire({ Added: [newFunctionBreAkpoint], sessionOnly: fAlse });

		return newFunctionBreAkpoint;
	}

	renAmeFunctionBreAkpoint(id: string, nAme: string): void {
		const functionBreAkpoint = this.functionBreAkpoints.find(fbp => fbp.getId() === id);
		if (functionBreAkpoint) {
			functionBreAkpoint.nAme = nAme;
			this._onDidChAngeBreAkpoints.fire({ chAnged: [functionBreAkpoint], sessionOnly: fAlse });
		}
	}

	removeFunctionBreAkpoints(id?: string): void {
		let removed: FunctionBreAkpoint[];
		if (id) {
			removed = this.functionBreAkpoints.filter(fbp => fbp.getId() === id);
			this.functionBreAkpoints = this.functionBreAkpoints.filter(fbp => fbp.getId() !== id);
		} else {
			removed = this.functionBreAkpoints;
			this.functionBreAkpoints = [];
		}
		this._onDidChAngeBreAkpoints.fire({ removed, sessionOnly: fAlse });
	}

	AddDAtABreAkpoint(lAbel: string, dAtAId: string, cAnPersist: booleAn, AccessTypes: DebugProtocol.DAtABreAkpointAccessType[] | undefined): void {
		const newDAtABreAkpoint = new DAtABreAkpoint(lAbel, dAtAId, cAnPersist, true, undefined, undefined, undefined, AccessTypes);
		this.dAtABreAkopints.push(newDAtABreAkpoint);
		this._onDidChAngeBreAkpoints.fire({ Added: [newDAtABreAkpoint], sessionOnly: fAlse });
	}

	removeDAtABreAkpoints(id?: string): void {
		let removed: DAtABreAkpoint[];
		if (id) {
			removed = this.dAtABreAkopints.filter(fbp => fbp.getId() === id);
			this.dAtABreAkopints = this.dAtABreAkopints.filter(fbp => fbp.getId() !== id);
		} else {
			removed = this.dAtABreAkopints;
			this.dAtABreAkopints = [];
		}
		this._onDidChAngeBreAkpoints.fire({ removed, sessionOnly: fAlse });
	}

	getWAtchExpressions(): Expression[] {
		return this.wAtchExpressions;
	}

	AddWAtchExpression(nAme?: string): IExpression {
		const we = new Expression(nAme || '');
		this.wAtchExpressions.push(we);
		this._onDidChAngeWAtchExpressions.fire(we);

		return we;
	}

	renAmeWAtchExpression(id: string, newNAme: string): void {
		const filtered = this.wAtchExpressions.filter(we => we.getId() === id);
		if (filtered.length === 1) {
			filtered[0].nAme = newNAme;
			this._onDidChAngeWAtchExpressions.fire(filtered[0]);
		}
	}

	removeWAtchExpressions(id: string | null = null): void {
		this.wAtchExpressions = id ? this.wAtchExpressions.filter(we => we.getId() !== id) : [];
		this._onDidChAngeWAtchExpressions.fire(undefined);
	}

	moveWAtchExpression(id: string, position: number): void {
		const we = this.wAtchExpressions.find(we => we.getId() === id);
		if (we) {
			this.wAtchExpressions = this.wAtchExpressions.filter(we => we.getId() !== id);
			this.wAtchExpressions = this.wAtchExpressions.slice(0, position).concAt(we, this.wAtchExpressions.slice(position));
			this._onDidChAngeWAtchExpressions.fire(undefined);
		}
	}

	sourceIsNotAvAilAble(uri: uri): void {
		this.sessions.forEAch(s => {
			const source = s.getSourceForUri(uri);
			if (source) {
				source.AvAilAble = fAlse;
			}
		});
		this._onDidChAngeCAllStAck.fire(undefined);
	}
}
