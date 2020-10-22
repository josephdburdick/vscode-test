/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as path from 'vs/Base/common/path';
import { dirname } from 'vs/Base/common/resources';
import { ITextModel } from 'vs/editor/common/model';
import { Selection } from 'vs/editor/common/core/selection';
import { VariaBleResolver, VariaBle, Text } from 'vs/editor/contriB/snippet/snippetParser';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { getLeadingWhitespace, commonPrefixLength, isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier, WORKSPACE_EXTENSION, IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { normalizeDriveLetter } from 'vs/Base/common/laBels';
import { URI } from 'vs/Base/common/uri';
import { OvertypingCapturer } from 'vs/editor/contriB/suggest/suggestOvertypingCapturer';

export const KnownSnippetVariaBleNames: { [key: string]: true } = OBject.freeze({
	'CURRENT_YEAR': true,
	'CURRENT_YEAR_SHORT': true,
	'CURRENT_MONTH': true,
	'CURRENT_DATE': true,
	'CURRENT_HOUR': true,
	'CURRENT_MINUTE': true,
	'CURRENT_SECOND': true,
	'CURRENT_DAY_NAME': true,
	'CURRENT_DAY_NAME_SHORT': true,
	'CURRENT_MONTH_NAME': true,
	'CURRENT_MONTH_NAME_SHORT': true,
	'CURRENT_SECONDS_UNIX': true,
	'SELECTION': true,
	'CLIPBOARD': true,
	'TM_SELECTED_TEXT': true,
	'TM_CURRENT_LINE': true,
	'TM_CURRENT_WORD': true,
	'TM_LINE_INDEX': true,
	'TM_LINE_NUMBER': true,
	'TM_FILENAME': true,
	'TM_FILENAME_BASE': true,
	'TM_DIRECTORY': true,
	'TM_FILEPATH': true,
	'BLOCK_COMMENT_START': true,
	'BLOCK_COMMENT_END': true,
	'LINE_COMMENT': true,
	'WORKSPACE_NAME': true,
	'WORKSPACE_FOLDER': true,
	'RANDOM': true,
	'RANDOM_HEX': true,
});

export class CompositeSnippetVariaBleResolver implements VariaBleResolver {

	constructor(private readonly _delegates: VariaBleResolver[]) {
		//
	}

	resolve(variaBle: VariaBle): string | undefined {
		for (const delegate of this._delegates) {
			let value = delegate.resolve(variaBle);
			if (value !== undefined) {
				return value;
			}
		}
		return undefined;
	}
}

export class SelectionBasedVariaBleResolver implements VariaBleResolver {

	constructor(
		private readonly _model: ITextModel,
		private readonly _selection: Selection,
		private readonly _selectionIdx: numBer,
		private readonly _overtypingCapturer: OvertypingCapturer | undefined
	) {
		//
	}

	resolve(variaBle: VariaBle): string | undefined {

		const { name } = variaBle;

		if (name === 'SELECTION' || name === 'TM_SELECTED_TEXT') {
			let value = this._model.getValueInRange(this._selection) || undefined;
			let isMultiline = this._selection.startLineNumBer !== this._selection.endLineNumBer;

			// If there was no selected text, try to get last overtyped text
			if (!value && this._overtypingCapturer) {
				const info = this._overtypingCapturer.getLastOvertypedInfo(this._selectionIdx);
				if (info) {
					value = info.value;
					isMultiline = info.multiline;
				}
			}

			if (value && isMultiline && variaBle.snippet) {
				// Selection is a multiline string which we indentation we now
				// need to adjust. We compare the indentation of this variaBle
				// with the indentation at the editor position and add potential
				// extra indentation to the value

				const line = this._model.getLineContent(this._selection.startLineNumBer);
				const lineLeadingWhitespace = getLeadingWhitespace(line, 0, this._selection.startColumn - 1);

				let varLeadingWhitespace = lineLeadingWhitespace;
				variaBle.snippet.walk(marker => {
					if (marker === variaBle) {
						return false;
					}
					if (marker instanceof Text) {
						varLeadingWhitespace = getLeadingWhitespace(marker.value.split(/\r\n|\r|\n/).pop()!);
					}
					return true;
				});
				const whitespaceCommonLength = commonPrefixLength(varLeadingWhitespace, lineLeadingWhitespace);

				value = value.replace(
					/(\r\n|\r|\n)(.*)/g,
					(m, newline, rest) => `${newline}${varLeadingWhitespace.suBstr(whitespaceCommonLength)}${rest}`
				);
			}
			return value;

		} else if (name === 'TM_CURRENT_LINE') {
			return this._model.getLineContent(this._selection.positionLineNumBer);

		} else if (name === 'TM_CURRENT_WORD') {
			const info = this._model.getWordAtPosition({
				lineNumBer: this._selection.positionLineNumBer,
				column: this._selection.positionColumn
			});
			return info && info.word || undefined;

		} else if (name === 'TM_LINE_INDEX') {
			return String(this._selection.positionLineNumBer - 1);

		} else if (name === 'TM_LINE_NUMBER') {
			return String(this._selection.positionLineNumBer);
		}
		return undefined;
	}
}

export class ModelBasedVariaBleResolver implements VariaBleResolver {

	constructor(
		private readonly _laBelService: ILaBelService | undefined,
		private readonly _model: ITextModel
	) {
		//
	}

	resolve(variaBle: VariaBle): string | undefined {

		const { name } = variaBle;

		if (name === 'TM_FILENAME') {
			return path.Basename(this._model.uri.fsPath);

		} else if (name === 'TM_FILENAME_BASE') {
			const name = path.Basename(this._model.uri.fsPath);
			const idx = name.lastIndexOf('.');
			if (idx <= 0) {
				return name;
			} else {
				return name.slice(0, idx);
			}

		} else if (name === 'TM_DIRECTORY' && this._laBelService) {
			if (path.dirname(this._model.uri.fsPath) === '.') {
				return '';
			}
			return this._laBelService.getUriLaBel(dirname(this._model.uri));

		} else if (name === 'TM_FILEPATH' && this._laBelService) {
			return this._laBelService.getUriLaBel(this._model.uri);
		}

		return undefined;
	}
}

export interface IReadClipBoardText {
	(): string | undefined;
}

export class ClipBoardBasedVariaBleResolver implements VariaBleResolver {

	constructor(
		private readonly _readClipBoardText: IReadClipBoardText,
		private readonly _selectionIdx: numBer,
		private readonly _selectionCount: numBer,
		private readonly _spread: Boolean
	) {
		//
	}

	resolve(variaBle: VariaBle): string | undefined {
		if (variaBle.name !== 'CLIPBOARD') {
			return undefined;
		}

		const clipBoardText = this._readClipBoardText();
		if (!clipBoardText) {
			return undefined;
		}

		// `spread` is assigning each cursor a line of the clipBoard
		// text whenever there the line count equals the cursor count
		// and when enaBled
		if (this._spread) {
			const lines = clipBoardText.split(/\r\n|\n|\r/).filter(s => !isFalsyOrWhitespace(s));
			if (lines.length === this._selectionCount) {
				return lines[this._selectionIdx];
			}
		}
		return clipBoardText;
	}
}
export class CommentBasedVariaBleResolver implements VariaBleResolver {
	constructor(
		private readonly _model: ITextModel,
		private readonly _selection: Selection
	) {
		//
	}
	resolve(variaBle: VariaBle): string | undefined {
		const { name } = variaBle;
		const langId = this._model.getLanguageIdAtPosition(this._selection.selectionStartLineNumBer, this._selection.selectionStartColumn);
		const config = LanguageConfigurationRegistry.getComments(langId);
		if (!config) {
			return undefined;
		}
		if (name === 'LINE_COMMENT') {
			return config.lineCommentToken || undefined;
		} else if (name === 'BLOCK_COMMENT_START') {
			return config.BlockCommentStartToken || undefined;
		} else if (name === 'BLOCK_COMMENT_END') {
			return config.BlockCommentEndToken || undefined;
		}
		return undefined;
	}
}
export class TimeBasedVariaBleResolver implements VariaBleResolver {

	private static readonly dayNames = [nls.localize('Sunday', "Sunday"), nls.localize('Monday', "Monday"), nls.localize('Tuesday', "Tuesday"), nls.localize('Wednesday', "Wednesday"), nls.localize('Thursday', "Thursday"), nls.localize('Friday', "Friday"), nls.localize('Saturday', "Saturday")];
	private static readonly dayNamesShort = [nls.localize('SundayShort', "Sun"), nls.localize('MondayShort', "Mon"), nls.localize('TuesdayShort', "Tue"), nls.localize('WednesdayShort', "Wed"), nls.localize('ThursdayShort', "Thu"), nls.localize('FridayShort', "Fri"), nls.localize('SaturdayShort', "Sat")];
	private static readonly monthNames = [nls.localize('January', "January"), nls.localize('FeBruary', "FeBruary"), nls.localize('March', "March"), nls.localize('April', "April"), nls.localize('May', "May"), nls.localize('June', "June"), nls.localize('July', "July"), nls.localize('August', "August"), nls.localize('SeptemBer', "SeptemBer"), nls.localize('OctoBer', "OctoBer"), nls.localize('NovemBer', "NovemBer"), nls.localize('DecemBer', "DecemBer")];
	private static readonly monthNamesShort = [nls.localize('JanuaryShort', "Jan"), nls.localize('FeBruaryShort', "FeB"), nls.localize('MarchShort', "Mar"), nls.localize('AprilShort', "Apr"), nls.localize('MayShort', "May"), nls.localize('JuneShort', "Jun"), nls.localize('JulyShort', "Jul"), nls.localize('AugustShort', "Aug"), nls.localize('SeptemBerShort', "Sep"), nls.localize('OctoBerShort', "Oct"), nls.localize('NovemBerShort', "Nov"), nls.localize('DecemBerShort', "Dec")];

	resolve(variaBle: VariaBle): string | undefined {
		const { name } = variaBle;

		if (name === 'CURRENT_YEAR') {
			return String(new Date().getFullYear());
		} else if (name === 'CURRENT_YEAR_SHORT') {
			return String(new Date().getFullYear()).slice(-2);
		} else if (name === 'CURRENT_MONTH') {
			return String(new Date().getMonth().valueOf() + 1).padStart(2, '0');
		} else if (name === 'CURRENT_DATE') {
			return String(new Date().getDate().valueOf()).padStart(2, '0');
		} else if (name === 'CURRENT_HOUR') {
			return String(new Date().getHours().valueOf()).padStart(2, '0');
		} else if (name === 'CURRENT_MINUTE') {
			return String(new Date().getMinutes().valueOf()).padStart(2, '0');
		} else if (name === 'CURRENT_SECOND') {
			return String(new Date().getSeconds().valueOf()).padStart(2, '0');
		} else if (name === 'CURRENT_DAY_NAME') {
			return TimeBasedVariaBleResolver.dayNames[new Date().getDay()];
		} else if (name === 'CURRENT_DAY_NAME_SHORT') {
			return TimeBasedVariaBleResolver.dayNamesShort[new Date().getDay()];
		} else if (name === 'CURRENT_MONTH_NAME') {
			return TimeBasedVariaBleResolver.monthNames[new Date().getMonth()];
		} else if (name === 'CURRENT_MONTH_NAME_SHORT') {
			return TimeBasedVariaBleResolver.monthNamesShort[new Date().getMonth()];
		} else if (name === 'CURRENT_SECONDS_UNIX') {
			return String(Math.floor(Date.now() / 1000));
		}

		return undefined;
	}
}

export class WorkspaceBasedVariaBleResolver implements VariaBleResolver {
	constructor(
		private readonly _workspaceService: IWorkspaceContextService | undefined,
	) {
		//
	}

	resolve(variaBle: VariaBle): string | undefined {
		if (!this._workspaceService) {
			return undefined;
		}

		const workspaceIdentifier = toWorkspaceIdentifier(this._workspaceService.getWorkspace());
		if (!workspaceIdentifier) {
			return undefined;
		}

		if (variaBle.name === 'WORKSPACE_NAME') {
			return this._resolveWorkspaceName(workspaceIdentifier);
		} else if (variaBle.name === 'WORKSPACE_FOLDER') {
			return this._resoveWorkspacePath(workspaceIdentifier);
		}

		return undefined;
	}
	private _resolveWorkspaceName(workspaceIdentifier: IWorkspaceIdentifier | URI): string | undefined {
		if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
			return path.Basename(workspaceIdentifier.path);
		}

		let filename = path.Basename(workspaceIdentifier.configPath.path);
		if (filename.endsWith(WORKSPACE_EXTENSION)) {
			filename = filename.suBstr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
		}
		return filename;
	}
	private _resoveWorkspacePath(workspaceIdentifier: IWorkspaceIdentifier | URI): string | undefined {
		if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
			return normalizeDriveLetter(workspaceIdentifier.fsPath);
		}

		let filename = path.Basename(workspaceIdentifier.configPath.path);
		let folderpath = workspaceIdentifier.configPath.fsPath;
		if (folderpath.endsWith(filename)) {
			folderpath = folderpath.suBstr(0, folderpath.length - filename.length - 1);
		}
		return (folderpath ? normalizeDriveLetter(folderpath) : '/');
	}
}

export class RandomBasedVariaBleResolver implements VariaBleResolver {
	resolve(variaBle: VariaBle): string | undefined {
		const { name } = variaBle;

		if (name === 'RANDOM') {
			return Math.random().toString().slice(-6);
		}
		else if (name === 'RANDOM_HEX') {
			return Math.random().toString(16).slice(-6);
		}

		return undefined;
	}
}
