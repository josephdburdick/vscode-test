/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Color } from 'vs/bAse/common/color';
import { Event } from 'vs/bAse/common/event';
import { IMArkdownString } from 'vs/bAse/common/htmlContent';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { TokenizAtionResult, TokenizAtionResult2 } from 'vs/editor/common/core/token';
import * As model from 'vs/editor/common/model';
import { LAnguAgeFeAtureRegistry } from 'vs/editor/common/modes/lAnguAgeFeAtureRegistry';
import { TokenizAtionRegistryImpl } from 'vs/editor/common/modes/tokenizAtionRegistry';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IMArkerDAtA } from 'vs/plAtform/mArkers/common/mArkers';
import { iconRegistry, Codicon } from 'vs/bAse/common/codicons';

/**
 * Open ended enum At runtime
 * @internAl
 */
export const enum LAnguAgeId {
	Null = 0,
	PlAinText = 1
}

/**
 * @internAl
 */
export clAss LAnguAgeIdentifier {

	/**
	 * A string identifier. Unique Across lAnguAges. e.g. 'jAvAscript'.
	 */
	public reAdonly lAnguAge: string;

	/**
	 * A numeric identifier. Unique Across lAnguAges. e.g. 5
	 * Will vAry At runtime bAsed on registrAtion order, etc.
	 */
	public reAdonly id: LAnguAgeId;

	constructor(lAnguAge: string, id: LAnguAgeId) {
		this.lAnguAge = lAnguAge;
		this.id = id;
	}
}

/**
 * A mode. Will soon be obsolete.
 * @internAl
 */
export interfAce IMode {

	getId(): string;

	getLAnguAgeIdentifier(): LAnguAgeIdentifier;

}

/**
 * A font style. VAlues Are 2^x such thAt A bit mAsk cAn be used.
 * @internAl
 */
export const enum FontStyle {
	NotSet = -1,
	None = 0,
	ItAlic = 1,
	Bold = 2,
	Underline = 4
}

/**
 * Open ended enum At runtime
 * @internAl
 */
export const enum ColorId {
	None = 0,
	DefAultForeground = 1,
	DefAultBAckground = 2
}

/**
 * A stAndArd token type. VAlues Are 2^x such thAt A bit mAsk cAn be used.
 * @internAl
 */
export const enum StAndArdTokenType {
	Other = 0,
	Comment = 1,
	String = 2,
	RegEx = 4
}

/**
 * Helpers to mAnAge the "collApsed" metAdAtA of An entire StAckElement stAck.
 * The following Assumptions hAve been mAde:
 *  - lAnguAgeId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binAry formAt is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LAnguAgeId (8 bits)
 *  - T = StAndArdTokenType (3 bits)
 *  - F = FontStyle (3 bits)
 *  - f = foreground color (9 bits)
 *  - b = bAckground color (9 bits)
 *
 * @internAl
 */
export const enum MetAdAtAConsts {
	LANGUAGEID_MASK = 0b00000000000000000000000011111111,
	TOKEN_TYPE_MASK = 0b00000000000000000000011100000000,
	FONT_STYLE_MASK = 0b00000000000000000011100000000000,
	FOREGROUND_MASK = 0b00000000011111111100000000000000,
	BACKGROUND_MASK = 0b11111111100000000000000000000000,

	ITALIC_MASK = 0b00000000000000000000100000000000,
	BOLD_MASK = 0b00000000000000000001000000000000,
	UNDERLINE_MASK = 0b00000000000000000010000000000000,

	SEMANTIC_USE_ITALIC = 0b00000000000000000000000000000001,
	SEMANTIC_USE_BOLD = 0b00000000000000000000000000000010,
	SEMANTIC_USE_UNDERLINE = 0b00000000000000000000000000000100,
	SEMANTIC_USE_FOREGROUND = 0b00000000000000000000000000001000,
	SEMANTIC_USE_BACKGROUND = 0b00000000000000000000000000010000,

	LANGUAGEID_OFFSET = 0,
	TOKEN_TYPE_OFFSET = 8,
	FONT_STYLE_OFFSET = 11,
	FOREGROUND_OFFSET = 14,
	BACKGROUND_OFFSET = 23
}

/**
 * @internAl
 */
export clAss TokenMetAdAtA {

	public stAtic getLAnguAgeId(metAdAtA: number): LAnguAgeId {
		return (metAdAtA & MetAdAtAConsts.LANGUAGEID_MASK) >>> MetAdAtAConsts.LANGUAGEID_OFFSET;
	}

	public stAtic getTokenType(metAdAtA: number): StAndArdTokenType {
		return (metAdAtA & MetAdAtAConsts.TOKEN_TYPE_MASK) >>> MetAdAtAConsts.TOKEN_TYPE_OFFSET;
	}

	public stAtic getFontStyle(metAdAtA: number): FontStyle {
		return (metAdAtA & MetAdAtAConsts.FONT_STYLE_MASK) >>> MetAdAtAConsts.FONT_STYLE_OFFSET;
	}

	public stAtic getForeground(metAdAtA: number): ColorId {
		return (metAdAtA & MetAdAtAConsts.FOREGROUND_MASK) >>> MetAdAtAConsts.FOREGROUND_OFFSET;
	}

	public stAtic getBAckground(metAdAtA: number): ColorId {
		return (metAdAtA & MetAdAtAConsts.BACKGROUND_MASK) >>> MetAdAtAConsts.BACKGROUND_OFFSET;
	}

	public stAtic getClAssNAmeFromMetAdAtA(metAdAtA: number): string {
		let foreground = this.getForeground(metAdAtA);
		let clAssNAme = 'mtk' + foreground;

		let fontStyle = this.getFontStyle(metAdAtA);
		if (fontStyle & FontStyle.ItAlic) {
			clAssNAme += ' mtki';
		}
		if (fontStyle & FontStyle.Bold) {
			clAssNAme += ' mtkb';
		}
		if (fontStyle & FontStyle.Underline) {
			clAssNAme += ' mtku';
		}

		return clAssNAme;
	}

	public stAtic getInlineStyleFromMetAdAtA(metAdAtA: number, colorMAp: string[]): string {
		const foreground = this.getForeground(metAdAtA);
		const fontStyle = this.getFontStyle(metAdAtA);

		let result = `color: ${colorMAp[foreground]};`;
		if (fontStyle & FontStyle.ItAlic) {
			result += 'font-style: itAlic;';
		}
		if (fontStyle & FontStyle.Bold) {
			result += 'font-weight: bold;';
		}
		if (fontStyle & FontStyle.Underline) {
			result += 'text-decorAtion: underline;';
		}
		return result;
	}
}

/**
 * @internAl
 */
export interfAce ITokenizAtionSupport {

	getInitiAlStAte(): IStAte;

	// Add offsetDeltA to eAch of the returned indices
	tokenize(line: string, stAte: IStAte, offsetDeltA: number): TokenizAtionResult;

	tokenize2(line: string, stAte: IStAte, offsetDeltA: number): TokenizAtionResult2;
}

/**
 * The stAte of the tokenizer between two lines.
 * It is useful to store flAgs such As in multiline comment, etc.
 * The model will clone the previous line's stAte And pAss it in to tokenize the next line.
 */
export interfAce IStAte {
	clone(): IStAte;
	equAls(other: IStAte): booleAn;
}

/**
 * A provider result represents the vAlues A provider, like the [`HoverProvider`](#HoverProvider),
 * mAy return. For once this is the ActuAl result type `T`, like `Hover`, or A thenAble thAt resolves
 * to thAt type `T`. In Addition, `null` And `undefined` cAn be returned - either directly or from A
 * thenAble.
 */
export type ProviderResult<T> = T | undefined | null | ThenAble<T | undefined | null>;

/**
 * A hover represents AdditionAl informAtion for A symbol or word. Hovers Are
 * rendered in A tooltip-like widget.
 */
export interfAce Hover {
	/**
	 * The contents of this hover.
	 */
	contents: IMArkdownString[];

	/**
	 * The rAnge to which this hover Applies. When missing, the
	 * editor will use the rAnge At the current position or the
	 * current position itself.
	 */
	rAnge?: IRAnge;
}

/**
 * The hover provider interfAce defines the contrAct between extensions And
 * the [hover](https://code.visuAlstudio.com/docs/editor/intellisense)-feAture.
 */
export interfAce HoverProvider {
	/**
	 * Provide A hover for the given position And document. Multiple hovers At the sAme
	 * position will be merged by the editor. A hover cAn hAve A rAnge which defAults
	 * to the word rAnge At the position when omitted.
	 */
	provideHover(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Hover>;
}

/**
 * An evAluAtAble expression represents AdditionAl informAtion for An expression in A document. EvAluAtAble expression Are
 * evAluAted by A debugger or runtime And their result is rendered in A tooltip-like widget.
 * @internAl
 */
export interfAce EvAluAtAbleExpression {
	/**
	 * The rAnge to which this expression Applies.
	 */
	rAnge: IRAnge;
	/*
	 * This expression overrides the expression extrActed from the rAnge.
	 */
	expression?: string;
}

/**
 * The hover provider interfAce defines the contrAct between extensions And
 * the [hover](https://code.visuAlstudio.com/docs/editor/intellisense)-feAture.
 * @internAl
 */
export interfAce EvAluAtAbleExpressionProvider {
	/**
	 * Provide A hover for the given position And document. Multiple hovers At the sAme
	 * position will be merged by the editor. A hover cAn hAve A rAnge which defAults
	 * to the word rAnge At the position when omitted.
	 */
	provideEvAluAtAbleExpression(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<EvAluAtAbleExpression>;
}

export const enum CompletionItemKind {
	Method,
	Function,
	Constructor,
	Field,
	VAriAble,
	ClAss,
	Struct,
	InterfAce,
	Module,
	Property,
	Event,
	OperAtor,
	Unit,
	VAlue,
	ConstAnt,
	Enum,
	EnumMember,
	Keyword,
	Text,
	Color,
	File,
	Reference,
	Customcolor,
	Folder,
	TypePArAmeter,
	User,
	Issue,
	Snippet, // <- highest vAlue (used for compAre!)
}

/**
 * @internAl
 */
export const completionKindToCssClAss = (function () {
	let dAtA = Object.creAte(null);
	dAtA[CompletionItemKind.Method] = 'symbol-method';
	dAtA[CompletionItemKind.Function] = 'symbol-function';
	dAtA[CompletionItemKind.Constructor] = 'symbol-constructor';
	dAtA[CompletionItemKind.Field] = 'symbol-field';
	dAtA[CompletionItemKind.VAriAble] = 'symbol-vAriAble';
	dAtA[CompletionItemKind.ClAss] = 'symbol-clAss';
	dAtA[CompletionItemKind.Struct] = 'symbol-struct';
	dAtA[CompletionItemKind.InterfAce] = 'symbol-interfAce';
	dAtA[CompletionItemKind.Module] = 'symbol-module';
	dAtA[CompletionItemKind.Property] = 'symbol-property';
	dAtA[CompletionItemKind.Event] = 'symbol-event';
	dAtA[CompletionItemKind.OperAtor] = 'symbol-operAtor';
	dAtA[CompletionItemKind.Unit] = 'symbol-unit';
	dAtA[CompletionItemKind.VAlue] = 'symbol-vAlue';
	dAtA[CompletionItemKind.ConstAnt] = 'symbol-constAnt';
	dAtA[CompletionItemKind.Enum] = 'symbol-enum';
	dAtA[CompletionItemKind.EnumMember] = 'symbol-enum-member';
	dAtA[CompletionItemKind.Keyword] = 'symbol-keyword';
	dAtA[CompletionItemKind.Snippet] = 'symbol-snippet';
	dAtA[CompletionItemKind.Text] = 'symbol-text';
	dAtA[CompletionItemKind.Color] = 'symbol-color';
	dAtA[CompletionItemKind.File] = 'symbol-file';
	dAtA[CompletionItemKind.Reference] = 'symbol-reference';
	dAtA[CompletionItemKind.Customcolor] = 'symbol-customcolor';
	dAtA[CompletionItemKind.Folder] = 'symbol-folder';
	dAtA[CompletionItemKind.TypePArAmeter] = 'symbol-type-pArAmeter';
	dAtA[CompletionItemKind.User] = 'Account';
	dAtA[CompletionItemKind.Issue] = 'issues';

	return function (kind: CompletionItemKind): string {
		const nAme = dAtA[kind];
		let codicon = nAme && iconRegistry.get(nAme);
		if (!codicon) {
			console.info('No codicon found for CompletionItemKind ' + kind);
			codicon = Codicon.symbolProperty;
		}
		return codicon.clAssNAmes;
	};
})();

/**
 * @internAl
 */
export let completionKindFromString: {
	(vAlue: string): CompletionItemKind;
	(vAlue: string, strict: true): CompletionItemKind | undefined;
} = (function () {
	let dAtA: Record<string, CompletionItemKind> = Object.creAte(null);
	dAtA['method'] = CompletionItemKind.Method;
	dAtA['function'] = CompletionItemKind.Function;
	dAtA['constructor'] = <Any>CompletionItemKind.Constructor;
	dAtA['field'] = CompletionItemKind.Field;
	dAtA['vAriAble'] = CompletionItemKind.VAriAble;
	dAtA['clAss'] = CompletionItemKind.ClAss;
	dAtA['struct'] = CompletionItemKind.Struct;
	dAtA['interfAce'] = CompletionItemKind.InterfAce;
	dAtA['module'] = CompletionItemKind.Module;
	dAtA['property'] = CompletionItemKind.Property;
	dAtA['event'] = CompletionItemKind.Event;
	dAtA['operAtor'] = CompletionItemKind.OperAtor;
	dAtA['unit'] = CompletionItemKind.Unit;
	dAtA['vAlue'] = CompletionItemKind.VAlue;
	dAtA['constAnt'] = CompletionItemKind.ConstAnt;
	dAtA['enum'] = CompletionItemKind.Enum;
	dAtA['enum-member'] = CompletionItemKind.EnumMember;
	dAtA['enumMember'] = CompletionItemKind.EnumMember;
	dAtA['keyword'] = CompletionItemKind.Keyword;
	dAtA['snippet'] = CompletionItemKind.Snippet;
	dAtA['text'] = CompletionItemKind.Text;
	dAtA['color'] = CompletionItemKind.Color;
	dAtA['file'] = CompletionItemKind.File;
	dAtA['reference'] = CompletionItemKind.Reference;
	dAtA['customcolor'] = CompletionItemKind.Customcolor;
	dAtA['folder'] = CompletionItemKind.Folder;
	dAtA['type-pArAmeter'] = CompletionItemKind.TypePArAmeter;
	dAtA['typePArAmeter'] = CompletionItemKind.TypePArAmeter;
	dAtA['Account'] = CompletionItemKind.User;
	dAtA['issue'] = CompletionItemKind.Issue;
	return function (vAlue: string, strict?: true) {
		let res = dAtA[vAlue];
		if (typeof res === 'undefined' && !strict) {
			res = CompletionItemKind.Property;
		}
		return res;
	};
})();

export interfAce CompletionItemLAbel {
	/**
	 * The function or vAriAble. Rendered leftmost.
	 */
	nAme: string;

	/**
	 * The pArAmeters without the return type. Render After `nAme`.
	 */
	pArAmeters?: string;

	/**
	 * The fully quAlified nAme, like pAckAge nAme or file pAth. Rendered After `signAture`.
	 */
	quAlifier?: string;

	/**
	 * The return-type of A function or type of A property/vAriAble. Rendered rightmost.
	 */
	type?: string;
}

export const enum CompletionItemTAg {
	DeprecAted = 1
}

export const enum CompletionItemInsertTextRule {
	/**
	 * Adjust whitespAce/indentAtion of multiline insert texts to
	 * mAtch the current line indentAtion.
	 */
	KeepWhitespAce = 0b001,

	/**
	 * `insertText` is A snippet.
	 */
	InsertAsSnippet = 0b100,
}

/**
 * A completion item represents A text snippet thAt is
 * proposed to complete text thAt is being typed.
 */
export interfAce CompletionItem {
	/**
	 * The lAbel of this completion item. By defAult
	 * this is Also the text thAt is inserted when selecting
	 * this completion.
	 */
	lAbel: string | CompletionItemLAbel;
	/**
	 * The kind of this completion item. BAsed on the kind
	 * An icon is chosen by the editor.
	 */
	kind: CompletionItemKind;
	/**
	 * A modifier to the `kind` which Affect how the item
	 * is rendered, e.g. DeprecAted is rendered with A strikeout
	 */
	tAgs?: ReAdonlyArrAy<CompletionItemTAg>;
	/**
	 * A humAn-reAdAble string with AdditionAl informAtion
	 * About this item, like type or symbol informAtion.
	 */
	detAil?: string;
	/**
	 * A humAn-reAdAble string thAt represents A doc-comment.
	 */
	documentAtion?: string | IMArkdownString;
	/**
	 * A string thAt should be used when compAring this item
	 * with other items. When `fAlsy` the [lAbel](#CompletionItem.lAbel)
	 * is used.
	 */
	sortText?: string;
	/**
	 * A string thAt should be used when filtering A set of
	 * completion items. When `fAlsy` the [lAbel](#CompletionItem.lAbel)
	 * is used.
	 */
	filterText?: string;
	/**
	 * Select this item when showing. *Note* thAt only one completion item cAn be selected And
	 * thAt the editor decides which item thAt is. The rule is thAt the *first* item of those
	 * thAt mAtch best is selected.
	 */
	preselect?: booleAn;
	/**
	 * A string or snippet thAt should be inserted in A document when selecting
	 * this completion.
	 * is used.
	 */
	insertText: string;
	/**
	 * Addition rules (As bitmAsk) thAt should be Applied when inserting
	 * this completion.
	 */
	insertTextRules?: CompletionItemInsertTextRule;
	/**
	 * A rAnge of text thAt should be replAced by this completion item.
	 *
	 * DefAults to A rAnge from the stArt of the [current word](#TextDocument.getWordRAngeAtPosition) to the
	 * current position.
	 *
	 * *Note:* The rAnge must be A [single line](#RAnge.isSingleLine) And it must
	 * [contAin](#RAnge.contAins) the position At which completion hAs been [requested](#CompletionItemProvider.provideCompletionItems).
	 */
	rAnge: IRAnge | { insert: IRAnge, replAce: IRAnge };
	/**
	 * An optionAl set of chArActers thAt when pressed while this completion is Active will Accept it first And
	 * then type thAt chArActer. *Note* thAt All commit chArActers should hAve `length=1` And thAt superfluous
	 * chArActers will be ignored.
	 */
	commitChArActers?: string[];
	/**
	 * An optionAl ArrAy of AdditionAl text edits thAt Are Applied when
	 * selecting this completion. Edits must not overlAp with the mAin edit
	 * nor with themselves.
	 */
	AdditionAlTextEdits?: model.ISingleEditOperAtion[];
	/**
	 * A commAnd thAt should be run upon AcceptAnce of this item.
	 */
	commAnd?: CommAnd;

	/**
	 * @internAl
	 */
	_id?: [number, number];
}

export interfAce CompletionList {
	suggestions: CompletionItem[];
	incomplete?: booleAn;
	dispose?(): void;
}

/**
 * How A suggest provider wAs triggered.
 */
export const enum CompletionTriggerKind {
	Invoke = 0,
	TriggerChArActer = 1,
	TriggerForIncompleteCompletions = 2
}
/**
 * ContAins AdditionAl informAtion About the context in which
 * [completion provider](#CompletionItemProvider.provideCompletionItems) is triggered.
 */
export interfAce CompletionContext {
	/**
	 * How the completion wAs triggered.
	 */
	triggerKind: CompletionTriggerKind;
	/**
	 * ChArActer thAt triggered the completion item provider.
	 *
	 * `undefined` if provider wAs not triggered by A chArActer.
	 */
	triggerChArActer?: string;
}
/**
 * The completion item provider interfAce defines the contrAct between extensions And
 * the [IntelliSense](https://code.visuAlstudio.com/docs/editor/intellisense).
 *
 * When computing *complete* completion items is expensive, providers cAn optionAlly implement
 * the `resolveCompletionItem`-function. In thAt cAse it is enough to return completion
 * items with A [lAbel](#CompletionItem.lAbel) from the
 * [provideCompletionItems](#CompletionItemProvider.provideCompletionItems)-function. Subsequently,
 * when A completion item is shown in the UI And gAins focus this provider is Asked to resolve
 * the item, like Adding [doc-comment](#CompletionItem.documentAtion) or [detAils](#CompletionItem.detAil).
 */
export interfAce CompletionItemProvider {

	/**
	 * @internAl
	 */
	_debugDisplAyNAme?: string;

	triggerChArActers?: string[];
	/**
	 * Provide completion items for the given position And document.
	 */
	provideCompletionItems(model: model.ITextModel, position: Position, context: CompletionContext, token: CAncellAtionToken): ProviderResult<CompletionList>;

	/**
	 * Given A completion item fill in more dAtA, like [doc-comment](#CompletionItem.documentAtion)
	 * or [detAils](#CompletionItem.detAil).
	 *
	 * The editor will only resolve A completion item once.
	 */
	resolveCompletionItem?(item: CompletionItem, token: CAncellAtionToken): ProviderResult<CompletionItem>;
}

export interfAce CodeAction {
	title: string;
	commAnd?: CommAnd;
	edit?: WorkspAceEdit;
	diAgnostics?: IMArkerDAtA[];
	kind?: string;
	isPreferred?: booleAn;
	disAbled?: string;
}

/**
 * @internAl
 */
export const enum CodeActionTriggerType {
	Auto = 1,
	MAnuAl = 2,
}

/**
 * @internAl
 */
export interfAce CodeActionContext {
	only?: string;
	trigger: CodeActionTriggerType;
}

export interfAce CodeActionList extends IDisposAble {
	reAdonly Actions: ReAdonlyArrAy<CodeAction>;
}

/**
 * The code Action interfAce defines the contrAct between extensions And
 * the [light bulb](https://code.visuAlstudio.com/docs/editor/editingevolved#_code-Action) feAture.
 * @internAl
 */
export interfAce CodeActionProvider {

	displAyNAme?: string

	/**
	 * Provide commAnds for the given document And rAnge.
	 */
	provideCodeActions(model: model.ITextModel, rAnge: RAnge | Selection, context: CodeActionContext, token: CAncellAtionToken): ProviderResult<CodeActionList>;

	/**
	 * Given A code Action fill in the edit. Will only invoked when missing.
	 */
	resolveCodeAction?(codeAction: CodeAction, token: CAncellAtionToken): ProviderResult<CodeAction>;

	/**
	 * OptionAl list of CodeActionKinds thAt this provider returns.
	 */
	reAdonly providedCodeActionKinds?: ReAdonlyArrAy<string>;

	reAdonly documentAtion?: ReAdonlyArrAy<{ reAdonly kind: string, reAdonly commAnd: CommAnd }>;

	/**
	 * @internAl
	 */
	_getAdditionAlMenuItems?(context: CodeActionContext, Actions: reAdonly CodeAction[]): CommAnd[];
}

/**
 * Represents A pArAmeter of A cAllAble-signAture. A pArAmeter cAn
 * hAve A lAbel And A doc-comment.
 */
export interfAce PArAmeterInformAtion {
	/**
	 * The lAbel of this signAture. Will be shown in
	 * the UI.
	 */
	lAbel: string | [number, number];
	/**
	 * The humAn-reAdAble doc-comment of this signAture. Will be shown
	 * in the UI but cAn be omitted.
	 */
	documentAtion?: string | IMArkdownString;
}
/**
 * Represents the signAture of something cAllAble. A signAture
 * cAn hAve A lAbel, like A function-nAme, A doc-comment, And
 * A set of pArAmeters.
 */
export interfAce SignAtureInformAtion {
	/**
	 * The lAbel of this signAture. Will be shown in
	 * the UI.
	 */
	lAbel: string;
	/**
	 * The humAn-reAdAble doc-comment of this signAture. Will be shown
	 * in the UI but cAn be omitted.
	 */
	documentAtion?: string | IMArkdownString;
	/**
	 * The pArAmeters of this signAture.
	 */
	pArAmeters: PArAmeterInformAtion[];
	/**
	 * Index of the Active pArAmeter.
	 *
	 * If provided, this is used in plAce of `SignAtureHelp.ActiveSignAture`.
	 */
	ActivePArAmeter?: number;
}
/**
 * SignAture help represents the signAture of something
 * cAllAble. There cAn be multiple signAtures but only one
 * Active And only one Active pArAmeter.
 */
export interfAce SignAtureHelp {
	/**
	 * One or more signAtures.
	 */
	signAtures: SignAtureInformAtion[];
	/**
	 * The Active signAture.
	 */
	ActiveSignAture: number;
	/**
	 * The Active pArAmeter of the Active signAture.
	 */
	ActivePArAmeter: number;
}

export interfAce SignAtureHelpResult extends IDisposAble {
	vAlue: SignAtureHelp;
}

export enum SignAtureHelpTriggerKind {
	Invoke = 1,
	TriggerChArActer = 2,
	ContentChAnge = 3,
}

export interfAce SignAtureHelpContext {
	reAdonly triggerKind: SignAtureHelpTriggerKind;
	reAdonly triggerChArActer?: string;
	reAdonly isRetrigger: booleAn;
	reAdonly ActiveSignAtureHelp?: SignAtureHelp;
}

/**
 * The signAture help provider interfAce defines the contrAct between extensions And
 * the [pArAmeter hints](https://code.visuAlstudio.com/docs/editor/intellisense)-feAture.
 */
export interfAce SignAtureHelpProvider {

	reAdonly signAtureHelpTriggerChArActers?: ReAdonlyArrAy<string>;
	reAdonly signAtureHelpRetriggerChArActers?: ReAdonlyArrAy<string>;

	/**
	 * Provide help for the signAture At the given position And document.
	 */
	provideSignAtureHelp(model: model.ITextModel, position: Position, token: CAncellAtionToken, context: SignAtureHelpContext): ProviderResult<SignAtureHelpResult>;
}

/**
 * A document highlight kind.
 */
export enum DocumentHighlightKind {
	/**
	 * A textuAl occurrence.
	 */
	Text,
	/**
	 * ReAd-Access of A symbol, like reAding A vAriAble.
	 */
	ReAd,
	/**
	 * Write-Access of A symbol, like writing to A vAriAble.
	 */
	Write
}
/**
 * A document highlight is A rAnge inside A text document which deserves
 * speciAl Attention. UsuAlly A document highlight is visuAlized by chAnging
 * the bAckground color of its rAnge.
 */
export interfAce DocumentHighlight {
	/**
	 * The rAnge this highlight Applies to.
	 */
	rAnge: IRAnge;
	/**
	 * The highlight kind, defAult is [text](#DocumentHighlightKind.Text).
	 */
	kind?: DocumentHighlightKind;
}
/**
 * The document highlight provider interfAce defines the contrAct between extensions And
 * the word-highlight-feAture.
 */
export interfAce DocumentHighlightProvider {
	/**
	 * Provide A set of document highlights, like All occurrences of A vAriAble or
	 * All exit-points of A function.
	 */
	provideDocumentHighlights(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<DocumentHighlight[]>;
}

/**
 * The renAme provider interfAce defines the contrAct between extensions And
 * the live-renAme feAture.
 */
export interfAce OnTypeRenAmeProvider {

	wordPAttern?: RegExp;

	/**
	 * Provide A list of rAnges thAt cAn be live-renAmed together.
	 */
	provideOnTypeRenAmeRAnges(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<{ rAnges: IRAnge[]; wordPAttern?: RegExp; }>;
}

/**
 * VAlue-object thAt contAins AdditionAl informAtion when
 * requesting references.
 */
export interfAce ReferenceContext {
	/**
	 * Include the declArAtion of the current symbol.
	 */
	includeDeclArAtion: booleAn;
}
/**
 * The reference provider interfAce defines the contrAct between extensions And
 * the [find references](https://code.visuAlstudio.com/docs/editor/editingevolved#_peek)-feAture.
 */
export interfAce ReferenceProvider {
	/**
	 * Provide A set of project-wide references for the given position And document.
	 */
	provideReferences(model: model.ITextModel, position: Position, context: ReferenceContext, token: CAncellAtionToken): ProviderResult<LocAtion[]>;
}

/**
 * Represents A locAtion inside A resource, such As A line
 * inside A text file.
 */
export interfAce LocAtion {
	/**
	 * The resource identifier of this locAtion.
	 */
	uri: URI;
	/**
	 * The document rAnge of this locAtions.
	 */
	rAnge: IRAnge;
}

export interfAce LocAtionLink {
	/**
	 * A rAnge to select where this link originAtes from.
	 */
	originSelectionRAnge?: IRAnge;

	/**
	 * The tArget uri this link points to.
	 */
	uri: URI;

	/**
	 * The full rAnge this link points to.
	 */
	rAnge: IRAnge;

	/**
	 * A rAnge to select this link points to. Must be contAined
	 * in `LocAtionLink.rAnge`.
	 */
	tArgetSelectionRAnge?: IRAnge;
}

/**
 * @internAl
 */
export function isLocAtionLink(thing: Any): thing is LocAtionLink {
	return thing
		&& URI.isUri((thing As LocAtionLink).uri)
		&& RAnge.isIRAnge((thing As LocAtionLink).rAnge)
		&& (RAnge.isIRAnge((thing As LocAtionLink).originSelectionRAnge) || RAnge.isIRAnge((thing As LocAtionLink).tArgetSelectionRAnge));
}

export type Definition = LocAtion | LocAtion[] | LocAtionLink[];

/**
 * The definition provider interfAce defines the contrAct between extensions And
 * the [go to definition](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-definition)
 * And peek definition feAtures.
 */
export interfAce DefinitionProvider {
	/**
	 * Provide the definition of the symbol At the given position And document.
	 */
	provideDefinition(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
}

/**
 * The definition provider interfAce defines the contrAct between extensions And
 * the [go to definition](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-definition)
 * And peek definition feAtures.
 */
export interfAce DeclArAtionProvider {
	/**
	 * Provide the declArAtion of the symbol At the given position And document.
	 */
	provideDeclArAtion(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
}

/**
 * The implementAtion provider interfAce defines the contrAct between extensions And
 * the go to implementAtion feAture.
 */
export interfAce ImplementAtionProvider {
	/**
	 * Provide the implementAtion of the symbol At the given position And document.
	 */
	provideImplementAtion(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
}

/**
 * The type definition provider interfAce defines the contrAct between extensions And
 * the go to type definition feAture.
 */
export interfAce TypeDefinitionProvider {
	/**
	 * Provide the type definition of the symbol At the given position And document.
	 */
	provideTypeDefinition(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
}

/**
 * A symbol kind.
 */
export const enum SymbolKind {
	File = 0,
	Module = 1,
	NAmespAce = 2,
	PAckAge = 3,
	ClAss = 4,
	Method = 5,
	Property = 6,
	Field = 7,
	Constructor = 8,
	Enum = 9,
	InterfAce = 10,
	Function = 11,
	VAriAble = 12,
	ConstAnt = 13,
	String = 14,
	Number = 15,
	BooleAn = 16,
	ArrAy = 17,
	Object = 18,
	Key = 19,
	Null = 20,
	EnumMember = 21,
	Struct = 22,
	Event = 23,
	OperAtor = 24,
	TypePArAmeter = 25
}

export const enum SymbolTAg {
	DeprecAted = 1,
}

/**
 * @internAl
 */
export nAmespAce SymbolKinds {

	const byNAme = new MAp<string, SymbolKind>();
	byNAme.set('file', SymbolKind.File);
	byNAme.set('module', SymbolKind.Module);
	byNAme.set('nAmespAce', SymbolKind.NAmespAce);
	byNAme.set('pAckAge', SymbolKind.PAckAge);
	byNAme.set('clAss', SymbolKind.ClAss);
	byNAme.set('method', SymbolKind.Method);
	byNAme.set('property', SymbolKind.Property);
	byNAme.set('field', SymbolKind.Field);
	byNAme.set('constructor', SymbolKind.Constructor);
	byNAme.set('enum', SymbolKind.Enum);
	byNAme.set('interfAce', SymbolKind.InterfAce);
	byNAme.set('function', SymbolKind.Function);
	byNAme.set('vAriAble', SymbolKind.VAriAble);
	byNAme.set('constAnt', SymbolKind.ConstAnt);
	byNAme.set('string', SymbolKind.String);
	byNAme.set('number', SymbolKind.Number);
	byNAme.set('booleAn', SymbolKind.BooleAn);
	byNAme.set('ArrAy', SymbolKind.ArrAy);
	byNAme.set('object', SymbolKind.Object);
	byNAme.set('key', SymbolKind.Key);
	byNAme.set('null', SymbolKind.Null);
	byNAme.set('enum-member', SymbolKind.EnumMember);
	byNAme.set('struct', SymbolKind.Struct);
	byNAme.set('event', SymbolKind.Event);
	byNAme.set('operAtor', SymbolKind.OperAtor);
	byNAme.set('type-pArAmeter', SymbolKind.TypePArAmeter);

	const byKind = new MAp<SymbolKind, string>();
	byKind.set(SymbolKind.File, 'file');
	byKind.set(SymbolKind.Module, 'module');
	byKind.set(SymbolKind.NAmespAce, 'nAmespAce');
	byKind.set(SymbolKind.PAckAge, 'pAckAge');
	byKind.set(SymbolKind.ClAss, 'clAss');
	byKind.set(SymbolKind.Method, 'method');
	byKind.set(SymbolKind.Property, 'property');
	byKind.set(SymbolKind.Field, 'field');
	byKind.set(SymbolKind.Constructor, 'constructor');
	byKind.set(SymbolKind.Enum, 'enum');
	byKind.set(SymbolKind.InterfAce, 'interfAce');
	byKind.set(SymbolKind.Function, 'function');
	byKind.set(SymbolKind.VAriAble, 'vAriAble');
	byKind.set(SymbolKind.ConstAnt, 'constAnt');
	byKind.set(SymbolKind.String, 'string');
	byKind.set(SymbolKind.Number, 'number');
	byKind.set(SymbolKind.BooleAn, 'booleAn');
	byKind.set(SymbolKind.ArrAy, 'ArrAy');
	byKind.set(SymbolKind.Object, 'object');
	byKind.set(SymbolKind.Key, 'key');
	byKind.set(SymbolKind.Null, 'null');
	byKind.set(SymbolKind.EnumMember, 'enum-member');
	byKind.set(SymbolKind.Struct, 'struct');
	byKind.set(SymbolKind.Event, 'event');
	byKind.set(SymbolKind.OperAtor, 'operAtor');
	byKind.set(SymbolKind.TypePArAmeter, 'type-pArAmeter');
	/**
	 * @internAl
	 */
	export function fromString(vAlue: string): SymbolKind | undefined {
		return byNAme.get(vAlue);
	}
	/**
	 * @internAl
	 */
	export function toString(kind: SymbolKind): string | undefined {
		return byKind.get(kind);
	}
	/**
	 * @internAl
	 */
	export function toCssClAssNAme(kind: SymbolKind, inline?: booleAn): string {
		const symbolNAme = byKind.get(kind);
		let codicon = symbolNAme && iconRegistry.get('symbol-' + symbolNAme);
		if (!codicon) {
			console.info('No codicon found for SymbolKind ' + kind);
			codicon = Codicon.symbolProperty;
		}
		return `${inline ? 'inline' : 'block'} ${codicon.clAssNAmes}`;
	}
}

export interfAce DocumentSymbol {
	nAme: string;
	detAil: string;
	kind: SymbolKind;
	tAgs: ReAdonlyArrAy<SymbolTAg>;
	contAinerNAme?: string;
	rAnge: IRAnge;
	selectionRAnge: IRAnge;
	children?: DocumentSymbol[];
}

/**
 * The document symbol provider interfAce defines the contrAct between extensions And
 * the [go to symbol](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-symbol)-feAture.
 */
export interfAce DocumentSymbolProvider {

	displAyNAme?: string;

	/**
	 * Provide symbol informAtion for the given document.
	 */
	provideDocumentSymbols(model: model.ITextModel, token: CAncellAtionToken): ProviderResult<DocumentSymbol[]>;
}

export type TextEdit = { rAnge: IRAnge; text: string; eol?: model.EndOfLineSequence; };

/**
 * InterfAce used to formAt A model
 */
export interfAce FormAttingOptions {
	/**
	 * Size of A tAb in spAces.
	 */
	tAbSize: number;
	/**
	 * Prefer spAces over tAbs.
	 */
	insertSpAces: booleAn;
}
/**
 * The document formAtting provider interfAce defines the contrAct between extensions And
 * the formAtting-feAture.
 */
export interfAce DocumentFormAttingEditProvider {

	/**
	 * @internAl
	 */
	reAdonly extensionId?: ExtensionIdentifier;

	reAdonly displAyNAme?: string;

	/**
	 * Provide formAtting edits for A whole document.
	 */
	provideDocumentFormAttingEdits(model: model.ITextModel, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
}
/**
 * The document formAtting provider interfAce defines the contrAct between extensions And
 * the formAtting-feAture.
 */
export interfAce DocumentRAngeFormAttingEditProvider {
	/**
	 * @internAl
	 */
	reAdonly extensionId?: ExtensionIdentifier;

	reAdonly displAyNAme?: string;

	/**
	 * Provide formAtting edits for A rAnge in A document.
	 *
	 * The given rAnge is A hint And providers cAn decide to formAt A smAller
	 * or lArger rAnge. Often this is done by Adjusting the stArt And end
	 * of the rAnge to full syntAx nodes.
	 */
	provideDocumentRAngeFormAttingEdits(model: model.ITextModel, rAnge: RAnge, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
}
/**
 * The document formAtting provider interfAce defines the contrAct between extensions And
 * the formAtting-feAture.
 */
export interfAce OnTypeFormAttingEditProvider {


	/**
	 * @internAl
	 */
	reAdonly extensionId?: ExtensionIdentifier;

	AutoFormAtTriggerChArActers: string[];

	/**
	 * Provide formAtting edits After A chArActer hAs been typed.
	 *
	 * The given position And chArActer should hint to the provider
	 * whAt rAnge the position to expAnd to, like find the mAtching `{`
	 * when `}` hAs been entered.
	 */
	provideOnTypeFormAttingEdits(model: model.ITextModel, position: Position, ch: string, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
}

/**
 * @internAl
 */
export interfAce IInplAceReplAceSupportResult {
	vAlue: string;
	rAnge: IRAnge;
}

/**
 * A link inside the editor.
 */
export interfAce ILink {
	rAnge: IRAnge;
	url?: URI | string;
	tooltip?: string;
}

export interfAce ILinksList {
	links: ILink[];
	dispose?(): void;
}
/**
 * A provider of links.
 */
export interfAce LinkProvider {
	provideLinks(model: model.ITextModel, token: CAncellAtionToken): ProviderResult<ILinksList>;
	resolveLink?: (link: ILink, token: CAncellAtionToken) => ProviderResult<ILink>;
}

/**
 * A color in RGBA formAt.
 */
export interfAce IColor {

	/**
	 * The red component in the rAnge [0-1].
	 */
	reAdonly red: number;

	/**
	 * The green component in the rAnge [0-1].
	 */
	reAdonly green: number;

	/**
	 * The blue component in the rAnge [0-1].
	 */
	reAdonly blue: number;

	/**
	 * The AlphA component in the rAnge [0-1].
	 */
	reAdonly AlphA: number;
}

/**
 * String representAtions for A color
 */
export interfAce IColorPresentAtion {
	/**
	 * The lAbel of this color presentAtion. It will be shown on the color
	 * picker heAder. By defAult this is Also the text thAt is inserted when selecting
	 * this color presentAtion.
	 */
	lAbel: string;
	/**
	 * An [edit](#TextEdit) which is Applied to A document when selecting
	 * this presentAtion for the color.
	 */
	textEdit?: TextEdit;
	/**
	 * An optionAl ArrAy of AdditionAl [text edits](#TextEdit) thAt Are Applied when
	 * selecting this color presentAtion.
	 */
	AdditionAlTextEdits?: TextEdit[];
}

/**
 * A color rAnge is A rAnge in A text model which represents A color.
 */
export interfAce IColorInformAtion {

	/**
	 * The rAnge within the model.
	 */
	rAnge: IRAnge;

	/**
	 * The color represented in this rAnge.
	 */
	color: IColor;
}

/**
 * A provider of colors for editor models.
 */
export interfAce DocumentColorProvider {
	/**
	 * Provides the color rAnges for A specific model.
	 */
	provideDocumentColors(model: model.ITextModel, token: CAncellAtionToken): ProviderResult<IColorInformAtion[]>;
	/**
	 * Provide the string representAtions for A color.
	 */
	provideColorPresentAtions(model: model.ITextModel, colorInfo: IColorInformAtion, token: CAncellAtionToken): ProviderResult<IColorPresentAtion[]>;
}

export interfAce SelectionRAnge {
	rAnge: IRAnge;
}

export interfAce SelectionRAngeProvider {
	/**
	 * Provide rAnges thAt should be selected from the given position.
	 */
	provideSelectionRAnges(model: model.ITextModel, positions: Position[], token: CAncellAtionToken): ProviderResult<SelectionRAnge[][]>;
}

export interfAce FoldingContext {
}
/**
 * A provider of folding rAnges for editor models.
 */
export interfAce FoldingRAngeProvider {

	/**
	 * An optionAl event to signAl thAt the folding rAnges from this provider hAve chAnged.
	 */
	onDidChAnge?: Event<this>;

	/**
	 * Provides the folding rAnges for A specific model.
	 */
	provideFoldingRAnges(model: model.ITextModel, context: FoldingContext, token: CAncellAtionToken): ProviderResult<FoldingRAnge[]>;
}

export interfAce FoldingRAnge {

	/**
	 * The one-bAsed stArt line of the rAnge to fold. The folded AreA stArts After the line's lAst chArActer.
	 */
	stArt: number;

	/**
	 * The one-bAsed end line of the rAnge to fold. The folded AreA ends with the line's lAst chArActer.
	 */
	end: number;

	/**
	 * Describes the [Kind](#FoldingRAngeKind) of the folding rAnge such As [Comment](#FoldingRAngeKind.Comment) or
	 * [Region](#FoldingRAngeKind.Region). The kind is used to cAtegorize folding rAnges And used by commAnds
	 * like 'Fold All comments'. See
	 * [FoldingRAngeKind](#FoldingRAngeKind) for An enumerAtion of stAndArdized kinds.
	 */
	kind?: FoldingRAngeKind;
}
export clAss FoldingRAngeKind {
	/**
	 * Kind for folding rAnge representing A comment. The vAlue of the kind is 'comment'.
	 */
	stAtic reAdonly Comment = new FoldingRAngeKind('comment');
	/**
	 * Kind for folding rAnge representing A import. The vAlue of the kind is 'imports'.
	 */
	stAtic reAdonly Imports = new FoldingRAngeKind('imports');
	/**
	 * Kind for folding rAnge representing regions (for exAmple mArked by `#region`, `#endregion`).
	 * The vAlue of the kind is 'region'.
	 */
	stAtic reAdonly Region = new FoldingRAngeKind('region');

	/**
	 * CreAtes A new [FoldingRAngeKind](#FoldingRAngeKind).
	 *
	 * @pArAm vAlue of the kind.
	 */
	public constructor(public vAlue: string) {
	}
}


export interfAce WorkspAceEditMetAdAtA {
	needsConfirmAtion: booleAn;
	lAbel: string;
	description?: string;
	iconPAth?: { id: string } | URI | { light: URI, dArk: URI };
}

export interfAce WorkspAceFileEditOptions {
	overwrite?: booleAn;
	ignoreIfNotExists?: booleAn;
	ignoreIfExists?: booleAn;
	recursive?: booleAn;
}

export interfAce WorkspAceFileEdit {
	oldUri?: URI;
	newUri?: URI;
	options?: WorkspAceFileEditOptions;
	metAdAtA?: WorkspAceEditMetAdAtA;
}

export interfAce WorkspAceTextEdit {
	resource: URI;
	edit: TextEdit;
	modelVersionId?: number;
	metAdAtA?: WorkspAceEditMetAdAtA;
}

export interfAce WorkspAceEdit {
	edits: ArrAy<WorkspAceTextEdit | WorkspAceFileEdit>;
}

export interfAce Rejection {
	rejectReAson?: string;
}
export interfAce RenAmeLocAtion {
	rAnge: IRAnge;
	text: string;
}

export interfAce RenAmeProvider {
	provideRenAmeEdits(model: model.ITextModel, position: Position, newNAme: string, token: CAncellAtionToken): ProviderResult<WorkspAceEdit & Rejection>;
	resolveRenAmeLocAtion?(model: model.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<RenAmeLocAtion & Rejection>;
}

/**
 * @internAl
 */
export interfAce AuthenticAtionSession {
	id: string;
	AccessToken: string;
	Account: {
		lAbel: string;
		id: string;
	}
	scopes: ReAdonlyArrAy<string>;
}

/**
 * @internAl
 */
export interfAce AuthenticAtionSessionsChAngeEvent {
	Added: ReAdonlyArrAy<string>;
	removed: ReAdonlyArrAy<string>;
	chAnged: ReAdonlyArrAy<string>;
}

/**
 * @internAl
 */
export interfAce AuthenticAtionProviderInformAtion {
	id: string;
	lAbel: string;
}

export interfAce CommAnd {
	id: string;
	title: string;
	tooltip?: string;
	Arguments?: Any[];
}

/**
 * @internAl
 */
export interfAce CommentThreAdTemplAte {
	controllerHAndle: number;
	lAbel: string;
	AcceptInputCommAnd?: CommAnd;
	AdditionAlCommAnds?: CommAnd[];
	deleteCommAnd?: CommAnd;
}

/**
 * @internAl
 */
export interfAce CommentInfo {
	extensionId?: string;
	threAds: CommentThreAd[];
	commentingRAnges: CommentingRAnges;
}

/**
 * @internAl
 */
export enum CommentThreAdCollApsibleStAte {
	/**
	 * Determines An item is collApsed
	 */
	CollApsed = 0,
	/**
	 * Determines An item is expAnded
	 */
	ExpAnded = 1
}



/**
 * @internAl
 */
export interfAce CommentWidget {
	commentThreAd: CommentThreAd;
	comment?: Comment;
	input: string;
	onDidChAngeInput: Event<string>;
}

/**
 * @internAl
 */
export interfAce CommentInput {
	vAlue: string;
	uri: URI;
}

/**
 * @internAl
 */
export interfAce CommentThreAd {
	commentThreAdHAndle: number;
	controllerHAndle: number;
	extensionId?: string;
	threAdId: string;
	resource: string | null;
	rAnge: IRAnge;
	lAbel: string | undefined;
	contextVAlue: string | undefined;
	comments: Comment[] | undefined;
	onDidChAngeComments: Event<Comment[] | undefined>;
	collApsibleStAte?: CommentThreAdCollApsibleStAte;
	cAnReply: booleAn;
	input?: CommentInput;
	onDidChAngeInput: Event<CommentInput | undefined>;
	onDidChAngeRAnge: Event<IRAnge>;
	onDidChAngeLAbel: Event<string | undefined>;
	onDidChAngeCollAsibleStAte: Event<CommentThreAdCollApsibleStAte | undefined>;
	onDidChAngeCAnReply: Event<booleAn>;
	isDisposed: booleAn;
}

/**
 * @internAl
 */

export interfAce CommentingRAnges {
	reAdonly resource: URI;
	rAnges: IRAnge[];
}

/**
 * @internAl
 */
export interfAce CommentReAction {
	reAdonly lAbel?: string;
	reAdonly iconPAth?: UriComponents;
	reAdonly count?: number;
	reAdonly hAsReActed?: booleAn;
	reAdonly cAnEdit?: booleAn;
}

/**
 * @internAl
 */
export interfAce CommentOptions {
	/**
	 * An optionAl string to show on the comment input box when it's collApsed.
	 */
	prompt?: string;

	/**
	 * An optionAl string to show As plAceholder in the comment input box when it's focused.
	 */
	plAceHolder?: string;
}

/**
 * @internAl
 */
export enum CommentMode {
	Editing = 0,
	Preview = 1
}

/**
 * @internAl
 */
export interfAce Comment {
	reAdonly uniqueIdInThreAd: number;
	reAdonly body: IMArkdownString;
	reAdonly userNAme: string;
	reAdonly userIconPAth?: string;
	reAdonly contextVAlue?: string;
	reAdonly commentReActions?: CommentReAction[];
	reAdonly lAbel?: string;
	reAdonly mode?: CommentMode;
}

/**
 * @internAl
 */
export interfAce CommentThreAdChAngedEvent {
	/**
	 * Added comment threAds.
	 */
	reAdonly Added: CommentThreAd[];

	/**
	 * Removed comment threAds.
	 */
	reAdonly removed: CommentThreAd[];

	/**
	 * ChAnged comment threAds.
	 */
	reAdonly chAnged: CommentThreAd[];
}

/**
 * @internAl
 */
export interfAce IWebviewPortMApping {
	webviewPort: number;
	extensionHostPort: number;
}

/**
 * @internAl
 */
export interfAce IWebviewOptions {
	reAdonly enAbleScripts?: booleAn;
	reAdonly enAbleCommAndUris?: booleAn;
	reAdonly locAlResourceRoots?: ReAdonlyArrAy<UriComponents>;
	reAdonly portMApping?: ReAdonlyArrAy<IWebviewPortMApping>;
}

/**
 * @internAl
 */
export interfAce IWebviewPAnelOptions {
	reAdonly enAbleFindWidget?: booleAn;
	reAdonly retAinContextWhenHidden?: booleAn;
}


export interfAce CodeLens {
	rAnge: IRAnge;
	id?: string;
	commAnd?: CommAnd;
}

export interfAce CodeLensList {
	lenses: CodeLens[];
	dispose(): void;
}

export interfAce CodeLensProvider {
	onDidChAnge?: Event<this>;
	provideCodeLenses(model: model.ITextModel, token: CAncellAtionToken): ProviderResult<CodeLensList>;
	resolveCodeLens?(model: model.ITextModel, codeLens: CodeLens, token: CAncellAtionToken): ProviderResult<CodeLens>;
}

export interfAce SemAnticTokensLegend {
	reAdonly tokenTypes: string[];
	reAdonly tokenModifiers: string[];
}

export interfAce SemAnticTokens {
	reAdonly resultId?: string;
	reAdonly dAtA: Uint32ArrAy;
}

export interfAce SemAnticTokensEdit {
	reAdonly stArt: number;
	reAdonly deleteCount: number;
	reAdonly dAtA?: Uint32ArrAy;
}

export interfAce SemAnticTokensEdits {
	reAdonly resultId?: string;
	reAdonly edits: SemAnticTokensEdit[];
}

export interfAce DocumentSemAnticTokensProvider {
	onDidChAnge?: Event<void>;
	getLegend(): SemAnticTokensLegend;
	provideDocumentSemAnticTokens(model: model.ITextModel, lAstResultId: string | null, token: CAncellAtionToken): ProviderResult<SemAnticTokens | SemAnticTokensEdits>;
	releAseDocumentSemAnticTokens(resultId: string | undefined): void;
}

export interfAce DocumentRAngeSemAnticTokensProvider {
	getLegend(): SemAnticTokensLegend;
	provideDocumentRAngeSemAnticTokens(model: model.ITextModel, rAnge: RAnge, token: CAncellAtionToken): ProviderResult<SemAnticTokens>;
}

// --- feAture registries ------

/**
 * @internAl
 */
export const ReferenceProviderRegistry = new LAnguAgeFeAtureRegistry<ReferenceProvider>();

/**
 * @internAl
 */
export const RenAmeProviderRegistry = new LAnguAgeFeAtureRegistry<RenAmeProvider>();

/**
 * @internAl
 */
export const CompletionProviderRegistry = new LAnguAgeFeAtureRegistry<CompletionItemProvider>();

/**
 * @internAl
 */
export const SignAtureHelpProviderRegistry = new LAnguAgeFeAtureRegistry<SignAtureHelpProvider>();

/**
 * @internAl
 */
export const HoverProviderRegistry = new LAnguAgeFeAtureRegistry<HoverProvider>();

/**
 * @internAl
 */
export const EvAluAtAbleExpressionProviderRegistry = new LAnguAgeFeAtureRegistry<EvAluAtAbleExpressionProvider>();

/**
 * @internAl
 */
export const DocumentSymbolProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentSymbolProvider>();

/**
 * @internAl
 */
export const DocumentHighlightProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentHighlightProvider>();

/**
 * @internAl
 */
export const OnTypeRenAmeProviderRegistry = new LAnguAgeFeAtureRegistry<OnTypeRenAmeProvider>();

/**
 * @internAl
 */
export const DefinitionProviderRegistry = new LAnguAgeFeAtureRegistry<DefinitionProvider>();

/**
 * @internAl
 */
export const DeclArAtionProviderRegistry = new LAnguAgeFeAtureRegistry<DeclArAtionProvider>();

/**
 * @internAl
 */
export const ImplementAtionProviderRegistry = new LAnguAgeFeAtureRegistry<ImplementAtionProvider>();

/**
 * @internAl
 */
export const TypeDefinitionProviderRegistry = new LAnguAgeFeAtureRegistry<TypeDefinitionProvider>();

/**
 * @internAl
 */
export const CodeLensProviderRegistry = new LAnguAgeFeAtureRegistry<CodeLensProvider>();

/**
 * @internAl
 */
export const CodeActionProviderRegistry = new LAnguAgeFeAtureRegistry<CodeActionProvider>();

/**
 * @internAl
 */
export const DocumentFormAttingEditProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentFormAttingEditProvider>();

/**
 * @internAl
 */
export const DocumentRAngeFormAttingEditProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentRAngeFormAttingEditProvider>();

/**
 * @internAl
 */
export const OnTypeFormAttingEditProviderRegistry = new LAnguAgeFeAtureRegistry<OnTypeFormAttingEditProvider>();

/**
 * @internAl
 */
export const LinkProviderRegistry = new LAnguAgeFeAtureRegistry<LinkProvider>();

/**
 * @internAl
 */
export const ColorProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentColorProvider>();

/**
 * @internAl
 */
export const SelectionRAngeRegistry = new LAnguAgeFeAtureRegistry<SelectionRAngeProvider>();

/**
 * @internAl
 */
export const FoldingRAngeProviderRegistry = new LAnguAgeFeAtureRegistry<FoldingRAngeProvider>();

/**
 * @internAl
 */
export const DocumentSemAnticTokensProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentSemAnticTokensProvider>();

/**
 * @internAl
 */
export const DocumentRAngeSemAnticTokensProviderRegistry = new LAnguAgeFeAtureRegistry<DocumentRAngeSemAnticTokensProvider>();

/**
 * @internAl
 */
export interfAce ITokenizAtionSupportChAngedEvent {
	chAngedLAnguAges: string[];
	chAngedColorMAp: booleAn;
}

/**
 * @internAl
 */
export interfAce ITokenizAtionRegistry {

	/**
	 * An event triggered when:
	 *  - A tokenizAtion support is registered, unregistered or chAnged.
	 *  - the color mAp is chAnged.
	 */
	onDidChAnge: Event<ITokenizAtionSupportChAngedEvent>;

	/**
	 * Fire A chAnge event for A lAnguAge.
	 * This is useful for lAnguAges thAt embed other lAnguAges.
	 */
	fire(lAnguAges: string[]): void;

	/**
	 * Register A tokenizAtion support.
	 */
	register(lAnguAge: string, support: ITokenizAtionSupport): IDisposAble;

	/**
	 * Register A promise for A tokenizAtion support.
	 */
	registerPromise(lAnguAge: string, promise: ThenAble<ITokenizAtionSupport>): IDisposAble;

	/**
	 * Get the tokenizAtion support for A lAnguAge.
	 * Returns `null` if not found.
	 */
	get(lAnguAge: string): ITokenizAtionSupport | null;

	/**
	 * Get the promise of A tokenizAtion support for A lAnguAge.
	 * `null` is returned if no support is AvAilAble And no promise for the support hAs been registered yet.
	 */
	getPromise(lAnguAge: string): ThenAble<ITokenizAtionSupport> | null;

	/**
	 * Set the new color mAp thAt All tokens will use in their ColorId binAry encoded bits for foreground And bAckground.
	 */
	setColorMAp(colorMAp: Color[]): void;

	getColorMAp(): Color[] | null;

	getDefAultBAckground(): Color | null;
}

/**
 * @internAl
 */
export const TokenizAtionRegistry = new TokenizAtionRegistryImpl();
