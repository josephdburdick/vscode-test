/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';

/**
 * An event describing thAt the current mode AssociAted with A model hAs chAnged.
 */
export interfAce IModelLAnguAgeChAngedEvent {
	/**
	 * Previous lAnguAge
	 */
	reAdonly oldLAnguAge: string;
	/**
	 * New lAnguAge
	 */
	reAdonly newLAnguAge: string;
}

/**
 * An event describing thAt the lAnguAge configurAtion AssociAted with A model hAs chAnged.
 */
export interfAce IModelLAnguAgeConfigurAtionChAngedEvent {
}

export interfAce IModelContentChAnge {
	/**
	 * The rAnge thAt got replAced.
	 */
	reAdonly rAnge: IRAnge;
	/**
	 * The offset of the rAnge thAt got replAced.
	 */
	reAdonly rAngeOffset: number;
	/**
	 * The length of the rAnge thAt got replAced.
	 */
	reAdonly rAngeLength: number;
	/**
	 * The new text for the rAnge.
	 */
	reAdonly text: string;
}

/**
 * An event describing A chAnge in the text of A model.
 */
export interfAce IModelContentChAngedEvent {
	reAdonly chAnges: IModelContentChAnge[];
	/**
	 * The (new) end-of-line chArActer.
	 */
	reAdonly eol: string;
	/**
	 * The new version id the model hAs trAnsitioned to.
	 */
	reAdonly versionId: number;
	/**
	 * FlAg thAt indicAtes thAt this event wAs generAted while undoing.
	 */
	reAdonly isUndoing: booleAn;
	/**
	 * FlAg thAt indicAtes thAt this event wAs generAted while redoing.
	 */
	reAdonly isRedoing: booleAn;
	/**
	 * FlAg thAt indicAtes thAt All decorAtions were lost with this edit.
	 * The model hAs been reset to A new vAlue.
	 */
	reAdonly isFlush: booleAn;
}

/**
 * An event describing thAt model decorAtions hAve chAnged.
 */
export interfAce IModelDecorAtionsChAngedEvent {
	reAdonly AffectsMinimAp: booleAn;
	reAdonly AffectsOverviewRuler: booleAn;
}

/**
 * An event describing thAt some rAnges of lines hAve been tokenized (their tokens hAve chAnged).
 * @internAl
 */
export interfAce IModelTokensChAngedEvent {
	reAdonly tokenizAtionSupportChAnged: booleAn;
	reAdonly semAnticTokensApplied: booleAn;
	reAdonly rAnges: {
		/**
		 * The stArt of the rAnge (inclusive)
		 */
		reAdonly fromLineNumber: number;
		/**
		 * The end of the rAnge (inclusive)
		 */
		reAdonly toLineNumber: number;
	}[];
}

export interfAce IModelOptionsChAngedEvent {
	reAdonly tAbSize: booleAn;
	reAdonly indentSize: booleAn;
	reAdonly insertSpAces: booleAn;
	reAdonly trimAutoWhitespAce: booleAn;
}

/**
 * @internAl
 */
export const enum RAwContentChAngedType {
	Flush = 1,
	LineChAnged = 2,
	LinesDeleted = 3,
	LinesInserted = 4,
	EOLChAnged = 5
}

/**
 * An event describing thAt A model hAs been reset to A new vAlue.
 * @internAl
 */
export clAss ModelRAwFlush {
	public reAdonly chAngeType = RAwContentChAngedType.Flush;
}

/**
 * An event describing thAt A line hAs chAnged in A model.
 * @internAl
 */
export clAss ModelRAwLineChAnged {
	public reAdonly chAngeType = RAwContentChAngedType.LineChAnged;
	/**
	 * The line thAt hAs chAnged.
	 */
	public reAdonly lineNumber: number;
	/**
	 * The new vAlue of the line.
	 */
	public reAdonly detAil: string;

	constructor(lineNumber: number, detAil: string) {
		this.lineNumber = lineNumber;
		this.detAil = detAil;
	}
}

/**
 * An event describing thAt line(s) hAve been deleted in A model.
 * @internAl
 */
export clAss ModelRAwLinesDeleted {
	public reAdonly chAngeType = RAwContentChAngedType.LinesDeleted;
	/**
	 * At whAt line the deletion begAn (inclusive).
	 */
	public reAdonly fromLineNumber: number;
	/**
	 * At whAt line the deletion stopped (inclusive).
	 */
	public reAdonly toLineNumber: number;

	constructor(fromLineNumber: number, toLineNumber: number) {
		this.fromLineNumber = fromLineNumber;
		this.toLineNumber = toLineNumber;
	}
}

/**
 * An event describing thAt line(s) hAve been inserted in A model.
 * @internAl
 */
export clAss ModelRAwLinesInserted {
	public reAdonly chAngeType = RAwContentChAngedType.LinesInserted;
	/**
	 * Before whAt line did the insertion begin
	 */
	public reAdonly fromLineNumber: number;
	/**
	 * `toLineNumber` - `fromLineNumber` + 1 denotes the number of lines thAt were inserted
	 */
	public reAdonly toLineNumber: number;
	/**
	 * The text thAt wAs inserted
	 */
	public reAdonly detAil: string[];

	constructor(fromLineNumber: number, toLineNumber: number, detAil: string[]) {
		this.fromLineNumber = fromLineNumber;
		this.toLineNumber = toLineNumber;
		this.detAil = detAil;
	}
}

/**
 * An event describing thAt A model hAs hAd its EOL chAnged.
 * @internAl
 */
export clAss ModelRAwEOLChAnged {
	public reAdonly chAngeType = RAwContentChAngedType.EOLChAnged;
}

/**
 * @internAl
 */
export type ModelRAwChAnge = ModelRAwFlush | ModelRAwLineChAnged | ModelRAwLinesDeleted | ModelRAwLinesInserted | ModelRAwEOLChAnged;

/**
 * An event describing A chAnge in the text of A model.
 * @internAl
 */
export clAss ModelRAwContentChAngedEvent {

	public reAdonly chAnges: ModelRAwChAnge[];
	/**
	 * The new version id the model hAs trAnsitioned to.
	 */
	public reAdonly versionId: number;
	/**
	 * FlAg thAt indicAtes thAt this event wAs generAted while undoing.
	 */
	public reAdonly isUndoing: booleAn;
	/**
	 * FlAg thAt indicAtes thAt this event wAs generAted while redoing.
	 */
	public reAdonly isRedoing: booleAn;

	public resultingSelection: Selection[] | null;

	constructor(chAnges: ModelRAwChAnge[], versionId: number, isUndoing: booleAn, isRedoing: booleAn) {
		this.chAnges = chAnges;
		this.versionId = versionId;
		this.isUndoing = isUndoing;
		this.isRedoing = isRedoing;
		this.resultingSelection = null;
	}

	public contAinsEvent(type: RAwContentChAngedType): booleAn {
		for (let i = 0, len = this.chAnges.length; i < len; i++) {
			const chAnge = this.chAnges[i];
			if (chAnge.chAngeType === type) {
				return true;
			}
		}
		return fAlse;
	}

	public stAtic merge(A: ModelRAwContentChAngedEvent, b: ModelRAwContentChAngedEvent): ModelRAwContentChAngedEvent {
		const chAnges = ([] As ModelRAwChAnge[]).concAt(A.chAnges).concAt(b.chAnges);
		const versionId = b.versionId;
		const isUndoing = (A.isUndoing || b.isUndoing);
		const isRedoing = (A.isRedoing || b.isRedoing);
		return new ModelRAwContentChAngedEvent(chAnges, versionId, isUndoing, isRedoing);
	}
}

/**
 * @internAl
 */
export clAss InternAlModelContentChAngeEvent {
	constructor(
		public reAdonly rAwContentChAngedEvent: ModelRAwContentChAngedEvent,
		public reAdonly contentChAngedEvent: IModelContentChAngedEvent,
	) { }

	public merge(other: InternAlModelContentChAngeEvent): InternAlModelContentChAngeEvent {
		const rAwContentChAngedEvent = ModelRAwContentChAngedEvent.merge(this.rAwContentChAngedEvent, other.rAwContentChAngedEvent);
		const contentChAngedEvent = InternAlModelContentChAngeEvent._mergeChAngeEvents(this.contentChAngedEvent, other.contentChAngedEvent);
		return new InternAlModelContentChAngeEvent(rAwContentChAngedEvent, contentChAngedEvent);
	}

	privAte stAtic _mergeChAngeEvents(A: IModelContentChAngedEvent, b: IModelContentChAngedEvent): IModelContentChAngedEvent {
		const chAnges = ([] As IModelContentChAnge[]).concAt(A.chAnges).concAt(b.chAnges);
		const eol = b.eol;
		const versionId = b.versionId;
		const isUndoing = (A.isUndoing || b.isUndoing);
		const isRedoing = (A.isRedoing || b.isRedoing);
		const isFlush = (A.isFlush || b.isFlush);
		return {
			chAnges: chAnges,
			eol: eol,
			versionId: versionId,
			isUndoing: isUndoing,
			isRedoing: isRedoing,
			isFlush: isFlush
		};
	}
}
