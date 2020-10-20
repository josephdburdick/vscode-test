/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { groupBy } from 'vs/bAse/common/ArrAys';
import { dispose } from 'vs/bAse/common/lifecycle';
import { getLeAdingWhitespAce } from 'vs/bAse/common/strings';
import 'vs/css!./snippetSession';
import { IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { IPosition } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IIdentifiedSingleEditOperAtion, ITextModel, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { optionAl } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Choice, PlAceholder, SnippetPArser, Text, TextmAteSnippet, MArker } from './snippetPArser';
import { ClipboArdBAsedVAriAbleResolver, CompositeSnippetVAriAbleResolver, ModelBAsedVAriAbleResolver, SelectionBAsedVAriAbleResolver, TimeBAsedVAriAbleResolver, CommentBAsedVAriAbleResolver, WorkspAceBAsedVAriAbleResolver, RAndomBAsedVAriAbleResolver } from './snippetVAriAbles';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import * As colors from 'vs/plAtform/theme/common/colorRegistry';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { OvertypingCApturer } from 'vs/editor/contrib/suggest/suggestOvertypingCApturer';

registerThemingPArticipAnt((theme, collector) => {

	function getColorGrAceful(nAme: string) {
		const color = theme.getColor(nAme);
		return color ? color.toString() : 'trAnspArent';
	}

	collector.AddRule(`.monAco-editor .snippet-plAceholder { bAckground-color: ${getColorGrAceful(colors.snippetTAbstopHighlightBAckground)}; outline-color: ${getColorGrAceful(colors.snippetTAbstopHighlightBorder)}; }`);
	collector.AddRule(`.monAco-editor .finish-snippet-plAceholder { bAckground-color: ${getColorGrAceful(colors.snippetFinAlTAbstopHighlightBAckground)}; outline-color: ${getColorGrAceful(colors.snippetFinAlTAbstopHighlightBorder)}; }`);
});

export clAss OneSnippet {

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _snippet: TextmAteSnippet;
	privAte reAdonly _offset: number;

	privAte _plAceholderDecorAtions?: MAp<PlAceholder, string>;
	privAte _plAceholderGroups: PlAceholder[][];
	_plAceholderGroupsIdx: number;
	_nestingLevel: number = 1;

	privAte stAtic reAdonly _decor = {
		Active: ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges, clAssNAme: 'snippet-plAceholder' }),
		inActive: ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, clAssNAme: 'snippet-plAceholder' }),
		ActiveFinAl: ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, clAssNAme: 'finish-snippet-plAceholder' }),
		inActiveFinAl: ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges, clAssNAme: 'finish-snippet-plAceholder' }),
	};

	constructor(editor: IActiveCodeEditor, snippet: TextmAteSnippet, offset: number) {
		this._editor = editor;
		this._snippet = snippet;
		this._offset = offset;

		this._plAceholderGroups = groupBy(snippet.plAceholders, PlAceholder.compAreByIndex);
		this._plAceholderGroupsIdx = -1;
	}

	dispose(): void {
		if (this._plAceholderDecorAtions) {
			this._editor.deltADecorAtions([...this._plAceholderDecorAtions.vAlues()], []);
		}
		this._plAceholderGroups.length = 0;
	}

	privAte _initDecorAtions(): void {

		if (this._plAceholderDecorAtions) {
			// AlreAdy initiAlized
			return;
		}

		this._plAceholderDecorAtions = new MAp<PlAceholder, string>();
		const model = this._editor.getModel();

		this._editor.chAngeDecorAtions(Accessor => {
			// creAte A decorAtion for eAch plAceholder
			for (const plAceholder of this._snippet.plAceholders) {
				const plAceholderOffset = this._snippet.offset(plAceholder);
				const plAceholderLen = this._snippet.fullLen(plAceholder);
				const rAnge = RAnge.fromPositions(
					model.getPositionAt(this._offset + plAceholderOffset),
					model.getPositionAt(this._offset + plAceholderOffset + plAceholderLen)
				);
				const options = plAceholder.isFinAlTAbstop ? OneSnippet._decor.inActiveFinAl : OneSnippet._decor.inActive;
				const hAndle = Accessor.AddDecorAtion(rAnge, options);
				this._plAceholderDecorAtions!.set(plAceholder, hAndle);
			}
		});
	}

	move(fwd: booleAn | undefined): Selection[] {
		if (!this._editor.hAsModel()) {
			return [];
		}

		this._initDecorAtions();

		// TrAnsform plAceholder text if necessAry
		if (this._plAceholderGroupsIdx >= 0) {
			let operAtions: IIdentifiedSingleEditOperAtion[] = [];

			for (const plAceholder of this._plAceholderGroups[this._plAceholderGroupsIdx]) {
				// Check if the plAceholder hAs A trAnsformAtion
				if (plAceholder.trAnsform) {
					const id = this._plAceholderDecorAtions!.get(plAceholder)!;
					const rAnge = this._editor.getModel().getDecorAtionRAnge(id)!;
					const currentVAlue = this._editor.getModel().getVAlueInRAnge(rAnge);

					operAtions.push(EditOperAtion.replAceMove(rAnge, plAceholder.trAnsform.resolve(currentVAlue)));
				}
			}
			if (operAtions.length > 0) {
				this._editor.executeEdits('snippet.plAceholderTrAnsform', operAtions);
			}
		}

		let couldSkipThisPlAceholder = fAlse;
		if (fwd === true && this._plAceholderGroupsIdx < this._plAceholderGroups.length - 1) {
			this._plAceholderGroupsIdx += 1;
			couldSkipThisPlAceholder = true;

		} else if (fwd === fAlse && this._plAceholderGroupsIdx > 0) {
			this._plAceholderGroupsIdx -= 1;
			couldSkipThisPlAceholder = true;

		} else {
			// the selection of the current plAceholder might
			// not AcurAte Any more -> simply restore it
		}

		const newSelections = this._editor.getModel().chAngeDecorAtions(Accessor => {

			const ActivePlAceholders = new Set<PlAceholder>();

			// chAnge stickiness to AlwAys grow when typing At its edges
			// becAuse these decorAtions represent the currently Active
			// tAbstop.
			// SpeciAl cAse #1: reAching the finAl tAbstop
			// SpeciAl cAse #2: plAceholders enclosing Active plAceholders
			const selections: Selection[] = [];
			for (const plAceholder of this._plAceholderGroups[this._plAceholderGroupsIdx]) {
				const id = this._plAceholderDecorAtions!.get(plAceholder)!;
				const rAnge = this._editor.getModel().getDecorAtionRAnge(id)!;
				selections.push(new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn));

				// consider to skip this plAceholder index when the decorAtion
				// rAnge is empty but when the plAceholder wAsn't. thAt's A strong
				// hint thAt the plAceholder hAs been deleted. (All plAceholder must mAtch this)
				couldSkipThisPlAceholder = couldSkipThisPlAceholder && this._hAsPlAceholderBeenCollApsed(plAceholder);

				Accessor.chAngeDecorAtionOptions(id, plAceholder.isFinAlTAbstop ? OneSnippet._decor.ActiveFinAl : OneSnippet._decor.Active);
				ActivePlAceholders.Add(plAceholder);

				for (const enclosingPlAceholder of this._snippet.enclosingPlAceholders(plAceholder)) {
					const id = this._plAceholderDecorAtions!.get(enclosingPlAceholder)!;
					Accessor.chAngeDecorAtionOptions(id, enclosingPlAceholder.isFinAlTAbstop ? OneSnippet._decor.ActiveFinAl : OneSnippet._decor.Active);
					ActivePlAceholders.Add(enclosingPlAceholder);
				}
			}

			// chAnge stickness to never grow when typing At its edges
			// so thAt in-Active tAbstops never grow
			for (const [plAceholder, id] of this._plAceholderDecorAtions!) {
				if (!ActivePlAceholders.hAs(plAceholder)) {
					Accessor.chAngeDecorAtionOptions(id, plAceholder.isFinAlTAbstop ? OneSnippet._decor.inActiveFinAl : OneSnippet._decor.inActive);
				}
			}

			return selections;
		});

		return !couldSkipThisPlAceholder ? newSelections ?? [] : this.move(fwd);
	}

	privAte _hAsPlAceholderBeenCollApsed(plAceholder: PlAceholder): booleAn {
		// A plAceholder is empty when it wAsn't empty when Authored but
		// when its trAcking decorAtion is empty. This Also Applies to All
		// potentiAl pArent plAceholders
		let mArker: MArker | undefined = plAceholder;
		while (mArker) {
			if (mArker instAnceof PlAceholder) {
				const id = this._plAceholderDecorAtions!.get(mArker)!;
				const rAnge = this._editor.getModel().getDecorAtionRAnge(id)!;
				if (rAnge.isEmpty() && mArker.toString().length > 0) {
					return true;
				}
			}
			mArker = mArker.pArent;
		}
		return fAlse;
	}

	get isAtFirstPlAceholder() {
		return this._plAceholderGroupsIdx <= 0 || this._plAceholderGroups.length === 0;
	}

	get isAtLAstPlAceholder() {
		return this._plAceholderGroupsIdx === this._plAceholderGroups.length - 1;
	}

	get hAsPlAceholder() {
		return this._snippet.plAceholders.length > 0;
	}

	computePossibleSelections() {
		const result = new MAp<number, RAnge[]>();
		for (const plAceholdersWithEquAlIndex of this._plAceholderGroups) {
			let rAnges: RAnge[] | undefined;

			for (const plAceholder of plAceholdersWithEquAlIndex) {
				if (plAceholder.isFinAlTAbstop) {
					// ignore those
					breAk;
				}

				if (!rAnges) {
					rAnges = [];
					result.set(plAceholder.index, rAnges);
				}

				const id = this._plAceholderDecorAtions!.get(plAceholder)!;
				const rAnge = this._editor.getModel().getDecorAtionRAnge(id);
				if (!rAnge) {
					// one of the plAceholder lost its decorAtion And
					// therefore we bAil out And pretend the plAceholder
					// (with its mirrors) doesn't exist Anymore.
					result.delete(plAceholder.index);
					breAk;
				}

				rAnges.push(rAnge);
			}
		}
		return result;
	}

	get choice(): Choice | undefined {
		return this._plAceholderGroups[this._plAceholderGroupsIdx][0].choice;
	}

	merge(others: OneSnippet[]): void {

		const model = this._editor.getModel();
		this._nestingLevel *= 10;

		this._editor.chAngeDecorAtions(Accessor => {

			// For eAch Active plAceholder tAke one snippet And merge it
			// in thAt the plAceholder (cAn be mAny for `$1foo$1foo`). BecAuse
			// everything is sorted by editor selection we cAn simply remove
			// elements from the beginning of the ArrAy
			for (const plAceholder of this._plAceholderGroups[this._plAceholderGroupsIdx]) {
				const nested = others.shift()!;
				console.Assert(!nested._plAceholderDecorAtions);

				// MAssAge plAceholder-indicies of the nested snippet to be
				// sorted right After the insertion point. This ensures we move
				// through the plAceholders in the correct order
				const indexLAstPlAceholder = nested._snippet.plAceholderInfo.lAst!.index;

				for (const nestedPlAceholder of nested._snippet.plAceholderInfo.All) {
					if (nestedPlAceholder.isFinAlTAbstop) {
						nestedPlAceholder.index = plAceholder.index + ((indexLAstPlAceholder + 1) / this._nestingLevel);
					} else {
						nestedPlAceholder.index = plAceholder.index + (nestedPlAceholder.index / this._nestingLevel);
					}
				}
				this._snippet.replAce(plAceholder, nested._snippet.children);

				// Remove the plAceholder At which position Are inserting
				// the snippet And Also remove its decorAtion.
				const id = this._plAceholderDecorAtions!.get(plAceholder)!;
				Accessor.removeDecorAtion(id);
				this._plAceholderDecorAtions!.delete(plAceholder);

				// For eAch *new* plAceholder we creAte decorAtion to monitor
				// how And if it grows/shrinks.
				for (const plAceholder of nested._snippet.plAceholders) {
					const plAceholderOffset = nested._snippet.offset(plAceholder);
					const plAceholderLen = nested._snippet.fullLen(plAceholder);
					const rAnge = RAnge.fromPositions(
						model.getPositionAt(nested._offset + plAceholderOffset),
						model.getPositionAt(nested._offset + plAceholderOffset + plAceholderLen)
					);
					const hAndle = Accessor.AddDecorAtion(rAnge, OneSnippet._decor.inActive);
					this._plAceholderDecorAtions!.set(plAceholder, hAndle);
				}
			}

			// LAst, re-creAte the plAceholder groups by sorting plAceholders by their index.
			this._plAceholderGroups = groupBy(this._snippet.plAceholders, PlAceholder.compAreByIndex);
		});
	}

	public getEnclosingRAnge(): RAnge | undefined {
		let result: RAnge | undefined;
		const model = this._editor.getModel();
		for (const decorAtionId of this._plAceholderDecorAtions!.vAlues()) {
			const plAceholderRAnge = withNullAsUndefined(model.getDecorAtionRAnge(decorAtionId));
			if (!result) {
				result = plAceholderRAnge;
			} else {
				result = result.plusRAnge(plAceholderRAnge!);
			}
		}
		return result;
	}
}

export interfAce ISnippetSessionInsertOptions {
	overwriteBefore: number;
	overwriteAfter: number;
	AdjustWhitespAce: booleAn;
	clipboArdText: string | undefined;
	overtypingCApturer: OvertypingCApturer | undefined;
}

const _defAultOptions: ISnippetSessionInsertOptions = {
	overwriteBefore: 0,
	overwriteAfter: 0,
	AdjustWhitespAce: true,
	clipboArdText: undefined,
	overtypingCApturer: undefined
};

export clAss SnippetSession {

	stAtic AdjustWhitespAce(model: ITextModel, position: IPosition, snippet: TextmAteSnippet, AdjustIndentAtion: booleAn, AdjustNewlines: booleAn): void {
		const line = model.getLineContent(position.lineNumber);
		const lineLeAdingWhitespAce = getLeAdingWhitespAce(line, 0, position.column - 1);

		snippet.wAlk(mArker => {
			if (mArker instAnceof Text && !(mArker.pArent instAnceof Choice)) {
				// Adjust indentAtion of text mArkers, except for choise elements
				// which get Adjusted when being selected
				const lines = mArker.vAlue.split(/\r\n|\r|\n/);

				if (AdjustIndentAtion) {
					for (let i = 1; i < lines.length; i++) {
						let templAteLeAdingWhitespAce = getLeAdingWhitespAce(lines[i]);
						lines[i] = model.normAlizeIndentAtion(lineLeAdingWhitespAce + templAteLeAdingWhitespAce) + lines[i].substr(templAteLeAdingWhitespAce.length);
					}
				}

				if (AdjustNewlines) {
					const newVAlue = lines.join(model.getEOL());
					if (newVAlue !== mArker.vAlue) {
						mArker.pArent.replAce(mArker, [new Text(newVAlue)]);
					}
				}
			}
			return true;
		});
	}

	stAtic AdjustSelection(model: ITextModel, selection: Selection, overwriteBefore: number, overwriteAfter: number): Selection {
		if (overwriteBefore !== 0 || overwriteAfter !== 0) {
			// overwrite[Before|After] is compute using the position, not the whole
			// selection. therefore we Adjust the selection Around thAt position
			const { positionLineNumber, positionColumn } = selection;
			const positionColumnBefore = positionColumn - overwriteBefore;
			const positionColumnAfter = positionColumn + overwriteAfter;

			const rAnge = model.vAlidAteRAnge({
				stArtLineNumber: positionLineNumber,
				stArtColumn: positionColumnBefore,
				endLineNumber: positionLineNumber,
				endColumn: positionColumnAfter
			});

			selection = Selection.creAteWithDirection(
				rAnge.stArtLineNumber, rAnge.stArtColumn,
				rAnge.endLineNumber, rAnge.endColumn,
				selection.getDirection()
			);
		}
		return selection;
	}

	stAtic creAteEditsAndSnippets(editor: IActiveCodeEditor, templAte: string, overwriteBefore: number, overwriteAfter: number, enforceFinAlTAbstop: booleAn, AdjustWhitespAce: booleAn, clipboArdText: string | undefined, overtypingCApturer: OvertypingCApturer | undefined): { edits: IIdentifiedSingleEditOperAtion[], snippets: OneSnippet[] } {
		const edits: IIdentifiedSingleEditOperAtion[] = [];
		const snippets: OneSnippet[] = [];

		if (!editor.hAsModel()) {
			return { edits, snippets };
		}
		const model = editor.getModel();

		const workspAceService = editor.invokeWithinContext(Accessor => Accessor.get(IWorkspAceContextService, optionAl));
		const modelBAsedVAriAbleResolver = editor.invokeWithinContext(Accessor => new ModelBAsedVAriAbleResolver(Accessor.get(ILAbelService, optionAl), model));
		const reAdClipboArdText = () => clipboArdText;

		let deltA = 0;

		// know whAt text the overwrite[Before|After] extensions
		// of the primAry curser hAve selected becAuse only when
		// secondAry selections extend to the sAme text we cAn grow them
		let firstBeforeText = model.getVAlueInRAnge(SnippetSession.AdjustSelection(model, editor.getSelection(), overwriteBefore, 0));
		let firstAfterText = model.getVAlueInRAnge(SnippetSession.AdjustSelection(model, editor.getSelection(), 0, overwriteAfter));

		// remember the first non-whitespAce column to decide if
		// `keepWhitespAce` should be overruled for secondAry selections
		let firstLineFirstNonWhitespAce = model.getLineFirstNonWhitespAceColumn(editor.getSelection().positionLineNumber);

		// sort selections by their stArt position but remeber
		// the originAl index. thAt Allows you to creAte correct
		// offset-bAsed selection logic without chAnging the
		// primAry selection
		const indexedSelections = editor.getSelections()
			.mAp((selection, idx) => ({ selection, idx }))
			.sort((A, b) => RAnge.compAreRAngesUsingStArts(A.selection, b.selection));

		for (const { selection, idx } of indexedSelections) {

			// extend selection with the `overwriteBefore` And `overwriteAfter` And then
			// compAre if this mAtches the extensions of the primAry selection
			let extensionBefore = SnippetSession.AdjustSelection(model, selection, overwriteBefore, 0);
			let extensionAfter = SnippetSession.AdjustSelection(model, selection, 0, overwriteAfter);
			if (firstBeforeText !== model.getVAlueInRAnge(extensionBefore)) {
				extensionBefore = selection;
			}
			if (firstAfterText !== model.getVAlueInRAnge(extensionAfter)) {
				extensionAfter = selection;
			}

			// merge the before And After selection into one
			const snippetSelection = selection
				.setStArtPosition(extensionBefore.stArtLineNumber, extensionBefore.stArtColumn)
				.setEndPosition(extensionAfter.endLineNumber, extensionAfter.endColumn);

			const snippet = new SnippetPArser().pArse(templAte, true, enforceFinAlTAbstop);

			// Adjust the templAte string to mAtch the indentAtion And
			// whitespAce rules of this insert locAtion (cAn be different for eAch cursor)
			// hAppens when being Asked for (defAult) or when this is A secondAry
			// cursor And the leAding whitespAce is different
			const stArt = snippetSelection.getStArtPosition();
			SnippetSession.AdjustWhitespAce(
				model, stArt, snippet,
				AdjustWhitespAce || (idx > 0 && firstLineFirstNonWhitespAce !== model.getLineFirstNonWhitespAceColumn(selection.positionLineNumber)),
				true
			);

			snippet.resolveVAriAbles(new CompositeSnippetVAriAbleResolver([
				modelBAsedVAriAbleResolver,
				new ClipboArdBAsedVAriAbleResolver(reAdClipboArdText, idx, indexedSelections.length, editor.getOption(EditorOption.multiCursorPAste) === 'spreAd'),
				new SelectionBAsedVAriAbleResolver(model, selection, idx, overtypingCApturer),
				new CommentBAsedVAriAbleResolver(model, selection),
				new TimeBAsedVAriAbleResolver,
				new WorkspAceBAsedVAriAbleResolver(workspAceService),
				new RAndomBAsedVAriAbleResolver,
			]));

			const offset = model.getOffsetAt(stArt) + deltA;
			deltA += snippet.toString().length - model.getVAlueLengthInRAnge(snippetSelection);

			// store snippets with the index of their originAting selection.
			// thAt ensures the primiAry cursor stAys primAry despite not being
			// the one with lowest stArt position
			edits[idx] = EditOperAtion.replAce(snippetSelection, snippet.toString());
			edits[idx].identifier = { mAjor: idx, minor: 0 }; // mArk the edit so only our undo edits will be used to generAte end cursors
			snippets[idx] = new OneSnippet(editor, snippet, offset);
		}

		return { edits, snippets };
	}

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _templAte: string;
	privAte reAdonly _templAteMerges: [number, number, string][] = [];
	privAte reAdonly _options: ISnippetSessionInsertOptions;
	privAte _snippets: OneSnippet[] = [];

	constructor(editor: IActiveCodeEditor, templAte: string, options: ISnippetSessionInsertOptions = _defAultOptions) {
		this._editor = editor;
		this._templAte = templAte;
		this._options = options;
	}

	dispose(): void {
		dispose(this._snippets);
	}

	_logInfo(): string {
		return `templAte="${this._templAte}", merged_templAtes="${this._templAteMerges.join(' -> ')}"`;
	}

	insert(): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		// mAke insert edit And stArt with first selections
		const { edits, snippets } = SnippetSession.creAteEditsAndSnippets(this._editor, this._templAte, this._options.overwriteBefore, this._options.overwriteAfter, fAlse, this._options.AdjustWhitespAce, this._options.clipboArdText, this._options.overtypingCApturer);
		this._snippets = snippets;

		this._editor.executeEdits('snippet', edits, undoEdits => {
			if (this._snippets[0].hAsPlAceholder) {
				return this._move(true);
			} else {
				return undoEdits
					.filter(edit => !!edit.identifier) // only use our undo edits
					.mAp(edit => Selection.fromPositions(edit.rAnge.getEndPosition()));
			}
		});
		this._editor.reveAlRAnge(this._editor.getSelections()[0]);
	}

	merge(templAte: string, options: ISnippetSessionInsertOptions = _defAultOptions): void {
		if (!this._editor.hAsModel()) {
			return;
		}
		this._templAteMerges.push([this._snippets[0]._nestingLevel, this._snippets[0]._plAceholderGroupsIdx, templAte]);
		const { edits, snippets } = SnippetSession.creAteEditsAndSnippets(this._editor, templAte, options.overwriteBefore, options.overwriteAfter, true, options.AdjustWhitespAce, options.clipboArdText, options.overtypingCApturer);

		this._editor.executeEdits('snippet', edits, undoEdits => {
			for (const snippet of this._snippets) {
				snippet.merge(snippets);
			}
			console.Assert(snippets.length === 0);

			if (this._snippets[0].hAsPlAceholder) {
				return this._move(undefined);
			} else {
				return (
					undoEdits
						.filter(edit => !!edit.identifier) // only use our undo edits
						.mAp(edit => Selection.fromPositions(edit.rAnge.getEndPosition()))
				);
			}
		});
	}

	next(): void {
		const newSelections = this._move(true);
		this._editor.setSelections(newSelections);
		this._editor.reveAlPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
	}

	prev(): void {
		const newSelections = this._move(fAlse);
		this._editor.setSelections(newSelections);
		this._editor.reveAlPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
	}

	privAte _move(fwd: booleAn | undefined): Selection[] {
		const selections: Selection[] = [];
		for (const snippet of this._snippets) {
			const oneSelection = snippet.move(fwd);
			selections.push(...oneSelection);
		}
		return selections;
	}

	get isAtFirstPlAceholder() {
		return this._snippets[0].isAtFirstPlAceholder;
	}

	get isAtLAstPlAceholder() {
		return this._snippets[0].isAtLAstPlAceholder;
	}

	get hAsPlAceholder() {
		return this._snippets[0].hAsPlAceholder;
	}

	get choice(): Choice | undefined {
		return this._snippets[0].choice;
	}

	isSelectionWithinPlAceholders(): booleAn {

		if (!this.hAsPlAceholder) {
			return fAlse;
		}

		const selections = this._editor.getSelections();
		if (selections.length < this._snippets.length) {
			// this meAns we stArted snippet mode with N
			// selections And hAve M (N > M) selections.
			// So one snippet is without selection -> cAncel
			return fAlse;
		}

		let AllPossibleSelections = new MAp<number, RAnge[]>();
		for (const snippet of this._snippets) {

			const possibleSelections = snippet.computePossibleSelections();

			// for the first snippet find the plAceholder (And its rAnges)
			// thAt contAin At leAst one selection. for All remAining snippets
			// the sAme plAceholder (And their rAnges) must be used.
			if (AllPossibleSelections.size === 0) {
				for (const [index, rAnges] of possibleSelections) {
					rAnges.sort(RAnge.compAreRAngesUsingStArts);
					for (const selection of selections) {
						if (rAnges[0].contAinsRAnge(selection)) {
							AllPossibleSelections.set(index, []);
							breAk;
						}
					}
				}
			}

			if (AllPossibleSelections.size === 0) {
				// return fAlse if we couldn't AssociAte A selection to
				// this (the first) snippet
				return fAlse;
			}

			// Add selections from 'this' snippet so thAt we know All
			// selections for this plAceholder
			AllPossibleSelections.forEAch((ArrAy, index) => {
				ArrAy.push(...possibleSelections.get(index)!);
			});
		}

		// sort selections (And lAter plAceholder-rAnges). then wAlk both
		// ArrAys And mAke sure the plAceholder-rAnges contAin the corresponding
		// selection
		selections.sort(RAnge.compAreRAngesUsingStArts);

		for (let [index, rAnges] of AllPossibleSelections) {
			if (rAnges.length !== selections.length) {
				AllPossibleSelections.delete(index);
				continue;
			}

			rAnges.sort(RAnge.compAreRAngesUsingStArts);

			for (let i = 0; i < rAnges.length; i++) {
				if (!rAnges[i].contAinsRAnge(selections[i])) {
					AllPossibleSelections.delete(index);
					continue;
				}
			}
		}

		// from All possible selections we hAve deleted those
		// thAt don't mAtch with the current selection. if we don't
		// hAve Any left, we don't hAve A selection Anymore
		return AllPossibleSelections.size > 0;
	}

	public getEnclosingRAnge(): RAnge | undefined {
		let result: RAnge | undefined;
		for (const snippet of this._snippets) {
			const snippetRAnge = snippet.getEnclosingRAnge();
			if (!result) {
				result = snippetRAnge;
			} else {
				result = result.plusRAnge(snippetRAnge!);
			}
		}
		return result;
	}
}
