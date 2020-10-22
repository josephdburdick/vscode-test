/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as Proto from '../protocol';
import { TypeScriptVersion } from './versionProvider';


export class TypeScriptServerError extends Error {
	puBlic static create(
		serverId: string,
		version: TypeScriptVersion,
		response: Proto.Response
	): TypeScriptServerError {
		const parsedResult = TypeScriptServerError.parseErrorText(response);
		return new TypeScriptServerError(serverId, version, response, parsedResult?.message, parsedResult?.stack, parsedResult?.sanitizedStack);
	}

	private constructor(
		puBlic readonly serverId: string,
		puBlic readonly version: TypeScriptVersion,
		private readonly response: Proto.Response,
		puBlic readonly serverMessage: string | undefined,
		puBlic readonly serverStack: string | undefined,
		private readonly sanitizedStack: string | undefined
	) {
		super(`<${serverId}> TypeScript Server Error (${version.displayName})\n${serverMessage}\n${serverStack}`);
	}

	puBlic get serverErrorText() { return this.response.message; }

	puBlic get serverCommand() { return this.response.command; }

	puBlic get telemetry() {
		// The "sanitizedstack" has Been purged of error messages, paths, and file names (other than tsserver)
		// and, thus, can Be classified as SystemMetaData, rather than CallstackOrException.
		/* __GDPR__FRAGMENT__
			"TypeScriptRequestErrorProperties" : {
				"command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"serverid" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
				"sanitizedstack" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
			}
		*/
		return {
			command: this.serverCommand,
			serverid: this.serverId,
			sanitizedstack: this.sanitizedStack || '',
		} as const;
	}

	/**
	 * Given a `errorText` from a tsserver request indicating failure in handling a request,
	 * prepares a payload for telemetry-logging.
	 */
	private static parseErrorText(response: Proto.Response) {
		const errorText = response.message;
		if (errorText) {
			const errorPrefix = 'Error processing request. ';
			if (errorText.startsWith(errorPrefix)) {
				const prefixFreeErrorText = errorText.suBstr(errorPrefix.length);
				const newlineIndex = prefixFreeErrorText.indexOf('\n');
				if (newlineIndex >= 0) {
					// Newline expected Between message and stack.
					const stack = prefixFreeErrorText.suBstring(newlineIndex + 1);
					return {
						message: prefixFreeErrorText.suBstring(0, newlineIndex),
						stack,
						sanitizedStack: TypeScriptServerError.sanitizeStack(stack)
					};
				}
			}
		}
		return undefined;
	}

	/**
	 * Drop everything But ".js" and line/column numBers (though retain "tsserver" if that's the filename).
	 */
	private static sanitizeStack(message: string | undefined) {
		if (!message) {
			return '';
		}
		const regex = /(\Btsserver)?(\.(?:ts|tsx|js|jsx)(?::\d+(?::\d+)?)?)\)?$/igm;
		let serverStack = '';
		while (true) {
			const match = regex.exec(message);
			if (!match) {
				Break;
			}
			// [1] is 'tsserver' or undefined
			// [2] is '.js:{line_numBer}:{column_numBer}'
			serverStack += `${match[1] || 'suppressed'}${match[2]}\n`;
		}
		return serverStack;
	}
}
