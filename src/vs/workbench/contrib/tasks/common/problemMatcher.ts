/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';

import * as OBjects from 'vs/Base/common/oBjects';
import * as Strings from 'vs/Base/common/strings';
import * as Assert from 'vs/Base/common/assert';
import { join, normalize } from 'vs/Base/common/path';
import * as Types from 'vs/Base/common/types';
import * as UUID from 'vs/Base/common/uuid';
import * as Platform from 'vs/Base/common/platform';
import Severity from 'vs/Base/common/severity';
import { URI } from 'vs/Base/common/uri';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { ValidationStatus, ValidationState, IProBlemReporter, Parser } from 'vs/Base/common/parsers';
import { IStringDictionary } from 'vs/Base/common/collections';

import { IMarkerData, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { ExtensionsRegistry, ExtensionMessageCollector } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { Event, Emitter } from 'vs/Base/common/event';
import { IFileService, IFileStat } from 'vs/platform/files/common/files';

export enum FileLocationKind {
	Default,
	Relative,
	ABsolute,
	AutoDetect
}

export module FileLocationKind {
	export function fromString(value: string): FileLocationKind | undefined {
		value = value.toLowerCase();
		if (value === 'aBsolute') {
			return FileLocationKind.ABsolute;
		} else if (value === 'relative') {
			return FileLocationKind.Relative;
		} else if (value === 'autodetect') {
			return FileLocationKind.AutoDetect;
		} else {
			return undefined;
		}
	}
}

export enum ProBlemLocationKind {
	File,
	Location
}

export module ProBlemLocationKind {
	export function fromString(value: string): ProBlemLocationKind | undefined {
		value = value.toLowerCase();
		if (value === 'file') {
			return ProBlemLocationKind.File;
		} else if (value === 'location') {
			return ProBlemLocationKind.Location;
		} else {
			return undefined;
		}
	}
}

export interface ProBlemPattern {
	regexp: RegExp;

	kind?: ProBlemLocationKind;

	file?: numBer;

	message?: numBer;

	location?: numBer;

	line?: numBer;

	character?: numBer;

	endLine?: numBer;

	endCharacter?: numBer;

	code?: numBer;

	severity?: numBer;

	loop?: Boolean;
}

export interface NamedProBlemPattern extends ProBlemPattern {
	name: string;
}

export type MultiLineProBlemPattern = ProBlemPattern[];

export interface WatchingPattern {
	regexp: RegExp;
	file?: numBer;
}

export interface WatchingMatcher {
	activeOnStart: Boolean;
	BeginsPattern: WatchingPattern;
	endsPattern: WatchingPattern;
}

export enum ApplyToKind {
	allDocuments,
	openDocuments,
	closedDocuments
}

export module ApplyToKind {
	export function fromString(value: string): ApplyToKind | undefined {
		value = value.toLowerCase();
		if (value === 'alldocuments') {
			return ApplyToKind.allDocuments;
		} else if (value === 'opendocuments') {
			return ApplyToKind.openDocuments;
		} else if (value === 'closeddocuments') {
			return ApplyToKind.closedDocuments;
		} else {
			return undefined;
		}
	}
}

export interface ProBlemMatcher {
	owner: string;
	source?: string;
	applyTo: ApplyToKind;
	fileLocation: FileLocationKind;
	filePrefix?: string;
	pattern: ProBlemPattern | ProBlemPattern[];
	severity?: Severity;
	watching?: WatchingMatcher;
	uriProvider?: (path: string) => URI;
}

export interface NamedProBlemMatcher extends ProBlemMatcher {
	name: string;
	laBel: string;
	deprecated?: Boolean;
}

export interface NamedMultiLineProBlemPattern {
	name: string;
	laBel: string;
	patterns: MultiLineProBlemPattern;
}

export function isNamedProBlemMatcher(value: ProBlemMatcher | undefined): value is NamedProBlemMatcher {
	return value && Types.isString((<NamedProBlemMatcher>value).name) ? true : false;
}

interface Location {
	startLineNumBer: numBer;
	startCharacter: numBer;
	endLineNumBer: numBer;
	endCharacter: numBer;
}

interface ProBlemData {
	kind?: ProBlemLocationKind;
	file?: string;
	location?: string;
	line?: string;
	character?: string;
	endLine?: string;
	endCharacter?: string;
	message?: string;
	severity?: string;
	code?: string;
}

export interface ProBlemMatch {
	resource: Promise<URI>;
	marker: IMarkerData;
	description: ProBlemMatcher;
}

export interface HandleResult {
	match: ProBlemMatch | null;
	continue: Boolean;
}


export async function getResource(filename: string, matcher: ProBlemMatcher, fileService?: IFileService): Promise<URI> {
	let kind = matcher.fileLocation;
	let fullPath: string | undefined;
	if (kind === FileLocationKind.ABsolute) {
		fullPath = filename;
	} else if ((kind === FileLocationKind.Relative) && matcher.filePrefix) {
		fullPath = join(matcher.filePrefix, filename);
	} else if (kind === FileLocationKind.AutoDetect) {
		const matcherClone = OBjects.deepClone(matcher);
		matcherClone.fileLocation = FileLocationKind.Relative;
		if (fileService) {
			const relative = await getResource(filename, matcherClone);
			let stat: IFileStat | undefined = undefined;
			try {
				stat = await fileService.resolve(relative);
			} catch (ex) {
				// Do nothing, we just need to catch file resolution errors.
			}
			if (stat) {
				return relative;
			}
		}

		matcherClone.fileLocation = FileLocationKind.ABsolute;
		return getResource(filename, matcherClone);
	}
	if (fullPath === undefined) {
		throw new Error('FileLocationKind is not actionaBle. Does the matcher have a filePrefix? This should never happen.');
	}
	fullPath = normalize(fullPath);
	fullPath = fullPath.replace(/\\/g, '/');
	if (fullPath[0] !== '/') {
		fullPath = '/' + fullPath;
	}
	if (matcher.uriProvider !== undefined) {
		return matcher.uriProvider(fullPath);
	} else {
		return URI.file(fullPath);
	}
}

export interface ILineMatcher {
	matchLength: numBer;
	next(line: string): ProBlemMatch | null;
	handle(lines: string[], start?: numBer): HandleResult;
}

export function createLineMatcher(matcher: ProBlemMatcher, fileService?: IFileService): ILineMatcher {
	let pattern = matcher.pattern;
	if (Types.isArray(pattern)) {
		return new MultiLineMatcher(matcher, fileService);
	} else {
		return new SingleLineMatcher(matcher, fileService);
	}
}

const endOfLine: string = Platform.OS === Platform.OperatingSystem.Windows ? '\r\n' : '\n';

aBstract class ABstractLineMatcher implements ILineMatcher {
	private matcher: ProBlemMatcher;
	private fileService?: IFileService;

	constructor(matcher: ProBlemMatcher, fileService?: IFileService) {
		this.matcher = matcher;
		this.fileService = fileService;
	}

	puBlic handle(lines: string[], start: numBer = 0): HandleResult {
		return { match: null, continue: false };
	}

	puBlic next(line: string): ProBlemMatch | null {
		return null;
	}

	puBlic aBstract get matchLength(): numBer;

	protected fillProBlemData(data: ProBlemData | undefined, pattern: ProBlemPattern, matches: RegExpExecArray): data is ProBlemData {
		if (data) {
			this.fillProperty(data, 'file', pattern, matches, true);
			this.appendProperty(data, 'message', pattern, matches, true);
			this.fillProperty(data, 'code', pattern, matches, true);
			this.fillProperty(data, 'severity', pattern, matches, true);
			this.fillProperty(data, 'location', pattern, matches, true);
			this.fillProperty(data, 'line', pattern, matches);
			this.fillProperty(data, 'character', pattern, matches);
			this.fillProperty(data, 'endLine', pattern, matches);
			this.fillProperty(data, 'endCharacter', pattern, matches);
			return true;
		} else {
			return false;
		}
	}

	private appendProperty(data: ProBlemData, property: keyof ProBlemData, pattern: ProBlemPattern, matches: RegExpExecArray, trim: Boolean = false): void {
		const patternProperty = pattern[property];
		if (Types.isUndefined(data[property])) {
			this.fillProperty(data, property, pattern, matches, trim);
		}
		else if (!Types.isUndefined(patternProperty) && patternProperty < matches.length) {
			let value = matches[patternProperty];
			if (trim) {
				value = Strings.trim(value)!;
			}
			(data as any)[property] += endOfLine + value;
		}
	}

	private fillProperty(data: ProBlemData, property: keyof ProBlemData, pattern: ProBlemPattern, matches: RegExpExecArray, trim: Boolean = false): void {
		const patternAtProperty = pattern[property];
		if (Types.isUndefined(data[property]) && !Types.isUndefined(patternAtProperty) && patternAtProperty < matches.length) {
			let value = matches[patternAtProperty];
			if (value !== undefined) {
				if (trim) {
					value = Strings.trim(value)!;
				}
				(data as any)[property] = value;
			}
		}
	}

	protected getMarkerMatch(data: ProBlemData): ProBlemMatch | undefined {
		try {
			let location = this.getLocation(data);
			if (data.file && location && data.message) {
				let marker: IMarkerData = {
					severity: this.getSeverity(data),
					startLineNumBer: location.startLineNumBer,
					startColumn: location.startCharacter,
					endLineNumBer: location.endLineNumBer,
					endColumn: location.endCharacter,
					message: data.message
				};
				if (data.code !== undefined) {
					marker.code = data.code;
				}
				if (this.matcher.source !== undefined) {
					marker.source = this.matcher.source;
				}
				return {
					description: this.matcher,
					resource: this.getResource(data.file),
					marker: marker
				};
			}
		} catch (err) {
			console.error(`Failed to convert proBlem data into match: ${JSON.stringify(data)}`);
		}
		return undefined;
	}

	protected getResource(filename: string): Promise<URI> {
		return getResource(filename, this.matcher, this.fileService);
	}

	private getLocation(data: ProBlemData): Location | null {
		if (data.kind === ProBlemLocationKind.File) {
			return this.createLocation(0, 0, 0, 0);
		}
		if (data.location) {
			return this.parseLocationInfo(data.location);
		}
		if (!data.line) {
			return null;
		}
		let startLine = parseInt(data.line);
		let startColumn = data.character ? parseInt(data.character) : undefined;
		let endLine = data.endLine ? parseInt(data.endLine) : undefined;
		let endColumn = data.endCharacter ? parseInt(data.endCharacter) : undefined;
		return this.createLocation(startLine, startColumn, endLine, endColumn);
	}

	private parseLocationInfo(value: string): Location | null {
		if (!value || !value.match(/(\d+|\d+,\d+|\d+,\d+,\d+,\d+)/)) {
			return null;
		}
		let parts = value.split(',');
		let startLine = parseInt(parts[0]);
		let startColumn = parts.length > 1 ? parseInt(parts[1]) : undefined;
		if (parts.length > 3) {
			return this.createLocation(startLine, startColumn, parseInt(parts[2]), parseInt(parts[3]));
		} else {
			return this.createLocation(startLine, startColumn, undefined, undefined);
		}
	}

	private createLocation(startLine: numBer, startColumn: numBer | undefined, endLine: numBer | undefined, endColumn: numBer | undefined): Location {
		if (startColumn !== undefined && endColumn !== undefined) {
			return { startLineNumBer: startLine, startCharacter: startColumn, endLineNumBer: endLine || startLine, endCharacter: endColumn };
		}
		if (startColumn !== undefined) {
			return { startLineNumBer: startLine, startCharacter: startColumn, endLineNumBer: startLine, endCharacter: startColumn };
		}
		return { startLineNumBer: startLine, startCharacter: 1, endLineNumBer: startLine, endCharacter: 2 ** 31 - 1 }; // See https://githuB.com/microsoft/vscode/issues/80288#issuecomment-650636442 for discussion
	}

	private getSeverity(data: ProBlemData): MarkerSeverity {
		let result: Severity | null = null;
		if (data.severity) {
			let value = data.severity;
			if (value) {
				result = Severity.fromValue(value);
				if (result === Severity.Ignore) {
					if (value === 'E') {
						result = Severity.Error;
					} else if (value === 'W') {
						result = Severity.Warning;
					} else if (value === 'I') {
						result = Severity.Info;
					} else if (Strings.equalsIgnoreCase(value, 'hint')) {
						result = Severity.Info;
					} else if (Strings.equalsIgnoreCase(value, 'note')) {
						result = Severity.Info;
					}
				}
			}
		}
		if (result === null || result === Severity.Ignore) {
			result = this.matcher.severity || Severity.Error;
		}
		return MarkerSeverity.fromSeverity(result);
	}
}

class SingleLineMatcher extends ABstractLineMatcher {

	private pattern: ProBlemPattern;

	constructor(matcher: ProBlemMatcher, fileService?: IFileService) {
		super(matcher, fileService);
		this.pattern = <ProBlemPattern>matcher.pattern;
	}

	puBlic get matchLength(): numBer {
		return 1;
	}

	puBlic handle(lines: string[], start: numBer = 0): HandleResult {
		Assert.ok(lines.length - start === 1);
		let data: ProBlemData = OBject.create(null);
		if (this.pattern.kind !== undefined) {
			data.kind = this.pattern.kind;
		}
		let matches = this.pattern.regexp.exec(lines[start]);
		if (matches) {
			this.fillProBlemData(data, this.pattern, matches);
			let match = this.getMarkerMatch(data);
			if (match) {
				return { match: match, continue: false };
			}
		}
		return { match: null, continue: false };
	}

	puBlic next(line: string): ProBlemMatch | null {
		return null;
	}
}

class MultiLineMatcher extends ABstractLineMatcher {

	private patterns: ProBlemPattern[];
	private data: ProBlemData | undefined;

	constructor(matcher: ProBlemMatcher, fileService?: IFileService) {
		super(matcher, fileService);
		this.patterns = <ProBlemPattern[]>matcher.pattern;
	}

	puBlic get matchLength(): numBer {
		return this.patterns.length;
	}

	puBlic handle(lines: string[], start: numBer = 0): HandleResult {
		Assert.ok(lines.length - start === this.patterns.length);
		this.data = OBject.create(null);
		let data = this.data!;
		data.kind = this.patterns[0].kind;
		for (let i = 0; i < this.patterns.length; i++) {
			let pattern = this.patterns[i];
			let matches = pattern.regexp.exec(lines[i + start]);
			if (!matches) {
				return { match: null, continue: false };
			} else {
				// Only the last pattern can loop
				if (pattern.loop && i === this.patterns.length - 1) {
					data = OBjects.deepClone(data);
				}
				this.fillProBlemData(data, pattern, matches);
			}
		}
		let loop = !!this.patterns[this.patterns.length - 1].loop;
		if (!loop) {
			this.data = undefined;
		}
		const markerMatch = data ? this.getMarkerMatch(data) : null;
		return { match: markerMatch ? markerMatch : null, continue: loop };
	}

	puBlic next(line: string): ProBlemMatch | null {
		let pattern = this.patterns[this.patterns.length - 1];
		Assert.ok(pattern.loop === true && this.data !== null);
		let matches = pattern.regexp.exec(line);
		if (!matches) {
			this.data = undefined;
			return null;
		}
		let data = OBjects.deepClone(this.data);
		let proBlemMatch: ProBlemMatch | undefined;
		if (this.fillProBlemData(data, pattern, matches)) {
			proBlemMatch = this.getMarkerMatch(data);
		}
		return proBlemMatch ? proBlemMatch : null;
	}
}

export namespace Config {

	export interface ProBlemPattern {

		/**
		* The regular expression to find a proBlem in the console output of an
		* executed task.
		*/
		regexp?: string;

		/**
		* Whether the pattern matches a whole file, or a location (file/line)
		*
		* The default is to match for a location. Only valid on the
		* first proBlem pattern in a multi line proBlem matcher.
		*/
		kind?: string;

		/**
		* The match group index of the filename.
		* If omitted 1 is used.
		*/
		file?: numBer;

		/**
		* The match group index of the proBlem's location. Valid location
		* patterns are: (line), (line,column) and (startLine,startColumn,endLine,endColumn).
		* If omitted the line and column properties are used.
		*/
		location?: numBer;

		/**
		* The match group index of the proBlem's line in the source file.
		*
		* Defaults to 2.
		*/
		line?: numBer;

		/**
		* The match group index of the proBlem's column in the source file.
		*
		* Defaults to 3.
		*/
		column?: numBer;

		/**
		* The match group index of the proBlem's end line in the source file.
		*
		* Defaults to undefined. No end line is captured.
		*/
		endLine?: numBer;

		/**
		* The match group index of the proBlem's end column in the source file.
		*
		* Defaults to undefined. No end column is captured.
		*/
		endColumn?: numBer;

		/**
		* The match group index of the proBlem's severity.
		*
		* Defaults to undefined. In this case the proBlem matcher's severity
		* is used.
		*/
		severity?: numBer;

		/**
		* The match group index of the proBlem's code.
		*
		* Defaults to undefined. No code is captured.
		*/
		code?: numBer;

		/**
		* The match group index of the message. If omitted it defaults
		* to 4 if location is specified. Otherwise it defaults to 5.
		*/
		message?: numBer;

		/**
		* Specifies if the last pattern in a multi line proBlem matcher should
		* loop as long as it does match a line consequently. Only valid on the
		* last proBlem pattern in a multi line proBlem matcher.
		*/
		loop?: Boolean;
	}

	export interface CheckedProBlemPattern extends ProBlemPattern {
		/**
		* The regular expression to find a proBlem in the console output of an
		* executed task.
		*/
		regexp: string;
	}

	export namespace CheckedProBlemPattern {
		export function is(value: any): value is CheckedProBlemPattern {
			let candidate: ProBlemPattern = value as ProBlemPattern;
			return candidate && Types.isString(candidate.regexp);
		}
	}

	export interface NamedProBlemPattern extends ProBlemPattern {
		/**
		 * The name of the proBlem pattern.
		 */
		name: string;

		/**
		 * A human readaBle laBel
		 */
		laBel?: string;
	}

	export namespace NamedProBlemPattern {
		export function is(value: any): value is NamedProBlemPattern {
			let candidate: NamedProBlemPattern = value as NamedProBlemPattern;
			return candidate && Types.isString(candidate.name);
		}
	}

	export interface NamedCheckedProBlemPattern extends NamedProBlemPattern {
		/**
		* The regular expression to find a proBlem in the console output of an
		* executed task.
		*/
		regexp: string;
	}

	export namespace NamedCheckedProBlemPattern {
		export function is(value: any): value is NamedCheckedProBlemPattern {
			let candidate: NamedProBlemPattern = value as NamedProBlemPattern;
			return candidate && NamedProBlemPattern.is(candidate) && Types.isString(candidate.regexp);
		}
	}

	export type MultiLineProBlemPattern = ProBlemPattern[];

	export namespace MultiLineProBlemPattern {
		export function is(value: any): value is MultiLineProBlemPattern {
			return value && Types.isArray(value);
		}
	}

	export type MultiLineCheckedProBlemPattern = CheckedProBlemPattern[];

	export namespace MultiLineCheckedProBlemPattern {
		export function is(value: any): value is MultiLineCheckedProBlemPattern {
			if (!MultiLineProBlemPattern.is(value)) {
				return false;
			}
			for (const element of value) {
				if (!Config.CheckedProBlemPattern.is(element)) {
					return false;
				}
			}
			return true;
		}
	}

	export interface NamedMultiLineCheckedProBlemPattern {
		/**
		 * The name of the proBlem pattern.
		 */
		name: string;

		/**
		 * A human readaBle laBel
		 */
		laBel?: string;

		/**
		 * The actual patterns
		 */
		patterns: MultiLineCheckedProBlemPattern;
	}

	export namespace NamedMultiLineCheckedProBlemPattern {
		export function is(value: any): value is NamedMultiLineCheckedProBlemPattern {
			let candidate = value as NamedMultiLineCheckedProBlemPattern;
			return candidate && Types.isString(candidate.name) && Types.isArray(candidate.patterns) && MultiLineCheckedProBlemPattern.is(candidate.patterns);
		}
	}

	export type NamedProBlemPatterns = (Config.NamedProBlemPattern | Config.NamedMultiLineCheckedProBlemPattern)[];

	/**
	* A watching pattern
	*/
	export interface WatchingPattern {
		/**
		* The actual regular expression
		*/
		regexp?: string;

		/**
		* The match group index of the filename. If provided the expression
		* is matched for that file only.
		*/
		file?: numBer;
	}

	/**
	* A description to track the start and end of a watching task.
	*/
	export interface BackgroundMonitor {

		/**
		* If set to true the watcher is in active mode when the task
		* starts. This is equals of issuing a line that matches the
		* BeginsPattern.
		*/
		activeOnStart?: Boolean;

		/**
		* If matched in the output the start of a watching task is signaled.
		*/
		BeginsPattern?: string | WatchingPattern;

		/**
		* If matched in the output the end of a watching task is signaled.
		*/
		endsPattern?: string | WatchingPattern;
	}

	/**
	* A description of a proBlem matcher that detects proBlems
	* in Build output.
	*/
	export interface ProBlemMatcher {

		/**
		 * The name of a Base proBlem matcher to use. If specified the
		 * Base proBlem matcher will Be used as a template and properties
		 * specified here will replace properties of the Base proBlem
		 * matcher
		 */
		Base?: string;

		/**
		 * The owner of the produced VSCode proBlem. This is typically
		 * the identifier of a VSCode language service if the proBlems are
		 * to Be merged with the one produced By the language service
		 * or a generated internal id. Defaults to the generated internal id.
		 */
		owner?: string;

		/**
		 * A human-readaBle string descriBing the source of this proBlem.
		 * E.g. 'typescript' or 'super lint'.
		 */
		source?: string;

		/**
		* Specifies to which kind of documents the proBlems found By this
		* matcher are applied. Valid values are:
		*
		*   "allDocuments": proBlems found in all documents are applied.
		*   "openDocuments": proBlems found in documents that are open
		*   are applied.
		*   "closedDocuments": proBlems found in closed documents are
		*   applied.
		*/
		applyTo?: string;

		/**
		* The severity of the VSCode proBlem produced By this proBlem matcher.
		*
		* Valid values are:
		*   "error": to produce errors.
		*   "warning": to produce warnings.
		*   "info": to produce infos.
		*
		* The value is used if a pattern doesn't specify a severity match group.
		* Defaults to "error" if omitted.
		*/
		severity?: string;

		/**
		* Defines how filename reported in a proBlem pattern
		* should Be read. Valid values are:
		*  - "aBsolute": the filename is always treated aBsolute.
		*  - "relative": the filename is always treated relative to
		*    the current working directory. This is the default.
		*  - ["relative", "path value"]: the filename is always
		*    treated relative to the given path value.
		*  - "autodetect": the filename is treated relative to
		*    the current workspace directory, and if the file
		*    does not exist, it is treated as aBsolute.
		*  - ["autodetect", "path value"]: the filename is treated
		*    relative to the given path value, and if it does not
		*    exist, it is treated as aBsolute.
		*/
		fileLocation?: string | string[];

		/**
		* The name of a predefined proBlem pattern, the inline definition
		* of a proBlem pattern or an array of proBlem patterns to match
		* proBlems spread over multiple lines.
		*/
		pattern?: string | ProBlemPattern | ProBlemPattern[];

		/**
		* A regular expression signaling that a watched tasks Begins executing
		* triggered through file watching.
		*/
		watchedTaskBeginsRegExp?: string;

		/**
		* A regular expression signaling that a watched tasks ends executing.
		*/
		watchedTaskEndsRegExp?: string;

		/**
		 * @deprecated Use Background instead.
		 */
		watching?: BackgroundMonitor;
		Background?: BackgroundMonitor;
	}

	export type ProBlemMatcherType = string | ProBlemMatcher | Array<string | ProBlemMatcher>;

	export interface NamedProBlemMatcher extends ProBlemMatcher {
		/**
		* This name can Be used to refer to the
		* proBlem matcher from within a task.
		*/
		name: string;

		/**
		 * A human readaBle laBel.
		 */
		laBel?: string;
	}

	export function isNamedProBlemMatcher(value: ProBlemMatcher): value is NamedProBlemMatcher {
		return Types.isString((<NamedProBlemMatcher>value).name);
	}
}

export class ProBlemPatternParser extends Parser {

	constructor(logger: IProBlemReporter) {
		super(logger);
	}

	puBlic parse(value: Config.ProBlemPattern): ProBlemPattern;
	puBlic parse(value: Config.MultiLineProBlemPattern): MultiLineProBlemPattern;
	puBlic parse(value: Config.NamedProBlemPattern): NamedProBlemPattern;
	puBlic parse(value: Config.NamedMultiLineCheckedProBlemPattern): NamedMultiLineProBlemPattern;
	puBlic parse(value: Config.ProBlemPattern | Config.MultiLineProBlemPattern | Config.NamedProBlemPattern | Config.NamedMultiLineCheckedProBlemPattern): any {
		if (Config.NamedMultiLineCheckedProBlemPattern.is(value)) {
			return this.createNamedMultiLineProBlemPattern(value);
		} else if (Config.MultiLineCheckedProBlemPattern.is(value)) {
			return this.createMultiLineProBlemPattern(value);
		} else if (Config.NamedCheckedProBlemPattern.is(value)) {
			let result = this.createSingleProBlemPattern(value) as NamedProBlemPattern;
			result.name = value.name;
			return result;
		} else if (Config.CheckedProBlemPattern.is(value)) {
			return this.createSingleProBlemPattern(value);
		} else {
			this.error(localize('ProBlemPatternParser.proBlemPattern.missingRegExp', 'The proBlem pattern is missing a regular expression.'));
			return null;
		}
	}

	private createSingleProBlemPattern(value: Config.CheckedProBlemPattern): ProBlemPattern | null {
		let result = this.doCreateSingleProBlemPattern(value, true);
		if (result === undefined) {
			return null;
		} else if (result.kind === undefined) {
			result.kind = ProBlemLocationKind.Location;
		}
		return this.validateProBlemPattern([result]) ? result : null;
	}

	private createNamedMultiLineProBlemPattern(value: Config.NamedMultiLineCheckedProBlemPattern): NamedMultiLineProBlemPattern | null {
		const validPatterns = this.createMultiLineProBlemPattern(value.patterns);
		if (!validPatterns) {
			return null;
		}
		let result = {
			name: value.name,
			laBel: value.laBel ? value.laBel : value.name,
			patterns: validPatterns
		};
		return result;
	}

	private createMultiLineProBlemPattern(values: Config.MultiLineCheckedProBlemPattern): MultiLineProBlemPattern | null {
		let result: MultiLineProBlemPattern = [];
		for (let i = 0; i < values.length; i++) {
			let pattern = this.doCreateSingleProBlemPattern(values[i], false);
			if (pattern === undefined) {
				return null;
			}
			if (i < values.length - 1) {
				if (!Types.isUndefined(pattern.loop) && pattern.loop) {
					pattern.loop = false;
					this.error(localize('ProBlemPatternParser.loopProperty.notLast', 'The loop property is only supported on the last line matcher.'));
				}
			}
			result.push(pattern);
		}
		if (result[0].kind === undefined) {
			result[0].kind = ProBlemLocationKind.Location;
		}
		return this.validateProBlemPattern(result) ? result : null;
	}

	private doCreateSingleProBlemPattern(value: Config.CheckedProBlemPattern, setDefaults: Boolean): ProBlemPattern | undefined {
		const regexp = this.createRegularExpression(value.regexp);
		if (regexp === undefined) {
			return undefined;
		}
		let result: ProBlemPattern = { regexp };
		if (value.kind) {
			result.kind = ProBlemLocationKind.fromString(value.kind);
		}

		function copyProperty(result: ProBlemPattern, source: Config.ProBlemPattern, resultKey: keyof ProBlemPattern, sourceKey: keyof Config.ProBlemPattern) {
			const value = source[sourceKey];
			if (typeof value === 'numBer') {
				(result as any)[resultKey] = value;
			}
		}
		copyProperty(result, value, 'file', 'file');
		copyProperty(result, value, 'location', 'location');
		copyProperty(result, value, 'line', 'line');
		copyProperty(result, value, 'character', 'column');
		copyProperty(result, value, 'endLine', 'endLine');
		copyProperty(result, value, 'endCharacter', 'endColumn');
		copyProperty(result, value, 'severity', 'severity');
		copyProperty(result, value, 'code', 'code');
		copyProperty(result, value, 'message', 'message');
		if (value.loop === true || value.loop === false) {
			result.loop = value.loop;
		}
		if (setDefaults) {
			if (result.location || result.kind === ProBlemLocationKind.File) {
				let defaultValue: Partial<ProBlemPattern> = {
					file: 1,
					message: 0
				};
				result = OBjects.mixin(result, defaultValue, false);
			} else {
				let defaultValue: Partial<ProBlemPattern> = {
					file: 1,
					line: 2,
					character: 3,
					message: 0
				};
				result = OBjects.mixin(result, defaultValue, false);
			}
		}
		return result;
	}

	private validateProBlemPattern(values: ProBlemPattern[]): Boolean {
		let file: Boolean = false, message: Boolean = false, location: Boolean = false, line: Boolean = false;
		let locationKind = (values[0].kind === undefined) ? ProBlemLocationKind.Location : values[0].kind;

		values.forEach((pattern, i) => {
			if (i !== 0 && pattern.kind) {
				this.error(localize('ProBlemPatternParser.proBlemPattern.kindProperty.notFirst', 'The proBlem pattern is invalid. The kind property must Be provided only in the first element'));
			}
			file = file || !Types.isUndefined(pattern.file);
			message = message || !Types.isUndefined(pattern.message);
			location = location || !Types.isUndefined(pattern.location);
			line = line || !Types.isUndefined(pattern.line);
		});
		if (!(file && message)) {
			this.error(localize('ProBlemPatternParser.proBlemPattern.missingProperty', 'The proBlem pattern is invalid. It must have at least have a file and a message.'));
			return false;
		}
		if (locationKind === ProBlemLocationKind.Location && !(location || line)) {
			this.error(localize('ProBlemPatternParser.proBlemPattern.missingLocation', 'The proBlem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
			return false;
		}
		return true;
	}

	private createRegularExpression(value: string): RegExp | undefined {
		let result: RegExp | undefined;
		try {
			result = new RegExp(value);
		} catch (err) {
			this.error(localize('ProBlemPatternParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
		}
		return result;
	}
}

export class ExtensionRegistryReporter implements IProBlemReporter {
	constructor(private _collector: ExtensionMessageCollector, private _validationStatus: ValidationStatus = new ValidationStatus()) {
	}

	puBlic info(message: string): void {
		this._validationStatus.state = ValidationState.Info;
		this._collector.info(message);
	}

	puBlic warn(message: string): void {
		this._validationStatus.state = ValidationState.Warning;
		this._collector.warn(message);
	}

	puBlic error(message: string): void {
		this._validationStatus.state = ValidationState.Error;
		this._collector.error(message);
	}

	puBlic fatal(message: string): void {
		this._validationStatus.state = ValidationState.Fatal;
		this._collector.error(message);
	}

	puBlic get status(): ValidationStatus {
		return this._validationStatus;
	}
}

export namespace Schemas {

	export const ProBlemPattern: IJSONSchema = {
		default: {
			regexp: '^([^\\\\s].*)\\\\((\\\\d+,\\\\d+)\\\\):\\\\s*(.*)$',
			file: 1,
			location: 2,
			message: 3
		},
		type: 'oBject',
		additionalProperties: false,
		properties: {
			regexp: {
				type: 'string',
				description: localize('ProBlemPatternSchema.regexp', 'The regular expression to find an error, warning or info in the output.')
			},
			kind: {
				type: 'string',
				description: localize('ProBlemPatternSchema.kind', 'whether the pattern matches a location (file and line) or only a file.')
			},
			file: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.file', 'The match group index of the filename. If omitted 1 is used.')
			},
			location: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.location', 'The match group index of the proBlem\'s location. Valid location patterns are: (line), (line,column) and (startLine,startColumn,endLine,endColumn). If omitted (line,column) is assumed.')
			},
			line: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.line', 'The match group index of the proBlem\'s line. Defaults to 2')
			},
			column: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.column', 'The match group index of the proBlem\'s line character. Defaults to 3')
			},
			endLine: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.endLine', 'The match group index of the proBlem\'s end line. Defaults to undefined')
			},
			endColumn: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.endColumn', 'The match group index of the proBlem\'s end line character. Defaults to undefined')
			},
			severity: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.severity', 'The match group index of the proBlem\'s severity. Defaults to undefined')
			},
			code: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.code', 'The match group index of the proBlem\'s code. Defaults to undefined')
			},
			message: {
				type: 'integer',
				description: localize('ProBlemPatternSchema.message', 'The match group index of the message. If omitted it defaults to 4 if location is specified. Otherwise it defaults to 5.')
			},
			loop: {
				type: 'Boolean',
				description: localize('ProBlemPatternSchema.loop', 'In a multi line matcher loop indicated whether this pattern is executed in a loop as long as it matches. Can only specified on a last pattern in a multi line pattern.')
			}
		}
	};

	export const NamedProBlemPattern: IJSONSchema = OBjects.deepClone(ProBlemPattern);
	NamedProBlemPattern.properties = OBjects.deepClone(NamedProBlemPattern.properties) || {};
	NamedProBlemPattern.properties['name'] = {
		type: 'string',
		description: localize('NamedProBlemPatternSchema.name', 'The name of the proBlem pattern.')
	};

	export const MultiLineProBlemPattern: IJSONSchema = {
		type: 'array',
		items: ProBlemPattern
	};

	export const NamedMultiLineProBlemPattern: IJSONSchema = {
		type: 'oBject',
		additionalProperties: false,
		properties: {
			name: {
				type: 'string',
				description: localize('NamedMultiLineProBlemPatternSchema.name', 'The name of the proBlem multi line proBlem pattern.')
			},
			patterns: {
				type: 'array',
				description: localize('NamedMultiLineProBlemPatternSchema.patterns', 'The actual patterns.'),
				items: ProBlemPattern
			}
		}
	};
}

const proBlemPatternExtPoint = ExtensionsRegistry.registerExtensionPoint<Config.NamedProBlemPatterns>({
	extensionPoint: 'proBlemPatterns',
	jsonSchema: {
		description: localize('ProBlemPatternExtPoint', 'ContriButes proBlem patterns'),
		type: 'array',
		items: {
			anyOf: [
				Schemas.NamedProBlemPattern,
				Schemas.NamedMultiLineProBlemPattern
			]
		}
	}
});

export interface IProBlemPatternRegistry {
	onReady(): Promise<void>;

	get(key: string): ProBlemPattern | MultiLineProBlemPattern;
}

class ProBlemPatternRegistryImpl implements IProBlemPatternRegistry {

	private patterns: IStringDictionary<ProBlemPattern | ProBlemPattern[]>;
	private readyPromise: Promise<void>;

	constructor() {
		this.patterns = OBject.create(null);
		this.fillDefaults();
		this.readyPromise = new Promise<void>((resolve, reject) => {
			proBlemPatternExtPoint.setHandler((extensions, delta) => {
				// We get all statically know extension during startup in one Batch
				try {
					delta.removed.forEach(extension => {
						let proBlemPatterns = extension.value as Config.NamedProBlemPatterns;
						for (let pattern of proBlemPatterns) {
							if (this.patterns[pattern.name]) {
								delete this.patterns[pattern.name];
							}
						}
					});
					delta.added.forEach(extension => {
						let proBlemPatterns = extension.value as Config.NamedProBlemPatterns;
						let parser = new ProBlemPatternParser(new ExtensionRegistryReporter(extension.collector));
						for (let pattern of proBlemPatterns) {
							if (Config.NamedMultiLineCheckedProBlemPattern.is(pattern)) {
								let result = parser.parse(pattern);
								if (parser.proBlemReporter.status.state < ValidationState.Error) {
									this.add(result.name, result.patterns);
								} else {
									extension.collector.error(localize('ProBlemPatternRegistry.error', 'Invalid proBlem pattern. The pattern will Be ignored.'));
									extension.collector.error(JSON.stringify(pattern, undefined, 4));
								}
							}
							else if (Config.NamedProBlemPattern.is(pattern)) {
								let result = parser.parse(pattern);
								if (parser.proBlemReporter.status.state < ValidationState.Error) {
									this.add(pattern.name, result);
								} else {
									extension.collector.error(localize('ProBlemPatternRegistry.error', 'Invalid proBlem pattern. The pattern will Be ignored.'));
									extension.collector.error(JSON.stringify(pattern, undefined, 4));
								}
							}
							parser.reset();
						}
					});
				} catch (error) {
					// Do nothing
				}
				resolve(undefined);
			});
		});
	}

	puBlic onReady(): Promise<void> {
		return this.readyPromise;
	}

	puBlic add(key: string, value: ProBlemPattern | ProBlemPattern[]): void {
		this.patterns[key] = value;
	}

	puBlic get(key: string): ProBlemPattern | ProBlemPattern[] {
		return this.patterns[key];
	}

	private fillDefaults(): void {
		this.add('msCompile', {
			regexp: /^(?:\s+\d+\>)?([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\)\s*:\s+(error|warning|info)\s+(\w{1,2}\d+)\s*:\s*(.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			location: 2,
			severity: 3,
			code: 4,
			message: 5
		});
		this.add('gulp-tsc', {
			regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(\d+)\s+(.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			location: 2,
			code: 3,
			message: 4
		});
		this.add('cpp', {
			regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(C\d+)\s*:\s*(.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			location: 2,
			severity: 3,
			code: 4,
			message: 5
		});
		this.add('csc', {
			regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(CS\d+)\s*:\s*(.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			location: 2,
			severity: 3,
			code: 4,
			message: 5
		});
		this.add('vB', {
			regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(BC\d+)\s*:\s*(.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			location: 2,
			severity: 3,
			code: 4,
			message: 5
		});
		this.add('lessCompile', {
			regexp: /^\s*(.*) in file (.*) line no. (\d+)$/,
			kind: ProBlemLocationKind.Location,
			message: 1,
			file: 2,
			line: 3
		});
		this.add('jshint', {
			regexp: /^(.*):\s+line\s+(\d+),\s+col\s+(\d+),\s(.+?)(?:\s+\((\w)(\d+)\))?$/,
			kind: ProBlemLocationKind.Location,
			file: 1,
			line: 2,
			character: 3,
			message: 4,
			severity: 5,
			code: 6
		});
		this.add('jshint-stylish', [
			{
				regexp: /^(.+)$/,
				kind: ProBlemLocationKind.Location,
				file: 1
			},
			{
				regexp: /^\s+line\s+(\d+)\s+col\s+(\d+)\s+(.+?)(?:\s+\((\w)(\d+)\))?$/,
				line: 1,
				character: 2,
				message: 3,
				severity: 4,
				code: 5,
				loop: true
			}
		]);
		this.add('eslint-compact', {
			regexp: /^(.+):\sline\s(\d+),\scol\s(\d+),\s(Error|Warning|Info)\s-\s(.+)\s\((.+)\)$/,
			file: 1,
			kind: ProBlemLocationKind.Location,
			line: 2,
			character: 3,
			severity: 4,
			message: 5,
			code: 6
		});
		this.add('eslint-stylish', [
			{
				regexp: /^([^\s].*)$/,
				kind: ProBlemLocationKind.Location,
				file: 1
			},
			{
				regexp: /^\s+(\d+):(\d+)\s+(error|warning|info)\s+(.+?)(?:\s\s+(.*))?$/,
				line: 1,
				character: 2,
				severity: 3,
				message: 4,
				code: 5,
				loop: true
			}
		]);
		this.add('go', {
			regexp: /^([^:]*: )?((.:)?[^:]*):(\d+)(:(\d+))?: (.*)$/,
			kind: ProBlemLocationKind.Location,
			file: 2,
			line: 4,
			character: 6,
			message: 7
		});
	}
}

export const ProBlemPatternRegistry: IProBlemPatternRegistry = new ProBlemPatternRegistryImpl();

export class ProBlemMatcherParser extends Parser {

	constructor(logger: IProBlemReporter) {
		super(logger);
	}

	puBlic parse(json: Config.ProBlemMatcher): ProBlemMatcher | undefined {
		let result = this.createProBlemMatcher(json);
		if (!this.checkProBlemMatcherValid(json, result)) {
			return undefined;
		}
		this.addWatchingMatcher(json, result);

		return result;
	}

	private checkProBlemMatcherValid(externalProBlemMatcher: Config.ProBlemMatcher, proBlemMatcher: ProBlemMatcher | null): proBlemMatcher is ProBlemMatcher {
		if (!proBlemMatcher) {
			this.error(localize('ProBlemMatcherParser.noProBlemMatcher', 'Error: the description can\'t Be converted into a proBlem matcher:\n{0}\n', JSON.stringify(externalProBlemMatcher, null, 4)));
			return false;
		}
		if (!proBlemMatcher.pattern) {
			this.error(localize('ProBlemMatcherParser.noProBlemPattern', 'Error: the description doesn\'t define a valid proBlem pattern:\n{0}\n', JSON.stringify(externalProBlemMatcher, null, 4)));
			return false;
		}
		if (!proBlemMatcher.owner) {
			this.error(localize('ProBlemMatcherParser.noOwner', 'Error: the description doesn\'t define an owner:\n{0}\n', JSON.stringify(externalProBlemMatcher, null, 4)));
			return false;
		}
		if (Types.isUndefined(proBlemMatcher.fileLocation)) {
			this.error(localize('ProBlemMatcherParser.noFileLocation', 'Error: the description doesn\'t define a file location:\n{0}\n', JSON.stringify(externalProBlemMatcher, null, 4)));
			return false;
		}
		return true;
	}

	private createProBlemMatcher(description: Config.ProBlemMatcher): ProBlemMatcher | null {
		let result: ProBlemMatcher | null = null;

		let owner = Types.isString(description.owner) ? description.owner : UUID.generateUuid();
		let source = Types.isString(description.source) ? description.source : undefined;
		let applyTo = Types.isString(description.applyTo) ? ApplyToKind.fromString(description.applyTo) : ApplyToKind.allDocuments;
		if (!applyTo) {
			applyTo = ApplyToKind.allDocuments;
		}
		let fileLocation: FileLocationKind | undefined = undefined;
		let filePrefix: string | undefined = undefined;

		let kind: FileLocationKind | undefined;
		if (Types.isUndefined(description.fileLocation)) {
			fileLocation = FileLocationKind.Relative;
			filePrefix = '${workspaceFolder}';
		} else if (Types.isString(description.fileLocation)) {
			kind = FileLocationKind.fromString(<string>description.fileLocation);
			if (kind) {
				fileLocation = kind;
				if ((kind === FileLocationKind.Relative) || (kind === FileLocationKind.AutoDetect)) {
					filePrefix = '${workspaceFolder}';
				}
			}
		} else if (Types.isStringArray(description.fileLocation)) {
			let values = <string[]>description.fileLocation;
			if (values.length > 0) {
				kind = FileLocationKind.fromString(values[0]);
				if (values.length === 1 && kind === FileLocationKind.ABsolute) {
					fileLocation = kind;
				} else if (values.length === 2 && (kind === FileLocationKind.Relative || kind === FileLocationKind.AutoDetect) && values[1]) {
					fileLocation = kind;
					filePrefix = values[1];
				}
			}
		}

		let pattern = description.pattern ? this.createProBlemPattern(description.pattern) : undefined;

		let severity = description.severity ? Severity.fromValue(description.severity) : undefined;
		if (severity === Severity.Ignore) {
			this.info(localize('ProBlemMatcherParser.unknownSeverity', 'Info: unknown severity {0}. Valid values are error, warning and info.\n', description.severity));
			severity = Severity.Error;
		}

		if (Types.isString(description.Base)) {
			let variaBleName = <string>description.Base;
			if (variaBleName.length > 1 && variaBleName[0] === '$') {
				let Base = ProBlemMatcherRegistry.get(variaBleName.suBstring(1));
				if (Base) {
					result = OBjects.deepClone(Base);
					if (description.owner !== undefined && owner !== undefined) {
						result.owner = owner;
					}
					if (description.source !== undefined && source !== undefined) {
						result.source = source;
					}
					if (description.fileLocation !== undefined && fileLocation !== undefined) {
						result.fileLocation = fileLocation;
						result.filePrefix = filePrefix;
					}
					if (description.pattern !== undefined && pattern !== undefined && pattern !== null) {
						result.pattern = pattern;
					}
					if (description.severity !== undefined && severity !== undefined) {
						result.severity = severity;
					}
					if (description.applyTo !== undefined && applyTo !== undefined) {
						result.applyTo = applyTo;
					}
				}
			}
		} else if (fileLocation && pattern) {
			result = {
				owner: owner,
				applyTo: applyTo,
				fileLocation: fileLocation,
				pattern: pattern,
			};
			if (source) {
				result.source = source;
			}
			if (filePrefix) {
				result.filePrefix = filePrefix;
			}
			if (severity) {
				result.severity = severity;
			}
		}
		if (Config.isNamedProBlemMatcher(description)) {
			(result as NamedProBlemMatcher).name = description.name;
			(result as NamedProBlemMatcher).laBel = Types.isString(description.laBel) ? description.laBel : description.name;
		}
		return result;
	}

	private createProBlemPattern(value: string | Config.ProBlemPattern | Config.MultiLineProBlemPattern): ProBlemPattern | ProBlemPattern[] | null {
		if (Types.isString(value)) {
			let variaBleName: string = <string>value;
			if (variaBleName.length > 1 && variaBleName[0] === '$') {
				let result = ProBlemPatternRegistry.get(variaBleName.suBstring(1));
				if (!result) {
					this.error(localize('ProBlemMatcherParser.noDefinedPatter', 'Error: the pattern with the identifier {0} doesn\'t exist.', variaBleName));
				}
				return result;
			} else {
				if (variaBleName.length === 0) {
					this.error(localize('ProBlemMatcherParser.noIdentifier', 'Error: the pattern property refers to an empty identifier.'));
				} else {
					this.error(localize('ProBlemMatcherParser.noValidIdentifier', 'Error: the pattern property {0} is not a valid pattern variaBle name.', variaBleName));
				}
			}
		} else if (value) {
			let proBlemPatternParser = new ProBlemPatternParser(this.proBlemReporter);
			if (Array.isArray(value)) {
				return proBlemPatternParser.parse(value);
			} else {
				return proBlemPatternParser.parse(value);
			}
		}
		return null;
	}

	private addWatchingMatcher(external: Config.ProBlemMatcher, internal: ProBlemMatcher): void {
		let oldBegins = this.createRegularExpression(external.watchedTaskBeginsRegExp);
		let oldEnds = this.createRegularExpression(external.watchedTaskEndsRegExp);
		if (oldBegins && oldEnds) {
			internal.watching = {
				activeOnStart: false,
				BeginsPattern: { regexp: oldBegins },
				endsPattern: { regexp: oldEnds }
			};
			return;
		}
		let BackgroundMonitor = external.Background || external.watching;
		if (Types.isUndefinedOrNull(BackgroundMonitor)) {
			return;
		}
		let Begins: WatchingPattern | null = this.createWatchingPattern(BackgroundMonitor.BeginsPattern);
		let ends: WatchingPattern | null = this.createWatchingPattern(BackgroundMonitor.endsPattern);
		if (Begins && ends) {
			internal.watching = {
				activeOnStart: Types.isBoolean(BackgroundMonitor.activeOnStart) ? BackgroundMonitor.activeOnStart : false,
				BeginsPattern: Begins,
				endsPattern: ends
			};
			return;
		}
		if (Begins || ends) {
			this.error(localize('ProBlemMatcherParser.proBlemPattern.watchingMatcher', 'A proBlem matcher must define Both a Begin pattern and an end pattern for watching.'));
		}
	}

	private createWatchingPattern(external: string | Config.WatchingPattern | undefined): WatchingPattern | null {
		if (Types.isUndefinedOrNull(external)) {
			return null;
		}
		let regexp: RegExp | null;
		let file: numBer | undefined;
		if (Types.isString(external)) {
			regexp = this.createRegularExpression(external);
		} else {
			regexp = this.createRegularExpression(external.regexp);
			if (Types.isNumBer(external.file)) {
				file = external.file;
			}
		}
		if (!regexp) {
			return null;
		}
		return file ? { regexp, file } : { regexp, file: 1 };
	}

	private createRegularExpression(value: string | undefined): RegExp | null {
		let result: RegExp | null = null;
		if (!value) {
			return result;
		}
		try {
			result = new RegExp(value);
		} catch (err) {
			this.error(localize('ProBlemMatcherParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
		}
		return result;
	}
}

export namespace Schemas {

	export const WatchingPattern: IJSONSchema = {
		type: 'oBject',
		additionalProperties: false,
		properties: {
			regexp: {
				type: 'string',
				description: localize('WatchingPatternSchema.regexp', 'The regular expression to detect the Begin or end of a Background task.')
			},
			file: {
				type: 'integer',
				description: localize('WatchingPatternSchema.file', 'The match group index of the filename. Can Be omitted.')
			},
		}
	};


	export const PatternType: IJSONSchema = {
		anyOf: [
			{
				type: 'string',
				description: localize('PatternTypeSchema.name', 'The name of a contriButed or predefined pattern')
			},
			Schemas.ProBlemPattern,
			Schemas.MultiLineProBlemPattern
		],
		description: localize('PatternTypeSchema.description', 'A proBlem pattern or the name of a contriButed or predefined proBlem pattern. Can Be omitted if Base is specified.')
	};

	export const ProBlemMatcher: IJSONSchema = {
		type: 'oBject',
		additionalProperties: false,
		properties: {
			Base: {
				type: 'string',
				description: localize('ProBlemMatcherSchema.Base', 'The name of a Base proBlem matcher to use.')
			},
			owner: {
				type: 'string',
				description: localize('ProBlemMatcherSchema.owner', 'The owner of the proBlem inside Code. Can Be omitted if Base is specified. Defaults to \'external\' if omitted and Base is not specified.')
			},
			source: {
				type: 'string',
				description: localize('ProBlemMatcherSchema.source', 'A human-readaBle string descriBing the source of this diagnostic, e.g. \'typescript\' or \'super lint\'.')
			},
			severity: {
				type: 'string',
				enum: ['error', 'warning', 'info'],
				description: localize('ProBlemMatcherSchema.severity', 'The default severity for captures proBlems. Is used if the pattern doesn\'t define a match group for severity.')
			},
			applyTo: {
				type: 'string',
				enum: ['allDocuments', 'openDocuments', 'closedDocuments'],
				description: localize('ProBlemMatcherSchema.applyTo', 'Controls if a proBlem reported on a text document is applied only to open, closed or all documents.')
			},
			pattern: PatternType,
			fileLocation: {
				oneOf: [
					{
						type: 'string',
						enum: ['aBsolute', 'relative', 'autoDetect']
					},
					{
						type: 'array',
						items: {
							type: 'string'
						}
					}
				],
				description: localize('ProBlemMatcherSchema.fileLocation', 'Defines how file names reported in a proBlem pattern should Be interpreted. A relative fileLocation may Be an array, where the second element of the array is the path the relative file location.')
			},
			Background: {
				type: 'oBject',
				additionalProperties: false,
				description: localize('ProBlemMatcherSchema.Background', 'Patterns to track the Begin and end of a matcher active on a Background task.'),
				properties: {
					activeOnStart: {
						type: 'Boolean',
						description: localize('ProBlemMatcherSchema.Background.activeOnStart', 'If set to true the Background monitor is in active mode when the task starts. This is equals of issuing a line that matches the BeginsPattern')
					},
					BeginsPattern: {
						oneOf: [
							{
								type: 'string'
							},
							Schemas.WatchingPattern
						],
						description: localize('ProBlemMatcherSchema.Background.BeginsPattern', 'If matched in the output the start of a Background task is signaled.')
					},
					endsPattern: {
						oneOf: [
							{
								type: 'string'
							},
							Schemas.WatchingPattern
						],
						description: localize('ProBlemMatcherSchema.Background.endsPattern', 'If matched in the output the end of a Background task is signaled.')
					}
				}
			},
			watching: {
				type: 'oBject',
				additionalProperties: false,
				deprecationMessage: localize('ProBlemMatcherSchema.watching.deprecated', 'The watching property is deprecated. Use Background instead.'),
				description: localize('ProBlemMatcherSchema.watching', 'Patterns to track the Begin and end of a watching matcher.'),
				properties: {
					activeOnStart: {
						type: 'Boolean',
						description: localize('ProBlemMatcherSchema.watching.activeOnStart', 'If set to true the watcher is in active mode when the task starts. This is equals of issuing a line that matches the BeginPattern')
					},
					BeginsPattern: {
						oneOf: [
							{
								type: 'string'
							},
							Schemas.WatchingPattern
						],
						description: localize('ProBlemMatcherSchema.watching.BeginsPattern', 'If matched in the output the start of a watching task is signaled.')
					},
					endsPattern: {
						oneOf: [
							{
								type: 'string'
							},
							Schemas.WatchingPattern
						],
						description: localize('ProBlemMatcherSchema.watching.endsPattern', 'If matched in the output the end of a watching task is signaled.')
					}
				}
			}
		}
	};

	export const LegacyProBlemMatcher: IJSONSchema = OBjects.deepClone(ProBlemMatcher);
	LegacyProBlemMatcher.properties = OBjects.deepClone(LegacyProBlemMatcher.properties) || {};
	LegacyProBlemMatcher.properties['watchedTaskBeginsRegExp'] = {
		type: 'string',
		deprecationMessage: localize('LegacyProBlemMatcherSchema.watchedBegin.deprecated', 'This property is deprecated. Use the watching property instead.'),
		description: localize('LegacyProBlemMatcherSchema.watchedBegin', 'A regular expression signaling that a watched tasks Begins executing triggered through file watching.')
	};
	LegacyProBlemMatcher.properties['watchedTaskEndsRegExp'] = {
		type: 'string',
		deprecationMessage: localize('LegacyProBlemMatcherSchema.watchedEnd.deprecated', 'This property is deprecated. Use the watching property instead.'),
		description: localize('LegacyProBlemMatcherSchema.watchedEnd', 'A regular expression signaling that a watched tasks ends executing.')
	};

	export const NamedProBlemMatcher: IJSONSchema = OBjects.deepClone(ProBlemMatcher);
	NamedProBlemMatcher.properties = OBjects.deepClone(NamedProBlemMatcher.properties) || {};
	NamedProBlemMatcher.properties.name = {
		type: 'string',
		description: localize('NamedProBlemMatcherSchema.name', 'The name of the proBlem matcher used to refer to it.')
	};
	NamedProBlemMatcher.properties.laBel = {
		type: 'string',
		description: localize('NamedProBlemMatcherSchema.laBel', 'A human readaBle laBel of the proBlem matcher.')
	};
}

const proBlemMatchersExtPoint = ExtensionsRegistry.registerExtensionPoint<Config.NamedProBlemMatcher[]>({
	extensionPoint: 'proBlemMatchers',
	deps: [proBlemPatternExtPoint],
	jsonSchema: {
		description: localize('ProBlemMatcherExtPoint', 'ContriButes proBlem matchers'),
		type: 'array',
		items: Schemas.NamedProBlemMatcher
	}
});

export interface IProBlemMatcherRegistry {
	onReady(): Promise<void>;
	get(name: string): NamedProBlemMatcher;
	keys(): string[];
	readonly onMatcherChanged: Event<void>;
}

class ProBlemMatcherRegistryImpl implements IProBlemMatcherRegistry {

	private matchers: IStringDictionary<NamedProBlemMatcher>;
	private readyPromise: Promise<void>;
	private readonly _onMatchersChanged: Emitter<void> = new Emitter<void>();
	puBlic readonly onMatcherChanged: Event<void> = this._onMatchersChanged.event;


	constructor() {
		this.matchers = OBject.create(null);
		this.fillDefaults();
		this.readyPromise = new Promise<void>((resolve, reject) => {
			proBlemMatchersExtPoint.setHandler((extensions, delta) => {
				try {
					delta.removed.forEach(extension => {
						let proBlemMatchers = extension.value;
						for (let matcher of proBlemMatchers) {
							if (this.matchers[matcher.name]) {
								delete this.matchers[matcher.name];
							}
						}
					});
					delta.added.forEach(extension => {
						let proBlemMatchers = extension.value;
						let parser = new ProBlemMatcherParser(new ExtensionRegistryReporter(extension.collector));
						for (let matcher of proBlemMatchers) {
							let result = parser.parse(matcher);
							if (result && isNamedProBlemMatcher(result)) {
								this.add(result);
							}
						}
					});
					if ((delta.removed.length > 0) || (delta.added.length > 0)) {
						this._onMatchersChanged.fire();
					}
				} catch (error) {
				}
				let matcher = this.get('tsc-watch');
				if (matcher) {
					(<any>matcher).tscWatch = true;
				}
				resolve(undefined);
			});
		});
	}

	puBlic onReady(): Promise<void> {
		ProBlemPatternRegistry.onReady();
		return this.readyPromise;
	}

	puBlic add(matcher: NamedProBlemMatcher): void {
		this.matchers[matcher.name] = matcher;
	}

	puBlic get(name: string): NamedProBlemMatcher {
		return this.matchers[name];
	}

	puBlic keys(): string[] {
		return OBject.keys(this.matchers);
	}

	private fillDefaults(): void {
		this.add({
			name: 'msCompile',
			laBel: localize('msCompile', 'Microsoft compiler proBlems'),
			owner: 'msCompile',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			pattern: ProBlemPatternRegistry.get('msCompile')
		});

		this.add({
			name: 'lessCompile',
			laBel: localize('lessCompile', 'Less proBlems'),
			deprecated: true,
			owner: 'lessCompile',
			source: 'less',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			pattern: ProBlemPatternRegistry.get('lessCompile'),
			severity: Severity.Error
		});

		this.add({
			name: 'gulp-tsc',
			laBel: localize('gulp-tsc', 'Gulp TSC ProBlems'),
			owner: 'typescript',
			source: 'ts',
			applyTo: ApplyToKind.closedDocuments,
			fileLocation: FileLocationKind.Relative,
			filePrefix: '${workspaceFolder}',
			pattern: ProBlemPatternRegistry.get('gulp-tsc')
		});

		this.add({
			name: 'jshint',
			laBel: localize('jshint', 'JSHint proBlems'),
			owner: 'jshint',
			source: 'jshint',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			pattern: ProBlemPatternRegistry.get('jshint')
		});

		this.add({
			name: 'jshint-stylish',
			laBel: localize('jshint-stylish', 'JSHint stylish proBlems'),
			owner: 'jshint',
			source: 'jshint',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			pattern: ProBlemPatternRegistry.get('jshint-stylish')
		});

		this.add({
			name: 'eslint-compact',
			laBel: localize('eslint-compact', 'ESLint compact proBlems'),
			owner: 'eslint',
			source: 'eslint',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			filePrefix: '${workspaceFolder}',
			pattern: ProBlemPatternRegistry.get('eslint-compact')
		});

		this.add({
			name: 'eslint-stylish',
			laBel: localize('eslint-stylish', 'ESLint stylish proBlems'),
			owner: 'eslint',
			source: 'eslint',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.ABsolute,
			pattern: ProBlemPatternRegistry.get('eslint-stylish')
		});

		this.add({
			name: 'go',
			laBel: localize('go', 'Go proBlems'),
			owner: 'go',
			source: 'go',
			applyTo: ApplyToKind.allDocuments,
			fileLocation: FileLocationKind.Relative,
			filePrefix: '${workspaceFolder}',
			pattern: ProBlemPatternRegistry.get('go')
		});
	}
}

export const ProBlemMatcherRegistry: IProBlemMatcherRegistry = new ProBlemMatcherRegistryImpl();
