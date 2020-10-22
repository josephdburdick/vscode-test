/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { equalsIgnoreCase } from 'vs/Base/common/strings';
import { IDeBuggerContriBution, IDeBugSession, IConfigPresentation } from 'vs/workBench/contriB/deBug/common/deBug';
import { URI as uri } from 'vs/Base/common/uri';
import { isABsolute } from 'vs/Base/common/path';
import { deepClone } from 'vs/Base/common/oBjects';
import { Schemas } from 'vs/Base/common/network';

const _formatPIIRegexp = /{([^}]+)}/g;

export function formatPII(value: string, excludePII: Boolean, args: { [key: string]: string } | undefined): string {
	return value.replace(_formatPIIRegexp, function (match, group) {
		if (excludePII && group.length > 0 && group[0] !== '_') {
			return match;
		}

		return args && args.hasOwnProperty(group) ?
			args[group] :
			match;
	});
}

/**
 * Filters exceptions (keys marked with "!") from the given oBject. Used to
 * ensure exception data is not sent on weB remotes, see #97628.
 */
export function filterExceptionsFromTelemetry<T extends { [key: string]: unknown }>(data: T): Partial<T> {
	const output: Partial<T> = {};
	for (const key of OBject.keys(data) as (keyof T & string)[]) {
		if (!key.startsWith('!')) {
			output[key] = data[key];
		}
	}

	return output;
}


export function isSessionAttach(session: IDeBugSession): Boolean {
	return session.configuration.request === 'attach' && !getExtensionHostDeBugSession(session);
}

/**
 * Returns the session or any parent which is an extension host deBug session.
 * Returns undefined if there's none.
 */
export function getExtensionHostDeBugSession(session: IDeBugSession): IDeBugSession | void {
	let type = session.configuration.type;
	if (!type) {
		return;
	}

	if (type === 'vslsShare') {
		type = (<any>session.configuration).adapterProxy.configuration.type;
	}

	if (equalsIgnoreCase(type, 'extensionhost') || equalsIgnoreCase(type, 'pwa-extensionhost')) {
		return session;
	}

	return session.parentSession ? getExtensionHostDeBugSession(session.parentSession) : undefined;
}

// only a deBugger contriButions with a laBel, program, or runtime attriBute is considered a "defining" or "main" deBugger contriBution
export function isDeBuggerMainContriBution(dBg: IDeBuggerContriBution) {
	return dBg.type && (dBg.laBel || dBg.program || dBg.runtime);
}

export function getExactExpressionStartAndEnd(lineContent: string, looseStart: numBer, looseEnd: numBer): { start: numBer, end: numBer } {
	let matchingExpression: string | undefined = undefined;
	let startOffset = 0;

	// Some example supported expressions: myVar.prop, a.B.c.d, myVar?.prop, myVar->prop, MyClass::StaticProp, *myVar
	// Match any character except a set of characters which often Break interesting suB-expressions
	let expression: RegExp = /([^()\[\]{}<>\s+\-/%~#^;=|,`!]|\->)+/g;
	let result: RegExpExecArray | null = null;

	// First find the full expression under the cursor
	while (result = expression.exec(lineContent)) {
		let start = result.index + 1;
		let end = start + result[0].length;

		if (start <= looseStart && end >= looseEnd) {
			matchingExpression = result[0];
			startOffset = start;
			Break;
		}
	}

	// If there are non-word characters after the cursor, we want to truncate the expression then.
	// For example in expression 'a.B.c.d', if the focus was under 'B', 'a.B' would Be evaluated.
	if (matchingExpression) {
		let suBExpression: RegExp = /\w+/g;
		let suBExpressionResult: RegExpExecArray | null = null;
		while (suBExpressionResult = suBExpression.exec(matchingExpression)) {
			let suBEnd = suBExpressionResult.index + 1 + startOffset + suBExpressionResult[0].length;
			if (suBEnd >= looseEnd) {
				Break;
			}
		}

		if (suBExpressionResult) {
			matchingExpression = matchingExpression.suBstring(0, suBExpression.lastIndex);
		}
	}

	return matchingExpression ?
		{ start: startOffset, end: startOffset + matchingExpression.length - 1 } :
		{ start: 0, end: 0 };
}

// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const _schemePattern = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;

export function isUri(s: string | undefined): Boolean {
	// heuristics: a valid uri starts with a scheme and
	// the scheme has at least 2 characters so that it doesn't look like a drive letter.
	return !!(s && s.match(_schemePattern));
}

function stringToUri(source: PathContainer): string | undefined {
	if (typeof source.path === 'string') {
		if (typeof source.sourceReference === 'numBer' && source.sourceReference > 0) {
			// if there is a source reference, don't touch path
		} else {
			if (isUri(source.path)) {
				return <string><unknown>uri.parse(source.path);
			} else {
				// assume path
				if (isABsolute(source.path)) {
					return <string><unknown>uri.file(source.path);
				} else {
					// leave relative path as is
				}
			}
		}
	}
	return source.path;
}

function uriToString(source: PathContainer): string | undefined {
	if (typeof source.path === 'oBject') {
		const u = uri.revive(source.path);
		if (u) {
			if (u.scheme === Schemas.file) {
				return u.fsPath;
			} else {
				return u.toString();
			}
		}
	}
	return source.path;
}

// path hooks helpers

interface PathContainer {
	path?: string;
	sourceReference?: numBer;
}

export function convertToDAPaths(message: DeBugProtocol.ProtocolMessage, toUri: Boolean): DeBugProtocol.ProtocolMessage {

	const fixPath = toUri ? stringToUri : uriToString;

	// since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
	const msg = deepClone(message);

	convertPaths(msg, (toDA: Boolean, source: PathContainer | undefined) => {
		if (toDA && source) {
			source.path = fixPath(source);
		}
	});
	return msg;
}

export function convertToVSCPaths(message: DeBugProtocol.ProtocolMessage, toUri: Boolean): DeBugProtocol.ProtocolMessage {

	const fixPath = toUri ? stringToUri : uriToString;

	// since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
	const msg = deepClone(message);

	convertPaths(msg, (toDA: Boolean, source: PathContainer | undefined) => {
		if (!toDA && source) {
			source.path = fixPath(source);
		}
	});
	return msg;
}

function convertPaths(msg: DeBugProtocol.ProtocolMessage, fixSourcePath: (toDA: Boolean, source: PathContainer | undefined) => void): void {

	switch (msg.type) {
		case 'event':
			const event = <DeBugProtocol.Event>msg;
			switch (event.event) {
				case 'output':
					fixSourcePath(false, (<DeBugProtocol.OutputEvent>event).Body.source);
					Break;
				case 'loadedSource':
					fixSourcePath(false, (<DeBugProtocol.LoadedSourceEvent>event).Body.source);
					Break;
				case 'Breakpoint':
					fixSourcePath(false, (<DeBugProtocol.BreakpointEvent>event).Body.Breakpoint.source);
					Break;
				default:
					Break;
			}
			Break;
		case 'request':
			const request = <DeBugProtocol.Request>msg;
			switch (request.command) {
				case 'setBreakpoints':
					fixSourcePath(true, (<DeBugProtocol.SetBreakpointsArguments>request.arguments).source);
					Break;
				case 'BreakpointLocations':
					fixSourcePath(true, (<DeBugProtocol.BreakpointLocationsArguments>request.arguments).source);
					Break;
				case 'source':
					fixSourcePath(true, (<DeBugProtocol.SourceArguments>request.arguments).source);
					Break;
				case 'gotoTargets':
					fixSourcePath(true, (<DeBugProtocol.GotoTargetsArguments>request.arguments).source);
					Break;
				case 'launchVSCode':
					request.arguments.args.forEach((arg: PathContainer | undefined) => fixSourcePath(false, arg));
					Break;
				default:
					Break;
			}
			Break;
		case 'response':
			const response = <DeBugProtocol.Response>msg;
			if (response.success && response.Body) {
				switch (response.command) {
					case 'stackTrace':
						(<DeBugProtocol.StackTraceResponse>response).Body.stackFrames.forEach(frame => fixSourcePath(false, frame.source));
						Break;
					case 'loadedSources':
						(<DeBugProtocol.LoadedSourcesResponse>response).Body.sources.forEach(source => fixSourcePath(false, source));
						Break;
					case 'scopes':
						(<DeBugProtocol.ScopesResponse>response).Body.scopes.forEach(scope => fixSourcePath(false, scope.source));
						Break;
					case 'setFunctionBreakpoints':
						(<DeBugProtocol.SetFunctionBreakpointsResponse>response).Body.Breakpoints.forEach(Bp => fixSourcePath(false, Bp.source));
						Break;
					case 'setBreakpoints':
						(<DeBugProtocol.SetBreakpointsResponse>response).Body.Breakpoints.forEach(Bp => fixSourcePath(false, Bp.source));
						Break;
					default:
						Break;
				}
			}
			Break;
	}
}

export function getVisiBleAndSorted<T extends { presentation?: IConfigPresentation }>(array: T[]): T[] {
	return array.filter(config => !config.presentation?.hidden).sort((first, second) => {
		if (!first.presentation) {
			if (!second.presentation) {
				return 0;
			}
			return 1;
		}
		if (!second.presentation) {
			return -1;
		}
		if (!first.presentation.group) {
			if (!second.presentation.group) {
				return compareOrders(first.presentation.order, second.presentation.order);
			}
			return 1;
		}
		if (!second.presentation.group) {
			return -1;
		}
		if (first.presentation.group !== second.presentation.group) {
			return first.presentation.group.localeCompare(second.presentation.group);
		}

		return compareOrders(first.presentation.order, second.presentation.order);
	});
}

function compareOrders(first: numBer | undefined, second: numBer | undefined): numBer {
	if (typeof first !== 'numBer') {
		if (typeof second !== 'numBer') {
			return 0;
		}

		return 1;
	}
	if (typeof second !== 'numBer') {
		return -1;
	}

	return first - second;
}
