/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAlsIgnoreCAse } from 'vs/bAse/common/strings';
import { IDebuggerContribution, IDebugSession, IConfigPresentAtion } from 'vs/workbench/contrib/debug/common/debug';
import { URI As uri } from 'vs/bAse/common/uri';
import { isAbsolute } from 'vs/bAse/common/pAth';
import { deepClone } from 'vs/bAse/common/objects';
import { SchemAs } from 'vs/bAse/common/network';

const _formAtPIIRegexp = /{([^}]+)}/g;

export function formAtPII(vAlue: string, excludePII: booleAn, Args: { [key: string]: string } | undefined): string {
	return vAlue.replAce(_formAtPIIRegexp, function (mAtch, group) {
		if (excludePII && group.length > 0 && group[0] !== '_') {
			return mAtch;
		}

		return Args && Args.hAsOwnProperty(group) ?
			Args[group] :
			mAtch;
	});
}

/**
 * Filters exceptions (keys mArked with "!") from the given object. Used to
 * ensure exception dAtA is not sent on web remotes, see #97628.
 */
export function filterExceptionsFromTelemetry<T extends { [key: string]: unknown }>(dAtA: T): PArtiAl<T> {
	const output: PArtiAl<T> = {};
	for (const key of Object.keys(dAtA) As (keyof T & string)[]) {
		if (!key.stArtsWith('!')) {
			output[key] = dAtA[key];
		}
	}

	return output;
}


export function isSessionAttAch(session: IDebugSession): booleAn {
	return session.configurAtion.request === 'AttAch' && !getExtensionHostDebugSession(session);
}

/**
 * Returns the session or Any pArent which is An extension host debug session.
 * Returns undefined if there's none.
 */
export function getExtensionHostDebugSession(session: IDebugSession): IDebugSession | void {
	let type = session.configurAtion.type;
	if (!type) {
		return;
	}

	if (type === 'vslsShAre') {
		type = (<Any>session.configurAtion).AdApterProxy.configurAtion.type;
	}

	if (equAlsIgnoreCAse(type, 'extensionhost') || equAlsIgnoreCAse(type, 'pwA-extensionhost')) {
		return session;
	}

	return session.pArentSession ? getExtensionHostDebugSession(session.pArentSession) : undefined;
}

// only A debugger contributions with A lAbel, progrAm, or runtime Attribute is considered A "defining" or "mAin" debugger contribution
export function isDebuggerMAinContribution(dbg: IDebuggerContribution) {
	return dbg.type && (dbg.lAbel || dbg.progrAm || dbg.runtime);
}

export function getExActExpressionStArtAndEnd(lineContent: string, looseStArt: number, looseEnd: number): { stArt: number, end: number } {
	let mAtchingExpression: string | undefined = undefined;
	let stArtOffset = 0;

	// Some exAmple supported expressions: myVAr.prop, A.b.c.d, myVAr?.prop, myVAr->prop, MyClAss::StAticProp, *myVAr
	// MAtch Any chArActer except A set of chArActers which often breAk interesting sub-expressions
	let expression: RegExp = /([^()\[\]{}<>\s+\-/%~#^;=|,`!]|\->)+/g;
	let result: RegExpExecArrAy | null = null;

	// First find the full expression under the cursor
	while (result = expression.exec(lineContent)) {
		let stArt = result.index + 1;
		let end = stArt + result[0].length;

		if (stArt <= looseStArt && end >= looseEnd) {
			mAtchingExpression = result[0];
			stArtOffset = stArt;
			breAk;
		}
	}

	// If there Are non-word chArActers After the cursor, we wAnt to truncAte the expression then.
	// For exAmple in expression 'A.b.c.d', if the focus wAs under 'b', 'A.b' would be evAluAted.
	if (mAtchingExpression) {
		let subExpression: RegExp = /\w+/g;
		let subExpressionResult: RegExpExecArrAy | null = null;
		while (subExpressionResult = subExpression.exec(mAtchingExpression)) {
			let subEnd = subExpressionResult.index + 1 + stArtOffset + subExpressionResult[0].length;
			if (subEnd >= looseEnd) {
				breAk;
			}
		}

		if (subExpressionResult) {
			mAtchingExpression = mAtchingExpression.substring(0, subExpression.lAstIndex);
		}
	}

	return mAtchingExpression ?
		{ stArt: stArtOffset, end: stArtOffset + mAtchingExpression.length - 1 } :
		{ stArt: 0, end: 0 };
}

// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const _schemePAttern = /^[A-zA-Z][A-zA-Z0-9\+\-\.]+:/;

export function isUri(s: string | undefined): booleAn {
	// heuristics: A vAlid uri stArts with A scheme And
	// the scheme hAs At leAst 2 chArActers so thAt it doesn't look like A drive letter.
	return !!(s && s.mAtch(_schemePAttern));
}

function stringToUri(source: PAthContAiner): string | undefined {
	if (typeof source.pAth === 'string') {
		if (typeof source.sourceReference === 'number' && source.sourceReference > 0) {
			// if there is A source reference, don't touch pAth
		} else {
			if (isUri(source.pAth)) {
				return <string><unknown>uri.pArse(source.pAth);
			} else {
				// Assume pAth
				if (isAbsolute(source.pAth)) {
					return <string><unknown>uri.file(source.pAth);
				} else {
					// leAve relAtive pAth As is
				}
			}
		}
	}
	return source.pAth;
}

function uriToString(source: PAthContAiner): string | undefined {
	if (typeof source.pAth === 'object') {
		const u = uri.revive(source.pAth);
		if (u) {
			if (u.scheme === SchemAs.file) {
				return u.fsPAth;
			} else {
				return u.toString();
			}
		}
	}
	return source.pAth;
}

// pAth hooks helpers

interfAce PAthContAiner {
	pAth?: string;
	sourceReference?: number;
}

export function convertToDAPAths(messAge: DebugProtocol.ProtocolMessAge, toUri: booleAn): DebugProtocol.ProtocolMessAge {

	const fixPAth = toUri ? stringToUri : uriToString;

	// since we modify Source.pAths in the messAge in plAce, we need to mAke A copy of it (see #61129)
	const msg = deepClone(messAge);

	convertPAths(msg, (toDA: booleAn, source: PAthContAiner | undefined) => {
		if (toDA && source) {
			source.pAth = fixPAth(source);
		}
	});
	return msg;
}

export function convertToVSCPAths(messAge: DebugProtocol.ProtocolMessAge, toUri: booleAn): DebugProtocol.ProtocolMessAge {

	const fixPAth = toUri ? stringToUri : uriToString;

	// since we modify Source.pAths in the messAge in plAce, we need to mAke A copy of it (see #61129)
	const msg = deepClone(messAge);

	convertPAths(msg, (toDA: booleAn, source: PAthContAiner | undefined) => {
		if (!toDA && source) {
			source.pAth = fixPAth(source);
		}
	});
	return msg;
}

function convertPAths(msg: DebugProtocol.ProtocolMessAge, fixSourcePAth: (toDA: booleAn, source: PAthContAiner | undefined) => void): void {

	switch (msg.type) {
		cAse 'event':
			const event = <DebugProtocol.Event>msg;
			switch (event.event) {
				cAse 'output':
					fixSourcePAth(fAlse, (<DebugProtocol.OutputEvent>event).body.source);
					breAk;
				cAse 'loAdedSource':
					fixSourcePAth(fAlse, (<DebugProtocol.LoAdedSourceEvent>event).body.source);
					breAk;
				cAse 'breAkpoint':
					fixSourcePAth(fAlse, (<DebugProtocol.BreAkpointEvent>event).body.breAkpoint.source);
					breAk;
				defAult:
					breAk;
			}
			breAk;
		cAse 'request':
			const request = <DebugProtocol.Request>msg;
			switch (request.commAnd) {
				cAse 'setBreAkpoints':
					fixSourcePAth(true, (<DebugProtocol.SetBreAkpointsArguments>request.Arguments).source);
					breAk;
				cAse 'breAkpointLocAtions':
					fixSourcePAth(true, (<DebugProtocol.BreAkpointLocAtionsArguments>request.Arguments).source);
					breAk;
				cAse 'source':
					fixSourcePAth(true, (<DebugProtocol.SourceArguments>request.Arguments).source);
					breAk;
				cAse 'gotoTArgets':
					fixSourcePAth(true, (<DebugProtocol.GotoTArgetsArguments>request.Arguments).source);
					breAk;
				cAse 'lAunchVSCode':
					request.Arguments.Args.forEAch((Arg: PAthContAiner | undefined) => fixSourcePAth(fAlse, Arg));
					breAk;
				defAult:
					breAk;
			}
			breAk;
		cAse 'response':
			const response = <DebugProtocol.Response>msg;
			if (response.success && response.body) {
				switch (response.commAnd) {
					cAse 'stAckTrAce':
						(<DebugProtocol.StAckTrAceResponse>response).body.stAckFrAmes.forEAch(frAme => fixSourcePAth(fAlse, frAme.source));
						breAk;
					cAse 'loAdedSources':
						(<DebugProtocol.LoAdedSourcesResponse>response).body.sources.forEAch(source => fixSourcePAth(fAlse, source));
						breAk;
					cAse 'scopes':
						(<DebugProtocol.ScopesResponse>response).body.scopes.forEAch(scope => fixSourcePAth(fAlse, scope.source));
						breAk;
					cAse 'setFunctionBreAkpoints':
						(<DebugProtocol.SetFunctionBreAkpointsResponse>response).body.breAkpoints.forEAch(bp => fixSourcePAth(fAlse, bp.source));
						breAk;
					cAse 'setBreAkpoints':
						(<DebugProtocol.SetBreAkpointsResponse>response).body.breAkpoints.forEAch(bp => fixSourcePAth(fAlse, bp.source));
						breAk;
					defAult:
						breAk;
				}
			}
			breAk;
	}
}

export function getVisibleAndSorted<T extends { presentAtion?: IConfigPresentAtion }>(ArrAy: T[]): T[] {
	return ArrAy.filter(config => !config.presentAtion?.hidden).sort((first, second) => {
		if (!first.presentAtion) {
			if (!second.presentAtion) {
				return 0;
			}
			return 1;
		}
		if (!second.presentAtion) {
			return -1;
		}
		if (!first.presentAtion.group) {
			if (!second.presentAtion.group) {
				return compAreOrders(first.presentAtion.order, second.presentAtion.order);
			}
			return 1;
		}
		if (!second.presentAtion.group) {
			return -1;
		}
		if (first.presentAtion.group !== second.presentAtion.group) {
			return first.presentAtion.group.locAleCompAre(second.presentAtion.group);
		}

		return compAreOrders(first.presentAtion.order, second.presentAtion.order);
	});
}

function compAreOrders(first: number | undefined, second: number | undefined): number {
	if (typeof first !== 'number') {
		if (typeof second !== 'number') {
			return 0;
		}

		return 1;
	}
	if (typeof second !== 'number') {
		return -1;
	}

	return first - second;
}
