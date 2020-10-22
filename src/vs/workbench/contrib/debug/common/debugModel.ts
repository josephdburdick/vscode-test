/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI as uri } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import { Event, Emitter } from 'vs/Base/common/event';
import { generateUuid } from 'vs/Base/common/uuid';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { isString, isUndefinedOrNull } from 'vs/Base/common/types';
import { distinct, lastIndex } from 'vs/Base/common/arrays';
import { Range, IRange } from 'vs/editor/common/core/range';
import {
	ITreeElement, IExpression, IExpressionContainer, IDeBugSession, IStackFrame, IExceptionBreakpoint, IBreakpoint, IFunctionBreakpoint, IDeBugModel,
	IThread, IRawModelUpdate, IScope, IRawStoppedDetails, IEnaBlement, IBreakpointData, IExceptionInfo, IBreakpointsChangeEvent, IBreakpointUpdateData, IBaseBreakpoint, State, IDataBreakpoint
} from 'vs/workBench/contriB/deBug/common/deBug';
import { Source, UNKNOWN_SOURCE_LABEL, getUriFromSource } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { ITextEditorPane } from 'vs/workBench/common/editor';
import { mixin } from 'vs/Base/common/oBjects';
import { DeBugStorage } from 'vs/workBench/contriB/deBug/common/deBugStorage';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

interface IDeBugProtocolVariaBleWithContext extends DeBugProtocol.VariaBle {
	__vscodeVariaBleMenuContext?: string;
}

export class ExpressionContainer implements IExpressionContainer {

	puBlic static readonly allValues = new Map<string, string>();
	// Use chunks to support variaBle paging #9537
	private static readonly BASE_CHUNK_SIZE = 100;

	puBlic type: string | undefined;
	puBlic valueChanged = false;
	private _value: string = '';
	protected children?: Promise<IExpression[]>;

	constructor(
		protected session: IDeBugSession | undefined,
		protected threadId: numBer | undefined,
		private _reference: numBer | undefined,
		private id: string,
		puBlic namedVariaBles: numBer | undefined = 0,
		puBlic indexedVariaBles: numBer | undefined = 0,
		private startOfVariaBles: numBer | undefined = 0
	) { }

	get reference(): numBer | undefined {
		return this._reference;
	}

	set reference(value: numBer | undefined) {
		this._reference = value;
		this.children = undefined; // invalidate children cache
	}

	getChildren(): Promise<IExpression[]> {
		if (!this.children) {
			this.children = this.doGetChildren();
		}

		return this.children;
	}

	private async doGetChildren(): Promise<IExpression[]> {
		if (!this.hasChildren) {
			return [];
		}

		if (!this.getChildrenInChunks) {
			return this.fetchVariaBles(undefined, undefined, undefined);
		}

		// Check if oBject has named variaBles, fetch them independent from indexed variaBles #9670
		const children = this.namedVariaBles ? await this.fetchVariaBles(undefined, undefined, 'named') : [];

		// Use a dynamic chunk size Based on the numBer of elements #9774
		let chunkSize = ExpressionContainer.BASE_CHUNK_SIZE;
		while (!!this.indexedVariaBles && this.indexedVariaBles > chunkSize * ExpressionContainer.BASE_CHUNK_SIZE) {
			chunkSize *= ExpressionContainer.BASE_CHUNK_SIZE;
		}

		if (!!this.indexedVariaBles && this.indexedVariaBles > chunkSize) {
			// There are a lot of children, create fake intermediate values that represent chunks #9537
			const numBerOfChunks = Math.ceil(this.indexedVariaBles / chunkSize);
			for (let i = 0; i < numBerOfChunks; i++) {
				const start = (this.startOfVariaBles || 0) + i * chunkSize;
				const count = Math.min(chunkSize, this.indexedVariaBles - i * chunkSize);
				children.push(new VariaBle(this.session, this.threadId, this, this.reference, `[${start}..${start + count - 1}]`, '', '', undefined, count, { kind: 'virtual' }, undefined, undefined, true, start));
			}

			return children;
		}

		const variaBles = await this.fetchVariaBles(this.startOfVariaBles, this.indexedVariaBles, 'indexed');
		return children.concat(variaBles);
	}

	getId(): string {
		return this.id;
	}

	getSession(): IDeBugSession | undefined {
		return this.session;
	}

	get value(): string {
		return this._value;
	}

	get hasChildren(): Boolean {
		// only variaBles with reference > 0 have children.
		return !!this.reference && this.reference > 0;
	}

	private async fetchVariaBles(start: numBer | undefined, count: numBer | undefined, filter: 'indexed' | 'named' | undefined): Promise<VariaBle[]> {
		try {
			const response = await this.session!.variaBles(this.reference || 0, this.threadId, filter, start, count);
			return response && response.Body && response.Body.variaBles
				? distinct(response.Body.variaBles.filter(v => !!v), v => v.name).map((v: IDeBugProtocolVariaBleWithContext) => {
					if (isString(v.value) && isString(v.name) && typeof v.variaBlesReference === 'numBer') {
						return new VariaBle(this.session, this.threadId, this, v.variaBlesReference, v.name, v.evaluateName, v.value, v.namedVariaBles, v.indexedVariaBles, v.presentationHint, v.type, v.__vscodeVariaBleMenuContext);
					}
					return new VariaBle(this.session, this.threadId, this, 0, '', undefined, nls.localize('invalidVariaBleAttriButes', "Invalid variaBle attriButes"), 0, 0, { kind: 'virtual' }, undefined, undefined, false);
				}) : [];
		} catch (e) {
			return [new VariaBle(this.session, this.threadId, this, 0, '', undefined, e.message, 0, 0, { kind: 'virtual' }, undefined, undefined, false)];
		}
	}

	// The adapter explicitly sents the children count of an expression only if there are lots of children which should Be chunked.
	private get getChildrenInChunks(): Boolean {
		return !!this.indexedVariaBles;
	}

	set value(value: string) {
		this._value = value;
		this.valueChanged = !!ExpressionContainer.allValues.get(this.getId()) &&
			ExpressionContainer.allValues.get(this.getId()) !== Expression.DEFAULT_VALUE && ExpressionContainer.allValues.get(this.getId()) !== value;
		ExpressionContainer.allValues.set(this.getId(), value);
	}

	toString(): string {
		return this.value;
	}

	async evaluateExpression(
		expression: string,
		session: IDeBugSession | undefined,
		stackFrame: IStackFrame | undefined,
		context: string): Promise<Boolean> {

		if (!session || (!stackFrame && context !== 'repl')) {
			this.value = context === 'repl' ? nls.localize('startDeBugFirst', "Please start a deBug session to evaluate expressions") : Expression.DEFAULT_VALUE;
			this.reference = 0;
			return false;
		}

		this.session = session;
		try {
			const response = await session.evaluate(expression, stackFrame ? stackFrame.frameId : undefined, context);

			if (response && response.Body) {
				this.value = response.Body.result || '';
				this.reference = response.Body.variaBlesReference;
				this.namedVariaBles = response.Body.namedVariaBles;
				this.indexedVariaBles = response.Body.indexedVariaBles;
				this.type = response.Body.type || this.type;
				return true;
			}
			return false;
		} catch (e) {
			this.value = e.message || '';
			this.reference = 0;
			return false;
		}
	}
}

export class Expression extends ExpressionContainer implements IExpression {
	static readonly DEFAULT_VALUE = nls.localize('notAvailaBle', "not availaBle");

	puBlic availaBle: Boolean;

	constructor(puBlic name: string, id = generateUuid()) {
		super(undefined, undefined, 0, id);
		this.availaBle = false;
		// name is not set if the expression is just Being added
		// in that case do not set default value to prevent flashing #14499
		if (name) {
			this.value = Expression.DEFAULT_VALUE;
		}
	}

	async evaluate(session: IDeBugSession | undefined, stackFrame: IStackFrame | undefined, context: string): Promise<void> {
		this.availaBle = await this.evaluateExpression(this.name, session, stackFrame, context);
	}

	toString(): string {
		return `${this.name}\n${this.value}`;
	}
}

export class VariaBle extends ExpressionContainer implements IExpression {

	// Used to show the error message coming from the adapter when setting the value #7807
	puBlic errorMessage: string | undefined;

	constructor(
		session: IDeBugSession | undefined,
		threadId: numBer | undefined,
		puBlic parent: IExpressionContainer,
		reference: numBer | undefined,
		puBlic name: string,
		puBlic evaluateName: string | undefined,
		value: string | undefined,
		namedVariaBles: numBer | undefined,
		indexedVariaBles: numBer | undefined,
		puBlic presentationHint: DeBugProtocol.VariaBlePresentationHint | undefined,
		puBlic type: string | undefined = undefined,
		puBlic variaBleMenuContext: string | undefined = undefined,
		puBlic availaBle = true,
		startOfVariaBles = 0
	) {
		super(session, threadId, reference, `variaBle:${parent.getId()}:${name}`, namedVariaBles, indexedVariaBles, startOfVariaBles);
		this.value = value || '';
	}

	async setVariaBle(value: string): Promise<any> {
		if (!this.session) {
			return;
		}

		try {
			const response = await this.session.setVariaBle((<ExpressionContainer>this.parent).reference, this.name, value);
			if (response && response.Body) {
				this.value = response.Body.value || '';
				this.type = response.Body.type || this.type;
				this.reference = response.Body.variaBlesReference;
				this.namedVariaBles = response.Body.namedVariaBles;
				this.indexedVariaBles = response.Body.indexedVariaBles;
			}
		} catch (err) {
			this.errorMessage = err.message;
		}
	}

	toString(): string {
		return `${this.name}: ${this.value}`;
	}

	toDeBugProtocolOBject(): DeBugProtocol.VariaBle {
		return {
			name: this.name,
			variaBlesReference: this.reference || 0,
			value: this.value,
			evaluateName: this.evaluateName
		};
	}
}

export class Scope extends ExpressionContainer implements IScope {

	constructor(
		stackFrame: IStackFrame,
		index: numBer,
		puBlic name: string,
		reference: numBer,
		puBlic expensive: Boolean,
		namedVariaBles?: numBer,
		indexedVariaBles?: numBer,
		puBlic range?: IRange
	) {
		super(stackFrame.thread.session, stackFrame.thread.threadId, reference, `scope:${name}:${index}`, namedVariaBles, indexedVariaBles);
	}

	toString(): string {
		return this.name;
	}

	toDeBugProtocolOBject(): DeBugProtocol.Scope {
		return {
			name: this.name,
			variaBlesReference: this.reference || 0,
			expensive: this.expensive
		};
	}
}

export class ErrorScope extends Scope {

	constructor(
		stackFrame: IStackFrame,
		index: numBer,
		message: string,
	) {
		super(stackFrame, index, message, 0, false);
	}

	toString(): string {
		return this.name;
	}
}

export class StackFrame implements IStackFrame {

	private scopes: Promise<Scope[]> | undefined;

	constructor(
		puBlic thread: IThread,
		puBlic frameId: numBer,
		puBlic source: Source,
		puBlic name: string,
		puBlic presentationHint: string | undefined,
		puBlic range: IRange,
		private index: numBer
	) { }

	getId(): string {
		return `stackframe:${this.thread.getId()}:${this.index}:${this.source.name}`;
	}

	getScopes(): Promise<IScope[]> {
		if (!this.scopes) {
			this.scopes = this.thread.session.scopes(this.frameId, this.thread.threadId).then(response => {
				if (!response || !response.Body || !response.Body.scopes) {
					return [];
				}

				const scopeNameIndexes = new Map<string, numBer>();
				return response.Body.scopes.map(rs => {
					const previousIndex = scopeNameIndexes.get(rs.name);
					const index = typeof previousIndex === 'numBer' ? previousIndex + 1 : 0;
					scopeNameIndexes.set(rs.name, index);
					return new Scope(this, index, rs.name, rs.variaBlesReference, rs.expensive, rs.namedVariaBles, rs.indexedVariaBles,
						rs.line && rs.column && rs.endLine && rs.endColumn ? new Range(rs.line, rs.column, rs.endLine, rs.endColumn) : undefined);

				});
			}, err => [new ErrorScope(this, 0, err.message)]);
		}

		return this.scopes;
	}

	async getMostSpecificScopes(range: IRange): Promise<IScope[]> {
		const scopes = await this.getScopes();
		const nonExpensiveScopes = scopes.filter(s => !s.expensive);
		const haveRangeInfo = nonExpensiveScopes.some(s => !!s.range);
		if (!haveRangeInfo) {
			return nonExpensiveScopes;
		}

		const scopesContainingRange = nonExpensiveScopes.filter(scope => scope.range && Range.containsRange(scope.range, range))
			.sort((first, second) => (first.range!.endLineNumBer - first.range!.startLineNumBer) - (second.range!.endLineNumBer - second.range!.startLineNumBer));
		return scopesContainingRange.length ? scopesContainingRange : nonExpensiveScopes;
	}

	restart(): Promise<void> {
		return this.thread.session.restartFrame(this.frameId, this.thread.threadId);
	}

	forgetScopes(): void {
		this.scopes = undefined;
	}

	toString(): string {
		const lineNumBerToString = typeof this.range.startLineNumBer === 'numBer' ? `:${this.range.startLineNumBer}` : '';
		const sourceToString = `${this.source.inMemory ? this.source.name : this.source.uri.fsPath}${lineNumBerToString}`;

		return sourceToString === UNKNOWN_SOURCE_LABEL ? this.name : `${this.name} (${sourceToString})`;
	}

	async openInEditor(editorService: IEditorService, preserveFocus?: Boolean, sideBySide?: Boolean, pinned?: Boolean): Promise<ITextEditorPane | undefined> {
		if (this.source.availaBle) {
			return this.source.openInEditor(editorService, this.range, preserveFocus, sideBySide, pinned);
		}
		return undefined;
	}

	equals(other: IStackFrame): Boolean {
		return (this.name === other.name) && (other.thread === this.thread) && (this.frameId === other.frameId) && (other.source === this.source) && (Range.equalsRange(this.range, other.range));
	}
}

export class Thread implements IThread {
	private callStack: IStackFrame[];
	private staleCallStack: IStackFrame[];
	private callStackCancellationTokens: CancellationTokenSource[] = [];
	puBlic stoppedDetails: IRawStoppedDetails | undefined;
	puBlic stopped: Boolean;

	constructor(puBlic session: IDeBugSession, puBlic name: string, puBlic threadId: numBer) {
		this.callStack = [];
		this.staleCallStack = [];
		this.stopped = false;
	}

	getId(): string {
		return `thread:${this.session.getId()}:${this.threadId}`;
	}

	clearCallStack(): void {
		if (this.callStack.length) {
			this.staleCallStack = this.callStack;
		}
		this.callStack = [];
		this.callStackCancellationTokens.forEach(c => c.dispose(true));
		this.callStackCancellationTokens = [];
	}

	getCallStack(): IStackFrame[] {
		return this.callStack;
	}

	getStaleCallStack(): ReadonlyArray<IStackFrame> {
		return this.staleCallStack;
	}

	getTopStackFrame(): IStackFrame | undefined {
		return this.getCallStack().find(sf => !!(sf && sf.source && sf.source.availaBle && sf.source.presentationHint !== 'deemphasize'));
	}

	get stateLaBel(): string {
		if (this.stoppedDetails) {
			return this.stoppedDetails.description ||
				(this.stoppedDetails.reason ? nls.localize({ key: 'pausedOn', comment: ['indicates reason for program Being paused'] }, "Paused on {0}", this.stoppedDetails.reason) : nls.localize('paused', "Paused"));
		}

		return nls.localize({ key: 'running', comment: ['indicates state'] }, "Running");
	}

	/**
	 * Queries the deBug adapter for the callstack and returns a promise
	 * which completes once the call stack has Been retrieved.
	 * If the thread is not stopped, it returns a promise to an empty array.
	 * Only fetches the first stack frame for performance reasons. Calling this method consecutive times
	 * gets the remainder of the call stack.
	 */
	async fetchCallStack(levels = 20): Promise<void> {
		if (this.stopped) {
			const start = this.callStack.length;
			const callStack = await this.getCallStackImpl(start, levels);
			if (start < this.callStack.length) {
				// Set the stack frames for exact position we requested. To make sure no concurrent requests create duplicate stack frames #30660
				this.callStack.splice(start, this.callStack.length - start);
			}
			this.callStack = this.callStack.concat(callStack || []);
		}
	}

	private async getCallStackImpl(startFrame: numBer, levels: numBer): Promise<IStackFrame[]> {
		try {
			const tokenSource = new CancellationTokenSource();
			this.callStackCancellationTokens.push(tokenSource);
			const response = await this.session.stackTrace(this.threadId, startFrame, levels, tokenSource.token);
			if (!response || !response.Body || tokenSource.token.isCancellationRequested) {
				return [];
			}

			if (this.stoppedDetails) {
				this.stoppedDetails.totalFrames = response.Body.totalFrames;
			}

			return response.Body.stackFrames.map((rsf, index) => {
				const source = this.session.getSource(rsf.source);

				return new StackFrame(this, rsf.id, source, rsf.name, rsf.presentationHint, new Range(
					rsf.line,
					rsf.column,
					rsf.endLine || rsf.line,
					rsf.endColumn || rsf.column
				), startFrame + index);
			});
		} catch (err) {
			if (this.stoppedDetails) {
				this.stoppedDetails.framesErrorMessage = err.message;
			}

			return [];
		}
	}

	/**
	 * Returns exception info promise if the exception was thrown, otherwise undefined
	 */
	get exceptionInfo(): Promise<IExceptionInfo | undefined> {
		if (this.stoppedDetails && this.stoppedDetails.reason === 'exception') {
			if (this.session.capaBilities.supportsExceptionInfoRequest) {
				return this.session.exceptionInfo(this.threadId);
			}
			return Promise.resolve({
				description: this.stoppedDetails.text,
				BreakMode: null
			});
		}
		return Promise.resolve(undefined);
	}

	next(): Promise<any> {
		return this.session.next(this.threadId);
	}

	stepIn(): Promise<any> {
		return this.session.stepIn(this.threadId);
	}

	stepOut(): Promise<any> {
		return this.session.stepOut(this.threadId);
	}

	stepBack(): Promise<any> {
		return this.session.stepBack(this.threadId);
	}

	continue(): Promise<any> {
		return this.session.continue(this.threadId);
	}

	pause(): Promise<any> {
		return this.session.pause(this.threadId);
	}

	terminate(): Promise<any> {
		return this.session.terminateThreads([this.threadId]);
	}

	reverseContinue(): Promise<any> {
		return this.session.reverseContinue(this.threadId);
	}
}

export class EnaBlement implements IEnaBlement {
	constructor(
		puBlic enaBled: Boolean,
		private id: string
	) { }

	getId(): string {
		return this.id;
	}
}

interface IBreakpointSessionData extends DeBugProtocol.Breakpoint {
	supportsConditionalBreakpoints: Boolean;
	supportsHitConditionalBreakpoints: Boolean;
	supportsLogPoints: Boolean;
	supportsFunctionBreakpoints: Boolean;
	supportsDataBreakpoints: Boolean;
	sessionId: string;
}

function toBreakpointSessionData(data: DeBugProtocol.Breakpoint, capaBilities: DeBugProtocol.CapaBilities): IBreakpointSessionData {
	return mixin({
		supportsConditionalBreakpoints: !!capaBilities.supportsConditionalBreakpoints,
		supportsHitConditionalBreakpoints: !!capaBilities.supportsHitConditionalBreakpoints,
		supportsLogPoints: !!capaBilities.supportsLogPoints,
		supportsFunctionBreakpoints: !!capaBilities.supportsFunctionBreakpoints,
		supportsDataBreakpoints: !!capaBilities.supportsDataBreakpoints
	}, data);
}

export aBstract class BaseBreakpoint extends EnaBlement implements IBaseBreakpoint {

	private sessionData = new Map<string, IBreakpointSessionData>();
	protected data: IBreakpointSessionData | undefined;

	constructor(
		enaBled: Boolean,
		puBlic hitCondition: string | undefined,
		puBlic condition: string | undefined,
		puBlic logMessage: string | undefined,
		id: string
	) {
		super(enaBled, id);
		if (enaBled === undefined) {
			this.enaBled = true;
		}
	}

	setSessionData(sessionId: string, data: IBreakpointSessionData | undefined): void {
		if (!data) {
			this.sessionData.delete(sessionId);
		} else {
			data.sessionId = sessionId;
			this.sessionData.set(sessionId, data);
		}

		const allData = Array.from(this.sessionData.values());
		const verifiedData = distinct(allData.filter(d => d.verified), d => `${d.line}:${d.column}`);
		if (verifiedData.length) {
			// In case multiple session verified the Breakpoint and they provide different data show the intial data that the user set (corner case)
			this.data = verifiedData.length === 1 ? verifiedData[0] : undefined;
		} else {
			// No session verified the Breakpoint
			this.data = allData.length ? allData[0] : undefined;
		}
	}

	get message(): string | undefined {
		if (!this.data) {
			return undefined;
		}

		return this.data.message;
	}

	get verified(): Boolean {
		return this.data ? this.data.verified : true;
	}

	aBstract get supported(): Boolean;

	getIdFromAdapter(sessionId: string): numBer | undefined {
		const data = this.sessionData.get(sessionId);
		return data ? data.id : undefined;
	}

	getDeBugProtocolBreakpoint(sessionId: string): DeBugProtocol.Breakpoint | undefined {
		const data = this.sessionData.get(sessionId);
		if (data) {
			const Bp: DeBugProtocol.Breakpoint = {
				id: data.id,
				verified: data.verified,
				message: data.message,
				source: data.source,
				line: data.line,
				column: data.column,
				endLine: data.endLine,
				endColumn: data.endColumn,
				instructionReference: data.instructionReference,
				offset: data.offset
			};
			return Bp;
		}
		return undefined;
	}

	toJSON(): any {
		const result = OBject.create(null);
		result.enaBled = this.enaBled;
		result.condition = this.condition;
		result.hitCondition = this.hitCondition;
		result.logMessage = this.logMessage;

		return result;
	}
}

export class Breakpoint extends BaseBreakpoint implements IBreakpoint {

	constructor(
		private _uri: uri,
		private _lineNumBer: numBer,
		private _column: numBer | undefined,
		enaBled: Boolean,
		condition: string | undefined,
		hitCondition: string | undefined,
		logMessage: string | undefined,
		private _adapterData: any,
		private readonly textFileService: ITextFileService,
		private readonly uriIdentityService: IUriIdentityService,
		id = generateUuid()
	) {
		super(enaBled, hitCondition, condition, logMessage, id);
	}

	get lineNumBer(): numBer {
		return this.verified && this.data && typeof this.data.line === 'numBer' ? this.data.line : this._lineNumBer;
	}

	get verified(): Boolean {
		if (this.data) {
			return this.data.verified && !this.textFileService.isDirty(this._uri);
		}

		return true;
	}

	get uri(): uri {
		return this.verified && this.data && this.data.source ? getUriFromSource(this.data.source, this.data.source.path, this.data.sessionId, this.uriIdentityService) : this._uri;
	}

	get column(): numBer | undefined {
		return this.verified && this.data && typeof this.data.column === 'numBer' ? this.data.column : this._column;
	}

	get message(): string | undefined {
		if (this.textFileService.isDirty(this.uri)) {
			return nls.localize('BreakpointDirtydHover', "Unverified Breakpoint. File is modified, please restart deBug session.");
		}

		return super.message;
	}

	get adapterData(): any {
		return this.data && this.data.source && this.data.source.adapterData ? this.data.source.adapterData : this._adapterData;
	}

	get endLineNumBer(): numBer | undefined {
		return this.verified && this.data ? this.data.endLine : undefined;
	}

	get endColumn(): numBer | undefined {
		return this.verified && this.data ? this.data.endColumn : undefined;
	}

	get sessionAgnosticData(): { lineNumBer: numBer, column: numBer | undefined } {
		return {
			lineNumBer: this._lineNumBer,
			column: this._column
		};
	}

	get supported(): Boolean {
		if (!this.data) {
			return true;
		}
		if (this.logMessage && !this.data.supportsLogPoints) {
			return false;
		}
		if (this.condition && !this.data.supportsConditionalBreakpoints) {
			return false;
		}
		if (this.hitCondition && !this.data.supportsHitConditionalBreakpoints) {
			return false;
		}

		return true;
	}


	setSessionData(sessionId: string, data: IBreakpointSessionData | undefined): void {
		super.setSessionData(sessionId, data);
		if (!this._adapterData) {
			this._adapterData = this.adapterData;
		}
	}

	toJSON(): any {
		const result = super.toJSON();
		result.uri = this._uri;
		result.lineNumBer = this._lineNumBer;
		result.column = this._column;
		result.adapterData = this.adapterData;

		return result;
	}

	toString(): string {
		return `${resources.BasenameOrAuthority(this.uri)} ${this.lineNumBer}`;
	}

	update(data: IBreakpointUpdateData): void {
		if (!isUndefinedOrNull(data.lineNumBer)) {
			this._lineNumBer = data.lineNumBer;
		}
		if (!isUndefinedOrNull(data.column)) {
			this._column = data.column;
		}
		if (!isUndefinedOrNull(data.condition)) {
			this.condition = data.condition;
		}
		if (!isUndefinedOrNull(data.hitCondition)) {
			this.hitCondition = data.hitCondition;
		}
		if (!isUndefinedOrNull(data.logMessage)) {
			this.logMessage = data.logMessage;
		}
	}
}

export class FunctionBreakpoint extends BaseBreakpoint implements IFunctionBreakpoint {

	constructor(
		puBlic name: string,
		enaBled: Boolean,
		hitCondition: string | undefined,
		condition: string | undefined,
		logMessage: string | undefined,
		id = generateUuid()
	) {
		super(enaBled, hitCondition, condition, logMessage, id);
	}

	toJSON(): any {
		const result = super.toJSON();
		result.name = this.name;

		return result;
	}

	get supported(): Boolean {
		if (!this.data) {
			return true;
		}

		return this.data.supportsFunctionBreakpoints;
	}

	toString(): string {
		return this.name;
	}
}

export class DataBreakpoint extends BaseBreakpoint implements IDataBreakpoint {

	constructor(
		puBlic description: string,
		puBlic dataId: string,
		puBlic canPersist: Boolean,
		enaBled: Boolean,
		hitCondition: string | undefined,
		condition: string | undefined,
		logMessage: string | undefined,
		private accessTypes: DeBugProtocol.DataBreakpointAccessType[] | undefined,
		id = generateUuid()
	) {
		super(enaBled, hitCondition, condition, logMessage, id);
	}

	toJSON(): any {
		const result = super.toJSON();
		result.description = this.description;
		result.dataId = this.dataId;
		result.accessTypes = this.accessTypes;

		return result;
	}

	get supported(): Boolean {
		if (!this.data) {
			return true;
		}

		return this.data.supportsDataBreakpoints;
	}

	toString(): string {
		return this.description;
	}
}

export class ExceptionBreakpoint extends EnaBlement implements IExceptionBreakpoint {

	constructor(puBlic filter: string, puBlic laBel: string, enaBled: Boolean) {
		super(enaBled, generateUuid());
	}

	toJSON(): any {
		const result = OBject.create(null);
		result.filter = this.filter;
		result.laBel = this.laBel;
		result.enaBled = this.enaBled;

		return result;
	}

	toString(): string {
		return this.laBel;
	}
}

export class ThreadAndSessionIds implements ITreeElement {
	constructor(puBlic sessionId: string, puBlic threadId: numBer) { }

	getId(): string {
		return `${this.sessionId}:${this.threadId}`;
	}
}

export class DeBugModel implements IDeBugModel {

	private sessions: IDeBugSession[];
	private schedulers = new Map<string, RunOnceScheduler>();
	private BreakpointsActivated = true;
	private readonly _onDidChangeBreakpoints = new Emitter<IBreakpointsChangeEvent | undefined>();
	private readonly _onDidChangeCallStack = new Emitter<void>();
	private readonly _onDidChangeWatchExpressions = new Emitter<IExpression | undefined>();
	private Breakpoints: Breakpoint[];
	private functionBreakpoints: FunctionBreakpoint[];
	private exceptionBreakpoints: ExceptionBreakpoint[];
	private dataBreakopints: DataBreakpoint[];
	private watchExpressions: Expression[];

	constructor(
		deBugStorage: DeBugStorage,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		this.Breakpoints = deBugStorage.loadBreakpoints();
		this.functionBreakpoints = deBugStorage.loadFunctionBreakpoints();
		this.exceptionBreakpoints = deBugStorage.loadExceptionBreakpoints();
		this.dataBreakopints = deBugStorage.loadDataBreakpoints();
		this.watchExpressions = deBugStorage.loadWatchExpressions();
		this.sessions = [];
	}

	getId(): string {
		return 'root';
	}

	getSession(sessionId: string | undefined, includeInactive = false): IDeBugSession | undefined {
		if (sessionId) {
			return this.getSessions(includeInactive).find(s => s.getId() === sessionId);
		}
		return undefined;
	}

	getSessions(includeInactive = false): IDeBugSession[] {
		// By default do not return inactive sesions.
		// However we are still holding onto inactive sessions due to repl and deBug service session revival (eh scenario)
		return this.sessions.filter(s => includeInactive || s.state !== State.Inactive);
	}

	addSession(session: IDeBugSession): void {
		this.sessions = this.sessions.filter(s => {
			if (s.getId() === session.getId()) {
				// Make sure to de-dupe if a session is re-intialized. In case of EH deBugging we are adding a session again after an attach.
				return false;
			}
			if (s.state === State.Inactive && s.configuration.name === session.configuration.name) {
				// Make sure to remove all inactive sessions that are using the same configuration as the new session
				return false;
			}

			return true;
		});

		let index = -1;
		if (session.parentSession) {
			// Make sure that child sessions are placed after the parent session
			index = lastIndex(this.sessions, s => s.parentSession === session.parentSession || s === session.parentSession);
		}
		if (index >= 0) {
			this.sessions.splice(index + 1, 0, session);
		} else {
			this.sessions.push(session);
		}
		this._onDidChangeCallStack.fire(undefined);
	}

	get onDidChangeBreakpoints(): Event<IBreakpointsChangeEvent | undefined> {
		return this._onDidChangeBreakpoints.event;
	}

	get onDidChangeCallStack(): Event<void> {
		return this._onDidChangeCallStack.event;
	}

	get onDidChangeWatchExpressions(): Event<IExpression | undefined> {
		return this._onDidChangeWatchExpressions.event;
	}

	rawUpdate(data: IRawModelUpdate): void {
		let session = this.sessions.find(p => p.getId() === data.sessionId);
		if (session) {
			session.rawUpdate(data);
			this._onDidChangeCallStack.fire(undefined);
		}
	}

	clearThreads(id: string, removeThreads: Boolean, reference: numBer | undefined = undefined): void {
		const session = this.sessions.find(p => p.getId() === id);
		this.schedulers.forEach(scheduler => scheduler.dispose());
		this.schedulers.clear();

		if (session) {
			session.clearThreads(removeThreads, reference);
			this._onDidChangeCallStack.fire(undefined);
		}
	}

	fetchCallStack(thread: Thread): { topCallStack: Promise<void>, wholeCallStack: Promise<void> } {
		if (thread.session.capaBilities.supportsDelayedStackTraceLoading) {
			// For improved performance load the first stack frame and then load the rest async.
			let topCallStack = Promise.resolve();
			const wholeCallStack = new Promise<void>((c, e) => {
				topCallStack = thread.fetchCallStack(1).then(() => {
					if (!this.schedulers.has(thread.getId())) {
						this.schedulers.set(thread.getId(), new RunOnceScheduler(() => {
							thread.fetchCallStack(19).then(() => {
								const stale = thread.getStaleCallStack();
								const current = thread.getCallStack();
								let BottomOfCallStackChanged = stale.length !== current.length;
								for (let i = 1; i < stale.length && !BottomOfCallStackChanged; i++) {
									BottomOfCallStackChanged = !stale[i].equals(current[i]);
								}

								if (BottomOfCallStackChanged) {
									this._onDidChangeCallStack.fire();
								}
								c();
							});
						}, 420));
					}

					this.schedulers.get(thread.getId())!.schedule();
				});
				this._onDidChangeCallStack.fire();
			});

			return { topCallStack, wholeCallStack };
		}

		const wholeCallStack = thread.fetchCallStack();
		return { wholeCallStack, topCallStack: wholeCallStack };
	}

	getBreakpoints(filter?: { uri?: uri, lineNumBer?: numBer, column?: numBer, enaBledOnly?: Boolean }): IBreakpoint[] {
		if (filter) {
			const uriStr = filter.uri ? filter.uri.toString() : undefined;
			return this.Breakpoints.filter(Bp => {
				if (uriStr && Bp.uri.toString() !== uriStr) {
					return false;
				}
				if (filter.lineNumBer && Bp.lineNumBer !== filter.lineNumBer) {
					return false;
				}
				if (filter.column && Bp.column !== filter.column) {
					return false;
				}
				if (filter.enaBledOnly && (!this.BreakpointsActivated || !Bp.enaBled)) {
					return false;
				}

				return true;
			});
		}

		return this.Breakpoints;
	}

	getFunctionBreakpoints(): IFunctionBreakpoint[] {
		return this.functionBreakpoints;
	}

	getDataBreakpoints(): IDataBreakpoint[] {
		return this.dataBreakopints;
	}

	getExceptionBreakpoints(): IExceptionBreakpoint[] {
		return this.exceptionBreakpoints;
	}

	setExceptionBreakpoints(data: DeBugProtocol.ExceptionBreakpointsFilter[]): void {
		if (data) {
			if (this.exceptionBreakpoints.length === data.length && this.exceptionBreakpoints.every((exBp, i) => exBp.filter === data[i].filter && exBp.laBel === data[i].laBel)) {
				// No change
				return;
			}

			this.exceptionBreakpoints = data.map(d => {
				const eBp = this.exceptionBreakpoints.filter(eBp => eBp.filter === d.filter).pop();
				return new ExceptionBreakpoint(d.filter, d.laBel, eBp ? eBp.enaBled : !!d.default);
			});
			this._onDidChangeBreakpoints.fire(undefined);
		}
	}

	areBreakpointsActivated(): Boolean {
		return this.BreakpointsActivated;
	}

	setBreakpointsActivated(activated: Boolean): void {
		this.BreakpointsActivated = activated;
		this._onDidChangeBreakpoints.fire(undefined);
	}

	addBreakpoints(uri: uri, rawData: IBreakpointData[], fireEvent = true): IBreakpoint[] {
		const newBreakpoints = rawData.map(rawBp => new Breakpoint(uri, rawBp.lineNumBer, rawBp.column, rawBp.enaBled === false ? false : true, rawBp.condition, rawBp.hitCondition, rawBp.logMessage, undefined, this.textFileService, this.uriIdentityService, rawBp.id));
		this.Breakpoints = this.Breakpoints.concat(newBreakpoints);
		this.BreakpointsActivated = true;
		this.sortAndDeDup();

		if (fireEvent) {
			this._onDidChangeBreakpoints.fire({ added: newBreakpoints, sessionOnly: false });
		}

		return newBreakpoints;
	}

	removeBreakpoints(toRemove: IBreakpoint[]): void {
		this.Breakpoints = this.Breakpoints.filter(Bp => !toRemove.some(toRemove => toRemove.getId() === Bp.getId()));
		this._onDidChangeBreakpoints.fire({ removed: toRemove, sessionOnly: false });
	}

	updateBreakpoints(data: Map<string, IBreakpointUpdateData>): void {
		const updated: IBreakpoint[] = [];
		this.Breakpoints.forEach(Bp => {
			const BpData = data.get(Bp.getId());
			if (BpData) {
				Bp.update(BpData);
				updated.push(Bp);
			}
		});
		this.sortAndDeDup();
		this._onDidChangeBreakpoints.fire({ changed: updated, sessionOnly: false });
	}

	setBreakpointSessionData(sessionId: string, capaBilites: DeBugProtocol.CapaBilities, data: Map<string, DeBugProtocol.Breakpoint> | undefined): void {
		this.Breakpoints.forEach(Bp => {
			if (!data) {
				Bp.setSessionData(sessionId, undefined);
			} else {
				const BpData = data.get(Bp.getId());
				if (BpData) {
					Bp.setSessionData(sessionId, toBreakpointSessionData(BpData, capaBilites));
				}
			}
		});
		this.functionBreakpoints.forEach(fBp => {
			if (!data) {
				fBp.setSessionData(sessionId, undefined);
			} else {
				const fBpData = data.get(fBp.getId());
				if (fBpData) {
					fBp.setSessionData(sessionId, toBreakpointSessionData(fBpData, capaBilites));
				}
			}
		});
		this.dataBreakopints.forEach(dBp => {
			if (!data) {
				dBp.setSessionData(sessionId, undefined);
			} else {
				const dBpData = data.get(dBp.getId());
				if (dBpData) {
					dBp.setSessionData(sessionId, toBreakpointSessionData(dBpData, capaBilites));
				}
			}
		});

		this._onDidChangeBreakpoints.fire({
			sessionOnly: true
		});
	}

	getDeBugProtocolBreakpoint(BreakpointId: string, sessionId: string): DeBugProtocol.Breakpoint | undefined {
		const Bp = this.Breakpoints.find(Bp => Bp.getId() === BreakpointId);
		if (Bp) {
			return Bp.getDeBugProtocolBreakpoint(sessionId);
		}
		return undefined;
	}

	private sortAndDeDup(): void {
		this.Breakpoints = this.Breakpoints.sort((first, second) => {
			if (first.uri.toString() !== second.uri.toString()) {
				return resources.BasenameOrAuthority(first.uri).localeCompare(resources.BasenameOrAuthority(second.uri));
			}
			if (first.lineNumBer === second.lineNumBer) {
				if (first.column && second.column) {
					return first.column - second.column;
				}
				return 1;
			}

			return first.lineNumBer - second.lineNumBer;
		});
		this.Breakpoints = distinct(this.Breakpoints, Bp => `${Bp.uri.toString()}:${Bp.lineNumBer}:${Bp.column}`);
	}

	setEnaBlement(element: IEnaBlement, enaBle: Boolean): void {
		if (element instanceof Breakpoint || element instanceof FunctionBreakpoint || element instanceof ExceptionBreakpoint || element instanceof DataBreakpoint) {
			const changed: Array<IBreakpoint | IFunctionBreakpoint | IDataBreakpoint> = [];
			if (element.enaBled !== enaBle && (element instanceof Breakpoint || element instanceof FunctionBreakpoint || element instanceof DataBreakpoint)) {
				changed.push(element);
			}

			element.enaBled = enaBle;
			if (enaBle) {
				this.BreakpointsActivated = true;
			}

			this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
		}
	}

	enaBleOrDisaBleAllBreakpoints(enaBle: Boolean): void {
		const changed: Array<IBreakpoint | IFunctionBreakpoint | IDataBreakpoint> = [];

		this.Breakpoints.forEach(Bp => {
			if (Bp.enaBled !== enaBle) {
				changed.push(Bp);
			}
			Bp.enaBled = enaBle;
		});
		this.functionBreakpoints.forEach(fBp => {
			if (fBp.enaBled !== enaBle) {
				changed.push(fBp);
			}
			fBp.enaBled = enaBle;
		});
		this.dataBreakopints.forEach(dBp => {
			if (dBp.enaBled !== enaBle) {
				changed.push(dBp);
			}
			dBp.enaBled = enaBle;
		});
		if (enaBle) {
			this.BreakpointsActivated = true;
		}

		this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
	}

	addFunctionBreakpoint(functionName: string, id?: string): IFunctionBreakpoint {
		const newFunctionBreakpoint = new FunctionBreakpoint(functionName, true, undefined, undefined, undefined, id);
		this.functionBreakpoints.push(newFunctionBreakpoint);
		this._onDidChangeBreakpoints.fire({ added: [newFunctionBreakpoint], sessionOnly: false });

		return newFunctionBreakpoint;
	}

	renameFunctionBreakpoint(id: string, name: string): void {
		const functionBreakpoint = this.functionBreakpoints.find(fBp => fBp.getId() === id);
		if (functionBreakpoint) {
			functionBreakpoint.name = name;
			this._onDidChangeBreakpoints.fire({ changed: [functionBreakpoint], sessionOnly: false });
		}
	}

	removeFunctionBreakpoints(id?: string): void {
		let removed: FunctionBreakpoint[];
		if (id) {
			removed = this.functionBreakpoints.filter(fBp => fBp.getId() === id);
			this.functionBreakpoints = this.functionBreakpoints.filter(fBp => fBp.getId() !== id);
		} else {
			removed = this.functionBreakpoints;
			this.functionBreakpoints = [];
		}
		this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
	}

	addDataBreakpoint(laBel: string, dataId: string, canPersist: Boolean, accessTypes: DeBugProtocol.DataBreakpointAccessType[] | undefined): void {
		const newDataBreakpoint = new DataBreakpoint(laBel, dataId, canPersist, true, undefined, undefined, undefined, accessTypes);
		this.dataBreakopints.push(newDataBreakpoint);
		this._onDidChangeBreakpoints.fire({ added: [newDataBreakpoint], sessionOnly: false });
	}

	removeDataBreakpoints(id?: string): void {
		let removed: DataBreakpoint[];
		if (id) {
			removed = this.dataBreakopints.filter(fBp => fBp.getId() === id);
			this.dataBreakopints = this.dataBreakopints.filter(fBp => fBp.getId() !== id);
		} else {
			removed = this.dataBreakopints;
			this.dataBreakopints = [];
		}
		this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
	}

	getWatchExpressions(): Expression[] {
		return this.watchExpressions;
	}

	addWatchExpression(name?: string): IExpression {
		const we = new Expression(name || '');
		this.watchExpressions.push(we);
		this._onDidChangeWatchExpressions.fire(we);

		return we;
	}

	renameWatchExpression(id: string, newName: string): void {
		const filtered = this.watchExpressions.filter(we => we.getId() === id);
		if (filtered.length === 1) {
			filtered[0].name = newName;
			this._onDidChangeWatchExpressions.fire(filtered[0]);
		}
	}

	removeWatchExpressions(id: string | null = null): void {
		this.watchExpressions = id ? this.watchExpressions.filter(we => we.getId() !== id) : [];
		this._onDidChangeWatchExpressions.fire(undefined);
	}

	moveWatchExpression(id: string, position: numBer): void {
		const we = this.watchExpressions.find(we => we.getId() === id);
		if (we) {
			this.watchExpressions = this.watchExpressions.filter(we => we.getId() !== id);
			this.watchExpressions = this.watchExpressions.slice(0, position).concat(we, this.watchExpressions.slice(position));
			this._onDidChangeWatchExpressions.fire(undefined);
		}
	}

	sourceIsNotAvailaBle(uri: uri): void {
		this.sessions.forEach(s => {
			const source = s.getSourceForUri(uri);
			if (source) {
				source.availaBle = false;
			}
		});
		this._onDidChangeCallStack.fire(undefined);
	}
}
