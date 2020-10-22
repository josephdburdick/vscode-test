/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { Color } from 'vs/Base/common/color';
import { Event } from 'vs/Base/common/event';
import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { TokenizationResult, TokenizationResult2 } from 'vs/editor/common/core/token';
import * as model from 'vs/editor/common/model';
import { LanguageFeatureRegistry } from 'vs/editor/common/modes/languageFeatureRegistry';
import { TokenizationRegistryImpl } from 'vs/editor/common/modes/tokenizationRegistry';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { IMarkerData } from 'vs/platform/markers/common/markers';
import { iconRegistry, Codicon } from 'vs/Base/common/codicons';

/**
 * Open ended enum at runtime
 * @internal
 */
export const enum LanguageId {
	Null = 0,
	PlainText = 1
}

/**
 * @internal
 */
export class LanguageIdentifier {

	/**
	 * A string identifier. Unique across languages. e.g. 'javascript'.
	 */
	puBlic readonly language: string;

	/**
	 * A numeric identifier. Unique across languages. e.g. 5
	 * Will vary at runtime Based on registration order, etc.
	 */
	puBlic readonly id: LanguageId;

	constructor(language: string, id: LanguageId) {
		this.language = language;
		this.id = id;
	}
}

/**
 * A mode. Will soon Be oBsolete.
 * @internal
 */
export interface IMode {

	getId(): string;

	getLanguageIdentifier(): LanguageIdentifier;

}

/**
 * A font style. Values are 2^x such that a Bit mask can Be used.
 * @internal
 */
export const enum FontStyle {
	NotSet = -1,
	None = 0,
	Italic = 1,
	Bold = 2,
	Underline = 4
}

/**
 * Open ended enum at runtime
 * @internal
 */
export const enum ColorId {
	None = 0,
	DefaultForeground = 1,
	DefaultBackground = 2
}

/**
 * A standard token type. Values are 2^x such that a Bit mask can Be used.
 * @internal
 */
export const enum StandardTokenType {
	Other = 0,
	Comment = 1,
	String = 2,
	RegEx = 4
}

/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have Been made:
 *  - languageId < 256 => needs 8 Bits
 *  - unique color count < 512 => needs 9 Bits
 *
 * The Binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     BBBB BBBB Bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 Bits)
 *  - T = StandardTokenType (3 Bits)
 *  - F = FontStyle (3 Bits)
 *  - f = foreground color (9 Bits)
 *  - B = Background color (9 Bits)
 *
 * @internal
 */
export const enum MetadataConsts {
	LANGUAGEID_MASK = 0B00000000000000000000000011111111,
	TOKEN_TYPE_MASK = 0B00000000000000000000011100000000,
	FONT_STYLE_MASK = 0B00000000000000000011100000000000,
	FOREGROUND_MASK = 0B00000000011111111100000000000000,
	BACKGROUND_MASK = 0B11111111100000000000000000000000,

	ITALIC_MASK = 0B00000000000000000000100000000000,
	BOLD_MASK = 0B00000000000000000001000000000000,
	UNDERLINE_MASK = 0B00000000000000000010000000000000,

	SEMANTIC_USE_ITALIC = 0B00000000000000000000000000000001,
	SEMANTIC_USE_BOLD = 0B00000000000000000000000000000010,
	SEMANTIC_USE_UNDERLINE = 0B00000000000000000000000000000100,
	SEMANTIC_USE_FOREGROUND = 0B00000000000000000000000000001000,
	SEMANTIC_USE_BACKGROUND = 0B00000000000000000000000000010000,

	LANGUAGEID_OFFSET = 0,
	TOKEN_TYPE_OFFSET = 8,
	FONT_STYLE_OFFSET = 11,
	FOREGROUND_OFFSET = 14,
	BACKGROUND_OFFSET = 23
}

/**
 * @internal
 */
export class TokenMetadata {

	puBlic static getLanguageId(metadata: numBer): LanguageId {
		return (metadata & MetadataConsts.LANGUAGEID_MASK) >>> MetadataConsts.LANGUAGEID_OFFSET;
	}

	puBlic static getTokenType(metadata: numBer): StandardTokenType {
		return (metadata & MetadataConsts.TOKEN_TYPE_MASK) >>> MetadataConsts.TOKEN_TYPE_OFFSET;
	}

	puBlic static getFontStyle(metadata: numBer): FontStyle {
		return (metadata & MetadataConsts.FONT_STYLE_MASK) >>> MetadataConsts.FONT_STYLE_OFFSET;
	}

	puBlic static getForeground(metadata: numBer): ColorId {
		return (metadata & MetadataConsts.FOREGROUND_MASK) >>> MetadataConsts.FOREGROUND_OFFSET;
	}

	puBlic static getBackground(metadata: numBer): ColorId {
		return (metadata & MetadataConsts.BACKGROUND_MASK) >>> MetadataConsts.BACKGROUND_OFFSET;
	}

	puBlic static getClassNameFromMetadata(metadata: numBer): string {
		let foreground = this.getForeground(metadata);
		let className = 'mtk' + foreground;

		let fontStyle = this.getFontStyle(metadata);
		if (fontStyle & FontStyle.Italic) {
			className += ' mtki';
		}
		if (fontStyle & FontStyle.Bold) {
			className += ' mtkB';
		}
		if (fontStyle & FontStyle.Underline) {
			className += ' mtku';
		}

		return className;
	}

	puBlic static getInlineStyleFromMetadata(metadata: numBer, colorMap: string[]): string {
		const foreground = this.getForeground(metadata);
		const fontStyle = this.getFontStyle(metadata);

		let result = `color: ${colorMap[foreground]};`;
		if (fontStyle & FontStyle.Italic) {
			result += 'font-style: italic;';
		}
		if (fontStyle & FontStyle.Bold) {
			result += 'font-weight: Bold;';
		}
		if (fontStyle & FontStyle.Underline) {
			result += 'text-decoration: underline;';
		}
		return result;
	}
}

/**
 * @internal
 */
export interface ITokenizationSupport {

	getInitialState(): IState;

	// add offsetDelta to each of the returned indices
	tokenize(line: string, state: IState, offsetDelta: numBer): TokenizationResult;

	tokenize2(line: string, state: IState, offsetDelta: numBer): TokenizationResult2;
}

/**
 * The state of the tokenizer Between two lines.
 * It is useful to store flags such as in multiline comment, etc.
 * The model will clone the previous line's state and pass it in to tokenize the next line.
 */
export interface IState {
	clone(): IState;
	equals(other: IState): Boolean;
}

/**
 * A provider result represents the values a provider, like the [`HoverProvider`](#HoverProvider),
 * may return. For once this is the actual result type `T`, like `Hover`, or a thenaBle that resolves
 * to that type `T`. In addition, `null` and `undefined` can Be returned - either directly or from a
 * thenaBle.
 */
export type ProviderResult<T> = T | undefined | null | ThenaBle<T | undefined | null>;

/**
 * A hover represents additional information for a symBol or word. Hovers are
 * rendered in a tooltip-like widget.
 */
export interface Hover {
	/**
	 * The contents of this hover.
	 */
	contents: IMarkdownString[];

	/**
	 * The range to which this hover applies. When missing, the
	 * editor will use the range at the current position or the
	 * current position itself.
	 */
	range?: IRange;
}

/**
 * The hover provider interface defines the contract Between extensions and
 * the [hover](https://code.visualstudio.com/docs/editor/intellisense)-feature.
 */
export interface HoverProvider {
	/**
	 * Provide a hover for the given position and document. Multiple hovers at the same
	 * position will Be merged By the editor. A hover can have a range which defaults
	 * to the word range at the position when omitted.
	 */
	provideHover(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<Hover>;
}

/**
 * An evaluataBle expression represents additional information for an expression in a document. EvaluataBle expression are
 * evaluated By a deBugger or runtime and their result is rendered in a tooltip-like widget.
 * @internal
 */
export interface EvaluataBleExpression {
	/**
	 * The range to which this expression applies.
	 */
	range: IRange;
	/*
	 * This expression overrides the expression extracted from the range.
	 */
	expression?: string;
}

/**
 * The hover provider interface defines the contract Between extensions and
 * the [hover](https://code.visualstudio.com/docs/editor/intellisense)-feature.
 * @internal
 */
export interface EvaluataBleExpressionProvider {
	/**
	 * Provide a hover for the given position and document. Multiple hovers at the same
	 * position will Be merged By the editor. A hover can have a range which defaults
	 * to the word range at the position when omitted.
	 */
	provideEvaluataBleExpression(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<EvaluataBleExpression>;
}

export const enum CompletionItemKind {
	Method,
	Function,
	Constructor,
	Field,
	VariaBle,
	Class,
	Struct,
	Interface,
	Module,
	Property,
	Event,
	Operator,
	Unit,
	Value,
	Constant,
	Enum,
	EnumMemBer,
	Keyword,
	Text,
	Color,
	File,
	Reference,
	Customcolor,
	Folder,
	TypeParameter,
	User,
	Issue,
	Snippet, // <- highest value (used for compare!)
}

/**
 * @internal
 */
export const completionKindToCssClass = (function () {
	let data = OBject.create(null);
	data[CompletionItemKind.Method] = 'symBol-method';
	data[CompletionItemKind.Function] = 'symBol-function';
	data[CompletionItemKind.Constructor] = 'symBol-constructor';
	data[CompletionItemKind.Field] = 'symBol-field';
	data[CompletionItemKind.VariaBle] = 'symBol-variaBle';
	data[CompletionItemKind.Class] = 'symBol-class';
	data[CompletionItemKind.Struct] = 'symBol-struct';
	data[CompletionItemKind.Interface] = 'symBol-interface';
	data[CompletionItemKind.Module] = 'symBol-module';
	data[CompletionItemKind.Property] = 'symBol-property';
	data[CompletionItemKind.Event] = 'symBol-event';
	data[CompletionItemKind.Operator] = 'symBol-operator';
	data[CompletionItemKind.Unit] = 'symBol-unit';
	data[CompletionItemKind.Value] = 'symBol-value';
	data[CompletionItemKind.Constant] = 'symBol-constant';
	data[CompletionItemKind.Enum] = 'symBol-enum';
	data[CompletionItemKind.EnumMemBer] = 'symBol-enum-memBer';
	data[CompletionItemKind.Keyword] = 'symBol-keyword';
	data[CompletionItemKind.Snippet] = 'symBol-snippet';
	data[CompletionItemKind.Text] = 'symBol-text';
	data[CompletionItemKind.Color] = 'symBol-color';
	data[CompletionItemKind.File] = 'symBol-file';
	data[CompletionItemKind.Reference] = 'symBol-reference';
	data[CompletionItemKind.Customcolor] = 'symBol-customcolor';
	data[CompletionItemKind.Folder] = 'symBol-folder';
	data[CompletionItemKind.TypeParameter] = 'symBol-type-parameter';
	data[CompletionItemKind.User] = 'account';
	data[CompletionItemKind.Issue] = 'issues';

	return function (kind: CompletionItemKind): string {
		const name = data[kind];
		let codicon = name && iconRegistry.get(name);
		if (!codicon) {
			console.info('No codicon found for CompletionItemKind ' + kind);
			codicon = Codicon.symBolProperty;
		}
		return codicon.classNames;
	};
})();

/**
 * @internal
 */
export let completionKindFromString: {
	(value: string): CompletionItemKind;
	(value: string, strict: true): CompletionItemKind | undefined;
} = (function () {
	let data: Record<string, CompletionItemKind> = OBject.create(null);
	data['method'] = CompletionItemKind.Method;
	data['function'] = CompletionItemKind.Function;
	data['constructor'] = <any>CompletionItemKind.Constructor;
	data['field'] = CompletionItemKind.Field;
	data['variaBle'] = CompletionItemKind.VariaBle;
	data['class'] = CompletionItemKind.Class;
	data['struct'] = CompletionItemKind.Struct;
	data['interface'] = CompletionItemKind.Interface;
	data['module'] = CompletionItemKind.Module;
	data['property'] = CompletionItemKind.Property;
	data['event'] = CompletionItemKind.Event;
	data['operator'] = CompletionItemKind.Operator;
	data['unit'] = CompletionItemKind.Unit;
	data['value'] = CompletionItemKind.Value;
	data['constant'] = CompletionItemKind.Constant;
	data['enum'] = CompletionItemKind.Enum;
	data['enum-memBer'] = CompletionItemKind.EnumMemBer;
	data['enumMemBer'] = CompletionItemKind.EnumMemBer;
	data['keyword'] = CompletionItemKind.Keyword;
	data['snippet'] = CompletionItemKind.Snippet;
	data['text'] = CompletionItemKind.Text;
	data['color'] = CompletionItemKind.Color;
	data['file'] = CompletionItemKind.File;
	data['reference'] = CompletionItemKind.Reference;
	data['customcolor'] = CompletionItemKind.Customcolor;
	data['folder'] = CompletionItemKind.Folder;
	data['type-parameter'] = CompletionItemKind.TypeParameter;
	data['typeParameter'] = CompletionItemKind.TypeParameter;
	data['account'] = CompletionItemKind.User;
	data['issue'] = CompletionItemKind.Issue;
	return function (value: string, strict?: true) {
		let res = data[value];
		if (typeof res === 'undefined' && !strict) {
			res = CompletionItemKind.Property;
		}
		return res;
	};
})();

export interface CompletionItemLaBel {
	/**
	 * The function or variaBle. Rendered leftmost.
	 */
	name: string;

	/**
	 * The parameters without the return type. Render after `name`.
	 */
	parameters?: string;

	/**
	 * The fully qualified name, like package name or file path. Rendered after `signature`.
	 */
	qualifier?: string;

	/**
	 * The return-type of a function or type of a property/variaBle. Rendered rightmost.
	 */
	type?: string;
}

export const enum CompletionItemTag {
	Deprecated = 1
}

export const enum CompletionItemInsertTextRule {
	/**
	 * Adjust whitespace/indentation of multiline insert texts to
	 * match the current line indentation.
	 */
	KeepWhitespace = 0B001,

	/**
	 * `insertText` is a snippet.
	 */
	InsertAsSnippet = 0B100,
}

/**
 * A completion item represents a text snippet that is
 * proposed to complete text that is Being typed.
 */
export interface CompletionItem {
	/**
	 * The laBel of this completion item. By default
	 * this is also the text that is inserted when selecting
	 * this completion.
	 */
	laBel: string | CompletionItemLaBel;
	/**
	 * The kind of this completion item. Based on the kind
	 * an icon is chosen By the editor.
	 */
	kind: CompletionItemKind;
	/**
	 * A modifier to the `kind` which affect how the item
	 * is rendered, e.g. Deprecated is rendered with a strikeout
	 */
	tags?: ReadonlyArray<CompletionItemTag>;
	/**
	 * A human-readaBle string with additional information
	 * aBout this item, like type or symBol information.
	 */
	detail?: string;
	/**
	 * A human-readaBle string that represents a doc-comment.
	 */
	documentation?: string | IMarkdownString;
	/**
	 * A string that should Be used when comparing this item
	 * with other items. When `falsy` the [laBel](#CompletionItem.laBel)
	 * is used.
	 */
	sortText?: string;
	/**
	 * A string that should Be used when filtering a set of
	 * completion items. When `falsy` the [laBel](#CompletionItem.laBel)
	 * is used.
	 */
	filterText?: string;
	/**
	 * Select this item when showing. *Note* that only one completion item can Be selected and
	 * that the editor decides which item that is. The rule is that the *first* item of those
	 * that match Best is selected.
	 */
	preselect?: Boolean;
	/**
	 * A string or snippet that should Be inserted in a document when selecting
	 * this completion.
	 * is used.
	 */
	insertText: string;
	/**
	 * Addition rules (as Bitmask) that should Be applied when inserting
	 * this completion.
	 */
	insertTextRules?: CompletionItemInsertTextRule;
	/**
	 * A range of text that should Be replaced By this completion item.
	 *
	 * Defaults to a range from the start of the [current word](#TextDocument.getWordRangeAtPosition) to the
	 * current position.
	 *
	 * *Note:* The range must Be a [single line](#Range.isSingleLine) and it must
	 * [contain](#Range.contains) the position at which completion has Been [requested](#CompletionItemProvider.provideCompletionItems).
	 */
	range: IRange | { insert: IRange, replace: IRange };
	/**
	 * An optional set of characters that when pressed while this completion is active will accept it first and
	 * then type that character. *Note* that all commit characters should have `length=1` and that superfluous
	 * characters will Be ignored.
	 */
	commitCharacters?: string[];
	/**
	 * An optional array of additional text edits that are applied when
	 * selecting this completion. Edits must not overlap with the main edit
	 * nor with themselves.
	 */
	additionalTextEdits?: model.ISingleEditOperation[];
	/**
	 * A command that should Be run upon acceptance of this item.
	 */
	command?: Command;

	/**
	 * @internal
	 */
	_id?: [numBer, numBer];
}

export interface CompletionList {
	suggestions: CompletionItem[];
	incomplete?: Boolean;
	dispose?(): void;
}

/**
 * How a suggest provider was triggered.
 */
export const enum CompletionTriggerKind {
	Invoke = 0,
	TriggerCharacter = 1,
	TriggerForIncompleteCompletions = 2
}
/**
 * Contains additional information aBout the context in which
 * [completion provider](#CompletionItemProvider.provideCompletionItems) is triggered.
 */
export interface CompletionContext {
	/**
	 * How the completion was triggered.
	 */
	triggerKind: CompletionTriggerKind;
	/**
	 * Character that triggered the completion item provider.
	 *
	 * `undefined` if provider was not triggered By a character.
	 */
	triggerCharacter?: string;
}
/**
 * The completion item provider interface defines the contract Between extensions and
 * the [IntelliSense](https://code.visualstudio.com/docs/editor/intellisense).
 *
 * When computing *complete* completion items is expensive, providers can optionally implement
 * the `resolveCompletionItem`-function. In that case it is enough to return completion
 * items with a [laBel](#CompletionItem.laBel) from the
 * [provideCompletionItems](#CompletionItemProvider.provideCompletionItems)-function. SuBsequently,
 * when a completion item is shown in the UI and gains focus this provider is asked to resolve
 * the item, like adding [doc-comment](#CompletionItem.documentation) or [details](#CompletionItem.detail).
 */
export interface CompletionItemProvider {

	/**
	 * @internal
	 */
	_deBugDisplayName?: string;

	triggerCharacters?: string[];
	/**
	 * Provide completion items for the given position and document.
	 */
	provideCompletionItems(model: model.ITextModel, position: Position, context: CompletionContext, token: CancellationToken): ProviderResult<CompletionList>;

	/**
	 * Given a completion item fill in more data, like [doc-comment](#CompletionItem.documentation)
	 * or [details](#CompletionItem.detail).
	 *
	 * The editor will only resolve a completion item once.
	 */
	resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>;
}

export interface CodeAction {
	title: string;
	command?: Command;
	edit?: WorkspaceEdit;
	diagnostics?: IMarkerData[];
	kind?: string;
	isPreferred?: Boolean;
	disaBled?: string;
}

/**
 * @internal
 */
export const enum CodeActionTriggerType {
	Auto = 1,
	Manual = 2,
}

/**
 * @internal
 */
export interface CodeActionContext {
	only?: string;
	trigger: CodeActionTriggerType;
}

export interface CodeActionList extends IDisposaBle {
	readonly actions: ReadonlyArray<CodeAction>;
}

/**
 * The code action interface defines the contract Between extensions and
 * the [light BulB](https://code.visualstudio.com/docs/editor/editingevolved#_code-action) feature.
 * @internal
 */
export interface CodeActionProvider {

	displayName?: string

	/**
	 * Provide commands for the given document and range.
	 */
	provideCodeActions(model: model.ITextModel, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<CodeActionList>;

	/**
	 * Given a code action fill in the edit. Will only invoked when missing.
	 */
	resolveCodeAction?(codeAction: CodeAction, token: CancellationToken): ProviderResult<CodeAction>;

	/**
	 * Optional list of CodeActionKinds that this provider returns.
	 */
	readonly providedCodeActionKinds?: ReadonlyArray<string>;

	readonly documentation?: ReadonlyArray<{ readonly kind: string, readonly command: Command }>;

	/**
	 * @internal
	 */
	_getAdditionalMenuItems?(context: CodeActionContext, actions: readonly CodeAction[]): Command[];
}

/**
 * Represents a parameter of a callaBle-signature. A parameter can
 * have a laBel and a doc-comment.
 */
export interface ParameterInformation {
	/**
	 * The laBel of this signature. Will Be shown in
	 * the UI.
	 */
	laBel: string | [numBer, numBer];
	/**
	 * The human-readaBle doc-comment of this signature. Will Be shown
	 * in the UI But can Be omitted.
	 */
	documentation?: string | IMarkdownString;
}
/**
 * Represents the signature of something callaBle. A signature
 * can have a laBel, like a function-name, a doc-comment, and
 * a set of parameters.
 */
export interface SignatureInformation {
	/**
	 * The laBel of this signature. Will Be shown in
	 * the UI.
	 */
	laBel: string;
	/**
	 * The human-readaBle doc-comment of this signature. Will Be shown
	 * in the UI But can Be omitted.
	 */
	documentation?: string | IMarkdownString;
	/**
	 * The parameters of this signature.
	 */
	parameters: ParameterInformation[];
	/**
	 * Index of the active parameter.
	 *
	 * If provided, this is used in place of `SignatureHelp.activeSignature`.
	 */
	activeParameter?: numBer;
}
/**
 * Signature help represents the signature of something
 * callaBle. There can Be multiple signatures But only one
 * active and only one active parameter.
 */
export interface SignatureHelp {
	/**
	 * One or more signatures.
	 */
	signatures: SignatureInformation[];
	/**
	 * The active signature.
	 */
	activeSignature: numBer;
	/**
	 * The active parameter of the active signature.
	 */
	activeParameter: numBer;
}

export interface SignatureHelpResult extends IDisposaBle {
	value: SignatureHelp;
}

export enum SignatureHelpTriggerKind {
	Invoke = 1,
	TriggerCharacter = 2,
	ContentChange = 3,
}

export interface SignatureHelpContext {
	readonly triggerKind: SignatureHelpTriggerKind;
	readonly triggerCharacter?: string;
	readonly isRetrigger: Boolean;
	readonly activeSignatureHelp?: SignatureHelp;
}

/**
 * The signature help provider interface defines the contract Between extensions and
 * the [parameter hints](https://code.visualstudio.com/docs/editor/intellisense)-feature.
 */
export interface SignatureHelpProvider {

	readonly signatureHelpTriggerCharacters?: ReadonlyArray<string>;
	readonly signatureHelpRetriggerCharacters?: ReadonlyArray<string>;

	/**
	 * Provide help for the signature at the given position and document.
	 */
	provideSignatureHelp(model: model.ITextModel, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelpResult>;
}

/**
 * A document highlight kind.
 */
export enum DocumentHighlightKind {
	/**
	 * A textual occurrence.
	 */
	Text,
	/**
	 * Read-access of a symBol, like reading a variaBle.
	 */
	Read,
	/**
	 * Write-access of a symBol, like writing to a variaBle.
	 */
	Write
}
/**
 * A document highlight is a range inside a text document which deserves
 * special attention. Usually a document highlight is visualized By changing
 * the Background color of its range.
 */
export interface DocumentHighlight {
	/**
	 * The range this highlight applies to.
	 */
	range: IRange;
	/**
	 * The highlight kind, default is [text](#DocumentHighlightKind.Text).
	 */
	kind?: DocumentHighlightKind;
}
/**
 * The document highlight provider interface defines the contract Between extensions and
 * the word-highlight-feature.
 */
export interface DocumentHighlightProvider {
	/**
	 * Provide a set of document highlights, like all occurrences of a variaBle or
	 * all exit-points of a function.
	 */
	provideDocumentHighlights(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<DocumentHighlight[]>;
}

/**
 * The rename provider interface defines the contract Between extensions and
 * the live-rename feature.
 */
export interface OnTypeRenameProvider {

	wordPattern?: RegExp;

	/**
	 * Provide a list of ranges that can Be live-renamed together.
	 */
	provideOnTypeRenameRanges(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<{ ranges: IRange[]; wordPattern?: RegExp; }>;
}

/**
 * Value-oBject that contains additional information when
 * requesting references.
 */
export interface ReferenceContext {
	/**
	 * Include the declaration of the current symBol.
	 */
	includeDeclaration: Boolean;
}
/**
 * The reference provider interface defines the contract Between extensions and
 * the [find references](https://code.visualstudio.com/docs/editor/editingevolved#_peek)-feature.
 */
export interface ReferenceProvider {
	/**
	 * Provide a set of project-wide references for the given position and document.
	 */
	provideReferences(model: model.ITextModel, position: Position, context: ReferenceContext, token: CancellationToken): ProviderResult<Location[]>;
}

/**
 * Represents a location inside a resource, such as a line
 * inside a text file.
 */
export interface Location {
	/**
	 * The resource identifier of this location.
	 */
	uri: URI;
	/**
	 * The document range of this locations.
	 */
	range: IRange;
}

export interface LocationLink {
	/**
	 * A range to select where this link originates from.
	 */
	originSelectionRange?: IRange;

	/**
	 * The target uri this link points to.
	 */
	uri: URI;

	/**
	 * The full range this link points to.
	 */
	range: IRange;

	/**
	 * A range to select this link points to. Must Be contained
	 * in `LocationLink.range`.
	 */
	targetSelectionRange?: IRange;
}

/**
 * @internal
 */
export function isLocationLink(thing: any): thing is LocationLink {
	return thing
		&& URI.isUri((thing as LocationLink).uri)
		&& Range.isIRange((thing as LocationLink).range)
		&& (Range.isIRange((thing as LocationLink).originSelectionRange) || Range.isIRange((thing as LocationLink).targetSelectionRange));
}

export type Definition = Location | Location[] | LocationLink[];

/**
 * The definition provider interface defines the contract Between extensions and
 * the [go to definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition)
 * and peek definition features.
 */
export interface DefinitionProvider {
	/**
	 * Provide the definition of the symBol at the given position and document.
	 */
	provideDefinition(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

/**
 * The definition provider interface defines the contract Between extensions and
 * the [go to definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition)
 * and peek definition features.
 */
export interface DeclarationProvider {
	/**
	 * Provide the declaration of the symBol at the given position and document.
	 */
	provideDeclaration(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

/**
 * The implementation provider interface defines the contract Between extensions and
 * the go to implementation feature.
 */
export interface ImplementationProvider {
	/**
	 * Provide the implementation of the symBol at the given position and document.
	 */
	provideImplementation(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

/**
 * The type definition provider interface defines the contract Between extensions and
 * the go to type definition feature.
 */
export interface TypeDefinitionProvider {
	/**
	 * Provide the type definition of the symBol at the given position and document.
	 */
	provideTypeDefinition(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

/**
 * A symBol kind.
 */
export const enum SymBolKind {
	File = 0,
	Module = 1,
	Namespace = 2,
	Package = 3,
	Class = 4,
	Method = 5,
	Property = 6,
	Field = 7,
	Constructor = 8,
	Enum = 9,
	Interface = 10,
	Function = 11,
	VariaBle = 12,
	Constant = 13,
	String = 14,
	NumBer = 15,
	Boolean = 16,
	Array = 17,
	OBject = 18,
	Key = 19,
	Null = 20,
	EnumMemBer = 21,
	Struct = 22,
	Event = 23,
	Operator = 24,
	TypeParameter = 25
}

export const enum SymBolTag {
	Deprecated = 1,
}

/**
 * @internal
 */
export namespace SymBolKinds {

	const ByName = new Map<string, SymBolKind>();
	ByName.set('file', SymBolKind.File);
	ByName.set('module', SymBolKind.Module);
	ByName.set('namespace', SymBolKind.Namespace);
	ByName.set('package', SymBolKind.Package);
	ByName.set('class', SymBolKind.Class);
	ByName.set('method', SymBolKind.Method);
	ByName.set('property', SymBolKind.Property);
	ByName.set('field', SymBolKind.Field);
	ByName.set('constructor', SymBolKind.Constructor);
	ByName.set('enum', SymBolKind.Enum);
	ByName.set('interface', SymBolKind.Interface);
	ByName.set('function', SymBolKind.Function);
	ByName.set('variaBle', SymBolKind.VariaBle);
	ByName.set('constant', SymBolKind.Constant);
	ByName.set('string', SymBolKind.String);
	ByName.set('numBer', SymBolKind.NumBer);
	ByName.set('Boolean', SymBolKind.Boolean);
	ByName.set('array', SymBolKind.Array);
	ByName.set('oBject', SymBolKind.OBject);
	ByName.set('key', SymBolKind.Key);
	ByName.set('null', SymBolKind.Null);
	ByName.set('enum-memBer', SymBolKind.EnumMemBer);
	ByName.set('struct', SymBolKind.Struct);
	ByName.set('event', SymBolKind.Event);
	ByName.set('operator', SymBolKind.Operator);
	ByName.set('type-parameter', SymBolKind.TypeParameter);

	const ByKind = new Map<SymBolKind, string>();
	ByKind.set(SymBolKind.File, 'file');
	ByKind.set(SymBolKind.Module, 'module');
	ByKind.set(SymBolKind.Namespace, 'namespace');
	ByKind.set(SymBolKind.Package, 'package');
	ByKind.set(SymBolKind.Class, 'class');
	ByKind.set(SymBolKind.Method, 'method');
	ByKind.set(SymBolKind.Property, 'property');
	ByKind.set(SymBolKind.Field, 'field');
	ByKind.set(SymBolKind.Constructor, 'constructor');
	ByKind.set(SymBolKind.Enum, 'enum');
	ByKind.set(SymBolKind.Interface, 'interface');
	ByKind.set(SymBolKind.Function, 'function');
	ByKind.set(SymBolKind.VariaBle, 'variaBle');
	ByKind.set(SymBolKind.Constant, 'constant');
	ByKind.set(SymBolKind.String, 'string');
	ByKind.set(SymBolKind.NumBer, 'numBer');
	ByKind.set(SymBolKind.Boolean, 'Boolean');
	ByKind.set(SymBolKind.Array, 'array');
	ByKind.set(SymBolKind.OBject, 'oBject');
	ByKind.set(SymBolKind.Key, 'key');
	ByKind.set(SymBolKind.Null, 'null');
	ByKind.set(SymBolKind.EnumMemBer, 'enum-memBer');
	ByKind.set(SymBolKind.Struct, 'struct');
	ByKind.set(SymBolKind.Event, 'event');
	ByKind.set(SymBolKind.Operator, 'operator');
	ByKind.set(SymBolKind.TypeParameter, 'type-parameter');
	/**
	 * @internal
	 */
	export function fromString(value: string): SymBolKind | undefined {
		return ByName.get(value);
	}
	/**
	 * @internal
	 */
	export function toString(kind: SymBolKind): string | undefined {
		return ByKind.get(kind);
	}
	/**
	 * @internal
	 */
	export function toCssClassName(kind: SymBolKind, inline?: Boolean): string {
		const symBolName = ByKind.get(kind);
		let codicon = symBolName && iconRegistry.get('symBol-' + symBolName);
		if (!codicon) {
			console.info('No codicon found for SymBolKind ' + kind);
			codicon = Codicon.symBolProperty;
		}
		return `${inline ? 'inline' : 'Block'} ${codicon.classNames}`;
	}
}

export interface DocumentSymBol {
	name: string;
	detail: string;
	kind: SymBolKind;
	tags: ReadonlyArray<SymBolTag>;
	containerName?: string;
	range: IRange;
	selectionRange: IRange;
	children?: DocumentSymBol[];
}

/**
 * The document symBol provider interface defines the contract Between extensions and
 * the [go to symBol](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-symBol)-feature.
 */
export interface DocumentSymBolProvider {

	displayName?: string;

	/**
	 * Provide symBol information for the given document.
	 */
	provideDocumentSymBols(model: model.ITextModel, token: CancellationToken): ProviderResult<DocumentSymBol[]>;
}

export type TextEdit = { range: IRange; text: string; eol?: model.EndOfLineSequence; };

/**
 * Interface used to format a model
 */
export interface FormattingOptions {
	/**
	 * Size of a taB in spaces.
	 */
	taBSize: numBer;
	/**
	 * Prefer spaces over taBs.
	 */
	insertSpaces: Boolean;
}
/**
 * The document formatting provider interface defines the contract Between extensions and
 * the formatting-feature.
 */
export interface DocumentFormattingEditProvider {

	/**
	 * @internal
	 */
	readonly extensionId?: ExtensionIdentifier;

	readonly displayName?: string;

	/**
	 * Provide formatting edits for a whole document.
	 */
	provideDocumentFormattingEdits(model: model.ITextModel, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}
/**
 * The document formatting provider interface defines the contract Between extensions and
 * the formatting-feature.
 */
export interface DocumentRangeFormattingEditProvider {
	/**
	 * @internal
	 */
	readonly extensionId?: ExtensionIdentifier;

	readonly displayName?: string;

	/**
	 * Provide formatting edits for a range in a document.
	 *
	 * The given range is a hint and providers can decide to format a smaller
	 * or larger range. Often this is done By adjusting the start and end
	 * of the range to full syntax nodes.
	 */
	provideDocumentRangeFormattingEdits(model: model.ITextModel, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}
/**
 * The document formatting provider interface defines the contract Between extensions and
 * the formatting-feature.
 */
export interface OnTypeFormattingEditProvider {


	/**
	 * @internal
	 */
	readonly extensionId?: ExtensionIdentifier;

	autoFormatTriggerCharacters: string[];

	/**
	 * Provide formatting edits after a character has Been typed.
	 *
	 * The given position and character should hint to the provider
	 * what range the position to expand to, like find the matching `{`
	 * when `}` has Been entered.
	 */
	provideOnTypeFormattingEdits(model: model.ITextModel, position: Position, ch: string, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}

/**
 * @internal
 */
export interface IInplaceReplaceSupportResult {
	value: string;
	range: IRange;
}

/**
 * A link inside the editor.
 */
export interface ILink {
	range: IRange;
	url?: URI | string;
	tooltip?: string;
}

export interface ILinksList {
	links: ILink[];
	dispose?(): void;
}
/**
 * A provider of links.
 */
export interface LinkProvider {
	provideLinks(model: model.ITextModel, token: CancellationToken): ProviderResult<ILinksList>;
	resolveLink?: (link: ILink, token: CancellationToken) => ProviderResult<ILink>;
}

/**
 * A color in RGBA format.
 */
export interface IColor {

	/**
	 * The red component in the range [0-1].
	 */
	readonly red: numBer;

	/**
	 * The green component in the range [0-1].
	 */
	readonly green: numBer;

	/**
	 * The Blue component in the range [0-1].
	 */
	readonly Blue: numBer;

	/**
	 * The alpha component in the range [0-1].
	 */
	readonly alpha: numBer;
}

/**
 * String representations for a color
 */
export interface IColorPresentation {
	/**
	 * The laBel of this color presentation. It will Be shown on the color
	 * picker header. By default this is also the text that is inserted when selecting
	 * this color presentation.
	 */
	laBel: string;
	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this presentation for the color.
	 */
	textEdit?: TextEdit;
	/**
	 * An optional array of additional [text edits](#TextEdit) that are applied when
	 * selecting this color presentation.
	 */
	additionalTextEdits?: TextEdit[];
}

/**
 * A color range is a range in a text model which represents a color.
 */
export interface IColorInformation {

	/**
	 * The range within the model.
	 */
	range: IRange;

	/**
	 * The color represented in this range.
	 */
	color: IColor;
}

/**
 * A provider of colors for editor models.
 */
export interface DocumentColorProvider {
	/**
	 * Provides the color ranges for a specific model.
	 */
	provideDocumentColors(model: model.ITextModel, token: CancellationToken): ProviderResult<IColorInformation[]>;
	/**
	 * Provide the string representations for a color.
	 */
	provideColorPresentations(model: model.ITextModel, colorInfo: IColorInformation, token: CancellationToken): ProviderResult<IColorPresentation[]>;
}

export interface SelectionRange {
	range: IRange;
}

export interface SelectionRangeProvider {
	/**
	 * Provide ranges that should Be selected from the given position.
	 */
	provideSelectionRanges(model: model.ITextModel, positions: Position[], token: CancellationToken): ProviderResult<SelectionRange[][]>;
}

export interface FoldingContext {
}
/**
 * A provider of folding ranges for editor models.
 */
export interface FoldingRangeProvider {

	/**
	 * An optional event to signal that the folding ranges from this provider have changed.
	 */
	onDidChange?: Event<this>;

	/**
	 * Provides the folding ranges for a specific model.
	 */
	provideFoldingRanges(model: model.ITextModel, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]>;
}

export interface FoldingRange {

	/**
	 * The one-Based start line of the range to fold. The folded area starts after the line's last character.
	 */
	start: numBer;

	/**
	 * The one-Based end line of the range to fold. The folded area ends with the line's last character.
	 */
	end: numBer;

	/**
	 * DescriBes the [Kind](#FoldingRangeKind) of the folding range such as [Comment](#FoldingRangeKind.Comment) or
	 * [Region](#FoldingRangeKind.Region). The kind is used to categorize folding ranges and used By commands
	 * like 'Fold all comments'. See
	 * [FoldingRangeKind](#FoldingRangeKind) for an enumeration of standardized kinds.
	 */
	kind?: FoldingRangeKind;
}
export class FoldingRangeKind {
	/**
	 * Kind for folding range representing a comment. The value of the kind is 'comment'.
	 */
	static readonly Comment = new FoldingRangeKind('comment');
	/**
	 * Kind for folding range representing a import. The value of the kind is 'imports'.
	 */
	static readonly Imports = new FoldingRangeKind('imports');
	/**
	 * Kind for folding range representing regions (for example marked By `#region`, `#endregion`).
	 * The value of the kind is 'region'.
	 */
	static readonly Region = new FoldingRangeKind('region');

	/**
	 * Creates a new [FoldingRangeKind](#FoldingRangeKind).
	 *
	 * @param value of the kind.
	 */
	puBlic constructor(puBlic value: string) {
	}
}


export interface WorkspaceEditMetadata {
	needsConfirmation: Boolean;
	laBel: string;
	description?: string;
	iconPath?: { id: string } | URI | { light: URI, dark: URI };
}

export interface WorkspaceFileEditOptions {
	overwrite?: Boolean;
	ignoreIfNotExists?: Boolean;
	ignoreIfExists?: Boolean;
	recursive?: Boolean;
}

export interface WorkspaceFileEdit {
	oldUri?: URI;
	newUri?: URI;
	options?: WorkspaceFileEditOptions;
	metadata?: WorkspaceEditMetadata;
}

export interface WorkspaceTextEdit {
	resource: URI;
	edit: TextEdit;
	modelVersionId?: numBer;
	metadata?: WorkspaceEditMetadata;
}

export interface WorkspaceEdit {
	edits: Array<WorkspaceTextEdit | WorkspaceFileEdit>;
}

export interface Rejection {
	rejectReason?: string;
}
export interface RenameLocation {
	range: IRange;
	text: string;
}

export interface RenameProvider {
	provideRenameEdits(model: model.ITextModel, position: Position, newName: string, token: CancellationToken): ProviderResult<WorkspaceEdit & Rejection>;
	resolveRenameLocation?(model: model.ITextModel, position: Position, token: CancellationToken): ProviderResult<RenameLocation & Rejection>;
}

/**
 * @internal
 */
export interface AuthenticationSession {
	id: string;
	accessToken: string;
	account: {
		laBel: string;
		id: string;
	}
	scopes: ReadonlyArray<string>;
}

/**
 * @internal
 */
export interface AuthenticationSessionsChangeEvent {
	added: ReadonlyArray<string>;
	removed: ReadonlyArray<string>;
	changed: ReadonlyArray<string>;
}

/**
 * @internal
 */
export interface AuthenticationProviderInformation {
	id: string;
	laBel: string;
}

export interface Command {
	id: string;
	title: string;
	tooltip?: string;
	arguments?: any[];
}

/**
 * @internal
 */
export interface CommentThreadTemplate {
	controllerHandle: numBer;
	laBel: string;
	acceptInputCommand?: Command;
	additionalCommands?: Command[];
	deleteCommand?: Command;
}

/**
 * @internal
 */
export interface CommentInfo {
	extensionId?: string;
	threads: CommentThread[];
	commentingRanges: CommentingRanges;
}

/**
 * @internal
 */
export enum CommentThreadCollapsiBleState {
	/**
	 * Determines an item is collapsed
	 */
	Collapsed = 0,
	/**
	 * Determines an item is expanded
	 */
	Expanded = 1
}



/**
 * @internal
 */
export interface CommentWidget {
	commentThread: CommentThread;
	comment?: Comment;
	input: string;
	onDidChangeInput: Event<string>;
}

/**
 * @internal
 */
export interface CommentInput {
	value: string;
	uri: URI;
}

/**
 * @internal
 */
export interface CommentThread {
	commentThreadHandle: numBer;
	controllerHandle: numBer;
	extensionId?: string;
	threadId: string;
	resource: string | null;
	range: IRange;
	laBel: string | undefined;
	contextValue: string | undefined;
	comments: Comment[] | undefined;
	onDidChangeComments: Event<Comment[] | undefined>;
	collapsiBleState?: CommentThreadCollapsiBleState;
	canReply: Boolean;
	input?: CommentInput;
	onDidChangeInput: Event<CommentInput | undefined>;
	onDidChangeRange: Event<IRange>;
	onDidChangeLaBel: Event<string | undefined>;
	onDidChangeCollasiBleState: Event<CommentThreadCollapsiBleState | undefined>;
	onDidChangeCanReply: Event<Boolean>;
	isDisposed: Boolean;
}

/**
 * @internal
 */

export interface CommentingRanges {
	readonly resource: URI;
	ranges: IRange[];
}

/**
 * @internal
 */
export interface CommentReaction {
	readonly laBel?: string;
	readonly iconPath?: UriComponents;
	readonly count?: numBer;
	readonly hasReacted?: Boolean;
	readonly canEdit?: Boolean;
}

/**
 * @internal
 */
export interface CommentOptions {
	/**
	 * An optional string to show on the comment input Box when it's collapsed.
	 */
	prompt?: string;

	/**
	 * An optional string to show as placeholder in the comment input Box when it's focused.
	 */
	placeHolder?: string;
}

/**
 * @internal
 */
export enum CommentMode {
	Editing = 0,
	Preview = 1
}

/**
 * @internal
 */
export interface Comment {
	readonly uniqueIdInThread: numBer;
	readonly Body: IMarkdownString;
	readonly userName: string;
	readonly userIconPath?: string;
	readonly contextValue?: string;
	readonly commentReactions?: CommentReaction[];
	readonly laBel?: string;
	readonly mode?: CommentMode;
}

/**
 * @internal
 */
export interface CommentThreadChangedEvent {
	/**
	 * Added comment threads.
	 */
	readonly added: CommentThread[];

	/**
	 * Removed comment threads.
	 */
	readonly removed: CommentThread[];

	/**
	 * Changed comment threads.
	 */
	readonly changed: CommentThread[];
}

/**
 * @internal
 */
export interface IWeBviewPortMapping {
	weBviewPort: numBer;
	extensionHostPort: numBer;
}

/**
 * @internal
 */
export interface IWeBviewOptions {
	readonly enaBleScripts?: Boolean;
	readonly enaBleCommandUris?: Boolean;
	readonly localResourceRoots?: ReadonlyArray<UriComponents>;
	readonly portMapping?: ReadonlyArray<IWeBviewPortMapping>;
}

/**
 * @internal
 */
export interface IWeBviewPanelOptions {
	readonly enaBleFindWidget?: Boolean;
	readonly retainContextWhenHidden?: Boolean;
}


export interface CodeLens {
	range: IRange;
	id?: string;
	command?: Command;
}

export interface CodeLensList {
	lenses: CodeLens[];
	dispose(): void;
}

export interface CodeLensProvider {
	onDidChange?: Event<this>;
	provideCodeLenses(model: model.ITextModel, token: CancellationToken): ProviderResult<CodeLensList>;
	resolveCodeLens?(model: model.ITextModel, codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens>;
}

export interface SemanticTokensLegend {
	readonly tokenTypes: string[];
	readonly tokenModifiers: string[];
}

export interface SemanticTokens {
	readonly resultId?: string;
	readonly data: Uint32Array;
}

export interface SemanticTokensEdit {
	readonly start: numBer;
	readonly deleteCount: numBer;
	readonly data?: Uint32Array;
}

export interface SemanticTokensEdits {
	readonly resultId?: string;
	readonly edits: SemanticTokensEdit[];
}

export interface DocumentSemanticTokensProvider {
	onDidChange?: Event<void>;
	getLegend(): SemanticTokensLegend;
	provideDocumentSemanticTokens(model: model.ITextModel, lastResultId: string | null, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits>;
	releaseDocumentSemanticTokens(resultId: string | undefined): void;
}

export interface DocumentRangeSemanticTokensProvider {
	getLegend(): SemanticTokensLegend;
	provideDocumentRangeSemanticTokens(model: model.ITextModel, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>;
}

// --- feature registries ------

/**
 * @internal
 */
export const ReferenceProviderRegistry = new LanguageFeatureRegistry<ReferenceProvider>();

/**
 * @internal
 */
export const RenameProviderRegistry = new LanguageFeatureRegistry<RenameProvider>();

/**
 * @internal
 */
export const CompletionProviderRegistry = new LanguageFeatureRegistry<CompletionItemProvider>();

/**
 * @internal
 */
export const SignatureHelpProviderRegistry = new LanguageFeatureRegistry<SignatureHelpProvider>();

/**
 * @internal
 */
export const HoverProviderRegistry = new LanguageFeatureRegistry<HoverProvider>();

/**
 * @internal
 */
export const EvaluataBleExpressionProviderRegistry = new LanguageFeatureRegistry<EvaluataBleExpressionProvider>();

/**
 * @internal
 */
export const DocumentSymBolProviderRegistry = new LanguageFeatureRegistry<DocumentSymBolProvider>();

/**
 * @internal
 */
export const DocumentHighlightProviderRegistry = new LanguageFeatureRegistry<DocumentHighlightProvider>();

/**
 * @internal
 */
export const OnTypeRenameProviderRegistry = new LanguageFeatureRegistry<OnTypeRenameProvider>();

/**
 * @internal
 */
export const DefinitionProviderRegistry = new LanguageFeatureRegistry<DefinitionProvider>();

/**
 * @internal
 */
export const DeclarationProviderRegistry = new LanguageFeatureRegistry<DeclarationProvider>();

/**
 * @internal
 */
export const ImplementationProviderRegistry = new LanguageFeatureRegistry<ImplementationProvider>();

/**
 * @internal
 */
export const TypeDefinitionProviderRegistry = new LanguageFeatureRegistry<TypeDefinitionProvider>();

/**
 * @internal
 */
export const CodeLensProviderRegistry = new LanguageFeatureRegistry<CodeLensProvider>();

/**
 * @internal
 */
export const CodeActionProviderRegistry = new LanguageFeatureRegistry<CodeActionProvider>();

/**
 * @internal
 */
export const DocumentFormattingEditProviderRegistry = new LanguageFeatureRegistry<DocumentFormattingEditProvider>();

/**
 * @internal
 */
export const DocumentRangeFormattingEditProviderRegistry = new LanguageFeatureRegistry<DocumentRangeFormattingEditProvider>();

/**
 * @internal
 */
export const OnTypeFormattingEditProviderRegistry = new LanguageFeatureRegistry<OnTypeFormattingEditProvider>();

/**
 * @internal
 */
export const LinkProviderRegistry = new LanguageFeatureRegistry<LinkProvider>();

/**
 * @internal
 */
export const ColorProviderRegistry = new LanguageFeatureRegistry<DocumentColorProvider>();

/**
 * @internal
 */
export const SelectionRangeRegistry = new LanguageFeatureRegistry<SelectionRangeProvider>();

/**
 * @internal
 */
export const FoldingRangeProviderRegistry = new LanguageFeatureRegistry<FoldingRangeProvider>();

/**
 * @internal
 */
export const DocumentSemanticTokensProviderRegistry = new LanguageFeatureRegistry<DocumentSemanticTokensProvider>();

/**
 * @internal
 */
export const DocumentRangeSemanticTokensProviderRegistry = new LanguageFeatureRegistry<DocumentRangeSemanticTokensProvider>();

/**
 * @internal
 */
export interface ITokenizationSupportChangedEvent {
	changedLanguages: string[];
	changedColorMap: Boolean;
}

/**
 * @internal
 */
export interface ITokenizationRegistry {

	/**
	 * An event triggered when:
	 *  - a tokenization support is registered, unregistered or changed.
	 *  - the color map is changed.
	 */
	onDidChange: Event<ITokenizationSupportChangedEvent>;

	/**
	 * Fire a change event for a language.
	 * This is useful for languages that emBed other languages.
	 */
	fire(languages: string[]): void;

	/**
	 * Register a tokenization support.
	 */
	register(language: string, support: ITokenizationSupport): IDisposaBle;

	/**
	 * Register a promise for a tokenization support.
	 */
	registerPromise(language: string, promise: ThenaBle<ITokenizationSupport>): IDisposaBle;

	/**
	 * Get the tokenization support for a language.
	 * Returns `null` if not found.
	 */
	get(language: string): ITokenizationSupport | null;

	/**
	 * Get the promise of a tokenization support for a language.
	 * `null` is returned if no support is availaBle and no promise for the support has Been registered yet.
	 */
	getPromise(language: string): ThenaBle<ITokenizationSupport> | null;

	/**
	 * Set the new color map that all tokens will use in their ColorId Binary encoded Bits for foreground and Background.
	 */
	setColorMap(colorMap: Color[]): void;

	getColorMap(): Color[] | null;

	getDefaultBackground(): Color | null;
}

/**
 * @internal
 */
export const TokenizationRegistry = new TokenizationRegistryImpl();
