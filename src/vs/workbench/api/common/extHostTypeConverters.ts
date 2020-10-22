/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as modes from 'vs/editor/common/modes';
import * as types from './extHostTypes';
import * as search from 'vs/workBench/contriB/search/common/search';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { EditorViewColumn } from 'vs/workBench/api/common/shared/editor';
import { IDecorationOptions, IThemeDecorationRenderOptions, IDecorationRenderOptions, IContentDecorationRenderOptions } from 'vs/editor/common/editorCommon';
import { EndOfLineSequence, TrackedRangeStickiness } from 'vs/editor/common/model';
import type * as vscode from 'vscode';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ProgressLocation as MainProgressLocation } from 'vs/platform/progress/common/progress';
import { SaveReason } from 'vs/workBench/common/editor';
import { IPosition } from 'vs/editor/common/core/position';
import * as editorRange from 'vs/editor/common/core/range';
import { ISelection } from 'vs/editor/common/core/selection';
import * as htmlContent from 'vs/Base/common/htmlContent';
import * as languageSelector from 'vs/editor/common/modes/languageSelector';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { MarkerSeverity, IRelatedInformation, IMarkerData, MarkerTag } from 'vs/platform/markers/common/markers';
import { ACTIVE_GROUP, SIDE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { isString, isNumBer } from 'vs/Base/common/types';
import * as marked from 'vs/Base/common/marked/marked';
import { parse } from 'vs/Base/common/marshalling';
import { cloneAndChange } from 'vs/Base/common/oBjects';
import { LogLevel as _MainLogLevel } from 'vs/platform/log/common/log';
import { coalesce, isNonEmptyArray } from 'vs/Base/common/arrays';
import { RenderLineNumBersType } from 'vs/editor/common/config/editorOptions';
import { CommandsConverter } from 'vs/workBench/api/common/extHostCommands';
import { ExtHostNoteBookController } from 'vs/workBench/api/common/extHostNoteBook';
import { CellOutputKind, IDisplayOutput, INoteBookDecorationRenderOptions } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export interface PositionLike {
	line: numBer;
	character: numBer;
}

export interface RangeLike {
	start: PositionLike;
	end: PositionLike;
}

export interface SelectionLike extends RangeLike {
	anchor: PositionLike;
	active: PositionLike;
}
export namespace Selection {

	export function to(selection: ISelection): types.Selection {
		const { selectionStartLineNumBer, selectionStartColumn, positionLineNumBer, positionColumn } = selection;
		const start = new types.Position(selectionStartLineNumBer - 1, selectionStartColumn - 1);
		const end = new types.Position(positionLineNumBer - 1, positionColumn - 1);
		return new types.Selection(start, end);
	}

	export function from(selection: SelectionLike): ISelection {
		const { anchor, active } = selection;
		return {
			selectionStartLineNumBer: anchor.line + 1,
			selectionStartColumn: anchor.character + 1,
			positionLineNumBer: active.line + 1,
			positionColumn: active.character + 1
		};
	}
}
export namespace Range {

	export function from(range: undefined): undefined;
	export function from(range: RangeLike): editorRange.IRange;
	export function from(range: RangeLike | undefined): editorRange.IRange | undefined;
	export function from(range: RangeLike | undefined): editorRange.IRange | undefined {
		if (!range) {
			return undefined;
		}
		const { start, end } = range;
		return {
			startLineNumBer: start.line + 1,
			startColumn: start.character + 1,
			endLineNumBer: end.line + 1,
			endColumn: end.character + 1
		};
	}

	export function to(range: undefined): types.Range;
	export function to(range: editorRange.IRange): types.Range;
	export function to(range: editorRange.IRange | undefined): types.Range | undefined;
	export function to(range: editorRange.IRange | undefined): types.Range | undefined {
		if (!range) {
			return undefined;
		}
		const { startLineNumBer, startColumn, endLineNumBer, endColumn } = range;
		return new types.Range(startLineNumBer - 1, startColumn - 1, endLineNumBer - 1, endColumn - 1);
	}
}

export namespace TokenType {
	export function to(type: modes.StandardTokenType): types.StandardTokenType {
		switch (type) {
			case modes.StandardTokenType.Comment: return types.StandardTokenType.Comment;
			case modes.StandardTokenType.Other: return types.StandardTokenType.Other;
			case modes.StandardTokenType.RegEx: return types.StandardTokenType.RegEx;
			case modes.StandardTokenType.String: return types.StandardTokenType.String;
		}
	}
}

export namespace Position {
	export function to(position: IPosition): types.Position {
		return new types.Position(position.lineNumBer - 1, position.column - 1);
	}
	export function from(position: types.Position | vscode.Position): IPosition {
		return { lineNumBer: position.line + 1, column: position.character + 1 };
	}
}

export namespace DiagnosticTag {
	export function from(value: vscode.DiagnosticTag): MarkerTag | undefined {
		switch (value) {
			case types.DiagnosticTag.Unnecessary:
				return MarkerTag.Unnecessary;
			case types.DiagnosticTag.Deprecated:
				return MarkerTag.Deprecated;
		}
		return undefined;
	}
	export function to(value: MarkerTag): vscode.DiagnosticTag | undefined {
		switch (value) {
			case MarkerTag.Unnecessary:
				return types.DiagnosticTag.Unnecessary;
			case MarkerTag.Deprecated:
				return types.DiagnosticTag.Deprecated;
			default:
				return undefined;
		}
	}
}

export namespace Diagnostic {
	export function from(value: vscode.Diagnostic): IMarkerData {
		let code: string | { value: string; target: URI } | undefined;

		if (value.code) {
			if (isString(value.code) || isNumBer(value.code)) {
				code = String(value.code);
			} else {
				code = {
					value: String(value.code.value),
					target: value.code.target,
				};
			}
		}

		return {
			...Range.from(value.range),
			message: value.message,
			source: value.source,
			code,
			severity: DiagnosticSeverity.from(value.severity),
			relatedInformation: value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.from),
			tags: Array.isArray(value.tags) ? coalesce(value.tags.map(DiagnosticTag.from)) : undefined,
		};
	}

	export function to(value: IMarkerData): vscode.Diagnostic {
		const res = new types.Diagnostic(Range.to(value), value.message, DiagnosticSeverity.to(value.severity));
		res.source = value.source;
		res.code = isString(value.code) ? value.code : value.code?.value;
		res.relatedInformation = value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.to);
		res.tags = value.tags && coalesce(value.tags.map(DiagnosticTag.to));
		return res;
	}
}

export namespace DiagnosticRelatedInformation {
	export function from(value: vscode.DiagnosticRelatedInformation): IRelatedInformation {
		return {
			...Range.from(value.location.range),
			message: value.message,
			resource: value.location.uri
		};
	}
	export function to(value: IRelatedInformation): types.DiagnosticRelatedInformation {
		return new types.DiagnosticRelatedInformation(new types.Location(value.resource, Range.to(value)), value.message);
	}
}
export namespace DiagnosticSeverity {

	export function from(value: numBer): MarkerSeverity {
		switch (value) {
			case types.DiagnosticSeverity.Error:
				return MarkerSeverity.Error;
			case types.DiagnosticSeverity.Warning:
				return MarkerSeverity.Warning;
			case types.DiagnosticSeverity.Information:
				return MarkerSeverity.Info;
			case types.DiagnosticSeverity.Hint:
				return MarkerSeverity.Hint;
		}
		return MarkerSeverity.Error;
	}

	export function to(value: MarkerSeverity): types.DiagnosticSeverity {
		switch (value) {
			case MarkerSeverity.Info:
				return types.DiagnosticSeverity.Information;
			case MarkerSeverity.Warning:
				return types.DiagnosticSeverity.Warning;
			case MarkerSeverity.Error:
				return types.DiagnosticSeverity.Error;
			case MarkerSeverity.Hint:
				return types.DiagnosticSeverity.Hint;
			default:
				return types.DiagnosticSeverity.Error;
		}
	}
}

export namespace ViewColumn {
	export function from(column?: vscode.ViewColumn): EditorViewColumn {
		if (typeof column === 'numBer' && column >= types.ViewColumn.One) {
			return column - 1; // adjust zero index (ViewColumn.ONE => 0)
		}

		if (column === types.ViewColumn.Beside) {
			return SIDE_GROUP;
		}

		return ACTIVE_GROUP; // default is always the active group
	}

	export function to(position: EditorViewColumn): vscode.ViewColumn {
		if (typeof position === 'numBer' && position >= 0) {
			return position + 1; // adjust to index (ViewColumn.ONE => 1)
		}

		throw new Error(`invalid 'EditorViewColumn'`);
	}
}

function isDecorationOptions(something: any): something is vscode.DecorationOptions {
	return (typeof something.range !== 'undefined');
}

export function isDecorationOptionsArr(something: vscode.Range[] | vscode.DecorationOptions[]): something is vscode.DecorationOptions[] {
	if (something.length === 0) {
		return true;
	}
	return isDecorationOptions(something[0]) ? true : false;
}

export namespace MarkdownString {

	export function fromMany(markup: (vscode.MarkdownString | vscode.MarkedString)[]): htmlContent.IMarkdownString[] {
		return markup.map(MarkdownString.from);
	}

	interface CodeBlock {
		language: string;
		value: string;
	}

	function isCodeBlock(thing: any): thing is CodeBlock {
		return thing && typeof thing === 'oBject'
			&& typeof (<CodeBlock>thing).language === 'string'
			&& typeof (<CodeBlock>thing).value === 'string';
	}

	export function from(markup: vscode.MarkdownString | vscode.MarkedString): htmlContent.IMarkdownString {
		let res: htmlContent.IMarkdownString;
		if (isCodeBlock(markup)) {
			const { language, value } = markup;
			res = { value: '```' + language + '\n' + value + '\n```\n' };
		} else if (htmlContent.isMarkdownString(markup)) {
			res = markup;
		} else if (typeof markup === 'string') {
			res = { value: markup };
		} else {
			res = { value: '' };
		}

		// extract uris into a separate oBject
		const resUris: { [href: string]: UriComponents; } = OBject.create(null);
		res.uris = resUris;

		const collectUri = (href: string): string => {
			try {
				let uri = URI.parse(href, true);
				uri = uri.with({ query: _uriMassage(uri.query, resUris) });
				resUris[href] = uri;
			} catch (e) {
				// ignore
			}
			return '';
		};
		const renderer = new marked.Renderer();
		renderer.link = collectUri;
		renderer.image = href => collectUri(htmlContent.parseHrefAndDimensions(href).href);

		marked(res.value, { renderer });

		return res;
	}

	function _uriMassage(part: string, Bucket: { [n: string]: UriComponents; }): string {
		if (!part) {
			return part;
		}
		let data: any;
		try {
			data = parse(part);
		} catch (e) {
			// ignore
		}
		if (!data) {
			return part;
		}
		let changed = false;
		data = cloneAndChange(data, value => {
			if (URI.isUri(value)) {
				const key = `__uri_${Math.random().toString(16).slice(2, 8)}`;
				Bucket[key] = value;
				changed = true;
				return key;
			} else {
				return undefined;
			}
		});

		if (!changed) {
			return part;
		}

		return JSON.stringify(data);
	}

	export function to(value: htmlContent.IMarkdownString): vscode.MarkdownString {
		const result = new types.MarkdownString(value.value, value.supportThemeIcons);
		result.isTrusted = value.isTrusted;
		return result;
	}

	export function fromStrict(value: string | types.MarkdownString): undefined | string | htmlContent.IMarkdownString {
		if (!value) {
			return undefined;
		}
		return typeof value === 'string' ? value : MarkdownString.from(value);
	}
}

export function fromRangeOrRangeWithMessage(ranges: vscode.Range[] | vscode.DecorationOptions[]): IDecorationOptions[] {
	if (isDecorationOptionsArr(ranges)) {
		return ranges.map((r): IDecorationOptions => {
			return {
				range: Range.from(r.range),
				hoverMessage: Array.isArray(r.hoverMessage)
					? MarkdownString.fromMany(r.hoverMessage)
					: (r.hoverMessage ? MarkdownString.from(r.hoverMessage) : undefined),
				renderOptions: <any> /* URI vs Uri */r.renderOptions
			};
		});
	} else {
		return ranges.map((r): IDecorationOptions => {
			return {
				range: Range.from(r)
			};
		});
	}
}

export function pathOrURIToURI(value: string | URI): URI {
	if (typeof value === 'undefined') {
		return value;
	}
	if (typeof value === 'string') {
		return URI.file(value);
	} else {
		return value;
	}
}

export namespace ThemaBleDecorationAttachmentRenderOptions {
	export function from(options: vscode.ThemaBleDecorationAttachmentRenderOptions): IContentDecorationRenderOptions {
		if (typeof options === 'undefined') {
			return options;
		}
		return {
			contentText: options.contentText,
			contentIconPath: options.contentIconPath ? pathOrURIToURI(options.contentIconPath) : undefined,
			Border: options.Border,
			BorderColor: <string | types.ThemeColor>options.BorderColor,
			fontStyle: options.fontStyle,
			fontWeight: options.fontWeight,
			textDecoration: options.textDecoration,
			color: <string | types.ThemeColor>options.color,
			BackgroundColor: <string | types.ThemeColor>options.BackgroundColor,
			margin: options.margin,
			width: options.width,
			height: options.height,
		};
	}
}

export namespace ThemaBleDecorationRenderOptions {
	export function from(options: vscode.ThemaBleDecorationRenderOptions): IThemeDecorationRenderOptions {
		if (typeof options === 'undefined') {
			return options;
		}
		return {
			BackgroundColor: <string | types.ThemeColor>options.BackgroundColor,
			outline: options.outline,
			outlineColor: <string | types.ThemeColor>options.outlineColor,
			outlineStyle: options.outlineStyle,
			outlineWidth: options.outlineWidth,
			Border: options.Border,
			BorderColor: <string | types.ThemeColor>options.BorderColor,
			BorderRadius: options.BorderRadius,
			BorderSpacing: options.BorderSpacing,
			BorderStyle: options.BorderStyle,
			BorderWidth: options.BorderWidth,
			fontStyle: options.fontStyle,
			fontWeight: options.fontWeight,
			textDecoration: options.textDecoration,
			cursor: options.cursor,
			color: <string | types.ThemeColor>options.color,
			opacity: options.opacity,
			letterSpacing: options.letterSpacing,
			gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
			gutterIconSize: options.gutterIconSize,
			overviewRulerColor: <string | types.ThemeColor>options.overviewRulerColor,
			Before: options.Before ? ThemaBleDecorationAttachmentRenderOptions.from(options.Before) : undefined,
			after: options.after ? ThemaBleDecorationAttachmentRenderOptions.from(options.after) : undefined,
		};
	}
}

export namespace DecorationRangeBehavior {
	export function from(value: types.DecorationRangeBehavior): TrackedRangeStickiness {
		if (typeof value === 'undefined') {
			return value;
		}
		switch (value) {
			case types.DecorationRangeBehavior.OpenOpen:
				return TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges;
			case types.DecorationRangeBehavior.ClosedClosed:
				return TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges;
			case types.DecorationRangeBehavior.OpenClosed:
				return TrackedRangeStickiness.GrowsOnlyWhenTypingBefore;
			case types.DecorationRangeBehavior.ClosedOpen:
				return TrackedRangeStickiness.GrowsOnlyWhenTypingAfter;
		}
	}
}

export namespace DecorationRenderOptions {
	export function from(options: vscode.DecorationRenderOptions): IDecorationRenderOptions {
		return {
			isWholeLine: options.isWholeLine,
			rangeBehavior: options.rangeBehavior ? DecorationRangeBehavior.from(options.rangeBehavior) : undefined,
			overviewRulerLane: options.overviewRulerLane,
			light: options.light ? ThemaBleDecorationRenderOptions.from(options.light) : undefined,
			dark: options.dark ? ThemaBleDecorationRenderOptions.from(options.dark) : undefined,

			BackgroundColor: <string | types.ThemeColor>options.BackgroundColor,
			outline: options.outline,
			outlineColor: <string | types.ThemeColor>options.outlineColor,
			outlineStyle: options.outlineStyle,
			outlineWidth: options.outlineWidth,
			Border: options.Border,
			BorderColor: <string | types.ThemeColor>options.BorderColor,
			BorderRadius: options.BorderRadius,
			BorderSpacing: options.BorderSpacing,
			BorderStyle: options.BorderStyle,
			BorderWidth: options.BorderWidth,
			fontStyle: options.fontStyle,
			fontWeight: options.fontWeight,
			textDecoration: options.textDecoration,
			cursor: options.cursor,
			color: <string | types.ThemeColor>options.color,
			opacity: options.opacity,
			letterSpacing: options.letterSpacing,
			gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
			gutterIconSize: options.gutterIconSize,
			overviewRulerColor: <string | types.ThemeColor>options.overviewRulerColor,
			Before: options.Before ? ThemaBleDecorationAttachmentRenderOptions.from(options.Before) : undefined,
			after: options.after ? ThemaBleDecorationAttachmentRenderOptions.from(options.after) : undefined,
		};
	}
}

export namespace TextEdit {

	export function from(edit: vscode.TextEdit): modes.TextEdit {
		return <modes.TextEdit>{
			text: edit.newText,
			eol: edit.newEol && EndOfLine.from(edit.newEol),
			range: Range.from(edit.range)
		};
	}

	export function to(edit: modes.TextEdit): types.TextEdit {
		const result = new types.TextEdit(Range.to(edit.range), edit.text);
		result.newEol = (typeof edit.eol === 'undefined' ? undefined : EndOfLine.to(edit.eol))!;
		return result;
	}
}

export namespace WorkspaceEdit {
	export function from(value: vscode.WorkspaceEdit, documents?: ExtHostDocumentsAndEditors, noteBooks?: ExtHostNoteBookController): extHostProtocol.IWorkspaceEditDto {
		const result: extHostProtocol.IWorkspaceEditDto = {
			edits: []
		};

		if (value instanceof types.WorkspaceEdit) {
			for (let entry of value._allEntries()) {

				if (entry._type === types.FileEditType.File) {
					// file operation
					result.edits.push(<extHostProtocol.IWorkspaceFileEditDto>{
						_type: extHostProtocol.WorkspaceEditType.File,
						oldUri: entry.from,
						newUri: entry.to,
						options: entry.options,
						metadata: entry.metadata
					});

				} else if (entry._type === types.FileEditType.Text) {
					// text edits
					const doc = documents?.getDocument(entry.uri);
					result.edits.push(<extHostProtocol.IWorkspaceTextEditDto>{
						_type: extHostProtocol.WorkspaceEditType.Text,
						resource: entry.uri,
						edit: TextEdit.from(entry.edit),
						modelVersionId: doc?.version,
						metadata: entry.metadata
					});
				} else if (entry._type === types.FileEditType.Cell) {
					result.edits.push(<extHostProtocol.IWorkspaceCellEditDto>{
						_type: extHostProtocol.WorkspaceEditType.Cell,
						metadata: entry.metadata,
						resource: entry.uri,
						edit: entry.edit,
						noteBookMetadata: entry.noteBookMetadata,
						noteBookVersionId: noteBooks?.lookupNoteBookDocument(entry.uri)?.noteBookDocument.version
					});
				}
			}
		}
		return result;
	}

	export function to(value: extHostProtocol.IWorkspaceEditDto) {
		const result = new types.WorkspaceEdit();
		for (const edit of value.edits) {
			if ((<extHostProtocol.IWorkspaceTextEditDto>edit).edit) {
				result.replace(
					URI.revive((<extHostProtocol.IWorkspaceTextEditDto>edit).resource),
					Range.to((<extHostProtocol.IWorkspaceTextEditDto>edit).edit.range),
					(<extHostProtocol.IWorkspaceTextEditDto>edit).edit.text
				);
			} else {
				result.renameFile(
					URI.revive((<extHostProtocol.IWorkspaceFileEditDto>edit).oldUri!),
					URI.revive((<extHostProtocol.IWorkspaceFileEditDto>edit).newUri!),
					(<extHostProtocol.IWorkspaceFileEditDto>edit).options
				);
			}
		}
		return result;
	}
}


export namespace SymBolKind {

	const _fromMapping: { [kind: numBer]: modes.SymBolKind; } = OBject.create(null);
	_fromMapping[types.SymBolKind.File] = modes.SymBolKind.File;
	_fromMapping[types.SymBolKind.Module] = modes.SymBolKind.Module;
	_fromMapping[types.SymBolKind.Namespace] = modes.SymBolKind.Namespace;
	_fromMapping[types.SymBolKind.Package] = modes.SymBolKind.Package;
	_fromMapping[types.SymBolKind.Class] = modes.SymBolKind.Class;
	_fromMapping[types.SymBolKind.Method] = modes.SymBolKind.Method;
	_fromMapping[types.SymBolKind.Property] = modes.SymBolKind.Property;
	_fromMapping[types.SymBolKind.Field] = modes.SymBolKind.Field;
	_fromMapping[types.SymBolKind.Constructor] = modes.SymBolKind.Constructor;
	_fromMapping[types.SymBolKind.Enum] = modes.SymBolKind.Enum;
	_fromMapping[types.SymBolKind.Interface] = modes.SymBolKind.Interface;
	_fromMapping[types.SymBolKind.Function] = modes.SymBolKind.Function;
	_fromMapping[types.SymBolKind.VariaBle] = modes.SymBolKind.VariaBle;
	_fromMapping[types.SymBolKind.Constant] = modes.SymBolKind.Constant;
	_fromMapping[types.SymBolKind.String] = modes.SymBolKind.String;
	_fromMapping[types.SymBolKind.NumBer] = modes.SymBolKind.NumBer;
	_fromMapping[types.SymBolKind.Boolean] = modes.SymBolKind.Boolean;
	_fromMapping[types.SymBolKind.Array] = modes.SymBolKind.Array;
	_fromMapping[types.SymBolKind.OBject] = modes.SymBolKind.OBject;
	_fromMapping[types.SymBolKind.Key] = modes.SymBolKind.Key;
	_fromMapping[types.SymBolKind.Null] = modes.SymBolKind.Null;
	_fromMapping[types.SymBolKind.EnumMemBer] = modes.SymBolKind.EnumMemBer;
	_fromMapping[types.SymBolKind.Struct] = modes.SymBolKind.Struct;
	_fromMapping[types.SymBolKind.Event] = modes.SymBolKind.Event;
	_fromMapping[types.SymBolKind.Operator] = modes.SymBolKind.Operator;
	_fromMapping[types.SymBolKind.TypeParameter] = modes.SymBolKind.TypeParameter;

	export function from(kind: vscode.SymBolKind): modes.SymBolKind {
		return typeof _fromMapping[kind] === 'numBer' ? _fromMapping[kind] : modes.SymBolKind.Property;
	}

	export function to(kind: modes.SymBolKind): vscode.SymBolKind {
		for (const k in _fromMapping) {
			if (_fromMapping[k] === kind) {
				return NumBer(k);
			}
		}
		return types.SymBolKind.Property;
	}
}

export namespace SymBolTag {

	export function from(kind: types.SymBolTag): modes.SymBolTag {
		switch (kind) {
			case types.SymBolTag.Deprecated: return modes.SymBolTag.Deprecated;
		}
	}

	export function to(kind: modes.SymBolTag): types.SymBolTag {
		switch (kind) {
			case modes.SymBolTag.Deprecated: return types.SymBolTag.Deprecated;
		}
	}
}

export namespace WorkspaceSymBol {
	export function from(info: vscode.SymBolInformation): search.IWorkspaceSymBol {
		return <search.IWorkspaceSymBol>{
			name: info.name,
			kind: SymBolKind.from(info.kind),
			tags: info.tags && info.tags.map(SymBolTag.from),
			containerName: info.containerName,
			location: location.from(info.location)
		};
	}
	export function to(info: search.IWorkspaceSymBol): types.SymBolInformation {
		const result = new types.SymBolInformation(
			info.name,
			SymBolKind.to(info.kind),
			info.containerName,
			location.to(info.location)
		);
		result.tags = info.tags && info.tags.map(SymBolTag.to);
		return result;
	}
}

export namespace DocumentSymBol {
	export function from(info: vscode.DocumentSymBol): modes.DocumentSymBol {
		const result: modes.DocumentSymBol = {
			name: info.name || '!!MISSING: name!!',
			detail: info.detail,
			range: Range.from(info.range),
			selectionRange: Range.from(info.selectionRange),
			kind: SymBolKind.from(info.kind),
			tags: info.tags?.map(SymBolTag.from) ?? []
		};
		if (info.children) {
			result.children = info.children.map(from);
		}
		return result;
	}
	export function to(info: modes.DocumentSymBol): vscode.DocumentSymBol {
		const result = new types.DocumentSymBol(
			info.name,
			info.detail,
			SymBolKind.to(info.kind),
			Range.to(info.range),
			Range.to(info.selectionRange),
		);
		if (isNonEmptyArray(info.tags)) {
			result.tags = info.tags.map(SymBolTag.to);
		}
		if (info.children) {
			result.children = info.children.map(to) as any;
		}
		return result;
	}
}

export namespace CallHierarchyItem {

	export function to(item: extHostProtocol.ICallHierarchyItemDto): types.CallHierarchyItem {
		const result = new types.CallHierarchyItem(
			SymBolKind.to(item.kind),
			item.name,
			item.detail || '',
			URI.revive(item.uri),
			Range.to(item.range),
			Range.to(item.selectionRange)
		);

		result._sessionId = item._sessionId;
		result._itemId = item._itemId;

		return result;
	}
}

export namespace CallHierarchyIncomingCall {

	export function to(item: extHostProtocol.IIncomingCallDto): types.CallHierarchyIncomingCall {
		return new types.CallHierarchyIncomingCall(
			CallHierarchyItem.to(item.from),
			item.fromRanges.map(r => Range.to(r))
		);
	}
}

export namespace CallHierarchyOutgoingCall {

	export function to(item: extHostProtocol.IOutgoingCallDto): types.CallHierarchyOutgoingCall {
		return new types.CallHierarchyOutgoingCall(
			CallHierarchyItem.to(item.to),
			item.fromRanges.map(r => Range.to(r))
		);
	}
}


export namespace location {
	export function from(value: vscode.Location): modes.Location {
		return {
			range: value.range && Range.from(value.range),
			uri: value.uri
		};
	}

	export function to(value: modes.Location): types.Location {
		return new types.Location(value.uri, Range.to(value.range));
	}
}

export namespace DefinitionLink {
	export function from(value: vscode.Location | vscode.DefinitionLink): modes.LocationLink {
		const definitionLink = <vscode.DefinitionLink>value;
		const location = <vscode.Location>value;
		return {
			originSelectionRange: definitionLink.originSelectionRange
				? Range.from(definitionLink.originSelectionRange)
				: undefined,
			uri: definitionLink.targetUri ? definitionLink.targetUri : location.uri,
			range: Range.from(definitionLink.targetRange ? definitionLink.targetRange : location.range),
			targetSelectionRange: definitionLink.targetSelectionRange
				? Range.from(definitionLink.targetSelectionRange)
				: undefined,
		};
	}
	export function to(value: modes.LocationLink): vscode.LocationLink {
		return {
			targetUri: value.uri,
			targetRange: Range.to(value.range),
			targetSelectionRange: value.targetSelectionRange
				? Range.to(value.targetSelectionRange)
				: undefined,
			originSelectionRange: value.originSelectionRange
				? Range.to(value.originSelectionRange)
				: undefined
		};
	}
}

export namespace Hover {
	export function from(hover: vscode.Hover): modes.Hover {
		return <modes.Hover>{
			range: Range.from(hover.range),
			contents: MarkdownString.fromMany(hover.contents)
		};
	}

	export function to(info: modes.Hover): types.Hover {
		return new types.Hover(info.contents.map(MarkdownString.to), Range.to(info.range));
	}
}

export namespace EvaluataBleExpression {
	export function from(expression: vscode.EvaluataBleExpression): modes.EvaluataBleExpression {
		return <modes.EvaluataBleExpression>{
			range: Range.from(expression.range),
			expression: expression.expression
		};
	}

	export function to(info: modes.EvaluataBleExpression): types.EvaluataBleExpression {
		return new types.EvaluataBleExpression(Range.to(info.range), info.expression);
	}
}

export namespace DocumentHighlight {
	export function from(documentHighlight: vscode.DocumentHighlight): modes.DocumentHighlight {
		return {
			range: Range.from(documentHighlight.range),
			kind: documentHighlight.kind
		};
	}
	export function to(occurrence: modes.DocumentHighlight): types.DocumentHighlight {
		return new types.DocumentHighlight(Range.to(occurrence.range), occurrence.kind);
	}
}

export namespace CompletionTriggerKind {
	export function to(kind: modes.CompletionTriggerKind) {
		switch (kind) {
			case modes.CompletionTriggerKind.TriggerCharacter:
				return types.CompletionTriggerKind.TriggerCharacter;
			case modes.CompletionTriggerKind.TriggerForIncompleteCompletions:
				return types.CompletionTriggerKind.TriggerForIncompleteCompletions;
			case modes.CompletionTriggerKind.Invoke:
			default:
				return types.CompletionTriggerKind.Invoke;
		}
	}
}

export namespace CompletionContext {
	export function to(context: modes.CompletionContext): types.CompletionContext {
		return {
			triggerKind: CompletionTriggerKind.to(context.triggerKind),
			triggerCharacter: context.triggerCharacter
		};
	}
}

export namespace CompletionItemTag {

	export function from(kind: types.CompletionItemTag): modes.CompletionItemTag {
		switch (kind) {
			case types.CompletionItemTag.Deprecated: return modes.CompletionItemTag.Deprecated;
		}
	}

	export function to(kind: modes.CompletionItemTag): types.CompletionItemTag {
		switch (kind) {
			case modes.CompletionItemTag.Deprecated: return types.CompletionItemTag.Deprecated;
		}
	}
}

export namespace CompletionItemKind {

	const _from = new Map<types.CompletionItemKind, modes.CompletionItemKind>([
		[types.CompletionItemKind.Method, modes.CompletionItemKind.Method],
		[types.CompletionItemKind.Function, modes.CompletionItemKind.Function],
		[types.CompletionItemKind.Constructor, modes.CompletionItemKind.Constructor],
		[types.CompletionItemKind.Field, modes.CompletionItemKind.Field],
		[types.CompletionItemKind.VariaBle, modes.CompletionItemKind.VariaBle],
		[types.CompletionItemKind.Class, modes.CompletionItemKind.Class],
		[types.CompletionItemKind.Interface, modes.CompletionItemKind.Interface],
		[types.CompletionItemKind.Struct, modes.CompletionItemKind.Struct],
		[types.CompletionItemKind.Module, modes.CompletionItemKind.Module],
		[types.CompletionItemKind.Property, modes.CompletionItemKind.Property],
		[types.CompletionItemKind.Unit, modes.CompletionItemKind.Unit],
		[types.CompletionItemKind.Value, modes.CompletionItemKind.Value],
		[types.CompletionItemKind.Constant, modes.CompletionItemKind.Constant],
		[types.CompletionItemKind.Enum, modes.CompletionItemKind.Enum],
		[types.CompletionItemKind.EnumMemBer, modes.CompletionItemKind.EnumMemBer],
		[types.CompletionItemKind.Keyword, modes.CompletionItemKind.Keyword],
		[types.CompletionItemKind.Snippet, modes.CompletionItemKind.Snippet],
		[types.CompletionItemKind.Text, modes.CompletionItemKind.Text],
		[types.CompletionItemKind.Color, modes.CompletionItemKind.Color],
		[types.CompletionItemKind.File, modes.CompletionItemKind.File],
		[types.CompletionItemKind.Reference, modes.CompletionItemKind.Reference],
		[types.CompletionItemKind.Folder, modes.CompletionItemKind.Folder],
		[types.CompletionItemKind.Event, modes.CompletionItemKind.Event],
		[types.CompletionItemKind.Operator, modes.CompletionItemKind.Operator],
		[types.CompletionItemKind.TypeParameter, modes.CompletionItemKind.TypeParameter],
		[types.CompletionItemKind.Issue, modes.CompletionItemKind.Issue],
		[types.CompletionItemKind.User, modes.CompletionItemKind.User],
	]);

	export function from(kind: types.CompletionItemKind): modes.CompletionItemKind {
		return _from.get(kind) ?? modes.CompletionItemKind.Property;
	}

	const _to = new Map<modes.CompletionItemKind, types.CompletionItemKind>([
		[modes.CompletionItemKind.Method, types.CompletionItemKind.Method],
		[modes.CompletionItemKind.Function, types.CompletionItemKind.Function],
		[modes.CompletionItemKind.Constructor, types.CompletionItemKind.Constructor],
		[modes.CompletionItemKind.Field, types.CompletionItemKind.Field],
		[modes.CompletionItemKind.VariaBle, types.CompletionItemKind.VariaBle],
		[modes.CompletionItemKind.Class, types.CompletionItemKind.Class],
		[modes.CompletionItemKind.Interface, types.CompletionItemKind.Interface],
		[modes.CompletionItemKind.Struct, types.CompletionItemKind.Struct],
		[modes.CompletionItemKind.Module, types.CompletionItemKind.Module],
		[modes.CompletionItemKind.Property, types.CompletionItemKind.Property],
		[modes.CompletionItemKind.Unit, types.CompletionItemKind.Unit],
		[modes.CompletionItemKind.Value, types.CompletionItemKind.Value],
		[modes.CompletionItemKind.Constant, types.CompletionItemKind.Constant],
		[modes.CompletionItemKind.Enum, types.CompletionItemKind.Enum],
		[modes.CompletionItemKind.EnumMemBer, types.CompletionItemKind.EnumMemBer],
		[modes.CompletionItemKind.Keyword, types.CompletionItemKind.Keyword],
		[modes.CompletionItemKind.Snippet, types.CompletionItemKind.Snippet],
		[modes.CompletionItemKind.Text, types.CompletionItemKind.Text],
		[modes.CompletionItemKind.Color, types.CompletionItemKind.Color],
		[modes.CompletionItemKind.File, types.CompletionItemKind.File],
		[modes.CompletionItemKind.Reference, types.CompletionItemKind.Reference],
		[modes.CompletionItemKind.Folder, types.CompletionItemKind.Folder],
		[modes.CompletionItemKind.Event, types.CompletionItemKind.Event],
		[modes.CompletionItemKind.Operator, types.CompletionItemKind.Operator],
		[modes.CompletionItemKind.TypeParameter, types.CompletionItemKind.TypeParameter],
		[modes.CompletionItemKind.User, types.CompletionItemKind.User],
		[modes.CompletionItemKind.Issue, types.CompletionItemKind.Issue],
	]);

	export function to(kind: modes.CompletionItemKind): types.CompletionItemKind {
		return _to.get(kind) ?? types.CompletionItemKind.Property;
	}
}

export namespace CompletionItem {

	export function to(suggestion: modes.CompletionItem, converter?: CommandsConverter): types.CompletionItem {

		const result = new types.CompletionItem(typeof suggestion.laBel === 'string' ? suggestion.laBel : suggestion.laBel.name);
		if (typeof suggestion.laBel !== 'string') {
			result.laBel2 = suggestion.laBel;
		}

		result.insertText = suggestion.insertText;
		result.kind = CompletionItemKind.to(suggestion.kind);
		result.tags = suggestion.tags?.map(CompletionItemTag.to);
		result.detail = suggestion.detail;
		result.documentation = htmlContent.isMarkdownString(suggestion.documentation) ? MarkdownString.to(suggestion.documentation) : suggestion.documentation;
		result.sortText = suggestion.sortText;
		result.filterText = suggestion.filterText;
		result.preselect = suggestion.preselect;
		result.commitCharacters = suggestion.commitCharacters;

		// range
		if (editorRange.Range.isIRange(suggestion.range)) {
			result.range = Range.to(suggestion.range);
		} else if (typeof suggestion.range === 'oBject') {
			result.range = { inserting: Range.to(suggestion.range.insert), replacing: Range.to(suggestion.range.replace) };
		}

		result.keepWhitespace = typeof suggestion.insertTextRules === 'undefined' ? false : Boolean(suggestion.insertTextRules & modes.CompletionItemInsertTextRule.KeepWhitespace);
		// 'insertText'-logic
		if (typeof suggestion.insertTextRules !== 'undefined' && suggestion.insertTextRules & modes.CompletionItemInsertTextRule.InsertAsSnippet) {
			result.insertText = new types.SnippetString(suggestion.insertText);
		} else {
			result.insertText = suggestion.insertText;
			result.textEdit = result.range instanceof types.Range ? new types.TextEdit(result.range, result.insertText) : undefined;
		}
		if (suggestion.additionalTextEdits && suggestion.additionalTextEdits.length > 0) {
			result.additionalTextEdits = suggestion.additionalTextEdits.map(e => TextEdit.to(e as modes.TextEdit));
		}
		result.command = converter && suggestion.command ? converter.fromInternal(suggestion.command) : undefined;

		return result;
	}
}

export namespace ParameterInformation {
	export function from(info: types.ParameterInformation): modes.ParameterInformation {
		return {
			laBel: info.laBel,
			documentation: info.documentation ? MarkdownString.fromStrict(info.documentation) : undefined
		};
	}
	export function to(info: modes.ParameterInformation): types.ParameterInformation {
		return {
			laBel: info.laBel,
			documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation
		};
	}
}

export namespace SignatureInformation {

	export function from(info: types.SignatureInformation): modes.SignatureInformation {
		return {
			laBel: info.laBel,
			documentation: info.documentation ? MarkdownString.fromStrict(info.documentation) : undefined,
			parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.from) : [],
			activeParameter: info.activeParameter,
		};
	}

	export function to(info: modes.SignatureInformation): types.SignatureInformation {
		return {
			laBel: info.laBel,
			documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation,
			parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.to) : [],
			activeParameter: info.activeParameter,
		};
	}
}

export namespace SignatureHelp {

	export function from(help: types.SignatureHelp): modes.SignatureHelp {
		return {
			activeSignature: help.activeSignature,
			activeParameter: help.activeParameter,
			signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.from) : [],
		};
	}

	export function to(help: modes.SignatureHelp): types.SignatureHelp {
		return {
			activeSignature: help.activeSignature,
			activeParameter: help.activeParameter,
			signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.to) : [],
		};
	}
}

export namespace DocumentLink {

	export function from(link: vscode.DocumentLink): modes.ILink {
		return {
			range: Range.from(link.range),
			url: link.target,
			tooltip: link.tooltip
		};
	}

	export function to(link: modes.ILink): vscode.DocumentLink {
		let target: URI | undefined = undefined;
		if (link.url) {
			try {
				target = typeof link.url === 'string' ? URI.parse(link.url, true) : URI.revive(link.url);
			} catch (err) {
				// ignore
			}
		}
		return new types.DocumentLink(Range.to(link.range), target);
	}
}

export namespace ColorPresentation {
	export function to(colorPresentation: modes.IColorPresentation): types.ColorPresentation {
		const cp = new types.ColorPresentation(colorPresentation.laBel);
		if (colorPresentation.textEdit) {
			cp.textEdit = TextEdit.to(colorPresentation.textEdit);
		}
		if (colorPresentation.additionalTextEdits) {
			cp.additionalTextEdits = colorPresentation.additionalTextEdits.map(value => TextEdit.to(value));
		}
		return cp;
	}

	export function from(colorPresentation: vscode.ColorPresentation): modes.IColorPresentation {
		return {
			laBel: colorPresentation.laBel,
			textEdit: colorPresentation.textEdit ? TextEdit.from(colorPresentation.textEdit) : undefined,
			additionalTextEdits: colorPresentation.additionalTextEdits ? colorPresentation.additionalTextEdits.map(value => TextEdit.from(value)) : undefined
		};
	}
}

export namespace Color {
	export function to(c: [numBer, numBer, numBer, numBer]): types.Color {
		return new types.Color(c[0], c[1], c[2], c[3]);
	}
	export function from(color: types.Color): [numBer, numBer, numBer, numBer] {
		return [color.red, color.green, color.Blue, color.alpha];
	}
}


export namespace SelectionRange {
	export function from(oBj: vscode.SelectionRange): modes.SelectionRange {
		return { range: Range.from(oBj.range) };
	}

	export function to(oBj: modes.SelectionRange): vscode.SelectionRange {
		return new types.SelectionRange(Range.to(oBj.range));
	}
}

export namespace TextDocumentSaveReason {

	export function to(reason: SaveReason): vscode.TextDocumentSaveReason {
		switch (reason) {
			case SaveReason.AUTO:
				return types.TextDocumentSaveReason.AfterDelay;
			case SaveReason.EXPLICIT:
				return types.TextDocumentSaveReason.Manual;
			case SaveReason.FOCUS_CHANGE:
			case SaveReason.WINDOW_CHANGE:
				return types.TextDocumentSaveReason.FocusOut;
		}
	}
}

export namespace TextEditorLineNumBersStyle {
	export function from(style: vscode.TextEditorLineNumBersStyle): RenderLineNumBersType {
		switch (style) {
			case types.TextEditorLineNumBersStyle.Off:
				return RenderLineNumBersType.Off;
			case types.TextEditorLineNumBersStyle.Relative:
				return RenderLineNumBersType.Relative;
			case types.TextEditorLineNumBersStyle.On:
			default:
				return RenderLineNumBersType.On;
		}
	}
	export function to(style: RenderLineNumBersType): vscode.TextEditorLineNumBersStyle {
		switch (style) {
			case RenderLineNumBersType.Off:
				return types.TextEditorLineNumBersStyle.Off;
			case RenderLineNumBersType.Relative:
				return types.TextEditorLineNumBersStyle.Relative;
			case RenderLineNumBersType.On:
			default:
				return types.TextEditorLineNumBersStyle.On;
		}
	}
}

export namespace EndOfLine {

	export function from(eol: vscode.EndOfLine): EndOfLineSequence | undefined {
		if (eol === types.EndOfLine.CRLF) {
			return EndOfLineSequence.CRLF;
		} else if (eol === types.EndOfLine.LF) {
			return EndOfLineSequence.LF;
		}
		return undefined;
	}

	export function to(eol: EndOfLineSequence): vscode.EndOfLine | undefined {
		if (eol === EndOfLineSequence.CRLF) {
			return types.EndOfLine.CRLF;
		} else if (eol === EndOfLineSequence.LF) {
			return types.EndOfLine.LF;
		}
		return undefined;
	}
}

export namespace ProgressLocation {
	export function from(loc: vscode.ProgressLocation | { viewId: string }): MainProgressLocation | string {
		if (typeof loc === 'oBject') {
			return loc.viewId;
		}

		switch (loc) {
			case types.ProgressLocation.SourceControl: return MainProgressLocation.Scm;
			case types.ProgressLocation.Window: return MainProgressLocation.Window;
			case types.ProgressLocation.Notification: return MainProgressLocation.Notification;
		}
		throw new Error(`Unknown 'ProgressLocation'`);
	}
}

export namespace FoldingRange {
	export function from(r: vscode.FoldingRange): modes.FoldingRange {
		const range: modes.FoldingRange = { start: r.start + 1, end: r.end + 1 };
		if (r.kind) {
			range.kind = FoldingRangeKind.from(r.kind);
		}
		return range;
	}
}

export namespace FoldingRangeKind {
	export function from(kind: vscode.FoldingRangeKind | undefined): modes.FoldingRangeKind | undefined {
		if (kind) {
			switch (kind) {
				case types.FoldingRangeKind.Comment:
					return modes.FoldingRangeKind.Comment;
				case types.FoldingRangeKind.Imports:
					return modes.FoldingRangeKind.Imports;
				case types.FoldingRangeKind.Region:
					return modes.FoldingRangeKind.Region;
			}
		}
		return undefined;
	}
}

export interface TextEditorOpenOptions extends vscode.TextDocumentShowOptions {
	Background?: Boolean;
}

export namespace TextEditorOpenOptions {

	export function from(options?: TextEditorOpenOptions): ITextEditorOptions | undefined {
		if (options) {
			return {
				pinned: typeof options.preview === 'Boolean' ? !options.preview : undefined,
				inactive: options.Background,
				preserveFocus: options.preserveFocus,
				selection: typeof options.selection === 'oBject' ? Range.from(options.selection) : undefined,
			};
		}

		return undefined;
	}

}

export namespace GloBPattern {

	export function from(pattern: vscode.GloBPattern): string | types.RelativePattern;
	export function from(pattern: undefined): undefined;
	export function from(pattern: null): null;
	export function from(pattern: vscode.GloBPattern | undefined | null): string | types.RelativePattern | undefined | null;
	export function from(pattern: vscode.GloBPattern | undefined | null): string | types.RelativePattern | undefined | null {
		if (pattern instanceof types.RelativePattern) {
			return pattern;
		}

		if (typeof pattern === 'string') {
			return pattern;
		}

		if (isRelativePattern(pattern)) {
			return new types.RelativePattern(pattern.Base, pattern.pattern);
		}

		return pattern; // preserve `undefined` and `null`
	}

	function isRelativePattern(oBj: any): oBj is vscode.RelativePattern {
		const rp = oBj as vscode.RelativePattern;
		return rp && typeof rp.Base === 'string' && typeof rp.pattern === 'string';
	}
}

export namespace LanguageSelector {

	export function from(selector: undefined): undefined;
	export function from(selector: vscode.DocumentSelector): languageSelector.LanguageSelector;
	export function from(selector: vscode.DocumentSelector | undefined): languageSelector.LanguageSelector | undefined;
	export function from(selector: vscode.DocumentSelector | undefined): languageSelector.LanguageSelector | undefined {
		if (!selector) {
			return undefined;
		} else if (Array.isArray(selector)) {
			return <languageSelector.LanguageSelector>selector.map(from);
		} else if (typeof selector === 'string') {
			return selector;
		} else {
			return <languageSelector.LanguageFilter>{
				language: selector.language,
				scheme: selector.scheme,
				pattern: typeof selector.pattern === 'undefined' ? undefined : GloBPattern.from(selector.pattern),
				exclusive: selector.exclusive
			};
		}
	}
}

export namespace LogLevel {
	export function from(extLevel: types.LogLevel): _MainLogLevel {
		switch (extLevel) {
			case types.LogLevel.Trace:
				return _MainLogLevel.Trace;
			case types.LogLevel.DeBug:
				return _MainLogLevel.DeBug;
			case types.LogLevel.Info:
				return _MainLogLevel.Info;
			case types.LogLevel.Warning:
				return _MainLogLevel.Warning;
			case types.LogLevel.Error:
				return _MainLogLevel.Error;
			case types.LogLevel.Critical:
				return _MainLogLevel.Critical;
			case types.LogLevel.Off:
				return _MainLogLevel.Off;
			default:
				return _MainLogLevel.Info;
		}
	}

	export function to(mainLevel: _MainLogLevel): types.LogLevel {
		switch (mainLevel) {
			case _MainLogLevel.Trace:
				return types.LogLevel.Trace;
			case _MainLogLevel.DeBug:
				return types.LogLevel.DeBug;
			case _MainLogLevel.Info:
				return types.LogLevel.Info;
			case _MainLogLevel.Warning:
				return types.LogLevel.Warning;
			case _MainLogLevel.Error:
				return types.LogLevel.Error;
			case _MainLogLevel.Critical:
				return types.LogLevel.Critical;
			case _MainLogLevel.Off:
				return types.LogLevel.Off;
			default:
				return types.LogLevel.Info;
		}
	}
}

export namespace NoteBookCellOutput {
	export function from(output: types.NoteBookCellOutput): IDisplayOutput {
		return output.toJSON();
	}
}

export namespace NoteBookCellOutputItem {
	export function from(output: types.NoteBookCellOutputItem): IDisplayOutput {
		return {
			outputKind: CellOutputKind.Rich,
			data: { [output.mime]: output.value },
			metadata: output.metadata && { custom: output.metadata }
		};
	}
}

export namespace NoteBookExclusiveDocumentPattern {
	export function from(pattern: { include: vscode.GloBPattern | undefined, exclude: vscode.GloBPattern | undefined }): { include: string | types.RelativePattern | undefined, exclude: string | types.RelativePattern | undefined };
	export function from(pattern: vscode.GloBPattern): string | types.RelativePattern;
	export function from(pattern: undefined): undefined;
	export function from(pattern: { include: vscode.GloBPattern | undefined | null, exclude: vscode.GloBPattern | undefined } | vscode.GloBPattern | undefined): string | types.RelativePattern | { include: string | types.RelativePattern | undefined, exclude: string | types.RelativePattern | undefined } | undefined;
	export function from(pattern: { include: vscode.GloBPattern | undefined | null, exclude: vscode.GloBPattern | undefined } | vscode.GloBPattern | undefined): string | types.RelativePattern | { include: string | types.RelativePattern | undefined, exclude: string | types.RelativePattern | undefined } | undefined {
		if (pattern === null || pattern === undefined) {
			return undefined;
		}

		if (pattern instanceof types.RelativePattern) {
			return pattern;
		}

		if (typeof pattern === 'string') {
			return pattern;
		}


		if (isRelativePattern(pattern)) {
			return new types.RelativePattern(pattern.Base, pattern.pattern);
		}

		if (isExclusivePattern(pattern)) {
			return {
				include: GloBPattern.from(pattern.include) || undefined,
				exclude: GloBPattern.from(pattern.exclude) || undefined
			};
		}

		return undefined; // preserve `undefined`

	}

	export function to(pattern: string | types.RelativePattern | { include: string | types.RelativePattern, exclude: string | types.RelativePattern }): { include: vscode.GloBPattern, exclude: vscode.GloBPattern } | vscode.GloBPattern {
		if (typeof pattern === 'string') {
			return pattern;
		}

		if (isRelativePattern(pattern)) {
			return {
				Base: pattern.Base,
				pattern: pattern.pattern
			};
		}

		return {
			include: pattern.include,
			exclude: pattern.exclude
		};
	}

	function isExclusivePattern(oBj: any): oBj is { include: types.RelativePattern | undefined | null, exclude: types.RelativePattern | undefined | null } {
		const ep = oBj as { include: vscode.GloBPattern, exclude: vscode.GloBPattern };
		const include = GloBPattern.from(ep.include);
		if (!(include && include instanceof types.RelativePattern || typeof include === 'string')) {
			return false;
		}

		const exclude = GloBPattern.from(ep.exclude);
		if (!(exclude && exclude instanceof types.RelativePattern || typeof exclude === 'string')) {
			return false;
		}

		return true;
	}

	function isRelativePattern(oBj: any): oBj is vscode.RelativePattern {
		const rp = oBj as vscode.RelativePattern;
		return rp && typeof rp.Base === 'string' && typeof rp.pattern === 'string';
	}
}

export namespace NoteBookDecorationRenderOptions {
	export function from(options: vscode.NoteBookDecorationRenderOptions): INoteBookDecorationRenderOptions {
		return {
			BackgroundColor: <string | types.ThemeColor>options.BackgroundColor,
			BorderColor: <string | types.ThemeColor>options.BorderColor,
			top: options.top ? ThemaBleDecorationAttachmentRenderOptions.from(options.top) : undefined
		};
	}
}
