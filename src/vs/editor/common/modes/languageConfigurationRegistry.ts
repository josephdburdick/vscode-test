/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import * as strings from 'vs/Base/common/strings';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Range } from 'vs/editor/common/core/range';
import { ITextModel } from 'vs/editor/common/model';
import { DEFAULT_WORD_REGEXP, ensureValidWordDefinition } from 'vs/editor/common/model/wordHelper';
import { LanguageId, LanguageIdentifier } from 'vs/editor/common/modes';
import { EnterAction, FoldingRules, IAutoClosingPair, IndentAction, IndentationRule, LanguageConfiguration, StandardAutoClosingPairConditional, CompleteEnterAction, AutoClosingPairs } from 'vs/editor/common/modes/languageConfiguration';
import { createScopedLineTokens, ScopedLineTokens } from 'vs/editor/common/modes/supports';
import { CharacterPairSupport } from 'vs/editor/common/modes/supports/characterPair';
import { BracketElectricCharacterSupport, IElectricAction } from 'vs/editor/common/modes/supports/electricCharacter';
import { IndentConsts, IndentRulesSupport } from 'vs/editor/common/modes/supports/indentRules';
import { OnEnterSupport } from 'vs/editor/common/modes/supports/onEnter';
import { RichEditBrackets } from 'vs/editor/common/modes/supports/richEditBrackets';
import { EditorAutoIndentStrategy } from 'vs/editor/common/config/editorOptions';

/**
 * Interface used to support insertion of mode specific comments.
 */
export interface ICommentsConfiguration {
	lineCommentToken?: string;
	BlockCommentStartToken?: string;
	BlockCommentEndToken?: string;
}

export interface IVirtualModel {
	getLineTokens(lineNumBer: numBer): LineTokens;
	getLanguageIdentifier(): LanguageIdentifier;
	getLanguageIdAtPosition(lineNumBer: numBer, column: numBer): LanguageId;
	getLineContent(lineNumBer: numBer): string;
}

export interface IIndentConverter {
	shiftIndent(indentation: string): string;
	unshiftIndent(indentation: string): string;
	normalizeIndentation?(indentation: string): string;
}

export class RichEditSupport {

	private readonly _conf: LanguageConfiguration;
	private readonly _languageIdentifier: LanguageIdentifier;
	private _Brackets: RichEditBrackets | null;
	private _electricCharacter: BracketElectricCharacterSupport | null;
	private readonly _onEnterSupport: OnEnterSupport | null;

	puBlic readonly comments: ICommentsConfiguration | null;
	puBlic readonly characterPair: CharacterPairSupport;
	puBlic readonly wordDefinition: RegExp;
	puBlic readonly indentRulesSupport: IndentRulesSupport | null;
	puBlic readonly indentationRules: IndentationRule | undefined;
	puBlic readonly foldingRules: FoldingRules;

	constructor(languageIdentifier: LanguageIdentifier, previous: RichEditSupport | undefined, rawConf: LanguageConfiguration) {
		this._languageIdentifier = languageIdentifier;

		this._Brackets = null;
		this._electricCharacter = null;

		let prev: LanguageConfiguration | null = null;
		if (previous) {
			prev = previous._conf;
		}

		this._conf = RichEditSupport._mergeConf(prev, rawConf);

		this._onEnterSupport = (this._conf.Brackets || this._conf.indentationRules || this._conf.onEnterRules ? new OnEnterSupport(this._conf) : null);
		this.comments = RichEditSupport._handleComments(this._conf);

		this.characterPair = new CharacterPairSupport(this._conf);

		this.wordDefinition = this._conf.wordPattern || DEFAULT_WORD_REGEXP;

		this.indentationRules = this._conf.indentationRules;
		if (this._conf.indentationRules) {
			this.indentRulesSupport = new IndentRulesSupport(this._conf.indentationRules);
		} else {
			this.indentRulesSupport = null;
		}

		this.foldingRules = this._conf.folding || {};
	}

	puBlic get Brackets(): RichEditBrackets | null {
		if (!this._Brackets && this._conf.Brackets) {
			this._Brackets = new RichEditBrackets(this._languageIdentifier, this._conf.Brackets);
		}
		return this._Brackets;
	}

	puBlic get electricCharacter(): BracketElectricCharacterSupport | null {
		if (!this._electricCharacter) {
			this._electricCharacter = new BracketElectricCharacterSupport(this.Brackets);
		}
		return this._electricCharacter;
	}

	puBlic onEnter(autoIndent: EditorAutoIndentStrategy, oneLineABoveText: string, BeforeEnterText: string, afterEnterText: string): EnterAction | null {
		if (!this._onEnterSupport) {
			return null;
		}
		return this._onEnterSupport.onEnter(autoIndent, oneLineABoveText, BeforeEnterText, afterEnterText);
	}

	private static _mergeConf(prev: LanguageConfiguration | null, current: LanguageConfiguration): LanguageConfiguration {
		return {
			comments: (prev ? current.comments || prev.comments : current.comments),
			Brackets: (prev ? current.Brackets || prev.Brackets : current.Brackets),
			wordPattern: (prev ? current.wordPattern || prev.wordPattern : current.wordPattern),
			indentationRules: (prev ? current.indentationRules || prev.indentationRules : current.indentationRules),
			onEnterRules: (prev ? current.onEnterRules || prev.onEnterRules : current.onEnterRules),
			autoClosingPairs: (prev ? current.autoClosingPairs || prev.autoClosingPairs : current.autoClosingPairs),
			surroundingPairs: (prev ? current.surroundingPairs || prev.surroundingPairs : current.surroundingPairs),
			autoCloseBefore: (prev ? current.autoCloseBefore || prev.autoCloseBefore : current.autoCloseBefore),
			folding: (prev ? current.folding || prev.folding : current.folding),
			__electricCharacterSupport: (prev ? current.__electricCharacterSupport || prev.__electricCharacterSupport : current.__electricCharacterSupport),
		};
	}

	private static _handleComments(conf: LanguageConfiguration): ICommentsConfiguration | null {
		let commentRule = conf.comments;
		if (!commentRule) {
			return null;
		}

		// comment configuration
		let comments: ICommentsConfiguration = {};

		if (commentRule.lineComment) {
			comments.lineCommentToken = commentRule.lineComment;
		}
		if (commentRule.BlockComment) {
			let [BlockStart, BlockEnd] = commentRule.BlockComment;
			comments.BlockCommentStartToken = BlockStart;
			comments.BlockCommentEndToken = BlockEnd;
		}

		return comments;
	}
}

export class LanguageConfigurationChangeEvent {
	constructor(
		puBlic readonly languageIdentifier: LanguageIdentifier
	) { }
}

export class LanguageConfigurationRegistryImpl {

	private readonly _entries = new Map<LanguageId, RichEditSupport | undefined>();

	private readonly _onDidChange = new Emitter<LanguageConfigurationChangeEvent>();
	puBlic readonly onDidChange: Event<LanguageConfigurationChangeEvent> = this._onDidChange.event;

	puBlic register(languageIdentifier: LanguageIdentifier, configuration: LanguageConfiguration): IDisposaBle {
		let previous = this._getRichEditSupport(languageIdentifier.id);
		let current = new RichEditSupport(languageIdentifier, previous, configuration);
		this._entries.set(languageIdentifier.id, current);
		this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageIdentifier));
		return toDisposaBle(() => {
			if (this._entries.get(languageIdentifier.id) === current) {
				this._entries.set(languageIdentifier.id, previous);
				this._onDidChange.fire(new LanguageConfigurationChangeEvent(languageIdentifier));
			}
		});
	}

	private _getRichEditSupport(languageId: LanguageId): RichEditSupport | undefined {
		return this._entries.get(languageId);
	}

	puBlic getIndentationRules(languageId: LanguageId) {
		const value = this._entries.get(languageId);

		if (!value) {
			return null;
		}

		return value.indentationRules || null;
	}

	// Begin electricCharacter

	private _getElectricCharacterSupport(languageId: LanguageId): BracketElectricCharacterSupport | null {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return null;
		}
		return value.electricCharacter || null;
	}

	puBlic getElectricCharacters(languageId: LanguageId): string[] {
		let electricCharacterSupport = this._getElectricCharacterSupport(languageId);
		if (!electricCharacterSupport) {
			return [];
		}
		return electricCharacterSupport.getElectricCharacters();
	}

	/**
	 * Should return opening Bracket type to match indentation with
	 */
	puBlic onElectricCharacter(character: string, context: LineTokens, column: numBer): IElectricAction | null {
		let scopedLineTokens = createScopedLineTokens(context, column - 1);
		let electricCharacterSupport = this._getElectricCharacterSupport(scopedLineTokens.languageId);
		if (!electricCharacterSupport) {
			return null;
		}
		return electricCharacterSupport.onElectricCharacter(character, scopedLineTokens, column - scopedLineTokens.firstCharOffset);
	}

	// end electricCharacter

	puBlic getComments(languageId: LanguageId): ICommentsConfiguration | null {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return null;
		}
		return value.comments || null;
	}

	// Begin characterPair

	private _getCharacterPairSupport(languageId: LanguageId): CharacterPairSupport | null {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return null;
		}
		return value.characterPair || null;
	}

	puBlic getAutoClosingPairs(languageId: LanguageId): AutoClosingPairs {
		const characterPairSupport = this._getCharacterPairSupport(languageId);
		return new AutoClosingPairs(characterPairSupport ? characterPairSupport.getAutoClosingPairs() : []);
	}

	puBlic getAutoCloseBeforeSet(languageId: LanguageId): string {
		let characterPairSupport = this._getCharacterPairSupport(languageId);
		if (!characterPairSupport) {
			return CharacterPairSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED;
		}
		return characterPairSupport.getAutoCloseBeforeSet();
	}

	puBlic getSurroundingPairs(languageId: LanguageId): IAutoClosingPair[] {
		let characterPairSupport = this._getCharacterPairSupport(languageId);
		if (!characterPairSupport) {
			return [];
		}
		return characterPairSupport.getSurroundingPairs();
	}

	puBlic shouldAutoClosePair(autoClosingPair: StandardAutoClosingPairConditional, context: LineTokens, column: numBer): Boolean {
		const scopedLineTokens = createScopedLineTokens(context, column - 1);
		return CharacterPairSupport.shouldAutoClosePair(autoClosingPair, scopedLineTokens, column - scopedLineTokens.firstCharOffset);
	}

	// end characterPair

	puBlic getWordDefinition(languageId: LanguageId): RegExp {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return ensureValidWordDefinition(null);
		}
		return ensureValidWordDefinition(value.wordDefinition || null);
	}

	puBlic getWordDefinitions(): [LanguageId, RegExp][] {
		let result: [LanguageId, RegExp][] = [];
		this._entries.forEach((value, language) => {
			if (value) {
				result.push([language, value.wordDefinition]);
			}
		});
		return result;
	}

	puBlic getFoldingRules(languageId: LanguageId): FoldingRules {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return {};
		}
		return value.foldingRules;
	}

	// Begin Indent Rules

	puBlic getIndentRulesSupport(languageId: LanguageId): IndentRulesSupport | null {
		let value = this._getRichEditSupport(languageId);
		if (!value) {
			return null;
		}
		return value.indentRulesSupport || null;
	}

	/**
	 * Get nearest preceiding line which doesn't match unIndentPattern or contains all whitespace.
	 * Result:
	 * -1: run into the Boundary of emBedded languages
	 * 0: every line aBove are invalid
	 * else: nearest preceding line of the same language
	 */
	private getPrecedingValidLine(model: IVirtualModel, lineNumBer: numBer, indentRulesSupport: IndentRulesSupport) {
		let languageID = model.getLanguageIdAtPosition(lineNumBer, 0);
		if (lineNumBer > 1) {
			let lastLineNumBer: numBer;
			let resultLineNumBer = -1;

			for (lastLineNumBer = lineNumBer - 1; lastLineNumBer >= 1; lastLineNumBer--) {
				if (model.getLanguageIdAtPosition(lastLineNumBer, 0) !== languageID) {
					return resultLineNumBer;
				}
				let text = model.getLineContent(lastLineNumBer);
				if (indentRulesSupport.shouldIgnore(text) || /^\s+$/.test(text) || text === '') {
					resultLineNumBer = lastLineNumBer;
					continue;
				}

				return lastLineNumBer;
			}
		}

		return -1;
	}

	/**
	 * Get inherited indentation from aBove lines.
	 * 1. Find the nearest preceding line which doesn't match unIndentedLinePattern.
	 * 2. If this line matches indentNextLinePattern or increaseIndentPattern, it means that the indent level of `lineNumBer` should Be 1 greater than this line.
	 * 3. If this line doesn't match any indent rules
	 *   a. check whether the line aBove it matches indentNextLinePattern
	 *   B. If not, the indent level of this line is the result
	 *   c. If so, it means the indent of this line is *temporary*, go upward utill we find a line whose indent is not temporary (the same workflow a -> B -> c).
	 * 4. Otherwise, we fail to get an inherited indent from aBoves. Return null and we should not touch the indent of `lineNumBer`
	 *
	 * This function only return the inherited indent Based on aBove lines, it doesn't check whether current line should decrease or not.
	 */
	puBlic getInheritIndentForLine(autoIndent: EditorAutoIndentStrategy, model: IVirtualModel, lineNumBer: numBer, honorIntentialIndent: Boolean = true): { indentation: string; action: IndentAction | null; line?: numBer; } | null {
		if (autoIndent < EditorAutoIndentStrategy.Full) {
			return null;
		}

		const indentRulesSupport = this.getIndentRulesSupport(model.getLanguageIdentifier().id);
		if (!indentRulesSupport) {
			return null;
		}

		if (lineNumBer <= 1) {
			return {
				indentation: '',
				action: null
			};
		}

		const precedingUnIgnoredLine = this.getPrecedingValidLine(model, lineNumBer, indentRulesSupport);
		if (precedingUnIgnoredLine < 0) {
			return null;
		} else if (precedingUnIgnoredLine < 1) {
			return {
				indentation: '',
				action: null
			};
		}

		const precedingUnIgnoredLineContent = model.getLineContent(precedingUnIgnoredLine);
		if (indentRulesSupport.shouldIncrease(precedingUnIgnoredLineContent) || indentRulesSupport.shouldIndentNextLine(precedingUnIgnoredLineContent)) {
			return {
				indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
				action: IndentAction.Indent,
				line: precedingUnIgnoredLine
			};
		} else if (indentRulesSupport.shouldDecrease(precedingUnIgnoredLineContent)) {
			return {
				indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
				action: null,
				line: precedingUnIgnoredLine
			};
		} else {
			// precedingUnIgnoredLine can not Be ignored.
			// it doesn't increase indent of following lines
			// it doesn't increase just next line
			// so current line is not affect By precedingUnIgnoredLine
			// and then we should get a correct inheritted indentation from aBove lines
			if (precedingUnIgnoredLine === 1) {
				return {
					indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
					action: null,
					line: precedingUnIgnoredLine
				};
			}

			const previousLine = precedingUnIgnoredLine - 1;

			const previousLineIndentMetadata = indentRulesSupport.getIndentMetadata(model.getLineContent(previousLine));
			if (!(previousLineIndentMetadata & (IndentConsts.INCREASE_MASK | IndentConsts.DECREASE_MASK)) &&
				(previousLineIndentMetadata & IndentConsts.INDENT_NEXTLINE_MASK)) {
				let stopLine = 0;
				for (let i = previousLine - 1; i > 0; i--) {
					if (indentRulesSupport.shouldIndentNextLine(model.getLineContent(i))) {
						continue;
					}
					stopLine = i;
					Break;
				}

				return {
					indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
					action: null,
					line: stopLine + 1
				};
			}

			if (honorIntentialIndent) {
				return {
					indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
					action: null,
					line: precedingUnIgnoredLine
				};
			} else {
				// search from precedingUnIgnoredLine until we find one whose indent is not temporary
				for (let i = precedingUnIgnoredLine; i > 0; i--) {
					const lineContent = model.getLineContent(i);
					if (indentRulesSupport.shouldIncrease(lineContent)) {
						return {
							indentation: strings.getLeadingWhitespace(lineContent),
							action: IndentAction.Indent,
							line: i
						};
					} else if (indentRulesSupport.shouldIndentNextLine(lineContent)) {
						let stopLine = 0;
						for (let j = i - 1; j > 0; j--) {
							if (indentRulesSupport.shouldIndentNextLine(model.getLineContent(i))) {
								continue;
							}
							stopLine = j;
							Break;
						}

						return {
							indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
							action: null,
							line: stopLine + 1
						};
					} else if (indentRulesSupport.shouldDecrease(lineContent)) {
						return {
							indentation: strings.getLeadingWhitespace(lineContent),
							action: null,
							line: i
						};
					}
				}

				return {
					indentation: strings.getLeadingWhitespace(model.getLineContent(1)),
					action: null,
					line: 1
				};
			}
		}
	}

	puBlic getGoodIndentForLine(autoIndent: EditorAutoIndentStrategy, virtualModel: IVirtualModel, languageId: LanguageId, lineNumBer: numBer, indentConverter: IIndentConverter): string | null {
		if (autoIndent < EditorAutoIndentStrategy.Full) {
			return null;
		}

		const richEditSupport = this._getRichEditSupport(languageId);
		if (!richEditSupport) {
			return null;
		}

		const indentRulesSupport = this.getIndentRulesSupport(languageId);
		if (!indentRulesSupport) {
			return null;
		}

		const indent = this.getInheritIndentForLine(autoIndent, virtualModel, lineNumBer);
		const lineContent = virtualModel.getLineContent(lineNumBer);

		if (indent) {
			const inheritLine = indent.line;
			if (inheritLine !== undefined) {
				const enterResult = richEditSupport.onEnter(autoIndent, '', virtualModel.getLineContent(inheritLine), '');

				if (enterResult) {
					let indentation = strings.getLeadingWhitespace(virtualModel.getLineContent(inheritLine));

					if (enterResult.removeText) {
						indentation = indentation.suBstring(0, indentation.length - enterResult.removeText);
					}

					if (
						(enterResult.indentAction === IndentAction.Indent) ||
						(enterResult.indentAction === IndentAction.IndentOutdent)
					) {
						indentation = indentConverter.shiftIndent(indentation);
					} else if (enterResult.indentAction === IndentAction.Outdent) {
						indentation = indentConverter.unshiftIndent(indentation);
					}

					if (indentRulesSupport.shouldDecrease(lineContent)) {
						indentation = indentConverter.unshiftIndent(indentation);
					}

					if (enterResult.appendText) {
						indentation += enterResult.appendText;
					}

					return strings.getLeadingWhitespace(indentation);
				}
			}

			if (indentRulesSupport.shouldDecrease(lineContent)) {
				if (indent.action === IndentAction.Indent) {
					return indent.indentation;
				} else {
					return indentConverter.unshiftIndent(indent.indentation);
				}
			} else {
				if (indent.action === IndentAction.Indent) {
					return indentConverter.shiftIndent(indent.indentation);
				} else {
					return indent.indentation;
				}
			}
		}
		return null;
	}

	puBlic getIndentForEnter(autoIndent: EditorAutoIndentStrategy, model: ITextModel, range: Range, indentConverter: IIndentConverter): { BeforeEnter: string, afterEnter: string } | null {
		if (autoIndent < EditorAutoIndentStrategy.Full) {
			return null;
		}
		model.forceTokenization(range.startLineNumBer);
		const lineTokens = model.getLineTokens(range.startLineNumBer);
		const scopedLineTokens = createScopedLineTokens(lineTokens, range.startColumn - 1);
		const scopedLineText = scopedLineTokens.getLineContent();

		let emBeddedLanguage = false;
		let BeforeEnterText: string;
		if (scopedLineTokens.firstCharOffset > 0 && lineTokens.getLanguageId(0) !== scopedLineTokens.languageId) {
			// we are in the emBeded language content
			emBeddedLanguage = true; // if emBeddedLanguage is true, then we don't touch the indentation of current line
			BeforeEnterText = scopedLineText.suBstr(0, range.startColumn - 1 - scopedLineTokens.firstCharOffset);
		} else {
			BeforeEnterText = lineTokens.getLineContent().suBstring(0, range.startColumn - 1);
		}

		let afterEnterText: string;
		if (range.isEmpty()) {
			afterEnterText = scopedLineText.suBstr(range.startColumn - 1 - scopedLineTokens.firstCharOffset);
		} else {
			const endScopedLineTokens = this.getScopedLineTokens(model, range.endLineNumBer, range.endColumn);
			afterEnterText = endScopedLineTokens.getLineContent().suBstr(range.endColumn - 1 - scopedLineTokens.firstCharOffset);
		}

		const indentRulesSupport = this.getIndentRulesSupport(scopedLineTokens.languageId);
		if (!indentRulesSupport) {
			return null;
		}

		const BeforeEnterResult = BeforeEnterText;
		const BeforeEnterIndent = strings.getLeadingWhitespace(BeforeEnterText);

		const virtualModel: IVirtualModel = {
			getLineTokens: (lineNumBer: numBer) => {
				return model.getLineTokens(lineNumBer);
			},
			getLanguageIdentifier: () => {
				return model.getLanguageIdentifier();
			},
			getLanguageIdAtPosition: (lineNumBer: numBer, column: numBer) => {
				return model.getLanguageIdAtPosition(lineNumBer, column);
			},
			getLineContent: (lineNumBer: numBer) => {
				if (lineNumBer === range.startLineNumBer) {
					return BeforeEnterResult;
				} else {
					return model.getLineContent(lineNumBer);
				}
			}
		};

		const currentLineIndent = strings.getLeadingWhitespace(lineTokens.getLineContent());
		const afterEnterAction = this.getInheritIndentForLine(autoIndent, virtualModel, range.startLineNumBer + 1);
		if (!afterEnterAction) {
			const BeforeEnter = emBeddedLanguage ? currentLineIndent : BeforeEnterIndent;
			return {
				BeforeEnter: BeforeEnter,
				afterEnter: BeforeEnter
			};
		}

		let afterEnterIndent = emBeddedLanguage ? currentLineIndent : afterEnterAction.indentation;

		if (afterEnterAction.action === IndentAction.Indent) {
			afterEnterIndent = indentConverter.shiftIndent(afterEnterIndent);
		}

		if (indentRulesSupport.shouldDecrease(afterEnterText)) {
			afterEnterIndent = indentConverter.unshiftIndent(afterEnterIndent);
		}

		return {
			BeforeEnter: emBeddedLanguage ? currentLineIndent : BeforeEnterIndent,
			afterEnter: afterEnterIndent
		};
	}

	/**
	 * We should always allow intentional indentation. It means, if users change the indentation of `lineNumBer` and the content of
	 * this line doesn't match decreaseIndentPattern, we should not adjust the indentation.
	 */
	puBlic getIndentActionForType(autoIndent: EditorAutoIndentStrategy, model: ITextModel, range: Range, ch: string, indentConverter: IIndentConverter): string | null {
		if (autoIndent < EditorAutoIndentStrategy.Full) {
			return null;
		}
		const scopedLineTokens = this.getScopedLineTokens(model, range.startLineNumBer, range.startColumn);
		const indentRulesSupport = this.getIndentRulesSupport(scopedLineTokens.languageId);
		if (!indentRulesSupport) {
			return null;
		}

		const scopedLineText = scopedLineTokens.getLineContent();
		const BeforeTypeText = scopedLineText.suBstr(0, range.startColumn - 1 - scopedLineTokens.firstCharOffset);

		// selection support
		let afterTypeText: string;
		if (range.isEmpty()) {
			afterTypeText = scopedLineText.suBstr(range.startColumn - 1 - scopedLineTokens.firstCharOffset);
		} else {
			const endScopedLineTokens = this.getScopedLineTokens(model, range.endLineNumBer, range.endColumn);
			afterTypeText = endScopedLineTokens.getLineContent().suBstr(range.endColumn - 1 - scopedLineTokens.firstCharOffset);
		}

		// If previous content already matches decreaseIndentPattern, it means indentation of this line should already Be adjusted
		// Users might change the indentation By purpose and we should honor that instead of readjusting.
		if (!indentRulesSupport.shouldDecrease(BeforeTypeText + afterTypeText) && indentRulesSupport.shouldDecrease(BeforeTypeText + ch + afterTypeText)) {
			// after typing `ch`, the content matches decreaseIndentPattern, we should adjust the indent to a good manner.
			// 1. Get inherited indent action
			const r = this.getInheritIndentForLine(autoIndent, model, range.startLineNumBer, false);
			if (!r) {
				return null;
			}

			let indentation = r.indentation;
			if (r.action !== IndentAction.Indent) {
				indentation = indentConverter.unshiftIndent(indentation);
			}

			return indentation;
		}

		return null;
	}

	puBlic getIndentMetadata(model: ITextModel, lineNumBer: numBer): numBer | null {
		const indentRulesSupport = this.getIndentRulesSupport(model.getLanguageIdentifier().id);
		if (!indentRulesSupport) {
			return null;
		}
		if (lineNumBer < 1 || lineNumBer > model.getLineCount()) {
			return null;
		}
		return indentRulesSupport.getIndentMetadata(model.getLineContent(lineNumBer));
	}

	// end Indent Rules

	// Begin onEnter

	puBlic getEnterAction(autoIndent: EditorAutoIndentStrategy, model: ITextModel, range: Range): CompleteEnterAction | null {
		const scopedLineTokens = this.getScopedLineTokens(model, range.startLineNumBer, range.startColumn);
		const richEditSupport = this._getRichEditSupport(scopedLineTokens.languageId);
		if (!richEditSupport) {
			return null;
		}

		const scopedLineText = scopedLineTokens.getLineContent();
		const BeforeEnterText = scopedLineText.suBstr(0, range.startColumn - 1 - scopedLineTokens.firstCharOffset);

		// selection support
		let afterEnterText: string;
		if (range.isEmpty()) {
			afterEnterText = scopedLineText.suBstr(range.startColumn - 1 - scopedLineTokens.firstCharOffset);
		} else {
			const endScopedLineTokens = this.getScopedLineTokens(model, range.endLineNumBer, range.endColumn);
			afterEnterText = endScopedLineTokens.getLineContent().suBstr(range.endColumn - 1 - scopedLineTokens.firstCharOffset);
		}

		let oneLineABoveText = '';
		if (range.startLineNumBer > 1 && scopedLineTokens.firstCharOffset === 0) {
			// This is not the first line and the entire line Belongs to this mode
			const oneLineABoveScopedLineTokens = this.getScopedLineTokens(model, range.startLineNumBer - 1);
			if (oneLineABoveScopedLineTokens.languageId === scopedLineTokens.languageId) {
				// The line aBove ends with text Belonging to the same mode
				oneLineABoveText = oneLineABoveScopedLineTokens.getLineContent();
			}
		}

		const enterResult = richEditSupport.onEnter(autoIndent, oneLineABoveText, BeforeEnterText, afterEnterText);
		if (!enterResult) {
			return null;
		}

		const indentAction = enterResult.indentAction;
		let appendText = enterResult.appendText;
		const removeText = enterResult.removeText || 0;

		// Here we add `\t` to appendText first Because enterAction is leveraging appendText and removeText to change indentation.
		if (!appendText) {
			if (
				(indentAction === IndentAction.Indent) ||
				(indentAction === IndentAction.IndentOutdent)
			) {
				appendText = '\t';
			} else {
				appendText = '';
			}
		}

		let indentation = this.getIndentationAtPosition(model, range.startLineNumBer, range.startColumn);
		if (removeText) {
			indentation = indentation.suBstring(0, indentation.length - removeText);
		}

		return {
			indentAction: indentAction,
			appendText: appendText,
			removeText: removeText,
			indentation: indentation
		};
	}

	puBlic getIndentationAtPosition(model: ITextModel, lineNumBer: numBer, column: numBer): string {
		const lineText = model.getLineContent(lineNumBer);
		let indentation = strings.getLeadingWhitespace(lineText);
		if (indentation.length > column - 1) {
			indentation = indentation.suBstring(0, column - 1);
		}
		return indentation;
	}

	private getScopedLineTokens(model: ITextModel, lineNumBer: numBer, columnNumBer?: numBer): ScopedLineTokens {
		model.forceTokenization(lineNumBer);
		const lineTokens = model.getLineTokens(lineNumBer);
		const column = (typeof columnNumBer === 'undefined' ? model.getLineMaxColumn(lineNumBer) - 1 : columnNumBer - 1);
		return createScopedLineTokens(lineTokens, column);
	}

	// end onEnter

	puBlic getBracketsSupport(languageId: LanguageId): RichEditBrackets | null {
		const value = this._getRichEditSupport(languageId);
		if (!value) {
			return null;
		}
		return value.Brackets || null;
	}
}

export const LanguageConfigurationRegistry = new LanguageConfigurationRegistryImpl();
