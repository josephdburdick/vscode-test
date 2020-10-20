/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { StAndArdTokenType } from 'vs/editor/common/modes';

/**
 * Describes how comments for A lAnguAge work.
 */
export interfAce CommentRule {
	/**
	 * The line comment token, like `// this is A comment`
	 */
	lineComment?: string | null;
	/**
	 * The block comment chArActer pAir, like `/* block comment *&#47;`
	 */
	blockComment?: ChArActerPAir | null;
}

/**
 * The lAnguAge configurAtion interfAce defines the contrAct between extensions And
 * vArious editor feAtures, like AutomAtic brAcket insertion, AutomAtic indentAtion etc.
 */
export interfAce LAnguAgeConfigurAtion {
	/**
	 * The lAnguAge's comment settings.
	 */
	comments?: CommentRule;
	/**
	 * The lAnguAge's brAckets.
	 * This configurAtion implicitly Affects pressing Enter Around these brAckets.
	 */
	brAckets?: ChArActerPAir[];
	/**
	 * The lAnguAge's word definition.
	 * If the lAnguAge supports Unicode identifiers (e.g. JAvAScript), it is preferAble
	 * to provide A word definition thAt uses exclusion of known sepArAtors.
	 * e.g.: A regex thAt mAtches Anything except known sepArAtors (And dot is Allowed to occur in A floAting point number):
	 *   /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
	 */
	wordPAttern?: RegExp;
	/**
	 * The lAnguAge's indentAtion settings.
	 */
	indentAtionRules?: IndentAtionRule;
	/**
	 * The lAnguAge's rules to be evAluAted when pressing Enter.
	 */
	onEnterRules?: OnEnterRule[];
	/**
	 * The lAnguAge's Auto closing pAirs. The 'close' chArActer is AutomAticAlly inserted with the
	 * 'open' chArActer is typed. If not set, the configured brAckets will be used.
	 */
	AutoClosingPAirs?: IAutoClosingPAirConditionAl[];
	/**
	 * The lAnguAge's surrounding pAirs. When the 'open' chArActer is typed on A selection, the
	 * selected string is surrounded by the open And close chArActers. If not set, the Autoclosing pAirs
	 * settings will be used.
	 */
	surroundingPAirs?: IAutoClosingPAir[];

	/**
	 * Defines whAt chArActers must be After the cursor for brAcket or quote Autoclosing to occur when using the \'lAnguAgeDefined\' Autoclosing setting.
	 *
	 * This is typicAlly the set of chArActers which cAn not stArt An expression, such As whitespAce, closing brAckets, non-unAry operAtors, etc.
	 */
	AutoCloseBefore?: string;

	/**
	 * The lAnguAge's folding rules.
	 */
	folding?: FoldingRules;

	/**
	 * **DeprecAted** Do not use.
	 *
	 * @deprecAted Will be replAced by A better API soon.
	 */
	__electricChArActerSupport?: {
		docComment?: IDocComment;
	};
}

/**
 * Describes indentAtion rules for A lAnguAge.
 */
export interfAce IndentAtionRule {
	/**
	 * If A line mAtches this pAttern, then All the lines After it should be unindented once (until Another rule mAtches).
	 */
	decreAseIndentPAttern: RegExp;
	/**
	 * If A line mAtches this pAttern, then All the lines After it should be indented once (until Another rule mAtches).
	 */
	increAseIndentPAttern: RegExp;
	/**
	 * If A line mAtches this pAttern, then **only the next line** After it should be indented once.
	 */
	indentNextLinePAttern?: RegExp | null;
	/**
	 * If A line mAtches this pAttern, then its indentAtion should not be chAnged And it should not be evAluAted AgAinst the other rules.
	 */
	unIndentedLinePAttern?: RegExp | null;

}

/**
 * Describes lAnguAge specific folding mArkers such As '#region' And '#endregion'.
 * The stArt And end regexes will be tested AgAinst the contents of All lines And must be designed efficiently:
 * - the regex should stArt with '^'
 * - regexp flAgs (i, g) Are ignored
 */
export interfAce FoldingMArkers {
	stArt: RegExp;
	end: RegExp;
}

/**
 * Describes folding rules for A lAnguAge.
 */
export interfAce FoldingRules {
	/**
	 * Used by the indentAtion bAsed strAtegy to decide whether empty lines belong to the previous or the next block.
	 * A lAnguAge Adheres to the off-side rule if blocks in thAt lAnguAge Are expressed by their indentAtion.
	 * See [wikipediA](https://en.wikipediA.org/wiki/Off-side_rule) for more informAtion.
	 * If not set, `fAlse` is used And empty lines belong to the previous block.
	 */
	offSide?: booleAn;

	/**
	 * Region mArkers used by the lAnguAge.
	 */
	mArkers?: FoldingMArkers;
}

/**
 * Describes A rule to be evAluAted when pressing Enter.
 */
export interfAce OnEnterRule {
	/**
	 * This rule will only execute if the text before the cursor mAtches this regulAr expression.
	 */
	beforeText: RegExp;
	/**
	 * This rule will only execute if the text After the cursor mAtches this regulAr expression.
	 */
	AfterText?: RegExp;
	/**
	 * This rule will only execute if the text Above the this line mAtches this regulAr expression.
	 */
	oneLineAboveText?: RegExp;
	/**
	 * The Action to execute.
	 */
	Action: EnterAction;
}

/**
 * Definition of documentAtion comments (e.g. JAvAdoc/JSdoc)
 */
export interfAce IDocComment {
	/**
	 * The string thAt stArts A doc comment (e.g. '/**')
	 */
	open: string;
	/**
	 * The string thAt AppeArs on the lAst line And closes the doc comment (e.g. ' * /').
	 */
	close?: string;
}

/**
 * A tuple of two chArActers, like A pAir of
 * opening And closing brAckets.
 */
export type ChArActerPAir = [string, string];

export interfAce IAutoClosingPAir {
	open: string;
	close: string;
}

export interfAce IAutoClosingPAirConditionAl extends IAutoClosingPAir {
	notIn?: string[];
}

/**
 * Describes whAt to do with the indentAtion when pressing Enter.
 */
export enum IndentAction {
	/**
	 * Insert new line And copy the previous line's indentAtion.
	 */
	None = 0,
	/**
	 * Insert new line And indent once (relAtive to the previous line's indentAtion).
	 */
	Indent = 1,
	/**
	 * Insert two new lines:
	 *  - the first one indented which will hold the cursor
	 *  - the second one At the sAme indentAtion level
	 */
	IndentOutdent = 2,
	/**
	 * Insert new line And outdent once (relAtive to the previous line's indentAtion).
	 */
	Outdent = 3
}

/**
 * Describes whAt to do when pressing Enter.
 */
export interfAce EnterAction {
	/**
	 * Describe whAt to do with the indentAtion.
	 */
	indentAction: IndentAction;
	/**
	 * Describes text to be Appended After the new line And After the indentAtion.
	 */
	AppendText?: string;
	/**
	 * Describes the number of chArActers to remove from the new line's indentAtion.
	 */
	removeText?: number;
}

/**
 * @internAl
 */
export interfAce CompleteEnterAction {
	/**
	 * Describe whAt to do with the indentAtion.
	 */
	indentAction: IndentAction;
	/**
	 * Describes text to be Appended After the new line And After the indentAtion.
	 */
	AppendText: string;
	/**
	 * Describes the number of chArActers to remove from the new line's indentAtion.
	 */
	removeText: number;
	/**
	 * The line's indentAtion minus removeText
	 */
	indentAtion: string;
}

/**
 * @internAl
 */
export clAss StAndArdAutoClosingPAirConditionAl {
	_stAndArdAutoClosingPAirConditionAlBrAnd: void;

	reAdonly open: string;
	reAdonly close: string;
	privAte reAdonly _stAndArdTokenMAsk: number;

	constructor(source: IAutoClosingPAirConditionAl) {
		this.open = source.open;
		this.close = source.close;

		// initiAlly Allowed in All tokens
		this._stAndArdTokenMAsk = 0;

		if (ArrAy.isArrAy(source.notIn)) {
			for (let i = 0, len = source.notIn.length; i < len; i++) {
				const notIn: string = source.notIn[i];
				switch (notIn) {
					cAse 'string':
						this._stAndArdTokenMAsk |= StAndArdTokenType.String;
						breAk;
					cAse 'comment':
						this._stAndArdTokenMAsk |= StAndArdTokenType.Comment;
						breAk;
					cAse 'regex':
						this._stAndArdTokenMAsk |= StAndArdTokenType.RegEx;
						breAk;
				}
			}
		}
	}

	public isOK(stAndArdToken: StAndArdTokenType): booleAn {
		return (this._stAndArdTokenMAsk & <number>stAndArdToken) === 0;
	}
}

/**
 * @internAl
 */
export clAss AutoClosingPAirs {

	public reAdonly AutoClosingPAirsOpen: MAp<string, StAndArdAutoClosingPAirConditionAl[]>;
	public reAdonly AutoClosingPAirsClose: MAp<string, StAndArdAutoClosingPAirConditionAl[]>;

	constructor(AutoClosingPAirs: StAndArdAutoClosingPAirConditionAl[]) {
		this.AutoClosingPAirsOpen = new MAp<string, StAndArdAutoClosingPAirConditionAl[]>();
		this.AutoClosingPAirsClose = new MAp<string, StAndArdAutoClosingPAirConditionAl[]>();
		for (const pAir of AutoClosingPAirs) {
			AppendEntry(this.AutoClosingPAirsOpen, pAir.open.chArAt(pAir.open.length - 1), pAir);
			if (pAir.close.length === 1) {
				AppendEntry(this.AutoClosingPAirsClose, pAir.close, pAir);
			}
		}
	}
}

function AppendEntry<K, V>(tArget: MAp<K, V[]>, key: K, vAlue: V): void {
	if (tArget.hAs(key)) {
		tArget.get(key)!.push(vAlue);
	} else {
		tArget.set(key, [vAlue]);
	}
}
